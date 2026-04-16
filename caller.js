require('dotenv').config();
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function makeCall(script) {
  const serverUrl = process.env.SERVER_URL || 'https://your-ngrok-url.ngrok.io';

  console.log(`[Caller] Initiating call to ${process.env.YOUR_PHONE_NUMBER}`);
  console.log(`[Caller] Script: ${script}`);

  // Store script temporarily so the webhook can retrieve it
  global.pendingScript = script;

  const call = await twilioClient.calls.create({
    to: process.env.YOUR_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `${serverUrl}/twiml/answer`,
    statusCallback: `${serverUrl}/twiml/status`,
    statusCallbackMethod: 'POST',
  });

  console.log(`[Caller] Call SID: ${call.sid}`);
  return call.sid;
}

module.exports = { makeCall };
