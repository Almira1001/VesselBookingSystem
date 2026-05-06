// === DATA JADWAL TERMINAL STATIS ===
const terminalScheduleData = {
    "Pelindo": [
        {"vesselName": "CONTOH PELINDO", "voyage": "123P", "eta": "2025-11-20", "etd": "2025-11-21", "closing": "2025-11-19", "openStack": "2025-11-17"}
    ]
};

let globalData = [];
let dummyData = []; // Data terpisah untuk Dummy Booking
let databaseCostData = { headers: [], rows: [] }; // Data untuk Database Cost
let agreementData = []; // Data Agreement List untuk TOP 1 LINER

let currentRegion = null;
let incotermChart, monthlyChart, destinationChart, shippingLineContainerChart, containerChart;

// === VARIABEL BARU UNTUK KALENDER ===
let calendarCurrentDate = new Date(); // Tgl hari ini sebagai default
let eventsByDate = {}; // Object untuk menyimpan data acara berdasarkan tanggal

// --- VARIABEL BARU UNTUK NOTIFIKASI ---
let terminalNotifications = []; // Menyimpan notifikasi
let hasNewNotifications = false; // Status notifikasi baru

// === FUNGSI FIREBASE ===

// Simpan SEMUA data (globalData + dummyData) ke Firebase
window.saveAllDataToFirebase = async function() {
    if (!window._firebaseReady) {
        alert('Firebase belum siap. Tunggu sebentar dan coba lagi.');
        return;
    }
    const btn = document.getElementById('btn-save-firebase');
    const originalText = btn ? btn.innerHTML : '';
    try {
        if (btn) { btn.innerHTML = '⏳ Menyimpan...'; btn.disabled = true; }

        const db = window._firebaseDB;
        const ref = window._firebaseRef;
        const set = window._firebaseSet;

        // Simpan globalData
        await set(ref(db, 'globalData'), globalData.length > 0 ? globalData : []);
        // Simpan dummyData
        await set(ref(db, 'dummyData'), dummyData.length > 0 ? dummyData : []);
        // Simpan agreementData
        await set(ref(db, 'agreementData'), agreementData.length > 0 ? agreementData : []);

        if (btn) { btn.innerHTML = '✅ Tersimpan!'; }
        setTimeout(() => { if (btn) { btn.innerHTML = originalText; btn.disabled = false; } }, 2000);
        console.log('Firebase save success:', { globalData: globalData.length, dummyData: dummyData.length, agreementData: agreementData.length });
    } catch (err) {
        console.error('Firebase save error:', err);
        alert('❌ Gagal menyimpan ke Firebase: ' + err.message);
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
};

// Load data dari Firebase saat login
async function loadDataFromFirebase() {
    if (!window._firebaseReady) return;
    const db = window._firebaseDB;
    const ref = window._firebaseRef;
    const onValue = window._firebaseOnValue;

    return new Promise((resolve) => {
        onValue(ref(db, '/'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.globalData && Array.isArray(data.globalData)) {
                    globalData = data.globalData;
                    console.log('Firebase: loaded globalData', globalData.length);
                }
                if (data.dummyData && Array.isArray(data.dummyData)) {
                    dummyData = data.dummyData;
                    console.log('Firebase: loaded dummyData', dummyData.length);
                }
                if (data.agreementData && Array.isArray(data.agreementData)) {
                    agreementData = data.agreementData;
                    console.log('Firebase: loaded agreementData', agreementData.length);
                }
                renderAllTablesAndCharts();
                if (agreementData.length > 0) renderAgreementTable(agreementData);
            }
            resolve();
        }, { onlyOnce: true });
    });
}

// === FUNGSI LOGIN & LOGOUT ===
function handleLogin(event) {
    event.preventDefault(); // Mencegah form submit
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    // --- USERNAME & PASSWORD ANDA ---
    if (user === "2002271" && pass === "123") {
        // Berhasil login
        document.getElementById('login-overlay').style.display = 'none';
        document.querySelector('.sidebar').style.display = 'flex'; // 'flex' krn .sidebar adalah flex-column
        document.querySelector('.main-content').style.display = 'flex'; // 'flex' krn .main-content adalah flex-column
        errorEl.style.display = 'none';
        // Dashboard is default view - apply dashboard-mode
        const contentArea = document.getElementById('content-area');
        if (contentArea) contentArea.classList.add('dashboard-mode');

        // Load data dari Firebase setelah login
        loadDataFromFirebase().then(() => {
            renderAllTablesAndCharts();
        });
    } else {
        // Gagal login
        errorEl.textContent = 'Username atau Password salah.';
        errorEl.style.display = 'block';
    }
}

window.handleLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        document.getElementById('login-overlay').style.display = 'flex';
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.main-content').style.display = 'none';
        
        // Kosongkan field password untuk keamanan
        document.getElementById('password').value = '';
        document.getElementById('username').value = ''; // Opsional: kosongkan username juga
    }
}
// === AKHIR FUNGSI LOGIN ===


// === FUNGSI NOTIFIKASI BARU ===

// Fungsi dummy untuk mensimulasikan notifikasi baru dari Terminal
function checkTerminalUpdates() {
    // Simulasi: setiap kali dipanggil, tambahkan 1 notifikasi baru
    // Dalam implementasi nyata, ini akan membandingkan data lama dengan data baru dari API
    const terminals = ['JICT', 'KOJA', 'NPCT1', 'MAL', 'Pelindo'];
    const newUpdate = {
        id: Date.now(),
        terminal: terminals[Math.floor(Math.random() * 5)],
        message: `Jadwal kapal di terminal telah diperbarui. Cek Cargo Loaded by Vessel!`,
        timestamp: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
        isRead: false
    };

    // Hanya tambahkan jika belum ada notifikasi dummy yang sama dalam 5 detik terakhir
    if (terminalNotifications.length === 0 || Date.now() - terminalNotifications[0].id > 5000) {
         terminalNotifications.unshift(newUpdate); 
         hasNewNotifications = true;
         updateNotificationDisplay();
    }
}

function updateNotificationDisplay() {
    const countEl = document.getElementById('notification-count');
    const newCount = terminalNotifications.filter(n => !n.isRead).length;

    if (newCount > 0) {
        countEl.textContent = newCount;
        countEl.style.display = 'block';
    } else {
        countEl.style.display = 'none';
    }
}

window.showNotificationModal = function() {
    const modalBody = document.getElementById('notification-modal-body');
    
    if (terminalNotifications.length === 0) {
        modalBody.innerHTML = '<p style="text-align:center;">Tidak ada notifikasi baru.</p>';
    } else {
modalBody.innerHTML = terminalNotifications.map(n => `
        <div class="modal-event-item" style="opacity: ${n.isRead ? 0.7 : 1}; cursor: pointer;" onclick="markNotificationRead(${n.id})">
            <strong>${n.terminal} Update ${n.isRead ? '' : '— NEW!'}</strong>
            <p>${n.message}</p>
            <p style="font-size:10px; color:#999; margin-top:5px;">Pukul: ${n.timestamp}</p>
        </div>
    `).join('');

        // Setelah modal dibuka, semua notifikasi dianggap telah dilihat/dibaca
        terminalNotifications.forEach(n => n.isRead = true);
        hasNewNotifications = false;
        updateNotificationDisplay();
    }
    
    document.getElementById('notification-modal').style.display = 'flex';
}

window.markNotificationRead = function(id) {
    const notification = terminalNotifications.find(n => n.id === id);
    if (notification) {
        notification.isRead = true;
        updateNotificationDisplay();
        showNotificationModal(); // Perbarui tampilan modal
    }
}

window.closeNotificationModal = function() {
    document.getElementById('notification-modal').style.display = 'none';
}
// === AKHIR FUNGSI NOTIFIKASI BARU ===


// === FUNGSI BARU: MODAL & KALENDER ===
window.closeModal = function() {
    document.getElementById('calendar-modal').style.display = 'none';
}

window.showDayDetails = function(dateString) {
    const events = eventsByDate[dateString] || [];
    const modalBody = document.getElementById('modal-body-content');
    const modalTitle = document.getElementById('modal-date-title');
    
    const displayDate = new Date(dateString + 'T00:00:00');
    modalTitle.textContent = `Detail untuk ${displayDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    
    if (events.length === 0) {
        modalBody.innerHTML = '<p>Tidak ada jadwal untuk tanggal ini.</p>';
    } else {
        modalBody.innerHTML = events.map(event => `
            <div class="modal-event-item">
                <strong>${event.type}: ${event.data.shipToParty || 'N/A'}</strong>
                <p>SC: ${event.data.sc || 'N/A'} | Delivery: ${event.data.delivery || 'N/A'}</p>
                <p>Status: ${event.data.doStatus || 'N/A'} | Masalah: ${event.data.masalah || 'N/A'}</p>
            </div>
        `).join('');
    }
    
    document.getElementById('calendar-modal').style.display = 'flex';
}

function normalizeDestinationPort(port) {
    if (!port) return '';
    const portStr = String(port).trim();
    const firstPart = portStr.split(',')[0].trim();
    return firstPart.toUpperCase();
}

function normalizeContainerType(type) {
    if (!type) return '';
    const typeStr = String(type).trim().toUpperCase();
    
    if (typeStr.includes('20')) return '20';
    if (typeStr.includes('42')) return '40';
    if (typeStr.includes('45')) return '40HC';
    if (typeStr === '40HC') return '40HC';
    if (typeStr === '40') return '40';
    if (typeStr === '20') return '20';
    
    return typeStr;
}

function autoFillTOP1LINER() {
    console.log('=== AUTO-FILL TOP 1 LINER START ===');
    
    if (!agreementData || agreementData.length === 0) {
        console.warn('Agreement data not available');
        return;
    }
    
    let updatedCount = 0;
    
    globalData.forEach(row => {
        if (!row.destination) return;
        
        const normalizedDestPort = normalizeDestinationPort(row.destination);
        console.log(`Processing row ${row.id}: Destination = "${row.destination}" → Normalized = "${normalizedDestPort}"`);
        
        row.top1_20 = '';
        row.top1_40 = '';
        row.top1_40hc = '';
        
        // CONTAINER 20
        const qty20 = parseFloat(row.container20) || 0;
        if (qty20 > 0) {
            const matchingAgreements20 = agreementData.filter(agr => {
                const agrDestPort = normalizeDestinationPort(agr['Destination Port']);
                const agrType = normalizeContainerType(agr['Type']);
                return agrDestPort === normalizedDestPort && agrType === '20';
            });
            
            console.log(`  Container 20: Found ${matchingAgreements20.length} matching agreements`);
            
            if (matchingAgreements20.length > 0) {
                matchingAgreements20.sort((a, b) => {
                    const rateA = parseFloat(a['Rate']) || 999999;
                    const rateB = parseFloat(b['Rate']) || 999999;
                    return rateA - rateB;
                });
                
                const top1 = matchingAgreements20[0];
                row.top1_20 = top1['LINER'] || '';
                console.log(`  ✓ TOP 1 LINER 20: ${row.top1_20} (Rate: ${top1['Rate']})`);
                updatedCount++;
            } else {
                console.log(`  ✗ No matching agreement for Container 20`);
            }
        } else {
            console.log(`  Container 20: qty = 0, SKIP`);
        }
        
        // CONTAINER 40
        const qty40 = parseFloat(row.container40) || 0;
        if (qty40 > 0) {
            const matchingAgreements40 = agreementData.filter(agr => {
                const agrDestPort = normalizeDestinationPort(agr['Destination Port']);
                const agrType = normalizeContainerType(agr['Type']);
                return agrDestPort === normalizedDestPort && agrType === '40';
            });
            
            console.log(`  Container 40: Found ${matchingAgreements40.length} matching agreements`);
            
            if (matchingAgreements40.length > 0) {
                matchingAgreements40.sort((a, b) => {
                    const rateA = parseFloat(a['Rate']) || 999999;
                    const rateB = parseFloat(b['Rate']) || 999999;
                    return rateA - rateB;
                });
                
                const top1 = matchingAgreements40[0];
                row.top1_40 = top1['LINER'] || '';
                console.log(`  ✓ TOP 1 LINER 40: ${row.top1_40} (Rate: ${top1['Rate']})`);
                updatedCount++;
            } else {
                console.log(`  ✗ No matching agreement for Container 40`);
            }
        } else {
            console.log(`  Container 40: qty = 0, SKIP`);
        }
        
        // CONTAINER 40HC
        const qty40hc = parseFloat(row.container40hc) || 0;
        if (qty40hc > 0) {
            const matchingAgreements40hc = agreementData.filter(agr => {
                const agrDestPort = normalizeDestinationPort(agr['Destination Port']);
                const agrType = normalizeContainerType(agr['Type']);
                return agrDestPort === normalizedDestPort && agrType === '40HC';
            });
            
            console.log(`  Container 40HC: Found ${matchingAgreements40hc.length} matching agreements`);
            
            if (matchingAgreements40hc.length > 0) {
                matchingAgreements40hc.sort((a, b) => {
                    const rateA = parseFloat(a['Rate']) || 999999;
                    const rateB = parseFloat(b['Rate']) || 999999;
                    return rateA - rateB;
                });
                
                const top1 = matchingAgreements40hc[0];
                row.top1_40hc = top1['LINER'] || '';
                console.log(`  ✓ TOP 1 LINER 40HC: ${row.top1_40hc} (Rate: ${top1['Rate']})`);
                updatedCount++;
            } else {
                console.log(`  ✗ No matching agreement for Container 40HC`);
            }
        } else {
            console.log(`  Container 40HC: qty = 0, SKIP`);
        }
        
        const top1Parts = [row.top1_20, row.top1_40, row.top1_40hc].filter(x => x);
        row.top1 = top1Parts.length > 0 ? top1Parts.join(' | ') : '';
    });
    
    console.log(`=== AUTO-FILL TOP 1 LINER COMPLETE ===`);
    console.log(`Total fields updated: ${updatedCount}`);
}

function updateEventMap() {
    eventsByDate = {}; // Reset peta
    globalData.forEach(row => {
        const addEvent = (dateStr, type) => {
            if (!dateStr || dateStr.length < 10) return;
            const date = dateStr.substring(0, 10);
            if (!eventsByDate[date]) {
                eventsByDate[date] = [];
            }
            eventsByDate[date].push({ type: type, data: row });
        };
        
        addEvent(row.mad, 'MAD');
        addEvent(row.bookingDa, 'Booking Date');
        addEvent(row.etd, 'ETD');
    });
}

function renderCalendar(date) {
    updateEventMap(); 
    
    const calendarBody = document.getElementById('calendar-dates-body');
    if (!calendarBody) return;
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.getElementById('calendar-month-year').textContent = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    calendarBody.innerHTML = '';
    let dateNum = 1;

    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            let cellDay = '';
            let fullDateString = '';
            let cellClasses = [];
            let isCurrentMonth = false;
            
            if (i === 0 && j < firstDayOfMonth) {
                cellDay = '';
                cellClasses.push('day-other-month');
            } else if (dateNum > daysInMonth) {
                cellDay = '';
                cellClasses.push('day-other-month');
            } else {
                isCurrentMonth = true;
                cellDay = dateNum;
                const currentDate = new Date(year, month, dateNum);
                currentDate.setHours(0, 0, 0, 0);
                fullDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;
                
                if (currentDate.getTime() === today.getTime()) {
                    cellClasses.push('day-today');
                }

                if (eventsByDate[fullDateString]) {
                    cellClasses.push('day-has-events');
                }
                dateNum++;
            }
            
            
            if (isCurrentMonth) {
                cell.setAttribute('onclick', `showDayDetails('${fullDateString}')`);
                if (!cellClasses.includes('day-has-events')) {
                    cellClasses.push('day-clickable');
                }
            }
            
            cell.className = cellClasses.join(' ');
            cell.innerHTML = `<div class="calendar-day">${cellDay}</div>`;
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
        if (dateNum > daysInMonth) break;
    }
}
// === AKHIR FUNGSI KALENDER ===

function renderAgreementTable(data) {
    const tableHead = document.getElementById('agreementTableHead');
    const tableBody = document.getElementById('agreementTableBody');
    if (!tableHead || !tableBody) return;

    const headers = [
        "Agreement", "Calculation Sheet", "LINER", "Type", "Rate", 
        "Destination Port", "Destination Location"
    ];
    
    tableHead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';

    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 40px; color: #7f8c8d;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📄</div>
                    <strong>No data to display</strong><br>
                    <span style="font-size: 11px;">Upload an Excel file or adjust your search filter</span>
                </td>
            </tr>
        `;
        return;
    }

    const typeDisplayMap = { '20G0': '20', '42G0': '40', '45G0': '40HC' };
    let bodyHtml = '';
    
    data.forEach((row, index) => {
        bodyHtml += '<tr>';
        bodyHtml += `<td style="text-align:center;"><strong>${index + 1}</strong></td>`; // Nomor urut
        headers.slice(1).forEach(header => { // Skip "No" karena sudah ditambahkan manual
            let cellValue = (row && row[header] !== undefined && row[header] !== null) ? row[header] : '';
            if (header === 'Type') {
                cellValue = typeDisplayMap[cellValue] || cellValue;
            }
            bodyHtml += `<td title="${cellValue}">${cellValue}</td>`;
        });
        bodyHtml += '</tr>';
    });

    tableBody.innerHTML = bodyHtml;
}
// === FUNGSI BARU: HANDLE AGREEMENT EXCEL UPLOAD ===
function handleAgreementExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('=== AGREEMENT EXCEL IMPORT START ===');
            
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

            console.log('Total rows in Agreement Excel:', dataAsArray.length);

            // Cari header row
            let headerRowIndex = -1;
            const headerKeywords = ['agreement', 'liner', 'type', 'rate', 'destination'];
            for(let i=0; i < Math.min(10, dataAsArray.length); i++){
                const score = (dataAsArray[i] || []).reduce((acc, cell) => {
                    const cellStr = String(cell).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    return acc + (headerKeywords.some(kw => cellStr.includes(kw)) ? 1 : 0);
                }, 0);
                if (score > 2) { 
                    headerRowIndex = i; 
                    console.log('Agreement header found at row:', i);
                    break; 
                }
            }

            if (headerRowIndex === -1) {
                throw new Error("Could not find a valid header row in the Agreement Excel file.");
            }
            
            const rawHeaders = dataAsArray[headerRowIndex];
            const rawDataRows = dataAsArray.slice(headerRowIndex + 1);
            
            console.log('Raw headers:', rawHeaders);
            console.log('Data rows to process:', rawDataRows.length);
            
            // Convert to JSON format
            const jsonData = [];
            rawDataRows.forEach(rowArray => {
                if (!rowArray || rowArray.length === 0) return;
                
                const rowObj = {};
                rawHeaders.forEach((header, index) => {
                    rowObj[header] = rowArray[index] || '';
                });
                
                // Filter: harus ada data minimal
                if (rowObj['Agreement'] || rowObj['LINER'] || rowObj['Destination Port']) {
                    jsonData.push(rowObj);
                }
            });
            
            console.log('Processed agreement rows:', jsonData.length);
            console.log('Sample agreement data:', jsonData.slice(0, 2));
            
            if (jsonData.length === 0) {
                throw new Error("No valid agreement data found.");
            }
            
            // CRITICAL: Set agreementData global variable
            agreementData = jsonData;
            
            console.log('=== AGREEMENT DATA LOADED ===');
            console.log('Total agreements:', agreementData.length);
            
            // Render Agreement Table
            renderAgreementTable(agreementData);
            
            // CRITICAL: AUTO-UPDATE SEMUA TOP 1 LINER yang sudah ada
            autoUpdateAllTop1Liners();
            
            alert(`✅ ${agreementData.length} agreement data berhasil diimpor!\n\nTOP 1 LINER akan otomatis terisi saat Anda mengisi Destination Port dan Container Type.`);

        } catch (error) {
            console.error('=== AGREEMENT IMPORT ERROR ===', error);
            alert("❌ Error: " + error.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// === FUNGSI BARU: AUTO UPDATE ALL TOP 1 LINER ===
function autoUpdateAllTop1Liners() {
    console.log('=== AUTO UPDATE ALL TOP 1 LINER START ===');
    
    let updatedCount = 0;
    
    // Update globalData
    globalData.forEach((row, index) => {
        const destPort = (row.destination || '').split(',')[0].trim().toUpperCase();
        if (!destPort) return;
        
        console.log(`Processing row ${index + 1}: ${destPort}`);
        
        // Container 20
        const qty20 = parseFloat(row.container20) || 0;
        if (qty20 > 0) {
            const matching20 = agreementData.filter(agr => {
                const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                const agrType = (agr['Type'] || '').trim();
                return agrDest === destPort && (agrType === '20' || agrType === '20G0');
            });
            if (matching20.length > 0) {
                matching20.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                row.top1_20 = matching20[0].LINER || '';
                updatedCount++;
            }
        }
        
        // Container 40
        const qty40 = parseFloat(row.container40) || 0;
        if (qty40 > 0) {
            const matching40 = agreementData.filter(agr => {
                const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                const agrType = (agr['Type'] || '').trim();
                return agrDest === destPort && (agrType === '40' || agrType === '42G0');
            });
            if (matching40.length > 0) {
                matching40.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                row.top1_40 = matching40[0].LINER || '';
                updatedCount++;
            }
        }
        
        // Container 40HC
        const qty40hc = parseFloat(row.container40hc) || 0;
        if (qty40hc > 0) {
            const matching40hc = agreementData.filter(agr => {
                const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                const agrType = (agr['Type'] || '').trim();
                return agrDest === destPort && (agrType === '40HC' || agrType === '45G0');
            });
            if (matching40hc.length > 0) {
                matching40hc.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                row.top1_40hc = matching40hc[0].LINER || '';
                updatedCount++;
            }
        }
    });
    
    console.log(`Updated ${updatedCount} TOP 1 LINER fields in globalData`);
    
    // Re-render semua tabel
    const allData = globalData;
    renderTable(allData, 'tableBody', false);
    updateCharts(allData);
    updateStats(allData);
    
    if (currentRegion) {
        filterTrackingTable();
    }
    
    renderDummyBookingTable();
    
    console.log('=== AUTO UPDATE ALL TOP 1 LINER DONE ===');
}
function filterAgreementTable() {
    const filterValue = document.getElementById('filterAgreement').value.toLowerCase();
    const filteredData = agreementData.filter(row => 
        Object.values(row).some(val => String(val).toLowerCase().includes(filterValue))
    );
    renderAgreementTable(filteredData);
}

// === FUNGSI BARU: DUMMY BOOKING ===
window.addNewDummyEntry = function() {
    const newId = dummyData.length > 0 ? Math.max(...dummyData.map(d => d.id)) + 1 : 1;
const newEntry = {
    id: newId, region: currentRegion, vfPpp: "", sc: "", delivery: "", container20: 0, container40: 0, container40hc: 0, mad: "",
    shipToParty: "", shippingPoint: "", country: "", incot: "FOB", destination: "", bookingDa: "", marksBy: "", etd: "", 
    bookingNumb: "", liner: "", top1_20: "", top1_40: "", top1_40hc: "", reason: "", 
    keterangan: "", vesselName: "", 
    nw: 0, 
    doStatus: "CUSTOMER", postToSap: false, masalah: "None",
    siStatus: 'Pending', bcStatus: 'Pending'
};
    dummyData.push(newEntry);
    renderDummyBookingTable();
} 

window.deleteDummyEntry = function(rowId) {
    if (confirm('Are you sure you want to delete this dummy entry?')) {
        dummyData = dummyData.filter(row => row.id !== parseInt(rowId));
        renderDummyBookingTable();
    }
}

window.clearAllDummyData = function() {
    if (dummyData.length === 0) {
        alert("No dummy data to clear.");
        return;
    }
    if (confirm(`ARE YOU SURE you want to clear all ${dummyData.length} dummy entries? This action cannot be undone.`)) {
        dummyData = [];
        renderDummyBookingTable();
        alert("All dummy data has been cleared.");
    }
}
// === AKHIR FUNGSI BARU DUMMY BOOKING ===

window.addNewEntry = function() {
    if (!currentRegion) {
        alert("Pilih planner dari menu Tracking terlebih dahulu.");
        return;
    }
    if (currentRegion === 'Rekap') {
        alert("Tidak bisa menambah data dari halaman Rekap. Pilih planner spesifik.");
        return;
    }
    // Assign to planner's first region by default
    const plannerInfo = PLANNERS[currentRegion];
    const assignedRegion = plannerInfo ? plannerInfo.regions[0] : currentRegion;

    const newId = globalData.length > 0 ? Math.max(...globalData.map(d => d.id)) + 1 : 1;
    const newEntry = {
        id: newId, region: assignedRegion, vfPpp: "", sc: "", delivery: "", container20: 0, container40: 0, container40hc: 0, mad: "",
        shipToParty: "", shippingPoint: "", country: "", incot: "FOB", destination: "", bookingDa: "", marksBy: "", etd: "", 
        bookingNumb: "", liner: "", top1: "", reason: "", 
        keterangan: "", vesselName: "", voyage: "",
        nw: 0, 
        doStatus: "CUSTOMER", postToSap: false, masalah: "None",
        siStatus: 'Pending', bcStatus: 'Pending'
    };
    globalData.push(newEntry);
    
    // REVISI: Langsung render dashboard DAN tracking
    const allData = globalData;
    renderTable(allData, 'tableBody', false);
    updateCharts(allData);
    updateStats(allData);
    
    // Update tracking
    filterTrackingTable();
    
    // Update dummy booking
    renderDummyBookingTable();
    
    // Update calendar
    renderCalendar(calendarCurrentDate);
}

window.deleteEntry = function(rowId) {
    if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
        globalData = globalData.filter(row => row.id !== parseInt(rowId));
        
        // REVISI: Langsung render dashboard DAN tracking
        const allData = globalData;
        renderTable(allData, 'tableBody', false);
        updateCharts(allData);
        updateStats(allData);
        
        // Update tracking jika sedang aktif
        if (currentRegion) {
            filterTrackingTable();
        }
        
        // Update dummy booking
        renderDummyBookingTable();
        
        // Update calendar
        renderCalendar(calendarCurrentDate);
    }
}

window.deleteRegionData = function() { window.deletePlannerData(); } // backward compat
window.deletePlannerData = function() {
    if (!currentRegion) {
        alert('Pilih planner terlebih dahulu.');
        return;
    }
    if (currentRegion === 'Rekap') {
        alert('Tidak bisa hapus data dari halaman Rekap. Pilih planner spesifik.');
        return;
    }
    const plannerInfo = PLANNERS[currentRegion];
    const plannerRegions = plannerInfo ? plannerInfo.regions : [];
    const dataForPlanner = globalData.filter(row => plannerRegions.includes(row.region));
    if (dataForPlanner.length === 0) {
        alert(`Tidak ada data untuk planner ${currentRegion}.`);
        return;
    }
    if (confirm(`YAKIN ingin menghapus semua ${dataForPlanner.length} data untuk ${currentRegion}? Tidak bisa dibatalkan.`)) {
        globalData = globalData.filter(row => !plannerRegions.includes(row.region));
        renderTable(globalData, 'tableBody', false);
        updateCharts(globalData);
        updateStats(globalData);
        filterTrackingTable();
        renderDummyBookingTable();
        alert(`Semua data untuk ${currentRegion} telah dihapus.`);
    }
}

function initCharts() {
    if(incotermChart) incotermChart.destroy();
    if(monthlyChart) monthlyChart.destroy();
    if(destinationChart) destinationChart.destroy();
    if(shippingLineContainerChart) shippingLineContainerChart.destroy();
    if(containerChart) containerChart.destroy();

    // Dark green palette
    const G = ['#3ecf8e','#00d4ff','#f39c12','#e74c3c','#a78bfa','#06b6d4','#fb923c','#60a5fa'];
    const darkGrid = 'rgba(26,46,42,0.06)';
    const darkTick = '#5a7a70';
    const darkFont = { color: '#5a7a70', family: "'Plus Jakarta Sans', sans-serif", size: 10 };

    const commonBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10 } },
        plugins: { legend: { display: false } },
        scales: {
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { ...darkFont, maxRotation: 35 }
            },
            y: {
                grid: { display: true, drawBorder: false, color: darkGrid },
                ticks: { ...darkFont, padding: 6 },
                beginAtZero: true
            }
        }
    };

    const shippingLineChartOptions = {
        ...commonBarOptions,
        plugins: { legend: { position: 'bottom', labels: { padding: 16, color: '#5a7a70', font: { size: 10 } } } }
    };

    incotermChart = new Chart('incotermChart', {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: G, borderWidth: 0, hoverOffset: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: { legend: { position: 'bottom', labels: { padding: 10, color: '#5a7a70', font: { size: 10 }, boxWidth: 10 } } } }
    });

    monthlyChart = new Chart('monthlyChart', {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Shipments', data: [], borderColor: '#3ecf8e',
            backgroundColor: 'rgba(62,207,142,0.1)', tension: 0.4, fill: true,
            pointBackgroundColor: '#3ecf8e', pointRadius: 4, pointHoverRadius: 6, borderWidth: 2 }] },
        options: { ...commonBarOptions, plugins: { legend: { display: false } } }
    });

    destinationChart = new Chart('destinationChart', {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Shipments', data: [], backgroundColor: G, barPercentage: 0.65, categoryPercentage: 0.6, borderRadius: 4 }] },
        options: { ...commonBarOptions }
    });

    containerChart = new Chart('containerChart', {
        type: 'bar',
        data: { labels: ['20 ft', '40 ft', '40 HC'],
            datasets: [{ data: [], backgroundColor: ['#3ecf8e','#00d4ff','#f39c12'], barPercentage: 0.65, borderRadius: 6 }] },
        options: { ...commonBarOptions }
    });

    shippingLineContainerChart = new Chart('shippingLineContainerChart', {
        type: 'bar',
        data: { labels: [], datasets: [
            { label: '20', data: [], backgroundColor: '#3ecf8e', barPercentage: 0.8, categoryPercentage: 0.7, borderRadius: 3 },
            { label: '40', data: [], backgroundColor: '#00d4ff', barPercentage: 0.8, categoryPercentage: 0.7, borderRadius: 3 },
            { label: '40 HC', data: [], backgroundColor: '#f39c12', barPercentage: 0.8, categoryPercentage: 0.7, borderRadius: 3 }
        ]},
        options: { ...shippingLineChartOptions }
    });
}

