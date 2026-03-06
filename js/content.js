console.log("PrimaDev MAP Helper - Activated ✅");

// === CONFIGURATION (LOADED FROM CONFIG.JS + SESSION) ===
let SUPABASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_URL : "";
let SUPABASE_KEY = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_ANON_KEY : "";
let SESSION_TOKEN = "";

async function loadConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        const session = await AuthHelper.getSession();
        if (session) {
            SESSION_TOKEN = session.access_token;
            SUPABASE_URL = CONFIG.SUPABASE_URL;
            SUPABASE_KEY = CONFIG.SUPABASE_ANON_KEY;
        } else {
            // Fallback to legacy custom config or from storage
            StorageHelper.get(['db_url', 'db_key'], (result) => {
                if (result.db_url) SUPABASE_URL = result.db_url;
                if (result.db_key) SUPABASE_KEY = result.db_key;
            });
        }
    }
}
loadConfig();

let nikDiKantong = "";
let qtyDiKantong = 1;
let tempData = null;
let namaAkunMAP = "Guest";
let jenisPelanggan = "Umum"; // default
let namaPelanggan = ""; // NEW: Customer Name
let isLoginWarningDismissed = false; // flag to silence repeated login alerts

// === EXTRACT CUSTOMER TYPE ===
function getJenisPelanggan() {
    // look for elements containing customer type near the quantity display
    const textElements = document.querySelectorAll('.mantine-Text-root');
    const customerTypes = ['Rumah Tangga', 'Usaha Mikro', 'Nelayan Sasaran', 'Petani Sasaran', 'Nelayan', 'Petani'];

    for (let elem of textElements) {
        const text = elem.textContent.trim();
        if (customerTypes.includes(text)) {
            return text;
        }
    }
    return "Umum"; // fallback
}

