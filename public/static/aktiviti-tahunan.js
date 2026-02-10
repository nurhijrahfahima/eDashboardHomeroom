// ============================================================
// BORANG AKTIVITI TAHUNAN HOMEROOM - JAVASCRIPT LOGIC
// ============================================================
// 3 Bahagian: Aktiviti Biasa, Aktiviti Keusahawanan, Aktiviti Khidmat Masyarakat

let currentUser = null;
let currentTab = 'biasa'; // Default tab
let editingId = null;
let homeroomMembers = []; // For Setiausaha lookup

// ============================
// INITIALIZATION & AUTH
// ============================

function checkAuth() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/pengguna/login';
    return;
  }
  
  currentUser = JSON.parse(userStr);
  
  // Display user info
  const guruNameEl = document.getElementById('guruName');
  const homeroomInfoEl = document.getElementById('homeroomInfo');
  
  if (guruNameEl) guruNameEl.textContent = currentUser.nama_penuh || 'N/A';
  if (homeroomInfoEl) {
    homeroomInfoEl.textContent = `${currentUser.nama_homeroom || 'N/A'} - ${currentUser.tingkatan || 'N/A'}`;
  }
  
  // Load homeroom members for Setiausaha lookup
  loadHomeroomMembers();
  
  // Load data for default tab
  loadData(currentTab);
}

// Load homeroom members to find Setiausaha
async function loadHomeroomMembers() {
  try {
    const response = await axios.get(`/api/ahli/${currentUser.homeroom_id}`);
    if (response.data.success) {
      homeroomMembers = response.data.data || [];
    }
  } catch (error) {
    console.error('Error loading homeroom members:', error);
  }
}

// ============================
// TAB SWITCHING
// ============================

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-green-600', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  
  const activeBtn = document.getElementById(`tab-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
    activeBtn.classList.add('bg-green-600', 'text-white');
  }
  
  // Show/hide content
  document.getElementById('content-biasa').classList.add('hidden');
  document.getElementById('content-keusahawanan').classList.add('hidden');
  document.getElementById('content-khidmat').classList.add('hidden');
  
  document.getElementById(`content-${tabName}`).classList.remove('hidden');
  
  // Load data for active tab
  loadData(tabName);
}

// ============================
// COMMON UTILITIES
// ============================

// Auto-fill Hari from Tarikh
function autoFillHari(tarikhInputId, hariInputId) {
  const tarikhInput = document.getElementById(tarikhInputId);
  const hariInput = document.getElementById(hariInputId);
  
  if (!tarikhInput || !hariInput) return;
  
  tarikhInput.addEventListener('change', () => {
    const tarikh = tarikhInput.value;
    if (!tarikh) return;
    
    const date = new Date(tarikh);
    const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
    hariInput.value = days[date.getDay()];
  });
}

// Get Setiausaha name
function getSetiausahaName() {
  const setiausaha = homeroomMembers.find(member => 
    member.jawatan_skp && member.jawatan_skp.toLowerCase().includes('setiausaha')
  );
  return setiausaha ? setiausaha.nama_penuh : 'N/A';
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ============================
// LOAD DATA (All 3 Types)
// ============================

async function loadData(type) {
  try {
    const apiEndpoints = {
      'biasa': `/api/aktiviti-biasa/${currentUser.homeroom_id}`,
      'keusahawanan': `/api/aktiviti-keusahawanan/${currentUser.homeroom_id}`,
      'khidmat': `/api/aktiviti-khidmat/${currentUser.homeroom_id}`
    };
    
    const response = await axios.get(apiEndpoints[type]);
    
    if (response.data.success) {
      const data = response.data.data || [];
      renderTable(type, data);
    }
  } catch (error) {
    console.error(`Error loading ${type} data:`, error);
    alert('Ralat memuatkan data');
  }
}

// ============================
// RENDER TABLES
// ============================

function renderTable(type, data) {
  const tableBodyId = `table-${type}`;
  const tableBody = document.getElementById(tableBodyId);
  
  if (!tableBody) return;
  
  if (data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Tiada data</td></tr>';
    return;
  }
  
  tableBody.innerHTML = data.map(item => {
    let row = `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-center">${item.bilangan || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap">${formatDate(item.tarikh)}</td>
        <td class="px-6 py-4">${item.nama_aktiviti || 'N/A'}</td>
        <td class="px-6 py-4">${item.tempat || 'N/A'}</td>
    `;
    
    // Add type-specific column
    if (type === 'keusahawanan') {
      row += `<td class="px-6 py-4 text-right font-semibold text-green-600">RM ${parseFloat(item.keuntungan || 0).toFixed(2)}</td>`;
    } else if (type === 'khidmat') {
      row += `<td class="px-6 py-4 text-sm">${(item.impak || 'N/A').substring(0, 50)}...</td>`;
    }
    
    row += `
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <button onclick="viewItem('${type}', ${item.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="Lihat">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="editItem('${type}', ${item.id})" class="text-green-600 hover:text-green-800 mr-2" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteItem('${type}', ${item.id})" class="text-red-600 hover:text-red-800" title="Buang">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
    
    return row;
  }).join('');
}

