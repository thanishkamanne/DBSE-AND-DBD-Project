/**
 * Real Email Service Integration
 * Uses SMTP (nodemailer if configured) or REST API (Resend / SendGrid).
 * If no provider is configured, returns honest unconfigured status.
 */
export async function sendRealEmail({ to, subject, text, html }) {
  const smtpHost = process.env.SMTP_HOST;
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;

  if (!smtpHost && !resendApiKey && !sendgridApiKey) {
    return {
      sent: false,
      providerConfigured: false,
      status: 'provider_not_configured',
      error: 'Email verification service is not configured. SMTP_HOST or RESEND_API_KEY is required.',
    };
  }

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return {
      sent: false,
      providerConfigured: true,
      status: 'failed',
      error: 'Invalid or missing recipient email address.',
    };
  }

  // Resend integration
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'alerts@resend.dev';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to.trim()],
          subject: subject || 'Women Safety Alert Verification',
          text: text || '',
          html: html || `<p>${text || ''}</p>`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          sent: false,
          providerConfigured: true,
          status: 'failed',
          error: data.message || 'Resend provider error',
        };
      }

      return {
        sent: true,
        providerConfigured: true,
        status: 'sent',
        messageId: data.id,
      };
    } catch (err) {
      return {
        sent: false,
        providerConfigured: true,
        status: 'failed',
        error: err.message || 'Network error communicating with email provider.',
      };
    }
  }

  // SendGrid integration
  if (sendgridApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'no-reply@womensafety.app';
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to.trim() }] }],
          from: { email: fromEmail },
          subject: subject || 'Women Safety Alert Verification',
          content: [{ type: 'text/plain', value: text || '' }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          sent: false,
          providerConfigured: true,
          status: 'failed',
          error: errorText || 'SendGrid provider error',
        };
      }

      return {
        sent: true,
        providerConfigured: true,
        status: 'sent',
      };
    } catch (err) {
      return {
        sent: false,
        providerConfigured: true,
        status: 'failed',
        error: err.message || 'Network error communicating with SendGrid.',
      };
    }
  }

  return {
    sent: false,
    providerConfigured: false,
    status: 'provider_not_configured',
    error: 'Email verification service is not configured.',
  };
}

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST ||
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY
  );
}
