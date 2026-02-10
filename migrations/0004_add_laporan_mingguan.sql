-- Tambah jadual laporan_mingguan
CREATE TABLE IF NOT EXISTS laporan_mingguan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homeroom_id INTEGER NOT NULL,
  
  -- Maklumat Homeroom
  nama_homeroom TEXT NOT NULL,
  tarikh DATE NOT NULL,
  hari TEXT NOT NULL,
  masa TIME NOT NULL,
  tempat TEXT NOT NULL,
  pertemuan_ke INTEGER NOT NULL,
  kehadiran INTEGER NOT NULL,
  ketidakhadiran TEXT, -- JSON array of ahli IDs yang tidak hadir
  
  -- Kandungan Pertemuan
  tema TEXT NOT NULL,
  tajuk TEXT NOT NULL,
  penerangan_aktiviti TEXT NOT NULL,
  
  -- Galeri (optional)
  galeri_url TEXT,
  galeri_caption TEXT,
  
  -- Refleksi
  refleksi_pelajar TEXT NOT NULL,
  refleksi_guru TEXT NOT NULL,
  
  -- Metadata
  disediakan_oleh TEXT, -- Nama Setiausaha
  disemak_oleh TEXT, -- Nama Guru
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (homeroom_id) REFERENCES homeroom(id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_laporan_mingguan_homeroom ON laporan_mingguan(homeroom_id);
CREATE INDEX IF NOT EXISTS idx_laporan_mingguan_tarikh ON laporan_mingguan(tarikh);
