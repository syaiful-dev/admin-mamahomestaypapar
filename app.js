/* ==========================================================================
   Mama Homestay Admin - logik dashboard
   Satu fail dikongsi oleh semua halaman (index, income, expenses, bookings,
   report). Setiap halaman hanya menjalankan bahagian yang ada elemennya.
   ========================================================================== */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

const DEMO_PASSCODE = "1234"; // lihat README: ini BUKAN keselamatan sebenar
const NEXT_PAGES = ["income.html", "expenses.html", "bookings.html", "report.html"];

function fmtRM(n) {
  return CURRENCY + Number(n).toLocaleString("en-MY");
}

/* Tahun & bulan dipilih disimpan supaya kekal bila pindah antara halaman. */
function readSaved(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
}
function save(key, val) {
  try { sessionStorage.setItem(key, String(val)); } catch (e) { /* abaikan */ }
}

let state = {
  year: parseInt(readSaved("mhp_admin_year", "2026"), 10) || 2026,
  month: readSaved("mhp_admin_month", "all"),
  data: null,
};

/* ---------- Pintu masuk: skrin kunci ringan ---------- */
function gate() {
  const lock = $("#lock");   // hanya wujud pada index.html
  const app = $("#app");
  let loggedIn = false;
  try { loggedIn = sessionStorage.getItem("mhp_admin_in") === "1"; } catch (e) { /* abaikan */ }

  if (loggedIn) {
    if (lock) lock.hidden = true;
    app.hidden = false;
    init();
    return;
  }

  // Halaman lain (bukan index) tanpa log masuk: hantar ke index, ingat halaman asal.
  if (!lock) {
    const here = location.pathname.split("/").pop();
    location.replace("index.html?next=" + encodeURIComponent(here));
    return;
  }

  $("#lock-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("#passcode").value.trim() === DEMO_PASSCODE) {
      save("mhp_admin_in", "1");
      const next = new URLSearchParams(location.search).get("next");
      if (NEXT_PAGES.indexOf(next) !== -1) { location.replace(next); return; }
      lock.hidden = true;
      app.hidden = false;
      init();
    } else {
      $("#lock-error").textContent = "Passcode salah. Cuba lagi.";
    }
  });
}

function setupLogout() {
  $("#logout").addEventListener("click", () => {
    try { sessionStorage.removeItem("mhp_admin_in"); } catch (e) { /* abaikan */ }
    location.href = "index.html";
  });
}

function setupNav() {
  const toggle = $("#menu-toggle");
  if (toggle) toggle.addEventListener("click", () => $("#sidebar").classList.toggle("open"));
}

/* ---------- Penapis tempoh (hanya pada halaman yang menggunakannya) ---------- */
function setupFilters() {
  const period = $("#period");
  if (!period) return; // halaman tanpa penapis (contoh: Kira-kira Bulanan)
  const monthSel = $("#month");

  period.value = String(state.year);
  period.addEventListener("change", (e) => {
    state.year = parseInt(e.target.value, 10);
    save("mhp_admin_year", state.year);
    load();
  });

  if (monthSel) {
    MONTHS_MS.forEach((m, i) => monthSel.add(new Option(m, String(i))));
    monthSel.value = state.month;
    monthSel.addEventListener("change", (e) => {
      state.month = e.target.value;
      save("mhp_admin_month", state.month);
      render();
    });
  }
  $("#refresh").addEventListener("click", load);
}

/* ---------- Pengiraan ---------- */
function totals(data, monthFilter) {
  let income = 0, bookings = 0, nights = 0, available = 0;
  data.monthly.forEach((m, i) => {
    if (monthFilter !== "all" && String(i) !== monthFilter) return;
    income += m.income; bookings += m.bookings; nights += m.nights;
    available += data.nightsAvailable[i];
  });
  const expenses = data.expenses
    .filter((e) => monthFilter === "all" || (new Date(e.date).getMonth() === parseInt(monthFilter, 10)))
    .reduce((s, e) => s + e.amount, 0);
  const occupancy = available > 0 ? Math.round((nights / available) * 100) : 0;
  return { income, expenses, profit: income - expenses, bookings, nights, occupancy };
}

