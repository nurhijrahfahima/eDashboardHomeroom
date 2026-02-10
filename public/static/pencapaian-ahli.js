// Pencapaian Ahli Homeroom - JavaScript Logic
let currentUser = null;
let homeroomId = null;
let ahliList = []; // Store ahli for dropdown

// Initialize
async function init() {
    currentUser = checkAuth();
    if (!currentUser) return;
    
    homeroomId = currentUser.homeroom_id;
    
    await loadAhliList();
    await loadPencapaian();
    await loadSetiausaha();
}

function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/pengguna/login';
        return null;
    }
    
    const userData = JSON.parse(user);
    document.getElementById('guruName').textContent = userData.nama_penuh;
    document.getElementById('homeroomInfo').textContent = `${userData.nama_homeroom} - ${userData.tingkatan}`;
    
    return userData;
}

// Load ahli list for dropdown
async function loadAhliList() {
    try {
        const response = await axios.get(`/api/ahli/${homeroomId}`);
        ahliList = response.data.data || [];
        populateAhliDropdown();
    } catch (error) {
        console.error('Error loading ahli:', error);
    }
}

function populateAhliDropdown() {
    const select = document.getElementById('nama_pelajar');
    select.innerHTML = '<option value="">-- Pilih Pelajar --</option>';
    
    ahliList.forEach(ahli => {
        const option = document.createElement('option');
        option.value = ahli.nama_ahli;
        option.dataset.noMaktab = ahli.no_maktab;
        option.textContent = `${ahli.nama_ahli} (${ahli.no_maktab})`;
        select.appendChild(option);
    });
}

// Auto-fill No Maktab when student selected
document.addEventListener('DOMContentLoaded', () => {
    const selectPelajar = document.getElementById('nama_pelajar');
    if (selectPelajar) {
        selectPelajar.addEventListener('change', (e) => {
            const selected = e.target.selectedOptions[0];
            const noMaktab = selected?.dataset.noMaktab || '';
            document.getElementById('no_maktab').value = noMaktab;
        });
    }
});

