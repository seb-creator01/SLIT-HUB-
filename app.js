import { DEPARTMENTS, EXECUTIVES, STUDY_CATEGORIES, UI_CONFIG } from './data.js';

// ============================
// FIREBASE INIT
// ============================
const firebaseConfig = {
    apiKey: "AIzaSyAsS...", 
    authDomain: "slithub-17a41.firebaseapp.com",
    projectId: "slithub-17a41",
    storageBucket: "slithub-17a41.appspot.com",
    messagingSenderId: "1056588267605",
    appId: "1:1056588267605:web:0786..."
};

if(typeof firebase !== 'undefined') firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================
// MOBILE DEBUGGING
// ============================
window.onerror = function(message, source, lineno, colno, error) {
    console.error(`Error: ${message} at line ${lineno}`);
    return false;
};

// ============================
// BOOTUP
// ============================
window.addEventListener('DOMContentLoaded', () => {
    // Hide splash
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 500);
        }
    }, 1500);

    // Marketplace filter listeners
    document.querySelectorAll('.m-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-filter');
            document.querySelectorAll('.m-filter').forEach(b => b.classList.remove('active', 'bg-white', 'text-emerald-600', 'shadow-sm'));
            this.classList.add('active', 'bg-white', 'text-emerald-600', 'shadow-sm');
            loadMarketDisplay(type);
        });
    });

    renderAcademics();
    loadVerifiedGroups();
    loadMarketDisplay('items');
    loadAcademicMaterials();
    loadBroadcastMessage();
});

// ============================
// TAB NAVIGATION
// ============================
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-emerald-600','active');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if(activeBtn){
        activeBtn.classList.add('text-emerald-600','active');
        activeBtn.classList.remove('text-slate-400');
    }
};

// ============================
// ADMIN TRIGGER
// ============================
document.getElementById('admin-trigger').onclick = () => {
    const pass = prompt("Enter Developer Secret 🛡️:");
    if(pass === "junior123") {
        window.switchTab('admin');
        loadAdminPanel();
    } else alert("Access Denied ❌");
};

// ============================
// ACADEMICS
// ============================
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
            <select id="acad-type" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none">
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
            <textarea id="acad-desc" placeholder="Details/Instructions..." class="w-full p-4 bg-slate-50 rounded-2xl border-none h-24 text-xs outline-none"></textarea>

            <div class="relative group">
                <input type="file" id="acad-file" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('acad-file-label').innerText='File Selected! ✅'">
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

    if(!title || !desc) return alert("Fill Title & Description!");

    btn.innerHTML = `<i class="fa-solid fa-bolt animate-pulse"></i> PREPARING...`;
    btn.disabled = true;

    let fileUrl = "";
    if(file){
        try{
            let uploadBlob = file;
            if(file.type.startsWith('image/')) uploadBlob = await compressImage(file,0.5,500);

            const formData = new FormData();
            formData.append('file', uploadBlob);
            formData.append('upload_preset', 'SLIT-HUB');

            const res = await fetch("https://api.cloudinary.com/v1_1/ddm87a9p2/image/upload", {
                method:'POST', body: formData
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error?.message || "Cloudinary Failed");
            fileUrl = data.secure_url;
        } catch(err){
            console.error(err);
            btn.disabled = false;
            btn.innerText = "RETRY PUBLISH";
            return alert(`Upload Error: ${err.message}`);
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
    },500);
};