// === CUSTOM MODAL POPUP ===
function createLimitModal() {
    if (document.getElementById('map-helper-modal')) return; // avoid duplicates

    const modal = document.createElement('div');
    modal.id = 'map-helper-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #fff;
        border-radius: 12px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: slideUp 0.3s ease;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 16px;
    `;
    icon.textContent = '⚠️';

    const title = document.createElement('h2');
    title.style.cssText = `
        margin: 0 0 12px 0;
        color: #ef4444;
        font-size: 18px;
        font-weight: 600;
    `;
    title.textContent = 'Limit Transaksi Tercapai';

    const message = document.createElement('p');
    message.style.cssText = `
        margin: 0 0 24px 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.6;
    `;
    message.textContent = 'NIK yang Anda gunakan telah mencapai batas maksimal 10 tabung bulan ini. Silakan gunakan NIK lain atau tunggu bulan depan untuk melanjutkan transaksi.';

    const btn = document.createElement('button');
    btn.style.cssText = `
        background: #2563eb;
        color: #fff;
        border: none;
        padding: 10px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
    `;
    btn.textContent = 'Mengerti';
    btn.onmouseover = () => btn.style.background = '#1e40af';
    btn.onmouseout = () => btn.style.background = '#2563eb';
    btn.onclick = () => modal.remove();

    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(btn);

    // add style for animation
    if (!document.getElementById('map-helper-styles')) {
        const style = document.createElement('style');
        style.id = 'map-helper-styles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    modal.appendChild(content);
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
}

function createLoginWarningModal() {
    if (document.getElementById('map-login-warning-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'map-login-warning-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        font-family: 'Inter', sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #fff;
        border-radius: 24px;
        padding: 40px 32px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        text-align: center;
        animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    const iconWrapper = document.createElement('div');
    iconWrapper.style.cssText = `
        width: 80px; height: 80px;
        background: #fff1f2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = `
        font-size: 40px;
        color: #e11d48;
        font-weight: bold;
        animation: pulseWarning 2s infinite;
    `;
    icon.textContent = '!';

    const title = document.createElement('h3');
    title.style.cssText = `
        margin: 0 0 12px 0;
        color: #0f172a;
        font-size: 20px;
        font-weight: 700;
    `;
    title.textContent = 'Belum Terhubung';

    const message = document.createElement('p');
    message.style.cssText = `
        margin: 0 0 32px 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.6;
    `;
    message.textContent = 'Anda saat ini belum login ke ekstensi. Data transaksi tidak dapat disimpan ke database. Silahkan login terlebih dahulu agar data transaksi tersimpan dan tersinkronisasi.';

    const actions = document.createElement('div');
    actions.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

    const btnLogin = document.createElement('button');
    btnLogin.style.cssText = `
        background: #2563eb;
        color: #fff;
        border: none;
        padding: 14px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
    `;
    btnLogin.textContent = 'Buka Dashboard & Login';
    btnLogin.onclick = () => {
        window.open(chrome.runtime.getURL('dashboard.html'), '_blank');
        modal.remove();
    };

    const btnClose = document.createElement('button');
    btnClose.style.cssText = `
        background: transparent;
        color: #94a3b8;
        border: none;
        padding: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
    `;
    btnClose.textContent = 'Nanti Saja';
    btnClose.onclick = () => {
        isLoginWarningDismissed = true; // silence for current session
        modal.remove();
    };

    iconWrapper.appendChild(icon);
    actions.appendChild(btnLogin);
    actions.appendChild(btnClose);
    content.appendChild(iconWrapper);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(actions);
    modal.appendChild(content);

    // Add styles if missing
    if (!document.getElementById('map-helper-styles')) {
        const style = document.createElement('style');
        style.id = 'map-helper-styles';
        style.textContent = `
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes pulseWarning { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        `;
        document.head.appendChild(style);
    } else {
        // Ensure pulseWarning is there
        const style = document.getElementById('map-helper-styles');
        if (!style.textContent.includes('pulseWarning')) {
            style.textContent += ` @keyframes pulseWarning { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`;
        }
    }

    document.body.appendChild(modal);
}

// === EXTRACTION ERROR MODAL ===
function createExtractionErrorModal(missingFields) {
    if (document.getElementById('map-extraction-error-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'map-extraction-error-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(8px);
        display: flex; justify-content: center; align-items: center;
        z-index: 10005; font-family: 'Inter', sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #fff; border-radius: 20px; padding: 35px;
        max-width: 450px; width: 90%; text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        animation: slideUp 0.3s ease;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = `font-size: 50px; margin-bottom: 20px;`;
    icon.textContent = '❌';

    const title = document.createElement('h3');
    title.style.cssText = `margin: 0 0 10px 0; color: #e11d48; font-size: 20px; font-weight: 700;`;
    title.textContent = 'Gagal Mengambil Data';

    const message = document.createElement('p');
    message.style.cssText = `margin: 0 0 25px 0; color: #475569; font-size: 14px; line-height: 1.6;`;
    message.innerHTML = `Sistem gagal mendeteksi elemen berikut:<br><br><b>${missingFields.join(', ')}</b><br><br>Pihak Pertamina mungkin telah mengubah struktur website. Silakan hubungi developer untuk perbaikan segera.`;

    const btn = document.createElement('button');
    btn.style.cssText = `
        background: #0f172a; color: #fff; border: none; padding: 12px 25px;
        border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
    `;
    btn.textContent = 'Tutup & Hubungi Developer';
    btn.onclick = () => modal.remove();

    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(btn);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function checkAndDisablePayButton() {
    const btnPay = document.querySelector('[data-testid="btnPay"]');
    if (!btnPay) return;

    if (btnPay.disabled) {
        // if disabled, replace button to add modal listener
        const newBtn = btnPay.cloneNode(true);
        btnPay.parentNode.replaceChild(newBtn, btnPay);
        newBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            createLimitModal();
        }, true);
    }
}

function monitorInputs() {
    // 1. Ambil Nama Pangkalan (Bukan Nama Pemilik)
    const elemenPangkalan = document.querySelector('.mantine-i6l6d4');
    if (elemenPangkalan && elemenPangkalan.textContent) {
        namaAkunMAP = elemenPangkalan.textContent.trim();
    }

    const nikInput = document.querySelector('input[placeholder*="NIK"]') ||
        document.querySelector('input[role="combobox"]');
    if (nikInput && nikInput.value) {
        nikDiKantong = nikInput.value.replace(/\s+/g, '');
    }

    // extract customer type
    jenisPelanggan = getJenisPelanggan();

    // extract customer name
    const nameElem = document.querySelector('.mantine-Text-root.mantine-1ejsyif');
    if (nameElem && nameElem.textContent) {
        namaPelanggan = nameElem.textContent.trim();
    }
}

setInterval(monitorInputs, 500); // Cek setiap detik

async function saveToSupabase(nik, qty, month, owner, jenisPelanggan = "Umum", namaPelanggan = "") {
    // Re-check config before saving
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("❌ SUPABASE CONFIG MISSING: Silakan atur URL dan Key di Dashboard!");
        return;
    }

    const payload = {
        nik: nik,
        qty: qty,
        month_period: month,
        owner_map: owner,
        jenis_pelanggan: jenisPelanggan,
        nama_pelanggan: namaPelanggan
    };

    // ONLY save to cloud if logged in (SESSION_TOKEN exists)
    // Mendapatkan session terbaru (refresh jika perlu)
    const session = await AuthHelper.getSession();
    if (!session) {
        console.log("⚠️ Data tidak disimpan ke Cloud karena Anda belum Login.");
        return;
    }

    const currentToken = session.access_token;

    try {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/lpg_transactions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("✅ SUKSES: Data NIK " + nik + " berhasil disimpan di database!");
        }
    } catch (err) {
        console.error("❌ CLOUD ERROR:", err);
    }
}

