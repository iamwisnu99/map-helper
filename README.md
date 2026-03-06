# 🚀 PrimaDev - MAP Helper (Hybrid Dashboard)

Monitoring transaksi NIK LPG 3kg pada portal MAP Pertamina secara otomatis untuk menghindari uji petik dan memudahkan manajemen pangkalan.

## ✨ Fitur Utama
- **Hybrid Platform**: Berfungsi sebagai **Ekstensi Chrome** (Operasional) dan **Web Dashboard** (Monitoring Online).
- **Cloud Sync**: Profil agen dan PIN keamanan tersinkronisasi otomatis via Supabase.
- **Smart Monitoring**: Deteksi otomatis limit NIK (10 tabung) berdasarkan histori transaksi.
- **Laporan PDF Profesional**: Cetak laporan transaksi pangkalan dengan kop surat otomatis.
- **Aman & Privat**: Dilengkapi dengan sistem PIN keamanan untuk akses dashboard.

## 🛠️ Struktur Proyek
- `/js`: Logika aplikasi, helper storage, dan konfigurasi.
- `/assets`: Aset gambar, logo Pertamina, dan icon.
- `index.html`: Halaman Login utama (Netlify Entry Point).
- `dashboard.html`: Halaman utama manajemen data.
- `manifest.json`: Konfigurasi untuk Ekstensi Chrome.

## 🌐 Deployment ke Netlify
Aplikasi ini dirancang untuk dapat dideploy ke Netlify agar bisa dipantau dari HP/perangkat lain secara online.

### Konfigurasi Build:
Gunakan perintah berikut di Build Settings Netlify:
```bash
sed -i "s/__SUPABASE_URL__/$SUPABASE_URL/g" js/config.js && sed -i "s/__SUPABASE_ANON_KEY__/$SUPABASE_ANON_KEY/g" js/config.js
```

### Environment Variables:
Pastikan Anda menambahkan variabel berikut di Netlify:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 🧩 Cara Install sebagai Ekstensi
1. Download repository ini.
2. Buka Chrome dan akses `chrome://extensions/`.
3. Aktifkan **Developer Mode** di pojok kanan atas.
4. Klik **Load unpacked** dan pilih folder proyek ini.

## 📝 SQL Setup (Supabase)
Jalankan perintah ini di SQL Editor Supabase untuk mengaktifkan fitur Cloud Sync Profil:

```sql
create table agent_profiles (
  id uuid references auth.users not null primary key,
  name text,
  phone text,
  address text,
  owner_name text,
  admin_pin text default '123456',
  updated_at timestamp with time zone default now()
);

alter table agent_profiles enable row level security;
create policy "Individual access" on agent_profiles for all using (auth.uid() = id);
```

---
Developed with ❤️ by **PrimaDev**
