# Orion — Autonomous AI Companion

> An AI agent that thinks, decides, and reaches out — just like a human would.

Orion is a fully autonomous AI companion that proactively calls and texts you based on context, time of day, and your goals. It doesn't wait to be prompted — it decides when to reach out, what to say, and how to follow up.

## Demo

**Live:** [saifnjit.github.io/orion/orion.html](https://saifnjit.github.io/orion/orion.html)

## How It Works

```
Every 20 minutes:
  Claude analyzes → time, last contact, goals, conversation history
  Decides → call / text / wait
  Acts → Twilio dials your number or sends WhatsApp
  Speaks → ElevenLabs TTS with a custom voice
  Listens → Twilio STT → Claude responds in real time
  Remembers → conversation stored in persistent memory
```

## Architecture

| Layer | Technology |
|-------|-----------|
| AI Brain | Claude (Anthropic) — decision making, conversation, memory |
| Voice | ElevenLabs — real-time TTS with custom voice |
| Telephony | Twilio — outbound calls, inbound calls, SMS/WhatsApp |
| Backend | Node.js + Express — deployed on Render |
| Frontend | React landing page + custom dashboard — deployed on GitHub Pages |
| Autonomy | node-cron — agent loop runs every 20 minutes |

## Features

- **Proactive calling** — Orion decides when to call based on your schedule and goals
- **Real-time voice conversation** — full back-and-forth dialogue on a phone call
- **Persistent memory** — remembers what you said yesterday, last week
- **Autonomous decision loop** — Claude evaluates context and chooses call / text / wait
- **Live dashboard** — Mind tab shows every decision Orion makes in real time
- **Inbound + outbound** — works both ways, call Orion or let it call you
- **SMS + WhatsApp** — text-based check-ins when a call isn't appropriate

## Conversation Intelligence

Orion tracks multiple areas of your life across calls:
- Job applications and interview progress
- Gym and fitness consistency  
- Diet and nutrition
- Content creation and posting
- Project completion

It rotates through topics naturally, pushes back when you're vague, and references previous conversations.

## Stack

```
Frontend:  React (Vite) + vanilla JS dashboard — GitHub Pages
Backend:   Express.js — Render
AI:        @anthropic-ai/sdk (Claude Haiku + Sonnet)
Voice:     ElevenLabs REST API
Calls:     Twilio Voice + TwiML
Messaging: Twilio SMS + WhatsApp
Scheduler: node-cron
Memory:    JSON-based persistent store
```

## Local Setup

```bash
git clone https://github.com/Saifnjit/orion
cd orion
npm install
```

Create a `.env` file:
```
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
YOUR_PHONE_NUMBER=
SERVER_URL=https://your-backend-url.com
```

```bash
node server.js   # Start backend
node agent.js    # Start autonomous agent loop
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Memory, goals, call history |
| GET | `/api/history` | Conversation history |
| POST | `/api/trigger/call` | Trigger a call with optional topic |
| POST | `/api/trigger/text` | Trigger a text with optional topic |
| POST | `/api/agent/check` | Run one cycle of the autonomous decision loop |
| POST | `/twiml/answer` | Twilio webhook — handles inbound/outbound calls |
| POST | `/twiml/respond` | Twilio webhook — handles speech responses |
| POST | `/sms/inbound` | Twilio webhook — handles inbound SMS/WhatsApp |

## Built By

Saif — AI Engineer
