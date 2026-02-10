import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files - using root: './' for Cloudflare Pages
app.use('/static/*', serveStatic({ root: './' }))

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
      SELECT l.*, h.nama_homeroom, h.tingkatan, h.nama_guru, u.nama_penuh as created_by_name
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
      SELECT l.*, h.nama_homeroom, h.tingkatan, h.nama_guru, u.nama_penuh as created_by_name
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

// ========== API AHLI HOMEROOM ==========

// API: Get all ahli by homeroom
app.get('/api/ahli/:homeroom_id', async (c) => {
  try {
    const homeroomId = c.req.param('homeroom_id')
    
    const result = await c.env.DB.prepare(
      'SELECT * FROM ahli_homeroom WHERE homeroom_id = ? ORDER BY bilangan'
    ).bind(homeroomId).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Get single ahli
app.get('/api/ahli/:homeroom_id/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const ahli = await c.env.DB.prepare(
      'SELECT * FROM ahli_homeroom WHERE id = ?'
    ).bind(id).first()
    
    if (!ahli) {
      return c.json({ success: false, message: 'Ahli tidak dijumpai' }, 404)
    }
    
    return c.json({ success: true, data: ahli })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Create ahli
app.post('/api/ahli', async (c) => {
  try {
    const data = await c.req.json()
    console.log('[DEBUG] Create ahli data:', data)
    
    // Get next bilangan
    const maxBil = await c.env.DB.prepare(
      'SELECT MAX(bilangan) as max_bil FROM ahli_homeroom WHERE homeroom_id = ?'
    ).bind(data.homeroom_id).first()
    
    const nextBilangan = (maxBil?.max_bil || 0) + 1
    console.log('[DEBUG] Next bilangan:', nextBilangan)
    
    const result = await c.env.DB.prepare(`
      INSERT INTO ahli_homeroom (
        homeroom_id, bilangan, nama_ahli, no_maktab, jantina, kelas,
        jawatan_homeroom, no_bilik_asrama,
        unit_beruniform, jawatan_beruniform, jawatan_beruniform_lain,
        kelab_persatuan, jawatan_kelab, jawatan_kelab_lain,
        sukan_permainan, jawatan_sukan, jawatan_sukan_lain,
        sekretariat_skp, jawatan_skp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.homeroom_id, nextBilangan, data.nama_ahli, data.no_maktab,
      data.jantina, data.kelas, data.jawatan_homeroom || null, data.no_bilik_asrama || null,
      data.unit_beruniform || null, data.jawatan_beruniform || null, data.jawatan_beruniform_lain || null,
      data.kelab_persatuan || null, data.jawatan_kelab || null, data.jawatan_kelab_lain || null,
      data.sukan_permainan || null, data.jawatan_sukan || null, data.jawatan_sukan_lain || null,
      data.sekretariat_skp || null, data.jawatan_skp || null
    ).run()
    
    console.log('[DEBUG] Insert result:', result)
    
    return c.json({ 
      success: true, 
      message: 'Ahli berjaya ditambah',
      id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('[ERROR] Create ahli failed:', error)
    return c.json({ success: false, message: 'Ralat sistem', error: String(error) }, 500)
  }
})

// API: Update ahli
app.put('/api/ahli/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE ahli_homeroom SET
        nama_ahli = ?, no_maktab = ?, jantina = ?, kelas = ?,
        jawatan_homeroom = ?, no_bilik_asrama = ?,
        unit_beruniform = ?, jawatan_beruniform = ?, jawatan_beruniform_lain = ?,
        kelab_persatuan = ?, jawatan_kelab = ?, jawatan_kelab_lain = ?,
        sukan_permainan = ?, jawatan_sukan = ?, jawatan_sukan_lain = ?,
        sekretariat_skp = ?, jawatan_skp = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.nama_ahli, data.no_maktab, data.jantina, data.kelas,
      data.jawatan_homeroom || null, data.no_bilik_asrama || null,
      data.unit_beruniform || null, data.jawatan_beruniform || null, data.jawatan_beruniform_lain || null,
      data.kelab_persatuan || null, data.jawatan_kelab || null, data.jawatan_kelab_lain || null,
      data.sukan_permainan || null, data.jawatan_sukan || null, data.jawatan_sukan_lain || null,
      data.sekretariat_skp || null, data.jawatan_skp || null,
      id
    ).run()
    
    return c.json({ success: true, message: 'Ahli berjaya dikemaskini' })
  } catch (error) {
    console.error('[ERROR] Update ahli failed:', error)
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Delete ahli
app.delete('/api/ahli/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare('DELETE FROM ahli_homeroom WHERE id = ?').bind(id).run()
    
    return c.json({ success: true, message: 'Ahli berjaya dibuang' })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// ========== API LAPORAN MINGGUAN ==========

// API: Get all laporan mingguan for homeroom
app.get('/api/laporan-mingguan/:homeroom_id', async (c) => {
  try {
    const homeroom_id = c.req.param('homeroom_id')
    
    const results = await c.env.DB.prepare(`
      SELECT * FROM laporan_mingguan 
      WHERE homeroom_id = ? 
      ORDER BY tarikh DESC, pertemuan_ke DESC
    `).bind(homeroom_id).all()
    
    return c.json({ success: true, data: results.results })
  } catch (error) {
    console.error('[ERROR] Get laporan mingguan failed:', error)
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Get single laporan mingguan
app.get('/api/laporan-mingguan/:homeroom_id/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await c.env.DB.prepare(
      'SELECT * FROM laporan_mingguan WHERE id = ?'
    ).bind(id).first()
    
    if (!result) {
      return c.json({ success: false, message: 'Laporan tidak dijumpai' }, 404)
    }
    
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Create laporan mingguan
app.post('/api/laporan-mingguan', async (c) => {
  try {
    const data = await c.req.json()
    console.log('[DEBUG] Create laporan mingguan:', data)
    
    // Get next pertemuan_ke
    const maxPertemuan = await c.env.DB.prepare(
      'SELECT MAX(pertemuan_ke) as max_pertemuan FROM laporan_mingguan WHERE homeroom_id = ?'
    ).bind(data.homeroom_id).first()
    
    const nextPertemuan = (maxPertemuan?.max_pertemuan || 0) + 1
    
    const result = await c.env.DB.prepare(`
      INSERT INTO laporan_mingguan (
        homeroom_id, nama_homeroom, tarikh, hari, masa, tempat, pertemuan_ke,
        kehadiran, ketidakhadiran, tema, tajuk, penerangan_aktiviti,
        galeri_url, galeri_caption, refleksi_pelajar, refleksi_guru,
        disediakan_oleh, disemak_oleh
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.homeroom_id, data.nama_homeroom, data.tarikh, data.hari, data.masa,
      data.tempat, nextPertemuan, data.kehadiran, data.ketidakhadiran || null,
      data.tema, data.tajuk, data.penerangan_aktiviti,
      data.galeri_url || null, data.galeri_caption || null,
      data.refleksi_pelajar, data.refleksi_guru,
      data.disediakan_oleh || null, data.disemak_oleh || null
    ).run()
    
    return c.json({ 
      success: true, 
      message: 'Laporan mingguan berjaya ditambah',
      id: result.meta.last_row_id,
      pertemuan_ke: nextPertemuan
    })
  } catch (error) {
    console.error('[ERROR] Create laporan mingguan failed:', error)
    return c.json({ success: false, message: 'Ralat sistem', error: String(error) }, 500)
  }
})

// API: Update laporan mingguan
app.put('/api/laporan-mingguan/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE laporan_mingguan SET
        nama_homeroom = ?, tarikh = ?, hari = ?, masa = ?, tempat = ?,
        kehadiran = ?, ketidakhadiran = ?, tema = ?, tajuk = ?,
        penerangan_aktiviti = ?, galeri_url = ?, galeri_caption = ?,
        refleksi_pelajar = ?, refleksi_guru = ?,
        disediakan_oleh = ?, disemak_oleh = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.nama_homeroom, data.tarikh, data.hari, data.masa, data.tempat,
      data.kehadiran, data.ketidakhadiran || null, data.tema, data.tajuk,
      data.penerangan_aktiviti, data.galeri_url || null, data.galeri_caption || null,
      data.refleksi_pelajar, data.refleksi_guru,
      data.disediakan_oleh || null, data.disemak_oleh || null,
      id
    ).run()
    
    return c.json({ success: true, message: 'Laporan mingguan berjaya dikemaskini' })
  } catch (error) {
    console.error('[ERROR] Update laporan mingguan failed:', error)
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// API: Delete laporan mingguan
app.delete('/api/laporan-mingguan/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare('DELETE FROM laporan_mingguan WHERE id = ?').bind(id).run()
    
    return c.json({ success: true, message: 'Laporan mingguan berjaya dibuang' })
  } catch (error) {
    return c.json({ success: false, message: 'Ralat sistem' }, 500)
  }
})

// ========== PAGE ROUTES ==========

// Home page - Landing with two sections
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
            <!-- Header -->
            <div class="text-center mb-12">
                <div class="inline-block bg-white p-6 rounded-full shadow-lg mb-4">
                    <i class="fas fa-school text-6xl text-indigo-600"></i>
                </div>
                <h1 class="text-4xl font-bold text-gray-800 mb-3">E-Dashboard Laporan Homeroom</h1>
                <p class="text-xl text-gray-600">MRSM Ranau</p>
                <p class="text-sm text-gray-500 mt-2">Sistem Pengurusan Laporan Homeroom</p>
            </div>
            
            <!-- Two Sections -->
            <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Bahagian Pengguna -->
                <div class="bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition-shadow">
                    <div class="text-center mb-6">
                        <div class="inline-block bg-green-100 p-4 rounded-full mb-4">
                            <i class="fas fa-users text-5xl text-green-600"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Bahagian Pengguna</h2>
                        <p class="text-gray-600 text-sm">Untuk Guru Homeroom</p>
                    </div>
                    
                    <div class="space-y-3 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Lihat laporan homeroom anda</p>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Filter mengikut jenis laporan</p>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Lihat butiran lengkap laporan</p>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Dashboard statistik</p>
                        </div>
                    </div>
                    
                    <a href="/pengguna/login" 
                       class="block w-full bg-green-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200">
                        <i class="fas fa-sign-in-alt mr-2"></i>Masuk Bahagian Pengguna
                    </a>
                </div>
                
                <!-- Bahagian Admin -->
                <div class="bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition-shadow">
                    <div class="text-center mb-6">
                        <div class="inline-block bg-indigo-100 p-4 rounded-full mb-4">
                            <i class="fas fa-user-shield text-5xl text-indigo-600"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Bahagian Admin</h2>
                        <p class="text-gray-600 text-sm">Untuk Pentadbir</p>
                    </div>
                    
                    <div class="space-y-3 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-indigo-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Urus semua laporan homeroom</p>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-indigo-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Tambah, edit, hapus laporan</p>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-indigo-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Lihat laporan semua homeroom</p>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-indigo-500 mt-1 mr-3"></i>
                            <p class="text-sm text-gray-700">Dashboard penuh statistik</p>
                        </div>
                    </div>
                    
                    <a href="/admin/login" 
                       class="block w-full bg-indigo-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-200">
                        <i class="fas fa-sign-in-alt mr-2"></i>Masuk Bahagian Admin
                    </a>
                </div>
            </div>
            
            <!-- Footer Info -->
            <div class="mt-12 text-center">
                <p class="text-sm text-gray-600">
                    <i class="fas fa-info-circle mr-2"></i>
                    Pilih bahagian yang sesuai untuk log masuk ke sistem
                </p>
            </div>
        </div>
    </body>
    </html>
  `)
})

// Pengguna Login Page
app.get('/pengguna/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ms">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pilih Panel - Bahagian Pengguna MRSM Ranau</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-md mx-auto">
                <!-- Back Button -->
                <a href="/" class="inline-flex items-center text-green-600 hover:text-green-800 mb-6">
                    <i class="fas fa-arrow-left mr-2"></i>Kembali ke Halaman Utama
                </a>
                
                <!-- Header -->
                <div class="text-center mb-8">
                    <div class="inline-block bg-white p-4 rounded-full shadow-lg mb-4">
                        <i class="fas fa-users text-5xl text-green-600"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">Bahagian Pengguna</h1>
                    <p class="text-gray-600">Pilih Panel Guru Homeroom</p>
                </div>
                
                <!-- Selection Card -->
                <div class="bg-white rounded-lg shadow-xl p-8">
                    <h2 class="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        <i class="fas fa-chalkboard-teacher mr-2"></i>Pilih Nama Guru
                    </h2>
                    
                    <div id="errorMsg" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <span id="errorText"></span>
                    </div>
                    
                    <form id="selectForm" class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">
                                <i class="fas fa-user-tie mr-2"></i>Nama Guru Homeroom
                            </label>
                            <select id="guruSelect" 
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700"
                                    required>
                                <option value="">-- Pilih Nama Guru --</option>
                            </select>
                        </div>
                        
                        <button type="submit" 
                                class="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200">
                            <i class="fas fa-sign-in-alt mr-2"></i>Masuk Panel
                        </button>
                    </form>
                    
                    <div class="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <p class="text-sm text-green-700 font-semibold mb-2">
                            <i class="fas fa-info-circle mr-2"></i>Maklumat:
                        </p>
                        <p class="text-xs text-green-600">
                            Pilih nama guru dari senarai untuk masuk ke panel. Tiada kata laluan diperlukan untuk Bahagian Pengguna.
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Load list of teachers from homeroom
            async function loadGuru() {
                try {
                    const response = await axios.get('/api/homeroom');
                    const homerooms = response.data.data;
                    const select = document.getElementById('guruSelect');
                    
                    // Group by tingkatan
                    const grouped = {};
                    homerooms.forEach(hr => {
                        if (!grouped[hr.tingkatan]) {
                            grouped[hr.tingkatan] = [];
                        }
                        grouped[hr.tingkatan].push(hr);
                    });
                    
                    // Add options grouped by tingkatan
                    Object.keys(grouped).sort().forEach(tingkatan => {
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = tingkatan;
                        
                        grouped[tingkatan].forEach(hr => {
                            const option = document.createElement('option');
                            option.value = JSON.stringify({
                                homeroom_id: hr.id,
                                nama_guru: hr.nama_guru,
                                nama_homeroom: hr.nama_homeroom,
                                tingkatan: hr.tingkatan
                            });
                            option.textContent = \`\${hr.nama_guru} (\${hr.nama_homeroom})\`;
                            optgroup.appendChild(option);
                        });
                        
                        select.appendChild(optgroup);
                    });
                } catch (error) {
                    console.error('Error loading guru:', error);
                }
            }
            
            document.getElementById('selectForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const selectValue = document.getElementById('guruSelect').value;
                const errorMsg = document.getElementById('errorMsg');
                const errorText = document.getElementById('errorText');
                
                if (!selectValue) {
                    errorMsg.classList.remove('hidden');
                    errorText.textContent = 'Sila pilih nama guru';
                    return;
                }
                
                errorMsg.classList.add('hidden');
                
                try {
                    const guruData = JSON.parse(selectValue);
                    
                    // Create a pseudo-user object for pengguna
                    const user = {
                        id: 'guru_' + guruData.homeroom_id,
                        username: guruData.nama_guru,
                        nama_penuh: guruData.nama_guru,
                        role: 'pengguna',
                        homeroom_id: guruData.homeroom_id,
                        nama_homeroom: guruData.nama_homeroom,
                        tingkatan: guruData.tingkatan
                    };
                    
                    localStorage.setItem('user', JSON.stringify(user));
                    window.location.href = '/pengguna';
                } catch (error) {
                    errorMsg.classList.remove('hidden');
                    errorText.textContent = 'Ralat memproses pilihan';
                }
            });
            
            // Load guru on page load
            loadGuru();
        </script>
    </body>
    </html>
  `)
})

