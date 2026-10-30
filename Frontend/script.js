// ===== 1. MEMORY & CONVERSATION STORAGE SETUP =====
let MEMORY = [];
try {
  const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(storedMemory)) {
    MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string');
  }
} catch (e) {
  localStorage.removeItem('jarvis_memory');
}

const HISTORY_KEY = 'jarvis_conversation_history_v1';
let CONVERSATIONS = [
  { id: '1', title: 'Hi.', time: '10h ago · 34 turns · with Hands-Free', category: 'YESTERDAY' },
  { id: '2', title: 'Jarvis, I need a song play.', time: '10h ago · 38 turns · with Hands-Free', category: 'YESTERDAY' },
  { id: '3', title: 'Jarvis project development', time: '12h ago · 59 turns', category: 'YESTERDAY' },
  { id: '4', title: 'He just messaged me to go for a movie.', time: '1d ago · 30 turns', category: 'THIS WEEK' },
  { id: '5', title: 'Hey Jarvis.', time: '2d ago · 166 turns', category: 'THIS WEEK' },
  { id: '6', title: 'Random chat and tech', time: '10d ago · 6 turns', category: 'EARLIER' }
];

try {
  const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
  if (Array.isArray(stored) && stored.length > 0) CONVERSATIONS = stored;
} catch (e) {}

