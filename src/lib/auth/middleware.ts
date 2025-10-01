import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenAsync } from './utils';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    role: string;
    companyId?: string;
    email: string;
  };
}

// Helper function to get token from multiple possible cookies
function getTokenFromCookies(req: NextRequest): string | null {
  // Try role-specific cookies first
  const superAdminToken = req.cookies.get('auth-token-super-admin')?.value;
  const agentToken = req.cookies.get('auth-token-agent')?.value; // Used by both agent and agent_manager
  const customerToken = req.cookies.get('auth-token-customer')?.value;
  const genericToken = req.cookies.get('auth-token')?.value;
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');

  return superAdminToken || agentToken || customerToken || genericToken || authHeader || null;
}

export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const token = getTokenFromCookies(req);

      if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const decoded = await verifyTokenAsync(token);
      
      (req as AuthenticatedRequest).user = {
        id: decoded.userId,
        role: decoded.role,
        companyId: decoded.companyId || undefined, 
        email: decoded.email,
      };

      return handler(req as AuthenticatedRequest);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}

export function requireRole(roles: string[]) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
      try {
        // Try tokens for each required role
        let validToken: string | null = null;
        let decoded: any = null;

        for (const role of roles) {
          let token: string | null = null;
          
          // Get the appropriate token for this role
          if (role === 'super_admin') {
            token = req.cookies.get('auth-token-super-admin')?.value || null;
          } else if (role === 'agent_manager') {
            token = req.cookies.get('auth-token-agent')?.value || null; // agent_manager uses same token as agent
          } else if (role === 'agent') {
            token = req.cookies.get('auth-token-agent')?.value || null;
          } else if (role === 'customer' || role === 'customer_admin') {
            token = req.cookies.get('auth-token-customer')?.value || null;
          }

          if (token) {
            try {
              const tokenDecoded = await verifyTokenAsync(token);
              if (roles.includes(tokenDecoded.role)) {
                validToken = token;
                decoded = tokenDecoded;
                break;
              }
            } catch {
              // Continue to next token
            }
          }
        }

        // Fallback to generic token or auth header
        if (!validToken) {
          const genericToken = req.cookies.get('auth-token')?.value;
          const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
          const fallbackToken = genericToken || authHeader;
          
          if (fallbackToken) {
            try {
              const tokenDecoded = await verifyTokenAsync(fallbackToken);
              if (roles.includes(tokenDecoded.role)) {
                validToken = fallbackToken;
                decoded = tokenDecoded;
              }
            } catch {
              // Token invalid
            }
          }
        }

        if (!validToken || !decoded) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!roles.includes(decoded.role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', decoded.userId);
        requestHeaders.set('x-user-role', decoded.role);
        requestHeaders.set('x-user-email', decoded.email);
        if (decoded.companyId) {
          requestHeaders.set('x-company-id', decoded.companyId);
        }

        const newRequest = new NextRequest(req.url, {
          method: req.method,
          headers: requestHeaders,
          body: req.body,
        });
        
        return handler(newRequest);
      } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    };
  };
}