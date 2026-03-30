import { DEPARTMENTS, EXECUTIVES, STUDY_CATEGORIES, UI_CONFIG } from './data.js';

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
// TOAST FUNCTION
// ============================
window.showToast = function(message, isError = false) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
};

// ============================
// EDIT PROFILE FUNCTIONS
// ============================

// Save Profile
window.saveProfile = async function() {
    const saveBtn = document.getElementById('save-profile-btn');
    const btnText = saveBtn.querySelector('.btn-text');
    const btnSpinner = saveBtn.querySelector('.btn-spinner');
    
    // Show loading spinner
    btnText.style.opacity = '0';
    btnSpinner.style.display = 'inline-block';
    saveBtn.disabled = true;
    
    try {
        const firstName = document.getElementById('profile-first-name').value;
        const lastName = document.getElementById('profile-last-name').value;
        const name = `${firstName} ${lastName}`.trim();
        let phone = document.getElementById('profile-phone').value.replace(/\D/g, '');
        const year = document.getElementById('profile-year').value;
        const department = document.getElementById('profile-department').value;
        const course = document.getElementById('profile-course').value;
        const bio = document.getElementById('profile-bio').value;
        
        // Validate phone (10 digits)
        if (phone.startsWith('0')) {
            phone = phone.substring(1);
        }
        if (phone.length !== 10 && phone.length > 0) {
            showToast('Phone number must be 10 digits (e.g., 8012345678)', true);
            btnText.style.opacity = '1';
            btnSpinner.style.display = 'none';
            saveBtn.disabled = false;
            return;
        }
        
        // Get interests and clubs from the DOM
        const interests = [];
        document.querySelectorAll('#interests-container .tag').forEach(tag => {
            const text = tag.childNodes[0].textContent.trim();
            if (text) interests.push(text);
        });
        
        const clubs = [];
        document.querySelectorAll('#clubs-container .tag').forEach(tag => {
            const text = tag.childNodes[0].textContent.trim();
            if (text) clubs.push(text);
        });
        
        const updateData = {
            name: name,
            phone: phone,
            year: year,
            department: department,
            course: course,
            bio: bio,
            interests: interests,
            clubs: clubs
        };
        
        await db.collection('users').doc(currentUser.uid).update(updateData);
        
        // Update global user data
        currentUserData = { ...currentUserData, ...updateData };
        
        // Update header name
        document.getElementById('user-name').innerText = name;
        
        showToast('Profile updated successfully!');
        
    } catch (error) {
        console.error(error);
        showToast('Error saving profile: ' + error.message, true);
    } finally {
        // Hide loading spinner
        btnText.style.opacity = '1';
        btnSpinner.style.display = 'none';
        saveBtn.disabled = false;
    }
};

// Add Interest Tag
window.addInterest = function() {
    const input = document.getElementById('new-interest');
    const value = input.value.trim();
    if (value) {
        const container = document.getElementById('interests-container');
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `${escapeHtml(value)} <span class="tag-remove" onclick="this.parentElement.remove()">✕</span>`;
        container.appendChild(tag);
        input.value = '';
    }
};

// Add Club Tag
window.addClub = function() {
    const input = document.getElementById('new-club');
    const value = input.value.trim();
    if (value) {
        const container = document.getElementById('clubs-container');
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `${escapeHtml(value)} <span class="tag-remove" onclick="this.parentElement.remove()">✕</span>`;
        container.appendChild(tag);
        input.value = '';
    }
};

// Update Password
window.updatePassword = async function() {
    const currentPwd = document.getElementById('current-password').value;
    const newPwd = document.getElementById('new-password').value;
    const confirmPwd = document.getElementById('confirm-password').value;
    const updateBtn = document.getElementById('update-password-btn');
    
    if (!currentPwd || !newPwd || !confirmPwd) {
        showToast('Please fill in all password fields', true);
        return;
    }
    
    if (newPwd.length < 6) {
        showToast('New password must be at least 6 characters', true);
        return;
    }
    
    if (newPwd !== confirmPwd) {
        showToast('New passwords do not match', true);
        return;
    }
    
    // Show loading spinner
    const originalText = updateBtn.innerHTML;
    updateBtn.innerHTML = '<span class="spinner"></span> Updating...';
    updateBtn.disabled = true;
    
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPwd);
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPwd);
        
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
        showToast('Password updated successfully!');
    } catch (error) {
        showToast('Error: ' + error.message, true);
    } finally {
        updateBtn.innerHTML = originalText;
        updateBtn.disabled = false;
    }
};

