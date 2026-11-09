# Mama Homestay - Dashboard Admin (DUMMY)

Dashboard admin untuk Mama Homestay Papar. Berfungsi di desktop dan telefon.
Semua data sekarang adalah **contoh (dummy)** sehingga disambung ke Google Sheet.

## Struktur: setiap tab ialah halaman sendiri

Tiada lagi satu halaman panjang. Setiap tab di sidebar membuka halaman berasingan,
supaya anda hanya nampak satu perkara pada satu masa:

| Halaman         | Kandungan                                                      | Penapis        |
|-----------------|----------------------------------------------------------------|----------------|
| `index.html`    | **Ringkasan**: 4 kad KPI (pendapatan, perbelanjaan, untung bersih, kadar penghunian) + pautan pantas | Tahun, Bulan |
| `income.html`   | **Pendapatan**: laporan pendapatan bulanan + jumlah            | Tahun          |
| `expenses.html` | **Perbelanjaan**: kira-kira perbelanjaan + jumlah              | Tahun, Bulan   |
| `monthly.html`  | **Kira-kira Bulanan**: kira perbelanjaan, gaji, insentif, simpanan dan bonus bulanan | (halaman sendiri) |
| `bookings.html` | **Tempahan**: senarai tempahan + status bayaran (Lunas / Deposit / Tertunggak). Pada telefon setiap tempahan jadi satu kad | Tahun |
| `report.html`   | **Laporan**: ringkasan tempoh dipilih + muat turun PDF dan CSV | Tahun, Bulan   |

Penapis hanya dipaparkan pada halaman yang menggunakannya. Tahun dan bulan yang dipilih
kekal bila anda pindah antara halaman.

## Fail

| Fail         | Fungsi                                                          |
|--------------|-----------------------------------------------------------------|
| `*.html`     | Lima halaman di atas (sidebar yang sama pada setiap halaman)    |
| `styles.css` | Rupa dan susun atur (responsif)                                 |
| `data.js`    | Data dummy + tempat sambungan Google Sheet (lihat dalam)        |
| `app.js`     | Logik dikongsi: log masuk, penapis, jadual, KPI, eksport PDF/CSV |

Pustaka luar jsPDF (untuk muat turun PDF, hanya dimuat pada `report.html`) datang dari CDN
percuma, jadi muat turun PDF perlukan internet.

## Lihat di komputer

Klik dua kali `index.html`. Passcode contoh: **1234**.
Jika anda buka halaman lain (contoh `income.html`) terus tanpa log masuk, ia akan
menghantar anda ke skrin passcode dahulu, kemudian kembali ke halaman itu.

## Sambung ke Google Sheet (data sebenar)

Dalam `data.js`, bahagian **"SAMBUNGAN GOOGLE SHEET"** menerangkan langkah:
1. Google Sheet > File > Share > Publish to web > pilih sheet > format CSV.
2. Salin pautan CSV, letak dalam `SHEET_CSV_URL`.
3. Tukar `DataAPI.getYear` untuk membaca CSV itu.

Struktur data kekal sama, jadi halaman tak perlu diubah.

## PENTING: tentang keselamatan

Skrin "passcode" (1234) **bukan keselamatan sebenar**. Laman statik tidak boleh
menyimpan kata laluan dengan selamat: sesiapa yang buka fail boleh lihat kod
dalam `app.js`, dan boleh terus buka `income.html` atau `data.js` tanpa passcode.
Ia hanya penghalang ringan.

Untuk dashboard yang mengandungi data kewangan sebenar:
- Jangan "Publish to web" data sensitif (ia jadi boleh dibaca umum).
- Gunakan perlindungan di sisi pelayan, contohnya **Cloudflare Pages + Cloudflare Access**
  (percuma sehingga 50 pengguna), supaya hanya email yang dibenarkan boleh membuka
  mana-mana halaman.

Buat masa ini, kerana ia dashboard dummy, elakkan menyiarkannya secara awam dengan data
sebenar sehingga log masuk sebenar disediakan.

## Cadangan tambahan (boleh buat kemudian)

- Kalendar tempahan visual (bukan jadual sahaja).
- Peringatan check-in/check-out hari ini.
- Pengiraan automatik dari tempahan terus ke pendapatan bulanan.
- Jadual untung bersih bulanan.

## Kira-kira Bulanan (`monthly.html` + `monthly.js`)

Mengira perbelanjaan, gaji, insentif, utiliti, simpanan dan bonus untuk satu bulan.

**Isi setiap bulan:** Pendapatan (A), bilangan cleaning half (B), bilangan cleaning full (C).
Jika A dibiarkan kosong, ia diambil daripada tab Pendapatan untuk bulan itu. B dan C kosong = 0.

**Pengiraan** (ikut nombor 1 hingga 8):

| # | Item | Formula |
|---|------|---------|
| 1 | Pendapatan | A |
| 2 | Inventori | 10% x A |
| 3 | Cleaning | B x RM50 + C x RM80 |
| 4 | Gaji | Umi 8%, Nina 12%, Mama 14%, Epul 8% (daripada A) |
| 6 | Insentif bulanan | Jika A >= RM3,500: Umi +RM100, Epul +RM100 |
| 7 | Utiliti | Sampah 70 + Elektrik + Air + Rumput + Wifi 94.35 + Cuckoo 60 |
| 8 | Simpanan | 20% x A |
| | **D** (jumlah perbelanjaan) | 2 + 3 + 4 + 6 + 7 + 8 |
| 5 | **Bonus** | A - D |

**Pemboleh ubah dan nilai lalai:** setiap kadar/nilai dalam jadual ialah kotak yang boleh diisi.
Kosongkan kotak untuk guna nilai lalai (ditunjuk dalam kotak). Elektrik, Air dan Rumput tiada
nilai lalai (kosong = 0).

**Ubah nilai lalai:** edit `DEFAULTS` di bahagian atas `monthly.js`. Bulan yang sudah disimpan
menyimpan salinan nilai lalai ketika itu, jadi mengubah `DEFAULTS` tidak mengubah bulan lama.

**Simpanan data:** disimpan secara automatik dalam pelayar ini (localStorage), satu rekod setiap
bulan. Data tidak dikongsi antara peranti dan boleh hilang jika data pelayar dibersihkan, jadi
guna butang **Eksport sandaran** secara berkala dan **Import sandaran** untuk pulihkan.
Apabila disambung ke Google Sheet nanti, simpanan ini boleh ditukar tanpa mengubah pengiraan.
