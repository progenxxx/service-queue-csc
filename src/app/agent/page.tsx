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
  BarChart3,
  Home,
  Plus,
  Filter
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

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  onClick?: () => void;
}

const getNavigation = (currentPath: string = '/agent'): NavigationItem[] => [
  { 
    name: 'All Request', 
    href: '/agent', 
    icon: Home, 
    current: currentPath === '/agent',
    onClick: currentPath === '/agent' ? () => {} : undefined
  },
  { 
    name: 'My Queues', 
    href: '/agent/summary', 
    icon: BarChart3, 
    current: currentPath === '/agent/summary',
    onClick: currentPath === '/agent/summary' ? () => {} : undefined
  },
  { 
    name: 'Reports', 
    href: '/agent/reports', 
    icon: BarChart3, 
    current: currentPath === '/agent/reports',
    onClick: currentPath === '/agent/reports' ? () => {} : undefined
  },
];

const fetchAllRequests = async (): Promise<ServiceRequest[]> => {
  const response = await fetch('/api/agent/summary');
  if (!response.ok) {
    throw new Error('Failed to fetch all requests');
  }
  const data = await response.json();
  return data.requests || [];
};

export default function AgentSummaryPage() {
  const { timezone } = useTimezone();
  const queryClient = useQueryClient();
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const navigation = getNavigation('/agent');

  const MobileCard = ({ request }: { request: ServiceRequest }) => (
    <Card className="shadow-sm border mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-900 text-sm">{request.insured}</div>
              <div className="font-medium text-[#087055] text-sm">{request.serviceQueueId}</div>
            </div>
            <Badge
              className={`font-semibold px-2 py-1 text-xs ${getStatusColor(getDisplayStatus(request))}`}
            >
              {getDisplayStatus(request).replace('_', ' ')}
            </Badge>
          </div>
          
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">Category:</span>
              <div className="text-gray-600">
                {request.serviceQueueCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
            <div>
              <span className="font-medium">Assigned By:</span>
              <div className="text-gray-600">
                {request.assignedBy.firstName} {request.assignedBy.lastName}
              </div>
            </div>
            <div>
              <span className="font-medium">Assigned To:</span>
              <div className="text-gray-600">
                {request.assignedTo
                  ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
                  : 'Not Assigned'}
              </div>
            </div>
            <div>
              <span className="font-medium">Due Date:</span>
              <div className={`${isOverdue(request.dueDate, request.taskStatus) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                {formatDueDateWithTime(request.dueDate, request.dueTime)}
              </div>
            </div>
            <div>
              <span className="font-medium">Created:</span>
              <div className="text-gray-600">{formatDate(request.createdAt)}</div>
            </div>
            {request.closedAt && (
              <div className="col-span-2">
                <span className="font-medium">Completed:</span>
                <div className="text-gray-600">{formatDate(request.closedAt)}</div>
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <Button
              onClick={() => window.location.href = `/agent/requests/${request.id}`}
              variant="outline"
              size="sm"
              className="w-full text-white bg-[#087055] border-[#087055] hover:bg-[#065a42] text-xs"
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  const { data: requests = [], isLoading: loading, error } = useQuery({
    queryKey: ['agent-all-requests'],
    queryFn: fetchAllRequests,
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

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);


  const handleAddServiceRequest = () => {
    window.location.href = '/agent/requests';
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['agent-all-requests'] });
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

  const getDisplayStatus = (request: ServiceRequest) => {
    // If task has a completion date, show as closed regardless of stored status
    if (request.closedAt) {
      return 'closed';
    }
    return request.taskStatus;
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
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <div className="ml-auto">
              {/* <Button
                onClick={handleAddServiceRequest}
                className="bg-[#087055] hover:bg-[#065a42] text-white px-6"
              >
                Add Service Request
              </Button> */}
            </div>
          </div>
        </div>

        <div className="lg:hidden mb-4">
          <Button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            variant="outline"
            className="w-full flex items-center justify-between text-gray-600 border-gray-300"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center py-4">
            <div className="flex-1 mb-4 lg:mb-0">
              <Input
                placeholder="Search"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="border border-gray-300 bg-white placeholder-gray-500"
              />
            </div>

            <div className="w-full lg:w-48 mb-4 lg:mb-0">
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

            <div className="w-full lg:w-48 mb-4 lg:mb-0">
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

            <div className="flex gap-2 w-full lg:w-auto">
              <Button
                onClick={clearFilters}
                variant="outline"
                className="text-gray-600 border-gray-300 hover:bg-gray-50 px-4 flex-1 lg:flex-initial"
              >
                Clear Filters
              </Button>

              {/* <Button
                onClick={handleRefresh}
                variant="outline"
                disabled={loading}
                className="text-gray-600 border-gray-300 hover:bg-gray-50 px-4 flex-1 lg:flex-initial"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button> */}
            </div>
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          {currentRequests.length > 0 ? (
            currentRequests.map((request) => (
              <MobileCard key={request.id} request={request} />
            ))
          ) : (
            <Card className="shadow-sm border">
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">
                  {filters.search || filters.insured || filters.status ? 
                    'No requests found matching your filters.' : 
                    'No requests assigned to you yet.'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="shadow-sm border-0 hidden lg:block relative">
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
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Due Date</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Started Date</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Completion Date</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Modified By</TableHead>
                    <TableHead className="text-white font-medium py-4 px-6 text-left border-0 whitespace-nowrap">Created On</TableHead>
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
                          <Badge className={`font-semibold px-3 py-1 ${getStatusColor(getDisplayStatus(request))}`}>
                            {getDisplayStatus(request).replace('_', ' ')}
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
                        <TableCell className="text-center py-4 px-6 border-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-white bg-[#087055] border-[#087055] hover:bg-[#065a42] hover:text-white hover:border-[#065a42] px-4 py-2 text-xs font-medium rounded"
                            onClick={() => window.location.href = `/agent/requests/${request.id}`}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-0">
                      <TableCell colSpan={11} className="text-center py-12 text-gray-500 border-0">
                        {filters.search || filters.insured || filters.status ?
                          'No requests found matching your filters.' :
                          'No requests assigned to you yet.'
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <span className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} results
              </span>
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-gray-300"
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
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-gray-300"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}