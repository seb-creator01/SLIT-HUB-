// ==========================================
// SLIT-HUB CENTRAL REGISTRY (data.js)
// ==========================================

/** * 1. DEPARTMENTS & ACADEMIC STRUCTURE
 * These are the core departments. 
 * Even if the internet is slow, these will load instantly.
 */
export const DEPARTMENTS = [
    { id: 'ltt', name: 'Logistics & Transport', code: 'LTT', rep: 'Adebayo K.' },
    { id: 'pmt', name: 'Project Management', code: 'PMT', rep: 'Sarah O.' },
    { id: 'mmt', name: 'Maritime Management', code: 'MMT', rep: 'Victor E.' },
    { id: 'scm', name: 'Supply Chain Management', code: 'SCM', rep: 'Blessing W.' }
];

export const ACADEMIC_LEVELS = ["100", "200", "300", "400", "500"];

/**
 * 2. EXECUTIVE DIRECTORY (Hand-Added)
 * Professional Tip: We use UI-Avatars for a clean look 
 * until you upload real photos via the Admin Dashboard.
 */
export const EXECUTIVES = [
    { 
        name: 'Junior', 
        role: 'Lead Developer', 
        dept: 'SLIT', 
        phone: '2348053103234', 
        type: 'faculty',
        image: 'https://ui-avatars.com/api/?name=Junior&background=10b981&color=fff'
    },
    { 
        name: 'Hon. Adebayo', 
        role: 'President', 
        dept: 'LTT', 
        phone: '2348000000000', 
        type: 'faculty',
        image: 'https://ui-avatars.com/api/?name=Adebayo&background=random'
    },
    { 
        name: 'Sarah Omega', 
        role: 'Course Rep', 
        dept: 'PMT', 
        phone: '2348111111111', 
        type: 'course-rep',
        level: '300'
    }
];

/**
 * 3. MARKETPLACE CATEGORIES
 * This ensures the marketplace stays organized.
 */
export const MARKET_CATEGORIES = [
    { id: 'gadgets', name: 'Gadgets & Tech', icon: 'fa-laptop' },
    { id: 'books', name: 'Books & Materials', icon: 'fa-book' },
    { id: 'fashion', name: 'Fashion & Style', icon: 'fa-shirt' },
    { id: 'services', name: 'Student Services', icon: 'fa-handshake' }
];

/**
 * 4. STUDY GROUP CATEGORIES
 * For the WhatsApp verification feature.
 */
export const STUDY_CATEGORIES = [
    "General Studies (GST)",
    "Departmental Courses",
    "Professional Exams",
    "Coding & Design"
];

/**
 * 5. SYSTEM SETTINGS (The "Professional" Bridge)
 * ALLOW_DYNAMIC_DEPT: When true, the app will check Firebase 
 * for any departments you added via the Admin Dashboard.
 */
export const ALLOW_DYNAMIC_DEPT = true; 

export const UI_CONFIG = {
    primaryColor: '#10b981', // Emerald 500
    appName: 'SLIT-HUB',
    allowUserSubmissions: true,
    adminPassphrase: 'junior123' // Your secret key
};

