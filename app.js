import { DEPARTMENTS, EXECUTIVES, STUDY_CATEGORIES, UI_CONFIG } from './data.js';

// 1. INITIALIZE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAsS...", 
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
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 500);
        }
    }, 1500);

    renderAcademics();
    loadVerifiedGroups();
    loadMarketDisplay('items'); 
    loadAcademicMaterials();
});

// 3. TAB NAVIGATION
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-emerald-600', 'active');
        btn.classList.add('text-slate-400');
    });
    
    const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(activeBtn) activeBtn.classList.add('text-emerald-600', 'active');
};

// 4. ADMIN TRIGGER
document.getElementById('admin-trigger').onclick = () => {
    const pass = prompt("Enter Developer Secret 🛡️:");
    if(pass === "junior123") {
        window.switchTab('admin');
        loadAdminPanel();
    } else {
        alert("Access Denied ❌");
    }
};

// ==========================================
// ACADEMIC HUB
// ==========================================

window.openAcademicModal = function() {
    const isRep = confirm("Are you a Course Rep? 🎓\nOnly Reps can post Schedules, Tests, and Exams.");
    if(!isRep) return;

    const repKey = prompt("Enter Course Rep Secret Key:");
    if(repKey !== "REP2026") return alert("Unauthorized Key! ❌");

    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    
    content.innerHTML = `
        <h3 class="text-xl font-black mb-4 italic text-emerald-600">Post Academic Update 📖</h3>
        <div class="space-y-3">
            <select id="acad-type" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
                <option value="lecture">📅 Lecture Schedule</option>
                <option value="test">📝 Upcoming Test</option>
                <option value="exam">🎓 Exam Update</option>
                <option value="material">📚 Material/Past Question</option>
            </select>
            <select id="acad-level" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
            </select>
            <input type="text" id="acad-title" placeholder="Course Code (e.g. GST 111)" class="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none">
            <textarea id="acad-desc" placeholder="Details/Instructions..." class="w-full p-4 bg-slate-50 rounded-2xl border-none h-24 outline-none text-xs"></textarea>
            <div class="relative group">
                <input type="file" id="acad-file" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('acad-file-label').innerText = 'File Selected! ✅'">
                <label for="acad-file" id="acad-file-label" class="block w-full p-6 border-2 border-dashed border-emerald-200 rounded-2xl text-center text-emerald-600 font-bold cursor-pointer">
                    Upload PDF or Picture
                </label>
            </div>
            <button onclick="processAcademicPost()" id="acad-submit-btn" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">PUBLISH TO HUB 🚀</button>
        </div>
    `;
};

