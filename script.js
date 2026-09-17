const API_URL = "https://script.google.com/macros/s/AKfycbxF4OWQxWw-AO1Tq1Zq80eG75Oi5emHDYDjr_8QVoOHkvx365ew3XMhnBjlxf9yFbBdoQ/exec";
const MINIMUM_STOCK_THRESHOLD = 10;

let currentUser = null;
let currentKdkmp = null;
let barangList = [];
let opnameData = {};
let currentMasterList = [];
let allLowStockListAdmin = [];

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
    if (loginForm) loginForm.addEventListener("submit", login);

    const searchInput = document.getElementById("barangSearch");
    const categorySelect = document.getElementById("kategoriFilter");

    if (searchInput) {
        searchInput.addEventListener("input", filterBarang);
        searchInput.addEventListener("keyup", filterBarang);
    }
    if (categorySelect) categorySelect.addEventListener("change", filterBarang);
});

document.addEventListener("focusin", function (e) {
    if (e.target && e.target.tagName === "INPUT" && e.target.type === "number") {
        e.target.select();
    }
});

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
        body: JSON.stringify({ action: "login", username: username, password: password })
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

function loadInitialData() {
    fetch(`${API_URL}?action=getInitialData&kdkmpId=${currentUser.kdkmpId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentKdkmp = data.kdkmp;
            barangList = data.barang;
            renderDashboardInfo();
            loadDraft();
            renderBarangInput();
            renderKategoriFilter();
        }
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

    const isAdmin = currentUser && (currentUser.role.toLowerCase() === "admin" || currentUser.kdkmpId === "ALL");
    const adminFilterWrapper = document.getElementById("adminLowStockFilterWrapper");

    if (isAdmin) {
        if (adminFilterWrapper) adminFilterWrapper.classList.remove("hidden");
        loadPendingUsers(); // <--- BACA TABEL AKUN PENDING DI DASHBOARD ADMIN
        loadAdminLowStockData();
    } else {
        if (adminFilterWrapper) adminFilterWrapper.classList.add("hidden");
        document.getElementById("pendingUserSection").classList.add("hidden");
        document.querySelectorAll(".col-kdkmp-admin").forEach(el => el.classList.add("hidden"));
        checkAndRenderLowStockLocal();
    }
}

function checkAndRenderLowStockLocal() {
    const alertSection = document.getElementById("lowStockAlertSection");
    const alertBody = document.getElementById("lowStockTableBody");
    const statMenipisEl = document.getElementById("statMenipis");

    const lowStockItems = barangList.filter(item => Number(item.stokSystem) < MINIMUM_STOCK_THRESHOLD);

    if (statMenipisEl) statMenipisEl.textContent = lowStockItems.length;

    if (lowStockItems.length > 0) {
        if (alertSection) alertSection.classList.remove("hidden");

        let html = "";
        lowStockItems.forEach(item => {
            const isZero = Number(item.stokSystem) <= 0;
            const badgeClass = isZero ? "text-danger" : "text-warning";
            const badgeText = isZero ? "HABIS" : "MENIPIS";

            html += `
            <tr>
                <td><strong>${item.kode}</strong></td>
                <td>${item.nama}</td>
                <td>${item.kategori}</td>
                <td><strong style="color: var(--red);">${item.stokSystem} ${item.satuan}</strong></td>
                <td><span class="status-badge ${badgeClass}" style="background: ${isZero ? '#fef2f2' : '#fffbeb'}; padding: 4px 8px; border-radius: 6px;">${badgeText}</span></td>
            </tr>`;
        });

        if (alertBody) alertBody.innerHTML = html;
    } else {
        if (alertSection) alertSection.classList.add("hidden");
    }
}

function loadAdminLowStockData() {
    fetch(`${API_URL}?action=getAllKdkmpList`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const select = document.getElementById("adminLowStockSelect");
            select.innerHTML = '<option value="ALL">Semua KDKMP</option>';
            data.list.forEach(k => {
                select.innerHTML += `<option value="${k.id}">${k.nama} (${k.id})</option>`;
            });
        }
    });

    fetch(`${API_URL}?action=getAllLowStock`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            allLowStockListAdmin = data.list;
            renderAdminLowStockTable(allLowStockListAdmin);
        }
    });
}

function filterLowStockByAdmin(selectedKdkmpId) {
    if (selectedKdkmpId === "ALL") {
        renderAdminLowStockTable(allLowStockListAdmin, true);
    } else {
        const filtered = allLowStockListAdmin.filter(item => item.kdkmpId === selectedKdkmpId);
        renderAdminLowStockTable(filtered, false);
    }
}

function renderAdminLowStockTable(list, isAllView = true) {
    const alertSection = document.getElementById("lowStockAlertSection");
    const alertBody = document.getElementById("lowStockTableBody");
    const statMenipisEl = document.getElementById("statMenipis");
    const colKdkmp = document.querySelectorAll(".col-kdkmp-admin");

    if (statMenipisEl) statMenipisEl.textContent = list.length;

    if (list.length > 0) {
        if (alertSection) alertSection.classList.remove("hidden");

        if (isAllView) {
            colKdkmp.forEach(el => el.classList.remove("hidden"));
        } else {
            colKdkmp.forEach(el => el.classList.add("hidden"));
        }

        let html = "";
        list.forEach(item => {
            const isZero = Number(item.stokSystem) <= 0;
            const badgeClass = isZero ? "text-danger" : "text-warning";
            const badgeText = isZero ? "HABIS" : "MENIPIS";

            html += `
            <tr>
                ${isAllView ? `<td><span class="status-badge" style="background: #eef0f3;">${item.kdkmpNama}</span></td>` : ''}
                <td><strong>${item.kode}</strong></td>
                <td>${item.nama}</td>
                <td>${item.kategori}</td>
                <td><strong style="color: var(--red);">${item.stokSystem} ${item.satuan}</strong></td>
                <td><span class="status-badge ${badgeClass}" style="background: ${isZero ? '#fef2f2' : '#fffbeb'}; padding: 4px 8px; border-radius: 6px;">${badgeText}</span></td>
            </tr>`;
        });

        if (alertBody) alertBody.innerHTML = html;
    } else {
        if (alertSection) alertSection.classList.add("hidden");
    }
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
        const searchText = `${item.kode} ${item.nama} ${item.kategori}`.toLowerCase();

        html += `
        <div class="barang-card" id="card-${item.kode}" data-search="${searchText}" data-category="${item.kategori || ''}">
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
                <div class="input-box"><label>Fisik (CTN)</label><input type="number" min="0" placeholder="0" value="${saved.ctn}" oninput="calculateItem('${item.kode}', ${item.isiCtn}, ${item.stokSystem})"></div>
                <div class="input-box"><label>Fisik (PCS)</label><input type="number" min="0" placeholder="0" value="${saved.pcs}" oninput="calculateItem('${item.kode}', ${item.isiCtn}, ${item.stokSystem})"></div>
                <div class="result-box"><span>Total Fisik</span><strong id="total-${item.kode}">${saved.total} ${item.satuan}</strong></div>
                <div class="result-box"><span>Selisih</span><strong id="selisih-${item.kode}">${saved.total - item.stokSystem}</strong></div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    updateProgress();
}

function filterBarang() {
    const searchInput = document.getElementById("barangSearch");
    const categorySelect = document.getElementById("kategoriFilter");

    const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const categoryValue = categorySelect ? categorySelect.value : "";
    const cards = document.querySelectorAll("#barangContainer .barang-card");

    cards.forEach(card => {
        const matchSearch = (card.getAttribute("data-search") || "").includes(searchValue);
        const matchCategory = !categoryValue || card.getAttribute("data-category") === categoryValue;
        card.classList.toggle("hidden", !(matchSearch && matchCategory));
    });
}

function loadPendingUsers() {
    const section = document.getElementById("pendingUserSection");
    const tbody = document.getElementById("pendingUserTableBody");

    fetch(`${API_URL}?action=getPendingUsers`)
    .then(res => res.json())
    .then(data => {
        if (data.success && data.list.length > 0) {
            section.classList.remove("hidden");
            let html = "";
            data.list.forEach(u => {
                html += `
                <tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.name}</td>
                    <td>${u.role}</td>
                    <td>${u.kdkmpId}</td>
                    <td>
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px !important;" onclick="verifyUser('${u.username}', 'APPROVED')">Setujui</button>
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px !important; color: var(--red);" onclick="verifyUser('${u.username}', 'REJECTED')">Tolak</button>
                    </td>
                </tr>`;
            });
            tbody.innerHTML = html;
        } else {
            section.classList.add("hidden");
        }
    });
}

function verifyUser(username, status) {
    showToast("Memproses verifikasi...");
    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "verifyUser", username: username, status: status })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast(res.message);
            loadPendingUsers();
        } else {
            showToast("Gagal: " + res.message);
        }
    });
}

