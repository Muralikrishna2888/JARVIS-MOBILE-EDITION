// ===== 1. API KEY & MODELS =====
let API_KEY = localStorage.getItem('jarvis_key');
if(!API_KEY){ 
  API_KEY = prompt('Enter your Gemini API Key:'); 
  if(API_KEY) localStorage.setItem('jarvis_key', API_KEY); 
}
const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];

// Initialize Orbs Arc Reactor Animation Safely
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('jarvis-core-container');
  if (container && typeof Orbs !== 'undefined') {
    try {
      new Orbs(container, { count: 3, speed: 1.2, color: '#00ffff' });
    } catch (e) {}
  }
});

// ===== 2. ADVANCED MEMORY & CONVERSATION HISTORY =====
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
  if (Array.isArray(stored)) {
    CONVERSATIONS = stored.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages)).map(c => ({
      ...c, 
      messages: c.messages.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string').slice(-120)
    }));
  }
} catch (e) { localStorage.removeItem(HISTORY_KEY); }

function makeConversationId() { return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }
function conversationTitle(messages) {
  const first = (messages || []).find(m => m && m.role === 'user' && typeof m.text === 'string');
  return first ? first.text.replace(/\s+/g, ' ').trim().slice(0, 42) || 'New protocol' : 'New protocol';
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
  initialConversation.title = conversationTitle(MEMORY) || initialConversation.title || 'New protocol';
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
    current.title = conversationTitle(current.messages) || current.title || 'New protocol';
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
  if (!visible.length) { 
    const empty = document.createElement('p'); 
    empty.className = 'history-empty'; 
    empty.textContent = 'No past protocols recorded'; 
    historyList.appendChild(empty); 
    return; 
  }
  visible.forEach(item => {
    const button = document.createElement('button'); 
    button.type = 'button'; 
    button.className = 'history-item'; 
    button.dataset.conversationId = item.id; 
    button.setAttribute('aria-current', String(item.id === ACTIVE_CONVERSATION_ID));
    const label = document.createElement('span'); 
    label.className = 'history-item-label'; 
    label.textContent = item.title || conversationTitle(item.messages);
    button.append(label); 
    button.addEventListener('click', () => switchConversation(item.id)); 
    historyList.appendChild(button);
  });
}

function setThinking(active, message) {
  const on = Boolean(active);
  if (on && thinkingLabel) thinkingLabel.textContent = message || 'J.A.R.V.I.S is analyzing directive';
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

function closeSidebarOnMobile() { 
  if (window.matchMedia('(max-width: 780px)').matches) { 
    document.body.classList.remove('sidebar-open'); 
    if (sidebarBackdrop) sidebarBackdrop.hidden = true; 
  } 
}

function switchConversation(id) {
  if (id === ACTIVE_CONVERSATION_ID) { closeSidebarOnMobile(); return; }
  const next = CONVERSATIONS.find(c => c.id === id); if (!next) return;
  const current = currentConversation(); if (current) { current.messages = MEMORY.slice(-120); current.updatedAt = Date.now(); }
  ACTIVE_CONVERSATION_ID = id; MEMORY = next.messages.slice(-120);
  localStorage.setItem(ACTIVE_CONVERSATION_KEY, id); localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  chat.replaceChildren(); 
  MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));
  document.body.classList.toggle('has-conversation', MEMORY.length > 0); 
  renderHistoryList(); 
  scrollConversationToBottom(); 
  closeSidebarOnMobile();
}

function applyTheme(theme) { 
  const chosen = theme === 'light' ? 'light' : 'dark'; 
  document.documentElement.dataset.theme = chosen; 
  localStorage.setItem('jarvis_theme', chosen); 
  if (themeSelect) themeSelect.value = chosen; 
}

renderHistoryList();
applyTheme(localStorage.getItem('jarvis_theme') || 'dark');
MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));

