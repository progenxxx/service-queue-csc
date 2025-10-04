'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, BarChart3, Settings, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface InsuredAccount {
  id: string;
  insuredName: string;
  primaryContactName: string;
  contactEmail: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipcode: string;
  companyId: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId?: string;
}

interface RecentActivity {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
  description: string;
  timestamp: string;
}

const getNavigation = (userRole: string) => [
  { name: 'Create Request', href: '/customer', icon: Building2, current: false },
  { name: 'Summary', href: '/customer/summary', icon: Building2, current: false },
  ...(userRole === 'customer_admin'
    ? [{ name: 'Insured Accounts', href: '/customer/insured-accounts', icon: Building2, current: true }]
    : []),
  { name: 'Reports', href: '/customer/reports', icon: BarChart3, current: false },
  ...(userRole === 'customer_admin'
    ? [{ name: 'Admin Settings', href: '/customer/admin/settings', icon: Settings, current: false }]
    : []),
];

export default function CustomerInsuredDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const insuredId = params.id as string;

  const [insuredAccount, setInsuredAccount] = useState<InsuredAccount | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [navigation, setNavigation] = useState(getNavigation('customer_admin'));
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    insuredName: '',
    primaryContactName: '',
    contactEmail: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchInsuredAccount();
    fetchRecentActivity();
  }, [insuredId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          setNavigation(getNavigation(data.user.role));
        }
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchInsuredAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customer/insured-accounts/${insuredId}`);
      if (response.ok) {
        const data = await response.json();
        setInsuredAccount(data.insuredAccount);
        setFormData({
          insuredName: data.insuredAccount.insuredName,
          primaryContactName: data.insuredAccount.primaryContactName,
          contactEmail: data.insuredAccount.contactEmail,
          phone: data.insuredAccount.phone,
          street: data.insuredAccount.street,
          city: data.insuredAccount.city,
          state: data.insuredAccount.state,
          zipcode: data.insuredAccount.zipcode,
        });
      } else {
        showToast('Failed to fetch insured account details', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch insured account:', error);
      showToast('Failed to fetch insured account details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/admin/activity');
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.insuredName || !formData.primaryContactName || !formData.contactEmail ||
        !formData.phone || !formData.street || !formData.city || !formData.state || !formData.zipcode) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/customer/insured-accounts/${insuredId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('Insured account updated successfully', 'success');
        fetchInsuredAccount();
        fetchRecentActivity();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update insured account', 'error');
      }
    } catch (error) {
      console.error('Failed to update insured account:', error);
      showToast('Failed to update insured account', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout navigation={navigation} title="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#087055]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} title="">
      <div className="space-y-6">
        <div className="mb-4 sm:mb-6 flex items-center space-x-2 sm:space-x-4">
          <Button
            onClick={() => router.push('/customer/insured-accounts')}
            variant="outline"
            className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Insured Accounts</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Insured Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Edit Details</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4 sm:space-y-6">
                <div>
                  <Label htmlFor="insuredName" className="text-sm font-medium text-gray-700 mb-2 block">
                    Insured Name
                  </Label>
                  <Input
                    id="insuredName"
                    type="text"
                    value={formData.insuredName}
                    onChange={(e) => handleInputChange('insuredName', e.target.value)}
                    className="h-10 sm:h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="primaryContactName" className="text-sm font-medium text-gray-700 mb-2 block">
                    Primary Contact Name
                  </Label>
                  <Input
                    id="primaryContactName"
                    type="text"
                    value={formData.primaryContactName}
                    onChange={(e) => handleInputChange('primaryContactName', e.target.value)}
                    className="h-10 sm:h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                    Contact Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="h-10 sm:h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="h-10 sm:h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="street" className="text-sm font-medium text-gray-700 mb-2 block">
                    Street
                  </Label>
                  <Input
                    id="street"
                    type="text"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    className="h-10 sm:h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700 mb-2 block">
                    City
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="h-10 sm:h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700 mb-2 block">
                      State
                    </Label>
                    <Input
                      id="state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="h-10 sm:h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipcode" className="text-sm font-medium text-gray-700 mb-2 block">
                      Zipcode
                    </Label>
                    <Input
                      id="zipcode"
                      type="text"
                      value={formData.zipcode}
                      onChange={(e) => handleInputChange('zipcode', e.target.value)}
                      className="h-10 sm:h-12"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3 w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs sm:text-sm font-medium">
                            {activity.user.firstName.charAt(0)}{activity.user.lastName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {activity.user.firstName} {activity.user.lastName}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500">{activity.timestamp}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">{activity.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastContainer />
    </DashboardLayout>
  );
}
