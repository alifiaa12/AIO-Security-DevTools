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

// --- LOGIKA API 1: GUARDIAN AI ---
let guardianVulnerabilities = [];
let showingAllGuardianCards = false;

async function runGuardian() {
    const input = document.getElementById('guardianInput').value;
    const btn = document.getElementById('btnGuardian');
    const resContainer = document.getElementById('guardianResultContainer');
    
    btn.innerHTML = "Memindai..."; btn.disabled = true;
    resContainer.innerHTML = "<div class='text-gray-400 font-mono text-sm'>Menunggu balasan AI...</div>";
    
    const response = await fetchAPI('/guardian/scan', { code: input });
    
    if (response.success && response.data) {
        const data = response.data;
        if (data.status === "Secure" || (data.vulnerabilities && data.vulnerabilities.length === 0)) {
            resContainer.innerHTML = `
                <div class="bg-green-900/30 border border-green-800 text-green-400 p-4 rounded-lg flex items-center gap-3">
                    <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    <span>Kode Anda aman dari serangan siber (SQL Injection, XSS, dsb)</span>
                </div>
            `;
        } else {
            // Vulnerable
            guardianVulnerabilities = data.vulnerabilities || [];
            showingAllGuardianCards = false;
            renderGuardianCards();
        }
    } else {
        resContainer.innerHTML = `<div class="text-red-400 font-mono text-sm">${extractData(response)}</div>`;
    }
    
    btn.innerHTML = "Mulai Scan Audit"; btn.disabled = false;
}

