import { db } from '@/lib/db';
import { notifications, activityLogs, users, serviceRequests } from '@/lib/db/schema';
import { emailService } from '@/lib/email/sendgrid';
import { eq, and, or } from 'drizzle-orm';

// Define all possible notification and activity types
type NotificationType =
  | 'request_created'
  | 'request_updated'
  | 'request_assigned'
  | 'note_added'
  | 'status_changed'
  | 'due_date_reminder'
  | 'user_created'
  | 'company_created'
  | 'attachment_uploaded'
  | 'assignment_change_requested'
  | 'assignment_change_approved'
  | 'assignment_change_rejected'
  | 'user_promoted'
  | 'user_demoted'
  | 'login_code_reset'
  | 'company_code_reset'
  | 'password_reset'
  | 'request_overdue'
  | 'request_due_soon'
  | 'subtask_assigned'
  | 'subtask_completed';

type ActivityType =
  | 'request_created'
  | 'request_updated'
  | 'request_assigned'
  | 'note_added'
  | 'attachment_uploaded'
  | 'status_changed'
  | 'user_created'
  | 'user_updated'
  | 'company_updated'
  | 'assignment_change_requested'
  | 'assignment_change_approved'
  | 'assignment_change_rejected';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: string;
}

interface CreateActivityLogData {
  userId: string;
  companyId?: string;
  type: ActivityType;
  description: string;
  requestId?: string;
  metadata?: string;
}

interface NotificationRecipients {
  assignedTo?: string;
  assignedBy?: string;
  requestCreator?: string;
  companyAdmins?: string[];
  agentManagers?: string[];
  allAgents?: string[];
}

