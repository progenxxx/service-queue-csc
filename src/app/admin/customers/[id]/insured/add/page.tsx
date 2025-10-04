'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, UserCheck, BarChart3, Settings, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Company {
  id: string;
  companyName: string;
}

const navigation = [
  { name: 'All Customers', href: '/admin/customers', icon: Building2, current: false },
  { name: 'Customer Management', href: '/admin/customers/manage', icon: UserCheck, current: true },
  { name: 'All Requests', href: '/admin', icon: Building2, current: false },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: false },
  { name: 'Agent Management', href: '/admin/agents', icon: Settings, current: false },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: false },
];

export default function AdminAddInsuredAccountPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const customerId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    fetchCompanyDetails();
  }, [customerId]);

  const fetchCompanyDetails = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
      }
    } catch (error) {
      console.error('Failed to fetch company details:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.insuredName || !formData.primaryContactName || !formData.contactEmail ||
        !formData.phone || !formData.street || !formData.city || !formData.state || !formData.zipcode) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/insured`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('Insured account created successfully', 'success');
        router.push(`/admin/customers/${customerId}/insured`);
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to create insured account', 'error');
      }
    } catch (error) {
      console.error('Failed to create insured account:', error);
      showToast('Failed to create insured account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout navigation={navigation} title="">
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/customers/${customerId}/insured`)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Insured Accounts</span>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Add Insured</h1>
        </div>

        <Card className="shadow-sm border-0 bg-white max-w-3xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="insuredName" className="text-sm font-medium text-gray-700 mb-2 block">
                    Insured Name
                  </Label>
                  <Input
                    id="insuredName"
                    type="text"
                    placeholder="Insured Name"
                    value={formData.insuredName}
                    onChange={(e) => handleInputChange('insuredName', e.target.value)}
                    className="border-gray-200 h-12"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="primaryContactName" className="text-sm font-medium text-gray-700 mb-2 block">
                    Primary Contact Name
                  </Label>
                  <Input
                    id="primaryContactName"
                    type="text"
                    placeholder="Enter Contact Name"
                    value={formData.primaryContactName}
                    onChange={(e) => handleInputChange('primaryContactName', e.target.value)}
                    className="border-gray-200 h-12"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                    Contact Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="Enter Email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="border-gray-200 h-12"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter Phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="border-gray-200 h-12"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="street" className="text-sm font-medium text-gray-700 mb-2 block">
                    Street
                  </Label>
                  <Input
                    id="street"
                    type="text"
                    placeholder="Enter Street"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    className="border-gray-200 h-12"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700 mb-2 block">
                    City
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Enter Street"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="border-gray-200 h-12"
                    required
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
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="border-gray-200 h-12"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipcode" className="text-sm font-medium text-gray-700 mb-2 block">
                      Zipcode
                    </Label>
                    <Input
                      id="zipcode"
                      type="text"
                      placeholder="zip"
                      value={formData.zipcode}
                      onChange={(e) => handleInputChange('zipcode', e.target.value)}
                      className="border-gray-200 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="bg-[#068d1f] hover:bg-[#087055] text-white px-8 py-3"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <ToastContainer />
    </DashboardLayout>
  );
}
