-- Tambah jadual pencapaian_ahli
CREATE TABLE IF NOT EXISTS pencapaian_ahli (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homeroom_id INTEGER NOT NULL,
  
  -- Maklumat Pelajar (3 fields)
  nama_pelajar TEXT NOT NULL,
  no_maktab TEXT NOT NULL,
  png TEXT, -- PNG (optional based on requirements)
  
  -- Maklumat Aktiviti (3 fields)
  nama_aktiviti TEXT NOT NULL,
  peringkat TEXT NOT NULL, -- Daerah, Negeri, Kebangsaan, MRSM Se-Malaysia
  pencapaian TEXT NOT NULL,
  
  -- Galeri (2 fields)
  galeri_url TEXT,
  galeri_caption TEXT,
  
  -- Metadata
  disediakan_oleh TEXT, -- Nama Setiausaha
  disemak_oleh TEXT, -- Nama Guru
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (homeroom_id) REFERENCES homeroom(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pencapaian_ahli_homeroom ON pencapaian_ahli(homeroom_id);
CREATE INDEX IF NOT EXISTS idx_pencapaian_ahli_pelajar ON pencapaian_ahli(nama_pelajar);
