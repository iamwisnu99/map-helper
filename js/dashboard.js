// === CONFIGURATION & AUTH ===
let SUPABASE_URL = CONFIG.SUPABASE_URL;
let SUPABASE_KEY = CONFIG.SUPABASE_ANON_KEY;
let SESSION_TOKEN = "";

// Old Auth Modal elements removed

async function initAuth() {
    const session = await AuthHelper.getSession();

    if (session) {
        SESSION_TOKEN = session.access_token;
        // CHECK FOR PIN LOCK
        checkDashboardLock();

        try {
            // Attempt to fetch profile from Cloud (Supabase)
            const response = await fetch(`${SUPABASE_URL}/rest/v1/agent_profiles?id=eq.${session.user.id}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SESSION_TOKEN}`
                }
            });

            if (response.ok) {
                const profiles = await response.json();
                if (profiles && profiles.length > 0) {
                    const profile = profiles[0];
                    // Sync to Local Storage for faster subsequent loads and offline support
                    StorageHelper.set({ 'agent_profile': profile });
                    updateSidebarUI(profile);
                    console.log("[dashboard] Profile synced from cloud ✅");
                } else {
                    // If no cloud profile, try local fallback
                    const result = await new Promise(r => StorageHelper.get(['agent_profile'], r));
                    if (result.agent_profile) updateSidebarUI(result.agent_profile);
                }
            }
        } catch (e) {
            console.error("[dashboard] Cloud profile sync failed, using local fallback.");
            const result = await new Promise(r => StorageHelper.get(['agent_profile'], r));
            if (result.agent_profile) updateSidebarUI(result.agent_profile);
        }
    } else {
        window.location.href = 'index.html';
    }
}

function updateSidebarUI(profile) {
    const nameElem = document.getElementById('sidebarAgentName');
    const badgeElem = document.getElementById('userInitialBadge');
    if (nameElem) nameElem.textContent = profile.name || "Agen (Belum diatur)";
    if (badgeElem && profile.name) {
        badgeElem.textContent = profile.name[0].toUpperCase();
    }
}

// Auth Actions
// Old Auth Actions removed as we use index.html

initAuth();

// pagination & filtering state
let allData = [];
let filteredData = []; // for search and filters
let currentFilter = 'all';
let currentCustomerType = 'all';
let currentMonth = '';
let searchQuery = '';
let currentPage = 1;
let pageSize = 15;
let customerChart = null; // Global reference for the chart object

// Custom Month Picker state
let pickerYearValue = new Date().getFullYear();
let pickerMonthValue = new Date().getMonth() + 1; // 1-12

const monthsLabel = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// Element references
const pageSizeSelectTrigger = document.getElementById('pageSizeSelect');
const pageSizeOptions = document.getElementById('pageSizeOptions');
const pageSizeText = pageSizeSelectTrigger ? pageSizeSelectTrigger.querySelector('.selected-text') : null;

const accountSelectTrigger = document.getElementById('customSelect');
const accountOptionsContainer = document.getElementById('customOptions');
const accountSelectedText = accountSelectTrigger ? accountSelectTrigger.querySelector('.selected-text') : null;

const paginationContainer = document.getElementById('pagination');
const customerTypeSidebar = document.getElementById('customerTypeSidebar');
const nikSearchInput = document.getElementById('nikSearch');
const tableInfo = document.getElementById('tableInfo');

// Stat references
const statTotalNik = document.getElementById('statTotalNik');
const statTotalTabung = document.getElementById('statTotalTabung');
const statLimitReached = document.getElementById('statLimitReached');

const agentSelectTrigger = document.getElementById('agentSelectTrigger');
const agentSelectOptions = document.getElementById('agentSelectOptions');
const agentSelectedText = document.getElementById('agentSelectedText');

// UI Helpers for Custom Selects
function setupCustomSelect(trigger, optionsContainer, onSelect) {
    if (!trigger || !optionsContainer) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsContainer.classList.toggle('show');
    });

    window.addEventListener('click', () => {
        optionsContainer.classList.remove('show');
    });

    optionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.select-option');
        if (option) {
            const val = option.dataset.value;
            const text = option.textContent;

            // update UI
            trigger.querySelector('.selected-text').textContent = text;
            optionsContainer.querySelectorAll('.select-option').forEach(opt => {
                opt.classList.toggle('selected', opt === option);
            });

            optionsContainer.classList.remove('show');
            if (onSelect) onSelect(val);
        }
    });
}

// === DASHBOARD LOCK LOGIC ===
let isDashboardUnlocked = false;

function checkDashboardLock() {
    const lockModal = document.getElementById('pinProtectionModal');
    if (!lockModal) return;

    StorageHelper.get(['dashboard_unlocked', 'agent_profile'], (result) => {
        if (result.dashboard_unlocked) {
            isDashboardUnlocked = true;
            lockModal.style.display = 'none';
            loadDataFromCloud(currentFilter, currentMonth);
        } else {
            lockModal.style.display = 'flex';
            lockModal.classList.add('show');
            setupPinInputLogic(); // Initialize the cell input listeners
        }
    });
}

