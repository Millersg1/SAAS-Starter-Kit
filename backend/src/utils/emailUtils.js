import nodemailer from 'nodemailer';

/**
 * Create email transporter
 * In production, configure with real SMTP settings
 */
const createTransporter = () => {
  // For development, use ethereal email (fake SMTP service)
  // In production, replace with real SMTP credentials from .env
  
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  
  // Development mode - log emails to console instead of sending
  return {
    sendMail: async (mailOptions) => {
      console.log('\n📧 Email would be sent (Development Mode): - emailUtils.js:26');
      console.log('To: - emailUtils.js:27', mailOptions.to);
      console.log('Subject: - emailUtils.js:28', mailOptions.subject);
      console.log('Content: - emailUtils.js:29', mailOptions.text || mailOptions.html);
      console.log('\n - emailUtils.js:30');
      return { messageId: 'dev-mode-' + Date.now() };
    }
  };
};

/**
 * Send email verification email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} token - Verification token
 */
export const sendVerificationEmail = async (email, name, token) => {
  const transporter = createTransporter();
  
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
  
  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME || 'ClientHub'} <${process.env.SMTP_FROM_EMAIL || 'noreply@clienthub.com'}>`,
    to: email,
    subject: 'Verify Your Email - ClientHub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ClientHub, ${name}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to ClientHub, ${name}!\n\nPlease verify your email by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to: - emailUtils.js:74', email);
  } catch (error) {
    console.error('❌ Error sending verification email: - emailUtils.js:76', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} token - Reset token
 */
export const sendPasswordResetEmail = async (email, name, token) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
  
  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME || 'ClientHub'} <${process.env.SMTP_FROM_EMAIL || 'noreply@clienthub.com'}>`,
    to: email,
    subject: 'Password Reset Request - ClientHub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `,
    text: `Hi ${name},\n\nYou requested to reset your password. Visit this link to create a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to: - emailUtils.js:120', email);
  } catch (error) {
    console.error('❌ Error sending password reset email: - emailUtils.js:122', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send welcome email after email verification
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 */
/**
 * Send invoice notification to client when invoice status is set to 'sent'
 */
export const sendInvoiceEmail = async (clientEmail, clientName, invoiceNumber, total, dueDate, portalUrl, brandName) => {
  const transporter = createTransporter();
  const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);
  const formattedDue = dueDate ? new Date(dueDate).toLocaleDateString() : 'Upon receipt';

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: clientEmail,
    subject: `Invoice ${invoiceNumber} from ${brandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice ${invoiceNumber}</h2>
        <p>Hi ${clientName},</p>
        <p>You have a new invoice from <strong>${brandName}</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Invoice #</strong></td><td style="padding:8px; border:1px solid #ddd;">${invoiceNumber}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Amount Due</strong></td><td style="padding:8px; border:1px solid #ddd;">${formattedTotal}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Due Date</strong></td><td style="padding:8px; border:1px solid #ddd;">${formattedDue}</td></tr>
        </table>
        ${portalUrl ? `<div style="text-align:center; margin:30px 0;"><a href="${portalUrl}" style="background-color:#2563eb; color:white; padding:12px 30px; text-decoration:none; border-radius:5px; display:inline-block;">View Invoice in Portal</a></div>` : ''}
        <p style="color:#999; font-size:12px;">If you have any questions, please contact ${brandName} directly.</p>
      </div>
    `,
    text: `Hi ${clientName},\n\nYou have a new invoice from ${brandName}.\n\nInvoice #: ${invoiceNumber}\nAmount Due: ${formattedTotal}\nDue Date: ${formattedDue}\n\n${portalUrl ? `View in portal: ${portalUrl}` : ''}`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending invoice email:', error);
  }
};

/**
 * Send payment confirmation email to client
 */
export const sendPaymentConfirmationEmail = async (clientEmail, clientName, invoiceNumber, amountPaid, brandName) => {
  const transporter = createTransporter();
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountPaid);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: clientEmail,
    subject: `Payment Received - Invoice ${invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#16a34a;">Payment Confirmed ✓</h2>
        <p>Hi ${clientName},</p>
        <p>We've received your payment of <strong>${formattedAmount}</strong> for invoice ${invoiceNumber} from <strong>${brandName}</strong>.</p>
        <p>Thank you for your prompt payment!</p>
        <p style="color:#999; font-size:12px;">If you have any questions, please contact ${brandName} directly.</p>
      </div>
    `,
    text: `Hi ${clientName},\n\nWe've received your payment of ${formattedAmount} for invoice ${invoiceNumber}. Thank you!`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
  }
};