window.loadAcademicMaterials = async function(levelFilter='all'){
    const container = document.getElementById('academic-list');
    if(!container) return;
    container.innerHTML = "<p class='text-center p-10 animate-pulse text-xs text-slate-400'>Loading...</p>";

    let query = db.collection('Academics').orderBy('timestamp','desc');
    if(levelFilter!=='all') query = query.where('level','==',levelFilter);

    const snap = await query.get();
    container.innerHTML = snap.empty ? "<p class='text-center text-slate-300 py-10 italic'>No updates.</p>": "";

    snap.forEach(doc=>{
        const d = doc.data();
        const icon = d.type==='exam'?'🎓':d.type==='test'?'📝':d.type==='lecture'?'📅':'📚';
        container.innerHTML += `
            <div class="glass-card p-4 mb-3 border-l-4 border-emerald-500 animate-fade-in">
                <div class="flex justify-between items-start mb-2">
                    <span class="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded-md uppercase">${d.level}L</span>
                    <span class="text-lg">${icon}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-800">${d.title}</h4>
                <p class="text-[11px] text-slate-500 mt-1">${d.desc}</p>
                ${d.fileUrl?`<a href="${d.fileUrl}" target="_blank" class="inline-block mt-3 text-emerald-600 font-black text-[9px] underline">VIEW ATTACHMENT <i class="fa-solid fa-up-right-from-square"></i></a>`:""}
            </div>
        `;
    });
};

// ============================
// RENDER ACADEMICS
// ============================
function renderAcademics() {
    console.log("Academics section rendered");
}

// ============================
// STUDY GROUPS
// ============================
window.openGroupModal = function(){
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
        <h3 class="text-xl font-black mb-4 italic text-emerald-600">New Study Group 📚</h3>
        <input type="text" id="group-name" placeholder="Course Name" class="w-full p-4 bg-slate-50 rounded-2xl mb-3 border-none outline-none">
        <input type="url" id="group-link" placeholder="WhatsApp Link" class="w-full p-4 bg-slate-50 rounded-2xl mb-4 border-none outline-none">
        <button onclick="submitToFirebase()" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">SUBMIT</button>
    `;
};

const studyBtn = document.getElementById('btn-new-group');
if(studyBtn) studyBtn.onclick = window.openGroupModal;

window.submitToFirebase = async()=>{
    const name = document.getElementById('group-name').value;
    const link = document.getElementById('group-link').value;
    if(!name||!link) return alert("Fill all fields!");

    await db.collection('StudyGroups').add({
        name, link, status:'pending', timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Sent! Junior will verify 🚀");
    document.getElementById('modal-overlay').classList.add('hidden');
};

// Admin panel
async function loadAdminPanel(){
    const list = document.getElementById('admin-verification-list');
    const snap = await db.collection('StudyGroups').where('status','==','pending').get();
    list.innerHTML = snap.empty? "<p class='text-slate-500 italic'>No pending groups.</p>" : "";
    snap.forEach(doc=>{
        const d = doc.data();
        list.innerHTML += `
            <div class="border p-4 rounded-2xl flex justify-between items-center bg-slate-800/50 mb-2">
                <span class="text-white font-bold">${d.name}</span>
                <button onclick="verifyGroup('${doc.id}')" class="text-emerald-400 font-black underline">APPROVE</button>
            </div>
        `;
    });
}

window.verifyGroup = async (id)=>{
    await db.collection('StudyGroups').doc(id).update({status:'verified'});
    alert("Group is now Live! ✅");
    loadAdminPanel();
    loadVerifiedGroups();
};

async function loadVerifiedGroups(){
    const list = document.getElementById('groups-list');
    if(!list) return;
    const snap = await db.collection('StudyGroups').where('status','==','verified').get();
    list.innerHTML = "";
    snap.forEach(doc=>{
        const d = doc.data();
        list.innerHTML += `
            <div class="glass-card p-4 flex justify-between items-center border-l-4 border-emerald-50">
                <p class="font-bold italic">${d.name}</p>
                <a href="${d.link}" target="_blank" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black italic">JOIN</a>
            </div>
        `;
    });
}

// ============================
// MARKETPLACE (MOBILE OPTIMIZED)
// ============================
window.openMarketModal = function(){
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
        <div class="max-h-[80vh] overflow-y-auto pb-6">
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
                <select id="item-type" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-500">
                    <option value="items">Physical Item (Sale)</option>
                    <option value="services">Service (Gigs/Skill)</option>
                    <option value="requests">Request (I need...)</option>
                </select>
                <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <span class="pl-4 font-bold text-slate-400">+234</span>
                    <input type="number" id="seller-phone" placeholder="805 000 0000" class="w-full p-4 bg-transparent border-none outline-none">
                </div>
                <div class="relative group">
                    <input type="file" id="item-image" class="hidden" accept="image/*" onchange="document.getElementById('file-label').innerHTML = '<i class=\\'fa-solid fa-check-circle\\'></i> Photo Selected! ✅'">
                    <label for="item-image" id="file-label" class="block w-full p-6 border-2 border-dashed border-emerald-200 rounded-2xl text-center text-emerald-600 font-bold cursor-pointer bg-emerald-50/30">
                        <i class="fa-solid fa-camera-retro text-2xl mb-2"></i><br>Tap to Upload Photo
                    </label>
                </div>
                <button onclick="processMarketPost()" id="market-submit-btn" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">POST TO HUB ✨</button>
            </div>
        </div>
    `;
};

