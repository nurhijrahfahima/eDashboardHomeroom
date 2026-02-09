import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ========== API ROUTES ==========

// API: Login
app.post('/api/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    const user = await c.env.DB.prepare(
      'SELECT id, username, nama_penuh, role FROM users WHERE username = ? AND password = ?'
    ).bind(username, password).first()
    
    if (!user) {
      return c.json({ success: false, message: 'Username atau password salah' }, 401)
    }
    
    return c.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        nama_penuh: user.nama_penuh,
        role: user.role
      }
    })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Get all homerooms
app.get('/api/homeroom', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM homeroom ORDER BY tingkatan, nama_homeroom'
    ).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Get laporan (with filters)
app.get('/api/laporan', async (c) => {
  try {
    const homeroomId = c.req.query('homeroom_id')
    const jenis = c.req.query('jenis')
    const status = c.req.query('status') || 'aktif'
    
    let query = `
      SELECT l.*, h.nama_homeroom, h.tingkatan, u.nama_penuh as created_by_name
      FROM laporan l
      JOIN homeroom h ON l.homeroom_id = h.id
      JOIN users u ON l.created_by = u.id
      WHERE l.status = ?
    `
    const params = [status]
    
    if (homeroomId) {
      query += ' AND l.homeroom_id = ?'
      params.push(homeroomId)
    }
    
    if (jenis) {
      query += ' AND l.jenis_laporan = ?'
      params.push(jenis)
    }
    
    query += ' ORDER BY l.tarikh_laporan DESC, l.created_at DESC'
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Get single laporan
app.get('/api/laporan/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const laporan = await c.env.DB.prepare(`
      SELECT l.*, h.nama_homeroom, h.tingkatan, u.nama_penuh as created_by_name
      FROM laporan l
      JOIN homeroom h ON l.homeroom_id = h.id
      JOIN users u ON l.created_by = u.id
      WHERE l.id = ?
    `).bind(id).first()
    
    if (!laporan) {
      return c.json({ success: false, message: 'Laporan tidak dijumpai' }, 404)
    }
    
    return c.json({ success: true, data: laporan })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Create laporan (Admin only)
app.post('/api/laporan', async (c) => {
  try {
    const { homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara, created_by } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO laporan (homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara, created_by).run()
    
    return c.json({ 
      success: true, 
      message: 'Laporan berjaya ditambah',
      id: result.meta.last_row_id 
    })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Update laporan (Admin only)
app.put('/api/laporan/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE laporan 
      SET homeroom_id = ?, tarikh_laporan = ?, jenis_laporan = ?, tajuk = ?, perkara = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara, id).run()
    
    return c.json({ success: true, message: 'Laporan berjaya dikemaskini' })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Delete laporan (Admin only) - Soft delete
app.delete('/api/laporan/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      UPDATE laporan SET status = 'arkib' WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true, message: 'Laporan berjaya diarkibkan' })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Get statistics for dashboard
app.get('/api/statistik', async (c) => {
  try {
    const homeroomId = c.req.query('homeroom_id')
    
    // Total laporan
    let totalQuery = 'SELECT COUNT(*) as total FROM laporan WHERE status = ?'
    const totalParams = ['aktif']
    
    if (homeroomId) {
      totalQuery += ' AND homeroom_id = ?'
      totalParams.push(homeroomId)
    }
    
    const total = await c.env.DB.prepare(totalQuery).bind(...totalParams).first()
    
    // Laporan by jenis
    let jenisQuery = 'SELECT jenis_laporan, COUNT(*) as count FROM laporan WHERE status = ?'
    const jenisParams = ['aktif']
    
    if (homeroomId) {
      jenisQuery += ' AND homeroom_id = ?'
      jenisParams.push(homeroomId)
    }
    
    jenisQuery += ' GROUP BY jenis_laporan'
    
    const byJenis = await c.env.DB.prepare(jenisQuery).bind(...jenisParams).all()
    
    return c.json({ 
      success: true, 
      data: {
        total: total?.total || 0,
        byJenis: byJenis.results
      }
    })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// ========== PAGE ROUTES ==========

// Home page with login
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ms">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-Dashboard Laporan Homeroom MRSM Ranau</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-md mx-auto">
                <!-- Header -->
                <div class="text-center mb-8">
                    <div class="inline-block bg-white p-4 rounded-full shadow-lg mb-4">
                        <i class="fas fa-school text-5xl text-indigo-600"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">E-Dashboard Laporan Homeroom</h1>
                    <p class="text-gray-600">MRSM Ranau</p>
                </div>
                
                <!-- Login Card -->
                <div class="bg-white rounded-lg shadow-xl p-8">
                    <h2 class="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        <i class="fas fa-sign-in-alt mr-2"></i>Log Masuk
                    </h2>
                    
                    <div id="errorMsg" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <span id="errorText"></span>
                    </div>
                    
                    <form id="loginForm" class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">
                                <i class="fas fa-user mr-2"></i>Nama Pengguna
                            </label>
                            <input type="text" id="username" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="Masukkan nama pengguna" required>
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">
                                <i class="fas fa-lock mr-2"></i>Kata Laluan
                            </label>
                            <input type="password" id="password" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="Masukkan kata laluan" required>
                        </div>
                        
                        <button type="submit" 
                                class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-200">
                            <i class="fas fa-sign-in-alt mr-2"></i>Log Masuk
                        </button>
                    </form>
                    
                    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p class="text-sm text-gray-600 font-semibold mb-2">
                            <i class="fas fa-info-circle mr-2"></i>Akaun Demo:
                        </p>
                        <div class="text-xs text-gray-600 space-y-1">
                            <p><strong>Admin:</strong> admin / admin123</p>
                            <p><strong>Pengguna:</strong> pengguna1 / user123</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const errorMsg = document.getElementById('errorMsg');
                const errorText = document.getElementById('errorText');
                
                errorMsg.classList.add('hidden');
                
                try {
                    const response = await axios.post('/api/login', { username, password });
                    
                    if (response.data.success) {
                        // Store user info
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        
                        // Redirect based on role
                        if (response.data.user.role === 'admin') {
                            window.location.href = '/admin';
                        } else {
                            window.location.href = '/pengguna';
                        }
                    }
                } catch (error) {
                    errorMsg.classList.remove('hidden');
                    errorText.textContent = error.response?.data?.message || 'Ralat log masuk';
                }
            });
        </script>
    </body>
    </html>
  `)
})

// Admin panel
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ms">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Panel Admin - MRSM Ranau</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-indigo-600 text-white shadow-lg">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <i class="fas fa-school text-2xl"></i>
                        <div>
                            <h1 class="text-xl font-bold">Panel Admin</h1>
                            <p class="text-sm text-indigo-200">E-Dashboard Laporan Homeroom MRSM Ranau</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="text-right">
                            <p class="font-semibold" id="adminName"></p>
                            <p class="text-sm text-indigo-200">Administrator</p>
                        </div>
                        <button onclick="logout()" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition">
                            <i class="fas fa-sign-out-alt mr-2"></i>Log Keluar
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8">
            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-blue-100 p-3 rounded-full">
                            <i class="fas fa-file-alt text-2xl text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Jumlah Laporan</p>
                            <p class="text-2xl font-bold" id="totalLaporan">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-user-check text-2xl text-green-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Kehadiran</p>
                            <p class="text-2xl font-bold" id="kehadiranCount">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-yellow-100 p-3 rounded-full">
                            <i class="fas fa-gavel text-2xl text-yellow-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Disiplin</p>
                            <p class="text-2xl font-bold" id="disiplinCount">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-purple-100 p-3 rounded-full">
                            <i class="fas fa-graduation-cap text-2xl text-purple-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Akademik</p>
                            <p class="text-2xl font-bold" id="akademikCount">0</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-clipboard-list mr-2"></i>Senarai Laporan
                    </h2>
                    <button onclick="showAddForm()" class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                        <i class="fas fa-plus mr-2"></i>Tambah Laporan Baru
                    </button>
                </div>
                
                <!-- Filters -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-gray-700 font-medium mb-2">Filter Homeroom</label>
                        <select id="filterHomeroom" onchange="loadLaporan()" 
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Semua Homeroom</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-gray-700 font-medium mb-2">Filter Jenis</label>
                        <select id="filterJenis" onchange="loadLaporan()" 
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Semua Jenis</option>
                            <option value="kehadiran">Kehadiran</option>
                            <option value="disiplin">Disiplin</option>
                            <option value="akademik">Akademik</option>
                            <option value="aktiviti">Aktiviti</option>
                            <option value="umum">Umum</option>
                        </select>
                    </div>
                </div>
                
                <!-- Laporan Table -->
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarikh</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Homeroom</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tajuk</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody id="laporanTable" class="bg-white divide-y divide-gray-200">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Add/Edit Modal -->
        <div id="formModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold" id="modalTitle">Tambah Laporan Baru</h3>
                        <button onclick="hideForm()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <form id="laporanForm" class="space-y-4">
                        <input type="hidden" id="laporanId">
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Homeroom</label>
                            <select id="homeroom_id" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">Pilih Homeroom</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Tarikh Laporan</label>
                            <input type="date" id="tarikh_laporan" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Jenis Laporan</label>
                            <select id="jenis_laporan" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">Pilih Jenis</option>
                                <option value="kehadiran">Kehadiran</option>
                                <option value="disiplin">Disiplin</option>
                                <option value="akademik">Akademik</option>
                                <option value="aktiviti">Aktiviti</option>
                                <option value="umum">Umum</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Tajuk</label>
                            <input type="text" id="tajuk" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="Masukkan tajuk laporan">
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Perkara</label>
                            <textarea id="perkara" rows="5" required
                                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      placeholder="Masukkan butiran laporan"></textarea>
                        </div>
                        
                        <div class="flex space-x-4">
                            <button type="submit" 
                                    class="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
                                <i class="fas fa-save mr-2"></i>Simpan
                            </button>
                            <button type="button" onclick="hideForm()" 
                                    class="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition">
                                <i class="fas fa-times mr-2"></i>Batal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let currentUser = null;
            let homerooms = [];
            
            // Check authentication
            function checkAuth() {
                const user = localStorage.getItem('user');
                if (!user) {
                    window.location.href = '/';
                    return null;
                }
                
                currentUser = JSON.parse(user);
                if (currentUser.role !== 'admin') {
                    window.location.href = '/pengguna';
                    return null;
                }
                
                document.getElementById('adminName').textContent = currentUser.nama_penuh;
                return currentUser;
            }
            
            function logout() {
                localStorage.removeItem('user');
                window.location.href = '/';
            }
            
            // Load homerooms
            async function loadHomerooms() {
                try {
                    const response = await axios.get('/api/homeroom');
                    homerooms = response.data.data;
                    
                    // Populate filters
                    const filterSelect = document.getElementById('filterHomeroom');
                    const formSelect = document.getElementById('homeroom_id');
                    
                    homerooms.forEach(hr => {
                        const option1 = new Option(\`\${hr.nama_homeroom} (\${hr.tingkatan})\`, hr.id);
                        const option2 = new Option(\`\${hr.nama_homeroom} (\${hr.tingkatan})\`, hr.id);
                        filterSelect.add(option1);
                        formSelect.add(option2);
                    });
                } catch (error) {
                    console.error('Error loading homerooms:', error);
                }
            }
            
            // Load statistics
            async function loadStatistik() {
                try {
                    const response = await axios.get('/api/statistik');
                    const data = response.data.data;
                    
                    document.getElementById('totalLaporan').textContent = data.total;
                    
                    const jenisMap = {
                        kehadiran: 0,
                        disiplin: 0,
                        akademik: 0
                    };
                    
                    data.byJenis.forEach(item => {
                        if (jenisMap.hasOwnProperty(item.jenis_laporan)) {
                            jenisMap[item.jenis_laporan] = item.count;
                        }
                    });
                    
                    document.getElementById('kehadiranCount').textContent = jenisMap.kehadiran;
                    document.getElementById('disiplinCount').textContent = jenisMap.disiplin;
                    document.getElementById('akademikCount').textContent = jenisMap.akademik;
                } catch (error) {
                    console.error('Error loading statistik:', error);
                }
            }
            
            // Load laporan
            async function loadLaporan() {
                try {
                    const homeroomId = document.getElementById('filterHomeroom').value;
                    const jenis = document.getElementById('filterJenis').value;
                    
                    let url = '/api/laporan?';
                    if (homeroomId) url += \`homeroom_id=\${homeroomId}&\`;
                    if (jenis) url += \`jenis=\${jenis}&\`;
                    
                    const response = await axios.get(url);
                    const laporan = response.data.data;
                    
                    const tbody = document.getElementById('laporanTable');
                    tbody.innerHTML = '';
                    
                    if (laporan.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Tiada laporan dijumpai</td></tr>';
                        return;
                    }
                    
                    laporan.forEach(item => {
                        const badge = getJenisBadge(item.jenis_laporan);
                        const row = \`
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    \${formatDate(item.tarikh_laporan)}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    \${item.nama_homeroom}<br>
                                    <span class="text-xs text-gray-500">\${item.tingkatan}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full \${badge}">\${item.jenis_laporan}</span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-900">
                                    <div class="font-medium">\${item.tajuk}</div>
                                    <div class="text-xs text-gray-500 mt-1">\${item.perkara.substring(0, 100)}...</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <button onclick="viewLaporan(\${item.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button onclick="editLaporan(\${item.id})" class="text-green-600 hover:text-green-800 mr-3">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteLaporan(\${item.id})" class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        \`;
                        tbody.innerHTML += row;
                    });
                } catch (error) {
                    console.error('Error loading laporan:', error);
                }
            }
            
            function getJenisBadge(jenis) {
                const badges = {
                    kehadiran: 'bg-green-100 text-green-800',
                    disiplin: 'bg-yellow-100 text-yellow-800',
                    akademik: 'bg-purple-100 text-purple-800',
                    aktiviti: 'bg-blue-100 text-blue-800',
                    umum: 'bg-gray-100 text-gray-800'
                };
                return badges[jenis] || badges.umum;
            }
            
            function formatDate(dateStr) {
                const date = new Date(dateStr);
                return date.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
            
            function showAddForm() {
                document.getElementById('modalTitle').textContent = 'Tambah Laporan Baru';
                document.getElementById('laporanForm').reset();
                document.getElementById('laporanId').value = '';
                document.getElementById('tarikh_laporan').valueAsDate = new Date();
                document.getElementById('formModal').classList.remove('hidden');
            }
            
            function hideForm() {
                document.getElementById('formModal').classList.add('hidden');
            }
            
            async function viewLaporan(id) {
                try {
                    const response = await axios.get(\`/api/laporan/\${id}\`);
                    const laporan = response.data.data;
                    
                    alert(\`Homeroom: \${laporan.nama_homeroom}\\nTarikh: \${formatDate(laporan.tarikh_laporan)}\\nJenis: \${laporan.jenis_laporan}\\nTajuk: \${laporan.tajuk}\\n\\nPerkara:\\n\${laporan.perkara}\\n\\nDibuat oleh: \${laporan.created_by_name}\`);
                } catch (error) {
                    alert('Ralat mendapatkan maklumat laporan');
                }
            }
            
            async function editLaporan(id) {
                try {
                    const response = await axios.get(\`/api/laporan/\${id}\`);
                    const laporan = response.data.data;
                    
                    document.getElementById('modalTitle').textContent = 'Edit Laporan';
                    document.getElementById('laporanId').value = laporan.id;
                    document.getElementById('homeroom_id').value = laporan.homeroom_id;
                    document.getElementById('tarikh_laporan').value = laporan.tarikh_laporan;
                    document.getElementById('jenis_laporan').value = laporan.jenis_laporan;
                    document.getElementById('tajuk').value = laporan.tajuk;
                    document.getElementById('perkara').value = laporan.perkara;
                    
                    document.getElementById('formModal').classList.remove('hidden');
                } catch (error) {
                    alert('Ralat mendapatkan maklumat laporan');
                }
            }
            
            async function deleteLaporan(id) {
                if (!confirm('Adakah anda pasti mahu mengarkibkan laporan ini?')) return;
                
                try {
                    await axios.delete(\`/api/laporan/\${id}\`);
                    alert('Laporan berjaya diarkibkan');
                    loadLaporan();
                    loadStatistik();
                } catch (error) {
                    alert('Ralat mengarkibkan laporan');
                }
            }
            
            // Handle form submit
            document.getElementById('laporanForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const id = document.getElementById('laporanId').value;
                const data = {
                    homeroom_id: document.getElementById('homeroom_id').value,
                    tarikh_laporan: document.getElementById('tarikh_laporan').value,
                    jenis_laporan: document.getElementById('jenis_laporan').value,
                    tajuk: document.getElementById('tajuk').value,
                    perkara: document.getElementById('perkara').value,
                    created_by: currentUser.id
                };
                
                try {
                    if (id) {
                        await axios.put(\`/api/laporan/\${id}\`, data);
                        alert('Laporan berjaya dikemaskini');
                    } else {
                        await axios.post('/api/laporan', data);
                        alert('Laporan berjaya ditambah');
                    }
                    
                    hideForm();
                    loadLaporan();
                    loadStatistik();
                } catch (error) {
                    alert('Ralat menyimpan laporan');
                }
            });
            
            // Initialize
            if (checkAuth()) {
                loadHomerooms();
                loadStatistik();
                loadLaporan();
            }
        </script>
    </body>
    </html>
  `)
})

// User panel
app.get('/pengguna', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ms">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Panel Pengguna - MRSM Ranau</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-green-600 text-white shadow-lg">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <i class="fas fa-school text-2xl"></i>
                        <div>
                            <h1 class="text-xl font-bold">Panel Pengguna</h1>
                            <p class="text-sm text-green-200">E-Dashboard Laporan Homeroom MRSM Ranau</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="text-right">
                            <p class="font-semibold" id="userName"></p>
                            <p class="text-sm text-green-200">Pengguna</p>
                        </div>
                        <button onclick="logout()" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition">
                            <i class="fas fa-sign-out-alt mr-2"></i>Log Keluar
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8">
            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-blue-100 p-3 rounded-full">
                            <i class="fas fa-file-alt text-2xl text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Jumlah Laporan</p>
                            <p class="text-2xl font-bold" id="totalLaporan">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-user-check text-2xl text-green-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Kehadiran</p>
                            <p class="text-2xl font-bold" id="kehadiranCount">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-yellow-100 p-3 rounded-full">
                            <i class="fas fa-gavel text-2xl text-yellow-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Disiplin</p>
                            <p class="text-2xl font-bold" id="disiplinCount">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="bg-purple-100 p-3 rounded-full">
                            <i class="fas fa-graduation-cap text-2xl text-purple-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-600 text-sm">Akademik</p>
                            <p class="text-2xl font-bold" id="akademikCount">0</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-clipboard-list mr-2"></i>Senarai Laporan Homeroom
                    </h2>
                </div>
                
                <!-- Filters -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-gray-700 font-medium mb-2">Filter Homeroom</label>
                        <select id="filterHomeroom" onchange="loadLaporan()" 
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">Semua Homeroom</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-gray-700 font-medium mb-2">Filter Jenis</label>
                        <select id="filterJenis" onchange="loadLaporan()" 
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">Semua Jenis</option>
                            <option value="kehadiran">Kehadiran</option>
                            <option value="disiplin">Disiplin</option>
                            <option value="akademik">Akademik</option>
                            <option value="aktiviti">Aktiviti</option>
                            <option value="umum">Umum</option>
                        </select>
                    </div>
                </div>
                
                <!-- Laporan Cards -->
                <div id="laporanList" class="space-y-4">
                </div>
            </div>
        </div>
        
        <!-- Detail Modal -->
        <div id="detailModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Butiran Laporan</h3>
                        <button onclick="hideDetail()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <div id="detailContent" class="space-y-4">
                    </div>
                    
                    <div class="mt-6">
                        <button onclick="hideDetail()" 
                                class="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition">
                            <i class="fas fa-times mr-2"></i>Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let currentUser = null;
            let homerooms = [];
            
            // Check authentication
            function checkAuth() {
                const user = localStorage.getItem('user');
                if (!user) {
                    window.location.href = '/';
                    return null;
                }
                
                currentUser = JSON.parse(user);
                document.getElementById('userName').textContent = currentUser.nama_penuh;
                return currentUser;
            }
            
            function logout() {
                localStorage.removeItem('user');
                window.location.href = '/';
            }
            
            // Load homerooms
            async function loadHomerooms() {
                try {
                    const response = await axios.get('/api/homeroom');
                    homerooms = response.data.data;
                    
                    const filterSelect = document.getElementById('filterHomeroom');
                    
                    homerooms.forEach(hr => {
                        const option = new Option(\`\${hr.nama_homeroom} (\${hr.tingkatan})\`, hr.id);
                        filterSelect.add(option);
                    });
                } catch (error) {
                    console.error('Error loading homerooms:', error);
                }
            }
            
            // Load statistics
            async function loadStatistik() {
                try {
                    const homeroomId = document.getElementById('filterHomeroom').value;
                    let url = '/api/statistik';
                    if (homeroomId) url += \`?homeroom_id=\${homeroomId}\`;
                    
                    const response = await axios.get(url);
                    const data = response.data.data;
                    
                    document.getElementById('totalLaporan').textContent = data.total;
                    
                    const jenisMap = {
                        kehadiran: 0,
                        disiplin: 0,
                        akademik: 0
                    };
                    
                    data.byJenis.forEach(item => {
                        if (jenisMap.hasOwnProperty(item.jenis_laporan)) {
                            jenisMap[item.jenis_laporan] = item.count;
                        }
                    });
                    
                    document.getElementById('kehadiranCount').textContent = jenisMap.kehadiran;
                    document.getElementById('disiplinCount').textContent = jenisMap.disiplin;
                    document.getElementById('akademikCount').textContent = jenisMap.akademik;
                } catch (error) {
                    console.error('Error loading statistik:', error);
                }
            }
            
            // Load laporan
            async function loadLaporan() {
                try {
                    const homeroomId = document.getElementById('filterHomeroom').value;
                    const jenis = document.getElementById('filterJenis').value;
                    
                    let url = '/api/laporan?';
                    if (homeroomId) url += \`homeroom_id=\${homeroomId}&\`;
                    if (jenis) url += \`jenis=\${jenis}&\`;
                    
                    const response = await axios.get(url);
                    const laporan = response.data.data;
                    
                    const list = document.getElementById('laporanList');
                    list.innerHTML = '';
                    
                    if (laporan.length === 0) {
                        list.innerHTML = '<p class="text-center text-gray-500 py-8">Tiada laporan dijumpai</p>';
                        return;
                    }
                    
                    laporan.forEach(item => {
                        const badge = getJenisBadge(item.jenis_laporan);
                        const card = \`
                            <div class="border border-gray-200 rounded-lg p-5 hover:shadow-md transition">
                                <div class="flex justify-between items-start mb-3">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <span class="px-3 py-1 text-xs font-semibold rounded-full \${badge}">\${item.jenis_laporan}</span>
                                            <span class="text-sm text-gray-500">\${formatDate(item.tarikh_laporan)}</span>
                                        </div>
                                        <h3 class="text-lg font-semibold text-gray-800 mb-2">\${item.tajuk}</h3>
                                        <p class="text-sm text-gray-600 mb-2">
                                            <i class="fas fa-home mr-2"></i>\${item.nama_homeroom} - \${item.tingkatan}
                                        </p>
                                        <p class="text-sm text-gray-700">\${item.perkara.substring(0, 150)}...</p>
                                    </div>
                                </div>
                                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                    <span class="text-xs text-gray-500">
                                        <i class="fas fa-user mr-1"></i>Oleh: \${item.created_by_name}
                                    </span>
                                    <button onclick="viewDetail(\${item.id})" 
                                            class="text-green-600 hover:text-green-800 font-semibold text-sm">
                                        <i class="fas fa-eye mr-1"></i>Lihat Butiran
                                    </button>
                                </div>
                            </div>
                        \`;
                        list.innerHTML += card;
                    });
                    
                    loadStatistik();
                } catch (error) {
                    console.error('Error loading laporan:', error);
                }
            }
            
            function getJenisBadge(jenis) {
                const badges = {
                    kehadiran: 'bg-green-100 text-green-800',
                    disiplin: 'bg-yellow-100 text-yellow-800',
                    akademik: 'bg-purple-100 text-purple-800',
                    aktiviti: 'bg-blue-100 text-blue-800',
                    umum: 'bg-gray-100 text-gray-800'
                };
                return badges[jenis] || badges.umum;
            }
            
            function formatDate(dateStr) {
                const date = new Date(dateStr);
                return date.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' });
            }
            
            async function viewDetail(id) {
                try {
                    const response = await axios.get(\`/api/laporan/\${id}\`);
                    const laporan = response.data.data;
                    
                    const badge = getJenisBadge(laporan.jenis_laporan);
                    
                    const content = \`
                        <div class="bg-gray-50 rounded-lg p-4">
                            <div class="flex items-center space-x-3 mb-3">
                                <span class="px-3 py-1 text-xs font-semibold rounded-full \${badge}">\${laporan.jenis_laporan}</span>
                                <span class="text-sm text-gray-600">\${formatDate(laporan.tarikh_laporan)}</span>
                            </div>
                            
                            <h4 class="text-xl font-bold text-gray-800 mb-3">\${laporan.tajuk}</h4>
                            
                            <div class="space-y-2 mb-4">
                                <p class="text-sm">
                                    <span class="font-semibold text-gray-700">Homeroom:</span>
                                    <span class="text-gray-600">\${laporan.nama_homeroom} - \${laporan.tingkatan}</span>
                                </p>
                                <p class="text-sm">
                                    <span class="font-semibold text-gray-700">Dibuat oleh:</span>
                                    <span class="text-gray-600">\${laporan.created_by_name}</span>
                                </p>
                                <p class="text-sm">
                                    <span class="font-semibold text-gray-700">Tarikh dibuat:</span>
                                    <span class="text-gray-600">\${formatDate(laporan.created_at)}</span>
                                </p>
                            </div>
                            
                            <div class="border-t pt-4">
                                <h5 class="font-semibold text-gray-700 mb-2">Butiran Laporan:</h5>
                                <p class="text-gray-700 whitespace-pre-line">\${laporan.perkara}</p>
                            </div>
                        </div>
                    \`;
                    
                    document.getElementById('detailContent').innerHTML = content;
                    document.getElementById('detailModal').classList.remove('hidden');
                } catch (error) {
                    alert('Ralat mendapatkan maklumat laporan');
                }
            }
            
            function hideDetail() {
                document.getElementById('detailModal').classList.add('hidden');
            }
            
            // Initialize
            if (checkAuth()) {
                loadHomerooms();
                loadLaporan();
            }
        </script>
    </body>
    </html>
  `)
})

export default app
