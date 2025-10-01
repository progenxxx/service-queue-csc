'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2,
  UserCheck,
  BarChart3,
  Settings,
  Users,
  Plus,
  Trash2,
  RotateCcw,
  ArrowLeft,
  Copy,
  Filter,
  X,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Agent {
  id: string;
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  loginCode: string;
  role?: 'agent' | 'agent_manager'; // Add role field
  assignedCompanyIds: string[];
  isActive: boolean;
  createdAt: string;
  assignedCompanies?: Array<{
    id: string;
    companyName: string;
  }>;
  canPromote?: boolean; // Can this agent be promoted?
  canDemote?: boolean;  // Can this agent be demoted?
}

interface Company {
  id: string;
  companyName: string;
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

const getNavigation = (currentPath: string = '/admin/agents', resetToMainView?: () => void): NavigationItem[] => [
  { name: 'All Customers', href: '/admin/customers', icon: Building2, current: currentPath === '/admin/customers' },
  { name: 'All Requests', href: '/admin/summary', icon: Building2, current: currentPath === '/admin/summary' },
  { name: 'Customer Management', href: '/admin/customers/manage', icon: Users, current: currentPath === '/admin/customers/manage' },
  {
    name: 'Service Center Management',
    href: '/admin/agents',
    icon: UserCheck,
    current: currentPath === '/admin/agents',
    onClick: resetToMainView
  },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: currentPath === '/admin/settings' },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: currentPath === '/admin/reports' },
];

