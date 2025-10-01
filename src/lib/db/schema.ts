import { pgTable, text, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export const userRoleEnum = pgEnum('user_role', ['customer', 'customer_admin', 'agent', 'agent_manager', 'super_admin']);
export const taskStatusEnum = pgEnum('task_status', ['new', 'open', 'in_progress', 'closed']);
export const serviceQueueCategoryEnum = pgEnum('service_queue_category', [
  'policy_inquiry',
  'claims_processing',
  'account_update',
  'technical_support',
  'billing_inquiry',
  'insured_service_cancel_non_renewal',
  'other',
]);
export const activityTypeEnum = pgEnum('activity_type', [
  'request_created',
  'request_updated',
  'request_assigned',
  'note_added',
  'attachment_uploaded',
  'status_changed',
  'user_created',
  'user_updated',
  'company_updated',
  'assignment_change_requested',
  'assignment_change_approved',
  'assignment_change_rejected'
]);

export const assignmentChangeStatusEnum = pgEnum('assignment_change_status', ['pending', 'approved', 'rejected']);

export const companies = pgTable('companies', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  companyName: text('company_name').notNull(),
  companyCode: text('company_code').notNull().unique(),
  primaryContact: text('primary_contact').notNull(),
  phone: text('phone'),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  loginCode: text('login_code').unique(),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull(),
  companyId: text('company_id').references(() => companies.id),
  isActive: boolean('is_active').default(true).notNull(),
  timezone: text('timezone').default('America/New_York'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const agents = pgTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id).notNull().unique(),
  assignedCompanyIds: text('assigned_company_ids').array().$type<string[]>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const serviceRequests = pgTable('service_requests', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  serviceQueueId: text('service_queue_id').notNull().unique(),
  insured: text('insured').notNull(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  taskStatus: taskStatusEnum('task_status').default('new').notNull(),
  serviceRequestNarrative: text('service_request_narrative').notNull(),
  serviceQueueCategory: serviceQueueCategoryEnum('service_queue_category').notNull(),
  assignedToId: text('assigned_to_id').references(() => users.id),
  assignedById: text('assigned_by_id').references(() => users.id).notNull(),
  dueDate: timestamp('due_date'),
  dueTime: text('due_time'), // Time due field (HH:MM format)
  inProgressAt: timestamp('in_progress_at'), // When status changed to in_progress
  closedAt: timestamp('closed_at'), // When status changed to closed
  timeSpent: integer('time_spent'), // Time spent in minutes - manually entered by agents
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()).notNull(),
  modifiedById: text('modified_by_id').references(() => users.id),
});

export const requestNotes = pgTable('request_notes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  requestId: text('request_id').references(() => serviceRequests.id).notNull(),
  authorId: text('author_id').references(() => users.id).notNull(),
  noteContent: text('note_content').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const requestAttachments = pgTable('request_attachments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  requestId: text('request_id').references(() => serviceRequests.id).notNull(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  uploadedById: text('uploaded_by_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  type: activityTypeEnum('type').notNull(),
  description: text('description').notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  companyId: text('company_id').references(() => companies.id),
  requestId: text('request_id').references(() => serviceRequests.id),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  read: boolean('read').default(false).notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assignmentChangeRequests = pgTable('assignment_change_requests', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  requestId: text('request_id').references(() => serviceRequests.id).notNull(),
  requestedById: text('requested_by_id').references(() => users.id).notNull(),
  currentAssigneeId: text('current_assignee_id').references(() => users.id),
  requestedAssigneeId: text('requested_assignee_id').references(() => users.id),
  reason: text('reason').notNull(),
  status: assignmentChangeStatusEnum('status').default('pending').notNull(),
  reviewedById: text('reviewed_by_id').references(() => users.id),
  reviewComment: text('review_comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const subTasks = pgTable('sub_tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  taskId: text('task_id').notNull().unique(),
  requestId: text('request_id').references(() => serviceRequests.id).notNull(),
  taskDescription: text('task_description').notNull(),
  assignedToId: text('assigned_to_id').references(() => users.id).notNull(),
  assignedById: text('assigned_by_id').references(() => users.id).notNull(),
  dueDate: timestamp('due_date'),
  taskStatus: taskStatusEnum('task_status').default('new').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

/* ---------------- Relations ---------------- */
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  serviceRequests: many(serviceRequests),
  activityLogs: many(activityLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  agent: one(agents, {
    fields: [users.id],
    references: [agents.userId],
  }),
  assignedRequests: many(serviceRequests, {
    relationName: 'assignedToRequests',
  }),
  createdRequests: many(serviceRequests, {
    relationName: 'assignedByRequests',
  }),
  modifiedRequests: many(serviceRequests, {
    relationName: 'modifiedByRequests',
  }),
  notes: many(requestNotes),
  attachments: many(requestAttachments),
  activityLogs: many(activityLogs),
  notifications: many(notifications),
}));

export const agentsRelations = relations(agents, ({ one }) => ({
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  company: one(companies, {
    fields: [serviceRequests.companyId],
    references: [companies.id],
  }),
  assignedTo: one(users, {
    fields: [serviceRequests.assignedToId],
    references: [users.id],
    relationName: 'assignedToRequests',
  }),
  assignedBy: one(users, {
    fields: [serviceRequests.assignedById],
    references: [users.id],
    relationName: 'assignedByRequests',
  }),
  modifiedBy: one(users, {
    fields: [serviceRequests.modifiedById],
    references: [users.id],
    relationName: 'modifiedByRequests',
  }),
  notes: many(requestNotes),
  attachments: many(requestAttachments),
  activityLogs: many(activityLogs),
  subTasks: many(subTasks),
}));

export const requestNotesRelations = relations(requestNotes, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestNotes.requestId],
    references: [serviceRequests.id],
  }),
  author: one(users, {
    fields: [requestNotes.authorId],
    references: [users.id],
  }),
}));

export const requestAttachmentsRelations = relations(requestAttachments, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestAttachments.requestId],
    references: [serviceRequests.id],
  }),
  uploadedBy: one(users, {
    fields: [requestAttachments.uploadedById],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [activityLogs.companyId],
    references: [companies.id],
  }),
  request: one(serviceRequests, {
    fields: [activityLogs.requestId],
    references: [serviceRequests.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const assignmentChangeRequestsRelations = relations(assignmentChangeRequests, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [assignmentChangeRequests.requestId],
    references: [serviceRequests.id],
  }),
  requestedBy: one(users, {
    fields: [assignmentChangeRequests.requestedById],
    references: [users.id],
    relationName: 'requestedByUser',
  }),
  currentAssignee: one(users, {
    fields: [assignmentChangeRequests.currentAssigneeId],
    references: [users.id],
    relationName: 'currentAssigneeUser',
  }),
  requestedAssignee: one(users, {
    fields: [assignmentChangeRequests.requestedAssigneeId],
    references: [users.id],
    relationName: 'requestedAssigneeUser',
  }),
  reviewedBy: one(users, {
    fields: [assignmentChangeRequests.reviewedById],
    references: [users.id],
    relationName: 'reviewedByUser',
  }),
}));

export const subTasksRelations = relations(subTasks, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [subTasks.requestId],
    references: [serviceRequests.id],
  }),
  assignedTo: one(users, {
    fields: [subTasks.assignedToId],
    references: [users.id],
    relationName: 'assignedToSubTasks',
  }),
  assignedBy: one(users, {
    fields: [subTasks.assignedById],
    references: [users.id],
    relationName: 'assignedBySubTasks',
  }),
}));