'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Users, 
  Building2, 
  UserCheck, 
  BarChart3,
  Settings,
  Home,
  UserPlus,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface AdminStats {
  totalRequests: number;
  totalCustomers: number;
  totalAgents: number;
  totalUsers: number;
  activeRequests: number;
  completedRequests: number;
  overdueRequests: number;
}

interface CustomerOverview {
  id: string;
  companyName: string;
  primaryContact: string;
  email: string;
  openTickets: number;
  closedTickets: number;
  wipTickets: number;
  totalUsers: number;
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

const navigation = [
  { name: 'All Customers', href: '/admin/customers', icon: Building2, current: false },
  { name: 'Dashboard', href: '/admin', icon: Home, current: true },
  { name: 'Customer Management', href: '/admin/customers/manage', icon: Users, current: false },
  { name: 'Service Center Management', href: '/admin/agents', icon: UserCheck, current: false },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: false },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: false },
];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [customers, setCustomers] = useState<CustomerOverview[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [activityItemsPerPage] = useState(5);

  const CustomerMobileCard = ({ customer }: { customer: CustomerOverview }) => (
    <Card className="shadow-sm border mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-[#087055] text-sm">{customer.companyName}</div>
              <div className="text-gray-600 text-sm">{customer.primaryContact}</div>
            </div>
          </div>
          
          <div className="text-gray-600 text-sm">
            {customer.email}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">Open:</span>
              <Badge className="bg-blue-100 text-blue-800 ml-1 text-xs">
                {customer.openTickets}
              </Badge>
            </div>
            <div>
              <span className="font-medium">WIP:</span>
              <Badge className="bg-orange-100 text-orange-800 ml-1 text-xs">
                {customer.wipTickets}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Closed:</span>
              <Badge className="bg-green-100 text-green-800 ml-1 text-xs">
                {customer.closedTickets}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Users:</span>
              <span className="text-gray-600 ml-1">{customer.totalUsers}</span>
            </div>
          </div>
          
          <div className="pt-2">
            <Button
              onClick={() => window.location.href = `/admin/customers/${customer.id}`}
              variant="outline"
              size="sm"
              className="w-full text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white text-xs"
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, customersResponse, activityResponse] = await Promise.all([
        fetch('/api/admin/dashboard/stats'),
        fetch('/api/admin/dashboard/customers'),
        fetch('/api/admin/dashboard/activity')
      ]);

      if (statsResponse.ok && customersResponse.ok && activityResponse.ok) {
        const statsData = await statsResponse.json();
        const customersData = await customersResponse.json();
        const activityData = await activityResponse.json();
        
        setStats(statsData.stats);
        setCustomers(customersData.customers);
        setRecentActivity(activityData.activities);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = customers.slice(startIndex, endIndex);

  const activityTotalPages = Math.ceil(recentActivity.length / activityItemsPerPage);
  const activityStartIndex = (activityCurrentPage - 1) * activityItemsPerPage;
  const activityEndIndex = activityStartIndex + activityItemsPerPage;
  const currentActivity = recentActivity.slice(activityStartIndex, activityEndIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'request_created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'user_created':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'status_changed':
        return <BarChart3 className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout navigation={navigation} title="Dashboard Overview">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#087055]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} title="Dashboard Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Requests</p>
                  <p className="text-3xl font-bold text-blue-900">{stats?.totalRequests || 0}</p>
                  <p className="text-xs text-blue-600 mt-1">Across all customers</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Customers</p>
                  <p className="text-3xl font-bold text-green-900">{stats?.totalCustomers || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Active companies</p>
                </div>
                <div className="bg-green-500 p-3 rounded-full">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Service Center</p>
                  <p className="text-3xl font-bold text-purple-900">{stats?.totalAgents || 0}</p>
                  <p className="text-xs text-purple-600 mt-1">Active service center users</p>
                </div>
                <div className="bg-purple-500 p-3 rounded-full">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Total Users</p>
                  <p className="text-3xl font-bold text-orange-900">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-orange-600 mt-1">System wide</p>
                </div>
                <div className="bg-orange-500 p-3 rounded-full">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#087055]" />
                Request Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">Active</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {stats?.activeRequests || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Completed</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {stats?.completedRequests || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Overdue</span>
                </div>
                <Badge className="bg-red-100 text-red-800">
                  {stats?.overdueRequests || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center hover:bg-gray-50"
                  onClick={() => window.location.href = '/admin/customers/manage'}
                >
                  <Plus className="h-5 w-5 mb-2 text-[#087055]" />
                  <span className="text-sm">Add Customer</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center hover:bg-gray-50"
                  onClick={() => window.location.href = '/admin/agents'}
                >
                  <UserPlus className="h-5 w-5 mb-2 text-[#087055]" />
                  <span className="text-sm">Manage Service Center</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center hover:bg-gray-50"
                  onClick={() => window.location.href = '/admin/reports'}
                >
                  <BarChart3 className="h-5 w-5 mb-2 text-[#087055]" />
                  <span className="text-sm">View Reports</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center hover:bg-gray-50"
                  onClick={() => window.location.href = '/admin/customers'}
                >
                  <Building2 className="h-5 w-5 mb-2 text-[#087055]" />
                  <span className="text-sm">All Customers</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Customer Overview</CardTitle>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/customers'}
              className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white"
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="lg:hidden space-y-4">
              {currentCustomers.length > 0 ? (
                currentCustomers.map((customer) => (
                  <CustomerMobileCard key={customer.id} customer={customer} />
                ))
              ) : (
                <Card className="shadow-sm border">
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500">
                      No customers found.
                      <Link href="/admin/customers/manage" className="text-[#087055] hover:underline ml-1">
                        Add your first customer
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Open</TableHead>
                    <TableHead className="text-center">WIP</TableHead>
                    <TableHead className="text-center">Closed</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCustomers.length > 0 ? (
                    currentCustomers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <a 
                            href={`/admin/customers/${customer.id}`}
                            className="text-[#087055] hover:underline"
                          >
                            {customer.companyName}
                          </a>
                        </TableCell>
                        <TableCell>{customer.primaryContact}</TableCell>
                        <TableCell className="text-gray-600">{customer.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-800">
                            {customer.openTickets}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-orange-100 text-orange-800">
                            {customer.wipTickets}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-800">
                            {customer.closedTickets}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{customer.totalUsers}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/admin/customers/${customer.id}`}
                            className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No customers found.
                        <Link href="/admin/customers/manage" className="text-[#087055] hover:underline ml-1">
                          Add your first customer
                        </Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <div className="px-6 pb-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <span className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, customers.length)} of {customers.length} results
                  </span>
                </div>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                  >
                    Prev
                  </Button>
                  
                  <div className="hidden sm:flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
                          currentPage === page
                            ? 'bg-[#087055] hover:bg-[#065a42] text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="sm:hidden flex items-center gap-2">
                    {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                      let page;
                      if (totalPages <= 3) {
                        page = i + 1;
                      } else if (currentPage <= 2) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 1) {
                        page = totalPages - 2 + i;
                      } else {
                        page = currentPage - 1 + i;
                      }
                      
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
                            currentPage === page
                              ? 'bg-[#087055] hover:bg-[#065a42] text-white'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentActivity.length > 0 ? (
                currentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-4 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span>{`${activity.user.firstName} ${activity.user.lastName}`}</span>
                        {activity.company && (
                          <>
                            <span>•</span>
                            <span>{activity.company.companyName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDate(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
          {activityTotalPages > 1 && (
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Showing {activityStartIndex + 1} to {Math.min(activityEndIndex, recentActivity.length)} of {recentActivity.length} activities
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setActivityCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={activityCurrentPage === 1}
                    variant="outline"
                    size="sm"
                    className="px-3 py-1"
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: activityTotalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      onClick={() => setActivityCurrentPage(page)}
                      variant={activityCurrentPage === page ? "default" : "outline"}
                      size="sm"
                      className="px-3 py-1"
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    onClick={() => setActivityCurrentPage(prev => Math.min(prev + 1, activityTotalPages))}
                    disabled={activityCurrentPage === activityTotalPages}
                    variant="outline"
                    size="sm"
                    className="px-3 py-1"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}