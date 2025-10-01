import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null; 
  firstName: string;
  lastName: string;
}

export function generateLoginCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateServiceQueueId(): string {
  const prefix = 'SQ';
  const timestamp = Date.now().toString().slice(-6);
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export function generateCompanyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET;
  console.log('JWT_SECRET exists:', !!secret);

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const token = jwt.sign(payload, secret, { expiresIn: '24h' });
  console.log('Valid token:', token);
  console.log('Decoded token:', payload);
  return token;
}

export async function generateTokenAsync(payload: TokenPayload): Promise<string> {
  return generateToken(payload);
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  console.log('Verifying token, JWT_SECRET exists:', !!secret);
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    console.log('Token verified successfully for user:', decoded.userId);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
}

export async function verifyTokenAsync(token: string): Promise<TokenPayload> {
  return verifyToken(token);
}