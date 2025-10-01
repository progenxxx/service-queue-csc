import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { 
  companies, 
  users, 
  agents, 
  serviceRequests, 
  requestNotes, 
  requestAttachments 
} from '@/lib/db/schema';

export type Company = InferSelectModel<typeof companies>;
export type User = InferSelectModel<typeof users>;
export type Agent = InferSelectModel<typeof agents>;
export type ServiceRequest = InferSelectModel<typeof serviceRequests>;
export type RequestNote = InferSelectModel<typeof requestNotes>;
export type RequestAttachment = InferSelectModel<typeof requestAttachments>;

export type NewCompany = InferInsertModel<typeof companies>;
export type NewUser = InferInsertModel<typeof users>;
export type NewAgent = InferInsertModel<typeof agents>;
export type NewServiceRequest = InferInsertModel<typeof serviceRequests>;
export type NewRequestNote = InferInsertModel<typeof requestNotes>;
export type NewRequestAttachment = InferInsertModel<typeof requestAttachments>;

export type UserWithCompany = User & {
  company?: Company;
};

export type ServiceRequestWithDetails = ServiceRequest & {
  assignedTo?: User;
  assignedBy: User;
  modifiedBy?: User;
  company: Company;
  notes?: RequestNote[];
  attachments?: RequestAttachment[];
};

export type UserRole = 'customer' | 'customer_admin' | 'agent' | 'super_admin';
export type TaskStatus = 'new' | 'open' | 'in_progress' | 'closed';
export type ServiceQueueCategory = 'policy_inquiry' | 'claims_processing' | 'account_update' | 'technical_support' | 'billing_inquiry' | 'insured_service_cancel_non_renewal' | 'other';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId?: string;
  loginCode?: string;
}

export interface LoginCredentials {
  loginCode?: string;
  email?: string;
  password?: string;
}

export interface CreateRequestData {
  insured: string;
  serviceRequestNarrative: string;
  serviceQueueCategory: ServiceQueueCategory;
  assignedToId?: string;
  dueDate?: Date;
}

export interface FilterOptions {
  status?: TaskStatus;
  assignedBy?: string;
  insured?: string;
  dueDateStart?: Date;
  dueDateEnd?: Date;
  search?: string;
}

export interface ReportMetrics {
  totalNew: number;
  totalWip: number;
  totalClosed: number;
  totalPastDue: number;
  weeklyChange: {
    new: number;
    wip: number;
    closed: number;
    pastDue: number;
  };
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  overdueRequests: number;
  recentActivity: Array<{
    id: string;
    type: 'request' | 'note' | 'status_change';
    description: string;
    timestamp: Date;
  }>;
}