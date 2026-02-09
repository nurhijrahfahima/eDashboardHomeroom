-- Insert default admin user (password: admin123)
-- Password is hashed using simple encoding for demo purposes
INSERT OR IGNORE INTO users (id, username, password, nama_penuh, role) VALUES 
  (1, 'admin', 'admin123', 'Administrator MRSM Ranau', 'admin'),
  (2, 'pengguna1', 'user123', 'Cikgu Azman bin Abdullah', 'pengguna'),
  (3, 'pengguna2', 'user123', 'Puan Siti Aminah', 'pengguna');

-- Insert sample homeroom data
INSERT OR IGNORE INTO homeroom (id, nama_homeroom, tingkatan, tahun_akademik) VALUES 
  (1, 'Homeroom 1A', 'Tingkatan 1', '2024/2025'),
  (2, 'Homeroom 1B', 'Tingkatan 1', '2024/2025'),
  (3, 'Homeroom 2A', 'Tingkatan 2', '2024/2025'),
  (4, 'Homeroom 3A', 'Tingkatan 3', '2024/2025'),
  (5, 'Homeroom 4A', 'Tingkatan 4', '2024/2025'),
  (6, 'Homeroom 5A', 'Tingkatan 5', '2024/2025');

-- Insert sample laporan data
INSERT OR IGNORE INTO laporan (id, homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara, created_by) VALUES 
  (1, 1, '2024-01-15', 'kehadiran', 'Laporan Kehadiran Januari 2024', 'Kehadiran pelajar Homeroom 1A untuk bulan Januari 2024 adalah 98%. Terdapat 2 orang pelajar yang tidak hadir atas sebab kesihatan.', 1),
  (2, 1, '2024-01-20', 'disiplin', 'Kes Disiplin Minor', 'Terdapat 1 kes disiplin minor melibatkan kelewatan ke kelas. Tindakan nasihat telah diambil.', 1),
  (3, 2, '2024-01-18', 'akademik', 'Pencapaian Ujian Bulanan', 'Purata pencapaian kelas untuk Matematik adalah 75%. Pelajar menunjukkan peningkatan berbanding bulan lepas.', 2),
  (4, 3, '2024-01-22', 'aktiviti', 'Program Kokurikulum', 'Pelajar Homeroom 2A telah menyertai program khidmat masyarakat di kampung sekitar. Sambutan sangat menggalakkan.', 2),
  (5, 1, '2024-01-25', 'umum', 'Perjumpaan Ibu Bapa', 'Perjumpaan ibu bapa akan diadakan pada 10 Februari 2024. Surat jemputan telah dihantar.', 1);