// ======================================================
// WORLD MAP — SVG dot-map with destination highlighting
// ======================================================
const COUNTRY_COORDS = {
    // Asia
    'CHINA': [104, 35], 'JAPAN': [138, 36], 'SOUTH KOREA': [128, 37], 'KOREA': [128, 37],
    'TAIWAN': [121, 24], 'HONG KONG': [114, 22], 'VIETNAM': [108, 14], 'THAILAND': [101, 15],
    'MALAYSIA': [112, 4], 'SINGAPORE': [104, 1], 'INDONESIA': [118, -5], 'PHILIPPINES': [122, 12],
    'INDIA': [78, 22], 'BANGLADESH': [90, 24], 'PAKISTAN': [70, 30], 'SRI LANKA': [81, 7],
    'MYANMAR': [96, 17], 'CAMBODIA': [105, 12], 'LAOS': [103, 18],
    // Middle East
    'UAE': [54, 24], 'SAUDI ARABIA': [45, 24], 'KUWAIT': [48, 29], 'QATAR': [51, 25],
    'BAHRAIN': [50, 26], 'OMAN': [58, 21], 'JORDAN': [36, 31], 'EGYPT': [30, 27],
    'TURKEY': [35, 39],
    // Europe
    'GERMANY': [10, 51], 'NETHERLANDS': [5, 52], 'FRANCE': [2, 47], 'ITALY': [12, 43],
    'SPAIN': [-4, 40], 'UK': [-2, 54], 'BELGIUM': [4, 51], 'POLAND': [20, 52],
    'SWEDEN': [18, 60], 'DENMARK': [10, 56], 'NORWAY': [10, 60], 'FINLAND': [26, 64],
    'PORTUGAL': [-8, 39], 'GREECE': [22, 38], 'AUSTRIA': [14, 47], 'SWITZERLAND': [8, 47],
    // Americas
    'USA': [-100, 40], 'UNITED STATES': [-100, 40], 'CANADA': [-96, 56],
    'MEXICO': [-102, 24], 'BRAZIL': [-51, -10], 'ARGENTINA': [-65, -35],
    'COLOMBIA': [-74, 4], 'CHILE': [-71, -35], 'PERU': [-76, -10],
    // Africa
    'SOUTH AFRICA': [25, -29], 'NIGERIA': [8, 10], 'KENYA': [38, 0],
    'ETHIOPIA': [40, 8], 'GHANA': [-1, 8], 'TANZANIA': [35, -6],
    // Oceania
    'AUSTRALIA': [134, -26], 'NEW ZEALAND': [172, -41],
};

const MAP_COLORS = ['#3ecf8e','#60a5fa','#f59e0b','#f87171','#a78bfa','#34d399','#fb923c','#38bdf8'];

// ======= MAP ZOOM/PAN STATE =======
let mapScale = 1, mapX = 0, mapY = 0;
let mapDragging = false, mapDragStart = {x:0, y:0};

function initMapInteraction() {
    // No-op — Leaflet handles its own interactions
}

let _leafletMap = null;
let _leafletMarkers = [];

function renderWorldMap(data) {
    const legendEl = document.getElementById('mapLegend');
    const mapEl = document.getElementById('leafletWorldMap');
    if (!mapEl) return;

    const destCount = {};
    (data || []).forEach(row => {
        if (row.country) {
            const key = row.country.trim().toUpperCase();
            destCount[key] = (destCount[key] || 0) + 1;
        }
    });

    const topDests = Object.entries(destCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxCount = Math.max(...Object.values(destCount), 1);

    if (!_leafletMap) {
        _leafletMap = L.map('leafletWorldMap', {
            center: [20, 20], zoom: 2, minZoom: 1, maxZoom: 8,
            zoomControl: true, attributionControl: true
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors', maxZoom: 19
        }).addTo(_leafletMap);
    }

    _leafletMarkers.forEach(m => m.remove());
    _leafletMarkers = [];

    topDests.forEach(([country, count], i) => {
        const coords = COUNTRY_COORDS[country];
        if (!coords) return;
        const color = MAP_COLORS[i % MAP_COLORS.length];
        const radius = 20000 + (count / maxCount) * 80000;
        const circle = L.circle([coords[1], coords[0]], {
            color: color, fillColor: color, fillOpacity: 0.55, weight: 2, opacity: 0.9, radius
        }).addTo(_leafletMap);
        circle.bindPopup(`
            <div style="font-family:'Plus Jakarta Sans',sans-serif;text-align:center;padding:4px 8px;">
                <div style="font-weight:700;font-size:14px;color:#1a2e2a;">${country}</div>
                <div style="font-size:12px;color:#3ecf8e;font-weight:600;">${count} Order${count > 1 ? 's' : ''}</div>
            </div>`);
        _leafletMarkers.push(circle);
    });

    if (legendEl) {
        legendEl.innerHTML = topDests.length === 0
            ? '<span style="color:#888;font-size:11px;">No data</span>'
            : topDests.slice(0, 6).map(([country, count], i) => `
                <div class="map-legend-item">
                    <div class="map-legend-dot" style="background:${MAP_COLORS[i % MAP_COLORS.length]};"></div>
                    <span>${country.length > 14 ? country.slice(0,14)+'…' : country} <strong style="color:${MAP_COLORS[i % MAP_COLORS.length]}">${count}</strong></span>
                </div>`).join('');
    }

    setTimeout(() => { if (_leafletMap) _leafletMap.invalidateSize(); }, 200);
}



function updateCharts(data) {
    renderWorldMap(data || []);
    if (!incotermChart || !data) return; 
    
    const incotermCounts = data.reduce((acc, row) => {
        if (row && row.incot) acc[row.incot] = (acc[row.incot] || 0) + 1;
        return acc;
    }, {});
    incotermChart.data.labels = Object.keys(incotermCounts);
    incotermChart.data.datasets[0].data = Object.values(incotermCounts);
    incotermChart.update();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyCounts = {};
    data.forEach(row => {
        if (row && (row.mad || row.bookingDa)) {
            const dateStr = row.mad || row.bookingDa;
            const date = new Date(dateStr);
            if(!isNaN(date)) {
               const monthName = monthNames[date.getUTCMonth()];
               monthlyCounts[monthName] = (monthlyCounts[monthName] || 0) + 1;
            }
        }
    });
    monthlyChart.data.labels = monthNames.filter(m => monthlyCounts[m]);
    monthlyChart.data.datasets[0].data = monthNames.map(m => monthlyCounts[m] || 0).filter(c => c > 0);
    monthlyChart.update();

    const destCounts = data.reduce((acc, row) => {
        const item = row.country || 'N/A';
        if(item.trim() !== '' && item !== 'N/A') acc[item] = (acc[item] || 0) + 1;
        return acc;
    }, {});
    const sortedDests = Object.entries(destCounts).sort(([,a],[,b]) => b-a).slice(0, 5);
    destinationChart.data.labels = sortedDests.map(item => item[0]);
    destinationChart.data.datasets[0].data = sortedDests.map(item => item[1]);
    destinationChart.update();
    
    const lineData = data.reduce((acc, row) => {
        const line = row.liner || 'Blank';
        if (line.trim() !== '' && line !== 'N/A') {
            if (!acc[line]) acc[line] = { sum20: 0, sum40: 0, sum40hc: 0 };
            acc[line].sum20 += parseInt(row.container20, 10) || 0;
            acc[line].sum40 += parseInt(row.container40, 10) || 0;
            acc[line].sum40hc += parseInt(row.container40hc, 10) || 0;
        }
        return acc;
    }, {});
    const lineLabels = Object.keys(lineData);
    shippingLineContainerChart.data.labels = lineLabels;
    shippingLineContainerChart.data.datasets[0].data = lineLabels.map(line => lineData[line].sum20);
    shippingLineContainerChart.data.datasets[1].data = lineLabels.map(line => lineData[line].sum40);
    shippingLineContainerChart.data.datasets[2].data = lineLabels.map(line => lineData[line].sum40hc);
    shippingLineContainerChart.update();

    const containerSums = data.reduce((acc, row) => {
        acc.c20 += parseInt(row.container20, 10) || 0;
        acc.c40 += parseInt(row.container40, 10) || 0;
        acc.c40hc += parseInt(row.container40hc, 10) || 0;
        return acc;
    }, { c20: 0, c40: 0, c40hc: 0 });
    containerChart.data.datasets[0].data = [containerSums.c20, containerSums.c40, containerSums.c40hc];
    containerChart.update();
}

function renderAllTablesAndCharts() {
    console.log('=== renderAllTablesAndCharts() ===');
    console.log('Total globalData:', globalData.length);
    console.log('Current region:', currentRegion);
    
    // REVISI: Render dashboard TANPA FILTER - tampilkan SEMUA data
    const allData = globalData;
    renderTable(allData, 'tableBody', false);
    updateCharts(allData);
    updateStats(allData);
    
    // CRITICAL FIX: Render tracking untuk region yang sedang aktif
    if (currentRegion) {
        console.log('Rendering tracking for active region:', currentRegion);
        filterTrackingTable();
    }
    
    // Render dummy booking
    renderDummyBookingTable();
    

    console.log('=== renderAllTablesAndCharts() DONE ===');
}

// === TEMPORARY FUNCTIONS FOR SI/BC STATUS ===
window.handleFileUpload = function(type, rowId, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    if (rowIndex > -1) {
        if (confirm(`Simulasi: Anda akan mengunggah file untuk ${type} Status. Lanjutkan?`)) {
            data[rowIndex][`${type.toLowerCase()}Status`] = 'Submitted';
            renderAllTablesAndCharts(); // Re-render tabel untuk melihat perubahan status
        }
    }
}

window.handleFileView = function(type, rowId, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    if (rowIndex > -1) {
        const status = data[rowIndex][`${type.toLowerCase()}Status`];
        if (status === 'Submitted') {
            alert(`Simulasi: Menampilkan file yang telah diunggah untuk ${type} Status.`);
        } else {
            alert(`Tidak ada file terunggah untuk ${type} Status. Status: ${status}`);
        }
    }
}
// === FUNGSI BARU: HANDLE FILE UPLOAD UNTUK SI & BC ===
window.handleSIBCFileUpload = function(rowId, inputElement, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    
    if (rowIndex === -1) {
        alert('Error: Row not found');
        return;
    }
    
    const files = inputElement.files;
    if (!files || files.length === 0) {
        return;
    }
    
    // Initialize uploadedFiles array if not exists
    if (!data[rowIndex].uploadedFiles) {
        data[rowIndex].uploadedFiles = [];
    }
    
    // Validasi: maksimal 2 file
    const currentFileCount = data[rowIndex].uploadedFiles.length;
    const remainingSlots = 2 - currentFileCount;
    
    if (remainingSlots <= 0) {
        alert('Maximum 2 files allowed. Please delete existing files first.');
        inputElement.value = ''; // Reset input
        return;
    }
    
    // Process files
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    let processedCount = 0;
    
    filesToUpload.forEach((file, index) => {
        // Validasi ukuran file (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(`File "${file.name}" exceeds 5MB limit and will be skipped.`);
            return;
        }
        
        // Validasi tipe file
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 
                            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|doc|docx)$/i)) {
            alert(`File "${file.name}" has invalid type and will be skipped.`);
            return;
        }
        
        // Read file as base64
        const reader = new FileReader();
        reader.onload = function(e) {
            const fileData = {
                id: Date.now() + index, // Unique ID untuk setiap file
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result, // Base64 data
                uploadDate: new Date().toISOString()
            };
            
            data[rowIndex].uploadedFiles.push(fileData);
            processedCount++;
            
            // Re-render setelah semua file diproses
            if (processedCount === filesToUpload.length) {
                if (isDummy) {
                    renderDummyBookingTable();
                } else {
                    renderAllTablesAndCharts();
                }
                alert(`${processedCount} file(s) uploaded successfully!`);
            }
        };
        
        reader.onerror = function() {
            alert(`Error reading file: ${file.name}`);
        };
        
        reader.readAsDataURL(file);
    });
    
    // Reset input untuk allow upload ulang file yang sama
    inputElement.value = '';
}
// === FUNGSI BARU: VIEW UPLOADED FILES DENGAN MODAL ===
window.viewUploadedFiles = function(rowId, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    
    if (rowIndex === -1) {
        alert('Error: Row not found');
        return;
    }
    
    const row = data[rowIndex];
    const uploadedFiles = row.uploadedFiles || [];
    
    if (uploadedFiles.length === 0) {
        alert('No files uploaded yet.');
        return;
    }
    
    // Populate modal dengan file list
    const modalBody = document.getElementById('image-viewer-modal-body');
    const modalTitle = document.getElementById('image-modal-title');
    
    // Update title dengan info row
    modalTitle.textContent = `SI & BC Files - ${row.sc || 'N/A'} | ${row.delivery || 'N/A'}`;
    
    // Build file list HTML
    let filesHTML = '<div style="padding: 20px;">';
    filesHTML += '<h3 style="margin-bottom: 15px; color: #2c3e50;">Uploaded Files</h3>';
    
    uploadedFiles.forEach((file, index) => {
        const fileSizeKB = (file.size / 1024).toFixed(2);
        const uploadDate = new Date(file.uploadDate).toLocaleString('id-ID');
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        // Icon berdasarkan tipe file
        let fileIcon = '📄';
        if (fileExtension === 'pdf') fileIcon = '📕';
            else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) fileIcon = '🖼️';
                else if (['doc', 'docx'].includes(fileExtension)) fileIcon = '📝';
        
        filesHTML += `
            <div style="border: 1px solid #e0e6ed; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #f8f9fa;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 32px;">${fileIcon}</span>
                    <div style="flex: 1;">
                        <strong style="color: #667eea; font-size: 14px;">${file.name}</strong>
                        <p style="font-size: 11px; color: #7f8c8d; margin: 3px 0 0 0;">
                            Size: ${fileSizeKB} KB | Uploaded: ${uploadDate}
                        </p>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary btn-small" onclick="previewFile(${rowId}, ${index}, ${isDummy})" style="flex: 1;">
                        👁️ Preview
                    </button>
                    <button class="btn btn-success btn-small" onclick="downloadFile(${rowId}, ${index}, ${isDummy})" style="flex: 1;">
                        ⬇️ Download
                    </button>
                    <button class="btn btn-info btn-small" onclick="sendFileByEmail(${rowId}, ${index}, ${isDummy})" style="flex: 1;">
                        📩 Email
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteFile(${rowId}, ${index}, ${isDummy})" style="flex: 1;">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    filesHTML += '</div>';
    
    modalBody.innerHTML = filesHTML;
    
    // Show modal
    document.getElementById('image-viewer-modal').style.display = 'flex';
}
// === HELPER FUNCTIONS UNTUK FILE OPERATIONS ===

window.previewFile = function(rowId, fileIndex, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    
    if (rowIndex === -1 || !data[rowIndex].uploadedFiles || !data[rowIndex].uploadedFiles[fileIndex]) {
        alert('File not found');
        return;
    }
    
    const file = data[rowIndex].uploadedFiles[fileIndex];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    const modalBody = document.getElementById('image-viewer-modal-body');
    
    // Preview berdasarkan tipe file
    if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        // Image preview
        modalBody.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <img src="${file.data}" alt="${file.name}" style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <p style="margin-top: 15px; color: #7f8c8d; font-size: 12px;">${file.name}</p>
            </div>
        `;
    } else if (fileExtension === 'pdf') {
        // PDF preview
        modalBody.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <iframe src="${file.data}" style="width: 100%; height: 70vh; border: none; border-radius: 8px;"></iframe>
                <p style="margin-top: 15px; color: #7f8c8d; font-size: 12px;">${file.name}</p>
            </div>
        `;
    } else {
        // Other file types - show info only
        modalBody.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">ðŸ“„</div>
                <h3 style="color: #2c3e50; margin-bottom: 10px;">${file.name}</h3>
                <p style="color: #7f8c8d; margin-bottom: 20px;">Preview not available for this file type.</p>
                <button class="btn btn-success" onclick="downloadFile(${rowId}, ${fileIndex}, ${isDummy})">
                    â¬‡ï¸ Download File
                </button>
            </div>
        `;
    }
    
    // Modal sudah terbuka, tidak perlu show lagi
}

window.downloadFile = function(rowId, fileIndex, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    
    if (rowIndex === -1 || !data[rowIndex].uploadedFiles || !data[rowIndex].uploadedFiles[fileIndex]) {
        alert('File not found');
        return;
    }
    
    const file = data[rowIndex].uploadedFiles[fileIndex];
    
    // Create temporary link untuk download
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`File "${file.name}" downloaded successfully!`);
}

window.sendFileByEmail = function(rowId, fileIndex, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    
    if (rowIndex === -1 || !data[rowIndex].uploadedFiles || !data[rowIndex].uploadedFiles[fileIndex]) {
        alert('File not found');
        return;
    }
    
    const file = data[rowIndex].uploadedFiles[fileIndex];
    const row = data[rowIndex];
    
    // Simulasi kirim email
    const emailContent = `
📧 EMAIL SIMULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO: TruckingPlannerIKK@app.co.id
SUBJECT: SI & BC Documents - ${row.sc || 'N/A'} | ${row.delivery || 'N/A'}

Dear Trucking Planner Team,

Please find attached the SI & BC document for:

📋 BOOKING DETAILS:
- Region: ${row.region || 'N/A'}
- SC Number: ${row.sc || 'N/A'}
- Delivery Number: ${row.delivery || 'N/A'}
- Ship to Party: ${row.shipToParty || 'N/A'}
- Vessel Name: ${row.vesselName || 'N/A'}
- Destination: ${row.destination || row.country || 'N/A'}

📎 ATTACHMENT:
- File: ${file.name}

This is a simulated email. In production, this would send an actual email with the attached document.

Best regards,
Vessel Planner Team
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    // Tampilkan simulasi dalam modal
    const modalBody = document.getElementById('image-viewer-modal-body');
    const modalTitle = document.getElementById('image-modal-title');
    
    modalTitle.textContent = '📧 Email Simulation';
    
    modalBody.innerHTML = `
        <div style="padding: 20px;">
            <div style="background: #f8f9fa; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px;">
                        📧
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #2c3e50; font-size: 18px;">Email Sent Successfully!</h3>
                        <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 12px;">Simulation mode - No actual email was sent</p>
                    </div>
                </div>
                
                <div style="background: white; border-radius: 6px; padding: 15px; margin-top: 15px;">
                    <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 11px; color: #2c3e50; margin: 0; line-height: 1.6;">${emailContent}</pre>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button class="btn btn-primary" onclick="closeImageViewerModal()" style="padding: 10px 30px;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Show modal
    document.getElementById('image-viewer-modal').style.display = 'flex';
    
    console.log('📧 Email simulation for file:', file.name);
    console.log('Row data:', row);
}

