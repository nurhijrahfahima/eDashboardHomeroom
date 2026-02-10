# E-Dashboard Laporan Homeroom MRSM Ranau

## Gambaran Projek
E-Dashboard Laporan Homeroom untuk MRSM Ranau adalah sistem pengurusan laporan homeroom yang komprehensif dengan **DUA BAHAGIAN BERASINGAN**:

### 🟢 **Bahagian Pengguna** 
**Untuk Guru Homeroom**
- Lihat laporan homeroom mereka
- Filter mengikut jenis laporan
- Lihat butiran lengkap
- Dashboard statistik
- **Akses**: Read-only (lihat sahaja)

### 🔵 **Bahagian Admin**
**Untuk Pentadbir**
- Urus SEMUA laporan homeroom
- Tambah, edit, hapus laporan
- Lihat laporan semua homeroom
- Dashboard penuh statistik
- **Akses**: Full control (CRUD)

## URLs
- **Halaman Utama**: https://3000-i7nkasdlhthnnls3d1hzr-8f57ffe2.sandbox.novita.ai
- **Login Pengguna**: https://3000-i7nkasdlhthnnls3d1hzr-8f57ffe2.sandbox.novita.ai/pengguna/login
- **Login Admin**: https://3000-i7nkasdlhthnnls3d1hzr-8f57ffe2.sandbox.novita.ai/admin/login
- **GitHub**: (Akan dikemaskini selepas push)

## Struktur Aplikasi

### 🏠 **Halaman Utama** (`/`)
Landing page dengan 2 pilihan:
- **Card Bahagian Pengguna** (hijau) → untuk guru homeroom
- **Card Bahagian Admin** (biru) → untuk pentadbir

### 🟢 **Bahagian Pengguna**
- **Login**: `/pengguna/login` - Halaman login khusus pengguna
- **Dashboard**: `/pengguna` - Panel pengguna selepas login
- **Warna tema**: Hijau/Green
- **Akses**: Read-only, lihat laporan sahaja

### 🔵 **Bahagian Admin**
- **Login**: `/admin/login` - Halaman login khusus admin
- **Dashboard**: `/admin` - Panel admin selepas login
- **Warna tema**: Indigo/Blue
- **Akses**: Full control, CRUD semua laporan

## Ciri-ciri Utama

### ✅ Ciri-ciri Yang Telah Siap

#### Sistem Navigasi
- ✅ Landing page dengan 2 bahagian yang jelas
- ✅ Login pages berasingan untuk Pengguna dan Admin
- ✅ Role-based access control
- ✅ Back button untuk kembali ke halaman utama

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

### 🟢 Bahagian Pengguna (Guru Homeroom)
- **Tiada password diperlukan!**
- Hanya pilih nama guru dari dropdown senarai
- Senarai mengandungi semua 28 guru homeroom
- Dikelompokkan mengikut tingkatan

### 🔵 Bahagian Admin (Pentadbir)
- Username: `JKUPHRMRSMR`
- Password: `UPHRMRSMRanau`
- Akses: Penuh (CRUD semua laporan)

## Data Homeroom

Sistem mengandungi **28 homeroom** merangkumi semua tingkatan dengan guru homeroom masing-masing:

### Tingkatan 1 (6 Homeroom)
1. Homeroom 1A - Ustaz Firdaus
2. Homeroom 1B - Cikgu Dayang
3. Homeroom 1C - Cikgu Ady
4. Homeroom 1D - Cikgu Dominic
5. Homeroom 1E - Cikgu Ismail
6. Homeroom 1F - Cikgu Kylie

### Tingkatan 2 (5 Homeroom)
1. Homeroom 2A - Cikgu Nelson
2. Homeroom 2B - Cikgu Nurhijrah
3. Homeroom 2C - Ustaz Izzat
4. Homeroom 2D - Cikgu Norazliana
5. Homeroom 2E - Cikgu Noorfitri

