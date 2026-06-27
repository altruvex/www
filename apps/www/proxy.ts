import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … a locale-prefixed `/api` (e.g. `/en/api/...`, `/ar/api/...`) -
  //   without this, next-intl redirects `/en/api/*` to the unprefixed
  //   `/api/*`, which 404s since route handlers live under `[locale]/api`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|(?:en|ar)/api|.*\\..*).*)",
};
