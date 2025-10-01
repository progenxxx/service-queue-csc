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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, Home, FileText, Upload, X, Loader2, ArrowLeft, Clock, User, UserX } from 'lucide-react';
import DocumentManagement from '@/components/ui/document-management';
import type { Company } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
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

interface SubTask {
  id: string;
  taskId: string;
  taskDescription: string;
  assignedToId: string;
  assignedById: string;
  dueDate: string | null;
  taskStatus: string;
  createdAt: string;
  assignedTo: {
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
}

export default function AgentRequestDetailsPage() {
  const navigation = getNavigation('/agent/summary');
  
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
    closeDate: '',
    serviceObjective: '',
    insured: '',
    assignedById: '',
    assignedToId: '',
    serviceQueueCategory: '',
    timeSpent: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Note functionality
  const [newNote, setNewNote] = useState('');
  const [noteRecipientEmail, setNoteRecipientEmail] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'tasks' | 'assignment-requests'>('details');

  // Activity log functionality
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Assignment change requests functionality
  const [assignmentChangeRequests, setAssignmentChangeRequests] = useState<any[]>([]);
  const [isLoadingAssignmentRequests, setIsLoadingAssignmentRequests] = useState(false);

  // Assignment change request functionality
  const [showAssignmentChangeDialog, setShowAssignmentChangeDialog] = useState(false);
  const [assignmentChangeReason, setAssignmentChangeReason] = useState('');
  const [requestedAssigneeId, setRequestedAssigneeId] = useState('manager_choice');
  const [isSubmittingAssignmentChange, setIsSubmittingAssignmentChange] = useState(false);

  // Sub-tasks functionality
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [isLoadingSubTasks, setIsLoadingSubTasks] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    taskDescription: '',
    assignedToId: '',
    dueDate: '',
    taskStatus: 'new',
  });
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      fetchAllUsers();
      fetchCurrentUser();
      fetchAgents();
      fetchActivityLogs();
      fetchAssignmentChangeRequests();
      fetchSubTasks();
    }
  }, [requestId]);

  // Auto-populate recipient email when request data loads
  useEffect(() => {
    if (request && request.assignedBy && request.assignedBy.email) {
      console.log('Agent: Auto-populating email with:', request.assignedBy.email);
      setNoteRecipientEmail(request.assignedBy.email);
    } else if (request) {
      console.log('Agent: No assignedBy email found in request:', request);
    }
  }, [request]);


  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/agent/requests/detail?id=${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setRequest(data.request);
        
        setFormData({
          serviceQueueId: data.request.serviceQueueId,
          taskStatus: data.request.closedAt ? 'closed' : data.request.taskStatus,
          dueDate: data.request.dueDate ? data.request.dueDate.split('T')[0] : '',
          dueTime: data.request.dueTime || '',
          closeDate: data.request.closedAt ? data.request.closedAt.split('T')[0] : '',
          serviceObjective: data.request.serviceRequestNarrative,
          insured: data.request.insured,
          assignedById: data.request.assignedBy.id,
          assignedToId: data.request.assignedTo?.id || '',
          serviceQueueCategory: data.request.serviceQueueCategory,
          timeSpent: data.request.timeSpent?.toString() || '',
        });
      } else {
        router.push('/agent/summary');
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      router.push('/agent/summary');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        const validUsers = (data.users || []).filter(
          (user: User) =>
            user &&
            typeof user.id === 'string' &&
            typeof user.firstName === 'string' &&
            typeof user.lastName === 'string'
        );
        setAllUsers(validUsers);
      } else {
        setAllUsers([]);
      }
    } catch {
      setAllUsers([]);
    }
  };


  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      }
    } catch {}
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agent/agents');
      if (response.ok) {
        const data = await response.json();
        const validAgents = (data.agents || []).filter(
          (agent: User) =>
            agent &&
            typeof agent.id === 'string' &&
            typeof agent.firstName === 'string' &&
            typeof agent.lastName === 'string'
        );
        setAgents(validAgents);
      } else {
        setAgents([]);
      }
    } catch {
      setAgents([]);
    }
  };

  const fetchActivityLogs = async () => {
    if (!requestId) return;

    setIsLoadingActivity(true);
    try {
      const response = await fetch(`/api/agent/requests/${requestId}/activity`);
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

  const fetchAssignmentChangeRequests = async () => {
    if (!requestId) return;

    setIsLoadingAssignmentRequests(true);
    try {
      const response = await fetch(`/api/agent/assignment-change?requestId=${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setAssignmentChangeRequests(data.changeRequests || []);
      } else {
        console.error('Failed to fetch assignment change requests');
        setAssignmentChangeRequests([]);
      }
    } catch (error) {
      console.error('Error fetching assignment change requests:', error);
      setAssignmentChangeRequests([]);
    } finally {
      setIsLoadingAssignmentRequests(false);
    }
  };

  const fetchSubTasks = async () => {
    try {
      setIsLoadingSubTasks(true);
      const response = await fetch(`/api/agent/subtasks?requestId=${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setSubTasks(data.tasks || []);
      } else {
        setSubTasks([]);
      }
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      setSubTasks([]);
    } finally {
      setIsLoadingSubTasks(false);
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
      formDataToSend.append('assignedToId', formData.assignedToId === 'unassigned' ? '' : formData.assignedToId);
      formDataToSend.append('taskStatus', formData.taskStatus);

      // Agent managers and super admins can modify due dates, due times and close dates
      if (formData.dueDate && (currentUser?.role === 'agent_manager' || currentUser?.role === 'super_admin')) {
        formDataToSend.append('dueDate', formData.dueDate);
      }
      if (formData.dueTime && (currentUser?.role === 'agent_manager' || currentUser?.role === 'super_admin')) {
        formDataToSend.append('dueTime', formData.dueTime);
      }
      if (formData.closeDate && (currentUser?.role === 'agent_manager' || currentUser?.role === 'super_admin')) {
        formDataToSend.append('closedAt', formData.closeDate);
      }

      // Add time spent if provided
      if (formData.timeSpent) {
        formDataToSend.append('timeSpent', formData.timeSpent);
      }

      selectedFiles.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await fetch('/api/agent/requests/detail', {
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

  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const handleDownloadAttachment = async (attachment: any) => {
    setDownloadingFile(attachment.id);
    try {
      const response = await fetch(`/api/uploads/download?requestId=${encodeURIComponent(requestId)}&fileName=${encodeURIComponent(attachment.fileName)}`);
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
        showToast('Failed to download file', 'error');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast('Error downloading file', 'error');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDocumentUpload = async (files: FileList) => {
    const formDataToSend = new FormData();
    
    Array.from(files).forEach((file) => {
      formDataToSend.append('files', file);
    });

    const response = await fetch(`/api/agent/requests/${requestId}/upload`, {
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
      const response = await fetch('/api/agent/requests/notes', {
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

  const handleAssignmentChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignmentChangeReason.trim()) {
      showToast('Please provide a reason for the assignment change request', 'error');
      return;
    }

    setIsSubmittingAssignmentChange(true);
    try {
      const response = await fetch('/api/agent/assignment-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          requestedAssigneeId: requestedAssigneeId === 'manager_choice' ? undefined : requestedAssigneeId || undefined,
          reason: assignmentChangeReason,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Assignment change request submitted successfully!', 'success');
        setShowAssignmentChangeDialog(false);
        setAssignmentChangeReason('');
        setRequestedAssigneeId('manager_choice');
        fetchActivityLogs(); // Refresh activity logs to show the new request
      } else {
        showToast(`Failed to submit assignment change request: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error submitting assignment change request:', error);
      showToast('Error submitting assignment change request', 'error');
    } finally {
      setIsSubmittingAssignmentChange(false);
    }
  };

  const handleReviewAssignmentRequest = async (changeRequestId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/agent/assignment-change/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeRequestId,
          action,
          reviewComment: action === 'reject' ? 'Rejected by agent manager' : 'Approved by agent manager',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Assignment change request ${action}d successfully!`, 'success');
        fetchAssignmentChangeRequests(); // Refresh assignment change requests
        fetchRequestDetails(); // Refresh request details to update assigned to field
        fetchActivityLogs(); // Refresh activity logs
      } else {
        showToast(`Failed to ${action} assignment change request: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error(`Error ${action}ing assignment change request:`, error);
      showToast(`Error ${action}ing assignment change request`, 'error');
    }
  };

  const handleAddSubTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTaskData.taskDescription || !newTaskData.assignedToId) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('requestId', requestId);
      formDataToSend.append('taskDescription', newTaskData.taskDescription);
      formDataToSend.append('assignedToId', newTaskData.assignedToId);
      if (newTaskData.dueDate) {
        formDataToSend.append('dueDate', newTaskData.dueDate);
      }

      const response = await fetch('/api/agent/subtasks', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Subtask created successfully!', 'success');
        setShowAddTaskDialog(false);
        setNewTaskData({ taskDescription: '', assignedToId: '', dueDate: '', taskStatus: 'new' });
        fetchSubTasks(); // Refresh subtasks list
      } else {
        showToast(`Failed to create subtask: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      showToast('Error creating subtask', 'error');
    }
  };

  const handleUpdateSubTask = async (subtaskId: string, taskStatus: string) => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('subtaskId', subtaskId);
      formDataToSend.append('taskStatus', taskStatus);

      const response = await fetch('/api/agent/subtasks', {
        method: 'PUT',
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Subtask updated successfully!', 'success');
        fetchSubTasks(); // Refresh subtasks list
      } else {
        showToast(`Failed to update subtask: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      showToast('Error updating subtask', 'error');
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
          <Button onClick={() => router.push('/agent/summary')} className="mt-4">
            Back to Summary
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} title="">
      <ToastContainer />
      <div className="space-y-6 bg-gray-50 min-h-screen p-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/agent/summary')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My Queues</span>
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
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>
              {currentUser?.role === 'agent_manager' && (
                <button
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'assignment-requests'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('assignment-requests')}
                >
                  Assignment Requests ({assignmentChangeRequests.filter(req => req.status === 'pending').length})
                </button>
              )}
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
                        readOnly={currentUser?.role !== 'agent_manager' && currentUser?.role !== 'super_admin'}
                        className={currentUser?.role === 'agent_manager' || currentUser?.role === 'super_admin'
                          ? "border-gray-200 w-full"
                          : "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed w-full"}
                      />
                      {currentUser?.role !== 'agent_manager' && currentUser?.role !== 'super_admin' && (
                        <p className="text-xs text-gray-500 mt-1">Due dates can only be modified by agent managers and administrators</p>
                      )}
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
                        readOnly={currentUser?.role !== 'agent_manager' && currentUser?.role !== 'super_admin'}
                        className={currentUser?.role === 'agent_manager' || currentUser?.role === 'super_admin'
                          ? "border-gray-200 w-full"
                          : "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed w-full"}
                      />
                      {currentUser?.role !== 'agent_manager' && currentUser?.role !== 'super_admin' && (
                        <p className="text-xs text-gray-500 mt-1">Due times can only be modified by agent managers and administrators</p>
                      )}
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
                      value={formData.insured}
                      onChange={(e) => setFormData({...formData, insured: e.target.value})}
                      placeholder="Enter insured name"
                      className="border-gray-200"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignedById" className="text-sm font-medium text-gray-700 mb-2 block">
                      The Person Who Assigned (Assigned By) *
                    </Label>
                    <Select 
                      key={`assigned-by-${formData.assignedById}-${allUsers.length}`}
                      value={formData.assignedById} 
                      onValueChange={(value) => {
                        setFormData({...formData, assignedById: value});
                      }}
                    >
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue placeholder="Select who is assigning this request" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        {allUsers.length > 0 ? (
                          allUsers.map((user) => (
                            <SelectItem 
                              key={user.id} 
                              value={user.id}
                              className="bg-white hover:bg-gray-50"
                            >
                              {user.firstName} {user.lastName} ({user.role.replace('_', ' ')})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-users" disabled className="text-gray-400">
                            No users available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {allUsers.length === 0 && (
                      <p className="mt-1 text-xs text-red-500">
                        No users found.
                      </p>
                    )}
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

                  {/* Assigned To field commented out - now moved above Notes section */}
                  {/* <div>
                    <Label htmlFor="assignedToId" className="text-sm font-medium text-gray-700 mb-2 block">
                      Assigned To (Agent)
                    </Label>
                    <Select 
                      key={`assigned-to-${formData.assignedToId}-${agents.length}`}
                      value={formData.assignedToId} 
                      onValueChange={(value) => setFormData({...formData, assignedToId: value})}
                    >
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue placeholder="Select an agent to assign this request" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        <SelectItem value="unassigned" className="bg-white hover:bg-gray-50">
                          Unassigned
                        </SelectItem>
                        {agents.length > 0 ? (
                          agents.map((agent) => (
                            <SelectItem 
                              key={agent.id} 
                              value={agent.id}
                              className="bg-white hover:bg-gray-50"
                            >
                              {agent.firstName} {agent.lastName} (Agent)
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-agents" disabled className="text-gray-400">
                            No agents available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {agents.length === 0 && (
                      <p className="mt-1 text-xs text-red-500">
                        No agents found.
                      </p>
                    )}
                  </div> */}

                  <div>
                    <Label htmlFor="serviceQueueCategory" className="text-sm font-medium text-gray-700 mb-2 block">
                      Service Queue Category
                    </Label>
                    <Select value={formData.serviceQueueCategory} onValueChange={(value) => setFormData({...formData, serviceQueueCategory: value})}>
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue placeholder="Select a category" />
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
                      value={formData.closeDate}
                      onChange={(e) => setFormData({...formData, closeDate: e.target.value})}
                      readOnly={currentUser?.role !== 'agent_manager' && currentUser?.role !== 'super_admin'}
                      className={currentUser?.role === 'agent_manager' || currentUser?.role === 'super_admin'
                        ? "border-gray-200"
                        : "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"}
                      placeholder="Date when request is closed"
                    />
                    {currentUser?.role !== 'agent_manager' && currentUser?.role !== 'super_admin' && (
                      <p className="text-xs text-gray-500 mt-1">Close date can only be modified by agent managers and administrators</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="timeSpent" className="text-sm font-medium text-gray-700 mb-2 block">
                      Time Spent (minutes)
                    </Label>
                    <Input
                      id="timeSpent"
                      type="number"
                      min="0"
                      value={formData.timeSpent}
                      onChange={(e) => setFormData({...formData, timeSpent: e.target.value})}
                      className="border-gray-200"
                      placeholder="Enter time spent in minutes (e.g., 30, 60, 120)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Record how much time you spent completing this task</p>
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
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="text-blue-600 hover:text-blue-700"
                              disabled={downloadingFile === attachment.id}
                            >
                              {downloadingFile === attachment.id ? (
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
                      onClick={() => router.push('/agent/summary')}
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
                canUpload={true}
                canDelete={true}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                onRefresh={fetchRequestDetails}
              />
            )}

            {activeTab === 'tasks' && (
              <Card className="shadow-sm border border-gray-200 bg-white">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">Subtasks</CardTitle>
                      <p className="text-sm text-gray-500">Manage subtasks for this request</p>
                    </div>
                    {currentUser?.role === 'agent_manager' && (
                      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
                        <DialogTrigger asChild>
                          <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                            Add Subtask
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Add New Subtask</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleAddSubTask} className="space-y-4">
                            <div>
                              <Label htmlFor="taskDescription" className="text-sm font-medium text-gray-700 mb-2 block">
                                Task Description *
                              </Label>
                              <Textarea
                                id="taskDescription"
                                value={newTaskData.taskDescription}
                                onChange={(e) => setNewTaskData({...newTaskData, taskDescription: e.target.value})}
                                placeholder="Describe the subtask..."
                                className="min-h-[100px] border-gray-200"
                                rows={4}
                                required
                              />
                            </div>

                            <div>
                              <Label htmlFor="assignedToId" className="text-sm font-medium text-gray-700 mb-2 block">
                                Assigned To *
                              </Label>
                              <Select
                                value={newTaskData.assignedToId}
                                onValueChange={(value) => setNewTaskData({...newTaskData, assignedToId: value})}
                              >
                                <SelectTrigger className="border-gray-200 bg-white">
                                  <SelectValue placeholder="Select an agent" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-200">
                                  {agents.length > 0 ? (
                                    agents.map((agent) => (
                                      <SelectItem
                                        key={agent.id}
                                        value={agent.id}
                                        className="bg-white hover:bg-gray-50"
                                      >
                                        {agent.firstName} {agent.lastName}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-agents" disabled className="text-gray-400">
                                      No agents available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="assignedBy" className="text-sm font-medium text-gray-700 mb-2 block">
                                Assigned By
                              </Label>
                              <Input
                                id="assignedBy"
                                value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
                                readOnly
                                className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 mb-2 block">
                                  Due Date
                                </Label>
                                <Input
                                  id="dueDate"
                                  type="date"
                                  value={newTaskData.dueDate}
                                  onChange={(e) => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                                  className="border-gray-200"
                                />
                              </div>
                              <div>
                                <Label htmlFor="taskStatus" className="text-sm font-medium text-gray-700 mb-2 block">
                                  Task Status
                                </Label>
                                <Select
                                  value={newTaskData.taskStatus}
                                  onValueChange={(value) => setNewTaskData({...newTaskData, taskStatus: value})}
                                >
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
                            </div>

                            <div className="flex gap-3 pt-4">
                              <Button
                                type="submit"
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                                disabled={isSubmittingTask}
                              >
                                {isSubmittingTask ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  'Create Subtask'
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowAddTaskDialog(false);
                                  setNewTaskData({ taskDescription: '', assignedToId: '', dueDate: '', taskStatus: 'new' });
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {isLoadingSubTasks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : subTasks && subTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Insured
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assigned By
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assigned To
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {subTasks.map((subtask) => (
                            <tr key={subtask.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm text-gray-900">
                                {request.insured}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600">
                                {subtask.assignedBy.firstName} {subtask.assignedBy.lastName}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600">
                                {subtask.assignedTo.firstName} {subtask.assignedTo.lastName}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600">
                                {subtask.dueDate
                                  ? new Date(subtask.dueDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'No due date'
                                }
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <Badge className={`px-2 py-1 ${getStatusColor(subtask.taskStatus)}`}>
                                  {subtask.taskStatus.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      View Task
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                      <DialogTitle>Task Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                          Task Description
                                        </Label>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                          <p className="text-sm text-gray-900">{subtask.taskDescription}</p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Insured
                                          </Label>
                                          <Input
                                            value={request.insured}
                                            readOnly
                                            className="bg-gray-50 border-gray-200 text-gray-600"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Assigned By
                                          </Label>
                                          <Input
                                            value={`${subtask.assignedBy.firstName} ${subtask.assignedBy.lastName}`}
                                            readOnly
                                            className="bg-gray-50 border-gray-200 text-gray-600"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Assigned To
                                          </Label>
                                          <Input
                                            value={`${subtask.assignedTo.firstName} ${subtask.assignedTo.lastName}`}
                                            readOnly
                                            className="bg-gray-50 border-gray-200 text-gray-600"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Due Date
                                          </Label>
                                          <Input
                                            value={subtask.dueDate
                                              ? new Date(subtask.dueDate).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })
                                              : 'No due date'
                                            }
                                            readOnly
                                            className="bg-gray-50 border-gray-200 text-gray-600"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <Label htmlFor={`status-${subtask.id}`} className="text-sm font-medium text-gray-700 mb-2 block">
                                          Update Status
                                        </Label>
                                        <Select
                                          defaultValue={subtask.taskStatus}
                                          onValueChange={(value) => handleUpdateSubTask(subtask.id, value)}
                                        >
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

                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-xs text-blue-800">
                                          <strong>Created:</strong> {new Date(subtask.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">No subtasks yet</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {currentUser?.role === 'agent_manager'
                          ? 'Click "Add Subtask" to create a new subtask for this request'
                          : 'Subtasks will appear here when created by your manager'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'assignment-requests' && currentUser?.role === 'agent_manager' && (
              <Card className="shadow-sm border border-gray-200 bg-white">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold text-gray-900">Assignment Change Requests</CardTitle>
                  <p className="text-sm text-gray-500">Review and approve pending assignment change requests for this task</p>
                </CardHeader>
                <CardContent className="p-6">
                  {isLoadingAssignmentRequests ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : assignmentChangeRequests && assignmentChangeRequests.filter(req => req.status === 'pending').length > 0 ? (
                    <div className="space-y-4">
                      {assignmentChangeRequests.filter(req => req.status === 'pending').map((changeRequest) => (
                        <div key={changeRequest.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm text-gray-500">
                                  Requested: {new Date(changeRequest.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                Requested by: {changeRequest.requestedBy?.firstName} {changeRequest.requestedBy?.lastName}
                              </p>
                              <p className="text-sm text-gray-700 mb-2">
                                <strong>Reason:</strong> {changeRequest.reason}
                              </p>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Current Assignee:</span>
                                  <p className="text-gray-600">
                                    {changeRequest.currentAssignee
                                      ? `${changeRequest.currentAssignee.firstName} ${changeRequest.currentAssignee.lastName}`
                                      : 'Unassigned'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Requested Assignee:</span>
                                  <p className="text-gray-600">
                                    {changeRequest.requestedAssignee
                                      ? `${changeRequest.requestedAssignee.firstName} ${changeRequest.requestedAssignee.lastName}`
                                      : 'Manager Choice'
                                    }
                                  </p>
                                </div>
                              </div>
                              {changeRequest.reviewComment && (
                                <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                                  <p className="text-sm font-medium text-blue-800">Review Comment:</p>
                                  <p className="text-sm text-blue-700">{changeRequest.reviewComment}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex space-x-3 pt-4 border-t border-gray-200">
                            <Button
                              onClick={() => handleReviewAssignmentRequest(changeRequest.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReviewAssignmentRequest(changeRequest.id, 'reject')}
                              variant="outline"
                              className="border-red-600 text-red-600 hover:bg-red-50"
                              size="sm"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">No pending assignment change requests</p>
                      <p className="text-xs text-gray-500 mt-1">Pending assignment change requests for this task will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="assignedTo" className="text-sm font-medium text-gray-700 mb-2 block">
                  Assigned to:
                </Label>

                {/* Show different UI based on user role */}
                {currentUser?.role === 'agent_manager' || currentUser?.role === 'super_admin' ? (
                  // Agent Manager/Super Admin: Show editable select dropdown
                  <Select
                    value={formData.assignedToId || 'unassigned'}
                    onValueChange={(value) => setFormData({...formData, assignedToId: value === 'unassigned' ? '' : value})}
                  >
                    <SelectTrigger className="border-gray-200 bg-white">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="unassigned" className="bg-white hover:bg-gray-50">Unassigned</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem
                          key={agent.id}
                          value={agent.id}
                          className="bg-white hover:bg-gray-50"
                        >
                          {agent.firstName} {agent.lastName} (Agent)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  // Regular Agent: Show read-only input
                  <Input
                    value={
                      formData.assignedToId
                        ? agents.find(agent => agent.id === formData.assignedToId)
                          ? `${agents.find(agent => agent.id === formData.assignedToId)?.firstName} ${agents.find(agent => agent.id === formData.assignedToId)?.lastName} (Agent)`
                          : 'Unknown Agent'
                        : 'Unassigned'
                    }
                    readOnly
                    className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                  />
                )}

                {/* Assignment Change Request Button - Only show for regular agents */}
                {currentUser?.role === 'agent' && (
                  <div className="mt-3">
                    <Dialog open={showAssignmentChangeDialog} onOpenChange={setShowAssignmentChangeDialog}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-600 hover:bg-orange-50 flex items-center gap-2"
                        >
                          <UserX className="h-4 w-4" />
                          Request Assignment Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Request Assignment Change</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAssignmentChangeRequest} className="space-y-4">
                          <div>
                            <Label htmlFor="requestedAssignee" className="text-sm font-medium text-gray-700 mb-2 block">
                              Preferred New Assignee (Optional)
                            </Label>
                            <Select value={requestedAssigneeId} onValueChange={setRequestedAssigneeId}>
                              <SelectTrigger className="border-gray-200 bg-white">
                                <SelectValue placeholder="Select preferred assignee (leave blank for manager assignment)" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-gray-200">
                                <SelectItem value="manager_choice" className="bg-white hover:bg-gray-50">
                                  Let manager decide
                                </SelectItem>
                                {agents.map((agent) => (
                                  <SelectItem
                                    key={agent.id}
                                    value={agent.id}
                                    className="bg-white hover:bg-gray-50"
                                  >
                                    {agent.firstName} {agent.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="changeReason" className="text-sm font-medium text-gray-700 mb-2 block">
                              Reason for Assignment Change *
                            </Label>
                            <Textarea
                              id="changeReason"
                              value={assignmentChangeReason}
                              onChange={(e) => setAssignmentChangeReason(e.target.value)}
                              placeholder="Please explain why you need this assignment to be changed..."
                              className="min-h-[100px] border-gray-200"
                              rows={4}
                              required
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            <Button
                              type="submit"
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                              disabled={isSubmittingAssignmentChange}
                            >
                              {isSubmittingAssignmentChange ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                'Submit Request'
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowAssignmentChangeDialog(false);
                                setAssignmentChangeReason('');
                                setRequestedAssigneeId('manager_choice');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
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
    </DashboardLayout>
  );
}