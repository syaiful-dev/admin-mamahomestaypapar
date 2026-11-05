/* ==========================================================================
   Mama Homestay Admin - logik dashboard
   ========================================================================== */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

const DEMO_PASSCODE = "1234"; // lihat README: ini BUKAN keselamatan sebenar

function fmtRM(n) {
  return CURRENCY + Number(n).toLocaleString("en-MY");
}

let charts = { trend: null, expenses: null };
let state = { year: 2026, month: "all", data: null };

/* ---------- Skrin kunci ringan ---------- */
function setupLock() {
  const lock = $("#lock");
  const app = $("#app");
  // Jika sudah "masuk" dalam sesi ini, terus tunjuk dashboard.
  if (sessionStorage.getItem("mhp_admin_in") === "1") {
    lock.hidden = true; app.hidden = false; init();
    return;
  }
  $("#lock-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = $("#passcode").value.trim();
    if (val === DEMO_PASSCODE) {
      sessionStorage.setItem("mhp_admin_in", "1");
      lock.hidden = true; app.hidden = false; init();
    } else {
      $("#lock-error").textContent = "Passcode salah. Cuba lagi.";
    }
  });
}

function setupLogout() {
  $("#logout").addEventListener("click", () => {
    sessionStorage.removeItem("mhp_admin_in");
    location.reload();
  });
}

/* ---------- Navigasi & responsif ---------- */
function setupNav() {
  $("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $$(".side-nav a").forEach((a) => {
    a.addEventListener("click", () => {
      $$(".side-nav a").forEach((x) => x.classList.remove("is-active"));
      a.classList.add("is-active");
      $("#page-title").textContent = a.textContent;
      $("#sidebar").classList.remove("open");
    });
  });
}

/* ---------- Penapis tempoh ---------- */
function setupFilters() {
  const monthSel = $("#month");
  MONTHS_MS.forEach((m, i) => monthSel.add(new Option(m, String(i))));
  $("#period").addEventListener("change", (e) => { state.year = parseInt(e.target.value, 10); load(); });
  $("#month").addEventListener("change", (e) => { state.month = e.target.value; render(); });
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

function expenseByCategory(data, monthFilter) {
  const map = {};
  data.expenses.forEach((e) => {
    if (monthFilter !== "all" && new Date(e.date).getMonth() !== parseInt(monthFilter, 10)) return;
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return map;
}

/* ---------- Render KPI ---------- */
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

/* ---------- Carta ---------- */
function renderCharts(data, monthFilter) {
  const trendCtx = $("#chart-trend");
  const expCtx = $("#chart-expenses");

  if (charts.trend) charts.trend.destroy();
  if (charts.expenses) charts.expenses.destroy();

  const incomeData = data.monthly.map((m) => m.income);
  // Perbelanjaan setiap bulan untuk carta trend
  const expMonthly = MONTHS_MS.map((_, i) =>
    data.expenses.filter((e) => new Date(e.date).getMonth() === i).reduce((s, e) => s + e.amount, 0)
  );

  charts.trend = new Chart(trendCtx, {
    type: "bar",
    data: {
      labels: data.months,
      datasets: [
        { label: "Pendapatan", data: incomeData, backgroundColor: "#b05f45", borderRadius: 4 },
        { label: "Perbelanjaan", data: expMonthly, backgroundColor: "#8a9b7e", borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => "RM" + v } } },
    },
  });

  const cat = expenseByCategory(data, monthFilter);
  charts.expenses = new Chart(expCtx, {
    type: "doughnut",
    data: {
      labels: Object.keys(cat),
      datasets: [{
        data: Object.values(cat),
        backgroundColor: ["#b05f45", "#8a9b7e", "#d99a3f", "#7da3b5", "#8aad63", "#c98d34", "#a8766a"],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
  });
}

/* ---------- Jadual ---------- */
function renderIncomeTable(data) {
  const tb = $("#income-table tbody"); tb.innerHTML = "";
  let ti = 0, tbk = 0, tn = 0;
  data.monthly.forEach((m, i) => {
    ti += m.income; tbk += m.bookings; tn += m.nights;
    const tr = document.createElement("tr");
    [data.months[i], m.bookings, m.nights, fmtRM(m.income)].forEach((v, idx) => {
      const td = document.createElement("td"); if (idx > 0) td.className = "num"; td.textContent = v; tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  $("#income-table tfoot").innerHTML =
    `<tr><th>Jumlah</th><th class="num">${tbk}</th><th class="num">${tn}</th><th class="num">${fmtRM(ti)}</th></tr>`;
}

function renderExpenseTable(data, monthFilter) {
  const tb = $("#expense-table tbody"); tb.innerHTML = "";
  let total = 0;
  const rows = data.expenses.filter((e) => monthFilter === "all" || new Date(e.date).getMonth() === parseInt(monthFilter, 10));
  rows.forEach((e) => {
    total += e.amount;
    const tr = document.createElement("tr");
    [e.date, e.category, e.desc, fmtRM(e.amount)].forEach((v, idx) => {
      const td = document.createElement("td"); if (idx === 3) td.className = "num"; td.textContent = v; tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  $("#expense-table tfoot").innerHTML =
    `<tr><th colspan="3">Jumlah perbelanjaan</th><th class="num">${fmtRM(total)}</th></tr>`;
}

function renderBookingTable(data) {
  const tb = $("#booking-table tbody"); tb.innerHTML = "";
  data.bookings.forEach((b) => {
    const tr = document.createElement("tr");
    const statusClass = b.status === "Lunas" ? "ok" : b.status === "Deposit" ? "warn" : "bad";
    tr.innerHTML =
      `<td>${b.guest}</td><td>${b.pkg}</td><td>${b.checkin}</td><td>${b.nights}</td>` +
      `<td class="num">${fmtRM(b.amount)}</td><td><span class="badge ${statusClass}">${b.status}</span></td>`;
    tb.appendChild(tr);
  });
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
  $("#exp-cat-period").textContent = state.month === "all" ? "Sepanjang tahun" : MONTHS_MS[parseInt(state.month, 10)];
  renderKPI(t);
  renderCharts(data, state.month);
  renderIncomeTable(data);
  renderExpenseTable(data, state.month);
  renderBookingTable(data);
}

/* ---------- Eksport PDF ---------- */
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const data = state.data;
  const t = totals(data, state.month);
  const periodLabel = state.month === "all" ? `Tahun ${state.year}` : `${MONTHS_MS[parseInt(state.month, 10)]} ${state.year}`;

  doc.setFontSize(18); doc.text("Mama Homestay Papar", 14, 18);
  doc.setFontSize(12); doc.setTextColor(120); doc.text("Laporan Kewangan - " + periodLabel, 14, 26);
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

  doc.save(`Laporan_MamaHomestay_${periodLabel.replace(/\s+/g, "_")}.pdf`);
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
  $("#download-pdf").addEventListener("click", downloadPDF);
  $("#download-csv").addEventListener("click", downloadCSV);
}

/* ---------- Mula ---------- */
function init() {
  setupNav();
  setupFilters();
  setupExports();
  setupLogout();
  load();
}

document.addEventListener("DOMContentLoaded", setupLock);
