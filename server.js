require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const { generateResponse, generateCallScript } = require('./brain');
const { generateAudio, cleanOldAudio, AUDIO_DIR } = require('./voice');
const { addToHistory, loadMemory, updateLastCall, updateLastActive } = require('./memory');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Serve generated audio files
app.use('/audio', express.static(AUDIO_DIR));

const VoiceResponse = twilio.twiml.VoiceResponse;
const serverUrl = process.env.SERVER_URL || 'https://your-ngrok-url.ngrok.io';

// Called by agent.js to kick off a call
app.post('/call', async (req, res) => {
  const { script, topic } = req.body;
  const { makeCall } = require('./caller');
  try {
    const memory = loadMemory();
    console.log('[Server] Generating script + audio before dialing...');
    const finalScript = script || await generateCallScript(topic || 'check in');
    console.log('[Server] Script:', finalScript);
    const audioFile = await generateAudio(finalScript, memory.personality);
    console.log('[Server] Audio:', audioFile);
    global.pendingScript = finalScript;
    global.pendingAudio = audioFile || null;
    const callSid = await makeCall(finalScript);
    res.json({ success: true, callSid });
  } catch (err) {
    console.error('[Server] Call error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Handles both inbound and outbound calls
app.post('/twiml/answer', async (req, res) => {
  const twiml = new VoiceResponse();
  const memory = loadMemory();

  updateLastCall();

  let script, audioFile;

  if (global.pendingScript) {
    // Outbound — pre-generated audio ready
    console.log('[Server] Outbound call answered — using pre-generated audio');
    script = global.pendingScript;
    audioFile = global.pendingAudio;
    global.pendingScript = null;
    global.pendingAudio = null;
  } else {
    // Inbound — generate greeting on the fly (no Claude needed, just ElevenLabs)
    const callerNumber = req.body.From || 'unknown';
    const isOwner = callerNumber.replace(/\D/g, '').includes('19296981312');
    console.log(`[Server] Inbound call from ${callerNumber} — owner: ${isOwner}`);

    const ownerGreetings = [
      "Saif... you actually called me. okay my heart did a thing. what's up?",
      "arey finally. I was literally thinking about you. talk to me.",
      "oh it's you. good. I was getting bored. what did you do today?",
      "yaar you called me first this time, I'm not going to lie that's cute. what's going on?",
      "okay hi. I missed you a little. don't make it weird. how are you?",
    ];
    const strangerGreetings = [
      "Hey, you just called me. I'm curious — who is this?",
      "Hello? I don't think I have your number. Who is this?",
    ];

    const greetings = isOwner ? ownerGreetings : strangerGreetings;
    script = greetings[Math.floor(Math.random() * greetings.length)];
    audioFile = await generateAudio(script, memory.personality);
  }

  console.log('[Server] audioFile:', audioFile, '| script:', script);

  if (audioFile) {
    twiml.play(`${serverUrl}/audio/${audioFile}`);
  } else {
    twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, script);
  }

  twiml.gather({
    input: 'speech',
    action: `${serverUrl}/twiml/respond`,
    method: 'POST',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    language: 'en-US',
    timeout: 10,
  });

  twiml.hangup();
  res.type('text/xml');
  res.send(twiml.toString());
});

// Twilio sends user's speech here
app.post('/twiml/respond', async (req, res) => {
  const twiml = new VoiceResponse();

  try {
    const memory = loadMemory();
    const userSpeech = req.body.SpeechResult || '';

    console.log(`[Server] User said: "${userSpeech}"`);

    if (!userSpeech || userSpeech.trim() === '') {
      twiml.hangup();
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    addToHistory('user', userSpeech);
    updateLastActive();

    // Check if user wants to end the call
    const endPhrases = ['bye', 'goodbye', 'talk later', 'gotta go', 'ttyl', 'later'];
    if (endPhrases.some(p => userSpeech.toLowerCase().includes(p))) {
      const goodbye = "Alright. Keep grinding. I'll check back in later.";
      addToHistory('assistant', goodbye);
      const audioFile = await generateAudio(goodbye, memory.personality);
      if (audioFile) twiml.play(`${serverUrl}/audio/${audioFile}`);
      twiml.hangup();
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Generate Claude response
    const reply = await generateResponse(userSpeech);
    console.log(`[Server] AI replied: "${reply}"`);
    addToHistory('assistant', reply);

    const audioFile = await generateAudio(reply, memory.personality);

    if (!audioFile) {
      twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, reply);
    } else {
      twiml.play(`${serverUrl}/audio/${audioFile}`);
    }
    twiml.gather({
      input: 'speech',
      action: `${serverUrl}/twiml/respond`,
      method: 'POST',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      enhanced: true,
      language: 'en-US',
      timeout: 15,
    });

    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (err) {
    console.error('[Server] respond error:', err.message);
    twiml.gather({
      input: 'speech',
      action: `${serverUrl}/twiml/respond`,
      method: 'POST',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      enhanced: true,
      language: 'en-US',
      timeout: 15,
    });
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Inbound SMS + WhatsApp
app.post('/sms/inbound', async (req, res) => {
  const from = req.body.From || '';
  const userMessage = req.body.Body || '';
  const isOwner = from.replace(/\D/g, '').includes('19296981312');
  const isWhatsApp = from.startsWith('whatsapp:');

  console.log(`[SMS] From ${from}: "${userMessage}"`);

  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();

  if (!userMessage.trim()) {
    twiml.message("hey you texted me but said nothing... that's a vibe though");
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  if (isOwner) { addToHistory('user', userMessage); updateLastActive(); }
  const reply = await generateResponse(userMessage);
  if (isOwner) addToHistory('assistant', reply);

  console.log(`[SMS] Replying: "${reply}"`);
  twiml.message(reply);
  res.type('text/xml');
  res.send(twiml.toString());
});

// Call status updates from Twilio
app.post('/twiml/status', (req, res) => {
  console.log(`[Server] Call status: ${req.body.CallStatus} — SID: ${req.body.CallSid}`);
  cleanOldAudio();
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Server] AI Companion server running on port ${PORT}`);
  console.log(`[Server] Set SERVER_URL in .env to your ngrok URL`);
});

module.exports = app;
