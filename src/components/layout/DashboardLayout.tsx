'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Menu, X, Bell, ChevronDown } from 'lucide-react';
import logoImage from '@/assets/images/logo.png';
import { truncateEmail } from '@/lib/utils';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId?: string;
  company?: {
    companyName: string;
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  onClick?: () => void;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navigation: NavigationItem[];
  title: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export default function DashboardLayout({ children, navigation, title }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    fetchNotifications();
  }, [fetchUserData, fetchNotifications]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    setDropdownOpen(false);
    
    // Determine role from current URL
    const currentPath = window.location.pathname;
    let role = '';
    
    if (currentPath.startsWith('/admin')) {
      role = 'super_admin';
    } else if (currentPath.startsWith('/agent')) {
      role = 'agent';
    } else if (currentPath.startsWith('/customer')) {
      role = 'customer';
    }
    
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      setUser(null);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
        } catch {
        }
        
        window.location.href = '/login';
      } else {
        router.push('/login');
        router.refresh();
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.push('/login');
      }
    }
  };

  const handleNotificationRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/read`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch {
      // Handle error silently
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
      }
    } catch {
      // Handle error silently
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest('[data-dropdown]')) {
        setDropdownOpen(false);
      }
      if (showNotifications && !target.closest('[data-notifications]')) {
        setShowNotifications(false);
      }
    };

    if (dropdownOpen || showNotifications) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen, showNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigation={navigation} imageError={imageError} setImageError={setImageError} />
        </div>
        <div className="flex-shrink-0 w-14" />
      </div>

      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed">
          <SidebarContent navigation={navigation} imageError={imageError} setImageError={setImageError} />
        </div>
      </div>

      <div className="flex flex-col flex-1 lg:pl-64">
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative" data-notifications>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5 text-gray-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAllRead}
                          className="text-xs text-gray-500 hover:text-gray-700 p-1 h-auto"
                        >
                          Mark all read
                        </Button>
                      )}
                    </div>
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleNotificationRead(notification.id)}
                          >
                            <p className="text-sm text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notification.timestamp}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No notifications
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative" data-dropdown>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  disabled={isLoggingOut}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#087055] text-white text-sm">
                      {user ? getInitials(user.firstName, user.lastName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email ? truncateEmail(user.email) : ''}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navigation, imageError, setImageError }: { 
  navigation: NavigationItem[];
  imageError: boolean;
  setImageError: (error: boolean) => void;
}) {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-6 bg-[#f8f8f8]">
        <div className="flex justify-center">
          <div className="bg-[#f8f8f8] p-2 rounded-md flex items-center justify-center">
            {!imageError ? (
              <Image
                src={logoImage}
                alt="Community Insurance Center"
                width={120}
                height={60}
                className="h-auto w-auto max-w-[120px]"
                onError={() => setImageError(true)}
                priority
              />
            ) : (
              <div className="w-[120px] h-[60px] bg-gray-100 rounded flex items-center justify-center">
                <span className="text-[#087055] text-xs font-bold">CIC</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <nav className="flex-1 bg-gray-50">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => item.onClick ? item.onClick() : handleNavigation(item.href)}
            className={`${
              item.current
                ? 'bg-white text-gray-900 border-r-4 border-[#087055]'
                : 'text-gray-700 hover:bg-gray-100'
            } block px-8 py-8 text-sm font-medium transition-colors duration-200 border-b border-gray-200 w-full text-left`}
          >
            {item.name}
          </button>
        ))}
      </nav>
    </div>
  );
}