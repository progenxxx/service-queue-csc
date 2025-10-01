'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  UserCheck, 
  BarChart3,
  Settings,
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface CustomerData {
  id: string;
  companyName: string;
  primaryContact: string;
  email: string;
  phone: string;
  companyCode: string;
  openTickets: number;
  closedTickets: number;
  wipTickets: number;
  modifiedBy: string;
  modifiedOn: string;
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
  type: string;
  description: string;
  timestamp: string;
  user: {
    firstName: string;
    lastName: string;
  };
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

const getNavigation = (currentPath: string = '/admin/customers', resetToMainView?: () => void): NavigationItem[] => [
  { 
    name: 'All Customers', 
    href: '/admin/customers', 
    icon: Building2, 
    current: currentPath === '/admin/customers',
    onClick: resetToMainView 
  },
  { name: 'All Requests', href: '/admin/summary', icon: Building2, current: currentPath === '/admin/summary' },
  { name: 'Customer Management', href: '/admin/customers/manage', icon: Users, current: currentPath === '/admin/customers/manage' },
  { name: 'Service Center Management', href: '/admin/agents', icon: UserCheck, current: currentPath === '/admin/agents' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: currentPath === '/admin/settings' },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: currentPath === '/admin/reports' },
];

const generateLoginCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const MobileCustomerCard = ({ customer, onViewUsers }: {
  customer: CustomerData;
  onViewUsers: (customer: CustomerData) => void;
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
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-gray-700">Open</div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-semibold text-xs">
              {customer.openTickets}
            </Badge>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">Closed</div>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold text-xs">
              {customer.closedTickets}
            </Badge>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">WIP</div>
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 font-semibold text-xs">
              {customer.wipTickets}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-1 text-xs">
          <div className="min-w-0">
            <span className="font-medium">Modified By:</span>
            <div className="text-gray-600 truncate">{customer.modifiedBy}</div>
          </div>
          <div className="min-w-0">
            <span className="font-medium">Modified On:</span>
            <div className="text-gray-600 truncate">{customer.modifiedOn}</div>
          </div>
        </div>
        
        <div className="pt-2">
          <Button
            onClick={() => onViewUsers(customer)}
            variant="outline"
            size="sm"
            className="w-full bg-[#068d1f] text-white border-[#068d1f] hover:bg-[#087055] text-xs"
          >
            View Users
          </Button>
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
              className="text-red-600 border-red-400 hover:bg-red-500 hover:text-white px-3"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AllCustomersPage() {
  const { showToast, ToastContainer } = useToast();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<CustomerData | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showUsersTable, setShowUsersTable] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [currentCustomerUsers, setCurrentCustomerUsers] = useState<CustomerData | null>(null);
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

  useEffect(() => {
    if (showAddUserForm) {
      setUserFormData(prev => ({
        ...prev,
        loginCode: generateLoginCode()
      }));
    }
  }, [showAddUserForm]);

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

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers');
      if (response.ok) {
        const data = await response.json();
        const customersWithUsers = await Promise.all(
          data.customers.map(async (customer: CustomerData) => {
            try {
              const usersResponse = await fetch('/api/admin/customers/manage');
              if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                const customerWithUsers = usersData.customers.find((c: CustomerData) => c.id === customer.id);
                return { ...customer, users: customerWithUsers?.users || [] };
              }
              return { ...customer, users: [] };
            } catch {
              return { ...customer, users: [] };
            }
          })
        );
        setCustomers(customersWithUsers);
      }
    } catch {
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
    } catch {
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchRecentActivity();
  }, []);

  const resetToMainView = () => {
    setShowUsersTable(false);
    setShowDetailsForm(false);
    setShowAddCustomer(false);
    setShowAddUserForm(false);
    setSelectedCustomerDetails(null);
    setCurrentCustomerUsers(null);
  };

  const navigation = getNavigation('/admin/customers', resetToMainView);

  const goBackToUsers = () => {
    setShowDetailsForm(false);
    setShowAddUserForm(false);
    setSelectedCustomerDetails(null);
  };

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
        resetToMainView();
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
        if (currentCustomerUsers) {
          try {
            const customerResponse = await fetch('/api/admin/customers/manage');
            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              const updatedCustomer = customerData.customers.find((c: CustomerData) => c.id === currentCustomerUsers.id);
              if (updatedCustomer) {
                setCurrentCustomerUsers(updatedCustomer);
                // Navigate back to users table AFTER data refresh
                goBackToUsers();
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
                goBackToUsers();
              }
            }, 100);
          }
        } else {
          // If no current customer users, just navigate back
          goBackToUsers();
        }
        showToast(result.message || 'User created successfully!', 'success');
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
              const updatedCustomer = customerData.customers.find((c: CustomerData) => c.id === selectedCustomerDetails.id);
              if (updatedCustomer) {
                setCurrentCustomerUsers(updatedCustomer);
                // Navigate back to users table AFTER data refresh
                goBackToUsers();
              }
            }
          } catch {
            // Fallback: try to find in the existing customers array
            setTimeout(() => {
              const updatedCustomer = customers.find(c => c.id === selectedCustomerDetails.id);
              if (updatedCustomer) {
                setCurrentCustomerUsers({
                  ...selectedCustomerDetails,
                  users: updatedCustomer.users
                });
                // Navigate back to users table AFTER data refresh
                goBackToUsers();
              }
            }, 100);
          }
        } else {
          // If no selected customer, just navigate back
          goBackToUsers();
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
          // Fetch fresh customer data to ensure we have updated users list
          try {
            const customerResponse = await fetch('/api/admin/customers/manage');
            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              const updatedCustomer = customerData.customers.find((c: CustomerData) => c.id === customerId);
              if (updatedCustomer) {
                setCurrentCustomerUsers(updatedCustomer);
              }
            }
          } catch {
            // Fallback: try to find in the existing customers array (which should be updated)
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

  const handleViewUsers = async (customer: CustomerData) => {
    setIsTableTransitioning(true);
    
    setTimeout(() => {
      setCurrentCustomerUsers(customer);
      setShowUsersTable(true);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleViewDetails = async (customer: CustomerData) => {
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

  const filteredCustomers = customers.filter(customer =>
    customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.primaryContact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="flex items-center space-x-2 sm:space-x-4 mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {showUsersTable ? 'Users' : 'Customers'}
            </h1>
          </div>
          
          {!showUsersTable && !showDetailsForm && !showAddCustomer && (
            <div className="space-y-3">
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

              <div className="sm:hidden flex gap-2">
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
          )}
          
          {showUsersTable && !showAddUserForm && !showDetailsForm && (
            <div className="space-y-3">
              <div className="hidden sm:flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={resetToMainView}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Customers</span>
                </Button>
                <Input
                  placeholder="Search users..."
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
              </div>

              <div className="sm:hidden space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetToMainView}
                    className="flex items-center space-x-2 px-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Back</span>
                  </Button>
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
              </div>
            </div>
          )}
        </div>

        {showAddCustomer && (
          <div className="w-full max-w-2xl ml-0 px-4 sm:px-0">
            <Button
              variant="outline"
              onClick={resetToMainView}
              className="flex items-center space-x-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Customers</span>
            </Button>
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
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
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
                      placeholder="Enter primary contact name"
                      value={formData.primaryContact}
                      onChange={(e) => setFormData({...formData, primaryContact: e.target.value})}
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
                      placeholder="Enter phone number"
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
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                      onClick={resetToMainView}
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
                <Button
                  variant="outline"
                  onClick={goBackToUsers}
                  className="flex items-center space-x-2 mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Users</span>
                </Button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Customer Details</h3>
                      <form onSubmit={handleSaveDetails} className="space-y-4 sm:space-y-6">
                        <div>
                          <Label htmlFor="detailsCompany" className="text-sm font-medium text-gray-700 mb-2 block">
                            Customer/Company
                          </Label>
                          <Input
                            id="detailsCompany"
                            value={editableDetails.companyName}
                            onChange={(e) => setEditableDetails({...editableDetails, companyName: e.target.value})}
                            className="h-10 sm:h-12"
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
                          <Select value={editableDetails.role} onValueChange={(value) => setEditableDetails({...editableDetails, role: value})}>
                            <SelectTrigger className="h-10 sm:h-12 bg-white border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200">
                              <SelectItem value="customer" className="bg-white hover:bg-gray-50">Customer</SelectItem>
                              <SelectItem value="customer_admin" className="bg-white hover:bg-gray-50">Admin</SelectItem>
                            </SelectContent>
                          </Select>
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
                          recentActivity.slice(0, 5).map((activity) => (
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
                <Button
                  variant="outline"
                  onClick={goBackToUsers}
                  className="flex items-center space-x-2 mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Users</span>
                </Button>
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
                        <Select value={userFormData.role} onValueChange={(value) => setUserFormData({...userFormData, role: value})}>
                          <SelectTrigger className="h-10 sm:h-12 bg-white border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200">
                            <SelectItem value="customer" className="bg-white hover:bg-gray-50">Customer</SelectItem>
                            <SelectItem value="customer_admin" className="bg-white hover:bg-gray-50">Admin</SelectItem>
                          </SelectContent>
                        </Select>
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
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-0">
                      <div className="overflow-hidden">
                      {!showUsersTable ? (
                        <Table>
                        <TableHeader>
                          <TableRow className="bg-[#087055] hover:bg-[#087055] border-0">
                            <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Customer</TableHead>
                            <TableHead className="text-white font-medium py-4 px-6 text-center border-0">Open Tickets</TableHead>
                            <TableHead className="text-white font-medium py-4 px-6 text-center border-0">Closed Tickets</TableHead>
                            <TableHead className="text-white font-medium py-4 px-6 text-center border-0">WIP Tickets</TableHead>
                            <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Modified By</TableHead>
                            <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Modified On</TableHead>
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
                                <TableCell className="py-4 px-6 border-0">
                                  <div className="font-medium text-gray-900">
                                    {customer.companyName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-4 px-6 border-0">
                                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-semibold px-3 py-1">
                                    {customer.openTickets}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center py-4 px-6 border-0">
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold px-3 py-1">
                                    {customer.closedTickets}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center py-4 px-6 border-0">
                                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 font-semibold px-3 py-1">
                                    {customer.wipTickets}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-600 py-4 px-6 border-0">
                                  {customer.modifiedBy}
                                </TableCell>
                                <TableCell className="text-gray-600 py-4 px-6 border-0">
                                  {customer.modifiedOn}
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
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow className="border-0">
                              <TableCell colSpan={7} className="text-center py-12 text-gray-500 border-0">
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
                            <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Email</TableHead>
                            <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Login Code</TableHead>
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
                                  <div className="text-gray-600">
                                    {user.email}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 border-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                      {user.loginCode || 'N/A'}
                                    </span>
                                    {user.loginCode && (
                                      <button
                                        onClick={() => copyToClipboard(user?.loginCode || '')}
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
                                    {currentCustomerUsers.companyName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-4 px-6 border-0">
                                  <div className="flex space-x-2 justify-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] px-4 py-2 text-xs font-medium rounded"
                                      onClick={() => handleViewDetails({
                                        ...currentCustomerUsers,
                                        users: [user]
                                      })}
                                    >
                                      View Details
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 border-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded"
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
                <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
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