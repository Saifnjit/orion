require('dotenv').config();
const twilio = require('twilio');
const { generateTextMessage } = require('./brain');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendText(topic) {
  const message = await generateTextMessage(topic);
  console.log(`[Text] Sending: "${message}"`);

  const result = await client.messages.create({
    to: `whatsapp:${process.env.YOUR_PHONE_NUMBER}`,
    from: `whatsapp:${process.env.WHATSAPP_NUMBER}`,
    body: message,
  });

  console.log(`[Text] Sent — SID: ${result.sid}`);
  return result.sid;
}

module.exports = { sendText };