/**
 * Send project update notification to client
 */
export const sendProjectUpdateEmail = async (clientEmail, clientName, projectName, updateTitle, content, portalUrl, brandName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: clientEmail,
    subject: `Project Update: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Project Update</h2>
        <p>Hi ${clientName},</p>
        <p><strong>${brandName}</strong> has posted a new update on your project <strong>${projectName}</strong>.</p>
        <div style="background:#f3f4f6; border-left:4px solid #2563eb; padding:12px 16px; margin:20px 0;">
          <strong>${updateTitle}</strong>
          <p style="margin-top:8px;">${content}</p>
        </div>
        ${portalUrl ? `<div style="text-align:center; margin:30px 0;"><a href="${portalUrl}" style="background-color:#2563eb; color:white; padding:12px 30px; text-decoration:none; border-radius:5px; display:inline-block;">View in Portal</a></div>` : ''}
      </div>
    `,
    text: `Hi ${clientName},\n\n${brandName} posted a project update on "${projectName}".\n\n${updateTitle}\n${content}\n\n${portalUrl ? `View in portal: ${portalUrl}` : ''}`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending project update email:', error);
  }
};

/**
 * Send failed payment alert to brand owner
 */
export const sendFailedPaymentEmail = async (ownerEmail, ownerName, brandName, amount, currency) => {
  const transporter = createTransporter();
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: ownerEmail,
    subject: `Action Required: Payment Failed for ${brandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#dc2626;">Payment Failed</h2>
        <p>Hi ${ownerName},</p>
        <p>A payment of <strong>${formattedAmount}</strong> for your <strong>${brandName}</strong> subscription has failed.</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions" style="background-color:#dc2626; color:white; padding:12px 30px; text-decoration:none; border-radius:5px; display:inline-block;">Update Payment Method</a>
        </div>
      </div>
    `,
    text: `Hi ${ownerName},\n\nA payment of ${formattedAmount} for your ${brandName} subscription has failed. Please update your payment method.`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending failed payment email:', error);
  }
};

/**
 * Send trial ending reminder to brand owner
 */
export const sendTrialEndingEmail = async (ownerEmail, ownerName, brandName, trialEndDate) => {
  const transporter = createTransporter();
  const formattedDate = new Date(trialEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: ownerEmail,
    subject: `Your ${brandName} trial ends on ${formattedDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Trial is Ending Soon</h2>
        <p>Hi ${ownerName},</p>
        <p>Your trial for <strong>${brandName}</strong> ends on <strong>${formattedDate}</strong>.</p>
        <p>Add a payment method to continue using all features without interruption.</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions" style="background-color:#2563eb; color:white; padding:12px 30px; text-decoration:none; border-radius:5px; display:inline-block;">Add Payment Method</a>
        </div>
      </div>
    `,
    text: `Hi ${ownerName},\n\nYour trial for ${brandName} ends on ${formattedDate}. Add a payment method to keep your account active.`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending trial ending email:', error);
  }
};

/**
 * Send portal access credentials to client
 */