### Tingkatan 3 (6 Homeroom)
1. Homeroom 3A - Cikgu Noorhayani
2. Homeroom 3B - Cikgu Amira
3. Homeroom 3C - Cikgu Jasman
4. Homeroom 3D - Cikgu Asrul
5. Homeroom 3E - Cikgu Sharin
6. Homeroom 3F - Cikgu Noorhaineh

### Tingkatan 4 (6 Homeroom)
1. Homeroom 4A - Cikgu Celestine
2. Homeroom 4B - Cikgu Amran
3. Homeroom 4C - Cikgu Rafidah
4. Homeroom 4D - Cikgu Juliah
5. Homeroom 4E - Cikgu Hilmi
6. Homeroom 4F - Cikgu Aphelmina

### Tingkatan 5 (5 Homeroom)
1. Homeroom 5A - Cikgu Azlan
2. Homeroom 5B - Cikgu Azwa
3. Homeroom 5C - Cikgu Audry
4. Homeroom 5D - Cikgu Faishal
5. Homeroom 5E - Cikgu Amanina

## Struktur Database

### Jadual Users
- id, username, password, nama_penuh, role, created_at

### Jadual Homeroom
- id, nama_homeroom, tingkatan, tahun_akademik, nama_guru, created_at

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

### 🏠 Langkah 1: Halaman Utama
1. Buka URL aplikasi
2. Pilih bahagian yang sesuai:
   - **Bahagian Pengguna** (hijau) - untuk guru homeroom
   - **Bahagian Admin** (biru) - untuk pentadbir

### 🟢 Untuk Pengguna (Guru Homeroom)
1. Klik **"Masuk Bahagian Pengguna"**
2. **Pilih nama guru** dari dropdown (dikelompokkan mengikut tingkatan)
3. Klik "Masuk Panel" - **Tiada password diperlukan!**
4. Lihat dashboard dengan statistik
5. Filter laporan mengikut homeroom atau jenis
6. Klik "Lihat Butiran" untuk baca laporan penuh

### 🔵 Untuk Admin (Pentadbir)
1. Klik **"Masuk Bahagian Admin"**
2. Login dengan credentials admin
3. Lihat dashboard dengan statistik lengkap
4. **Tambah Laporan**: Klik butang "Tambah Laporan Baru"
5. **Edit Laporan**: Klik ikon edit (hijau) pada laporan
6. **Hapus Laporan**: Klik ikon hapus (merah) - laporan akan diarkibkan
7. **Lihat Butiran**: Klik ikon mata (biru) untuk lihat butiran penuh
8. **Filter**: Gunakan dropdown untuk filter mengikut homeroom atau jenis

## Perbezaan Bahagian Pengguna vs Admin

| Ciri | Bahagian Pengguna | Bahagian Admin |
|------|-------------------|----------------|
| **Warna Tema** | 🟢 Hijau | 🔵 Biru |
| **Login URL** | `/pengguna/login` | `/admin/login` |
| **Login Method** | ✅ Pilih nama guru sahaja | 🔐 Username + Password |
| **Password** | ❌ Tidak perlu | ✅ Ya |
| **Lihat Laporan** | ✅ Ya | ✅ Ya |
| **Tambah Laporan** | ❌ Tidak | ✅ Ya |
| **Edit Laporan** | ❌ Tidak | ✅ Ya |
| **Hapus Laporan** | ❌ Tidak | ✅ Ya |
| **Filter** | ✅ Ya | ✅ Ya |
| **Dashboard** | ✅ Statistik | ✅ Statistik Penuh |
| **Akses** | Read-only | Full Control |

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

---

## ✅ LATEST UPDATES (10 Feb 2026)

### 🎉 BORANG SENARAI AHLI HOMEROOM - COMPLETED!
**Route**: `/ahli-homeroom`

**Full CRUD Operations**:
- ✅ CREATE - Tambah ahli baru dengan auto-increment bilangan
- ✅ READ - List semua ahli homeroom + get single ahli
- ✅ UPDATE - Kemaskini maklumat ahli
- ✅ DELETE - Buang ahli

