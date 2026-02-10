// Get user and homeroom info from localStorage
let currentUser = null;
let homeroomId = null;

function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/pengguna/login';
        return null;
    }
    
    currentUser = JSON.parse(user);
    homeroomId = currentUser.homeroom_id;
    
    document.getElementById('guruName').textContent = currentUser.nama_penuh;
    document.getElementById('homeroomInfo').textContent = `${currentUser.nama_homeroom} - ${currentUser.tingkatan}`;
    
    return currentUser;
}

// Load members
async function loadMembers() {
    try {
        const response = await axios.get(`/api/ahli/${homeroomId}`);
        const members = response.data.data;
        
        const tbody = document.getElementById('membersTable');
        tbody.innerHTML = '';
        
        if (members.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">Tiada ahli. Klik "Tambah Ahli Baru" untuk mulakan.</td></tr>';
            return;
        }
        
        members.forEach(member => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm">${member.bilangan}</td>
                    <td class="px-4 py-3 text-sm font-medium">${member.nama_ahli}</td>
                    <td class="px-4 py-3 text-sm">${member.no_maktab}</td>
                    <td class="px-4 py-3 text-sm">${member.jantina}</td>
                    <td class="px-4 py-3 text-sm">${member.kelas}</td>
                    <td class="px-4 py-3 text-sm">${member.jawatan_homeroom || '-'}</td>
                    <td class="px-4 py-3 text-sm">
                        <button onclick="editMember(${member.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteMember(${member.id})" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

// Show add form
function showAddForm() {
    document.getElementById('modalTitle').textContent = 'Tambah Ahli Baru';
    document.getElementById('memberForm').reset();
    document.getElementById('memberId').value = '';
    hideAllJawatanLain();
    document.getElementById('formModal').classList.remove('hidden');
}

// Hide form
function hideForm() {
    document.getElementById('formModal').classList.add('hidden');
}

// Edit member
async function editMember(id) {
    try {
        const response = await axios.get(`/api/ahli/${homeroomId}/${id}`);
        const member = response.data.data;
        
        document.getElementById('modalTitle').textContent = 'Edit Ahli';
        document.getElementById('memberId').value = member.id;
        document.getElementById('nama_ahli').value = member.nama_ahli;
        document.getElementById('no_maktab').value = member.no_maktab;
        document.getElementById('jantina').value = member.jantina;
        document.getElementById('kelas').value = member.kelas;
        document.getElementById('jawatan_homeroom').value = member.jawatan_homeroom || '';
        document.getElementById('no_bilik_asrama').value = member.no_bilik_asrama || '';
        
        // Unit Beruniform
        document.getElementById('unit_beruniform').value = member.unit_beruniform || '';
        document.getElementById('jawatan_beruniform').value = member.jawatan_beruniform || '';
        if (member.jawatan_beruniform === 'AJK KHAS' && member.jawatan_beruniform_lain) {
            document.getElementById('div_jawatan_beruniform_lain').classList.remove('hidden');
            document.getElementById('jawatan_beruniform_lain').value = member.jawatan_beruniform_lain;
        }
        
        // Kelab
        document.getElementById('kelab_persatuan').value = member.kelab_persatuan || '';
        document.getElementById('jawatan_kelab').value = member.jawatan_kelab || '';
        if (member.jawatan_kelab === 'AJK KHAS' && member.jawatan_kelab_lain) {
            document.getElementById('div_jawatan_kelab_lain').classList.remove('hidden');
            document.getElementById('jawatan_kelab_lain').value = member.jawatan_kelab_lain;
        }
        
        // Sukan
        document.getElementById('sukan_permainan').value = member.sukan_permainan || '';
        document.getElementById('jawatan_sukan').value = member.jawatan_sukan || '';
        if (member.jawatan_sukan === 'AJK KHAS' && member.jawatan_sukan_lain) {
            document.getElementById('div_jawatan_sukan_lain').classList.remove('hidden');
            document.getElementById('jawatan_sukan_lain').value = member.jawatan_sukan_lain;
        }
        
        // SKP
        document.getElementById('sekretariat_skp').value = member.sekretariat_skp || '';
        document.getElementById('jawatan_skp').value = member.jawatan_skp || '';
        
        document.getElementById('formModal').classList.remove('hidden');
    } catch (error) {
        alert('Ralat mendapatkan maklumat ahli');
    }
}

// Delete member
async function deleteMember(id) {
    if (!confirm('Adakah anda pasti mahu membuang ahli ini?')) return;
    
    try {
        await axios.delete(`/api/ahli/${id}`);
        alert('Ahli berjaya dibuang');
        loadMembers();
    } catch (error) {
        alert('Ralat membuang ahli');
    }
}

// Check jawatan homeroom
function checkJawatanHomeroom() {
    // Homeroom doesn't need "lain" field
}

// Check jawatan beruniform
function checkJawatanBeruniform() {
    const jawatan = document.getElementById('jawatan_beruniform').value;
    const div = document.getElementById('div_jawatan_beruniform_lain');
    
    if (jawatan === 'AJK KHAS') {
        div.classList.remove('hidden');
    } else {
        div.classList.add('hidden');
        document.getElementById('jawatan_beruniform_lain').value = '';
    }
}

// Check jawatan kelab
function checkJawatanKelab() {
    const jawatan = document.getElementById('jawatan_kelab').value;
    const div = document.getElementById('div_jawatan_kelab_lain');
    
    if (jawatan === 'AJK KHAS') {
        div.classList.remove('hidden');
    } else {
        div.classList.add('hidden');
        document.getElementById('jawatan_kelab_lain').value = '';
    }
}

// Check jawatan sukan
function checkJawatanSukan() {
    const jawatan = document.getElementById('jawatan_sukan').value;
    const div = document.getElementById('div_jawatan_sukan_lain');
    
    if (jawatan === 'AJK KHAS') {
        div.classList.remove('hidden');
    } else {
        div.classList.add('hidden');
        document.getElementById('jawatan_sukan_lain').value = '';
    }
}

// Hide all jawatan lain fields
function hideAllJawatanLain() {
    document.getElementById('div_jawatan_beruniform_lain').classList.add('hidden');
    document.getElementById('div_jawatan_kelab_lain').classList.add('hidden');
    document.getElementById('div_jawatan_sukan_lain').classList.add('hidden');
}

// Handle form submit
document.getElementById('memberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('memberId').value;
    const data = {
        homeroom_id: homeroomId,
        nama_ahli: document.getElementById('nama_ahli').value,
        no_maktab: document.getElementById('no_maktab').value,
        jantina: document.getElementById('jantina').value,
        kelas: document.getElementById('kelas').value,
        jawatan_homeroom: document.getElementById('jawatan_homeroom').value || null,
        no_bilik_asrama: document.getElementById('no_bilik_asrama').value || null,
        
        unit_beruniform: document.getElementById('unit_beruniform').value || null,
        jawatan_beruniform: document.getElementById('jawatan_beruniform').value || null,
        jawatan_beruniform_lain: document.getElementById('jawatan_beruniform_lain').value || null,
        
        kelab_persatuan: document.getElementById('kelab_persatuan').value || null,
        jawatan_kelab: document.getElementById('jawatan_kelab').value || null,
        jawatan_kelab_lain: document.getElementById('jawatan_kelab_lain').value || null,
        
        sukan_permainan: document.getElementById('sukan_permainan').value || null,
        jawatan_sukan: document.getElementById('jawatan_sukan').value || null,
        jawatan_sukan_lain: document.getElementById('jawatan_sukan_lain').value || null,
        
        sekretariat_skp: document.getElementById('sekretariat_skp').value || null,
        jawatan_skp: document.getElementById('jawatan_skp').value || null
    };
    
    try {
        if (id) {
            await axios.put(`/api/ahli/${id}`, data);
            alert('Ahli berjaya dikemaskini');
        } else {
            await axios.post('/api/ahli', data);
            alert('Ahli berjaya ditambah');
        }
        
        hideForm();
        loadMembers();
    } catch (error) {
        alert('Ralat menyimpan ahli');
    }
});

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

// Initialize
if (checkAuth()) {
    loadMembers();
}
