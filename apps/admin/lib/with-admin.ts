import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

import { userActor, type Actor } from "@/lib/activity-log";
import type { Role } from "@/lib/nav";
import { permitted, resolveRole, type Capability } from "@/lib/rbac";
import { requireAdminSession } from "@/lib/require-admin";

/**
 * The admin route wrapper.
 *
 * The `if (!(await requireAdminSession(request))) return 401` guard was
 * copy-pasted into every handler in `app/api/admin/**`. That works right up
 * until someone adds the fifteenth route and forgets, and the failure mode is
 * an unauthenticated read of client data. Wrapping the handler makes the check
 * structural: there is no way to export a handler from this helper without it
 * having run.
 *
 * The wrapper also hands the handler the resolved session and an `Actor` ready
 * for `recordActivity`, so an audited mutation does not have to re-derive who
 * is calling it.
 */

export interface AdminContext<P = Record<string, string>> {
  session: NonNullable<Awaited<ReturnType<typeof requireAdminSession>>>;
  actor: Actor;
  /** The caller's product role (lib/rbac.ts), for decisions finer than `can`. */
  role: Role | undefined;
  params: P;
}

export type AdminHandler<P> = (
  request: NextRequest,
  context: AdminContext<P>,
) => Promise<NextResponse> | NextResponse;

export interface WithAdminOptions {
  /**
   * Capabilities the caller's product role must hold, e.g. `["edit", "payment"]`
   * or several. A caller who is an admin but lacks one gets a 403; omitting it
   * keeps the route open to every admin, as before.
   */
  can?: Capability | Capability[];
}

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

const forbidden = () =>
  NextResponse.json({ success: false, message: "Not permitted" }, { status: 403 });

/**
 * Wraps a route handler in the admin session check, and optionally in a
 * capability check on top of it.
 *
 * Next passes `{ params }` as the second argument to a route handler; params
 * are a promise in the App Router, so they are awaited here once rather than in
 * every handler.
 */
export function withAdmin<P = Record<string, string>>(
  handler: AdminHandler<P>,
  options: WithAdminOptions = {},
) {
  return async (
    request: NextRequest,
    ctx?: { params?: Promise<P> },
  ): Promise<NextResponse> => {
    const session = await requireAdminSession(request);
    if (!session) return unauthorized();

    const role = resolveRole(session.user as { role?: string | null; opsRole?: string | null });
    if (!permitted(role, options.can)) return forbidden();

    const params = ctx?.params ? await ctx.params : ({} as P);

    try {
      return await handler(request, { session, actor: userActor(session), role, params });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, message: "Invalid request.", issues: error.issues },
          { status: 400 },
        );
      }
      if (error instanceof HttpError) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: error.status },
        );
      }
      // The message is deliberately generic: a Prisma error string can carry
      // column names and constraint definitions, which is not something an
      // API response should teach a caller.
      console.error(`Admin route failed: ${request.method} ${request.nextUrl.pathname}`, error);
      return NextResponse.json(
        { success: false, message: "Something went wrong. The error has been logged." },
        { status: 500 },
      );
    }
  };
}

/** Throw this from a handler to return a specific status without a try/catch. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

/** Parses and validates a JSON body, throwing a 400 on malformed input. */
export async function readJson<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

export const ok = <T extends Record<string, unknown>>(body: T) =>
  NextResponse.json({ success: true, ...body });