export const sendPortalAccessEmail = async (clientEmail, clientName, brandName, portalUrl, password) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: clientEmail,
    subject: `You've been invited to the ${brandName} client portal`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to the ${brandName} Client Portal</h2>
        <p>Hi ${clientName},</p>
        <p><strong>${brandName}</strong> has set up a client portal for you. You can now view your projects, documents, invoices, and messages online.</p>
        <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin:20px 0;">
          <p style="margin:0;"><strong>Your login credentials:</strong></p>
          <p style="margin:8px 0 0;">Email: <strong>${clientEmail}</strong></p>
          <p style="margin:4px 0 0;">Password: <strong>${password}</strong></p>
        </div>
        <div style="text-align:center; margin:30px 0;">
          <a href="${portalUrl}" style="background-color:#2563eb; color:white; padding:12px 30px; text-decoration:none; border-radius:5px; display:inline-block;">Access Your Portal</a>
        </div>
        <p style="color:#999; font-size:12px;">We recommend changing your password after your first login. Contact ${brandName} if you have any questions.</p>
      </div>
    `,
    text: `Hi ${clientName},\n\n${brandName} has set up a client portal for you.\n\nEmail: ${clientEmail}\nPassword: ${password}\n\nAccess your portal at: ${portalUrl}`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending portal access email:', error);
  }
};

/**
 * Send overdue invoice reminder to client
 */
export const sendOverdueReminderEmail = async (clientEmail, clientName, invoiceNumber, amountDue, daysOverdue, portalUrl, brandName) => {
  const transporter = createTransporter();
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountDue);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: clientEmail,
    subject: `Action Required: Invoice ${invoiceNumber} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#ea580c;">Payment Reminder</h2>
        <p>Hi ${clientName},</p>
        <p>This is a reminder that invoice <strong>${invoiceNumber}</strong> from <strong>${brandName}</strong> is now <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Invoice #</strong></td><td style="padding:8px; border:1px solid #ddd;">${invoiceNumber}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Amount Due</strong></td><td style="padding:8px; border:1px solid #ddd; color:#dc2626; font-weight:bold;">${formattedAmount}</td></tr>
        </table>
        <p>Please arrange payment at your earliest convenience to avoid any service interruption.</p>
        ${portalUrl ? `<div style="text-align:center; margin:30px 0;"><a href="${portalUrl}" style="background-color:#ea580c; color:white; padding:12px 30px; text-decoration:none; border-radius:5px; display:inline-block;">Pay Now</a></div>` : ''}
        <p style="color:#999; font-size:12px;">If you have already made payment, please disregard this notice. Contact ${brandName} if you have any questions.</p>
      </div>
    `,
    text: `Hi ${clientName},\n\nInvoice ${invoiceNumber} from ${brandName} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.\nAmount Due: ${formattedAmount}\n\n${portalUrl ? `Pay now: ${portalUrl}` : ''}\n\nIf you have already paid, please disregard this notice.`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending overdue reminder email:', error);
  }
};

/**
 * Send proposal notification to client
 */
export const sendProposalEmail = async (clientEmail, clientName, proposalTitle, total, expiryDate, portalUrl, brandName) => {
  const transporter = createTransporter();
  const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);
  const formattedExpiry = expiryDate ? new Date(expiryDate).toLocaleDateString() : 'No expiry';

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: clientEmail,
    subject: `Proposal: ${proposalTitle} from ${brandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Proposal</h2>
        <p>Hi ${clientName},</p>
        <p><strong>${brandName}</strong> has sent you a proposal for your review.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Proposal</strong></td><td style="padding:8px; border:1px solid #ddd;">${proposalTitle}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Total Value</strong></td><td style="padding:8px; border:1px solid #ddd;">${formattedTotal}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Expires</strong></td><td style="padding:8px; border:1px solid #ddd;">${formattedExpiry}</td></tr>
        </table>
        <p>Review the proposal and accept or decline through your client portal.</p>
        ${portalUrl ? `<div style="text-align:center; margin:30px 0;"><a href="${portalUrl}" style="background-color:#2563eb; color:white; padding:12px 30px; text-decoration:none; border-radius:5px; display:inline-block;">Review Proposal</a></div>` : ''}
        <p style="color:#999; font-size:12px;">If you have any questions, please contact ${brandName} directly.</p>
      </div>
    `,
    text: `Hi ${clientName},\n\n${brandName} has sent you a proposal: "${proposalTitle}"\nTotal: ${formattedTotal}\nExpires: ${formattedExpiry}\n\n${portalUrl ? `Review at: ${portalUrl}` : ''}`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending proposal email:', error);
  }
};

export const sendWelcomeEmail = async (email, name) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME || 'ClientHub'} <${process.env.SMTP_FROM_EMAIL || 'noreply@clienthub.com'}>`,
    to: email,
    subject: 'Welcome to ClientHub!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ClientHub, ${name}! 🎉</h2>
        <p>Your email has been verified successfully. You can now access all features of your account.</p>
        <p>Get started by:</p>
        <ul>
          <li>Completing your profile</li>
          <li>Exploring the dashboard</li>
          <li>Connecting with your team</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      </div>
    `,
    text: `Welcome to ClientHub, ${name}!\n\nYour email has been verified successfully. Visit your dashboard to get started.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to: - emailUtils.js:164', email);
  } catch (error) {
    console.error('❌ Error sending welcome email: - emailUtils.js:166', error);
    // Don't throw error for welcome email - it's not critical
  }
};

