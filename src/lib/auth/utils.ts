import bcrypt from 'bcryptjs';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null; 
  firstName: string;
  lastName: string;
}

export function generateLoginCode(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function generateServiceQueueId(): string {
  const prefix = 'SQ';
  const timestamp = Date.now().toString().slice(-6);
  
  const array = new Uint8Array(2);
  crypto.getRandomValues(array);
  const random = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function createJWT(payload: TokenPayload, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60)
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadBase64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${headerBase64}.${payloadBase64}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${data}.${signatureBase64}`;
}

async function verifyJWT(token: string, secret: string): Promise<TokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerBase64, payloadBase64, signatureBase64] = parts;
  
  const encoder = new TextEncoder();
  const data = `${headerBase64}.${payloadBase64}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signature = Uint8Array.from(
    atob(signatureBase64.replace(/-/g, '+').replace(/_/g, '/').padEnd(signatureBase64.length + (4 - signatureBase64.length % 4) % 4, '=')),
    c => c.charCodeAt(0)
  );
  
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(data)
  );
  
  if (!isValid) {
    throw new Error('Invalid signature');
  }
  
  const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/').padEnd(payloadBase64.length + (4 - payloadBase64.length % 4) % 4, '='));
  const payload = JSON.parse(payloadJson);
  
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('Token expired');
  }
  
  return payload as TokenPayload;
}

export async function generateTokenAsync(payload: TokenPayload): Promise<string> {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return await createJWT(payload, secret);
}

export async function verifyTokenAsync(token: string): Promise<TokenPayload> {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return await verifyJWT(token, secret);
}

export function generateToken(): string {
  throw new Error('generateToken is deprecated. Use generateTokenAsync instead.');
}

export function verifyToken(): TokenPayload {
  throw new Error('verifyToken is deprecated. Use verifyTokenAsync instead.');
}