function loadMasterPageData() {
    const isAdmin = currentUser && (currentUser.role.toLowerCase() === "admin" || currentUser.kdkmpId === "ALL");
    const filterWrapper = document.getElementById("adminKdkmpFilterWrapper");
    
    if (isAdmin) {
        if (filterWrapper) filterWrapper.classList.remove("hidden");
        loadAdminMasterKdkmpOptions();
    } else {
        if (filterWrapper) filterWrapper.classList.add("hidden");
        fetchMasterData(currentUser.kdkmpId);
    }
}

function loadAdminMasterKdkmpOptions() {
    fetch(`${API_URL}?action=getAllKdkmpList`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const select = document.getElementById("adminKdkmpSelect");
            select.innerHTML = '<option value="">-- Pilih KDKMP --</option>';
            data.list.forEach(k => select.innerHTML += `<option value="${k.id}">${k.nama} (${k.id})</option>`);

            if (data.list.length > 0 && !select.value) {
                select.value = data.list[0].id;
                loadMasterByAdmin(data.list[0].id);
            }
        }
    });
}

function loadMasterByAdmin(kdkmpId) {
    if (!kdkmpId) return;
    const select = document.getElementById("adminKdkmpSelect");
    document.getElementById("masterSubtitle").textContent = `Menampilkan Master Katalog: ${select.options[select.selectedIndex].text}`;
    fetchMasterData(kdkmpId);
}

