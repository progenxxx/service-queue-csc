'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, BarChart3, Home, FileText, Upload, X, Loader2, Plus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  onClick?: () => void;
}

const getNavigation = (currentPath: string = '/agent/requests'): NavigationItem[] => [
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
    name: 'Create Request', 
    href: '/agent/requests', 
    icon: Plus, 
    current: currentPath === '/agent/requests',
    onClick: currentPath === '/agent/requests' ? () => {} : undefined
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
  companyId?: string;
}


interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  assignedCompanies?: Array<{
    id: string;
    companyName: string;
  }>;
}

export default function AgentRequestPage() {
  const navigation = getNavigation('/agent/requests');
  
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [formData, setFormData] = useState({
    serviceQueueId: generateServiceQueueId(),
    taskStatus: 'new',
    dueDate: '',
    serviceObjective: '',
    insured: '',
    assignedById: '',
    assignedToId: '',
    serviceQueueCategory: 'client_service_cancel_non_renewal',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchAgents(),
        fetchCurrentUser(),
        fetchAllUsers()
      ]);
    };

    fetchData();
  }, []);


  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      if (response.ok) {
        const data = await response.json();
        const validAgents = (data.agents || []).filter(
          (agent: Agent) =>
            agent &&
            typeof agent.id === 'string' &&
            typeof agent.firstName === 'string' &&
            typeof agent.lastName === 'string' &&
            agent.isActive === true
        );
        setAgents(validAgents);
      } else {
        setAgents([]);
      }
    } catch {
      setAgents([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=customers');
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
          // Default "Assigned To" to current agent
          setFormData(prev => ({ ...prev, assignedToId: data.user.id }));
        }
      }
    } catch {}
  };

  function generateServiceQueueId() {
    const prefix = 'ServQUE';
    const timestamp = Date.now().toString();
    return `${prefix}-${timestamp}`;
  }

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

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.insured || !formData.serviceObjective || !formData.assignedById || !formData.serviceQueueCategory) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('insured', formData.insured);
      formDataToSend.append('serviceRequestNarrative', formData.serviceObjective);
      formDataToSend.append('serviceQueueCategory', formData.serviceQueueCategory);
      formDataToSend.append('serviceQueueId', formData.serviceQueueId);
      formDataToSend.append('assignedById', formData.assignedById);
      formDataToSend.append('assignedToId', formData.assignedToId === 'unassigned' ? '' : formData.assignedToId);

      if (formData.dueDate) {
        formDataToSend.append('dueDate', formData.dueDate);
      }

      selectedFiles.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await fetch('/api/agent/requests', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();
      if (response.ok) {
        setFormData({
          serviceQueueId: generateServiceQueueId(),
          taskStatus: 'new',
          dueDate: '',
          serviceObjective: '',
          insured: '',
          assignedById: '',
          assignedToId: currentUser?.id || '',
          serviceQueueCategory: 'client_service_cancel_non_renewal',
        });

        setSelectedFiles([]);
        showToast('Service request created successfully!', 'success');
      } else {
        showToast(`Failed to create service request: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch {
      showToast('Error creating service request', 'error');
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

  return (
    <DashboardLayout navigation={navigation} title="">
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              onClick={() => router.push('/agent')}
              variant="outline" 
              className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back to All Requests</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Create Service Request</h1>
          </div>
        </div>
        
        <div className="mb-4 sm:mb-6">
          <nav className="border-b border-gray-200 bg-white rounded-t-lg sm:rounded-t-none">
            <div className="flex space-x-4 sm:space-x-8 px-4 sm:px-6">
              <button className="py-3 px-1 border-b-2 border-[#087055] text-[#087055] font-medium text-xs sm:text-sm">
                Request Details
              </button>
            </div>
          </nav>
        </div>

        <div className="w-full max-w-4xl">
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Service Request Form</h3>
              <form onSubmit={handleSubmitRequest}>
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <Label htmlFor="serviceQueueId" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Service Queue Rec ID
                    </Label>
                    <Input
                      id="serviceQueueId"
                      value={formData.serviceQueueId}
                      readOnly
                      className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed h-10 sm:h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="taskStatus" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Task Status
                    </Label>
                    <Select value={formData.taskStatus} onValueChange={(value) => setFormData({...formData, taskStatus: value})}>
                      <SelectTrigger className="border-gray-200 bg-white h-10 sm:h-12">
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

                  <div>
                    <Label htmlFor="dueDate" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Due Date
                    </Label>
                    <div className="relative w-full">
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        className="border-gray-200 w-full h-10 sm:h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="serviceObjective" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Service Objective and Narrative *
                    </Label>
                    <Textarea
                      id="serviceObjective"
                      value={formData.serviceObjective}
                      onChange={(e) => setFormData({...formData, serviceObjective: e.target.value})}
                      placeholder="Enter the service request objective and narrative"
                      className="min-h-[80px] sm:min-h-[100px] border-gray-200 text-sm sm:text-base"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="insured" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Insured *
                    </Label>
                    <Input
                      id="insured"
                      value={formData.insured}
                      onChange={(e) => setFormData({...formData, insured: e.target.value})}
                      placeholder="Enter insured name"
                      className="border-gray-200 h-10 sm:h-12"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignedById" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      The Person Who Assigned (Assigned By) *
                    </Label>
                    <Select 
                      value={formData.assignedById} 
                      onValueChange={(value) => setFormData({...formData, assignedById: value})}
                    >
                      <SelectTrigger className="border-gray-200 bg-white h-10 sm:h-12">
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
                    <Label htmlFor="assignedToId" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Assigned To (Agent)
                    </Label>
                    <Select 
                      value={formData.assignedToId} 
                      onValueChange={(value) => setFormData({...formData, assignedToId: value})}
                    >
                      <SelectTrigger className="border-gray-200 bg-white h-10 sm:h-12">
                        <SelectValue placeholder="Select an agent" />
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
                        No agents found. Please contact your administrator.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="serviceQueueCategory" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Service Queue Category *
                    </Label>
                    <Select 
                      value={formData.serviceQueueCategory} 
                      onValueChange={(value) => setFormData({...formData, serviceQueueCategory: value})}
                    >
                      <SelectTrigger className="border-gray-200 bg-white h-10 sm:h-12">
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
                    <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                      Attach File
                    </Label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-8 text-center hover:border-gray-300 transition-colors bg-gray-50">
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
                        <div className="bg-gray-100 rounded-full p-2 sm:p-3 mb-2 sm:mb-3">
                          <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Drag and Drop Your Files</span>
                        <span className="text-xs text-gray-400 mt-1">Max. File formats: .pdf, .docx, .jpg, .png (up to 10MB)</span>
                      </label>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-gray-900 truncate block">{file.name}</span>
                                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 flex-shrink-0"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button 
                      type="button"
                      variant="outline"
                      className="mt-3 text-xs sm:text-sm border-gray-200 px-3 sm:px-4 py-2"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Select File
                    </Button>
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit"
                      className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Service Request'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastContainer />
    </DashboardLayout>
  );
}