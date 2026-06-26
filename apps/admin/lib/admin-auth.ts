import type { NextRequest } from "next/server";

const ENCODER = new TextEncoder();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): ArrayBuffer | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SECRET;
  const pepper = process.env.ADMIN_SECRET_PEPPER;
  if (!secret || !pepper) {
    throw new Error("Admin auth secrets are not configured");
  }
  return crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret + pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(): Promise<string> {
  const key = await getSigningKey();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const payload = `${expiresAt}.${nonce}`;
  const signature = toHex(
    await crypto.subtle.sign("HMAC", key, ENCODER.encode(payload)),
  );
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresAtRaw, nonce, signatureHex] = parts;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const signature = fromHex(signatureHex);
  if (!signature) return false;

  try {
    const key = await getSigningKey();
    const payload = `${expiresAtRaw}.${nonce}`;
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      ENCODER.encode(payload),
    );
  } catch {
    return false;
  }
}

export async function isAdminAuthed(request: NextRequest): Promise<boolean> {
  const adminSession = request.cookies.get("admin-session");
  if (!adminSession) return false;
  return verifySessionToken(adminSession.value);
}