function setupPinInputLogic() {
    const inputs = document.querySelectorAll('.pin-box');
    const pinCard = document.getElementById('pinCard');
    const pinError = document.getElementById('pinError');
    const unlockBtn = document.getElementById('unlockDashboardBtn');
    const btnText = document.getElementById('unlockBtnText');

    if (!inputs.length) return;

    // Focus first input
    setTimeout(() => inputs[0].focus(), 100);

    inputs.forEach((input, index) => {
        // Only numbers
        input.oninput = (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val;

            if (val !== '') {
                e.target.classList.add('animate-pop', 'filled');
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    input.blur();
                    // Auto-trigger verification when the last digit is entered
                    if (unlockBtn) unlockBtn.click();
                }
            } else {
                e.target.classList.remove('filled');
            }
            if (pinError) pinError.style.opacity = '0';
        };

        // Backspace handling
        input.onkeydown = (e) => {
            if (e.key === 'Backspace' && e.target.value === '') {
                if (index > 0) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = '';
                    inputs[index - 1].classList.remove('filled');
                }
            }
        };

        // Paste handling
        input.onpaste = (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            if (pastedData) {
                pastedData.split('').forEach((char, i) => {
                    if (inputs[i]) {
                        inputs[i].value = char;
                        inputs[i].classList.add('filled');
                    }
                });
                const nextIdx = Math.min(pastedData.length, 5);
                inputs[nextIdx].focus();

                // Auto-trigger verification if 6 digits were pasted
                if (pastedData.length === 6 && unlockBtn) {
                    inputs[5].blur();
                    unlockBtn.click();
                }
            }
        };
    });

    if (unlockBtn) {
        unlockBtn.onclick = () => {
            let enteredPin = "";
            inputs.forEach(inp => enteredPin += inp.value);

            if (enteredPin.length < 6) {
                if (pinError) {
                    pinError.textContent = "Silakan masukkan PIN lengkap (6 digit).";
                    pinError.style.opacity = '1';
                }
                triggerShake(pinCard);
                return;
            }

            // Verify PIN
            StorageHelper.get(['agent_profile'], (result) => {
                const profile = result.agent_profile || {};
                const storedPin = profile.admin_pin || "123456"; // Default upgraded to 6 digits

                // Visual feedback
                if (btnText) btnText.textContent = "Memverifikasi...";
                unlockBtn.disabled = true;

                setTimeout(() => {
                    if (enteredPin === storedPin) {
                        if (btnText) btnText.textContent = "Berhasil!";
                        unlockBtn.style.background = "#10b981";

                        setTimeout(() => {
                            isDashboardUnlocked = true;
                            document.getElementById('pinProtectionModal').style.display = 'none';
                            StorageHelper.set({ 'dashboard_unlocked': true }, () => {
                                loadDataFromCloud(currentFilter, currentMonth);
                            });
                        }, 500);
                    } else {
                        if (btnText) btnText.textContent = "BUKA DASHBOARD";
                        unlockBtn.disabled = false;
                        if (pinError) {
                            pinError.textContent = "PIN salah. Silakan coba lagi.";
                            pinError.style.opacity = '1';
                        }
                        triggerShake(pinCard);
                        // Clear inputs
                        inputs.forEach(inp => {
                            inp.value = '';
                            inp.classList.remove('filled');
                        });
                        inputs[0].focus();
                    }
                }, 800);
            });
        };
    }
}

function triggerShake(el) {
    if (!el) return;
    el.classList.remove('animate-shake');
    void el.offsetWidth;
    el.classList.add('animate-shake');
}