function renderGuardianCards() {
    const resContainer = document.getElementById('guardianResultContainer');
    resContainer.innerHTML = ''; 

    if (guardianVulnerabilities.length === 0) {
        resContainer.innerHTML = "<div class='text-slate-500 font-mono text-sm py-10 text-center opacity-50'>Ditemukan kerentanan, tetapi tidak ada detail spesifik.</div>";
        return;
    }

    const maxCards = showingAllGuardianCards ? guardianVulnerabilities.length : Math.min(3, guardianVulnerabilities.length);
    
    let html = '<div class="space-y-5">';
    
    for (let i = 0; i < maxCards; i++) {
        const vuln = guardianVulnerabilities[i];
        const snippet = vuln.code_snippet ? vuln.code_snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "Kode tidak diketahui";
        
        html += `
            <div class="bg-white/5 border border-white/5 rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:border-red-500/30">
                <div class="p-6 cursor-pointer hover:bg-white/5 flex justify-between items-center" onclick="toggleGuardianCard(${i})">
                    <div class="flex items-center gap-4 truncate pr-4 w-full">
                        <div class="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        </div>
                        <div class="flex flex-col truncate">
                            <span class="text-white font-bold text-sm mb-1">${vuln.type}</span>
                            <span class="text-slate-500 font-mono text-[10px] truncate max-w-[300px] italic">"${snippet}"</span>
                        </div>
                        <div class="ml-auto hidden md:flex items-center gap-2">
                             <span class="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">${vuln.severity || 'High'}</span>
                        </div>
                    </div>
                    <span id="guardian-icon-${i}" class="text-slate-600 transform transition-transform duration-300 ml-4">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </span>
                </div>
                <div id="guardian-detail-${i}" class="hidden p-6 bg-black/20 border-t border-white/5 text-sm text-slate-400">
                    <div class="mb-4">
                        <h5 class="text-white font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Detail Analisis
                        </h5>
                        <p class="leading-relaxed bg-[#020617] p-4 rounded-xl border border-white/5 font-mono text-[11px]">${vuln.reason}</p>
                    </div>
                    <div>
                        <h5 class="text-white font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Rekomendasi Perbaikan
                        </h5>
                        <p class="leading-relaxed text-slate-300 italic">${vuln.repair || 'Gunakan input sanitization dan parameterized queries.'}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';

    if (guardianVulnerabilities.length > 3) {
        html += `
            <button onclick="toggleShowAllGuardian()" class="mt-6 text-slate-400 hover:text-white text-xs font-bold w-full text-center py-4 bg-white/5 rounded-2xl transition-all border border-white/5 hover:border-indigo-500/30">
                ${showingAllGuardianCards ? 'LIHAT LEBIH SEDIKIT' : 'TAMPILKAN SEMUA TEMUAN (' + guardianVulnerabilities.length + ')'}
            </button>
        `;
    }

    resContainer.innerHTML = html;
}

window.toggleGuardianCard = function(index) {
    const detail = document.getElementById(`guardian-detail-${index}`);
    const icon = document.getElementById(`guardian-icon-${index}`);
    
    if (detail.classList.contains('hidden')) {
        detail.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        detail.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

window.toggleShowAllGuardian = function() {
    showingAllGuardianCards = !showingAllGuardianCards;
    renderGuardianCards();
}

// --- LOGIKA API 2: SMART HIDE ---
async function runSmartHide() {
    const input = document.getElementById('smarthideInput').value;
    const btn = document.getElementById('btnSmartHide');
    const res = document.getElementById('smarthideResult');
    const secretsContainer = document.getElementById('smarthideSecretsContainer');
    const secretsList = document.getElementById('secretsList');
    
    if (!input) return showAlert("Silakan masukkan kode terlebih dahulu.");

    btn.innerHTML = "Mendeteksi..."; btn.disabled = true;
    res.value = "Sedang mendeteksi kata sensitif...";
    secretsContainer.classList.add('hidden');
    
    const detectResp = await fetchAPI('/smarthide/detect', { code: input });
    if (!detectResp.success) {
        res.value = extractData(detectResp);
        btn.innerHTML = "Mulai Deteksi Rahasia"; btn.disabled = false;
        return;
    }

    let secrets = detectResp.data?.secrets || [];

    if (secrets.length === 0) {
         res.value = "Aman! Tidak ada kata sensitif yang terdeteksi.";
         btn.innerHTML = "Mulai Deteksi Rahasia"; btn.disabled = false;
         return;
    }

    // Render list rahasia dengan CHECKBOX
    secretsList.innerHTML = '';
    secrets.forEach((s, index) => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 bg-[#0a0f1c] border border-gray-800 rounded-lg transition-all hover:border-blue-500/50 group";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" id="secret-${index}" value="${s.value}" checked class="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer">
                <label for="secret-${index}" class="flex flex-col cursor-pointer">
                    <span class="px-2 py-0.5 bg-red-900/30 text-red-400 text-[9px] font-bold rounded uppercase w-fit mb-1">${s.type}</span>
                    <span class="text-gray-400 text-xs font-mono truncate max-w-[120px] italic">"${s.value.substring(0, 5)}..."</span>
                </label>
            </div>
            <div class="text-[10px] text-gray-500 group-hover:text-gray-300">Baris ${s.line || '?'}</div>
        `;
        secretsList.appendChild(item);
    });
    
    secretsContainer.classList.remove('hidden');
    res.value = `Ditemukan ${secrets.length} data sensitif. Silakan pilih mana yang ingin disembunyikan di bawah ini lalu klik 'Terapkan Sensor'.`;
    btn.innerHTML = "Mulai Deteksi Rahasia"; btn.disabled = false;
}

async function applySmartHideMask() {
    const input = document.getElementById('smarthideInput').value;
    const res = document.getElementById('smarthideResult');
    const btn = document.getElementById('btnApplyMask');
    
    const checkboxes = document.querySelectorAll('#secretsList input[type="checkbox"]:checked');
    const secretsToMask = Array.from(checkboxes).map(cb => cb.value);

    if (secretsToMask.length === 0) {
        showAlert("Pilih minimal satu rahasia untuk disembunyikan.");
        return;
    }

    btn.innerHTML = "Menyensor..."; btn.disabled = true;
    res.value = `Sedang menyensor ${secretsToMask.length} data pilihan...`;

    const maskResp = await fetchAPI('/smarthide/mask', { 
        code: input, 
        secretsToMask: secretsToMask 
    });
    
    if (maskResp.success) {
        res.value = maskResp.data.maskedCode;
    } else {
        res.value = extractData(maskResp);
    }

    btn.innerHTML = "Terapkan Sensor pada Pilihan"; btn.disabled = false;
}

function copyMaskedCode() {
    const text = document.getElementById('smarthideResult').value;
    if (text && text !== "" && !text.startsWith('Tahap')) {
        navigator.clipboard.writeText(text);
        showAlert("Kode tersensor disalin ke clipboard!");
    }
}

