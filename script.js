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
        alert("Please select a region from the Tracking menu first.");
        return;
    }
    const newId = globalData.length > 0 ? Math.max(...globalData.map(d => d.id)) + 1 : 1;
    const newEntry = {
        id: newId, region: currentRegion, vfPpp: "", sc: "", delivery: "", container20: 0, container40: 0, container40hc: 0, mad: "",
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

window.deleteRegionData = function() {
    if (!currentRegion) {
        alert("Please select a region first.");
        return;
    }
    const dataInRegion = globalData.filter(row => row.region === currentRegion);
    if (dataInRegion.length === 0) {
        alert(`There is no data to delete in ${currentRegion}.`);
        return;
    }
    if (confirm(`ARE YOU SURE you want to delete all ${dataInRegion.length} entries for ${currentRegion}? This action cannot be undone and will be lost on refresh.`)) {
        globalData = globalData.filter(row => row.region !== currentRegion);
        
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
        
        alert(`All data for ${currentRegion} has been deleted.`);
    }
}

function initCharts() {
    if(incotermChart) incotermChart.destroy();
    if(monthlyChart) monthlyChart.destroy();
    if(destinationChart) destinationChart.destroy();
    if(shippingLineContainerChart) shippingLineContainerChart.destroy();
    if(containerChart) containerChart.destroy();
    
    const commonBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20 } },
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false, drawBorder: false } },
            y: { grid: { display: true, drawBorder: false, color: '#f0f0f0' }, beginAtZero: true, ticks: { padding: 10 } }
        }
    };
    
    const shippingLineChartOptions = {
        ...commonBarOptions,
        plugins: { legend: { position: 'bottom', labels: { padding: 25 } } }
    };

    incotermChart = new Chart('incotermChart', { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#667eea', '#11998e', '#f5576c', '#4facfe', '#f093fb', '#ffc107', '#38ef7d', '#764ba2'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }}} });
    monthlyChart = new Chart('monthlyChart', { type: 'line', data: { labels: [], datasets: [{ label: 'Shipments', data: [], borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', tension: 0.4, fill: true }] }, options: { ...commonBarOptions, plugins: { legend: { display: false }}} });
    destinationChart = new Chart('destinationChart', { type: 'bar', data: { labels: [], datasets: [{ label: 'Shipments', data: [], backgroundColor: ['#667eea', '#11998e', '#f5576c', '#4facfe', '#f093fb'], barPercentage: 0.6, categoryPercentage: 0.6 }] }, options: { ...commonBarOptions, plugins: { legend: { display: false }}} });
    containerChart = new Chart('containerChart', { type: 'bar', data: { labels: ['20 ft', '40 ft', '40 HC'], datasets: [{ label: 'Total Containers', data: [], backgroundColor: ['#667eea', '#11998e', '#f5576c'], barPercentage: 0.6, categoryPercentage: 0.6 }] }, options: { ...commonBarOptions, plugins: { legend: { display: false }}} });
    shippingLineContainerChart = new Chart('shippingLineContainerChart', {
        type: 'bar',
        data: { labels: [], datasets: [
                { label: '20', data: [], backgroundColor: '#4facfe', barPercentage: 0.8, categoryPercentage: 0.7 },
                { label: '40', data: [], backgroundColor: '#f093fb', barPercentage: 0.8, categoryPercentage: 0.7 },
                { label: '40 HC', data: [], backgroundColor: '#38ef7d', barPercentage: 0.8, categoryPercentage: 0.7 }
            ]
        },
        options: { ...shippingLineChartOptions }
    });
}

function updateCharts(data) {
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
    
    // Render calendar
    renderCalendar(calendarCurrentDate);
    
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
    
    // Buka Outlook
    window.location.href = mailtoLink;
    
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
                    <button class="btn-send-email" onclick="sendEmailToOutlook(${rowId}, ${isDummyFlag})" title="Send via Outlook" style="background: #0078d4; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 5px;">📧</button>
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

function filterTrackingTable() {
    if (!currentRegion) {
        console.warn('filterTrackingTable() called but currentRegion is null');
        return;
    }
    
    console.log('=== filterTrackingTable() START ===');
    console.log('Current region:', currentRegion);
    console.log('Total globalData:', globalData.length);
    
    // CRITICAL FIX: Tambahkan global search filter
    const globalFilter = document.getElementById('filterTrackingGlobal') ? document.getElementById('filterTrackingGlobal').value.toLowerCase() : '';
    const dateFrom = document.getElementById('filterTrackingDateFrom') ? document.getElementById('filterTrackingDateFrom').value : '';
    const dateTo = document.getElementById('filterTrackingDateTo') ? document.getElementById('filterTrackingDateTo').value : '';

    const regionalData = globalData.filter(row => row.region === currentRegion);
    
    console.log(`Data for ${currentRegion}:`, regionalData.length);

    const filtered = regionalData.filter(row => {
        // CRITICAL FIX: Filter by global search
        const matchesGlobal = !globalFilter || Object.values(row).some(val => 
            String(val).toLowerCase().includes(globalFilter)
        );
        
        let matchesDate = true;
        if (dateFrom && row.mad) matchesDate = row.mad >= dateFrom;
        if (matchesDate && dateTo && row.mad) matchesDate = row.mad <= dateTo;
        
        return matchesGlobal && matchesDate;
    });
    
    console.log('Filtered data:', filtered.length);
    console.log('=== filterTrackingTable() END ===');
    
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
}

function updateTrackingContent(regionName) {
    currentRegion = regionName;
    document.getElementById('tracking-region-title').textContent = `Tracking Information for ${regionName}`;
    filterTrackingTable();
}

function renderVesselList() {
    const vesselList = [
        { name: "Wanhai", url: "https://shipper.wanhai.com/alertMessagePage.jsp", user: "647368 and IKKARAWANG", pass: "'@Codot2025" },
        { name: "OOCL", url: "https://moc.oocl.com/admin/login/ul_sign_in_v2.jsf?ENTRY=MCC&ENTRY_TYPE=OOCL", user: "Adek_Sari@app.co.id", pass: "IndahKiat@2025" },
        { name: "ONE", url: "https://www.one-line.com/en", user: "Arif_Munandar@app.co.id or ARIFIKK2025", pass: "IndahKiat2025@" },
        { name: "KMTC", url: "https://www.ekmtc.com/index.html#/main", user: "IKK2025", pass: "IndahKiat2025@" },
        { name: "Cosco", url: "https://elines.coscoshipping.com/ebusiness/", user: "Arif_Munandar@app.co.id", pass: "@IndahKiat2025" },
        { name: "Intra", url: "https://my.inttra.com/dashboard", user: "Adek_Sari@app.co.id", pass: "IndahKiat@2025" },
        { name: "CMA", url: "https://www.cma-cgm.com/ebusiness/customer-hub/", user: "IndahKiat@2025", pass: "IndahKiat@2025" },
        { name: "Hapag", url: "https://www.hapag-lloyd.com/en/login.html", user: "Fajrin_S_Putrisani@app.co.id", pass: "Indahkiat_Hapag123" },
        { name: "Yangming", url: "httpsS://www.yangming.com/e-service/member_area/member_login.aspx", user: "INDAHKIATKRW", pass: "Indahkiat2025" },
        { name: "Maersk", url: "https://accounts.maersk.com/ocean-maeu/auth/login", user: "IKK2025", pass: "IndahKiat@2025" },
        { name: "Evergreen", url: "https://www.shipmentlink.com/fid/", user: "Adek_Sari@app.co.id", pass: "IndahKiatK2025" },
        { name: "MSC", url: "https://www.msc.com/en", user: "Arif_Munandar@app.co.id", pass: "IndahKiat2025@" },
        { name: "SAMIN", url: "https://samudera.id/id#our-services", user: "Adek_Sari@app.co.id", pass: "IndahKiat@2025" },
        { name: "RCL", url: "https://www.rclgroup.com/BookingLogin.aspx?id=65426f6f6b696e67", user: "ASITRL0003", pass: "ASITRL0003" },
        { name: "HEUNG-A", url: "https://ebiz.heungaline.com/", user: "IKK2025", pass: "IndahKiat@2025" },
        { name: "PIL", url: "https://www.pilship.com/en-e-services/12.html", user: "Arif_Munandar@app.co.id", pass: "IndahKiat2025@" },
        { name: "HMM", url: "httpsS://www.hmm21.com/company.do", user: "IKK2025", pass: "hmm6088331" },
        { name: "ZIM", url: "https://e.gsltd.com.hk", user: "fajrin_s_putrisani@app.co.id", pass: "IKKPassword_123" },
        { name: "SINOKOR", url: "https://ebiz.sinokor.co.kr/Schedule", user: "IKSerang2016", pass: "export99" }
    ];

    const container = document.getElementById('vesselListContainer');
    if (!container) return;
    container.innerHTML = vesselList.map(vessel => `
        <div class="link-card">
            <div class="link-card-header">
                <div class="link-card-info">
                    <div class="link-card-icon"><span>🚢</span></div>
                    <h3 class="link-card-name">${vessel.name}</h3>
                </div>
                <a href="${vessel.url}" target="_blank" class="btn btn-secondary">Visit</a>
            </div>
            <div class="link-card-credentials">
                <div class="credential-item">
                    <span>Username</span>
                    <strong>${vessel.user}</strong>
                </div>
                <div class="credential-item">
                    <span>Password</span>
                    <strong>${vessel.pass}</strong>
                </div>
            </div>
        </div>
    `).join('');
}

function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('=== EXCEL IMPORT START ===');
            
            // Gunakan cellDates: true agar SheetJS mendeteksi objek tanggal otomatis
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

            console.log('Total rows in Excel:', dataAsArray.length);

            let headerRowIndex = -1;
            const headerKeywords = ['delivery', 'product group', 'country', 'liner', 'region', 'vfppp', 'shiptoparty'];
            for(let i=0; i < Math.min(10, dataAsArray.length); i++){
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
            
            renderImportedDataTable(rawHeaders, rawDataRows);
            
            const headersFromFile = rawHeaders.map(h => String(h || '').trim().toLowerCase().replace(/[\s\.\-\/]/g, ''));
            
const headerMap = {
    'region': 'region',
    'REGION': 'region',
    'productgroup': 'vfPpp',
    'vfppp': 'vfPpp',
    'sc': 'sc',
    'delivery': 'delivery',
    '20': 'container20',
    'container20': 'container20',
    '40': 'container40',
    'container40': 'container40',
    '40hc': 'container40hc',
    'container40hc': 'container40hc',
    'mad': 'mad',
    'shiptoparty': 'shipToParty',
    
    // FIXED: Shipping Point - handle both "Shipping Point" and "SP"
    'shippingpoint': 'shippingPoint',
    'sp': 'shippingPoint',
    
    // CRITICAL FIX: Country - handle "Country Port (Port)" exact match
    'country': 'country',
    'countryport': 'country',
    'countryport(port)': 'country', // "Country Port (Port)" → "countryportport"
    'port': 'country',
    
    'incoterm': 'incot',
    'incot': 'incot',
    'destinationport': 'destination',
    'destination': 'destination',
    'bookingdate': 'bookingDa',
    'marksbycs': 'marksBy',
    'etd': 'etd',
    'bookingnumber': 'bookingNumb',
    'liner': 'liner',
    'top1liner': 'top1',
    'reason': 'reason',
    'keterangan': 'keterangan',
    'nw': 'nw',
    'netweight': 'nw',
    
    // FIXED: Vessel Name - handle both "Vessel Name" and "Vessel"
    'vesselname': 'vesselName',
    'vessel': 'vesselName',
    
    'voyage': 'voyage'
};            
            // FUNGSI KRITIKAL: Mengonversi ke YYYY-MM-DD agar dibaca oleh input type="date"
            function convertToISODate(cellValue) {
                if (!cellValue) return '';
                
                let d, m, y;

                // Jika sudah objek Date dari Excel
                if (cellValue instanceof Date) {
                    y = cellValue.getFullYear();
                    m = String(cellValue.getMonth() + 1).padStart(2, '0');
                    d = String(cellValue.getDate()).padStart(2, '0');
                } else {
                    const str = String(cellValue).trim();
                    // Cek format M/D/YY atau MM/DD/YYYY (seperti di screenshot 5/16/24)
                    const matchUS = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
                    if (matchUS) {
                        m = matchUS[1].padStart(2, '0');
                        d = matchUS[2].padStart(2, '0');
                        y = matchUS[3].length === 2 ? "20" + matchUS[3] : matchUS[3];
                    } else {
                        // Cek format YYYY.MM.DD atau YYYY-MM-DD
                        const matchISO = str.match(/^(\d{4})[\.\-](\d{2})[\.\-](\d{2})/);
                        if (matchISO) {
                            y = matchISO[1]; m = matchISO[2]; d = matchISO[3];
                        }
                    }
                }
                
                return (y && m && d) ? `${y}-${m}-${d}` : '';
            }
            
            const jsonData = rawDataRows.map(rowArray => {
                const newRow = {};
                headersFromFile.forEach((header, index) => {
                    if (header && headerMap[header]) {
                        let val = rowArray[index];
                        // Kolom tanggal diproses ke format ISO agar muncul di input date
                        if (['mad', 'bookingDa', 'etd'].includes(headerMap[header])) {
                            val = convertToISODate(val);
                        }
                        newRow[headerMap[header]] = val;
                    }
                });

                // CRITICAL FIX: Normalisasi Region agar terbaca di Tracking
                if (newRow.region) {
                    const regionStr = String(newRow.region).trim();
                    // Extract number dari berbagai format: "Region 1", "region1", "R1", "1"
                    let regNum = regionStr.replace(/[^0-9]/g, '');
                    if (regNum) {
                        newRow.region = 'Region ' + regNum;
                        console.log('Region normalized:', regionStr, '->', newRow.region);
                    } else {
                        console.warn('Could not normalize region:', regionStr);
                    }
                }

                // Normalisasi Destination Port
                if (newRow.destination) {
                    const originalDest = newRow.destination;
                    newRow.destination = normalizeDestinationPort(newRow.destination);
                    console.log(`Destination normalized: "${originalDest}" → "${newRow.destination}"`);
                }

                // Set default values
                newRow.doStatus = 'CUSTOMER'; 
                newRow.postToSap = false; 
                newRow.masalah = 'None';
                newRow.nw = parseFloat(newRow.nw) || 0; 
                newRow.vesselName = newRow.vesselName || "";
                newRow.voyage = newRow.voyage || "";
                newRow.siStatus = 'Pending';
                newRow.bcStatus = 'Pending';
                
                // Initialize TOP 1 LINER columns
                newRow.top1_20 = '';
                newRow.top1_40 = '';
                newRow.top1_40hc = '';
                newRow.top1 = '';
                
                return newRow;
            }).filter(row => {
                // Filter: harus ada delivery ATAU region ATAU vfPpp
                const hasData = row.delivery || row.region || row.vfPpp;
                if (!hasData) {
                    console.warn('Row filtered out (no key data):', row);
                }
                return hasData;
            });
            
            console.log('Processed rows:', jsonData.length);
            console.log('Sample data:', jsonData.slice(0, 2));
            
            if (jsonData.length === 0) throw new Error("Data tidak ditemukan atau tidak valid.");
            
            // CRITICAL FIX: Add to globalData
            let nextId = globalData.length > 0 ? Math.max(...globalData.map(d => d.id)) + 1 : 1;
            jsonData.forEach(row => {
                row.id = nextId++;
                globalData.push(row);
                console.log('Added to globalData:', row.id, row.region, row.delivery);
            });
            
            console.log('Total globalData after import:', globalData.length);
            
            // AUTO-FILL TOP 1 LINER
            autoFillTOP1LINER();
            
            // CRITICAL FIX: Render semua view
            renderAllTablesAndCharts();
            
            // CRITICAL FIX: Jika sedang di tracking view, update juga
            if (currentRegion) {
                console.log('Currently viewing region:', currentRegion);
                filterTrackingTable();
            }
            
            console.log('=== EXCEL IMPORT SUCCESS ===');
            alert(`✅ ${jsonData.length} data berhasil diimpor ke globalData!\n\nKolom TOP 1 LINER telah terisi otomatis berdasarkan Agreement List.`);

        } catch (error) {
            console.error('=== EXCEL IMPORT ERROR ===', error);
            alert("❌ Error: " + error.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
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
 // CRITICAL FIX: Add click outside to close modal
window.addEventListener('DOMContentLoaded', () => {
    // ... kode existing ...
    
    // Close modal saat click di overlay (area gelap)
    document.getElementById('image-viewer-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeImageViewerModal();
        }
    });
    
    document.getElementById('notification-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeNotificationModal();
        }
    });
    
    document.getElementById('calendar-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    document.getElementById('booking-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeBookingModal();
        }
    });
});   
    // === HOOK UNTUK KALENDER ===
    calendarCurrentDate = new Date(); 
    renderCalendar(calendarCurrentDate);

    document.getElementById('prev-month-btn').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        renderCalendar(calendarCurrentDate);
    });
    
    document.getElementById('next-month-btn').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        renderCalendar(calendarCurrentDate);
    });
    // === AKHIR HOOK KALENDER ===

    renderVesselList();
    renderAllTablesAndCharts();
    
    // Inisiasi awal notifikasi
    updateNotificationDisplay();
    document.getElementById('agreement-excel-input').addEventListener('change', handleAgreementExcelUpload);
    document.getElementById('excel-input').addEventListener('change', handleExcelUpload);
    document.getElementById('database-cost-input').addEventListener('change', handleDatabaseCostUpload);
    document.getElementById('filterAgreement').addEventListener('input', filterAgreementTable);