// Profile Picture Upload with Cloudinary
document.getElementById('profile-pic-input')?.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const avatarDiv = document.getElementById('profile-page-avatar');
    const originalHtml = avatarDiv.innerHTML;
    
    // Show loading spinner on avatar
    avatarDiv.innerHTML = '<div class="spinner" style="width: 30px; height: 30px;"></div>';
    
    try {
        // Instant preview
        const reader = new FileReader();
        reader.onload = function(event) {
            avatarDiv.style.backgroundImage = `url(${event.target.result})`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            avatarDiv.innerHTML = '';
        };
        reader.readAsDataURL(file);
        
        // Upload to Cloudinary
        const imageUrl = await uploadFile(file);
        
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({ avatar: imageUrl });
        currentUserData.avatar = imageUrl;
        
        // Update header avatar
        document.getElementById('user-avatar').src = imageUrl;
        
        showToast('Profile picture updated!');
    } catch (error) {
        console.error(error);
        showToast('Error uploading photo: ' + error.message, true);
        avatarDiv.innerHTML = originalHtml;
        avatarDiv.style.backgroundImage = '';
    }
});

// Cover Photo Upload with Cloudinary
document.getElementById('cover-input')?.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const coverDiv = document.getElementById('profile-cover');
    const originalBg = coverDiv.style.backgroundImage;
    
    // Instant preview
    const reader = new FileReader();
    reader.onload = function(event) {
        coverDiv.style.backgroundImage = `url(${event.target.result})`;
        coverDiv.style.backgroundSize = 'cover';
        coverDiv.style.backgroundPosition = 'center';
    };
    reader.readAsDataURL(file);
    
    try {
        // Upload to Cloudinary
        const imageUrl = await uploadFile(file);
        
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({ coverPhoto: imageUrl });
        currentUserData.coverPhoto = imageUrl;
        
        showToast('Cover photo updated!');
    } catch (error) {
        console.error(error);
        showToast('Error uploading cover photo: ' + error.message, true);
        coverDiv.style.backgroundImage = originalBg;
    }
});

// Delete Account
window.deleteAccount = async function() {
    if (confirm('⚠️ WARNING: This will permanently delete your account and all your data. Type DELETE to confirm.')) {
        const confirmText = prompt('Type DELETE to confirm account deletion:');
        if (confirmText === 'DELETE') {
            const deleteBtn = document.querySelector('.btn-delete');
            const originalText = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<span class="spinner"></span> Deleting...';
            deleteBtn.disabled = true;
            
            try {
                // Delete user's marketplace posts
                const posts = await db.collection('Marketplace').where('userId', '==', currentUser.uid).get();
                posts.forEach(doc => doc.ref.delete());
                
                // Delete user's academic posts
                const academics = await db.collection('Academics').where('userId', '==', currentUser.uid).get();
                academics.forEach(doc => doc.ref.delete());
                
                // Delete user's comments
                const comments = await db.collection('Comments').where('userId', '==', currentUser.uid).get();
                comments.forEach(doc => doc.ref.delete());
                
                // Delete user's ratings
                const ratings = await db.collection('Ratings').where('userId', '==', currentUser.uid).get();
                ratings.forEach(doc => doc.ref.delete());
                
                // Delete user document
                await db.collection('users').doc(currentUser.uid).delete();
                
                // Delete Firebase Auth user
                await currentUser.delete();
                
                showToast('Account deleted successfully');
                handleLogout();
            } catch (error) {
                showToast('Error: ' + error.message, true);
                deleteBtn.innerHTML = originalText;
                deleteBtn.disabled = false;
            }
        } else {
            showToast('Deletion cancelled');
        }
    }
};

