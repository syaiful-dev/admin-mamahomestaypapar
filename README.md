# Mama Homestay - Dashboard Admin (DUMMY)

Dashboard admin untuk Mama Homestay Papar. Berfungsi di desktop dan telefon.
Semua data sekarang adalah **contoh (dummy)** sehingga disambung ke Google Sheet.

## Ciri

- **Ringkasan (KPI):** jumlah pendapatan, perbelanjaan, untung bersih, kadar
  penghunian (occupancy).
- **Carta:** pendapatan vs perbelanjaan 12 bulan, dan perbelanjaan ikut kategori.
- **Laporan pendapatan bulanan** (jadual + jumlah).
- **Kira-kira perbelanjaan** (jadual + jumlah).
- **Tempahan terkini** dengan status bayaran (Lunas / Deposit / Tertunggak).
- **Penapis** tahun dan bulan.
- **Muat turun PDF** dan **CSV** laporan.

## Fail

| Fail         | Fungsi                                                   |
|--------------|----------------------------------------------------------|
| `index.html` | Struktur dashboard                                       |
| `styles.css` | Rupa dan susun atur (responsif)                          |
| `data.js`    | Data dummy + tempat sambungan Google Sheet (lihat dalam) |
| `app.js`     | Logik: KPI, carta, jadual, eksport PDF/CSV, skrin kunci  |

Pustaka luar (Chart.js, jsPDF) dimuat dari CDN percuma — perlukan internet.

## Lihat di komputer

Klik dua kali `index.html`. Passcode contoh: **1234**.

## Sambung ke Google Sheet (data sebenar)

Dalam `data.js`, bahagian **"SAMBUNGAN GOOGLE SHEET"** menerangkan langkah:
1. Google Sheet > File > Share > Publish to web > pilih sheet > format CSV.
2. Salin pautan CSV, letak dalam `SHEET_CSV_URL`.
3. Tukar `DataAPI.getYear` untuk membaca CSV itu.

Struktur data kekal sama, jadi dashboard tak perlu diubah.

## PENTING: tentang keselamatan

Skrin "passcode" (1234) **bukan keselamatan sebenar**. Laman statik tidak boleh
menyimpan kata laluan dengan selamat — sesiapa yang buka fail boleh lihat kod
dalam `app.js`. Ia hanya penghalang ringan.

Untuk dashboard yang mengandungi data kewangan sebenar:
- Jangan "Publish to web" data sensitif (ia jadi boleh dibaca umum).
- Gunakan backend kecil (contoh: Google Apps Script dengan token, atau
  perkhidmatan seperti Netlify Identity / Cloudflare Access) untuk log masuk
  sebenar. Saya boleh bantu sediakan bila anda sedia.

Buat masa ini, kerana ia dashboard dummy, elakkan menyiarkannya secara awam
dengan data sebenar sehingga log masuk sebenar disediakan.

## Cadangan tambahan (boleh buat kemudian)

- Kalendar tempahan visual (bukan jadual sahaja).
- Peringatan check-in/check-out hari ini.
- Pengiraan automatik dari tempahan ke pendapatan bulanan.
- Carta untung bersih bulanan.