// CRITICAL FIX: Pindahkan closeImageViewerModal ke SCOPE GLOBAL, BUKAN di dalam deleteFile!
window.closeImageViewerModal = function() {
    document.getElementById('image-viewer-modal').style.display = 'none';
}
// === FUNGSI BARU: SEND EMAIL TO OUTLOOK - LANGSUNG BUKA ===
// === FUNGSI BARU: SEND EMAIL TO OUTLOOK ===
// === FUNGSI BARU: SEND EMAIL TO OUTLOOK - FIXED ENCODING ===
window.sendEmailToOutlook = function(rowId, isDummy = false) {
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    
    if (rowIndex === -1) {
        alert('Error: Row not found');
        return;
    }
    
    const row = data[rowIndex];
    const uploadedFiles = row.uploadedFiles || [];
    
    // Email Recipients
    const toRecipients = 'Okky_Nurwidodo@app.co.id;Andhika_Pramana@app.co.id;Rizky_Ritonga@app.co.id';
    const ccRecipients = 'Adek_Sari@app.co.id;Trisna_Admanegara@app.co.id;Tellyana_Kusuma@app.co.id;Maulidya_P_Salsabila@app.co.id;Muhammad_Azami@app.co.id;Fitri_Adrianti@app.co.id';
    
    // Subject
    const scNumber = row.sc || 'N/A';
    const deliveryNumber = row.delivery || 'N/A';
    const subject = `SI & BC Documents - ${scNumber} | ${deliveryNumber}`;
    
    // Ambil data dari baris
    const region = row.region || 'N/A';
    const shipToParty = row.shipToParty || 'N/A';
    const vesselName = row.vesselName || 'N/A';
    const destination = row.destination || row.country || 'N/A';
    const shippingPoint = row.shippingPoint || 'N/A';
    
    // CRITICAL FIX: Build body text TANPA encode dulu
    const bodyTextRaw = 
        `Dear Trucking Planner Team,\n\n` +
        `Please find attached the SI & BC document for:\n\n` +
        `📋 BOOKING DETAILS:\n` +
        `- Region: ${region}\n` +
        `- SC: ${scNumber}\n` +
        `- Delivery Number : ${deliveryNumber}\n` +
        `- Ship to Party: ${shipToParty}\n` +
        `- Vessel Name: ${vesselName}\n` +
        `- Destination: ${destination}\n` +
        `- Shipping Point: ${shippingPoint}\n\n` +
        `📎 ATTACHMENT:\n` +
        `- File: SI & BC Documents\n\n` +
        `Thank You\n\n` +
        `Best regards,\n` +
        `Vessel Planner Team`;
    
    // CRITICAL FIX: Encode SELURUH body text dengan encodeURIComponent
    const bodyTextEncoded = encodeURIComponent(bodyTextRaw);
    
    // Build mailto link dengan body yang sudah di-encode dengan benar
    const mailtoLink = `mailto:${toRecipients}?cc=${ccRecipients}&subject=${encodeURIComponent(subject)}&body=${bodyTextEncoded}`;
    
    // Buka Outlook Web
    window.open(mailtoLink, '_blank');
    
    // Log untuk debugging
    console.log('Email opened successfully');
    if (uploadedFiles.length > 0) {
        console.log(`Files in system: ${uploadedFiles.length}`);
    }
}
// // === AKHIR FUNGSI SEND EMAIL TO OUTLOOK ===

window.deleteFile = function(rowId, fileIndex, isDummy = false) {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
        return;
    }
    
    const data = isDummy ? dummyData : globalData;
    const rowIndex = data.findIndex(row => row.id === parseInt(rowId));
    
    if (rowIndex === -1 || !data[rowIndex].uploadedFiles || !data[rowIndex].uploadedFiles[fileIndex]) {
        alert('File not found');
        return;
    }
    
    const fileName = data[rowIndex].uploadedFiles[fileIndex].name;
    
    // Remove file dari array
    data[rowIndex].uploadedFiles.splice(fileIndex, 1);
    
    // Re-render tabel
    if (isDummy) {
        renderDummyBookingTable();
    } else {
        renderAllTablesAndCharts();
    }
    
    // Close modal dan tampilkan lagi file list
    closeImageViewerModal();
    
    alert(`File "${fileName}" deleted successfully!`);
    
    // Jika masih ada file, tampilkan lagi modal
    if (data[rowIndex].uploadedFiles.length > 0) {
        setTimeout(() => viewUploadedFiles(rowId, isDummy), 100);
    }
}
// === END TEMPORARY FUNCTIONS ===

// === FUNGSI renderTable DIBUAT UMUM ===
function renderTable(data, tableBodyId, isEditable, isDummy = false) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    // CHANGED: masalahOptions now includes "None" as default
    const masalahOptions = ["None", "Reschedule", "Hold", "Etc"];

    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        // NEW LOGIC: Default neutral, then apply colors based on priority
let rowClass = '';
const masalah = row.masalah || 'None'; // Default "None" jika undefined
const postToSap = row.postToSap || false;
const doStatus = row.doStatus || 'CUSTOMER';

        // PRIORITY: Masalah (Red) > Post to SAP (Green) > DO Status (Yellow) > Default (Neutral/White)
if (masalah !== 'None') {
    // MERAH: Jika ada masalah (selain "None")
    rowClass = 'row-red';
} else if (postToSap === true) {
    // HIJAU: Jika sudah post to SAP (dan tidak ada masalah)
    rowClass = 'row-green';
} else if (doStatus === 'OK') {
    // KUNING: Jika DO sudah OK (dan tidak ada masalah & belum post SAP)
    rowClass = 'row-yellow';
}        // If none of above conditions, rowClass remains '' (neutral/white)

        tr.className = rowClass;

        const rowId = row.id;
        const isDummyFlag = isDummy ? 'true' : 'false';

        // FILE UPLOAD LOGIC
        const uploadedFiles = row.uploadedFiles || [];
        const fileCount = uploadedFiles.length;
        const isComplete = fileCount >= 2;

        const fileLabelClass = isComplete ? 'has-files' : (fileCount > 0 ? 'incomplete' : '');
        const fileLabelText = fileCount === 0 ? 'Choose Files' : `${fileCount} file(s)`;
        const badgeClass = isComplete ? 'complete' : 'incomplete';

        const siBcCell = `
            <td class="si-bc-cell">
                <div class="file-upload-wrapper">
                    <label class="file-upload-label ${fileLabelClass}" for="file-upload-${rowId}-${isDummyFlag}">
                        ${fileLabelText}
                    </label>
                    <input type="file" 
                           id="file-upload-${rowId}-${isDummyFlag}" 
                           class="file-upload-input" 
                           accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                           multiple
                           onchange="handleSIBCFileUpload(${rowId}, this, ${isDummyFlag})">
                    ${fileCount > 0 ? `<span class="file-count-badge ${badgeClass}">${fileCount}/2</span>` : ''}
                    ${fileCount > 0 ? `<button class="btn-view-files" onclick="viewUploadedFiles(${rowId}, ${isDummyFlag})" title="View uploaded files">👁️</button>` : ''}
                    <button class="btn-send-email" onclick="sendEmailToOutlook(${rowId}, ${isDummyFlag})" title="Send via Outlook">📧</button>
                </div>
            </td>
        `;

        if (isEditable) {
            const masalahOptionsHTML = masalahOptions.map(opt => {
                const displayText = opt === '' ? '-- Pilih --' : opt;
                return `<option value="${opt}" ${masalah === opt ? 'selected' : ''}>${displayText}</option>`;
            }).join('');

            const nwInTons = (parseFloat(row.nw) || 0) / 1000;
            const updateHandler = isDummy ? `handleDummyCellUpdate` : `handleCellUpdate`;
            const deleteHandler = isDummy ? `deleteDummyEntry(${rowId})` : `deleteEntry(${rowId})`;

            tr.innerHTML = `
                <td style="text-align:center;"><strong>${index + 1}</strong></td>
                <td title="${row.region || ''}">${row.region || ''}</td>
                <td title="${row.vfPpp || ''}"><input type="text" class="editable-cell" value="${row.vfPpp || ''}" onchange="${updateHandler}(${rowId}, 'vfPpp', this.value)"></td>
                <td title="${row.sc || ''}"><input type="text" class="editable-cell" value="${row.sc || ''}" onchange="${updateHandler}(${rowId}, 'sc', this.value)"></td>
                <td title="${row.delivery || ''}"><input type="text" class="editable-cell" value="${row.delivery || ''}" onchange="${updateHandler}(${rowId}, 'delivery', this.value)"></td>
                <td style="text-align:center;"><input type="number" class="editable-cell" value="${row.container20 || 0}" onchange="${updateHandler}(${rowId}, 'container20', this.value)" style="text-align:center;"></td>
                <td style="text-align:center;"><input type="number" class="editable-cell" value="${row.container40 || 0}" onchange="${updateHandler}(${rowId}, 'container40', this.value)" style="text-align:center;"></td>
                <td style="text-align:center;"><input type="number" class="editable-cell" value="${row.container40hc || 0}" onchange="${updateHandler}(${rowId}, 'container40hc', this.value)" style="text-align:center;"></td>
                <td><input type="date" class="editable-cell" value="${row.mad || ''}" onchange="${updateHandler}(${rowId}, 'mad', this.value)"></td>
                <td title="${row.shipToParty || ''}"><input type="text" class="editable-cell" value="${row.shipToParty || ''}" onchange="${updateHandler}(${rowId}, 'shipToParty', this.value)"></td>
                <td title="${row.shippingPoint || ''}"><input type="text" class="editable-cell" value="${row.shippingPoint || ''}" onchange="${updateHandler}(${rowId}, 'shippingPoint', this.value)"></td>
                <td title="${row.country || ''}"><input type="text" class="editable-cell" value="${row.country || ''}" onchange="${updateHandler}(${rowId}, 'country', this.value)"></td>
                <td><input type="text" class="editable-cell" value="${row.incot || ''}" onchange="${updateHandler}(${rowId}, 'incot', this.value)" style="text-align:center;"></td>
                <td title="${row.destination || ''}"><input type="text" class="editable-cell" value="${row.destination || ''}" onchange="${updateHandler}(${rowId}, 'destination', this.value)"></td>
                <td><input type="date" class="editable-cell" value="${row.bookingDa || ''}" onchange="${updateHandler}(${rowId}, 'bookingDa', this.value)"></td>
                <td title="${row.marksBy || ''}"><input type="text" class="editable-cell" value="${row.marksBy || ''}" onchange="${updateHandler}(${rowId}, 'marksBy', this.value)"></td>
                <td title="${row.bookingNumb || ''}"><input type="text" class="editable-cell" value="${row.bookingNumb || ''}" onchange="${updateHandler}(${rowId}, 'bookingNumb', this.value)"></td>
<td title="${row.liner || ''}"><input type="text" class="editable-cell" value="${row.liner || ''}" onchange="${updateHandler}(${rowId}, 'liner', this.value)"></td>
<td title="${row.top1_20 || ''}"><input type="text" class="editable-cell" value="${row.top1_20 || ''}" onchange="${updateHandler}(${rowId}, 'top1_20', this.value)"></td>
<td title="${row.top1_40 || ''}"><input type="text" class="editable-cell" value="${row.top1_40 || ''}" onchange="${updateHandler}(${rowId}, 'top1_40', this.value)"></td>
<td title="${row.top1_40hc || ''}"><input type="text" class="editable-cell" value="${row.top1_40hc || ''}" onchange="${updateHandler}(${rowId}, 'top1_40hc', this.value)"></td>
<td title="${row.reason || ''}"><input type="text" class="editable-cell" value="${row.reason || ''}" onchange="${updateHandler}(${rowId}, 'reason', this.value)"></td>
<td title="${row.keterangan || ''}"><input type="text" class="editable-cell" value="${row.keterangan || ''}" onchange="${updateHandler}(${rowId}, 'keterangan', this.value)"></td>
<td title="${row.vesselName || ''}"><input type="text" class="editable-cell" value="${row.vesselName || ''}" onchange="${updateHandler}(${rowId}, 'vesselName', this.value)"></td>
                <td title="${row.voyage || ''}"><input type="text" class="editable-cell" value="${row.voyage || ''}" onchange="${updateHandler}(${rowId}, 'voyage', this.value)"></td>
                <td>
                    <div class="datetime-container">
                        <input type="date" class="editable-cell" value="${row.openCyDate || ''}" onchange="${updateHandler}(${rowId}, 'openCyDate', this.value)" style="font-size:9px;">
                        <input type="time" class="editable-cell" value="${row.openCyTime || ''}" onchange="${updateHandler}(${rowId}, 'openCyTime', this.value)" style="font-size:9px;">
                    </div>
                </td>
                <td>
                    <div class="datetime-container">
                        <input type="date" class="editable-cell" value="${row.closingFisikDate || ''}" onchange="${updateHandler}(${rowId}, 'closingFisikDate', this.value)" style="font-size:9px;">
                        <input type="time" class="editable-cell" value="${row.closingFisikTime || ''}" onchange="${updateHandler}(${rowId}, 'closingFisikTime', this.value)" style="font-size:9px;">
                    </div>
                </td>
                <td><input type="date" class="editable-cell" value="${row.etd || ''}" onchange="${updateHandler}(${rowId}, 'etd', this.value)"></td>
                <td style="text-align:center;"><input type="number" step="0.01" class="editable-cell" value="${nwInTons.toFixed(2)}" onchange="${updateHandler}(${rowId}, 'nw', parseFloat(this.value) * 1000)" style="text-align:center;"></td>
                <td style="text-align:center;">
                    <input type="checkbox" class="do-status-checkbox" ${doStatus === 'OK' ? 'checked' : ''} onchange="${isDummy ? 'updateDummyDoStatus' : 'updateDoStatus'}(${rowId}, this.checked)">
                </td>
                <td style="text-align:center;">
                    <input type="checkbox" ${postToSap ? 'checked' : ''} onchange="${updateHandler}(${rowId}, 'postToSap', this.checked)">
                </td>
                <td>
                    <select class="editable-cell" onchange="${updateHandler}(${rowId}, 'masalah', this.value)" style="font-size:9px;">
                        ${masalahOptionsHTML}
                    </select>
                </td>
                ${(tableBodyId === 'trackingTableBody' || tableBodyId === 'dummyBookingTableBody') ? `
                    ${siBcCell}
                    <td style="text-align:center;">
                        <button class="btn btn-danger btn-small" onclick="${deleteHandler}" style="font-size:9px; padding:2px 6px;">🗑️</button>
                    </td>
                ` : ''}
            `;
} 
else {
    const nwInTons = (parseFloat(row.nw) || 0) / 1000;
    tr.innerHTML = `
        <td style="text-align:center;"><strong>${index + 1}</strong></td>
        <td title="${row.region || ''}">${row.region || ''}</td>
        <td title="${row.vfPpp || ''}">${row.vfPpp || ''}</td>
        <td title="${row.sc || ''}">${row.sc || ''}</td>
        <td title="${row.delivery || ''}">${row.delivery || ''}</td>
        <td style="text-align:center;">${row.container20 || 0}</td>
        <td style="text-align:center;">${row.container40 || 0}</td>
        <td style="text-align:center;">${row.container40hc || 0}</td>
        <td>${row.mad || ''}</td>
        <td title="${row.shipToParty || ''}">${row.shipToParty || ''}</td>
        <td title="${row.shippingPoint || ''}">${row.shippingPoint || ''}</td>
        <td title="${row.country || ''}">${row.country || ''}</td>
        <td style="text-align:center;">${row.incot || ''}</td>
        <td title="${row.destination || ''}">${row.destination || ''}</td>
        <td>${row.bookingDa || ''}</td>
        <td title="${row.marksBy || ''}">${row.marksBy || ''}</td>
        <td title="${row.bookingNumb || ''}">${row.bookingNumb || ''}</td>
<td title="${row.liner || ''}">${row.liner || ''}</td>
<td title="${row.top1_20 || ''}">${row.top1_20 || ''}</td>
<td title="${row.top1_40 || ''}">${row.top1_40 || ''}</td>
<td title="${row.top1_40hc || ''}">${row.top1_40hc || ''}</td>
<td title="${row.reason || ''}">${row.reason || ''}</td>
<td title="${row.keterangan || ''}">${row.keterangan || ''}</td>
        <td title="${row.vesselName || ''}">${row.vesselName || ''}</td>
        <td title="${row.voyage || ''}">${row.voyage || ''}</td>
        <td>${row.openCyDate || ''} ${row.openCyTime || ''}</td>
        <td>${row.closingFisikDate || ''} ${row.closingFisikTime || ''}</td>
        <td>${row.etd || ''}</td>
        <td style="text-align:center;">${nwInTons.toFixed(2)}</td>
        <td style="text-align:center;">
            <input type="checkbox" class="do-status-checkbox" ${doStatus === 'OK' ? 'checked' : ''} disabled>
        </td>
        <td style="text-align:center;">
            <input type="checkbox" ${postToSap ? 'checked' : ''} disabled>
        </td>
        <td title="${masalah}">${masalah}</td>
    `;
}        tbody.appendChild(tr);
    });

    // Deteksi otomatis kolom terpotong setelah render selesai
    const tableEl = tbody.closest('table');
    if (tableEl && tableEl.id) {
        setTimeout(() => detectClippedColumns(tableEl.id), 200);
    }
}

// === AKHIR FUNGSI renderTable DIBUAT UMUM ===

// === FUNGSI renderDummyBookingTable ===
function renderDummyBookingTable() {
    // Memanggil renderTable dengan data dummy dan flag isDummy = true
    renderTable(dummyData, 'dummyBookingTableBody', true, true);
}
// === AKHIR FUNGSI BARU ===


// === FUNGSI HELPER: FIND BEST LINER FOR ALL CONTAINER TYPES (20, 40, 40HC) ===
// ========================= REVISI CRITICAL: TOP 1 LINER PER TYPE CONTAINER =========================
// Fungsi ini mencari TOP 1 LINER untuk SETIAP TYPE CONTAINER (20, 40, 40HC) secara TERPISAH dan INDEPENDEN
// KRITERIA WAJIB:
// 1. Rate TERENDAH
// 2. Destination Port HARUS sama
// 3. Type container HARUS sesuai (20 ≠ 40 ≠ 40HC)
// 4. Jika tidak ada match, return 'N/A' (NULL equivalent)
function findBestLinersForAllTypes(destinationPort) {
    // Validasi input
    if (!destinationPort || !agreementData || agreementData.length === 0) {
        console.log('[findBestLinersForAllTypes] No destination port or no agreement data');
        return {
            '20': 'N/A',
            '40': 'N/A',
            '40HC': 'N/A'
        };
    }

    const destPortUpper = destinationPort.trim().toUpperCase();
    console.log(`[findBestLinersForAllTypes] Searching for destination: ${destPortUpper}`);
    
    // Type mapping untuk matching dengan Agreement List
    // Setiap type memiliki kemungkinan format yang berbeda di Agreement List
    const typeMap = {
        '20': ['20G0', '20'],      // Type 20 bisa ditulis sebagai 20G0 atau 20
        '40': ['42G0', '40'],      // Type 40 bisa ditulis sebagai 42G0 atau 40
        '40HC': ['45G0', '40HC']   // Type 40HC bisa ditulis sebagai 45G0 atau 40HC
    };
    
    const results = {};
    
    // WAJIB: Loop untuk SETIAP tipe container SECARA TERPISAH
    // Tidak boleh digabung atau dipaksakan satu LINER untuk semua type
    ['20', '40', '40HC'].forEach(containerType => {
        const validTypes = typeMap[containerType];
        
        console.log(`[findBestLinersForAllTypes] Processing type: ${containerType}, valid types: ${validTypes.join(', ')}`);
        
        // Filter agreements yang WAJIB memenuhi SEMUA kriteria:
        // 1. Destination Port HARUS sama (exact match, case insensitive)
        // 2. Type container HARUS sesuai dengan type yang dicari
        const matchingAgreements = agreementData.filter(agreement => {
            const agreementDest = (agreement['Destination Port'] || '').trim().toUpperCase();
            const agreementType = (agreement.Type || '').trim();
            
            // CRITICAL: Destination Port HARUS exact match
            const destMatch = agreementDest === destPortUpper;
            
            // CRITICAL: Type container HARUS sesuai (tidak boleh cross-type)
            const typeMatch = validTypes.includes(agreementType);
            
            const isMatch = destMatch && typeMatch;
            
            if (isMatch) {
                console.log(`[findBestLinersForAllTypes] Match found - LINER: ${agreement.LINER}, Type: ${agreementType}, Rate: ${agreement.Rate}`);
            }
            
            return isMatch;
        });
        
        console.log(`[findBestLinersForAllTypes] Found ${matchingAgreements.length} matches for type ${containerType}`);
        
        // Jika tidak ada agreement yang cocok, return N/A (NULL equivalent)
        // TIDAK ADA default value, TIDAK ADA fallback, TIDAK ADA asumsi
        if (matchingAgreements.length === 0) {
            results[containerType] = 'N/A';
            console.log(`[findBestLinersForAllTypes] No matches for type ${containerType} - returning N/A`);
        } else {
            // Sort by rate ASCENDING (termurah di index 0)
            matchingAgreements.sort((a, b) => {
                const rateA = parseFloat(a.Rate) || 999999;
                const rateB = parseFloat(b.Rate) || 999999;
                return rateA - rateB;
            });
            
            // Ambil TOP 1 (rate termurah)
            const topLiner = matchingAgreements[0];
            results[containerType] = topLiner.LINER || 'N/A';
            
            console.log(`[findBestLinersForAllTypes] TOP 1 for type ${containerType}: ${results[containerType]} (Rate: ${topLiner.Rate})`);
        }
    });
    
    console.log('[findBestLinersForAllTypes] Final results:', results);
    return results;
}

// === FUNGSI HELPER: FORMAT TOP 1 LINER DISPLAY (3 BARIS) ===
function formatTop1LinerDisplay(linersObj) {
    return `20: ${linersObj['20']}\n40: ${linersObj['40']}\n40HC: ${linersObj['40HC']}`;
}

// === LEGACY FUNCTION: findBestLiner (untuk backward compatibility) ===
function findBestLiner(destinationPort, containerTypeCode) {
    if (!destinationPort || !containerTypeCode) return null;

    const typeMap = { '20': '20G0', '40': '42G0', '40HC': '45G0'};
    const normalizedTypeCode = typeMap[containerTypeCode] || containerTypeCode;
    
    const alternateTypeCodes = [];
    if (normalizedTypeCode === '42G0') alternateTypeCodes.push('40');
    if (normalizedTypeCode === '45G0') alternateTypeCodes.push('40HC');
    if (normalizedTypeCode === '20G0') alternateTypeCodes.push('20');
    
    // CRITICAL FIX: Use agreementData instead of staticAgreementData
    if (!agreementData || agreementData.length === 0) return null;
    
    const matchingAgreements = agreementData.filter(agreement => {
        const agreementDest = (agreement['Destination Port'] || '').trim().toUpperCase();
        const agreementType = (agreement.Type || '').trim();
        return agreementDest === destinationPort && (agreementType === normalizedTypeCode || alternateTypeCodes.includes(agreementType));
    });

    if (matchingAgreements.length === 0) return null;
    
    matchingAgreements.sort((a, b) => parseFloat(a.Rate) - parseFloat(b.Rate));
    
    return matchingAgreements[0].LINER;
}

