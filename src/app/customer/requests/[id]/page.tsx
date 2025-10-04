'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, BarChart3, Settings, FileText, Upload, X, Loader2, ArrowLeft, Clock, User } from 'lucide-react';
import DocumentManagement from '@/components/ui/document-management';
import { useToast } from '@/hooks/useToast';

const getNavigation = (userRole: string) => [
  { name: 'Create Request', href: '/customer', icon: Building2, current: false },
  { name: 'Summary', href: '/customer/summary', icon: Building2, current: true },
  ...(userRole === 'customer_admin'
    ? [{ name: 'Insured Accounts', href: '/customer/insured-accounts', icon: Building2, current: false }]
    : []),
  { name: 'Reports', href: '/customer/reports', icon: BarChart3, current: false },
  ...(userRole === 'customer_admin'
    ? [{ name: 'Admin Settings', href: '/customer/admin/settings', icon: Settings, current: false }]
    : []),
];

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId?: string;
}

interface CustomerUser {
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
    email: string;
  };
  company: {
    companyName: string;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType?: string;
    createdAt: string;
    uploadedBy?: {
      firstName: string;
      lastName: string;
    };
  }>;
  notes?: Array<{
    id: string;
    noteContent: string;
    isInternal: boolean;
    createdAt: string;
    author: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  metadata?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  company?: {
    id: string;
    companyName: string;
  };
}

