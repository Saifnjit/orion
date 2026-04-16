require('dotenv').config();
const cron = require('node-cron');
const { shouldCallNow } = require('./brain');
const { sendText } = require('./text');

// POST to the server's /call endpoint so global.pendingScript is set
// in the same process that handles the Twilio webhook
function triggerCall(topic) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ topic });
    const port = process.env.PORT || 3001;
    const req = require('http').request({
      hostname: 'localhost',
      port,
      path: '/call',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { const json = JSON.parse(data); console.log(`[Agent] Call triggered — SID: ${json.callSid}`); }
        catch { console.log('[Agent] Call triggered'); }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

console.log('[Agent] Saritha is running...');
console.log('[Agent] Checking every 30 minutes whether to reach out...');

async function checkAndReach() {
  console.log(`\n[Agent] ${new Date().toLocaleTimeString()} — checking...`);

  try {
    const decision = await shouldCallNow();
    console.log(`[Agent] Decision:`, decision);

    if (!decision.should) {
      console.log(`[Agent] Not reaching out — ${decision.reason}`);
      return;
    }

    if (decision.method === 'text') {
      console.log(`[Agent] Texting because: ${decision.reason}`);
      await sendText(decision.topic);
    } else {
      console.log(`[Agent] Calling because: ${decision.reason}`);
      await triggerCall(decision.topic);
    }
  } catch (err) {
    console.error('[Agent] Error:', err.message);
  }
}

// Check every 20 minutes but add random jitter (±10 min) so it's not predictable
cron.schedule('*/20 * * * *', () => {
  const jitter = Math.floor(Math.random() * 10 * 60 * 1000); // 0–10 min in ms
  setTimeout(checkAndReach, jitter);
});

// Run once on startup after a short random delay
setTimeout(checkAndReach, Math.floor(Math.random() * 2 * 60 * 1000));