// === FUNGSI handleDummyCellUpdate - REVISI FINAL: HANYA ISI TOP 1 LINER ===
// PENTING: KOLOM LINER TIDAK DIISI OTOMATIS - User harus isi manual
// HANYA kolom TOP 1 LINER (20), TOP 1 LINER (40), dan TOP 1 LINER (40HC) yang diisi otomatis
window.handleDummyCellUpdate = function(rowId, key, value) {
    const rowIndex = dummyData.findIndex(row => row.id === parseInt(rowId));
    if (rowIndex > -1) {
        
        const originalType = typeof dummyData[rowIndex][key];

        if (originalType === 'boolean') {
            dummyData[rowIndex][key] = !!value; 
        } 
        else if (originalType === 'number') {
            let numValue = parseFloat(value); 
            dummyData[rowIndex][key] = isNaN(numValue) ? 0 : numValue;
        } 
        else {
            dummyData[rowIndex][key] = value;
        }
        
        dummyData[rowIndex].isModified = true;

        // === REVISI: AUTO-FILL TOP 1 LINER DARI AGREEMENT LIST ===
        const triggers = ['destination', 'container20', 'container40', 'container40hc'];
        if (triggers.includes(key)) {
            const currentRow = dummyData[rowIndex];
            // PARSING: Ambil kata SEBELUM koma dari Destination Port
            const destPort = (currentRow.destination || '').split(',')[0].trim().toUpperCase();

            if (destPort && agreementData && agreementData.length > 0) {
                console.log(`[handleDummyCellUpdate] Destination: ${destPort}`);
                
                // === TOP 1 LINER untuk Container 20 ===
                const qty20 = parseFloat(currentRow.container20) || 0;
                if (qty20 > 0) {
                    const matching20 = agreementData.filter(agr => {
                        const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                        const agrType = (agr['Type'] || '').trim();
                        return agrDest === destPort && (agrType === '20' || agrType === '20G0');
                    });
                    
                    if (matching20.length > 0) {
                        matching20.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                        dummyData[rowIndex].top1_20 = matching20[0].LINER || '';
                        console.log(`[handleDummyCellUpdate] TOP 1 LINER (20): ${dummyData[rowIndex].top1_20}`);
                    } else {
                        dummyData[rowIndex].top1_20 = '';
                    }
                } else {
                    dummyData[rowIndex].top1_20 = '';
                }
                
                // === TOP 1 LINER untuk Container 40 ===
                const qty40 = parseFloat(currentRow.container40) || 0;
                if (qty40 > 0) {
                    const matching40 = agreementData.filter(agr => {
                        const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                        const agrType = (agr['Type'] || '').trim();
                        return agrDest === destPort && (agrType === '40' || agrType === '42G0');
                    });
                    
                    if (matching40.length > 0) {
                        matching40.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                        dummyData[rowIndex].top1_40 = matching40[0].LINER || '';
                        console.log(`[handleDummyCellUpdate] TOP 1 LINER (40): ${dummyData[rowIndex].top1_40}`);
                    } else {
                        dummyData[rowIndex].top1_40 = '';
                    }
                } else {
                    dummyData[rowIndex].top1_40 = '';
                }
                
                // === TOP 1 LINER untuk Container 40HC ===
                const qty40hc = parseFloat(currentRow.container40hc) || 0;
                if (qty40hc > 0) {
                    const matching40hc = agreementData.filter(agr => {
                        const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                        const agrType = (agr['Type'] || '').trim();
                        return agrDest === destPort && (agrType === '40HC' || agrType === '45G0');
                    });
                    
                    if (matching40hc.length > 0) {
                        matching40hc.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                        dummyData[rowIndex].top1_40hc = matching40hc[0].LINER || '';
                        console.log(`[handleDummyCellUpdate] TOP 1 LINER (40HC): ${dummyData[rowIndex].top1_40hc}`);
                    } else {
                        dummyData[rowIndex].top1_40hc = '';
                    }
                } else {
                    dummyData[rowIndex].top1_40hc = '';
                }
            }
        }
        
        renderDummyBookingTable();
    }
}
// === AKHIR FUNGSI REVISI ===

// === FUNGSI handleCellUpdate - REVISI FINAL: HANYA ISI TOP 1 LINER ===
// PENTING: KOLOM LINER TIDAK DIISI OTOMATIS - User harus isi manual
// HANYA kolom TOP 1 LINER (20), TOP 1 LINER (40), dan TOP 1 LINER (40HC) yang diisi otomatis
window.handleCellUpdate = function(rowId, key, value) {
    const rowIndex = globalData.findIndex(row => row.id === parseInt(rowId));
    if (rowIndex > -1) {
        
        const originalType = typeof globalData[rowIndex][key];

        if (originalType === 'boolean') {
            globalData[rowIndex][key] = !!value; 
        } 
        else if (originalType === 'number') {
            let numValue = parseFloat(value); 
            globalData[rowIndex][key] = isNaN(numValue) ? 0 : numValue;
        } 
        else {
            globalData[rowIndex][key] = value;
        }
        
        // CRITICAL FIX: Tandai row sebagai modified
        globalData[rowIndex].isModified = true;

        // === REVISI: AUTO-FILL TOP 1 LINER DARI AGREEMENT LIST ===
        const triggers = ['destination', 'container20', 'container40', 'container40hc'];
        if (triggers.includes(key)) {
            const currentRow = globalData[rowIndex];
            // PARSING: Ambil kata SEBELUM koma dari Destination Port
            const destPort = (currentRow.destination || '').split(',')[0].trim().toUpperCase();

            if (destPort && agreementData && agreementData.length > 0) {
                console.log(`[handleCellUpdate] Destination: ${destPort}`);
                
                // === TOP 1 LINER untuk Container 20 ===
                const qty20 = parseFloat(currentRow.container20) || 0;
                if (qty20 > 0) {
                    const matching20 = agreementData.filter(agr => {
                        const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                        const agrType = (agr['Type'] || '').trim();
                        return agrDest === destPort && (agrType === '20' || agrType === '20G0');
                    });
                    
                    if (matching20.length > 0) {
                        matching20.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                        globalData[rowIndex].top1_20 = matching20[0].LINER || '';
                        console.log(`[handleCellUpdate] TOP 1 LINER (20): ${globalData[rowIndex].top1_20}`);
                    } else {
                        globalData[rowIndex].top1_20 = '';
                    }
                } else {
                    globalData[rowIndex].top1_20 = '';
                }
                
                // === TOP 1 LINER untuk Container 40 ===
                const qty40 = parseFloat(currentRow.container40) || 0;
                if (qty40 > 0) {
                    const matching40 = agreementData.filter(agr => {
                        const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                        const agrType = (agr['Type'] || '').trim();
                        return agrDest === destPort && (agrType === '40' || agrType === '42G0');
                    });
                    
                    if (matching40.length > 0) {
                        matching40.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                        globalData[rowIndex].top1_40 = matching40[0].LINER || '';
                        console.log(`[handleCellUpdate] TOP 1 LINER (40): ${globalData[rowIndex].top1_40}`);
                    } else {
                        globalData[rowIndex].top1_40 = '';
                    }
                } else {
                    globalData[rowIndex].top1_40 = '';
                }
                
                // === TOP 1 LINER untuk Container 40HC ===
                const qty40hc = parseFloat(currentRow.container40hc) || 0;
                if (qty40hc > 0) {
                    const matching40hc = agreementData.filter(agr => {
                        const agrDest = (agr['Destination Port'] || '').trim().toUpperCase();
                        const agrType = (agr['Type'] || '').trim();
                        return agrDest === destPort && (agrType === '40HC' || agrType === '45G0');
                    });
                    
                    if (matching40hc.length > 0) {
                        matching40hc.sort((a, b) => (parseFloat(a.Rate) || 999999) - (parseFloat(b.Rate) || 999999));
                        globalData[rowIndex].top1_40hc = matching40hc[0].LINER || '';
                        console.log(`[handleCellUpdate] TOP 1 LINER (40HC): ${globalData[rowIndex].top1_40hc}`);
                    } else {
                        globalData[rowIndex].top1_40hc = '';
                    }
                } else {
                    globalData[rowIndex].top1_40hc = '';
                }
            }
        }
        
        // REVISI: Langsung render dashboard DAN tracking
        const allData = globalData;
        renderTable(allData, 'tableBody', false);
        updateCharts(allData);
        updateStats(allData);
        
        // Update tracking jika sedang aktif
        if (currentRegion) {
            filterTrackingTable();
        }
        
        // Update dummy booking
        renderDummyBookingTable();
        
        // Update calendar
        renderCalendar(calendarCurrentDate);
    }
}

// === FUNGSI updateDummyDoStatus ===
window.updateDummyDoStatus = function(rowId, isChecked) {
     const rowIndex = dummyData.findIndex(row => row.id === parseInt(rowId));
    if (rowIndex > -1) {
        dummyData[rowIndex]['doStatus'] = isChecked ? 'OK' : 'CUSTOMER';
        // CRITICAL FIX: Tandai row sebagai modified
        dummyData[rowIndex].isModified = true;
        // PENTING: Re-render untuk update warna baris secara real-time
        renderDummyBookingTable();
    }
}
// === AKHIR FUNGSI BARU ===


window.updateDoStatus = function(rowId, isChecked) {
     const rowIndex = globalData.findIndex(row => row.id === parseInt(rowId));
    if (rowIndex > -1) {
        globalData[rowIndex]['doStatus'] = isChecked ? 'OK' : 'CUSTOMER';
        // CRITICAL FIX: Tandai row sebagai modified
        globalData[rowIndex].isModified = true;
        
        // REVISI: Langsung render dashboard DAN tracking
        const allData = globalData;
        renderTable(allData, 'tableBody', false);
        updateCharts(allData);
        updateStats(allData);
        
        // Update tracking jika sedang aktif
        if (currentRegion) {
            filterTrackingTable();
        }
        
        // Update dummy booking
        renderDummyBookingTable();
        
        // Update calendar
        renderCalendar(calendarCurrentDate);
    }
}

function updateStats(data) {
    // Total Delivery Orders: semua data yang ada
    document.getElementById('totalDeliveryOrders').textContent = data.length;
    
    // Done Booking: DO Status = 'OK' (sudah di-ceklis)
    document.getElementById('doneBookingCount').textContent = data.filter(r => r.doStatus === 'OK').length;
    
    // Problem: Masalah !== "None"
    document.getElementById('problemCount').textContent = data.filter(r => r.masalah && r.masalah !== 'None').length;
    
    // Done Process: Post to SAP = true (sudah di-ceklis)
    document.getElementById('doneProcessCount').textContent = data.filter(r => r.postToSap === true).length;
}

function getFilteredDashboardData() {
    const globalFilter = document.getElementById('filterGlobal').value.toLowerCase();
    const regionFilter = document.getElementById('filterRegion').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;

    return globalData.filter(row => {
        // Filter Region
        const matchesRegion = !regionFilter || row.region === regionFilter;
        
        // Filter Global Search
        const matchesGlobal = !globalFilter || Object.values(row).some(val => 
            String(val).toLowerCase().includes(globalFilter)
        );
        
        // FIXED: Filter Tanggal - Check BOTH bookingDa AND mad
        let matchesDate = true;
        
        if (dateFrom || dateTo) {
            // Get booking date from either bookingDa or mad (prioritize bookingDa)
            const bookingDate = row.bookingDa || row.mad || '';
            
            if (!bookingDate) {
                // No date in row - exclude if filter active
                matchesDate = false;
            } else {
                // Check date range
                if (dateFrom && bookingDate < dateFrom) {
                    matchesDate = false;
                }
                if (dateTo && bookingDate > dateTo) {
                    matchesDate = false;
                }
            }
        }
        
        return matchesRegion && matchesGlobal && matchesDate;
    });
}

function filterTable() {
    const filtered = getFilteredDashboardData();
    renderTable(filtered, 'tableBody', false);
    updateCharts(filtered); // ✅ Charts already updated
    updateStats(filtered);  // ✅ Stats already updated
}

// === VARIABEL TRACKING TAB ===
let currentTrackingTab = 'due_today'; // 'due_today' | 'attention' | 'recap'

// === HELPER: ROW MASUK DUE TODAY jika bookingNumb kosong ===
function isRowDueToday(row) {
    return !row.bookingNumb || String(row.bookingNumb).trim() === '';
}

// === HELPER: ROW MASUK ATTENTION jika ETD <= today + 5 hari ===
function isRowAttention(row) {
    if (!row.etd || String(row.etd).trim() === '') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const etdDate = new Date(row.etd + 'T00:00:00');
    if (isNaN(etdDate)) return false;
    const diffDays = Math.ceil((etdDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
}

// === FUNGSI: SWITCH TAB ===
window.switchTrackingTab = function(tabName) {
    currentTrackingTab = tabName;

    document.querySelectorAll('.tracking-tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('active', isActive);

        const colors = {
            due_today: 'linear-gradient(135deg,#e74c3c,#c0392b)',
            attention:  'linear-gradient(135deg,#f39c12,#d68910)',
            recap:      'linear-gradient(135deg,#3ecf8e,#00b37a)'
        };
        const badge = btn.querySelector('.tab-badge');

        if (isActive) {
            btn.style.background   = colors[tabName];
            btn.style.color        = '#fff';
            btn.style.boxShadow    = '0 4px 12px rgba(0,0,0,0.2)';
            btn.style.transform    = 'translateY(-1px)';
            if (badge) { badge.style.background = 'rgba(255,255,255,0.3)'; badge.style.color = '#fff'; }
        } else {
            btn.style.background   = '#f0f4f8';
            btn.style.color        = '#fff';
            btn.style.boxShadow    = 'none';
            btn.style.transform    = 'none';
            if (badge) { badge.style.background = 'rgba(0,0,0,0.08)'; badge.style.color = '#5a7a70'; }
        }
    });

    updateTrackingTabBadges();
    filterTrackingTable();
}

// === FUNGSI: UPDATE BADGE COUNT ===
function updateTrackingTabBadges() {
    if (!currentRegion) return;

    let sourceData;
    if (currentRegion === 'Rekap') {
        sourceData = globalData;
    } else {
        const plannerInfo = PLANNERS[currentRegion];
        const plannerRegions = plannerInfo ? plannerInfo.regions : [];
        sourceData = globalData.filter(row => plannerRegions.includes(row.region));
    }

    const dueTodayCount = sourceData.filter(isRowDueToday).length;
    const attentionCount = sourceData.filter(isRowAttention).length;
    const recapCount     = sourceData.length;

    const dueBadge    = document.getElementById('tab-badge-due-today');
    const attBadge    = document.getElementById('tab-badge-attention');
    const recapBadge  = document.getElementById('tab-badge-recap');

    if (dueBadge)   dueBadge.textContent   = dueTodayCount;
    if (attBadge)   attBadge.textContent   = attentionCount;
    if (recapBadge) recapBadge.textContent = recapCount;

    // Sync badge rekap header
    const dueBadgeR   = document.getElementById('tab-badge-due-today-rekap');
    const attBadgeR   = document.getElementById('tab-badge-attention-rekap');
    const recapBadgeR = document.getElementById('tab-badge-recap-rekap');
    if (dueBadgeR)   dueBadgeR.textContent   = dueTodayCount;
    if (attBadgeR)   attBadgeR.textContent   = attentionCount;
    if (recapBadgeR) recapBadgeR.textContent = recapCount;
}

function filterTrackingTable() {
    if (!currentRegion) {
        console.warn('filterTrackingTable() called but currentRegion/planner is null');
        return;
    }

    const globalFilter = document.getElementById('filterTrackingGlobal') ? document.getElementById('filterTrackingGlobal').value.toLowerCase() : '';
    const dateFrom = document.getElementById('filterTrackingDateFrom') ? document.getElementById('filterTrackingDateFrom').value : '';
    const dateTo = document.getElementById('filterTrackingDateTo') ? document.getElementById('filterTrackingDateTo').value : '';

    // Determine which rows to show
    let sourceData;
    if (currentRegion === 'Rekap') {
        sourceData = globalData; // all data
    } else {
        const plannerInfo = PLANNERS[currentRegion];
        const plannerRegions = plannerInfo ? plannerInfo.regions : [];
        sourceData = globalData.filter(row => plannerRegions.includes(row.region));
    }

    // === FILTER BERDASARKAN TAB AKTIF ===
    let tabFiltered;
    if (currentTrackingTab === 'due_today') {
        tabFiltered = sourceData.filter(isRowDueToday);
    } else if (currentTrackingTab === 'attention') {
        tabFiltered = sourceData.filter(isRowAttention);
    } else {
        // 'recap' = semua data tanpa filter tab
        tabFiltered = sourceData;
    }

    const filtered = tabFiltered.filter(row => {
        const matchesGlobal = !globalFilter || Object.values(row).some(val =>
            String(val).toLowerCase().includes(globalFilter)
        );
        let matchesDate = true;
        if (dateFrom && row.mad) matchesDate = row.mad >= dateFrom;
        if (matchesDate && dateTo && row.mad) matchesDate = row.mad <= dateTo;
        return matchesGlobal && matchesDate;
    });

    updateTrackingTabBadges();

    renderTable(filtered, 'trackingTableBody', true, false);
}

window.resetFilters = function() {
    document.getElementById('filterGlobal').value = '';
    document.getElementById('filterRegion').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    filterTable();
}

window.resetTrackingFilters = function() {
    // CRITICAL FIX: Reset global search juga
    const globalInput = document.getElementById('filterTrackingGlobal');
    if (globalInput) globalInput.value = '';
    
    const dateFromInput = document.getElementById('filterTrackingDateFrom');
    if (dateFromInput) dateFromInput.value = '';
    
    const dateToInput = document.getElementById('filterTrackingDateTo');
    if (dateToInput) dateToInput.value = '';
    
    filterTrackingTable();
}
// === FUNGSI EXPORT DASHBOARD KE EXCEL DENGAN FORMATTING ===
window.exportDashboardToExcel = function() {
    const dataToExport = getFilteredDashboardData();
    
    if (dataToExport.length === 0) {
        alert("No data to export based on current filters.");
        return;
    }

    // Header yang sesuai dengan tabel dashboard
// Header yang sesuai dengan tabel dashboard
const headers = [
    "NO", "Region", "Product Group", "SC", "Delivery", "20", "40", "40 HC", 
    "MAD", "Ship to Party", "Shipping Point", "Country", "IncoTerm", 
    "Destination Port", "BOOKING DATE", "MARKS BY CS", "Booking Number", 
    "LINER", "TOP 1 LINER", "REASON", "KETERANGAN", "Vessel Name", "Voyage", "Open CY", "Closing Fisik", "ETD", "NW (Ton)", "DO STATUS", 
    "Post to SAP", "Masalah"
];

// Siapkan data untuk Excel
const excelData = dataToExport.map((row, index) => {
    const nwInTons = (parseFloat(row.nw) || 0) / 1000;
    return [
        index + 1,
        row.region || '',
        row.vfPpp || '',
        row.sc || '',
        row.delivery || '',
        row.container20 || 0,
        row.container40 || 0,
        row.container40hc || 0,
        row.mad || '',
        row.shipToParty || '',
        row.shippingPoint || '',
        row.country || '',
        row.incot || '',
        row.destination || '',
        row.bookingDa || '',
        row.marksBy || '',
        row.bookingNumb || '',
        row.liner || '',
        row.top1 || '',
        row.reason || '',
        row.keterangan || '',
        row.vesselName || '',
        row.voyage || '',
        row.openCyDate || '',
        row.closingFisikDate || '',
        row.etd || '',
        nwInTons.toFixed(2),
        row.doStatus || 'N/A',
        row.postToSap ? 'Yes' : 'No',
        row.masalah || ''
    ];
});

    // Buat worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...excelData]);

    // Set column widths
const columnWidths = [
    { wch: 2 },  // No
    { wch: 5 }, // Region
    { wch: 15 }, // Product Group
    { wch: 12 }, // SC
    { wch: 12 }, // Delivery
    { wch: 5 },  // 20
    { wch: 5 },  // 40
    { wch: 10 },  // 40 HC
    { wch: 12 }, // MAD
    { wch: 25 }, // Ship to Party
    { wch: 15 }, // Shipping Point
    { wch: 15 }, // Country
    { wch: 10 }, // IncoTerm
    { wch: 20 }, // Destination Port
    { wch: 14 }, // BOOKING DATE
    { wch: 18 }, // MARKS BY CS
    { wch: 18 }, // Booking Number
    { wch: 20 }, // LINER
    { wch: 20 }, // TOP 1 LINER
    { wch: 15 }, // REASON
    { wch: 20 }, // KETERANGAN
    { wch: 18 }, // Vessel Name
    { wch: 12 }, // Voyage
    { wch: 12 }, // Open CY
    { wch: 12 }, // Closing Fisik
    { wch: 12 }, // ETD
    { wch: 10 }, // NW (Ton)
    { wch: 12 }, // DO STATUS
    { wch: 12 }, // Post to SAP
    { wch: 15 }  // Masalah
];
    ws['!cols'] = columnWidths;

    // Styling: Header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Style untuk semua cell
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;

            // Default style dengan border
            ws[cellAddress].s = {
                border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                },
                alignment: { 
                    vertical: 'center', 
                    horizontal: 'left',
                    wrapText: true
                }
            };

            // Style untuk header (row pertama)
            if (R === 0) {
                ws[cellAddress].s = {
                    ...ws[cellAddress].s,
                    fill: { fgColor: { rgb: '667EEA' } },
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
                    alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
                };
            }

            // Center alignment untuk kolom tertentu
            const centerColumns = [0, 5, 6, 7, 22, 23, 24]; // NO, 20, 40, 40HC, NW, DO STATUS, Post to SAP
            if (centerColumns.includes(C)) {
                ws[cellAddress].s.alignment.horizontal = 'center';
            }
        }
    }

    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard Data");

    // Generate filename dengan timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Vessel_Planner_Dashboard_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
}

function switchView(targetId, newTitle) {
    document.querySelectorAll('.content-view').forEach(view => view.classList.remove('active'));
    document.getElementById(targetId)?.classList.add('active');
    if(newTitle) document.getElementById('main-title').innerHTML = newTitle;
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        if (targetId === 'dashboard-view') {
            contentArea.classList.add('dashboard-mode');
            setTimeout(() => { if (_leafletMap) _leafletMap.invalidateSize(); }, 150);
        } else {
            contentArea.classList.remove('dashboard-mode');
        }
    }
}

const PLANNERS = {
    'Rara':   { color: 'linear-gradient(135deg,#667eea,#764ba2)', regions: ['Region 1', 'Region 2'] },
    'Fajrin': { color: 'linear-gradient(135deg,#f093fb,#f5576c)', regions: ['Region 3', 'Region 4'] },
    'Tina':   { color: 'linear-gradient(135deg,#4facfe,#00f2fe)', regions: ['Region 5', 'Region 6'] },
    'Arif':   { color: 'linear-gradient(135deg,#11998e,#38ef7d)', regions: ['Region 7', 'Region 8'] },
};

function updateTrackingContent(plannerName) {
    currentRegion = plannerName; // reuse currentRegion variable as currentPlanner

    const plannerHeader = document.getElementById('tracking-planner-header');
    const rekapHeader = document.getElementById('tracking-rekap-header');

    if (plannerName === 'Rekap') {
        if (plannerHeader) plannerHeader.style.display = 'none';
        if (rekapHeader) rekapHeader.style.display = 'flex';
    } else {
        if (rekapHeader) rekapHeader.style.display = 'none';
        if (plannerHeader) plannerHeader.style.display = 'flex';

        const info = PLANNERS[plannerName];
        const avatar = document.getElementById('tracking-planner-avatar');
        const welcome = document.getElementById('tracking-planner-welcome');
        const sub = document.getElementById('tracking-planner-sub');

        if (avatar && info) avatar.style.background = info.color;
        if (welcome) welcome.textContent = `Welcome, ${plannerName}!`;
        if (sub) sub.textContent = `Planner ${Object.keys(PLANNERS).indexOf(plannerName) + 1} — Data Tracking Anda`;
    }

    filterTrackingTable();
}