export default function CustomerRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;
  const { showToast, ToastContainer } = useToast();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [formData, setFormData] = useState({
    serviceQueueId: '',
    taskStatus: 'new',
    dueDate: '',
    dueTime: '',
    serviceObjective: '',
    insured: '',
    assignedById: '',
    assignedToId: '',
    serviceQueueCategory: 'client_service_cancel_non_renewal',
    companyId: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerUsers, setCustomerUsers] = useState<CustomerUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [navigation, setNavigation] = useState(getNavigation('customer'));
  
  // Note functionality
  const [newNote, setNewNote] = useState('');
  const [noteRecipientEmail, setNoteRecipientEmail] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Activity log functionality
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      fetchCustomerUsers();
      fetchCurrentUser();
      fetchActivityLogs();
    }
  }, [requestId]);

  // Update assignedById to current user when currentUser is loaded
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        assignedById: currentUser.id
      }));
    }
  }, [currentUser]);

  // Auto-populate recipient email when request data loads
  useEffect(() => {
    if (request && request.assignedTo && request.assignedTo.email) {
      console.log('Customer: Auto-populating email with:', request.assignedTo.email);
      setNoteRecipientEmail(request.assignedTo.email);
    } else if (request) {
      console.log('Customer: No assignedTo email found in request:', request);
    }
  }, [request]);


  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/customer/requests/detail?id=${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setRequest(data.request);
        
        // Populate form with request data
        setFormData({
          serviceQueueId: data.request.serviceQueueId,
          taskStatus: data.request.closedAt ? 'closed' : data.request.taskStatus,
          dueDate: data.request.dueDate ? data.request.dueDate.split('T')[0] : '',
          dueTime: data.request.dueTime || '',
          serviceObjective: data.request.serviceRequestNarrative,
          insured: data.request.insured,
          assignedById: data.request.assignedBy.id,
          assignedToId: data.request.assignedTo?.id || '',
          serviceQueueCategory: data.request.serviceQueueCategory,
          companyId: data.request.company.id || '',
        });
      } else {
        router.push('/customer/summary');
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      router.push('/customer/summary');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
        setNavigation(getNavigation(data.user.role));
      }
    }
  };

  const fetchCustomerUsers = async () => {
    const response = await fetch('/api/customer');
    if (response.ok) {
      const data = await response.json();
      const users = data.users || [];
      setCustomerUsers(users);
    } else {
      setCustomerUsers([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
  };

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.insured || !formData.serviceObjective || !formData.assignedById) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('requestId', requestId);
      formDataToSend.append('insured', formData.insured);
      formDataToSend.append('serviceRequestNarrative', formData.serviceObjective);
      formDataToSend.append('serviceQueueCategory', formData.serviceQueueCategory);
      formDataToSend.append('assignedById', formData.assignedById);
      formDataToSend.append('taskStatus', formData.taskStatus);

      if (formData.companyId) {
        formDataToSend.append('companyId', formData.companyId);
      }
      // Customers and customer_admin can modify due dates and times
      if (formData.dueDate) {
        formDataToSend.append('dueDate', formData.dueDate);
      }
      if (formData.dueTime) {
        formDataToSend.append('dueTime', formData.dueTime);
      }

      selectedFiles.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await fetch('/api/customer/requests/detail', {
        method: 'PUT',
        body: formDataToSend,
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Service request updated successfully!', 'success');
        fetchRequestDetails(); // Refresh the data
        fetchActivityLogs(); // Refresh activity logs
        setSelectedFiles([]);
      } else {
        showToast(`Failed to update service request: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      showToast('Error updating service request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDisplayStatus = (request: ServiceRequest) => {
    // If task has a completion date, show as closed regardless of stored status
    if (request.closedAt) {
      return 'closed';
    }
    return request.taskStatus;
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

  const handleDownloadAttachment = async (attachment: any) => {
    setDownloadingFileId(attachment.id || attachment.fileName);
    try {
      const response = await fetch(`/api/uploads/download?requestId=${encodeURIComponent(attachment.requestId)}&fileName=${encodeURIComponent(attachment.fileName)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error('Download failed:', errorData.error);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleDocumentUpload = async (files: FileList) => {
    const formDataToSend = new FormData();
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formDataToSend.append(key, value.toString());
      }
    });

    Array.from(files).forEach((file) => {
      formDataToSend.append('files', file);
    });

    const response = await fetch(`/api/customer/requests/${requestId}/upload`, {
      method: 'POST',
      body: formDataToSend,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
  };

  const handleDocumentDelete = async (attachmentId: string) => {
    const response = await fetch(`/api/uploads/delete?attachmentId=${attachmentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Delete failed');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const response = await fetch('/api/customer/requests/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId,
          noteContent: newNote,
          recipientEmail: noteRecipientEmail,
          isInternal: false
        }),
      });

      if (response.ok) {
        setNewNote('');
        fetchRequestDetails(); // Refresh to get the new note
        fetchActivityLogs(); // Refresh activity logs
        showToast('Note added and email sent successfully!', 'success');
      } else {
        const result = await response.json();
        showToast(`Failed to add note: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      showToast('Error adding note', 'error');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const fetchActivityLogs = async () => {
    if (!requestId) return;

    setIsLoadingActivity(true);
    try {
      const response = await fetch(`/api/customer/requests/${requestId}/activity`);
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.activities || []);
      } else {
        console.error('Failed to fetch activity logs');
        setActivityLogs([]);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'request_created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'request_updated':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'request_assigned':
        return <User className="h-4 w-4 text-green-500" />;
      case 'note_added':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'attachment_uploaded':
        return <Upload className="h-4 w-4 text-indigo-500" />;
      case 'status_changed':
        return <Clock className="h-4 w-4 text-teal-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'request_created':
        return 'Request Created';
      case 'request_updated':
        return 'Request Updated';
      case 'request_assigned':
        return 'Request Assigned';
      case 'note_added':
        return 'Note Added';
      case 'attachment_uploaded':
        return 'File Uploaded';
      case 'status_changed':
        return 'Status Changed';
      case 'user_created':
        return 'User Created';
      case 'user_updated':
        return 'User Updated';
      case 'company_updated':
        return 'Company Updated';
      case 'assignment_change_requested':
        return 'Assignment Change Requested';
      case 'assignment_change_approved':
        return 'Assignment Change Approved';
      case 'assignment_change_rejected':
        return 'Assignment Change Rejected';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatActivityDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatActivityMetadata = (metadata: string | undefined) => {
    if (!metadata) return null;

    try {
      const parsed = JSON.parse(metadata);

      // Format different types of metadata
      if (parsed.changeRequestId && parsed.currentAssignedId !== undefined) {
        return `Assignment change requested for task ${parsed.changeRequestId?.slice(0, 8)}...`;
      }

      if (parsed.fileName && parsed.fileSize) {
        return `Uploaded file "${parsed.fileName}" (${(parsed.fileSize / 1024).toFixed(1)} KB)`;
      }

      if (parsed.fromStatus && parsed.toStatus) {
        return `Status changed from "${parsed.fromStatus}" to "${parsed.toStatus}"`;
      }

      // For other metadata, try to format it nicely
      const entries = Object.entries(parsed);
      if (entries.length === 1 && entries[0][1]) {
        return `${entries[0][0]}: ${entries[0][1]}`;
      }

      // Return formatted key-value pairs for complex metadata
      return entries
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch {
      // If it's not JSON, just return it as is but cleaned up
      return metadata.replace(/[{}]/g, '').replace(/"/g, '');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navigation={navigation} title="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#087055]"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout navigation={navigation} title="">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Request not found</h2>
          <Button onClick={() => router.push('/customer/summary')} className="mt-4">
            Back to Summary
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} title="">
      <div className="space-y-6 bg-gray-50 min-h-screen p-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/customer/summary')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Summary</span>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Service Request</h1>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <Badge className={`px-3 py-1 ${getStatusColor(getDisplayStatus(request))}`}>
            {getDisplayStatus(request).replace('_', ' ')}
          </Badge>
          {request.taskStatus === 'in_progress' && request.inProgressAt && (
            <span className="text-sm text-gray-500">
              Started: {new Date(request.inProgressAt).toLocaleDateString()} at {new Date(request.inProgressAt).toLocaleTimeString()}
            </span>
          )}
          {request.taskStatus === 'closed' && request.closedAt && (
            <span className="text-sm text-gray-500">
              Completed: {new Date(request.closedAt).toLocaleDateString()} at {new Date(request.closedAt).toLocaleTimeString()}
            </span>
          )}
          <span className="text-sm text-gray-500">
            Created: {new Date(request.createdAt).toLocaleDateString()}
          </span>
          <span className="text-sm text-gray-500">
            Last Updated: {new Date(request.updatedAt).toLocaleDateString()}
          </span>
        </div>

        <div className="mb-6">
          <nav className="border-b border-gray-200 bg-white">
            <div className="flex space-x-8 px-6">
              <button 
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details' 
                    ? 'border-teal-500 text-teal-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('details')}
              >
                Request Details
              </button>
              <button 
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents' 
                    ? 'border-teal-500 text-teal-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('documents')}
              >
                Documents
              </button>
            </div>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeTab === 'details' && (
              <Card className="shadow-sm border border-gray-200 bg-white">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-gray-900">Edit Request</CardTitle>
                <p className="text-sm text-gray-500">Modify the details of this service request</p>
              </CardHeader>
              <CardContent className="p-6">
              <form onSubmit={handleUpdateRequest}>
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="serviceQueueId" className="text-sm font-medium text-gray-700 mb-2 block">
                      Service Queue Rec ID
                    </Label>
                    <Input
                      id="serviceQueueId"
                      value={formData.serviceQueueId}
                      readOnly
                      className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <Label htmlFor="taskStatus" className="text-sm font-medium text-gray-700 mb-2 block">
                      Task Status
                    </Label>
                    <Select value={formData.taskStatus} onValueChange={(value) => setFormData({...formData, taskStatus: value})}>
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        <SelectItem value="new" className="bg-white hover:bg-gray-50">New</SelectItem>
                        <SelectItem value="open" className="bg-white hover:bg-gray-50">Open</SelectItem>
                        <SelectItem value="in_progress" className="bg-white hover:bg-gray-50">In Progress</SelectItem>
                        <SelectItem value="closed" className="bg-white hover:bg-gray-50">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 mb-2 block">
                        Due Date
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        className="border-gray-200 w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueTime" className="text-sm font-medium text-gray-700 mb-2 block">
                        Due Time
                      </Label>
                      <Input
                        id="dueTime"
                        type="time"
                        value={formData.dueTime}
                        onChange={(e) => setFormData({...formData, dueTime: e.target.value})}
                        className="border-gray-200 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="serviceObjective" className="text-sm font-medium text-gray-700 mb-2 block">
                      Service Objective and Narrative *
                    </Label>
                    <Textarea
                      id="serviceObjective"
                      value={formData.serviceObjective}
                      onChange={(e) => setFormData({...formData, serviceObjective: e.target.value})}
                      placeholder="Enter the service request objective and narrative"
                      className="min-h-[100px] border-gray-200"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="insured" className="text-sm font-medium text-gray-700 mb-2 block">
                      Insured *
                    </Label>
                    <Input
                      id="insured"
                      placeholder="Enter insured name"
                      value={formData.insured}
                      onChange={(e) => setFormData({...formData, insured: e.target.value})}
                      required
                      className="border-gray-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignedById" className="text-sm font-medium text-gray-700 mb-2 block">
                      The Person Who Assigned (Assigned By) *
                    </Label>
                    <Select 
                      value={formData.assignedById} 
                      onValueChange={(value) => setFormData({...formData, assignedById: value})}
                    >
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue placeholder="Select who is assigning this request" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        {customerUsers.length > 0 ? (
                          customerUsers.map((user) => (
                            <SelectItem 
                              key={user.id} 
                              value={user.id}
                              className="bg-white hover:bg-gray-50"
                            >
                              {user.firstName} {user.lastName} ({user.role?.replace('_', ' ') || 'User'})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-users" disabled className="text-gray-400">
                            No users available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="assignedByEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                      Assigned By - Email Address
                    </Label>
                    <Input
                      id="assignedByEmail"
                      value={request?.assignedBy?.email || ''}
                      readOnly
                      className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                      placeholder="Email will be shown when assignee is selected"
                    />
                  </div>

                  <div>
                    <Label htmlFor="serviceQueueCategory" className="text-sm font-medium text-gray-700 mb-2 block">
                      Service Queue Category
                    </Label>
                    <Select 
                      value={formData.serviceQueueCategory} 
                      onValueChange={(value) => setFormData({...formData, serviceQueueCategory: value})}
                    >
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        <SelectItem value="policy_inquiry" className="bg-white hover:bg-gray-50">
                          Policy Inquiry
                        </SelectItem>
                        <SelectItem value="claims_processing" className="bg-white hover:bg-gray-50">
                          Claims Processing
                        </SelectItem>
                        <SelectItem value="account_update" className="bg-white hover:bg-gray-50">
                          Account Update
                        </SelectItem>
                        <SelectItem value="technical_support" className="bg-white hover:bg-gray-50">
                          Technical Support
                        </SelectItem>
                        <SelectItem value="billing_inquiry" className="bg-white hover:bg-gray-50">
                          Billing Inquiry
                        </SelectItem>
                        <SelectItem value="client_service_cancel_non_renewal" className="bg-white hover:bg-gray-50">
                          Insured Service - Cancel/Non Renewal Notice
                        </SelectItem>
                        <SelectItem value="other" className="bg-white hover:bg-gray-50">
                          Other
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="closeDate" className="text-sm font-medium text-gray-700 mb-2 block">
                      Close Date
                    </Label>
                    <Input
                      id="closeDate"
                      type="date"
                      value={request?.closedAt ? new Date(request.closedAt).toISOString().split('T')[0] : ''}
                      readOnly
                      className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                      placeholder="Date when request is closed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Close date is managed by agents and admins</p>
                  </div>

                  {request.attachments && request.attachments.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Existing Attachments
                      </Label>
                      <div className="space-y-2">
                        {request.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{attachment.fileName}</span>
                                <span className="text-xs text-gray-500 ml-2">({formatFileSize(attachment.fileSize)})</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={downloadingFileId === (attachment.id || attachment.fileName)}
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {downloadingFileId === (attachment.id || attachment.fileName) ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                'Download'
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Add New Files
                    </Label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-gray-300 transition-colors bg-gray-50">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <div className="bg-gray-100 rounded-full p-3 mb-3">
                          <Upload className="h-6 w-6 text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Drag and Drop Your Files</span>
                        <span className="text-xs text-gray-400 mt-1">Max. File formats: .pdf, .docx, .jpg, .png (up to 10MB)</span>
                      </label>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{file.name}</span>
                                <span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button 
                      type="button"
                      variant="outline"
                      className="mt-3 text-sm border-gray-200"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Select Files
                    </Button>
                  </div>

                  <div className="pt-6 flex space-x-4">
                    <Button 
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-md"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Request'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/customer/summary')}
                      className="px-8 py-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
              </Card>
            )}

            {activeTab === 'documents' && (
              <DocumentManagement
                requestId={requestId}
                attachments={request?.attachments || []}
                canUpload={false}
                canDelete={false}
                onRefresh={fetchRequestDetails}
              />
            )}
          </div>

          <div className="space-y-4">
            {currentUser && (currentUser.role === 'agent' || currentUser.role === 'super_admin') && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assignedTo" className="text-sm font-medium text-gray-700 mb-2 block">
                    Assigned to:
                  </Label>
                  <Input
                    value={
                      formData.assignedToId
                        ? customerUsers.find(user => user.id === formData.assignedToId)
                          ? `${customerUsers.find(user => user.id === formData.assignedToId)?.firstName} ${customerUsers.find(user => user.id === formData.assignedToId)?.lastName}`
                          : 'Unknown User'
                        : 'Unassigned'
                    }
                    readOnly
                    className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Assignments can only be modified by agent managers and administrators</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Modified on:
                  </Label>
                  <Input
                    value={request?.updatedAt 
                      ? new Date(request.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Unknown'
                    }
                    readOnly
                    className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <Card className="shadow-sm border border-gray-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-gray-900">Notes & Communication</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddNote} className="mb-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="noteRecipientEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                      Email Recipient
                    </Label>
                    <Input
                      id="noteRecipientEmail"
                      type="email"
                      value={noteRecipientEmail}
                      onChange={(e) => setNoteRecipientEmail(e.target.value)}
                      placeholder="Email recipient will be auto-populated"
                      className="border-gray-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newNote" className="text-sm font-medium text-gray-700 mb-2 block">
                      Add Note
                    </Label>
                    <Textarea
                      id="newNote"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Type your message here..."
                      className="min-h-[100px] border-gray-200"
                      rows={4}
                      required
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={isSubmittingNote}
                  >
                    {isSubmittingNote ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Note'
                    )}
                  </Button>
                </div>
              </form>

              {/* Notes List */}
              {request?.notes && request.notes.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Previous Notes</h4>
                  {request.notes
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((note) => (
                    <div key={note.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 mb-2">
                            {note.noteContent}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          By: {note.author.firstName} {note.author.lastName}
                        </span>
                        <span>{new Date(note.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No notes yet</p>
                  <p className="text-xs text-gray-500 mt-1">Add a note to start the conversation</p>
                </div>
              )}
            </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="shadow-sm border border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-gray-900">Activity Log</CardTitle>
                <Clock className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingActivity ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : activityLogs && activityLogs.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {activityLogs.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {getActivityTypeLabel(activity.type)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {activity.description}
                              </p>
                              {/* {activity.metadata && formatActivityMetadata(activity.metadata) && (
                                <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1 inline-block">
                                  {formatActivityMetadata(activity.metadata)}
                                </p>
                              )} */}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>
                                {activity.user.firstName} {activity.user.lastName}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="capitalize">
                                {activity.user.role.replace('_', ' ')}
                              </span>
                            </span>
                            <span>{formatActivityDate(activity.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No activity yet</p>
                    <p className="text-xs text-gray-500 mt-1">Activity will appear here as changes are made to this request</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <ToastContainer />
    </DashboardLayout>
  );
}