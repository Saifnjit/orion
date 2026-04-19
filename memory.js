const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, 'memory.json');

function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    const defaultMemory = {
      name: 'Saif',
      personality: 'drill_sergeant',
      goals: ['get hired as AI engineer', 'post content daily', 'finish projects'],
      lastCall: null,
      lastCheckIn: null,
      conversationHistory: [],
      patterns: {
        skippedDays: 0,
        lastActive: new Date().toISOString(),
        totalCalls: 0,
        longestStreak: 0,
        currentStreak: 0
      },
      mood: 'neutral',
      notes: []
    };
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(defaultMemory, null, 2));
    return defaultMemory;
  }
  return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

function addToHistory(role, content) {
  const memory = loadMemory();
  memory.conversationHistory.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
  // Keep last 20 messages
  if (memory.conversationHistory.length > 20) {
    memory.conversationHistory = memory.conversationHistory.slice(-20);
  }
  saveMemory(memory);
}

function getRecentHistory() {
  const memory = loadMemory();
  return memory.conversationHistory.slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));
}

function updateLastCall() {
  const memory = loadMemory();
  memory.lastCall = new Date().toISOString();
  memory.patterns.totalCalls++;
  saveMemory(memory);
}

function addNote(note) {
  const memory = loadMemory();
  memory.notes.push({ note, timestamp: new Date().toISOString() });
  saveMemory(memory);
}

function updateLastActive() {
  const memory = loadMemory();
  memory.patterns.lastActive = new Date().toISOString();
  saveMemory(memory);
}

module.exports = { loadMemory, saveMemory, addToHistory, getRecentHistory, updateLastCall, updateLastActive, addNote };
