# E-Dashboard Laporan Homeroom MRSM Ranau

## Gambaran Projek
E-Dashboard Laporan Homeroom untuk MRSM Ranau adalah sistem pengurusan laporan homeroom yang komprehensif dengan dua panel akses:
- **Panel Admin**: Untuk pentadbir menguruskan semua laporan homeroom
- **Panel Pengguna**: Untuk pengguna melihat dan membaca laporan homeroom

## URLs
- **Development**: https://3000-i7nkasdlhthnnls3d1hzr-8f57ffe2.sandbox.novita.ai
- **GitHub**: (Akan dikemaskini selepas push)

## Ciri-ciri Utama

### ✅ Ciri-ciri Yang Telah Siap

#### Panel Admin
- ✅ Dashboard statistik (jumlah laporan mengikut jenis)
- ✅ Senarai laporan dalam format jadual
- ✅ Tambah laporan baru
- ✅ Edit laporan sedia ada
- ✅ Arkib/hapus laporan (soft delete)
- ✅ Lihat butiran penuh laporan
- ✅ Filter laporan mengikut homeroom dan jenis

#### Panel Pengguna
- ✅ Dashboard statistik laporan
- ✅ Senarai laporan dalam format kad (card view)
- ✅ Lihat butiran penuh laporan
- ✅ Filter laporan mengikut homeroom dan jenis

#### Sistem Autentikasi
- ✅ Login page dengan credentials
- ✅ Role-based access (Admin & Pengguna)
- ✅ Session management dengan localStorage

#### Database & Data
- ✅ Cloudflare D1 Database (SQLite)
- ✅ 4 jadual utama (users, homeroom, laporan, lampiran)
- ✅ Data sampel untuk testing
- ✅ Migration system

## Jenis-jenis Laporan

Sistem menyokong 5 jenis laporan:
1. **Kehadiran** - Laporan kehadiran pelajar
2. **Disiplin** - Laporan kes disiplin
3. **Akademik** - Laporan pencapaian akademik
4. **Aktiviti** - Laporan aktiviti kokurikulum
5. **Umum** - Laporan umum dan lain-lain

## Akaun Demo

### Admin
- Username: `admin`
- Password: `admin123`
- Akses: Penuh (CRUD semua laporan)

### Pengguna
- Username: `pengguna1`
- Password: `user123`
- Akses: Read-only (lihat laporan sahaja)

## Struktur Database

### Jadual Users
- id, username, password, nama_penuh, role, created_at

### Jadual Homeroom
- id, nama_homeroom, tingkatan, tahun_akademik, created_at

### Jadual Laporan
- id, homeroom_id, tarikh_laporan, jenis_laporan, tajuk, perkara, status, created_by, created_at, updated_at

### Jadual Lampiran
- id, laporan_id, nama_fail, url_fail, created_at

## Teknologi

- **Backend**: Hono Framework (TypeScript)
- **Frontend**: HTML + TailwindCSS + Axios
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages
- **Process Manager**: PM2

## Cara Menggunakan

### Login
1. Buka URL aplikasi
2. Masukkan username dan password
3. Sistem akan redirect ke panel yang sesuai mengikut role

### Panel Admin
1. **Lihat Dashboard**: Statistik laporan dipaparkan di bahagian atas
2. **Filter Laporan**: Gunakan dropdown untuk filter mengikut homeroom atau jenis
3. **Tambah Laporan**: Klik butang "Tambah Laporan Baru"
4. **Edit Laporan**: Klik ikon edit (hijau) pada laporan
5. **Hapus Laporan**: Klik ikon hapus (merah) - laporan akan diarkibkan
6. **Lihat Butiran**: Klik ikon mata (biru) untuk lihat butiran penuh

### Panel Pengguna
1. **Lihat Dashboard**: Statistik laporan dipaparkan di bahagian atas
2. **Filter Laporan**: Gunakan dropdown untuk filter mengikut homeroom atau jenis
3. **Lihat Butiran**: Klik butang "Lihat Butiran" pada setiap kad laporan

## Deployment

### Status
✅ **Aktif** - Berjalan di sandbox development

### Tech Stack
- Hono + TypeScript
- TailwindCSS
- Cloudflare D1 Database
- PM2 Process Manager

### Local Development
```bash
# Install dependencies
npm install

# Setup database
npm run db:migrate:local
npm run db:seed

# Build application
npm run build

# Start development server
pm2 start ecosystem.config.cjs

# Check status
pm2 list

# View logs
pm2 logs --nostream
```

### Production Deployment
```bash
# Create D1 database
npx wrangler d1 create webapp-production

# Apply migrations to production
npm run db:migrate:prod

# Deploy to Cloudflare Pages
npm run deploy:prod
```

## Cadangan Pembangunan Seterusnya

### 🔄 Ciri-ciri Yang Belum Dilaksanakan

#### Pengurusan Pengguna (Admin)
- Tambah pengguna baru
- Edit maklumat pengguna
- Tukar password
- Aktif/nyahaktif akaun

#### Pengurusan Homeroom (Admin)
- Tambah homeroom baru
- Edit maklumat homeroom
- Hapus homeroom

#### Pelaporan & Analisis
- Export laporan ke PDF
- Export laporan ke Excel
- Statistik terperinci (grafik & carta)
- Laporan bulanan/tahunan

#### Lampiran Fail
- Upload lampiran (gambar, PDF)
- Download lampiran
- Delete lampiran

#### Notifikasi
- Email notification untuk laporan baru
- Push notification

#### Carian & Penapis
- Carian mengikut kata kunci
- Penapis mengikut tarikh
- Penapis mengikut status

#### Keselamatan
- Password hashing (bcrypt)
- JWT authentication
- Session timeout
- Password reset functionality

## Catatan Penting

1. **Database**: Menggunakan Cloudflare D1 (SQLite) dengan local development mode
2. **Authentication**: Menggunakan simple authentication (untuk production perlu implement JWT dan password hashing)
3. **Storage**: Untuk lampiran fail, perlu setup Cloudflare R2 bucket
4. **Security**: Password dalam database belum di-hash (untuk demo sahaja)

## Kemaskini Terakhir
9 Februari 2026

---

Dibangunkan untuk MRSM Ranau dengan ❤️