// Event listener untuk upload Agreement Excel
    const agreementExcelInput = document.getElementById('agreement-excel-input');
    if (agreementExcelInput) {
        agreementExcelInput.addEventListener('change', handleAgreementExcelUpload);
    }

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
                    
let mainTitle = this.dataset.region 
            ? `🗺️ Tracking - ${this.dataset.region}` 
            : `${icon} ${titleText}`;

        switchView(targetId, mainTitle);
        
        if (targetId === 'dummy-booking-view') {
            console.log('Switching to Dummy Booking view');
            renderDummyBookingTable();
            currentRegion = null; 
        } else if (this.dataset.region) {
            console.log('Switching to Tracking view for region:', this.dataset.region);
            updateTrackingContent(this.dataset.region);
        } else {
            console.log('Switching to other view:', targetId);
            currentRegion = null;
        }
        
        console.log('Current region after switch:', currentRegion);
        console.log('=== MENU SWITCH COMPLETE ===');
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
    
    // STEP 1: Build tonase map untuk SEMUA vessel yang ada di tracking
    const allData = [...globalData, ...dummyData];
    console.log('Total tracking data available:', allData.length);
    
    // Build tonase map dengan normalized keys
    const vesselTonaseMap = {};
    allData.forEach(booking => {
        const normalizedName = normalizeVesselName(booking.vesselName);
        if (normalizedName) {
            if (!vesselTonaseMap[normalizedName]) {
                vesselTonaseMap[normalizedName] = 0;
            }
            vesselTonaseMap[normalizedName] += (parseFloat(booking.nw) || 0);
        }
    });
    
    console.log('Vessel Tonase Map:', vesselTonaseMap);
    
    // STEP 2: Attach tonase ke setiap data row
    const dataWithTonase = data.map(item => {
        const normalizedName = normalizeVesselName(item.vesselName);
        const totalNW_Kg = vesselTonaseMap[normalizedName] || 0;
        const totalNW_Ton = totalNW_Kg / 1000;
        
        console.log(`Vessel: "${item.vesselName}" → Normalized: "${normalizedName}" → Tonase: ${totalNW_Ton.toFixed(2)} ton`);
        
        return {
            ...item,
            normalizedVesselName: normalizedName,
            calculatedTonase: totalNW_Ton
        };
    });
    
    console.log('Data with tonase (first 3):', dataWithTonase.slice(0, 3).map(d => ({
        vesselName: d.vesselName,
        normalized: d.normalizedVesselName,
        tonase: d.calculatedTonase
    })));
    
    // STEP 3: Sort by tonase DESC, then by vessel name ASC
    const sorted = dataWithTonase.sort((a, b) => {
        // PRIMARY: Tonase descending (vessels with tonase > 0 first)
        if (a.calculatedTonase !== b.calculatedTonase) {
            return b.calculatedTonase - a.calculatedTonase;
        }
        
        // SECONDARY: Vessel name ascending
        return a.normalizedVesselName.localeCompare(b.normalizedVesselName);
    });
    
    console.log('Sorted data (first 5):', sorted.slice(0, 5).map(d => ({
        vesselName: d.vesselName,
        tonase: d.calculatedTonase.toFixed(2)
    })));
    
    // STEP 4: Mark first occurrence of each vessel
    let lastVessel = '';
    sorted.forEach((item, index) => {
        const currentVessel = item.normalizedVesselName;
        if (currentVessel !== lastVessel) {
            item.isFirstOfGroup = true;
            lastVessel = currentVessel;
            console.log(`Row ${index}: FIRST of "${item.vesselName}" - Tonase: ${item.calculatedTonase.toFixed(2)} ton`);
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

// === FUNGSI getTonase() DIPERBARUI - FIXED CALCULATION ===
// === FUNGSI getTonase() dengan DEBUG LENGKAP ===
function getTonase(vesselName) {
    console.log('=== getTonase() CALLED ===');
    console.log('Input vesselName:', vesselName);
    
    if (!vesselName || vesselName.trim() === '') {
        console.warn('⚠️ vesselName is EMPTY');
        return "0.00";
    }
    
    const lowerVesselName = vesselName.trim().toLowerCase();
    console.log('Normalized vesselName:', lowerVesselName);
    
    // Gabungkan data global dan data dummy
    const allData = [...globalData, ...dummyData];
    console.log('Total data available:', allData.length);
    console.log('Sample data (first 3):', allData.slice(0, 3).map(item => ({
        vesselName: item.vesselName,
        nw: item.nw,
        region: item.region
    })));
    
    // Filter matching bookings
    const matchingBookings = allData.filter(item => {
        const itemVesselName = (item.vesselName || '').trim().toLowerCase();
        const isMatch = itemVesselName === lowerVesselName;
        
        if (isMatch) {
            console.log('✓ MATCH FOUND:', {
                vesselName: item.vesselName,
                nw: item.nw,
                region: item.region,
                delivery: item.delivery
            });
        }
        
        return isMatch;
    });
    
    console.log(`Total matching bookings: ${matchingBookings.length}`);
    
    if (matchingBookings.length === 0) {
        console.warn('⚠️ NO MATCHING BOOKINGS FOUND for:', vesselName);
        console.log('Available vessels in data:', allData.map(item => item.vesselName).filter(Boolean));
        return "0.00";
    }
    
    // Calculate total NW
    let totalNW_Kg = 0;
    matchingBookings.forEach((item, index) => {
        const nwValue = parseFloat(item.nw) || 0;
        console.log(`  [${index + 1}] NW: ${nwValue} kg | Delivery: ${item.delivery} | Region: ${item.region}`);
        totalNW_Kg += nwValue;
    });
    
    const totalNW_Ton = totalNW_Kg / 1000;
    const formatted = totalNW_Ton.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    console.log(`✅ TOTAL for "${vesselName}": ${totalNW_Kg} kg = ${totalNW_Ton} ton (${formatted})`);
    console.log('=== END getTonase() ===\n');
    
    return formatted;
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
    
    console.log('Update tonase for:', vesselName);
    
    if (vesselName) {
        const tonaseString = getTonase(vesselName);
        tonaseCell.textContent = tonaseString;
        tonaseCell.style.fontWeight = '700';
        tonaseCell.style.fontSize = '14px';
        tonaseCell.style.color = '#2c3e50';
        
        // Update semua baris dengan vessel yang sama
        const tableBody = document.getElementById('terminalScheduleBody');
        if (tableBody) {
            const allRows = tableBody.querySelectorAll('tr');
            allRows.forEach(otherRow => {
                const otherVesselInput = otherRow.querySelector('td:nth-child(2) input.editable-cell');
                const otherTonaseCell = otherRow.querySelector('.total-tonase-cell');
                
                if (otherVesselInput && otherTonaseCell) {
                    const otherVesselName = otherVesselInput.value.trim();
                    if (otherVesselName.toLowerCase() === vesselName.toLowerCase()) {
                        otherTonaseCell.textContent = tonaseString;
                    }
                }
            });
        }
    } else {
        tonaseCell.textContent = '-';
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
    if (!vesselNameInput) return;

    const vesselName = vesselNameInput.value.trim();
    
    if (!vesselName) {
        alert("Nama 'Vessel Name' di baris ini kosong.");
        return;
    }

    console.log('=== showBookingDetails() ===');
    console.log('Input vessel name:', vesselName);
    
    // CRITICAL: Normalize untuk matching
    const normalizedInput = normalizeVesselName(vesselName);
    console.log('Normalized input:', normalizedInput);

    // Gabungkan data global dan data dummy
    const allData = [...globalData, ...dummyData];
    console.log('Total data available:', allData.length);

    // CRITICAL: Filter dengan normalization
    const matchingBookings = allData.filter(item => {
        const itemVesselName = normalizeVesselName(item.vesselName);
        const isMatch = itemVesselName === normalizedInput;
        
        if (isMatch) {
            console.log('✓ Match found:', item.vesselName, '→', itemVesselName);
        }
        
        return isMatch;
    });

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
    const rows = table.querySelectorAll('tbody tr');
    
    if (headers.length === 0) {
        console.warn('No headers found in table');
        return;
    }
    
    // Reset all column widths first
    headers.forEach(th => {
        th.style.width = 'auto';
        th.style.minWidth = '30px';
        th.style.maxWidth = 'none';
    });
    
    // Calculate optimal width for each column
    headers.forEach((th, colIndex) => {
        let maxWidth = 0;
        
        // Measure header text width
        const headerText = th.textContent || th.innerText;
        const headerWidth = getTextWidth(headerText, getComputedStyle(th).font);
        maxWidth = Math.max(maxWidth, headerWidth);
        
        // Measure cell content widths (sample first 50 rows for performance)
        const sampleSize = Math.min(rows.length, 50);
        for (let i = 0; i < sampleSize; i++) {
            const cell = rows[i].cells[colIndex];
            if (!cell) continue;
            
            // Check if cell has input/select
            const input = cell.querySelector('input, select');
            if (input) {
                const inputValue = input.value || input.placeholder || '';
                const inputWidth = getTextWidth(inputValue, getComputedStyle(input).font);
                maxWidth = Math.max(maxWidth, inputWidth);
            } else {
                const cellText = cell.textContent || cell.innerText;
                const cellWidth = getTextWidth(cellText, getComputedStyle(cell).font);
                maxWidth = Math.max(maxWidth, cellWidth);
            }
        }
        
        // Add padding (12px padding left + 12px padding right = 24px total)
        const optimalWidth = Math.ceil(maxWidth) + 24;
        
        // Set minimum 30px, maximum 500px
        const finalWidth = Math.max(30, Math.min(500, optimalWidth));
        
        th.style.width = `${finalWidth}px`;
        
        console.log(`Column ${colIndex + 1} (${headerText}): ${finalWidth}px`);
    });
    
    console.log('=== AUTO-FIT COMPLETE ===');
    alert(`✅ Columns auto-fitted successfully for ${tableId}!\n\nYou can still manually resize columns by dragging the column borders.`);
}

// Helper function to measure text width
function getTextWidth(text, font) {
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    context.font = font;
    const metrics = context.measureText(text);
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
