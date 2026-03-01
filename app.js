import { DEPARTMENTS, EXECUTIVES, STUDY_CATEGORIES, UI_CONFIG } from './data.js';

// 1. CLOUD CONFIGURATION (Integrated from your saved info)
const firebaseConfig = {
    apiKey: "AIzaSyAsS...", // Your actual key from previous code
    authDomain: "slithub-17a41.firebaseapp.com",
    projectId: "slithub-17a41",
    storageBucket: "slithub-17a41.appspot.com",
    messagingSenderId: "1056588267605",
    appId: "1:1056588267605:web:0786..."
};

// Cloudinary Settings (Ensure your preset is 'Unsigned' in Cloudinary Dashboard)
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dxt8v0h1u/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "slithub_preset"; 

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. ENGINE START & SPLASH HIDER
window.addEventListener('DOMContentLoaded', () => {
    // Hide spinner after 1.5s for that professional "Glow" entry
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 500);
        }
    }, 1500);

    renderStaticData();
    loadLiveMarket();
    loadVerifiedGroups();
});

// 3. NAVIGATION & ADMIN ACCESS
window.switchTab = function(tabId) {
    // Admin Protection Logic
    if (tabId === 'admin') {
        const pass = prompt("Enter Developer Secret 🛡️:");
        if (pass !== UI_CONFIG.adminPassphrase) {
            alert("Access Denied! ❌");
            return;
        }
        loadAdminPanel();
    }

    // Tab Switching UI
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    // Update Nav Icons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-emerald-600', 'active');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(activeBtn) activeBtn.classList.add('text-emerald-600', 'active');
};

// 4. WHATSAPP GROUP VERIFICATION SYSTEM
window.submitStudyGroup = async () => {
    const name = prompt("Enter Course Name (e.g., GST 111):");
    const link = prompt("Paste WhatsApp Group Link:");
    
    if(name && link) {
        await db.collection('StudyGroups').add({
            name: name,
            link: link,
            status: 'pending', // Junior must verify this first
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Submitted! 🚀 Waiting for Junior to verify.");
    }
};

async function loadVerifiedGroups() {
    const container = document.getElementById('groups-list');
    const snap = await db.collection('StudyGroups').where('status', '==', 'verified').get();
    container.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        container.innerHTML += `
            <div class="glass-card p-4 flex justify-between items-center animate-fade-in border-l-4 border-emerald-500">
                <div>
                    <p class="font-black text-sm italic">${d.name}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Verified Group</p>
                </div>
                <a href="${d.link}" target="_blank" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black italic shadow-lg shadow-emerald-100">JOIN <i class="fa-brands fa-whatsapp"></i></a>
            </div>
        `;
    });
}

// 5. ADMIN TERMINAL LOGIC
async function loadAdminPanel() {
    const list = document.getElementById('admin-verification-list');
    const snap = await db.collection('StudyGroups').where('status', '==', 'pending').get();
    list.innerHTML = snap.empty ? "<p class='opacity-50 italic'>No new links to verify.</p>" : "";
    
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `
            <div class="border border-slate-700 p-3 rounded-xl flex flex-col gap-2 animate-fade-in">
                <p class="text-white font-bold">${d.name}</p>
                <div class="flex gap-2">
                    <a href="${d.link}" target="_blank" class="bg-blue-600 text-white p-2 rounded text-center text-[10px] flex-1">CHECK LINK</a>
                    <button onclick="verifyNow('${doc.id}')" class="bg-emerald-600 text-white p-2 rounded text-[10px] font-black flex-1">APPROVE ✅</button>
                </div>
            </div>
        `;
    });
}

window.verifyNow = async (id) => {
    await db.collection('StudyGroups').doc(id).update({ status: 'verified' });
    alert("Group is now Live for all students! ✨");
    loadAdminPanel();
};

// 6. STATIC DATA (From data.js)
function renderStaticData() {
    const pContainer = document.getElementById('study-pills');
    STUDY_CATEGORIES.forEach(cat => {
        pContainer.innerHTML += `<button class="whitespace-nowrap px-4 py-2 bg-white border border-emerald-100 rounded-full text-[10px] font-bold text-slate-500 shadow-sm">${cat}</button>`;
    });
}