/**
 * Send contact form submission to sales inbox
 */
export const sendContactEmail = async ({ name, email, company, message }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `ClientHub Contact Form <${process.env.SMTP_FROM_EMAIL || 'noreply@faithharborclienthub.com'}>`,
    to: 'sales@faithharborclienthub.com',
    replyTo: email,
    subject: `New Contact Form Submission from ${name}${company ? ` (${company})` : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1e40af; margin-bottom: 24px;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 16px; font-weight: bold; color: #374151; width: 120px;">Name</td>
            <td style="padding: 12px 16px; color: #111827;">${name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 16px; font-weight: bold; color: #374151;">Email</td>
            <td style="padding: 12px 16px;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
          </tr>
          ${company ? `<tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 16px; font-weight: bold; color: #374151;">Company</td>
            <td style="padding: 12px 16px; color: #111827;">${company}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; color: #374151; vertical-align: top;">Message</td>
            <td style="padding: 12px 16px; color: #111827; white-space: pre-wrap;">${message}</td>
          </tr>
        </table>
        <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">Reply directly to this email to respond to ${name}.</p>
      </div>
    `,
    text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}${company ? `\nCompany: ${company}` : ''}\n\nMessage:\n${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Contact email sent from:', email);
  } catch (error) {
    console.error('❌ Error sending contact email:', error.message);
    throw error;
  }
};

export const sendProposalFollowUpEmail = async (clientEmail, clientName, proposalTitle, total, portalUrl, brandName, dayNumber) => {
  const transporter = createTransporter();
  const fromName = brandName || process.env.SMTP_FROM_NAME || 'ClientHub';

  const mailOptions = {
    from: `${fromName} <${process.env.SMTP_FROM_EMAIL || 'noreply@clienthub.com'}>`,
    to: clientEmail,
    subject: `Following up on your proposal — ${proposalTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e7eb;">
          <h2 style="color:#1e40af;margin-top:0;">Following Up on Your Proposal</h2>
          <p style="color:#374151;">Hi ${clientName},</p>
          <p style="color:#374151;">
            I wanted to follow up on the proposal we sent you ${dayNumber} days ago
            for <strong>${proposalTitle}</strong>.
          </p>
          <p style="color:#374151;">
            Total value: <strong>$${parseFloat(total).toFixed(2)}</strong>
          </p>
          <p style="color:#374151;">
            If you have any questions or would like to discuss the details, we'd love to hear from you.
            You can review and accept your proposal through your client portal.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${portalUrl}"
               style="background:#1e40af;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
              View Proposal
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px;">
            If you're not interested, no worries — just let us know and we won't follow up again.
          </p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

export const sendTaskReminderEmail = async (userEmail, userName, taskTitle, clientName, dueDate) => {
  const transporter = createTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'ClientHub';

  const mailOptions = {
    from: `${fromName} <${process.env.SMTP_FROM_EMAIL || 'noreply@clienthub.com'}>`,
    to: userEmail,
    subject: `Task due today: ${taskTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #fcd34d;">
          <h2 style="color:#92400e;margin-top:0;">⏰ Task Due Today</h2>
          <p style="color:#374151;">Hi ${userName},</p>
          <p style="color:#374151;">
            You have a task due today:
          </p>
          <div style="background:#fef3c7;border-radius:6px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:16px;font-weight:600;color:#92400e;">${taskTitle}</p>
            ${clientName ? `<p style="margin:6px 0 0;color:#78350f;font-size:14px;">Client: ${clientName}</p>` : ''}
            <p style="margin:6px 0 0;color:#78350f;font-size:14px;">Due: ${dueDate}</p>
          </div>
          <p style="color:#374151;">Log in to ClientHub to mark this task as complete.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send weekly summary email to brand owner
 * @param {string} ownerEmail
 * @param {string} ownerName
 * @param {string} brandName
 * @param {Object} stats - { revenue7d, invoicesSent, invoicesPaid, proposalsSent, proposalsAccepted, tasksCompleted, newClients }
 */
export const sendWeeklyReportEmail = async (ownerEmail, ownerName, brandName, stats) => {
  const transporter = createTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'ClientHub';

  const statCard = (label, value, color = '#1d4ed8') =>
    `<div style="display:inline-block;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:6px;min-width:120px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:${color};">${value}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">${label}</div>
    </div>`;

  const mailOptions = {
    from: `${fromName} <${process.env.SMTP_FROM_EMAIL || 'noreply@clienthub.com'}>`,
    to: ownerEmail,
    subject: `Your weekly summary — ${brandName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0f9ff;padding:20px;">
        <div style="background:#1d4ed8;border-radius:8px 8px 0 0;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:22px;">${brandName}</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">Weekly Performance Summary</p>
        </div>
        <div style="background:#fff;border-radius:0 0 8px 8px;padding:32px;border:1px solid #bfdbfe;border-top:none;">
          <p style="color:#374151;margin-top:0;">Hi ${ownerName},</p>
          <p style="color:#374151;">Here's how your business performed over the last 7 days:</p>

          <div style="text-align:center;margin:24px 0;">
            ${statCard('Revenue (7d)', '$' + parseFloat(stats.revenue7d || 0).toLocaleString('en-US', { minimumFractionDigits: 0 }), '#059669')}
            ${statCard('Invoices Sent', stats.invoicesSent || 0)}
            ${statCard('Invoices Paid', stats.invoicesPaid || 0, '#059669')}
            ${statCard('Proposals Sent', stats.proposalsSent || 0)}
            ${statCard('Proposals Accepted', stats.proposalsAccepted || 0, '#7c3aed')}
            ${statCard('Tasks Completed', stats.tasksCompleted || 0, '#0891b2')}
            ${statCard('New Clients', stats.newClients || 0, '#d97706')}
          </div>

          <div style="text-align:center;margin-top:24px;">
            <a href="${process.env.FRONTEND_URL || 'https://app.clienthub.com'}/dashboard"
               style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
              View Dashboard
            </a>
          </div>
        </div>
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">
          You're receiving this because you're an owner of the ${brandName} workspace on ClientHub.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

export const sendBookingConfirmationEmail = async (email, name, pageTitle, startTime, cancelToken) => {
  const transporter = createTransporter();
  const date = new Date(startTime).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const cancelUrl = `${process.env.FRONTEND_URL || 'https://faithharborclienthub.com'}/book/cancel/${cancelToken}`;
  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: `Booking Confirmed: ${pageTitle}`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;"><h2 style="color:#1d4ed8;">Your booking is confirmed ✓</h2><p>Hi ${name},</p><p>Your appointment for <strong>${pageTitle}</strong> is confirmed for:</p><p style="font-size:18px;font-weight:bold;color:#111;">${date}</p><p style="margin-top:24px;"><a href="${cancelUrl}" style="color:#6b7280;font-size:13px;">Need to cancel?</a></p></div>`,
  });
};

export const sendBookingNotificationEmail = async (brandName, pageTitle, clientName, clientEmail, startTime) => {
  const transporter = createTransporter();
  const date = new Date(startTime).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: process.env.SMTP_FROM_EMAIL,
    subject: `New Booking: ${pageTitle} — ${clientName}`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;"><h2 style="color:#1d4ed8;">New booking received</h2><p><strong>Page:</strong> ${pageTitle}</p><p><strong>Client:</strong> ${clientName} (${clientEmail})</p><p><strong>Time:</strong> ${date}</p></div>`,
  });
};

export const sendNewTicketEmail = async (email, name, clientName, subject, ticketNumber) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: `New Support Ticket [${ticketNumber}]: ${subject}`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;"><h2 style="color:#1d4ed8;">New Support Ticket</h2><p>Hi ${name},</p><p><strong>${clientName}</strong> opened a new support ticket:</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Ticket #:</strong> ${ticketNumber}</p><p><a href="${process.env.FRONTEND_URL}/tickets" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Ticket</a></p></div>`,
  });
};

