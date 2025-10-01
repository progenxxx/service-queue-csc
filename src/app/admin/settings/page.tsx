'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, UserCheck, BarChart3, Settings, Loader2, Eye, EyeOff, Plus, Edit2, Trash2 } from 'lucide-react';
import { TimezoneSelector } from '@/components/ui/timezone-selector';

interface UserDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface SuperAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

const MobileSuperAdminCard = ({ admin, onManage }: {
  admin: SuperAdmin;
  onManage: (admin: SuperAdmin) => void;
}) => (
  <Card className="shadow-sm border mb-4">
    <CardContent className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1 mr-2">
            <div className="font-medium text-gray-900 text-sm">{admin.firstName} {admin.lastName}</div>
            <div className="text-gray-600 text-sm truncate">{admin.email}</div>
          </div>
          <Badge className={`font-semibold px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 ${
            admin.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {admin.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-500">
          <span className="font-medium">Created:</span> {new Date(admin.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
        
        <div className="pt-2">
          <Button
            onClick={() => onManage(admin)}
            variant="outline"
            size="sm"
            className="w-full text-blue-600 border-blue-400 hover:bg-blue-50 text-xs"
          >
            View Details
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminSettingsPage() {
  const [userDetails, setUserDetails] = useState<UserDetails>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    role: ''
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [detailsMessageType, setDetailsMessageType] = useState<'success' | 'error'>('success');
  const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error'>('success');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [showAddSuperAdmin, setShowAddSuperAdmin] = useState(false);
  const [showManageSuperAdmin, setShowManageSuperAdmin] = useState(false);
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState<SuperAdmin | null>(null);
  const [superAdminForm, setSuperAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoadingSuperAdmin, setIsLoadingSuperAdmin] = useState(false);
  const [superAdminMessage, setSuperAdminMessage] = useState('');
  const [superAdminMessageType, setSuperAdminMessageType] = useState<'success' | 'error'>('success');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const handleRefreshSettings = () => {
    // Reset to main settings view and refresh data
    setShowManageSuperAdmin(false);
    setShowAddSuperAdmin(false);
    setSelectedSuperAdmin(null);
    setDetailsMessage('');
    setPasswordMessage('');
    setSuperAdminMessage('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSearchTerm('');
    setCurrentPage(1);
    fetchUserDetails();
    fetchSuperAdmins();
  };

  const navigation = [
    { name: 'All Customers', href: '/admin/customers', icon: Building2, current: false },
    { name: 'All Requests', href: '/admin/summary', icon: Building2, current: false },
    { name: 'Customer Management', href: '/admin/customers/manage', icon: Building2, current: false },
    { name: 'Service Center Management', href: '/admin/agents', icon: UserCheck, current: false },
    { name: 'Settings', href: '/admin/settings', icon: Settings, current: true, onClick: handleRefreshSettings },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: false },
  ];

  useEffect(() => {
    fetchUserDetails();
    fetchSuperAdmins();
  }, []);


  const fetchUserDetails = async () => {
    try {
      const response = await fetch('/api/admin/settings/update-details');
      if (response.ok) {
        const data = await response.json();
        setUserDetails(data.user);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingDetails(true);
    setDetailsMessage('');

    try {
      const response = await fetch('/api/admin/settings/update-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          email: userDetails.email,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setDetailsMessage('Account details updated successfully');
        setDetailsMessageType('success');
        if (showManageSuperAdmin) {
          fetchSuperAdmins();
        }
      } else {
        setDetailsMessage(result.error || 'Failed to update account details');
        setDetailsMessageType('error');
      }
    } catch {
      setDetailsMessage('An error occurred while updating account details');
      setDetailsMessageType('error');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPassword(true);
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      setPasswordMessageType('error');
      setIsLoadingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage('New password must be at least 8 characters long');
      setPasswordMessageType('error');
      setIsLoadingPassword(false);
      return;
    }

    try {
      const requestBody: any = { currentPassword, newPassword };
      
      // If managing another super admin, include their user ID
      if (showManageSuperAdmin && selectedSuperAdmin) {
        requestBody.targetUserId = selectedSuperAdmin.id;
      }

      const response = await fetch('/api/admin/settings/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        setPasswordMessage('Password updated successfully');
        setPasswordMessageType('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage(result.error || 'Failed to update password');
        setPasswordMessageType('error');
      }
    } catch {
      setPasswordMessage('An error occurred while updating password');
      setPasswordMessageType('error');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const fetchSuperAdmins = async () => {
    try {
      const response = await fetch('/api/admin/settings/superadmins');
      if (response.ok) {
        const data = await response.json();
        setSuperAdmins(data.superAdmins || []);
      }
    } catch (error) {
    }
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingSuperAdmin(true);
    setSuperAdminMessage('');

    if (superAdminForm.password !== superAdminForm.confirmPassword) {
      setSuperAdminMessage('Passwords do not match');
      setSuperAdminMessageType('error');
      setIsLoadingSuperAdmin(false);
      return;
    }

    if (superAdminForm.password.length < 8) {
      setSuperAdminMessage('Password must be at least 8 characters long');
      setSuperAdminMessageType('error');
      setIsLoadingSuperAdmin(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/superadmins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: superAdminForm.firstName,
          lastName: superAdminForm.lastName,
          email: superAdminForm.email,
          password: superAdminForm.password
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuperAdminMessage('Super admin added successfully');
        setSuperAdminMessageType('success');
        setSuperAdminForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
        setShowAddSuperAdmin(false);
        fetchSuperAdmins();
      } else {
        setSuperAdminMessage(result.error || 'Failed to add super admin');
        setSuperAdminMessageType('error');
      }
    } catch {
      setSuperAdminMessage('An error occurred while adding super admin');
      setSuperAdminMessageType('error');
    } finally {
      setIsLoadingSuperAdmin(false);
    }
  };

  const handleManageSuperAdmin = (superAdmin: SuperAdmin) => {
    setSelectedSuperAdmin(superAdmin);
    setUserDetails({
      id: superAdmin.id,
      firstName: superAdmin.firstName,
      lastName: superAdmin.lastName,
      email: superAdmin.email,
      role: superAdmin.role
    });
    setShowManageSuperAdmin(true);
    setDetailsMessage('');
    setPasswordMessage('');
    setSuperAdminMessage('');
  };

  const handleDeleteSuperAdmin = async (id: string) => {
    if (!confirm('Are you sure you want to delete this super admin?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/settings/superadmins/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setSuperAdminMessage('Super admin deleted successfully');
        setSuperAdminMessageType('success');
        fetchSuperAdmins();
      } else {
        setSuperAdminMessage(result.error || 'Failed to delete super admin');
        setSuperAdminMessageType('error');
      }
    } catch {
      setSuperAdminMessage('An error occurred while deleting super admin');
      setSuperAdminMessageType('error');
    }
  };

  const handleBackToSettings = () => {
    setShowManageSuperAdmin(false);
    setShowAddSuperAdmin(false);
    setSelectedSuperAdmin(null);
    setDetailsMessage('');
    setPasswordMessage('');
    setSuperAdminMessage('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    fetchUserDetails();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter and paginate super admins
  const filteredSuperAdmins = superAdmins.filter(admin =>
    admin.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSuperAdmins.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSuperAdmins = filteredSuperAdmins.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {(showManageSuperAdmin || showAddSuperAdmin) && (
              <Button
                variant="outline"
                onClick={handleBackToSettings}
                className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Back to Settings</span>
                <span className="sm:hidden">Back</span>
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {showManageSuperAdmin ? 'Super Admin Details' : showAddSuperAdmin ? 'Add Super Admin' : 'Settings'}
            </h1>
          </div>
        </div>

        {superAdminMessage && (
          <Alert variant={superAdminMessageType === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{superAdminMessage}</AlertDescription>
          </Alert>
        )}

        {showManageSuperAdmin ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Account Details</h3>
                <form onSubmit={handleUpdateDetails} className="space-y-6">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={userDetails.firstName}
                      onChange={(e) => setUserDetails({ ...userDetails, firstName: e.target.value })}
                      placeholder="Enter first name"
                      required
                      disabled={isLoadingDetails}
                      className="h-10 sm:h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 mb-2 block">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={userDetails.lastName}
                      onChange={(e) => setUserDetails({ ...userDetails, lastName: e.target.value })}
                      placeholder="Enter last name"
                      required
                      disabled={isLoadingDetails}
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
                      value={userDetails.email}
                      onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                      placeholder="Enter email address"
                      required
                      disabled={isLoadingDetails}
                      className="h-10 sm:h-12"
                    />
                  </div>

                  <div>
                    <TimezoneSelector />
                  </div>

                  {detailsMessage && (
                    <Alert variant={detailsMessageType === 'error' ? 'destructive' : 'default'}>
                      <AlertDescription>{detailsMessage}</AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                      disabled={isLoadingDetails}
                    >
                      {isLoadingDetails ? (
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
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Reset Password</h3>
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div>
                    <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 mb-2 block">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                        disabled={isLoadingPassword}
                        className="h-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 mb-2 block">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        disabled={isLoadingPassword}
                        className="h-12 pr-12"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-2 block">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        disabled={isLoadingPassword}
                        className="h-12 pr-12"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {passwordMessage && (
                    <Alert variant={passwordMessageType === 'error' ? 'destructive' : 'default'}>
                      <AlertDescription>{passwordMessage}</AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                      disabled={isLoadingPassword}
                    >
                      {isLoadingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : showAddSuperAdmin ? (
          <div className="w-full max-w-2xl">
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Add Super Admin</h2>
                </div>
              <form onSubmit={handleAddSuperAdmin} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="addFirstName" className="text-sm font-medium text-gray-700 mb-2 block">
                      First Name
                    </Label>
                    <Input
                      id="addFirstName"
                      type="text"
                      value={superAdminForm.firstName}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, firstName: e.target.value })}
                      placeholder="Enter first name"
                      required
                      disabled={isLoadingSuperAdmin}
                      className="h-10 sm:h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addLastName" className="text-sm font-medium text-gray-700 mb-2 block">
                      Last Name
                    </Label>
                    <Input
                      id="addLastName"
                      type="text"
                      value={superAdminForm.lastName}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, lastName: e.target.value })}
                      placeholder="Enter last name"
                      required
                      disabled={isLoadingSuperAdmin}
                      className="h-10 sm:h-12"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="addEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="addEmail"
                    type="email"
                    value={superAdminForm.email}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                    disabled={isLoadingSuperAdmin}
                    className="h-10 sm:h-12"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="addPassword" className="text-sm font-medium text-gray-700 mb-2 block">
                      Password
                    </Label>
                    <Input
                      id="addPassword"
                      type="password"
                      value={superAdminForm.password}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, password: e.target.value })}
                      placeholder="Enter password"
                      required
                      disabled={isLoadingSuperAdmin}
                      className="h-10 sm:h-12"
                      minLength={8}
                    />
                    <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
                  </div>

                  <div>
                    <Label htmlFor="addConfirmPassword" className="text-sm font-medium text-gray-700 mb-2 block">
                      Confirm Password
                    </Label>
                    <Input
                      id="addConfirmPassword"
                      type="password"
                      value={superAdminForm.confirmPassword}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      required
                      disabled={isLoadingSuperAdmin}
                      className="h-10 sm:h-12"
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <Button
                    type="submit"
                    className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                    disabled={isLoadingSuperAdmin}
                  >
                    {isLoadingSuperAdmin ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Super Admin'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToSettings}
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
            <div className="hidden lg:flex items-center space-x-4">
              <Input
                placeholder="Search super admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80"
              />
              <Button 
                className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 py-2 font-medium"
                onClick={() => setShowAddSuperAdmin(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Super Admin
              </Button>
            </div>

            <div className="lg:hidden flex gap-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                className="bg-[#068d1f] hover:bg-[#087055] text-white px-3"
                onClick={() => setShowAddSuperAdmin(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

        <Card className="shadow-sm border-0 bg-white">
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#087055] hover:bg-[#087055] border-0">
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Name</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Email</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-center border-0">Status</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0">Created</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-center border-0">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSuperAdmins.length > 0 ? (
                    currentSuperAdmins.map((admin, index) => (
                      <TableRow 
                        key={admin.id} 
                        className={`hover:bg-gray-50 border-0 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <TableCell className="py-4 px-6 border-0">
                          <div className="font-medium text-gray-900">
                            {admin.firstName} {admin.lastName}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 border-0">
                          <div className="text-gray-600">
                            {admin.email}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 border-0 text-center">
                          <Badge className={`font-semibold px-3 py-1 ${
                            admin.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 border-0">
                          <div className="text-gray-600">
                            {formatDate(admin.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 border-0 text-center">
                          <div className="flex space-x-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageSuperAdmin(admin)}
                              className="text-blue-600 border-blue-400 hover:bg-blue-50 px-3 py-2 rounded"
                            >
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-0">
                      <TableCell colSpan={5} className="text-center py-12 text-gray-500 border-0">
                        No super administrators found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden p-4">
              {currentSuperAdmins.length > 0 ? (
                currentSuperAdmins.map((admin) => (
                  <MobileSuperAdminCard
                    key={admin.id}
                    admin={admin}
                    onManage={handleManageSuperAdmin}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No super administrators found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!showManageSuperAdmin && !showAddSuperAdmin && filteredSuperAdmins.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredSuperAdmins.length)} of {filteredSuperAdmins.length} results
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

        </>
        )}
      </div>
    </DashboardLayout>
  );
}