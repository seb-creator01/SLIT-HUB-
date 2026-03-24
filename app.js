Import { DEPARTMENTS, EXECUTIVES, STUDY_CATEGORIES, UI_CONFIG } from './data.js';

// ============================
// FIREBASE CONFIG
// ============================
const firebaseConfig = {
    apiKey: "AIzaSyCpsDTN-NTkTFmbwg3T6vv9H4eE_YXQdZA",
    authDomain: "slit-hub.firebaseapp.com",
    projectId: "slit-hub",
    storageBucket: "slit-hub.firebasestorage.app",
    messagingSenderId: "347194010969",
    appId: "1:347194010969:web:a45af2e8d1627ac2593048",
    measurementId: "G-CLFWJSG5H1"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// ============================
// CLOUDINARY UPLOAD
// ============================
const CLOUDINARY_UPLOAD_PRESET = "sebastian_preset";

async function uploadFile(file) {
    const isPDF = file.type === 'application/pdf';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    const uploadUrl = isPDF 
        ? "https://api.cloudinary.com/v1_1/dwsc9eumf/raw/upload"
        : "https://api.cloudinary.com/v1_1/dwsc9eumf/image/upload";
    
    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
    }
    
    return data.secure_url;
}

// ============================
// GLOBAL VARIABLES
// ============================
let currentUser = null;
let currentUserData = null;
let allMarketplaceProducts = [];

