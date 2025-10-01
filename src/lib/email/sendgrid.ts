import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailTemplate {
 to: string;
 templateId: string;
 dynamicTemplateData: Record<string, unknown>;
 from?: string;
 subject?: string;
}

export interface BasicEmailTemplate {
 to: string;
 subject: string;
 html: string;
 text?: string;
 from?: string;
}

export async function sendEmail({
 to,
 templateId,
 dynamicTemplateData,
 from
}: EmailTemplate) {
 try {
   const msg = {
     to,
     from: from || process.env.SENDGRID_FROM_EMAIL!,
     templateId,
     dynamicTemplateData,
   };

   await sgMail.send(msg);
 } catch (error) {
   throw error;
 }
}

export async function sendBasicEmail({
 to,
 subject,
 html,
 text,
 from
}: BasicEmailTemplate) {
 try {
   const msg = {
     to,
     from: from || process.env.SENDGRID_FROM_EMAIL!,
     subject,
     html,
     text: text || html.replace(/<[^>]*>/g, ''),
   };

   await sgMail.send(msg);
 } catch (error) {
   throw error;
 }
}

export const emailService = {
async sendCompanyCode(companyEmail: string, companyData: {
  companyName: string;
  primaryContact: string;
  companyCode: string;
}) {
  const templateId = process.env.SENDGRID_COMPANY_CODE_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: companyEmail,
      subject: 'Company Registration Successful - Your Company Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #087055; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">Welcome to Service Queue</h2>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #333; margin-top: 0;">Company Registration Successful!</h3>

            <p>Dear ${companyData.primaryContact},</p>

            <p>Congratulations! Your company <strong>${companyData.companyName}</strong> has been successfully registered in our Service Queue platform.</p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #087055; margin: 20px 0;">
              <h4 style="color: #087055; margin-top: 0;">Your Company Details:</h4>
              <p><strong>Company Name:</strong> ${companyData.companyName}</p>
              <p><strong>Primary Contact:</strong> ${companyData.primaryContact}</p>
              <p><strong>Company Code:</strong>
                <span style="font-size: 20px; font-weight: bold; color: #087055; background-color: #e8f5e8; padding: 8px 16px; border-radius: 4px; font-family: monospace;">
                  ${companyData.companyCode}
                </span>
              </p>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Important Information:</h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px;">
                <li>Please save your company code in a secure location</li>
                <li>You will need this code for future reference and communications</li>
                <li>Share this code only with authorized personnel in your organization</li>
              </ul>
            </div>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
                 style="background-color: #087055; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Access Service Queue Platform
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>

            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">

            <p style="color: #666; font-size: 12px; margin-bottom: 0;">
              Best regards,<br>
              <strong>Service Queue Team</strong><br>
              <em>Streamlining your service management experience</em>
            </p>
          </div>
        </div>
      `,
    });
  }

  return sendEmail({
    to: companyEmail,
    templateId,
    dynamicTemplateData: {
      ...companyData,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    }
  });
},

async sendCustomerWelcome(userEmail: string, userData: {
  firstName: string;
  lastName: string;
  loginCode: string;
  companyName: string;
}) {
  const templateId = process.env.SENDGRID_CUSTOMER_WELCOME_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: 'Welcome to Service Queue - Your Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Service Queue</h2>
          <p>Dear ${userData.firstName} ${userData.lastName},</p>
          <p>Welcome to the Service Queue platform for ${userData.companyName}.</p>
          <p>Your login code is: <strong style="font-size: 18px; color: #087055;">${userData.loginCode}</strong></p>
          <p>Please use this code to access the Service Queue platform at: ${process.env.NEXT_PUBLIC_APP_URL}/login</p>
          <p>If you have any questions, please contact our support team.</p>
          <br>
          <p>Best regards,<br>Service Queue Team</p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...userData,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    }
  });
},

async sendAgentWelcome(userEmail: string, userData: {
  firstName: string;
  lastName: string;
  loginCode: string;
  companyName: string;
}) {
  const templateId = process.env.SENDGRID_AGENT_WELCOME_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: 'Service Queue Agent Access - Your Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Service Queue Agent Access</h2>
          <p>Dear ${userData.firstName} ${userData.lastName},</p>
          <p>You have been granted agent access to the Service Queue platform for ${userData.companyName}.</p>
          <p>Your agent login code is: <strong style="font-size: 18px; color: #087055;">${userData.loginCode}</strong></p>
          <p>Please use this code to access the Service Queue platform at: ${process.env.NEXT_PUBLIC_APP_URL}/login/agent</p>
          <p>If you have any questions, please contact the administrator.</p>
          <br>
          <p>Best regards,<br>Service Queue Team</p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...userData,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login/agent`,
    }
  });
},

