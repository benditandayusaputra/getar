# Verifikasi modul Laras

| ID | Skenario | Hasil simulasi | Nilai acuan | Galat | Target | Status |
|---|---|---|---|---|---|---|
| L1 | f₁, f₂, f₃ FEM N = 20 (perunggu, L = 0,25 m, h = 0,010 m) | 557,60; 1537,06; 3013,39 Hz | 557,60; 1537,03; 3013,20 Hz | 0,0062 % (maks) | < 0,1% | Lolos |
| L2a | Konvergensi FEM terhadap ukuran elemen: orde galat f₁ (rentang asimtotik N = 8, 16, 32) | 3,965 | 4 (teori) | 0,0346 selisih orde | orde ≈ 4 (± 0,5) | Lolos |
| L2b | Konvergensi FEM terhadap ukuran elemen: orde galat f₃ (rentang asimtotik N = 8, 16, 32) | 3,891 | 4 (teori) | 0,1090 selisih orde | orde ≈ 4 (± 0,5) | Lolos |
| L3 (f₂/f₁) | Rasio frekuensi mode (tidak harmonik, ciri khas bilah) | 2,7566 | 2,7565 | 0,0014 % | < 0,1% | Lolos |
| L3 (f₃/f₁) | Rasio frekuensi mode (tidak harmonik, ciri khas bilah) | 5,4042 | 5,4039 | 0,0060 % | < 0,1% | Lolos |
| L4 | Hukum skala f ∝ h/L²: L × 2 → f / 4 | 0,25000 | 0,25000 | 3,11e-10 % | < 0,1% | Lolos |
| L4 | Hukum skala f ∝ h/L²: h × 2 → f × 2 | 2,00000 | 2,00000 | 3,11e-10 % | < 0,1% | Lolos |
| L4 | Hukum skala f ∝ h/L²: b × 2 → f tetap | 1,00000 | 1,00000 | 3,11e-10 % | < 0,1% | Lolos |
| L5 | Titik simpul mode 1 dari FEM (interpolasi Hermite) | 0,2242 L; 0,7758 L | 0,2242 L; 0,7758 L | 3,87e-7 % L | < 0,5% L | Lolos |
| L6 | Puncak FFT bunyi sintesis (pukul di tengah, 44,1 kHz, 2,5 s) | 557,60 Hz | 557,60 Hz (f₁ FEM) | 3,88e-4 % | < 0,2% | Lolos |

## L2: galat relatif frekuensi FEM terhadap ukuran elemen

| l = L/N (m) | galat f₁ | galat f₃ |
|---|---|---|
| 0,1250 | 2,23e-3 | 4,51e-1 |
| 0,0625 | 1,09e-3 | 7,92e-3 |
| 0,0313 | 8,07e-5 | 2,11e-3 |
| 0,0156 | 5,24e-6 | 1,49e-4 |
| 0,0078 | 3,30e-7 | 9,59e-6 |

Orde konvergensi (kemiringan log-log): galat f₁ = 3,965; galat f₃ = 3,891