function renderVesselList() {
    const vesselList = [
        { name: "Wanhai Lines",           abbr: "WHL",     url: "https://shipper.wanhai.com/alertMessagePage.jsp",                                       user: "647368 and IKKARAWANG",           pass: "'@Codot2025",           emoji: "🚢", color: "#3ecf8e" },
        { name: "OOCL",                   abbr: "OOCL",    url: "https://moc.oocl.com/admin/login/ul_sign_in_v2.jsf?ENTRY=MCC&ENTRY_TYPE=OOCL",          user: "Adek_Sari@app.co.id",             pass: "IndahKiat@2025",        emoji: "🌊", color: "#e74c3c" },
        { name: "Ocean Network Express",  abbr: "ONE",     url: "https://www.one-line.com/en",                                                           user: "Arif_Munandar@app.co.id  /  ARIFIKK2025", pass: "IndahKiat2025@",  emoji: "⚓", color: "#9b59b6" },
        { name: "KMTC Line",              abbr: "KMTC",    url: "https://www.ekmtc.com/index.html#/main",                                                user: "IKK2025",                         pass: "IndahKiat2025@",        emoji: "🏗️", color: "#2980b9" },
        { name: "COSCO Shipping",         abbr: "COSCO",   url: "https://elines.coscoshipping.com/ebusiness/",                                           user: "Arif_Munandar@app.co.id",         pass: "@IndahKiat2025",        emoji: "🛳️", color: "#e67e22" },
        { name: "INTTRA",                 abbr: "INTRA",   url: "https://my.inttra.com/dashboard",                                                       user: "Adek_Sari@app.co.id",             pass: "IndahKiat@2025",        emoji: "🌐", color: "#1abc9c" },
        { name: "CMA CGM",                abbr: "CMA",     url: "https://www.cma-cgm.com/ebusiness/customer-hub/",                                       user: "IndahKiat@2025",                  pass: "IndahKiat@2025",        emoji: "📦", color: "#2c3e50" },
        { name: "Hapag-Lloyd",            abbr: "HAPAG",   url: "https://www.hapag-lloyd.com/en/login.html",                                             user: "Fajrin_S_Putrisani@app.co.id",    pass: "Indahkiat_Hapag123",    emoji: "🔱", color: "#e74c3c" },
        { name: "Yang Ming",              abbr: "YML",     url: "https://www.yangming.com/e-service/member_area/member_login.aspx",                      user: "INDAHKIATKRW",                    pass: "Indahkiat2025",         emoji: "🌏", color: "#27ae60" },
        { name: "Maersk Line",            abbr: "MAERSK",  url: "https://accounts.maersk.com/ocean-maeu/auth/login",                                     user: "IKK2025",                         pass: "IndahKiat@2025",        emoji: "🔵", color: "#0072bb" },
        { name: "Evergreen",              abbr: "EMC",     url: "https://www.shipmentlink.com/fid/",                                                     user: "Adek_Sari@app.co.id",             pass: "IndahKiatK2025",        emoji: "🌿", color: "#16a085" },
        { name: "MSC",                    abbr: "MSC",     url: "https://www.msc.com/en",                                                                user: "Arif_Munandar@app.co.id",         pass: "IndahKiat2025@",        emoji: "🚤", color: "#8e44ad" },
        { name: "Samudera Indonesia",     abbr: "SAMIN",   url: "https://samudera.id/id#our-services",                                                   user: "Adek_Sari@app.co.id",             pass: "IndahKiat@2025",        emoji: "🇮🇩", color: "#d35400" },
        { name: "RCL Group",              abbr: "RCL",     url: "https://www.rclgroup.com/BookingLogin.aspx?id=65426f6f6b696e67",                        user: "ASITRL0003",                      pass: "ASITRL0003",            emoji: "⛴️", color: "#c0392b" },
        { name: "Heung-A Line",           abbr: "HEUNG-A", url: "https://ebiz.heungaline.com/",                                                          user: "IKK2025",                         pass: "IndahKiat@2025",        emoji: "🎌", color: "#2980b9" },
        { name: "PIL Shipping",           abbr: "PIL",     url: "https://www.pilship.com/en-e-services/12.html",                                         user: "Arif_Munandar@app.co.id",         pass: "IndahKiat2025@",        emoji: "🚀", color: "#e74c3c" },
        { name: "HMM Co.",                abbr: "HMM",     url: "https://www.hmm21.com/company.do",                                                      user: "IKK2025",                         pass: "hmm6088331",            emoji: "🔷", color: "#2471a3" },
        { name: "ZIM Integrated",         abbr: "ZIM",     url: "https://e.gsltd.com.hk",                                                                user: "fajrin_s_putrisani@app.co.id",    pass: "IKKPassword_123",       emoji: "✡️",  color: "#1e8bc3" },
        { name: "Sinokor Merchant",       abbr: "SINOKOR", url: "https://ebiz.sinokor.co.kr/Schedule",                                                   user: "IKSerang2016",                    pass: "export99",              emoji: "🏴", color: "#27ae60" }
    ];

    window._vesselListData = vesselList;

    const container = document.getElementById('vesselListContainer');
    if (!container) return;

    const headerHTML = `
        <div class="view-page-header" style="margin-bottom:24px;">
            <div>
                <h2 class="view-page-title">🚢 Shipping Line Logins</h2>
                <p class="view-page-sub">Akses portal booking masing-masing shipping line — klik <strong>Buka ↗</strong> untuk masuk ke situs</p>
            </div>
            <div style="font-size:13px;color:#6b8f7a;font-weight:500;">${vesselList.length} Shipping Lines</div>
        </div>`;

    container.innerHTML = headerHTML + renderVesselCards(vesselList);
}

function renderVesselCards(list) {
    return list.map((vessel) => {
        const safePass = vessel.pass.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeUser = vessel.user.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `
        <div class="vessel-card" data-search="${(vessel.name + ' ' + vessel.abbr).toLowerCase()}">
            <div class="vessel-card-top">
                <div class="vessel-card-avatar" style="background:${vessel.color}18;border:2px solid ${vessel.color}35;">
                    <span style="font-size:22px;line-height:1;">${vessel.emoji}</span>
                </div>
                <div class="vessel-card-info">
                    <div class="vessel-card-name">${vessel.name}</div>
                    <div class="vessel-card-abbr">${vessel.abbr}</div>
                </div>
                <a href="${vessel.url}" target="_blank" class="vessel-visit-btn" style="background:${vessel.color};">
                    Buka ↗
                </a>
            </div>
            <div class="vessel-card-divider"></div>
            <div class="vessel-card-creds">
                <div class="vessel-cred-row">
                    <span class="vessel-cred-label">👤 User</span>
                    <span class="vessel-cred-val" title="${vessel.user}">${vessel.user}</span>
                    <button class="vessel-copy-btn" onclick="navigator.clipboard.writeText('${safeUser}').then(()=>showCopyToast())" title="Salin username">⎘</button>
                </div>
                <div class="vessel-cred-row">
                    <span class="vessel-cred-label">🔒 Pass</span>
                    <span class="vessel-cred-val vessel-pass-hidden" data-pass="${vessel.pass}">••••••••••</span>
                    <button class="vessel-copy-btn" onclick="togglePass(this)" title="Tampilkan password">👁</button>
                    <button class="vessel-copy-btn" onclick="navigator.clipboard.writeText('${safePass}').then(()=>showCopyToast())" title="Salin password">⎘</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.filterVesselList = function(query) {
    const container = document.getElementById('vesselListContainer');
    if (!container || !window._vesselListData) return;
    const q = query.toLowerCase().trim();
    const filtered = q === '' ? window._vesselListData : window._vesselListData.filter(v =>
        (v.name + ' ' + v.abbr).toLowerCase().includes(q)
    );
    const existingCards = container.querySelectorAll('.vessel-card');
    existingCards.forEach(c => c.remove());
    const noResult = container.querySelector('.vessel-no-result');
    if (noResult) noResult.remove();
    container.insertAdjacentHTML('beforeend', renderVesselCards(filtered));
    if (filtered.length === 0) {
        container.insertAdjacentHTML('beforeend', `<div class="vessel-no-result" style="grid-column:1/-1;text-align:center;padding:40px;color:#aaa;font-size:14px;">Tidak ada shipping line yang cocok</div>`);
    }
};

window.togglePass = function(btn) {
    const row = btn.closest('.vessel-cred-row');
    const span = row.querySelector('.vessel-pass-hidden');
    if (!span) return;
    if (span.textContent === '••••••••••') {
        span.textContent = span.dataset.pass;
        btn.textContent = '🙈';
    } else {
        span.textContent = '••••••••••';
        btn.textContent = '👁';
    }
};

window.showCopyToast = function() {
    let toast = document.getElementById('copy-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copy-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1a2e2a;color:#3ecf8e;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:opacity 0.3s;';
        toast.textContent = '✓ Tersalin ke clipboard';
        document.body.appendChild(toast);
    }
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
};

// === HELPER: Tentukan planner/region berdasarkan Country Port ===
function assignRegionByCountry(countryPort) {
    const c = String(countryPort || '').trim().toUpperCase();

    // CHINA → Arif (Region 7 & 8)
    const chinaKeywords = ['CHINA', 'CHINESE', 'HONGKONG', 'HONG KONG', 'TAIWAN', 'MACAU'];
    if (chinaKeywords.some(k => c.includes(k))) return 'Region 7';

    // Asia Tenggara + Afrika → Rara (Region 1 & 2)
    const raraKeywords = [
        // Asia Tenggara
        'MALAYSIA', 'SINGAPORE', 'SINGAPURA', 'BRUNEI', 'FILIPINA', 'PHILIPPINES',
        'THAILAND', 'LAOS', 'CAMBODIA', 'KAMBOJA', 'VIETNAM', 'MYANMAR', 'BURMA',
        'TIMOR LESTE', 'TIMOR-LESTE',
        // Afrika
        'AFRICA', 'AFRIKA', 'NIGERIA', 'KENYA', 'GHANA', 'ETHIOPIA', 'TANZANIA',
        'SOUTH AFRICA', 'EGYPT', 'MOROCCO', 'ALGERIA', 'SENEGAL', 'MOZAMBIQUE',
        'ANGOLA', 'CAMEROON', 'IVORY COAST', 'SUDAN', 'UGANDA', 'ZIMBABWE',
        'ZAMBIA', 'BOTSWANA', 'NAMIBIA', 'LIBERIA', 'SIERRA LEONE', 'GUINEA',
        'TOGO', 'BENIN', 'MALI', 'NIGER', 'CHAD', 'SOMALIA', 'DJIBOUTI',
        'ERITREA', 'RWANDA', 'BURUNDI', 'MALAWI', 'LESOTHO', 'SWAZILAND', 'ESWATINI',
        'MADAGASCAR', 'MAURITIUS', 'REUNION', 'COMOROS', 'SEYCHELLES',
        'CAPE VERDE', 'SAO TOME', 'EQUATORIAL GUINEA', 'GABON', 'CONGO',
        'DEMOCRATIC REPUBLIC', 'DRC', 'CENTRAL AFRICAN', 'SOUTH SUDAN',
        'LIBYA', 'TUNISIA', 'MAURITANIA', 'WESTERN SAHARA'
    ];
    if (raraKeywords.some(k => c.includes(k))) return 'Region 1';

    // Default: kembalikan null (nanti akan pakai region dari excel)
    return null;
}

function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('=== EXCEL IMPORT START ===');

            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });

            // Auto-detect sheet RD, fallback ke sheet pertama
            const sheetNames = workbook.SheetNames;
            const rdSheetName = sheetNames.find(n => n.trim().toUpperCase() === 'RD') || sheetNames[0];
            const isRDSheet = sheetNames.some(n => n.trim().toUpperCase() === 'RD');
            console.log('Using sheet:', rdSheetName, '| isRD:', isRDSheet);

            const worksheet = workbook.Sheets[rdSheetName];
            // raw:true untuk dapat nilai angka asli, bukan string
            const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true });

            console.log('Total rows in Excel:', dataAsArray.length);

            // === PREVIEW: tampilkan semua kolom persis seperti Excel ===
            renderImportedDataTableRaw(dataAsArray);

            // Tentukan header row
            let headerRowIndex = 0; // RD sheet header selalu di row 0
            if (!isRDSheet) {
                headerRowIndex = -1;
                const headerKeywords = ['delivery', 'product group', 'country', 'liner', 'region', 'vfppp', 'shiptoparty'];
                for (let i = 0; i < Math.min(10, dataAsArray.length); i++) {
                    const score = (dataAsArray[i] || []).reduce((acc, cell) => {
                        const cellStr = String(cell).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                        return acc + (headerKeywords.some(kw => cellStr.includes(kw)) ? 1 : 0);
                    }, 0);
                    if (score > 2) { headerRowIndex = i; break; }
                }
                if (headerRowIndex === -1) throw new Error("Could not find a valid header row in the Excel file.");
            }

            const rawHeaders = dataAsArray[headerRowIndex];
            const rawDataRows = dataAsArray.slice(headerRowIndex + 1);

            console.log('Raw headers:', rawHeaders);
            console.log('Data rows to process:', rawDataRows.length);

            // === FUNGSI CONVERT DATE ===
            function convertToISODate(cellValue) {
                if (cellValue === null || cellValue === undefined || cellValue === '') return '';

                // SheetJS dengan raw:true → angka serial Excel
                if (typeof cellValue === 'number') {
                    // Serial Excel: 1 = 1900-01-01, hati-hati bug 1900 leap year
                    if (cellValue < 2) return ''; // epoch / invalid
                    const date = new Date(Math.round((cellValue - 25569) * 86400 * 1000));
                    const y = date.getUTCFullYear();
                    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
                    const d = String(date.getUTCDate()).padStart(2, '0');
                    if (y < 1990 || y > 2099) return '';
                    return `${y}-${m}-${d}`;
                }

                // Sudah Date object (cellDates:true)
                if (cellValue instanceof Date) {
                    const y = cellValue.getFullYear();
                    if (y <= 1900 || y > 2099) return '';
                    const m = String(cellValue.getMonth() + 1).padStart(2, '0');
                    const d = String(cellValue.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }

                const str = String(cellValue).trim();
                if (!str || str.startsWith('1900')) return '';

                // Format YYYY-MM-DD atau YYYY.MM.DD
                const matchISO = str.match(/^(\d{4})[\.\-\/](\d{2})[\.\-\/](\d{2})/);
                if (matchISO) {
                    const y = matchISO[1], m = matchISO[2], d = matchISO[3];
                    if (parseInt(y) <= 1900 || parseInt(y) > 2099) return '';
                    return `${y}-${m}-${d}`;
                }
                // Format DD/MM/YYYY atau M/D/YY
                const matchDMY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
                if (matchDMY) {
                    const d = matchDMY[1].padStart(2, '0');
                    const m = matchDMY[2].padStart(2, '0');
                    const y = matchDMY[3].length === 2 ? '20' + matchDMY[3] : matchDMY[3];
                    return `${y}-${m}-${d}`;
                }
                return '';
            }

            // === MAPPING UNTUK SHEET RD (DIRECT INDEX) ===
            const headersFromFile = rawHeaders.map(h => String(h || '').trim().toLowerCase().replace(/[\s\.\-\/\n\r\(\)]/g, ''));
            const genericHeaderMap = {
                'region': 'region', 'productgroup': 'vfPpp', 'productform': 'vfPpp', 'vfppp': 'vfPpp',
                'sc': 'sc', 'delivery': 'delivery',
                '20': 'container20', 'container20': 'container20',
                '40': 'container40', 'container40': 'container40',
                '40hc': 'container40hc', 'container40hc': 'container40hc',
                'mad': 'mad', 'rdd': 'mad',
                'shiptoparty': 'shipToParty', 'shippingpoint': 'shippingPoint', 'sp': 'shippingPoint',
                'country': 'country', 'countryport': 'country', 'countryportport': 'country',
                'incoterm': 'incot', 'incotterm': 'incot', 'incot': 'incot',
                'destinationport': 'destination', 'destination': 'destination',
                'bookingdate': 'bookingDa', 'marksbycs': 'marksBy',
                'etd': 'etd', 'bookingnumber': 'bookingNumb',
                'liner': 'liner', 'carrier': 'liner', 'fwdagent': 'marksBy',
                'top1liner': 'top1', 'reason': 'reason', 'keterangan': 'keterangan',
                'remark1': 'keterangan', 'cargoremark': 'reason',
                'nw': 'nw', 'netweight': 'nw',
                'vesselname': 'vesselName', 'vessel': 'vesselName', 'voyage': 'voyage',
                'vbi': 'bookingNumb', 'donumber': 'bookingNumb',
            };

            const jsonData = rawDataRows.map(rowArray => {
                const newRow = {};

                if (isRDSheet) {
                    // === DIRECT INDEX MAPPING UNTUK SHEET RD ===
                    // [0]  Product Form  → vfPpp
                    // [1]  ETD
                    // [3]  Product Group → vfPpp (lebih prioritas)
                    // [4]  SP            → shippingPoint
                    // [5]  SC
                    // [6]  Delivery
                    // [7]  Fwd Agent     → marksBy
                    // [8]  Carrier       → liner
                    // [9]  20 (Rdy)      → container20
                    // [10] 40 (Rdy)      → container40
                    // [11] 40HC (Rdy)    → container40hc
                    // [12] 20 (NR)       — gabung ke container20
                    // [13] 40 (NR)       — gabung ke container40
                    // [14] 40HC (NR)     — gabung ke container40hc
                    // [27] NW
                    // [30] RDD           → mad (fallback)
                    // [32] Region
                    // [33] Country Port
                    // [34] MAD
                    // [35] Ship to Party
                    // [36] Inco Term     → incot
                    // [37] VBI           → bookingNumb
                    // [41] Destination Port → destination
                    // [44] Vessel        → vesselName
                    // [45] Voyage        → voyage

                    newRow.vfPpp        = String(rowArray[3] || rowArray[0] || '').trim();
                    newRow.sc           = String(rowArray[5] || '').trim();
                    newRow.delivery     = String(rowArray[6] || '').trim();
                    newRow.marksBy      = String(rowArray[7] || '').trim();
                    newRow.liner        = String(rowArray[8] || '').trim();
                    newRow.shippingPoint = String(rowArray[4] || '').trim();
                    newRow.shipToParty  = String(rowArray[35] || '').trim();
                    newRow.incot        = String(rowArray[36] || '').trim().replace(/\n/g, '').trim();
                    newRow.bookingNumb  = String(rowArray[37] || '').trim();
                    newRow.destination  = String(rowArray[41] || '').trim();
                    newRow.vesselName   = String(rowArray[44] || '').trim();
                    newRow.voyage       = String(rowArray[45] || '').trim();
                    newRow.nw           = parseFloat(rowArray[27]) || 0;
                    newRow.country      = String(rowArray[33] || '').trim().replace(/\n/g, ' ').trim();

                    // Container: Rdy Oustd (9,10,11) + Not Ready (12,13,14)
                    newRow.container20   = (parseFloat(rowArray[9])  || 0) + (parseFloat(rowArray[12]) || 0);
                    newRow.container40   = (parseFloat(rowArray[10]) || 0) + (parseFloat(rowArray[13]) || 0);
                    newRow.container40hc = (parseFloat(rowArray[11]) || 0) + (parseFloat(rowArray[14]) || 0);

                    // Dates
                    newRow.etd = convertToISODate(rowArray[1]);
                    newRow.mad = convertToISODate(rowArray[34]) || convertToISODate(rowArray[30]);

                    // === ASSIGN REGION BERDASARKAN COUNTRY PORT ===
                    const assignedRegion = assignRegionByCountry(newRow.country);
                    if (assignedRegion) {
                        newRow.region = assignedRegion;
                    } else {
                        // Fallback: gunakan region dari excel (normalisasi angka → "Region X")
                        const regionStr = String(rowArray[32] || '').trim();
                        const regNum = regionStr.replace(/[^0-9]/g, '');
                        newRow.region = regNum ? 'Region ' + regNum : regionStr;
                    }

                } else {
                    // === GENERIC MAPPING (non-RD sheet) ===
                    headersFromFile.forEach((header, index) => {
                        if (header && genericHeaderMap[header]) {
                            let val = rowArray[index];
                            if (['mad', 'bookingDa', 'etd'].includes(genericHeaderMap[header])) {
                                val = convertToISODate(val);
                            }
                            newRow[genericHeaderMap[header]] = val;
                        }
                    });

                    // Normalisasi region
                    if (newRow.region) {
                        const regionStr = String(newRow.region).trim();
                        const regNum = regionStr.replace(/[^0-9]/g, '');
                        if (regNum) newRow.region = 'Region ' + regNum;
                    }

                    // Override region berdasarkan country jika bisa
                    if (newRow.country) {
                        const assigned = assignRegionByCountry(newRow.country);
                        if (assigned) newRow.region = assigned;
                    }
                }

                // Normalisasi Destination Port
                if (newRow.destination) {
                    newRow.destination = normalizeDestinationPort(newRow.destination);
                }

                // Set default values
                newRow.doStatus  = 'CUSTOMER';
                newRow.postToSap = false;
                newRow.masalah   = 'None';
                newRow.nw        = parseFloat(newRow.nw) || 0;
                newRow.vesselName = newRow.vesselName || '';
                newRow.voyage    = newRow.voyage || '';
                newRow.siStatus  = 'Pending';
                newRow.bcStatus  = 'Pending';
                newRow.top1_20   = '';
                newRow.top1_40   = '';
                newRow.top1_40hc = '';
                newRow.top1      = '';

                return newRow;
            }).filter(row => {
                const hasData = row.delivery || row.region || row.vfPpp;
                if (!hasData) console.warn('Row filtered out (no key data):', row);
                return hasData;
            });

            console.log('Processed rows:', jsonData.length);
            if (jsonData.length === 0) throw new Error("Data tidak ditemukan atau tidak valid.");

            // === DEDUPLIKASI: skip baris jika delivery number sudah ada ===
            let addedCount = 0;
            let skippedCount = 0;
            let nextId = globalData.length > 0 ? Math.max(...globalData.map(d => d.id)) + 1 : 1;

            jsonData.forEach(row => {
                const deliveryKey = String(row.delivery || '').trim().toLowerCase();
                const isDuplicate = deliveryKey && globalData.some(
                    existing => String(existing.delivery || '').trim().toLowerCase() === deliveryKey
                );
                if (isDuplicate) {
                    skippedCount++;
                    console.log(`Skipped duplicate delivery: ${row.delivery}`);
                    return;
                }
                row.id = nextId++;
                globalData.push(row);
                addedCount++;
                console.log('Added:', row.id, row.region, row.delivery, row.country);
            });

            console.log(`Import done — Added: ${addedCount}, Skipped (duplicate): ${skippedCount}, Total: ${globalData.length}`);

            autoFillTOP1LINER();
            renderAllTablesAndCharts();

            // === FORCE: data masuk ke Rekap + semua planner, badge ter-update ===
            const savedRegion = currentRegion;

            // Update badge semua planner
            ['Rekap', 'Rara', 'Fajrin', 'Tina', 'Arif'].forEach(planner => {
                currentRegion = planner;
                updateTrackingTabBadges();
            });

            // Default tampilkan Rekap tab Recap setelah import
            currentRegion = 'Rekap';
            currentTrackingTab = 'recap';

            // Paksa render tracking view dengan data Rekap
            updateTrackingContent('Rekap');
            filterTrackingTable();

            // Pindah tampilan ke tracking-view
            switchView('tracking-view', '🗺️ Tracking - Rekap');

            // Set menu sidebar Rekap sebagai active
            document.querySelectorAll('.sidebar-menu .menu-item.active').forEach(i => i.classList.remove('active'));
            const rekapItem = document.querySelector('.menu-item[data-planner="Rekap"]');
            if (rekapItem) {
                rekapItem.classList.add('active');
                const parentSub = rekapItem.closest('.submenu');
                if (parentSub) parentSub.previousElementSibling?.classList.add('active');
            }

            console.log('=== EXCEL IMPORT SUCCESS ===');
            let msg = `✅ ${addedCount} data berhasil diimpor dari sheet "${rdSheetName}"!\n`;
            if (skippedCount > 0) msg += `⚠️ ${skippedCount} baris dilewati (delivery number sudah ada).\n`;
            msg += `\nData langsung masuk ke 📋 Rekap Keseluruhan dan semua planner.`;

            // Auto-simpan ke Firebase setelah import
            if (window._firebaseReady) {
                saveAllDataToFirebase().then(() => {
                    alert(msg + '\n\n💾 Data otomatis tersimpan ke Firebase.');
                }).catch(() => {
                    alert(msg + '\n\n⚠️ Gagal auto-simpan ke Firebase. Klik tombol "Simpan ke Firebase" secara manual.');
                });
            } else {
                alert(msg);
            }

        } catch (error) {
            console.error('=== EXCEL IMPORT ERROR ===', error);
            alert("❌ Error: " + error.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// === FUNGSI BARU: Preview persis seperti Excel, semua kolom tampil tanpa padding ===
function renderImportedDataTableRaw(dataAsArray) {
    const tableHead = document.querySelector('#report-preview-table thead');
    const tableBody = document.querySelector('#report-preview-table tbody');
    if (!tableHead || !tableBody) return;

    if (!dataAsArray || dataAsArray.length === 0) {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '<tr><td>No data</td></tr>';
        return;
    }

    const headers = dataAsArray[0];
    const dataRows = dataAsArray.slice(1);

    function fmtPreview(val) {
        if (val === null || val === undefined || val === '') return '';
        if (typeof val === 'number') {
            if (val > 40000 && val < 60000) {
                const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                const y = date.getUTCFullYear();
                if (y >= 1990 && y <= 2099) {
                    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
                    const d = String(date.getUTCDate()).padStart(2, '0');
                    return `${d}/${m}/${y}`;
                }
            }
            return String(val);
        }
        if (val instanceof Date) {
            const y = val.getFullYear();
            if (y <= 1900) return '';
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            return `${d}/${m}/${y}`;
        }
        const s = String(val).trim();
        if (s.startsWith('1900')) return '';
        return s;
    }

    // UKUR LEBAR REAL via canvas — header tidak terpotong
    function measurePx(text, fontStr) {
        const c = measurePx._canvas || (measurePx._canvas = document.createElement('canvas'));
        const ctx = c.getContext('2d');
        ctx.font = fontStr || 'bold 11px Plus Jakarta Sans, sans-serif';
        return ctx.measureText(String(text || '')).width;
    }

    // Hitung lebar setiap kolom berdasarkan teks header (bukan estimasi karakter)
    const colWidths = headers.map(h => {
        const hStr = String(h || '').replace(/\n/g, ' ').trim();
        return Math.max(90, Math.ceil(measurePx(hStr, 'bold 11px Plus Jakarta Sans, sans-serif')) + 32);
    });

    // RENDER HEADER
    tableHead.innerHTML = `<tr style="position:sticky;top:0;z-index:10;">` +
        headers.map((h, i) => {
            const hStr = String(h || '').replace(/\n/g, ' ').trim();
            return `<th style="
                background:#1a7a5e;
                color:#fff;
                font-size:11px;
                font-weight:700;
                padding:8px 14px;
                border-right:2px solid #155f4a;
                border-bottom:2px solid #155f4a;
                white-space:nowrap;
                text-align:center;
                min-width:${colWidths[i]}px;
                width:${colWidths[i]}px;
                position:sticky;
                top:0;
                z-index:10;
                box-sizing:border-box;
            " title="${hStr}">${hStr}</th>`;
        }).join('') + `</tr>`;

    // RENDER BODY
    let bodyHtml = '';
    let visibleRows = 0;
    dataRows.forEach((row, ri) => {
        if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) return;
        visibleRows++;
        const bg = ri % 2 === 0 ? '#ffffff' : '#f0faf6';
        bodyHtml += `<tr style="background:${bg};" onmouseover="this.style.background='#daf4ea'" onmouseout="this.style.background='${bg}'">`;
        headers.forEach((_, idx) => {
            const raw = (row && row[idx] !== undefined) ? row[idx] : '';
            const display = fmtPreview(raw);
            const safe = String(display).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            bodyHtml += `<td style="
                font-size:11px;
                padding:5px 14px;
                border-right:1px solid #d0e8df;
                border-bottom:1px solid #d0e8df;
                white-space:nowrap;
                color:#1a2e2a;
                min-width:${colWidths[idx]}px;
                box-sizing:border-box;
            " title="${safe}">${safe !== '' ? safe : '<span style="color:#ccc">—</span>'}</td>`;
        });
        bodyHtml += `</tr>`;
    });

    if (!bodyHtml) {
        bodyHtml = `<tr><td colspan="${headers.length}" style="text-align:center;padding:30px;color:#aaa;">Tidak ada data</td></tr>`;
    }
    tableBody.innerHTML = bodyHtml;

    // WRAPPER: scroll horizontal + vertikal
    const previewTable = document.getElementById('report-preview-table');
    if (previewTable) {
        previewTable.style.cssText = 'border-collapse:collapse; width:max-content; min-width:100%; table-layout:auto;';
        const wrapper = previewTable.closest('.table-container');
        if (wrapper) {
            wrapper.style.cssText = 'overflow-x:auto !important; overflow-y:auto !important; max-height:520px; border:2px solid #3ecf8e; border-radius:8px; display:block;';
        }
    }

    // Update status
    const statusEl = document.getElementById('import-status');
    if (statusEl) {
        statusEl.innerHTML = `<span style="color:#1a7a5e;font-weight:600;">✅ Preview: ${visibleRows} baris × ${headers.length} kolom — scroll kanan/kiri untuk lihat semua kolom</span>`;
    }
}

