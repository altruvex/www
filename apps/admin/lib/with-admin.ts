import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

import { userActor, type Actor } from "@/lib/activity-log";
import type { Role } from "@/lib/nav";
import { permitted, resolveRole, type Capability } from "@/lib/rbac";
import { requireAdminSession } from "@/lib/require-admin";

export interface AdminContext<P = Record<string, string>> {
  session: NonNullable<Awaited<ReturnType<typeof requireAdminSession>>>;
  actor: Actor;
  role: Role | undefined;
  params: P;
}

export type AdminHandler<P> = (
  request: NextRequest,
  context: AdminContext<P>,
) => Promise<NextResponse> | NextResponse;

export interface WithAdminOptions {
  can?: Capability | Capability[];
}

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

const forbidden = () =>
  NextResponse.json({ success: false, message: "Not permitted" }, { status: 403 });

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
      console.error(`Admin route failed: ${request.method} ${request.nextUrl.pathname}`, error);
      return NextResponse.json(
        { success: false, message: "Something went wrong. The error has been logged." },
        { status: 500 },
      );
    }
  };
}

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