function periodLabel() {
  return state.month === "all" ? `Tahun ${state.year}` : `${MONTHS_MS[parseInt(state.month, 10)]} ${state.year}`;
}

/* ---------- Render ---------- */
function renderKPI(t) {
  $("#kpi-income").textContent = fmtRM(t.income);
  $("#kpi-expense").textContent = fmtRM(t.expenses);
  $("#kpi-profit").textContent = fmtRM(t.profit);
  $("#kpi-occupancy").textContent = t.occupancy + "%";
  $("#kpi-income-delta").textContent = t.bookings + " tempahan";
  $("#kpi-expense-delta").textContent = state.data.expenses.length + " rekod";
  $("#kpi-profit-delta").textContent = t.profit >= 0 ? "Untung" : "Rugi";
  $("#kpi-profit-delta").className = "kpi-delta " + (t.profit >= 0 ? "up" : "down");
  $("#kpi-occupancy-sub").textContent = t.nights + " malam ditempah";
}

function addCell(tr, text, className, label) {
  const td = document.createElement("td");
  if (className) td.className = className;
  if (label) td.setAttribute("data-label", label);
  td.textContent = text;
  tr.appendChild(td);
  return td;
}

function renderIncomeTable(data) {
  const tb = $("#income-table tbody"); tb.textContent = "";
  let ti = 0, tbk = 0, tn = 0;
  data.monthly.forEach((m, i) => {
    ti += m.income; tbk += m.bookings; tn += m.nights;
    const tr = document.createElement("tr");
    addCell(tr, data.months[i]);
    addCell(tr, m.bookings, "num");
    addCell(tr, m.nights, "num");
    addCell(tr, fmtRM(m.income), "num");
    tb.appendChild(tr);
  });
  $("#income-table tfoot").innerHTML =
    `<tr><th>Jumlah</th><th class="num">${tbk}</th><th class="num">${tn}</th><th class="num">${fmtRM(ti)}</th></tr>`;
}

function renderExpenseTable(data, monthFilter) {
  const tb = $("#expense-table tbody"); tb.textContent = "";
  let total = 0;
  const rows = data.expenses.filter((e) => monthFilter === "all" || new Date(e.date).getMonth() === parseInt(monthFilter, 10));
  rows.forEach((e) => {
    total += e.amount;
    const tr = document.createElement("tr");
    addCell(tr, e.date);
    addCell(tr, e.category);
    addCell(tr, e.desc);
    addCell(tr, fmtRM(e.amount), "num");
    tb.appendChild(tr);
  });
  $("#expense-table tfoot").innerHTML =
    `<tr><th colspan="3">Jumlah perbelanjaan</th><th class="num">${fmtRM(total)}</th></tr>`;
}

function renderBookingTable(data) {
  const tb = $("#booking-table tbody"); tb.textContent = "";
  data.bookings.forEach((b) => {
    const tr = document.createElement("tr");
    const statusClass = b.status === "Lunas" ? "ok" : b.status === "Deposit" ? "warn" : "bad";
    addCell(tr, b.guest, "", "Tetamu");
    addCell(tr, b.pkg, "", "Pakej");
    addCell(tr, b.checkin, "", "Daftar masuk");
    addCell(tr, b.nights, "", "Malam");
    addCell(tr, fmtRM(b.amount), "num", "Jumlah");
    const st = addCell(tr, "", "", "Status");
    const badge = document.createElement("span");
    badge.className = "badge " + statusClass;
    badge.textContent = b.status;
    st.appendChild(badge);
    tb.appendChild(tr);
  });
}

