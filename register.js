const API_URL = "https://script.google.com/macros/s/AKfycbxF4OWQxWw-AO1Tq1Zq80eG75Oi5emHDYDjr_8QVoOHkvx365ew3XMhnBjlxf9yFbBdoQ/exec";

document.addEventListener("DOMContentLoaded", function () {
    loadKdkmpOptions();

    const form = document.getElementById("registerForm");
    if (form) {
        form.addEventListener("submit", handleRegister);
    }
});

function loadKdkmpOptions() {
    const select = document.getElementById("regKdkmpId");

    fetch(`${API_URL}?action=getAllKdkmpList`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.list.length > 0) {
                select.innerHTML = '<option value="">-- Pilih KDKMP --</option>';
                data.list.forEach(k => {
                    select.innerHTML += `<option value="${k.id}">${k.id} - ${k.nama}</option>`;
                });
            } else {
                select.innerHTML = '<option value="KDKMP-001">KDKMP-001 - CITAMAN</option>';
            }
        })
        .catch(err => {
            console.error("Gagal muat KDKMP:", err);
            select.innerHTML = '<option value="KDKMP-001">KDKMP-001 - CITAMAN</option>';
        });
}

function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    const name = document.getElementById("regName").value.trim();
    const role = document.getElementById("regRole").value;
    const kdkmpId = document.getElementById("regKdkmpId").value;

    if (!kdkmpId) {
        showMessage("Silakan pilih KDKMP terlebih dahulu.", true);
        return;
    }

    showMessage("Memproses pendaftaran...", false);

    const payload = {
        action: "addUser",
        username: username,
        password: password,
        name: name,
        role: role,
        kdkmpId: kdkmpId
    };

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showMessage("Pendaftaran berhasil! Akun Anda sedang menunggu verifikasi Admin...", false);
                document.getElementById("registerForm").reset();

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2500);
            } else {
                showMessage("Gagal: " + result.message, true);
            }
        })
        .catch(err => {
            console.error("Register Error:", err);
            showMessage("Gagal terhubung ke server.", true);
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

function showMessage(msg, isError = true) {
    const el = document.getElementById("registerMessage");
    if (el) {
        el.textContent = msg;
        el.style.color = isError ? "var(--red)" : "var(--green)";
    }
}