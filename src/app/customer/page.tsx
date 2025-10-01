'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, BarChart3, Settings, FileText, Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const getNavigation = (userRole: string) => [
  { name: 'Create Request', href: '/customer', icon: Building2, current: true },
  { name: 'Summary', href: '/customer/summary', icon: Building2, current: false },
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


export default function CustomerRequestPage() {
  const { showToast, ToastContainer } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    serviceQueueId: generateServiceQueueId(),
    taskStatus: 'new',
    dueDate: '',
    dueTime: '',
    serviceObjective: '',
    insured: '',
    assignedById: '',
    serviceQueueCategory: 'policy_inquiry',
    companyId: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerUsers, setCustomerUsers] = useState<CustomerUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [navigation, setNavigation] = useState(getNavigation('customer'));
  const [insuredList, setInsuredList] = useState<string[]>([]);
  const [showNewInsuredInput, setShowNewInsuredInput] = useState(false);
  const [newInsuredName, setNewInsuredName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchCurrentUser(), fetchCustomerUsers(), fetchInsuredList()]);
    };
    fetchData();
  }, []);

  // Set default assignedById when both currentUser and customerUsers are loaded
  useEffect(() => {
    if (currentUser && customerUsers.length > 0 && !formData.assignedById) {
      setFormData(prev => ({
        ...prev,
        assignedById: currentUser.id
      }));
    }
  }, [currentUser, customerUsers, formData.assignedById]);

  const fetchCurrentUser = async () => {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
        setNavigation(getNavigation(data.user.role));
        setFormData((prev) => ({
          ...prev,
          companyId: data.user.companyId || '',
        }));
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

  const fetchInsuredList = async () => {
    try {
      const response = await fetch('/api/customer/insured-list');
      if (response.ok) {
        const data = await response.json();
        setInsuredList(data.insuredList || []);
      }
    } catch (error) {
      console.error('Failed to fetch insured list:', error);
    }
  };

  const handleAddNewInsured = () => {
    if (newInsuredName.trim()) {
      const trimmedName = newInsuredName.trim();
      if (!insuredList.includes(trimmedName)) {
        setInsuredList([...insuredList, trimmedName]);
      }
      setFormData({...formData, insured: trimmedName});
      setNewInsuredName('');
      setShowNewInsuredInput(false);
    }
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

      if (formData.companyId) {
        formDataToSend.append('companyId', formData.companyId);
      }
      if (formData.dueDate) {
        formDataToSend.append('dueDate', formData.dueDate);
      }
      if (formData.dueTime) {
        formDataToSend.append('dueTime', formData.dueTime);
      }

      selectedFiles.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await fetch('/api/customer', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();
      if (response.ok) {
        setFormData({
          serviceQueueId: generateServiceQueueId(),
          taskStatus: 'new',
          dueDate: '',
          dueTime: '',
          serviceObjective: '',
          insured: '',
          assignedById: '',
          serviceQueueCategory: 'policy_inquiry',
          companyId: currentUser?.companyId || '',
        });

        setSelectedFiles([]);
        
        // Invalidate all related queries to refresh data across the app
        queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
        queryClient.invalidateQueries({ queryKey: ['agent-requests'] });
        queryClient.invalidateQueries({ queryKey: ['agent-all-requests'] });
        queryClient.invalidateQueries({ queryKey: ['customer-requests'] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        queryClient.invalidateQueries({ queryKey: ['attachments'] });
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        
        showToast('Service request created successfully!', 'success');
      } else {
        showToast(`Failed to create service request: ${result.error || 'Unknown error'}`, 'error');
      }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <DashboardLayout navigation={navigation} title="">
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Service Request</h1>
        </div>
        
        <div className="mb-4 sm:mb-6">
          <nav className="border-b border-gray-200 bg-white rounded-t-lg sm:rounded-t-none">
            <div className="flex space-x-4 sm:space-x-8 px-4 sm:px-6">
              <button className="py-3 px-1 border-b-2 border-teal-500 text-teal-600 font-medium text-xs sm:text-sm">
                Request Details
              </button>
            </div>
          </nav>
        </div>

        <div className="w-full max-w-4xl mx-auto">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Label htmlFor="dueTime" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                          Due Time
                        </Label>
                        <div className="relative w-full">
                          <Input
                            id="dueTime"
                            type="time"
                            value={formData.dueTime}
                            onChange={(e) => setFormData({...formData, dueTime: e.target.value})}
                            className="border-gray-200 w-full h-10 sm:h-12"
                          />
                        </div>
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
                      {!showNewInsuredInput ? (
                        <div className="space-y-2">
                          <Select
                            value={formData.insured}
                            onValueChange={(value) => {
                              if (value === '__add_new__') {
                                setShowNewInsuredInput(true);
                              } else {
                                setFormData({...formData, insured: value});
                              }
                            }}
                          >
                            <SelectTrigger className="border-gray-200 bg-white h-10 sm:h-12">
                              <SelectValue placeholder="Select or add insured" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200">
                              {insuredList.map((insured) => (
                                <SelectItem
                                  key={insured}
                                  value={insured}
                                  className="bg-white hover:bg-gray-50"
                                >
                                  {insured}
                                </SelectItem>
                              ))}
                              <SelectItem
                                value="__add_new__"
                                className="bg-green-50 hover:bg-green-100 font-medium text-green-700"
                              >
                                + Add New Insured
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={newInsuredName}
                              onChange={(e) => setNewInsuredName(e.target.value)}
                              placeholder="Enter new insured name"
                              className="border-gray-200 h-10 sm:h-12 flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddNewInsured();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={handleAddNewInsured}
                              className="bg-[#068d1f] hover:bg-[#087055] text-white h-10 sm:h-12"
                            >
                              Add
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setShowNewInsuredInput(false);
                                setNewInsuredName('');
                              }}
                              variant="outline"
                              className="h-10 sm:h-12"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="assignedById" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                        The Person Who Assigned (Assigned By) *
                      </Label>
                      {customerUsers.length > 0 ? (
                        <Select 
                          key={`assigned-by-${formData.assignedById}-${customerUsers.length}`}
                          value={formData.assignedById} 
                          onValueChange={(value) => setFormData({...formData, assignedById: value})}
                        >
                          <SelectTrigger className="border-gray-200 bg-white h-10 sm:h-12">
                            <SelectValue placeholder="Select who is assigning this request" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200">
                            {customerUsers.map((user) => (
                              <SelectItem 
                                key={user.id} 
                                value={user.id}
                                className="bg-white hover:bg-gray-50"
                              >
                                {user.firstName} {user.lastName} ({user.role.replace('_', ' ')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center justify-center h-10 sm:h-12 border border-gray-200 rounded-md bg-gray-50">
                          <div className="text-xs sm:text-sm text-gray-500">Loading users...</div>
                        </div>
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
                          <SelectItem value="insured_service_cancel_non_renewal" className="bg-white hover:bg-gray-50">
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
                          'Add Service Queue'
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