function fetchMasterData(kdkmpId) {
    const tbody = document.getElementById("masterTableBody");
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Memuat data barang...</td></tr>';

    fetch(`${API_URL}?action=getBarangByKdkmp&kdkmpId=${kdkmpId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success && data.barang.length > 0) {
            currentMasterList = data.barang;
            renderMasterKategoriFilter(currentMasterList);
            renderMasterTable(currentMasterList);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Tidak ada data master barang.</td></tr>';
        }
    });
}

function renderMasterKategoriFilter(list) {
    const kategoris = [...new Set(list.map(item => item.kategori))];
    const select = document.getElementById("masterKategoriFilter");
    if (!select) return;

    select.innerHTML = '<option value="">Semua Kategori</option>';
    kategoris.forEach(kat => {
        if (kat) select.innerHTML += `<option value="${kat}">${kat}</option>`;
    });
}

function renderMasterTable(list) {
    const tbody = document.getElementById("masterTableBody");
    let html = "";
    
    list.forEach(item => {
        html += `
        <tr class="master-row" data-search="${item.kode.toLowerCase()} ${item.nama.toLowerCase()} ${item.kategori.toLowerCase()}" data-category="${item.kategori || ''}">
            <td><strong>${item.kode}</strong></td>
            <td>${item.nama}</td>
            <td>${item.kategori}</td>
            <td>${item.isiCtn}</td>
            <td>${item.satuan}</td>
            <td><strong style="color: var(--primary);">${item.stokSystem} ${item.satuan}</strong></td>
        </tr>`;
    });

    tbody.innerHTML = html || '<tr><td colspan="6" class="empty-state">Data tidak ditemukan.</td></tr>';
}

function filterMasterTable() {
    const searchValue = (document.getElementById("masterSearch")?.value || "").toLowerCase().trim();
    const categoryValue = document.getElementById("masterKategoriFilter")?.value || "";
    const rows = document.querySelectorAll("#masterTableBody .master-row");

    rows.forEach(row => {
        const matchSearch = (row.getAttribute("data-search") || "").includes(searchValue);
        const matchCategory = !categoryValue || row.getAttribute("data-category") === categoryValue;
        row.classList.toggle("hidden", !(matchSearch && matchCategory));
    });
}

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

    opnameData[kode] = { kode: kode, ctn: ctn, pcs: pcs, stokSystem: stokSystem, stokFisik: totalFisik };
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
    localStorage.setItem(`opnameDraft_${currentUser.kdkmpId}`, JSON.stringify(opnameData));
    showToast(`Draft opname KDKMP ${currentKdkmp.nama} berhasil disimpan!`);
}

function loadDraft() {
    if (!currentUser || !currentUser.kdkmpId) return;
    const savedDraft = localStorage.getItem(`opnameDraft_${currentUser.kdkmpId}`);
    if (savedDraft) {
        try {
            opnameData = JSON.parse(savedDraft);
            showToast("Draft opname sebelumnya dimuat.");
        } catch (e) {}
    }
}

function clearDraft() {
    if (!currentUser || !currentUser.kdkmpId) return;
    localStorage.removeItem(`opnameDraft_${currentUser.kdkmpId}`);
}

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
            body: JSON.stringify({ action: "submitOpname", kdkmpId: currentKdkmp.id, petugas: currentUser.name, items: items })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                showToast(res.message);
                opnameData = {};
                clearDraft();
                showPage("dashboardPage");
            } else {
                showToast("Gagal: " + res.message);
            }
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
            tbody.innerHTML = '<tr><td colspan="7">Belum ada riwayat opname.</td></tr>';
        }
    });
}

function togglePasswordVisibility(inputId, btnEl, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        btnEl.textContent = "🙈";
    } else {
        input.type = "password";
        btnEl.textContent = "👁️";
    }
}

function startNewOpname() { showPage("opnamePage"); }

function showPage(pageId, btnEl) {
    document.querySelectorAll(".content-page").forEach(p => p.classList.add("hidden"));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.remove("hidden");

    if (btnEl) {
        document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
        btnEl.classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pageId === "dashboardPage") renderDashboardInfo();
    if (pageId === "historyPage") loadHistory();
    if (pageId === "masterPage") loadMasterPageData();
    if (window.innerWidth <= 900) toggleSidebar(false);
}

function toggleSidebar(forceState) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (!sidebar || !overlay) return;

    if (forceState !== undefined) {
        sidebar.classList.toggle("open", forceState);
        overlay.classList.toggle("hidden", !forceState);
    } else {
        const isOpen = sidebar.classList.toggle("open");
        overlay.classList.toggle("hidden", !isOpen);
    }
}

function showLoginMessage(msg, isError = true) {
    const el = document.getElementById("loginMessage");
    if (el) {
        el.textContent = msg;
        el.style.color = isError ? "var(--red)" : "var(--blue)";
    }
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMessage");
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }
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