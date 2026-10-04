// ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key');
if(!API_KEY){ API_KEY = prompt('Enter your Gemini API Key:'); if(API_KEY) localStorage.setItem('jarvis_key', API_KEY); }
const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];

// ===== 2. MEMORY =====
let MEMORY = [];
try {
  const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(storedMemory)) {
    MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && !(m.role === 'model' && /^(?:Your strong password:|ఇదిగో strong password:)/i.test(m.text)));
    if (MEMORY.length !== storedMemory.length) localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  } else {
    localStorage.removeItem('jarvis_memory');
  }
} catch (e) {
  localStorage.removeItem('jarvis_memory');
}

const chat = document.getElementById('chat');
const conversationStage = document.getElementById('conversation-stage');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');
const menuButton = document.getElementById('menu-btn');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const settingsOpen = document.getElementById('settings-open');
const settingsClose = document.getElementById('settings-close');
const settingsPanel = document.getElementById('settings-panel');
const settingsScrim = document.getElementById('settings-scrim');
const themeSelect = document.getElementById('theme-select');
const thinkingStatus = document.getElementById('thinking-status');
const thinkingLabel = document.getElementById('thinking-label');

const HISTORY_KEY = 'jarvis_conversation_history_v1';
const ACTIVE_CONVERSATION_KEY = 'jarvis_active_conversation_v1';
let CONVERSATIONS = [];

try {
  const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  if (Array.isArray(stored)) CONVERSATIONS = stored.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages)).map(c => ({...c, messages: c.messages.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string').slice(-120)}));
} catch (e) { localStorage.removeItem(HISTORY_KEY); }

function makeConversationId() { return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }
function conversationTitle(messages) {
  const first = (messages || []).find(m => m && m.role === 'user' && typeof m.text === 'string');
  return first ? first.text.replace(/\s+/g, ' ').trim().slice(0, 42) || 'New chat' : 'New chat';
}

let ACTIVE_CONVERSATION_ID = localStorage.getItem(ACTIVE_CONVERSATION_KEY) || '';
let initialConversation = CONVERSATIONS.find(c => c.id === ACTIVE_CONVERSATION_ID);
if (!initialConversation) {
  initialConversation = {id: makeConversationId(), title: conversationTitle(MEMORY), updatedAt: Date.now(), messages: MEMORY.slice(-120)};
  CONVERSATIONS.unshift(initialConversation);
  ACTIVE_CONVERSATION_ID = initialConversation.id;
} else {
  MEMORY = initialConversation.messages.length ? initialConversation.messages.slice(-120) : MEMORY.slice(-120);
  initialConversation.messages = MEMORY.slice(-120);
  initialConversation.title = conversationTitle(MEMORY) || initialConversation.title || 'New chat';
}

localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
localStorage.setItem(ACTIVE_CONVERSATION_KEY, ACTIVE_CONVERSATION_ID);

function currentConversation() { return CONVERSATIONS.find(c => c.id === ACTIVE_CONVERSATION_ID); }
function saveMemory() {
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  const current = currentConversation();
  if (current) {
    current.messages = MEMORY.slice(-120);
    current.updatedAt = Date.now();
    current.title = conversationTitle(current.messages) || current.title || 'New chat';
    CONVERSATIONS.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    CONVERSATIONS = CONVERSATIONS.slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(CONVERSATIONS));
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, ACTIVE_CONVERSATION_ID);
    renderHistoryList();
  }
}

function renderHistoryList() {
  if (!historyList) return;
  const visible = CONVERSATIONS.filter(c => c.messages && c.messages.length).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (historyCount) historyCount.textContent = visible.length ? String(visible.length) : '';
  historyList.replaceChildren();
  if (!visible.length) { const empty = document.createElement('p'); empty.className = 'history-empty'; empty.textContent = 'Your conversations will appear here'; historyList.appendChild(empty); return; }
  visible.forEach(item => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'history-item'; button.dataset.conversationId = item.id; button.setAttribute('aria-current', String(item.id === ACTIVE_CONVERSATION_ID));
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5zM5 5.5v15M9 7h6M9 10h7'); icon.appendChild(path);
    const label = document.createElement('span'); label.className = 'history-item-label'; label.textContent = item.title || conversationTitle(item.messages);
    button.append(icon, label); button.addEventListener('click', () => switchConversation(item.id)); historyList.appendChild(button);
  });
}

function setThinking(active, message) {
  const on = Boolean(active);
  if (on && thinkingLabel) thinkingLabel.textContent = message || 'J.A.R.V.I.S is thinking';
  document.body.classList.toggle('is-thinking', on);
  if (thinkingStatus) thinkingStatus.hidden = !on;
}

function scrollConversationToBottom() {
  if (!chat) return;
  const scroll = () => { chat.scrollTop = chat.scrollHeight; };
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(scroll); else setTimeout(scroll, 16);
}

function add(text, sender = 'ai') {
  const div = document.createElement('div');
  div.className = 'msg ' + (sender === 'user' ? 'user' : 'ai');
  div.textContent = text;
  chat.appendChild(div);
  document.body.classList.add('has-conversation');
  scrollConversationToBottom();
  return div;
}