function renderImportedDataTable(headers, dataRows) {
    renderImportedDataTableRaw([headers, ...dataRows]);
}

function renderImportedDataTable(headers, dataRows) {
    const tableHead = document.querySelector('#report-preview-table thead');
    const tableBody = document.querySelector('#report-preview-table tbody');
    tableHead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    
    // Fungsi helper untuk format tanggal di preview table
    function formatDateForPreview(cellValue) {
        if (!cellValue) return '';
        
        if (cellValue instanceof Date) {
            const year = cellValue.getFullYear();
            const month = String(cellValue.getMonth() + 1).padStart(2, '0');
            const day = String(cellValue.getDate()).padStart(2, '0');
            const hours = String(cellValue.getHours()).padStart(2, '0');
            const minutes = String(cellValue.getMinutes()).padStart(2, '0');
            const seconds = String(cellValue.getSeconds()).padStart(2, '0');
            
            if (hours !== '00' || minutes !== '00' || seconds !== '00') {
                return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            }
            return `${day}/${month}/${year}`;
        }
        
        const strValue = String(cellValue).trim();
        
        // Format: YYYY.MM.DD atau YYYY-MM-DD
        const datePatternYMD = /^(\d{4})[\.\-](\d{2})[\.\-](\d{2})(.*)$/;
        const matchYMD = strValue.match(datePatternYMD);
        if (matchYMD) {
            const [, year, month, day, time] = matchYMD;
            const timeStr = time.trim();
            if (timeStr) {
                return `${day}/${month}/${year} ${timeStr}`;
            }
            return `${day}/${month}/${year}`;
        }
        
        return cellValue;
    }
    
    let bodyHtml = '';
    dataRows.forEach(row => {
        bodyHtml += '<tr>';
        headers.forEach((header, index) => { 
            let cellValue = row[index];
            cellValue = cellValue === undefined || cellValue === null ? '' : cellValue;
            
            // Deteksi kolom tanggal berdasarkan nama header
            const headerLower = String(header).toLowerCase();
            const isDateColumn = headerLower.includes('date') || headerLower.includes('mad') || 
                                headerLower.includes('etd') || headerLower.includes('eta');
            
            if (isDateColumn) {
                cellValue = formatDateForPreview(cellValue);
            }
            
            bodyHtml += `<td>${cellValue}</td>`;
        });
        bodyHtml += '</tr>';
    });
    tableBody.innerHTML = bodyHtml;
}

function renderImportedDataTableFromInitial() {
    const headers = ["Region","vfPpp","sc","delivery","container/20","container/40","container/40HC","mad","ShipToParty","shippingpoint","country","incot", "Vessel Name", "NW (Kg)"];
    const dataRows = initialVesselData.map(row => [
        row.region, row.vfPpp, row.sc, row.delivery, row.container20, row.container40, row.container40hc,
        row.mad, row.shipToParty, row.shippingPoint, row.country, row.incot, row.vesselName, row.nw
    ]);
    renderImportedDataTable(headers, dataRows);
}

window.addEventListener('DOMContentLoaded', () => {
    // Tambahkan event listener untuk form login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // PERBAIKAN: globalData dikosongkan agar tidak muncul 17 baris dummy saat refresh
    globalData = []; 
    dummyData = []; 

    initCharts(); 

    // Close modal saat click di overlay (area gelap)
    const imageViewerModal = document.getElementById('image-viewer-modal');
    if (imageViewerModal) imageViewerModal.addEventListener('click', function(e) {
        if (e.target === this) closeImageViewerModal();
    });
    
    const notificationModal = document.getElementById('notification-modal');
    if (notificationModal) notificationModal.addEventListener('click', function(e) {
        if (e.target === this) closeNotificationModal();
    });
    
    const bookingModal = document.getElementById('booking-modal');
    if (bookingModal) bookingModal.addEventListener('click', function(e) {
        if (e.target === this) closeBookingModal();
    });

    renderVesselList();
    renderAllTablesAndCharts();
    
    // Inisiasi awal notifikasi
    updateNotificationDisplay();

    const agreementExcelInput = document.getElementById('agreement-excel-input');
    if (agreementExcelInput) agreementExcelInput.addEventListener('change', handleAgreementExcelUpload);

    const excelInput = document.getElementById('excel-input');
    if (excelInput) excelInput.addEventListener('change', handleExcelUpload);

    const dbCostInput = document.getElementById('database-cost-input');
    if (dbCostInput) dbCostInput.addEventListener('change', handleDatabaseCostUpload);

    const filterAgreement = document.getElementById('filterAgreement');
    if (filterAgreement) filterAgreement.addEventListener('input', filterAgreementTable);

document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.addEventListener('click', function() {
        if (this.classList.contains('has-submenu')) {
            this.classList.toggle('open');
            this.nextElementSibling?.classList.toggle('open');
            return;
        }

        console.log('=== MENU ITEM CLICKED ===');
        console.log('Target:', this.dataset.target);
        console.log('Region:', this.dataset.region);

        document.querySelectorAll('.sidebar-menu .menu-item.active').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        const parentSubmenu = this.closest('.submenu');
        if (parentSubmenu) {
            parentSubmenu.previousElementSibling?.classList.add('active');
        }

        const targetId = this.dataset.target;
        const icon = this.querySelector('.menu-icon, span:first-child').textContent;
        const titleText = this.querySelector('span:last-child').textContent;
                    
let mainTitle = this.dataset.planner
            ? `🗺️ Tracking - ${this.dataset.planner}` 
            : `${icon} ${titleText}`;

        switchView(targetId, mainTitle);
        
        if (targetId === 'dummy-booking-view') {
            renderDummyBookingTable();
            currentRegion = null; 
        } else if (this.dataset.planner) {
            updateTrackingContent(this.dataset.planner);
        } else {
            currentRegion = null;
        }
    });
});    

    document.querySelectorAll('#dashboard-view .filters-section input, #dashboard-view .filters-section select').forEach(input => {
        input.addEventListener('input', filterTable);
    });
    
    document.querySelectorAll('#tracking-view .filters-section input').forEach(input => {
        input.addEventListener('input', filterTrackingTable);
    });
    
    const mainTerminalSelect = document.getElementById('terminal-select');
    if (mainTerminalSelect) {
        mainTerminalSelect.addEventListener('change', (event) => {
            populateTerminalSchedule(event.target.value);
        });
    }
});
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            // Close semua modal yang terbuka
            if (document.getElementById('image-viewer-modal').style.display === 'flex') {
                closeImageViewerModal();
            }
            if (document.getElementById('notification-modal').style.display === 'flex') {
                closeNotificationModal();
            }
            if (document.getElementById('calendar-modal').style.display === 'flex') {
                closeModal();
            }
            if (document.getElementById('booking-modal').style.display === 'flex') {
                closeBookingModal();
            }
        }
    });


// === FUNGSI UNTUK DATABASE COST UPLOAD ===
function handleDatabaseCostUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('=== DATABASE COST IMPORT START ===');
            
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

            console.log('Total rows in Excel:', dataAsArray.length);

            let headerRowIndex = -1;
            const headerKeywords = ['shipping line', 'charges type', 'currency', 'amount', 'remarks', 'unit of measure', 'link'];
            for(let i=0; i < Math.min(10, dataAsArray.length); i++){
                const score = (dataAsArray[i] || []).reduce((acc, cell) => {
                    const cellStr = String(cell).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    return acc + (headerKeywords.some(kw => cellStr.includes(kw.replace(/\s/g, ''))) ? 1 : 0);
                }, 0);
                if (score > 2) { 
                    headerRowIndex = i; 
                    console.log('Header found at row:', i);
                    break; 
                }
            }

            if (headerRowIndex === -1) throw new Error("Could not find a valid header row in the Excel file.");
            
            const rawHeaders = dataAsArray[headerRowIndex];
            const rawDataRows = dataAsArray.slice(headerRowIndex + 1);
            
            console.log('Raw headers:', rawHeaders);
            console.log('Data rows to process:', rawDataRows.length);
            
            renderDatabaseCostTable(rawHeaders, rawDataRows);
            
            console.log('=== DATABASE COST IMPORT SUCCESS ===');
            document.getElementById('database-cost-status').textContent = `✅ ${rawDataRows.length} rows berhasil diimpor dan ditampilkan!`;

        } catch (error) {
            console.error('=== DATABASE COST IMPORT ERROR ===', error);
            document.getElementById('database-cost-status').textContent = "❌ Error: " + error.message;
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

function renderDatabaseCostTable(headers, dataRows) {
    console.log('=== RENDER DATABASE COST TABLE ===');
    console.log('Headers:', headers);
    console.log('Rows count:', dataRows.length);
    
    const tableBody = document.querySelector('#database-cost-preview-table tbody');
    
    // CRITICAL: Simpan data untuk fungsi search
    // thead TIDAK diubah — header sudah static di index.php dengan tombol ▼
    databaseCostData = {
        headers: headers,
        rows: dataRows,
        colFilters: {}
    };
    
    console.log('Data saved to databaseCostData:', databaseCostData);
    
    let bodyHtml = '';
    dataRows.forEach((row, index) => {
        bodyHtml += '<tr>';
        headers.forEach((header, colIndex) => { 
            let cellValue = row[colIndex];
            cellValue = cellValue === undefined || cellValue === null ? '' : cellValue;
            
            // Jika kolom adalah "Link", buat sebagai hyperlink jika ada URL
            const headerLower = String(header).toLowerCase();
            if (headerLower === 'link' && cellValue && (String(cellValue).startsWith('http://') || String(cellValue).startsWith('https://'))) {
                cellValue = `<a href="${cellValue}" target="_blank" style="color: #2563eb; text-decoration: underline;">Open Link</a>`;
            }
            
            bodyHtml += `<td>${cellValue}</td>`;
        });
        bodyHtml += '</tr>';
    });
    tableBody.innerHTML = bodyHtml;
    
    console.log('=== RENDER COMPLETE ===');
}

// === FUNGSI DROPDOWN FILTER PER KOLOM DATABASE COST ===
window.openDbCostColFilter = function(event, colIndex) {
    event.stopPropagation();

    // Tutup dropdown lama jika ada
    const existingDrop = document.getElementById('db-cost-col-filter-dropdown');
    if (existingDrop) existingDrop.remove();

    if (!databaseCostData || !databaseCostData.rows || databaseCostData.rows.length === 0) return;

    const rows = databaseCostData.rows;
    const currentFilterVal = (databaseCostData.colFilters && databaseCostData.colFilters[colIndex]) || '';

    // Kumpulkan nilai unik di kolom ini
    const uniqueValues = [];
    rows.forEach(row => {
        const val = String(row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '').trim();
        if (val !== '' && !uniqueValues.includes(val)) uniqueValues.push(val);
    });
    uniqueValues.sort();

    const dropdown = document.createElement('div');
    dropdown.id = 'db-cost-col-filter-dropdown';
    dropdown.style.cssText = `position:fixed; background:#fff; border:1px solid #c0b8f0; border-radius:8px; box-shadow:0 6px 24px rgba(106,90,205,0.18); z-index:99999; min-width:220px; max-width:300px; padding:10px 0 6px 0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:12px;`;

    const btnEl = document.getElementById('db-cost-filter-btn-' + colIndex);
    const rect = btnEl ? btnEl.getBoundingClientRect() : event.target.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = Math.max(0, rect.left - 150) + 'px';

    dropdown.innerHTML = `
        <div style="padding:0 10px 8px 10px; border-bottom:1px solid #ededff;">
            <input type="text" id="db-cost-col-filter-search" placeholder="🔍 Cari..." value="${currentFilterVal}"
                style="width:100%; padding:5px 8px; border:1px solid #c0b8f0; border-radius:5px; font-size:12px; outline:none; box-sizing:border-box;"
                oninput="dbCostColFilterSearch(${colIndex}, this.value)">
        </div>
        <div style="padding:6px 10px 4px 10px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; color:#6A5ACD;">
                <input type="checkbox" id="db-cost-select-all" onchange="dbCostSelectAll(${colIndex}, this.checked)" style="cursor:pointer;" checked>
                (Pilih Semua)
            </label>
        </div>
        <div id="db-cost-col-filter-list" style="max-height:200px; overflow-y:auto; padding:0 10px;">
            ${uniqueValues.map(val => `
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:3px 0; color:#333;">
                    <input type="checkbox" class="db-cost-val-cb" value="${String(val).replace(/"/g, '&quot;')}"
                        ${currentFilterVal === '' || currentFilterVal.split('|||').includes(val) ? 'checked' : ''}
                        onchange="dbCostColFilterApply(${colIndex})" style="cursor:pointer;">
                    ${val}
                </label>
            `).join('')}
        </div>
        <div style="padding:8px 10px 2px 10px; border-top:1px solid #ededff; margin-top:6px; display:flex; gap:6px;">
            <button onclick="dbCostClearColFilter(${colIndex})" style="flex:1; padding:5px; border:1px solid #c0b8f0; border-radius:5px; background:#f5f5ff; cursor:pointer; font-size:11px;">🗑️ Reset</button>
            <button onclick="document.getElementById('db-cost-col-filter-dropdown').remove()" style="flex:1; padding:5px; border:none; border-radius:5px; background:#6A5ACD; color:#fff; cursor:pointer; font-size:11px;">✓ Tutup</button>
        </div>
    `;

    document.body.appendChild(dropdown);
    dbCostUpdateSelectAll();
    setTimeout(() => { const inp = document.getElementById('db-cost-col-filter-search'); if (inp) inp.focus(); }, 50);
}

window.dbCostColFilterSearch = function(colIndex, searchVal) {
    const list = document.getElementById('db-cost-col-filter-list');
    if (!list) return;
    list.querySelectorAll('label').forEach(label => {
        const cb = label.querySelector('input[type=checkbox]');
        const val = cb ? cb.value.toLowerCase() : '';
        label.style.display = val.includes(searchVal.toLowerCase()) ? '' : 'none';
    });
    dbCostUpdateSelectAll();
}

window.dbCostUpdateSelectAll = function() {
    const list = document.getElementById('db-cost-col-filter-list');
    const selectAll = document.getElementById('db-cost-select-all');
    if (!list || !selectAll) return;
    const allCbs = list.querySelectorAll('input[type=checkbox]');
    const visibleCbs = Array.from(allCbs).filter(cb => cb.closest('label').style.display !== 'none');
    const allChecked = visibleCbs.length > 0 && visibleCbs.every(cb => cb.checked);
    selectAll.checked = allChecked;
    selectAll.indeterminate = !allChecked && visibleCbs.some(cb => cb.checked);
}

window.dbCostSelectAll = function(colIndex, checked) {
    const list = document.getElementById('db-cost-col-filter-list');
    if (!list) return;
    list.querySelectorAll('input[type=checkbox]').forEach(cb => {
        if (cb.closest('label').style.display !== 'none') cb.checked = checked;
    });
    dbCostColFilterApply(colIndex);
}

window.dbCostColFilterApply = function(colIndex) {
    const list = document.getElementById('db-cost-col-filter-list');
    if (!list) return;
    const checkedCbs = list.querySelectorAll('input[type=checkbox]:checked');
    const allCbs = list.querySelectorAll('input[type=checkbox]');
    if (checkedCbs.length === allCbs.length) {
        databaseCostData.colFilters[colIndex] = '';
    } else {
        databaseCostData.colFilters[colIndex] = Array.from(checkedCbs).map(cb => cb.value).join('|||');
    }
    dbCostUpdateSelectAll();
    const btn = document.getElementById('db-cost-filter-btn-' + colIndex);
    if (btn) {
        btn.style.background = databaseCostData.colFilters[colIndex] ? '#6A5ACD' : 'rgba(255,255,255,0.25)';
        btn.style.color = databaseCostData.colFilters[colIndex] ? '#fff' : '';
    }
    filterDatabaseCostTable();
}

window.dbCostClearColFilter = function(colIndex) {
    if (databaseCostData && databaseCostData.colFilters) databaseCostData.colFilters[colIndex] = '';
    const list = document.getElementById('db-cost-col-filter-list');
    if (list) list.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
    const btn = document.getElementById('db-cost-filter-btn-' + colIndex);
    if (btn) { btn.style.background = 'rgba(255,255,255,0.25)'; btn.style.color = ''; }
    filterDatabaseCostTable();
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('db-cost-col-filter-dropdown');
    if (dropdown && !dropdown.contains(e.target)) dropdown.remove();
});