const postAdBtn = document.getElementById('btn-post-ad');
if(postAdBtn) postAdBtn.onclick = window.openMarketModal;

window.processMarketPost = async function(){
    const btn = document.getElementById('market-submit-btn');
    const fileInput = document.getElementById('item-image');
    const file = fileInput.files[0];
    const name = document.getElementById('item-name').value;
    const price = document.getElementById('item-price').value;
    const type = document.getElementById('item-type').value;
    const phone = document.getElementById('seller-phone').value;
    const negotiable = document.getElementById('item-negotiable').value;

    if(!name||!price||!phone) return alert("Fill all fields!");

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-pulse"></i> UPLOADING...`;
    btn.disabled = true;

    let imageUrl = "https://ui-avatars.com/api/?name=Hub&background=10b981&color=fff";

    if(file){
        // Check file size (max 5MB for mobile)
        if(file.size > 5 * 1024 * 1024) {
            alert("Image too large (max 5MB). Please use a smaller image.");
            btn.innerHTML = "POST TO HUB ✨";
            btn.disabled = false;
            return;
        }
        
        try{
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'SLIT-HUB');
            
            // Show uploading status
            btn.innerHTML = `<i class="fa-solid fa-cloud-upload-alt fa-pulse"></i> UPLOADING TO CLOUD...`;
            
            // Upload to Cloudinary with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const res = await fetch("https://api.cloudinary.com/v1_1/ddm87a9p2/image/upload", {
                method:'POST', 
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const data = await res.json();
            
            if(!res.ok) {
                throw new Error(data.error?.message || "Upload failed");
            }
            
            imageUrl = data.secure_url;
            console.log("Upload success:", imageUrl);
            
        } catch(err){
            console.error("Upload Error:", err);
            
            let errorMsg = "Upload failed. ";
            if(err.name === 'AbortError') {
                errorMsg += "Connection timeout. Please check your internet and try again.";
            } else if(err.message.includes("network")) {
                errorMsg += "Network error. Check your internet connection.";
            } else {
                errorMsg += err.message;
            }
            
            alert(errorMsg);
            btn.innerHTML = "RETRY POST";
            btn.disabled = false;
            return;
        }
    }

    try {
        btn.innerHTML = `<i class="fa-solid fa-save"></i> SAVING...`;
        
        await db.collection('Marketplace').add({
            name, 
            price: Number(price), 
            type, 
            phone, 
            negotiable, 
            image: imageUrl,
            rating: 5.0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        btn.innerHTML = "SUCCESS! 🎉";
        
        setTimeout(()=>{
            document.getElementById('modal-overlay').classList.add('hidden');
            loadMarketDisplay(type);
            // Reset form
            if(fileInput) fileInput.value = '';
            const fileLabel = document.getElementById('file-label');
            if(fileLabel) {
                fileLabel.innerHTML = '<i class="fa-solid fa-camera-retro text-2xl mb-2"></i><br>Tap to Upload Photo';
            }
        }, 500);
        
    } catch(err) {
        console.error("Firebase Error:", err);
        alert("Failed to save: " + err.message);
        btn.innerHTML = "RETRY POST";
        btn.disabled = false;
    }
};

// ============================
// BROADCAST
// ============================
document.getElementById('btn-broadcast')?.addEventListener('click',async()=>{
    const msg = prompt("Enter broadcast message:");
    if(!msg) return alert("Cannot be empty!");

    await db.collection('Broadcasts').add({
        message:msg,
        timestamp:firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Broadcast sent 🚀");
    loadBroadcastMessage();
});

async function loadBroadcastMessage() {
    const msgContainer = document.getElementById('broadcast-msg');
    if (!msgContainer) return;

    const snap = await db.collection('Broadcasts')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

    if (snap.empty) {
        msgContainer.innerText = "No announcements yet.";
    } else {
        snap.forEach(doc => {
            const data = doc.data();
            msgContainer.innerText = data.message;
        });
    }
}

// ============================
// MARKETPLACE DISPLAY
// ============================
window.loadMarketDisplay = async function(type='items') {
    const grid = document.getElementById('market-grid');
    if (!grid) return;

    grid.innerHTML = "<p class='text-center py-10 text-slate-400 animate-pulse'>Loading...</p>";

    const snap = await db.collection('Marketplace')
        .where('type', '==', type)
        .orderBy('timestamp', 'desc')
        .get();

    grid.innerHTML = snap.empty ? "<p class='text-center py-10 text-slate-400 italic'>No posts yet.</p>" : "";

    snap.forEach(doc => {
        const data = doc.data();
        grid.innerHTML += `
            <div class="glass-card p-4 border-l-4 border-emerald-500 animate-fade-in">
                <img src="${data.image}" class="w-full h-32 object-cover rounded-xl mb-2" onerror="this.src='https://ui-avatars.com/api/?name=Hub&background=10b981&color=fff'">
                <h4 class="font-bold text-sm text-slate-800">${data.name}</h4>
                <p class="text-xs text-slate-500 mt-1">₦${data.price} | ${data.negotiable}</p>
                <p class="text-[10px] italic text-slate-400 mt-1">Call: ${data.phone}</p>
            </div>
        `;
    });

    // Update market count
    const countEl = document.getElementById('market-count');
    if(countEl) countEl.innerText = snap.size;
};

// ============================
// LEVEL FILTERS FOR ACADEMICS
// ============================
window.filterByLevel = function(level='all') {
    document.querySelectorAll('.lvl-btn').forEach(btn => btn.classList.remove('active-lvl'));
    document.querySelector(`.lvl-btn[data-level="${level}"]`)?.classList.add('active-lvl');
    loadAcademicMaterials(level);
};

// ============================
// HELPER: COMPRESS IMAGE
// ============================
async function compressImage(file, quality=0.6, maxWidth=800) {
    return new Promise((resolve, reject) => {
        // If it's not an image, resolve with original
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        
        reader.onerror = (err) => {
            console.error("FileReader error:", err);
            reject(err);
        };
        
        reader.readAsDataURL(file);
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas to Blob failed"));
                        return;
                    }
                    resolve(blob);
                }, 'image/jpeg', quality);
            } catch(err) {
                console.error("Compression error:", err);
                reject(err);
            }
        };
        
        img.onerror = (err) => {
            console.error("Image load error:", err);
            reject(new Error("Failed to load image"));
        };
    });
}

// ============================
// MODAL CLOSE
// ============================
document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
});

// ============================
// INITIAL LOADS
// ============================
loadAcademicMaterials();
loadVerifiedGroups();
loadMarketDisplay('items');
loadBroadcastMessage();