window.processAcademicPost = async function() {
    const btn = document.getElementById('acad-submit-btn');
    const file = document.getElementById('acad-file').files[0];
    const type = document.getElementById('acad-type').value;
    const level = document.getElementById('acad-level').value;
    const title = document.getElementById('acad-title').value;
    const desc = document.getElementById('acad-desc').value;

    if(!title || !desc) return alert("Please fill Title and Description!");

    btn.innerHTML = `<i class="fa-solid fa-bolt animate-pulse"></i> PREPARING...`;
    btn.disabled = true;

    let fileUrl = "";
    if(file) {
        try {
            let uploadBlob = file;
            if (file.type.startsWith('image/')) {
                uploadBlob = await compressImage(file, 0.5, 500);
            }

            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up animate-bounce"></i> SYNCING...`;
            
            const formData = new FormData();
            formData.append('file', uploadBlob);
            formData.append('upload_preset', 'SLIT-HUB');
            
            // CLEAN FETCH CALL FOR UNSIGNED UPLOADS
            const res = await fetch("https://api.cloudinary.com/v1_1/ddm87a9p2/auto/upload", {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error.message);
            fileUrl = data.secure_url;
        } catch (err) { 
            console.error(err); 
            btn.disabled = false;
            btn.innerText = "RETRY PUBLISH";
            return alert(`Error: ${err.message}`);
        }
    }

    await db.collection('Academics').add({
        type, level, title, desc, fileUrl,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    btn.innerText = "SUCCESS! 🎉";
    setTimeout(() => {
        document.getElementById('modal-overlay').classList.add('hidden');
        loadAcademicMaterials();
    }, 500);
};

window.loadAcademicMaterials = async function(levelFilter = 'all') {
    const container = document.getElementById('academic-list');
    if(!container) return;
    container.innerHTML = "<p class='text-center p-10 animate-pulse text-xs text-slate-400'>Loading Resources...</p>";
    let query = db.collection('Academics').orderBy('timestamp', 'desc');
    if(levelFilter !== 'all') query = query.where('level', '==', levelFilter);
    const snap = await query.get();
    container.innerHTML = snap.empty ? "<p class='text-center text-slate-300 py-10 italic'>No updates.</p>" : "";
    snap.forEach(doc => {
        const d = doc.data();
        const icon = d.type === 'exam' ? '🎓' : d.type === 'test' ? '📝' : d.type === 'lecture' ? '📅' : '📚';
        container.innerHTML += `
            <div class="glass-card p-4 mb-3 border-l-4 border-emerald-500 animate-fade-in">
                <div class="flex justify-between items-start mb-2">
                    <span class="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded-md uppercase">${d.level}L</span>
                    <span class="text-lg">${icon}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-800">${d.title}</h4>
                <p class="text-[11px] text-slate-500 mt-1">${d.desc}</p>
                ${d.fileUrl ? `<a href="${d.fileUrl}" target="_blank" class="inline-block mt-3 text-emerald-600 font-black text-[9px] underline">VIEW ATTACHMENT <i class="fa-solid fa-up-right-from-square"></i></a>` : ''}
            </div>`;
    });
};

window.filterByLevel = function(level) {
    document.querySelectorAll('.lvl-btn').forEach(btn => {
        btn.classList.remove('active-lvl');
        if(btn.dataset.level === level) btn.classList.add('active-lvl');
    });
    loadAcademicMaterials(level);
};

// ==========================================
// STUDY GROUP LOGIC
// ==========================================
window.openGroupModal = function() {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    content.innerHTML = `
        <h3 class="text-xl font-black mb-4 italic text-emerald-600">New Study Group 📚</h3>
        <input type="text" id="group-name" placeholder="Course Name" class="w-full p-4 bg-slate-50 rounded-2xl mb-3 border-none outline-none">
        <input type="url" id="group-link" placeholder="WhatsApp Link" class="w-full p-4 bg-slate-50 rounded-2xl mb-4 border-none outline-none">
        <button onclick="submitToFirebase()" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">SUBMIT FOR VERIFICATION</button>`;
};

const studyBtn = document.getElementById('btn-new-group');
if(studyBtn) studyBtn.onclick = window.openGroupModal;

window.submitToFirebase = async () => {
    const name = document.getElementById('group-name').value;
    const link = document.getElementById('group-link').value;
    if(!name || !link) return alert("Please fill all fields!");
    await db.collection('StudyGroups').add({
        name, link, status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Sent for verification! 🚀");
    document.getElementById('modal-overlay').classList.add('hidden');
};

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
            </div>`;
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
            </div>`;
    });
}

// ==========================================
// MARKETPLACE ENGINE
// ==========================================

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
                    <label for="item-image" id="file-label" class="block w-full p-6 border-2 border-dashed border-emerald-200 rounded-2xl text-center text-emerald-600 font-bold cursor-pointer">
                        Tap to Upload Photo
                    </label>
                </div>
                <button onclick="processMarketPost()" id="market-submit-btn" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">POST TO HUB ✨</button>
            </div>
        </div>`;
};

const postAdBtn = document.getElementById('btn-post-ad');
if(postAdBtn) postAdBtn.onclick = window.openMarketModal;

window.processMarketPost = async function() {
    const btn = document.getElementById('market-submit-btn');
    const file = document.getElementById('item-image').files[0];
    const name = document.getElementById('item-name').value;
    const price = document.getElementById('item-price').value;
    const type = document.getElementById('item-type').value;
    const phone = document.getElementById('seller-phone').value;
    const negotiable = document.getElementById('item-negotiable').value;

    if(!name || !price || !phone) return alert("Please fill all fields!");

    btn.innerHTML = `<i class="fa-solid fa-bolt animate-pulse"></i> SENDING...`;
    btn.disabled = true;

    let imageUrl = "https://ui-avatars.com/api/?name=Hub&background=10b981&color=fff"; 

    if(file) {
        try {
            const compressedBlob = await compressImage(file, 0.5, 500);
            const formData = new FormData();
            formData.append('file', compressedBlob);
            formData.append('upload_preset', 'SLIT-HUB'); 
            
            const res = await fetch("https://api.cloudinary.com/v1_1/ddm87a9p2/image/upload", {
                method: 'POST',
                body: formData
            });

            const cloudData = await res.json();
            if (!res.ok) throw new Error(cloudData.error.message);
            imageUrl = cloudData.secure_url;
        } catch (err) {
            console.error(err);
            btn.innerText = "RETRY POST";
            btn.disabled = false;
            return alert(`Error: ${err.message}`);
        }
    }

    await db.collection('Marketplace').add({
        name, price: Number(price), type, phone, negotiable,
        image: imageUrl, rating: 5.0, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    btn.innerHTML = "DONE! 🚀";
    setTimeout(() => {
        document.getElementById('modal-overlay').classList.add('hidden');
        loadMarketDisplay(type);
    }, 500);
};

// IMAGE COMPRESSION
async function compressImage(file, quality = 0.5, maxWidth = 500) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
            };
        };
    });
}

window.loadMarketDisplay = async function(filterType = 'items') {
    const grid = document.getElementById('market-grid');
    if(!grid) return;
    grid.innerHTML = "<p class='text-slate-400 italic text-xs animate-pulse'>Fetching...</p>";
    const snap = await db.collection('Marketplace').where('type', '==', filterType).orderBy('timestamp', 'desc').get();
    grid.innerHTML = snap.empty ? `<p class='col-span-2 text-center text-slate-300 py-10'>No items.</p>` : "";
    snap.forEach(doc => {
        const d = doc.data();
        const cleanPhone = d.phone.startsWith('0') ? d.phone.substring(1) : d.phone;
        grid.innerHTML += `
            <div class="glass-card overflow-hidden flex flex-col h-full border border-white shadow-sm">
                <img src="${d.image}" class="w-full h-32 object-cover">
                <div class="p-3 flex-1 flex flex-col">
                    <p class="font-bold text-xs truncate">₦${Number(d.price).toLocaleString()} - ${d.name}</p>
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <a href="https://wa.me/234${cleanPhone}" target="_blank" class="bg-green-500 text-white p-2 rounded-xl text-center"><i class="fa-brands fa-whatsapp"></i></a>
                        <a href="tel:+234${cleanPhone}" class="bg-blue-500 text-white p-2 rounded-xl text-center"><i class="fa-solid fa-phone"></i></a>
                    </div>
                </div>
            </div>`;
    });
};

function renderAcademics() {
    const pContainer = document.getElementById('study-pills');
    if(pContainer) {
        STUDY_CATEGORIES.forEach(cat => {
            pContainer.innerHTML += `<button class="whitespace-nowrap px-4 py-2 bg-white border border-emerald-100 rounded-full text-[10px] font-bold text-slate-500">${cat}</button>`;
        });
    }
}

document.getElementById('close-modal').onclick = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
};