function toggleEditMaskedCode() {
    const res = document.getElementById('smarthideResult');
    const btn = document.getElementById('btnEditMasked');
    
    if (res.hasAttribute('readonly')) {
        res.removeAttribute('readonly');
        res.classList.remove('text-green-400');
        res.classList.add('text-white', 'border-blue-500');
        btn.classList.add('bg-blue-600', 'text-white');
    } else {
        res.setAttribute('readonly', true);
        res.classList.add('text-green-400');
        res.classList.remove('text-white', 'border-blue-500');
        btn.classList.remove('bg-blue-600', 'text-white');
    }
}

// --- LOGIKA API 3: STRONG AI PASSWORD ---
function togglePassword() {
    const input = document.getElementById('passAnalyzeInput');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function runPasswordAnalyze() {
    const password = document.getElementById('passAnalyzeInput').value;
    const btn = document.getElementById('btnPassAnalyze');
    const container = document.getElementById('passStrengthContainer');
    const bar = document.getElementById('passStrengthBar');
    const badge = document.getElementById('passScoreBadge');
    const result = document.getElementById('passAnalyzeResult');

    if (!password) return showAlert("Silakan masukkan password untuk dianalisis.");

    btn.innerHTML = "Menganalisis..."; btn.disabled = true;
    container.classList.remove('hidden');
    result.innerText = "AI sedang menghitung entropy password...";
    
    const resp = await fetchAPI('/password/analyze', { password });
    if (resp.success) {
        const data = resp.data;
        const score = data.entropy_score || 0;
        
        // Update Meter
        bar.style.width = score + '%';
        badge.innerText = score + '/100';
        
        // Update Color based on score
        if (score < 40) {
            bar.style.backgroundColor = '#ef4444';
            badge.className = "px-2 py-1 bg-red-900/30 text-red-400 text-xs font-bold rounded border border-red-500/20";
        } else if (score < 75) {
            bar.style.backgroundColor = '#f59e0b';
            badge.className = "px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs font-bold rounded border border-yellow-500/20";
        } else {
            bar.style.backgroundColor = '#22c55e';
            badge.className = "px-2 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded border border-green-500/20";
        }

        result.innerHTML = `<strong>Status: ${data.strength_level}</strong><br><br>${data.advice}`;
    } else {
        result.innerText = extractData(resp);
    }
    btn.innerHTML = "Analisis Kekuatan"; btn.disabled = false;
}

async function runPasswordGenerate() {
    const btn = document.getElementById('btnPassGenerate');
    const res = document.getElementById('passGenerateResult');
    
    btn.innerHTML = "Generasi..."; btn.disabled = true;
    res.innerHTML = "Meracik...";
    res.classList.remove('text-white');
    res.classList.add('text-gray-500');

    const response = await fetchAPI('/password/generate', {});
    
    if (response.success && response.data && response.data.generated_password) {
        res.innerHTML = response.data.generated_password;
    } else {
        res.innerHTML = "Gagal meracik password";
    }
    
    res.classList.remove('text-gray-500');
    res.classList.add('text-white', 'font-bold');

    btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> Generate Baru`; btn.disabled = false;
}

function copyPassword() {
    const text = document.getElementById('passGenerateResult').innerText;
    if (text && text !== "Awaiting AI..." && text !== "Meracik..." && text !== "Gagal meracik password") {
        navigator.clipboard.writeText(text);
        showAlert("Password disalin ke clipboard!");
    }
}

// --- LOGIKA API 4: DOCUSENSE AI ---
let docusenseFiles = [];

function handleFileSelect(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(e) {
            docusenseFiles.push({
                fileName: file.name,
                content: e.target.result
            });
            renderFileList();
        };
        reader.readAsText(file);
    }
}

function renderFileList() {
    const list = document.getElementById('fileList');
    if (!list) return;
    list.innerHTML = docusenseFiles.map((f, i) => `
        <div class="flex items-center gap-2 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 transition-all hover:bg-red-500/10 hover:border-red-500/30 group">
            <span class="text-[10px] text-indigo-300 truncate max-w-[150px] font-mono group-hover:text-red-300">${f.fileName}</span>
            <button onclick="removeFile(${i})" class="text-indigo-400 group-hover:text-red-400"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
    `).join('');
}

function removeFile(index) {
    docusenseFiles.splice(index, 1);
    renderFileList();
}

async function runDocuSense() {
    const name = document.getElementById('docuName').value;
    const version = document.getElementById('docuVersion').value;
    const contextDesc = document.getElementById('docuContext').value;
    
    const btn = document.getElementById('btnDocu');
    const readme = document.getElementById('docuReadme');
    const openapi = document.getElementById('docuOpenAPI');

    if (!name || (docusenseFiles.length === 0 && !contextDesc)) {
        return showAlert("Nama proyek wajib diisi. Silakan berikan konteks singkat atau upload minimal satu file inti.");
    }

    btn.innerHTML = "Generating Documentation..."; btn.disabled = true;
    readme.value = "AI sedang menyintesis konteks dan file proyek...";
    openapi.value = "AI sedang menyusun spesifikasi API...";
    
    const response = await fetchAPI('/docusense/generate', { 
        projectName: name, 
        versionTag: version,
        projectContext: contextDesc,
        files: docusenseFiles
    });
    
    if (response.success) {
        readme.value = response.data.readme;
        openapi.value = response.data.openapi;
    } else {
        const err = extractData(response);
        readme.value = err;
        openapi.value = err;
    }
    btn.innerHTML = "Analyze & Generate"; btn.disabled = false;
}

let currentRefineType = '';

function openRefineModal(type) {
    const id = type === 'readme' ? 'docuReadme' : 'docuOpenAPI';
    const currentContent = document.getElementById(id).value;
    
    if (!currentContent || currentContent.startsWith("AI sedang") || currentContent.startsWith("✨ Sedang merevisi")) {
        return showAlert("Silakan generate dokumen terlebih dahulu sebelum melakukan refine.");
    }

    currentRefineType = type;
    const modal = document.getElementById('refineModal');
    const box = document.getElementById('refineBox');
    const title = document.getElementById('refineTitle');
    const input = document.getElementById('refineInput');
    
    title.innerText = `Refine ${type.toUpperCase()}`;
    input.value = '';
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        box.classList.remove('scale-95');
    }, 10);
}

function closeRefineModal() {
    const modal = document.getElementById('refineModal');
    const box = document.getElementById('refineBox');
    
    modal.classList.add('opacity-0', 'pointer-events-none');
    box.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function submitRefineAI() {
    const userPrompt = document.getElementById('refineInput').value;
    if (!userPrompt) return showAlert("Harap masukkan instruksi revisi.");
    
    const id = currentRefineType === 'readme' ? 'docuReadme' : 'docuOpenAPI';
    const originalText = document.getElementById(id).value;
    
    const btn = document.getElementById('btnSubmitRefine');
    
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...`;
    btn.disabled = true;

    // Show processing in textarea
    document.getElementById(id).value = `✨ Sedang merevisi ${currentRefineType.toUpperCase()}...`;
    closeRefineModal();

    const response = await fetchAPI('/docusense/refine', { 
        currentContent: originalText,
        prompt: userPrompt,
        type: currentRefineType
    });

    if (response.success) {
        document.getElementById(id).value = response.data;
        showAlert(`${currentRefineType.toUpperCase()} berhasil direvisi oleh AI!`);
    } else {
        document.getElementById(id).value = originalText;
        showAlert("Gagal merevisi dokumen: " + extractData(response));
    }
    
    btn.innerHTML = `✨ Terapkan Revisi`;
    btn.disabled = false;
}

function copyDocu(type) {
    const id = type === 'readme' ? 'docuReadme' : 'docuOpenAPI';
    const text = document.getElementById(id).value;
    if (text && text !== "" && !text.startsWith('AI sedang')) {
        navigator.clipboard.writeText(text);
        showAlert(`${type.toUpperCase()} berhasil disalin ke clipboard!`);
    }
}

function showAlert(message) {
    const modal = document.getElementById('customAlert');
    const box = document.getElementById('alertBox');
    const msg = document.getElementById('alertMessage');
    
    msg.innerText = message;
    modal.classList.remove('hidden');
    
    // Trigger animations
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-90');
        box.classList.add('scale-100');
    }, 10);
}

function hideAlert() {
    const modal = document.getElementById('customAlert');
    const box = document.getElementById('alertBox');
    
    modal.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-90');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}
