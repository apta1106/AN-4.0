/* ============================================================
   AN PROGRESS — SUPABASE.JS
   Modul: Google Auth + Cloud Sync
   Terpisah dari script.js agar tidak mengganggu fitur lama.

   KONFIGURASI:
   Ganti SUPABASE_URL dan SUPABASE_ANON_KEY di bawah
   dengan nilai dari: Supabase Dashboard → Settings → API
   ============================================================ */

"use strict";

// ============================================================
// ⚙️  KONFIGURASI — ISI INI DULU SEBELUM DEPLOY
// ============================================================
const SUPABASE_URL = "https://yajdasbjjphuuridqisk.supabase.co";
// Contoh: 'https://abcdefghijkl.supabase.co'

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhamRhc2JqanBodXVyaWRxaXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDE3MTgsImV4cCI6MjA5NzExNzcxOH0.Lkb5YBPrlC1mdhoAl-rrFCxKCyF_EwqfMjtAh2EdEv8";
// Contoh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
// ============================================================

/* ── Inisialisasi Supabase Client ── */
let _sb = null; // instance Supabase (null jika belum dikonfigurasi)

function getSB() {
  if (_sb) return _sb;

  if (
    SUPABASE_URL.startsWith("GANTI") ||
    SUPABASE_ANON_KEY.startsWith("GANTI")
  ) {
    return null; // belum dikonfigurasi → mode offline
  }

  // window.supabase disediakan oleh CDN <script> di index.html
  if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
    console.warn("[AN Progress] Supabase CDN belum termuat.");
    return null;
  }

  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

/* ── State Auth ── */
let CURRENT_USER = null;          // objek user Supabase
let IS_ONLINE    = navigator.onLine;
let SYNC_PENDING = false;         // ada perubahan belum tersync
// PATCH: Flag untuk mencegah muatDataDariCloud dipanggil berulang
// saat Supabase fire SIGNED_IN karena token refresh
let _sudahLoginPertamaKali = false;

// ============================================================
// UTILITAS
// ============================================================
const db = (table) => getSB()?.from(table);

/** Cek apakah Supabase sudah dikonfigurasi */
function isSupabaseReady() {
  return !!getSB();
}

/** Cek apakah user sedang login */
function isLoggedIn() {
  return !!CURRENT_USER;
}

/** Ambil user_id */
function getUserId() {
  return CURRENT_USER?.id || null;
}

// ============================================================
// DETEKSI ONLINE / OFFLINE
// ============================================================
window.addEventListener("online", () => {
  IS_ONLINE = true;
  updateSyncBadge();
  if (SYNC_PENDING && isLoggedIn()) {
    // Ada perubahan offline → sync sekarang
    setTimeout(() => syncSemuaKeCloud(false), 2000);
  }
});
window.addEventListener("offline", () => {
  IS_ONLINE = false;
  updateSyncBadge();
  showSyncToast("Koneksi terputus. Data tersimpan lokal.", "warning");
});

// ============================================================
// UI HELPERS
// ============================================================
function showSyncToast(msg, tipe = "default") {
  // Gunakan fungsi showToast dari script.js utama
  if (typeof showToast === "function") showToast(msg, tipe);
}

function updateSyncBadge() {
  const badge = document.getElementById("sync-status-badge");
  if (!badge) return;
  if (!isSupabaseReady() || !isLoggedIn()) {
    badge.textContent = "Offline Mode";
    badge.className = "sync-badge offline";
    return;
  }
  if (!IS_ONLINE) {
    badge.textContent = "● Offline";
    badge.className = "sync-badge offline";
  } else if (SYNC_PENDING) {
    badge.textContent = "↻ Mengsync...";
    badge.className = "sync-badge syncing";
  } else {
    badge.textContent = "✓ Tersinkron";
    badge.className = "sync-badge synced";
  }
}