// ===== 3. UNIVERSAL COMMAND PARSER & EXECUTOR =====
async function handleTools(text) {
  const t = text.toLowerCase();
  
  // 1. DIRECT APP & CAMERA PROTOCOLS
  if (t.includes('play it') || t.includes('playit')) {
    window.open('playit://', '_blank');
    return 'Launching Play It app, Boss.';
  }
  if (t.includes('camera') || t.includes('photo') || t.includes('snapshot')) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      let videoModal = document.getElementById('jarvis-camera-feed');
      if (!videoModal) {
        videoModal = document.createElement('video');
        videoModal.id = 'jarvis-camera-feed';
        videoModal.autoplay = true;
        videoModal.playsInline = true;
        videoModal.style.cssText = 'position:fixed; bottom:90px; right:20px; width:220px; height:160px; border-radius:14px; border:2px solid var(--accent); z-index:9999; background:#000; box-shadow:0 10px 30px rgba(0,0,0,0.5);';
        document.body.appendChild(videoModal);

        videoModal.addEventListener('click', () => {
          stream.getTracks().forEach(track => track.stop());
          videoModal.remove();
        });
      }
      videoModal.srcObject = stream;
      return 'Visual optical sensors online. Live feed active, Boss. (Tap video feed to close)';
    } catch (err) {
      window.open('content://media/internal/images/media', '_blank');
      return 'Camera hardware permission restricted by browser sandbox. Launching system image directory instead, Boss.';
    }
  }

  // 2. UNIVERSAL LAUNCH & SEARCH ENGINE (Handles "open X", "search for X", "go to X")
  if (t.startsWith('open ') || t.startsWith('launch ') || t.startsWith('start ')) {
    const target = text.replace(/^(?:please\s+)?(?:open|launch|start)\s+/i, '').trim();
    if (target) {
      // If it looks like a known app scheme
      if (['whatsapp', 'instagram', 'telegram', 'spotify'].includes(target)) {
        window.open(`${target}://`, '_blank');
        return `Launching ${target}, Boss.`;
      }
      if (target === 'youtube') {
        window.open('https://youtube.com', '_blank', 'noopener,noreferrer');
        return 'Opening YouTube interface, Boss.';
      }
      // Otherwise search/open as a web resource or platform
      window.open(`https://www.google.com/search?q=${encodeURIComponent(target)}`, '_blank', 'noopener,noreferrer');
      return `Executing launch sequence for ${target}, Boss.`;
    }
  }

  // 3. UNIVERSAL MEDIA ENGINE (Automatically distinguishes videos, trailers, and music)
  if (t.startsWith('play ') || t.startsWith('watch ')) {
    const mediaQuery = text.replace(/^(?:please\s+)?(?:can you\s+)?(?:play|watch)\s+/i, '').trim();
    
    // Check if it's a video, movie, trailer, or show -> Route to YouTube Videos
    if (t.includes('trailer') || t.includes('video') || t.includes('movie') || t.includes('clip') || t.includes('episode') || t.includes('teaser')) {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(mediaQuery)}`, '_blank', 'noopener,noreferrer');
      return `Accessing visual feed for: ${mediaQuery}, Boss.`;
    }
    
    // Otherwise, treat as an audio track -> Route to YouTube Music
    window.open(`https://music.youtube.com/search?q=${encodeURIComponent(mediaQuery)}`, '_blank', 'noopener,noreferrer');
    return `Engaging audio stream for: ${mediaQuery}, Boss.`;
  }

  // 4. UNIVERSAL WEB SEARCH (Handles "search for X", "look up X", "find X")
  if (t.startsWith('search ') || t.startsWith('look up ') || t.startsWith('find ')) {
    const searchQuery = text.replace(/^(?:please\s+)?(?:search for|search|look up|find)\s+/i, '').trim();
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank', 'noopener,noreferrer');
    return `Querying global network for: ${searchQuery}, Boss.`;
  }

  // 5. SYSTEM UTILITIES
  if (/\b(?:what time|current time|time now)\b/.test(t)) {
    return 'The current time is ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }) + ' IST, Boss.';
  }
  if (t.includes('diagnostic') || t.includes('status')) {
    return 'All core protocols online. User Eshwar authenticated. Systems operating at peak efficiency, Boss.';
  }
  if (t.includes('joke')) {
    return 'Why do programmers prefer dark mode? Because light attracts bugs, Boss.';
  }
  
  return null; // If no shortcut matches, it flows seamlessly into the advanced Gemini brain!
        }


