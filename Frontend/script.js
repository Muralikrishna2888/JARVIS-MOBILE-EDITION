// ===== 1. API KEY & MODELS =====
const API_KEY = "Enter your GEMINI API KEY";
const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash"];

// ===== 2. DOM ELEMENTS =====
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send');
const voiceStatus = document.getElementById('voiceStatus');

// Helper to add messages to the UI chat box
function addMsg(text, senderClass = "") {
    const d = document.createElement('div');
    d.className = 'msg ' + senderClass;
    d.innerHTML = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
}

// ===== 3. GEMINI BRAIN (auto-fallback) =====
async function callGemini(p) {
    let lastErr;
    for (const m of MODELS) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
            });
            const data = await res.json();
            if (data.error) {
                lastErr = new Error(data.error.message);
                continue;
            }
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr;
}

async function askGemini(textPrompt) {
    const loadingMsg = addMsg("J.A.R.V.I.S: Processing...");
    try {
        const reply = await callGemini(textPrompt);
        loadingMsg.innerHTML = "J.A.R.V.I.S: " + reply;
        speak(reply); 
    } catch (e) {
        loadingMsg.innerHTML = "J.A.R.V.I.S: ERROR - " + e.message;
    }
}

// ===== 4. ADVANCED VOICE RECOGNITION (Mobile-Optimized) =====
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;

    let isListening = false;

    micBtn.addEventListener('click', () => {
        try {
            if (!isListening) {
                rec.start();
            } else {
                rec.stop();
            }
        } catch (err) {
            console.error("Mic toggle error:", err);
            micBtn.textContent = "🎙️";
            isListening = false;
            if(voiceStatus) {
                voiceStatus.textContent = "• ERROR";
                voiceStatus.className = "off";
            }
        }
    });

    rec.onstart = () => {
        isListening = true;
        micBtn.textContent = "👂";
        if(voiceStatus) {
            voiceStatus.textContent = "• LISTENING";
            voiceStatus.className = "on";
        }
    };

    rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        addMsg("YOU: " + text, "user");
        askGemini(text);
    };

    rec.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        addMsg("J.A.R.V.I.S: Audio Error [" + e.error + "]");
        micBtn.textContent = "🎙️";
        isListening = false;
        if(voiceStatus) {
            voiceStatus.textContent = "• ACTIVE";
            voiceStatus.className = "on";
        }
    };

    rec.onend = () => {
        isListening = false;
        micBtn.textContent = "🎙️";
        if(voiceStatus) {
            voiceStatus.textContent = "• ACTIVE";
            voiceStatus.className = "on";
        }
    };
} else {
    micBtn.style.display = 'none';
    if(voiceStatus) {
        voiceStatus.textContent = "• UNSUPPORTED";
        voiceStatus.className = "off";
    }
}

// ===== 5. TEXT-TO-SPEECH (Advanced Voice Output) =====
let voices = [];
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any overlapping speech

    // Clean up markdown asterisks for smooth audio reading
    const cleanText = text.replace(/[*_#`]/g, '');
    const u = new SpeechSynthesisUtterance(cleanText);
    u.rate = 1.05;
    u.pitch = 0.82; // Deep robotic tone
    
    const v = voices.find(val => val.lang.startsWith('en')) || voices[0];
    if (v) u.voice = v;
    
    window.speechSynthesis.speak(u);
}

// ===== 6. TEXT SEND BUTTON & ENTER KEY =====
sendBtn.onclick = () => {
    const t = input.value.trim();
    if (!t) return;
    addMsg("YOU: " + t, "user");
    input.value = '';
    askGemini(t);
};

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});
