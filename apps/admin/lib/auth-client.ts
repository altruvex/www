import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Force same-origin requests off whatever host actually served the page.
  // Without this, better-auth's client falls back to auto-detecting
  // BETTER_AUTH_URL from the environment, which hardcodes a single host
  // (e.g. localhost:3011) — anyone reaching the app via a different host
  // (127.0.0.1, a LAN IP, a real domain) gets a cross-origin sign-in that
  // silently fails: the session cookie lands on the hardcoded host, not the
  // one the browser is actually on, so the app just bounces back to /login.
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
});

export const { signIn, signOut, useSession } = authClient;
