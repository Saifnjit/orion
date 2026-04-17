require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, 'audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR);

async function generateAudio(text, personality = 'drill_sergeant') {
  // Try ElevenLabs first, fall back to UnrealSpeech
  let result = await generateElevenLabs(text);
  if (!result) {
    console.log('[Voice] ElevenLabs failed — trying UnrealSpeech...');
    result = await generateUnrealSpeech(text);
  }
  return result;
}

async function generateElevenLabs(text) {
  const voiceId = 'TagUgIrSxZiaLUIH4Ksk'; // Kratos voice
  const filename = `speech_${Date.now()}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);

  const body = JSON.stringify({
    text,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: {
      stability: 0.80,
      similarity_boost: 0.85,
      style: 0.05,
      use_speaker_boost: true,
    },
    speed: 0.90,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'audio/mpeg',
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', c => errBody += c);
        res.on('end', () => {
          console.error(`[Voice] ElevenLabs error ${res.statusCode}:`, errBody.substring(0, 100));
          resolve(null);
        });
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        fs.writeFileSync(filepath, Buffer.concat(chunks));
        console.log(`[Voice] ElevenLabs generated: ${filename}`);
        resolve(filename);
      });
    });

    req.setTimeout(10000, () => {
      console.error('[Voice] ElevenLabs timeout');
      req.destroy();
      resolve(null);
    });

    req.on('error', (err) => {
      console.error('[Voice] ElevenLabs error:', err.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

async function generateUnrealSpeech(text) {
  const filename = `speech_${Date.now()}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);

  const body = JSON.stringify({
    Text: text,
    VoiceId: 'Scarlett', // Natural female voice
    Bitrate: '192k',
    Speed: '0',
    Pitch: '1',
    OutputFormat: 'uri',
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.v7.unrealspeech.com',
      path: '/speech',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UNREALSPEECH_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const audioUrl = json.OutputUri;
          if (!audioUrl) {
            console.error('[Voice] UnrealSpeech no URL:', data.substring(0, 100));
            return resolve(null);
          }
          // Download the audio file
          https.get(audioUrl, (audioRes) => {
            const chunks = [];
            audioRes.on('data', chunk => chunks.push(chunk));
            audioRes.on('end', () => {
              fs.writeFileSync(filepath, Buffer.concat(chunks));
              console.log(`[Voice] UnrealSpeech generated: ${filename}`);
              resolve(filename);
            });
          }).on('error', (err) => {
            console.error('[Voice] UnrealSpeech download error:', err.message);
            resolve(null);
          });
        } catch (e) {
          console.error('[Voice] UnrealSpeech parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.setTimeout(15000, () => {
      console.error('[Voice] UnrealSpeech timeout');
      req.destroy();
      resolve(null);
    });

    req.on('error', (err) => {
      console.error('[Voice] UnrealSpeech error:', err.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

function cleanOldAudio() {
  const files = fs.readdirSync(AUDIO_DIR);
  const now = Date.now();
  files.forEach(f => {
    const fullPath = path.join(AUDIO_DIR, f);
    const stat = fs.statSync(fullPath);
    if (now - stat.mtimeMs > 60 * 60 * 1000) fs.unlinkSync(fullPath);
  });
}

module.exports = { generateAudio, cleanOldAudio, AUDIO_DIR };
