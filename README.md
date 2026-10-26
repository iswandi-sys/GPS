# NAVIGASI LAUT SR 🚢⚓

**Aplikasi Navigasi Maritim Khusus Nelayan Wilayah Sulawesi, Nusa Tenggara, dan Sekitarnya.**
Terinspirasi dari kebutuhan navigasi kapal nelayan tradisional dan kepraktisan All-In-One Offline Maps.

---

## 📱 Tautan Unduh Berkas APK Android
- **Unduh Rilis APK Terbaru**: [GitHub Releases](https://github.com/iswandi-sys/GPS/releases)
- **Status Kompilasi Otomatis**: [GitHub Actions](https://github.com/iswandi-sys/GPS/actions)

---

## 🌟 Fitur Utama

1. **Menu Navigasi Real-Time**
   - Posisi GPS kapal aktual dengan pembaruan instan.
   - Ikon kapal yang dapat diganti: *Perahu Katir / Sandeq Bugis-Makassar-Mandar*, *Kapal Motor Kayu Jolloro/Patorani*, *Speedboat Cepat*, dan *Pamboat*.
   - Kompas rotasi kapal mengikuti arah haluan (COG / Course Over Ground).
   - Garis rute langsung dari posisi kapal ke titik rumpon tujuan.
   - Jarak dalam **Mil Laut (nmi)**, kecepatan dalam **Knot (kn)**, arah tujuan (derajat °), dan estimasi waktu tiba (ETA).
   - Watermark navigasi maritim sudut kanan atas: `ISWANDI` (opacity 30%).

2. **Explorer Mode (HUD Layar Penuh Nelayan)**
   - Desain kontras ultra tinggi yang jelas terbaca di bawah terik sinar matahari laut maupun malam hari.
   - Jarum koreksi kemudi kapal: **Kiri (Port - Merah)** vs **Kanan (Starboard - Hijau)** vs **Lurus Mantap (Hijau Neon)**.
   - Tipografi angka raksasa untuk kecepatan, jarak, dan waktu tiba.

3. **Menu Titik Saya (Manajemen Rumpon & Spot Ikan)**
   - Tandai titik dengan 1 sentuhan cepat menggunakan koordinat GPS kapal saat ini.
   - Dukungan koordinat manual dua arah: **Decimal Degrees (DD)** dan **Degrees Minutes Seconds (DMS)**.
   - Kategori lengkap: *Rumpon*, *Lokasi Ikan*, *Pelabuhan*, *Lokasi Berbahaya*, *Tempat Berlindung*, dan *Lokasi Pribadi*.
   - Lampiran foto kamera rumpon dan catatan kedalaman yang disimpan aman di memori lokal.

4. **Menu Peta Offline Sejati**
   - Pilihan wilayah cepat: Selat Makassar & Spermonde, Teluk Bone & Selat Selayar, Laut Flores & Komodo, Laut Banda & Wakatobi, serta Laut Sawu NTT.
   - Tingkat detail: Hemat (Zoom 6-9), Standar (Zoom 6-11), dan Tinggi (Zoom 6-12).
   - Mesin pengunduh tile nyata yang menyimpan potongan peta ke memori IndexedDB HP.
   - Pengelola penyimpanan dengan indikator MB dan tombol pembersihan cache.

5. **Menu Cuaca Laut & Gelombang (Open-Meteo)**
   - Tinggi gelombang laut dan arah ombak per jam & harian.
   - Kecepatan dan arah hembusan angin maritim.
   - Suhu permukaan air laut.
   - Evaluasi keselamatan pelayaran BMKG (Tenang, Rendah, Sedang, Tinggi, Dilarang Melaut).
   - Otomatis tersimpan secara offline agar tetap dapat dibaca di tengah laut tanpa sinyal seluler.

6. **Panduan Suara Kemudi Nelayan (TTS Indonesia)**
   - Pemberitahuan suara otomatis: *"Target berada di sebelah kiri, koreksi arah ke kiri 20 derajat"*, *"Haluan mantap, pertahankan arah"*, *"Peringatan: 500 meter mendekati rumpon tujuan"*.

7. **Berbagi Lokasi Antar-HP Nelayan**
   - Ekspor dan impor data titik menggunakan format **GPX 1.1**, **GeoJSON**, dan **JSON**.
   - Penanganan duplikasi cerdas: *Lewati*, *Timpa*, atau *Simpan sebagai Salinan Baru*.

---

## 🛠️ Arsitektur & Teknologi

- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Engine Peta**: Leaflet dengan custom `OfflineAwareTileLayer` yang membaca tile dari IndexedDB
- **Penyimpanan Lokal**: IndexedDB (`NavigasiLautSR_DB`) untuk waypoints, foto, offline tiles, dan cache cuaca
- **Sensor Native**: Browser Geolocation High Accuracy Watcher & Device Orientation Sensor
- **Suara**: Web Speech API (`id-ID`) + Web Audio API synthesizer
- **Mobile PWA**: Web App Manifest & Service Worker siap instalasi Android
- **Build APK**: GitHub Actions workflow dengan Capacitor & Gradle

---

## 🚀 Menjalankan Secara Lokal

```bash
# Pasang dependensi
npm install

# Jalankan dev server
npm run dev

# Kompilasi aplikasi web
npm run build
```
