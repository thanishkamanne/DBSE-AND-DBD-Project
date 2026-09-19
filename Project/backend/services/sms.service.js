/**
 * Real SMS Service Integration using Twilio REST API
 * Zero fake delivery: accurately returns provider configured status and API results.
 */
export async function sendRealSms({ to, message, statusCallbackUrl = null }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      sent: false,
      providerConfigured: false,
      status: 'provider_not_configured',
      error: 'SMS provider is not configured. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required.',
    };
  }

  if (!to || typeof to !== 'string' || !to.trim()) {
    return {
      sent: false,
      providerConfigured: true,
      status: 'failed',
      error: 'Invalid or missing recipient phone number.',
    };
  }

  try {
    const cleanTo = to.trim();
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', cleanTo);
    params.append('From', fromNumber);
    params.append('Body', message);
    if (statusCallbackUrl) {
      params.append('StatusCallback', statusCallbackUrl);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        sent: false,
        providerConfigured: true,
        status: 'failed',
        error: data.message || `Twilio error code ${data.code}`,
        providerData: data,
      };
    }

    // Twilio returned success
    return {
      sent: true,
      providerConfigured: true,
      status: data.status === 'delivered' ? 'delivered' : 'sent',
      messageSid: data.sid,
      providerData: data,
    };
  } catch (err) {
    return {
      sent: false,
      providerConfigured: true,
      status: 'failed',
      error: err.message || 'Network error communicating with SMS provider gateway.',
    };
  }
}

export function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}