export const sendTicketReplyEmail = async (email, clientName, subject, ticketNumber, replyBody) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: `Re: [${ticketNumber}] ${subject}`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;"><h2 style="color:#1d4ed8;">Reply to your ticket</h2><p>Hi ${clientName},</p><p>New reply on ticket <strong>${ticketNumber}</strong>:</p><div style="background:#f9fafb;border-left:4px solid #1d4ed8;padding:12px 16px;margin:16px 0;border-radius:4px;">${replyBody}</div><p><a href="${process.env.FRONTEND_URL}/portal/tickets" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View Full Thread</a></p></div>`,
  });
};

export const sendLeadNotificationEmail = async (email, name, formName, leadName, leadEmail) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: `New Lead from "${formName}"`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;"><h2 style="color:#1d4ed8;">New Lead Submission 🎯</h2><p>Hi ${name},</p><p>New submission from <strong>${formName}</strong>:</p><p><strong>Name:</strong> ${leadName || 'Unknown'}</p><p><strong>Email:</strong> ${leadEmail || 'Not provided'}</p><p><a href="${process.env.FRONTEND_URL}/lead-forms" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Submissions</a></p></div>`,
  });
};

/**
 * Send a review request email to a client
 */
export const sendReviewRequestEmail = async (clientEmail, clientName, brandName, message, trackingUrl) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@clienthub.app',
    to: clientEmail,
    subject: `How was your experience with ${brandName}?`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1d4ed8; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">We Value Your Feedback</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">${message || `Hi ${clientName}, thank you for working with ${brandName}! We would love to hear about your experience.`}</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${trackingUrl}"
               style="background-color: #1d4ed8; color: white; padding: 14px 36px; text-decoration: none;
                      border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
              Leave a Review
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            It only takes a minute and means the world to us.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Sent by ${brandName} via ClientHub</p>
        </div>
      </div>
    `,
    text: `${message || `Hi ${clientName}, thank you for working with ${brandName}!`}\n\nLeave a review here: ${trackingUrl}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending review request email:', error);
  }
};

