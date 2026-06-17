/* ============================================================
   AN PROGRESS — SCRIPT.JS
   Personal Life OS | Vanilla JavaScript
   ============================================================ */

'use strict';

/* ===== KONSTANTA HARI ===== */
const HARI_MAP = ['minggu','senin','selasa','rabu','kamis','jumat','sabtu'];
const HARI_LABEL = { senin:'Senin', selasa:'Selasa', rabu:'Rabu', kamis:'Kamis', jumat:'Jumat', sabtu:'Sabtu', minggu:'Minggu' };
const KATEGORI_LABEL = { pengetahuan:'Pengetahuan', kesehatan:'Kesehatan', uang:'Uang', sosial:'Sosial', lainnya:'Lainnya' };

/* ===== STATE APLIKASI ===== */
let APP = {
  profil: { nama:'', panggilan:'', umur:'', lahir:'', kota:'', deskripsi:'', foto:'' },
  level: 1,
  exp: 0,
  totalExp: 0,
  quest: [],           // { id, judul, deskripsi, kategori, hari, exp, tipe:'today'|'weekly', selesai, tanggal }
  accounts: [],        // { id, nama, ikon, saldo }
  transactions: [],    // { id, tipe, nominal, kategori, akun, tanggal, catatan }
  wishlist: [],        // { id, gambar, nama, spesifikasi, harga, status:'belum'|'dibeli', tanggalBeli }
  inventory: [],       // { id, gambar, nama, harga, tanggalBeli, kondisi, catatan }
  savings: [],         // { id, nama, target, terkumpul, deadline }
  goals: [],           // { id, judul, kategori, deskripsi, selesai }
  sosial: [],          // { id, tipe, deskripsi, tanggal }
  activityLog: [],     // { id, tipe, teks, waktu }
  stats: { pengetahuan:0, kesehatan:0, uang:0, sosial:0 },
  aiChats: [],         // { id, judul, pesan:[] }
  aiCurrentChat: null,
  darkMode: false,
  productivityLog: {}  // { 'YYYY-MM-DD': level 0-4 }
};

/* ===== FUNGSI UTILITAS ===== */
const uid = () => '_' + Math.random().toString(36).substr(2,9);
const today = () => new Date().toISOString().split('T')[0];
const todayHari = () => HARI_MAP[new Date().getDay()];
const formatRp = n => 'Rp ' + Number(n||0).toLocaleString('id-ID');
const formatDate = d => d ? new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '-';
const formatTime = () => new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
const expForLevel = lvl => lvl * 100;

/* ===== SIMPAN & MUAT DATA ===== */
function simpanData() {
  try { localStorage.setItem('an_progress_data', JSON.stringify(APP)); } catch(e) { console.error('Gagal simpan:', e); }
}
function muatData() {
  try {
    const raw = localStorage.getItem('an_progress_data');
    if (raw) { const parsed = JSON.parse(raw); APP = Object.assign(APP, parsed); }
  } catch(e) { console.error('Gagal muat:', e); }
}

/* ===== LOG AKTIVITAS ===== */
function logAktivitas(tipe, teks) {
  APP.activityLog.unshift({ id: uid(), tipe, teks, waktu: new Date().toISOString() });
  if (APP.activityLog.length > 200) APP.activityLog = APP.activityLog.slice(0, 200);
  simpanData();
  renderAktivitas();
}

/* ===== SISTEM LEVEL & EXP ===== */
function tambahExp(jumlah, kategori) {
  APP.exp += jumlah;
  APP.totalExp += jumlah;
  // Naikkan stat berdasarkan kategori quest
  if (kategori && APP.stats[kategori] !== undefined) {
    APP.stats[kategori] = Math.min(100, APP.stats[kategori] + Math.floor(jumlah / 5));
  }
  // Cek level naik
  while (APP.exp >= expForLevel(APP.level)) {
    APP.exp -= expForLevel(APP.level);
    APP.level++;
    showToast(`🎉 Level naik! Sekarang Level ${APP.level}`, 'success');
    logAktivitas('level', `Level naik menjadi ${APP.level}`);
  }
  simpanData();
  renderDashboard();
  renderProfil();
}

/* ===== PRODUKTIVITAS LOG ===== */
function catatProduktivitas(nilai) {
  const tgl = today();
  const lama = APP.productivityLog[tgl] || 0;
  APP.productivityLog[tgl] = Math.min(4, lama + nilai);
  simpanData();
}

/* ===== TOAST ===== */
function showToast(pesan, tipe = 'default', durasi = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${tipe}`;
  toast.innerHTML = `<span>${pesan}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 300);
  }, durasi);
}

/* ===== MODAL ===== */
function bukaModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('modal-backdrop').classList.remove('hidden');
}
function tutupModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById('modal-backdrop').classList.add('hidden');
}
function tutupSemuaModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-backdrop').classList.add('hidden');
}

/* ===== NAVIGASI ===== */
function navigasiKe(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
  // Update judul topbar
  const judulMap = {
    dashboard:'Dashboard', quest:'Quest', finance:'Keuangan',
    wishlist:'Wishlist', inventory:'Inventori', profil:'Profil',
    statistik:'Statistik', aktivitas:'Aktivitas', ai:'AI Asisten', pengaturan:'Pengaturan'
  };
  document.getElementById('page-title').textContent = judulMap[page] || page;
  // Tutup sidebar di mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
  // Render spesifik
  if (page === 'dashboard') renderDashboard();
  if (page === 'statistik') renderStatistik();
  if (page === 'aktivitas') renderAktivitas();
}

/* ===================================================
   RENDER: DASHBOARD
   =================================================== */
function renderDashboard() {
  const p = APP.profil;
  // Foto & nama
  const avatarEl = document.getElementById('dash-avatar');
  const sidebarAv = document.getElementById('sidebar-avatar');
  const profilAv = document.getElementById('profil-avatar-preview');

  const nama = p.nama || 'Selamat datang!';
  document.getElementById('dash-name').textContent = p.nama || 'Selamat datang!';
  document.getElementById('sidebar-name').textContent = p.panggilan || p.nama || 'Pengguna';
  document.getElementById('sidebar-level').textContent = `Level ${APP.level}`;

  if (p.foto) {
    avatarEl.innerHTML = `<img src="${p.foto}" alt="Foto">`;
    sidebarAv.innerHTML = `<img src="${p.foto}" alt="Foto">`;
    if (profilAv) profilAv.innerHTML = `<img src="${p.foto}" alt="Foto">`;
  } else {
    const inisial = (p.nama||'AN').slice(0,2).toUpperCase();
    avatarEl.textContent = inisial;
    sidebarAv.textContent = inisial;
    if (profilAv) profilAv.textContent = inisial;
  }

  // Level & EXP
  const maxExp = expForLevel(APP.level);
  const pct = Math.min(100, Math.round((APP.exp / maxExp) * 100));
  document.getElementById('dash-level').textContent = `Level ${APP.level}`;
  document.getElementById('dash-exp').textContent = `${APP.exp} / ${maxExp} EXP`;
  document.getElementById('dash-exp-bar').style.width = pct + '%';

  // Hari ini
  const hariIni = todayHari();
  const tglHariIni = today();
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const questHariIni = APP.quest.filter(q => {
    if (q.tipe === 'today') return q.tanggal === tglHariIni;
    if (q.tipe === 'weekly') return q.hari === hariIni;
    return false;
  });
  const doneCount = questHariIni.filter(q=>q.selesai).length;
  const expGained = questHariIni.filter(q=>q.selesai).reduce((s,q)=>s+Number(q.exp||0),0);
  document.getElementById('today-quest-done').textContent = doneCount;
  document.getElementById('today-quest-total').textContent = questHariIni.length;
  document.getElementById('today-exp-gained').textContent = expGained;

  // Pemasukan hari ini
  const incomeToday = APP.transactions
    .filter(t => t.tipe === 'pemasukan' && t.tanggal === tglHariIni)
    .reduce((s,t)=>s+Number(t.nominal||0), 0);
  document.getElementById('today-income').textContent = formatRp(incomeToday);

  // Weekly bars
  renderWeeklyBars();

  // Radar chart
  renderRadarChart('radar-chart');

  // Kalender produktivitas
  renderKalenderProduktivitas();

  // Insight
  renderInsight();

  // Savings & Goals
  renderSavings();
  renderGoals();
}

function renderWeeklyBars() {
  const container = document.getElementById('weekly-bars');
  const hariUrutan = ['senin','selasa','rabu','kamis','jumat','sabtu','minggu'];
  const hariIni = todayHari();
  // Cari max quest per hari
  const counts = hariUrutan.map(h => ({
    hari: h,
    total: APP.quest.filter(q => q.tipe === 'weekly' && q.hari === h).length,
    done: APP.quest.filter(q => q.tipe === 'weekly' && q.hari === h && q.selesai).length
  }));
  const maxTotal = Math.max(...counts.map(c=>c.total), 1);

  container.innerHTML = counts.map(c => {
    const pct = Math.round((c.done / Math.max(c.total,1)) * 100);
    const heightPct = Math.round((c.total / maxTotal) * 100);
    const isToday = c.hari === hariIni;
    return `<div class="weekly-bar-col">
      <div class="weekly-bar-track" style="height:60px">
        <div class="weekly-bar-fill" style="height:${pct}%; background:${isToday?'var(--clr-accent)':'var(--clr-primary)'}"></div>
      </div>
      <span class="weekly-bar-label">${HARI_LABEL[c.hari].slice(0,3)}</span>
    </div>`;
  }).join('');
}

/* ===== RADAR CHART ===== */
let radarChartInstance = null;
let radarChartStatInstance = null;

function renderRadarChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const s = APP.stats;
  const produktivitas = Math.round((s.pengetahuan + s.kesehatan + s.uang + s.sosial) / 4);
  const data = {
    labels: ['Pengetahuan','Kesehatan','Uang','Sosial','Produktivitas'],
    datasets: [{
      label: 'Statistik Kamu',
      data: [s.pengetahuan, s.kesehatan, s.uang, s.sosial, produktivitas],
      backgroundColor: 'rgba(59,130,246,0.18)',
      borderColor: '#3B82F6',
      borderWidth: 2,
      pointBackgroundColor: '#3B82F6',
      pointRadius: 4,
    }]
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    scales: { r: {
      min: 0, max: 100,
      ticks: { stepSize: 25, font:{size:9}, color: '#94A3B8' },
      grid: { color: '#E2E8F0' },
      pointLabels: { font:{size:10}, color: '#64748B' }
    }},
    plugins: { legend: { display: false } }
  };

  if (canvasId === 'radar-chart') {
    if (radarChartInstance) radarChartInstance.destroy();
    radarChartInstance = new Chart(canvas, { type: 'radar', data, options: opts });
  } else {
    if (radarChartStatInstance) radarChartStatInstance.destroy();
    radarChartStatInstance = new Chart(canvas, { type: 'radar', data, options: opts });
  }
}

