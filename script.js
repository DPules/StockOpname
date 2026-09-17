// =========================================================
// Ganti variabel ini dengan URL Deployment Apps Script Anda
// =========================================================
const API_URL = "https://script.google.com/macros/s/AKfycbxF4OWQxWw-AO1Tq1Zq80eG75Oi5emHDYDjr_8QVoOHkvx365ew3XMhnBjlxf9yFbBdoQ/exec";

let currentUser = null;
let currentKdkmp = null;
let barangList = [];
let opnameData = {};

document.addEventListener("DOMContentLoaded", function () {
    const savedUser = sessionStorage.getItem("kdkmpUser");
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            initializeApp();
        } catch (e) {
            sessionStorage.removeItem("kdkmpUser");
        }
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", login);
    }
});

/* =========================
   AUTHENTICATION & SESSION
========================= */
function login(e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        showLoginMessage("Username dan password wajib diisi.");
        return;
    }

    showLoginMessage("Memproses login...", false);

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "login",
            username: username,
            password: password
        })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            currentUser = result.user;
            sessionStorage.setItem("kdkmpUser", JSON.stringify(currentUser));
            initializeApp();
        } else {
            showLoginMessage(result.message || "Login gagal.");
        }
    })
    .catch(err => {
        console.error("Login Error:", err);
        showLoginMessage("Gagal terhubung ke server.");
    });
}

function initializeApp() {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");

    document.getElementById("sidebarUserName").textContent = currentUser.name;
    document.getElementById("sidebarUserRole").textContent = currentUser.role;
    document.getElementById("topbarUser").textContent = currentUser.name;
    document.getElementById("welcomeName").textContent = currentUser.name;
    document.getElementById("userAvatar").textContent = currentUser.name.charAt(0).toUpperCase();

    loadInitialData();
}

function logout() {
    sessionStorage.removeItem("kdkmpUser");
    location.reload();
}