// Load Profile Data into Edit Form
function loadProfileIntoForm() {
    if (!currentUserData) return;
    
    const fullName = currentUserData.name || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    document.getElementById('profile-first-name').value = firstName;
    document.getElementById('profile-last-name').value = lastName;
    document.getElementById('profile-email').value = currentUserData.email || '';
    document.getElementById('profile-phone').value = currentUserData.phone || '';
    document.getElementById('profile-year').value = currentUserData.year || '300';
    document.getElementById('profile-department').value = currentUserData.department || '';
    document.getElementById('profile-course').value = currentUserData.course || '';
    document.getElementById('profile-bio').value = currentUserData.bio || '';
    
    // Update bio character counter
    const bioLength = (currentUserData.bio || '').length;
    const charCountSpan = document.getElementById('bio-char-count');
    if (charCountSpan) charCountSpan.innerText = bioLength;
    
    // Load interests
    const interests = currentUserData.interests || [];
    const interestsContainer = document.getElementById('interests-container');
    if (interestsContainer) {
        interestsContainer.innerHTML = '';
        interests.forEach(interest => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `${escapeHtml(interest)} <span class="tag-remove" onclick="this.parentElement.remove()">✕</span>`;
            interestsContainer.appendChild(tag);
        });
    }
    
    // Load clubs
    const clubs = currentUserData.clubs || [];
    const clubsContainer = document.getElementById('clubs-container');
    if (clubsContainer) {
        clubsContainer.innerHTML = '';
        clubs.forEach(club => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `${escapeHtml(club)} <span class="tag-remove" onclick="this.parentElement.remove()">✕</span>`;
            clubsContainer.appendChild(tag);
        });
    }
    
    // Load avatar
    const avatarDiv = document.getElementById('profile-page-avatar');
    if (avatarDiv) {
        if (currentUserData.avatar && !currentUserData.avatar.includes('ui-avatars')) {
            avatarDiv.style.backgroundImage = `url(${currentUserData.avatar})`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            avatarDiv.innerHTML = '';
        } else {
            avatarDiv.style.backgroundImage = '';
            avatarDiv.innerHTML = '<i class="fa-solid fa-user-graduate"></i>';
        }
    }
    
    // Load cover photo
    const coverDiv = document.getElementById('profile-cover');
    if (coverDiv && currentUserData.coverPhoto) {
        coverDiv.style.backgroundImage = `url(${currentUserData.coverPhoto})`;
        coverDiv.style.backgroundSize = 'cover';
        coverDiv.style.backgroundPosition = 'center';
    }
}

// ============================
// BOOTUP
// ============================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 500);
        }
    }, 1500);
});