async sendAgentCodeReset(userEmail: string, resetData: {
  firstName: string;
  lastName: string;
  oldLoginCode: string;
  newLoginCode: string;
}) {
  const templateId = process.env.SENDGRID_AGENT_CODE_RESET_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: 'Agent Login Code Reset - Service Queue',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">Agent Login Code Reset</h2>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #333; margin-top: 0;">Your Agent Login Code Has Been Reset</h3>

            <p>Dear ${resetData.firstName} ${resetData.lastName},</p>

            <p>Your agent login code has been successfully reset in our Service Queue platform.</p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="color: #f59e0b; margin-top: 0;">Code Reset Details:</h4>

              <div style="margin: 15px 0;">
                <p><strong>Previous Code:</strong></p>
                <span style="font-size: 16px; font-weight: bold; color: #dc3545; background-color: #f8d7da; padding: 8px 16px; border-radius: 4px; font-family: monospace; text-decoration: line-through;">
                  ${resetData.oldLoginCode}
                </span>
              </div>

              <div style="margin: 15px 0;">
                <p><strong>New Login Code:</strong></p>
                <span style="font-size: 20px; font-weight: bold; color: #f59e0b; background-color: #fef3c7; padding: 8px 16px; border-radius: 4px; font-family: monospace;">
                  ${resetData.newLoginCode}
                </span>
              </div>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">Important Notice:</h4>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li>Your previous login code (${resetData.oldLoginCode}) is no longer valid</li>
                <li>Please use your new login code to access the agent portal</li>
                <li>Keep this code secure and confidential</li>
              </ul>
            </div>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login/agent"
                 style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Access Agent Portal
              </a>
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">Need Help?</h4>
              <p style="color: #1e40af; margin: 0;">
                If you did not request this login code reset or have any questions, please contact the administrator immediately.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">

            <p style="color: #666; font-size: 12px; margin-bottom: 0;">
              Best regards,<br>
              <strong>Service Queue Team</strong><br>
              <em>Keeping your agent access secure and efficient</em>
            </p>
          </div>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...resetData,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login/agent`,
    }
  });
},

async sendAdminCredentials(userEmail: string, userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
}) {
  const templateId = process.env.SENDGRID_ADMIN_WELCOME_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: 'Service Queue Admin Access - Your Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Service Queue Admin Access</h2>
          <p>Dear ${userData.firstName} ${userData.lastName},</p>
          <p>You have been granted admin access to the Service Queue platform for ${userData.companyName}.</p>
          <p>Your admin credentials are:</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Password:</strong> <span style="font-size: 16px; color: #087055;">${userData.password}</span></p>
          <p>Please login at: ${process.env.NEXT_PUBLIC_APP_URL}/login/superadmin</p>
          <p><strong>Important:</strong> Please change your password immediately after your first login for security.</p>
          <br>
          <p>Best regards,<br>Service Queue Team</p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...userData,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login/superadmin`,
    }
  });
},

async sendCustomerAdminWelcome(userEmail: string, userData: {
  firstName: string;
  lastName: string;
  email: string;
  loginCode: string;
  companyName: string;
}) {
  const templateId = process.env.SENDGRID_CUSTOMER_ADMIN_WELCOME_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: 'Service Queue Customer Admin Access - Your Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Service Queue Customer Admin Access</h2>
          <p>Dear ${userData.firstName} ${userData.lastName},</p>
          <p>You have been granted customer admin access to the Service Queue platform for ${userData.companyName}.</p>
          <p>Your login credentials are:</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Login Code:</strong> <span style="font-size: 16px; color: #087055;">${userData.loginCode}</span></p>
          <p>Please login at: ${process.env.NEXT_PUBLIC_APP_URL}/login</p>
          <p><strong>Instructions:</strong> Use the "Admin" tab and enter both your email and login code to access the customer admin portal.</p>
          <br>
          <p>Best regards,<br>Service Queue Team</p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...userData,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    }
  });
},