/* =========================
   DATA FETCHING & RENDER
========================= */
function loadInitialData() {
    fetch(`${API_URL}?action=getInitialData&kdkmpId=${currentUser.kdkmpId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentKdkmp = data.kdkmp;
            barangList = data.barang;
            renderDashboardInfo();
            loadDraft(); // Muat draft terisolasi per KDKMP jika ada
            renderBarangInput();
            renderKategoriFilter();
            renderMasterTable();
        }
    })
    .catch(err => {
        console.error("Fetch Data Error:", err);
        showToast("Gagal mengambil data dari server.");
    });
}

function renderDashboardInfo() {
    if (!currentKdkmp) return;
    document.getElementById("currentKdkmp").textContent = currentKdkmp.nama;
    document.getElementById("infoIdKdkmp").textContent = currentKdkmp.id;
    document.getElementById("infoNamaKdkmp").textContent = currentKdkmp.nama;
    document.getElementById("infoDesa").textContent = currentKdkmp.desa;
    document.getElementById("infoKecamatan").textContent = currentKdkmp.kecamatan;
    document.getElementById("infoKabupaten").textContent = currentKdkmp.kabupaten;
    document.getElementById("infoPic").textContent = currentKdkmp.pic;

    document.getElementById("statBarang").textContent = barangList.length;
}

function renderKategoriFilter() {
    const kategoris = [...new Set(barangList.map(item => item.kategori))];
    const select = document.getElementById("kategoriFilter");
    select.innerHTML = '<option value="">Semua Kategori</option>';
    kategoris.forEach(kat => {
        if (kat) select.innerHTML += `<option value="${kat}">${kat}</option>`;
    });
}

function renderBarangInput() {
    const container = document.getElementById("barangContainer");
    if (!barangList.length) {
        container.innerHTML = '<div class="empty-state">Tidak ada barang terdaftar.</div>';
        return;
    }

    let html = "";
    barangList.forEach(item => {
        const saved = opnameData[item.kode] || { ctn: "", pcs: "", total: 0 };

        html += `
        <div class="barang-card" id="card-${item.kode}" data-category="${item.kategori}" data-search="${item.kode.toLowerCase()} ${item.nama.toLowerCase()}">
            <div class="barang-top">
                <div class="barang-info">
                    <div class="barang-code">${item.kode}</div>
                    <div class="barang-name">${item.nama}</div>
                    <div class="barang-category">Kategori: ${item.kategori} | 1 CTN = ${item.isiCtn} ${item.satuan}</div>
                </div>
                <div class="stok-system">
                    <span>Stok Sistem</span>
                    <strong>${item.stokSystem} ${item.satuan}</strong>
                </div>
            </div>
            
            <div class="stock-input-area">
                <div class="input-box">
                    <label>Fisik (CTN)</label>
                    <input type="number" min="0" placeholder="0" value="${saved.ctn}" oninput="calculateItem('${item.kode}', ${item.isiCtn}, ${item.stokSystem})">
                </div>
                <div class="input-box">
                    <label>Fisik (PCS)</label>
                    <input type="number" min="0" placeholder="0" value="${saved.pcs}" oninput="calculateItem('${item.kode}', ${item.isiCtn}, ${item.stokSystem})">
                </div>
                <div class="result-box">
                    <span>Total Fisik</span>
                    <strong id="total-${item.kode}">${saved.total} ${item.satuan}</strong>
                </div>
                <div class="result-box">
                    <span>Selisih</span>
                    <strong id="selisih-${item.kode}">${saved.total - item.stokSystem}</strong>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    updateProgress();
}

function renderMasterTable() {
    const tableBody = document.getElementById("masterTable");
    if (!tableBody) return;

    let html = "";
    barangList.forEach(item => {
        html += `
        <tr>
            <td><strong>${item.kode}</strong></td>
            <td>${item.nama}</td>
            <td>${item.kategori}</td>
            <td>${item.isiCtn}</td>
            <td>${item.satuan}</td>
            <td><strong>${item.stokSystem}</strong></td>
        </tr>`;
    });

    tableBody.innerHTML = html || '<tr><td colspan="6">Data kosong</td></tr>';
}

/* =========================
   CALCULATIONS & DRAFT ISOLATION
========================= */
function calculateItem(kode, isiCtn, stokSystem) {
    const card = document.getElementById(`card-${kode}`);
    const inputs = card.querySelectorAll("input");
    const ctn = parseInt(inputs[0].value) || 0;
    const pcs = parseInt(inputs[1].value) || 0;

    const totalFisik = (ctn * isiCtn) + pcs;
    const selisih = totalFisik - stokSystem;

    document.getElementById(`total-${kode}`).textContent = `${totalFisik}`;
    
    const selisihEl = document.getElementById(`selisih-${kode}`);
    selisihEl.textContent = selisih > 0 ? `+${selisih}` : selisih;
    selisihEl.className = selisih === 0 ? "status-sesuai" : (selisih < 0 ? "text-danger" : "text-warning");

    opnameData[kode] = {
        kode: kode,
        ctn: ctn,
        pcs: pcs,
        stokSystem: stokSystem,
        stokFisik: totalFisik
    };

    updateProgress();
}

function updateProgress() {
    const filledCount = Object.keys(opnameData).length;
    const totalItems = barangList.length;
    const percent = totalItems > 0 ? Math.round((filledCount / totalItems) * 100) : 0;

    document.getElementById("progressText").textContent = `${filledCount} / ${totalItems} item`;
    document.getElementById("progressPercent").textContent = `${percent}%`;
    document.getElementById("progressBar").style.width = `${percent}%`;
}

function saveDraft() {
    if (!currentUser || !currentUser.kdkmpId) return;
    const draftKey = `opnameDraft_${currentUser.kdkmpId}`;
    localStorage.setItem(draftKey, JSON.stringify(opnameData));
    showToast(`Draft opname KDKMP ${currentKdkmp.nama} berhasil disimpan!`);
}

function loadDraft() {
    if (!currentUser || !currentUser.kdkmpId) return;
    const draftKey = `opnameDraft_${currentUser.kdkmpId}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
        try {
            opnameData = JSON.parse(savedDraft);
            showToast("Draft opname sebelumnya berhasil dimuat.");
        } catch (e) {
            console.error("Gagal muat draft:", e);
        }
    }
}

function clearDraft() {
    if (!currentUser || !currentUser.kdkmpId) return;
    const draftKey = `opnameDraft_${currentUser.kdkmpId}`;
    localStorage.removeItem(draftKey);
}

function filterBarang() {
    const search = document.getElementById("barangSearch").value.toLowerCase();
    const category = document.getElementById("kategoriFilter").value;
    const cards = document.querySelectorAll(".barang-card");

    cards.forEach(card => {
        const matchSearch = card.getAttribute("data-search").includes(search);
        const matchCategory = !category || card.getAttribute("data-category") === category;

        if (matchSearch && matchCategory) {
            card.classList.remove("hidden");
        } else {
            card.classList.add("hidden");
        }
    });
}

/* =========================
   SUBMIT OPNAME (POST)
========================= */
function submitOpname() {
    const items = Object.values(opnameData);
    if (items.length === 0) {
        showToast("Harap isi minimal 1 item!");
        return;
    }

    showConfirmModal("Submit Stock Opname", `Kirim hasil opname untuk KDKMP ${currentKdkmp.nama}?`, function () {
        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "submitOpname",
                kdkmpId: currentKdkmp.id,
                petugas: currentUser.name,
                items: items
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                showToast(res.message);
                opnameData = {};
                clearDraft(); // Hapus draft lokal KDKMP ini
                showPage("dashboardPage");
            } else {
                showToast("Gagal: " + res.message);
            }
        })
        .catch(err => {
            console.error("Submit Error:", err);
            showToast("Gagal terhubung ke server.");
        });
    });
}

function loadHistory() {
    const tbody = document.getElementById("historyTable");
    tbody.innerHTML = '<tr><td colspan="7">Memuat riwayat...</td></tr>';

    fetch(`${API_URL}?action=getHistory&kdkmpId=${currentUser.kdkmpId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success && data.history.length > 0) {
            let html = "";
            data.history.forEach(row => {
                const date = new Date(row.tanggal).toLocaleDateString("id-ID");
                html += `
                <tr>
                    <td><strong>${row.id}</strong></td>
                    <td>${date}</td>
                    <td>${row.kdkmp}</td>
                    <td>${row.petugas}</td>
                    <td>${row.totalItem}</td>
                    <td><span class="${row.totalSelisih > 0 ? 'text-danger' : ''}">${row.totalSelisih}</span></td>
                    <td><span class="status-badge status-sesuai">${row.status}</span></td>
                </tr>`;
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="7">Belum ada riwayat opname untuk KDKMP ini.</td></tr>';
        }
    });
}

/* =========================
   UI & NAVIGATION HELPERS
========================= */
function startNewOpname() {
    showPage("opnamePage");
}

function showPage(pageId, btnEl) {
    document.querySelectorAll(".content-page").forEach(p => p.classList.add("hidden"));
    document.getElementById(pageId).classList.remove("hidden");

    if (btnEl) {
        document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
        btnEl.classList.add("active");
    }

    if (pageId === "historyPage") loadHistory();

    if (window.innerWidth <= 900) toggleSidebar(false);
}

function toggleSidebar(forceState) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (forceState !== undefined) {
        sidebar.classList.toggle("open", forceState);
        overlay.classList.toggle("hidden", !forceState);
    } else {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("hidden");
    }
}