async function loadDataFromCloud(filter = "all", month = "", preservePage = false) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return; // Wait for config

    // Pastikan session selalu valid (refresh jika perlu) sebelum melakukan fetch
    const session = await AuthHelper.getSession();
    if (!session) {
        console.log("[dashboard] No session found, redirecting to login.");
        window.location.href = 'index.html';
        return;
    }
    SESSION_TOKEN = session.access_token;

    currentFilter = filter;
    currentMonth = month;
    if (!preservePage) currentPage = 1;

    try {
        let allFetchedData = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
            let url = `${SUPABASE_URL}/rest/v1/rekap_nik_tahunan?select=*`;
            if (month) {
                const [y, m] = month.split('-');
                const mnum = parseInt(m, 10).toString();
                url += `&month_period=eq.${mnum}-${y}`;
            }

            const response = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SESSION_TOKEN}`,
                    'Range': `${from}-${to}`
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            allFetchedData = allFetchedData.concat(data);

            if (data.length < 1000) {
                hasMore = false;
            } else {
                from += 1000;
                to += 1000;
            }
        }

        allData = allFetchedData;
        console.log("[dashboard] all data loaded:", allData.length);

        updateFilterControls();
        refreshFilteredData();

        // update last refreshed timestamp
        const tsElem = document.getElementById('lastUpdated');
        if (tsElem) {
            const now = new Date();
            tsElem.textContent = `Update: ${now.toLocaleTimeString()}`;
        }
    } catch (err) {
        console.error("Gagal memuat data dari Supabase:", err);
        const tbody = document.querySelector("#nikTable tbody");
        if (tbody) tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:40px;'>Gagal memuat data cloud...</td></tr>";
    }
}

function updateFilterControls() {
    // refresh account dropdown
    const seenAccounts = new Set();
    const seenCustomerTypes = new Set();
    allData.forEach(d => {
        if (d.owner_map) seenAccounts.add(d.owner_map);
        if (d.jenis_pelanggan) seenCustomerTypes.add(d.jenis_pelanggan);
    });

    // Populate Account Filter
    while (accountOptionsContainer.children.length > 1) {
        accountOptionsContainer.removeChild(accountOptionsContainer.lastChild);
    }
    Array.from(seenAccounts).sort().forEach(acc => {
        const opt = document.createElement('div');
        opt.className = 'select-option';
        opt.dataset.value = acc;
        opt.textContent = acc;
        accountOptionsContainer.appendChild(opt);
    });

    // Populate Customer Type Sidebar
    if (customerTypeSidebar) {
        customerTypeSidebar.innerHTML = '<li class="sidebar-item ' + (currentCustomerType === 'all' ? 'active' : '') + '" data-type="all">Semua Jenis</li>';

        Array.from(seenCustomerTypes).sort().forEach(type => {
            const li = document.createElement('li');
            li.className = 'sidebar-item ' + (currentCustomerType === type ? 'active' : '');
            li.dataset.type = type;
            li.textContent = type;
            li.onclick = () => selectCustomerType(type);
            customerTypeSidebar.appendChild(li);
        });

        // add listener for the "All" item which was just added manually
        customerTypeSidebar.querySelector('[data-type="all"]').onclick = () => selectCustomerType('all');
    }
}

function selectCustomerType(type) {
    currentCustomerType = type;
    currentPage = 1;

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.type === type);
    });

    refreshFilteredData();
}

function refreshFilteredData() {
    searchQuery = nikSearchInput.value.toLowerCase();

    filteredData = allData.filter(d => {
        const matchesAccount = (currentFilter === 'all' || d.owner_map === currentFilter);
        const matchesType = (currentCustomerType === 'all' || d.jenis_pelanggan === currentCustomerType);
        const matchesSearch = !searchQuery ||
            (d.nik && d.nik.toLowerCase().includes(searchQuery)) ||
            (d.owner_map && d.owner_map.toLowerCase().includes(searchQuery));

        return matchesAccount && matchesType && matchesSearch;
    });

    // URUTKAN: Dari tabung terbanyak ke terendah
    filteredData.sort((a, b) => (b.total_tabung || 0) - (a.total_tabung || 0));

    updateStats();
    renderTable();
}

function updateStats() {
    const totalNik = filteredData.length;
    const totalTabung = filteredData.reduce((acc, curr) => acc + (curr.total_tabung || 0), 0);
    const limitReached = filteredData.filter(d => d.total_tabung >= 10).length;

    if (statTotalNik) statTotalNik.textContent = totalNik.toLocaleString('id-ID');
    if (statTotalTabung) statTotalTabung.textContent = totalTabung.toLocaleString('id-ID');
    if (statLimitReached) statLimitReached.textContent = limitReached.toLocaleString('id-ID');

    updateCustomerChart();
}

function updateCustomerChart() {
    const ctx = document.getElementById('customerChart');
    if (!ctx) return;

    // Calculate customer type distribution
    const counts = {};
    filteredData.forEach(d => {
        const type = d.jenis_pelanggan || 'Umum';
        counts[type] = (counts[type] || 0) + 1;
    });

    const total = filteredData.length || 1;
    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);
    const percentages = labels.map(l => Math.round((counts[l] / total) * 100));

    // Refined modern color palette
    const colors = [
        '#2563eb', // Primary Blue
        '#10b981', // Emerald Green
        '#f59e0b', // Amber Orange
        '#ef4444', // Red
        '#6366f1', // Indigo
        '#ec4899', // Pink
        '#8b5cf6'  // Violet
    ];

    if (customerChart) {
        customerChart.data.labels = labels;
        customerChart.data.datasets[0].data = data;
        customerChart.update();
    } else {
        customerChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const pct = Math.round((value / total) * 100);
                                return ` ${label}: ${value} NIK (${pct}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    // Update Custom Legend
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) {
        legendContainer.innerHTML = '';
        labels.forEach((label, i) => {
            const pct = percentages[i];
            const item = document.createElement('div');
            item.style.cssText = `display: flex; align-items: center; justify-content: space-between; font-size: 12px;`;
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 10px; height: 10px; border-radius: 3px; background: ${colors[i % colors.length]}"></div>
                    <span style="color: var(--text-muted); font-weight: 500;">${label}</span>
                </div>
                <div style="font-weight: 700; color: var(--text-main);">${pct}%</div>
            `;
            legendContainer.appendChild(item);
        });
    }

    // Update Center Text
    const totalPercentElem = document.getElementById('totalPercent');
    if (totalPercentElem) {
        totalPercentElem.textContent = filteredData.length > 0 ? "100%" : "0%";
    }
}

function renderTable() {
    const tbody = document.querySelector("#nikTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (filteredData.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:40px; color: #64748b;'>Tidak ada data yang ditemukan.</td></tr>";
        if (tableInfo) tableInfo.textContent = "Menampilkan 0 data";
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const total = filteredData.length;
    const start = (currentPage - 1) * pageSize;
    const pageItems = filteredData.slice(start, start + pageSize);

    pageItems.forEach(data => {
        const isLimit = data.total_tabung >= 10;
        const row = `
            <tr>
                <td>
                    <div class="nik-cell">${data.nik}</div>
                    <div style="font-size: 11px; color: #94a3b8;">${data.jenis_pelanggan || 'Umum'}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${data.nama_pelanggan || '-'}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${data.owner_map}</div>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center;">
                        <span class="qty-badge">${data.total_tabung}</span>
                    </div>
                </td>
                <td>
                    <span style="font-size: 13px; color: #475569;">${data.month_period}</span>
                </td>
                <td>
                    ${isLimit
                ? '<span class="badge badge-danger pulse">● LIMIT TERCAPAI</span>'
                : '<span class="badge badge-success">✓ Aman</span>'}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    const endIdx = Math.min(start + pageSize, total);
    if (tableInfo) tableInfo.textContent = `Menampilkan ${start + 1}-${endIdx} dari ${total} data`;

    renderPagination(total);
}

function renderPagination(totalItems) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return;

    // Previous
    const prev = document.createElement('button');
    prev.textContent = '‹';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
    paginationContainer.appendChild(prev);

    // Page numbers (limited)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const btn = document.createElement('button');
        btn.textContent = p;
        if (p === currentPage) btn.classList.add('active');
        btn.onclick = () => { currentPage = p; renderTable(); };
        paginationContainer.appendChild(btn);
    }

    // Next
    const next = document.createElement('button');
    next.textContent = '›';
    next.disabled = currentPage === totalPages;
    next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
    paginationContainer.appendChild(next);
}

