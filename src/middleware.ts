//MRPA
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenAsync } from '@/lib/auth/utils';

// Helper function to get appropriate token based on path
function getTokenFromCookies(request: NextRequest): string | null {
  const pathname = request.nextUrl.pathname;
  
  // For specific role paths, try the appropriate token first, then fallback
  if (pathname.startsWith('/admin')) {
    const superAdminToken = request.cookies.get('auth-token-super-admin')?.value;
    if (superAdminToken) return superAdminToken;
  }
  
  if (pathname.startsWith('/agent')) {
    const agentToken = request.cookies.get('auth-token-agent')?.value;
    if (agentToken) return agentToken;
  }
  
  if (pathname.startsWith('/customer')) {
    const customerToken = request.cookies.get('auth-token-customer')?.value;
    if (customerToken) return customerToken;
  }
  
  // For API routes, try to find the most appropriate token
  if (pathname.startsWith('/api/')) {
    // For API routes, we need to be smarter about token selection
    // Check if there's a role-specific token that matches the API path
    if (pathname.startsWith('/api/admin/')) {
      const superAdminToken = request.cookies.get('auth-token-super-admin')?.value;
      if (superAdminToken) return superAdminToken;
    }
    if (pathname.startsWith('/api/agent/')) {
      const agentToken = request.cookies.get('auth-token-agent')?.value;
      if (agentToken) return agentToken;
    }
    if (pathname.startsWith('/api/customer/')) {
      const customerToken = request.cookies.get('auth-token-customer')?.value;
      if (customerToken) return customerToken;
    }
    
    // For generic API routes like /api/auth/me, try to determine from referer or default to any available
    const referer = request.headers.get('referer') || '';
    if (referer.includes('/admin')) {
      const superAdminToken = request.cookies.get('auth-token-super-admin')?.value;
      if (superAdminToken) return superAdminToken;
    }
    if (referer.includes('/agent')) {
      const agentToken = request.cookies.get('auth-token-agent')?.value;
      if (agentToken) return agentToken;
    }
    if (referer.includes('/customer')) {
      const customerToken = request.cookies.get('auth-token-customer')?.value;
      if (customerToken) return customerToken;
    }
  }
  
  // Fallback: try any available token
  const superAdminToken = request.cookies.get('auth-token-super-admin')?.value;
  const agentToken = request.cookies.get('auth-token-agent')?.value;
  const customerToken = request.cookies.get('auth-token-customer')?.value;
  const genericToken = request.cookies.get('auth-token')?.value;
  
  return superAdminToken || agentToken || customerToken || genericToken || null;
}

export async function middleware(request: NextRequest) {
  const token = getTokenFromCookies(request);
  const pathname = request.nextUrl.pathname;

  const publicRoutes = [
    '/login',
    '/login/agent',
    '/login/superadmin',
    '/login/customer', // Add customer login route if it exists
    '/api/auth/login',
    '/api/auth/logout',
  ];

  const apiRoutes = pathname.startsWith('/api/');
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Always allow access to login pages for multi-session capability
  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!token) {
    if (apiRoutes) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Redirect to appropriate login based on path
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/login/superadmin', request.url));
    }
    if (pathname.startsWith('/agent')) {
      return NextResponse.redirect(new URL('/login/agent', request.url));
    }
    if (pathname.startsWith('/customer')) {
      return NextResponse.redirect(new URL('/login', request.url)); // or '/login/customer' if you have one
    }
    
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = await verifyTokenAsync(token);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);
    requestHeaders.set('x-user-email', decoded.email);

    if (decoded.companyId) {
      requestHeaders.set('x-company-id', decoded.companyId);
    }

    const role = decoded.role;

    // Role-based access control with proper redirects
    if (pathname.startsWith('/admin') && role !== 'super_admin') {
      if (role === 'agent' || role === 'agent_manager') {
        return NextResponse.redirect(new URL('/agent', request.url));
      } else if (role === 'customer' || role === 'customer_admin') {
        return NextResponse.redirect(new URL('/customer', request.url));
      } else {
        return NextResponse.redirect(new URL('/login/superadmin', request.url));
      }
    }

    if (pathname.startsWith('/agent') && role !== 'agent' && role !== 'agent_manager') {
      if (role === 'super_admin') {
        return NextResponse.redirect(new URL('/admin/customers', request.url));
      } else if (role === 'customer' || role === 'customer_admin') {
        return NextResponse.redirect(new URL('/customer', request.url));
      } else {
        return NextResponse.redirect(new URL('/login/agent', request.url));
      }
    }

    if (pathname.startsWith('/customer') && role !== 'customer' && role !== 'customer_admin') {
      if (role === 'super_admin') {
        return NextResponse.redirect(new URL('/admin/customers', request.url));
      } else if (role === 'agent' || role === 'agent_manager') {
        return NextResponse.redirect(new URL('/agent', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Root path redirects
    if (pathname === '/') {
      if (role === 'super_admin') {
        return NextResponse.redirect(new URL('/admin/customers', request.url));
      } else if (role === 'agent' || role === 'agent_manager') {
        return NextResponse.redirect(new URL('/agent', request.url));
      } else if (role === 'customer' || role === 'customer_admin') {
        return NextResponse.redirect(new URL('/customer', request.url));
      }
    }

    if (pathname === '/admin' && role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin/customers', request.url));
    }

    return response;
  } catch (error) {
    // Token verification failed - redirect to appropriate login
    if (apiRoutes) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Clear invalid tokens
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    response.cookies.delete('auth-token-super-admin');
    response.cookies.delete('auth-token-agent');
    response.cookies.delete('auth-token-customer');
    
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api/auth/login|api/auth/logout|_next/static|_next/image|favicon.ico|public).*)',
  ],
};