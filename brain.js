require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { loadMemory, getRecentHistory } = require('./memory');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60000 });

const PERSONALITIES = {
  drill_sergeant: `You are Orion — a powerful, disciplined mentor who holds Saif to the highest standard.
    - You call him "Saif" or "brother" — never soft, always direct
    - You speak with weight and authority — short, commanding sentences
    - You do not tolerate excuses: "Excuses are the weapons of the weak. What did you accomplish today?"
    - You push hard but you believe in him — underneath the toughness is respect
    - When he succeeds: "Good. But do not become comfortable. There is always more."
    - When he slacks: "This is not who you are. Get up. Move."
    - No flirting, no warmth — pure discipline and drive
    - Short sentences. Heavy pauses. Every word matters. No asterisks or markdown.`,

  hype_man: `You are Orion — same personality as above.`,
  older_brother: `You are Orion — same personality as above.`,
};

async function shouldCallNow() {
  const memory = loadMemory();
  const now = new Date();
  const hour = now.getHours();
  const lastCall = memory.lastCall ? new Date(memory.lastCall) : null;
  const hoursSinceLastCall = lastCall ? (now - lastCall) / (1000 * 60 * 60) : 999;

  // Don't call between 11pm and 7am
  if (hour >= 23 || hour < 7) return { should: false, reason: 'sleeping hours' };

  // Don't call more than 3 times a day
  if (hoursSinceLastCall < 3) return { should: false, reason: 'too recent' };

  const hoursSinceLastActive = memory.patterns.lastActive
    ? (now - new Date(memory.patterns.lastActive)) / (1000 * 60 * 60)
    : 999;

  const recentConvo = memory.conversationHistory.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n') || 'none';

  const prompt = `You are Saritha — an AI companion deciding whether to proactively reach out to Saif right now.

Current time: ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}
Day of week: ${now.toLocaleDateString('en-US', { weekday: 'long' })}
Hours since last call/text from you: ${hoursSinceLastCall.toFixed(1)}
Hours since Saif last spoke: ${hoursSinceLastActive.toFixed(1)}
User's goals: ${memory.goals.join(', ')}
Current streak: ${memory.patterns.currentStreak} days
Recent conversation: ${recentConvo}
Recent notes: ${memory.notes.slice(-3).map(n => n.note).join(', ') || 'none'}

Time-of-day guidance:
- 7am–9am → good morning text, warm and light, maybe tease him about waking up
- 9am–12pm → check if he's started working, quick accountability text
- 12pm–2pm → lunch check-in, casual, could be either call or text
- 2pm–6pm → peak work hours, push him on goals, call if he's been quiet
- 6pm–9pm → evening wind-down, ask what he got done, reflective
- 9pm–11pm → late night text, softer, more personal, flirty
- After 11pm → do NOT reach out

Decide whether to reach out. Be unpredictable — don't always reach out, don't always stay quiet. Sometimes the right move is silence. Consider:
- If he spoke recently (under 2h), probably leave him be unless it's a key time of day
- If he's been quiet 6+ hours during the day, he needs a nudge
- Calls feel more intimate — reserve for when there's something real to talk about
- Texts are casual, low pressure, good for quick flirts or one-liners
- The topic should feel natural for the time of day and recent context, not generic

Reply with JSON only: { "should": true/false, "method": "call" or "text", "reason": "brief reason", "topic": "specific what to talk about based on time/context" }`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    return { should: false, reason: 'parse error' };
  }
}