/* ===== KALENDER PRODUKTIVITAS ===== */
function renderKalenderProduktivitas() {
  const container = document.getElementById('productivity-calendar');
  // 35 hari terakhir
  const cells = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const lvl = APP.productivityLog[key] || 0;
    cells.push(`<div class="cal-cell level-${lvl}" title="${key}: Level ${lvl}"></div>`);
  }
  const hariLabels = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  container.innerHTML = `
    <div class="cal-day-labels">${hariLabels.map(h=>`<span class="cal-day-lbl">${h}</span>`).join('')}</div>
    <div class="productivity-calendar">${cells.join('')}</div>
  `;
}

/* ===== INSIGHT ===== */
function renderInsight() {
  const list = document.getElementById('insight-list');
  const insights = [];

  // Quest insight
  const doneQuest = APP.quest.filter(q=>q.selesai).length;
  if (doneQuest > 0) insights.push(`✅ Kamu telah menyelesaikan <strong>${doneQuest}</strong> quest total.`);

  // Keuangan insight
  const bulanIni = today().slice(0,7);
  const expense = APP.transactions.filter(t=>t.tipe==='pengeluaran' && t.tanggal?.startsWith(bulanIni)).reduce((s,t)=>s+Number(t.nominal||0),0);
  const income = APP.transactions.filter(t=>t.tipe==='pemasukan' && t.tanggal?.startsWith(bulanIni)).reduce((s,t)=>s+Number(t.nominal||0),0);
  if (expense > 0) insights.push(`💸 Pengeluaran bulan ini: <strong>${formatRp(expense)}</strong>`);
  if (income > 0) insights.push(`💰 Pemasukan bulan ini: <strong>${formatRp(income)}</strong>`);

  // Wishlist
  const wishBought = APP.wishlist.filter(w=>w.status==='dibeli').length;
  if (wishBought > 0) insights.push(`🛒 Sudah membeli <strong>${wishBought}</strong> item dari wishlist.`);

  // Level
  insights.push(`⭐ Level saat ini: <strong>${APP.level}</strong> dengan total <strong>${APP.totalExp} EXP</strong>`);

  // Sosial
  if (APP.sosial.length > 0) insights.push(`🤝 Sudah <strong>${APP.sosial.length}</strong> aktivitas sosial tercatat.`);

  if (insights.length === 0) insights.push('Mulailah aktivitas untuk melihat insight kehidupanmu!');

  list.innerHTML = insights.map(i=>`<li class="insight-item">${i}</li>`).join('');
}

/* ===================================================
   RENDER: QUEST
   =================================================== */
function renderQuest() {
  renderQuestHariIni();
  renderQuestMingguan();
}