// ============================
// BOOTUP - Wait for auth
// ============================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 500);
        }
    }, 1500);

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
// AUTH STATE LISTENER
// ============================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        if (!user.emailVerified) {
            await auth.signOut();
            return;
        }
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
        } else {
            currentUserData = {
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                phone: '',
                department: '',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=10b981&color=fff`,
                createdAt: new Date().toISOString(),
                isAdmin: user.email === 'precioussebastian70@gmail.com',
                isVerified: false,
                isBanned: false
            };
            await db.collection('users').doc(user.uid).set(currentUserData);
        }
        
        // Update UI
        document.getElementById('user-name').innerText = currentUserData.name;
        document.getElementById('user-avatar').src = currentUserData.avatar;
        
        if (currentUserData.isAdmin) {
            document.getElementById('admin-trigger').style.display = 'block';
        }
        
        // Load departments for filter
        loadDepartmentsForFilter();
        
        // Load all data
        loadMarketDisplay('items');
        loadAcademicMaterials();
        loadVerifiedGroups();
        loadBroadcastMessage();
        
        // Check user posts for dashboard button
        checkUserPosts();
    }
});

// Check if user has any posts
async function checkUserPosts() {
    if (!currentUser) return;
    const snap = await db.collection('Marketplace').where('userId', '==', currentUser.uid).limit(1).get();
    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.style.display = snap.size > 0 ? 'block' : 'none';
    }
}

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
    
    // Load admin data if admin tab opened and user is admin
    if (tabId === 'admin' && currentUserData && currentUserData.isAdmin) {
        loadAdminStats();
        loadAllUsers();
        loadDepartmentsList();
        loadAdminPanel();
    }
};

// ============================
// ADMIN TRIGGER (for existing admin panel)
// ============================
document.getElementById('admin-trigger').onclick = () => {
    if (currentUserData && currentUserData.isAdmin) {
        window.switchTab('admin');
    } else {
        alert("Access Denied ❌");
    }
};

// ============================
// DASHBOARD FUNCTIONS
// ============================
window.openDashboard = async function() {
    if (!currentUser) return;
    
    const dashboardModal = document.getElementById('dashboard-modal');
    const dashboardContent = document.getElementById('dashboard-content');
    
    dashboardModal.style.display = 'flex';
    
    const postsSnap = await db.collection('Marketplace').where('userId', '==', currentUser.uid).get();
    const posts = postsSnap.docs;
    
    if (posts.length === 0) {
        dashboardContent.innerHTML = `
            <h3 class="text-xl font-bold mb-4">My Dashboard</h3>
            <p class="text-slate-500 text-center py-8">You haven't posted anything yet.</p>
            <button onclick="closeDashboardModal()" class="w-full bg-emerald-600 text-white py-3 rounded-xl mt-4 font-bold">Close</button>
        `;
        return;
    }
    
    let postsHtml = '<h3 class="text-xl font-bold mb-4">My Listings</h3>';
    posts.forEach(doc => {
        const p = doc.data();
        postsHtml += `
            <div class="border rounded-xl p-3 mb-3">
                <div class="flex gap-3">
                    <img src="${p.image}" class="w-16 h-16 object-cover rounded-lg">
                    <div class="flex-1">
                        <h4 class="font-bold text-sm">${escapeHtml(p.name)}</h4>
                        <p class="text-xs text-emerald-600 font-bold">₦${p.price}</p>
                        <p class="text-[10px] text-slate-500">${p.condition || 'No condition'} | ${p.category || 'Uncategorized'}</p>
                        ${p.isSold ? '<span class="text-xs text-red-500 font-bold">SOLD</span>' : ''}
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button onclick="editProduct('${doc.id}')" class="flex-1 bg-blue-500 text-white py-1 rounded-lg text-xs">Edit</button>
                    <button onclick="markAsSold('${doc.id}')" class="flex-1 bg-orange-500 text-white py-1 rounded-lg text-xs">Mark Sold</button>
                    <button onclick="deleteProduct('${doc.id}')" class="flex-1 bg-red-500 text-white py-1 rounded-lg text-xs">Delete</button>
                </div>
            </div>
        `;
    });
    
    dashboardContent.innerHTML = postsHtml + '<button onclick="closeDashboardModal()" class="w-full mt-4 bg-slate-200 py-2 rounded-xl font-bold">Close</button>';
};

window.closeDashboardModal = function() {
    document.getElementById('dashboard-modal').style.display = 'none';
};

window.editProduct = async function(productId) {
    const doc = await db.collection('Marketplace').doc(productId).get();
    const data = doc.data();
    
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    
    content.innerHTML = `
        <h3 class="text-xl font-black mb-4 italic text-emerald-600">Edit Product ✏️</h3>
        <div class="space-y-3">
            <input type="text" id="edit-name" value="${escapeHtml(data.name)}" placeholder="Product name" class="w-full p-3 bg-slate-50 rounded-xl">
            <input type="number" id="edit-price" value="${data.price}" placeholder="Price" class="w-full p-3 bg-slate-50 rounded-xl">
            <textarea id="edit-desc" placeholder="Description" rows="3" class="w-full p-3 bg-slate-50 rounded-xl">${escapeHtml(data.description || '')}</textarea>
            <select id="edit-condition" class="w-full p-3 bg-slate-50 rounded-xl">
                <option value="New" ${data.condition === 'New' ? 'selected' : ''}>New</option>
                <option value="Like New" ${data.condition === 'Like New' ? 'selected' : ''}>Like New</option>
                <option value="Used" ${data.condition === 'Used' ? 'selected' : ''}>Used</option>
            </select>
            <select id="edit-category" class="w-full p-3 bg-slate-50 rounded-xl">
                <option value="Electronics" ${data.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
                <option value="Books" ${data.category === 'Books' ? 'selected' : ''}>Books</option>
                <option value="Fashion" ${data.category === 'Fashion' ? 'selected' : ''}>Fashion</option>
                <option value="Food" ${data.category === 'Food' ? 'selected' : ''}>Food</option>
                <option value="Accommodation" ${data.category === 'Accommodation' ? 'selected' : ''}>Accommodation</option>
            </select>
            <button onclick="saveEdit('${productId}')" class="w-full bg-emerald-600 text-white py-3 rounded-xl font-black">SAVE CHANGES</button>
        </div>
    `;
};

window.saveEdit = async function(productId) {
    const name = document.getElementById('edit-name').value;
    const price = document.getElementById('edit-price').value;
    const description = document.getElementById('edit-desc').value;
    const condition = document.getElementById('edit-condition').value;
    const category = document.getElementById('edit-category').value;
    
    await db.collection('Marketplace').doc(productId).update({
        name, price: Number(price), description, condition, category,
        updatedAt: new Date().toISOString()
    });
    
    document.getElementById('modal-overlay').classList.add('hidden');
    alert('Product updated!');
    openDashboard();
    loadMarketDisplay('items');
};

window.markAsSold = async function(productId) {
    await db.collection('Marketplace').doc(productId).update({ isSold: true });
    alert('Marked as sold!');
    openDashboard();
    loadMarketDisplay('items');
};

window.deleteProduct = async function(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        await db.collection('Marketplace').doc(productId).delete();
        alert('Product deleted!');
        openDashboard();
        loadMarketDisplay('items');
    }
};

// ============================
// RATING FUNCTIONS
// ============================
let currentRatingProductId = null;

window.openRatingModal = function(productId) {
    currentRatingProductId = productId;
    document.getElementById('rating-modal').style.display = 'flex';
};

window.closeRatingModal = function() {
    document.getElementById('rating-modal').style.display = 'none';
};

window.submitRating = async function() {
    const rating = document.querySelector('input[name="rating"]:checked');
    const phone = document.getElementById('rating-phone').value;
    
    if (!rating) {
        alert('Please select a rating');
        return;
    }
    if (!phone) {
        alert('Please enter your phone number');
        return;
    }
    
    const productRef = db.collection('Marketplace').doc(currentRatingProductId);
    
    await db.collection('Ratings').add({
        productId: currentRatingProductId,
        rating: parseInt(rating.value),
        phone: phone,
        userId: currentUser ? currentUser.uid : null,
        timestamp: new Date().toISOString()
    });
    
    const ratingsSnap = await db.collection('Ratings').where('productId', '==', currentRatingProductId).get();
    let total = 0;
    ratingsSnap.forEach(r => total += r.data().rating);
    const avgRating = total / ratingsSnap.size;
    
    await productRef.update({ avgRating: avgRating, ratingCount: ratingsSnap.size });
    
    alert('Thank you for rating!');
    closeRatingModal();
    loadMarketDisplay('items');
};

// ============================
// COMMENT FUNCTIONS
// ============================
let currentCommentProductId = null;

window.openCommentModal = function(productId) {
    currentCommentProductId = productId;
    document.getElementById('comment-modal').style.display = 'flex';
};

window.closeCommentModal = function() {
    document.getElementById('comment-modal').style.display = 'none';
};

window.submitComment = async function() {
    const name = document.getElementById('comment-name').value || currentUserData?.name || 'Anonymous';
    const comment = document.getElementById('comment-text').value;
    
    if (!comment) {
        alert('Please write a comment');
        return;
    }
    
    await db.collection('Comments').add({
        productId: currentCommentProductId,
        name: name,
        comment: comment,
        userId: currentUser ? currentUser.uid : null,
        timestamp: new Date().toISOString()
    });
    
    alert('Comment posted!');
    closeCommentModal();
    loadMarketDisplay('items');
};

// ============================
// SEARCH & FILTER FUNCTIONS
// ============================
window.filterMarketplace = function() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const category = document.getElementById('filter-category')?.value || 'all';
    const condition = document.getElementById('filter-condition')?.value || 'all';
    const priceRange = document.getElementById('filter-price')?.value || 'all';
    
    let filtered = [...allMarketplaceProducts];
    
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
    }
    if (condition !== 'all') {
        filtered = filtered.filter(p => p.condition === condition);
    }
    if (priceRange !== 'all') {
        const [min, max] = priceRange.split('-');
        if (max) {
            filtered = filtered.filter(p => p.price >= parseInt(min) && p.price <= parseInt(max));
        } else {
            filtered = filtered.filter(p => p.price >= parseInt(min));
        }
    }
    
    renderMarketplaceGrid(filtered);
};

function renderMarketplaceGrid(products) {
    const grid = document.getElementById('market-grid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = "<p class='text-center py-10 text-slate-400 italic'>No products found.</p>";
        return;
    }
    
    grid.innerHTML = "";
    products.forEach(product => {
        const isSold = product.isSold || false;
        const avgRating = product.avgRating || 0;
        const userPhone = currentUserData?.phone || product.phone;
        const formattedPhone = userPhone ? userPhone.replace(/\D/g, '') : '';
        const countryCode = '234';
        const fullPhone = formattedPhone.startsWith('0') ? countryCode + formattedPhone.substring(1) : countryCode + formattedPhone;
        
        grid.innerHTML += `
            <div class="glass-card p-4 border-l-4 border-emerald-500 animate-fade-in relative">
                ${isSold ? '<div class="sold-badge">SOLD</div>' : ''}
                <img src="${product.image}" class="w-full h-32 object-cover rounded-xl mb-2" onerror="this.src='https://ui-avatars.com/api/?name=Hub&background=10b981&color=fff'">
                <div class="flex items-center gap-1 mb-1">
                    ${product.isVerified ? '<span class="verified-badge"><i class="fa-solid fa-check-circle"></i> Verified</span>' : ''}
                </div>
                <h4 class="font-bold text-sm text-slate-800">${escapeHtml(product.name)}</h4>
                <p class="text-xs text-slate-500 mt-1">₦${product.price} | ${product.condition || 'N/A'}</p>
                <p class="text-[10px] text-slate-400">${product.category || 'Uncategorized'}</p>
                <div class="flex items-center gap-1 mt-1">
                    ${avgRating > 0 ? `<span class="text-yellow-500 text-xs">★ ${avgRating.toFixed(1)}</span>` : '<span class="text-xs text-slate-400">No ratings</span>'}
                </div>
                <p class="text-[10px] italic text-slate-400 mt-1">Call: ${product.phone}</p>
                <div class="flex gap-2 mt-2">
                    <a href="https://wa.me/${fullPhone}?text=${encodeURIComponent(`Hello! I'm interested in: ${product.name} - ₦${product.price}`)}" target="_blank" class="flex-1 text-center bg-green-600 text-white py-1 rounded-lg text-[10px] font-bold">📱 WhatsApp</a>
                    <button onclick="openCommentModal('${product.id}')" class="flex-1 text-center bg-blue-500 text-white py-1 rounded-lg text-[10px] font-bold">💬 Comment</button>
                    <button onclick="openRatingModal('${product.id}')" class="flex-1 text-center bg-yellow-500 text-white py-1 rounded-lg text-[10px] font-bold">⭐ Rate</button>
                </div>
                ${product.commentCount ? `<div class="mt-2 text-[9px] text-slate-500 border-t pt-1">💬 ${product.commentCount} comments</div>` : ''}
            </div>
        `;
    });
}

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
                <input type="file" id="acad-file" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('acad-file-label').innerHTML='<i class=\'fa-solid fa-check-circle\'></i> File Selected! ✅'">
                <label for="acad-file" id="acad-file-label" class="block w-full p-6 border-2 border-dashed border-emerald-200 rounded-2xl text-center text-emerald-600 font-bold cursor-pointer">
                    <i class="fa-solid fa-cloud-upload-alt text-2xl mb-2"></i><br>Click to Upload
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

    if(!title || !desc) {
        alert("Fill Title & Description!");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> UPLOADING...`;

    let fileUrl = "";
    
    if(file){
        try {
            fileUrl = await uploadFile(file);
        } catch(err) {
            alert("Upload failed: " + err.message);
            btn.disabled = false;
            btn.innerHTML = "RETRY PUBLISH";
            return;
        }
    }

    try {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> SAVING...`;
        
        const postData = {
            type: type,
            level: level,
            title: title,
            desc: desc,
            fileUrl: fileUrl,
            fileName: file ? file.name : null,
            fileType: file ? file.type : null,
            repName: prompt("Enter your name (as Course Rep):") || "Course Rep",
            userId: currentUser ? currentUser.uid : null,
            timestamp: new Date().toISOString()
        };
        
        await db.collection('Academics').add(postData);
        
        btn.innerHTML = "✅ SUCCESS!";
        setTimeout(() => {
            document.getElementById('modal-overlay').classList.add('hidden');
            loadAcademicMaterials();
            btn.disabled = false;
        }, 1000);
    } catch(err) {
        alert("Save failed: " + err.message);
        btn.disabled = false;
        btn.innerHTML = "RETRY PUBLISH";
    }
};

window.loadAcademicMaterials = async function(levelFilter='all', deptFilter='all'){
    const container = document.getElementById('academic-list');
    if(!container) return;
    container.innerHTML = "<p class='text-center p-10 animate-pulse text-xs text-slate-400'>Loading...</p>";

    try {
        let query = db.collection('Academics').orderBy('timestamp', 'desc');
        if(levelFilter !== 'all') {
            query = query.where('level', '==', levelFilter);
        }

        const snap = await query.get();
        
        if(snap.empty) {
            container.innerHTML = "<p class='text-center text-slate-300 py-10 italic'>No updates.</p>";
        } else {
            container.innerHTML = "";
            snap.forEach(doc => {
                const d = doc.data();
                const icon = d.type === 'exam' ? '🎓' : d.type === 'test' ? '📝' : d.type === 'lecture' ? '📅' : '📚';
                const isPDF = d.fileType === 'application/pdf' || (d.fileUrl && d.fileUrl.includes('raw/upload'));
                
                let fileHtml = '';
                if(d.fileUrl) {
                    if(isPDF) {
                        fileHtml = `
                            <div class="flex gap-2 mt-3">
                                <a href="${d.fileUrl}" target="_blank" class="flex-1 text-center bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black">📖 OPEN PDF</a>
                                <a href="${d.fileUrl}" download="${d.fileName || 'document.pdf'}" class="flex-1 text-center bg-slate-600 text-white px-3 py-2 rounded-xl text-[10px] font-black">📥 DOWNLOAD</a>
                            </div>
                        `;
                    } else {
                        fileHtml = `<img src="${d.fileUrl}" class="mt-2 w-full h-32 object-cover rounded-xl">`;
                    }
                }
                
                const deleteButton = (currentUser && d.userId === currentUser.uid) ? 
                    `<button onclick="deleteAcademicPost('${doc.id}')" class="mt-2 text-red-500 text-[10px] font-bold underline">Delete Post</button>` : '';
                
                container.innerHTML += `
                    <div class="glass-card p-4 mb-3 border-l-4 border-emerald-500 animate-fade-in">
                        <div class="flex justify-between items-start mb-2">
                            <span class="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded-md uppercase">${d.level}L</span>
                            <span class="text-lg">${icon}</span>
                        </div>
                        <h4 class="font-bold text-sm text-slate-800">${escapeHtml(d.title)}</h4>
                        <p class="text-[11px] text-slate-500 mt-1">${escapeHtml(d.desc)}</p>
                        <p class="text-[9px] text-slate-400 italic">Posted by: ${escapeHtml(d.repName)}</p>
                        ${fileHtml}
                        ${deleteButton}
                    </div>
                `;
            });
        }
    } catch(e) {
        console.error("Load error:", e);
        container.innerHTML = "<p class='text-center text-red-500 py-10'>Error loading data</p>";
    }
};

window.deleteAcademicPost = async function(postId) {
    if (confirm('Are you sure you want to delete this academic post?')) {
        await db.collection('Academics').doc(postId).delete();
        alert('Post deleted!');
        loadAcademicMaterials();
    }
};

function renderAcademics() {}

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
        <button onclick="submitGroup()" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">SUBMIT</button>
    `;
};

const studyBtn = document.getElementById('btn-new-group');
if(studyBtn) studyBtn.onclick = window.openGroupModal;

window.submitGroup = async()=>{
    const name = document.getElementById('group-name').value;
    const link = document.getElementById('group-link').value;
    if(!name||!link) return alert("Fill all fields!");

    await db.collection('StudyGroups').add({
        name, link, status:'pending',
        userId: currentUser ? currentUser.uid : null,
        timestamp: new Date().toISOString()
    });

    alert("Sent! Junior will verify 🚀");
    document.getElementById('modal-overlay').classList.add('hidden');
};

async function loadAdminPanel(){
    const list = document.getElementById('admin-verification-list');
    const snap = await db.collection('StudyGroups').where('status','==','pending').get();
    list.innerHTML = snap.empty ? "<p class='text-slate-500 italic'>No pending groups.</p>" : "";
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `
            <div class="border p-4 rounded-2xl flex justify-between items-center bg-slate-800/50 mb-2">
                <span class="text-white font-bold">${escapeHtml(d.name)}</span>
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
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `
            <div class="glass-card p-4 flex justify-between items-center border-l-4 border-emerald-50">
                <p class="font-bold italic">${escapeHtml(d.name)}</p>
                <a href="${d.link}" target="_blank" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black italic">JOIN</a>
            </div>
        `;
    });
}

// ============================
// MARKETPLACE - CREATE POST
// ============================
window.openMarketModal = function(){
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
        <div class="max-h-[80vh] overflow-y-auto pb-6">
            <h3 class="text-xl font-black mb-4 italic text-emerald-600">Create a Post 🚀</h3>
            <div class="space-y-3">
                <input type="text" id="item-name" placeholder="Product Name" class="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none">
                <textarea id="item-desc" placeholder="Description" rows="3" class="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none"></textarea>
                <div class="flex gap-2">
                    <input type="number" id="item-price" placeholder="Price (₦)" class="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none">
                    <select id="item-negotiable" class="p-4 bg-slate-50 rounded-2xl border-none font-bold text-xs">
                        <option value="Fixed">Fixed</option>
                        <option value="Negotiable">Negotiable</option>
                    </select>
                </div>
                <select id="item-condition" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
                    <option value="New">✨ New</option>
                    <option value="Like New">👍 Like New</option>
                    <option value="Used">🔄 Used</option>
                </select>
                <select id="item-category" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
                    <option value="Electronics">📱 Electronics</option>
                    <option value="Books">📚 Books</option>
                    <option value="Fashion">👗 Fashion</option>
                    <option value="Food">🍔 Food</option>
                    <option value="Accommodation">🏠 Accommodation</option>
                </select>
                <select id="item-type" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-500">
                    <option value="items">Physical Item (Sale)</option>
                    <option value="services">Service (Gigs/Skill)</option>
                    <option value="requests">Request (I need...)</option>
                </select>
                <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <span class="pl-4 font-bold text-slate-400">+234</span>
                    <input type="tel" id="seller-phone" placeholder="805 000 0000" class="w-full p-4 bg-transparent border-none outline-none" value="${currentUserData?.phone || ''}">
                </div>
                <input type="text" id="seller-name" placeholder="Your name" class="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none" value="${currentUserData?.name || ''}">
                <div class="relative group">
                    <input type="file" id="item-image" class="hidden" accept="image/*" onchange="previewImage(this)">
                    <label for="item-image" id="file-label" class="block w-full p-6 border-2 border-dashed border-emerald-200 rounded-2xl text-center text-emerald-600 font-bold cursor-pointer bg-emerald-50/30">
                        <i class="fa-solid fa-camera-retro text-2xl mb-2"></i><br>Tap to Upload Photo
                    </label>
                    <div id="image-preview" class="image-preview mt-2"></div>
                </div>
                <button onclick="processMarketPost()" id="market-submit-btn" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">POST TO HUB ✨</button>
            </div>
        </div>
    `;
};

// Image preview function
window.previewImage = function(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(input.files[0]);
        document.getElementById('file-label').innerHTML = '<i class="fa-solid fa-check-circle text-2xl mb-2"></i><br>Photo Selected! ✅';
    }
};

const postAdBtn = document.getElementById('btn-post-ad');
if(postAdBtn) postAdBtn.onclick = window.openMarketModal;

window.processMarketPost = async function(){
    const btn = document.getElementById('market-submit-btn');
    const fileInput = document.getElementById('item-image');
    const file = fileInput.files[0];
    const name = document.getElementById('item-name').value;
    const price = document.getElementById('item-price').value;
    const description = document.getElementById('item-desc').value;
    const type = document.getElementById('item-type').value;
    const phone = document.getElementById('seller-phone').value;
    const negotiable = document.getElementById('item-negotiable').value;
    const condition = document.getElementById('item-condition').value;
    const category = document.getElementById('item-category').value;
    const sellerName = document.getElementById('seller-name').value;

    if(!name || !price || !phone) {
        alert("Fill all fields!");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> UPLOADING...`;

    let imageUrl = "https://ui-avatars.com/api/?name=Hub&background=10b981&color=fff";

    if(file){
        try {
            imageUrl = await uploadFile(file);
        } catch(err) {
            alert("Upload failed: " + err.message);
            btn.disabled = false;
            btn.innerHTML = "RETRY POST";
            return;
        }
    }

    try {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> SAVING...`;
        
        await db.collection('Marketplace').add({
            name, 
            price: Number(price), 
            description: description || '',
            type, 
            phone, 
            negotiable, 
            image: imageUrl,
            condition: condition,
            category: category,
            sellerName: sellerName || currentUserData?.name || 'Anonymous',
            userId: currentUser ? currentUser.uid : null,
            userEmail: currentUser ? currentUser.email : null,
            isSold: false,
            isVerified: currentUserData?.isVerified || false,
            views: 0,
            avgRating: 0,
            ratingCount: 0,
            commentCount: 0,
            timestamp: new Date().toISOString()
        });

        btn.innerHTML = "✅ DONE!";
        setTimeout(() => {
            document.getElementById('modal-overlay').classList.add('hidden');
            loadMarketDisplay(type);
            if(fileInput) fileInput.value = '';
            const label = document.getElementById('file-label');
            if(label) label.innerHTML = `<i class="fa-solid fa-camera-retro text-2xl mb-2"></i><br>Tap to Upload Photo`;
            document.getElementById('image-preview').innerHTML = '';
            btn.disabled = false;
            checkUserPosts();
        }, 1000);
    } catch(err) {
        alert("Save failed: " + err.message);
        btn.disabled = false;
        btn.innerHTML = "RETRY POST";
    }
};

// ============================
// MARKETPLACE DISPLAY
// ============================
window.loadMarketDisplay = async function(type='items') {
    const grid = document.getElementById('market-grid');
    if (!grid) return;

    grid.innerHTML = "<p class='text-center py-10 text-slate-400 animate-pulse'>Loading...</p>";

    try {
        const snap = await db.collection('Marketplace')
            .where('type', '==', type)
            .get();
        
        allMarketplaceProducts = [];
        snap.forEach(doc => {
            allMarketplaceProducts.push({ id: doc.id, ...doc.data() });
        });
        
        // Load comments count for each product
        for (let product of allMarketplaceProducts) {
            const commentsSnap = await db.collection('Comments').where('productId', '==', product.id).get();
            product.commentCount = commentsSnap.size;
        }
        
        renderMarketplaceGrid(allMarketplaceProducts);
        
        const countEl = document.getElementById('market-count');
        if(countEl) countEl.innerText = allMarketplaceProducts.length;
    } catch(e) {
        console.error("Marketplace load error:", e);
        grid.innerHTML = "<p class='text-center text-red-500 py-10'>Error loading data. Please refresh.</p>";
    }
};

// ============================
// BROADCAST
// ============================
document.getElementById('btn-broadcast')?.addEventListener('click', async()=>{
    if (!currentUserData?.isAdmin) {
        alert("Only admin can broadcast");
        return;
    }
    const msg = prompt("Enter broadcast message:");
    if(!msg) return alert("Cannot be empty!");

    await db.collection('Broadcasts').add({
        message: msg,
        timestamp: new Date().toISOString()
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
            msgContainer.innerText = doc.data().message;
        });
    }
}

// ============================
// ADMIN FUNCTIONS
// ============================
async function loadAdminStats() {
    const usersSnap = await db.collection('users').get();
    const postsSnap = await db.collection('Marketplace').get();
    const reportsSnap = await db.collection('Reports').get();
    const commentsSnap = await db.collection('Comments').get();
    
    document.getElementById('admin-stats').innerHTML = `
        <div class="stat-card"><h4>${usersSnap.size}</h4><p>Total Users</p></div>
        <div class="stat-card"><h4>${postsSnap.size}</h4><p>Total Posts</p></div>
        <div class="stat-card"><h4>${reportsSnap.size}</h4><p>Reports</p></div>
        <div class="stat-card"><h4>${commentsSnap.size}</h4><p>Comments</p></div>
    `;
}

async function loadAllUsers() {
    const usersSnap = await db.collection('users').get();
    let html = '<table class="user-table"><thead><tr><th>Name</th><th>Email</th><th>Dept</th><th>Posts</th><th>Actions</th></tr></thead><tbody>';
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        const postsSnap = await db.collection('Marketplace').where('userId', '==', doc.id).get();
        html += `
            <tr>
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.department || '-')}</td>
                <td>${postsSnap.size}</td>
                <td>
                    ${!user.isBanned ? `<button class="admin-btn admin-btn-ban" onclick="banUser('${doc.id}')">Ban</button>` : `<button class="admin-btn admin-btn-unban" onclick="unbanUser('${doc.id}')">Unban</button>`}
                    ${!user.isVerified ? `<button class="admin-btn admin-btn-verify" onclick="verifySeller('${doc.id}')">Verify</button>` : `<button class="admin-btn" onclick="unverifySeller('${doc.id}')">Unverify</button>`}
                    <button class="admin-btn admin-btn-delete" onclick="deleteUser('${doc.id}')">Delete</button>
                </td>
            </tr>
        `;
    }
    html += '</tbody></table>';
    document.getElementById('admin-user-list').innerHTML = html;
}

window.searchUsers = function() {
    const searchTerm = document.getElementById('admin-search-users').value.toLowerCase();
    const rows = document.querySelectorAll('#admin-user-list table tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
};

window.banUser = async function(userId) {
    await db.collection('users').doc(userId).update({ isBanned: true });
    loadAllUsers();
    loadAdminStats();
};

window.unbanUser = async function(userId) {
    await db.collection('users').doc(userId).update({ isBanned: false });
    loadAllUsers();
    loadAdminStats();
};

window.verifySeller = async function(userId) {
    await db.collection('users').doc(userId).update({ isVerified: true });
    // Also update all user's posts
    const posts = await db.collection('Marketplace').where('userId', '==', userId).get();
    posts.forEach(doc => doc.ref.update({ isVerified: true }));
    loadAllUsers();
    loadMarketDisplay('items');
};

window.unverifySeller = async function(userId) {
    await db.collection('users').doc(userId).update({ isVerified: false });
    const posts = await db.collection('Marketplace').where('userId', '==', userId).get();
    posts.forEach(doc => doc.ref.update({ isVerified: false }));
    loadAllUsers();
    loadMarketDisplay('items');
};

window.deleteUser = async function(userId) {
    if (confirm('Delete this user? All their posts will be deleted too.')) {
        const posts = await db.collection('Marketplace').where('userId', '==', userId).get();
        posts.forEach(doc => doc.ref.delete());
        const academics = await db.collection('Academics').where('userId', '==', userId).get();
        academics.forEach(doc => doc.ref.delete());
        await db.collection('users').doc(userId).delete();
        loadAllUsers();
        loadAdminStats();
        loadMarketDisplay('items');
        loadAcademicMaterials();
    }
};

// Department Management
async function loadDepartmentsForFilter() {
    const deptSnapshot = await db.collection('departments').orderBy('name').get();
    const filterContainer = document.getElementById('academic-dept-filter');
    if (filterContainer) {
        let html = '<button class="active" onclick="filterAcademicByDept(\'all\')">All Depts</button>';
        deptSnapshot.forEach(doc => {
            const dept = doc.data();
            html += `<button onclick="filterAcademicByDept('${dept.name}')">${dept.name}</button>`;
        });
        filterContainer.innerHTML = html;
    }
}

window.filterAcademicByDept = function(dept) {
    document.querySelectorAll('#academic-dept-filter button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    loadAcademicMaterials('all', dept);
};

async function loadDepartmentsList() {
    const deptSnapshot = await db.collection('departments').orderBy('name').get();
    let html = '';
    deptSnapshot.forEach(doc => {
        const dept = doc.data();
        html += `
            <div class="dept-item">
                <span>${escapeHtml(dept.name)}</span>
                <button onclick="deleteDepartment('${doc.id}')" class="text-red-500 text-xs">Delete</button>
            </div>
        `;
    });
    document.getElementById('departments-list').innerHTML = html || '<p class="text-slate-400">No departments added yet</p>';
}

window.addDepartment = async function() {
    const name = document.getElementById('new-dept-name').value.trim();
    if (!name) return alert('Enter department name');
    await db.collection('departments').add({ name: name });
    document.getElementById('new-dept-name').value = '';
    loadDepartmentsList();
    loadDepartmentsForFilter();
};

window.deleteDepartment = async function(id) {
    if (confirm('Delete this department?')) {
        await db.collection('departments').doc(id).delete();
        loadDepartmentsList();
        loadDepartmentsForFilter();
    }
};

// ============================
// UTILITIES
// ============================
function escapeHtml(str) {
    if(!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if(m === '&') return '&amp;';
        if(m === '<') return '&lt;';
        if(m === '>') return '&gt;';
        return m;
    });
}

window.filterByLevel = function(level='all') {
    document.querySelectorAll('.lvl-btn').forEach(btn => btn.classList.remove('active-lvl'));
    document.querySelector(`.lvl-btn[data-level="${level}"]`)?.classList.add('active-lvl');
    loadAcademicMaterials(level);
};

// Modal close events
document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
});

document.getElementById('close-dashboard')?.addEventListener('click', () => {
    document.getElementById('dashboard-modal').style.display = 'none';
});

// Dashboard button event
document.getElementById('dashboard-btn')?.addEventListener('click', () => {
    openDashboard();
});
