'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  UserCheck, 
  BarChart3,
  Settings,
  Users,
  Trash2,
  Plus,
  RefreshCw,
  ArrowLeft,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Customer {
  id: string;
  companyName: string;
  companyCode: string;
  primaryContact: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    loginCode?: string;
  }>;
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

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  onClick?: () => void;
}

const generateLoginCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const MobileCustomerCard = ({ customer, onViewUsers, onViewDetails, onDelete }: {
  customer: Customer;
  onViewUsers: (customer: Customer) => void;
  onViewDetails: (customer: Customer) => void;
  onDelete: (id: string) => void;
}) => (
  <Card className="shadow-sm border mb-4">
    <CardContent className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1 mr-2">
            <div className="font-medium text-gray-900 text-sm truncate">{customer.companyName}</div>
            <div className="text-gray-600 text-sm truncate">{customer.primaryContact}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="min-w-0">
            <span className="font-medium">Phone:</span>
            <div className="text-gray-600 truncate">{customer.phone || '-'}</div>
          </div>
          <div className="min-w-0">
            <span className="font-medium">Email:</span>
            <div className="text-gray-600 truncate">{customer.email}</div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => onViewUsers(customer)}
            variant="outline"
            size="sm"
            className="w-full bg-[#068d1f] text-white border-[#068d1f] hover:bg-[#087055] text-xs"
          >
            View Users
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={() => onViewDetails(customer)}
              variant="outline"
              size="sm"
              className="flex-1 bg-[#068d1f] text-white border-[#068d1f] hover:bg-[#087055] text-xs"
            >
              View Details
            </Button>
            <Button
              onClick={() => onDelete(customer.id)}
              variant="outline"
              size="sm"
              className="text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700 px-3"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const MobileUserCard = ({ user, companyName, onViewDetails, onDelete }: {
  user: any;
  companyName: string;
  onViewDetails: () => void;
  onDelete: (userId: string, customerId: string) => void;
}) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <Card className="shadow-sm border mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1 mr-2">
              <div className="font-medium text-gray-900 text-sm">{user.firstName} {user.lastName}</div>
              <div className="text-gray-600 text-sm truncate">{user.email}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="min-w-0">
              <span className="font-medium">Company:</span>
              <div className="text-gray-600 truncate">{companyName}</div>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Login Code:</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                  {user.loginCode || 'N/A'}
                </span>
                {user.loginCode && (
                  <button
                    onClick={() => copyToClipboard(user.loginCode || '')}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onViewDetails}
              variant="outline"
              size="sm"
              className="flex-1 bg-[#068d1f] text-white border-[#068d1f] hover:bg-[#087055] text-xs"
            >
              View Details
            </Button>
            <Button
              onClick={() => onDelete(user.id, user.customerId)}
              variant="outline"
              size="sm"
              className="text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700 px-3"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function CustomerManagementPage() {
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showUsersTable, setShowUsersTable] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [currentCustomerUsers, setCurrentCustomerUsers] = useState<Customer | null>(null);
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [isDetailsSubmitting, setIsDetailsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userItemsPerPage, setUserItemsPerPage] = useState(10);
  
  const [editableDetails, setEditableDetails] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    loginCode: '',
    role: '',
    userId: ''
  });
  
  const [formData, setFormData] = useState({
    companyName: '',
    primaryContact: '',
    phone: '',
    email: ''
  });

  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'customer',
    loginCode: ''
  });

  const handleAllCustomersNavigation = () => {
    setShowUsersTable(false);
    setShowDetailsForm(false);
    setSelectedCustomerDetails(null);
    setCurrentCustomerUsers(null);
    setShowAddUserForm(false);
    setShowAddCustomer(false);
    router.push('/admin/customers');
  };

  const resetToMainView = () => {
    setShowUsersTable(false);
    setShowDetailsForm(false);
    setSelectedCustomerDetails(null);
    setCurrentCustomerUsers(null);
    setShowAddUserForm(false);
    setShowAddCustomer(false);
  };
  
  const getNavigation = (): NavigationItem[] => [
    {
      name: 'All Customers',
      href: '/admin/customers',
      icon: Building2,
      current: false,
      onClick: handleAllCustomersNavigation
    },
    { name: 'All Requests', href: '/admin/summary', icon: Building2, current: false },
    {
      name: 'Customer Management',
      href: '/admin/customers/manage',
      icon: Users,
      current: true,
      onClick: resetToMainView
    },
    { name: 'Service Center Management', href: '/admin/agents', icon: UserCheck, current: false },
    { name: 'Settings', href: '/admin/settings', icon: Settings, current: false },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: false },
  ];

  const navigation = getNavigation();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
      }
      document.body.removeChild(textArea);
    }
  };

  useEffect(() => {
    if (showAddUserForm) {
      setUserFormData(prev => ({
        ...prev,
        loginCode: generateLoginCode()
      }));
    }
  }, [showAddUserForm]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers/manage');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      } else {
        setCustomers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/activity');
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCustomers();
    fetchRecentActivity();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim() || !formData.primaryContact.trim() || !formData.email.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/customers/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setFormData({ companyName: '', primaryContact: '', phone: '', email: '' });
        // Refresh data first, then navigate back to show updated table
        await fetchCustomers();
        setShowAddCustomer(false);
        showToast(result.message || 'Customer created successfully!', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create customer', 'error');
      }
    } catch {
      showToast('Failed to add customer. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomerUsers) return;

    if (!userFormData.firstName.trim() || !userFormData.lastName.trim() || !userFormData.email.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsUserSubmitting(true);
    try {
      const response = await fetch('/api/admin/customers/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userFormData,
          customerId: currentCustomerUsers.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setUserFormData({ firstName: '', lastName: '', email: '', role: 'customer', loginCode: '' });
        await fetchCustomers();
        
        // Refresh the current users table by re-fetching the customer data
        try {
          const customerResponse = await fetch('/api/admin/customers/manage');
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            const updatedCustomer = customerData.customers.find((c: Customer) => c.id === currentCustomerUsers.id);
            if (updatedCustomer) {
              setCurrentCustomerUsers(updatedCustomer);
              // Navigate back to users table AFTER data refresh
              setShowAddUserForm(false);
            }
          }
        } catch {
          // Fallback: try to find in the existing customers array
          setTimeout(() => {
            const updatedCustomer = customers.find(c => c.id === currentCustomerUsers.id);
            if (updatedCustomer) {
              setCurrentCustomerUsers({
                ...currentCustomerUsers,
                users: updatedCustomer.users
              });
              // Navigate back to users table AFTER data refresh
              setShowAddUserForm(false);
            }
          }, 100);
        }
        showToast(result.message || 'User added successfully!', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create user', 'error');
      }
    } catch {
      showToast('Failed to add user. Please try again.', 'error');
    } finally {
      setIsUserSubmitting(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerDetails) return;

    setIsDetailsSubmitting(true);
    try {
      const response = await fetch('/api/admin/customers/update-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerDetails.id,
          userId: editableDetails.userId,
          companyName: editableDetails.companyName,
          firstName: editableDetails.firstName,
          lastName: editableDetails.lastName,
          email: editableDetails.email,
          loginCode: editableDetails.loginCode,
          role: editableDetails.role
        }),
      });

      if (response.ok) {
        await fetchCustomers();
        
        // Refresh the current users table by re-fetching the customer data
        if (selectedCustomerDetails) {
          try {
            const customerResponse = await fetch('/api/admin/customers/manage');
            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              const updatedCustomer = customerData.customers.find((c: Customer) => c.id === selectedCustomerDetails.id);
              if (updatedCustomer) {
                setCurrentCustomerUsers(updatedCustomer);
                // Navigate back to users table AFTER data refresh
                setShowDetailsForm(false);
                setSelectedCustomerDetails(null);
                setShowUsersTable(true);
              }
            }
          } catch {
            // Fallback: try to find in the existing customers array
            setTimeout(() => {
              const updatedCustomer = customers.find(c => c.id === selectedCustomerDetails.id);
              if (updatedCustomer) {
                setCurrentCustomerUsers(updatedCustomer);
                // Navigate back to users table AFTER data refresh
                setShowDetailsForm(false);
                setSelectedCustomerDetails(null);
                setShowUsersTable(true);
              }
            }, 100);
          }
        } else {
          // If no selected customer, just navigate back
          setShowDetailsForm(false);
          setSelectedCustomerDetails(null);
        }
        showToast('Customer details updated successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update customer details', 'error');
      }
    } catch {
      showToast('Failed to save customer details', 'error');
    } finally {
      setIsDetailsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, customerId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/customers/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, customerId }),
      });

      if (response.ok) {
        await fetchCustomers();
        
        // Refresh the current users table by re-fetching the customer data
        if (currentCustomerUsers) {
          try {
            const customerResponse = await fetch('/api/admin/customers/manage');
            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              const updatedCustomer = customerData.customers.find((c: Customer) => c.id === customerId);
              if (updatedCustomer) {
                setCurrentCustomerUsers(updatedCustomer);
              }
            }
          } catch {
            // Fallback: try to find in the existing customers array
            setTimeout(() => {
              const updatedCustomer = customers.find(c => c.id === customerId);
              if (updatedCustomer) {
                setCurrentCustomerUsers(updatedCustomer);
              }
            }, 100);
          }
        }
        showToast('User deleted successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete user', 'error');
      }
    } catch {
      showToast('Failed to delete user', 'error');
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone and will also delete all associated users.')) {
      const response = await fetch('/api/admin/customers/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      if (response.ok) {
        fetchCustomers();
        showToast('Customer deleted successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete customer', 'error');
      }
    }
  };

  const handleViewUsers = async (customer: Customer) => {
    setIsTableTransitioning(true);
    setTimeout(() => {
      setCurrentCustomerUsers(customer);
      setShowUsersTable(true);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleBackToCustomers = () => {
    setIsTableTransitioning(true);
    setTimeout(() => {
      setShowUsersTable(false);
      setCurrentCustomerUsers(null);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleViewDetails = (customer: Customer) => {
    setIsTableTransitioning(true);
    setTimeout(() => {
      setSelectedCustomerDetails(customer);
      if (customer.users && customer.users.length > 0) {
        const user = customer.users[0];
        setEditableDetails({
          companyName: customer.companyName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          loginCode: user.loginCode || '',
          role: user.role,
          userId: user.id
        });
      } else {
        setEditableDetails({
          companyName: customer.companyName,
          firstName: '',
          lastName: '',
          email: '',
          loginCode: '',
          role: 'customer',
          userId: ''
        });
      }
      setShowDetailsForm(true);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleBackFromDetails = () => {
    setIsTableTransitioning(true);
    setTimeout(() => {
      setShowDetailsForm(false);
      setSelectedCustomerDetails(null);
      setIsTableTransitioning(false);
    }, 300);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.primaryContact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.companyCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = currentCustomerUsers?.users?.filter(user =>
    user.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  const userTotalPages = Math.ceil(filteredUsers.length / userItemsPerPage);
  const userStartIndex = (userCurrentPage - 1) * userItemsPerPage;
  const userEndIndex = userStartIndex + userItemsPerPage;
  const currentUsers = filteredUsers.slice(userStartIndex, userEndIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setUserCurrentPage(1);
  }, [userSearchTerm]);

  if (loading) {
    return (
      <DashboardLayout navigation={navigation} title="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#087055]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} title="">
      <ToastContainer />
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-4 sm:mb-6">
          {!showUsersTable && !showDetailsForm && !showAddCustomer && (
            <div className="space-y-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Customer Management</h1>
              
              <div className="hidden sm:flex items-center space-x-4">
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                />
                <Button 
                  className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 py-2 font-medium"
                  onClick={() => setShowAddCustomer(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </div>

              <div className="sm:hidden space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    className="bg-[#068d1f] hover:bg-[#087055] text-white px-3"
                    onClick={() => setShowAddCustomer(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {showUsersTable && !showAddUserForm && !showDetailsForm && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button 
                  onClick={handleBackToCustomers}
                  variant="outline"
                  className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Customers</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Users</h1>
              </div>
              
              <div className="hidden sm:flex items-center space-x-4">
                <Input
                  placeholder="Search"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-80"
                />
                
                <Button 
                  className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 py-2 font-medium"
                  onClick={() => setShowAddUserForm(true)}
                >
                  Add Customer User
                </Button>

                <div className="flex items-center text-sm text-gray-600">
                  <span>Current Company:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {currentCustomerUsers?.companyName || 'No Company Selected'}
                  </span>
                </div>
              </div>

              <div className="sm:hidden space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    className="bg-[#068d1f] hover:bg-[#087055] text-white px-3"
                    onClick={() => setShowAddUserForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  <span>Company: </span>
                  <span className="font-medium text-gray-900">
                    {currentCustomerUsers?.companyName || 'No Company Selected'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {showAddCustomer && (
          <div className="w-full max-w-2xl ml-0 px-4 sm:px-0">
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Add New Customer</h2>
                </div>
                
                <form onSubmit={handleAddCustomer} className="space-y-4 sm:space-y-6">
                  <div>
                    <Label htmlFor="companyName" className="text-sm font-medium text-gray-700 mb-2 block">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="Enter Company Name"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      required
                      className="h-10 sm:h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      placeholder="Enter Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="h-10 sm:h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                      Email
                    </Label>
                    <Input
                      id="email"
                      placeholder="Enter Email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      className="h-10 sm:h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="primaryContact" className="text-sm font-medium text-gray-700 mb-2 block">
                      Primary Contact
                    </Label>
                    <Input
                      id="primaryContact"
                      placeholder="Enter Primary Contact"
                      value={formData.primaryContact}
                      onChange={(e) => setFormData({...formData, primaryContact: e.target.value})}
                      required
                      className="h-10 sm:h-12"
                    />
                  </div>
                  
                  <div className="pt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => setShowAddCustomer(false)}
                      className="px-6 sm:px-8 py-2 sm:py-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {!showAddCustomer && (
          <div className={`transition-all duration-300 ease-in-out ${
            isTableTransitioning ? 'opacity-0 transform -translate-x-8' : 'opacity-100 transform translate-x-0'
          }`}>
            {showDetailsForm ? (
              <div className="w-full px-4 sm:px-0">
                <div className="mb-4 sm:mb-6 flex items-center space-x-2 sm:space-x-4">
                  <Button 
                    onClick={handleBackFromDetails}
                    variant="outline"
                    className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Customers</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Customer Details</h1>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Edit Details</h3>
                      <form onSubmit={handleSaveDetails} className="space-y-4 sm:space-y-6">
                        <div>
                          <Label htmlFor="detailsCompany" className="text-sm font-medium text-gray-700 mb-2 block">
                            Customer/Company
                          </Label>
                          <Input
                            value={editableDetails.companyName}
                            disabled
                            className="h-10 sm:h-12 bg-gray-50"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="detailsFirstName" className="text-sm font-medium text-gray-700 mb-2 block">
                            First Name
                          </Label>
                          <Input
                            id="detailsFirstName"
                            value={editableDetails.firstName}
                            onChange={(e) => setEditableDetails({...editableDetails, firstName: e.target.value})}
                            className="h-10 sm:h-12"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="detailsLastName" className="text-sm font-medium text-gray-700 mb-2 block">
                            Last Name
                          </Label>
                          <Input
                            id="detailsLastName"
                            value={editableDetails.lastName}
                            onChange={(e) => setEditableDetails({...editableDetails, lastName: e.target.value})}
                            className="h-10 sm:h-12"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="detailsEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                            Email
                          </Label>
                          <Input
                            id="detailsEmail"
                            type="email"
                            value={editableDetails.email}
                            onChange={(e) => setEditableDetails({...editableDetails, email: e.target.value})}
                            className="h-10 sm:h-12"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="detailsLoginCode" className="text-sm font-medium text-gray-700 mb-2 block">
                            Login Code
                          </Label>
                          <div className="relative">
                            <Input
                              id="detailsLoginCode"
                              value={editableDetails.loginCode}
                              onChange={(e) => setEditableDetails({...editableDetails, loginCode: e.target.value})}
                              className="h-10 sm:h-12 pr-12"
                              maxLength={7}
                            />
                            <button
                              type="button"
                              onClick={() => setEditableDetails({...editableDetails, loginCode: generateLoginCode()})}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <RefreshCw className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="detailsRole" className="text-sm font-medium text-gray-700 mb-2 block">
                            Role
                          </Label>
                          <select 
                            className="w-full h-10 sm:h-12 border border-gray-300 rounded px-3 py-2 bg-white"
                            value={editableDetails.role} 
                            onChange={(e) => setEditableDetails({...editableDetails, role: e.target.value})}
                          >
                            <option value="customer">Customer</option>
                            <option value="customer_admin">Admin</option>
                          </select>
                        </div>
                        
                        <div className="pt-4">
                          <Button 
                            type="submit"
                            disabled={isDetailsSubmitting}
                            className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3 w-full sm:w-auto"
                          >
                            {isDetailsSubmitting ? (
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
            ) : showAddUserForm ? (
              <div className="w-full max-w-2xl ml-0 px-4 sm:px-0">
                <Card className="shadow-sm border-0 bg-white">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="mb-4 sm:mb-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Add Customer User</h2>
                    </div>
                    
                    <form onSubmit={handleAddUser} className="space-y-4 sm:space-y-6">
                      <div>
                        <Label htmlFor="customerCompany" className="text-sm font-medium text-gray-700 mb-2 block">
                          Customer/Company
                        </Label>
                        <Input
                          value={currentCustomerUsers?.companyName || ''}
                          disabled
                          className="h-10 sm:h-12 bg-gray-50"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="Enter first name"
                          value={userFormData.firstName}
                          onChange={(e) => setUserFormData({...userFormData, firstName: e.target.value})}
                          required
                          className="h-10 sm:h-12"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 mb-2 block">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Enter last name"
                          value={userFormData.lastName}
                          onChange={(e) => setUserFormData({...userFormData, lastName: e.target.value})}
                          required
                          className="h-10 sm:h-12"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email address"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                          required
                          className="h-10 sm:h-12"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="loginCode" className="text-sm font-medium text-gray-700 mb-2 block">
                          Login Code
                        </Label>
                        <div className="relative">
                          <Input
                            id="loginCode"
                            value={userFormData.loginCode}
                            onChange={(e) => setUserFormData({...userFormData, loginCode: e.target.value})}
                            required
                            className="h-10 sm:h-12 pr-12"
                            maxLength={7}
                          />
                          <button
                            type="button"
                            onClick={() => setUserFormData({...userFormData, loginCode: generateLoginCode()})}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <RefreshCw className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="role" className="text-sm font-medium text-gray-700 mb-2 block">
                          Role
                        </Label>
                        <select 
                          className="w-full h-10 sm:h-12 border border-gray-300 rounded px-3 py-2 bg-white"
                          value={userFormData.role} 
                          onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                        >
                          <option value="customer">Customer</option>
                          <option value="customer_admin">Admin</option>
                        </select>
                      </div>
                      
                      <div className="pt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <Button 
                          type="submit" 
                          disabled={isUserSubmitting}
                          className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                        >
                          {isUserSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          disabled={isUserSubmitting}
                          onClick={() => setShowAddUserForm(false)}
                          className="px-6 sm:px-8 py-2 sm:py-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  <Card className="shadow-sm border-0">
                    <CardContent className="p-0">
                      <div className="overflow-hidden">
                        {!showUsersTable ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#087055] hover:bg-[#087055] border-0">
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Company Name</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Primary Contact</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Phone</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Email</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-center border-0">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentCustomers.length > 0 ? (
                                currentCustomers.map((customer, index) => (
                                  <TableRow 
                                    key={customer.id} 
                                    className={`hover:bg-gray-50 border-0 ${
                                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                                  >
                                    <TableCell className="font-medium text-gray-900 py-4 px-6 border-0">
                                      {customer.companyName}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6 border-0">
                                      {customer.primaryContact}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6 border-0">
                                      {customer.phone || '-'}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6 border-0">
                                      {customer.email}
                                    </TableCell>
                                    <TableCell className="text-center py-4 px-6 border-0">
                                      <div className="flex space-x-2 justify-center">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] px-4 py-2 text-xs font-medium rounded"
                                          onClick={() => handleViewUsers(customer)}
                                        >
                                          View Users
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] px-4 py-2 text-xs font-medium rounded"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleViewDetails(customer);
                                          }}
                                        >
                                          View Details
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] px-4 py-2 text-xs font-medium rounded"
                                          onClick={() => router.push(`/admin/customers/${customer.id}/insured`)}
                                        >
                                          View Insured
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700 p-2 rounded"
                                          onClick={() => handleDeleteCustomer(customer.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow className="border-0">
                                  <TableCell colSpan={5} className="text-center py-12 text-gray-500 border-0">
                                    No customers found.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#087055] hover:bg-[#087055] border-0">
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">First Name</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Last Name</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Code</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Email</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Company</TableHead>
                                <TableHead className="text-white font-medium py-4 px-6 text-center border-0">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentCustomerUsers && currentCustomerUsers.users && currentUsers.length > 0 ? (
                                currentUsers.map((user, index) => (
                                  <TableRow 
                                    key={user.id} 
                                    className={`hover:bg-gray-50 border-0 ${
                                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                                  >
                                    <TableCell className="py-4 px-6 border-0">
                                      <div className="font-medium text-gray-900">
                                        {user.firstName}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 border-0">
                                      <div className="font-medium text-gray-900">
                                        {user.lastName}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 border-0">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                          {user.loginCode || 'N/A'}
                                        </span>
                                        {user.loginCode && (
                                          <button
                                            onClick={() => copyToClipboard(user.loginCode || '')}
                                            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                            title="Copy login code"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 border-0">
                                      <div className="text-gray-600">
                                        {user.email}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 border-0">
                                      <div className="text-gray-600">
                                        {currentCustomerUsers.companyName}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center py-4 px-6 border-0">
                                      <div className="flex space-x-2 justify-center">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] px-4 py-2 text-xs font-medium rounded"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleViewDetails({
                                              ...currentCustomerUsers,
                                              users: [user]
                                            });
                                          }}
                                        >
                                          View Details
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700 p-2 rounded"
                                          onClick={() => handleDeleteUser(user.id, currentCustomerUsers.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow className="border-0">
                                  <TableCell colSpan={6} className="text-center py-12 text-gray-500 border-0">
                                    {userSearchTerm ? 'No users found matching your search.' : 'No users found for this customer.'}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:hidden">
                  {!showUsersTable ? (
                    currentCustomers.length > 0 ? (
                      currentCustomers.map((customer) => (
                        <MobileCustomerCard
                          key={customer.id}
                          customer={customer}
                          onViewUsers={handleViewUsers}
                          onViewDetails={handleViewDetails}
                          onDelete={handleDeleteCustomer}
                        />
                      ))
                    ) : (
                      <Card className="shadow-sm border">
                        <CardContent className="p-8 text-center text-gray-500">
                          No customers found.
                        </CardContent>
                      </Card>
                    )
                  ) : (
                    currentUsers.length > 0 ? (
                      currentUsers.map((user) => (
                        <MobileUserCard
                          key={user.id}
                          user={user}
                          companyName={currentCustomerUsers?.companyName || ''}
                          onViewDetails={() => handleViewDetails({
                            ...currentCustomerUsers!,
                            users: [user]
                          })}
                          onDelete={handleDeleteUser}
                        />
                      ))
                    ) : (
                      <Card className="shadow-sm border">
                        <CardContent className="p-8 text-center text-gray-500">
                          {userSearchTerm ? 'No users found matching your search.' : 'No users found for this customer.'}
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                {!showUsersTable && filteredCustomers.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4 border-t">
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
                      <div className="text-sm text-gray-700">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Items per page:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="w-20 border border-gray-300 rounded px-2 py-1 bg-white text-sm"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNumber}
                              variant={currentPage === pageNumber ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm ${
                                currentPage === pageNumber 
                                  ? "bg-[#087055] hover:bg-[#065a42] text-white" 
                                  : "text-gray-700"
                              }`}
                            >
                              {pageNumber}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {showUsersTable && filteredUsers.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
                      <div className="text-sm text-gray-700">
                        Showing {userStartIndex + 1} to {Math.min(userEndIndex, filteredUsers.length)} of {filteredUsers.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Items per page:</span>
                        <select
                          value={userItemsPerPage}
                          onChange={(e) => {
                            setUserItemsPerPage(Number(e.target.value));
                            setUserCurrentPage(1);
                          }}
                          className="w-20 border border-gray-300 rounded px-2 py-1 bg-white text-sm"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={userCurrentPage === 1}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, userTotalPages) }, (_, i) => {
                          let pageNumber;
                          if (userTotalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (userCurrentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (userCurrentPage >= userTotalPages - 2) {
                            pageNumber = userTotalPages - 4 + i;
                          } else {
                            pageNumber = userCurrentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNumber}
                              variant={userCurrentPage === pageNumber ? "default" : "outline"}
                              size="sm"
                              onClick={() => setUserCurrentPage(pageNumber)}
                              className={`w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm ${
                                userCurrentPage === pageNumber 
                                  ? "bg-[#087055] hover:bg-[#065a42] text-white" 
                                  : "text-gray-700"
                              }`}
                            >
                              {pageNumber}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserCurrentPage(prev => Math.min(prev + 1, userTotalPages))}
                        disabled={userCurrentPage === userTotalPages}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}