-- Disable foreign key constraints
PRAGMA foreign_keys = OFF;

-- Delete existing data
DELETE FROM lampiran;
DELETE FROM laporan;
DELETE FROM homeroom;
DELETE FROM users;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Insert admin user dengan credentials baru
INSERT INTO users (id, username, password, nama_penuh, role) VALUES 
  (1, 'JKUPHRMRSMR', 'UPHRMRSMRanau', 'Administrator MRSM Ranau', 'admin');

-- Insert sample pengguna
INSERT INTO users (username, password, nama_penuh, role) VALUES 
  ('pengguna1', 'user123', 'Cikgu Azman bin Abdullah', 'pengguna'),
  ('pengguna2', 'user123', 'Puan Siti Aminah', 'pengguna');

-- Insert homeroom data mengikut tingkatan dan nama guru

-- Tingkatan 1
INSERT INTO homeroom (id, nama_homeroom, tingkatan, tahun_akademik, nama_guru) VALUES 
  (1, 'Homeroom 1A', 'Tingkatan 1', '2024/2025', 'Ustaz Firdaus'),
  (2, 'Homeroom 1B', 'Tingkatan 1', '2024/2025', 'Cikgu Dayang'),
  (3, 'Homeroom 1C', 'Tingkatan 1', '2024/2025', 'Cikgu Ady'),
  (4, 'Homeroom 1D', 'Tingkatan 1', '2024/2025', 'Cikgu Dominic'),
  (5, 'Homeroom 1E', 'Tingkatan 1', '2024/2025', 'Cikgu Ismail'),
  (6, 'Homeroom 1F', 'Tingkatan 1', '2024/2025', 'Cikgu Kylie');

-- Tingkatan 2
INSERT INTO homeroom (id, nama_homeroom, tingkatan, tahun_akademik, nama_guru) VALUES 
  (7, 'Homeroom 2A', 'Tingkatan 2', '2024/2025', 'Cikgu Nelson'),
  (8, 'Homeroom 2B', 'Tingkatan 2', '2024/2025', 'Cikgu Nurhijrah'),
  (9, 'Homeroom 2C', 'Tingkatan 2', '2024/2025', 'Ustaz Izzat'),
  (10, 'Homeroom 2D', 'Tingkatan 2', '2024/2025', 'Cikgu Norazliana'),
  (11, 'Homeroom 2E', 'Tingkatan 2', '2024/2025', 'Cikgu Noorfitri');

-- Tingkatan 3
INSERT INTO homeroom (id, nama_homeroom, tingkatan, tahun_akademik, nama_guru) VALUES 
  (12, 'Homeroom 3A', 'Tingkatan 3', '2024/2025', 'Cikgu Noorhayani'),
  (13, 'Homeroom 3B', 'Tingkatan 3', '2024/2025', 'Cikgu Amira'),
  (14, 'Homeroom 3C', 'Tingkatan 3', '2024/2025', 'Cikgu Jasman'),
  (15, 'Homeroom 3D', 'Tingkatan 3', '2024/2025', 'Cikgu Asrul'),
  (16, 'Homeroom 3E', 'Tingkatan 3', '2024/2025', 'Cikgu Sharin'),
  (17, 'Homeroom 3F', 'Tingkatan 3', '2024/2025', 'Cikgu Noorhaineh');

-- Tingkatan 4
INSERT INTO homeroom (id, nama_homeroom, tingkatan, tahun_akademik, nama_guru) VALUES 
  (18, 'Homeroom 4A', 'Tingkatan 4', '2024/2025', 'Cikgu Celestine'),
  (19, 'Homeroom 4B', 'Tingkatan 4', '2024/2025', 'Cikgu Amran'),
  (20, 'Homeroom 4C', 'Tingkatan 4', '2024/2025', 'Cikgu Rafidah'),
  (21, 'Homeroom 4D', 'Tingkatan 4', '2024/2025', 'Cikgu Juliah'),
  (22, 'Homeroom 4E', 'Tingkatan 4', '2024/2025', 'Cikgu Hilmi'),
  (23, 'Homeroom 4F', 'Tingkatan 4', '2024/2025', 'Cikgu Aphelmina');

-- Tingkatan 5
INSERT INTO homeroom (id, nama_homeroom, tingkatan, tahun_akademik, nama_guru) VALUES 
  (24, 'Homeroom 5A', 'Tingkatan 5', '2024/2025', 'Cikgu Azlan'),
  (25, 'Homeroom 5B', 'Tingkatan 5', '2024/2025', 'Cikgu Azwa'),
  (26, 'Homeroom 5C', 'Tingkatan 5', '2024/2025', 'Cikgu Audry'),
  (27, 'Homeroom 5D', 'Tingkatan 5', '2024/2025', 'Cikgu Faishal'),
  (28, 'Homeroom 5E', 'Tingkatan 5', '2024/2025', 'Cikgu Amanina');

-- Insert sample laporan data
INSERT INTO laporan (homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara, created_by) VALUES 
  (1, '2024-01-15', 'kehadiran', 'Laporan Kehadiran Januari 2024', 'Kehadiran pelajar Homeroom 1A (Ustaz Firdaus) untuk bulan Januari 2024 adalah 98%. Terdapat 2 orang pelajar yang tidak hadir atas sebab kesihatan.', 1),
  (1, '2024-01-20', 'disiplin', 'Kes Disiplin Minor', 'Terdapat 1 kes disiplin minor melibatkan kelewatan ke kelas. Tindakan nasihat telah diambil oleh Ustaz Firdaus.', 1),
  (7, '2024-01-18', 'akademik', 'Pencapaian Ujian Bulanan', 'Purata pencapaian kelas Homeroom 2A (Cikgu Nelson) untuk Matematik adalah 75%. Pelajar menunjukkan peningkatan berbanding bulan lepas.', 1),
  (12, '2024-01-22', 'aktiviti', 'Program Kokurikulum', 'Pelajar Homeroom 3A (Cikgu Noorhayani) telah menyertai program khidmat masyarakat di kampung sekitar. Sambutan sangat menggalakkan.', 1),
  (18, '2024-01-25', 'umum', 'Perjumpaan Ibu Bapa', 'Perjumpaan ibu bapa Homeroom 4A (Cikgu Celestine) akan diadakan pada 10 Februari 2024. Surat jemputan telah dihantar.', 1),
  (24, '2024-01-28', 'akademik', 'Persediaan SPM 2024', 'Homeroom 5A (Cikgu Azlan) telah memulakan sesi intensif persediaan SPM. Jadual kelas tambahan telah diedarkan kepada semua pelajar.', 1),
  (2, '2024-02-01', 'kehadiran', 'Kehadiran Cemerlang', 'Homeroom 1B (Cikgu Dayang) mencatat kehadiran 100% untuk minggu ini. Syabas kepada semua pelajar!', 1),
  (8, '2024-02-03', 'akademik', 'Kejayaan Pertandingan Sains', 'Pelajar Homeroom 2B (Cikgu Nurhijrah) memenangi tempat pertama dalam pertandingan sains peringkat daerah.', 1),
  (14, '2024-02-05', 'aktiviti', 'Latihan Badminton', 'Sesi latihan badminton untuk Homeroom 3C (Cikgu Jasman) berjalan lancar. Pelajar menunjukkan komitmen yang tinggi.', 1),
  (20, '2024-02-07', 'umum', 'Majlis Anugerah Cemerlang', 'Homeroom 4C (Cikgu Rafidah) akan menghantar wakil untuk Majlis Anugerah Cemerlang sekolah.', 1);
