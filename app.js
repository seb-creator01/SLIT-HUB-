import { DEPARTMENTS, EXECUTIVES, STUDY_CATEGORIES, UI_CONFIG } from './data.js';

// 1. INITIALIZE & HIDE SPLASH
window.addEventListener('DOMContentLoaded', () => {
    console.log("SLIT-HUB Engine Started...");
    
    // Simulate a professional load delay for the 'Glow' effect
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.classList.add('hidden'), 500);
    }, 1500);

    renderInitialData();
});

// 2. TAB SWITCHING LOGIC
window.switchTab = function(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    // Show selected tab
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    // Update Navigation UI
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-emerald-600', 'active');
        btn.classList.add('text-slate-400');
    });
    
    const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(activeBtn) {
        activeBtn.classList.add('text-emerald-600', 'active');
        activeBtn.classList.remove('text-slate-400');
    }
};

// 3. RENDER DATA FROM data.js
function renderInitialData() {
    // Render Study Category Pills
    const pillContainer = document.getElementById('study-pills');
    if(pillContainer) {
        STUDY_CATEGORIES.forEach(cat => {
            const pill = document.createElement('button');
            pill.className = "whitespace-nowrap px-4 py-2 bg-white border border-emerald-100 rounded-full text-[10px] font-bold text-slate-600 shadow-sm active:scale-95 transition-all";
            pill.innerText = cat;
            pillContainer.appendChild(pill);
        });
    }

    // Update Market Count placeholder
    const marketCount = document.getElementById('market-count');
    if(marketCount) marketCount.innerText = "Active ✨";
}

// 4. MODAL SYSTEM
window.openModal = function(type) {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    
    if(type === 'group-modal') {
        content.innerHTML = `
            <h3 class="text-xl font-black mb-4 italic">Create Study Group 📚</h3>
            <input type="text" placeholder="Course Title (e.g. MAT 201)" class="w-full p-4 bg-slate-50 rounded-2xl border-none mb-3">
            <input type="url" placeholder="WhatsApp Group Link" class="w-full p-4 bg-slate-50 rounded-2xl border-none mb-4">
            <button onclick="alert('Sent for Admin Verification! 🛡️')" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100">SUBMIT LINK</button>
        `;
    }
};

document.getElementById('close-modal').onclick = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
};

// 5. ADMIN PROTECTION
document.getElementById('admin-trigger').onclick = () => {
    const pass = prompt("Enter Developer Secret:");
    if(pass === UI_CONFIG.adminPassphrase) {
        switchTab('admin');
    } else {
        alert("Access Denied ❌");
    }
};

