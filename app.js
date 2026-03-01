import { DEPARTMENTS, EXECUTIVES, STUDY_CATEGORIES, UI_CONFIG } from './data.js';

// 1. INITIALIZE FIREBASE (Using your slithub-17a41 config)
const firebaseConfig = {
    apiKey: "AIzaSyAsS...", // Ensure this is your full key
    authDomain: "slithub-17a41.firebaseapp.com",
    projectId: "slithub-17a41",
    storageBucket: "slithub-17a41.appspot.com",
    messagingSenderId: "1056588267605",
    appId: "1:1056588267605:web:0786..."
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. BOOTUP SEQUENCE
window.addEventListener('DOMContentLoaded', () => {
    // Kill the Spinner
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 500);
        }
    }, 1500);

    renderAcademics();
    loadVerifiedGroups();
});

// 3. TAB NAVIGATION (FIXED)
window.switchTab = function(tabId) {
    // Hide all
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    // Show selected
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden');

    // Update Nav Icons Glow
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-emerald-600', 'active');
        btn.classList.add('text-slate-400');
    });
    
    const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(activeBtn) activeBtn.classList.add('text-emerald-600', 'active');
};

// 4. ADMIN TRIGGER (FIXED)
document.getElementById('admin-trigger').onclick = () => {
    const pass = prompt("Enter Developer Secret 🛡️:");
    if(pass === "junior123") {
        window.switchTab('admin');
        loadAdminPanel();
    } else {
        alert("Access Denied ❌");
    }
};

// 5. STUDY GROUP LOGIC (The "WhatsApp Verification" Workflow)
window.openGroupModal = function() {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    
    content.innerHTML = `
        <h3 class="text-xl font-black mb-4 italic text-emerald-600">New Study Group 📚</h3>
        <input type="text" id="group-name" placeholder="Course Name (e.g. MMT 211)" class="w-full p-4 bg-slate-50 rounded-2xl mb-3 border-none outline-none">
        <input type="url" id="group-link" placeholder="WhatsApp Link" class="w-full p-4 bg-slate-50 rounded-2xl mb-4 border-none outline-none">
        <button onclick="submitToFirebase()" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">SUBMIT FOR VERIFICATION</button>
    `;
};

// Link the HTML button to the function
const studyBtn = document.getElementById('btn-new-group');
if(studyBtn) studyBtn.onclick = window.openGroupModal;

window.submitToFirebase = async () => {
    const name = document.getElementById('group-name').value;
    const link = document.getElementById('group-link').value;

    if(!name || !link) return alert("Please fill all fields!");

    await db.collection('StudyGroups').add({
        name: name,
        link: link,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Sent! Junior will verify this shortly. 🚀");
    document.getElementById('modal-overlay').classList.add('hidden');
};

// 6. ADMIN VERIFICATION PANEL
async function loadAdminPanel() {
    const list = document.getElementById('admin-verification-list');
    const snap = await db.collection('StudyGroups').where('status', '==', 'pending').get();
    
    list.innerHTML = snap.empty ? "<p class='text-slate-500 italic'>No pending groups.</p>" : "";
    
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `
            <div class="border border-slate-700 p-4 rounded-2xl flex justify-between items-center bg-slate-800/50">
                <span class="text-white font-bold">${d.name}</span>
                <button onclick="verifyGroup('${doc.id}')" class="text-emerald-400 font-black underline">APPROVE</button>
            </div>
        `;
    });
}

window.verifyGroup = async (id) => {
    await db.collection('StudyGroups').doc(id).update({ status: 'verified' });
    alert("Group is now Live! ✅");
    loadAdminPanel();
    loadVerifiedGroups();
};

async function loadVerifiedGroups() {
    const list = document.getElementById('groups-list');
    const snap = await db.collection('StudyGroups').where('status', '==', 'verified').get();
    list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `
            <div class="glass-card p-4 flex justify-between items-center border-l-4 border-emerald-500">
                <p class="font-bold italic">${d.name}</p>
                <a href="${d.link}" target="_blank" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black italic">JOIN</a>
            </div>
        `;
    });
}

function renderAcademics() {
    const pContainer = document.getElementById('study-pills');
    if(pContainer) {
        STUDY_CATEGORIES.forEach(cat => {
            pContainer.innerHTML += `<button class="whitespace-nowrap px-4 py-2 bg-white border border-emerald-100 rounded-full text-[10px] font-bold text-slate-500 shadow-sm">${cat}</button>`;
        });
    }
}

// Close Modal Logic
document.getElementById('close-modal').onclick = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
};