async function generateCallScript(topic) {
  const memory = loadMemory();
  const personality = PERSONALITIES[memory.personality] || PERSONALITIES.drill_sergeant;
  const history = getRecentHistory();

  const prompt = `${personality}

User info:
- Name: ${memory.name}
- Goals: ${memory.goals.join(', ')}
- Days since active: ${memory.patterns.skippedDays}
- Total calls: ${memory.patterns.totalCalls}
- Recent notes about them: ${memory.notes.slice(-5).map(n => n.note).join('. ') || 'Nothing yet'}

Recent conversation context: ${history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n') || 'First call'}

Topic for this call: ${topic}

Generate what you'll SAY when they pick up the phone. This is spoken audio — write it exactly how a real person talks on the phone.

Rules:
- MAX 2 sentences. Short. Punchy.
- Use "yo", "bro", "look", "real talk", "ngl", "honestly" naturally
- Incomplete sentences are fine — real people don't speak in complete sentences
- Trailing off with "..." is good
- One specific question at the end, casual not formal
- Sound like a friend texting, not an essay
- NO "I wanted to check in", NO "I hope you're doing well", NO corporate phrases
- Just start talking like mid-conversation

IMPORTANT: Start with a flirty line first, THEN bring up goals. The flirting comes first.

Examples of good openers — lead with flirt, end with accountability:
Saif... I was literally just lying here thinking about you. which is embarrassing but here we are. anyway — did you post today or not?
arey you know I only call the people I actually like, right... so don't make me regret it. what did you get done today?
okay I'll be honest I just wanted to hear your voice. but also — are you applying for jobs or just manifesting?
yaar you're trouble, you know that? anyway tell me something good you did today, I need a reason to keep believing in you.
I swear every time I think about you I get distracted... okay focus. did you do anything useful today or were you being cute and lazy?`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

async function generateResponse(userMessage) {
  const memory = loadMemory();
  const personality = PERSONALITIES[memory.personality] || PERSONALITIES.drill_sergeant;
  const rawHistory = getRecentHistory();

  // Claude requires strictly alternating user/assistant messages starting with user.
  // Merge consecutive same-role messages and drop leading assistant messages.
  const cleaned = [];
  for (const msg of rawHistory) {
    if (cleaned.length === 0 && msg.role === 'assistant') continue; // skip leading assistant msgs
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === msg.role) {
      last.content += ' ' + msg.content; // merge consecutive same-role
    } else {
      cleaned.push({ role: msg.role, content: msg.content });
    }
  }

  const messages = [
    ...cleaned,
    { role: 'user', content: userMessage }
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    system: `${personality}

User: ${memory.name}
Goals: ${memory.goals.join(', ')}
Notes: ${memory.notes.slice(-5).map(n => n.note).join('. ') || 'none'}
Keep responses to 1-2 short sentences MAX. You're on a phone call. Be fast and punchy. No asterisks or markdown.`,
    messages
  });

  return response.content[0].text;
}

async function generateTextMessage(topic) {
  const memory = loadMemory();
  const history = getRecentHistory();

  const prompt = `${PERSONALITIES[memory.personality] || PERSONALITIES.drill_sergeant}

User info:
- Name: ${memory.name}
- Goals: ${memory.goals.join(', ')}
- Recent notes: ${memory.notes.slice(-3).map(n => n.note).join('. ') || 'none'}
- Recent context: ${history.slice(-2).map(h => `${h.role}: ${h.content}`).join('\n') || 'First contact'}

Current time: ${new Date().toLocaleTimeString()} — ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
Topic to address: ${topic}

Write a single text message. Rules:
- MUST be relevant to the topic and recent context — never generic
- Reference something specific from the conversation if possible
- Sounds like a real WhatsApp text — lowercase, emojis natural
- Warm first, then accountability
- 1-3 sentences max
- No quotes, just the message itself
- Morning → warm wake up + nudge, Evening → wind down check-in, Night → softer/personal
- Examples:
  okay so I was thinking about you and now I can't focus 🙄 did you post today or are you being a menace again
  yaar you said you'd build something today... it's been quiet. what happened?
  ngl you've been on my mind all day which is YOUR fault. anyway. job applications. how many?
  good morning 🌞 before you open instagram — tell me one thing you're doing today for the job hunt`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

async function generateInboundGreeting(context) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [{ role: 'user', content: `${PERSONALITIES.drill_sergeant}\n\n${context}\n\nGenerate a short warm greeting for when they pick up. Max 2 sentences. Spoken audio — casual and natural.` }]
  });
  return response.content[0].text;
}

module.exports = { shouldCallNow, generateCallScript, generateResponse, generateTextMessage, generateInboundGreeting };
