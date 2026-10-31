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
      return `Mee device battery ${Math.round(b.level * 100)}% undhi sir.`;
    }
    return 'Battery samacharam andubatulo ledu sir.';
  }
  const appMatch = t.match(/(?:open|launch|ఓపెన్)\s+([a-zA-Z0-9_\s]+)/i);
  if (appMatch) {
    const app = appMatch[1].trim().toLowerCase();
    if (app === 'youtube') { window.location.href = 'vnd.youtube:'; return 'YouTube open avuthondi sir.'; }
    window.location.href = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.${app};end`;
    return `${app} app launch cheyabaduthondi sir.`;
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

// ===== 4. UI CONTROLS & EVENT BINDINGS =====
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
  const settingsBtn = document.getElementById('settings-btn');     // Settings Button
  const bottomTabs = document.querySelectorAll('.bottom-tabs .tab-item');
  const coreStage = document.getElementById('core-stage');

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
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSend(inputField.value.trim());
        inputField.value = '';
      }
    });
  }

  // Type Button Toggle (Type click cheste input drawer open avvadaniki)
  if (typeTrigger && inputDrawer) {
    typeTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = inputDrawer.style.display === 'none' || !inputDrawer.style.display;
      inputDrawer.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && inputField) {
        inputField.focus();
      }
    });
  }

  // Clock Button -> History View
  if (historyToggle) {
    historyToggle.addEventListener('click', (e) => {
      e.preventDefault();
      if (coreStage) coreStage.style.display = 'none';
      if (chatContainer) {
        chatContainer.innerHTML = `
          <div class="history-view">
            <div class="history-header">
              <span class="back-arrow" id="back-to-jarvis">‹</span>
              <h2>History</h2>
              <span>🔍</span>
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

  // Settings Button -> Full Interactive Settings Page
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
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

        document.getElementById('back-to-jarvis').addEventListener('click', () => location.reload());

        document.getElementById('set-username').addEventListener('click', () => {
          const newName = prompt("Mee kottha peru namodu cheyandi:", localStorage.getItem('userName') || 'Eshwar');
          if (newName && newName.trim() !== '') {
            localStorage.setItem('userName', newName.trim());
            alert("User peru vijayavanthamga marachabadindi sir!");
            settingsBtn.click();
          }
        });

        document.getElementById('set-phone-assistant').addEventListener('click', () => {
          alert("Opening phone assistant settings, Sir.");
          window.location.href = 'intent:#Intent;action=android.settings.VOICE_INPUT_SETTINGS;end';
        });

        document.getElementById('set-api-key').addEventListener('click', () => {
          const currentKey = localStorage.getItem('jarvis_key') || '';
          const newKey = prompt("Kottha Gemini API Key ni namodu cheyandi:", currentKey);
          if (newKey && newKey.trim() !== '') {
            localStorage.setItem('jarvis_key', newKey.trim());
            API_KEY = newKey.trim();
            alert("API Key vijayavanthamga save cheyabadindi sir!");
            settingsBtn.click();
          }
        });

        document.getElementById('set-assistants').addEventListener('click', () => {
          alert("Jarvis AGI Core v3.8 Active, Sir.");
        });
      }
    });
  }

  // Bottom Tabs Navigation (Jarvis, Today, Memory, Files)
  bottomTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      bottomTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (index === 0) {
        location.reload();
      } 
      else if (index === 1) {
        // Today Tab
        if (coreStage) coreStage.style.display = 'none';
        if (chatContainer) {
          chatContainer.innerHTML = `
            <div class="today-dashboard">
              <div class="today-header"><h2>Fri, 30 Oct</h2><button class="brief-btn">Brief me</button></div>
              <div class="section-title">NO DATE YET</div>
              <div class="task-card"><div class="task-title">building a Jarvis to control the phone</div><div class="task-footer"><span>you owe · open 24d</span><span class="t-done">✓ Done</span></div></div>
              <div class="task-card"><div class="task-title">writing biology workbook procedure</div><div class="task-footer"><span>you owe</span><span class="t-done">✓ Done</span></div></div>
            </div>
          `;
        }
      }
      else if (index === 2) {
        // Memory Tab
        if (coreStage) coreStage.style.display = 'none';
        if (chatContainer) {
          chatContainer.innerHTML = `
            <div class="memory-view">
              <input type="text" class="memory-search" placeholder="Search what Jarvis knows...">
              <div class="memory-card">
                <div class="m-card-top"><span>You</span><span class="tag-new">NEW</span></div>
                <div class="m-text">Your name is ${localStorage.getItem('userName') || 'Eshwar'}.</div>
                <span class="close-x">✕</span>
              </div>
              <div class="memory-footer-note">Everything lives on this phone. Tap to edit, delete anything, anytime.</div>
            </div>
          `;
        }
      }
      else if (index === 3) {
        // Files Tab
        if (coreStage) coreStage.style.display = 'none';
        if (chatContainer) {
          chatContainer.innerHTML = `
            <div class="files-view">
              <input type="text" class="memory-search" placeholder="Search your files...">
              <div class="file-item"><h3>${localStorage.getItem('userName') || "Eshwar"}'s Photo</h3><p>![User photo](content://media/external/images/media/123)</p><span class="f-time">11h ago</span></div>
              <div class="file-item"><h3>Biology Workbook - Lactobacillus Procedure</h3><p>Buttermilk</p><span class="f-time">2d ago</span></div>
              <div class="file-item"><h3>Hindi Exam Prep Plan</h3><p>[] Silabus mottam okasari chudu</p><span class="f-time">22d ago</span></div>
            </div>
          `;
        }
      }
    });
  });

  initSphereCore(executeSend);
}

// ===== 5. 3D SPHERE CORE =====
function initSphereCore(onVoiceCommand) {
  const canvas = document.getElementById('particle-sphere');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 240;
  canvas.width = size; canvas.height = size;
  let angleY = 0;
  function render() {
    ctx.clearRect(0, 0, size, size);
    angleY += 0.005;
    ctx.fillStyle = 'rgba(235, 242, 255, 0.7)';
    ctx.beginPath(); ctx.arc(size/2, size/2, 90, 0, Math.PI*2); ctx.fill();
    requestAnimationFrame(render);
  }
  render();
}

