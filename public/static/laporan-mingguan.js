// Laporan Mingguan Logic
let currentHomeroom = null;
let ahliList = [];
let ketidakhadiranList = [];
let laporanList = [];
let editingId = null;
let setiausaha = null;

// Initialize
async function init() {
    currentHomeroom = JSON.parse(localStorage.getItem('currentHomeroom') || '{}');
    if (!currentHomeroom.id) {
        window.location.href = '/';
        return;
    }
    
    document.getElementById('guruName').textContent = currentHomeroom.nama_guru;
    document.getElementById('homeroomInfo').textContent = `${currentHomeroom.nama_homeroom} - ${currentHomeroom.tingkatan}`;
    
    await loadAhliList();
    await loadLaporanList();
}

// Load ahli list for kehadiran/ketidakhadiran
async function loadAhliList() {
    try {
        const response = await axios.get(`/api/ahli/${currentHomeroom.id}`);
        if (response.data.success) {
            ahliList = response.data.data;
            
            // Find Setiausaha
            setiausaha = ahliList.find(a => a.jawatan_homeroom === 'SETIAUSAHA');
            
            // Update kehadiran total
            document.getElementById('jumlah_ahli').textContent = ahliList.length;
            document.getElementById('kehadiran').value = ahliList.length;
        }
    } catch (error) {
        console.error('Error loading ahli:', error);
    }
}

// Load laporan list
async function loadLaporanList() {
    try {
        const response = await axios.get(`/api/laporan-mingguan/${currentHomeroom.id}`);
        if (response.data.success) {
            laporanList = response.data.data;
            renderLaporanList();
        }
    } catch (error) {
        console.error('Error loading laporan:', error);
    }
}

// Render laporan list
function renderLaporanList() {
    const tbody = document.getElementById('laporanTable');
    
    if (laporanList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">Tiada laporan. Klik "Tambah Laporan Baru".</td></tr>';
        return;
    }
    
    tbody.innerHTML = laporanList.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${item.pertemuan_ke}</td>
            <td class="px-4 py-3">${formatDate(item.tarikh)}</td>
            <td class="px-4 py-3">${item.hari}</td>
            <td class="px-4 py-3">${item.tema}</td>
            <td class="px-4 py-3">${item.kehadiran}/${ahliList.length}</td>
            <td class="px-4 py-3">
                <button onclick="viewLaporan(${item.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editLaporan(${item.id})" class="text-green-600 hover:text-green-800 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteLaporan(${item.id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Show form
function showAddForm() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Tambah Laporan Mingguan Baru';
    document.getElementById('laporanForm').reset();
    
    // Set defaults
    document.getElementById('nama_homeroom').value = currentHomeroom.nama_homeroom;
    document.getElementById('kehadiran').value = ahliList.length;
    document.getElementById('disediakan_oleh').value = setiausaha ? setiausaha.nama_ahli : '';
    document.getElementById('disemak_oleh').value = currentHomeroom.nama_guru;
    
    ketidakhadiranList = [];
    renderKetidakhadiranList();
    
    document.getElementById('formModal').classList.remove('hidden');
}

// Auto-fill hari
document.getElementById('tarikh')?.addEventListener('change', (e) => {
    const date = new Date(e.target.value);
    const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
    document.getElementById('hari').value = days[date.getDay()];
});

// Add ketidakhadiran
function addKetidakhadiran() {
    const select = document.getElementById('ketidakhadiran_select');
    const ahliId = select.value;
    
    if (!ahliId) return;
    
    const ahli = ahliList.find(a => a.id == ahliId);
    if (ahli && !ketidakhadiranList.find(k => k.id == ahliId)) {
        ketidakhadiranList.push(ahli);
        renderKetidakhadiranList();
        updateKehadiran();
        select.value = '';
    }
}

// Remove ketidakhadiran
function removeKetidakhadiran(ahliId) {
    ketidakhadiranList = ketidakhadiranList.filter(k => k.id != ahliId);
    renderKetidakhadiranList();
    updateKehadiran();
}