// 3. TANGKAP KLIK CEK PESANAN (Untuk Alert & Persiapan Data)
document.addEventListener("mousedown", function (e) {
    const btnCek = e.target.closest('[data-testid="btnCheckOrder"]');

    if (btnCek && nikDiKantong.length >= 16) {
        // CHECK LOGIN STATUS AND IF NOT DISMISSED
        if (!SESSION_TOKEN && !isLoginWarningDismissed) {
            createLoginWarningModal();
            return;
        }

        const qtyInput = document.querySelector('input[data-testid="numberInput"]');
        let qtyAwal = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

        // VALIDASI ELEMEN: Periksa apakah ada data yang kosong
        let missing = [];
        if (!nikDiKantong || nikDiKantong.length < 16) missing.push("Identitas NIK");
        if (!namaPelanggan) missing.push("Nama Pelanggan");
        if (jenisPelanggan === "Umum" && !getJenisPelanggan().includes("Umum")) {
            // Jika fallback ke Umum padahal di layar mungkin ada yang lain
            // (opsional: biarkan jika Umum memang diperbolehkan)
        }
        if (!qtyInput) missing.push("Input Jumlah Tabung");

        if (missing.length > 0) {
            createExtractionErrorModal(missing);
            console.error("❌ GAGAL EKSTRAKSI:", missing.join(', '));
            return; // Hentikan proses jika ada yang gagal diambil
        }

        // use month-year suffix + customer type so each combination is tracked separately
        const bulanIni = (new Date().getMonth() + 1) + "-" + new Date().getFullYear();
        const storageKey = nikDiKantong + "_" + namaAkunMAP + "_" + jenisPelanggan + "_" + bulanIni;

        tempData = {
            nik: nikDiKantong,
            key: storageKey,
            namaAkun: namaAkunMAP,
            jenisPelanggan: jenisPelanggan,
            namaPelanggan: namaPelanggan,
            qty: qtyAwal,
            month: bulanIni
        };

        StorageHelper.get([storageKey], (result) => {
            let data = result[storageKey] || { total: 0 };
            const btnPay = document.querySelector('[data-testid="btnPay"]');
            if (data.total + qtyAwal > 10) {
                alert(`⚠️ Pangkalan ${namaAkunMAP}!\n\nNIK: ${nikDiKantong}\nLimit 10 tabung tercapai!\n\nSegera hentikan agar aman dari Uji Petik!`);
                if (btnPay) btnPay.disabled = true;
                checkAndDisablePayButton();
            } else {
                if (btnPay) btnPay.disabled = false;
            }
        });
    }
}, true);

// 4. VALIDASI SUKSES (Saat tombol Kirim Struk muncul)
const observer = new MutationObserver(() => {
    const isSuccess = Array.from(document.querySelectorAll('button'))
        .some(btn => btn.textContent.includes('KIRIM STRUK KE PELANGGAN'));

    if (isSuccess && tempData) {
        // Coba ambil angka dari elemen konfirmasi dengan cara yang lebih umum
        // Mencari elemen yang mengandung teks "Tabung" di halaman sukses
        let angkaFix = null;
        const allTexts = document.querySelectorAll('.mantine-Text-root, .mantine-17u1525, div');

        for (let el of allTexts) {
            const txt = el.textContent.trim();
            if (txt.includes('Tabung') && /^\d+/.test(txt)) {
                angkaFix = parseInt(txt.split(' ')[0]);
                if (!isNaN(angkaFix)) break;
            }
        }

        if (angkaFix) {
            tempData.qty = angkaFix;
        } else {
            console.log("ℹ️ Info: Menggunakan Qty dari input awal (Elemen Konfirmasi tidak terbaca)");
        }

        const { key, qty, month, namaAkun, jenisPelanggan: savedJenisPelanggan, nik, namaPelanggan: savedNamaPelanggan } = tempData;

        // Simpan ke Lokal
        StorageHelper.get([key], (result) => {
            let data = result[key] || { total: 0, month: month, owner: namaAkun, jenisPelanggan: savedJenisPelanggan, nikhid: nik, namaPelanggan: savedNamaPelanggan };
            data.total += qty;
            StorageHelper.set({ [key]: data }, () => {
                const remaining = 10 - data.total;
                console.log(`%c✅ DATA TERSIMPAN!`, "color: #2ecc71; font-weight: bold;");
                console.log(`Akun MAP: ${namaAkun}`);
                console.log(`NIK: ${nik}`);
                console.log(`Nama Pelanggan: ${savedNamaPelanggan}`);
                console.log(`Jenis Pelanggan: ${savedJenisPelanggan}`);
                console.log(`Jumlah: ${qty} Tabung` + (remaining >= 0 ? ` (Sisa ${remaining} tabung bulan ini)` : ""));

                const btnPay = document.querySelector('[data-testid="btnPay"]');
                if (btnPay && remaining <= 0) {
                    btnPay.disabled = true;
                    checkAndDisablePayButton();
                }
            });
        });

        // Simpan ke Cloud
        saveToSupabase(nik, qty, month, namaAkun, savedJenisPelanggan, savedNamaPelanggan);

        tempData = null; // Reset agar tidak tersimpan berkali-kali karena MutationObserver
    }
});

observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAccountName") {
        sendResponse({ name: namaAkunMAP });
    }
});