// ============================
// SHOW ADD FORM
// ============================

function showAddForm(type) {
  editingId = null;
  
  // Reset form
  const formId = `form-${type}`;
  const form = document.getElementById(formId);
  if (form) form.reset();
  
  // Auto-fill common fields
  const disediakanInput = document.getElementById(`${type}-disediakan`);
  const disemakInput = document.getElementById(`${type}-disemak`);
  
  if (disediakanInput) disediakanInput.value = getSetiausahaName();
  if (disemakInput) disemakInput.value = currentUser.nama_penuh || 'N/A';
  
  // Update modal title
  const modalTitle = document.getElementById(`modal-title-${type}`);
  if (modalTitle) modalTitle.textContent = 'Tambah Aktiviti Baru';
  
  // Show modal
  const modal = document.getElementById(`modal-${type}`);
  if (modal) modal.classList.remove('hidden');
}

// ============================
// HIDE FORM/MODAL
// ============================

function hideForm(type) {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) modal.classList.add('hidden');
  editingId = null;
}

// ============================
// SAVE DATA (CREATE/UPDATE)
// ============================

async function saveData(type) {
  try {
    const formId = `form-${type}`;
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Build data object based on type
    let data = {
      homeroom_id: currentUser.homeroom_id,
      tarikh: document.getElementById(`${type}-tarikh`).value,
      hari: document.getElementById(`${type}-hari`).value,
      masa: document.getElementById(`${type}-masa`).value,
      nama_aktiviti: document.getElementById(`${type}-nama`).value,
      tempat: document.getElementById(`${type}-tempat`).value,
      catatan: document.getElementById(`${type}-catatan`)?.value || null,
      disediakan_oleh: document.getElementById(`${type}-disediakan`).value,
      disemak_oleh: document.getElementById(`${type}-disemak`).value
    };
    
    // Add type-specific fields
    if (type === 'biasa') {
      data.gambar1_url = document.getElementById('biasa-gambar1-url')?.value || null;
      data.gambar1_caption = document.getElementById('biasa-gambar1-caption')?.value || null;
      data.gambar2_url = document.getElementById('biasa-gambar2-url')?.value || null;
      data.gambar2_caption = document.getElementById('biasa-gambar2-caption')?.value || null;
      data.gambar3_url = document.getElementById('biasa-gambar3-url')?.value || null;
      data.gambar3_caption = document.getElementById('biasa-gambar3-caption')?.value || null;
    } else if (type === 'keusahawanan') {
      data.keuntungan = parseFloat(document.getElementById('keusahawanan-keuntungan').value) || 0;
      data.gambar_url = document.getElementById('keusahawanan-gambar-url')?.value || null;
      data.gambar_caption = document.getElementById('keusahawanan-gambar-caption')?.value || null;
    } else if (type === 'khidmat') {
      data.objektif = document.getElementById('khidmat-objektif').value;
      data.impak = document.getElementById('khidmat-impak').value;
      data.gambar_url = document.getElementById('khidmat-gambar-url')?.value || null;
      data.gambar_caption = document.getElementById('khidmat-gambar-caption')?.value || null;
    }
    
    // Validate required fields
    if (!data.tarikh || !data.hari || !data.masa || !data.nama_aktiviti || !data.tempat) {
      alert('Sila isi semua medan yang diperlukan');
      return;
    }
    
    // API call
    const apiEndpoints = {
      'biasa': '/api/aktiviti-biasa',
      'keusahawanan': '/api/aktiviti-keusahawanan',
      'khidmat': '/api/aktiviti-khidmat'
    };
    
    let response;
    if (editingId) {
      // UPDATE
      response = await axios.put(`${apiEndpoints[type]}/${editingId}`, data);
    } else {
      // CREATE
      response = await axios.post(apiEndpoints[type], data);
    }
    
    if (response.data.success) {
      alert(response.data.message || 'Berjaya');
      hideForm(type);
      loadData(type);
    }
  } catch (error) {
    console.error(`Error saving ${type} data:`, error);
    alert('Ralat menyimpan data');
  }
}