// Custom Month Picker UI Logic
function setupMonthPicker() {
    const periodTrigger = document.getElementById('periodTrigger');
    const monthPickerPopover = document.getElementById('monthPickerPopover');
    const monthFilterDisplay = document.getElementById('monthFilterDisplay');
    const pickerYearDisplay = document.getElementById('pickerYear');
    const monthGrid = document.getElementById('monthGrid');
    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');

    if (!periodTrigger || !monthPickerPopover) return;

    const togglePopover = (e) => {
        e.stopPropagation();
        monthPickerPopover.classList.toggle('show');
        if (monthPickerPopover.classList.contains('show')) {
            renderMonthGrid();
        }
    };

    periodTrigger.addEventListener('click', togglePopover);
    monthFilterDisplay.addEventListener('click', togglePopover);

    window.addEventListener('click', (e) => {
        if (!periodTrigger.contains(e.target)) {
            monthPickerPopover.classList.remove('show');
        }
    });

    prevYearBtn.onclick = (e) => {
        e.stopPropagation();
        pickerYearValue--;
        updatePickerYear();
    };

    nextYearBtn.onclick = (e) => {
        e.stopPropagation();
        pickerYearValue++;
        updatePickerYear();
    };

    function updatePickerYear() {
        pickerYearDisplay.textContent = pickerYearValue;
        renderMonthGrid();
    }

    function renderMonthGrid() {
        monthGrid.innerHTML = '';
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthIdx = now.getMonth();

        // Ensure we are comparing with currentMonth value correctly
        const [selYear, selMonth] = currentMonth.split('-').map(v => parseInt(v));

        monthsLabel.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'month-item';

            // Highlight selected
            const isSelected = (pickerYearValue === selYear && (index + 1) === selMonth);
            if (isSelected) item.classList.add('selected');

            // Highlight "today's" month
            if (pickerYearValue === currentYear && index === currentMonthIdx) {
                item.classList.add('current');
            }

            item.textContent = label.substring(0, 3);
            item.title = label;

            item.onclick = (e) => {
                e.stopPropagation();
                pickerMonthValue = index + 1;
                const paddedMonth = String(pickerMonthValue).padStart(2, '0');
                const newValue = `${pickerYearValue}-${paddedMonth}`;

                // Sync to hidden input and update UI
                monthInput.value = newValue;
                updateDateDisplay(newValue);
                monthPickerPopover.classList.remove('show');

                // Trigger load
                loadDataFromCloud(currentFilter, newValue);
            };

            monthGrid.appendChild(item);
        });
    }
}

function updateDateDisplay(value) {
    if (!value) {
        monthFilterDisplay.value = "";
        return;
    }
    const [y, m] = value.split('-');
    const monthName = monthsLabel[parseInt(m) - 1];
    monthFilterDisplay.value = `${monthName} ${y}`;

    // Update local picker state to match
    pickerYearValue = parseInt(y);
    pickerMonthValue = parseInt(m);
}

// Initializations
const monthInput = document.getElementById('monthFilter');
const resetBtn = document.getElementById('resetMonth');

function setCurrentMonth() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const value = `${yyyy}-${mm}`;
    if (monthInput) monthInput.value = value;
    updateDateDisplay(value);
}

// Event Listeners
if (monthInput) {
    setCurrentMonth();
    // Native listener removed as it's hidden, logic handled by custom picker
}

if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setCurrentMonth();
        loadDataFromCloud(currentFilter, monthInput.value);
    });
}

if (nikSearchInput) {
    nikSearchInput.addEventListener('input', () => {
        currentPage = 1;
        refreshFilteredData();
    });
}

// Setup Custom Selects
setupCustomSelect(accountSelectTrigger, accountOptionsContainer, (val) => {
    loadDataFromCloud(val, monthInput ? monthInput.value : '');
});

setupCustomSelect(pageSizeSelectTrigger, pageSizeOptions, (val) => {
    pageSize = parseInt(val, 10);
    currentPage = 1;
    renderTable();
});

setupMonthPicker();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromCloud('all', monthInput ? monthInput.value : '');
});

// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebar = document.getElementById('closeSidebar');

if (menuToggle && sidebar && sidebarOverlay) {
    const toggleSidebar = () => {
        sidebar.classList.toggle('show');
        sidebarOverlay.classList.toggle('show');
        document.body.style.overflow = sidebar.classList.contains('show') ? 'hidden' : '';
    };

    menuToggle.onclick = toggleSidebar;
    sidebarOverlay.onclick = toggleSidebar;
    if (closeSidebar) closeSidebar.onclick = toggleSidebar;

    // Close on menu item click (mobile)
    sidebar.onclick = (e) => {
        if (e.target.closest('.sidebar-item') && window.innerWidth <= 1024) {
            toggleSidebar();
        }
    };
}

