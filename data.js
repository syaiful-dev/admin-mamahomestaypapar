/* ==========================================================================
   Mama Homestay Admin - lapisan data
   --------------------------------------------------------------------------
   Sekarang dashboard guna DATA DUMMY di bawah. Bila anda sedia untuk membaca
   data sebenar dari Google Sheet, lihat bahagian "SAMBUNGAN GOOGLE SHEET" di
   bawah sekali. Struktur data kekal sama supaya dashboard tidak perlu diubah.
   ========================================================================== */

const CURRENCY = "RM";

/* Bilangan malam tersedia setiap bulan (untuk kira kadar penghunian).
   Contoh: 1 unit rumah x bilangan hari dalam bulan. Ubah ikut keadaan sebenar. */
function nightsAvailable(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate(); // hari dalam bulan
}

/* Data dummy mengikut tahun. Setiap bulan: pendapatan, bilangan tempahan,
   malam ditempah. Perbelanjaan & tempahan disenaraikan berasingan. */
const DUMMY = {
  2026: {
    monthly: [
      { income: 4200, bookings: 7, nights: 14 },
      { income: 3800, bookings: 6, nights: 12 },
      { income: 5600, bookings: 9, nights: 19 },
      { income: 6100, bookings: 10, nights: 21 },
      { income: 5200, bookings: 8, nights: 17 },
      { income: 7400, bookings: 12, nights: 26 },
      { income: 8100, bookings: 13, nights: 28 },
      { income: 6800, bookings: 11, nights: 23 },
      { income: 5900, bookings: 9, nights: 20 },
      { income: 6400, bookings: 10, nights: 22 },
      { income: 0, bookings: 0, nights: 0 },
      { income: 0, bookings: 0, nights: 0 },
    ],
    expenses: [
      { date: "2026-10-03", category: "Elektrik", desc: "Bil TNB", amount: 320 },
      { date: "2026-10-05", category: "Air", desc: "Bil air", amount: 85 },
      { date: "2026-10-08", category: "Pembersihan", desc: "Khidmat pencuci", amount: 450 },
      { date: "2026-10-12", category: "Penyelenggaraan", desc: "Baiki penghawa dingin", amount: 280 },
      { date: "2026-10-18", category: "Kelengkapan", desc: "Tuala & cadar baharu", amount: 360 },
      { date: "2026-10-22", category: "Internet", desc: "Langganan Wi-Fi", amount: 139 },
      { date: "2026-10-26", category: "Pemasaran", desc: "Iklan media sosial", amount: 150 },
    ],
    bookings: [
      { guest: "Encik A", pkg: "Full House", checkin: "2026-10-04", nights: 2, amount: 700, status: "Lunas" },
      { guest: "Puan B", pkg: "Additional Ruang Tamu", checkin: "2026-10-11", nights: 1, amount: 750, status: "Lunas" },
      { guest: "Encik C", pkg: "Full House", checkin: "2026-10-18", nights: 3, amount: 1050, status: "Deposit" },
      { guest: "Cik D", pkg: "Full House", checkin: "2026-10-25", nights: 2, amount: 700, status: "Lunas" },
      { guest: "Encik E", pkg: "Additional Ruang Tamu", checkin: "2026-11-01", nights: 1, amount: 750, status: "Tertunggak" },
    ],
  },
  2025: {
    monthly: [
      { income: 3100, bookings: 5, nights: 10 },
      { income: 2800, bookings: 4, nights: 9 },
      { income: 4200, bookings: 7, nights: 15 },
      { income: 4800, bookings: 8, nights: 16 },
      { income: 3900, bookings: 6, nights: 13 },
      { income: 5600, bookings: 9, nights: 20 },
      { income: 6200, bookings: 10, nights: 22 },
      { income: 5100, bookings: 8, nights: 18 },
      { income: 4400, bookings: 7, nights: 15 },
      { income: 4900, bookings: 8, nights: 17 },
      { income: 5300, bookings: 9, nights: 19 },
      { income: 6700, bookings: 11, nights: 24 },
    ],
    expenses: [
      { date: "2025-12-02", category: "Elektrik", desc: "Bil TNB", amount: 300 },
      { date: "2025-12-06", category: "Air", desc: "Bil air", amount: 78 },
      { date: "2025-12-10", category: "Pembersihan", desc: "Khidmat pencuci", amount: 420 },
      { date: "2025-12-15", category: "Penyelenggaraan", desc: "Servis am", amount: 200 },
      { date: "2025-12-20", category: "Kelengkapan", desc: "Peralatan dapur", amount: 260 },
    ],
    bookings: [
      { guest: "Encik F", pkg: "Full House", checkin: "2025-12-05", nights: 2, amount: 700, status: "Lunas" },
      { guest: "Puan G", pkg: "Full House", checkin: "2025-12-20", nights: 4, amount: 1400, status: "Lunas" },
    ],
  },
};

const MONTHS_MS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];

/* --------------------------------------------------------------------------
   API data yang digunakan oleh app.js. Memulangkan Promise supaya mudah
   ditukar kepada panggilan rangkaian (Google Sheet) nanti.
   -------------------------------------------------------------------------- */
const DataAPI = {
  isLive: false,

  async getYear(year) {
    // DUMMY: pulangkan terus. (Lihat loadFromGoogleSheet di bawah untuk data sebenar.)
    const y = DUMMY[year] || DUMMY[2026];
    return Promise.resolve({
      year,
      months: MONTHS_MS,
      monthly: y.monthly,
      expenses: y.expenses,
      bookings: y.bookings,
      nightsAvailable: MONTHS_MS.map((_, i) => nightsAvailable(year, i)),
    });
  },
};

/* --------------------------------------------------------------------------
   SAMBUNGAN GOOGLE SHEET (untuk kemudian)
   --------------------------------------------------------------------------
   Cara paling mudah & percuma, tanpa kunci API:
   1. Buka Google Sheet anda.
   2. File > Share > Publish to web > pilih sheet > format CSV > Publish.
   3. Salin pautan CSV, letak di SHEET_CSV_URL di bawah.
   4. Tukar DataAPI.getYear untuk memanggil loadFromGoogleSheet().

   Contoh ringkas membaca CSV:

     const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/XXXX/pub?gid=0&single=true&output=csv";

     async function loadFromGoogleSheet() {
       const res = await fetch(SHEET_CSV_URL);
       const text = await res.text();
       return parseCSV(text); // tukar kepada struktur { monthly, expenses, bookings }
     }

   Nota keselamatan: "Publish to web" menjadikan data boleh dibaca sesiapa yang
   ada pautan. Jangan letak maklumat sensitif. Untuk data peribadi/privasi,
   gunакан backend kecil (contoh: Google Apps Script yang memerlukan token).
   -------------------------------------------------------------------------- */
