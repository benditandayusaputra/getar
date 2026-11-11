# Verifikasi modul Ayun

| ID | Skenario | Hasil simulasi | Nilai acuan | Galat | Target | Status |
|---|---|---|---|---|---|---|
| A1a | SDOF getaran bebas teredam: periode teredam T_d (Δt = 0,01 s) | 0,99503 s | 0,99470 s | 0,0329 % | < 0,5% | Lolos |
| A1b | SDOF getaran bebas teredam: galat maksimum u(t) selama 10 s | 1,23e-4 m | solusi analitik | 0,2455 % u₀ | < 1% u₀ | Lolos |
| A1c | SDOF getaran bebas teredam: rasio amplitudo setelah 5 siklus | 0,20769 | 0,20747 | 0,1046 % | < 1% | Lolos |
| A2 | Konvergensi Newmark terhadap Δt (0,05 sampai 0,001 s): orde galat | 1,998 | 2 (teori) | 0,0023 selisih orde | orde ≈ 2 (± 0,2) | Lolos |
| A3 | Frekuensi alami gedung 5 lantai (default) dari symGenEig | 2,0259; 5,9135; 9,3221; 11,9755; 13,6586 Hz | 2,0259; 5,9135; 9,3221; 11,9755; 13,6586 Hz | 6,58e-14 % (maks) | < 0,01% | Lolos |
| A4 | Pemanjangan periode mode 1 oleh Newmark (Δt = 0,01 s, tanpa redaman) | T = 0,49428 s (+0,1349%) | T₁ = 0,49361 s, teori (ωΔt)²/12 = +0,1350% | 1,43e-4 poin % | selisih < 0,01 poin % | Lolos |
| A5 (r = 0,5) | Faktor pembesaran tunak SDOF terhadap percepatan tanah sinus | 1,3304 | 1,3304 | 2,15e-4 % | < 1% | Lolos |
| A5 (r = 0,9) | Faktor pembesaran tunak SDOF terhadap percepatan tanah sinus | 4,7569 | 4,7565 | 0,0072 % | < 1% | Lolos |
| A5 (r = 1,0) | Faktor pembesaran tunak SDOF terhadap percepatan tanah sinus | 9,9999 | 10,0000 | 0,0013 % | < 1% | Lolos |
| A5 (r = 1,1) | Faktor pembesaran tunak SDOF terhadap percepatan tanah sinus | 4,2176 | 4,2182 | 0,0149 % | < 1% | Lolos |
| A5 (r = 2,0) | Faktor pembesaran tunak SDOF terhadap percepatan tanah sinus | 0,3325 | 0,3326 | 0,0142 % | < 1% | Lolos |
| A6 | Kekekalan energi tanpa redaman, 5 lantai, 100 s (10.000 langkah) | 4,95e-13 | 0 (energi konstan) | 4,95e-13 relatif | < 1×10⁻⁶ | Lolos |
| A7 | TMD μ = 2%: rasio penyetelan optimum dari sapuan numerik respons frekuensi 2 DOF | 0,9755 | Warburton 0,9755 (Den Hartog 0,9804) | 0,0023 % | < 1% | Lolos |

## A2: galat maksimum Newmark terhadap Δt

| Δt (s) | galat maks u (m) |
|---|---|
| 0,0500 | 3,03e-3 |
| 0,0200 | 4,91e-4 |
| 0,0100 | 1,23e-4 |
| 0,0050 | 3,07e-5 |
| 0,0010 | 1,23e-6 |

Orde konvergensi (kemiringan log-log): galat maks u (m) = 1,998