async sendNoteAdded(userEmail: string, noteData: {
  requestId: string;
  serviceQueueId: string;
  noteContent: string;
  authorName: string;
  clientName: string;
  requestTitle: string;
  userType?: 'customer' | 'agent' | 'admin';
}) {
  const templateId = process.env.SENDGRID_NOTE_ADDED_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: `New Note Added - ${noteData.serviceQueueId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Note Added to Service Request</h2>
          <p><strong>Request ID:</strong> ${noteData.serviceQueueId}</p>
          <p><strong>Client:</strong> ${noteData.clientName}</p>
          <p><strong>Request:</strong> ${noteData.requestTitle}</p>
          <p><strong>Note by:</strong> ${noteData.authorName}</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #087055; margin: 20px 0;">
            <p><strong>Note:</strong></p>
            <p>${noteData.noteContent}</p>
          </div>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${noteData.userType ? `/${noteData.userType}` : ''}/requests/${noteData.requestId}" style="background-color: #087055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a></p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...noteData,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}${noteData.userType ? `/${noteData.userType}` : ''}/dashboard`,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}${noteData.userType ? `/${noteData.userType}` : ''}/requests/${noteData.requestId}`,
    }
  });
},

async sendStatusUpdate(userEmail: string, statusData: {
  requestId: string;
  serviceQueueId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  clientName: string;
  requestTitle: string;
  userType?: 'customer' | 'agent' | 'admin';
}) {
  const templateId = process.env.SENDGRID_STATUS_UPDATE_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: `Status Update - ${statusData.serviceQueueId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Service Request Status Updated</h2>
          <p><strong>Request ID:</strong> ${statusData.serviceQueueId}</p>
          <p><strong>Client:</strong> ${statusData.clientName}</p>
          <p><strong>Request:</strong> ${statusData.requestTitle}</p>
          <p><strong>Status changed from:</strong> <span style="text-decoration: line-through;">${statusData.oldStatus}</span> to <strong style="color: #087055;">${statusData.newStatus}</strong></p>
          <p><strong>Updated by:</strong> ${statusData.updatedBy}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${statusData.userType ? `/${statusData.userType}` : ''}/requests/${statusData.requestId}" style="background-color: #087055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a></p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...statusData,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}${statusData.userType ? `/${statusData.userType}` : ''}/dashboard`,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}${statusData.userType ? `/${statusData.userType}` : ''}/requests/${statusData.requestId}`,
    }
  });
},

async sendCompanyCodeReset(companyEmail: string, resetData: {
  companyName: string;
  primaryContact: string;
  oldCompanyCode: string;
  newCompanyCode: string;
}) {
  const templateId = process.env.SENDGRID_COMPANY_CODE_RESET_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: companyEmail,
      subject: 'Company Code Reset - Service Queue',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">Company Code Reset</h2>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #333; margin-top: 0;">Your Company Code Has Been Reset</h3>

            <p>Dear ${resetData.primaryContact},</p>

            <p>The company code for <strong>${resetData.companyName}</strong> has been successfully reset in our Service Queue platform.</p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="color: #f59e0b; margin-top: 0;">Code Reset Details:</h4>
              <p><strong>Company Name:</strong> ${resetData.companyName}</p>
              <p><strong>Primary Contact:</strong> ${resetData.primaryContact}</p>

              <div style="margin: 15px 0;">
                <p><strong>Previous Code:</strong></p>
                <span style="font-size: 16px; font-weight: bold; color: #dc3545; background-color: #f8d7da; padding: 8px 16px; border-radius: 4px; font-family: monospace; text-decoration: line-through;">
                  ${resetData.oldCompanyCode}
                </span>
              </div>

              <div style="margin: 15px 0;">
                <p><strong>New Company Code:</strong></p>
                <span style="font-size: 20px; font-weight: bold; color: #f59e0b; background-color: #fef3c7; padding: 8px 16px; border-radius: 4px; font-family: monospace;">
                  ${resetData.newCompanyCode}
                </span>
              </div>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">Important Notice:</h4>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li>Your previous company code (${resetData.oldCompanyCode}) is no longer valid</li>
                <li>Please update all your records with the new company code</li>
                <li>Share this new code only with authorized personnel in your organization</li>
                <li>Keep this code secure and confidential</li>
              </ul>
            </div>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
                 style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Access Service Queue Platform
              </a>
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">Need Help?</h4>
              <p style="color: #1e40af; margin: 0;">
                If you did not request this company code reset or have any questions, please contact our support team immediately.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">

            <p style="color: #666; font-size: 12px; margin-bottom: 0;">
              Best regards,<br>
              <strong>Service Queue Team</strong><br>
              <em>Keeping your service management secure and efficient</em>
            </p>
          </div>
        </div>
      `,
    });
  }

  return sendEmail({
    to: companyEmail,
    templateId,
    dynamicTemplateData: {
      ...resetData,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    }
  });
},

async sendRequestAssigned(userEmail: string, assignmentData: {
  requestId: string;
  serviceQueueId: string;
  assignedTo: string;
  assignedBy: string;
  clientName: string;
  requestTitle: string;
  dueDate?: string;
  userType?: 'customer' | 'agent' | 'admin';
}) {
  const templateId = process.env.SENDGRID_REQUEST_ASSIGNED_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: `New Assignment - ${assignmentData.serviceQueueId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Service Request Assignment</h2>
          <p><strong>Request ID:</strong> ${assignmentData.serviceQueueId}</p>
          <p><strong>Client:</strong> ${assignmentData.clientName}</p>
          <p><strong>Request:</strong> ${assignmentData.requestTitle}</p>
          <p><strong>Assigned to:</strong> ${assignmentData.assignedTo}</p>
          <p><strong>Assigned by:</strong> ${assignmentData.assignedBy}</p>
          ${assignmentData.dueDate ? `<p><strong>Due Date:</strong> ${assignmentData.dueDate}</p>` : ''}
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${assignmentData.userType ? `/${assignmentData.userType}` : ''}/requests/${assignmentData.requestId}" style="background-color: #087055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a></p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...assignmentData,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}${assignmentData.userType ? `/${assignmentData.userType}` : ''}/dashboard`,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}${assignmentData.userType ? `/${assignmentData.userType}` : ''}/requests/${assignmentData.requestId}`,
    }
  });
},