// Admin Login Page
app.get('/admin/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ms">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Bahagian Admin - MRSM Ranau</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-indigo-50 to-blue-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-md mx-auto">
                <!-- Back Button -->
                <a href="/" class="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6">
                    <i class="fas fa-arrow-left mr-2"></i>Kembali ke Halaman Utama
                </a>
                
                <!-- Header -->
                <div class="text-center mb-8">
                    <div class="inline-block bg-white p-4 rounded-full shadow-lg mb-4">
                        <i class="fas fa-user-shield text-5xl text-indigo-600"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">Bahagian Admin</h1>
                    <p class="text-gray-600">Login untuk Pentadbir</p>
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
                                <i class="fas fa-user mr-2"></i>ID Pentadbir
                            </label>
                            <input type="text" id="username" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="Masukkan ID pentadbir" required>
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
                        <div class="text-xs text-gray-600">
                            <p><strong>ID:</strong> JKUPHRMRSMR</p>
                            <p><strong>Password:</strong> UPHRMRSMRanau</p>
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
                        if (response.data.user.role !== 'admin') {
                            errorMsg.classList.remove('hidden');
                            errorText.textContent = 'Akaun ini bukan untuk bahagian admin';
                            return;
                        }
                        
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        window.location.href = '/admin';
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
                        const option1 = new Option(\`\${hr.tingkatan} - \${hr.nama_guru} (\${hr.nama_homeroom})\`, hr.id);
                        const option2 = new Option(\`\${hr.tingkatan} - \${hr.nama_guru} (\${hr.nama_homeroom})\`, hr.id);
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
                                    <span class="text-xs text-gray-500">\${item.tingkatan} - \${item.nama_guru}</span>
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
// Pengguna Dashboard
app.get('/pengguna', (c) => {
  return c.redirect('/pengguna-dashboard')
})

app.get('/pengguna-dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Pengguna - MRSM Ranau</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen">
    <nav class="bg-green-600 text-white shadow-lg">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-school text-2xl"></i>
                    <div>
                        <h1 class="text-xl font-bold">Dashboard Guru Homeroom</h1>
                        <p class="text-sm text-green-200" id="homeroomInfo"></p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="font-semibold cursor-pointer hover:text-green-200 transition" id="guruName" onclick="goToDashboard()"></p>
                        <p class="text-sm text-green-200">Guru Homeroom</p>
                    </div>
                    <button onclick="logout()" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition">
                        <i class="fas fa-sign-out-alt mr-2"></i>Log Keluar
                    </button>
                </div>
            </div>
        </div>
    </nav>
    
    <div class="container mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-2">
                <i class="fas fa-hand-sparkles text-yellow-500 mr-2"></i>
                Selamat Datang!
            </h2>
            <p class="text-gray-600">
                Pilih borang yang ingin diisi atau dikemaskini untuk homeroom anda.
            </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="/ahli-homeroom" class="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-blue-500">
                <div class="flex items-start">
                    <div class="bg-blue-100 p-4 rounded-full mr-4">
                        <i class="fas fa-users text-3xl text-blue-600"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-gray-800 mb-2">
                            1. Borang Senarai Ahli Homeroom
                        </h3>
                        <p class="text-gray-600 text-sm mb-3">
                            Senarai lengkap ahli homeroom dengan maklumat asas, unit beruniform, kelab, sukan dan SKP
                        </p>
                        <div class="flex items-center text-blue-600 font-semibold">
                            <span class="mr-2">Buka Borang</span>
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </a>
            
            <a href="/laporan-mingguan" class="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-green-500">
                <div class="flex items-start">
                    <div class="bg-green-100 p-4 rounded-full mr-4">
                        <i class="fas fa-calendar-week text-3xl text-green-600"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-gray-800 mb-2">
                            2. Borang Laporan Mingguan Homeroom
                        </h3>
                        <p class="text-gray-600 text-sm mb-3">
                            Laporan aktiviti dan perkembangan homeroom setiap minggu
                        </p>
                        <div class="flex items-center text-green-600 font-semibold">
                            <span class="mr-2">Buka Borang</span>
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </a>
            
            <a href="/pencapaian-ahli" class="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-purple-500">
                <div class="flex items-start">
                    <div class="bg-purple-100 p-4 rounded-full mr-4">
                        <i class="fas fa-trophy text-3xl text-purple-600"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-gray-800 mb-2">
                            3. Borang Pencapaian Ahli Homeroom
                        </h3>
                        <p class="text-gray-600 text-sm mb-3">
                            Pencapaian akademik dan ko-kurikulum ahli homeroom
                        </p>
                        <div class="flex items-center text-purple-600 font-semibold">
                            <span class="mr-2">Buka Borang</span>
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </a>
            
            <a href="/aktiviti-tahunan" class="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-orange-500">
                <div class="flex items-start">
                    <div class="bg-orange-100 p-4 rounded-full mr-4">
                        <i class="fas fa-calendar-alt text-3xl text-orange-600"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-gray-800 mb-2">
                            4. Borang Aktiviti Tahunan Homeroom
                        </h3>
                        <p class="text-gray-600 text-sm mb-3">
                            Perancangan dan rekod aktiviti homeroom sepanjang tahun
                        </p>
                        <div class="flex items-center text-orange-600 font-semibold">
                            <span class="mr-2">Buka Borang</span>
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        function checkAuth() {
            const user = localStorage.getItem('currentHomeroom');
            if (!user) {
                window.location.href = '/';
                return null;
            }
            const homeroomData = JSON.parse(user);
            document.getElementById('guruName').textContent = homeroomData.nama_guru;
            document.getElementById('homeroomInfo').textContent = homeroomData.nama_homeroom + ' - Tingkatan ' + homeroomData.tingkatan;
            return homeroomData;
        }
        
        function logout() {
            localStorage.removeItem('currentHomeroom');
            window.location.href = '/';
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
        
        checkAuth();
    </script>
</body>
</html>
  `)
})

