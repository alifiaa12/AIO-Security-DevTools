// --- LOGIKA SIDEBAR TOGGLE ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const toggleBtn = document.getElementById('sidebarToggle');
    
    sidebar.classList.toggle('sidebar-closed');
    
    // Toggle overlay visibility on mobile
    if (sidebar.classList.contains('sidebar-closed')) {
        overlay.classList.add('hidden');
        overlay.classList.add('opacity-0');
        overlay.classList.add('pointer-events-none');
    } else {
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            overlay.classList.remove('pointer-events-none');
        }, 10);
    }
}

// Menutup sidebar otomatis saat link menu di-klik (hanya di mobile)
function closeSidebarOnMobile() {
    if (window.innerWidth <= 1024) {
        toggleSidebar();
    }
}

// --- KONFIGURASI URL BACKEND ---
// Karena di-serve dari backend yang sama, kita bisa langsung pakai path absolut
const API_BASE_URL = '/api';

// --- LOGIKA NAVIGASI SIDEBAR ---
function switchPage(pageId, btnElement) {
    if (window.innerWidth <= 1024) closeSidebarOnMobile();
    
    // Sembunyikan semua halaman & reset animasi
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('page-animate');
    });

    // Tampilkan halaman target dengan animasi
    const targetPage = document.getElementById(pageId);
    targetPage.classList.remove('hidden');
    
    // Trigger reflow untuk restart animasi CSS
    void targetPage.offsetWidth; 
    targetPage.classList.add('page-animate');

    // Reset styling semua tombol menu
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active-menu', 'text-white', 'bg-white/5');
        btn.classList.add('text-slate-400');
    });

    // Set styling tombol yang aktif
    btnElement.classList.add('active-menu', 'text-white', 'bg-white/5');
    btnElement.classList.remove('text-slate-400');
}

// Inisialisasi halaman pertama saat load (Dashboard)
window.addEventListener('DOMContentLoaded', () => {
    const dashBtn = document.querySelector('[onclick*="page-dashboard"]');
    if (dashBtn) {
        switchPage('page-dashboard', dashBtn);
    }
    loadAppVersion();
    updateQuotaUI();

    // Setup Drag and Drop
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    if (dropzone && fileInput) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('border-indigo-500', 'bg-indigo-500/20');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('border-indigo-500', 'bg-indigo-500/20');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-indigo-500', 'bg-indigo-500/20');
            handleFileSelect(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', (e) => {
            handleFileSelect(e.target.files);
        });
    }
});

async function loadAppVersion() {
    try {
        const response = await fetch('/version.json');
        const data = await response.json();
        if (data.version) {
            document.getElementById('appVersion').innerText = data.version;
        }
        if (data.status) {
            document.getElementById('appStatus').innerText = data.status;
        }
    } catch (e) {
        console.error("Gagal memuat versi:", e);
    }
}

async function updateQuotaUI() {
    try {
        const res = await fetch('/api/quota');
        const data = await res.json();
        const textEl = document.getElementById('quotaText');
        const resetEl = document.getElementById('quotaResetText');
        const modelEl = document.getElementById('quotaModelText');
        
        if (textEl && resetEl) {
            textEl.innerText = `${data.remaining} / ${data.max}`;
            
            // Format time as HH:MM UTC
            const date = new Date(data.resetTime);
            const timeString = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            resetEl.innerText = `Reset: ${timeString} UTC`;
            
            if (modelEl && data.model) {
                modelEl.innerText = `Model: ${data.model}`;
            }
            
            // Warning colors if low
            if (data.remaining < 50) {
                textEl.classList.replace('text-emerald-400', 'text-red-500');
            } else {
                textEl.classList.replace('text-red-500', 'text-emerald-400');
            }
        }
    } catch (e) {
        console.error("Gagal memuat quota:", e);
    }
}

// --- FUNGSI BANTUAN ---
async function fetchAPI(endpoint, payload) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        updateQuotaUI(); // Refresh quota setelah transaksi API sukses
        return data;
    } catch (error) {
        return { success: false, data: "Error Koneksi: Pastikan Backend menyala.", error: error.message };
    }
}

function extractData(json) {
    if (json.success) {
        return typeof json.data === 'string' ? json.data : JSON.stringify(json.data, null, 2);
    }
    return json.error || json.message || JSON.stringify(json);
}
