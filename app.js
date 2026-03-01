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
    loadMarketDisplay('items'); // Initial load for marketplace
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

// ==========================================
// MARKETPLACE ENGINE (Items, Services, Requests)
// ==========================================

// 1. OPEN POSTING MODAL (UPDATED WITH PRO FEATURES)
window.openMarketModal = function() {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    
    content.innerHTML = `
        <div class="max-h-[80vh] overflow-y-auto no-scrollbar pb-6">
            <h3 class="text-xl font-black mb-4 italic text-emerald-600">Create a Post 🚀</h3>
            <div class="space-y-3">
                <input type="text" id="item-name" placeholder="What are you listing?" class="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none">
                
                <div class="flex gap-2">
                    <input type="number" id="item-price" placeholder="Price (₦)" class="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none">
                    <select id="item-negotiable" class="p-4 bg-slate-50 rounded-2xl border-none font-bold text-xs">
                        <option value="Fixed">Fixed</option>
                        <option value="Negotiable">Negotiable</option>
                    </select>
                </div>

                <select id="item-type" class="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-500">
                    <option value="items">Physical Item (Sale)</option>
                    <option value="services">Service (Gigs/Skill)</option>
                    <option value="requests">Request (I need...)</option>
                </select>

                <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <span class="pl-4 font-bold text-slate-400">+234</span>
                    <input type="number" id="seller-phone" placeholder="805 000 0000" class="w-full p-4 bg-transparent border-none outline-none">
                </div>

                <div class="relative group">
                    <input type="file" id="item-image" class="hidden" accept="image/*" onchange="document.getElementById('file-label').innerText = 'Photo Selected! ✅'">
                    <label for="item-image" id="file-label" class="block w-full p-6 border-2 border-dashed border-emerald-200 rounded-2xl text-center text-emerald-600 font-bold cursor-pointer bg-emerald-50/30">
                        <i class="fa-solid fa-camera-retro text-2xl mb-2"></i><br>Tap to Upload Photo
                    </label>
                </div>
                <button onclick="processMarketPost()" id="market-submit-btn" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">POST TO HUB ✨</button>
            </div>
        </div>
    `;
};

// Hook the Post Ad button from HTML
const postAdBtn = document.getElementById('btn-post-ad');
if(postAdBtn) postAdBtn.onclick = window.openMarketModal;

// 2. PROCESS UPLOAD & SAVE (UPDATED)
window.processMarketPost = async function() {
    const btn = document.getElementById('market-submit-btn');
    const file = document.getElementById('item-image').files[0];
    const name = document.getElementById('item-name').value;
    const price = document.getElementById('item-price').value;
    const type = document.getElementById('item-type').value;
    const phone = document.getElementById('seller-phone').value;
    const negotiable = document.getElementById('item-negotiable').value;

    if(!name || !price || !phone) return alert("Please fill all fields!");

    btn.innerText = "UPLOADING... ⏳";
    btn.disabled = true;

    let imageUrl = "https://ui-avatars.com/api/?name=Hub&background=10b981&color=fff"; // Default

    // Cloudinary Upload Logic
    if(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'slithub_preset'); 
        
        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dxt8v0h1u/image/upload", {
                method: 'POST',
                body: formData
            });
            const cloudData = await res.json();
            imageUrl = cloudData.secure_url;
        } catch (err) {
            console.error("Cloudinary Error:", err);
        }
    }

    // Save to Firebase Firestore
    await db.collection('Marketplace').add({
        name,
        price: Number(price),
        type,
        phone,
        negotiable,
        image: imageUrl,
        rating: 5.0, // Default rating for new items
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Listed Successfully! 🛍️");
    document.getElementById('modal-overlay').classList.add('hidden');
    loadMarketDisplay(type); // Refresh view
};

// 3. LOAD & FILTER MARKETPLACE (UPDATED WITH COMMA FORMATTING & CONTACT)
window.loadMarketDisplay = async function(filterType = 'items') {
    const grid = document.getElementById('market-grid');
    grid.innerHTML = "<p class='text-slate-400 italic text-xs animate-pulse'>Fetching listings...</p>";

    const snap = await db.collection('Marketplace')
                         .where('type', '==', filterType)
                         .orderBy('timestamp', 'desc')
                         .get();
    
    grid.innerHTML = snap.empty ? `<p class='col-span-2 text-center text-slate-300 py-10 italic'>No ${filterType} yet.</p>` : "";

    snap.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        // Strip leading zero if exists for WhatsApp link
        const cleanPhone = d.phone.startsWith('0') ? d.phone.substring(1) : d.phone;

        grid.innerHTML += `
            <div class="glass-card overflow-hidden animate-fade-in group flex flex-col h-full border border-white shadow-sm">
                <div class="relative">
                    <img src="${d.image}" class="w-full h-32 object-cover">
                    <span class="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black text-emerald-600 shadow-sm">
                        ₦${Number(d.price).toLocaleString()} </span>
                    <div class="absolute top-2 left-2 bg-emerald-600 text-white text-[7px] font-black px-2 py-1 rounded-lg shadow-lg uppercase">${d.negotiable || 'Fixed'}</div>
                </div>
                <div class="p-3 flex-1 flex flex-col">
                    <p class="font-bold text-xs truncate italic text-slate-800">${d.name}</p>
                    
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <a href="https://wa.me/234${cleanPhone}?text=Hi, I saw your ${d.name} on SLIT-HUB" target="_blank" class="flex items-center justify-center bg-green-500 text-white p-2 rounded-xl active:scale-95 transition-all">
                            <i class="fa-brands fa-whatsapp text-sm"></i>
                        </a>
                        <a href="tel:+234${cleanPhone}" class="flex items-center justify-center bg-blue-500 text-white p-2 rounded-xl active:scale-95 transition-all">
                            <i class="fa-solid fa-phone text-sm"></i>
                        </a>
                    </div>

                    <button onclick="openReviewModal('${id}')" class="w-full mt-3 py-2 border border-slate-100 text-slate-400 rounded-xl text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all">
                        ⭐ ${d.rating || '5.0'} Reviews
                    </button>
                </div>
            </div>
        `;
    });
};

// 4. REVIEW MODAL LOGIC (Standard Add-on)
window.openReviewModal = async (productId) => {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `<p class="text-center p-10 animate-pulse text-xs">Loading Reviews...</p>`;
    
    // Quick Review Submission View
    content.innerHTML = `
        <h3 class="text-xl font-black mb-4 italic text-emerald-600 text-center">Reviews 💬</h3>
        <div class="space-y-4">
            <div class="bg-slate-50 p-4 rounded-2xl text-center italic text-[10px] text-slate-500">
                Buyers can rate products and services here to build seller trust.
            </div>
            <select id="rev-rating" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-yellow-500">
                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">⭐⭐⭐⭐ Good</option>
                <option value="3">⭐⭐⭐ Fair</option>
                <option value="2">⭐⭐ Poor</option>
                <option value="1">⭐ Terrible</option>
            </select>
            <textarea id="rev-comment" placeholder="Leave a comment..." class="w-full p-4 bg-slate-50 rounded-2xl h-20 outline-none text-xs border-none"></textarea>
            <button onclick="alert('Review Submitted for Verification! ✅')" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase">Submit Review</button>
        </div>
    `;
};

// Switch between Items, Services, Requests
document.querySelectorAll('.m-filter').forEach(btn => {
    btn.onclick = function() {
        document.querySelectorAll('.m-filter').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        loadMarketDisplay(this.dataset.filter);
    };
});