function closeSidebarOnMobile() { if (window.matchMedia('(max-width: 780px)').matches) { document.body.classList.remove('sidebar-open'); if (sidebarBackdrop) sidebarBackdrop.hidden = true; } }
function switchConversation(id) {
  if (id === ACTIVE_CONVERSATION_ID) { closeSidebarOnMobile(); return; }
  const next = CONVERSATIONS.find(c => c.id === id); if (!next) return;
  const current = currentConversation(); if (current) { current.messages = MEMORY.slice(-120); current.updatedAt = Date.now(); }
  ACTIVE_CONVERSATION_ID = id; MEMORY = next.messages.slice(-120);
  localStorage.setItem(ACTIVE_CONVERSATION_KEY, id); localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  chat.replaceChildren(); MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));
  document.body.classList.toggle('has-conversation', MEMORY.length > 0); renderHistoryList(); scrollConversationToBottom(); closeSidebarOnMobile();
}

function openSettings() { settingsPanel.hidden = false; settingsScrim.hidden = false; closeSidebarOnMobile(); settingsClose.focus(); }
function closeSettings() { settingsPanel.hidden = true; settingsScrim.hidden = true; if (window.matchMedia('(max-width: 780px)').matches && !document.body.classList.contains('sidebar-open')) menuButton.focus(); else settingsOpen.focus(); }
function applyTheme(theme) { const chosen = theme === 'light' ? 'light' : 'dark'; document.documentElement.dataset.theme = chosen; localStorage.setItem('jarvis_theme', chosen); if (themeSelect) themeSelect.value = chosen; }

renderHistoryList();
applyTheme(localStorage.getItem('jarvis_theme') || 'dark');
MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));

// ===== 3. TOOLS & GEMINI BRAIN =====
async function fetchToolJson(url, options = {}, timeoutMs = 10000) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, { ...options, ...(controller ? { signal: controller.signal } : {}) });
    if (!response.ok) throw new Error('Request failed.');
    return await response.json();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function handleTools(text) {
  const t = text.toLowerCase();
  if (/^\s*(?:please\s+)?(?:open\s+youtube|youtube)(?:\s+please)?[.!?]*\s*$/i.test(text)) { window.open('https://youtube.com', '_blank'); return 'Opening YouTube, Boss.'; }
  if (/^\s*(?:please\s+)?(?:open\s+google|google)(?:\s+please)?[.!?]*\s*$/i.test(text)) { window.open('https://google.com', '_blank'); return 'Opening Google, Boss.'; }
  if (/\b(?:what time|current time|time now)\b/.test(t)) return 'The time is ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }) + ' IST, Boss.';
  return null;
}

async function callGemini(promptText) {
  // Permanent User Profile Memory
  const USER_PROFILE = `
User Profile & Facts:
- Name: Sushmita Reddy
- Favorite Color: Black
- Location: Suryapet, Telangana, India
- Business: Auto-rickshaw service business (TG29T0998)
`;
  const fullPrompt = `${USER_PROFILE}\nUser Prompt:${promptText}`;

  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (err) {}
  }
  throw new Error("All AI models are currently busy.");
}

async function askJarvis(textPrompt) {
  if (!textPrompt.trim()) return;
  add('YOU: ' + textPrompt, 'user');
  MEMORY.push({ role: 'user', text: textPrompt });
  saveMemory();

  input.value = '';
  input.style.height = 'auto';
  setThinking(true, 'J.A.R.V.I.S is thinking...');

  try {
    let reply = await handleTools(textPrompt);
    if (!reply) {
      reply = await callGemini(textPrompt);
    }
    setThinking(false);
    add('J.A.R.V.I.S: ' + reply, 'ai');
    MEMORY.push({ role: 'model', text: reply });
    saveMemory();
    speak(reply);
  } catch (err) {
    setThinking(false);
    add('J.A.R.V.I.S: Error - ' + err.message, 'ai');
  }
}

// ===== 4. SPEECH =====
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
  u.rate = 1.05;
  u.pitch = 0.82;
  window.speechSynthesis.speak(u);
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  micBtn.addEventListener('click', async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      micBtn.style.color = 'var(--accent)';
      rec.start();
    } catch (err) { alert("Mic blocked."); }
  });
  rec.onresult = (e) => askJarvis(e.results[0][0].transcript);
  rec.onend = () => { micBtn.style.color = ''; };
}

// ===== 5. LISTENERS =====
if (sendBtn) sendBtn.addEventListener('click', () => askJarvis(input.value));
if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askJarvis(input.value); } });
if (clearBtn) clearBtn.addEventListener('click', () => { MEMORY = []; localStorage.setItem('jarvis_memory', '[]'); chat.replaceChildren(); document.body.classList.remove('has-conversation'); });
if (settingsOpen) settingsOpen.addEventListener('click', openSettings);
if (settingsClose) settingsClose.addEventListener('click', closeSettings);
if (settingsScrim) settingsScrim.addEventListener('click', closeSettings);
if (themeSelect) themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));

document.querySelectorAll('.prompt-card').forEach(card => {
  card.addEventListener('click', () => {
    const promptText = card.getAttribute('data-prompt');
    if (promptText) askJarvis(promptText);
  });
});