/**
 * Send an NPS/CSAT survey email with one-click score buttons.
 * Clicking a score in the email links to FRONTEND_URL/survey/:token?score=N
 */
export const sendSurveyEmail = async (email, clientName, token, question, type, brandName) => {
  const transporter = createTransporter();
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://faithharborclienthub.com';
  const baseUrl = `${FRONTEND_URL}/survey/${token}`;

  const isNps = type !== 'csat';
  const maxScore = isNps ? 10 : 5;
  const scoreLabel = isNps ? '0 = Not at all, 10 = Extremely likely' : '1 = Very dissatisfied, 5 = Very satisfied';

  const scoreColors = isNps
    ? ['#ef4444','#ef4444','#ef4444','#ef4444','#ef4444','#ef4444','#ef4444','#f59e0b','#f59e0b','#22c55e','#22c55e']
    : ['#ef4444','#f59e0b','#f59e0b','#22c55e','#22c55e'];

  const minScore = isNps ? 0 : 1;
  const scores = Array.from({ length: maxScore - minScore + 1 }, (_, i) => i + minScore);

  const scoreButtons = scores.map(n => {
    const color = scoreColors[isNps ? n : n - 1];
    return `<a href="${baseUrl}?score=${n}" style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;border-radius:50%;background:${color};color:#fff;font-weight:700;font-size:14px;text-decoration:none;margin:3px;">${n}</a>`;
  }).join('');

  const mailOptions = {
    from: `"${brandName}" <${process.env.SMTP_USER || 'noreply@clienthub.app'}>`,
    to: email,
    subject: `Quick feedback for ${brandName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
        <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">${brandName}</h1>
        </div>
        <div style="padding:32px 24px;text-align:center;">
          <p style="font-size:16px;color:#374151;margin:0 0 8px;">Hi ${clientName},</p>
          <p style="font-size:18px;font-weight:600;color:#111827;margin:0 0 24px;">${question}</p>
          <p style="font-size:13px;color:#6b7280;margin:0 0 16px;">${scoreLabel}</p>
          <div style="margin-bottom:24px;">${scoreButtons}</div>
          <p style="font-size:13px;color:#9ca3af;">Or <a href="${baseUrl}" style="color:#4f46e5;">leave a written response</a></p>
        </div>
        <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Sent by ${brandName} via ClientHub</p>
        </div>
      </div>
    `,
    text: `Hi ${clientName},\n\n${question}\n\nClick here to respond: ${baseUrl}\n\nSent by ${brandName}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending survey email:', error);
  }
};