async sendNewRequest(userEmail: string, requestData: {
  requestId: string;
  serviceQueueId: string;
  clientName: string;
  requestTitle: string;
  category: string;
  createdBy: string;
  priority: string;
  userType?: 'customer' | 'agent' | 'admin';
}) {
  const templateId = process.env.SENDGRID_NEW_REQUEST_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: `New Service Request - ${requestData.serviceQueueId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Service Request Created</h2>
          <p><strong>Request ID:</strong> ${requestData.serviceQueueId}</p>
          <p><strong>Client:</strong> ${requestData.clientName}</p>
          <p><strong>Request:</strong> ${requestData.requestTitle}</p>
          <p><strong>Category:</strong> ${requestData.category}</p>
          <p><strong>Priority:</strong> ${requestData.priority}</p>
          <p><strong>Created by:</strong> ${requestData.createdBy}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${requestData.userType ? `/${requestData.userType}` : ''}/requests/${requestData.requestId}" style="background-color: #087055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a></p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...requestData,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}${requestData.userType ? `/${requestData.userType}` : ''}/dashboard`,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}${requestData.userType ? `/${requestData.userType}` : ''}/requests/${requestData.requestId}`,
    }
  });
},

async sendPasswordReset(userEmail: string, resetData: {
  firstName: string;
  lastName: string;
  resetToken: string;
  expirationTime: string;
}) {
  const templateId = process.env.SENDGRID_PASSWORD_RESET_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: 'Password Reset Request - Service Queue',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Dear ${resetData.firstName} ${resetData.lastName},</p>
          <p>You have requested to reset your password for the Service Queue platform.</p>
          <p>Please click the link below to reset your password:</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetData.resetToken}" style="background-color: #087055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>This link will expire at: ${resetData.expirationTime}</p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br>Service Queue Team</p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...resetData,
      resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetData.resetToken}`,
    }
  });
},

