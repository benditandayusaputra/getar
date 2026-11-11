# Getar

**Simulasi Interaktif Getaran dan Resonansi, dari Bilah Gamelan hingga Gedung Tahan Gempa**

| | |
|---|---|
| Nama Tim | [ISI: Nama Tim] |
| Judul Karya | Getar: Simulasi Interaktif Getaran dan Resonansi, dari Bilah Gamelan hingga Gedung Tahan Gempa |
| Kategori | 3. Desain dan Simulasi Fisika (SIM), The Digital Physics Hackathon 2026 |
| Perguruan Tinggi | Universitas Bina Nusantara |
| Demo daring | [ISI: URL Vercel] |
| Video demo | [ISI: link YouTube atau Google Drive] |

---

## 1. Informasi Program

| | |
|---|---|
| Judul Program | Getar |
| Nama File ZIP | `SIM_[ISI: NamaTim]_BINUS_KodeSumber.zip` |
| Bahasa Pemrograman / Platform / Framework | TypeScript; aplikasi web (browser); SvelteKit 3 + Svelte 5 |
| Jenis Karya | Simulasi interaktif dan mini-game edukasi (dua modul: Laras dan Ayun) dengan model komputasi elemen hingga dan integrasi waktu Newmark-β |

**Pustaka (library) dan versi**

| Pustaka | Versi | Kegunaan |
|---|---|---|
| @sveltejs/kit | 3.2.0 | Kerangka aplikasi dan perutean halaman |
| svelte | 5.57.3 | Komponen antarmuka (runes) |
| @sveltejs/adapter-static | 4.0.1 | Keluaran situs statis |
| vite | 8.3.8 | Alat build |
| typescript | 6.0.3 | Bahasa |
| tailwindcss, @tailwindcss/vite | 4.3.5 | Gaya tampilan |
| three | 0.187.0 | Tampilan 3D |
| @lucide/svelte | 1.72.0 | Ikon antarmuka |
| @fontsource-variable/plus-jakarta-sans, @fontsource/jetbrains-mono | 5.3.0 | Huruf (dibundel, jalan tanpa internet) |
| vitest | 5.1.0 | Uji unit |
| tsx | 4.23.15 | Menjalankan skrip verifikasi |

Seluruh perhitungan fisika (aljabar linear, pemecah nilai eigen, Newmark-β, elemen hingga, FFT, sintesis bunyi) ditulis sendiri di `src/lib/engine` dan `src/lib/models`, tanpa pustaka numerik pihak ketiga.

**Ringkasan.** Getar memodelkan dua sistem bergetar dengan satu persamaan, `M ü + C u̇ + K u = F(t)`:

- **Laras**: bilah gamelan sebagai balok Euler-Bernoulli ujung bebas, diselesaikan dengan metode elemen hingga. Pengguna memukul bilah, mendengar bunyinya, dan menyetel 5 bilah ke laras slendro.
- **Ayun**: gedung bertingkat sebagai *shear building* yang diguncang gempa, diselesaikan dengan metode Newmark-β. Pengguna mengamati resonansi dan memasang bracing, peredam, atau *tuned mass damper* (TMD) untuk menyelamatkan gedung.

Halaman **Panel Verifikasi** membandingkan hasil numerik dengan solusi analitik secara langsung di browser (23 kasus uji).

---

## 2. Struktur Folder

```
getar/
├── src/
│   ├── lib/
│   │   ├── engine/        Mesin numerik bersama, tanpa dependensi UI
│   │   │   ├── linalg.ts      Matriks, Cholesky, eliminasi Gauss
│   │   │   ├── eigen.ts       Masalah eigen umum simetris (Cholesky + Jacobi siklik)
│   │   │   ├── newmark.ts     Integrator Newmark-β
│   │   │   ├── damping.ts     Redaman Rayleigh
│   │   │   └── signal.ts      FFT, frekuensi puncak, periode dari zero-crossing
│   │   ├── models/
│   │   │   ├── ayun/      building (K, M, C, respons frekuensi), groundMotion, tmd, drift, sim (loop simulasi), game (mini-game)
│   │   │   └── laras/     beamFem, beamAnalytic, materials, synth (sintesis bunyi), tuning (laras slendro)
│   │   ├── render/        Tampilan 2.5D (Canvas 2D) dan 3D (Three.js) untuk tiap modul
│   │   ├── audio/         Pemutar bunyi (Web Audio API)
│   │   ├── verify/        Kasus uji verifikasi (dipakai halaman /verifikasi dan skrip)
│   │   ├── ui/            Komponen antarmuka (Slider, LineChart, Stat, ModeToggle, Mini)
│   │   └── config.ts      Sakelar mode 3D dan data tim untuk footer
│   └── routes/
│       ├── +page.svelte            Halaman utama (pilih modul)
│       ├── laras/+page.svelte      Modul Laras
│       ├── ayun/+page.svelte       Modul Ayun
│       └── verifikasi/+page.svelte Panel Verifikasi
├── scripts/verify.ts      Menjalankan semua kasus uji dan menulis tabel ke verify-output/
├── tests/                 Uji unit (Vitest)
├── build/                 Hasil build statis, siap dijalankan tanpa build ulang
├── verify-output/         Tabel hasil verifikasi (ayun.md, laras.md, semua.csv)
├── package.json
└── README.md
```