export default function AgentManagementPage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingSave, setIsSubmittingSave] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [promotingAgentId, setPromotingAgentId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    assignedCompanyIds: [] as string[]
  });

  const [editableDetails, setEditableDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    loginCode: '',
    assignedCompanyIds: [] as string[]
  });

  const resetToMainView = () => {
    setShowAddAgent(false);
    setShowDetailsForm(false);
    setSelectedAgent(null);
    setFormData({ firstName: '', lastName: '', email: '', assignedCompanyIds: [] });
    setIsTableTransitioning(false);
    setShowMobileFilters(false);
  };

  const navigation = getNavigation('/admin/agents', resetToMainView);

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

  useEffect(() => {
    fetchAgents();
    fetchCompanies();
    fetchRecentActivity();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents/list');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      } else {
        setAgents([]);
      }
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      } else {
        setCompanies([]);
      }
    } catch {
      setCompanies([]);
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
      setRecentActivity([]);
    }
  };

  const generateAgentCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setShowAddAgent(false);
        setFormData({ firstName: '', lastName: '', email: '', assignedCompanyIds: [] });
        await fetchAgents();
        showToast(result.message || 'Agent created successfully!', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create agent', 'error');
      }
    } catch {
      showToast('Failed to add agent. Please try again.', 'error');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleViewDetails = (agent: Agent) => {
    setIsTableTransitioning(true);
    
    setTimeout(() => {
      setSelectedAgent(agent);
      setEditableDetails({
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        loginCode: agent.loginCode || generateAgentCode(),
        assignedCompanyIds: agent.assignedCompanyIds || []
      });
      setShowDetailsForm(true);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleBackFromDetails = () => {
    setIsTableTransitioning(true);
    
    setTimeout(() => {
      setShowDetailsForm(false);
      setSelectedAgent(null);
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleBackToAgents = () => {
    setIsTableTransitioning(true);
    
    setTimeout(() => {
      setShowAddAgent(false);
      setFormData({ firstName: '', lastName: '', email: '', assignedCompanyIds: [] });
      setIsTableTransitioning(false);
    }, 300);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    if (!selectedAgent.agentId) {
      showToast('Agent ID is missing. Please try refreshing the page.', 'error');
      return;
    }

    setIsSubmittingSave(true);
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.agentId,
          ...editableDetails
        }),
      });

      if (response.ok) {
        await fetchAgents();
        showToast('Agent details updated successfully', 'success');
        handleBackFromDetails();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update agent details', 'error');
      }
    } catch {
      showToast('Failed to save agent details', 'error');
    } finally {
      setIsSubmittingSave(false);
    }
  };

  const handleDeleteAgent = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    setDeletingAgentId(userId);
    try {
      const agent = agents.find(a => a.id === userId);
      if (!agent) {
        showToast('Agent not found', 'error');
        return;
      }

      const response = await fetch('/api/admin/agents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.agentId }),
      });

      if (response.ok) {
        await fetchAgents();
        showToast('Agent deleted successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete agent', 'error');
      }
    } catch {
      showToast('Failed to delete agent', 'error');
    } finally {
      setDeletingAgentId(null);
    }
  };

  const handlePromoteAgent = async (agentId: string, newRole: 'agent' | 'agent_manager') => {
    const action = newRole === 'agent_manager' ? 'promote' : 'demote';
    const confirmMessage = newRole === 'agent_manager'
      ? 'Are you sure you want to promote this agent to Agent Manager? They will gain permission to assign tasks to other agents.'
      : 'Are you sure you want to demote this Agent Manager to regular Agent? They will lose permission to assign tasks.';

    if (!confirm(confirmMessage)) {
      return;
    }

    setPromotingAgentId(agentId);
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchAgents();
        showToast(result.message || `Agent ${action}d successfully!`, 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || `Failed to ${action} agent`, 'error');
      }
    } catch {
      showToast(`Failed to ${action} agent. Please try again.`, 'error');
    } finally {
      setPromotingAgentId(null);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAgents = filteredAgents.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const MobileAgentCard = ({ agent, index }: { agent: Agent; index: number }) => (
    <Card className="shadow-sm border mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-900 text-sm">{agent.firstName} {agent.lastName}</div>
              <div className="text-gray-600 text-sm">{agent.email}</div>
              <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                agent.role === 'agent_manager'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {agent.role === 'agent_manager' ? 'Agent Manager' : 'Agent'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {agent.loginCode || 'N/A'}
              </span>
              {agent.loginCode && (
                <button
                  onClick={() => copyToClipboard(agent.loginCode)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          
          <div>
            <span className="text-xs font-medium text-gray-700">Assigned To:</span>
            <div className="text-gray-600 text-sm mt-1">
              {agent.assignedCompanies && agent.assignedCompanies.length > 0 
                ? agent.assignedCompanies.map(c => c.companyName).join(', ')
                : 'No companies assigned'
              }
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] text-xs h-8 min-w-[70px]"
              onClick={() => handleViewDetails(agent)}
            >
              Details
            </Button>
            {agent.role === 'agent' && (
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-400 hover:bg-blue-500 hover:text-white px-2 text-xs h-8 w-8 flex items-center justify-center"
                onClick={() => handlePromoteAgent(agent.id, 'agent_manager')}
                disabled={promotingAgentId === agent.id}
                title="Promote to Agent Manager"
              >
                {promotingAgentId === agent.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UserCheck className="h-3 w-3" />
                )}
              </Button>
            )}
            {agent.role === 'agent_manager' && (
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-400 hover:bg-orange-500 hover:text-white px-2 text-xs h-8 w-8 flex items-center justify-center"
                onClick={() => handlePromoteAgent(agent.id, 'agent')}
                disabled={promotingAgentId === agent.id}
                title="Demote to Agent"
              >
                {promotingAgentId === agent.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  '↓'
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-400 hover:bg-red-500 hover:text-white px-2 h-8 w-8 flex items-center justify-center"
              onClick={() => handleDeleteAgent(agent.id)}
              disabled={deletingAgentId === agent.id}
            >
              {deletingAgentId === agent.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
          onClick={() => setCurrentPage(i)}
          className={`w-6 sm:w-8 h-6 sm:h-8 p-0 text-xs sm:text-sm ${
            i === currentPage 
              ? "bg-[#087055] hover:bg-[#065a42] text-white" 
              : "text-gray-700"
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
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-gray-300"
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
      <ToastContainer />
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {showDetailsForm && (
              <Button
                onClick={handleBackFromDetails}
                variant="outline"
                className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back to Service Center</span>
                <span className="sm:hidden">Back</span>
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {showDetailsForm ? 'Agent Details' : 'Service Center'}
            </h1>
          </div>
          
          {!showDetailsForm && !showAddAgent && (
            <>
              <div className="hidden md:flex items-center space-x-4">
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                />
                <Button 
                  className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 py-2 font-medium"
                  onClick={() => setShowAddAgent(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              <div className="md:hidden flex gap-2">
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 text-sm"
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
                  size="sm"
                  className="bg-[#068d1f] hover:bg-[#087055] text-white px-3"
                  onClick={() => setShowAddAgent(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {showMobileFilters && (
                <div className="md:hidden mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-300 rounded px-2 py-1 bg-white text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => setShowMobileFilters(false)}
                    variant="outline"
                    size="sm"
                    className="w-full text-gray-600 border-gray-300"
                  >
                    Close
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {!showAddAgent && (
          <div className={`transition-all duration-300 ease-in-out ${
            isTableTransitioning ? 'opacity-0 transform -translate-x-8' : 'opacity-100 transform translate-x-0'
          }`}>
            {showDetailsForm ? (
              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-6 sm:p-8">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Agent Details</h3>
                      <form onSubmit={handleSaveDetails} className="space-y-6">
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
                          <Label htmlFor="detailsEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                            Email
                          </Label>
                          <Input
                            id="detailsEmail"
                            type="email"
                            value={editableDetails.email}
                            onChange={(e) => setEditableDetails({...editableDetails, email: e.target.value})}
                            className="h-10 sm:h-12"
                          />
                        </div>

                        <div>
                          <Label htmlFor="detailsAssignedCompanies" className="text-sm font-medium text-gray-700 mb-2 block">
                            Assign Customer
                          </Label>
                          <Select
                            onValueChange={(value) => {
                              if (!editableDetails.assignedCompanyIds.includes(value)) {
                                setEditableDetails({
                                  ...editableDetails,
                                  assignedCompanyIds: [...editableDetails.assignedCompanyIds, value]
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 sm:h-12 bg-white border-gray-300">
                              <SelectValue placeholder="Company Name" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200">
                              {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id} className="bg-white hover:bg-gray-50">
                                  {company.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {editableDetails.assignedCompanyIds.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {editableDetails.assignedCompanyIds.map((companyId) => {
                                const company = companies.find(c => c.id === companyId);
                                return (
                                  <div key={companyId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                    <span className="text-sm font-medium">{company?.companyName}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => setEditableDetails({
                                        ...editableDetails,
                                        assignedCompanyIds: editableDetails.assignedCompanyIds.filter(id => id !== companyId)
                                      })}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                              onClick={() => setEditableDetails({...editableDetails, loginCode: generateAgentCode()})}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <RotateCcw className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="pt-4">
                          <Button
                            type="submit"
                            className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                            disabled={isSubmittingSave}
                          >
                            {isSubmittingSave ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                    <CardContent className="p-6 sm:p-8">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
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
            ) : (
              <>
                <div className="hidden md:block">
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow className="bg-[#087055] hover:bg-[#087055] border-0">
                              <TableHead className="text-white font-medium py-4 px-6 text-left border-0 min-w-[100px]">First Name</TableHead>
                              <TableHead className="text-white font-medium py-4 px-6 text-left border-0 min-w-[100px]">Last Name</TableHead>
                              <TableHead className="text-white font-medium py-4 px-6 text-left border-0 min-w-[80px]">Code</TableHead>
                              <TableHead className="text-white font-medium py-4 px-6 text-left border-0 min-w-[100px]">Role</TableHead>
                              <TableHead className="text-white font-medium py-4 px-6 text-left border-0 min-w-[150px]">Assigned To</TableHead>
                              <TableHead className="text-white font-medium py-4 px-6 text-left border-0 min-w-[180px]">Email</TableHead>
                              <TableHead className="text-white font-medium py-4 px-6 text-center border-0 min-w-[180px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentAgents.length > 0 ? (
                              currentAgents.map((agent, index) => (
                                <TableRow 
                                  key={agent.id} 
                                  className={`hover:bg-gray-50 border-0 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  }`}
                                >
                                  <TableCell className="py-4 px-6 border-0">
                                    <div className="font-medium text-gray-900">
                                      {agent.firstName}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6 border-0">
                                    <div className="font-medium text-gray-900">
                                      {agent.lastName}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6 border-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                        {agent.loginCode || 'N/A'}
                                      </span>
                                      {agent.loginCode && (
                                        <button
                                          onClick={() => copyToClipboard(agent.loginCode)}
                                          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                          title="Copy login code"
                                        >
                                          <Copy className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6 border-0">
                                    <div className="flex items-center space-x-2">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        agent.role === 'agent_manager'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {agent.role === 'agent_manager' ? 'Agent Manager' : 'Agent'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6 border-0">
                                    <div className="text-gray-600">
                                      {agent.assignedCompanies && agent.assignedCompanies.length > 0
                                        ? agent.assignedCompanies.map(c => c.companyName).join(', ')
                                        : 'No companies assigned'
                                      }
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-gray-600 py-4 px-6 border-0">
                                    {agent.email}
                                  </TableCell>
                                  <TableCell className="py-4 px-6 border-0">
                                    <div className="flex items-center justify-center space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-white bg-[#068d1f] border-[#068d1f] hover:bg-[#087055] hover:text-white hover:border-[#087055] px-3 py-1.5 text-xs font-medium rounded h-8 min-w-[70px]"
                                        onClick={() => handleViewDetails(agent)}
                                      >
                                        Details
                                      </Button>
                                      {agent.role === 'agent' && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-blue-600 border-blue-400 hover:bg-blue-500 hover:text-white px-2 py-1.5 text-xs rounded h-8 w-8 flex items-center justify-center"
                                          onClick={() => handlePromoteAgent(agent.id, 'agent_manager')}
                                          disabled={promotingAgentId === agent.id}
                                          title="Promote to Agent Manager"
                                        >
                                          {promotingAgentId === agent.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <UserCheck className="h-3 w-3" />
                                          )}
                                        </Button>
                                      )}
                                      {agent.role === 'agent_manager' && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-orange-600 border-orange-400 hover:bg-orange-500 hover:text-white px-2 py-1.5 text-xs rounded h-8 w-8 flex items-center justify-center"
                                          onClick={() => handlePromoteAgent(agent.id, 'agent')}
                                          disabled={promotingAgentId === agent.id}
                                          title="Demote to Agent"
                                        >
                                          {promotingAgentId === agent.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            '↓'
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-400 hover:bg-red-500 hover:text-white px-2 py-1.5 rounded h-8 w-8 flex items-center justify-center"
                                        onClick={() => handleDeleteAgent(agent.id)}
                                        disabled={deletingAgentId === agent.id}
                                      >
                                        {deletingAgentId === agent.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow className="border-0">
                                <TableCell colSpan={7} className="text-center py-12 text-gray-500 border-0">
                                  No agents found.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {filteredAgents.length > 0 && (
                          <div className="flex items-center justify-between py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="text-sm text-gray-700">
                                Showing {startIndex + 1} to {Math.min(endIndex, filteredAgents.length)} of {filteredAgents.length} results
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
                              {renderPaginationButtons()}
                            </div>
                          </div>
                        )}

                <div className="md:hidden">
                  {currentAgents.length > 0 ? (
                    currentAgents.map((agent, index) => (
                      <MobileAgentCard key={agent.id} agent={agent} index={index} />
                    ))
                  ) : (
                    <Card className="shadow-sm border">
                      <CardContent className="p-8 text-center text-gray-500">
                        No agents found.
                      </CardContent>
                    </Card>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="md:hidden flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <div className="text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredAgents.length)} of {filteredAgents.length} results
                    </div>
                    <div className="flex space-x-1 order-1 sm:order-2">
                      {renderPaginationButtons()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {showAddAgent && (
          <div className="w-full max-w-2xl">
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <Button
                    onClick={handleBackToAgents}
                    variant="outline"
                    className="text-[#087055] border-[#087055] hover:bg-[#087055] hover:text-white self-start"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Back to Service Center</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Agent User</h2>
                </div>
                
                <form onSubmit={handleAddAgent} className="space-y-6">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
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
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
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
                      placeholder="test@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      className="h-10 sm:h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignedCompanies" className="text-sm font-medium text-gray-700 mb-2 block">
                      Assign Customer
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        if (!formData.assignedCompanyIds.includes(value)) {
                          setFormData({
                            ...formData,
                            assignedCompanyIds: [...formData.assignedCompanyIds, value]
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 sm:h-12 bg-white border-gray-300">
                        <SelectValue placeholder="Company Name" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id} className="bg-white hover:bg-gray-50">
                            {company.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.assignedCompanyIds.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {formData.assignedCompanyIds.map((companyId) => {
                          const company = companies.find(c => c.id === companyId);
                          return (
                            <div key={companyId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                              <span className="text-sm font-medium">{company?.companyName}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setFormData({
                                  ...formData,
                                  assignedCompanyIds: formData.assignedCompanyIds.filter(id => id !== companyId)
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <Button
                      type="submit"
                      className="bg-[#068d1f] hover:bg-[#087055] text-white px-6 sm:px-8 py-2 sm:py-3"
                      disabled={isSubmittingAdd}
                    >
                      {isSubmittingAdd ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleBackToAgents}
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
      </div>
    </DashboardLayout>
  );
}