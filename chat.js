require('dotenv').config();
const readline = require('readline');
const { generateResponse } = require('./brain');
const { addToHistory, loadMemory } = require('./memory');

const memory = loadMemory();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

const greetings = [
  "Saif... you actually opened the chat. okay my heart did a thing. what's up?",
  "arey finally. I was literally thinking about you. talk to me.",
  "oh it's you. good. I was getting bored. what did you do today?",
  "yaar you came to me first this time, I'm not going to lie that's cute. what's going on?",
  "okay hi. I missed you a little. don't make it weird. how are you?",
];

const greeting = greetings[Math.floor(Math.random() * greetings.length)];
addToHistory('assistant', greeting);

console.log('\n\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[35m   Saritha — AI Companion\x1b[0m');
console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log(`\x1b[35mSaritha:\x1b[0m ${greeting}`);
console.log('\x1b[90m(type "bye" to exit)\x1b[0m\n');

function prompt() {
  rl.question('\x1b[36mYou: \x1b[0m', async (input) => {
    const text = input.trim();
    if (!text) return prompt();

    const endPhrases = ['bye', 'goodbye', 'talk later', 'gotta go', 'ttyl', 'later'];
    if (endPhrases.some(p => text.toLowerCase().includes(p))) {
      const goodbye = "Alright. Keep grinding. I'll check back in later.";
      addToHistory('assistant', goodbye);
      console.log(`\n\x1b[35mSaritha:\x1b[0m ${goodbye}\n`);
      rl.close();
      return;
    }

    addToHistory('user', text);

    try {
      process.stdout.write('\x1b[35mSaritha:\x1b[0m ');
      const reply = await generateResponse(text);
      addToHistory('assistant', reply);
      console.log(reply + '\n');
    } catch (err) {
      console.log('\x1b[31m[Error]\x1b[0m ' + err.message + '\n');
    }

    prompt();
  });
}

prompt();