// Render ketidakhadiran list
function renderKetidakhadiranList() {
    const container = document.getElementById('ketidakhadiranList');
    const select = document.getElementById('ketidakhadiran_select');
    
    // Update select options
    select.innerHTML = '<option value="">-- Pilih Ahli --</option>' +
        ahliList.filter(a => !ketidakhadiranList.find(k => k.id == a.id))
            .map(a => `<option value="${a.id}">${a.nama_ahli} (${a.no_maktab})</option>`)
            .join('');
    
    // Render list
    if (ketidakhadiranList.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">Tiada ketidakhadiran</p>';
        return;
    }
    
    container.innerHTML = ketidakhadiranList.map(ahli => `
        <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
            <span class="text-sm">${ahli.nama_ahli} (${ahli.no_maktab})</span>
            <button type="button" onclick="removeKetidakhadiran(${ahli.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Update kehadiran count
function updateKehadiran() {
    const kehadiran = ahliList.length - ketidakhadiranList.length;
    document.getElementById('kehadiran').value = kehadiran;
}

// Save laporan
async function saveLaporan(e) {
    e.preventDefault();
    
    const formData = {
        homeroom_id: currentHomeroom.id,
        nama_homeroom: document.getElementById('nama_homeroom').value,
        tarikh: document.getElementById('tarikh').value,
        hari: document.getElementById('hari').value,
        masa: document.getElementById('masa').value,
        tempat: document.getElementById('tempat').value,
        kehadiran: parseInt(document.getElementById('kehadiran').value),
        ketidakhadiran: JSON.stringify(ketidakhadiranList.map(k => k.id)),
        tema: document.getElementById('tema').value,
        tajuk: document.getElementById('tajuk').value,
        penerangan_aktiviti: document.getElementById('penerangan_aktiviti').value,
        galeri_url: document.getElementById('galeri_url').value || null,
        galeri_caption: document.getElementById('galeri_caption').value || null,
        refleksi_pelajar: document.getElementById('refleksi_pelajar').value,
        refleksi_guru: document.getElementById('refleksi_guru').value,
        disediakan_oleh: document.getElementById('disediakan_oleh').value,
        disemak_oleh: document.getElementById('disemak_oleh').value
    };
    
    try {
        let response;
        if (editingId) {
            response = await axios.put(`/api/laporan-mingguan/${editingId}`, formData);
        } else {
            response = await axios.post('/api/laporan-mingguan', formData);
        }
        
        if (response.data.success) {
            alert(response.data.message);
            hideForm();
            await loadLaporanList();
        } else {
            alert('Ralat: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving laporan:', error);
        alert('Ralat sistem. Sila cuba lagi.');
    }
}

// Edit laporan
async function editLaporan(id) {
    try {
        const response = await axios.get(`/api/laporan-mingguan/${currentHomeroom.id}/${id}`);
        if (response.data.success) {
            const laporan = response.data.data;
            editingId = id;
            
            document.getElementById('modalTitle').textContent = 'Edit Laporan Mingguan';
            document.getElementById('nama_homeroom').value = laporan.nama_homeroom;
            document.getElementById('tarikh').value = laporan.tarikh;
            document.getElementById('hari').value = laporan.hari;
            document.getElementById('masa').value = laporan.masa;
            document.getElementById('tempat').value = laporan.tempat;
            document.getElementById('kehadiran').value = laporan.kehadiran;
            document.getElementById('tema').value = laporan.tema;
            document.getElementById('tajuk').value = laporan.tajuk;
            document.getElementById('penerangan_aktiviti').value = laporan.penerangan_aktiviti;
            document.getElementById('galeri_url').value = laporan.galeri_url || '';
            document.getElementById('galeri_caption').value = laporan.galeri_caption || '';
            document.getElementById('refleksi_pelajar').value = laporan.refleksi_pelajar;
            document.getElementById('refleksi_guru').value = laporan.refleksi_guru;
            document.getElementById('disediakan_oleh').value = laporan.disediakan_oleh;
            document.getElementById('disemak_oleh').value = laporan.disemak_oleh;
            
            // Parse ketidakhadiran
            if (laporan.ketidakhadiran) {
                const ids = JSON.parse(laporan.ketidakhadiran);
                ketidakhadiranList = ahliList.filter(a => ids.includes(a.id));
                renderKetidakhadiranList();
            }
            
            document.getElementById('formModal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading laporan:', error);
        alert('Ralat memuat data');
    }
}

// Delete laporan
async function deleteLaporan(id) {
    if (!confirm('Adakah anda pasti mahu membuang laporan ini?')) return;
    
    try {
        const response = await axios.delete(`/api/laporan-mingguan/${id}`);
        if (response.data.success) {
            alert(response.data.message);
            await loadLaporanList();
        }
    } catch (error) {
        console.error('Error deleting laporan:', error);
        alert('Ralat sistem');
    }
}

// View laporan (show modal with details)
async function viewLaporan(id) {
    try {
        const response = await axios.get(`/api/laporan-mingguan/${currentHomeroom.id}/${id}`);
        if (response.data.success) {
            const lap = response.data.data;
            const ketidakhadir = lap.ketidakhadiran ? JSON.parse(lap.ketidakhadiran) : [];
            const ketidakhadirNames = ahliList.filter(a => ketidakhadir.includes(a.id)).map(a => a.nama_ahli).join(', ') || 'Tiada';
            
            const html = `
                <div class="space-y-4">
                    <h3 class="text-xl font-bold">Pertemuan Ke-${lap.pertemuan_ke}</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div><strong>Tarikh:</strong> ${formatDate(lap.tarikh)}</div>
                        <div><strong>Hari:</strong> ${lap.hari}</div>
                        <div><strong>Masa:</strong> ${lap.masa}</div>
                        <div><strong>Tempat:</strong> ${lap.tempat}</div>
                        <div><strong>Kehadiran:</strong> ${lap.kehadiran}/${ahliList.length}</div>
                        <div><strong>Ketidakhadiran:</strong> ${ketidakhadirNames}</div>
                    </div>
                    <div><strong>Tema:</strong> ${lap.tema}</div>
                    <div><strong>Tajuk:</strong> ${lap.tajuk}</div>
                    <div><strong>Penerangan:</strong><br>${lap.penerangan_aktiviti}</div>
                    ${lap.galeri_url ? `<div><strong>Galeri:</strong><br><img src="${lap.galeri_url}" class="max-w-full h-auto rounded"><br><em>${lap.galeri_caption}</em></div>` : ''}
                    <div><strong>Refleksi Pelajar:</strong><br>${lap.refleksi_pelajar}</div>
                    <div><strong>Refleksi Guru:</strong><br>${lap.refleksi_guru}</div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Disediakan Oleh:</strong> ${lap.disediakan_oleh}</div>
                        <div><strong>Disemak Oleh:</strong> ${lap.disemak_oleh}</div>
                    </div>
                </div>
            `;
            
            document.getElementById('viewContent').innerHTML = html;
            document.getElementById('viewModal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error viewing laporan:', error);
    }
}

function hideForm() {
    document.getElementById('formModal').classList.add('hidden');
}

function hideView() {
    document.getElementById('viewModal').classList.add('hidden');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });
}

function goToDashboard() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/';
        return;
    }
    
    const userData = JSON.parse(user);
    // Check role and redirect accordingly
    if (userData.role === 'admin') {
        window.location.href = '/admin';
    } else {
        window.location.href = '/pengguna-dashboard';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
