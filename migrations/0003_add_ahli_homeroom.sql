-- Tambah jadual ahli_homeroom
CREATE TABLE IF NOT EXISTS ahli_homeroom (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homeroom_id INTEGER NOT NULL,
  bilangan INTEGER,
  nama_ahli TEXT NOT NULL,
  no_maktab TEXT NOT NULL,
  jantina TEXT NOT NULL CHECK(jantina IN ('Lelaki', 'Perempuan')),
  kelas TEXT NOT NULL,
  jawatan_homeroom TEXT,
  no_bilik_asrama TEXT,
  
  -- Unit Beruniform
  unit_beruniform TEXT,
  jawatan_beruniform TEXT,
  jawatan_beruniform_lain TEXT,
  
  -- Kelab/Persatuan
  kelab_persatuan TEXT,
  jawatan_kelab TEXT,
  jawatan_kelab_lain TEXT,
  
  -- Sukan/Permainan
  sukan_permainan TEXT,
  jawatan_sukan TEXT,
  jawatan_sukan_lain TEXT,
  
  -- SKP
  sekretariat_skp TEXT,
  jawatan_skp TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeroom_id) REFERENCES homeroom(id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_ahli_homeroom ON ahli_homeroom(homeroom_id);
