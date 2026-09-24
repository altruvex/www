import { z } from "zod";

/**
 * A URL this app will render as a link or follow.
 *
 * `z.string().url()` accepts any scheme, including `javascript:` and `data:`.
 * A product's production URL is written by CI (a bearer token, not a person)
 * and rendered as `<a href>` in the admin, so the scheme is restricted here
 * once rather than remembered at every field.
 */
export const httpUrl = z.url({ protocol: /^https?$/ }).max(500);
