// ===== 1. MEMORY & CONVERSATION STORAGE SETUP =====
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
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');
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
      messages: c.messages.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
    }));
  }
} catch (e) {
  localStorage.removeItem(HISTORY_KEY);
}

function makeConversationId() {
  return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function conversationTitle(messages) {
  const first = (messages || []).find(m => m && m.role === 'user' && typeof m.text === 'string');
  return first ? (first.text.replace(/\s+/g, ' ').trim().slice(0, 42) || 'New chat') : 'New chat';
}

let ACTIVE_CONVERSATION_ID = localStorage.getItem(ACTIVE_CONVERSATION_KEY) || '';
let initialConversation = CONVERSATIONS.find(c => c.id === ACTIVE_CONVERSATION_ID);
if (!initialConversation) {
  initialConversation = {
    id: makeConversationId(),
    title: conversationTitle(MEMORY),
    updatedAt: Date.now(),
    messages: MEMORY.slice(-120)
  };
  CONVERSATIONS.unshift(initialConversation);
  ACTIVE_CONVERSATION_ID = initialConversation.id;
} else {
  MEMORY = initialConversation.messages.length ? initialConversation.messages.slice(-120) : MEMORY.slice(-120);
  initialConversation.messages = MEMORY.slice(-120);
  initialConversation.title = conversationTitle(MEMORY) || initialConversation.title || 'New chat';
}
localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
localStorage.setItem(ACTIVE_CONVERSATION_KEY, ACTIVE_CONVERSATION_ID);

function currentConversation() {
  return CONVERSATIONS.find(c => c.id === ACTIVE_CONVERSATION_ID);
}

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
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'Your conversations will appear here';
    historyList.appendChild(empty);
    return;
  }

  visible.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    button.dataset.conversationId = item.id;
    button.setAttribute('aria-current', String(item.id === ACTIVE_CONVERSATION_ID));

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5zM5 5.5v15M9 7h6M9 10h7');
    icon.appendChild(path);

    const label = document.createElement('span');
    label.className = 'history-item-label';
    label.textContent = item.title || conversationTitle(item.messages);

    button.append(icon, label);
    button.addEventListener('click', () => switchConversation(item.id));
    historyList.appendChild(button);
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
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(scroll);
  else setTimeout(scroll, 16);
}

function closeSidebarOnMobile() {
  if (window.matchMedia('(max-width: 780px)').matches) {
    document.body.classList.remove('sidebar-open');
  }
}

function switchConversation(id) {
  if (id === ACTIVE_CONVERSATION_ID) {
    closeSidebarOnMobile();
    return;
  }
  const next = CONVERSATIONS.find(c => c.id === id);
  if (!next) return;
  const current = currentConversation();
  if (current) {
    current.messages = MEMORY.slice(-120);
    current.updatedAt = Date.now();
  }
  ACTIVE_CONVERSATION_ID = id;
  MEMORY = next.messages.slice(-120);
  localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  chat.replaceChildren();
  renderHistoryList();
  scrollConversationToBottom();
  closeSidebarOnMobile();
}

renderHistoryList();

