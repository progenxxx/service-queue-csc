'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBrowserTimezone } from '@/lib/utils/timezone';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>('America/New_York');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user's timezone from the backend
    const fetchUserTimezone = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.timezone) {
            setTimezoneState(data.user.timezone);
          } else {
            // Fallback to browser timezone
            const browserTz = getBrowserTimezone();
            setTimezoneState(browserTz);
          }
        } else {
          // If not authenticated, use browser timezone
          const browserTz = getBrowserTimezone();
          setTimezoneState(browserTz);
        }
      } catch (error) {
        console.error('Error fetching user timezone:', error);
        // Fallback to browser timezone
        const browserTz = getBrowserTimezone();
        setTimezoneState(browserTz);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTimezone();
  }, []);

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
    // Optionally update the backend
    updateUserTimezone(newTimezone);
  };

  const updateUserTimezone = async (newTimezone: string) => {
    try {
      await fetch('/api/user/timezone', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone: newTimezone }),
      });
    } catch (error) {
      console.error('Error updating user timezone:', error);
    }
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, isLoading }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}