// ===== 4. ADVANCED CINEMATIC BRAIN (FULL CONVERSATION MEMORY INJECTED) =====
async function callGemini(promptText) {
  const JARVIS_PERSONA = `
You are J.A.R.V.I.S (Just A Rather Very Intelligent System), an elite cinematic AI assistant built for your Boss.
Tone & Persona: Formal, hyper-intelligent, respectful, obedient, and concise. Always address the user as "Boss". Never use emojis.
User Profile & Facts:
- Primary User / Boss: Eshwar
- Favorite Color: Black
- Base Location: Suryapet, Telangana, India
- Family Network: Father: Muralikrishna, Mother: Saritha, Brother: Yashwanth
- Family Enterprise: Auto-rickshaw service business managed by father Muralikrishna, Vehicle ID: TG29T0998
`;

  // Build the message contents array using the rolling conversation history (MEMORY)
  const contents = [];
  
  // Inject persona into the system instruction / first user prompt context
  contents.push({
    role: "user",
    parts: [{ text: JARVIS_PERSONA + "\nAcknowledge these parameters, Boss." }]
  });
  contents.push({
    role: "model",
    parts: [{ text: "Parameters acknowledged. Systems online and ready, Boss." }]
  });

  // Append recent conversation memory so J.A.R.V.I.S remembers past context
  const recentHistory = MEMORY.slice(-10); // Keep last 10 turns for context window efficiency
  for (const m of recentHistory) {
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    });
  }

  // Add the current prompt if not already last
  if (recentHistory[recentHistory.length - 1]?.text !== promptText) {
    contents.push({
      role: "user",
      parts: [{ text: promptText }]
    });
  }

  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contents })
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (err) {}
  }
  throw new Error("Neural link unstable. All AI models busy.");
}


async function askJarvis(textPrompt) {
  if (!textPrompt.trim()) return;
  add('YOU: ' + textPrompt, 'user');
  MEMORY.push({ role: 'user', text: textPrompt });
  saveMemory();

  input.value = '';
  input.style.height = 'auto';
  setThinking(true, 'J.A.R.V.I.S is analyzing directive...');
  
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
    add('J.A.R.V.I.S: Protocol Error - ' + err.message, 'ai');
  }
}

// ===== 5. CLEAN SPEECH SYNTHESIS (EMOJI/SYMBOL FILTER) =====
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  const cleanText = text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .replace(/[*_#`]/g, '')
    .trim();

  const u = new SpeechSynthesisUtterance(cleanText);
  u.rate = 1.05;
  u.pitch = 0.82;
  window.speechSynthesis.speak(u);
}

// ===== 6. VOICE RECOGNITION (MOBILE OPTIMIZED) =====
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.continuous = false;
  rec.interimResults = false;

  micBtn.addEventListener('click', async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      micBtn.style.color = 'var(--accent)';
      rec.start();
    } catch (err) { 
      alert("Microphone hardware access blocked: " + err.message); 
    }
  });

  rec.onresult = (e) => {
    const speechText = e.results[0][0].transcript;
    if (speechText) {
      askJarvis(speechText);
    }
  };

  rec.onerror = (event) => {
    micBtn.style.color = '';
  };

  rec.onend = () => { 
    micBtn.style.color = ''; 
  };
}


// ===== 7. EVENT LISTENERS & CONTROLS =====
if (sendBtn) sendBtn.addEventListener('click', () => askJarvis(input.value));
if (input) {
  input.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      askJarvis(input.value); 
    } 
  });
}
if (clearBtn) {
  clearBtn.addEventListener('click', () => { 
    MEMORY = []; 
    localStorage.setItem('jarvis_memory', '[]'); 
    chat.replaceChildren(); 
    document.body.classList.remove('has-conversation'); 
  });
}

document.querySelectorAll('.prompt-card').forEach(card => {
  card.addEventListener('click', () => { 
    const p = card.getAttribute('data-prompt'); 
    if (p) askJarvis(p); 
  });
});
    