// ============================
// VIEW ITEM (Read-only Modal)
// ============================

async function viewItem(type, id) {
  try {
    const apiEndpoints = {
      'biasa': `/api/aktiviti-biasa/${currentUser.homeroom_id}/${id}`,
      'keusahawanan': `/api/aktiviti-keusahawanan/${currentUser.homeroom_id}/${id}`,
      'khidmat': `/api/aktiviti-khidmat/${currentUser.homeroom_id}/${id}`
    };
    
    const response = await axios.get(apiEndpoints[type]);
    
    if (response.data.success && response.data.data) {
      const item = response.data.data;
      
      // Build content HTML
      let content = `
        <div class="space-y-3">
          <div><strong>Bilangan:</strong> ${item.bilangan || 'N/A'}</div>
          <div><strong>Tarikh:</strong> ${formatDate(item.tarikh)}</div>
          <div><strong>Hari:</strong> ${item.hari || 'N/A'}</div>
          <div><strong>Masa:</strong> ${item.masa || 'N/A'}</div>
          <div><strong>Nama Aktiviti:</strong> ${item.nama_aktiviti || 'N/A'}</div>
          <div><strong>Tempat:</strong> ${item.tempat || 'N/A'}</div>
      `;
      
      // Type-specific fields
      if (type === 'keusahawanan') {
        content += `<div><strong>Keuntungan:</strong> <span class="text-green-600 font-bold">RM ${parseFloat(item.keuntungan || 0).toFixed(2)}</span></div>`;
      } else if (type === 'khidmat') {
        content += `
          <div><strong>Objektif:</strong><br/>${item.objektif || 'N/A'}</div>
          <div><strong>Impak:</strong><br/>${item.impak || 'N/A'}</div>
        `;
      }
      
      content += `
          <div><strong>Catatan:</strong><br/>${item.catatan || 'Tiada'}</div>
      `;
      
      // Images
      if (type === 'biasa') {
        content += `<div class="border-t pt-3 mt-3"><strong>Galeri (3 Gambar):</strong></div>`;
        for (let i = 1; i <= 3; i++) {
          const url = item[`gambar${i}_url`];
          const caption = item[`gambar${i}_caption`];
          if (url) {
            content += `
              <div class="mt-2">
                <img src="${url}" alt="Gambar ${i}" class="w-full h-48 object-cover rounded mb-1"/>
                <p class="text-sm text-gray-600">${caption || 'Tiada caption'}</p>
              </div>
            `;
          }
        }
      } else {
        if (item.gambar_url) {
          content += `
            <div class="border-t pt-3 mt-3">
              <strong>Gambar:</strong>
              <img src="${item.gambar_url}" alt="Gambar" class="w-full h-48 object-cover rounded mt-2 mb-1"/>
              <p class="text-sm text-gray-600">${item.gambar_caption || 'Tiada caption'}</p>
            </div>
          `;
        }
      }
      
      content += `
          <div class="border-t pt-3 mt-3">
            <div><strong>Disediakan Oleh:</strong> ${item.disediakan_oleh || 'N/A'}</div>
            <div><strong>Disemak Oleh:</strong> ${item.disemak_oleh || 'N/A'}</div>
          </div>
        </div>
      `;
      
      // Show in view modal
      const viewModalTitle = document.getElementById('view-modal-title');
      const viewModalBody = document.getElementById('view-modal-body');
      
      if (viewModalTitle) viewModalTitle.textContent = `Lihat ${item.nama_aktiviti || 'Aktiviti'}`;
      if (viewModalBody) viewModalBody.innerHTML = content;
      
      const viewModal = document.getElementById('view-modal');
      if (viewModal) viewModal.classList.remove('hidden');
    }
  } catch (error) {
    console.error(`Error viewing ${type} item:`, error);
    alert('Ralat memuatkan data');
  }
}

function hideViewModal() {
  const viewModal = document.getElementById('view-modal');
  if (viewModal) viewModal.classList.add('hidden');
}