// Load pencapaian list
async function loadPencapaian() {
    try {
        const response = await axios.get(`/api/pencapaian/${homeroomId}`);
        const data = response.data.data || [];
        
        const tbody = document.getElementById('pencapaianTable');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-trophy text-4xl mb-2"></i>
                        <p>Tiada pencapaian. Klik "Tambah Pencapaian Baru" untuk mulakan.</p>
                    </td>
                </tr>`;
            return;
        }
        
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm">${index + 1}</td>
                <td class="px-4 py-3 text-sm font-medium">${item.nama_pelajar}</td>
                <td class="px-4 py-3 text-sm">${item.no_maktab}</td>
                <td class="px-4 py-3 text-sm">${item.nama_aktiviti}</td>
                <td class="px-4 py-3 text-sm">
                    <span class="px-2 py-1 text-xs rounded-full ${getPeringkatColor(item.peringkat)}">
                        ${item.peringkat}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-green-600">${item.pencapaian}</td>
                <td class="px-4 py-3 text-sm">
                    <button onclick="viewPencapaian(${item.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editPencapaian(${item.id})" class="text-yellow-600 hover:text-yellow-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deletePencapaian(${item.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading pencapaian:', error);
    }
}

function getPeringkatColor(peringkat) {
    const colors = {
        'Daerah': 'bg-blue-100 text-blue-800',
        'Negeri': 'bg-purple-100 text-purple-800',
        'Kebangsaan': 'bg-red-100 text-red-800',
        'MRSM Se-Malaysia': 'bg-green-100 text-green-800'
    };
    return colors[peringkat] || 'bg-gray-100 text-gray-800';
}

// Load Setiausaha for autofill
async function loadSetiausaha() {
    try {
        const response = await axios.get(`/api/ahli/${homeroomId}`);
        const ahli = response.data.data || [];
        const setiausaha = ahli.find(a => a.jawatan_homeroom === 'SETIAUSAHA');
        
        if (setiausaha) {
            document.getElementById('disediakan_oleh').value = setiausaha.nama_ahli;
        }
    } catch (error) {
        console.error('Error loading setiausaha:', error);
    }
}

// Show add form
function showAddForm() {
    document.getElementById('formTitle').textContent = 'Tambah Pencapaian Baru';
    document.getElementById('pencapaianForm').reset();
    document.getElementById('pencapaianId').value = '';
    
    // Auto-fill metadata
    document.getElementById('disemak_oleh').value = currentUser.nama_penuh;
    loadSetiausaha();
    
    document.getElementById('formModal').classList.remove('hidden');
}

// Edit pencapaian
async function editPencapaian(id) {
    try {
        const response = await axios.get(`/api/pencapaian/${homeroomId}/${id}`);
        const data = response.data.data;
        
        if (!data) {
            alert('Pencapaian tidak dijumpai');
            return;
        }
        
        document.getElementById('formTitle').textContent = 'Edit Pencapaian';
        document.getElementById('pencapaianId').value = data.id;
        document.getElementById('nama_pelajar').value = data.nama_pelajar;
        document.getElementById('no_maktab').value = data.no_maktab;
        document.getElementById('png').value = data.png || '';
        document.getElementById('nama_aktiviti').value = data.nama_aktiviti;
        document.getElementById('peringkat').value = data.peringkat;
        document.getElementById('pencapaian').value = data.pencapaian;
        document.getElementById('galeri_url').value = data.galeri_url || '';
        document.getElementById('galeri_caption').value = data.galeri_caption || '';
        document.getElementById('disediakan_oleh').value = data.disediakan_oleh || '';
        document.getElementById('disemak_oleh').value = data.disemak_oleh || '';
        
        document.getElementById('formModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading pencapaian:', error);
        alert('Ralat memuatkan data');
    }
}

// Delete pencapaian
async function deletePencapaian(id) {
    if (!confirm('Adakah anda pasti mahu membuang pencapaian ini?')) {
        return;
    }
    
    try {
        await axios.delete(`/api/pencapaian/${id}`);
        alert('Pencapaian berjaya dibuang');
        loadPencapaian();
    } catch (error) {
        console.error('Error deleting pencapaian:', error);
        alert('Ralat membuang pencapaian');
    }
}

// View pencapaian (read-only modal)
async function viewPencapaian(id) {
    try {
        const response = await axios.get(`/api/pencapaian/${homeroomId}/${id}`);
        const data = response.data.data;
        
        if (!data) {
            alert('Pencapaian tidak dijumpai');
            return;
        }
        
        const modalContent = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div><strong>Nama Pelajar:</strong> ${data.nama_pelajar}</div>
                    <div><strong>No. Maktab:</strong> ${data.no_maktab}</div>
                    ${data.png ? `<div class="col-span-2"><strong>PNG:</strong> ${data.png}</div>` : ''}
                </div>
                <hr>
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2"><strong>Aktiviti/Pertandingan:</strong> ${data.nama_aktiviti}</div>
                    <div><strong>Peringkat:</strong> <span class="px-2 py-1 rounded ${getPeringkatColor(data.peringkat)}">${data.peringkat}</span></div>
                    <div><strong>Pencapaian:</strong> <span class="font-bold text-green-600">${data.pencapaian}</span></div>
                </div>
                ${data.galeri_url ? `
                    <hr>
                    <div>
                        <strong>Galeri:</strong>
                        <img src="${data.galeri_url}" alt="Gambar" class="mt-2 max-w-full h-auto rounded">
                        ${data.galeri_caption ? `<p class="mt-2 text-sm text-gray-600">${data.galeri_caption}</p>` : ''}
                    </div>
                ` : ''}
                <hr>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Disediakan:</strong> ${data.disediakan_oleh || '-'}</div>
                    <div><strong>Disemak:</strong> ${data.disemak_oleh || '-'}</div>
                </div>
            </div>
        `;
        
        document.getElementById('viewContent').innerHTML = modalContent;
        document.getElementById('viewModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error viewing pencapaian:', error);
    }
}

// Save pencapaian (Create or Update)
document.getElementById('pencapaianForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('pencapaianId').value;
    const formData = {
        homeroom_id: homeroomId,
        nama_pelajar: document.getElementById('nama_pelajar').value,
        no_maktab: document.getElementById('no_maktab').value,
        png: document.getElementById('png').value || null,
        nama_aktiviti: document.getElementById('nama_aktiviti').value,
        peringkat: document.getElementById('peringkat').value,
        pencapaian: document.getElementById('pencapaian').value,
        galeri_url: document.getElementById('galeri_url').value || null,
        galeri_caption: document.getElementById('galeri_caption').value || null,
        disediakan_oleh: document.getElementById('disediakan_oleh').value,
        disemak_oleh: document.getElementById('disemak_oleh').value
    };
    
    try {
        if (id) {
            // Update
            await axios.put(`/api/pencapaian/${id}`, formData);
            alert('Pencapaian berjaya dikemaskini');
        } else {
            // Create
            await axios.post('/api/pencapaian', formData);
            alert('Pencapaian berjaya ditambah');
        }
        
        hideForm();
        loadPencapaian();
    } catch (error) {
        console.error('Error saving pencapaian:', error);
        alert('Ralat menyimpan pencapaian');
    }
});

function hideForm() {
    document.getElementById('formModal').classList.add('hidden');
}

function hideView() {
    document.getElementById('viewModal').classList.add('hidden');
}

function goToDashboard() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/';
        return;
    }
    
    const userData = JSON.parse(user);
    if (userData.role === 'admin') {
        window.location.href = '/admin';
    } else {
        window.location.href = '/pengguna-dashboard';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