---

## 3. Cara Instalasi dan Menjalankan Program

### Cara tercepat (tanpa instalasi)

Buka demo daring: [ISI: URL Vercel]

### Menjalankan hasil build yang sudah disertakan

Butuh Node.js 18 atau lebih baru. Tidak perlu `npm install`.

```bash
cd getar
npx serve build
```

Buka alamat yang muncul (biasanya `http://localhost:3000`).

### Menjalankan dari kode sumber

Butuh Node.js 22 atau lebih baru.

```bash
cd getar
npm install
npm run dev
```

Buka `http://localhost:5173`.

### Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm run build` | Membuat build statis ke folder `build/` |
| `npm run preview` | Menjalankan hasil build |
| `npm run test` | Menjalankan uji unit (27 uji) |
| `npm run verify` | Menjalankan seluruh kasus verifikasi dan menulis tabel ke `verify-output/` |
| `npm run check` | Pemeriksaan tipe (svelte-check) |

### Cara memakai

1. Di halaman utama, pilih **Laras** atau **Ayun**.
2. Atur parameter dengan slider (bisa juga dengan tombol panah keyboard). Arahkan kursor ke grafik untuk membaca nilainya, klik untuk menguncinya. Gunakan tombol **2.5D / 3D** di kanan atas untuk mengganti tampilan. Di mode 3D, seret untuk memutar kamera.
3. **Laras**: klik bilah untuk memukul (nyalakan suara perangkat). Posisi klik menentukan mode mana yang berbunyi. Klik grafik bentuk mode untuk memukul di titik itu, atau klik puncak spektrum untuk mendengar satu mode saja. Pilih "Setel Laras" untuk mini-game.
4. **Ayun**: pilih jenis gerakan tanah. Tekan "Samakan dengan f₁" atau klik kurva respons frekuensi untuk melihat resonansi, lalu pasang TMD. Di mini-game, klik batang lantai untuk memasang bracing. Pilih "Selamatkan Gedung" untuk mini-game.
5. Buka **Verifikasi** untuk melihat perbandingan hasil simulasi dengan solusi analitik dan mengunduhnya sebagai CSV.

Disarankan memakai Google Chrome, Microsoft Edge, atau Firefox versi terbaru.

---

## 4. Verifikasi

Kasus uji ditulis satu kali di `src/lib/verify/` dan dipakai oleh halaman `/verifikasi` serta `npm run verify`. Hasil lengkap ada di `verify-output/`. Ringkasan (keluaran `npm run verify`):

| ID | Yang diuji | Galat |
|---|---|---|
| A1 | Getaran bebas teredam SDOF terhadap solusi analitik | periode 0,033%; simpangan 0,25% u₀ |
| A2 | Orde konvergensi Newmark-β terhadap Δt | 1,998 (teori 2) |
| A3 | Frekuensi alami gedung 5 lantai terhadap rumus tertutup | 6,6 × 10⁻¹⁴ % |
| A4 | Pemanjangan periode Newmark | 0,1349% (teori 0,1350%) |
| A5 | Faktor pembesaran tunak, r = 0,5 sampai 2,0 | paling besar 0,015% |
| A6 | Penyimpangan energi tanpa redaman, 100 s | 5,0 × 10⁻¹³ |
| A7 | Rasio penyetelan optimum TMD (μ = 2%) terhadap Warburton | 0,002% |
| L1 | f₁, f₂, f₃ bilah, elemen hingga N = 20 terhadap analitik | paling besar 0,006% |
| L2 | Orde konvergensi elemen hingga (N = 8, 16, 32) | 3,97 dan 3,89 (teori 4) |
| L3 | Rasio f₂/f₁ dan f₃/f₁ | paling besar 0,006% |
| L4 | Hukum skala f ∝ h/L² | 3 × 10⁻¹⁰ % |
| L5 | Titik simpul mode 1 | 4 × 10⁻⁷ % L |
| L6 | Puncak FFT bunyi sintesis terhadap f₁ | 0,0004% |

Semua 23 baris kasus lolos.

---

## 5. Batasan Model

- Gedung: *shear building* linear elastis (lantai kaku, tanpa torsi, tanpa interaksi tanah dan struktur, tanpa kerusakan). Batas simpangan antar lantai 0,020 dari SNI 1726:2019 dipakai sebagai acuan edukatif, bukan untuk desain.
- Bilah: balok Euler-Bernoulli seragam (tanpa deformasi geser, tanpa lengkungan atau cekungan penyetel seperti pada bilah asli), redaman modal konstan untuk semua mode.
- Laras slendro diidealkan sebagai 5 nada berjarak sama 240 cents; laras gamelan asli berbeda untuk tiap perangkat.
- Simpangan gedung dan lendutan bilah di layar diperbesar, dan gerak bilah diperlambat. Label skala visual selalu ditampilkan.