// ============================
// EDIT ITEM
// ============================

async function editItem(type, id) {
  try {
    const apiEndpoints = {
      'biasa': `/api/aktiviti-biasa/${currentUser.homeroom_id}/${id}`,
      'keusahawanan': `/api/aktiviti-keusahawanan/${currentUser.homeroom_id}/${id}`,
      'khidmat': `/api/aktiviti-khidmat/${currentUser.homeroom_id}/${id}`
    };
    
    const response = await axios.get(apiEndpoints[type]);
    
    if (response.data.success && response.data.data) {
      const item = response.data.data;
      editingId = id;
      
      // Populate form
      document.getElementById(`${type}-tarikh`).value = item.tarikh || '';
      document.getElementById(`${type}-hari`).value = item.hari || '';
      document.getElementById(`${type}-masa`).value = item.masa || '';
      document.getElementById(`${type}-nama`).value = item.nama_aktiviti || '';
      document.getElementById(`${type}-tempat`).value = item.tempat || '';
      if (document.getElementById(`${type}-catatan`)) {
        document.getElementById(`${type}-catatan`).value = item.catatan || '';
      }
      document.getElementById(`${type}-disediakan`).value = item.disediakan_oleh || '';
      document.getElementById(`${type}-disemak`).value = item.disemak_oleh || '';
      
      // Type-specific fields
      if (type === 'biasa') {
        document.getElementById('biasa-gambar1-url').value = item.gambar1_url || '';
        document.getElementById('biasa-gambar1-caption').value = item.gambar1_caption || '';
        document.getElementById('biasa-gambar2-url').value = item.gambar2_url || '';
        document.getElementById('biasa-gambar2-caption').value = item.gambar2_caption || '';
        document.getElementById('biasa-gambar3-url').value = item.gambar3_url || '';
        document.getElementById('biasa-gambar3-caption').value = item.gambar3_caption || '';
      } else if (type === 'keusahawanan') {
        document.getElementById('keusahawanan-keuntungan').value = item.keuntungan || '';
        document.getElementById('keusahawanan-gambar-url').value = item.gambar_url || '';
        document.getElementById('keusahawanan-gambar-caption').value = item.gambar_caption || '';
      } else if (type === 'khidmat') {
        document.getElementById('khidmat-objektif').value = item.objektif || '';
        document.getElementById('khidmat-impak').value = item.impak || '';
        document.getElementById('khidmat-gambar-url').value = item.gambar_url || '';
        document.getElementById('khidmat-gambar-caption').value = item.gambar_caption || '';
      }
      
      // Update modal title
      const modalTitle = document.getElementById(`modal-title-${type}`);
      if (modalTitle) modalTitle.textContent = 'Edit Aktiviti';
      
      // Show modal
      const modal = document.getElementById(`modal-${type}`);
      if (modal) modal.classList.remove('hidden');
    }
  } catch (error) {
    console.error(`Error loading ${type} item for edit:`, error);
    alert('Ralat memuatkan data');
  }
}

// ============================
// DELETE ITEM
// ============================

async function deleteItem(type, id) {
  if (!confirm('Adakah anda pasti mahu membuang aktiviti ini?')) return;
  
  try {
    const apiEndpoints = {
      'biasa': `/api/aktiviti-biasa/${id}`,
      'keusahawanan': `/api/aktiviti-keusahawanan/${id}`,
      'khidmat': `/api/aktiviti-khidmat/${id}`
    };
    
    const response = await axios.delete(apiEndpoints[type]);
    
    if (response.data.success) {
      alert(response.data.message || 'Berjaya dibuang');
      loadData(type);
    }
  } catch (error) {
    console.error(`Error deleting ${type} item:`, error);
    alert('Ralat membuang data');
  }
}

// ============================
// LOGOUT
// ============================

function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('currentHomeroom');
  window.location.href = '/';
}

// Go to dashboard based on role
function goToDashboard() {
  if (currentUser.role === 'admin') {
    window.location.href = '/admin';
  } else {
    window.location.href = '/pengguna-dashboard';
  }
}

// ============================
// PAGE INITIALIZATION
// ============================

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Setup auto-fill Hari listeners for all 3 types
  autoFillHari('biasa-tarikh', 'biasa-hari');
  autoFillHari('keusahawanan-tarikh', 'keusahawanan-hari');
  autoFillHari('khidmat-tarikh', 'khidmat-hari');
});