app.get('/laporan-mingguan', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Borang Laporan Mingguan - MRSM Ranau</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <nav class="bg-green-600 text-white shadow-lg">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-calendar-week text-2xl"></i>
                    <div>
                        <h1 class="text-xl font-bold">Borang Laporan Mingguan Homeroom</h1>
                        <p class="text-sm text-green-200" id="homeroomInfo"></p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="font-semibold" id="guruName"></p>
                        <p class="text-sm text-green-200">Guru Homeroom</p>
                    </div>
                    <a href="/pengguna-dashboard" class="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg transition">
                        <i class="fas fa-arrow-left mr-2"></i>Kembali
                    </a>
                </div>
            </div>
        </div>
    </nav>
    
    <div class="container mx-auto px-4 py-8">
        <div class="mb-6 flex justify-between items-center">
            <div>
                <p class="text-sm text-gray-600">Jumlah Ahli: <span id="jumlah_ahli" class="font-bold">0</span></p>
            </div>
            <button onclick="showAddForm()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
                <i class="fas fa-plus mr-2"></i>Tambah Laporan Baru
            </button>
        </div>
        
        <div class="bg-white rounded-lg shadow-md overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pertemuan</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarikh</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hari</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tema</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kehadiran</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tindakan</th>
                    </tr>
                </thead>
                <tbody id="laporanTable" class="bg-white divide-y divide-gray-200">
                    <tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Form Modal -->
    <div id="formModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-screen overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold" id="modalTitle">Tambah Laporan Mingguan</h3>
                    <button onclick="hideForm()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <form id="laporanForm" onsubmit="saveLaporan(event)" class="space-y-4">
                    <!-- Maklumat Homeroom -->
                    <div class="bg-green-50 p-4 rounded-lg space-y-3">
                        <h4 class="font-bold text-green-800">Maklumat Homeroom</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">Nama Homeroom</label>
                                <input type="text" id="nama_homeroom" readonly class="w-full px-3 py-2 border rounded-lg bg-gray-100">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Tarikh *</label>
                                <input type="date" id="tarikh" required class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Hari</label>
                                <input type="text" id="hari" readonly class="w-full px-3 py-2 border rounded-lg bg-gray-100">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Masa *</label>
                                <input type="time" id="masa" required class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Tempat *</label>
                                <input type="text" id="tempat" required placeholder="Contoh: Bilik Homeroom" class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Kehadiran</label>
                                <input type="number" id="kehadiran" readonly class="w-full px-3 py-2 border rounded-lg bg-gray-100">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Ketidakhadiran</label>
                            <div class="flex gap-2">
                                <select id="ketidakhadiran_select" class="flex-1 px-3 py-2 border rounded-lg">
                                    <option value="">-- Pilih Ahli --</option>
                                </select>
                                <button type="button" onclick="addKetidakhadiran()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div id="ketidakhadiranList" class="mt-2 space-y-2"></div>
                        </div>
                    </div>
                    
                    <!-- Kandungan Pertemuan -->
                    <div class="bg-blue-50 p-4 rounded-lg space-y-3">
                        <h4 class="font-bold text-blue-800">Kandungan Pertemuan</h4>
                        <div>
                            <label class="block text-sm font-medium mb-1">Tema *</label>
                            <input type="text" id="tema" required class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Tajuk *</label>
                            <input type="text" id="tajuk" required class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Penerangan Aktiviti *</label>
                            <textarea id="penerangan_aktiviti" required rows="4" class="w-full px-3 py-2 border rounded-lg"></textarea>
                        </div>
                    </div>
                    
                    <!-- Galeri (Optional) -->
                    <div class="bg-purple-50 p-4 rounded-lg space-y-3">
                        <h4 class="font-bold text-purple-800">Galeri (Tidak Wajib)</h4>
                        <div>
                            <label class="block text-sm font-medium mb-1">URL Gambar/Video</label>
                            <input type="url" id="galeri_url" placeholder="https://..." class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Caption</label>
                            <input type="text" id="galeri_caption" class="w-full px-3 py-2 border rounded-lg">
                        </div>
                    </div>
                    
                    <!-- Refleksi -->
                    <div class="bg-yellow-50 p-4 rounded-lg space-y-3">
                        <h4 class="font-bold text-yellow-800">Refleksi</h4>
                        <div>
                            <label class="block text-sm font-medium mb-1">Refleksi Pelajar * (Max 500 perkataan)</label>
                            <textarea id="refleksi_pelajar" required rows="4" maxlength="3000" class="w-full px-3 py-2 border rounded-lg"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Refleksi Guru * (Max 500 perkataan)</label>
                            <textarea id="refleksi_guru" required rows="4" maxlength="3000" class="w-full px-3 py-2 border rounded-lg"></textarea>
                        </div>
                    </div>
                    
                    <!-- Metadata -->
                    <div class="bg-gray-50 p-4 rounded-lg space-y-3">
                        <h4 class="font-bold text-gray-800">Metadata</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">Disediakan Oleh (Setiausaha)</label>
                                <input type="text" id="disediakan_oleh" class="w-full px-3 py-2 border rounded-lg bg-gray-100">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Disemak Oleh (Guru)</label>
                                <input type="text" id="disemak_oleh" class="w-full px-3 py-2 border rounded-lg bg-gray-100">
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-4">
                        <button type="submit" class="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold">
                            <i class="fas fa-save mr-2"></i>Simpan
                        </button>
                        <button type="button" onclick="hideForm()" class="px-6 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-semibold">
                            Batal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- View Modal -->
    <div id="viewModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-screen overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Butiran Laporan</h3>
                    <button onclick="hideView()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div id="viewContent"></div>
                <button onclick="hideView()" class="mt-4 w-full bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-semibold">
                    Tutup
                </button>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/laporan-mingguan.js"></script>
</body>
</html>
  `)
})

app.get('/pencapaian-ahli', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Borang Pencapaian Ahli - MRSM Ranau</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <nav class="bg-green-600 text-white shadow-lg">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-trophy text-2xl"></i>
                    <div>
                        <h1 class="text-xl font-bold">Borang Pencapaian Ahli Homeroom</h1>
                        <p class="text-sm text-green-200" id="homeroomInfo"></p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="font-semibold" id="guruName"></p>
                        <p class="text-sm text-green-200">Guru Homeroom</p>
                    </div>
                    <a href="/pengguna-dashboard" class="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg transition">
                        <i class="fas fa-arrow-left mr-2"></i>Kembali
                    </a>
                </div>
            </div>
        </div>
    </nav>
    
    <div class="container mx-auto px-4 py-8">
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl"></i>
                </div>
                <div class="ml-3">
                    <h3 class="text-lg font-medium text-yellow-800">
                        Borang Dalam Pembangunan
                    </h3>
                    <div class="mt-2 text-sm text-yellow-700">
                        <p>Borang Pencapaian Ahli Homeroom sedang dalam proses pembangunan.</p>
                        <p class="mt-2">Akan siap tidak lama lagi!</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const homeroom = JSON.parse(localStorage.getItem('currentHomeroom') || '{}');
        if (homeroom.nama_guru) {
            document.getElementById('guruName').textContent = homeroom.nama_guru;
            document.getElementById('homeroomInfo').textContent = homeroom.nama_homeroom + ' - Tingkatan ' + homeroom.tingkatan;
        }
    </script>
</body>
</html>
  `)
})