function renderQuestHariIni() {
  const container = document.getElementById('quest-today-list');
  const hariIni = todayHari();
  const tglHariIni = today();
  const label = document.getElementById('quest-today-label');
  if (label) label.textContent = `Quest — ${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}`;

  // Tampilkan quest hari ini (tipe 'today' dan tanggal hari ini) + quest mingguan hari ini
  const list = APP.quest.filter(q => {
    if (q.tipe === 'today') return q.tanggal === tglHariIni;
    if (q.tipe === 'weekly') return q.hari === hariIni;
    return false;
  });

  if (list.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada quest hari ini. Tambahkan quest pertamamu!</p>`;
    return;
  }

  container.innerHTML = list.map(q => buatQuestItem(q)).join('');
  bindQuestActions(container);
}

function renderQuestMingguan() {
  const grid = document.getElementById('weekly-quest-grid');
  const hariIni = todayHari();
  const hariUrutan = ['senin','selasa','rabu','kamis','jumat','sabtu','minggu'];

  grid.innerHTML = hariUrutan.map(hari => {
    const questHari = APP.quest.filter(q => q.tipe === 'weekly' && q.hari === hari);
    const isToday = hari === hariIni;
    return `<div class="weekly-day-col">
      <div class="weekly-day-header ${isToday?'today':''}">${HARI_LABEL[hari]}</div>
      <div class="weekly-day-quests">
        ${questHari.length === 0
          ? `<span style="font-size:11px;color:var(--clr-text-3);padding:4px">Kosong</span>`
          : questHari.map(q => `
              <div class="weekly-quest-mini ${q.selesai?'done':''}" data-id="${q.id}" title="${q.judul} (+${q.exp} EXP)">
                <span>${q.judul}</span>
                <span style="color:var(--clr-primary);font-size:10px">+${q.exp} EXP</span>
              </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  // Bind klik quest mingguan mini
  grid.querySelectorAll('.weekly-quest-mini').forEach(el => {
    el.addEventListener('click', () => {
      const q = APP.quest.find(x=>x.id===el.dataset.id);
      if (q) toggleQuestSelesai(q.id);
    });
  });
}

function buatQuestItem(q) {
  const checked = q.selesai ? 'checked' : '';
  const doneClass = q.selesai ? 'done' : '';
  const checkIcon = q.selesai ? '✓' : '';
  const checkedCls = q.selesai ? 'checked' : '';
  return `<div class="quest-item ${doneClass}" data-id="${q.id}">
    <div class="quest-checkbox ${checkedCls}" data-check="${q.id}">${checkIcon}</div>
    <div class="quest-info">
      <div class="quest-title">${escHtml(q.judul)}</div>
      <div class="quest-meta">
        <span>${KATEGORI_LABEL[q.kategori]||q.kategori}</span>
        ${q.tipe==='weekly'?`<span>• ${HARI_LABEL[q.hari]||q.hari}</span>`:''}
        ${q.deskripsi?`<span>• ${escHtml(q.deskripsi)}</span>`:''}
      </div>
    </div>
    <span class="quest-exp-badge">+${q.exp} EXP</span>
    <div class="quest-actions">
      <button class="btn-icon-sm" data-edit-quest="${q.id}" title="Edit">✎</button>
      <button class="btn-icon-sm danger" data-del-quest="${q.id}" title="Hapus">✕</button>
    </div>
  </div>`;
}

function bindQuestActions(container) {
  container.querySelectorAll('[data-check]').forEach(el => {
    el.addEventListener('click', () => toggleQuestSelesai(el.dataset.check));
  });
  container.querySelectorAll('[data-edit-quest]').forEach(el => {
    el.addEventListener('click', () => editQuest(el.dataset.editQuest));
  });
  container.querySelectorAll('[data-del-quest]').forEach(el => {
    el.addEventListener('click', () => hapusQuest(el.dataset.delQuest));
  });
}

function toggleQuestSelesai(id) {
  const q = APP.quest.find(x=>x.id===id);
  if (!q) return;
  if (!q.selesai) {
    q.selesai = true;
    q.tanggalSelesai = today();
    tambahExp(Number(q.exp||0), q.kategori);
    catatProduktivitas(1);
    logAktivitas('quest', `Quest selesai: "${q.judul}" (+${q.exp} EXP)`);
    showToast(`Quest selesai! +${q.exp} EXP`, 'success');
  } else {
    q.selesai = false;
    q.tanggalSelesai = null;
    APP.exp = Math.max(0, APP.exp - Number(q.exp||0));
    APP.totalExp = Math.max(0, APP.totalExp - Number(q.exp||0));
    simpanData();
    renderDashboard();
    renderProfil();
    showToast('Quest dibatalkan.', 'warning');
    logAktivitas('quest', `Quest dibatalkan: "${q.judul}"`);
  }
  simpanData();
  renderQuest();
  renderDashboard();
}

function editQuest(id) {
  const q = APP.quest.find(x=>x.id===id);
  if (!q) return;
  document.getElementById('modal-quest-title').textContent = 'Edit Quest';
  document.getElementById('quest-id-input').value = q.id;
  document.getElementById('quest-title-input').value = q.judul;
  document.getElementById('quest-desc-input').value = q.deskripsi||'';
  document.getElementById('quest-cat-input').value = q.kategori;
  document.getElementById('quest-day-input').value = q.hari||'senin';
  document.getElementById('quest-exp-input').value = q.exp;
  document.getElementById('quest-type-input').value = q.tipe;
  document.getElementById('quest-day-group').style.display = q.tipe==='weekly' ? '' : 'none';
  bukaModal('modal-quest');
}

function hapusQuest(id) {
  konfirmasi('Hapus quest ini?', () => {
    const q = APP.quest.find(x=>x.id===id);
    APP.quest = APP.quest.filter(x=>x.id!==id);
    simpanData();
    renderQuest();
    renderDashboard();
    logAktivitas('quest', `Quest dihapus: "${q?.judul||''}"`);
    showToast('Quest dihapus.', 'default');
  });
}

/* ===================================================
   RENDER: FINANCE
   =================================================== */
function renderFinance() {
  renderAccounts();
  renderTransactions();
}

function renderAccounts() {
  const container = document.getElementById('accounts-list');
  if (APP.accounts.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada akun.</p>`;
  } else {
    container.innerHTML = APP.accounts.map(a => `
      <div class="account-item" data-id="${a.id}">
        <div class="account-icon">${a.ikon||'💳'}</div>
        <div class="account-info">
          <div class="account-name">${escHtml(a.nama)}</div>
          <div class="account-balance">${formatRp(a.saldo)}</div>
        </div>
        <div class="account-actions">
          <button class="btn-icon-sm" data-edit-account="${a.id}" title="Edit">✎</button>
          <button class="btn-icon-sm danger" data-del-account="${a.id}" title="Hapus">✕</button>
        </div>
      </div>`).join('');

    container.querySelectorAll('[data-edit-account]').forEach(el=>el.addEventListener('click',()=>editAccount(el.dataset.editAccount)));
    container.querySelectorAll('[data-del-account]').forEach(el=>el.addEventListener('click',()=>hapusAccount(el.dataset.delAccount)));
  }

  const total = APP.accounts.reduce((s,a)=>s+Number(a.saldo||0),0);
  document.getElementById('total-balance').textContent = formatRp(total);

  // Update uang stat
  APP.stats.uang = Math.min(100, Math.round(total / 100000));
  simpanData();
}

function renderTransactions() {
  const tipe = document.getElementById('filter-type')?.value || '';
  const period = document.getElementById('filter-period')?.value || 'all';
  const cari = (document.getElementById('search-transaction')?.value || '').toLowerCase();

  let list = [...APP.transactions];

  // Filter tipe
  if (tipe) list = list.filter(t=>t.tipe===tipe);

  // Filter periode
  if (period === 'today') list = list.filter(t=>t.tanggal===today());
  else if (period === 'week') {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
    list = list.filter(t=>new Date(t.tanggal)>=weekAgo);
  }
  else if (period === 'month') {
    const bulan = today().slice(0,7);
    list = list.filter(t=>t.tanggal?.startsWith(bulan));
  }

  // Filter cari
  if (cari) list = list.filter(t=>(t.kategori||'').toLowerCase().includes(cari)||(t.catatan||'').toLowerCase().includes(cari));

  // Sort terbaru
  list.sort((a,b)=>new Date(b.tanggal||0)-new Date(a.tanggal||0));

  // Summary
  const income = list.filter(t=>t.tipe==='pemasukan').reduce((s,t)=>s+Number(t.nominal||0),0);
  const expense = list.filter(t=>t.tipe==='pengeluaran').reduce((s,t)=>s+Number(t.nominal||0),0);
  document.getElementById('finance-income-total').textContent = formatRp(income);
  document.getElementById('finance-expense-total').textContent = formatRp(expense);
  document.getElementById('finance-balance-total').textContent = formatRp(income - expense);

  const container = document.getElementById('transactions-list');
  if (list.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada transaksi.</p>`;
    return;
  }

  container.innerHTML = list.map(t => `
    <div class="transaction-item" data-id="${t.id}">
      <div class="tx-type-dot ${t.tipe}"></div>
      <div class="tx-info">
        <div class="tx-cat">${escHtml(t.kategori||'-')}</div>
        <div class="tx-meta">${formatDate(t.tanggal)} · ${escHtml(t.akun||'')} ${t.catatan?'· '+escHtml(t.catatan):''}</div>
      </div>
      <span class="tx-amount ${t.tipe}">${t.tipe==='pemasukan'?'+':'-'}${formatRp(t.nominal)}</span>
      <div class="tx-actions">
        <button class="btn-icon-sm" data-edit-tx="${t.id}" title="Edit">✎</button>
        <button class="btn-icon-sm danger" data-del-tx="${t.id}" title="Hapus">✕</button>
      </div>
    </div>`).join('');

  container.querySelectorAll('[data-edit-tx]').forEach(el=>el.addEventListener('click',()=>editTransaction(el.dataset.editTx)));
  container.querySelectorAll('[data-del-tx]').forEach(el=>el.addEventListener('click',()=>hapusTransaction(el.dataset.delTx)));
}

function editAccount(id) {
  const a = APP.accounts.find(x=>x.id===id);
  if (!a) return;
  document.getElementById('modal-account-title').textContent = 'Edit Akun';
  document.getElementById('account-id-input').value = a.id;
  document.getElementById('account-name-input').value = a.nama;
  document.getElementById('account-icon-input').value = a.ikon||'';
  document.getElementById('account-balance-input').value = a.saldo;
  bukaModal('modal-account');
}

function hapusAccount(id) {
  konfirmasi('Hapus akun ini?', () => {
    APP.accounts = APP.accounts.filter(x=>x.id!==id);
    simpanData();
    renderFinance();
    showToast('Akun dihapus.', 'default');
  });
}

function editTransaction(id) {
  const t = APP.transactions.find(x=>x.id===id);
  if (!t) return;
  document.getElementById('modal-transaction-title').textContent = 'Edit Transaksi';
  document.getElementById('tx-id-input').value = t.id;
  document.getElementById('tx-type-input').value = t.tipe;
  document.getElementById('tx-amount-input').value = t.nominal;
  document.getElementById('tx-cat-input').value = t.kategori||'';
  document.getElementById('tx-date-input').value = t.tanggal||'';
  document.getElementById('tx-note-input').value = t.catatan||'';
  isiSelectAkun('tx-account-input', t.akun);
  bukaModal('modal-transaction');
}

function hapusTransaction(id) {
  konfirmasi('Hapus transaksi ini?', () => {
    const t = APP.transactions.find(x => x.id === id);
    if (!t) return;

    // ── 1. Kembalikan saldo akun ──
    const akun = APP.accounts.find(a => a.nama === t.akun || a.id === t.akun);
    if (akun) {
      if (t.tipe === 'pemasukan') {
        akun.saldo = Number(akun.saldo || 0) - Number(t.nominal || 0);
      } else {
        akun.saldo = Number(akun.saldo || 0) + Number(t.nominal || 0);
      }
    }

    // ── 2. ROLLBACK khusus transaksi dari pembelian Wishlist ──
    //    Ditandai oleh field t.wishlistId yang disimpan saat pembelian
    if (t.wishlistId) {
      // 2a. Kembalikan status wishlist → 'belum'
      const w = APP.wishlist.find(x => x.id === t.wishlistId);
      if (w) {
        w.status     = 'belum';
        w.tanggalBeli = null;
        // Hapus relasi
        delete w.transactionId;
        delete w.inventoryId;
      }

      // 2b. Hapus item inventory yang dibuat dari pembelian ini
      if (t.inventoryId) {
        const invIdx = APP.inventory.findIndex(x => x.id === t.inventoryId);
        if (invIdx !== -1) {
          APP.inventory.splice(invIdx, 1);
        }
      }

      // 2c. Log rollback
      logAktivitas('wishlist',
        `Pembelian wishlist dibatalkan: "${w ? w.nama : t.wishlistId}" — saldo dikembalikan, inventori dihapus`
      );
      showToast('Pembelian wishlist dibatalkan & data dirollback.', 'warning');
    } else {
      showToast('Transaksi dihapus.', 'default');
    }

    // ── 3. Hapus transaksi ──
    APP.transactions = APP.transactions.filter(x => x.id !== id);

    simpanData();
    renderFinance();
    renderWishlist();
    renderInventory();
    logAktivitas('finance', `Transaksi dihapus: ${t.kategori || ''} ${formatRp(t.nominal)}`);
  });
}

function isiSelectAkun(selectId, selected) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = APP.accounts.length === 0
    ? `<option value="">-- Belum ada akun --</option>`
    : APP.accounts.map(a=>`<option value="${a.nama}" ${a.nama===selected?'selected':''}>${escHtml(a.ikon||'')} ${escHtml(a.nama)}</option>`).join('');
}

/* ===================================================
   RENDER: WISHLIST
   =================================================== */

/**
 * Ambil src gambar wishlist:
 * - Jika base64 (data:image/...) → langsung pakai
 * - Jika URL lama (http/https) → tetap pakai (kompatibilitas)
 * - Jika kosong → return null (tampilkan placeholder)
 */
function getWishlistImgSrc(w) {
  const g = w.gambar || w.gambarBase64 || '';
  if (!g) return null;
  // base64 data URL atau URL http/https
  return g;
}

function renderWishlist() {
  const container = document.getElementById('wishlist-grid');
  if (APP.wishlist.length === 0) {
    container.innerHTML = `<p class="empty-state">Wishlist kamu masih kosong.<br><span style="font-size:12px">Klik "+ Tambah Keinginan" dan upload foto barang impianmu!</span></p>`;
    return;
  }

  container.innerHTML = APP.wishlist.map(w => {
    const src = getWishlistImgSrc(w);
    const imgHtml = src
      ? `<img src="${src}" alt="${escHtml(w.nama)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholderStyle = src ? 'display:none' : 'display:flex';

    return `<div class="wishlist-item ${w.status === 'dibeli' ? 'bought' : ''}">
      <div class="wishlist-img">
        ${imgHtml}
        <div class="wishlist-img-placeholder" style="${placeholderStyle}">🛍️</div>
        ${w.status === 'dibeli'
          ? '<span class="card-ribbon ribbon-bought">Sudah Dibeli</span>'
          : ''}
      </div>
      <div class="wishlist-body">
        <div class="wishlist-name">${escHtml(w.nama)}</div>
        ${w.spesifikasi ? `<div class="wishlist-spec">${escHtml(w.spesifikasi)}</div>` : ''}
        <div class="wishlist-price">${formatRp(w.harga)}</div>
      </div>
      <div class="wishlist-footer">
        ${w.status !== 'dibeli'
          ? `<button class="btn-primary" style="flex:1;font-size:12px;padding:6px 10px" data-buy="${w.id}">Beli</button>`
          : `<span class="wishlist-bought-label">Sudah Dibeli</span>`}
        <button class="btn-icon-sm" data-edit-wish="${w.id}" title="Edit">✎</button>
        <button class="btn-icon-sm danger" data-del-wish="${w.id}" title="Hapus">✕</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('[data-buy]').forEach(el => el.addEventListener('click', () => bukaModalBeli(el.dataset.buy)));
  container.querySelectorAll('[data-edit-wish]').forEach(el => el.addEventListener('click', () => editWishlist(el.dataset.editWish)));
  container.querySelectorAll('[data-del-wish]').forEach(el => el.addEventListener('click', () => hapusWishlist(el.dataset.delWish)));
}

/* ----- RESET UI UPLOAD FOTO WISHLIST ----- */
function resetWishlistUploadUI() {
  const preview = document.getElementById('wishlist-img-preview');
  const placeholder = document.getElementById('wishlist-upload-placeholder');
  const btnRemove = document.getElementById('btn-remove-wishlist-img');
  const dataInput = document.getElementById('wishlist-img-data');
  const fileInput = document.getElementById('wishlist-file-input');

  if (preview) { preview.src = ''; preview.classList.add('hidden'); }
  if (placeholder) placeholder.style.display = 'flex';
  if (btnRemove) btnRemove.classList.add('hidden');
  if (dataInput) dataInput.value = '';
  if (fileInput) fileInput.value = '';
}

/* ----- SET PREVIEW GAMBAR WISHLIST ----- */
function setWishlistPreview(src) {
  const preview = document.getElementById('wishlist-img-preview');
  const placeholder = document.getElementById('wishlist-upload-placeholder');
  const btnRemove = document.getElementById('btn-remove-wishlist-img');

  if (!src) { resetWishlistUploadUI(); return; }

  if (preview) { preview.src = src; preview.classList.remove('hidden'); }
  if (placeholder) placeholder.style.display = 'none';
  if (btnRemove) btnRemove.classList.remove('hidden');
  document.getElementById('wishlist-img-data').value = src;
}

/* ----- KONVERSI FILE KE BASE64 ----- */
function fileKeBase64(file) {
  return new Promise((resolve, reject) => {
    // Validasi ukuran maks 5MB
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Ukuran foto maksimal 5MB!'));
      return;
    }
    // Validasi tipe
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar!'));
      return;
    }
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

/* ----- PROSES GAMBAR WISHLIST (resize agar hemat storage) ----- */
function prosesGambarWishlist(file) {
  return new Promise((resolve, reject) => {
    fileKeBase64(file)
      .then(base64 => {
        // Resize menggunakan canvas agar tidak terlalu besar di LocalStorage
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_W = 600, MAX_H = 600;
          let w = img.width, h = img.height;
          // Scale down jika lebih besar dari max
          if (w > MAX_W || h > MAX_H) {
            const ratio = Math.min(MAX_W / w, MAX_H / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          // Kompres ke JPEG 80%
          resolve(canvas.toDataURL('image/jpeg', 0.80));
        };
        img.onerror = () => reject(new Error('Gagal memuat gambar.'));
        img.src = base64;
      })
      .catch(reject);
  });
}

function editWishlist(id) {
  const w = APP.wishlist.find(x => x.id === id);
  if (!w) return;
  document.getElementById('modal-wishlist-title').textContent = 'Edit Wishlist';
  document.getElementById('wishlist-id-input').value = w.id;
  document.getElementById('wishlist-name-input').value = w.nama;
  document.getElementById('wishlist-spec-input').value = w.spesifikasi || '';
  document.getElementById('wishlist-price-input').value = w.harga;

  // Muat gambar yang ada ke preview (base64 atau URL lama)
  const src = getWishlistImgSrc(w);
  if (src) {
    setWishlistPreview(src);
  } else {
    resetWishlistUploadUI();
  }
  bukaModal('modal-wishlist');
}

function hapusWishlist(id) {
  konfirmasi('Hapus item wishlist ini?', () => {
    const w = APP.wishlist.find(x => x.id === id);

    // Jika wishlist sudah dibeli, hapus juga item inventory terkait
    if (w && w.status === 'dibeli' && w.inventoryId) {
      const invIdx = APP.inventory.findIndex(x => x.id === w.inventoryId);
      if (invIdx !== -1) {
        APP.inventory.splice(invIdx, 1);
        logAktivitas('inventory', `Inventori dihapus: "${w.nama}" (ikut hapus wishlist) — ${new Date().toLocaleString('id-ID')}`);
      }
      // Hapus juga transaksi terkait jika ada
      if (w.transactionId) {
        const tx = APP.transactions.find(x => x.id === w.transactionId);
        if (tx) {
          // Kembalikan saldo
          const akun = APP.accounts.find(a => a.nama === tx.akun);
          if (akun) akun.saldo = Number(akun.saldo || 0) + Number(tx.nominal || 0);
          APP.transactions = APP.transactions.filter(x => x.id !== w.transactionId);
          logAktivitas('finance', `Transaksi pembelian wishlist dihapus (ikut hapus wishlist): "${w.nama}"`);
        }
      }
    }

    APP.wishlist = APP.wishlist.filter(x => x.id !== id);
    simpanData();
    renderWishlist();
    renderInventory();
    renderFinance();
    logAktivitas('wishlist', `Wishlist dihapus: "${w?.nama || ''}" — ${new Date().toLocaleString('id-ID')}`);
    showToast('Wishlist dihapus.', 'default');
  });
}

function bukaModalBeli(id) {
  const w = APP.wishlist.find(x => x.id === id);
  if (!w) return;
  document.getElementById('buy-confirm-text').innerHTML =
    `Beli <strong>${escHtml(w.nama)}</strong> seharga <strong>${formatRp(w.harga)}</strong>?`;
  document.getElementById('buy-wishlist-id').value = id;
  isiSelectAkun('buy-account-select', '');
  bukaModal('modal-buy-wishlist');
}

/* ===================================================
   RENDER: INVENTORY
   =================================================== */
function renderInventory() {
  const container = document.getElementById('inventory-grid');
  if (APP.inventory.length === 0) {
    container.innerHTML = `<p class="empty-state">Inventori masih kosong.<br><span style="font-size:12px">Beli dari Wishlist untuk mengisi inventori.</span></p>`;
    return;
  }

  container.innerHTML = APP.inventory.map(item => {
    const src = item.gambar || '';
    const imgHtml = src
      ? `<img src="${src}" alt="${escHtml(item.nama)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholderStyle = src ? 'display:none' : 'display:flex';
    const linkedBadge = item.wishlistId
      ? `<span style="font-size:10px;color:var(--clr-text-2)">Dari Wishlist</span>`
      : '';

    return `<div class="inventory-item">
      <div class="inventory-img">
        ${imgHtml}
        <div class="inventory-img-placeholder" style="${placeholderStyle}">📦</div>
        <span class="card-ribbon ribbon-inv">Inventori</span>
      </div>
      <div class="inventory-body">
        <div class="inventory-name">${escHtml(item.nama)}</div>
        ${item.catatan ? `<div class="inventory-note">${escHtml(item.catatan)}</div>` : ''}
        <div class="inventory-price">${formatRp(item.harga)}</div>
        <div class="inventory-meta">
          <span class="inventory-date">${formatDate(item.tanggalBeli)}</span>
          <span class="inventory-cond-badge">${escHtml(item.kondisi || 'Baru')}</span>
        </div>
      </div>
      <div class="inventory-footer">
        ${linkedBadge}
      </div>
    </div>`;
  }).join('');
}

/* ===================================================
   RENDER: PROFIL
   =================================================== */
function renderProfil() {
  const p = APP.profil;
  document.getElementById('profil-fullname').value = p.nama||'';
  document.getElementById('profil-nickname').value = p.panggilan||'';
  document.getElementById('profil-age').value = p.umur||'';
  document.getElementById('profil-dob').value = p.lahir||'';
  document.getElementById('profil-city').value = p.kota||'';
  document.getElementById('profil-desc').value = p.deskripsi||'';

  const maxExp = expForLevel(APP.level);
  const pct = Math.min(100, Math.round((APP.exp/maxExp)*100));
  document.getElementById('profil-level-circle').textContent = APP.level;
  document.getElementById('profil-level-num').textContent = APP.level;
  document.getElementById('profil-exp').textContent = APP.exp;
  document.getElementById('profil-exp-max').textContent = maxExp;
  document.getElementById('profil-exp-bar').style.width = pct+'%';

  document.getElementById('ps-quest').textContent = APP.quest.filter(q=>q.selesai).length;
  document.getElementById('ps-total-exp').textContent = APP.totalExp;
  document.getElementById('ps-wishlist').textContent = APP.wishlist.length;
  document.getElementById('ps-inventory').textContent = APP.inventory.length;

  // Avatar
  const av = document.getElementById('profil-avatar-preview');
  if (p.foto) av.innerHTML = `<img src="${p.foto}" alt="Foto">`;
  else av.textContent = (p.nama||'AN').slice(0,2).toUpperCase();
}

/* ===================================================
   RENDER: STATISTIK
   =================================================== */
let barQuestChart = null, lineFinanceChart = null, pieQuestChart = null;

function renderStatistik() {
  renderRadarChart('radar-chart-stat');

  // Bar chart: quest selesai 7 hari terakhir
  const hariUrutan = ['senin','selasa','rabu','kamis','jumat','sabtu','minggu'];
  const questPerHari = hariUrutan.map(h => APP.quest.filter(q=>q.selesai && (q.hari===h || (q.tipe==='today' && new Date(q.tanggalSelesai||'').getDay()===HARI_MAP.indexOf(h)))).length);

  const canvasBar = document.getElementById('bar-chart-quest');
  if (canvasBar) {
    if (barQuestChart) barQuestChart.destroy();
    barQuestChart = new Chart(canvasBar, {
      type: 'bar',
      data: {
        labels: hariUrutan.map(h=>HARI_LABEL[h]),
        datasets: [{ label: 'Quest Selesai', data: questPerHari, backgroundColor: '#3B82F6', borderRadius: 6 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, ticks:{stepSize:1}}} }
    });
  }

  // Line chart: pemasukan vs pengeluaran 6 bulan terakhir
  const months = [];
  for (let i=5; i>=0; i--) {
    const d = new Date(); d.setMonth(d.getMonth()-i);
    months.push(d.toISOString().slice(0,7));
  }
  const incomes = months.map(m=>APP.transactions.filter(t=>t.tipe==='pemasukan'&&t.tanggal?.startsWith(m)).reduce((s,t)=>s+Number(t.nominal||0),0));
  const expenses = months.map(m=>APP.transactions.filter(t=>t.tipe==='pengeluaran'&&t.tanggal?.startsWith(m)).reduce((s,t)=>s+Number(t.nominal||0),0));

  const canvasLine = document.getElementById('line-chart-finance');
  if (canvasLine) {
    if (lineFinanceChart) lineFinanceChart.destroy();
    lineFinanceChart = new Chart(canvasLine, {
      type: 'line',
      data: {
        labels: months.map(m=>{ const [y,mo]=m.split('-'); return `${mo}/${y.slice(2)}`; }),
        datasets: [
          { label:'Pemasukan', data: incomes, borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.08)', tension:0.4, fill:true },
          { label:'Pengeluaran', data: expenses, borderColor:'#F43F5E', backgroundColor:'rgba(244,63,94,0.08)', tension:0.4, fill:true }
        ]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{y:{beginAtZero:true}} }
    });
  }

  // Pie chart: kategori quest
  const katCount = {};
  APP.quest.forEach(q=>{ if(q.selesai) katCount[q.kategori] = (katCount[q.kategori]||0)+1; });
  const canvasPie = document.getElementById('pie-chart-quest');
  if (canvasPie) {
    if (pieQuestChart) pieQuestChart.destroy();
    const labels = Object.keys(katCount).map(k=>KATEGORI_LABEL[k]||k);
    const vals = Object.values(katCount);
    pieQuestChart = new Chart(canvasPie, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: vals, backgroundColor: ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#F43F5E'], borderWidth:0 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} }
    });
  }
}

