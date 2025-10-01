import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { role } = body; // Optional: logout specific role

  const response = NextResponse.json({ success: true });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  };
  
  if (role) {
    // Logout specific role
    const cookieName = getCookieNameForRole(role);
    response.cookies.set(cookieName, '', cookieOptions);
  } else {
    // Logout all roles
    response.cookies.set('auth-token', '', cookieOptions);
    response.cookies.set('auth-token-super-admin', '', cookieOptions);
    response.cookies.set('auth-token-agent', '', cookieOptions);
    response.cookies.set('auth-token-customer', '', cookieOptions);
  }

  return response;
}

function getCookieNameForRole(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'auth-token-super-admin';
    case 'agent':
      return 'auth-token-agent';
    case 'customer_admin':
    case 'customer':
      return 'auth-token-customer';
    default:
      return 'auth-token';
  }
}