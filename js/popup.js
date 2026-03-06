// Initial UI state
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const loadingSection = document.getElementById('loadingSection');
const userEmailBadge = document.getElementById('userEmailBadge');
const loginError = document.getElementById('loginError');

// Check Session on Start
AuthHelper.getSession().then((session) => {
    if (session) {
        showMain(session.user.email);
    } else {
        showLogin();
    }
});

function showMain(email) {
    loadingSection.style.display = 'none';
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';

    // Tampilkan Nama Agen jika ada di profile, jika tidak gunakan Email
    StorageHelper.get(['agent_profile'], (result) => {
        if (result.agent_profile && result.agent_profile.name) {
            userEmailBadge.textContent = result.agent_profile.name;
        } else {
            userEmailBadge.textContent = email;
        }
    });

    initStats();
}

function showLogin() {
    loadingSection.style.display = 'none';
    mainSection.style.display = 'none';
    loginSection.style.display = 'block';
}

// 1. LOGIN LOGIC
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        loginError.textContent = "Email & Password wajib diisi!";
        return;
    }

    loginError.textContent = "Sedang login...";

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            StorageHelper.set({ 'supabase_session': data }, () => {
                showMain(data.user.email);
            });
        } else {
            loginError.textContent = data.error_description || data.message || "Gagal login!";
        }
    } catch (err) {
        loginError.textContent = "Koneksi gagal atau CONFIG salah.";
    }
});

// 2. LOGOUT LOGIC
document.getElementById('logoutBtn').addEventListener('click', () => {
    StorageHelper.remove(['supabase_session'], () => {
        showLogin();
    });
});

// 3. STATS LOGIC (Migrated from original popup.js)
function initStats() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes("subsiditepatlpg.mypertamina.id")) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "getAccountName" }, (response) => {
                if (chrome.runtime.lastError) {
                    document.getElementById('accName').textContent = "Akun: Belum Terdeteksi";
                    return;
                }
                if (response && response.name) {
                    document.getElementById('accName').textContent = "Akun: " + response.name;
                } else {
                    document.getElementById('accName').textContent = "Akun: Belum Terdeteksi";
                }
            });
        } else {
            document.getElementById('accName').textContent = "Akun: Dashboard Pertamina tidak terbuka";
        }
    });

    // Hitung NIK Limit dari Storage (Lokal)
    StorageHelper.get(null, (result) => {
        const bulanIni = (new Date().getMonth() + 1) + "-" + new Date().getFullYear();
        let limitCount = 0;

        for (let key in result) {
            if (key.endsWith("_" + bulanIni) && result[key].total >= 10) {
                limitCount++;
            }
        }
        document.getElementById('limitCount').textContent = limitCount;
    });
}

document.getElementById('openDashboard').addEventListener('click', () => {
    // Paksa kunci dashboard setiap kali dibuka dari popup
    StorageHelper.remove(['dashboard_unlocked'], () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });
});

// 4. Update Tahun Otomatis di Footer
const yearElem = document.getElementById('year');
if (yearElem) {
    yearElem.textContent = new Date().getFullYear();
}

// 5. Toggle Password Visibility
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });
}