/* ===================================================
   RENDER: AKTIVITAS
   =================================================== */
function renderAktivitas() {
  renderSosial();

  const filter = document.getElementById('filter-aktivitas')?.value || '';
  let list = [...APP.activityLog];
  if (filter) list = list.filter(a=>a.tipe===filter);

  const container = document.getElementById('activity-log-list');
  if (list.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada aktivitas tercatat.</p>`;
    return;
  }
  container.innerHTML = list.map(a => `
    <div class="activity-log-item">
      <div class="activity-log-dot"></div>
      <div class="activity-log-info">
        <div class="activity-log-text">${escHtml(a.teks)}</div>
        <div class="activity-log-time">${formatDate(a.waktu?.split('T')[0])} ${a.waktu?new Date(a.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):''}</div>
      </div>
      <span class="activity-log-type">${escHtml(a.tipe)}</span>
    </div>`).join('');
}

function renderSosial() {
  const container = document.getElementById('sosial-list');
  if (APP.sosial.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada aktivitas sosial tercatat.</p>`;
    return;
  }
  container.innerHTML = [...APP.sosial].reverse().map(s => `
    <div class="sosial-item">
      <span class="sosial-type-badge">${escHtml(s.tipe)}</span>
      <span class="sosial-desc">${escHtml(s.deskripsi||'')}</span>
      <span class="sosial-date">${formatDate(s.tanggal)}</span>
    </div>`).join('');
}

