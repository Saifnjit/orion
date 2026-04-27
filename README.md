# Orion — Autonomous AI Companion

## Real-World Results
- 43 autonomous calls completed
- 7-day streak maintained
- Zero human prompting required
- Persistent memory across all conversations
- Every decision logged with full reasoning


> It doesn't wait to be asked. It calls you.

Orion is an AI agent that proactively reaches out — by phone call or text — based on your goals, your history, and the current moment. No prompts, no buttons. It runs a continuous decision loop, checks context, and acts on its own.

**Live demo:** [saifnjit.github.io/orion/orion.html](https://saifnjit.github.io/orion/orion.html)

---

## Proactive Decision Engine

Every 20 minutes, Orion runs an autonomous loop:

```
Claude reads → full conversation history, goals, last contact time, time of day
Claude decides → call / text / wait  (with a reason logged for every decision)
Claude acts → Twilio dials your number or sends a WhatsApp message
```

It doesn't just fire on a schedule. It weighs context:
- Has too much time passed since last contact?
- Did you mention something yesterday that needs a follow-up?
- Is it an appropriate hour to call?
- What topic is most relevant right now?

Every decision — including "wait" — is logged in the Mind tab of the dashboard with the exact reasoning Claude used.

---

## Persistent Memory

Orion remembers across every call and text. The memory store holds:

- Full conversation history with timestamps
- Your stated goals (job search, gym, diet, content, projects)
- Mood and engagement patterns
- Call streaks and activity tracking

When Orion calls you, it already knows what you said three days ago. It references prior conversations naturally — "you mentioned your diet went sideways, did you fix that?" — without being asked. Memory persists across server restarts.

---

## How a Call Works

```
1. Orion decides to call (autonomous, no trigger needed)
2. Generates a context-aware opening script via Claude
3. Converts to voice via ElevenLabs (custom Kratos-style voice)
4. Twilio dials your number
5. You speak — Twilio STT transcribes in real time
6. Claude responds using full memory context
7. Conversation saved to memory for future reference
```

---

## Architecture

| Layer | Technology |
|-------|-----------|
| AI Brain | Claude (Anthropic) — decision making, conversation, memory |
| Voice | ElevenLabs — real-time TTS with custom voice |
| Telephony | Twilio — outbound calls, inbound calls, SMS/WhatsApp |
| Backend | Node.js + Express — deployed on Render |
| Frontend | Vanilla JS dashboard — deployed on GitHub Pages |
| Autonomy | node-cron — agent loop runs every 20 minutes inside server |

---

## Dashboard

The live dashboard exposes Orion's full internal state:

- **Stats** — total calls, current streak, last active
- **Goals** — editable in real time
- **Mind** — every autonomous decision with timestamp and reasoning
- **History** — full conversation log across all calls and texts
- **Controls** — manually trigger a call or text, run an agent check

---

## Stack

```
Backend:   Express.js — Render
AI:        @anthropic-ai/sdk (Claude Haiku + Sonnet)
Voice:     ElevenLabs REST API
Calls:     Twilio Voice + TwiML
Messaging: Twilio SMS + WhatsApp
Scheduler: node-cron
Memory:    JSON persistent store
Frontend:  Vanilla JS + HTML — GitHub Pages
```

---

## Local Setup

```bash
git clone https://github.com/Saifnjit/orion
cd orion
npm install
```

Copy `.env.example` to `.env` and fill in your keys:

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
node server.js   # starts server + autonomous agent loop
```

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Memory, goals, streaks, recent decisions |
| GET | `/api/history` | Full conversation history |
| POST | `/api/trigger/call` | Manually trigger a call |
| POST | `/api/trigger/text` | Manually trigger a text |
| POST | `/api/agent/check` | Run one cycle of the autonomous decision loop |
| POST | `/twiml/answer` | Twilio webhook — inbound/outbound call handler |
| POST | `/twiml/respond` | Twilio webhook — real-time speech response |
| POST | `/sms/inbound` | Twilio webhook — inbound SMS/WhatsApp |

---

Built by Saif — AI Engineer