// === FUNGSI SEARCH UNTUK DATABASE COST ===
function filterDatabaseCostTable() {
    console.log('=== FILTER DATABASE COST CALLED ===');
    
    const searchInput = document.getElementById('database-cost-search');
    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    console.log('Search term:', searchTerm);
    console.log('Database cost data:', databaseCostData);
    
    const tableBody = document.querySelector('#database-cost-preview-table tbody');
    const tableHead = document.querySelector('#database-cost-preview-table thead');
    
    if (!databaseCostData || !databaseCostData.headers || databaseCostData.rows.length === 0) {
        console.warn('No database cost data available');
        return;
    }
    
    const headers = databaseCostData.headers;
    const dataRows = databaseCostData.rows;
    const colFilters = databaseCostData.colFilters || {};
    
    console.log('Total rows before filter:', dataRows.length);
    
    // Filter rows: global search DAN per-column filter dropdown
    const filteredRows = dataRows.filter(row => {
        // Global search: cari di semua kolom
        const globalMatch = searchTerm === '' || row.some(cell => {
            const cellValue = String(cell || '').toLowerCase();
            return cellValue.includes(searchTerm);
        });
        
        // Per-column filter dari dropdown checkbox
        const colMatch = Object.keys(colFilters).every(colIndex => {
            const filterVal = colFilters[colIndex];
            if (!filterVal) return true; // kosong = tidak difilter
            const allowedVals = filterVal.split('|||');
            const cellValue = String(row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '').trim();
            return allowedVals.includes(cellValue);
        });
        
        return globalMatch && colMatch;
    });
    
    console.log('Total rows after filter:', filteredRows.length);
    
    // Render ulang table dengan data yang sudah difilter
    let bodyHtml = '';
    filteredRows.forEach((row, index) => {
        bodyHtml += '<tr>';
        headers.forEach((header, colIndex) => { 
            let cellValue = row[colIndex];
            cellValue = cellValue === undefined || cellValue === null ? '' : cellValue;
            
            // Jika kolom adalah "Link", buat sebagai hyperlink jika ada URL
            const headerLower = String(header).toLowerCase();
            if (headerLower === 'link' && cellValue && (String(cellValue).startsWith('http://') || String(cellValue).startsWith('https://'))) {
                cellValue = `<a href="${cellValue}" target="_blank" style="color: #2563eb; text-decoration: underline;">Open Link</a>`;
            }
            
            bodyHtml += `<td>${cellValue}</td>`;
        });
        bodyHtml += '</tr>';
    });
    
    if (filteredRows.length === 0) {
        bodyHtml = `<tr><td colspan="${headers.length}" style="text-align: center; padding: 20px; color: #999;">Tidak ada data yang cocok dengan pencarian</td></tr>`;
    }
    
    tableBody.innerHTML = bodyHtml;
    console.log('=== FILTER COMPLETE ===');
}
// === FUNGSI SEARCH UNTUK DATABASE COST ===
function filterDatabaseCostTable() {
    console.log('=== FILTER DATABASE COST CALLED ===');
    
    const searchInput = document.getElementById('database-cost-search');
    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    console.log('Search term:', searchTerm);
    console.log('Database cost data:', databaseCostData);
    
    const tableBody = document.querySelector('#database-cost-preview-table tbody');
    const tableHead = document.querySelector('#database-cost-preview-table thead');
    
    if (!databaseCostData || !databaseCostData.headers || databaseCostData.rows.length === 0) {
        console.warn('No database cost data available');
        return;
    }
    
    const headers = databaseCostData.headers;
    const dataRows = databaseCostData.rows;
    const colFilters = databaseCostData.colFilters || {};
    
    console.log('Total rows before filter:', dataRows.length);
    
    // Filter rows: global search DAN per-column filter dropdown
    const filteredRows = dataRows.filter(row => {
        // Global search: cari di semua kolom
        const globalMatch = searchTerm === '' || row.some(cell => {
            const cellValue = String(cell || '').toLowerCase();
            return cellValue.includes(searchTerm);
        });
        
        // Per-column filter dari dropdown checkbox
        const colMatch = Object.keys(colFilters).every(colIndex => {
            const filterVal = colFilters[colIndex];
            if (!filterVal) return true; // kosong = tidak difilter
            const allowedVals = filterVal.split('|||');
            const cellValue = String(row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '').trim();
            return allowedVals.includes(cellValue);
        });
        
        return globalMatch && colMatch;
    });
    
    console.log('Total rows after filter:', filteredRows.length);
    
    // Render ulang table dengan data yang sudah difilter
    let bodyHtml = '';
    filteredRows.forEach((row, index) => {
        bodyHtml += '<tr>';
        headers.forEach((header, colIndex) => { 
            let cellValue = row[colIndex];
            cellValue = cellValue === undefined || cellValue === null ? '' : cellValue;
            
            // Jika kolom adalah "Link", buat sebagai hyperlink jika ada URL
            const headerLower = String(header).toLowerCase();
            if (headerLower === 'link' && cellValue && (String(cellValue).startsWith('http://') || String(cellValue).startsWith('https://'))) {
                cellValue = `<a href="${cellValue}" target="_blank" style="color: #2563eb; text-decoration: underline;">Open Link</a>`;
            }
            
            bodyHtml += `<td>${cellValue}</td>`;
        });
        bodyHtml += '</tr>';
    });
    
    if (filteredRows.length === 0) {
        bodyHtml = `<tr><td colspan="${headers.length}" style="text-align: center; padding: 20px; color: #999;">Tidak ada data yang cocok dengan pencarian</td></tr>`;
    }
    
    tableBody.innerHTML = bodyHtml;
    console.log('=== FILTER COMPLETE ===');
}
// === FUNGSI UNTUK TABEL JADWAL TERMINAL ===
// === FUNGSI HELPER: GROUP & SORT BY VESSEL NAME - ENHANCED ===
// === FUNGSI HELPER: GROUP & SORT BY VESSEL NAME - ULTIMATE FIX ===
// === FUNGSI HELPER: GROUP & SORT BY VESSEL NAME - WITH NORMALIZATION ===
function groupAndSortByVessel(data) {
    if (!data || data.length === 0) return [];
    
    console.log('=== groupAndSortByVessel() START ===');
    console.log('Input data count:', data.length);
    
    // STEP 1: Build tonase map keyed by VOYAGE dari tracking data
    const allTrackingData = [...globalData, ...dummyData];
    console.log('Total tracking data available:', allTrackingData.length);
    
    // Map voyage → total NW (ton)
    const voyageTonaseMap = {};
    allTrackingData.forEach(booking => {
        const voyage = (booking.voyage || '').trim().toUpperCase();
        const nw = parseFloat(booking.nw) || 0;
        if (voyage && nw > 0) {
            voyageTonaseMap[voyage] = (voyageTonaseMap[voyage] || 0) + nw;
        }
    });
    
    console.log('Voyage Tonase Map:', voyageTonaseMap);
    
    // STEP 2: Attach tonase ke setiap schedule row berdasarkan voyage
    const dataWithTonase = data.map(item => {
        const voyageKey = (item.voyage || item.voyOut || '').trim().toUpperCase();
        const totalNW_Kg = voyageTonaseMap[voyageKey] || 0;
        const totalNW_Ton = totalNW_Kg / 1000;
        
        console.log(`Vessel: "${item.vesselName}" | Voyage: "${voyageKey}" → Tonase: ${totalNW_Ton.toFixed(2)} ton`);
        
        return {
            ...item,
            normalizedVesselName: normalizeVesselName(item.vesselName),
            matchedVoyage: voyageKey,
            calculatedTonase: totalNW_Ton
        };
    });
    
    // STEP 3: Sort by tonase DESC, then vessel name ASC
    const sorted = dataWithTonase.sort((a, b) => {
        if (a.calculatedTonase !== b.calculatedTonase) {
            return b.calculatedTonase - a.calculatedTonase;
        }
        return a.normalizedVesselName.localeCompare(b.normalizedVesselName);
    });
    
    // STEP 4: Mark first occurrence of each vessel+voyage group
    const seenKeys = new Set();
    sorted.forEach((item) => {
        const key = item.normalizedVesselName + '|' + item.matchedVoyage;
        if (!seenKeys.has(key)) {
            item.isFirstOfGroup = true;
            seenKeys.add(key);
        } else {
            item.isFirstOfGroup = false;
        }
    });
    
    console.log('=== groupAndSortByVessel() END ===\n');
    
    return sorted;
}

async function populateTerminalSchedule(terminal) {
    const tableBody = document.getElementById('terminalScheduleBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Loading schedule...</td></tr>';

    if (terminal === 'ALL_PORT') {
        // === ALL PORT AGREGASI ===
        await populateAllPortSchedule(tableBody);
        return;
    }

    const endpointMap = {
        "JICT": "api/fetch_jict.php",
        "KOJA": "api/fetch_koja.php",
        "NPCT1": "api/fetch_npct1.php",
        "MAL": "api/fetch_mal.php"
    };

    const endpoint = endpointMap[terminal];

    if (endpoint) {
        // TERMINAL DINAMIS (API)
        try {
            const response = await fetch(endpoint); 
            if (!response.ok) {
                throw new Error(`Failed to fetch schedule: ${response.statusText}`);
            }
            
            const data = await response.json(); 

            if (data.error) {
                 throw new Error(data.error);
            }

            if (data && data.length > 0) {
                tableBody.innerHTML = ''; 
                
                // Add terminal info to each item
                data.forEach(item => item.terminal = terminal);
                
                // === CRITICAL: APPLY GROUPING & SORTING ===
                const groupedData = groupAndSortByVessel(data);
                
                renderVesselScheduleRows(groupedData, tableBody, terminal);
                
                checkTerminalUpdates(); 

            } else {
                tableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">No schedule data found for this terminal.</td></tr>';
            }

        } catch (error) {
            console.error(`Error fetching ${terminal} data:`, error);
            tableBody.innerHTML = `<tr><td colspan="13" style="text-align:center;"><strong>Error:</strong> ${error.message}.</td></tr>`;
        }

    } else {
        // TERMINAL STATIS (Manual)
        tableBody.innerHTML = ''; 
        const data = terminalScheduleData[terminal] || []; 
        
        if (data && data.length > 0) {
            // Add terminal info to each item
            data.forEach(item => item.terminal = terminal);
            
            // === CRITICAL: APPLY GROUPING & SORTING FOR STATIC DATA ===
            const groupedData = groupAndSortByVessel(data);
            
            renderVesselScheduleRows(groupedData, tableBody, terminal);
            
            checkTerminalUpdates(); 
        }
    }
}

async function populateAllPortSchedule(tableBody) {
    console.log('=== POPULATE ALL PORT START ===');
    
    const endpointMap = {
        "JICT": "api/fetch_jict.php",
        "KOJA": "api/fetch_koja.php",
        "NPCT1": "api/fetch_npct1.php",
        "MAL": "api/fetch_mal.php"
    };
    
    let allData = [];
    
    // Fetch semua terminal secara parallel
    const fetchPromises = Object.entries(endpointMap).map(async ([terminalName, endpoint]) => {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                console.warn(`Failed to fetch ${terminalName}: ${response.statusText}`);
                return [];
            }
            
            const data = await response.json();
            
            if (data.error) {
                console.warn(`Error from ${terminalName}: ${data.error}`);
                return [];
            }
            
            if (data && data.length > 0) {
                // Add terminal identifier
                data.forEach(item => item.terminal = terminalName);
                console.log(`${terminalName}: ${data.length} vessels`);
                return data;
            }
            
            return [];
        } catch (error) {
            console.error(`Error fetching ${terminalName}:`, error);
            return [];
        }
    });
    
    // Tambahkan data Pelindo (static)
    const pelindoData = (terminalScheduleData['Pelindo'] || []).map(item => ({
        ...item,
        terminal: 'Pelindo'
    }));
    
    // Wait semua fetch selesai
    const results = await Promise.all(fetchPromises);
    allData = results.flat().concat(pelindoData);
    
    console.log(`Total vessels from all ports: ${allData.length}`);
    
    if (allData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">No schedule data available from any terminal.</td></tr>';
        return;
    }
    
    // Apply grouping & sorting
    const groupedData = groupAndSortByVessel(allData);
    
    console.log('Rendering rows...');
    tableBody.innerHTML = '';
    
    renderVesselScheduleRows(groupedData, tableBody, 'ALL_PORT');
    
    console.log('=== POPULATE ALL PORT END ===\n');
    
    checkTerminalUpdates();
}

function renderVesselScheduleRows(groupedData, tableBody, sourceTerminal) {
    groupedData.forEach((vesselData) => {
        const terminal = vesselData.terminal || sourceTerminal;
        const tonase = vesselData.calculatedTonase || 0;
        const tonaseDisplay = vesselData.isFirstOfGroup && tonase > 0 
            ? tonase.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})
            : (vesselData.isFirstOfGroup ? '0.00' : '');

        const voyageInput = vesselData.voyage || vesselData.voyOut || '';
        const etaInput = vesselData.eta || '';
        const etdInput = vesselData.etd || '';
        const ataInput = vesselData.ata || '';
        const atdInput = vesselData.atd || '';
        const closingInput = vesselData.closing || '';
        const openStackInput = vesselData.openStack || '';
        
        const isEtaBlocked = (terminal === 'MAL' || !etaInput);
        const isAtaBlocked = (['JICT', 'KOJA', 'MAL'].includes(terminal) || !ataInput);
        const isAtdBlocked = (['JICT', 'KOJA', 'MAL'].includes(terminal) || !atdInput);
        
        const etaCellContent = isEtaBlocked ? `<div class="blocked-input-container"></div>` : `<input type="date" class="editable-cell" value="${etaInput}">`;
        const etdCellContent = !etdInput ? `<input type="date" class="editable-cell" value="">` : `<input type="date" class="editable-cell" value="${etdInput}">`; 
        const ataCellContent = isAtaBlocked ? `<div class="blocked-input-container"></div>` : `<input type="date" class="editable-cell" value="${ataInput}">`;
        const atdCellContent = isAtdBlocked ? `<div class="blocked-input-container"></div>` : `<input type="date" class="editable-cell" value="${atdInput}">`;

        const newRow = document.createElement('tr');
        
        if (vesselData.isFirstOfGroup && tonase > 0) {
            newRow.classList.add('has-tonase-row');
        } else if (vesselData.isFirstOfGroup) {
            newRow.classList.add('first-row-no-tonase');
        }

        newRow.innerHTML = `
            <td>
                <select class="editable-cell" disabled>
                    <option value="${terminal}" selected>${terminal}</option>
                </select>
            </td>
            <td class="liner-cell-container">
                <input type="text" class="editable-cell" value="${vesselData.vesselName || ''}" onchange="updateTotalTonaseAndReorder(this)">
            </td>
            
            <td><input type="text" class="editable-cell" value="${voyageInput}"></td>
            
            <td>${etaCellContent}</td>
            <td>${etdCellContent}</td>
            <td>${ataCellContent}</td>
            <td>${atdCellContent}</td>
            
            <td><input type="date" class="editable-cell" value="${openStackInput}"></td>
            <td><input type="date" class="editable-cell" value="${closingInput}"></td>
            
            <td class="td-center total-tonase-cell ${tonase > 0 ? 'has-value' : ''}" data-vessel-name="${vesselData.vesselName || ''}" data-tonase="${tonase.toFixed(2)}">${tonaseDisplay}</td>

            <td class="td-center">
                <button class="btn btn-secondary btn-small" onclick="showBookingDetails(this)">View</button>
            </td>
            <td class="td-center">
                <button class="btn btn-danger" onclick="deleteScheduleRow(this)">Delete</button>
            </td>
        `;
        tableBody.appendChild(newRow);
    });
}

