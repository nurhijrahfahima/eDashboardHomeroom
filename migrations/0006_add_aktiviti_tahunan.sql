-- Jadual 1: Aktiviti Biasa
CREATE TABLE IF NOT EXISTS aktiviti_biasa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homeroom_id INTEGER NOT NULL,
  bilangan INTEGER NOT NULL,
  tarikh DATE NOT NULL,
  hari TEXT NOT NULL,
  masa TIME NOT NULL,
  nama_aktiviti TEXT NOT NULL,
  tempat TEXT NOT NULL,
  catatan TEXT,
  gambar1_url TEXT,
  gambar1_caption TEXT,
  gambar2_url TEXT,
  gambar2_caption TEXT,
  gambar3_url TEXT,
  gambar3_caption TEXT,
  disediakan_oleh TEXT,
  disemak_oleh TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeroom_id) REFERENCES homeroom(id)
);

-- Jadual 2: Aktiviti Keusahawanan
CREATE TABLE IF NOT EXISTS aktiviti_keusahawanan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homeroom_id INTEGER NOT NULL,
  bilangan INTEGER NOT NULL,
  tarikh DATE NOT NULL,
  hari TEXT NOT NULL,
  masa TIME NOT NULL,
  nama_aktiviti TEXT NOT NULL,
  tempat TEXT NOT NULL,
  keuntungan REAL NOT NULL,
  catatan TEXT,
  gambar_url TEXT,
  gambar_caption TEXT,
  disediakan_oleh TEXT,
  disemak_oleh TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeroom_id) REFERENCES homeroom(id)
);

-- Jadual 3: Aktiviti Khidmat Masyarakat
CREATE TABLE IF NOT EXISTS aktiviti_khidmat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homeroom_id INTEGER NOT NULL,
  bilangan INTEGER NOT NULL,
  tarikh DATE NOT NULL,
  hari TEXT NOT NULL,
  masa TIME NOT NULL,
  nama_aktiviti TEXT NOT NULL,
  tempat TEXT NOT NULL,
  objektif TEXT NOT NULL,
  impak TEXT NOT NULL,
  catatan TEXT,
  gambar_url TEXT,
  gambar_caption TEXT,
  disediakan_oleh TEXT,
  disemak_oleh TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeroom_id) REFERENCES homeroom(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_aktiviti_biasa_homeroom ON aktiviti_biasa(homeroom_id);
CREATE INDEX IF NOT EXISTS idx_aktiviti_keusahawanan_homeroom ON aktiviti_keusahawanan(homeroom_id);
CREATE INDEX IF NOT EXISTS idx_aktiviti_khidmat_homeroom ON aktiviti_khidmat(homeroom_id);
