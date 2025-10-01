'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  UserCheck,
  BarChart3,
  Settings,
  Users,
  Filter,
  Plus
} from 'lucide-react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatInTimezone, formatDueDateWithTime as formatDueDateTime, isOverdue as checkOverdue } from '@/lib/utils/timezone';

interface ServiceRequest {
  id: string;
  serviceQueueId: string;
  insured: string;
  serviceRequestNarrative: string;
  taskStatus: string;
  serviceQueueCategory: string;
  dueDate: string | null;
  dueTime: string | null;
  inProgressAt: string | null;
  closedAt: string | null;
  timeSpent: number | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  modifiedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  company: {
    companyName: string;
  };
}

const navigation = [
  { name: 'All Customers', href: '/admin/customers', icon: Building2, current: false },
  { name: 'All Requests', href: '/admin/summary', icon: Building2, current: true },
  { name: 'Customer Management', href: '/admin/customers/manage', icon: Users, current: false },
  { name: 'Service Center Management', href: '/admin/agents', icon: UserCheck, current: false },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: false },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: false },
];

const fetchSummaryData = async (): Promise<ServiceRequest[]> => {
  const response = await fetch('/api/admin/summary');
  if (!response.ok) {
    throw new Error('Failed to fetch summary data');
  }
  const data = await response.json();
  return data.requests || [];
};

