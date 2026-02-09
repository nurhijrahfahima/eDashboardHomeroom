-- Jadual Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nama_penuh TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'pengguna')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jadual Homeroom
CREATE TABLE IF NOT EXISTS homeroom (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_homeroom TEXT NOT NULL,
  tingkatan TEXT NOT NULL,
  tahun_akademik TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jadual Laporan
CREATE TABLE IF NOT EXISTS laporan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homeroom_id INTEGER NOT NULL,
  tarikh_laporan DATE NOT NULL,
  jenis_laporan TEXT NOT NULL CHECK(jenis_laporan IN ('kehadiran', 'disiplin', 'akademik', 'aktiviti', 'umum')),
  tajuk TEXT NOT NULL,
  perkara TEXT NOT NULL,
  status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'arkib')),
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeroom_id) REFERENCES homeroom(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Jadual Lampiran (jika ada fail dilampirkan)
CREATE TABLE IF NOT EXISTS lampiran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  laporan_id INTEGER NOT NULL,
  nama_fail TEXT NOT NULL,
  url_fail TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (laporan_id) REFERENCES laporan(id)
);

-- Create indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_laporan_homeroom ON laporan(homeroom_id);
CREATE INDEX IF NOT EXISTS idx_laporan_tarikh ON laporan(tarikh_laporan);
CREATE INDEX IF NOT EXISTS idx_laporan_jenis ON laporan(jenis_laporan);
CREATE INDEX IF NOT EXISTS idx_laporan_status ON laporan(status);
CREATE INDEX IF NOT EXISTS idx_homeroom_tingkatan ON homeroom(tingkatan);
CREATE INDEX IF NOT EXISTS idx_lampiran_laporan ON lampiran(laporan_id);