// === AGENT PROFILE MANAGEMENT ===
const openAgentInfoBtn = document.getElementById('openAgentInfoBtn');
const mainAgentInfoModal = document.getElementById('mainAgentInfoModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileSection = document.getElementById('profileSection');

if (openAgentInfoBtn) {
    openAgentInfoBtn.onclick = () => {
        StorageHelper.get(['supabase_session', 'agent_profile'], (result) => {
            if (!result.supabase_session) return;

            document.getElementById('profileEmail').value = result.supabase_session.user.email;

            const profile = result.agent_profile || {};
            document.getElementById('profileName').value = profile.name || "";
            document.getElementById('profilePhone').value = profile.phone || "";
            document.getElementById('profileAddress').value = profile.address || "";
            document.getElementById('profileOwner').value = profile.owner_name || "";
            document.getElementById('profilePin').value = profile.admin_pin || "1234";

            mainAgentInfoModal.classList.add('show');
        });
    };
}

if (closeProfileModal) {
    closeProfileModal.onclick = () => mainAgentInfoModal.classList.remove('show');
}

if (saveProfileBtn) {
    saveProfileBtn.onclick = async () => {
        const pinVal = document.getElementById('profilePin').value;

        // Validation: PIN must be 6 digits if provided
        if (pinVal && pinVal.length !== 6) {
            alert("PIN Keamanan harus terdiri dari 6 digit angka.");
            document.getElementById('profilePin').focus();
            return;
        }

        const session = await AuthHelper.getSession();
        if (!session) return;

        const profileData = {
            id: session.user.id,
            name: document.getElementById('profileName').value,
            phone: document.getElementById('profilePhone').value,
            address: document.getElementById('profileAddress').value,
            owner_name: document.getElementById('profileOwner').value,
            admin_pin: pinVal,
            updated_at: new Date().toISOString()
        };

        // UI Feedback
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Menyimpan...";

        try {
            // Upsert to Supabase
            const response = await fetch(`${SUPABASE_URL}/rest/v1/agent_profiles`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SESSION_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                // Sync to Local Storage
                StorageHelper.set({ 'agent_profile': profileData }, () => {
                    updateSidebarUI(profileData);
                    mainAgentInfoModal.classList.remove('show');
                    showSuccessToast("Profil agen telah diperbarui & disinkronkan ke Cloud.");
                });
            } else {
                throw new Error("Gagal kirim ke database cloud.");
            }
        } catch (e) {
            console.error("[dashboard] Save failed:", e);
            // Fallback: Save only to local if cloud fails
            StorageHelper.set({ 'agent_profile': profileData }, () => {
                updateSidebarUI(profileData);
                mainAgentInfoModal.classList.remove('show');
                showSuccessToast("Tersimpan lokal (Cloud tidak terjangkau).");
            });
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Simpan Perubahan";
        }
    };
}

function showSuccessToast(message) {
    const toast = document.getElementById('successToast');
    const msgElem = document.getElementById('toastMessage');
    if (toast && msgElem) {
        msgElem.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

if (profileSection) {
    const topbarProfileMenu = document.getElementById('topbarProfileMenu');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const doLogoutBtn = document.getElementById('doLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

    profileSection.onclick = (e) => {
        e.stopPropagation();
        topbarProfileMenu.classList.toggle('show');
        profileSection.classList.toggle('active');
    };

    if (confirmLogoutBtn) {
        confirmLogoutBtn.onclick = () => {
            topbarProfileMenu.classList.remove('show');
            profileSection.classList.remove('active');
            logoutConfirmModal.classList.add('show');
        };
    }

    if (doLogoutBtn) {
        doLogoutBtn.onclick = () => {
            StorageHelper.remove(['supabase_session', 'dashboard_unlocked'], () => location.reload());
        };
    }

    if (cancelLogoutBtn) {
        cancelLogoutBtn.onclick = () => {
            logoutConfirmModal.classList.remove('show');
        };
    }

    // Close dropdown when clicking outside
    window.addEventListener('click', () => {
        if (topbarProfileMenu) {
            topbarProfileMenu.classList.remove('show');
            profileSection.classList.remove('active');
        }
    });
}

// === PDF EXPORT MANAGEMENT ===
const exportPdfBtn = document.getElementById('exportPdfBtn');
const agentInfoModal = document.getElementById('agentInfoModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const confirmExportBtn = document.getElementById('confirmExportBtn');
const pangkalanNameInput = document.getElementById('pangkalanNameInput');


if (exportPdfBtn && agentInfoModal) {
    const noDataAlert = document.getElementById('noDataAlert');
    const closeNoDataAlert = document.getElementById('closeNoDataAlert');

    exportPdfBtn.onclick = () => {
        if (filteredData.length === 0) {
            noDataAlert.classList.add('show');
            return;
        }

        // Auto-fill from main profile
        StorageHelper.get(['agent_profile', 'supabase_session'], (result) => {
            if (result.agent_profile) {
                document.getElementById('agentNameInput').value = result.agent_profile.name || "";
                document.getElementById('agentEmailInput').value = result.supabase_session ? result.supabase_session.user.email : "";
                document.getElementById('agentPhoneInput').value = result.agent_profile.phone || "";
                document.getElementById('agentAddressInput').value = result.agent_profile.address || "";
                document.getElementById('agentOwnerInput').value = result.agent_profile.owner_name || "";
                pangkalanNameInput.value = currentFilter !== 'all' ? currentFilter : "";
            } else if (currentFilter !== 'all') {
                pangkalanNameInput.value = currentFilter;
            }
        });

        agentInfoModal.classList.add('show');
    };

    if (closeNoDataAlert) {
        closeNoDataAlert.onclick = () => noDataAlert.classList.remove('show');
    }

    closeModalBtn.onclick = () => {
        agentInfoModal.classList.remove('show');
    };

    confirmExportBtn.onclick = async () => {
        const agentName = document.getElementById('agentNameInput').value;
        const agentEmail = document.getElementById('agentEmailInput').value;
        const agentPhone = document.getElementById('agentPhoneInput').value;
        const agentAddress = document.getElementById('agentAddressInput').value;
        const agentOwner = document.getElementById('agentOwnerInput').value;
        const pangkalanReportName = pangkalanNameInput.value || '-';

        if (!agentName || agentName === '-') {
            alert("Mohon isi Nama Agen!");
            return;
        }

        // Save any changes back to the main agent profile
        if (typeof chrome !== 'undefined' && chrome.storage) {
            StorageHelper.get(['agent_profile'], (result) => {
                const profile = result.agent_profile || {};
                const updatedProfile = {
                    ...profile,
                    name: agentName,
                    phone: agentPhone,
                    address: agentAddress,
                    owner_name: agentOwner
                };
                StorageHelper.set({ 'agent_profile': updatedProfile }, () => {
                    updateSidebarUI(updatedProfile);
                });
            });
        }

        // Fix for "Cannot destructure property 'jsPDF' of 'window.jspdf'"
        let jsPDF;
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (typeof jspdf !== 'undefined' && jspdf.jsPDF) {
            jsPDF = jspdf.jsPDF;
        } else {
            alert("Library PDF (jsPDF) belum termuat sempurna. Silakan refresh halaman.");
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4');

        let logoWidth = 20; // Fallback
        // 1. ADD PERTAMINA LOGO (Left Top) - Adjusted for 4-line Info
        try {
            const img = new Image();
            img.src = '/assets/pertamina_logo.png';
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            if (img.complete && img.naturalWidth > 0) {
                const imgProps = doc.getImageProperties(img);
                // Logo height will be roughly 18mm to match 4 lines of text
                const height = 18;
                logoWidth = (imgProps.width * height) / imgProps.height;
                doc.addImage(img, 'PNG', 14, 10, logoWidth, height);
            }
        } catch (e) {
            console.error("Logo Pertamina tidak ditemukan", e);
        }

        // 2. AGENT INFO (Right of Logo - Multi-line)
        const textX = 14 + logoWidth + 8; // Start 8mm after logo
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(agentName.toUpperCase(), textX, 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);

        const colX = textX + 15; // fixed X for colon
        const valX = colX + 3;  // fixed X for value

        doc.text("Email", textX, 19);
        doc.text(":", colX, 19);
        doc.text(agentEmail || '-', valX, 19);

        doc.text("Telepon", textX, 23);
        doc.text(":", colX, 23);
        doc.text(agentPhone || '-', valX, 23);

        doc.text("Alamat", textX, 27);
        doc.text(":", colX, 27);
        doc.text(agentAddress || '-', valX, 27);

        // Header Line (Moved down further to clear the 4-line info)
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(14, 32, 283, 32);

        // 3. TITLE (Refined: Black & Centered)
        const pageWidth = doc.internal.pageSize.width;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0); // Black
        doc.text("LAPORAN TRANSAKSI MAP LPG 3KG", pageWidth / 2, 42, { align: 'center' });

        // 4. FILTER INFO (Split 2x2 Layout)
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        // Format Periode Header: "2026-02" -> "Februari 2026"
        let periodText = "Semua Periode";
        if (monthInput && monthInput.value) {
            const [y, m] = monthInput.value.split('-');
            const monthName = monthsLabel[parseInt(m) - 1];
            periodText = `${monthName} ${y}`;
        }
        const typeText = currentCustomerType === 'all' ? 'Semua Jenis Pelanggan' : currentCustomerType;
        const printTime = new Date().toLocaleString('id-ID');

        // Left Side alignment
        const leftLabelX = 14;
        const leftColonX = 35;
        const leftValueX = 38;

        doc.setFont("helvetica", "bold");
        doc.text("Periode", leftLabelX, 50);
        doc.text(":", leftColonX, 50);
        doc.setFont("helvetica", "normal");
        doc.text(periodText, leftValueX, 50);

        doc.setFont("helvetica", "bold");
        doc.text("Pangkalan", leftLabelX, 55);
        doc.text(":", leftColonX, 55);
        doc.setFont("helvetica", "normal");
        doc.text(pangkalanReportName, leftValueX, 55);

        // Right Side alignment (Shifted further right to align with table edge)
        const rightLabelX = 230;
        const rightColonX = 255;
        const rightValueX = 258;

        doc.setFont("helvetica", "bold");
        doc.text("Jenis Pelanggan", rightLabelX, 50);
        doc.text(":", rightColonX, 50);
        doc.setFont("helvetica", "normal");
        doc.text(typeText, rightValueX, 50);

        doc.setFont("helvetica", "bold");
        doc.text("Waktu Cetak", rightLabelX, 55);
        doc.text(":", rightColonX, 55);
        doc.setFont("helvetica", "normal");
        doc.text(printTime, rightValueX, 55);

        // 5. TABLE (LPG Green)
        const tableColumn = ["ID NIK", "NAMA PELANGGAN", "PANGKALAN", "JENIS PELANGGAN", "TOTAL TABUNG", "PERIODE", "STATUS"];
        const tableRows = filteredData.map(d => {
            // Format Table Period: "2-2026" -> "Februari 2026"
            let formattedPeriod = d.month_period || '-';
            if (d.month_period && d.month_period.includes('-')) {
                const parts = d.month_period.split('-');
                // Typically "M-YYYY" from content.js
                const m = parseInt(parts[0]);
                const y = parts[1];
                if (!isNaN(m) && m >= 1 && m <= 12) {
                    formattedPeriod = `${monthsLabel[m - 1]} ${y}`;
                }
            }

            return [
                d.nik,
                d.nama_pelanggan || '-',
                d.owner_map,
                d.jenis_pelanggan || 'Umum',
                d.total_tabung,
                formattedPeriod,
                d.total_tabung >= 10 ? 'LIMIT TERCAPAI' : 'Aman'
            ];
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 62,
            theme: 'grid',
            headStyles: {
                fillColor: [254, 0, 24], // Pertamina Red
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 8, textColor: 51 },
            columnStyles: {
                4: { halign: 'center', fontStyle: 'bold' },
                6: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                // FOOTER
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height;
                const pageWidth = pageSize.width;

                // Disclaimer
                doc.setFontSize(7);
                doc.setFont("helvetica", "italic");
                doc.setTextColor(148, 163, 184);
                const disclaimer = "Laporan ini adalah laporan non-resmi yang hanya membantu Agen untuk melakukan monitoring transaksi pada MAP";
                doc.text(disclaimer, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        });

        // Generate Filename: "Laporan Transaksi MAP - {Nama Pangkalan} {Bulan dan Tahun}"
        const formattedPeriod = periodText.toUpperCase();
        const cleanPangkalan = pangkalanReportName.replace(/\.pdf$/i, '').trim();
        const baseFilename = `Laporan Transaksi MAP - ${cleanPangkalan} ${formattedPeriod}`;
        const fullFilename = `${baseFilename}.pdf`;

        // SANGAT PENTING: Gunakan doc.save() jika ingin nama file PASTI benar.
        // Namun karena Anda ingin pratinjau, kita akan menggunakan teknik Iframe
        // agar browser tetap mengenali nama file dari metadata PDF.
        doc.setProperties({
            title: fullFilename
        });

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);

        // Buat atau cari Modal Preview
        let previewModal = document.getElementById('pdfPreviewModal');
        if (!previewModal) {
            previewModal = document.createElement('div');
            previewModal.id = 'pdfPreviewModal';
            previewModal.className = 'modal';
            previewModal.innerHTML = `
                <div class="modal-content" style="max-width: 95vw; width: 95vw; height: 90vh; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
                    <div style="padding: 15px 25px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #fff;">
                        <h3 class="modal-title" style="font-size: 16px;">Pratinjau Laporan</h3>
                        <div style="display: flex; gap: 10px;">
                            <button id="downloadPdfDirect" class="btn-submit" style="padding: 8px 16px; height: 36px; font-size: 12px; border-radius: 10px; cursor: pointer;">Simpan PDF</button>
                            <button id="closePreviewBtn" class="btn-cancel" style="padding: 8px 16px; height: 36px; font-size: 12px; border-radius: 10px; border: 1px solid var(--border); background: #f8fafc; cursor: pointer;">Tutup</button>
                        </div>
                    </div>
                    <iframe id="pdfFrame" style="width: 100%; height: 100%; border: none;"></iframe>
                </div>
            `;
            document.body.appendChild(previewModal);

            document.getElementById('closePreviewBtn').onclick = () => {
                previewModal.classList.remove('show');
            };
        }

        const pdfFrame = document.getElementById('pdfFrame');
        pdfFrame.src = url;

        // Tombol download paksa agar nama filenya PASTI benar 100%
        document.getElementById('downloadPdfDirect').onclick = () => {
            doc.save(fullFilename);
        };

        agentInfoModal.classList.remove('show');
        previewModal.classList.add('show');
    };
}

// --- CETAK LAPORAN SELURUH PANGKALAN ---
const exportFullPdfBtn = document.getElementById('exportFullPdfBtn');
if (exportFullPdfBtn) {
    exportFullPdfBtn.onclick = async () => {
        if (allData.length === 0) {
            alert("Data kosong, tidak dapat mencetak laporan.");
            return;
        }

        const result = await new Promise(r => StorageHelper.get(['agent_profile', 'supabase_session'], r));
        const profile = result.agent_profile || {};
        const agentName = profile.name || "NAMA PEMILIK AGEN";
        const ownerName = profile.owner_name || agentName;
        const agentEmail = result.supabase_session ? result.supabase_session.user.email : "-";
        const agentPhone = profile.phone || "-";
        const agentAddress = profile.address || "-";

        // Aggregate data by Pangkalan
        const pangkalanStats = {};
        allData.forEach(d => {
            const owner = d.owner_map;
            if (!pangkalanStats[owner]) {
                pangkalanStats[owner] = {
                    name: owner,
                    totalTransactions: 0,
                    niks: {} // To find top NIKs
                };
            }
            const qty = parseInt(d.total_tabung) || 0;
            pangkalanStats[owner].totalTransactions += qty;

            const nik = d.nik;
            pangkalanStats[owner].niks[nik] = (pangkalanStats[owner].niks[nik] || 0) + qty;
        });

        const tableRows = Object.values(pangkalanStats).sort((a, b) => b.totalTransactions - a.totalTransactions).map((p, idx) => {
            // Find top 1-2 NIKs
            const sortedNiks = Object.entries(p.niks).sort((a, b) => b[1] - a[1]);
            const topNiks = sortedNiks.slice(0, 2);

            const nikLabels = topNiks.map(n => n[0]).join('\n');
            const qtyLabels = topNiks.map(n => n[1] + " Tabung").join('\n');

            return [
                idx + 1,
                p.name,
                p.totalTransactions + " Tabung",
                nikLabels || '-',
                qtyLabels || '-'
            ];
        });

        // Re-use core PDF logic (simplified for aggregate)
        let jsPDF = window.jspdf ? window.jspdf.jsPDF : jspdf.jsPDF;
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;

        // DRAW HEADER (RE-USED logic)
        let logoWidth = 20;
        // 1. ADD PERTAMINA LOGO (Left Top)
        try {
            const img = new Image();
            img.src = '/assets/pertamina_logo.png';
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            if (img.complete && img.naturalWidth > 0) {
                const imgProps = doc.getImageProperties(img);
                const height = 18;
                logoWidth = (imgProps.width * height) / imgProps.height;
                doc.addImage(img, 'PNG', 14, 10, logoWidth, height);
            }
        } catch (e) {
            console.error("Logo Pertamina tidak ditemukan", e);
        }

        const textX = 14 + logoWidth + 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(agentName.toUpperCase(), textX, 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Email`, textX, 18.5);
        doc.text(`: ${agentEmail}`, textX + 15, 18.5);

        doc.text(`Telepon`, textX, 23);
        doc.text(`: ${agentPhone}`, textX + 15, 23);

        doc.text(`Alamat`, textX, 27.5);
        doc.text(`: ${agentAddress}`, textX + 15, 27.5);

        // Header Line with more space (Moved from 28 to 32)
        doc.line(14, 32, 283, 32);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("LAPORAN TRANSAKSI MAP PANGKALAN", pageWidth / 2, 45, { align: 'center' });

        const tableColumn = ["No", "Nama Pangkalan", "Total Transaksi (Bulan Ini)", "NIK Pelanggan (Top 1-2)", "Banyaknya Tabung"];
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 55,
            theme: 'grid',
            styles: { valign: 'middle' },
            headStyles: {
                fillColor: [254, 0, 24],
                halign: 'center',
                valign: 'middle',
                minCellHeight: 12
            },
            columnStyles: {
                0: { width: 15, halign: 'center' },
                1: { halign: 'left' },
                2: { width: 40, halign: 'center', fontStyle: 'bold' },
                3: { halign: 'left' },
                4: { width: 40, halign: 'center' }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                // FOOTER
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height;
                const pageWidth = pageSize.width;

                doc.setFontSize(8);
                doc.setFont("helvetica", "italic");
                doc.setTextColor(100);
                const disclaimer = "Laporan ini adalah laporan non-resmi yang hanya membantu Agen untuk melakukan monitoring transaksi pada MAP";
                doc.text(disclaimer, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        });

        // Signature removed per user request

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);

        // Buat atau cari Modal Preview
        let previewModal = document.getElementById('pdfPreviewModal');
        if (!previewModal) {
            previewModal = document.createElement('div');
            previewModal.id = 'pdfPreviewModal';
            previewModal.className = 'modal';
            previewModal.innerHTML = `
                    <div class="modal-content" style="max-width: 95vw; width: 95vw; height: 90vh; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
                        <div style="padding: 15px 25px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #fff;">
                            <h3 class="modal-title" style="font-size: 16px;">Pratinjau Laporan</h3>
                            <div style="display: flex; gap: 10px;">
                                <button id="downloadPdfDirect" class="btn-submit" style="padding: 8px 16px; height: 36px; font-size: 12px; border-radius: 10px; cursor: pointer;">Simpan PDF</button>
                                <button id="closePreviewBtn" class="btn-cancel" style="padding: 8px 16px; height: 36px; font-size: 12px; border-radius: 10px; border: 1px solid var(--border); background: #f8fafc; cursor: pointer;">Tutup</button>
                            </div>
                        </div>
                        <iframe id="pdfFrame" style="width: 100%; height: 100%; border: none;"></iframe>
                    </div>
                `;
            document.body.appendChild(previewModal);

            document.getElementById('closePreviewBtn').onclick = () => {
                previewModal.classList.remove('show');
            };
        }

        const pdfFrame = document.getElementById('pdfFrame');
        pdfFrame.src = url;

        // Tombol download paksa agar nama filenya PASTI benar
        document.getElementById('downloadPdfDirect').onclick = () => {
            doc.save(`Laporan Transaksi MAP Pangkalan - ${new Date().toLocaleDateString('id-ID')}.pdf`);
        };

        previewModal.classList.add('show');
    };
}

// Manual Refresh
const refreshDataBtn = document.getElementById('refreshDataBtn');
if (refreshDataBtn) {
    refreshDataBtn.onclick = () => {
        const icon = refreshDataBtn.querySelector('span');
        if (icon) icon.style.transition = 'transform 0.5s';
        if (icon) icon.style.transform = 'rotate(360deg)';
        setTimeout(() => { if (icon) icon.style.transform = ''; }, 500);

        loadDataFromCloud(currentFilter, monthInput ? monthInput.value : '', true);
    };
}

// === TOGGLE PASSWORD VISIBILITY ===
const toggleAuthPassword = document.getElementById('toggleAuthPassword');
const authPassword = document.getElementById('authPassword');
if (toggleAuthPassword && authPassword) {
    toggleAuthPassword.addEventListener('click', () => {
        const type = authPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        authPassword.setAttribute('type', type);
        toggleAuthPassword.classList.toggle('fa-eye');
        toggleAuthPassword.classList.toggle('fa-eye-slash');
    });
}

const togglePinPassword = document.getElementById('togglePinPassword');
const adminPinInput = document.getElementById('adminPinInput');
if (togglePinPassword && adminPinInput) {
    togglePinPassword.addEventListener('click', () => {
        const type = adminPinInput.getAttribute('type') === 'password' ? 'text' : 'password';
        adminPinInput.setAttribute('type', type);
        togglePinPassword.classList.toggle('fa-eye');
        togglePinPassword.classList.toggle('fa-eye-slash');
    });
}