app.get('/aktiviti-tahunan', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Borang Aktiviti Tahunan - MRSM Ranau</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <nav class="bg-green-600 text-white shadow-lg">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-calendar-alt text-2xl"></i>
                    <div>
                        <h1 class="text-xl font-bold">Borang Aktiviti Tahunan Homeroom</h1>
                        <p class="text-sm text-green-200" id="homeroomInfo"></p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="font-semibold" id="guruName"></p>
                        <p class="text-sm text-green-200">Guru Homeroom</p>
                    </div>
                    <a href="/pengguna-dashboard" class="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg transition">
                        <i class="fas fa-arrow-left mr-2"></i>Kembali
                    </a>
                </div>
            </div>
        </div>
    </nav>
    
    <div class="container mx-auto px-4 py-8">
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl"></i>
                </div>
                <div class="ml-3">
                    <h3 class="text-lg font-medium text-yellow-800">
                        Borang Dalam Pembangunan
                    </h3>
                    <div class="mt-2 text-sm text-yellow-700">
                        <p>Borang Aktiviti Tahunan Homeroom sedang dalam proses pembangunan.</p>
                        <p class="mt-2">Akan siap tidak lama lagi!</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const homeroom = JSON.parse(localStorage.getItem('currentHomeroom') || '{}');
        if (homeroom.nama_guru) {
            document.getElementById('guruName').textContent = homeroom.nama_guru;
            document.getElementById('homeroomInfo').textContent = homeroom.nama_homeroom + ' - Tingkatan ' + homeroom.tingkatan;
        }
    </script>
</body>
</html>
  `)
})


app.get('/ahli-homeroom', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Borang Senarai Ahli Homeroom - MRSM Ranau</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-green-600 text-white shadow-lg">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-users text-2xl"></i>
                    <div>
                        <h1 class="text-xl font-bold">Borang Senarai Ahli Homeroom</h1>
                        <p class="text-sm text-green-200" id="homeroomInfo"></p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="font-semibold" id="guruName"></p>
                        <p class="text-sm text-green-200">Guru Homeroom</p>
                    </div>
                    <a href="/pengguna" class="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg transition">
                        <i class="fas fa-arrow-left mr-2"></i>Kembali
                    </a>
                </div>
            </div>
        </div>
    </nav>
    
    <div class="container mx-auto px-4 py-8">
        <!-- Add Button -->
        <div class="mb-6">
            <button onclick="showAddForm()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
                <i class="fas fa-plus mr-2"></i>Tambah Ahli Baru
            </button>
        </div>
        
        <!-- Members Table -->
        <div class="bg-white rounded-lg shadow-md overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bil</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Maktab</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jantina</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jawatan</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tindakan</th>
                    </tr>
                </thead>
                <tbody id="membersTable" class="bg-white divide-y divide-gray-200">
                    <tr>
                        <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                            Tiada ahli. Klik "Tambah Ahli Baru" untuk mulakan.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Add/Edit Modal -->
    <div id="formModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold" id="modalTitle">Tambah Ahli Baru</h3>
                    <button onclick="hideForm()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <form id="memberForm" class="space-y-4">
                    <input type="hidden" id="memberId">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Maklumat Asas -->
                        <div class="col-span-2 bg-green-50 p-4 rounded-lg">
                            <h4 class="font-bold text-green-800 mb-3">Maklumat Asas</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Nama Ahli *</label>
                                    <input type="text" id="nama_ahli" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">No. Maktab *</label>
                                    <input type="text" id="no_maktab" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jantina *</label>
                                    <select id="jantina" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                        <option value="">Pilih</option>
                                        <option value="Lelaki">Lelaki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Kelas *</label>
                                    <input type="text" id="kelas" required placeholder="Contoh: 4 AMANAH"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan Homeroom</label>
                                    <select id="jawatan_homeroom" onchange="checkJawatanHomeroom()"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                        <option value="">Tiada</option>
                                        <option value="PRESIDEN">PRESIDEN</option>
                                        <option value="TIMBALAN PRESIDEN">TIMBALAN PRESIDEN</option>
                                        <option value="SETIAUSAHA">SETIAUSAHA</option>
                                        <option value="BENDAHARI">BENDAHARI</option>
                                        <option value="AJK KHAS">AJK KHAS</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">No. Bilik Asrama</label>
                                    <input type="text" id="no_bilik_asrama"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Unit Beruniform -->
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-bold text-blue-800 mb-3">Unit Beruniform</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <select id="unit_beruniform"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="">Tiada</option>
                                        <option value="Bulan Sabit Merah Malaysia">Bulan Sabit Merah Malaysia</option>
                                        <option value="Kadet Bomba">Kadet Bomba</option>
                                        <option value="Kadet Pertahanan Awam">Kadet Pertahanan Awam</option>
                                        <option value="Kadet Polis">Kadet Polis</option>
                                        <option value="Pandu Puteri">Pandu Puteri</option>
                                        <option value="Pengakap">Pengakap</option>
                                        <option value="Puteri Islam">Puteri Islam</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan</label>
                                    <select id="jawatan_beruniform" onchange="checkJawatanBeruniform()"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="">Tiada</option>
                                        <option value="PRESIDEN">PRESIDEN</option>
                                        <option value="TIMBALAN PRESIDEN">TIMBALAN PRESIDEN</option>
                                        <option value="SETIAUSAHA">SETIAUSAHA</option>
                                        <option value="BENDAHARI">BENDAHARI</option>
                                        <option value="AJK KHAS">AJK KHAS</option>
                                    </select>
                                </div>
                                <div id="div_jawatan_beruniform_lain" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan (Nyatakan)</label>
                                    <input type="text" id="jawatan_beruniform_lain"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Kelab/Persatuan -->
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <h4 class="font-bold text-purple-800 mb-3">Kelab/Persatuan</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Kelab</label>
                                    <select id="kelab_persatuan"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                        <option value="">Tiada</option>
                                        <option value="Bahasa Antarabangsa">Bahasa Antarabangsa</option>
                                        <option value="Debat & Pengucapan Awam">Debat & Pengucapan Awam</option>
                                        <option value="Masakan & Kulinari">Masakan & Kulinari</option>
                                        <option value="Pencegahan Jenayah">Pencegahan Jenayah</option>
                                        <option value="Pencinta Alam">Pencinta Alam</option>
                                        <option value="Penggerak Digital">Penggerak Digital</option>
                                        <option value="Robotik & KRUMS">Robotik & KRUMS</option>
                                        <option value="Saintis Muda">Saintis Muda</option>
                                        <option value="Seni Muzik & Kebudayaan">Seni Muzik & Kebudayaan</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan</label>
                                    <select id="jawatan_kelab" onchange="checkJawatanKelab()"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                        <option value="">Tiada</option>
                                        <option value="PRESIDEN">PRESIDEN</option>
                                        <option value="TIMBALAN PRESIDEN">TIMBALAN PRESIDEN</option>
                                        <option value="SETIAUSAHA">SETIAUSAHA</option>
                                        <option value="BENDAHARI">BENDAHARI</option>
                                        <option value="AJK KHAS">AJK KHAS</option>
                                    </select>
                                </div>
                                <div id="div_jawatan_kelab_lain" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan (Nyatakan)</label>
                                    <input type="text" id="jawatan_kelab_lain"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Sukan/Permainan -->
                        <div class="bg-orange-50 p-4 rounded-lg">
                            <h4 class="font-bold text-orange-800 mb-3">Sukan/Permainan</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Sukan</label>
                                    <select id="sukan_permainan"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                                        <option value="">Tiada</option>
                                        <option value="Badminton">Badminton</option>
                                        <option value="Bola Jaring">Bola Jaring</option>
                                        <option value="Bola Sepak">Bola Sepak</option>
                                        <option value="Bola Tampar">Bola Tampar</option>
                                        <option value="Catur">Catur</option>
                                        <option value="Hoki">Hoki</option>
                                        <option value="Olahraga">Olahraga</option>
                                        <option value="Ragbi">Ragbi</option>
                                        <option value="Silat">Silat</option>
                                        <option value="Taekwando">Taekwando</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan</label>
                                    <select id="jawatan_sukan" onchange="checkJawatanSukan()"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                                        <option value="">Tiada</option>
                                        <option value="PRESIDEN">PRESIDEN</option>
                                        <option value="TIMBALAN PRESIDEN">TIMBALAN PRESIDEN</option>
                                        <option value="SETIAUSAHA">SETIAUSAHA</option>
                                        <option value="BENDAHARI">BENDAHARI</option>
                                        <option value="AJK KHAS">AJK KHAS</option>
                                    </select>
                                </div>
                                <div id="div_jawatan_sukan_lain" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan (Nyatakan)</label>
                                    <input type="text" id="jawatan_sukan_lain"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                                </div>
                            </div>
                        </div>
                        
                        <!-- SKP -->
                        <div class="bg-red-50 p-4 rounded-lg">
                            <h4 class="font-bold text-red-800 mb-3">Sekretariat Kepimpinan Pelajar (SKP)</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Sekretariat</label>
                                    <select id="sekretariat_skp"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                                        <option value="">Tiada</option>
                                        <option value="BWP">BWP</option>
                                        <option value="LDP">LDP</option>
                                        <option value="PUM">PUM</option>
                                        <option value="ALK">ALK</option>
                                        <option value="BADAR">BADAR</option>
                                        <option value="EMC">EMC</option>
                                        <option value="JPA">JPA</option>
                                        <option value="PRS">PRS</option>
                                        <option value="PPSP">PPSP</option>
                                        <option value="SRM">SRM</option>
                                        <option value="BKM">BKM</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Jawatan</label>
                                    <input type="text" id="jawatan_skp"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                           placeholder="Contoh: KETUA, TIMBALAN, AHLI">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-4 pt-4">
                        <button type="submit" 
                                class="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition">
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
    <script src="/static/ahli-homeroom.js"></script>
</body>
</html>
  `)
})

export default app
