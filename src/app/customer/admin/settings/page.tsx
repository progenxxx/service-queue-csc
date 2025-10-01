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
  BarChart3,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  X,
  ArrowLeft,
  Copy,
  Loader2
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  loginCode?: string;
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

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function CustomerAdminSettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    loginCode: generateLoginCode(),
  });

  const [editableDetails, setEditableDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    loginCode: '',
  });

  const handleRefreshSettings = () => {
    // Reset to main view and refresh data
    setShowDetailsForm(false);
    setShowAddUser(false);
    setSelectedUser(null);
    setSearchTerm('');
    setCurrentPage(1);
    setFormData({ firstName: '', lastName: '', email: '', loginCode: generateLoginCode() });
    fetchUsers();
    fetchRecentActivity();
  };

  const navigation = [
    { name: 'Create Request', href: '/customer', icon: Building2, current: false },
    { name: 'Summary', href: '/customer/summary', icon: Building2, current: false },
    { name: 'Reports', href: '/customer/reports', icon: BarChart3, current: false },
    { name: 'Admin Settings', href: '/customer/admin/settings', icon: Settings, current: true, onClick: handleRefreshSettings }
  ];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Login code copied to clipboard!', 'success');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('Login code copied to clipboard!', 'success');
      } catch (err) {
        showToast('Failed to copy login code', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    fetchUsers();
    fetchRecentActivity();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/customer/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/customer/admin/activity');
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      setRecentActivity([]);
    }
  };

  function generateLoginCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const response = await fetch('/api/customer/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setShowAddUser(false);
        setFormData({ firstName: '', lastName: '', email: '', loginCode: generateLoginCode() });
        await fetchUsers();
        showToast(result.message || 'User created successfully!', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      showToast('Failed to add user. Please try again.', 'error');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleViewDetails = (user: User) => {
    setIsTableTransitioning(true);
    
    setTimeout(() => {
      setSelectedUser(user);
      setEditableDetails({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        loginCode: user.loginCode || generateLoginCode(),
      });
      setShowDetailsForm(true);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleBackFromDetails = () => {
    setIsTableTransitioning(true);
    
    setTimeout(() => {
      setShowDetailsForm(false);
      setSelectedUser(null);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleBackToUsers = () => {
    setIsTableTransitioning(true);
    
    setTimeout(() => {
      setShowAddUser(false);
      setFormData({ firstName: '', lastName: '', email: '', loginCode: generateLoginCode() });
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsUpdatingUser(true);
    try {
      const response = await fetch('/api/customer/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          ...editableDetails
        }),
      });

      if (response.ok) {
        await fetchUsers();
        showToast('User details updated successfully', 'success');
        handleBackFromDetails();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update user details', 'error');
      }
    } catch (error) {
      showToast('Failed to save user details', 'error');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const response = await fetch('/api/customer/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        await fetchUsers();
        showToast('User deleted successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete user', 'error');
      }
    } catch (error) {
      showToast('Failed to delete user', 'error');
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const renderPaginationButtons = () => {
    const buttons: React.ReactElement[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (currentPage > 1) {
      buttons.push(
        <Button
          key="prev"
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          className="px-3 py-1 text-sm border-gray-300"
        >
          Previous
        </Button>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 text-sm ${
            i === currentPage
              ? 'bg-[#087055] hover:bg-[#065a42] text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {i}
        </Button>
      );
    }

    if (currentPage < totalPages) {
      buttons.push(
        <Button
          key="next"
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-3 py-1 text-sm border-gray-300"
        >
          Next
        </Button>
      );
    }

    return buttons;
  };

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
      <div className="space-y-6">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {showDetailsForm && (
              <Button 
                onClick={handleBackFromDetails}
                variant="outline"
                className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white"
              >
                Back to Users
              </Button>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
              {showDetailsForm ? 'User Details' : 'Users'}
            </h1>
          </div>
          
          {!showDetailsForm && !showAddUser && (
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-80"
              />
              <Button 
                className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 py-2 font-medium"
                onClick={() => setShowAddUser(true)}
              >
                Add User
              </Button>
            </div>
          )}
        </div>

        {!showAddUser && (
          <div className={`transition-all duration-300 ease-in-out ${
            isTableTransitioning ? 'opacity-0 transform -translate-x-8' : 'opacity-100 transform translate-x-0'
          }`}>
            {showDetailsForm ? (
              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">User Details</h3>
                      <form onSubmit={handleSaveDetails} className="space-y-6">
                        <div>
                          <Label htmlFor="detailsFirstName" className="text-sm font-medium text-gray-700 mb-2 block">
                            First Name
                          </Label>
                          <Input
                            id="detailsFirstName"
                            value={editableDetails.firstName}
                            onChange={(e) => setEditableDetails({...editableDetails, firstName: e.target.value})}
                            className="h-12"
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
                            className="h-12"
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
                            className="h-12"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="detailsLoginCode" className="text-sm font-medium text-gray-700 mb-2 block">
                            Code
                          </Label>
                          <div className="relative">
                            <Input
                              id="detailsLoginCode"
                              value={editableDetails.loginCode}
                              onChange={(e) => setEditableDetails({...editableDetails, loginCode: e.target.value})}
                              className="h-12 pr-12"
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
                        
                        <div className="pt-4">
                          <Button 
                            type="submit"
                            disabled={isUpdatingUser}
                            className="bg-[#068d1f] hover:bg-[#087055] text-white px-8 py-3"
                          >
                            {isUpdatingUser ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
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
                    <CardContent className="p-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
                      <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                          recentActivity.slice(0, 5).map((activity) => (
                            <div key={activity.id} className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-medium">
                                    {activity.user.firstName.charAt(0)}{activity.user.lastName.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">
                                    {activity.user.firstName} {activity.user.lastName}
                                  </span>
                                  <span className="text-sm text-gray-500">{activity.timestamp}</span>
                                </div>
                                <p className="text-sm text-gray-600">{activity.description}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500">No recent activity</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="shadow-sm border-0">
                <CardContent className="p-0">
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#087055] hover:bg-[#087055] border-0">
                          <TableHead className="text-white font-medium py-4 px-6 text-left border-0">First Name</TableHead>
                          <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Last Name</TableHead>
                          <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Code</TableHead>
                          <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Email</TableHead>
                          <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentUsers.length > 0 ? (
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
                              <TableCell className="text-gray-600 py-4 px-6 border-0">
                                {user.email}
                              </TableCell>
                              <TableCell className="text-center py-4 px-6 border-0">
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] px-3 py-2 text-xs font-medium rounded"
                                    onClick={() => handleViewDetails(user)}
                                  >
                                    View Details
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingUserId === user.id}
                                    className="text-red-600 border-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded"
                                    onClick={() => handleDeleteUser(user.id)}
                                  >
                                    {deletingUserId === user.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow className="border-0">
                            <TableCell colSpan={5} className="text-center py-12 text-gray-500 border-0">
                              No users found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!showAddUser && !showDetailsForm && filteredUsers.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} results
            </div>
            <div className="flex space-x-1">
              {renderPaginationButtons()}
            </div>
          </div>
        )}

        {showAddUser && (
          <div className="w-full max-w-2xl">
            <Card className="shadow-sm border-0">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Add User</h2>
                  <Button 
                    onClick={handleBackToUsers}
                    variant="outline"
                    className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white"
                  >
                    Back to Users
                  </Button>
                </div>
                
                <form onSubmit={handleAddUser} className="space-y-6">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      required
                      className="h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 mb-2 block">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      required
                      className="h-12"
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
                      className="h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="loginCode" className="text-sm font-medium text-gray-700 mb-2 block">
                      Code
                    </Label>
                    <div className="relative">
                      <Input
                        id="loginCode"
                        value={formData.loginCode}
                        onChange={(e) => setFormData({...formData, loginCode: e.target.value})}
                        className="h-12 pr-12"
                        maxLength={7}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, loginCode: generateLoginCode()})}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex space-x-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmittingUser}
                      className="bg-[#068d1f] hover:bg-[#087055] text-white px-8 py-3"
                    >
                      {isSubmittingUser ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      disabled={isSubmittingUser}
                      onClick={handleBackToUsers}
                      className="px-8 py-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
                toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className={`ml-2 ${
                  toast.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}