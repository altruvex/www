import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"

const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const rec = attempts.get(key)
    if (!rec || now > rec.resetAt) {
        attempts.set(key, { count: 1, resetAt: now + windowMs })
        return true
    }
    if (rec.count >= limit) return false
    rec.count++
    return true
}

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json()
        const adminSecret = process.env.ADMIN_SECRET

        if (!adminSecret) {
            return NextResponse.json(
                { error: 'Admin access not configured' },
                { status: 503 }
            )
        }

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
            || request.headers.get("x-real-ip")
            || "unknown"

        if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429 }
            )
        }

        const supplied = typeof password === "string" ? password : ""
        const matches = (() => {
            try {
                const a = Buffer.from(supplied)
                const b = Buffer.from(adminSecret)
                if (a.length !== b.length) return false
                return timingSafeEqual(a, b)
            } catch {
                return false
            }
        })()

        if (!matches) {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            )
        }

        const msgUint8 = new TextEncoder().encode(adminSecret + (process.env.ADMIN_SECRET_PEPPER || "default-pepper"));
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sessionToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const response = NextResponse.json({ success: true })

        response.cookies.set('admin-session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 1 day
        })

        return response
    } catch {
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        )
    }
}