/* ===================================================
   RENDER: SAVINGS & GOALS
   =================================================== */
function renderSavings() {
  const container = document.getElementById('savings-list');
  if (APP.savings.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada target tabungan.</p>`;
    return;
  }
  container.innerHTML = APP.savings.map(s => {
    const pct = Math.min(100, Math.round((Number(s.terkumpul||0)/Math.max(Number(s.target||1),1))*100));
    return `<div class="saving-item">
      <div class="saving-info">
        <strong>${escHtml(s.nama)}</strong>
        <span class="saving-pct">${pct}%</span>
      </div>
      <div class="exp-bar-outer"><div class="exp-bar-inner" style="width:${pct}%"></div></div>
      <div class="saving-info" style="margin-top:4px">
        <span style="font-size:11px;color:var(--clr-text-2)">${formatRp(s.terkumpul)} / ${formatRp(s.target)}</span>
        <span style="font-size:11px;color:var(--clr-text-2)">${s.deadline?'⏰ '+formatDate(s.deadline):''}</span>
      </div>
      <div class="saving-actions">
        <button class="btn-icon-sm" data-edit-saving="${s.id}">✎</button>
        <button class="btn-icon-sm danger" data-del-saving="${s.id}">✕</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('[data-edit-saving]').forEach(el=>el.addEventListener('click',()=>editSaving(el.dataset.editSaving)));
  container.querySelectorAll('[data-del-saving]').forEach(el=>el.addEventListener('click',()=>hapusSaving(el.dataset.delSaving)));
}

function editSaving(id) {
  const s = APP.savings.find(x=>x.id===id);
  if (!s) return;
  document.getElementById('modal-saving-title').textContent = 'Edit Target Tabungan';
  document.getElementById('saving-id-input').value = s.id;
  document.getElementById('saving-name-input').value = s.nama;
  document.getElementById('saving-target-input').value = s.target;
  document.getElementById('saving-progress-input').value = s.terkumpul||0;
  document.getElementById('saving-deadline-input').value = s.deadline||'';
  bukaModal('modal-saving');
}

function hapusSaving(id) {
  konfirmasi('Hapus target tabungan ini?', () => {
    APP.savings = APP.savings.filter(x=>x.id!==id);
    simpanData(); renderSavings(); showToast('Target dihapus.','default');
  });
}

function renderGoals() {
  const container = document.getElementById('goals-list');
  if (APP.goals.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada target hidup.</p>`;
    return;
  }
  container.innerHTML = APP.goals.map(g => `
    <div class="goal-item">
      <span class="goal-cat-badge ${g.kategori}">${g.kategori.replace('-',' ')}</span>
      <div>
        <div class="goal-title">${escHtml(g.judul)}</div>
        ${g.deskripsi?`<div style="font-size:11px;color:var(--clr-text-2)">${escHtml(g.deskripsi)}</div>`:''}
      </div>
      <div style="display:flex;gap:4px;margin-left:auto">
        <button class="btn-icon-sm" data-edit-goal="${g.id}">✎</button>
        <button class="btn-icon-sm danger" data-del-goal="${g.id}">✕</button>
      </div>
    </div>`).join('');

  container.querySelectorAll('[data-edit-goal]').forEach(el=>el.addEventListener('click',()=>editGoal(el.dataset.editGoal)));
  container.querySelectorAll('[data-del-goal]').forEach(el=>el.addEventListener('click',()=>hapusGoal(el.dataset.delGoal)));
}

function editGoal(id) {
  const g = APP.goals.find(x=>x.id===id);
  if (!g) return;
  document.getElementById('modal-goal-title').textContent = 'Edit Target Hidup';
  document.getElementById('goal-id-input').value = g.id;
  document.getElementById('goal-title-input').value = g.judul;
  document.getElementById('goal-cat-input').value = g.kategori;
  document.getElementById('goal-desc-input').value = g.deskripsi||'';
  bukaModal('modal-goal');
}

function hapusGoal(id) {
  konfirmasi('Hapus target ini?', () => {
    APP.goals = APP.goals.filter(x=>x.id!==id);
    simpanData(); renderGoals(); showToast('Target dihapus.','default');
  });
}

/* ===================================================
   AI ASISTEN (MOCK)
   =================================================== */
function renderAI() {
  const history = document.getElementById('ai-chat-history');
  history.innerHTML = APP.aiChats.length === 0
    ? `<p class="empty-state-sm">Belum ada riwayat chat.</p>`
    : APP.aiChats.map(c=>`<div class="ai-chat-session ${APP.aiCurrentChat===c.id?'active':''}" data-chat="${c.id}">${escHtml(c.judul)}</div>`).join('');

  history.querySelectorAll('[data-chat]').forEach(el=>el.addEventListener('click',()=>{
    APP.aiCurrentChat = el.dataset.chat;
    muatChat(el.dataset.chat);
  }));
}

function muatChat(id) {
  const chat = APP.aiChats.find(c=>c.id===id);
  if (!chat) return;
  const container = document.getElementById('ai-messages');
  container.innerHTML = chat.pesan.map(m=>`
    <div class="ai-msg ${m.peran}">
      <div class="ai-msg-bubble">${escHtml(m.teks)}</div>
    </div>`).join('');
  container.scrollTop = container.scrollHeight;
  renderAI();
}

function generateAIResponse(pesan) {
  pesan = pesan.toLowerCase();
  const p = APP.profil;
  const nama = p.panggilan || p.nama || 'kamu';

  // Respon kontekstual berdasarkan data pengguna
  const questSelesai = APP.quest.filter(q=>q.selesai).length;
  const totalQuest = APP.quest.length;
  const totalBalance = APP.accounts.reduce((s,a)=>s+Number(a.saldo||0),0);

  if (pesan.includes('halo') || pesan.includes('hi') || pesan.includes('hai')) {
    return `Halo ${nama}! Senang bertemu kamu. Ada yang bisa saya bantu hari ini? Saya bisa membantu dengan quest, keuangan, atau memberikan motivasi untukmu! 😊`;
  }
  if (pesan.includes('quest') || pesan.includes('tugas')) {
    return `Kamu sudah menyelesaikan ${questSelesai} dari ${totalQuest} quest. ${questSelesai < totalQuest ? `Masih ada ${totalQuest - questSelesai} quest yang menunggu, semangat!` : 'Luar biasa, semua quest selesai! 🎉'}`;
  }
  if (pesan.includes('uang') || pesan.includes('keuangan') || pesan.includes('saldo') || pesan.includes('finance')) {
    return `Total saldo kamu saat ini adalah ${formatRp(totalBalance)}. ${totalBalance > 0 ? 'Pertahankan kebiasaan baik mencatat keuanganmu ya!' : 'Yuk catat pemasukan pertamamu di menu Keuangan!'}`;
  }
  if (pesan.includes('level') || pesan.includes('exp') || pesan.includes('xp')) {
    return `Saat ini kamu berada di Level ${APP.level} dengan ${APP.exp} EXP. Butuh ${expForLevel(APP.level)-APP.exp} EXP lagi untuk naik level. Terus selesaikan quest untuk mendapatkan EXP!`;
  }
  if (pesan.includes('statistik') || pesan.includes('statistik') || pesan.includes('stat')) {
    const s = APP.stats;
    return `Statistik kamu: Pengetahuan ${s.pengetahuan}, Kesehatan ${s.kesehatan}, Uang ${s.uang}, Sosial ${s.sosial}. Tingkatkan dengan menyelesaikan quest sesuai kategorinya!`;
  }
  if (pesan.includes('motivasi') || pesan.includes('semangat') || pesan.includes('capek') || pesan.includes('males')) {
    const motivasi = [
      `${nama}, setiap langkah kecil membawa kamu lebih dekat ke tujuan besar. Jangan berhenti!`,
      `Konsistensi mengalahkan motivasi sesaat. ${nama}, tetap lakukan hal kecil setiap hari!`,
      `Ingat tujuanmu, ${nama}. Setiap hari adalah kesempatan baru untuk menjadi versi terbaik dirimu!`,
      `Jangan bandingkan perjalananmu dengan orang lain, ${nama}. Fokus pada dirimu sendiri!`
    ];
    return motivasi[Math.floor(Math.random()*motivasi.length)];
  }
  if (pesan.includes('target') || pesan.includes('tujuan') || pesan.includes('goal')) {
    return `Kamu punya ${APP.goals.length} target hidup dan ${APP.savings.length} target tabungan. Tetap fokus dan konsisten, ${nama}! Setiap target besar dimulai dari langkah kecil.`;
  }
  if (pesan.includes('wishlist') || pesan.includes('beli') || pesan.includes('belanja')) {
    const belum = APP.wishlist.filter(w=>w.status!=='dibeli').length;
    const dibeli = APP.wishlist.filter(w=>w.status==='dibeli').length;
    return `Kamu punya ${APP.wishlist.length} item di wishlist. ${belum} belum dibeli dan ${dibeli} sudah dibeli. Pantau terus kondisi keuanganmu sebelum berbelanja ya!`;
  }
  if (pesan.includes('tips') || pesan.includes('saran')) {
    const tips = [
      'Coba buat quest harian yang spesifik dan realistis. Lebih baik 3 quest selesai daripada 10 quest terbengkalai!',
      'Catat semua pengeluaranmu, sekecil apapun. Kesadaran adalah langkah pertama menuju keuangan sehat.',
      'Luangkan waktu untuk aktivitas sosial. Hubungan yang baik adalah investasi terbaik dalam hidup.',
      'Istirahat juga bagian dari produktivitas. Jangan lupakan kesehatan fisik dan mentalmu!',
      'Review target hidupmu setiap minggu. Pastikan tindakanmu selaras dengan tujuan jangka panjang.'
    ];
    return tips[Math.floor(Math.random()*tips.length)];
  }
  if (pesan.includes('terima kasih') || pesan.includes('makasih') || pesan.includes('thanks')) {
    return `Sama-sama, ${nama}! Senang bisa membantu. Jangan ragu untuk bertanya kapan saja ya! 😊`;
  }

  // Default response
  const defaultResp = [
    `Pertanyaan menarik! Sebagai asisten pribadimu, saya di sini untuk membantu mengelola kehidupanmu. Coba tanyakan tentang quest, keuangan, statistik, atau motivasi!`,
    `Saya mendengarmu, ${nama}. Bisa ceritakan lebih detail? Saya siap membantu dengan manajemen waktu, keuangan, atau target hidupmu.`,
    `Hmm, coba tanyakan hal yang lebih spesifik seperti: "Berapa saldo saya?", "Statistik quest saya?", atau "Berikan saya motivasi!"`,
  ];
  return defaultResp[Math.floor(Math.random()*defaultResp.length)];
}

/* ===================================================
   PENCARIAN GLOBAL
   =================================================== */
function cariGlobal(query) {
  if (!query.trim()) {
    document.getElementById('search-results').classList.add('hidden');
    return;
  }
  const q = query.toLowerCase();
  const hasil = [];

  // Quest
  APP.quest.filter(x=>x.judul.toLowerCase().includes(q)).slice(0,3).forEach(x=>
    hasil.push({tipe:'Quest', teks:x.judul, page:'quest'}));

  // Transaksi
  APP.transactions.filter(x=>(x.kategori||'').toLowerCase().includes(q)||(x.catatan||'').toLowerCase().includes(q)).slice(0,3).forEach(x=>
    hasil.push({tipe:'Keuangan', teks:`${x.tipe}: ${x.kategori||''} ${formatRp(x.nominal)}`, page:'finance'}));

  // Wishlist
  APP.wishlist.filter(x=>x.nama.toLowerCase().includes(q)).slice(0,3).forEach(x=>
    hasil.push({tipe:'Wishlist', teks:x.nama, page:'wishlist'}));

  // Inventory
  APP.inventory.filter(x=>x.nama.toLowerCase().includes(q)).slice(0,3).forEach(x=>
    hasil.push({tipe:'Inventori', teks:x.nama, page:'inventory'}));

  // Log aktivitas
  APP.activityLog.filter(x=>x.teks.toLowerCase().includes(q)).slice(0,2).forEach(x=>
    hasil.push({tipe:'Aktivitas', teks:x.teks, page:'aktivitas'}));

  const container = document.getElementById('search-results');
  if (hasil.length === 0) {
    container.innerHTML = `<div class="search-result-item">Tidak ada hasil ditemukan.</div>`;
  } else {
    container.innerHTML = hasil.map(h=>`
      <div class="search-result-item" data-page="${h.page}">
        <span class="search-result-type">${h.tipe}</span>
        <span>${escHtml(h.teks)}</span>
      </div>`).join('');
    container.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>{
      navigasiKe(el.dataset.page);
      document.getElementById('global-search').value = '';
      container.classList.add('hidden');
    }));
  }
  container.classList.remove('hidden');
}

/* ===================================================
   KONFIRMASI HAPUS
   =================================================== */
let _confirmCallback = null;
function konfirmasi(teks, callback) {
  document.getElementById('confirm-text').textContent = teks;
  _confirmCallback = callback;
  bukaModal('modal-confirm');
}

/* ===================================================
   UTILITAS HTML
   =================================================== */
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ===================================================
   EXPORT / IMPORT DATA
   =================================================== */
function eksporData() {
  const json = JSON.stringify(APP, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AN-Progress-Backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diekspor!', 'success');
  logAktivitas('sistem', 'Data diekspor ke file JSON');
}

function imporData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      APP = Object.assign(APP, data);
      simpanData();
      renderAll();
      showToast('Data berhasil diimpor!', 'success');
      logAktivitas('sistem', 'Data diimpor dari file JSON');
    } catch(err) {
      showToast('File tidak valid!', 'error');
    }
  };
  reader.readAsText(file);
}

/* ===================================================
   RESET DATA
   =================================================== */
function resetData() {
  konfirmasi('RESET SEMUA DATA? Tindakan ini tidak bisa dibatalkan!', () => {
    localStorage.removeItem('an_progress_data');
    location.reload();
  });
}

/* ===================================================
   RENDER SEMUA (untuk import)
   =================================================== */
function renderAll() {
  renderDashboard();
  renderQuest();
  renderFinance();
  renderWishlist();
  renderInventory();
  renderProfil();
  renderAktivitas();
  renderAI();
}

/* ===================================================
   INISIALISASI & EVENT LISTENER
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {

  // Muat data
  muatData();

  // Terapkan tema
  if (APP.darkMode) {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-icon').textContent = '☀️';
    document.getElementById('btn-dark-mode')?.classList.add('active');
    document.getElementById('btn-light-mode')?.classList.remove('active');
  }

  // Render awal
  renderDashboard();
  renderQuest();

  // Sembunyikan loading
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
    setTimeout(()=>overlay.style.display='none', 400);
  }, 1200);

  /* ----- SIDEBAR NAVIGASI ----- */
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', e => {
      e.preventDefault();
      const page = nav.dataset.page;
      navigasiKe(page);
      // Render halaman saat dikunjungi
      if (page === 'quest') renderQuest();
      if (page === 'finance') renderFinance();
      if (page === 'wishlist') renderWishlist();
      if (page === 'inventory') renderInventory();
      if (page === 'profil') renderProfil();
      if (page === 'ai') renderAI();
    });
  });

  /* ----- HAMBURGER & SIDEBAR TOGGLE ----- */
  document.getElementById('hamburger-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('sidebar-close-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  /* ----- TEMA ----- */
  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    APP.darkMode = isDark;
    document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
    simpanData();
  });
  document.getElementById('btn-light-mode')?.addEventListener('click', () => {
    document.body.classList.remove('dark-mode');
    APP.darkMode = false;
    document.getElementById('theme-icon').textContent = '🌙';
    document.getElementById('btn-light-mode').classList.add('active');
    document.getElementById('btn-dark-mode').classList.remove('active');
    simpanData(); showToast('Mode Terang aktif.', 'default');
  });
  document.getElementById('btn-dark-mode')?.addEventListener('click', () => {
    document.body.classList.add('dark-mode');
    APP.darkMode = true;
    document.getElementById('theme-icon').textContent = '☀️';
    document.getElementById('btn-dark-mode').classList.add('active');
    document.getElementById('btn-light-mode').classList.remove('active');
    simpanData(); showToast('Mode Gelap aktif.', 'default');
  });

  /* ----- MODAL BACKDROP & TOMBOL TUTUP MODAL ----- */
  document.getElementById('modal-backdrop').addEventListener('click', () => {
    tutupSemuaModal();
    resetWishlistUploadUI();
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      tutupModal(btn.dataset.modal);
      if (btn.dataset.modal === 'modal-wishlist') resetWishlistUploadUI();
    });
  });
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      tutupModal(btn.dataset.modal);
      if (btn.dataset.modal === 'modal-wishlist') resetWishlistUploadUI();
    });
  });

  /* ----- KONFIRMASI ----- */
  document.getElementById('btn-confirm-action').addEventListener('click', () => {
    if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
    tutupModal('modal-confirm');
  });

  /* ----- PENCARIAN GLOBAL ----- */
  document.getElementById('global-search').addEventListener('input', e => cariGlobal(e.target.value));
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-container')) {
      document.getElementById('search-results').classList.add('hidden');
    }
  });

  /* ----- QUEST: TAMBAH HARI INI ----- */
  document.getElementById('btn-add-quest-today').addEventListener('click', () => {
    document.getElementById('modal-quest-title').textContent = 'Tambah Quest Hari Ini';
    document.getElementById('quest-id-input').value = '';
    document.getElementById('quest-title-input').value = '';
    document.getElementById('quest-desc-input').value = '';
    document.getElementById('quest-cat-input').value = 'pengetahuan';
    document.getElementById('quest-exp-input').value = 10;
    document.getElementById('quest-type-input').value = 'today';
    document.getElementById('quest-day-group').style.display = 'none';
    bukaModal('modal-quest');
  });

  /* ----- QUEST: TAMBAH MINGGUAN ----- */
  document.getElementById('btn-add-quest-weekly').addEventListener('click', () => {
    document.getElementById('modal-quest-title').textContent = 'Tambah Quest Mingguan';
    document.getElementById('quest-id-input').value = '';
    document.getElementById('quest-title-input').value = '';
    document.getElementById('quest-desc-input').value = '';
    document.getElementById('quest-cat-input').value = 'pengetahuan';
    document.getElementById('quest-day-input').value = todayHari();
    document.getElementById('quest-exp-input').value = 10;
    document.getElementById('quest-type-input').value = 'weekly';
    document.getElementById('quest-day-group').style.display = '';
    bukaModal('modal-quest');
  });

  /* ----- QUEST: SIMPAN ----- */
  document.getElementById('btn-save-quest').addEventListener('click', () => {
    const judul = document.getElementById('quest-title-input').value.trim();
    if (!judul) { showToast('Judul quest wajib diisi!', 'error'); return; }
    const id = document.getElementById('quest-id-input').value;
    const tipe = document.getElementById('quest-type-input').value;
    const data = {
      judul,
      deskripsi: document.getElementById('quest-desc-input').value.trim(),
      kategori: document.getElementById('quest-cat-input').value,
      hari: document.getElementById('quest-day-input').value,
      exp: Number(document.getElementById('quest-exp-input').value) || 10,
      tipe,
      tanggal: tipe === 'today' ? today() : null,
    };
    if (id) {
      const idx = APP.quest.findIndex(x=>x.id===id);
      if (idx !== -1) APP.quest[idx] = { ...APP.quest[idx], ...data };
      logAktivitas('quest', `Quest diperbarui: "${judul}"`);
      showToast('Quest diperbarui!', 'success');
    } else {
      APP.quest.push({ id: uid(), selesai: false, ...data });
      logAktivitas('quest', `Quest baru ditambahkan: "${judul}"`);
      showToast('Quest ditambahkan!', 'success');
    }
    simpanData(); tutupModal('modal-quest');
    renderQuest(); renderDashboard();
  });

  /* ----- TAB QUEST ----- */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  /* ----- AKUN KEUANGAN: TAMBAH ----- */
  document.getElementById('btn-add-account').addEventListener('click', () => {
    document.getElementById('modal-account-title').textContent = 'Tambah Akun';
    document.getElementById('account-id-input').value = '';
    document.getElementById('account-name-input').value = '';
    document.getElementById('account-icon-input').value = '💳';
    document.getElementById('account-balance-input').value = '';
    bukaModal('modal-account');
  });

  /* ----- AKUN KEUANGAN: SIMPAN ----- */
  document.getElementById('btn-save-account').addEventListener('click', () => {
    const nama = document.getElementById('account-name-input').value.trim();
    if (!nama) { showToast('Nama akun wajib diisi!', 'error'); return; }
    const id = document.getElementById('account-id-input').value;
    const data = {
      nama,
      ikon: document.getElementById('account-icon-input').value || '💳',
      saldo: Number(document.getElementById('account-balance-input').value) || 0,
    };
    if (id) {
      const idx = APP.accounts.findIndex(x=>x.id===id);
      if (idx !== -1) APP.accounts[idx] = { ...APP.accounts[idx], ...data };
      logAktivitas('finance', `Akun diperbarui: "${nama}"`);
      showToast('Akun diperbarui!', 'success');
    } else {
      APP.accounts.push({ id: uid(), ...data });
      logAktivitas('finance', `Akun baru: "${nama}" (${formatRp(data.saldo)})`);
      showToast('Akun ditambahkan!', 'success');
    }
    simpanData(); tutupModal('modal-account');
    renderFinance();
  });

  /* ----- TRANSAKSI: TAMBAH ----- */
  document.getElementById('btn-add-transaction').addEventListener('click', () => {
    document.getElementById('modal-transaction-title').textContent = 'Tambah Transaksi';
    document.getElementById('tx-id-input').value = '';
    document.getElementById('tx-type-input').value = 'pengeluaran';
    document.getElementById('tx-amount-input').value = '';
    document.getElementById('tx-cat-input').value = '';
    document.getElementById('tx-date-input').value = today();
    document.getElementById('tx-note-input').value = '';
    isiSelectAkun('tx-account-input', '');
    bukaModal('modal-transaction');
  });

  /* ----- TRANSAKSI: SIMPAN ----- */
  document.getElementById('btn-save-transaction').addEventListener('click', () => {
    const nominal = Number(document.getElementById('tx-amount-input').value);
    if (!nominal || nominal <= 0) { showToast('Nominal harus lebih dari 0!', 'error'); return; }
    const id = document.getElementById('tx-id-input').value;
    const tipe = document.getElementById('tx-type-input').value;
    const akunNama = document.getElementById('tx-account-input').value;
    const tanggal = document.getElementById('tx-date-input').value || today();
    const data = {
      tipe, nominal,
      kategori: document.getElementById('tx-cat-input').value.trim(),
      akun: akunNama,
      tanggal,
      catatan: document.getElementById('tx-note-input').value.trim(),
    };

    // Update saldo akun
    const akun = APP.accounts.find(a=>a.nama===akunNama);
    if (id) {
      // Edit: kembalikan saldo lama dulu
      const lama = APP.transactions.find(x=>x.id===id);
      if (lama && akun) {
        if (lama.tipe==='pemasukan') akun.saldo -= Number(lama.nominal||0);
        else akun.saldo += Number(lama.nominal||0);
      }
      const idx = APP.transactions.findIndex(x=>x.id===id);
      if (idx !== -1) APP.transactions[idx] = { ...APP.transactions[idx], ...data };
      showToast('Transaksi diperbarui!', 'success');
    } else {
      APP.transactions.push({ id: uid(), ...data });
      showToast('Transaksi ditambahkan!', 'success');
    }

    // Terapkan saldo baru
    if (akun) {
      if (tipe==='pemasukan') akun.saldo = Number(akun.saldo||0) + nominal;
      else akun.saldo = Number(akun.saldo||0) - nominal;
    }

    // Update stat uang
    if (tipe==='pemasukan') APP.stats.uang = Math.min(100, APP.stats.uang + 2);

    simpanData(); tutupModal('modal-transaction');
    renderFinance();
    logAktivitas('finance', `Transaksi ${tipe}: ${data.kategori||''} ${formatRp(nominal)}`);
  });

  /* ----- FILTER TRANSAKSI ----- */
  document.getElementById('filter-type').addEventListener('change', renderTransactions);
  document.getElementById('filter-period').addEventListener('change', renderTransactions);
  document.getElementById('search-transaction').addEventListener('input', renderTransactions);

  /* ----- WISHLIST: TAMBAH ----- */
  document.getElementById('btn-add-wishlist').addEventListener('click', () => {
    document.getElementById('modal-wishlist-title').textContent = 'Tambah Wishlist';
    document.getElementById('wishlist-id-input').value = '';
    document.getElementById('wishlist-name-input').value = '';
    document.getElementById('wishlist-spec-input').value = '';
    document.getElementById('wishlist-price-input').value = '';
    resetWishlistUploadUI();
    bukaModal('modal-wishlist');
  });

  /* ----- WISHLIST: PILIH FILE DARI INPUT ----- */
  document.getElementById('wishlist-file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showToast('Memproses gambar...', 'default', 1500);
      const base64 = await prosesGambarWishlist(file);
      setWishlistPreview(base64);
      showToast('Foto berhasil dimuat!', 'success', 2000);
    } catch (err) {
      showToast(err.message || 'Gagal memuat foto.', 'error');
    }
    // Reset input file agar bisa pilih file sama lagi
    e.target.value = '';
  });

  /* ----- WISHLIST: KLIK AREA PREVIEW -> TRIGGER FILE INPUT ----- */
  document.getElementById('wishlist-upload-preview').addEventListener('click', e => {
    // Klik pada area preview (bukan tombol lain) membuka file picker
    if (e.target.closest('#btn-remove-wishlist-img')) return;
    document.getElementById('wishlist-file-input').click();
  });

  /* ----- WISHLIST: HAPUS FOTO ----- */
  document.getElementById('btn-remove-wishlist-img').addEventListener('click', e => {
    e.stopPropagation();
    resetWishlistUploadUI();
    showToast('Foto dihapus.', 'default', 1500);
  });

  /* ----- WISHLIST: DRAG & DROP ----- */
  const dropZone = document.getElementById('wishlist-drop-zone');

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });
  dropZone.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    try {
      showToast('Memproses gambar...', 'default', 1500);
      const base64 = await prosesGambarWishlist(file);
      setWishlistPreview(base64);
      showToast('Foto berhasil dimuat!', 'success', 2000);
    } catch (err) {
      showToast(err.message || 'Gagal memuat foto.', 'error');
    }
  });

  /* ----- WISHLIST: SIMPAN ----- */
  document.getElementById('btn-save-wishlist').addEventListener('click', () => {
    const nama = document.getElementById('wishlist-name-input').value.trim();
    if (!nama) { showToast('Nama barang wajib diisi!', 'error'); return; }

    const id = document.getElementById('wishlist-id-input').value;
    const gambarBase64 = document.getElementById('wishlist-img-data').value || '';

    const data = {
      // Simpan ke field 'gambar' agar kompatibel dengan sistem lama
      gambar: gambarBase64,
      nama,
      spesifikasi: document.getElementById('wishlist-spec-input').value.trim(),
      harga: Number(document.getElementById('wishlist-price-input').value) || 0,
    };

    if (id) {
      const idx = APP.wishlist.findIndex(x => x.id === id);
      if (idx !== -1) {
        // Jika tidak ada gambar baru di-upload, pertahankan gambar lama
        if (!gambarBase64 && APP.wishlist[idx].gambar) {
          data.gambar = APP.wishlist[idx].gambar;
        }
        APP.wishlist[idx] = { ...APP.wishlist[idx], ...data };
      }
      showToast('Wishlist diperbarui!', 'success');
      logAktivitas('wishlist', `Wishlist diedit: "${nama}" — ${formatRp(data.harga)} — ${new Date().toLocaleString('id-ID')}`);
    } else {
      APP.wishlist.push({ id: uid(), status: 'belum', ...data });
      showToast('Wishlist ditambahkan!', 'success');
      logAktivitas('wishlist', `Wishlist dibuat: "${nama}" — ${formatRp(data.harga)} — ${new Date().toLocaleString('id-ID')}`);
    }

    simpanData();
    tutupModal('modal-wishlist');
    resetWishlistUploadUI();
    renderWishlist();
  });

  /* ----- BELI WISHLIST: KONFIRMASI ----- */
  document.getElementById('btn-confirm-buy').addEventListener('click', () => {
    const id = document.getElementById('buy-wishlist-id').value;
    const akunNama = document.getElementById('buy-account-select').value;
    const w = APP.wishlist.find(x => x.id === id);
    if (!w) return;
    if (!akunNama) { showToast('Pilih akun pembayaran!', 'error'); return; }
    const akun = APP.accounts.find(a => a.nama === akunNama);
    if (!akun) { showToast('Akun tidak ditemukan!', 'error'); return; }
    if (Number(akun.saldo || 0) < Number(w.harga || 0)) {
      showToast('Saldo tidak mencukupi!', 'error'); return;
    }

    // ── Buat ID relasi terlebih dahulu ──
    const txId  = uid();
    const invId = uid();

    // ── 1. Kurangi saldo akun ──
    akun.saldo = Number(akun.saldo || 0) - Number(w.harga || 0);

    // ── 2. Tambah transaksi (simpan wishlistId & inventoryId sebagai relasi) ──
    APP.transactions.push({
      id        : txId,
      tipe      : 'pengeluaran',
      nominal   : w.harga,
      kategori  : 'Wishlist',
      akun      : akunNama,
      tanggal   : today(),
      catatan   : `Beli: ${w.nama}`,
      wishlistId : w.id,      // RELASI → untuk rollback
      inventoryId: invId       // RELASI → untuk rollback
    });

    // ── 3. Tambah ke Inventory (simpan wishlistId & transactionId sebagai relasi) ──
    APP.inventory.push({
      id           : invId,
      gambar       : w.gambar || '',
      nama         : w.nama,
      harga        : w.harga,
      tanggalBeli  : today(),
      kondisi      : 'Baru',
      catatan      : w.spesifikasi || '',
      wishlistId   : w.id,   // RELASI
      transactionId: txId    // RELASI
    });

    // ── 4. Update status Wishlist (simpan relasi juga) ──
    w.status        = 'dibeli';
    w.tanggalBeli   = today();
    w.transactionId = txId;
    w.inventoryId   = invId;

    simpanData();
    tutupModal('modal-buy-wishlist');
    renderWishlist();
    renderInventory();
    renderFinance();

    // ── 5. Log aktivitas lengkap ──
    logAktivitas('wishlist',   `Wishlist dibeli: "${w.nama}" — ${formatRp(w.harga)} dari akun ${akunNama}`);
    logAktivitas('inventory',  `Inventori dibuat: "${w.nama}" (dari pembelian wishlist)`);
    logAktivitas('finance',    `Transaksi pembelian wishlist dibuat: "${w.nama}" ${formatRp(w.harga)}`);

    showToast(`"${w.nama}" berhasil dibeli! Cek Inventori.`, 'success');
  });

  /* ----- TARGET TABUNGAN: TAMBAH ----- */
  document.getElementById('btn-add-saving').addEventListener('click', () => {
    document.getElementById('modal-saving-title').textContent = 'Tambah Target Tabungan';
    document.getElementById('saving-id-input').value = '';
    document.getElementById('saving-name-input').value = '';
    document.getElementById('saving-target-input').value = '';
    document.getElementById('saving-progress-input').value = '';
    document.getElementById('saving-deadline-input').value = '';
    bukaModal('modal-saving');
  });

  /* ----- TARGET TABUNGAN: SIMPAN ----- */
  document.getElementById('btn-save-saving').addEventListener('click', () => {
    const nama = document.getElementById('saving-name-input').value.trim();
    if (!nama) { showToast('Nama target wajib diisi!', 'error'); return; }
    const id = document.getElementById('saving-id-input').value;
    const data = {
      nama,
      target: Number(document.getElementById('saving-target-input').value)||0,
      terkumpul: Number(document.getElementById('saving-progress-input').value)||0,
      deadline: document.getElementById('saving-deadline-input').value||'',
    };
    if (id) {
      const idx = APP.savings.findIndex(x=>x.id===id);
      if (idx !== -1) APP.savings[idx] = { ...APP.savings[idx], ...data };
      showToast('Target tabungan diperbarui!', 'success');
    } else {
      APP.savings.push({ id: uid(), ...data });
      showToast('Target tabungan ditambahkan!', 'success');
    }
    simpanData(); tutupModal('modal-saving'); renderSavings();
  });

  /* ----- TARGET HIDUP: TAMBAH ----- */
  document.getElementById('btn-add-goal').addEventListener('click', () => {
    document.getElementById('modal-goal-title').textContent = 'Tambah Target Hidup';
    document.getElementById('goal-id-input').value = '';
    document.getElementById('goal-title-input').value = '';
    document.getElementById('goal-cat-input').value = 'jangka-pendek';
    document.getElementById('goal-desc-input').value = '';
    bukaModal('modal-goal');
  });

  /* ----- TARGET HIDUP: SIMPAN ----- */
  document.getElementById('btn-save-goal').addEventListener('click', () => {
    const judul = document.getElementById('goal-title-input').value.trim();
    if (!judul) { showToast('Judul target wajib diisi!', 'error'); return; }
    const id = document.getElementById('goal-id-input').value;
    const data = {
      judul,
      kategori: document.getElementById('goal-cat-input').value,
      deskripsi: document.getElementById('goal-desc-input').value.trim(),
    };
    if (id) {
      const idx = APP.goals.findIndex(x=>x.id===id);
      if (idx !== -1) APP.goals[idx] = { ...APP.goals[idx], ...data };
      showToast('Target diperbarui!', 'success');
    } else {
      APP.goals.push({ id: uid(), selesai: false, ...data });
      showToast('Target ditambahkan!', 'success');
    }
    simpanData(); tutupModal('modal-goal'); renderGoals();
  });

  /* ----- AKTIVITAS SOSIAL: TAMBAH ----- */
  document.getElementById('btn-add-sosial').addEventListener('click', () => {
    document.getElementById('sosial-type-input').value = 'donasi';
    document.getElementById('sosial-desc-input').value = '';
    document.getElementById('sosial-date-input').value = today();
    bukaModal('modal-sosial');
  });

  /* ----- AKTIVITAS SOSIAL: SIMPAN ----- */
  document.getElementById('btn-save-sosial').addEventListener('click', () => {
    const deskripsi = document.getElementById('sosial-desc-input').value.trim();
    if (!deskripsi) { showToast('Deskripsi wajib diisi!', 'error'); return; }
    const data = {
      tipe: document.getElementById('sosial-type-input').value,
      deskripsi,
      tanggal: document.getElementById('sosial-date-input').value || today(),
    };
    APP.sosial.push({ id: uid(), ...data });
    // Naikkan stat sosial
    APP.stats.sosial = Math.min(100, APP.stats.sosial + 5);
    simpanData(); tutupModal('modal-sosial');
    logAktivitas('sosial', `Aktivitas sosial: ${data.tipe} — ${deskripsi}`);
    renderAktivitas();
    showToast('Aktivitas sosial dicatat!', 'success');
  });

  /* ----- FILTER AKTIVITAS ----- */
  document.getElementById('filter-aktivitas').addEventListener('change', renderAktivitas);

  /* ----- PROFIL: UPLOAD FOTO ----- */
  document.getElementById('profil-photo-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      APP.profil.foto = ev.target.result;
      simpanData(); renderProfil(); renderDashboard();
      showToast('Foto profil diperbarui!', 'success');
    };
    reader.readAsDataURL(file);
  });

  /* ----- PROFIL: SIMPAN ----- */
  document.getElementById('btn-save-profil').addEventListener('click', () => {
    APP.profil.nama = document.getElementById('profil-fullname').value.trim();
    APP.profil.panggilan = document.getElementById('profil-nickname').value.trim();
    APP.profil.umur = document.getElementById('profil-age').value;
    APP.profil.lahir = document.getElementById('profil-dob').value;
    APP.profil.kota = document.getElementById('profil-city').value.trim();
    APP.profil.deskripsi = document.getElementById('profil-desc').value.trim();
    simpanData(); renderProfil(); renderDashboard();
    logAktivitas('profil', 'Profil diperbarui');
    showToast('Profil disimpan!', 'success');
  });

  /* ----- AI ASISTEN: KIRIM PESAN ----- */
  const sendAI = () => {
    const input = document.getElementById('ai-input');
    const teks = input.value.trim();
    if (!teks) return;

    // Buat chat baru jika belum ada
    if (!APP.aiCurrentChat) {
      const chatBaru = { id: uid(), judul: teks.slice(0,30)+'...', pesan: [] };
      APP.aiChats.unshift(chatBaru);
      APP.aiCurrentChat = chatBaru.id;
    }

    const chat = APP.aiChats.find(c=>c.id===APP.aiCurrentChat);
    if (!chat) return;

    // Tambah pesan user
    chat.pesan.push({ peran:'user', teks });
    input.value = '';
    input.style.height = '';

    // Render pesan user
    const container = document.getElementById('ai-messages');
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-msg user';
    userDiv.innerHTML = `<div class="ai-msg-bubble">${escHtml(teks)}</div>`;
    container.appendChild(userDiv);

    // Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-msg assistant ai-typing';
    typingDiv.innerHTML = `<div class="ai-msg-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;

    // Generate respons
    setTimeout(() => {
      typingDiv.remove();
      const respons = generateAIResponse(teks);
      chat.pesan.push({ peran:'assistant', teks: respons });
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ai-msg assistant';
      aiDiv.innerHTML = `<div class="ai-msg-bubble">${escHtml(respons)}</div>`;
      container.appendChild(aiDiv);
      container.scrollTop = container.scrollHeight;
      simpanData(); renderAI();
    }, 800 + Math.random() * 600);
  };

  document.getElementById('btn-send-ai').addEventListener('click', sendAI);
  document.getElementById('ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); }
  });
  // Auto resize textarea AI
  document.getElementById('ai-input').addEventListener('input', function() {
    this.style.height = '';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  /* ----- NEW CHAT ----- */
  document.getElementById('btn-new-chat').addEventListener('click', () => {
    APP.aiCurrentChat = null;
    const container = document.getElementById('ai-messages');
    container.innerHTML = `<div class="ai-msg assistant"><div class="ai-msg-bubble">Halo! Saya AN Asisten, siap membantu mengelola kehidupan dan produktivitas kamu. Tanyakan apa saja!</div></div>`;
    renderAI();
  });

  /* ----- EKSPOR ----- */
  document.getElementById('btn-export').addEventListener('click', eksporData);

  /* ----- IMPOR ----- */
  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) imporData(file);
    e.target.value = '';
  });

  /* ----- RESET ----- */
  document.getElementById('btn-reset-all').addEventListener('click', resetData);

  /* ----- KLIK SIDEBAR USER -> KE PROFIL ----- */
  document.getElementById('sidebar-user-mini').addEventListener('click', () => {
    navigasiKe('profil');
    renderProfil();
  });

  /* ===================================================
     GOOGLE LOGIN + CLOUD SYNC (modul supabase.js)
     Hook tombol-tombol terkait. Tidak mengganggu
     fitur lain jika supabase.js belum dikonfigurasi.
     =================================================== */
  if (window.ANSupabase) {
    // Tombol "Sinkronisasi Sekarang" di Profil
    document.getElementById('btn-sync-sekarang')?.addEventListener('click', () => {
      window.ANSupabase.syncSekarang();
    });

    // Tombol "Logout" di Profil
    document.getElementById('btn-logout-google')?.addEventListener('click', () => {
      window.ANSupabase.logout();
    });

    // Tombol "Masuk dengan Google" dari dalam halaman Profil
    document.getElementById('btn-login-dari-profil')?.addEventListener('click', () => {
      window.ANSupabase.login();
    });

    // Toggle tampilan blok login/logout sesuai status auth
    const updateAuthBlocks = () => {
      const loggedIn = window.ANSupabase.isLoggedIn();
      const inBlock  = document.getElementById('auth-actions-logged-in');
      const outBlock = document.getElementById('auth-actions-logged-out');
      if (inBlock)  inBlock.style.display  = loggedIn ? 'flex' : 'none';
      if (outBlock) outBlock.style.display = loggedIn ? 'none' : 'flex';
    };
    updateAuthBlocks();
    // Cek ulang tiap kali halaman Profil dibuka
    document.querySelector('.nav-item[data-page="profil"]')?.addEventListener('click', () => {
      setTimeout(updateAuthBlocks, 200);
    });

    // Inisialisasi Supabase (cek session, tampilkan login jika perlu)
    window.ANSupabase.init().then(() => {
      setTimeout(updateAuthBlocks, 300);
    });
  }

  console.log('✅ AN Progress berhasil dimuat.');
});
