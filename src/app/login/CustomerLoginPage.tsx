'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import logoImage from '@/assets/images/logo.png';

export default function CustomerLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState('customer');
  const [imageError, setImageError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    let data;
    if (loginType === 'customer') {
      data = { 
        loginCode: formData.get('loginCode') as string
      };
    } else {
      data = {
        email: formData.get('email') as string,
        loginCode: formData.get('loginCode') as string,
      };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (loginType === 'customer' && result.user.role !== 'customer') {
        throw new Error('This login code is not for customer users. Please use the Admin tab if you are a customer admin.');
      }

      if (loginType === 'admin' && !['customer_admin'].includes(result.user.role)) {
        throw new Error('Invalid customer admin credentials');
      }

      if (['customer', 'customer_admin'].includes(result.user.role)) {
        if (typeof window !== 'undefined') {
          window.location.href = '/customer';
        }
      } else {
        throw new Error('Invalid customer credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="bg-[#087055] text-white py-8 w-full">
        <h1 className="text-center text-2xl font-bold">Service Queue</h1>
      </div>

      <div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-start pt-16">
        <div className="mb-8 flex justify-center">
          <div className="bg-[#f8f8f8] p-2 rounded-md flex items-center justify-center">
            {!imageError ? (
              <Image
                src={logoImage}
                alt="Community Insurance Center"
                width={180}
                height={90}
                className="h-auto w-auto max-w-[180px]"
                onError={() => setImageError(true)}
                priority
              />
            ) : (
              <div className="w-[180px] h-[90px] bg-gray-100 rounded flex items-center justify-center">
                <span className="text-[#087055] text-sm font-bold">CIC</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-md px-4 py-3">
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={() => setLoginType('customer')}
              className={`flex-1 py-4 text-center text-sm font-medium transition-colors relative ${
                loginType === 'customer'
                  ? 'text-gray-900 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              User
              {loginType === 'customer' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-2 rounded-t-lg bg-[#087055]"></div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-4 text-center text-sm font-medium transition-colors relative ${
                loginType === 'admin'
                  ? 'text-gray-900 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Admin
              {loginType === 'admin' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-2 rounded-t-lg bg-[#087055]"></div>
              )}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {loginType === 'customer' ? (
                  <div>
                    <Label
                      htmlFor="loginCode"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Login Code
                    </Label>
                    <Input
                      id="loginCode"
                      name="loginCode"
                      type="text"
                      placeholder="Enter your 7-digit login code"
                      required
                      disabled={isLoading}
                      className="w-full h-12 px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#087055] focus:border-[#087055]"
                      maxLength={7}
                      minLength={7}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      User tab is for customer role only
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@communityinscenter.net"
                        required
                        disabled={isLoading}
                        className="w-full h-12 px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#087055] focus:border-[#087055]"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="loginCode"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Login Code
                      </Label>
                      <Input
                        id="loginCode"
                        name="loginCode"
                        type="text"
                        placeholder="Enter your 7-digit login code"
                        required
                        disabled={isLoading}
                        className="w-full h-12 px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#087055] focus:border-[#087055]"
                        maxLength={7}
                        minLength={7}
                      />
                    </div>
                  </>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#087055] hover:bg-[#065946] text-white font-medium rounded-md"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </form>
            </div>
          </div>

      
        </div>
      </div>
    </div>
  );
}