function tampilkanStatusAuth() {
  const el = document.getElementById("auth-user-info");
  if (!el) return;
  if (isLoggedIn()) {
    const foto = CURRENT_USER.user_metadata?.avatar_url || "";
    const nama = CURRENT_USER.user_metadata?.full_name || CURRENT_USER.email;
    const email = CURRENT_USER.email || "";
    el.innerHTML = `
      <div class="auth-user-row">
        <div class="auth-avatar">
          ${foto ? `<img src="${foto}" alt="${nama}">` : nama.slice(0, 2).toUpperCase()}
        </div>
        <div class="auth-info">
          <span class="auth-name">${nama}</span>
          <span class="auth-email">${email}</span>
        </div>
      </div>`;
  } else {
    el.innerHTML = "";
  }
}

// ============================================================
// LAYAR LOGIN
// ============================================================
function tampilkanLayarLogin() {
  let overlay = document.getElementById("login-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "login-overlay";
    overlay.innerHTML = `
      <div class="login-card">
        <div class="login-logo">AN</div>
        <h1 class="login-title">Selamat Datang di<br>AN Progress</h1>
        <p class="login-desc">Masuk untuk menyinkronkan progres Anda<br>di semua perangkat.</p>

        <button class="btn-google-login" id="btn-google-login">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Masuk dengan Google
        </button>

        <div class="login-divider">
          <span>atau</span>
        </div>

        <button class="btn-offline-mode" id="btn-offline-mode">
          Lanjutkan tanpa login (Mode Offline)
        </button>

        <p class="login-note">
          Data lokal tetap aman. Login untuk sinkronisasi antar perangkat.
        </p>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove("hidden");

  document
    .getElementById("btn-google-login")
    .addEventListener("click", loginDenganGoogle);
  document.getElementById("btn-offline-mode").addEventListener("click", () => {
    overlay.classList.add("hidden");
    inisialisasiAplikasiOffline();
  });
}

function sembunyikanLayarLogin() {
  const overlay = document.getElementById("login-overlay");
  if (overlay) overlay.classList.add("hidden");
}

// ============================================================
// AUTH — LOGIN / LOGOUT
// ============================================================
async function loginDenganGoogle() {
  const sb = getSB();
  if (!sb) {
    showSyncToast(
      "Supabase belum dikonfigurasi. Masuk ke supabase.js untuk setup.",
      "error",
    );
    return;
  }

  const btn = document.getElementById("btn-google-login");
  if (btn) {
    btn.textContent = "Menghubungkan...";
    btn.disabled = true;
  }

  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error) {
    showSyncToast("Gagal login: " + error.message, "error");
    if (btn) {
      btn.textContent = "Masuk dengan Google";
      btn.disabled = false;
    }
  }
  // Jika berhasil → browser redirect ke Google, lalu kembali ke halaman
}

async function logout() {
  const sb = getSB();
  if (!sb) return;

  if (!confirm("Yakin ingin keluar? Data lokal tetap tersimpan.")) return;

  await sb.auth.signOut();
  CURRENT_USER = null;

  if (typeof logAktivitas === "function") {
    logAktivitas("sistem", "Logout dari akun Google");
  }

  showSyncToast("Berhasil logout.", "default");
  // Refresh halaman → tampilkan layar login
  setTimeout(() => location.reload(), 1000);
}

// ============================================================
// SESSION — Deteksi saat halaman dibuka kembali
// ============================================================
async function cekSession() {
  const sb = getSB();
  if (!sb) {
    // Supabase belum dikonfigurasi → langsung mode offline
    sembunyikanLayarLogin();
    inisialisasiAplikasiOffline();
    return;
  }

  // Cek session aktif (dari cookie/localStorage Supabase)
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (session?.user) {
    CURRENT_USER = session.user;
    await onLoginBerhasil(CURRENT_USER);
  } else {
    // Tidak ada session → tampilkan layar login
    tampilkanLayarLogin();
  }

  // Dengarkan perubahan auth (login / logout dari tab lain)
  // PATCH: Gunakan flag _sudahLoginPertamaKali dan cek user ID
  // untuk mencegah muatDataDariCloud dipanggil ulang saat token refresh
  // (Supabase v2 fires SIGNED_IN setiap token refresh / tab focus)
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      const userIdBaru = session.user.id;
      const userIdLama = CURRENT_USER?.id || null;

      // Hanya jalankan onLoginBerhasil jika:
      // 1. Belum pernah login (login pertama kali), ATAU
      // 2. User ID berubah (ganti akun)
      // JANGAN jalankan saat token refresh (user ID sama, sudah login)
      if (!_sudahLoginPertamaKali || userIdBaru !== userIdLama) {
        _sudahLoginPertamaKali = true;
        CURRENT_USER = session.user;
        await onLoginBerhasil(CURRENT_USER);
      } else {
        // Token refresh biasa — cukup perbarui CURRENT_USER, jangan reload data
        CURRENT_USER = session.user;
        updateSyncBadge();
      }
    } else if (event === "TOKEN_REFRESHED" && session?.user) {
      // Token diperbarui — update objek user tapi JANGAN reload data dari cloud
      CURRENT_USER = session.user;
      updateSyncBadge();
    } else if (event === "SIGNED_OUT") {
      _sudahLoginPertamaKali = false;
      CURRENT_USER = null;
      tampilkanLayarLogin();
    }
  });
}

// ============================================================
// SETELAH LOGIN BERHASIL
// ============================================================
async function onLoginBerhasil(user) {
  sembunyikanLayarLogin();
  tampilkanStatusAuth();
  updateSyncBadge();

  if (typeof logAktivitas === "function") {
    logAktivitas("sistem", `Login Google: ${user.email}`);
  }

  // Muat data dari cloud ke APP
  await muatDataDariCloud();

  // Cek apakah ada data lokal lama yang belum diupload
  await cekMigrasiDataLokal();

  updateSyncBadge();
  showSyncToast(
    `Selamat datang, ${user.user_metadata?.full_name || user.email}!`,
    "success",
  );
}

// ============================================================
// MODE OFFLINE (tanpa login)
// ============================================================
function inisialisasiAplikasiOffline() {
  // Script utama sudah memanggil muatData() dari LocalStorage
  // Cukup perbarui badge
  updateSyncBadge();
}

// ============================================================
// MUAT DATA DARI CLOUD → APP (state di script.js)
// ============================================================
// PATCH: Guard untuk mencegah overwrite data lokal yang lebih baru
// Jika ada perubahan belum tersync (SYNC_PENDING), skip cloud load
// untuk menjaga data lokal tetap utuh
let _sedangMuatCloud = false; // Mencegah concurrent load

   
    // Koleksi data
    if (questRes.data) APP.quest = questRes.data.map(cloudQuestToApp);
    if (accRes.data) APP.accounts = accRes.data.map(cloudAccToApp);
    if (txRes.data) APP.transactions = txRes.data.map(cloudTxToApp);
    if (wishRes.data) APP.wishlist = wishRes.data.map(cloudWishToApp);
    if (invRes.data) APP.inventory = invRes.data.map(cloudInvToApp);
    if (savRes.data) APP.savings = savRes.data.map(cloudSavToApp);
    if (goalRes.data) APP.goals = goalRes.data.map(cloudGoalToApp);
    if (sosRes.data) APP.sosial = sosRes.data.map(cloudSosToApp);
    if (logRes.data) APP.activityLog = logRes.data.map(cloudLogToApp);
    if (chatRes.data) APP.aiChats = chatRes.data.map(cloudChatToApp);

    // Simpan ke LocalStorage sebagai cache
    if (typeof simpanData === "function") simpanData();

    // Re-render semua
    if (typeof renderAll === "function") renderAll();

    SYNC_PENDING = false;
    _sedangMuatCloud = false;
    updateSyncBadge();
  } catch (err) {
    _sedangMuatCloud = false;
    console.error("Gagal muat data cloud:", err);
    showSyncToast(
      "Gagal memuat data cloud. Menggunakan data lokal.",
      "warning",
    );
  }
}

// ============================================================
// MAPPER: Cloud → APP format (snake_case → camelCase)
// ============================================================
const cloudQuestToApp = (r) => ({
  id: r.id,
  judul: r.judul,
  deskripsi: r.deskripsi,
  kategori: r.kategori,
  hari: r.hari,
  exp: r.exp,
  tipe: r.tipe,
  selesai: r.selesai,
  tanggal: r.tanggal,
  tanggalSelesai: r.tanggal_selesai,
});
const cloudAccToApp = (r) => ({
  id: r.id,
  nama: r.nama,
  ikon: r.ikon,
  saldo: Number(r.saldo),
});
const cloudTxToApp = (r) => ({
  id: r.id,
  tipe: r.tipe,
  nominal: Number(r.nominal),
  kategori: r.kategori,
  akun: r.akun,
  tanggal: r.tanggal,
  catatan: r.catatan,
  wishlistId: r.wishlist_id,
  inventoryId: r.inventory_id,
});
const cloudWishToApp = (r) => ({
  id: r.id,
  gambar: r.gambar,
  nama: r.nama,
  spesifikasi: r.spesifikasi,
  harga: Number(r.harga),
  status: r.status,
  tanggalBeli: r.tanggal_beli,
  transactionId: r.transaction_id,
  inventoryId: r.inventory_id,
});
const cloudInvToApp = (r) => ({
  id: r.id,
  gambar: r.gambar,
  nama: r.nama,
  harga: Number(r.harga),
  tanggalBeli: r.tanggal_beli,
  kondisi: r.kondisi,
  catatan: r.catatan,
  wishlistId: r.wishlist_id,
  transactionId: r.transaction_id,
});
const cloudSavToApp = (r) => ({
  id: r.id,
  nama: r.nama,
  target: Number(r.target),
  terkumpul: Number(r.terkumpul),
  deadline: r.deadline,
});
const cloudGoalToApp = (r) => ({
  id: r.id,
  judul: r.judul,
  kategori: r.kategori,
  deskripsi: r.deskripsi,
  selesai: r.selesai,
});
const cloudSosToApp = (r) => ({
  id: r.id,
  tipe: r.tipe,
  deskripsi: r.deskripsi,
  tanggal: r.tanggal,
});
const cloudLogToApp = (r) => ({
  id: r.id,
  tipe: r.tipe,
  teks: r.teks,
  waktu: r.waktu,
});
const cloudChatToApp = (r) => ({
  id: r.id,
  judul: r.judul,
  pesan: r.pesan || [],
});

// ============================================================
// SYNC PENUH: APP → Cloud (dipanggil setelah setiap perubahan)
// ============================================================
async function syncSemuaKeCloud(showMsg = true) {
  const sb = getSB();
  if (!sb || !getUserId() || !IS_ONLINE) {
    SYNC_PENDING = true;
    updateSyncBadge();
    return;
  }

  try {
    SYNC_PENDING = true;
    updateSyncBadge();
    const uid = getUserId();

    // ── Profil ──
    await db("profiles").upsert({
      id: uid,
      nama: APP.profil.nama || "",
      panggilan: APP.profil.panggilan || "",
      umur: APP.profil.umur || "",
      lahir: APP.profil.lahir || "",
      kota: APP.profil.kota || "",
      deskripsi: APP.profil.deskripsi || "",
      foto: APP.profil.foto || "",
      google_foto: APP.profil.googleFoto || "",
      google_nama: APP.profil.googleNama || "",
      google_email: APP.profil.googleEmail || CURRENT_USER.email || "",
      level: APP.level,
      exp: APP.exp,
      total_exp: APP.totalExp,
      dark_mode: APP.darkMode,
      stats: APP.stats,
      productivity_log: APP.productivityLog,
      updated_at: new Date().toISOString(),
    });

    // Sync fungsi bantu per tabel
    await syncTabel("quests", APP.quest, appQuestToCloud, uid);
    await syncTabel("finance_accounts", APP.accounts, appAccToCloud, uid);
    await syncTabel("transactions", APP.transactions, appTxToCloud, uid);
    await syncTabel("wishlist", APP.wishlist, appWishToCloud, uid);
    await syncTabel("inventory", APP.inventory, appInvToCloud, uid);
    await syncTabel("savings", APP.savings, appSavToCloud, uid);
    await syncTabel("goals", APP.goals, appGoalToCloud, uid);
    await syncTabel("sosial", APP.sosial, appSosToCloud, uid);
    await syncTabel("ai_chats", APP.aiChats, appChatToCloud, uid);

    // Activity logs — hanya upsert (tidak hapus log lama dari cloud)
    if (APP.activityLog.length > 0) {
      await db("activity_logs").upsert(
        APP.activityLog.slice(0, 50).map((a) => appLogToCloud(a, uid)),
      );
    }

    SYNC_PENDING = false;
    updateSyncBadge();
    if (showMsg)
      showSyncToast("Data berhasil disinkronkan ke cloud!", "success");
  } catch (err) {
    console.error("Sync gagal:", err);
    SYNC_PENDING = true;
    updateSyncBadge();
    if (showMsg)
      showSyncToast("Sinkronisasi gagal. Akan dicoba lagi.", "error");
  }
}

/** Sync satu tabel: delete semua milik user, lalu insert ulang */
async function syncTabel(tabelNama, dataArr, mapper, uid) {
  if (!dataArr || dataArr.length === 0) {
    // Kosongkan tabel untuk user ini
    await db(tabelNama).delete().eq("user_id", uid);
    return;
  }
  // Upsert semua baris
  const rows = dataArr.map((item) => mapper(item, uid));
  const { error } = await db(tabelNama).upsert(rows, { onConflict: "id" });
  if (error) throw error;

  // Hapus baris yang sudah tidak ada di APP (sudah dihapus user)
  const idsApp = dataArr.map((x) => x.id);
  await db(tabelNama)
    .delete()
    .eq("user_id", uid)
    .not("id", "in", `(${idsApp.map((id) => `'${id}'`).join(",")})`);
}

// ============================================================
// MAPPER: APP → Cloud format (camelCase → snake_case)
// ============================================================
const appQuestToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  judul: r.judul,
  deskripsi: r.deskripsi || "",
  kategori: r.kategori,
  hari: r.hari || "",
  exp: r.exp,
  tipe: r.tipe,
  selesai: r.selesai || false,
  tanggal: r.tanggal || "",
  tanggal_selesai: r.tanggalSelesai || "",
});
const appAccToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  nama: r.nama,
  ikon: r.ikon || "💳",
  saldo: Number(r.saldo || 0),
});
const appTxToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  tipe: r.tipe,
  nominal: Number(r.nominal || 0),
  kategori: r.kategori || "",
  akun: r.akun || "",
  tanggal: r.tanggal || "",
  catatan: r.catatan || "",
  wishlist_id: r.wishlistId || "",
  inventory_id: r.inventoryId || "",
});
const appWishToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  gambar: r.gambar || "",
  nama: r.nama,
  spesifikasi: r.spesifikasi || "",
  harga: Number(r.harga || 0),
  status: r.status || "belum",
  tanggal_beli: r.tanggalBeli || "",
  transaction_id: r.transactionId || "",
  inventory_id: r.inventoryId || "",
});
const appInvToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  gambar: r.gambar || "",
  nama: r.nama,
  harga: Number(r.harga || 0),
  tanggal_beli: r.tanggalBeli || "",
  kondisi: r.kondisi || "Baru",
  catatan: r.catatan || "",
  wishlist_id: r.wishlistId || "",
  transaction_id: r.transactionId || "",
});
const appSavToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  nama: r.nama,
  target: Number(r.target || 0),
  terkumpul: Number(r.terkumpul || 0),
  deadline: r.deadline || "",
});
const appGoalToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  judul: r.judul,
  kategori: r.kategori,
  deskripsi: r.deskripsi || "",
  selesai: r.selesai || false,
});
const appSosToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  tipe: r.tipe,
  deskripsi: r.deskripsi || "",
  tanggal: r.tanggal || "",
});
const appLogToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  tipe: r.tipe,
  teks: r.teks,
  waktu: r.waktu || new Date().toISOString(),
});
const appChatToCloud = (r, uid) => ({
  id: r.id,
  user_id: uid,
  judul: r.judul || "",
  pesan: r.pesan || [],
});

// ============================================================
// SYNC RINGAN: hanya sinkron saat ada perubahan
// Dipanggil dari script.js setelah setiap simpanData()
// ============================================================
let _syncDebounceTimer = null;
function syncSetelahPerubahan() {
  if (!isLoggedIn() || !IS_ONLINE) {
    SYNC_PENDING = true;
    updateSyncBadge();
    return;
  }
  // Debounce 2 detik agar tidak flood API
  clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(() => syncSemuaKeCloud(false), 2000);
  updateSyncBadge();
}

// ============================================================
// MIGRASI: Data lokal → Cloud (ditawarkan saat login pertama)
// ============================================================
async function cekMigrasiDataLokal() {
  if (!isLoggedIn()) return;

  // Cek apakah ada data lokal lama (sebelum login)
  const rawLokal = localStorage.getItem("an_progress_data_lokal_backup");
  const rawApp = localStorage.getItem("an_progress_data");
  if (!rawApp) return;

  let dataLokal;
  try {
    dataLokal = JSON.parse(rawApp);
  } catch {
    return;
  }

  // Cek apakah data lokal punya konten bermakna
  const punyaData =
    dataLokal.quest?.length > 0 ||
    dataLokal.accounts?.length > 0 ||
    dataLokal.transactions?.length > 0 ||
    dataLokal.wishlist?.length > 0;

  if (!punyaData) return;
  if (rawLokal === "migrated") return; // sudah pernah migrasi

  // Cek apakah data cloud masih kosong (user baru)
  const { data: cloudQuest } = await db("quests")
    .select("id")
    .eq("user_id", getUserId())
    .limit(1);

  if (cloudQuest && cloudQuest.length > 0) {
    // Cloud sudah ada data → skip, tandai sudah
    localStorage.setItem("an_progress_data_lokal_backup", "migrated");
    return;
  }

  // Tampilkan popup migrasi
  tampilkanPopupMigrasi(dataLokal);
}

function tampilkanPopupMigrasi(dataLokal) {
  const popup = document.createElement("div");
  popup.id = "migrasi-popup";
  popup.innerHTML = `
    <div class="migrasi-card">
      <div class="migrasi-icon">📦</div>
      <h3>Data Lokal Ditemukan</h3>
      <p>Kami menemukan data AN Progress yang tersimpan lokal di perangkat ini.</p>
      <div class="migrasi-stats">
        <span>${dataLokal.quest?.length || 0} Quest</span>
        <span>${dataLokal.transactions?.length || 0} Transaksi</span>
        <span>${dataLokal.wishlist?.length || 0} Wishlist</span>
        <span>${dataLokal.inventory?.length || 0} Inventori</span>
      </div>
      <p>Apakah Anda ingin mengunggah data lokal ke cloud agar tidak hilang?</p>
      <div class="migrasi-actions">
        <button class="btn-primary" id="btn-ya-migrasi">Ya, Unggah ke Cloud</button>
        <button class="btn-secondary" id="btn-tidak-migrasi">Tidak Sekarang</button>
      </div>
    </div>`;
  document.body.appendChild(popup);

  document
    .getElementById("btn-ya-migrasi")
    .addEventListener("click", async () => {
      popup.remove();
      await migrasiDataLokalKeCloud(dataLokal);
    });
  document.getElementById("btn-tidak-migrasi").addEventListener("click", () => {
    popup.remove();
    localStorage.setItem("an_progress_data_lokal_backup", "migrated");
  });
}

async function migrasiDataLokalKeCloud(dataLokal) {
  showSyncToast("Mengunggah data lokal ke cloud...", "default");

  // Gabungkan data lokal ke APP
  if (dataLokal.quest?.length) APP.quest = dataLokal.quest;
  if (dataLokal.accounts?.length) APP.accounts = dataLokal.accounts;
  if (dataLokal.transactions?.length) APP.transactions = dataLokal.transactions;
  if (dataLokal.wishlist?.length) APP.wishlist = dataLokal.wishlist;
  if (dataLokal.inventory?.length) APP.inventory = dataLokal.inventory;
  if (dataLokal.savings?.length) APP.savings = dataLokal.savings;
  if (dataLokal.goals?.length) APP.goals = dataLokal.goals;
  if (dataLokal.sosial?.length) APP.sosial = dataLokal.sosial;
  if (dataLokal.profil) Object.assign(APP.profil, dataLokal.profil);
  if (dataLokal.level) APP.level = dataLokal.level;
  if (dataLokal.exp !== undefined) APP.exp = dataLokal.exp;
  if (dataLokal.totalExp) APP.totalExp = dataLokal.totalExp;
  if (dataLokal.stats) APP.stats = dataLokal.stats;
  if (dataLokal.productivityLog)
    APP.productivityLog = dataLokal.productivityLog;

  // Upload semua ke cloud
  await syncSemuaKeCloud(false);

  // Tandai sudah migrasi
  localStorage.setItem("an_progress_data_lokal_backup", "migrated");

  if (typeof simpanData === "function") simpanData();
  if (typeof renderAll === "function") renderAll();
  if (typeof logAktivitas === "function") {
    logAktivitas("sistem", "Migrasi data lokal ke cloud berhasil");
  }

  showSyncToast("Data lokal berhasil diunggah ke cloud!", "success");
}

// ============================================================
// SYNC SEKARANG (tombol manual di Profil)
// ============================================================
async function syncSekarang() {
  if (!isLoggedIn()) {
    showSyncToast("Login dulu untuk sinkronisasi.", "warning");
    return;
  }
  if (!IS_ONLINE) {
    showSyncToast("Tidak ada koneksi internet.", "error");
    return;
  }
  await syncSemuaKeCloud(true);
  if (typeof logAktivitas === "function") {
    logAktivitas("sistem", "Sinkronisasi manual ke cloud berhasil");
  }
}

// ============================================================
// PATCH simpanData — inject sync setelah setiap save
// Dipanggil setelah script.js selesai load
// ============================================================
function patchSimpanData() {
  // PATCH: Pendekatan lama (overwrite window.simpanData) tidak efektif
  // karena script.js memanggil simpanData() via lexical binding — bukan window.simpanData
  // FIX: Expose syncSetelahPerubahan ke window.ANSupabase (sudah ada di export bawah)
  // lalu script.js akan memanggil window.ANSupabase.syncSetelahPerubahan() langsung
  // dari dalam simpanData() aslinya.
  // Fungsi ini sekarang tidak perlu melakukan apa-apa.
  console.log("[Supabase] patchSimpanData: sync akan dipanggil dari script.js langsung.");
}

// ============================================================
// INIT — dipanggil di akhir DOMContentLoaded dari script.js
// ============================================================
async function initSupabase() {
  if (!isSupabaseReady()) {
    // Supabase belum dikonfigurasi → mode offline penuh
    console.warn(
      "[AN Progress] Supabase belum dikonfigurasi. Jalankan dalam mode offline.",
    );
    updateSyncBadge();
    return;
  }

  // Patch simpanData agar otomatis sync
  patchSimpanData();

  // Cek session
  await cekSession();
}

// ============================================================
// EXPORT ke window agar bisa dipanggil dari script.js / HTML
// ============================================================
window.ANSupabase = {
  init: initSupabase,
  login: loginDenganGoogle,
  logout,
  syncSekarang,
  syncSetelahPerubahan,
  isLoggedIn,
  getUserId,
  CURRENT_USER: () => CURRENT_USER,
};
