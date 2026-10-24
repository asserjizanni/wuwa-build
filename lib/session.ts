import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export interface AdminSessionData {
  adminId: string
  email: string
  role: string
  name?: string
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'fallback-local-development-secret-minimum-32-chars-long',
  cookieName: 'ww_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '28800'),
  },
}

export async function getAdminSession() {
  const session = await getIronSession<AdminSessionData>(await cookies(), sessionOptions)
  return session
}

export async function requireAdminSession(
  handler: (req: NextRequest, session: AdminSessionData) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const session = await getIronSession<AdminSessionData>(await cookies(), sessionOptions)

    if (!session.adminId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    return handler(req, session)
  }
}

export function isAuthenticated(session: Partial<AdminSessionData>): boolean {
  return !!session.adminId && !!session.email
}