function showLoginMessage(msg, isError = true) {
    const el = document.getElementById("loginMessage");
    el.textContent = msg;
    el.style.color = isError ? "var(--red)" : "var(--blue)";
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    document.getElementById("toastMessage").textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function showConfirmModal(title, msg, onConfirm) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalMessage").textContent = msg;
    document.getElementById("confirmModal").classList.remove("hidden");

    document.getElementById("modalConfirmButton").onclick = function () {
        closeModal();
        onConfirm();
    };
}

function closeModal() {
    document.getElementById("confirmModal").classList.add("hidden");
}

/* =========================
   MOBILE INTERACTION IMPROVEMENTS
========================= */

// Otomatis sorot seluruh teks saat kolom input di-tap di HP
document.addEventListener("focusin", function (e) {
    if (e.target && e.target.tagName === "INPUT" && e.target.type === "number") {
        e.target.select();
    }
});

// Penyesuaian fungsi showPage agar sidebar otomatis tertutup di HP
function showPage(pageId, btnEl) {
    document.querySelectorAll(".content-page").forEach(p => p.classList.add("hidden"));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.remove("hidden");

    if (btnEl) {
        document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
        btnEl.classList.add("active");
    }

    // Scroll otomatis ke paling atas saat pindah halaman
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === "historyPage") loadHistory();

    // Sembunyikan sidebar otomatis jika di layar layar HP/Tablet
    if (window.innerWidth <= 900) {
        toggleSidebar(false);
    }
}

// Toggle Sidebar untuk HP
function toggleSidebar(forceState) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    
    if (!sidebar || !overlay) return;

    if (forceState !== undefined) {
        if (forceState) {
            sidebar.classList.add("open");
            overlay.classList.remove("hidden");
        } else {
            sidebar.classList.remove("open");
            overlay.classList.add("hidden");
        }
    } else {
        const isOpen = sidebar.classList.toggle("open");
        overlay.classList.toggle("hidden", !isOpen);
    }
}