'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import logoImage from '@/assets/images/logo.png';

export default function SuperAdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.user.role !== 'super_admin') {
        throw new Error('Access denied. Super admin credentials required.');
      }

      window.location.href = '/admin';
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
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Super Admin Login
              </h2>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="superadmin@company.com"
                    required
                    disabled={isLoading}
                    className="w-full h-12 px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#087055] focus:border-[#087055]"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="w-full h-12 px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#087055] focus:border-[#087055]"
                  />
                  {/* <p className="mt-1 text-xs text-gray-500">
                    Default password from seed: Admin123!
                  </p> */}
                </div>

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

          {/* <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 mb-2">Other login options:</p>
            <div className="flex justify-center space-x-4">
              <a
                href="/login/agent"
                className="text-sm text-[#087055] hover:underline"
              >
                Agent Login
              </a>
              <a
                href="/login"
                className="text-sm text-[#087055] hover:underline"
              >
                Customer Login
              </a>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