export const notificationService = {
  // Core notification and activity log creation methods
  async createNotification(data: CreateNotificationData) {
    try {
      await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
        read: false,
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  },

  async createActivityLog(data: CreateActivityLogData) {
    try {
      await db.insert(activityLogs).values({
        type: data.type,
        description: data.description,
        userId: data.userId,
        companyId: data.companyId,
        requestId: data.requestId,
        metadata: data.metadata,
      });
    } catch (error) {
      console.error('Failed to create activity log:', error);
    }
  },

  // Helper method to get relevant users for notifications
  async getNotificationRecipients(requestId?: string, companyId?: string): Promise<NotificationRecipients> {
    const recipients: NotificationRecipients = {};

    try {
      if (requestId) {
        // Get request-specific recipients
        const request = await db.query.serviceRequests.findFirst({
          where: eq(serviceRequests.id, requestId),
          with: {
            assignedTo: true,
            assignedBy: true,
          },
        });

        if (request) {
          recipients.assignedTo = request.assignedToId || undefined;
          recipients.assignedBy = request.assignedById;
          recipients.requestCreator = request.assignedById; // Usually the same as assignedBy
        }

        companyId = companyId || request?.companyId;
      }

      if (companyId) {
        // Get company-specific recipients
        const companyUsers = await db.query.users.findMany({
          where: eq(users.companyId, companyId),
        });

        recipients.companyAdmins = companyUsers
          .filter(user => user.role === 'customer_admin')
          .map(user => user.id);

        recipients.agentManagers = companyUsers
          .filter(user => user.role === 'agent_manager')
          .map(user => user.id);

        recipients.allAgents = companyUsers
          .filter(user => user.role === 'agent' || user.role === 'agent_manager')
          .map(user => user.id);
      }
    } catch (error) {
      console.error('Failed to get notification recipients:', error);
    }

    return recipients;
  },

  // Helper method to notify multiple users
  async notifyMultipleUsers(userIds: string[], data: Omit<CreateNotificationData, 'userId'>) {
    try {
      const notificationRecords = userIds.map(userId => ({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
        read: false,
      }));

      if (notificationRecords.length > 0) {
        await db.insert(notifications).values(notificationRecords);
      }
    } catch (error) {
      console.error('Failed to notify multiple users:', error);
    }
  },

  // ===== REQUEST-RELATED NOTIFICATIONS =====

  async notifyRequestCreated(requestData: {
    requestId: string;
    serviceQueueId: string;
    creatorId: string;
    companyId: string;
    assignedToId?: string;
    insured: string;
    narrative: string;
    category: string;
    priority?: string;
  }) {
    const recipients = await this.getNotificationRecipients(requestData.requestId, requestData.companyId);

    // Notify the assigned agent if specified
    if (requestData.assignedToId) {
      await this.createNotification({
        userId: requestData.assignedToId,
        type: 'request_created',
        title: 'New Request Assigned',
        message: `New service request ${requestData.serviceQueueId} has been assigned to you`,
        metadata: JSON.stringify({
          requestId: requestData.requestId,
          serviceQueueId: requestData.serviceQueueId,
          insured: requestData.insured,
        }),
      });
    }

    // Notify agent managers about new requests
    if (recipients.agentManagers && recipients.agentManagers.length > 0) {
      await this.notifyMultipleUsers(recipients.agentManagers, {
        type: 'request_created',
        title: 'New Service Request',
        message: `New service request ${requestData.serviceQueueId} created for ${requestData.insured}`,
        metadata: JSON.stringify({
          requestId: requestData.requestId,
          serviceQueueId: requestData.serviceQueueId,
          insured: requestData.insured,
          category: requestData.category,
        }),
      });
    }

    // Create activity log
    await this.createActivityLog({
      userId: requestData.creatorId,
      companyId: requestData.companyId,
      type: 'request_created',
      description: `Created new service request ${requestData.serviceQueueId} for ${requestData.insured}`,
      requestId: requestData.requestId,
      metadata: JSON.stringify({
        insured: requestData.insured,
        category: requestData.category,
        assignedToId: requestData.assignedToId,
      }),
    });

    // Send email notifications if configured
    try {
      const creator = await db.query.users.findFirst({
        where: eq(users.id, requestData.creatorId),
      });

      // Send email to assigned agent
      if (requestData.assignedToId) {
        const assignedAgent = await db.query.users.findFirst({
          where: eq(users.id, requestData.assignedToId),
        });

        if (assignedAgent) {
          await emailService.sendNewRequest(assignedAgent.email, {
            requestId: requestData.requestId,
            serviceQueueId: requestData.serviceQueueId,
            clientName: requestData.insured,
            requestTitle: requestData.narrative,
            category: requestData.category,
            priority: requestData.priority || 'normal',
            createdBy: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown',
            userType: 'agent',
          });
        }
      }
    } catch (error) {
      console.error('Failed to send request creation email:', error);
    }
  },

  async notifyRequestUpdated(updateData: {
    requestId: string;
    serviceQueueId: string;
    updaterId: string;
    companyId: string;
    changes: Record<string, any>;
    oldStatus?: string;
    newStatus?: string;
  }) {
    const recipients = await this.getNotificationRecipients(updateData.requestId, updateData.companyId);

    // Notify assigned user about updates
    if (recipients.assignedTo) {
      await this.createNotification({
        userId: recipients.assignedTo,
        type: updateData.newStatus ? 'status_changed' : 'request_updated',
        title: updateData.newStatus ? 'Request Status Updated' : 'Request Updated',
        message: updateData.newStatus
          ? `Request ${updateData.serviceQueueId} status changed to ${updateData.newStatus}`
          : `Request ${updateData.serviceQueueId} has been updated`,
        metadata: JSON.stringify({
          requestId: updateData.requestId,
          serviceQueueId: updateData.serviceQueueId,
          changes: updateData.changes,
        }),
      });
    }

    // Notify request creator about updates
    if (recipients.assignedBy && recipients.assignedBy !== updateData.updaterId) {
      await this.createNotification({
        userId: recipients.assignedBy,
        type: updateData.newStatus ? 'status_changed' : 'request_updated',
        title: updateData.newStatus ? 'Request Status Updated' : 'Request Updated',
        message: updateData.newStatus
          ? `Request ${updateData.serviceQueueId} status changed to ${updateData.newStatus}`
          : `Request ${updateData.serviceQueueId} has been updated`,
        metadata: JSON.stringify({
          requestId: updateData.requestId,
          serviceQueueId: updateData.serviceQueueId,
          changes: updateData.changes,
        }),
      });
    }

    // Create activity log
    await this.createActivityLog({
      userId: updateData.updaterId,
      companyId: updateData.companyId,
      type: updateData.newStatus ? 'status_changed' : 'request_updated',
      description: updateData.newStatus
        ? `Changed status from "${updateData.oldStatus}" to "${updateData.newStatus}" for request ${updateData.serviceQueueId}`
        : `Updated request ${updateData.serviceQueueId}`,
      requestId: updateData.requestId,
      metadata: JSON.stringify(updateData.changes),
    });

    // Send email notifications for status changes
    if (updateData.newStatus && updateData.oldStatus) {
      try {
        const updater = await db.query.users.findFirst({
          where: eq(users.id, updateData.updaterId),
        });

        const request = await db.query.serviceRequests.findFirst({
          where: eq(serviceRequests.id, updateData.requestId),
        });

        if (updater && request) {
          // Send to assigned user
          if (recipients.assignedTo) {
            const assignedUser = await db.query.users.findFirst({
              where: eq(users.id, recipients.assignedTo),
            });

            if (assignedUser) {
              await emailService.sendStatusUpdate(assignedUser.email, {
                requestId: updateData.requestId,
                serviceQueueId: updateData.serviceQueueId,
                oldStatus: updateData.oldStatus,
                newStatus: updateData.newStatus,
                updatedBy: `${updater.firstName} ${updater.lastName}`,
                clientName: request.insured,
                requestTitle: request.serviceRequestNarrative,
                userType: 'agent',
              });
            }
          }

          // Send to request creator
          if (recipients.assignedBy && recipients.assignedBy !== updateData.updaterId) {
            const creator = await db.query.users.findFirst({
              where: eq(users.id, recipients.assignedBy),
            });

            if (creator) {
              await emailService.sendStatusUpdate(creator.email, {
                requestId: updateData.requestId,
                serviceQueueId: updateData.serviceQueueId,
                oldStatus: updateData.oldStatus,
                newStatus: updateData.newStatus,
                updatedBy: `${updater.firstName} ${updater.lastName}`,
                clientName: request.insured,
                requestTitle: request.serviceRequestNarrative,
                userType: 'customer',
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to send status update email:', error);
      }
    }
  },

  async notifyRequestAssigned(assignmentData: {
    requestId: string;
    serviceQueueId: string;
    assignerId: string;
    assignedToId: string;
    companyId: string;
    insured: string;
    narrative: string;
    dueDate?: string;
  }) {
    // Notify the assigned agent
    await this.createNotification({
      userId: assignmentData.assignedToId,
      type: 'request_assigned',
      title: 'New Request Assignment',
      message: `Request ${assignmentData.serviceQueueId} has been assigned to you`,
      metadata: JSON.stringify({
        requestId: assignmentData.requestId,
        serviceQueueId: assignmentData.serviceQueueId,
        insured: assignmentData.insured,
        dueDate: assignmentData.dueDate,
      }),
    });

    // Create activity log
    await this.createActivityLog({
      userId: assignmentData.assignerId,
      companyId: assignmentData.companyId,
      type: 'request_assigned',
      description: `Assigned request ${assignmentData.serviceQueueId} to agent`,
      requestId: assignmentData.requestId,
      metadata: JSON.stringify({
        assignedToId: assignmentData.assignedToId,
        insured: assignmentData.insured,
      }),
    });

    // Send email notification
    try {
      const [assigner, assignedAgent] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, assignmentData.assignerId) }),
        db.query.users.findFirst({ where: eq(users.id, assignmentData.assignedToId) }),
      ]);

      if (assigner && assignedAgent) {
        await emailService.sendRequestAssigned(assignedAgent.email, {
          requestId: assignmentData.requestId,
          serviceQueueId: assignmentData.serviceQueueId,
          assignedTo: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
          assignedBy: `${assigner.firstName} ${assigner.lastName}`,
          clientName: assignmentData.insured,
          requestTitle: assignmentData.narrative,
          dueDate: assignmentData.dueDate,
          userType: 'agent',
        });
      }
    } catch (error) {
      console.error('Failed to send assignment email:', error);
    }
  },

  async notifyNoteAdded(noteData: {
    requestId: string;
    serviceQueueId: string;
    authorId: string;
    companyId: string;
    content: string;
    recipientEmail?: string;
    isInternal?: boolean;
  }) {
    const recipients = await this.getNotificationRecipients(noteData.requestId, noteData.companyId);

    // Determine who should be notified based on note type
    const notificationTargets: string[] = [];

    if (!noteData.isInternal) {
      // External notes notify both assigned user and request creator
      if (recipients.assignedTo && recipients.assignedTo !== noteData.authorId) {
        notificationTargets.push(recipients.assignedTo);
      }
      if (recipients.assignedBy && recipients.assignedBy !== noteData.authorId) {
        notificationTargets.push(recipients.assignedBy);
      }
    } else {
      // Internal notes only notify agents and agent managers
      const internalRecipients = [
        ...(recipients.allAgents || []),
        ...(recipients.agentManagers || [])
      ].filter(id => id !== noteData.authorId);

      notificationTargets.push(...internalRecipients);
    }

    // Send notifications
    if (notificationTargets.length > 0) {
      await this.notifyMultipleUsers(notificationTargets, {
        type: 'note_added',
        title: 'New Note Added',
        message: `New note added to request ${noteData.serviceQueueId}`,
        metadata: JSON.stringify({
          requestId: noteData.requestId,
          serviceQueueId: noteData.serviceQueueId,
          isInternal: noteData.isInternal,
          content: noteData.content.substring(0, 100),
        }),
      });
    }

    // Create activity log
    const author = await db.query.users.findFirst({
      where: eq(users.id, noteData.authorId),
    });

    await this.createActivityLog({
      userId: noteData.authorId,
      companyId: noteData.companyId,
      type: 'note_added',
      description: `Added note to request ${noteData.serviceQueueId}: ${noteData.content.substring(0, 100)}${noteData.content.length > 100 ? '...' : ''}`,
      requestId: noteData.requestId,
      metadata: JSON.stringify({
        isInternal: noteData.isInternal,
        authorName: author ? `${author.firstName} ${author.lastName}` : 'Unknown',
      }),
    });

    // Send email notification
    try {
      const request = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, noteData.requestId),
      });

      if (author && request) {
        const emailRecipient = noteData.recipientEmail ||
          (recipients.assignedBy ? (await db.query.users.findFirst({
            where: eq(users.id, recipients.assignedBy),
          }))?.email : undefined);

        if (emailRecipient) {
          await emailService.sendNoteAdded(emailRecipient, {
            requestId: noteData.requestId,
            serviceQueueId: noteData.serviceQueueId,
            noteContent: noteData.content,
            authorName: `${author.firstName} ${author.lastName}`,
            clientName: request.insured,
            requestTitle: request.serviceRequestNarrative,
            userType: 'customer',
          });
        }
      }
    } catch (error) {
      console.error('Failed to send note email:', error);
    }
  },

  async notifyAttachmentUploaded(attachmentData: {
    requestId: string;
    serviceQueueId: string;
    uploaderId: string;
    companyId: string;
    fileName: string;
    fileSize: number;
  }) {
    const recipients = await this.getNotificationRecipients(attachmentData.requestId, attachmentData.companyId);

    // Notify relevant users about file upload
    const notificationTargets = [
      recipients.assignedTo,
      recipients.assignedBy,
    ].filter(id => id && id !== attachmentData.uploaderId) as string[];

    if (notificationTargets.length > 0) {
      await this.notifyMultipleUsers(notificationTargets, {
        type: 'attachment_uploaded',
        title: 'File Uploaded',
        message: `File "${attachmentData.fileName}" uploaded to request ${attachmentData.serviceQueueId}`,
        metadata: JSON.stringify({
          requestId: attachmentData.requestId,
          serviceQueueId: attachmentData.serviceQueueId,
          fileName: attachmentData.fileName,
          fileSize: attachmentData.fileSize,
        }),
      });
    }

    // Create activity log
    await this.createActivityLog({
      userId: attachmentData.uploaderId,
      companyId: attachmentData.companyId,
      type: 'attachment_uploaded',
      description: `Uploaded file "${attachmentData.fileName}" to request ${attachmentData.serviceQueueId}`,
      requestId: attachmentData.requestId,
      metadata: JSON.stringify({
        fileName: attachmentData.fileName,
        fileSize: attachmentData.fileSize,
      }),
    });
  },

  // ===== ASSIGNMENT CHANGE NOTIFICATIONS =====

  async notifyAssignmentChangeRequested(changeData: {
    requestId: string;
    serviceQueueId: string;
    requesterId: string;
    companyId: string;
    reason: string;
    currentAssigneeId?: string;
    requestedAssigneeId?: string;
    changeRequestId: string;
  }) {
    const recipients = await this.getNotificationRecipients(changeData.requestId, changeData.companyId);

    // Notify agent managers about assignment change request
    if (recipients.agentManagers && recipients.agentManagers.length > 0) {
      await this.notifyMultipleUsers(recipients.agentManagers, {
        type: 'assignment_change_requested',
        title: 'Assignment Change Requested',
        message: `Assignment change requested for request ${changeData.serviceQueueId}`,
        metadata: JSON.stringify({
          requestId: changeData.requestId,
          serviceQueueId: changeData.serviceQueueId,
          reason: changeData.reason,
          currentAssigneeId: changeData.currentAssigneeId,
          requestedAssigneeId: changeData.requestedAssigneeId,
          changeRequestId: changeData.changeRequestId,
        }),
      });
    }

    // Send email notifications to agent managers
    try {
      const [request, requester] = await Promise.all([
        db.query.serviceRequests.findFirst({
          where: eq(serviceRequests.id, changeData.requestId),
          with: {
            assignedTo: true,
            company: true,
          },
        }),
        db.query.users.findFirst({
          where: eq(users.id, changeData.requesterId),
        }),
      ]);

      if (request && requester) {
        // Get current and requested assignee names
        let currentAssigneeName = 'Unassigned';
        let requestedAssigneeName = 'Unassign';

        if (changeData.currentAssigneeId && request.assignedTo) {
          currentAssigneeName = `${request.assignedTo.firstName} ${request.assignedTo.lastName}`;
        }

        if (changeData.requestedAssigneeId) {
          const requestedAssignee = await db.query.users.findFirst({
            where: eq(users.id, changeData.requestedAssigneeId),
          });
          if (requestedAssignee) {
            requestedAssigneeName = `${requestedAssignee.firstName} ${requestedAssignee.lastName}`;
          }
        }

        // Get all agent managers to send emails
        const agentManagers = await db.query.users.findMany({
          where: eq(users.role, 'agent_manager'),
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });

        // Send emails to all agent managers
        for (const manager of agentManagers) {
          await emailService.sendAssignmentChangeRequest(manager.email, {
            requestId: changeData.requestId,
            serviceQueueId: changeData.serviceQueueId,
            clientName: request.insured,
            requestTitle: request.serviceRequestNarrative,
            requestedBy: `${requester.firstName} ${requester.lastName}`,
            currentAssignee: currentAssigneeName,
            requestedAssignee: requestedAssigneeName,
            reason: changeData.reason,
            changeRequestId: changeData.changeRequestId,
            userType: 'agent',
          });
        }
      }
    } catch (error) {
      console.error('Failed to send assignment change request emails:', error);
    }

    // Create activity log
    await this.createActivityLog({
      userId: changeData.requesterId,
      companyId: changeData.companyId,
      type: 'assignment_change_requested',
      description: `Requested assignment change for request ${changeData.serviceQueueId}: ${changeData.reason}`,
      requestId: changeData.requestId,
      metadata: JSON.stringify({
        reason: changeData.reason,
        currentAssigneeId: changeData.currentAssigneeId,
        requestedAssigneeId: changeData.requestedAssigneeId,
        changeRequestId: changeData.changeRequestId,
      }),
    });
  },

  async notifyAssignmentChangeReviewed(reviewData: {
    requestId: string;
    serviceQueueId: string;
    reviewerId: string;
    companyId: string;
    action: 'approved' | 'rejected';
    comment?: string;
    requesterId: string;
    newAssigneeId?: string;
  }) {
    // Notify the requester about the decision
    await this.createNotification({
      userId: reviewData.requesterId,
      type: reviewData.action === 'approved' ? 'assignment_change_approved' : 'assignment_change_rejected',
      title: `Assignment Change ${reviewData.action === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your assignment change request for ${reviewData.serviceQueueId} has been ${reviewData.action}`,
      metadata: JSON.stringify({
        requestId: reviewData.requestId,
        serviceQueueId: reviewData.serviceQueueId,
        action: reviewData.action,
        comment: reviewData.comment,
        newAssigneeId: reviewData.newAssigneeId,
      }),
    });

    // If approved and reassigned, notify the new assignee
    if (reviewData.action === 'approved' && reviewData.newAssigneeId) {
      await this.createNotification({
        userId: reviewData.newAssigneeId,
        type: 'request_assigned',
        title: 'Request Reassigned',
        message: `Request ${reviewData.serviceQueueId} has been reassigned to you`,
        metadata: JSON.stringify({
          requestId: reviewData.requestId,
          serviceQueueId: reviewData.serviceQueueId,
          reason: 'Assignment change approved',
        }),
      });
    }

    // Send email notification to the requester
    try {
      const [request, reviewer, requester] = await Promise.all([
        db.query.serviceRequests.findFirst({
          where: eq(serviceRequests.id, reviewData.requestId),
        }),
        db.query.users.findFirst({
          where: eq(users.id, reviewData.reviewerId),
        }),
        db.query.users.findFirst({
          where: eq(users.id, reviewData.requesterId),
        }),
      ]);

      if (request && reviewer && requester) {
        let newAssigneeName: string | undefined = undefined;
        if (reviewData.newAssigneeId) {
          const newAssignee = await db.query.users.findFirst({
            where: eq(users.id, reviewData.newAssigneeId),
          });
          if (newAssignee) {
            newAssigneeName = `${newAssignee.firstName} ${newAssignee.lastName}`;
          }
        }

        // Send email to the original requester
        await emailService.sendAssignmentChangeReviewed(requester.email, {
          requestId: reviewData.requestId,
          serviceQueueId: reviewData.serviceQueueId,
          clientName: request.insured,
          requestTitle: request.serviceRequestNarrative,
          reviewedBy: `${reviewer.firstName} ${reviewer.lastName}`,
          action: reviewData.action,
          comment: reviewData.comment,
          newAssignee: newAssigneeName,
          userType: 'agent',
        });

        // If approved and reassigned, also send assignment email to new assignee
        if (reviewData.action === 'approved' && reviewData.newAssigneeId && newAssigneeName) {
          const newAssignee = await db.query.users.findFirst({
            where: eq(users.id, reviewData.newAssigneeId),
          });

          if (newAssignee) {
            await emailService.sendRequestAssigned(newAssignee.email, {
              requestId: reviewData.requestId,
              serviceQueueId: reviewData.serviceQueueId,
              assignedTo: newAssigneeName,
              assignedBy: `${reviewer.firstName} ${reviewer.lastName}`,
              clientName: request.insured,
              requestTitle: request.serviceRequestNarrative,
              userType: 'agent',
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to send assignment change review emails:', error);
    }

    // Create activity log
    await this.createActivityLog({
      userId: reviewData.reviewerId,
      companyId: reviewData.companyId,
      type: reviewData.action === 'approved' ? 'assignment_change_approved' : 'assignment_change_rejected',
      description: `${reviewData.action === 'approved' ? 'Approved' : 'Rejected'} assignment change request for ${reviewData.serviceQueueId}`,
      requestId: reviewData.requestId,
      metadata: JSON.stringify({
        action: reviewData.action,
        comment: reviewData.comment,
        requesterId: reviewData.requesterId,
        newAssigneeId: reviewData.newAssigneeId,
      }),
    });
  },

  // ===== USER MANAGEMENT NOTIFICATIONS =====

  async notifyUserCreated(adminUserId: string, newUser: { id: string; firstName: string; lastName: string; email: string; role: string; companyId?: string }) {
    await this.createNotification({
      userId: adminUserId,
      type: 'user_created',
      title: 'New User Created',
      message: `User ${newUser.firstName} ${newUser.lastName} (${newUser.role}) has been created successfully`,
      metadata: JSON.stringify({ userId: newUser.id, userType: newUser.role }),
    });

    await this.createActivityLog({
      userId: adminUserId,
      companyId: newUser.companyId,
      type: 'user_created',
      description: `Created new user: ${newUser.firstName} ${newUser.lastName} (${newUser.email}) with role ${newUser.role}`,
      metadata: JSON.stringify({ userId: newUser.id, role: newUser.role }),
    });
  },

  async notifyUserRoleChanged(adminUserId: string, targetUserId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
    oldRole: string;
    newRole: string;
    companyId?: string;
  }) {
    const isPromotion = userData.newRole === 'agent_manager' && userData.oldRole === 'agent';
    const isDemotion = userData.oldRole === 'agent_manager' && userData.newRole === 'agent';

    // Notify the user whose role changed
    await this.createNotification({
      userId: targetUserId,
      type: isPromotion ? 'user_promoted' : (isDemotion ? 'user_demoted' : 'user_created'),
      title: isPromotion ? 'Promoted to Agent Manager' : (isDemotion ? 'Role Changed' : 'Role Updated'),
      message: isPromotion
        ? 'Congratulations! You have been promoted to Agent Manager'
        : `Your role has been changed from ${userData.oldRole} to ${userData.newRole}`,
      metadata: JSON.stringify({
        oldRole: userData.oldRole,
        newRole: userData.newRole,
      }),
    });

    // Notify admin
    await this.createNotification({
      userId: adminUserId,
      type: isPromotion ? 'user_promoted' : (isDemotion ? 'user_demoted' : 'user_created'),
      title: 'User Role Updated',
      message: `${userData.firstName} ${userData.lastName} role changed from ${userData.oldRole} to ${userData.newRole}`,
      metadata: JSON.stringify({
        targetUserId,
        oldRole: userData.oldRole,
        newRole: userData.newRole,
      }),
    });

    // Create activity log
    await this.createActivityLog({
      userId: adminUserId,
      companyId: userData.companyId,
      type: 'user_updated',
      description: `Changed ${userData.firstName} ${userData.lastName} role from ${userData.oldRole} to ${userData.newRole}`,
      metadata: JSON.stringify({
        targetUserId,
        oldRole: userData.oldRole,
        newRole: userData.newRole,
        isPromotion,
        isDemotion,
      }),
    });
  },

  async notifyPasswordReset(userId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
  }) {
    await this.createNotification({
      userId,
      type: 'password_reset',
      title: 'Password Reset Requested',
      message: 'A password reset has been requested for your account',
      metadata: JSON.stringify({
        email: userData.email,
        timestamp: new Date().toISOString(),
      }),
    });
  },

  async notifyLoginCodeReset(userId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
    oldCode: string;
    newCode: string;
  }) {
    await this.createNotification({
      userId,
      type: 'login_code_reset',
      title: 'Login Code Reset',
      message: 'Your login code has been reset',
      metadata: JSON.stringify({
        oldCode: userData.oldCode,
        newCode: userData.newCode,
        timestamp: new Date().toISOString(),
      }),
    });
  },

  // ===== COMPANY MANAGEMENT NOTIFICATIONS =====

  async notifyCustomerDetailsUpdated(adminUserId: string, customerId: string, customerName: string) {
    await this.createNotification({
      userId: adminUserId,
      type: 'company_created',
      title: 'Customer Details Updated',
      message: `Customer details for ${customerName} have been updated successfully`,
      metadata: JSON.stringify({ companyId: customerId, entityType: 'company' }),
    });

    await this.createActivityLog({
      userId: adminUserId,
      companyId: customerId,
      type: 'company_updated',
      description: `Updated customer details for: ${customerName}`,
      metadata: JSON.stringify({ companyId: customerId }),
    });
  },

  async notifyCompanyCodeReset(adminUserId: string, companyData: {
    companyId: string;
    companyName: string;
    primaryContact: string;
    oldCode: string;
    newCode: string;
  }) {
    await this.createNotification({
      userId: adminUserId,
      type: 'company_code_reset',
      title: 'Company Code Reset',
      message: `Company code for ${companyData.companyName} has been reset`,
      metadata: JSON.stringify({
        companyId: companyData.companyId,
        oldCode: companyData.oldCode,
        newCode: companyData.newCode,
      }),
    });

    await this.createActivityLog({
      userId: adminUserId,
      companyId: companyData.companyId,
      type: 'company_updated',
      description: `Reset company code for ${companyData.companyName}`,
      metadata: JSON.stringify({
        oldCode: companyData.oldCode,
        newCode: companyData.newCode,
      }),
    });
  },

  // ===== DUE DATE AND REMINDER NOTIFICATIONS =====

  async notifyDueDateReminder(reminderData: {
    requestId: string;
    serviceQueueId: string;
    assignedToId?: string;
    companyId: string;
    insured: string;
    narrative: string;
    dueDate: string;
    daysUntilDue: number;
    isOverdue: boolean;
  }) {
    const recipients = await this.getNotificationRecipients(reminderData.requestId, reminderData.companyId);

    // Determine notification targets
    const notificationTargets: string[] = [];
    if (reminderData.assignedToId) {
      notificationTargets.push(reminderData.assignedToId);
    }
    if (recipients.assignedBy) {
      notificationTargets.push(recipients.assignedBy);
    }
    if (recipients.agentManagers) {
      notificationTargets.push(...recipients.agentManagers);
    }

    // Remove duplicates
    const uniqueTargets = [...new Set(notificationTargets)];

    if (uniqueTargets.length > 0) {
      await this.notifyMultipleUsers(uniqueTargets, {
        type: reminderData.isOverdue ? 'request_overdue' : 'due_date_reminder',
        title: reminderData.isOverdue ? 'Request Overdue' : 'Due Date Reminder',
        message: reminderData.isOverdue
          ? `Request ${reminderData.serviceQueueId} is overdue`
          : `Request ${reminderData.serviceQueueId} is due ${reminderData.daysUntilDue === 1 ? 'tomorrow' : `in ${reminderData.daysUntilDue} days`}`,
        metadata: JSON.stringify({
          requestId: reminderData.requestId,
          serviceQueueId: reminderData.serviceQueueId,
          insured: reminderData.insured,
          dueDate: reminderData.dueDate,
          daysUntilDue: reminderData.daysUntilDue,
          isOverdue: reminderData.isOverdue,
        }),
      });
    }

    // Send email reminders
    try {
      const request = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, reminderData.requestId),
        with: {
          assignedTo: true,
          assignedBy: true,
        },
      });

      if (request) {
        // Send to assigned agent
        if (request.assignedTo) {
          await emailService.sendDueDateReminder(request.assignedTo.email, {
            requestId: reminderData.requestId,
            serviceQueueId: reminderData.serviceQueueId,
            clientName: reminderData.insured,
            requestTitle: reminderData.narrative,
            dueDate: reminderData.dueDate,
            assignedTo: `${request.assignedTo.firstName} ${request.assignedTo.lastName}`,
            daysUntilDue: reminderData.daysUntilDue,
            userType: 'agent',
          });
        }

        // Send to request creator
        if (request.assignedBy && request.assignedBy.id !== request.assignedToId) {
          await emailService.sendDueDateReminder(request.assignedBy.email, {
            requestId: reminderData.requestId,
            serviceQueueId: reminderData.serviceQueueId,
            clientName: reminderData.insured,
            requestTitle: reminderData.narrative,
            dueDate: reminderData.dueDate,
            assignedTo: request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Unassigned',
            daysUntilDue: reminderData.daysUntilDue,
            userType: 'customer',
          });
        }
      }
    } catch (error) {
      console.error('Failed to send due date reminder emails:', error);
    }
  },

  // Notify when a subtask is completed
  async notifySubtaskCompleted({
    subtaskId,
    managerId,
    agentId,
    taskDescription,
  }: {
    subtaskId: string;
    managerId: string;
    agentId: string;
    taskDescription: string;
  }) {
    try {
      // Get agent and manager details
      const agent = await db.query.users.findFirst({
        where: eq(users.id, agentId),
      });

      const manager = await db.query.users.findFirst({
        where: eq(users.id, managerId),
      });

      if (!agent || !manager) return;

      // Create notification for manager
      await this.createNotification({
        userId: managerId,
        type: 'subtask_completed',
        title: 'Subtask Completed',
        message: `${agent.firstName} ${agent.lastName} has completed a subtask: ${taskDescription}`,
        metadata: JSON.stringify({
          subtaskId,
          agentId,
        }),
      });

      // Send email to manager
      if (manager.email) {
        await emailService.sendSubtaskCompletedEmail({
          to: manager.email,
          managerName: `${manager.firstName} ${manager.lastName}`,
          agentName: `${agent.firstName} ${agent.lastName}`,
          taskDescription,
        });
      }
    } catch (error) {
      console.error('Failed to send subtask completion notification:', error);
    }
  },
};
