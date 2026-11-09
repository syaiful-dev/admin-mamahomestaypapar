/* ==========================================================================
   Mama Homestay Admin - Kira-kira Bulanan
   --------------------------------------------------------------------------
   Pengiraan bulanan: perbelanjaan, gaji, insentif, utiliti, simpanan dan bonus.

   Konsep "pemboleh ubah":
   - Setiap kadar/nilai ialah medan yang boleh diisi admin.
   - Jika medan dibiarkan KOSONG, nilai lalai (DEFAULTS di bawah) digunakan.
   - Medan yang tiada nilai lalai (B, C, elektrik, air, rumput) dianggap 0
     jika kosong. Pendapatan (A) diambil daripada tab Pendapatan jika kosong.

   Data setiap bulan disimpan dalam pelayar ini (localStorage). Setiap bulan
   yang disimpan menyimpan salinan nilai lalai ketika itu, jadi jika anda
   ubah DEFAULTS pada masa depan, bulan lama tidak berubah.
   ========================================================================== */
(function () {
  "use strict";

  const STORE_KEY = "mhp_calc_v1";
  const KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  const MAX_NUM = 1e9;
  const YEARS = [2026, 2025];

  /* Nilai lalai (constant). Ubah di sini jika kadar tetap berubah. */
  const DEFAULTS = Object.freeze({
    inventoryPct: 10,                    // 2. Inventori = 10% x A
    rateHalf: 50,                        // 3. Cleaning half (RM / kali)
    rateFull: 80,                        // 3. Cleaning full (RM / kali)
    wageUmi: 8, wageNina: 12, wageMama: 14, wageEpul: 8,   // 4. Gaji (% x A)
    incentiveMin: 3500,                  // 6. Insentif jika pendapatan >= RM3,500
    incentiveUmi: 100, incentiveEpul: 100,
    utilSampah: 70, utilElektrik: 0, utilAir: 0, utilRumput: 0, // 7. Utiliti
    utilWifi: 94.35, utilCuckoo: 60,
    savingsPct: 20,                      // 8. Simpanan = 20% x A
  });

  const MONTHLY_KEYS = ["income", "half", "full"];
  const ALL_KEYS = MONTHLY_KEYS.concat(Object.keys(DEFAULTS));
  const UTIL_KEYS = ["utilSampah", "utilElektrik", "utilAir", "utilRumput", "utilWifi", "utilCuckoo"];

  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

  /* ---------- Pembantu ---------- */
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  function money(n) {
    const abs = Math.abs(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? "-" : "") + "RM" + abs;
  }

  // Terima nombor atau rentetan nombor >= 0. Selain itu: null (= guna lalai).
  function parseNum(raw) {
    if (typeof raw !== "string" && typeof raw !== "number") return null;
    const s = String(raw).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 && n <= MAX_NUM ? n : null;
  }

  function freshRecord() {
    return { inputs: {}, defaults: Object.assign({}, DEFAULTS) };
  }
  function cloneRecord(rec) {
    return JSON.parse(JSON.stringify(rec));
  }

  /* ---------- Pengiraan ---------- */
  // Hasilkan nilai berkesan: diisi admin, atau lalai, atau 0.
  function effective(rec, autoIncome) {
    const d = rec.defaults || DEFAULTS;
    const out = {};
    ALL_KEYS.forEach((k) => {
      const n = parseNum(rec.inputs[k]);
      if (n !== null) out[k] = n;
      else if (k === "income") out[k] = autoIncome || 0;
      else if (k in DEFAULTS) {
        const dn = parseNum(d[k]);
        out[k] = dn !== null ? dn : DEFAULTS[k];
      } else out[k] = 0;
    });
    return out;
  }

  function compute(v) {
    const A = v.income;
    const inventory = r2((A * v.inventoryPct) / 100);
    const cleaningHalf = r2(v.half * v.rateHalf);
    const cleaningFull = r2(v.full * v.rateFull);
    const cleaning = r2(cleaningHalf + cleaningFull);
    const wages = {
      umi: r2((A * v.wageUmi) / 100),
      nina: r2((A * v.wageNina) / 100),
      mama: r2((A * v.wageMama) / 100),
      epul: r2((A * v.wageEpul) / 100),
    };
    const wagesTotal = r2(wages.umi + wages.nina + wages.mama + wages.epul);
    const eligible = A >= v.incentiveMin;
    const inc = { umi: eligible ? r2(v.incentiveUmi) : 0, epul: eligible ? r2(v.incentiveEpul) : 0 };
    const incTotal = r2(inc.umi + inc.epul);
    const utilTotal = r2(UTIL_KEYS.reduce((s, k) => s + v[k], 0));
    const savings = r2((A * v.savingsPct) / 100);
    const D = r2(inventory + cleaning + wagesTotal + incTotal + utilTotal + savings);
    const bonus = r2(A - D);
    return { A, inventory, cleaningHalf, cleaningFull, cleaning, wages, wagesTotal, eligible, inc, incTotal, utilTotal, savings, D, bonus };
  }

  /* ---------- Penyimpanan ---------- */
  // Bersihkan data yang dibaca dari localStorage / fail import.
  function sanitizeStore(obj) {
    const out = {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
    Object.keys(obj).forEach((key) => {
      if (!KEY_RE.test(key)) return;
      const rec = obj[key];
      if (!rec || typeof rec !== "object") return;
      const inputs = {};
      ALL_KEYS.forEach((k) => {
        const n = rec.inputs ? parseNum(rec.inputs[k]) : null;
        if (n !== null) inputs[k] = String(n);
      });
      if (!Object.keys(inputs).length) return;
      const defaults = {};
      Object.keys(DEFAULTS).forEach((k) => {
        const n = rec.defaults ? parseNum(rec.defaults[k]) : null;
        defaults[k] = n !== null ? n : DEFAULTS[k];
      });
      out[key] = { inputs, defaults };
    });
    return out;
  }

  function testStorage() {
    try { localStorage.setItem("__mhp_t", "1"); localStorage.removeItem("__mhp_t"); return true; } catch (e) { return false; }
  }
  function loadAll() {
    try { return sanitizeStore(JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch (e) { return {}; }
  }
  function saveAll(all) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
  }

  /* ---------- Jadual: spesifikasi baris ---------- */
  const ROWS = [
    { type: "line", no: "1", label: "Pendapatan (A)", value: (r) => r.A },
    { type: "line", no: "2", label: "Inventori", input: "inventoryPct", unit: "% x A", value: (r) => r.inventory },
    { type: "head", no: "3", label: "Cleaning", value: (r) => r.cleaning },
    { type: "sub", label: (v) => "Cleaning half (B = " + v.half + ")", input: "rateHalf", unit: "RM / kali", value: (r) => r.cleaningHalf },
    { type: "sub", label: (v) => "Cleaning full (C = " + v.full + ")", input: "rateFull", unit: "RM / kali", value: (r) => r.cleaningFull },
    { type: "head", no: "4", label: "Gaji pekerja", value: (r) => r.wagesTotal },
    { type: "sub", label: "Umi", input: "wageUmi", unit: "% x A", value: (r) => r.wages.umi },
    { type: "sub", label: "Nina", input: "wageNina", unit: "% x A", value: (r) => r.wages.nina },
    { type: "sub", label: "Mama", input: "wageMama", unit: "% x A", value: (r) => r.wages.mama },
    { type: "sub", label: "Epul", input: "wageEpul", unit: "% x A", value: (r) => r.wages.epul },
    { type: "head", no: "6", label: "Insentif bulanan", value: (r) => r.incTotal },
    { type: "sub", label: "Syarat: pendapatan minimum", input: "incentiveMin", unit: "RM", text: (r) => (r.eligible ? "Layak" : "Belum layak") },
    { type: "sub", label: "Umi", input: "incentiveUmi", unit: "RM", value: (r) => r.inc.umi },
    { type: "sub", label: "Epul", input: "incentiveEpul", unit: "RM", value: (r) => r.inc.epul },
    { type: "head", no: "7", label: "Utiliti", value: (r) => r.utilTotal },
    { type: "sub", label: "Sampah", input: "utilSampah", unit: "RM", value: (r, v) => v.utilSampah },
    { type: "sub", label: "Elektrik", input: "utilElektrik", unit: "RM", value: (r, v) => v.utilElektrik },
    { type: "sub", label: "Air", input: "utilAir", unit: "RM", value: (r, v) => v.utilAir },
    { type: "sub", label: "Rumput", input: "utilRumput", unit: "RM", value: (r, v) => v.utilRumput },
    { type: "sub", label: "Wifi", input: "utilWifi", unit: "RM", value: (r, v) => v.utilWifi },
    { type: "sub", label: "Cuckoo", input: "utilCuckoo", unit: "RM", value: (r, v) => v.utilCuckoo },
    { type: "line", no: "8", label: "Simpanan", input: "savingsPct", unit: "% x A", value: (r) => r.savings },
    { type: "total", label: "Jumlah perbelanjaan (D = 2 + 3 + 4 + 6 + 7 + 8)", value: (r) => r.D },
    { type: "bonus", no: "5", label: "Bonus (A - D)", value: (r) => r.bonus },
  ];

  /* ---------- Keadaan halaman ---------- */
  let all = {};
  let storageOk = true;
  let year = YEARS[0];
  let monthIdx = 0;
  let rec = freshRecord();
  let autoIncome = 0;
  let token = 0;
  const yearCache = {};
  const refs = [];
  const inputs = {};

  const keyOf = () => year + "-" + String(monthIdx + 1).padStart(2, "0");

  function getYearData(y) {
    if (!yearCache[y]) yearCache[y] = Promise.resolve(DataAPI.getYear(y)).catch(function () { return null; });
    return yearCache[y];
  }
  function incomeIn(data, m) {
    return data && data.monthly && data.monthly[m] ? data.monthly[m].income : 0;
  }

  function setStatus(text, warn) {
    const el = q("#calc-status");
    if (!el) return;
    el.textContent = text;
    el.className = "calc-status" + (warn ? " warn" : "");
  }

  /* ---------- Bina jadual ---------- */
  function buildTable() {
    const tbody = q("#calc-table tbody");
    tbody.textContent = "";
    ROWS.forEach(function (row) {
      const tr = document.createElement("tr");
      tr.className = "calc-" + row.type;

      const tdLabel = document.createElement("td");
      if (row.no) {
        const no = document.createElement("span");
        no.className = "calc-no";
        no.textContent = row.no + ".";
        tdLabel.appendChild(no);
      }
      const label = document.createElement("span");
      tdLabel.appendChild(label);

      const tdIn = document.createElement("td");
      tdIn.className = "calc-in";
      if (row.input) {
        const input = document.createElement("input");
        input.type = "number";
        input.className = "calc-input";
        input.min = "0";
        input.step = "any";
        input.inputMode = "decimal";
        input.dataset.key = row.input;
        input.setAttribute("aria-label", (typeof row.label === "string" ? row.label : "Cleaning") + " (" + row.unit + ")");
        const unit = document.createElement("span");
        unit.className = "calc-unit";
        unit.textContent = row.unit;
        tdIn.appendChild(input);
        tdIn.appendChild(unit);
        inputs[row.input] = input;
      }

      const tdVal = document.createElement("td");
      tdVal.className = "num";

      tr.appendChild(tdLabel);
      tr.appendChild(tdIn);
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
      refs.push({ row: row, tr: tr, label: label, valueEl: tdVal });
    });
  }

  /* ---------- Paparan ---------- */
  function applyRecordToInputs() {
    Object.keys(inputs).forEach(function (k) {
      const el = inputs[k];
      el.value = rec.inputs[k] !== undefined ? rec.inputs[k] : "";
      if (k === "income") el.placeholder = autoIncome > 0 ? "Auto: " + money(autoIncome) : "0";
      else if (k in DEFAULTS) el.placeholder = String(rec.defaults[k] !== undefined ? rec.defaults[k] : DEFAULTS[k]);
      else el.placeholder = "0";
    });
    const hint = q("#calc-income-hint");
    if (hint) {
      hint.textContent = autoIncome > 0
        ? "Kosong = ambil " + money(autoIncome) + " dari tab Pendapatan."
        : "Tiada pendapatan bulan ini dalam tab Pendapatan. Isi sendiri.";
    }
  }

  function refresh() {
    const v = effective(rec, autoIncome);
    const r = compute(v);

    refs.forEach(function (ref) {
      const row = ref.row;
      ref.label.textContent = typeof row.label === "function" ? row.label(v) : row.label;
      if (row.text) ref.valueEl.textContent = row.text(r, v);
      else if (row.value) ref.valueEl.textContent = money(row.value(r, v));
      if (row.type === "bonus") ref.tr.classList.toggle("is-negative", r.bonus < 0);
    });

    Object.keys(inputs).forEach(function (k) {
      const raw = inputs[k].value.trim();
      inputs[k].setAttribute("aria-invalid", raw !== "" && parseNum(raw) === null ? "true" : "false");
    });

    const manualIncome = parseNum(rec.inputs.income) !== null;
    q("#sum-income").textContent = money(r.A);
    q("#sum-income-note").textContent = manualIncome ? "Diisi manual" : autoIncome > 0 ? "Auto dari tab Pendapatan" : "Belum diisi";
    q("#sum-expense").textContent = money(r.D);
    q("#sum-bonus").textContent = money(r.bonus);
    const note = q("#sum-bonus-note");
    note.textContent = r.bonus >= 0 ? "Baki untung" : "Kekurangan";
    note.className = "kpi-delta " + (r.bonus >= 0 ? "up" : "down");

    renderPayouts(r);
  }

  function renderPayouts(r) {
    const list = q("#payout-list");
    list.textContent = "";
    const people = [
      ["Umi", r.wages.umi + r.inc.umi, r.inc.umi > 0 ? "gaji + insentif" : "gaji"],
      ["Nina", r.wages.nina, "gaji"],
      ["Mama", r.wages.mama, "gaji"],
      ["Epul", r.wages.epul + r.inc.epul, r.inc.epul > 0 ? "gaji + insentif" : "gaji"],
    ];
    people.forEach(function (p) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = p[0];
      const sub = document.createElement("small");
      sub.textContent = p[2];
      name.appendChild(sub);
      const amt = document.createElement("strong");
      amt.textContent = money(r2(p[1]));
      li.appendChild(name);
      li.appendChild(amt);
      list.appendChild(li);
    });
  }

  /* ---------- Simpan ---------- */
  function persistRecord() {
    const key = keyOf();
    if (Object.keys(rec.inputs).length) {
      all[key] = cloneRecord(rec);
    } else {
      delete all[key];
      rec.defaults = Object.assign({}, DEFAULTS);
    }
    storageOk = saveAll(all);
    setStatus(
      storageOk ? "Disimpan dalam pelayar ini." : "Amaran: tidak dapat menyimpan dalam pelayar ini. Gunakan Eksport untuk simpan salinan.",
      !storageOk
    );
  }

  function onEdit(key, raw) {
    const s = String(raw).trim();
    if (s === "") delete rec.inputs[key];
    else rec.inputs[key] = s;
    persistRecord();
    refresh();
    renderHistory();
  }

  /* ---------- Pilih bulan ---------- */
  async function switchTo(y, m) {
    const my = ++token;
    year = y;
    monthIdx = m;
    q("#calc-year").value = String(y);
    q("#calc-month").value = String(m);
    const stored = all[keyOf()];
    rec = stored ? cloneRecord(stored) : freshRecord();
    const data = await getYearData(y);
    if (my !== token) return;
    autoIncome = incomeIn(data, m);
    applyRecordToInputs();
    refresh();
    renderHistory();
  }

  /* ---------- Rekod disimpan ---------- */
  async function renderHistory() {
    const tb = q("#history-table tbody");
    const empty = q("#history-empty");
    const keys = Object.keys(all).sort().reverse();
    const years = Array.from(new Set(keys.map(function (k) { return parseInt(k.slice(0, 4), 10); })));
    const datas = await Promise.all(years.map(getYearData));
    const byYear = {};
    years.forEach(function (y, i) { byYear[y] = datas[i]; });

    tb.textContent = "";
    empty.hidden = keys.length > 0;
    keys.forEach(function (k) {
      const y = parseInt(k.slice(0, 4), 10);
      const m = parseInt(k.slice(5), 10) - 1;
      const r = compute(effective(all[k], incomeIn(byYear[y], m)));
      const tr = document.createElement("tr");
      [MONTHS_MS[m] + " " + y, money(r.A), money(r.D), money(r.bonus)].forEach(function (text, i) {
        const td = document.createElement("td");
        if (i > 0) td.className = "num";
        if (i === 3 && r.bonus < 0) td.classList.add("neg");
        td.textContent = text;
        tr.appendChild(td);
      });
      const tdBtn = document.createElement("td");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-outline btn-xs";
      btn.textContent = "Buka";
      btn.addEventListener("click", function () {
        switchTo(y, m);
        window.scrollTo(0, 0);
      });
      tdBtn.appendChild(btn);
      tr.appendChild(tdBtn);
      tb.appendChild(tr);
    });
  }

  /* ---------- Kosongkan / Eksport / Import ---------- */
  function resetMonth() {
    if (!Object.keys(rec.inputs).length) {
      setStatus("Tiada input untuk dikosongkan.", false);
      return;
    }
    if (!window.confirm("Kosongkan semua input bulan ini dan guna nilai lalai?")) return;
    rec = freshRecord();
    delete all[keyOf()];
    storageOk = saveAll(all);
    applyRecordToInputs();
    refresh();
    renderHistory();
    setStatus("Input bulan ini dikosongkan.", false);
  }

  function exportBackup() {
    const payload = { app: "mama-homestay-admin", type: "kira-kira-bulanan", version: 1, exportedAt: new Date().toISOString(), data: all };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kira-kira-bulanan-sandaran.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Fail sandaran dimuat turun.", false);
  }

  function importBackup(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus("Fail terlalu besar untuk fail sandaran.", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result));
        const clean = sanitizeStore(parsed && parsed.data);
        const n = Object.keys(clean).length;
        if (!n) {
          setStatus("Fail tidak mengandungi data bulan yang sah.", true);
          return;
        }
        if (!window.confirm("Import " + n + " bulan? Bulan yang sama akan diganti.")) return;
        Object.assign(all, clean);
        storageOk = saveAll(all);
        setStatus(n + " bulan diimport.", false);
        switchTo(year, monthIdx);
      } catch (e) {
        setStatus("Fail tidak sah. Gunakan fail sandaran yang dieksport dari halaman ini.", true);
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Mula ---------- */
  function init() {
    if (!q("#calc-table")) return;

    storageOk = testStorage();
    all = storageOk ? loadAll() : {};

    const monthSel = q("#calc-month");
    MONTHS_MS.forEach(function (m, i) { monthSel.add(new Option(m, String(i))); });
    const yearSel = q("#calc-year");
    YEARS.forEach(function (y) { yearSel.add(new Option(String(y), String(y))); });

    buildTable();
    MONTHLY_KEYS.forEach(function (k) { inputs[k] = q("#calc-" + k); });
    Object.keys(inputs).forEach(function (k) {
      inputs[k].addEventListener("input", function () { onEdit(k, inputs[k].value); });
    });

    monthSel.addEventListener("change", function () { switchTo(year, parseInt(monthSel.value, 10)); });
    yearSel.addEventListener("change", function () { switchTo(parseInt(yearSel.value, 10), monthIdx); });
    q("#calc-reset").addEventListener("click", resetMonth);
    q("#calc-export").addEventListener("click", exportBackup);
    const fileInput = q("#calc-import");
    fileInput.addEventListener("change", function () {
      importBackup(fileInput.files[0]);
      fileInput.value = "";
    });

    if (!storageOk) setStatus("Amaran: pelayar ini tidak membenarkan simpanan. Data tidak akan kekal. Gunakan Eksport.", true);

    const now = new Date();
    const y = YEARS.indexOf(now.getFullYear()) !== -1 ? now.getFullYear() : YEARS[0];
    switchTo(y, now.getMonth());
  }

  window.MonthlyPage = {
    init: init,
    _compute: compute,
    _effective: effective,
    _sanitize: sanitizeStore,
    _defaults: DEFAULTS,
  };
})();
