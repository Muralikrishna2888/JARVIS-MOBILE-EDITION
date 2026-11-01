// ===== 1. MEMORY & STORAGE SETUP =====
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
  { id: '1', title: 'Hi.', time: '1m ago · 2 turns', category: 'TODAY' },
  { id: '2', title: 'The following diagram represents ...', time: '3h ago · 100 turns', category: 'TODAY' },
  { id: '3', title: 'Jarvis, I need a song play.', time: '2d ago · 38 turns', category: 'THIS WEEK' },
  { id: '4', title: 'Jarvis project development', time: '2d ago · 59 turns', category: 'THIS WEEK' }
];

try {
  const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
  if (Array.isArray(stored) && stored.length > 0) CONVERSATIONS = stored;
} catch (e) {}

// ===== 2. DEVICE TOOLS =====
async function handleTools(text) {
  const t = text.toLowerCase().trim();
  if (t.includes('battery') || t.includes('ఛార్జింగ్')) {
    if ('getBattery' in navigator) {
      const b = await navigator.getBattery();
      return `Your device battery is at ${Math.round(b.level * 100)}%, Sir.`;
    }
    return 'Battery info not available, Sir.';
  }
  const appMatch = t.match(/(?:open|launch|ఓపెన్)\s+([a-zA-Z0-9_\s]+)/i);
  if (appMatch) {
    const app = appMatch[1].trim().toLowerCase();
    if (app === 'youtube') { window.location.href = 'vnd.youtube:'; return 'Opening YouTube, Sir.'; }
    window.location.href = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.${app};end`;
    return `Launching ${app}, Sir.`;
  }
  return null;
}

// ===== 3. GEMINI SETUP =====
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
  const reply = response?.text?.trim() || 'No response, Sir.';
  MEMORY.push({ role: 'model', text: reply });
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  return reply;
}

// ===== 4. UI CONTROLS & FULL SCREEN VIEWS =====
document.addEventListener('DOMContentLoaded', () => {
  initJarvisApp();
  initParticleSphere();
});

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
  const greetingBox = document.querySelector('.greeting-box');

  const executeSend = async (text) => {
    if (!text) return;
    
    // టైప్ చేయగానే స్పియర్ పైకి వెళ్ళి చిన్నదవుతుంది (Screenshot 1000420949 లాగా)[span_5](start_span)[span_5](end_span)
    if (coreStage) coreStage.classList.add('chat-active');
    if (greetingBox) greetingBox.style.display = 'none';

    if (chatContainer) {
      chatContainer.innerHTML += `
        <div class="user-bubble-wrapper" style="text-align: right; margin: 10px 0;">
          <span class="user-name-tag" style="font-size: 11px; color: #888;">${localStorage.getItem('userName') || 'Eshwar'}</span>
          <div class="user-bubble" style="background: #27272a; padding: 10px 14px; border-radius: 14px; display: inline-block; color: #fff;">${text}</div>
        </div>
      `;
    }

    try {
      const reply = await requestGeminiInteraction(text);
      if (chatContainer) {
        chatContainer.innerHTML += `
          <div class="ai-bubble" style="background: #18181b; padding: 12px; border-radius: 14px; margin: 10px 0; color: #e2e8f0;">
            ${reply}
          </div>
        `;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    } catch (err) {
      if (chatContainer) {
        chatContainer.innerHTML += `<div class="ai-bubble" style="color:#ef4444">Error: ${err.message}</div>`;
      }
    }
  };

  if (sendButton && inputField) {
    sendButton.addEventListener('click', (e) => { 
      e.preventDefault(); 
      executeSend(inputField.value.trim()); 
      inputField.value=''; 
    });
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSend(inputField.value.trim());
        inputField.value = '';
      }
    });
  }

  // Type Drawer Toggle
  if (typeTrigger && inputDrawer) {
    typeTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = inputDrawer.style.display === 'none' || !inputDrawer.style.display;
      inputDrawer.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && inputField) inputField.focus();
    });
  }

  // Clock Button -> Full Screen History (Screenshot 1000420954)[span_6](start_span)[span_6](end_span)
  if (historyToggle) {
    historyToggle.addEventListener('click', (e) => {
      e.preventDefault();
      if (chatContainer) {
        chatContainer.innerHTML = `
          <div class="history-view" style="padding: 16px; color: #fff; height: 100%; overflow-y: auto;">
            <div class="history-header" style="display: flex; align-items: center; justify-content: space-between; font-size: 20px; margin-bottom: 20px;">
              <span class="back-arrow" id="back-to-jarvis" style="cursor: pointer; font-size: 28px;">‹</span>
              <h2>History</h2>
              <span>🔍</span>
            </div>
            <div class="h-section" style="font-size: 11px; color: #71717a; font-weight: bold; margin: 12px 0;">TODAY</div>
            ${CONVERSATIONS.filter(c => c.category === 'TODAY').map(c => `<div class="history-item" style="background: #18181b; padding: 12px; border-radius: 12px; margin-bottom: 8px;"><div style="font-weight: 500;">${c.title}</div><div style="font-size: 11px; color: #71717a; margin-top: 4px;">${c.time}</div></div>`).join('')}
            
            <div class="h-section" style="font-size: 11px; color: #71717a; font-weight: bold; margin: 16px 0 12px 0;">THIS WEEK</div>
            ${CONVERSATIONS.filter(c => c.category === 'THIS WEEK').map(c => `<div class="history-item" style="background: #18181b; padding: 12px; border-radius: 12px; margin-bottom: 8px;"><div style="font-weight: 500;">${c.title}</div><div style="font-size: 11px; color: #71717a; margin-top: 4px;">${c.time}</div></div>`).join('')}
          </div>
        `;
        document.getElementById('back-to-jarvis').addEventListener('click', () => location.reload());
      }
    });
  }

  // Settings Button -> Full Screen Settings (Screenshot 1000420953)[span_7](start_span)[span_7](end_span)
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (chatContainer) {
        chatContainer.innerHTML = `
          <div class="history-view" style="padding: 16px; color: #fff; height: 100%; overflow-y: auto;">
            <div class="history-header" style="display: flex; align-items: center; justify-content: space-between; font-size: 20px; margin-bottom: 20px;">
              <span class="back-arrow" id="back-to-jarvis" style="cursor: pointer; font-size: 28px;">‹</span>
              <h2>Settings</h2>
              <span></span>
            </div>
            <div class="history-item" id="set-username" style="background: #18181b; padding: 14px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; cursor: pointer;">
              <span>Username</span><span style="color: #888;">@${localStorage.getItem('userName') || 'eshwar'} ></span>
            </div>
            <div class="history-item" id="set-phone-assistant" style="background: #18181b; padding: 14px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; cursor: pointer;">
              <span>Set as phone assistant</span><span style="color: #60a5fa;">Set up ></span>
            </div>
            <div class="history-item" id="set-api-key" style="background: #18181b; padding: 14px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; cursor: pointer;">
              <span>Gemini API Key</span><span style="color: #888;">Update ></span>
            </div>
          </div>
        `;
        document.getElementById('back-to-jarvis').addEventListener('click', () => location.reload());
        
        document.getElementById('set-username').addEventListener('click', () => {
          const name = prompt("Enter your username:", localStorage.getItem('userName') || 'eshwar');
          if(name) { localStorage.setItem('userName', name); settingsBtn.click(); }
        });
        document.getElementById('set-phone-assistant').addEventListener('click', () => {
          window.location.href = 'intent:#Intent;action=android.settings.VOICE_INPUT_SETTINGS;end';
        });
        document.getElementById('set-api-key').addEventListener('click', () => {
          const key = prompt("Enter new API Key:", localStorage.getItem('jarvis_key') || '');
          if(key) { localStorage.setItem('jarvis_key', key); API_KEY = key; alert("API Key saved!"); }
        });
      }
    });
  }

  // Bottom Tabs -> Full Screen Views (Today, Memory, Files)[span_8](start_span)[span_8](end_span)[span_9](start_span)[span_9](end_span)[span_10](start_span)[span_10](end_span)
  bottomTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      bottomTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (index === 0) location.reload();
      else if (index === 1 && chatContainer) {
        // Today Screen (Screenshot 1000420950)[span_11](start_span)[span_11](end_span)
        chatContainer.innerHTML = `
          <div class="today-dashboard" style="padding: 16px; color: #fff; height: 100%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2>Sat, 31 Oct</h2>
              <button style="background: #2563eb; color: #fff; border: none; padding: 6px 16px; border-radius: 20px;">Brief me</button>
            </div>
            <div style="font-size: 11px; color: #71717a; margin-bottom: 10px; font-weight: bold;">NO DATE YET</div>
            <div style="background: #18181b; padding: 14px; border-radius: 12px; margin-bottom: 10px;">
              <div style="font-weight: 500; margin-bottom: 8px;">building a Jarvis to control the phone</div>
              <div style="font-size: 12px; color: #71717a; display: flex; justify-content: space-between;"><span>you owe · open 26d</span><span style="color:#22c55e;">✓ Done</span></div>
            </div>
            <div style="background: #18181b; padding: 14px; border-radius: 12px;">
              <div style="font-weight: 500; margin-bottom: 8px;">writing biology workbook procedure</div>
              <div style="font-size: 12px; color: #71717a; display: flex; justify-content: space-between;"><span>you owe · open 3d</span><span style="color:#22c55e;">✓ Done</span></div>
            </div>
          </div>
        `;
      }
      else if (index === 2 && chatContainer) {
        // Memory Screen (Screenshot 1000420951)[span_12](start_span)[span_12](end_span)
        chatContainer.innerHTML = `
          <div class="memory-view" style="padding: 16px; color: #fff; height: 100%; overflow-y: auto;">
            <h2 style="margin-bottom: 16px;">Memory</h2>
            <input class="memory-search" placeholder="Search what Jarvis knows..." style="width: 100%; background: #18181b; border: 1px solid #27272a; padding: 12px; border-radius: 12px; color: #fff; margin-bottom: 16px;">
            <div style="background: #18181b; padding: 14px; border-radius: 12px; margin-bottom: 10px;">
              <div style="font-size: 11px; color: #888; display: flex; justify-content: space-between; margin-bottom: 4px;"><span>You</span><span style="color:#60a5fa;">NEW</span></div>
              <div>Your name is Ishwar.</div>
            </div>
            <div style="background: #18181b; padding: 14px; border-radius: 12px;">
              <div style="font-size: 11px; color: #888; display: flex; justify-content: space-between; margin-bottom: 4px;"><span>You</span></div>
              <div>You stated their name is Yashwant.</div>
            </div>
          </div>
        `;
      }
      else if (index === 3 && chatContainer) {
        // Files Screen (Screenshot 1000420952)[span_13](start_span)[span_13](end_span)
        chatContainer.innerHTML = `
          <div class="files-view" style="padding: 16px; color: #fff; height: 100%; overflow-y: auto;">
            <h2 style="margin-bottom: 16px;">Files</h2>
            <input class="memory-search" placeholder="Search your files..." style="width: 100%; background: #18181b; border: 1px solid #27272a; padding: 12px; border-radius: 12px; color: #fff; margin-bottom: 16px;">
            <div style="background: #18181b; padding: 14px; border-radius: 12px; margin-bottom: 10px;">
              <h3 style="font-size: 15px; margin-bottom: 4px;">Eshwar's Photo</h3>
              <p style="font-size: 12px; color: #888;">![User photo](content://media/external/images/media/123)</p>
            </div>
            <div style="background: #18181b; padding: 14px; border-radius: 12px;">
              <h3 style="font-size: 15px; margin-bottom: 4px;">బయాలజీ వర్క్ బుక్ - లాక్టోబాసిల్లస్ ప్రొసీజర్</h3>
              <p style="font-size: 12px; color: #888;">Buttermilk</p>
            </div>
          </div>
        `;
      }
    });
  });
}

// ===== 5. 3D PARTICLE SPHERE ANIMATION =====
function initParticleSphere() {
  const canvas = document.getElementById('particle-sphere');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const particles = [];
  const numParticles = 350;
  const radius = 80;
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
  function render() {
    ctx.clearRect(0, 0, size, size);
    angleY += 0.006;
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const cx = size / 2, cy = size / 2;

    particles.forEach(p => {
      let x1 = p.nx * radius * cosY - p.nz * radius * sinY;
      let z1 = p.nz * radius * cosY + p.nx * radius * sinY;
      let y1 = p.ny * radius;

      const fov = 250;
      const scale = fov / (fov + z1);
      const projX = x1 * scale + cx;
      const projY = y1 * scale + cy;

      const alpha = Math.max(0.2, (z1 + radius) / (2 * radius));
      ctx.beginPath();
      ctx.arc(projX, projY, Math.max(1, 1.4 * scale), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(render);
  }
  render();
}