// ============================
// ACADEMICS FUNCTIONS
// ============================
window.openAcademicModal = function() {
    const isRep = confirm("Are you a Course Rep? 🎓\nOnly Reps can post Schedules, Tests, and Exams.");
    if(!isRep) return;

    const repKey = prompt("Enter Course Rep Secret Key:");
    if(repKey !== "REP2026") return alert("Unauthorized Key! ❌");

    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content-inner');
    modal.style.display = 'flex';

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
            document.getElementById('modal-overlay').style.display = 'none';
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
    container.innerHTML = "<div class='text-center py-10'><i class='fa-solid fa-spinner fa-spin text-emerald-600 text-2xl'></i><p class='mt-2 text-xs text-slate-400'>Loading academic materials...</p></div>";

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

// ============================
// STUDY GROUPS FUNCTIONS
// ============================
window.openGroupModal = function(){
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content-inner');
    modal.style.display = 'flex';

    content.innerHTML = `
        <h3 class="text-xl font-black mb-4 italic text-emerald-600">New Study Group 📚</h3>
        <input type="text" id="group-name" placeholder="Course Name" class="w-full p-4 bg-slate-50 rounded-2xl mb-3 border-none outline-none">
        <input type="url" id="group-link" placeholder="WhatsApp Link" class="w-full p-4 bg-slate-50 rounded-2xl mb-4 border-none outline-none">
        <button onclick="submitGroup()" id="group-submit-btn" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black btn-glow">SUBMIT</button>
    `;
};

window.submitGroup = async()=>{
    const btn = document.getElementById('group-submit-btn');
    const name = document.getElementById('group-name').value;
    const link = document.getElementById('group-link').value;
    
    if(!name||!link) return alert("Fill all fields!");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> SUBMITTING...`;

    await db.collection('StudyGroups').add({
        name, link, status:'pending',
        userId: currentUser ? currentUser.uid : null,
        timestamp: new Date().toISOString()
    });

    btn.innerHTML = "✅ SENT!";
    setTimeout(() => {
        document.getElementById('modal-overlay').style.display = 'none';
        alert("Sent! Junior will verify 🚀");
        btn.disabled = false;
    }, 1000);
};

async function loadVerifiedGroups(){
    const list = document.getElementById('groups-list');
    if(!list) return;
    list.innerHTML = "<div class='text-center py-4'><i class='fa-solid fa-spinner fa-spin text-emerald-600'></i><p class='text-xs mt-1'>Loading groups...</p></div>";
    
    const snap = await db.collection('StudyGroups').where('status','==','verified').get();
    list.innerHTML = "";
    if(snap.empty) {
        list.innerHTML = "<p class='text-center text-slate-400 py-4 italic'>No study groups yet.</p>";
    } else {
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
}

// ============================
// MARKETPLACE FUNCTIONS
// ============================
window.openMarketModal = function(){
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content-inner');
    modal.style.display = 'flex';

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
            document.getElementById('modal-overlay').style.display = 'none';
            loadMarketDisplay(type);
            if(fileInput) fileInput.value = '';
            const label = document.getElementById('file-label');
            if(label) label.innerHTML = `<i class="fa-solid fa-camera-retro text-2xl mb-2"></i><br>Tap to Upload Photo`;
            document.getElementById('image-preview').innerHTML = '';
            btn.disabled = false;
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

    grid.innerHTML = "<div class='text-center py-10'><i class='fa-solid fa-spinner fa-spin text-emerald-600 text-2xl'></i><p class='mt-2 text-xs text-slate-400'>Loading products...</p></div>";

    try {
        const snap = await db.collection('Marketplace')
            .where('type', '==', type)
            .get();
        
        allMarketplaceProducts = [];
        snap.forEach(doc => {
            allMarketplaceProducts.push({ id: doc.id, ...doc.data() });
        });
        
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
                    ${product.isVerified ? '<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>' : ''}
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
// DASHBOARD FUNCTIONS
// ============================
window.openDashboard = async function() {
    if (!currentUser) return;
    
    const dashboardModal = document.getElementById('dashboard-modal');
    const dashboardContent = document.getElementById('dashboard-content');
    
    dashboardModal.style.display = 'flex';
    dashboardContent.innerHTML = '<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-emerald-600"></i><p class="mt-2">Loading your posts...</p></div>';
    
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
    const content = document.getElementById('modal-content-inner');
    modal.style.display = 'flex';
    
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
    
    document.getElementById('modal-overlay').style.display = 'none';
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

// ============================
// BROADCAST FUNCTIONS
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
    let html = '<table class="user-table"><thead><tr><th>Name</th><th>Email</th><th>Dept</th><th>Posts</th><th>Actions</th> </thead><tbody>';
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

// Admin Panel
async function loadAdminPanel() {
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

window.closeModal = function() {
    document.getElementById('modal-overlay').style.display = 'none';
};

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
                course: '',
                bio: '',
                interests: [],
                clubs: [],
                year: '300',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=10b981&color=fff`,
                createdAt: new Date().toISOString(),
                isAdmin: user.email === 'precioussebastian70@gmail.com',
                isVerified: false,
                isBanned: false
            };
            await db.collection('users').doc(user.uid).set(currentUserData);
        }
        
        // Update header
        document.getElementById('user-name').innerText = currentUserData.name;
        document.getElementById('user-avatar').src = currentUserData.avatar;
        
        // Load profile data into edit form
        loadProfileIntoForm();
        
        const isAdmin = currentUserData.isAdmin;
        document.getElementById('admin-trigger').style.display = isAdmin ? 'block' : 'none';
        document.getElementById('admin-nav-btn').style.display = isAdmin ? 'flex' : 'none';
        document.getElementById('dashboard-nav-btn').style.display = 'flex';
        document.getElementById('profile-nav-btn').style.display = 'flex';
        
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        loadDepartmentsForFilter();
        loadMarketDisplay('items');
        loadAcademicMaterials();
        loadVerifiedGroups();
        loadBroadcastMessage();
        
        // Setup button event listeners
        document.getElementById('btn-post-ad')?.addEventListener('click', openMarketModal);
        document.getElementById('btn-new-group')?.addEventListener('click', openGroupModal);
    } else {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});