export default function SummaryPage() {
  const queryClient = useQueryClient();
  const { timezone } = useTimezone();
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: requests = [], isLoading: loading, error } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: fetchSummaryData,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const [filters, setFilters] = useState({
    insured: '',
    assignedBy: '',
    status: '',
    dueDateStart: '',
    dueDateEnd: '',
    createdDateStart: '',
    createdDateEnd: '',
    search: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons: React.ReactElement[] = [];
    const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;
    
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
          className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-gray-300"
        >
          Prev
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
          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
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
          className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-gray-300"
        >
          Next
        </Button>
      );
    }

    return buttons;
  };

  const MobileCard = ({ request }: { request: ServiceRequest }) => (
    <Card className="shadow-sm border mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1 mr-2">
              <div className="font-medium text-gray-900 text-sm truncate">{request.insured}</div>
              <div className="font-medium text-[#087055] text-sm truncate">{request.serviceQueueId}</div>
            </div>
            <Badge
              className={`font-semibold px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 ${getStatusColor(request.taskStatus)}`}
            >
              {request.taskStatus.replace('_', ' ')}
            </Badge>
          </div>
          
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="min-w-0">
              <span className="font-medium">Category:</span>
              <div className="text-gray-600 truncate">
                {request.serviceQueueCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Assigned:</span>
              <div className="text-gray-600 truncate">
                {request.assignedTo
                  ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
                  : 'Not Assigned'}
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Due Date:</span>
              <div className={`truncate ${isOverdue(request.dueDate, request.taskStatus) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                {formatDueDateWithTime(request.dueDate, request.dueTime)}
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Created:</span>
              <div className="text-gray-600 truncate">{formatDate(request.createdAt)}</div>
            </div>
            {request.closedAt && (
              <div className="min-w-0">
                <span className="font-medium">Completed:</span>
                <div className="text-gray-600 truncate">{formatDate(request.closedAt)}</div>
              </div>
            )}
            {(request.timeSpent !== null || (request.inProgressAt && request.closedAt)) && (
              <div className="min-w-0">
                <span className="font-medium">Time Spent:</span>
                <div className="text-gray-600 truncate">
                  {request.timeSpent ? formatTimeSpent(request.timeSpent) : calculateTimeSpent(request.inProgressAt, request.closedAt)}
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <Button
              onClick={() => window.location.href = `/admin/requests/${request.id}`}
              variant="outline"
              size="sm"
              className="w-full text-teal-600 border-teal-600 hover:bg-teal-50 text-xs"
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TabletCard = ({ request }: { request: ServiceRequest }) => (
    <Card className="shadow-sm border mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1 mr-3">
              <div className="font-medium text-gray-900 text-base">{request.insured}</div>
              <div className="font-medium text-[#087055] text-sm">{request.serviceQueueId}</div>
            </div>
            <Badge
              className={`font-semibold px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 ${getStatusColor(request.taskStatus)}`}
            >
              {request.taskStatus.replace('_', ' ')}
            </Badge>
          </div>
          
          
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="min-w-0">
              <span className="font-medium">Category:</span>
              <div className="text-gray-600 text-xs mt-1">
                {request.serviceQueueCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Assigned:</span>
              <div className="text-gray-600 text-xs mt-1">
                {request.assignedTo
                  ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
                  : 'Not Assigned'}
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Modified By:</span>
              <div className="text-gray-600 text-xs mt-1">
                {request.modifiedBy ?
                  `${request.modifiedBy.firstName} ${request.modifiedBy.lastName}` :
                  'Not modified'
                }
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="min-w-0">
              <span className="font-medium">Due Date:</span>
              <div className={`text-xs mt-1 ${isOverdue(request.dueDate, request.taskStatus) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                {formatDueDateWithTime(request.dueDate, request.dueTime)}
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Created:</span>
              <div className="text-gray-600 text-xs mt-1">{formatDate(request.createdAt)}</div>
            </div>
          </div>

          {request.closedAt && (
            <div className="text-sm">
              <span className="font-medium">Completed:</span>
              <div className="text-gray-600 text-xs mt-1">{formatDate(request.closedAt)}</div>
            </div>
          )}

          {(request.timeSpent !== null || (request.inProgressAt && request.closedAt)) && (
            <div className="text-sm">
              <span className="font-medium">Time Spent:</span>
              <div className="text-gray-600 text-xs mt-1">
                {request.timeSpent ? formatTimeSpent(request.timeSpent) : calculateTimeSpent(request.inProgressAt, request.closedAt)}
              </div>
            </div>
          )}
          
          <div className="pt-2">
            <Button
              onClick={() => window.location.href = `/admin/requests/${request.id}`}
              variant="outline"
              size="sm"
              className="w-full text-teal-600 border-teal-600 hover:bg-teal-50"
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    let filtered = [...requests];

    if (filters.insured) {
      filtered = filtered.filter(request =>
        request.insured.toLowerCase().includes(filters.insured.toLowerCase())
      );
    }

    if (filters.assignedBy) {
      filtered = filtered.filter(request => request.assignedBy.id === filters.assignedBy);
    }

    if (filters.status) {
      filtered = filtered.filter(request => request.taskStatus === filters.status);
    }

    if (filters.dueDateStart) {
      const startDate = new Date(filters.dueDateStart);
      filtered = filtered.filter(request => 
        request.dueDate && new Date(request.dueDate) >= startDate
      );
    }

    if (filters.dueDateEnd) {
      const endDate = new Date(filters.dueDateEnd);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(request => 
        request.dueDate && new Date(request.dueDate) <= endDate
      );
    }

    if (filters.createdDateStart) {
      const startDate = new Date(filters.createdDateStart);
      filtered = filtered.filter(request => 
        new Date(request.createdAt) >= startDate
      );
    }

    if (filters.createdDateEnd) {
      const endDate = new Date(filters.createdDateEnd);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(request => 
        new Date(request.createdAt) <= endDate
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(request => 
        request.serviceQueueId.toLowerCase().includes(searchTerm) ||
        request.insured.toLowerCase().includes(searchTerm) ||
        request.serviceRequestNarrative.toLowerCase().includes(searchTerm) ||
        request.company.companyName.toLowerCase().includes(searchTerm) ||
        (request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`.toLowerCase().includes(searchTerm) : false)
      );
    }

    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, filters]);

  const handleAddServiceRequest = () => {
    window.location.href = '/admin/customers/requests';
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
  };

  const clearFilters = () => {
    setFilters({
      insured: '',
      assignedBy: '',
      status: '',
      dueDateStart: '',
      dueDateEnd: '',
      createdDateStart: '',
      createdDateEnd: '',
      search: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return formatInTimezone(dateString, timezone);
  };

  const formatDueDateWithTime = (dueDate: string | null, dueTime: string | null) => {
    if (!dueDate) return 'No Due Date';
    return formatDueDateTime(dueDate, dueTime, timezone);
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes === 0) return '0 min';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };

  const calculateTimeSpent = (inProgressAt: string | null, closedAt: string | null) => {
    if (!inProgressAt || !closedAt) return '-';

    const startTime = new Date(inProgressAt);
    const endTime = new Date(closedAt);
    const diffMs = endTime.getTime() - startTime.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getDisplayStatus = (taskStatus: string, closedAt: string | null) => {
    // If there's a completion date, the task should show as closed regardless of the stored status
    if (closedAt) {
      return 'closed';
    }
    return taskStatus;
  };

  const isOverdue = (dueDateString: string | null, status: string) => {
    if (!dueDateString || status === 'closed') return false;
    return checkOverdue(dueDateString, status, timezone);
  };

  const getUniqueInsureds = () => {
    const insureds = [...new Set(requests.map(request => request.insured))];
    return insureds.sort();
  };

  if (loading) {
    return (
      <DashboardLayout navigation={navigation} title="Summary">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#087055]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} title="Summary">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tasks</h1>
        </div>

        <div className="hidden lg:flex gap-4 items-center py-4">
          <div className="flex-1">
            <Input
              placeholder="Search"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="border border-gray-300 bg-white placeholder-gray-500"
            />
          </div>

          <div className="w-48">
            <Select
              value={filters.insured || undefined}
              onValueChange={(value) => setFilters({...filters, insured: value || ''})}
            >
              <SelectTrigger className="border border-gray-300 bg-white">
                <SelectValue placeholder="Select Insureds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Insureds</SelectItem>
                {getUniqueInsureds().map((insured) => (
                  <SelectItem key={insured} value={insured}>
                    {insured}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Select
              value={filters.status || undefined}
              onValueChange={(value) => setFilters({...filters, status: value === '__all__' ? '' : value || ''})}
            >
              <SelectTrigger className="border border-gray-300 bg-white">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-44">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 pointer-events-none z-10">
              From:
            </span>
            <Input
              type="date"
              value={filters.dueDateStart}
              onChange={(e) => setFilters({...filters, dueDateStart: e.target.value})}
              className="w-full border border-gray-300 bg-white pl-14"
              placeholder="From date"
            />
          </div>

          <div className="relative w-44">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 pointer-events-none z-10">
              To:
            </span>
            <Input
              type="date"
              value={filters.dueDateEnd}
              onChange={(e) => setFilters({...filters, dueDateEnd: e.target.value})}
              className="w-full border border-gray-300 bg-white pl-10"
              placeholder="To date"
            />
          </div>

          <Button
            onClick={clearFilters}
            variant="outline"
            className="text-gray-600 border-gray-300 hover:bg-gray-50 px-4"
          >
            Clear Filters
          </Button>

          <Button
            onClick={handleAddServiceRequest}
            className="bg-[#087055] hover:bg-[#065a42] text-white px-6"
          >
            Add Service Request
          </Button>
        </div>

        <div className="lg:hidden md:hidden sm:block space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="flex-1 border border-gray-300 bg-white placeholder-gray-500 text-sm"
            />
            <Button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              variant="outline"
              size="sm"
              className="px-3 border-gray-300"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleAddServiceRequest}
              size="sm"
              className="bg-[#087055] hover:bg-[#065a42] text-white px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {showMobileFilters && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  value={filters.insured || undefined}
                  onValueChange={(value) => setFilters({...filters, insured: value || ''})}
                >
                  <SelectTrigger className="border border-gray-300 bg-white text-sm">
                    <SelectValue placeholder="Select Insureds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Insureds</SelectItem>
                    {getUniqueInsureds().map((insured) => (
                      <SelectItem key={insured} value={insured}>
                        {insured}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status || undefined}
                  onValueChange={(value) => setFilters({...filters, status: value === '__all__' ? '' : value || ''})}
                >
                  <SelectTrigger className="border border-gray-300 bg-white text-sm">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 pointer-events-none z-10">
                    From:
                  </span>
                  <Input
                    type="date"
                    value={filters.dueDateStart}
                    onChange={(e) => setFilters({...filters, dueDateStart: e.target.value})}
                    className="w-full border border-gray-300 bg-white pl-12 text-sm"
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 pointer-events-none z-10">
                    To:
                  </span>
                  <Input
                    type="date"
                    value={filters.dueDateEnd}
                    onChange={(e) => setFilters({...filters, dueDateEnd: e.target.value})}
                    className="w-full border border-gray-300 bg-white pl-10 text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="w-full text-gray-600 border-gray-300 hover:bg-gray-50 text-sm"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        <div className="hidden md:block lg:hidden">
          <div className="space-y-4 mb-6">
            <div className="flex gap-3">
              <Input
                placeholder="Search"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="flex-1 border border-gray-300 bg-white placeholder-gray-500"
              />
              <Button
                onClick={handleAddServiceRequest}
                className="bg-[#087055] hover:bg-[#065a42] text-white px-4 whitespace-nowrap"
              >
                Add Request
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                value={filters.insured || undefined}
                onValueChange={(value) => setFilters({...filters, insured: value || ''})}
              >
                <SelectTrigger className="border border-gray-300 bg-white">
                  <SelectValue placeholder="Select Insureds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Insureds</SelectItem>
                  {getUniqueInsureds().map((insured) => (
                    <SelectItem key={insured} value={insured}>
                      {insured}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status || undefined}
                onValueChange={(value) => setFilters({...filters, status: value === '__all__' ? '' : value || ''})}
              >
                <SelectTrigger className="border border-gray-300 bg-white">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 pointer-events-none z-10">
                  From:
                </span>
                <Input
                  type="date"
                  value={filters.dueDateStart}
                  onChange={(e) => setFilters({...filters, dueDateStart: e.target.value})}
                  className="w-full border border-gray-300 bg-white pl-12"
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 pointer-events-none z-10">
                  To:
                </span>
                <Input
                  type="date"
                  value={filters.dueDateEnd}
                  onChange={(e) => setFilters({...filters, dueDateEnd: e.target.value})}
                  className="w-full border border-gray-300 bg-white pl-8"
                />
              </div>
            </div>

            <Button
              onClick={clearFilters}
              variant="outline"
              className="w-full text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="hidden lg:block">
          <Card className="shadow-sm border-0 relative">
            <CardContent className="p-0">
              <div className="overflow-x-auto relative">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-[#087055] hover:bg-[#087055] border-0">
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Insured</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Serv Que ID</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-center border-0 whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Service Que Category</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Assigned By</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Assigned To</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Due Date:</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Started Date</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Completion Date</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Time Spent</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Modified By:</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Created On:</TableHead>
                      <TableHead className="text-white font-medium py-4 px-6 text-center border-0 whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRequests.length > 0 ? (
                      currentRequests.map((request, index) => (
                        <TableRow 
                          key={request.id} 
                          className={`hover:bg-gray-50 border-0 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <TableCell className="py-4 px-6 border-0">
                            <div className="font-medium text-gray-900">
                              {request.insured}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="font-medium text-[#087055]">
                              {request.serviceQueueId}
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-4 px-6 border-0">
                            <Badge className={`font-semibold px-3 py-1 ${getStatusColor(getDisplayStatus(request.taskStatus, request.closedAt))}`}>
                              {getDisplayStatus(request.taskStatus, request.closedAt).replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {request.serviceQueueCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {request.assignedBy.firstName} {request.assignedBy.lastName}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Not Assigned'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className={`${isOverdue(request.dueDate, request.taskStatus) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                              {formatDueDateWithTime(request.dueDate, request.dueTime)}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {request.inProgressAt ? formatDate(request.inProgressAt) : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {request.closedAt ? formatDate(request.closedAt) : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {request.timeSpent ? formatTimeSpent(request.timeSpent) : calculateTimeSpent(request.inProgressAt, request.closedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {request.modifiedBy ?
                                `${request.modifiedBy.firstName} ${request.modifiedBy.lastName}` :
                                'Not modified'
                              }
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0">
                            <div className="text-gray-600">
                              {formatDate(request.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-0 text-center">
                            <Button
                              onClick={() => window.location.href = `/admin/requests/${request.id}`}
                              variant="outline"
                              size="sm"
                              className="text-teal-600 border-teal-600 hover:bg-teal-50 px-3 py-1"
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-0">
                        <TableCell colSpan={12} className="text-center py-12 text-gray-500 border-0">
                          No requests found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden md:block lg:hidden">
          {currentRequests.length > 0 ? (
            currentRequests.map((request) => (
              <TabletCard key={request.id} request={request} />
            ))
          ) : (
            <Card className="shadow-sm border">
              <CardContent className="p-8 text-center text-gray-500">
                No requests found matching your filters.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:hidden">
          {currentRequests.length > 0 ? (
            currentRequests.map((request) => (
              <MobileCard key={request.id} request={request} />
            ))
          ) : (
            <Card className="shadow-sm border">
              <CardContent className="p-8 text-center text-gray-500">
                No requests found matching your filters.
              </CardContent>
            </Card>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <div className="text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} results
            </div>
            <div className="flex space-x-1 order-1 sm:order-2">
              {renderPaginationButtons()}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}