function renderReportSummary(t) {
  const el = $("#report-summary");
  if (!el) return;
  el.textContent =
    `Tempoh dipilih: ${periodLabel()}. Pendapatan ${fmtRM(t.income)}, perbelanjaan ${fmtRM(t.expenses)}, untung bersih ${fmtRM(t.profit)}.`;
}

/* ---------- Muat & render ---------- */
async function load() {
  state.data = await DataAPI.getYear(state.year);
  $("#data-source").textContent = DataAPI.isLive ? "Sumber data: Google Sheet" : "Sumber data: contoh (dummy)";
  render();
}

function render() {
  const data = state.data;
  const t = totals(data, state.month);
  if ($("#kpi-income")) renderKPI(t);
  if ($("#income-table")) renderIncomeTable(data);
  if ($("#expense-table")) renderExpenseTable(data, state.month);
  if ($("#booking-table")) renderBookingTable(data);
  renderReportSummary(t);
}

/* ---------- Eksport PDF ---------- */
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const data = state.data;
  const t = totals(data, state.month);
  const label = periodLabel();

  doc.setFontSize(18); doc.text("Mama Homestay Papar", 14, 18);
  doc.setFontSize(12); doc.setTextColor(120); doc.text("Laporan Kewangan - " + label, 14, 26);
  doc.setTextColor(0);

  doc.setFontSize(11);
  const summary = [
    ["Jumlah pendapatan", fmtRM(t.income)],
    ["Jumlah perbelanjaan", fmtRM(t.expenses)],
    ["Untung bersih", fmtRM(t.profit)],
    ["Kadar penghunian", t.occupancy + "%"],
    ["Jumlah tempahan", String(t.bookings)],
  ];
  doc.autoTable({ startY: 34, head: [["Ringkasan", "Nilai"]], body: summary, theme: "grid", headStyles: { fillColor: [176, 95, 69] } });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Bulan", "Tempahan", "Malam", "Pendapatan (RM)"]],
    body: data.monthly.map((m, i) => [data.months[i], m.bookings, m.nights, m.income.toLocaleString("en-MY")]),
    theme: "striped", headStyles: { fillColor: [176, 95, 69] },
  });

  const expRows = data.expenses.filter((e) => state.month === "all" || new Date(e.date).getMonth() === parseInt(state.month, 10));
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Tarikh", "Kategori", "Keterangan", "Jumlah (RM)"]],
    body: expRows.map((e) => [e.date, e.category, e.desc, e.amount.toLocaleString("en-MY")]),
    theme: "striped", headStyles: { fillColor: [138, 155, 126] },
  });

  doc.setFontSize(9); doc.setTextColor(140);
  doc.text("Dijana oleh Dashboard Admin Mama Homestay - data contoh.", 14, doc.internal.pageSize.getHeight() - 10);

  doc.save(`Laporan_MamaHomestay_${label.replace(/\s+/g, "_")}.pdf`);
}

/* ---------- Eksport CSV ---------- */
function downloadCSV() {
  const data = state.data;
  const rows = [["Bulan", "Tempahan", "Malam", "Pendapatan"]];
  data.monthly.forEach((m, i) => rows.push([data.months[i], m.bookings, m.nights, m.income]));
  rows.push([]);
  rows.push(["Tarikh", "Kategori", "Keterangan", "Jumlah"]);
  data.expenses.forEach((e) => rows.push([e.date, e.category, e.desc, e.amount]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Laporan_MamaHomestay_${state.year}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function setupExports() {
  const pdf = $("#download-pdf");
  const csv = $("#download-csv");
  if (pdf) pdf.addEventListener("click", downloadPDF);
  if (csv) csv.addEventListener("click", downloadCSV);
}

/* ---------- Mula ---------- */
function init() {
  setupNav();
  setupFilters();
  setupExports();
  setupLogout();
  load();
  if (window.MonthlyPage) window.MonthlyPage.init();
}

document.addEventListener("DOMContentLoaded", gate);