window.filterVesselSchedule = function() {
    const searchInput = document.getElementById('vessel-schedule-search');
    const filterText = searchInput ? searchInput.value.toLowerCase() : '';
    
    const tableBody = document.getElementById('terminalScheduleBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (row.cells.length < 2) {
            row.style.display = '';
            return;
        }
        
        const rowText = Array.from(row.cells).map(cell => {
            const input = cell.querySelector('input, select');
            return input ? input.value : cell.textContent;
        }).join(' ').toLowerCase();
        
        if (rowText.includes(filterText)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


function addScheduleRow() {
    const tableBody = document.getElementById('terminalScheduleBody');
    if (!tableBody) return;

    const mainTerminalSelect = document.getElementById('terminal-select');
    const selectedTerminal = mainTerminalSelect ? mainTerminalSelect.value : "";

    const newRow = document.createElement('tr');
    
    const terminalOptions = [
        { value: "", text: "Pilih Terminal" },
        { value: "JICT", text: "JICT" },
        { value: "KOJA", text: "KOJA" },
        { value: "NPCT1", text: "NPCT1" },
        { value: "MAL", text: "MAL" },
        { value: "Pelindo", text: "Pelindo (Manual)" }
    ];
    
    let terminalSelectHTML = '<select class="editable-cell">';
    terminalOptions.forEach(opt => {
        const isSelected = (opt.value === selectedTerminal) ? 'selected' : '';
        terminalSelectHTML += `<option value="${opt.value}" ${isSelected}>${opt.text}</option>`;
    });
    terminalSelectHTML += '</select>';

    const ataCellContent = (selectedTerminal === 'JICT' || selectedTerminal === 'KOJA' || selectedTerminal === 'MAL') ? `<div class="blocked-input-container"></div>` : `<input type="date" class="editable-cell">`;
    const atdCellContent = (selectedTerminal === 'JICT' || selectedTerminal === 'KOJA' || selectedTerminal === 'MAL') ? `<div class="blocked-input-container"></div>` : `<input type="date" class="editable-cell">`;
    const etaCellContent = (selectedTerminal === 'MAL') ? `<div class="blocked-input-container"></div>` : `<input type="date" class="editable-cell">`;

    newRow.innerHTML = `
        <td>${terminalSelectHTML}</td>
        <td class="liner-cell-container">
            <input type="text" class="editable-cell" placeholder="Nama Vessel... (manual)" onchange="updateTotalTonaseAndReorder(this)" oninput="updateTotalTonaseAndReorder(this)">
        </td>
        <td><input type="text" class="editable-cell" placeholder="Voyage..."></td>
        <td><input type="text" class="editable-cell" placeholder="Voyage..."></td>
        
        <td>${etaCellContent}</td>
        <td><input type="date" class="editable-cell"></td>
        <td>${ataCellContent}</td>
        <td>${atdCellContent}</td>
        <td><input type="date" class="editable-cell"></td>
        <td><input type="date" class="editable-cell"></td>

        <td class="td-center total-tonase-cell" data-vessel-name="">-</td>
        <td class="td-center">
            <button class="btn btn-secondary btn-small" onclick="showBookingDetails(this)">View</button>
        </td>
        <td class="td-center">
            <button class="btn btn-danger" onclick="deleteScheduleRow(this)">Delete</button>
        </td>
    `;
    tableBody.appendChild(newRow);
}

// === FUNGSI BARU: HANDLE VESSEL NAME CHANGE & UPDATE TONASE ===
window.handleVesselNameChange = function(inputElement) {
    const row = inputElement.closest('tr');
    if (!row) return;
    
    const vesselName = inputElement.value.trim();
    const tonaseCell = row.querySelector('.total-tonase-cell');
    
    if (!tonaseCell) return;
    
    console.log('Vessel name changed to:', vesselName);
    
    if (vesselName) {
        tonaseCell.setAttribute('data-vessel-name', vesselName);
        const tonase = getTonase(vesselName);
        tonaseCell.textContent = tonase;
        tonaseCell.style.fontWeight = '700';
        tonaseCell.style.fontSize = '14px';
        tonaseCell.style.color = '#2c3e50';
    } else {
        tonaseCell.setAttribute('data-vessel-name', '');
        tonaseCell.textContent = '-';
        tonaseCell.style.fontWeight = '400';
        tonaseCell.style.fontSize = '12px';
        tonaseCell.style.color = '#adb5bd';
    }
}

function deleteScheduleRow(button) {
    button.closest('tr').remove();
}

function formatDateForInput(dateString) {
    if (!dateString) return "";
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString.split('T')[0]; 
    }
    if (dateString.includes('/')) {
        const parts = dateString.split(' ')[0].split('/'); 
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    return ""; 
}

function getClosingDate(closingDate, etdDate) {
    let closingDateString = formatDateForInput(closingDate);
    const etdDateString = formatDateForInput(etdDate); 
    
    if (!closingDateString && etdDateString) {
        try {
            const etd = new Date(etdDateString + 'T00:00:00'); 
            etd.setDate(etd.getDate() - 2); 
            closingDateString = etd.toISOString().split('T')[0]; 
        } catch(e) {
            console.error("Error calculating closing date:", e);
            closingDateString = ""; 
        }
    }
    return closingDateString;
}

// === FUNGSI getTonase() - match by VOYAGE ===
function getTonase(vesselName, voyageValue) {
    const allData = [...globalData, ...dummyData];
    
    // If voyage is provided, match strictly by voyage
    if (voyageValue && voyageValue.trim() !== '') {
        const voyageKey = voyageValue.trim().toUpperCase();
        const matchingBookings = allData.filter(item => {
            const itemVoyage = (item.voyage || '').trim().toUpperCase();
            return itemVoyage === voyageKey && (parseFloat(item.nw) || 0) > 0;
        });
        if (matchingBookings.length > 0) {
            const totalNW_Kg = matchingBookings.reduce((sum, item) => sum + (parseFloat(item.nw) || 0), 0);
            const totalNW_Ton = totalNW_Kg / 1000;
            return totalNW_Ton.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }
        return "0.00";
    }
    
    // Fallback: match by vessel name only
    if (!vesselName || vesselName.trim() === '') return "0.00";
    const lowerVesselName = normalizeVesselName(vesselName);
    const matchingBookings = allData.filter(item => {
        return normalizeVesselName(item.vesselName) === lowerVesselName && (parseFloat(item.nw) || 0) > 0;
    });
    if (matchingBookings.length === 0) return "0.00";
    const totalNW_Kg = matchingBookings.reduce((sum, item) => sum + (parseFloat(item.nw) || 0), 0);
    const totalNW_Ton = totalNW_Kg / 1000;
    return totalNW_Ton.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}


// === FUNGSI DEBUG: Cek semua vessel names yang ada ===
window.debugVesselNames = function() {
    console.log('=== DEBUG: All Vessel Names ===');
    
    const allData = [...globalData, ...dummyData];
    const vesselNames = new Set();
    
    allData.forEach(item => {
        if (item.vesselName && item.vesselName.trim() !== '') {
            vesselNames.add(item.vesselName.trim());
        }
    });
    
    console.log('Total unique vessels:', vesselNames.size);
    console.log('Vessel list:', Array.from(vesselNames).sort());
    
    console.log('\n=== Data per Vessel ===');
    Array.from(vesselNames).sort().forEach(vessel => {
        const items = allData.filter(item => 
            (item.vesselName || '').trim().toLowerCase() === vessel.toLowerCase()
        );
        const totalNW = items.reduce((sum, item) => sum + (parseFloat(item.nw) || 0), 0);
        console.log(`"${vessel}": ${items.length} bookings, ${totalNW} kg = ${(totalNW/1000).toFixed(2)} ton`);
    });
    
    return Array.from(vesselNames).sort();
}

// === FUNGSI DEBUG: Cek data tracking per region ===
window.debugTrackingData = function(region = null) {
    console.log('=== DEBUG: Tracking Data ===');
    
    const dataToCheck = region 
        ? globalData.filter(item => item.region === region)
        : globalData;
    
    console.log(`Total items: ${dataToCheck.length}`);
    
    dataToCheck.forEach((item, index) => {
        console.log(`[${index + 1}]`, {
            region: item.region,
            vesselName: item.vesselName,
            nw: item.nw,
            delivery: item.delivery,
            sc: item.sc
        });
    });
    
    return dataToCheck;
}


window.updateTotalTonase = function(vesselNameInput) {
    const row = vesselNameInput.closest('tr');
    if (!row) return;

    const vesselName = vesselNameInput.value.trim();
    const tonaseCell = row.querySelector('.total-tonase-cell');
    if (!tonaseCell) return;
    
    // Get voyage from same row (3rd cell input)
    const voyageInput = row.querySelector('td:nth-child(3) input.editable-cell');
    const voyageValue = voyageInput ? voyageInput.value.trim() : '';
    
    if (vesselName || voyageValue) {
        const tonaseString = getTonase(vesselName, voyageValue);
        tonaseCell.textContent = tonaseString;
        tonaseCell.style.fontWeight = '700';
        tonaseCell.style.fontSize = '13px';
        tonaseCell.style.color = '#1a2e2a';
    } else {
        tonaseCell.textContent = '0.00';
        tonaseCell.style.fontWeight = '400';
        tonaseCell.style.fontSize = '12px';
        tonaseCell.style.color = '#adb5bd';
    }
}


// === FUNGSI showBookingDetails() DIPERBARUI - ENHANCED LAYOUT ===
// === HELPER FUNCTION: NORMALIZE VESSEL NAME ===
function normalizeVesselName(name) {
    if (!name) return '';
    return name.toString()
        .trim()
        .toLowerCase()
        .replace(/^mv\.?\s*/i, '') // Remove "MV." or "MV" prefix
        .replace(/^m\/v\.?\s*/i, '') // Remove "M/V." or "M/V" prefix
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .trim();
}

function showBookingDetails(buttonEl) {
    const row = buttonEl.closest('tr');
    if (!row) return;

    const vesselNameInput = row.querySelector('td:nth-child(2) input.editable-cell');
    const voyageInputEl = row.querySelector('td:nth-child(3) input.editable-cell');
    if (!vesselNameInput) return;

    const vesselName = vesselNameInput.value.trim();
    const voyageValue = voyageInputEl ? voyageInputEl.value.trim().toUpperCase() : '';
    
    if (!vesselName && !voyageValue) {
        alert("Nama Vessel / Voyage di baris ini kosong.");
        return;
    }

    const allData = [...globalData, ...dummyData];

    // Match by voyage if available, fallback to vessel name
    let matchingBookings;
    if (voyageValue) {
        matchingBookings = allData.filter(item => {
            const itemVoyage = (item.voyage || '').trim().toUpperCase();
            return itemVoyage === voyageValue;
        });
    } else {
        const normalizedInput = normalizeVesselName(vesselName);
        matchingBookings = allData.filter(item => normalizeVesselName(item.vesselName) === normalizedInput);
    }

    console.log('Total matches:', matchingBookings.length);

    const totalNW_Kg = matchingBookings.reduce((sum, item) => {
        return sum + (parseFloat(item.nw) || 0);
    }, 0);
    const totalNW_Ton = totalNW_Kg / 1000;
    
    console.log('Total NW (Kg):', totalNW_Kg);
    console.log('Total NW (Ton):', totalNW_Ton.toFixed(2));

    const modalBody = document.getElementById('booking-modal-body');
    const modalTitle = document.getElementById('booking-modal-title');

    modalTitle.textContent = `Booking List for ${vesselName.toUpperCase()}`;

    if (matchingBookings.length === 0) {
        // ENHANCED: Show debug info
        const availableVessels = [...new Set(allData.map(d => d.vesselName).filter(Boolean))];
        console.warn('No matches found. Available vessels:', availableVessels);
        
        modalBody.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p style="color: #e74c3c; font-weight: 600; margin-bottom: 15px;">Tidak ada data booking yang cocok ditemukan di data tracking.</p>
                <p style="font-size: 11px; color: #7f8c8d;">Vessel name di terminal: <strong>"${vesselName}"</strong></p>
                <p style="font-size: 11px; color: #7f8c8d; margin-top: 10px;">Pastikan nama vessel di Tracking Region SAMA PERSIS dengan nama di sini.</p>
                <details style="margin-top: 15px; text-align: left; font-size: 10px;">
                    <summary style="cursor: pointer; color: #667eea;">Debug: Available Vessels in Tracking</summary>
                    <ul style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
                        ${availableVessels.map(v => `<li>${v}</li>`).join('')}
                    </ul>
                </details>
            </div>
        `;
    } else {
        let filterInputHtml = `
            <div class="filter-group" style="margin-bottom: 15px;">
                <input type="text" id="booking-filter-input" class="editable-cell" 
                       placeholder="Filter by Region, Delivery No, SC, etc..." 
                       oninput="filterBookingModal()">
            </div>
        `;

        let summaryHtml = `
            <div class="booking-summary-enhanced">
                <div class="booking-count">
                    <span class="label">Total Bookings</span>
                    <span class="value">${matchingBookings.length}</span>
                </div>
                <div class="booking-total-nw">
                    <span class="label">TOTAL NW</span>
                    <span class="value-large">${totalNW_Ton.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="unit">Ton</span>
                </div>
            </div>
        `;
        
        let itemsHtml = matchingBookings.map(item => {
            const itemNW_Ton = (parseFloat(item.nw) || 0) / 1000;
            const nwDisplay = itemNW_Ton.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            const isDummyBadge = item.region === "DUMMY" ? '<span style="color: #e74c3c; font-weight: 700;">(DUMMY)</span>' : '';

            return `
            <div class="booking-item-enhanced">
                <div class="booking-item-details">
                    <strong>Region: ${item.region || 'N/A'} ${isDummyBadge} | SC: ${item.sc || 'N/A'} | Delivery: ${item.delivery || 'N/A'}</strong>
                    <p>Ship to Party: ${item.shipToParty || 'N/A'}</p>
                    <p>Destination: ${item.destination || item.country || 'N/A'}</p>
                    <p>Containers: 20': ${item.container20 || 0} | 40': ${item.container40 || 0} | 40HC: ${item.container40hc || 0}</p>
                </div>
                <div class="booking-item-nw-enhanced">
                    <span class="nw-value">${nwDisplay}</span>
                    <span class="nw-unit">Ton</span>
                </div>
            </div>
            `
        }).join('');

        modalBody.innerHTML = filterInputHtml + summaryHtml + `<div id="booking-item-list">${itemsHtml}</div>`;
    }

    document.getElementById('booking-modal').style.display = 'flex';
}

function closeBookingModal() {
    document.getElementById('booking-modal').style.display = 'none';
}

window.filterBookingModal = function() {
    const filterText = document.getElementById('booking-filter-input').value.toLowerCase();
    const items = document.querySelectorAll('#booking-item-list .booking-item');
    
    items.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        if (itemText.includes(filterText)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}
// === FUNGSI: UPDATE TONASE & REORDER TABLE - SIMPLIFIED ===
window.updateTotalTonaseAndReorder = function(vesselNameInput) {
    const tableBody = document.getElementById('terminalScheduleBody');
    if (!tableBody) return;

    console.log('=== updateTotalTonaseAndReorder() START ===');

    // STEP 1: Extract all rows as data objects
    const allRows = Array.from(tableBody.querySelectorAll('tr'));
    const rowsData = allRows.map(row => {
        const cells = row.querySelectorAll('td');
        const vesselNameInput = cells[1]?.querySelector('input');
        const vesselName = vesselNameInput?.value.trim() || '';
        
        return {
            terminal: cells[0]?.querySelector('select')?.value || '',
            vesselName: vesselName,
            voyIn: cells[2]?.querySelector('input')?.value || '',
            voyOut: cells[3]?.querySelector('input')?.value || '',
            eta: cells[4]?.querySelector('input')?.value || '',
            etd: cells[5]?.querySelector('input')?.value || '',
            ata: cells[6]?.querySelector('input')?.value || '',
            atd: cells[7]?.querySelector('input')?.value || '',
            openStack: cells[8]?.querySelector('input')?.value || '',
            closing: cells[9]?.querySelector('input')?.value || ''
        };
    });
    
    console.log('Extracted rows:', rowsData.length);
    
    // STEP 2: Apply grouping & sorting (will calculate tonase internally)
    const groupedData = groupAndSortByVessel(rowsData);
    
    // STEP 3: Clear table & re-render
    tableBody.innerHTML = '';
    
    groupedData.forEach(data => {
        const tonase = data.calculatedTonase || 0;
        const tonaseDisplay = data.isFirstOfGroup && tonase > 0 
            ? tonase.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})
            : (data.isFirstOfGroup ? '0.00' : '');
        
        const newRow = document.createElement('tr');
        
        // === STYLING ===
        if (data.isFirstOfGroup && tonase > 0) {
            newRow.classList.add('has-tonase-row');
        } else if (data.isFirstOfGroup) {
            newRow.classList.add('first-row-no-tonase');
        }
        
        // Determine blocked cells based on terminal
        const isJICT_KOJA_MAL = ['JICT', 'KOJA', 'MAL'].includes(data.terminal);
        const isMAL = data.terminal === 'MAL';
        
        const etaCellContent = isMAL || !data.eta 
            ? `<div class="blocked-input-container"></div>` 
            : `<input type="date" class="editable-cell" value="${data.eta}">`;
        
        const ataCellContent = isJICT_KOJA_MAL || !data.ata 
            ? `<div class="blocked-input-container"></div>` 
            : `<input type="date" class="editable-cell" value="${data.ata}">`;
        
        const atdCellContent = isJICT_KOJA_MAL || !data.atd 
            ? `<div class="blocked-input-container"></div>` 
            : `<input type="date" class="editable-cell" value="${data.atd}">`;
        
        newRow.innerHTML = `
            <td>
                <select class="editable-cell" ${data.terminal ? 'disabled' : ''}>
                    <option value="${data.terminal}" selected>${data.terminal || 'Pilih Terminal'}</option>
                </select>
            </td>
            <td class="liner-cell-container">
                <input type="text" class="editable-cell" value="${data.vesselName}" onchange="updateTotalTonaseAndReorder(this)">
            </td>
            <td><input type="text" class="editable-cell" value="${data.voyIn}"></td>
            <td><input type="text" class="editable-cell" value="${data.voyOut}"></td>
            <td>${etaCellContent}</td>
            <td><input type="date" class="editable-cell" value="${data.etd}"></td>
            <td>${ataCellContent}</td>
            <td>${atdCellContent}</td>
            <td><input type="date" class="editable-cell" value="${data.openStack}"></td>
            <td><input type="date" class="editable-cell" value="${data.closing}"></td>
            <td class="td-center total-tonase-cell ${tonase > 0 ? 'has-value' : ''}" data-vessel-name="${data.vesselName}" data-tonase="${tonase.toFixed(2)}">${tonaseDisplay}</td>
            <td class="td-center">
                <button class="btn btn-secondary btn-small" onclick="showBookingDetails(this)">View</button>
            </td>
            <td class="td-center">
                <button class="btn btn-danger" onclick="deleteScheduleRow(this)">Delete</button>
            </td>
        `;
        tableBody.appendChild(newRow);
    });
    
    console.log('=== updateTotalTonaseAndReorder() END ===\n');
}
// === FUNGSI AUTO-FIT COLUMNS ===
window.autoFitColumns = function(tableId) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with ID "${tableId}" not found`);
        return;
    }

    console.log(`=== AUTO-FIT COLUMNS for ${tableId} ===`);

    const headers = table.querySelectorAll('thead th');
    const allBodyRows = Array.from(table.querySelectorAll('tbody tr'));

    if (headers.length === 0) {
        console.warn('No headers found in table');
        return;
    }

    // Sementara ubah overflow ke visible agar scrollWidth terbaca benar
    headers.forEach(th => {
        th.style.overflow = 'visible';
        th.style.width = 'auto';
        th.style.minWidth = '30px';
        th.style.maxWidth = 'none';
    });

    headers.forEach((th, colIndex) => {
        let maxWidth = 0;

        // Ukur lebar teks header via canvas
        const headerText = th.textContent.trim();
        const headerFont = getComputedStyle(th).font || 'bold 11px Segoe UI';
        maxWidth = Math.max(maxWidth, getTextWidth(headerText, headerFont));

        // Ukur semua baris yang visible
        const visibleRows = allBodyRows.filter(r => r.style.display !== 'none');
        visibleRows.forEach(row => {
            const cell = row.cells[colIndex];
            if (!cell) return;

            const inputEl = cell.querySelector('input[type="text"], input[type="number"], input[type="date"], input[type="time"]');
            const selectEl = cell.querySelector('select');

            if (inputEl) {
                const val = inputEl.value || inputEl.placeholder || '';
                const font = getComputedStyle(inputEl).font || '9px Segoe UI';
                maxWidth = Math.max(maxWidth, getTextWidth(val, font));
            } else if (selectEl) {
                const opt = selectEl.options[selectEl.selectedIndex];
                const val = opt ? opt.text : '';
                const font = getComputedStyle(selectEl).font || '9px Segoe UI';
                maxWidth = Math.max(maxWidth, getTextWidth(val, font));
            } else {
                const cellText = (cell.textContent || cell.innerText).trim();
                const font = getComputedStyle(cell).font || '10px Segoe UI';
                maxWidth = Math.max(maxWidth, getTextWidth(cellText, font));
            }
        });

        // Tambah padding 40px (16px kiri + 16px kanan + 8px buffer)
        const finalWidth = Math.max(40, Math.ceil(maxWidth) + 40);

        // Apply ke th dengan !important via cssText agar override semua CSS
        th.style.cssText = `width: ${finalWidth}px !important; min-width: ${finalWidth}px !important; max-width: none !important; overflow: auto !important; resize: horizontal !important;`;

        // Apply ke semua td di kolom ini agar konsisten
        visibleRows.forEach(row => {
            const cell = row.cells[colIndex];
            if (cell) {
                cell.style.cssText = `width: ${finalWidth}px !important; min-width: ${finalWidth}px !important; max-width: none !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
            }
        });

        console.log(`Column ${colIndex + 1} (${headerText}): ${finalWidth}px`);
    });

    // Jalankan deteksi setelah fit selesai
    setTimeout(() => detectClippedColumns(tableId), 100);

    console.log('=== AUTO-FIT COMPLETE ===');
}

// Fungsi deteksi kolom yang teksnya terpotong (tanda seru merah di header)
window.detectClippedColumns = function(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('thead th'));
    const allBodyRows = Array.from(table.querySelectorAll('tbody tr')).filter(r => r.style.display !== 'none');

    // Hapus semua badge lama
    table.querySelectorAll('.clipped-badge').forEach(el => el.remove());

    let clippedCount = 0;

    headers.forEach((th, colIndex) => {
        let isClipped = false;

        // Cek apakah header sendiri terpotong
        if (th.scrollWidth > th.clientWidth + 2) {
            isClipped = true;
        }

        // Cek setiap cell di kolom ini
        if (!isClipped) {
            for (let i = 0; i < allBodyRows.length; i++) {
                const cell = allBodyRows[i].cells[colIndex];
                if (!cell) continue;

                const inputEl = cell.querySelector('input[type="text"], input[type="number"]');
                const el = inputEl || cell;

                if (el.scrollWidth > el.clientWidth + 2) {
                    isClipped = true;
                    break;
                }
            }
        }

        if (isClipped) {
            clippedCount++;
            // Tambah badge tanda seru merah di header
            const badge = document.createElement('span');
            badge.className = 'clipped-badge';
            badge.title = 'Ada teks yang terpotong di kolom ini — klik Auto-Fit atau geser kolom untuk memperlebar';
            badge.style.cssText = `
                display: inline-block;
                background: #e74c3c;
                color: white;
                font-size: 9px;
                font-weight: bold;
                border-radius: 50%;
                width: 14px;
                height: 14px;
                line-height: 14px;
                text-align: center;
                margin-left: 4px;
                cursor: pointer;
                vertical-align: middle;
                flex-shrink: 0;
            `;
            badge.textContent = '!';
            badge.onclick = (e) => {
                e.stopPropagation();
                expandSingleColumn(tableId, colIndex);
            };
            th.appendChild(badge);
        }
    });

    if (clippedCount > 0) {
        console.warn(`[detectClippedColumns] ${clippedCount} kolom terpotong di tabel ${tableId}`);
    } else {
        console.log(`[detectClippedColumns] Semua kolom tampil penuh di tabel ${tableId}`);
    }

    return clippedCount;
}

// Expand satu kolom saja agar semua teksnya kelihatan (klik badge !)
window.expandSingleColumn = function(tableId, colIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('thead th'));
    const th = headers[colIndex];
    if (!th) return;

    const allBodyRows = Array.from(table.querySelectorAll('tbody tr')).filter(r => r.style.display !== 'none');
    let maxWidth = 0;

    // Ukur header
    const headerText = th.textContent.replace(/!$/, '').trim();
    const headerFont = getComputedStyle(th).font || 'bold 11px Segoe UI';
    maxWidth = Math.max(maxWidth, getTextWidth(headerText, headerFont));

    // Ukur semua cell di kolom ini
    allBodyRows.forEach(row => {
        const cell = row.cells[colIndex];
        if (!cell) return;

        const inputEl = cell.querySelector('input[type="text"], input[type="number"], input[type="date"], input[type="time"]');
        const selectEl = cell.querySelector('select');

        if (inputEl) {
            const val = inputEl.value || inputEl.placeholder || '';
            const font = getComputedStyle(inputEl).font || '9px Segoe UI';
            maxWidth = Math.max(maxWidth, getTextWidth(val, font));
        } else if (selectEl) {
            const opt = selectEl.options[selectEl.selectedIndex];
            const val = opt ? opt.text : '';
            const font = getComputedStyle(selectEl).font || '9px Segoe UI';
            maxWidth = Math.max(maxWidth, getTextWidth(val, font));
        } else {
            const cellText = (cell.textContent || cell.innerText).trim();
            const font = getComputedStyle(cell).font || '10px Segoe UI';
            maxWidth = Math.max(maxWidth, getTextWidth(cellText, font));
        }
    });

    const finalWidth = Math.max(40, Math.ceil(maxWidth) + 40);

    th.style.cssText = `width: ${finalWidth}px !important; min-width: ${finalWidth}px !important; max-width: none !important; overflow: auto !important; resize: horizontal !important;`;
    allBodyRows.forEach(row => {
        const cell = row.cells[colIndex];
        if (cell) {
            cell.style.cssText = `width: ${finalWidth}px !important; min-width: ${finalWidth}px !important; max-width: none !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
        }
    });

    // Re-deteksi setelah expand
    setTimeout(() => detectClippedColumns(tableId), 80);
}

// Helper function to measure text width using canvas
function getTextWidth(text, font) {
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    context.font = font || '10px Segoe UI';
    const metrics = context.measureText(String(text));
    return metrics.width;
}
function handleAgreementExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('agreement-import-status');
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#fff3cd';
    statusDiv.style.border = '1px solid #ffc107';
    statusDiv.style.color = '#856404';
    statusDiv.innerHTML = '⏳ Reading Excel file...';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('=== AGREEMENT EXCEL IMPORT START ===');
            
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

            console.log('Total rows in Excel:', dataAsArray.length);

            // Cari header row
            let headerRowIndex = -1;
            const headerKeywords = ['agreement', 'calculation', 'liner', 'type', 'rate', 'destination'];
            for(let i = 0; i < Math.min(10, dataAsArray.length); i++){
                const score = (dataAsArray[i] || []).reduce((acc, cell) => {
                    const cellStr = String(cell).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    return acc + (headerKeywords.some(kw => cellStr.includes(kw)) ? 1 : 0);
                }, 0);
                if (score > 2) { 
                    headerRowIndex = i; 
                    console.log('Header found at row:', i);
                    break; 
                }
            }

            if (headerRowIndex === -1) throw new Error("Could not find a valid header row in the Excel file.");
            
            const rawHeaders = dataAsArray[headerRowIndex];
            const rawDataRows = dataAsArray.slice(headerRowIndex + 1);
            
            console.log('Raw headers:', rawHeaders);
            console.log('Data rows to process:', rawDataRows.length);
            
            const headersFromFile = rawHeaders.map(h => String(h || '').trim().toLowerCase().replace(/[\s\.\-\/]/g, ''));
            
            const headerMap = {
                'agreement': 'Agreement',
                'calculationsheet': 'Calculation Sheet',
                'liner': 'LINER',
                'type': 'Type',
                'rate': 'Rate',
                'destinationport': 'Destination Port',
                'destinationlocation': 'Destination Location',
                // Alternatif mappings
                'destination': 'Destination Port',
                'dest': 'Destination Port',
                'location': 'Destination Location'
            };
            
            const jsonData = rawDataRows.map(rowArray => {
                const newRow = {};
                headersFromFile.forEach((header, index) => {
                    if (header && headerMap[header]) {
                        newRow[headerMap[header]] = rowArray[index];
                    }
                });
                return newRow;
            }).filter(row => {
                // Filter: harus ada Agreement ATAU Rate
                return row['Agreement'] || row['Rate'];
            });
            
            console.log('Processed rows:', jsonData.length);
            console.log('Sample data:', jsonData.slice(0, 2));
            
            if (jsonData.length === 0) throw new Error("No valid data found in Excel file.");
            
            // Set ke global variable
            agreementData = jsonData;
            
            // Render tabel
            renderAgreementTable(agreementData);
            
            // Update status
            statusDiv.style.background = '#d4edda';
            statusDiv.style.border = '1px solid #c3e6cb';
            statusDiv.style.color = '#155724';
            statusDiv.innerHTML = `✅ Successfully imported ${jsonData.length} agreement records!`;
            
            console.log('=== AGREEMENT EXCEL IMPORT SUCCESS ===');

        } catch (error) {
            console.error('=== AGREEMENT EXCEL IMPORT ERROR ===', error);
            statusDiv.style.background = '#f8d7da';
            statusDiv.style.border = '1px solid #f5c6cb';
            statusDiv.style.color = '#721c24';
            statusDiv.innerHTML = `❌ Error: ${error.message}`;
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}
// === FUNGSI DROPDOWN FILTER ▼ UNTUK SEMUA TABEL ===
window.tableColFilter = function(event, tableId, colIndex) {
    event.stopPropagation();
    const existingDrop = document.getElementById('table-col-filter-dropdown');
    if (existingDrop) existingDrop.remove();

    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    if (rows.length === 0) return;

    // Kumpulkan nilai unik di kolom ini
    const uniqueValues = [];
    rows.forEach(row => {
        const cell = row.cells[colIndex];
        const val = cell ? (cell.innerText || cell.textContent || '').trim() : '';
        if (val !== '' && !uniqueValues.includes(val)) uniqueValues.push(val);
    });
    uniqueValues.sort();

    const dropdown = document.createElement('div');
    dropdown.id = 'table-col-filter-dropdown';
    dropdown.setAttribute('data-table-id', tableId);
    dropdown.setAttribute('data-col-index', colIndex);
    dropdown.style.cssText = `position:fixed; background:#fff; border:1px solid #c0b8f0; border-radius:8px; box-shadow:0 6px 24px rgba(106,90,205,0.18); z-index:99999; min-width:220px; max-width:300px; padding:10px 0 6px 0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:12px;`;

    const rect = event.target.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = Math.max(0, rect.left - 150) + 'px';

    dropdown.innerHTML = `
        <div style="padding:0 10px 8px 10px; border-bottom:1px solid #ededff;">
            <input type="text" id="table-col-filter-search" placeholder="🔍 Cari..."
                style="width:100%; padding:5px 8px; border:1px solid #c0b8f0; border-radius:5px; font-size:12px; outline:none; box-sizing:border-box;"
                oninput="tableColFilterSearch(this.value)">
        </div>
        <div style="padding:6px 10px 4px 10px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; color:#6A5ACD;">
                <input type="checkbox" id="table-col-select-all" onchange="tableColSelectAll(this.checked)" style="cursor:pointer;" checked>
                (Pilih Semua)
            </label>
        </div>
        <div id="table-col-filter-list" style="max-height:200px; overflow-y:auto; padding:0 10px;">
            ${uniqueValues.map(val => `
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:3px 0; color:#333;">
                    <input type="checkbox" class="table-col-val-cb" value="${String(val).replace(/"/g, '&quot;')}"
                        checked onchange="tableColFilterApply()" style="cursor:pointer;">
                    ${val}
                </label>
            `).join('')}
        </div>
        <div style="padding:8px 10px 2px 10px; border-top:1px solid #ededff; margin-top:6px; display:flex; gap:6px;">
            <button onclick="tableColFilterReset()" style="flex:1; padding:5px; border:1px solid #c0b8f0; border-radius:5px; background:#f5f5ff; cursor:pointer; font-size:11px;">🗑️ Reset</button>
            <button onclick="document.getElementById('table-col-filter-dropdown').remove()" style="flex:1; padding:5px; border:none; border-radius:5px; background:#6A5ACD; color:#fff; cursor:pointer; font-size:11px;">✓ Tutup</button>
        </div>
    `;

    document.body.appendChild(dropdown);
    setTimeout(() => { const inp = document.getElementById('table-col-filter-search'); if (inp) inp.focus(); }, 50);
}

window.tableColFilterSearch = function(searchVal) {
    const list = document.getElementById('table-col-filter-list');
    if (!list) return;
    list.querySelectorAll('label').forEach(label => {
        const cb = label.querySelector('input[type=checkbox]');
        const val = cb ? cb.value.toLowerCase() : '';
        label.style.display = val.includes(searchVal.toLowerCase()) ? '' : 'none';
    });
    const selectAll = document.getElementById('table-col-select-all');
    const visibleCbs = Array.from(list.querySelectorAll('input[type=checkbox]')).filter(cb => cb.closest('label').style.display !== 'none');
    if (selectAll) {
        selectAll.checked = visibleCbs.every(cb => cb.checked);
        selectAll.indeterminate = !visibleCbs.every(cb => cb.checked) && visibleCbs.some(cb => cb.checked);
    }
}

window.tableColSelectAll = function(checked) {
    const list = document.getElementById('table-col-filter-list');
    if (!list) return;
    list.querySelectorAll('input[type=checkbox]').forEach(cb => {
        if (cb.closest('label').style.display !== 'none') cb.checked = checked;
    });
    tableColFilterApply();
}

window.tableColFilterApply = function() {
    const dropdown = document.getElementById('table-col-filter-dropdown');
    if (!dropdown) return;
    const tableId = dropdown.getAttribute('data-table-id');
    const colIndex = parseInt(dropdown.getAttribute('data-col-index'));
    const table = document.getElementById(tableId);
    if (!table) return;

    const list = document.getElementById('table-col-filter-list');
    const checkedCbs = list.querySelectorAll('input[type=checkbox]:checked');
    const allCbs = list.querySelectorAll('input[type=checkbox]');
    const allChecked = checkedCbs.length === allCbs.length;

    const checkedVals = Array.from(checkedCbs).map(cb => cb.value);

    const selectAll = document.getElementById('table-col-select-all');
    if (selectAll) {
        selectAll.checked = allChecked;
        selectAll.indeterminate = !allChecked && checkedCbs.length > 0;
    }

    Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
        const cell = row.cells[colIndex];
        const val = cell ? (cell.innerText || cell.textContent || '').trim() : '';
        row.style.display = allChecked || checkedVals.includes(val) ? '' : 'none';
    });
}

window.tableColFilterReset = function() {
    const list = document.getElementById('table-col-filter-list');
    if (list) list.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
    const selectAll = document.getElementById('table-col-select-all');
    if (selectAll) { selectAll.checked = true; selectAll.indeterminate = false; }
    tableColFilterApply();
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('table-col-filter-dropdown');
    if (dropdown && !dropdown.contains(e.target) && !e.target.closest('thead')) dropdown.remove();
});