// ===== 2. DEVICE CONTROL TOOLS =====
async function handleTools(text) {
  const t = text.toLowerCase().trim();
  if (t.includes('battery') || t.includes('ఛార్జింగ్')) {
    if ('getBattery' in navigator) {
      const b = await navigator.getBattery();
      return `మీ డివైస్ బ్యాటరీ ${Math.round(b.level * 100)}% ఉంది సార్.`;
    }
    return 'బ్యాటరీ సమాచారం అందుబాటులో లేదు సార్.';
  }
  const appMatch = t.match(/(?:open|launch|ఓపెన్)\s+([a-zA-Z0-9_\s]+)/i);
  if (appMatch) {
    const app = appMatch[1].trim().toLowerCase();
    if (app === 'youtube') { window.location.href = 'vnd.youtube:'; return 'యూట్యూబ్ ఓపెన్ అవుతోంది సార్.'; }
    window.location.href = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.${app};end`;
    return `${app} యాప్ లాంచ్ చేయబడుతోంది సార్.`;
  }
  return null;
}

// ===== 3. GEMINI SETUP (gemini-3.8-flash) =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}
const GEMINI_MODEL = 'gemini-3.8-flash';

async function requestGeminiInteraction(inputMessage) {
  if (!API_KEY) throw new Error('Gemini API key is missing.');
  const toolResult = await handleTools(inputMessage);
  if (toolResult) return toolResult;

  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  MEMORY.push({ role: 'user', text: inputMessage });
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
  });
  const reply = response?.text?.trim() || 'No response.';
  MEMORY.push({ role: 'model', text: reply });
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  return reply;
}

// ===== 4. UI NAVIGATION & TABS =====
document.addEventListener('DOMContentLoaded', () => {
  initJarvisApp();
});

function initJarvisApp() {
  const sendButton = document.getElementById('send');
  const inputField = document.getElementById('msg');
  const chatContainer = document.getElementById('chat');
  const typeTrigger = document.getElementById('type-trigger');
  const inputDrawer = document.getElementById('input-drawer');
  const historyToggle = document.getElementById('history-toggle'); // Clock Button
  const settingsBtn = document.getElementById('settings-btn');
  const bottomTabs = document.querySelectorAll('.bottom-tabs .tab-item');
  const coreStage = document.getElementById('core-stage');

  const executeSend = async (text) => {
    if (!text) return;
    if (coreStage) coreStage.classList.add('chat-active');
    if (chatContainer) {
      chatContainer.innerHTML += `<div class="user-bubble-wrapper"><span class="user-name-tag">Eshwar</span><div class="user-bubble">${text}</div></div>`;
    }
    try {
      const reply = await requestGeminiInteraction(text);
      if (chatContainer) {
        chatContainer.innerHTML += `<div class="ai-bubble">${reply}</div>`;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    } catch (err) {
      if (chatContainer) chatContainer.innerHTML += `<div class="ai-bubble" style="color:#ef4444">Error: ${err.message}</div>`;
    }
  };

  if (sendButton && inputField) {
    sendButton.addEventListener('click', (e) => { e.preventDefault(); executeSend(inputField.value.trim()); inputField.value=''; });
  }

  // 1. CLOCK BUTTON -> HISTORY VIEW (Screenshot 3)[span_7](start_span)[span_7](end_span)
  if (historyToggle) {
    historyToggle.addEventListener('click', () => {
      if (coreStage) coreStage.style.display = 'none';
      if (chatContainer) {
        chatContainer.innerHTML = `
          <div class="history-view">
            <div class="history-header">
              <span class="back-arrow" id="back-to-jarvis">‹</span>
              <h2>History</h2>
              <span class="search-icon">🔍</span>
            </div>
            
            <div class="h-section">YESTERDAY</div>
            ${CONVERSATIONS.filter(c => c.category === 'YESTERDAY').map(c => `
              <div class="history-item">
                <div class="h-title">${c.title}</div>
                <div class="h-sub">${c.time}</div>
              </div>
            `).join('')}

            <div class="h-section">THIS WEEK</div>
            ${CONVERSATIONS.filter(c => c.category === 'THIS WEEK').map(c => `
              <div class="history-item">
                <div class="h-title">${c.title}</div>
                <div class="h-sub">${c.time}</div>
              </div>
            `).join('')}

            <div class="h-section">EARLIER</div>
            ${CONVERSATIONS.filter(c => c.category === 'EARLIER').map(c => `
              <div class="history-item">
                <div class="h-title">${c.title}</div>
                <div class="h-sub">${c.time}</div>
              </div>
            `).join('')}
          </div>
        `;
        document.getElementById('back-to-jarvis').addEventListener('click', () => location.reload());
      }
    });
  }

  // 2. BOTTOM TABS NAVIGATION
  bottomTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      bottomTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (index === 0) {
        // Jarvis Core
        location.reload();
function initJarvisApp() {
  const sendButton = document.getElementById('send');
  const inputField = document.getElementById('msg');
  const chatContainer = document.getElementById('chat');
  const typeTrigger = document.getElementById('type-trigger');
  const inputDrawer = document.getElementById('input-drawer');
  const historyToggle = document.getElementById('history-toggle');
  const settingsBtn = document.getElementById('settings-btn');
  const bottomTabs = document.querySelectorAll('.bottom-tabs .tab-item');
  const coreStage = document.getElementById('core-stage');

  // Send message execution handler
  const executeSend = async (text) => {
    if (!text) return;
    if (coreStage) coreStage.classList.add('chat-active');
    if (chatContainer) {
      chatContainer.innerHTML += `<div class="user-bubble-wrapper"><span class="user-name-tag">${localStorage.getItem('userName') || 'Eshwar'}</span><div class="user-bubble">${text}</div></div>`;
    }
    try {
      const reply = await requestGeminiInteraction(text);
      if (chatContainer) {
        chatContainer.innerHTML += `<div class="ai-bubble">${reply}</div>`;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    } catch (err) {
      if (chatContainer) chatContainer.innerHTML += `<div class="ai-bubble" style="color:#ef4444">Error: ${err.message}</div>`;
    }
  };

  if (sendButton && inputField) {
    sendButton.addEventListener('click', (e) => { 
      e.preventDefault(); 
      executeSend(inputField.value.trim()); 
      inputField.value=''; 
    });
  }

  // ===== SETTINGS BUTTON EVENT & UI =====
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (coreStage) coreStage.style.display = 'none';
      if (chatContainer) {
        chatContainer.innerHTML = `
          <div class="history-view">
            <div class="history-header">
              <span class="back-arrow" id="back-to-jarvis">‹</span>
              <h2>Settings</h2>
              <span></span>
            </div>

            <div class="history-item" id="set-assistants" style="cursor: pointer;">
              <div class="h-title">Assistants</div>
              <div class="h-sub">3 assistants ></div>
            </div>

            <div class="h-section">APP</div>

            <div class="history-item" id="set-username" style="cursor: pointer;">
              <div class="h-title">User Name</div>
              <div class="h-sub">Current: ${localStorage.getItem('userName') || 'Eshwar'} ></div>
            </div>

            <div class="history-item" id="set-phone-assistant" style="cursor: pointer;">
              <div class="h-title">Set as phone assistant</div>
              <div class="h-sub" style="color: #60a5fa;">Set up ></div>
            </div>
            <div style="font-size: 11px; color: #71717a; margin: 4px 0 12px 4px;">
              Then hold the power button, or swipe in from a bottom corner, to reach Jarvis from any screen.
            </div>

            <div class="h-section">ADVANCED</div>

            <div class="history-item" id="set-api-key" style="cursor: pointer;">
              <div class="h-title">Key</div>
              <div class="h-sub">••••${(localStorage.getItem('jarvis_key') || '').slice(-4)} ></div>
            </div>

            <div class="h-section">ABOUT</div>
            <div class="history-item">
              <div class="h-title">Privacy</div>
            </div>
          </div>
        `;

        // Back button action
        document.getElementById('back-to-jarvis').addEventListener('click', () => location.reload());

        // 1. Change User Name
        document.getElementById('set-username').addEventListener('click', () => {
          const newName = prompt("మీ కొత్త పేరును నమోదు చేయండి:", localStorage.getItem('userName') || 'Eshwar');
          if (newName && newName.trim() !== '') {
            localStorage.setItem('userName', newName.trim());
            alert("యూజర్ పేరు విజయవంతంగా మార్చబడింది సార్!");
            settingsBtn.click(); // Refresh settings UI
          }
        });

        // 2. Set as Phone Assistant Option
        document.getElementById('set-phone-assistant').addEventListener('click', () => {
          alert("Opening phone assistant settings, Sir.");
          window.location.href = 'intent:#Intent;action=android.settings.VOICE_INPUT_SETTINGS;end';
        });

        // 3. Set API Key
        document.getElementById('set-api-key').addEventListener('click', () => {
          const currentKey = localStorage.getItem('jarvis_key') || '';
          const newKey = prompt("కొత్త Gemini API Key ని నమోదు చేయండి:", currentKey);
          if (newKey && newKey.trim() !== '') {
            localStorage.setItem('jarvis_key', newKey.trim());
            API_KEY = newKey.trim();
            alert("API Key విజయవంతంగా సేవ్ చేయబడింది సార్!");
            settingsBtn.click();
          }
        });

        // 4. Assistants click
        document.getElementById('set-assistants').addEventListener('click', () => {
          alert("Jarvis AGI Core v3.8 Active, Sir.");
        });
      }
    });
  }
  // ======================================

  // Bottom Tabs Navigation
  bottomTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      bottomTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (index === 0) location.reload();
    });
  });

  initSphereCore(executeSend);
}

// ===== 5. 3D SPHERE & TOUCH MIC CORE =====
let isCoreListening = false;

function initSphereCore(onVoiceCommand) {
  const canvas = document.getElementById('particle-sphere');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = 280;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.style.cursor = 'pointer';
  ctx.scale(dpr, dpr);

  const particles = [];
  const numParticles = 520;
  const baseRadius = 108;
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < numParticles; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / numParticles);
    particles.push({
      nx: Math.sin(phi) * Math.cos(theta),
      ny: Math.sin(phi) * Math.sin(theta),
      nz: Math.cos(phi)
    });
  }

  let angleY = 0;
  let pulsePhase = 0;

  function render() {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2;

    if (isCoreListening) {
      angleY += 0.022;
      pulsePhase += 0.12;
    } else {
      angleY += 0.005;
      pulsePhase = 0;
    }

    const currentRadius = isCoreListening ? baseRadius + Math.sin(pulsePhase) * 6 : baseRadius;
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);

    particles.forEach(p => {
      const px = p.nx * currentRadius, py = p.ny * currentRadius, pz = p.nz * currentRadius;
      let x1 = px * cosY - pz * sinY;
      let z1 = pz * cosY + px * sinY;

      const fov = 320;
      const scale = fov / (fov + z1);
      const projX = x1 * scale + cx;
      const projY = py * scale + cy;

      const alpha = Math.max(0.12, Math.pow((z1 + currentRadius) / (2 * currentRadius), 1.6));

      ctx.beginPath();
      ctx.arc(projX, projY, Math.max(0.8, 1.55 * scale), 0, Math.PI * 2);
      ctx.fillStyle = isCoreListening ? `rgba(0, 240, 255, ${alpha})` : `rgba(235, 242, 255, ${alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(render);
  }
  render();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  const coreMic = new SpeechRecognition();
  coreMic.continuous = false;
  coreMic.interimResults = false;
  coreMic.lang = 'en-IN';

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (isCoreListening) {
      coreMic.stop();
      isCoreListening = false;
      return;
    }
    try {
      coreMic.start();
      isCoreListening = true;
      if ('vibrate' in navigator) navigator.vibrate(40);
    } catch (err) {}
  });

  coreMic.onresult = (event) => {
    const voiceText = event.results[0][0].transcript.trim();
    isCoreListening = false;
    onVoiceCommand(voiceText);
  };

  coreMic.onerror = () => { isCoreListening = false; };
  coreMic.onend = () => { isCoreListening = false; };
}

// Name Update Helper
function updateName(newName) {
  localStorage.setItem('userName', newName);
}

      