// ===== 2. TOOLS INTEGRATION (ADVANCED CAPABILITIES) =====
async function fetchToolJson(url, options = {}, timeoutMs = 10000) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, { ...options, ...(controller ? { signal: controller.signal } : {}) });
    if (!response.ok) throw new Error('Request failed (' + response.status + ').');
    return await response.json();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function handleTools(text) {
  const t = text.toLowerCase();

  if (/^\s*(?:please\s+)?(?:open\s+youtube|youtube\s+open|youtube)(?:\s+please)?[.!?]*\s*$/i.test(text)) {
    window.open('https://youtube.com', '_blank', 'noopener,noreferrer');
    return 'Opening YouTube, Boss.';
  }
  if (/^\s*(?:please\s+)?(?:open\s+google|google\s+open|google)(?:\s+please)?[.!?]*\s*$/i.test(text)) {
    window.open('https://google.com', '_blank', 'noopener,noreferrer');
    return 'Opening Google, Boss.';
  }

  if (/\b(?:what time(?: is it)?|what is the time|current time|tell me the time|time now)\b/.test(t) || /^\s*time(?:\s+please)?[.!?]*\s*$/.test(t) || t.includes('టైమ్') || t.includes('సమయం')) {
    return 'The time is ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }) + ' IST, Boss.';
  }

  if (t.includes('weather') || t.includes('వాతావరణం')) {
    if (!navigator.geolocation) return 'I need location permission for weather, Boss.';
    return await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + position.coords.latitude + '&longitude=' + position.coords.longitude + '&current_weather=true';
          const data = await fetchToolJson(url);
          const temperature = Number(data?.current_weather?.temperature);
          if (!Number.isFinite(temperature)) throw new Error('Weather data unavailable.');
          resolve('It is ' + temperature + ' degrees Celsius now, Boss.');
        } catch (e) {
          resolve('Weather service error, Boss.');
        }
      }, () => resolve('I need location permission for weather, Boss.'), { timeout: 10000, maximumAge: 300000 });
    });
  }

  if (/\bjoke\b/.test(t)) {
    try {
      const data = await fetchToolJson('https://official-joke-api.appspot.com/random_joke');
      return data.setup + ' ... ' + data.punchline;
    } catch (e) {
      return 'Why did the computer go to the doctor? It had a virus, Boss.';
    }
  }

  return null;
}

// ===== 3. API & GEMINI CLIENT SETUP =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_SYSTEM_INSTRUCTION = 'You are J.A.R.V.I.S, an advanced AGI personal assistant for Eshwar. Reply naturally in a warm Telugu-English mix, using clear concise language.';

async function requestGeminiInteraction(inputMessage, systemInstruction = GEMINI_SYSTEM_INSTRUCTION) {
  if (!API_KEY) throw new Error('Gemini API key is missing. Reload the page and enter it again.');

  // First check if any tool handles it locally
  const toolResult = await handleTools(inputMessage);
  if (toolResult) {
    MEMORY.push({ role: 'user', text: inputMessage });
    MEMORY.push({ role: 'model', text: toolResult });
    saveMemory();
    return toolResult;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  MEMORY.push({ role: 'user', text: inputMessage });
  saveMemory();

  const contents = [
    { role: 'user', parts: [{ text: systemInstruction }] },
    { role: 'model', parts: [{ text: "Understood, I am J.A.R.V.I.S AGI system." }] },
    ...MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: contents,
  });

  const reply = response?.text;
  if (!reply) throw new Error('Gemini returned an empty response.');

  const trimmedReply = reply.trim();
  MEMORY.push({ role: 'model', text: trimmedReply });
  saveMemory();

  return trimmedReply;
}

window.requestGeminiInteraction = requestGeminiInteraction;

// ===== 4. DIRECT UI EVENT BINDING =====
function attachJarvisEvents() {
  const sendButton = document.querySelector('button[type="submit"]') || document.querySelector('#send-btn') || document.querySelector('.send-button') || document.querySelector('button svg')?.closest('button') || document.querySelector('footer button');
  const inputField = document.getElementById('msg') || document.querySelector('input[type="text"]') || document.querySelector('textarea');

  if (sendButton && inputField && !sendButton.dataset.bound) {
    sendButton.dataset.bound = "true"; // డ్యూప్లికేట్ కాకుండా ఉండటానికి
    
    const handleSend = async () => {
      const text = inputField.value.trim();
      if (!text) return;
      inputField.value = '';
      
      try {
        setThinking(true, 'J.A.R.V.I.S is analyzing...');
        const reply = await requestGeminiInteraction(text);
        setThinking(false);
        alert('Jarvis: ' + reply);
      } catch (err) {
        setThinking(false);
        console.error('Error:', err.message);
        alert('Error: ' + err.message);
      }
    };

    sendButton.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
    console.log("Jarvis Send Button Successfully Connected!");
  }
}

// పేజీ లోడ్ అయిన వెంటనే మరియు ఒక సెకను తర్వాత కూడా ట్రిగ్గర్ అయ్యేలా
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachJarvisEvents);
} else {
  attachJarvisEvents();
}
      setTimeout(attachJarvisEvents, 1000);
      }
    });
  }
});