**11 Fields**:
1. Maklumat Asas (6): Nama, No. Maktab, Jantina, Kelas, Jawatan Homeroom, No. Bilik
2. Unit Beruniform (3): Unit, Jawatan, Jawatan Lain
3. Kelab/Persatuan (3): Kelab, Jawatan, Jawatan Lain
4. Sukan/Permainan (3): Sukan, Jawatan, Jawatan Lain
5. SKP (2): Sekretariat, Jawatan

**API Endpoints**:
```
GET    /api/ahli/:homeroom_id       - List semua ahli
GET    /api/ahli/:homeroom_id/:id   - Get ahli by ID
POST   /api/ahli                    - Tambah ahli baru
PUT    /api/ahli/:id                - Update ahli
DELETE /api/ahli/:id                - Hapus ahli
```

### 📊 Progress Summary
- **Panel Pengguna Dashboard**: ✅ 100% Complete
- **Borang Senarai Ahli**: ✅ 100% Complete (CRUD fully functional)
- **3 Borang Lagi**: 🚧 Placeholder (akan dibangunkan)
- **Panel Admin**: ✅ 100% Complete
- **Database**: ✅ Complete dengan migrations
- **API Endpoints**: ✅ All working

### 🎯 Next Steps (Optional)
1. Develop 3 remaining forms (Laporan Mingguan, Pencapaian, Aktiviti)
2. Deploy to Cloudflare Pages
3. Add more features as required


---

## ✅ UPDATE TERBARU (10 Feb 2026 - Part 2)

### 🎉 BORANG LAPORAN MINGGUAN HOMEROOM - COMPLETE!
**Route**: `/laporan-mingguan`

**Full CRUD Operations**: ✅
- CREATE - Auto pertemuan_ke increment
- READ - List + Single item view
- UPDATE - Edit existing laporan
- DELETE - Remove laporan

**20 Fields Lengkap**:
1. **Maklumat Homeroom** (8): Nama (autofill), Tarikh (calendar), Hari (auto), Masa (24h), Tempat, Pertemuan ke (auto), Kehadiran (auto), Ketidakhadiran (dynamic list)
2. **Kandungan** (3): Tema, Tajuk, Penerangan
3. **Galeri** (2): URL, Caption (optional)
4. **Refleksi** (2): Pelajar (500 words), Guru (500 words)
5. **Metadata** (2): Disediakan oleh (autofill Setiausaha), Disemak oleh (autofill Guru)

**Auto-fill Features**:
- ✅ Nama Homeroom → from logged-in user
- ✅ Hari → auto from tarikh selection  
- ✅ Pertemuan ke → auto-increment from database
- ✅ Kehadiran → auto-calculate from ketidakhadiran
- ✅ Disediakan Oleh → auto from Setiausaha ahli
- ✅ Disemak Oleh → auto from Guru Penasihat

**Dynamic Features**:
- ✅ Ketidakhadiran dropdown dengan Add button
- ✅ Multiple ketidakhadiran support
- ✅ Auto kehadiran calculation
- ✅ View modal dengan full details
- ✅ Edit & Delete actions

**API Testing Results**:
```
✅ CREATE - Pertemuan ke auto-increment (1, 2, 3...)
✅ READ   - List all + Get single
✅ UPDATE - All fields updateable
✅ DELETE - Soft delete working
✅ Frontend - Full CRUD via UI
```

### 📊 Overall Progress
- **Borang Senarai Ahli**: ✅ 100% Complete
- **Borang Laporan Mingguan**: ✅ 100% Complete
- **Borang Pencapaian**: 🚧 Placeholder
- **Borang Aktiviti Tahunan**: 🚧 Placeholder


---

## 🔗 REPOSITORY & DEPLOYMENT

### GitHub Repository
- **URL**: https://github.com/nurhijrahfahima/eDashboardHomeroom
- **Branch**: main
- **Status**: ✅ Code pushed successfully
- **Commits**: 11+ commits with full history

### Git Commands
```bash
# Clone repository
git clone https://github.com/nurhijrahfahima/eDashboardHomeroom.git

# Pull latest changes
git pull origin main

# Push changes
git add .
git commit -m "Your message"
git push origin main
```

---

