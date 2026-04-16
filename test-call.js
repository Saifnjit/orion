require('dotenv').config();
const twilio = require('twilio');
const { generateCallScript } = require('./brain');
const { generateAudio, AUDIO_DIR } = require('./voice');
const fs = require('fs');
const path = require('path');
const https = require('https');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function uploadFile(filePath, hostname, urlPath, fieldName, parseUrl) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Date.now();
    const parts = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: audio/mpeg\r\n\r\n`),
      fileData,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];
    const body = Buffer.concat(parts);
    const req = https.request({
      hostname, path: urlPath, method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length, 'User-Agent': 'Mozilla/5.0' },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { const url = parseUrl(data); url ? resolve(url) : reject(new Error('No URL: ' + data.substring(0, 100))); }
        catch (e) { reject(new Error('Parse error: ' + data.substring(0, 100))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function uploadToTransfer(filePath) {
  const services = [
    () => uploadFile(filePath, 'uguu.se', '/upload', 'files[]', d => JSON.parse(d)?.files?.[0]?.url),
    () => uploadFile(filePath, 'oshi.at', '/', 'f', d => d.trim().startsWith('http') ? d.trim() : null),
    () => uploadFile(filePath, 'tmpfiles.org', '/api/v1/upload', 'file', d => JSON.parse(d)?.data?.url),
  ];
  for (const service of services) {
    try {
      const url = await service();
      if (url) return url;
    } catch (e) {
      console.log(`[Upload] Service failed, trying next... (${e.message.substring(0, 50)})`);
    }
  }
  throw new Error('All upload services failed');
}

async function testCall() {
  console.log('Generating script...');
  const script = await generateCallScript('check in and push Saif on his goals');
  console.log(`Script: ${script}\n`);

  console.log('Generating ElevenLabs voice...');
  const audioFile = await generateAudio(script, 'drill_sergeant');

  let twiml;

  if (audioFile) {
    const filePath = path.join(AUDIO_DIR, audioFile);
    console.log('Uploading audio...');
    const publicUrl = await uploadToTransfer(filePath);
    console.log(`Audio URL: ${publicUrl}`);
    twiml = `<Response><Play>${publicUrl}</Play></Response>`;
  } else {
    console.log('ElevenLabs failed, falling back to Twilio TTS...');
    twiml = `<Response><Say voice="man" language="en-US">${script}</Say></Response>`;
  }

  console.log('Calling you now...');
  const call = await client.calls.create({
    to: process.env.YOUR_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER,
    twiml,
  });

  console.log(`Call SID: ${call.sid}`);
  console.log('Your phone should ring in ~10 seconds.');
}

testCall().catch(console.error);