async sendDueDateReminder(userEmail: string, reminderData: {
  requestId: string;
  serviceQueueId: string;
  clientName: string;
  requestTitle: string;
  dueDate: string;
  assignedTo: string;
  daysUntilDue: number;
  userType?: 'customer' | 'agent' | 'admin';
}) {
  const templateId = process.env.SENDGRID_DUE_DATE_REMINDER_TEMPLATE_ID;

  if (!templateId) {
    const urgencyLevel = reminderData.daysUntilDue <= 0 ? 'OVERDUE' :
                        reminderData.daysUntilDue === 1 ? 'DUE TOMORROW' :
                        `DUE IN ${reminderData.daysUntilDue} DAYS`;

    return sendBasicEmail({
      to: userEmail,
      subject: `${urgencyLevel} - ${reminderData.serviceQueueId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${reminderData.daysUntilDue <= 0 ? '#dc3545' : '#087055'};">Service Request Due Date Reminder</h2>
          <p><strong>Request ID:</strong> ${reminderData.serviceQueueId}</p>
          <p><strong>Client:</strong> ${reminderData.clientName}</p>
          <p><strong>Request:</strong> ${reminderData.requestTitle}</p>
          <p><strong>Assigned to:</strong> ${reminderData.assignedTo}</p>
          <p><strong>Due Date:</strong> ${reminderData.dueDate}</p>
          <p style="color: ${reminderData.daysUntilDue <= 0 ? '#dc3545' : '#087055'}; font-weight: bold;">Status: ${urgencyLevel}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${reminderData.userType ? `/${reminderData.userType}` : ''}/requests/${reminderData.requestId}" style="background-color: #087055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a></p>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...reminderData,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}${reminderData.userType ? `/${reminderData.userType}` : ''}/dashboard`,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}${reminderData.userType ? `/${reminderData.userType}` : ''}/requests/${reminderData.requestId}`,
    }
  });
},

async sendAssignmentChangeRequest(userEmail: string, changeData: {
  requestId: string;
  serviceQueueId: string;
  clientName: string;
  requestTitle: string;
  requestedBy: string;
  currentAssignee?: string;
  requestedAssignee?: string;
  reason: string;
  changeRequestId: string;
  userType?: 'customer' | 'agent' | 'admin';
}) {
  const templateId = process.env.SENDGRID_ASSIGNMENT_CHANGE_REQUEST_TEMPLATE_ID;

  if (!templateId) {
    return sendBasicEmail({
      to: userEmail,
      subject: `Assignment Change Request - ${changeData.serviceQueueId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">Assignment Change Request</h2>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #333; margin-top: 0;">Action Required: Review Assignment Change Request</h3>

            <p>Dear Agent Manager,</p>

            <p>A new assignment change request has been submitted and requires your review and approval.</p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="color: #f59e0b; margin-top: 0;">Request Details:</h4>
              <p><strong>Request ID:</strong> ${changeData.serviceQueueId}</p>
              <p><strong>Client:</strong> ${changeData.clientName}</p>
              <p><strong>Request Title:</strong> ${changeData.requestTitle}</p>
              <p><strong>Requested by:</strong> ${changeData.requestedBy}</p>
              ${changeData.currentAssignee ? `<p><strong>Current Assignee:</strong> ${changeData.currentAssignee}</p>` : ''}
              ${changeData.requestedAssignee ? `<p><strong>Requested Assignee:</strong> ${changeData.requestedAssignee}</p>` : '<p><strong>Requested Assignee:</strong> <em>Unassign (no specific agent requested)</em></p>'}
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">Reason for Change:</h4>
              <p style="color: #92400e; margin: 0; font-style: italic;">"${changeData.reason}"</p>
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">Next Steps:</h4>
              <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Review the assignment change request details</li>
                <li>Consider the reason provided by the requesting agent</li>
                <li>Approve or reject the request with appropriate comments</li>
                <li>If approved, the system will automatically reassign the task</li>
              </ul>
            </div>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/agent/assignment-change-requests?id=${changeData.changeRequestId}"
                 style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                Review Request
              </a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}${changeData.userType ? `/${changeData.userType}` : ''}/requests/${changeData.requestId}"
                 style="background-color: #087055; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Task
              </a>
            </div>

            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 6px; border-left: 4px solid #087055; margin: 20px 0;">
              <h4 style="color: #065f46; margin-top: 0;">Tip:</h4>
              <p style="color: #065f46; margin: 0; font-size: 14px;">
                Assignment changes help ensure optimal task distribution and can improve team efficiency. Consider workload balance and agent expertise when reviewing requests.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">

            <p style="color: #666; font-size: 12px; margin-bottom: 0;">
              Best regards,<br>
              <strong>Service Queue Team</strong><br>
              <em>Streamlining your team's workflow management</em>
            </p>
          </div>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...changeData,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}${changeData.userType ? `/${changeData.userType}` : ''}/dashboard`,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}${changeData.userType ? `/${changeData.userType}` : ''}/requests/${changeData.requestId}`,
      reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/agent/assignment-change-requests?id=${changeData.changeRequestId}`,
    }
  });
},

async sendAssignmentChangeReviewed(userEmail: string, reviewData: {
  requestId: string;
  serviceQueueId: string;
  clientName: string;
  requestTitle: string;
  reviewedBy: string;
  action: 'approved' | 'rejected';
  comment?: string;
  newAssignee?: string;
  userType?: 'customer' | 'agent' | 'admin';
}) {
  const templateId = process.env.SENDGRID_ASSIGNMENT_CHANGE_REVIEWED_TEMPLATE_ID;

  if (!templateId) {
    const actionColor = reviewData.action === 'approved' ? '#087055' : '#dc3545';
    const actionText = reviewData.action === 'approved' ? 'Approved' : 'Rejected';

    return sendBasicEmail({
      to: userEmail,
      subject: `Assignment Change ${actionText} - ${reviewData.serviceQueueId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${actionColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">Assignment Change ${actionText}</h2>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #333; margin-top: 0;">Your Assignment Change Request has been ${actionText}</h3>

            <p>Dear Agent,</p>

            <p>Your assignment change request has been reviewed and <strong>${reviewData.action}</strong> by ${reviewData.reviewedBy}.</p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${actionColor}; margin: 20px 0;">
              <h4 style="color: ${actionColor}; margin-top: 0;">Request Details:</h4>
              <p><strong>Request ID:</strong> ${reviewData.serviceQueueId}</p>
              <p><strong>Client:</strong> ${reviewData.clientName}</p>
              <p><strong>Request Title:</strong> ${reviewData.requestTitle}</p>
              <p><strong>Reviewed by:</strong> ${reviewData.reviewedBy}</p>
              <p><strong>Decision:</strong> <span style="color: ${actionColor}; font-weight: bold;">${actionText}</span></p>
              ${reviewData.newAssignee ? `<p><strong>New Assignee:</strong> ${reviewData.newAssignee}</p>` : ''}
            </div>

            ${reviewData.comment ? `
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">Manager's Comment:</h4>
              <p style="color: #1e40af; margin: 0; font-style: italic;">"${reviewData.comment}"</p>
            </div>
            ` : ''}

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}${reviewData.userType ? `/${reviewData.userType}` : ''}/requests/${reviewData.requestId}"
                 style="background-color: ${actionColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Request
              </a>
            </div>

            ${reviewData.action === 'approved' ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 6px; border-left: 4px solid #087055; margin: 20px 0;">
              <h4 style="color: #065f46; margin-top: 0;">Request Approved</h4>
              <p style="color: #065f46; margin: 0; font-size: 14px;">
                ${reviewData.newAssignee ? `The task has been successfully reassigned to ${reviewData.newAssignee}.` : 'The task assignment has been updated as requested.'}
              </p>
            </div>
            ` : `
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h4 style="color: #991b1b; margin-top: 0;">Request Rejected</h4>
              <p style="color: #991b1b; margin: 0; font-size: 14px;">
                The assignment change request was not approved. The current assignment remains unchanged.
              </p>
            </div>
            `}

            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">

            <p style="color: #666; font-size: 12px; margin-bottom: 0;">
              Best regards,<br>
              <strong>Service Queue Team</strong><br>
              <em>Supporting your workflow efficiency</em>
            </p>
          </div>
        </div>
      `,
    });
  }

  return sendEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...reviewData,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}${reviewData.userType ? `/${reviewData.userType}` : ''}/dashboard`,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}${reviewData.userType ? `/${reviewData.userType}` : ''}/requests/${reviewData.requestId}`,
    }
  });
},

// Send email when subtask is completed
async sendSubtaskCompletedEmail({
  to,
  managerName,
  agentName,
  taskDescription,
}: {
  to: string;
  managerName: string;
  agentName: string;
  taskDescription: string;
}) {
  return sendBasicEmail({
    to,
    subject: 'Subtask Completed',
    text: `Hello ${managerName},\n\n${agentName} has completed a subtask: ${taskDescription}\n\nYou can view the details in your dashboard.`,
    html: `
      <p>Hello ${managerName},</p>
      <p><strong>${agentName}</strong> has completed a subtask:</p>
      <p><em>${taskDescription}</em></p>
      <p>You can view the details in your dashboard.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/agent/dashboard" style="background-color: #087055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a></p>
    `,
  });
}
};