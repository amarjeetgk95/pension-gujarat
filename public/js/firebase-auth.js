// ============================================================
// FIREBASE AUTHENTICATION, FIRESTORE DATABASE & UI MODULE
// Pension Management System - Scoped RBAC & Dashboard Engine
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
  getAuth, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updatePassword,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp,
  onSnapshot,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ------------------------------------------------------------
// 1. FIREBASE CONFIGURATION
// ------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyA2uzMI7wpNSIztu8ZzYyk9fYeQgbakD18",
  authDomain: "pension-gujarat.firebaseapp.com",
  projectId: "pension-gujarat",
  storageBucket: "pension-gujarat.firebasestorage.app",
  messagingSenderId: "726293508069",
  appId: "1:726293508069:web:f1c19430737c6e5786890c"
};

// Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------------------------------------------------
// LIVE PRESENCE ENGINE (online status + last seen)
// Writes ONLY { online, lastSeen } to users/{uid} with merge:true.
// It never writes role/officeId/email, so it cannot demote or
// clobber any profile. The heartbeat starts only after the
// profile doc is confirmed to exist (see auth handler below), so
// no orphan / role-less docs are ever created.
// ------------------------------------------------------------
const PRESENCE_HEARTBEAT_MS = 30000;
const PRESENCE_ONLINE_WINDOW_SEC = 90;

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

window.startPresenceHeartbeat = function (uid) {
  if (!uid) return;
  window._presenceUid = uid;
  const markOnline = () => {
    try {
      setDoc(doc(db, "users", uid), { online: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    } catch (e) {}
  };
  markOnline();
  if (window._presenceTimer) clearInterval(window._presenceTimer);
  window._presenceTimer = setInterval(markOnline, PRESENCE_HEARTBEAT_MS);
  if (!window._presenceOfflineBound) {
    window._presenceOfflineBound = true;
    const markOffline = () => {
      try {
        setDoc(doc(db, "users", uid), { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
      } catch (e) {}
    };
    window.addEventListener('beforeunload', markOffline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') markOffline();
      else if (document.visibilityState === 'visible') markOnline();
    });
  }
};

window.stopPresenceHeartbeat = function () {
  if (window._presenceTimer) { clearInterval(window._presenceTimer); window._presenceTimer = null; }
  const uid = window._presenceUid;
  if (uid) {
    try {
      setDoc(doc(db, "users", uid), { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    } catch (e) {}
  }
  window._presenceUid = null;
};

// ----- Admin live monitor: online users + last seen -----
let adminPresenceUnsub = null;

function presenceTimeAgo(ms, now) {
  if (!ms) return 'Never';
  const s = Math.max(1, Math.round((now - ms) / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.round(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.round(h / 24);
  return d + 'd ago';
}

window.startAdminPresenceMonitor = function () {
  if (adminPresenceUnsub) return;
  const render = (snap) => {
    const now = Date.now();
    const users = [];
    snap.forEach(d => {
      const r = d.data() || {};
      const lastSeen = (r.lastSeen && typeof r.lastSeen.toMillis === 'function') ? r.lastSeen.toMillis() : 0;
      // Effective online = flag set AND heartbeat still fresh. A user whose
      // tab was closed/crashed (no offline write ever landed) still has
      // online:true in the DB, but lastSeen stops updating -> shown offline.
      const isOnline = r.online === true && lastSeen > 0 && (now - lastSeen) < (PRESENCE_ONLINE_WINDOW_SEC * 1000);
      users.push({
        id: d.id,
        email: r.email || d.id,
        role: r.role || 'office_user',
        officeId: r.officeId || '',
        online: isOnline,
        lastSeen: lastSeen
      });
    });
    users.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    });

    const onlineCount = users.filter(u => u.online).length;
    const badge = document.getElementById('adminLiveCount');
    if (badge) badge.textContent = onlineCount;
    const totalEl = document.getElementById('liveOnlineTotal');
    if (totalEl) totalEl.textContent = users.length;
    const nowEl = document.getElementById('liveOnlineNow');
    if (nowEl) nowEl.textContent = onlineCount;

    const listEl = document.getElementById('liveOnlineList');
    if (!listEl) return;
    if (users.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#64748B;font-size:13px;">No users yet.</div>';
      return;
    }
    listEl.innerHTML = users.map(u => {
      const dot = u.online
        ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 3px rgba(34,197,94,0.15);margin-right:8px;flex-shrink:0;"></span>'
        : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#CBD5E1;margin-right:8px;flex-shrink:0;"></span>';
      const state = u.online
        ? '<span style="color:#16A34A;font-weight:700;">Online</span>'
        : '<span style="color:#94A3B8;">Offline</span>';
      const seen = u.online ? 'Just now' : presenceTimeAgo(u.lastSeen, now);
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 6px;border-bottom:1px solid #F1F5F9;">' +
        '<div style="display:flex;align-items:center;min-width:0;">' + dot +
          '<div style="min-width:0;">' +
            '<div style="font-size:13px;font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(u.email) + '</div>' +
            '<div style="font-size:11px;color:#64748B;">' + escHtml(u.role) + (u.officeId ? ' \u2022 ' + escHtml(u.officeId) : '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' +
          '<div style="font-size:11px;">' + state + '</div>' +
          '<div style="font-size:10.5px;color:#94A3B8;">Last seen: ' + seen + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  };
  try {
    adminPresenceUnsub = onSnapshot(collection(db, "users"), render, (err) => {
      console.warn("Live online monitor unavailable:", err);
    });
  } catch (e) {
    console.warn("Live online monitor failed to start:", e);
  }
};

window.stopAdminPresenceMonitor = function () {
  if (adminPresenceUnsub) { adminPresenceUnsub(); adminPresenceUnsub = null; }
};

// Enforce Session-Only Persistence (clears on browser tab/window close)
try {
  setPersistence(auth, browserSessionPersistence);
} catch (e) {
  console.warn("Persistence notice:", e);
}

// Global Application State Variables
window.currentUser = null;
window.currentUserProfile = null;
window.allFetchedCases = [];
window.currentFilter = 'all';

window.checkSessionExpiry = function() {
  let loginTimeStr = localStorage.getItem('pension_login_timestamp');
  if (!loginTimeStr) {
    localStorage.setItem('pension_login_timestamp', String(Date.now()));
    return false;
  }
  const loginTime = parseInt(loginTimeStr, 10);
  if (isNaN(loginTime)) {
    localStorage.setItem('pension_login_timestamp', String(Date.now()));
    return false;
  }
  return (Date.now() - loginTime) >= (30 * 60 * 1000);
};

// Function to safely hide loader and reveal app
function revealAppUI() {
  const authLoader = document.getElementById('auth-guard-loader');
  if (authLoader) authLoader.style.display = 'none';

  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.classList.add('auth-verified');
}

// ------------------------------------------------------------
// 2. SAFE AUTHENTICATION GUARD
// ------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 🛑 ABSOLUTE 30-MINUTE EXPIRY GUARD: Force logout if 30 mins passed since login
    if (window.checkSessionExpiry()) {
      console.log("30-minute login session timed out. Forcing re-authentication...");
      localStorage.removeItem('pension_login_timestamp');
      window.currentUser = null;
      window.currentUserProfile = null;
      try { await signOut(auth); } catch (e) {}
      const isLoginPage = window.location.pathname.toLowerCase().includes("login");
      if (!isLoginPage) {
        window.location.replace("login.html");
      }
      return;
    }

    window.currentUser = user;

    // Read or auto-provision User Profile Document with 2.5s timeout guard
    try {
      const userDocRef = doc(db, "users", user.uid);
      const fetchPromise = getDoc(userDocRef);
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
      const userDocSnap = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (userDocSnap && userDocSnap.exists()) {
        window.currentUserProfile = userDocSnap.data();

        // ENFORCE SUSPENSION: Force logout if user is suspended
        if (window.currentUserProfile.status === 'suspended') {
          alert("Your account has been suspended. Please contact an administrator.");
          window.currentUser = null;
          window.currentUserProfile = null;
          try { await signOut(auth); } catch (e) {}
          const isLoginPage = window.location.pathname.toLowerCase().includes("login");
          if (!isLoginPage) window.location.replace("login.html");
          return;
        }
      } else {
        window.currentUserProfile = {
          role: 'office_user',
          officeId: 'main_headquarters',
          email: user.email || ''
        };
        setDoc(userDocRef, window.currentUserProfile, { merge: true }).catch(() => {});
      }
    } catch (err) {
      console.warn("User profile fetch notice:", err);
      window.currentUserProfile = { role: 'office_user', officeId: 'main_headquarters', email: user.email || '' };
    }

    const userRole = String(window.currentUserProfile?.role || '').toLowerCase();
    const isAdmin = (userRole === 'admin' || userRole === 'super_admin');

    // Display Logged In Username/Email in Top Header & Sidebar Footer Card
    const headerNameEl = document.getElementById('headerUserName');
    if (headerNameEl) {
      const displayName = user.displayName || user.email || 'User';
      headerNameEl.textContent = displayName;
    }

    const sideEmailEl = document.getElementById('sideProfileEmail');
    const sideRoleEl = document.getElementById('sideProfileRole');
    if (sideEmailEl) sideEmailEl.textContent = user.email || 'Officer Workspace';
    if (sideRoleEl) sideRoleEl.textContent = isAdmin ? 'Super Admin' : 'Office User';

    // Toggle Admin Panel in sidebar strictly based on admin role
    const adminLi = document.getElementById('nav-admin-li');
    if (adminLi) {
      adminLi.style.display = isAdmin ? 'block' : 'none';
    }

    // Start 30-minute auto-logout countdown timer
    if (typeof window.startSessionTimer === 'function') window.startSessionTimer();

    // 🔓 REVEAL AUTHENTICATED APP CONTENT & REMOVE SECURITY GUARD LOADER IMMEDIATELY
    revealAppUI();

    // Refresh Dashboard and Global Settings asynchronously after UI reveal
    if (typeof window.refreshCaseList === 'function') window.refreshCaseList().catch(() => {});
    if (typeof window.loadSettings === 'function') window.loadSettings().catch(() => {});

    // LIVE PRESENCE: start the heartbeat only after the profile doc is
    // confirmed to exist (allows provisioning to settle). Never touches role.
    if (typeof window.startPresenceHeartbeat === 'function') {
      setTimeout(() => {
        try {
          getDoc(doc(db, "users", user.uid)).then(s => {
            if (s.exists()) window.startPresenceHeartbeat(user.uid);
          }).catch(() => {});
        } catch (e) {}
      }, 3000);
    }

    // Admins get a live view of online users with last seen
    if (isAdmin && typeof window.startAdminPresenceMonitor === 'function') {
      window.startAdminPresenceMonitor();
    }

  } else {
    window.currentUser = null;
    window.currentUserProfile = null;
    if (typeof window.stopSessionTimer === 'function') window.stopSessionTimer();
    if (typeof window.stopPresenceHeartbeat === 'function') window.stopPresenceHeartbeat();
    if (typeof window.stopAdminPresenceMonitor === 'function') window.stopAdminPresenceMonitor();
    
    // Only redirect if unauthenticated and not already on the login page
    const isLoginPage = window.location.pathname.toLowerCase().includes("login");
    if (!isLoginPage) {
      window.location.replace("login.html");
    }
  }
});

// ------------------------------------------------------------
// FIXED 30-MINUTE ABSOLUTE SESSION EXPIRY ENGINE (FROM LOGIN TIME)
// ------------------------------------------------------------
const SESSION_DURATION_SECONDS = 30 * 60; // 30 minutes (1800 seconds)
let sessionTimerInterval = null;

function formatSessionTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

window.startSessionTimer = function() {
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);

  let loginTimestampStr = localStorage.getItem('pension_login_timestamp');
  let loginTimestamp = loginTimestampStr ? parseInt(loginTimestampStr, 10) : Date.now();
  if (!loginTimestampStr) {
    loginTimestamp = Date.now();
    localStorage.setItem('pension_login_timestamp', loginTimestamp);
  }

  // Force immediate logout if 30 minutes passed
  if (Date.now() - loginTimestamp >= (SESSION_DURATION_SECONDS * 1000)) {
    localStorage.removeItem('pension_login_timestamp');
    window.logoutUser();
    return;
  }

  const timerBadgeEl = document.getElementById('sessionTimerBadge');
  if (timerBadgeEl) timerBadgeEl.style.display = 'inline-flex';

  const updateTimer = () => {
    const elapsedSeconds = Math.floor((Date.now() - loginTimestamp) / 1000);
    const remainingSeconds = Math.max(0, SESSION_DURATION_SECONDS - elapsedSeconds);

    const timerTextEl = document.getElementById('sessionTimerText');
    if (timerTextEl) {
      timerTextEl.textContent = formatSessionTime(remainingSeconds);
    }

    // Warning alert color when < 2 minutes (120s) remaining
    if (timerBadgeEl) {
      if (remainingSeconds <= 120) {
        timerBadgeEl.style.background = '#FEF2F2';
        timerBadgeEl.style.color = '#B91C1C';
        timerBadgeEl.style.borderColor = '#FECACA';
      } else {
        timerBadgeEl.style.background = '#E9F9EF';
        timerBadgeEl.style.color = '#2AAE48';
        timerBadgeEl.style.borderColor = '#B8E8C8';
      }
    }

    if (remainingSeconds <= 0) {
      clearInterval(sessionTimerInterval);
      localStorage.removeItem('pension_login_timestamp');
      alert("⏱️ Session Expired: Your 30-minute session has timed out. Please log in again with your email and password.");
      window.logoutUser();
    }
  };

  updateTimer();
  sessionTimerInterval = setInterval(updateTimer, 1000);
};

window.stopSessionTimer = function() {
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  localStorage.removeItem('pension_login_timestamp');
  const timerBadgeEl = document.getElementById('sessionTimerBadge');
  if (timerBadgeEl) timerBadgeEl.style.display = 'none';
};

// Explicit Logout Execution
window.logoutUser = async function() {
  window.stopSessionTimer();
  localStorage.removeItem('pension_login_timestamp');
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    alert("Logout failed: " + error.message);
  }
};

// ------------------------------------------------------------
// 3. CASE FETCHING & SCOPED QUERIES
// ------------------------------------------------------------
async function fetchAdminCaseList() {
  const casesCollection = collection(db, "cases");
  const querySnapshot = await getDocs(casesCollection);
  
  return querySnapshot.docs.map(docSnap => {
    const d = docSnap.data();
    return {
      caseId: docSnap.id,
      fullName: d.fullName || '',
      dor: d.dor || '',
      designation: d.designation || '',
      status: d.status || 'Draft',
      officeId: d.officeId || 'main_headquarters',
      raw: d
    };
  });
}

async function fetchOfficeCaseList(officeId) {
  const targetOffice = officeId || "main_headquarters";
  try {
    const scopedQuery = query(
      collection(db, "cases"), 
      where("officeId", "==", targetOffice)
    );
    
    const querySnapshot = await getDocs(scopedQuery);
    let docs = querySnapshot.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        caseId: docSnap.id,
        fullName: d.fullName || '',
        dor: d.dor || '',
        designation: d.designation || '',
        status: d.status || 'Draft',
        officeId: d.officeId || targetOffice,
        raw: d
      };
    });

    return docs;
  } catch (err) {
    console.error("Error fetching office case list:", err);
    return [];
  }
}

window.refreshCaseList = async function() {
  const statusEl = document.getElementById('dashLoadStatus');
  if (statusEl) statusEl.textContent = 'Loading cases...';
  
  try {
    const userRole = window.currentUserProfile?.role;
    const userOfficeId = window.currentUserProfile?.officeId;
    let list = [];

    if (userRole === 'admin') {
      list = await fetchAdminCaseList();
    } else {
      list = await fetchOfficeCaseList(userOfficeId);
    }
    
    window.allFetchedCases = list;
    window.renderCaseList(window.allFetchedCases);
    if (typeof window.renderDashboardAnalytics === 'function') window.renderDashboardAnalytics();
    if (typeof window.refreshNotifications === 'function') window.refreshNotifications();
    if (statusEl) statusEl.textContent = 'Synced ✓';
  } catch (error) {
    if (statusEl) statusEl.textContent = 'Error: ' + error.message;
    console.error("Fetch Cases Error:", error);
  }
};

// ------------------------------------------------------------
// 4. DASHBOARD UI RENDERING, SEARCH & FILTERING
// ------------------------------------------------------------
window.renderCaseList = function(casesToRender) {
  const tbody = document.getElementById('dashCaseListBody');
  if (!tbody) return;

  const userRole = String(window.currentUserProfile?.role || '').toLowerCase();
  const isAdmin = (userRole === 'admin' || userRole === 'super_admin');

  const headEl = document.getElementById('dashTableHead');
  if (headEl) {
    if (isAdmin) {
      headEl.innerHTML = `
        <tr>
          <th>Case ID</th>
          <th>Office Name / ID</th>
          <th>Name</th>
          <th>Retirement</th>
          <th>Designation</th>
          <th>Status</th>
          <th style="text-align:center;">Actions</th>
        </tr>`;
    } else {
      headEl.innerHTML = `
        <tr>
          <th>Case ID</th>
          <th>Name</th>
          <th>Retirement</th>
          <th>Designation</th>
          <th>Status</th>
          <th style="text-align:center;">Actions</th>
        </tr>`;
    }
  }

  const totalEl = document.getElementById('statTotal');
  const totalSubEl = document.getElementById('statTotalSub');
  const completedEl = document.getElementById('statCompleted');
  const completedSubEl = document.getElementById('statCompletedSub');
  const draftEl = document.getElementById('statDraft');
  const draftSubEl = document.getElementById('statDraftSub');
  const missingEl = document.getElementById('statMissing');
  const missingSubEl = document.getElementById('statMissingSub');

  let totalCount = window.allFetchedCases.length;
  let completedCount = 0;
  let approvedCount = 0;
  let inProgressCount = 0;
  let draftCount = 0;
  let missingCount = 0;
  let rejectedCount = 0;

  window.allFetchedCases.forEach(c => {
    const st = (c.status || '').toLowerCase();
    const isCompleted = st === 'completed';
    const isApproved = st === 'approved';
    const isMissing = !c.fullName || !c.dor || !c.designation;
    if (isCompleted) completedCount++;
    if (isApproved) approvedCount++;
    if (st === 'draft') draftCount++;
    if (!isCompleted && !isApproved && st !== 'rejected' && !isMissing) inProgressCount++;
    if (st === 'rejected') rejectedCount++;
    if (isMissing) missingCount++;
  });

  const finalisedCount = completedCount + approvedCount;

  if (totalEl) totalEl.textContent = totalCount;
  if (totalSubEl) totalSubEl.textContent = isAdmin ? 'Across all offices' : 'Your office scope';
  if (completedEl) completedEl.textContent = finalisedCount;
  if (completedSubEl) completedSubEl.textContent = totalCount ? Math.round((finalisedCount / totalCount) * 100) + '% of cases finalised' : 'No cases yet';
  if (draftEl) draftEl.textContent = draftCount;
  if (draftSubEl) draftSubEl.textContent = inProgressCount + ' in progress · ' + rejectedCount + ' rejected';
  if (missingEl) missingEl.textContent = missingCount;
  if (missingSubEl) missingSubEl.textContent = missingCount ? 'Need profile info' : 'All profiles complete';

  // Filter list according to current pill
  let filtered = (typeof window._applyCurrentFilter === 'function') ? window._applyCurrentFilter(casesToRender || []) : (casesToRender || []).slice();

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${isAdmin ? 7 : 6}">
          <div class="dash-empty-state">
            <div class="empty-icon">📋</div>
            <h3>No cases found</h3>
            <p>No pension cases match the current filter or search criteria.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  // Use DOM methods to prevent XSS (never interpolate user data into innerHTML)
  tbody.innerHTML = '';
  filtered.forEach(c => {
    const badgeClass = (typeof window._statusBadgeClass === 'function') ? window._statusBadgeClass(c.status) : 'draft';
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    const idSpan = document.createElement('span');
    idSpan.textContent = c.caseId;
    idSpan.style.cssText = 'font-weight:600; color:var(--mod-text-muted);';
    tdId.appendChild(idSpan);
    tr.appendChild(tdId);

    if (isAdmin) {
      const tdOffice = document.createElement('td');
      const span = document.createElement('span');
      span.style.cssText = 'font-weight:600; color:var(--mod-primary); font-size:12px;';
      span.textContent = c.officeId || 'main_headquarters';
      tdOffice.appendChild(span);
      tr.appendChild(tdOffice);
    }

    const tdName = document.createElement('td');
    const nameLink = document.createElement('a');
    nameLink.textContent = c.fullName || '—';
    nameLink.href = '#';
    nameLink.title = 'Click to open this case';
    nameLink.style.cssText = 'cursor:pointer; color:#0062E3; text-decoration:underline; font-weight:600;';
    nameLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.loadCaseById(c.caseId).then(() => window.switchView('entry'));
    });
    tdName.appendChild(nameLink);
    tr.appendChild(tdName);

    const tdDor = document.createElement('td');
    tdDor.textContent = (typeof formatDateStandard === 'function' ? formatDateStandard(c.dor) : (c.dor || '—'));
    tr.appendChild(tdDor);

    const tdDesig = document.createElement('td');
    tdDesig.textContent = c.designation || '—';
    tr.appendChild(tdDesig);

    const tdStatus = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status-indicator ' + badgeClass;
    statusSpan.textContent = c.status || 'Draft';
    tdStatus.appendChild(statusSpan);
    tr.appendChild(tdStatus);

    const tdActions = document.createElement('td');
    tdActions.style.cssText = 'text-align:center; white-space:nowrap;';

    const btnView = document.createElement('button');
    btnView.className = 'btn btn-outline';
    btnView.style.cssText = 'padding:4px 8px; margin-right:4px; font-size:12px;';
    btnView.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>View';
    btnView.addEventListener('click', () => { window.loadCaseById(c.caseId).then(() => window.switchView('print-centre')); });
    tdActions.appendChild(btnView);

    const btnPrint = document.createElement('button');
    btnPrint.className = 'btn btn-outline';
    btnPrint.style.cssText = 'padding:4px 8px; margin-right:4px; font-size:12px;';
    btnPrint.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Print';
    btnPrint.addEventListener('click', () => { window.loadCaseById(c.caseId).then(() => window.popupNativePrintAll()); });
    tdActions.appendChild(btnPrint);

    const btnCopy = document.createElement('button');
    btnCopy.className = 'btn btn-outline';
    btnCopy.style.cssText = 'padding:4px 8px; margin-right:4px; font-size:12px;';
    btnCopy.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy';
    btnCopy.addEventListener('click', () => { window.duplicateSpecificCase(c.caseId); });
    tdActions.appendChild(btnCopy);

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-outline-danger';
    btnDelete.style.cssText = 'padding:4px 8px; font-size:12px; color:#ef4444; border-color:#ef4444;';
    btnDelete.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete';
    btnDelete.addEventListener('click', () => { window.deleteSpecificCase(c.caseId); });
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
};

window._statusBadgeClass = function(status) {
  const st = String(status || '').toLowerCase().trim();
  if (st === 'sent_for_sanction' || st === 'sent-for-sanction' || st === 'pending for sanction') return 'sent-for-sanction';
  if (st === 'completed') return 'completed';
  if (st === 'approved') return 'approved';
  if (st === 'pending') return 'pending';
  if (st === 'rejected') return 'rejected';
  return 'draft';
};

window._applyCurrentFilter = function(arr) {
  const f = window.currentFilter;
  const list = arr || [];
  if (f === 'draft') return list.filter(c => (c.status || '').toLowerCase() === 'draft');
  if (f === 'completed') return list.filter(c => (c.status || '').toLowerCase() === 'completed');
  if (f === 'missing') return list.filter(c => !c.fullName || !c.dor || !c.designation);
  if (f === 'upcoming') return list.filter(c => { const d = window._daysUntil ? window._daysUntil(c.dor) : Infinity; return d >= 0 && d <= 90; });
  if (f === 'stale') return list.filter(c => {
    const st = (c.status || '').toLowerCase();
    if (st !== 'draft') return false;
    const ts = (c.updatedAt && c.updatedAt.seconds) || (c.createdAt && c.createdAt.seconds);
    return !!(ts && ((Date.now() / 1000) - ts) / 86400 > 7);
  });
  return list.slice();
};

window.performSearch = function() {
  const searchInput = document.getElementById('searchInput');
  const countEl = document.getElementById('searchResultCount');
  if (!searchInput) return;
  const q = searchInput.value.trim().toLowerCase();
  const dateFrom = document.getElementById('filterDateFrom') ? document.getElementById('filterDateFrom').value : '';
  const dateTo = document.getElementById('filterDateTo') ? document.getElementById('filterDateTo').value : '';
  const officeFilter = document.getElementById('filterOffice') ? document.getElementById('filterOffice').value : '';
  const sortBy = document.getElementById('filterSort') ? document.getElementById('filterSort').value : '';

  let results = (window.allFetchedCases || []).slice();

  if (q) {
    results = results.filter(c => {
      return (
        (c.caseId || '').toLowerCase().includes(q) ||
        (c.fullName || '').toLowerCase().includes(q) ||
        (c.designation || '').toLowerCase().includes(q) ||
        (c.dor || '').toLowerCase().includes(q) ||
        (c.ppoNo || '').toLowerCase().includes(q) ||
        (c.fatherName || '').toLowerCase().includes(q) ||
        (c.surname || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    });
  }

  if (dateFrom) results = results.filter(c => c.dor && c.dor >= dateFrom);
  if (dateTo) results = results.filter(c => c.dor && c.dor <= dateTo);
  if (officeFilter) results = results.filter(c => c.officeId === officeFilter);

  if (typeof window._applyCurrentFilter === 'function') {
    results = window._applyCurrentFilter(results);
  } else {
    if (window.currentFilter === 'draft') {
      results = results.filter(c => (c.status || '').toLowerCase() === 'draft');
    } else if (window.currentFilter === 'completed') {
      results = results.filter(c => (c.status || '').toLowerCase() === 'completed');
    } else if (window.currentFilter === 'missing') {
      results = results.filter(c => !c.fullName || !c.dor || !c.designation);
    } else if (window.currentFilter === 'upcoming') {
      results = results.filter(c => { const d = window._daysUntil ? window._daysUntil(c.dor) : Infinity; return d >= 0 && d <= 90; });
    }
  }

  if (sortBy === 'name') {
    results.sort((a,b) => (a.fullName || '').localeCompare(b.fullName || ''));
  } else if (sortBy === 'dor') {
    results.sort((a,b) => (a.dor || '').localeCompare(b.dor || ''));
  } else if (sortBy === 'status') {
    results.sort((a,b) => (a.status || '').localeCompare(b.status || ''));
  } else if (sortBy === 'oldest') {
    results.sort((a,b) => {
      const ta = (a.createdAt && a.createdAt.seconds) || 0;
      const tb = (b.createdAt && b.createdAt.seconds) || 0;
      return ta - tb;
    });
  }

  if (countEl) countEl.textContent = (q || dateFrom || dateTo || officeFilter) ? results.length + ' found' : '';
  window.renderCaseList(results);
};

let _searchDebounceTimer = null;
window.debouncedPerformSearch = function() {
  if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer = setTimeout(() => {
    window.performSearch();
  }, 250);
};

window.setFilter = function(btnEl, filterName) {
  document.querySelectorAll('.dash-filter-pill').forEach(pill => pill.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  window.currentFilter = filterName;
  window.performSearch();
};

window.toggleAdvancedFilters = function() {
  const panel = document.getElementById('dashAdvancedFilters');
  const btn = document.getElementById('toggleAdvancedBtn');
  if (!panel) return;
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'flex';
  if (btn) btn.textContent = visible ? '\u2699\uFE0F Advanced' : '\u2715 Hide Filters';
};

window.clearAdvancedFilters = function() {
  ['filterDateFrom','filterDateTo','filterOffice','filterSort'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const si = document.getElementById('searchInput');
  if (si) si.value = '';
  window.currentFilter = 'all';
  document.querySelectorAll('.dash-filter-pill').forEach(p => p.classList.remove('active'));
  const allPill = document.querySelector('.dash-filter-pill[data-filter="all"]');
  if (allPill) allPill.classList.add('active');
  window.renderCaseList(window.allFetchedCases);
};

window.startNewCase = async function() {
  window.currentCaseId = null;
  window.currentCaseData = {};
  const form = document.getElementById('pensionForm');
  if (form) form.reset();

  const caseIdInput = document.getElementById('f_caseId');
  if (caseIdInput) caseIdInput.value = '';

  if (typeof window.updateDynamicHeader === 'function') {
    window.updateDynamicHeader('New Case', 'Draft', '');
  }

  // Ensure latest Office Settings are loaded and auto-populated into the new case form
  if (!window.officeProfilesData) {
    if (typeof window.loadSettings === 'function') {
      await window.loadSettings();
    }
  }

  if (typeof window.applyOfficeSettingsToCaseForm === 'function') {
    window.applyOfficeSettingsToCaseForm(true);
  }

  const payBody = document.getElementById('payPeriodsBody');
  if (payBody) {
    payBody.innerHTML = '';
    if (typeof window.addPayRow === 'function') {
      window.addPayRow({ basic: '', npa: 0, da: 0, count: 10, isInit: true });
    }
  }

  const familyBody = document.getElementById('familyBody');
  if (familyBody) {
    familyBody.innerHTML = '';
    if (typeof window.addFamilyRow === 'function') {
      window.addFamilyRow();
      window.addFamilyRow();
    }
  }

  if (typeof window.openStep === 'function') {
    window.openStep(1);
  }

  if (typeof window.emitLive === 'function') window.emitLive();
  if (typeof window.clearFormDirty === 'function') window.clearFormDirty();
};

// ------------------------------------------------------------
// 5. CASE MUTATIONS (SAVE / LOAD / DELETE / DUPLICATE)
// ------------------------------------------------------------
async function generateCustomId(data) {
  let f = (data.firstName || '').trim().charAt(0).toUpperCase();
  let m = (data.fatherName || '').trim().charAt(0).toUpperCase();
  let s = (data.surname || '').trim().charAt(0).toUpperCase();
  let initials = f + m + s;
  if (!initials) initials = 'EMP';

  let datePart = '00000000';
  if (data.dor) {
    let parts = data.dor.split('-');
    if (parts.length === 3) datePart = parts[2] + parts[1] + parts[0];
    else datePart = String(data.dor).replace(/[^0-9]/g, '');
  }

  let baseId = initials + datePart;
  let existingIds = (window.allFetchedCases || []).map(c => c.caseId);

  let finalId = baseId;
  let counter = 1;
  while (existingIds.includes(finalId)) {
    finalId = baseId + '-' + counter; 
    counter++;
  }
  return finalId;
}

window.saveOrUpdateCase = async function() {
  if (typeof window.collectFormData !== 'function') return false;
  if (window._savingCase) return false;
  let data = window.collectFormData();

  // Consistent validation via the shared engine
  const res = window.validateCaseData ? window.validateCaseData(data) : null;
  const validationErrors = res && res.errors ? res.errors.map(e => 'Step ' + e.step + ': ' + e.message) : [];

  if (validationErrors.length > 0) {
      if (typeof window.setStatus === 'function') {
        window.setStatus('saveStatus', 'Validation: ' + validationErrors.join('; '), true);
      }
      return false;
  }

  // Duplicate-case guard: same fullName + DOB already exists?
  let caseId = document.getElementById('f_caseId') ? document.getElementById('f_caseId').value : '';
  const dupKey = String(data.fullName || '').trim().toLowerCase() + '|' + (data.dob || '');
  const dup = (window.allFetchedCases || []).find(c =>
    c.caseId !== caseId &&
    (String(c.fullName || '').trim().toLowerCase() + '|' + (c.dob || '')) === dupKey
  );
  if (dup) {
    const proceed = confirm(`⚠️ A case for '${data.fullName}' with DOB ${data.dob} already exists (ID: ${dup.caseId}).\n\nCreate this case anyway?`);
    if (!proceed) {
      if (typeof window.setStatus === 'function') {
        window.setStatus('saveStatus', 'Save cancelled — possible duplicate.', true);
      }
      return false;
    }
  }

  if (typeof window.setStatus === 'function') {
    window.setStatus('saveStatus', 'સેવ થઈ રહ્યું છે... (Saving...)', false);
  }

  // Office ownership:
  //  - New cases are stamped with the creator's office.
  //  - Edits preserve the case's original office (no accidental transfers).
  //  - Case transfers are done by admins from the Admin → Cases tab.
  if (!caseId) {
    data.officeId = window.currentUserProfile?.officeId || "main_headquarters";
  } else if (window.currentCaseData && window.currentCaseData.officeId) {
    data.officeId = window.currentCaseData.officeId;
  }
  data.createdByUid = window.currentUser?.uid || '';

  // Harden against double-submit
  window._savingCase = true;
  const saveBtns = document.querySelectorAll('#btnSave, #btnGoPrint');
  saveBtns.forEach(b => { if (b) b.disabled = true; });

  try {
      if (caseId) {
          await setDoc(doc(db, "cases", caseId), {
              ...data,
              updatedAt: serverTimestamp()
          }, { merge: true });
      } else {
          caseId = await generateCustomId(data);
          await setDoc(doc(db, "cases", caseId), {
              ...data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
          });
          if (document.getElementById('f_caseId')) {
            document.getElementById('f_caseId').value = caseId;
          }
      }
      
      window.currentCaseId = caseId;
      window.currentCaseData = Object.assign({}, data, { caseId: caseId });

      if (typeof window.updateDynamicHeader === 'function') {
        window.updateDynamicHeader(data.fullName, data.status, caseId);
      }
      if (typeof window.setStatus === 'function') {
        window.setStatus('saveStatus', 'Saved Successfully. ID: ' + caseId, false);
      }

      if (typeof window.clearFormDirty === 'function') window.clearFormDirty();
      
      window.refreshCaseList();
      return true;
  } catch (error) {
      if (typeof window.setStatus === 'function') {
        window.setStatus('saveStatus', 'Firebase Error: ' + error.message, true);
      }
      return false;
  } finally {
      window._savingCase = false;
      saveBtns.forEach(b => { if (b) b.disabled = false; });
  }
};

window.loadCaseById = async function(caseId) {
  const statusEl = document.getElementById('saveStatus');
  if (statusEl) {
      statusEl.textContent = 'કેસ લોડ થઈ રહ્યો છે... (Loading...)';
      statusEl.className = 'form-status';
  }
  
  try {
      const docSnap = await getDoc(doc(db, "cases", caseId));

      if (docSnap.exists()) {
          let caseData = docSnap.data();
          caseData.caseId = docSnap.id;
          
          window.currentCaseId = caseId;
          window.currentCaseData = caseData;
          try { currentCaseId = caseId; } catch(e){}
          try { currentCaseData = caseData; } catch(e){}

          if (typeof window.fillFormFromCase === 'function') {
            window.fillFormFromCase(caseData);
          }
          if (typeof window.handleLiveFormChange === 'function') {
            window.handleLiveFormChange(caseData);
          }

          // Trigger rendering of Part 1, Part 2, Cover Page, and Forwarding Letter
          if (typeof window.renderForwarding === 'function') window.renderForwarding();
          else if (typeof renderForwarding === 'function') renderForwarding();

          if (typeof window.renderCover === 'function') window.renderCover();
          else if (typeof renderCover === 'function') renderCover();

          if (typeof window.renderPart1 === 'function') window.renderPart1();
          else if (typeof renderPart1 === 'function') renderPart1();

          if (typeof window.renderPart2 === 'function') window.renderPart2();
          else if (typeof renderPart2 === 'function') renderPart2();

      } else {
          throw new Error("Document does not exist or permission denied.");
      }
      if (statusEl) statusEl.textContent = '';
      window.scrollTo(0,0);
  } catch (error) {
      if (statusEl) {
          statusEl.textContent = 'Error loading case: ' + error.message;
          statusEl.className = 'form-status err';
      }
  }
};

window.deleteSpecificCase = async function(id) {
  if (!confirm('⚠️ WARNING: You are about to delete Case #' + id + '.\n\nThis case will be deleted from your office records.')) return;
  
  let statusEl = document.getElementById('dashLoadStatus');
  if (statusEl) statusEl.textContent = 'Deleting...';
  
  try {
      const docSnap = await getDoc(doc(db, "cases", id));
      if (docSnap.exists()) {
        try {
          await setDoc(doc(db, "trash", id), {
            ...docSnap.data(),
            deletedAt: serverTimestamp(),
            deletedByUid: window.currentUser?.uid || ''
          });
        } catch (trashErr) {
          console.warn("Could not copy case to trash archive:", trashErr);
        }
      }

      await deleteDoc(doc(db, "cases", id));
      if (statusEl) statusEl.textContent = 'Case Deleted ✓';
      window.refreshCaseList();
      const role = String(window.currentUserProfile?.role || '').toLowerCase();
      if ((role === 'admin' || role === 'super_admin') && typeof window.adminLoadTrash === 'function') {
        window.adminLoadTrash();
      }
  } catch (error) {
      if (statusEl) statusEl.textContent = 'Error: ' + error.message;
      console.error("Delete Case Error:", error);
  }
};

window.duplicateSpecificCase = async function(id) {
  if (!confirm('Duplicate case #' + id + '? This will copy basic details into a new draft.')) return;
  
  let statusEl = document.getElementById('dashLoadStatus');
  if (statusEl) statusEl.textContent = 'Duplicating...';
  
  try {
      const docSnap = await getDoc(doc(db, "cases", id));
      if (!docSnap.exists()) throw new Error("Source case not found.");
      
      let newCaseData = docSnap.data();
      newCaseData.fullName = (newCaseData.fullName || '') + " (Copy)";
      newCaseData.surnameGuj = (newCaseData.surnameGuj || '') + " (Copy)";
      newCaseData.status = "Draft";
      delete newCaseData.createdAt;
      delete newCaseData.updatedAt;

      const newCaseId = await generateCustomId(newCaseData);
      await setDoc(doc(db, "cases", newCaseId), {
          ...newCaseData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
      });

      if (statusEl) statusEl.textContent = 'Duplicated ✓';
      window.refreshCaseList();
      window.loadCaseById(newCaseId);
      if (typeof window.switchView === 'function') window.switchView('entry');
  } catch (error) {
      if (statusEl) statusEl.textContent = 'Error: ' + error.message;
  }
};

// ------------------------------------------------------------
// 6. FORM POPULATION HELPER
// ------------------------------------------------------------
window.fillFormFromCase = function(d) {
  if (!d) return;
  
  const setField = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val == null || val === undefined) ? '' : val;
  };

  setField('f_caseId', d.caseId);
  setField('f_gender', d.gender || 'Male');
  setField('f_recoveryType', d.recoveryType || 'નીલ');
  setField('f_surnameGuj', d.surnameGuj);
  setField('f_firstNameGuj', d.firstNameGuj);
  setField('f_fatherNameGuj', d.fatherNameGuj);
  setField('f_surname', d.surname);
  setField('f_firstName', d.firstName);
  setField('f_fatherName', d.fatherName);
  setField('f_dob', d.dob);
  setField('f_doj', d.doj);
  setField('f_dor', d.dor);
  setField('f_dedY', d.dedY);
  setField('f_dedM', d.dedM);
  setField('f_dedD', d.dedD);
  setField('f_notional20', d.notional20);
  setField('f_notional25', d.notional25);
  setField('f_designation', d.designation);
  setField('f_designationEn', d.designationEn);
  setField('f_toAddress', d.toAddress);
  setField('f_headOfOfficeName', d.headOfOfficeName);
  setField('f_headOfOfficeDesignation', d.headOfOfficeDesignation);
  setField('f_officeAddress', d.officeAddress);
  setField('f_officeAddressEn', d.officeAddressEn);
  setField('f_headOffice', d.headOffice);
  setField('f_headOfficeCode', d.headOfficeCode);
  setField('f_department', d.department);
  setField('f_deptCode', d.deptCode);
  setField('f_address', d.address);
  setField('f_gpf', d.gpf);
  setField('f_treasury', d.treasury);
  setField('f_district', d.district);
  setField('f_taluka', d.taluka);
  setField('f_status', d.status || 'Draft');
  setField('f_pensionType', d.pensionType);
  setField('f_empCategory', d.empCategory);
  setField('f_commPct', d.commPct || 40);
  setField('f_commDate', d.commDate);
  setField('f_phone', d.phone);
  setField('f_pinCode', d.pinCode);
  setField('f_email', d.email);
  setField('f_officePin', d.officePin);
  setField('f_officePhone', d.officePhone);
  setField('f_officeEmail', d.officeEmail);
  setField('f_height', d.height);
  setField('f_idMark', d.idMark);
  setField('f_heirSurnameGuj', d.heirSurnameGuj);
  setField('f_heirFirstNameGuj', d.heirFirstNameGuj);
  setField('f_heirFatherNameGuj', d.heirFatherNameGuj);
  setField('f_heirSurname', d.heirSurname);
  setField('f_heirFirstName', d.heirFirstName);
  setField('f_heirFatherName', d.heirFatherName);
  setField('f_place', d.place);
  setField('f_formDate', d.formDate);
  setField('f_caseNotes', d.caseNotes);

  // Populate Pay Rows
  const payTbody = document.getElementById('payPeriodsBody');
  if (payTbody) {
    payTbody.innerHTML = '';
    const hasRow1 = !!(d.pay1Basic || d.pay1Count);
    const samePay = String(d.pay1Basic) === String(d.pay2Basic) &&
                    String(d.pay1Npa || '') === String(d.pay2Npa || '') &&
                    String(d.pay1Da || '') === String(d.pay2Da || '');
    const hasRow2 = hasRow1
      ? (d.pay2Count > 0 && !samePay)
      : !!(d.pay2Basic || d.pay2Count || d.lastPay);
    if (hasRow1 && typeof window.addPayRow === 'function') {
      window.addPayRow({ basic: d.pay1Basic, npa: d.pay1Npa, da: d.pay1Da, count: d.pay1Count, isInit: true });
    }
    if (hasRow2 && typeof window.addPayRow === 'function') {
      window.addPayRow({ basic: d.pay2Basic || d.lastPay, npa: d.pay2Npa, da: d.pay2Da, count: d.pay2Count, isInit: true });
    }
  }

  // Populate Family Rows
  const famTbody = document.getElementById('familyBody');
  if (famTbody) {
    famTbody.innerHTML = '';
    if (Array.isArray(d.family) && d.family.length > 0) {
      d.family.forEach(famMember => {
        if (typeof window.addFamilyRow === 'function') window.addFamilyRow(famMember);
      });
    } else {
      if (typeof window.addFamilyRow === 'function') {
        window.addFamilyRow();
        window.addFamilyRow();
      }
    }
  }

  if (typeof window.updateDynamicHeader === 'function') {
    window.updateDynamicHeader(d.fullName, d.status, d.caseId);
  }

  if (typeof window.emitLive === 'function') window.emitLive();
  if (typeof window.clearFormDirty === 'function') window.clearFormDirty();
};

// ------------------------------------------------------------
// 7. GLOBAL & OFFICE-SCOPED SETTINGS CONFIGURATION
// ------------------------------------------------------------
// Office profiles carry their own office data (addresses, officer), but pension
// rules should always be reflected: any rule the office has not defined is
// inherited from the system-wide globalConfig document.
async function inheritMissingPensionRules(s) {
  if (!s) s = {};
  if (s.maxGratuity && s.maxQualifyingYears && s.pensionDivisor && s.defaultCommutationPct) return s;
  try {
    const gSnap = await getDoc(doc(db, "settings", "globalConfig"));
    if (gSnap.exists()) {
      const g = gSnap.data();
      if (!s.maxGratuity) s.maxGratuity = parseFloat(g.maxGratuity) || 2500000;
      if (!s.maxQualifyingYears) s.maxQualifyingYears = parseFloat(g.maxQualifyingYears) || 33;
      if (!s.pensionDivisor) s.pensionDivisor = parseFloat(g.pensionDivisor) || 66;
      if (!s.defaultCommutationPct) s.defaultCommutationPct = parseFloat(g.defaultCommutationPct) || 40;
    }
  } catch (e) {}
  if (!s.maxGratuity) s.maxGratuity = 2500000;
  if (!s.maxQualifyingYears) s.maxQualifyingYears = 33;
  if (!s.pensionDivisor) s.pensionDivisor = 66;
  if (!s.defaultCommutationPct) s.defaultCommutationPct = 40;
  return s;
}

// ------------------------------------------------------------
window.saveSettings = async function() {
  let settingsStatusEl = document.getElementById('settingsStatus');
  if (settingsStatusEl) settingsStatusEl.textContent = 'Saving settings...';
  
  const settingsObj = {
    profileName: (document.getElementById('set_profileName')?.value || '').trim(),
    maxGratuity: parseFloat(document.getElementById('set_maxGratuity')?.value) || 2500000,
    maxQualifyingYears: parseFloat(document.getElementById('set_maxQY')?.value) || 33,
    pensionDivisor: parseFloat(document.getElementById('set_pensionDiv')?.value) || 66,
    defaultCommutationPct: parseFloat(document.getElementById('set_defaultCommPct')?.value) || 40,
    toAddress: (document.getElementById('set_toAddress')?.value || '').trim(),
    fwRefNo: (document.getElementById('set_fwRefNo')?.value || '').trim(),
    forwardStamp: (document.getElementById('set_forwardStamp')?.value || '').trim(),
    fwForwardTo: (document.getElementById('set_fwForwardTo')?.value || '').trim(),
    officeAddress: (document.getElementById('set_officeAddress')?.value || '').trim(),
    officeAddressEn: (document.getElementById('set_officeAddressEn')?.value || '').trim(),
    officePin: (document.getElementById('set_officePin')?.value || '').trim(),
    officePhone: (document.getElementById('set_officePhone')?.value || '').trim(),
    officeEmail: (document.getElementById('set_officeEmail')?.value || '').trim(),
    headOffice: (document.getElementById('set_headOffice')?.value || '').trim(),
    department: (document.getElementById('set_department')?.value || '').trim(),
    officerName: (document.getElementById('set_officerName')?.value || '').trim(),
    officerDesig: (document.getElementById('set_officerDesig')?.value || '').trim(),
    updatedAt: serverTimestamp()
  };

  window.officeProfilesData = settingsObj;
  if (typeof PENSION_RULES !== 'undefined') {
    PENSION_RULES.maxGratuity = settingsObj.maxGratuity;
    PENSION_RULES.maxQualifyingYears = settingsObj.maxQualifyingYears;
    PENSION_RULES.pensionDivisor = settingsObj.pensionDivisor;
    PENSION_RULES.defaultCommutationPct = settingsObj.defaultCommutationPct;
  }

  const userOfficeId = window.currentUserProfile?.officeId || 'globalConfig';
  const targetOfficeId = window.activeSettingsOfficeId || userOfficeId;
  const userRole = String(window.currentUserProfile?.role || '').toLowerCase();
  const isAdmin = (userRole === 'admin' || userRole === 'super_admin');

  try {
      if (!isAdmin && targetOfficeId !== userOfficeId) {
        if (settingsStatusEl) settingsStatusEl.textContent = 'Permission denied: you can only edit your own office profile.';
        return;
      }

      // 1. Save to the ACTIVE profile document (/settings/{officeId})
      await setDoc(doc(db, "settings", targetOfficeId), settingsObj, { merge: true });

      // 2. Mirror to global fallback only for admins editing the HQ profile
      if (isAdmin && (targetOfficeId === 'main_headquarters' || targetOfficeId === 'globalConfig')) {
        await setDoc(doc(db, "settings", "globalConfig"), settingsObj, { merge: true });
      }
      
      localStorage.setItem(`pensionSettings_${targetOfficeId}`, JSON.stringify(settingsObj));
      if (typeof window.renderProfileDropdown === 'function') {
        await window.renderProfileDropdown();
      }
      if (settingsStatusEl) settingsStatusEl.textContent = `Settings saved successfully for [${targetOfficeId}]! ✓`;
      setTimeout(() => {
          if (settingsStatusEl) settingsStatusEl.textContent = '';
      }, 3000);
  } catch (error) {
      if (settingsStatusEl) settingsStatusEl.textContent = 'Error saving settings: ' + error.message;
  }
};

window.loadSettings = async function() {
  const userOfficeId = window.currentUserProfile?.officeId || 'globalConfig';
  window.activeSettingsOfficeId = userOfficeId;
  try {
      let docSnap = await getDoc(doc(db, "settings", userOfficeId));
      if (!docSnap.exists() && userOfficeId !== 'globalConfig') {
          docSnap = await getDoc(doc(db, "settings", "globalConfig"));
      }

      let s = {};
      if (docSnap.exists()) {
          s = docSnap.data();
      } else {
          const localData = localStorage.getItem(`pensionSettings_${userOfficeId}`);
          if (localData) {
              try { s = JSON.parse(localData); } catch (e) {}
          }
      }

      s = await inheritMissingPensionRules(s);
      window.officeProfilesData = s;
      if (typeof PENSION_RULES !== 'undefined') {
        PENSION_RULES.maxGratuity = parseFloat(s.maxGratuity);
        PENSION_RULES.maxQualifyingYears = parseFloat(s.maxQualifyingYears);
        PENSION_RULES.pensionDivisor = parseFloat(s.pensionDivisor);
        PENSION_RULES.defaultCommutationPct = parseFloat(s.defaultCommutationPct);
      }
      localStorage.setItem(`pensionSettings_${userOfficeId}`, JSON.stringify(s));

      // Populate Settings UI Form Fields
      fillSettingsForm(s, userOfficeId);

      const heroNameEl = document.getElementById('heroProfileName');
      const heroOfficeEl = document.getElementById('heroOfficeName');
      const profileName = s.profileName || userOfficeId;
      if (heroNameEl) heroNameEl.textContent = profileName;
      if (heroOfficeEl) heroOfficeEl.textContent = userOfficeId;

      if (typeof window.renderProfileDropdown === 'function') {
        await window.renderProfileDropdown();
      }

      if (typeof window.applyOfficeSettingsToCaseForm === 'function') {
        window.applyOfficeSettingsToCaseForm();
      }

  } catch (error) {
      console.log("Error loading settings:", error);
  }
};

window.fillSettingsForm = function(s, officeId) {
  if (!s) s = {};
  setVal('set_profileName', s.profileName || (officeId || ''));
  setVal('set_maxGratuity', s.maxGratuity);
  setVal('set_maxQY', s.maxQualifyingYears);
  setVal('set_pensionDiv', s.pensionDivisor);
  setVal('set_defaultCommPct', s.defaultCommutationPct);
  setVal('set_toAddress', s.toAddress);
  setVal('set_fwRefNo', s.fwRefNo);
  setVal('set_forwardStamp', s.forwardStamp);
  setVal('set_fwForwardTo', s.fwForwardTo);
  setVal('set_officeAddress', s.officeAddress);
  setVal('set_officeAddressEn', s.officeAddressEn);
  setVal('set_officePin', s.officePin);
  setVal('set_officePhone', s.officePhone);
  setVal('set_officeEmail', s.officeEmail);
  setVal('set_headOffice', s.headOffice);
  setVal('set_department', s.department);
  setVal('set_officerName', s.officerName);
  setVal('set_officerDesig', s.officerDesig);
};

window.updateActivePill = function(selectedOfficeId) {
  const pills = document.querySelectorAll('.settings-profile-pill');
  pills.forEach(p => {
    if (p.dataset.officeId === selectedOfficeId) {
      p.classList.add('settings-profile-pill-active');
    } else {
      p.classList.remove('settings-profile-pill-active');
    }
  });
};

window.renderProfileDropdown = async function() {
  const container = document.getElementById('set_profilePills');
  const heroNameEl = document.getElementById('heroProfileName');
  const heroOfficeEl = document.getElementById('heroOfficeName');
  if (!container) return;

  const userOfficeId = window.currentUserProfile?.officeId || 'main_headquarters';
  const userRole = String(window.currentUserProfile?.role || '').toLowerCase();
  const isAdmin = (userRole === 'admin' || userRole === 'super_admin');

  const activeId = window.activeSettingsOfficeId || userOfficeId;

  let profiles = [];
  try {
    const snap = await getDocs(collection(db, "settings"));
    const allProfiles = snap.docs.map(d => ({
      id: d.id,
      name: d.data().profileName || (d.id === 'globalConfig' ? 'Global Default' : d.id)
    }));
    if (isAdmin) {
      // Only show profiles that are actively in use (at least one user assigned).
      // When a user is deleted, their office profile no longer appears here.
      const usersSnap = await getDocs(collection(db, "users"));
      const activeOfficeIds = new Set(
        usersSnap.docs.map(d => d.data().officeId).filter(Boolean)
      );
      profiles = allProfiles.filter(p => p.id !== 'globalConfig' && activeOfficeIds.has(p.id));
      // Also surface any in-use office that has no settings doc yet
      activeOfficeIds.forEach(id => {
        if (id !== 'globalConfig' && !profiles.find(p => p.id === id)) {
          profiles.push({ id, name: id });
        }
      });
    } else {
      const mine = allProfiles.find(p => p.id === userOfficeId);
      profiles = mine ? [mine] : [];
    }
  } catch (e) {
    profiles = [];
  }

  if (!profiles.find(p => p.id === activeId)) {
    profiles.unshift({ id: activeId, name: activeId });
  }

  container.innerHTML = '';
  profiles.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'settings-profile-pill' + (p.id === activeId ? ' settings-profile-pill-active' : '');
    btn.dataset.officeId = p.id;
    btn.textContent = p.name;
    btn.onclick = function() { window.switchProfileByPill(p.id); };
    container.appendChild(btn);
  });

  const activeProfile = profiles.find(p => p.id === activeId) || { id: activeId, name: activeId };
  if (heroNameEl) heroNameEl.textContent = activeProfile.name;
  if (heroOfficeEl) heroOfficeEl.textContent = activeProfile.id;

  // Workspaces tab is for admins (to create/switch/manage profiles).
  // Office users always have exactly one profile, so the tab is pointless for them.
  const workspaceTab = document.getElementById('set-tab-profiles');
  const workspacePanel = document.getElementById('set-panel-profiles');
  if (workspaceTab && workspacePanel) {
    if (!isAdmin) {
      workspaceTab.style.display = 'none';
      workspacePanel.style.display = 'none';
      if (window.currentSettingsTab === 'profiles') {
        window.switchSettingsTab('office');
      }
    } else {
      workspaceTab.style.display = '';
      workspacePanel.style.display = '';
    }
  }

  const actions = document.querySelector('.settings-profile-bar-actions');
  if (actions) actions.style.display = isAdmin ? 'flex' : 'none';
};

window.switchProfileByPill = async function(selectedOfficeId) {
  if (!selectedOfficeId) return;

  window.activeSettingsOfficeId = selectedOfficeId;

  const heroNameEl = document.getElementById('heroProfileName');
  const heroOfficeEl = document.getElementById('heroOfficeName');
  let settingsStatusEl = document.getElementById('settingsStatus');
  if (settingsStatusEl) settingsStatusEl.textContent = `Loading profile [${selectedOfficeId}]...`;

  try {
    let docSnap = await getDoc(doc(db, "settings", selectedOfficeId));
    let s = {};
    if (docSnap.exists()) {
      s = docSnap.data();
    } else {
      const localData = localStorage.getItem(`pensionSettings_${selectedOfficeId}`);
      if (localData) {
        try { s = JSON.parse(localData); } catch (e) {}
      }
    }

    s = await inheritMissingPensionRules(s);
    window.officeProfilesData = s;

    fillSettingsForm(s, selectedOfficeId);

    if (heroNameEl) heroNameEl.textContent = s.profileName || selectedOfficeId;
    if (heroOfficeEl) heroOfficeEl.textContent = selectedOfficeId;

    updateActivePill(selectedOfficeId);

    if (settingsStatusEl) settingsStatusEl.textContent = `Active profile switched to [${selectedOfficeId}] ✓`;
    setTimeout(() => { if (settingsStatusEl) settingsStatusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (settingsStatusEl) settingsStatusEl.textContent = 'Error switching profile: ' + err.message;
  }
};

window.deleteProfile = async function() {
  const activePill = document.querySelector('.settings-profile-pill-active');
  if (!activePill) return;
  const selectedOfficeId = activePill.dataset.officeId;

  const userOfficeId = window.currentUserProfile?.officeId || 'main_headquarters';

  if (selectedOfficeId === 'main_headquarters' || selectedOfficeId === 'globalConfig') {
    alert("Cannot delete default system headquarters profile.");
    return;
  }
  if (selectedOfficeId === userOfficeId) {
    alert("You cannot delete the profile you are currently signed into.");
    return;
  }

  if (!confirm(`Are you sure you want to delete profile '${selectedOfficeId}'?`)) return;

  try {
    await deleteDoc(doc(db, "settings", selectedOfficeId));
    localStorage.removeItem(`pensionSettings_${selectedOfficeId}`);
    activePill.remove();

    // Determine next profile to show: prefer the admin's own office, else the first remaining pill
    const container = document.getElementById('set_profilePills');
    const remainingPill = container ? container.querySelector('.settings-profile-pill') : null;
    const nextOfficeId = (userOfficeId !== selectedOfficeId && userOfficeId !== 'globalConfig')
      ? userOfficeId
      : (remainingPill ? remainingPill.dataset.officeId : 'main_headquarters');

    window.activeSettingsOfficeId = nextOfficeId;
    await window.switchProfileByPill(nextOfficeId);
    if (typeof window.renderProfileDropdown === 'function') {
      await window.renderProfileDropdown();
    }

    alert(`Profile '${selectedOfficeId}' deleted successfully. Switched to [${nextOfficeId}].`);
  } catch (err) {
    alert("Error deleting profile: " + err.message);
  }
};

window.applyOfficeSettingsToCaseForm = function(force) {
  const s = window.officeProfilesData;
  if (!s) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) {
      if (force || !el.value || el.value.trim() === '') {
        el.value = val;
      }
    }
  };

  setVal('f_toAddress', s.toAddress);
  setVal('f_officeAddress', s.officeAddress);
  setVal('f_officeAddressEn', s.officeAddressEn);
  setVal('f_officePin', s.officePin);
  setVal('f_officePhone', s.officePhone);
  setVal('f_officeEmail', s.officeEmail);
  setVal('f_headOffice', s.headOffice);
  setVal('f_department', s.department);
  setVal('f_headOfOfficeName', s.officerName);
  setVal('f_headOfOfficeDesignation', s.officerDesig);
};

// ------------------------------------------------------------
// 8. ADMIN CONTROL PANEL: USER ACCESS & CROSS-OFFICE ANALYTICS
// ------------------------------------------------------------
window.loadAdminUsers = async function() {
  const tbody = document.getElementById('adminUsersTableBody');
  const userStatusEl = document.getElementById('adminUserStatus');
  if (userStatusEl) userStatusEl.textContent = '';
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px;"><div class="admin-spinner"></div> Loading users...</td></tr>';

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersList = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const totalUsersEl = document.getElementById('adminTotalUsers');
    const activeOfficesEl = document.getElementById('adminActiveOffices');
    const totalCasesEl = document.getElementById('adminTotalCases');
    const totalPayoutEl = document.getElementById('adminTotalPayout');

    if (totalUsersEl) totalUsersEl.textContent = usersList.length;

    const officeSet = new Set();
    usersList.forEach(u => { if (u.officeId) officeSet.add(u.officeId); });
    if (activeOfficesEl) activeOfficesEl.textContent = officeSet.size || 1;

    let totalCasesCount = (window.allFetchedCases || []).length;
    let totalEstPayout = 0;

    (window.allFetchedCases || []).forEach(c => {
      let d = c.raw || {};
      let pay = parseFloat(d.lastPay || d.pay2Basic || 0);
      let npa = parseFloat(d.pay2Npa || 0);
      totalEstPayout += (pay + npa) * 12;
    });

    if (totalCasesEl) totalCasesEl.textContent = totalCasesCount;
    if (totalPayoutEl) totalPayoutEl.textContent = '₹' + Math.round(totalEstPayout).toLocaleString('en-IN');

    if (!usersList.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:16px;">No users found in /users collection.</td></tr>`;
      return;
    }

    // Use DOM methods to prevent XSS
    tbody.innerHTML = '';
    usersList.forEach(u => {
      const isRoleAdmin = u.role === 'admin';
      const isSuspended = u.status === 'suspended';
      const uid = u.id;
      
      const tr = document.createElement('tr');

      // Column 1: User Account
      const td1 = document.createElement('td');
      const sEmail = document.createElement('strong');
      sEmail.style.cssText = 'font-size:12.5px; color:#0F172A;';
      sEmail.textContent = u.email || uid;
      td1.appendChild(sEmail);
      const divId = document.createElement('div');
      divId.style.cssText = 'margin-top:2px;';
      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = isSuspended
        ? 'background:#FEF2F2; color:#DC2626; border:1px solid #FCA5A5; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;'
        : 'background:#E9F9EF; color:#34C759; border:1px solid #B8E8C8; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;';
      statusBadge.textContent = isSuspended ? 'Suspended' : 'Active';
      divId.appendChild(statusBadge);
      td1.appendChild(divId);
      tr.appendChild(td1);

      // Column 2: Role select
      const td2 = document.createElement('td');
      const roleSelect = document.createElement('select');
      roleSelect.id = 'user_role_' + uid;
      roleSelect.style.cssText = 'padding:4px 8px; border-radius:4px; border:1px solid var(--mod-border); font-size:13px;';
      const optUser = document.createElement('option');
      optUser.value = 'office_user';
      optUser.textContent = 'Office User';
      if (!isRoleAdmin) optUser.selected = true;
      const optAdmin = document.createElement('option');
      optAdmin.value = 'admin';
      optAdmin.textContent = 'Super Admin';
      if (isRoleAdmin) optAdmin.selected = true;
      roleSelect.appendChild(optUser);
      roleSelect.appendChild(optAdmin);
      td2.appendChild(roleSelect);
      tr.appendChild(td2);

      // Column 3: Office input
      const td3 = document.createElement('td');
      const officeInput = document.createElement('input');
      officeInput.type = 'text';
      officeInput.id = 'user_office_' + uid;
      officeInput.value = u.officeId || 'default_office';
      officeInput.style.cssText = 'padding:4px 8px; width:95%; border-radius:4px; border:1px solid var(--mod-border); font-size:13px;';
      td3.appendChild(officeInput);
      tr.appendChild(td3);

      // Column 4: Actions
      const td4 = document.createElement('td');
      td4.style.cssText = 'text-align:right; white-space:nowrap;';

      const btnReset = document.createElement('button');
      btnReset.className = 'btn btn-secondary';
      btnReset.style.cssText = 'padding:4px 8px; font-size:11px; margin-right:4px;';
      btnReset.textContent = '📧 Reset Link';
      btnReset.title = 'Send Password Reset Email';
      btnReset.addEventListener('click', () => { window.adminSendPasswordReset(u.email || ''); });
      td4.appendChild(btnReset);

      const btnToggle = document.createElement('button');
      btnToggle.className = 'btn btn-secondary';
      btnToggle.style.cssText = 'padding:4px 8px; font-size:11px; margin-right:4px;';
      btnToggle.textContent = isSuspended ? '🟢 Activate' : '🔴 Suspend';
      btnToggle.addEventListener('click', () => { window.adminToggleUserStatus(uid, isSuspended ? 'suspended' : 'active'); });
      td4.appendChild(btnToggle);

      const btnSave = document.createElement('button');
      btnSave.className = 'btn';
      btnSave.style.cssText = 'padding:4px 10px; font-size:12px;';
      btnSave.textContent = 'Save';
      btnSave.addEventListener('click', () => { window.saveUserProfile(uid); });
      td4.appendChild(btnSave);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-secondary';
      btnDel.style.cssText = 'padding:4px 8px; font-size:11px; margin-left:4px; color:#DC2626; border-color:#FCA5A5;';
      btnDel.textContent = 'Delete';
      btnDel.addEventListener('click', () => { window.adminDeleteUser(uid, u.email); });
      td4.appendChild(btnDel);

      tr.appendChild(td4);
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--mod-danger); padding:16px;">Error loading users: ${(err.message||'').replace(/</g,'&lt;')}</td></tr>`;
  }
};

window.adminLoadAllCasesTable = async function(filterQuery) {
  const tbody = document.getElementById('adminAllCasesTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;"><div class="admin-spinner"></div> Loading all pension cases...</td></tr>';

  try {
    let cases = window.allFetchedCases || [];
    if (!cases.length) {
      if (typeof fetchAdminCaseList === 'function') {
        cases = await fetchAdminCaseList();
      } else {
        const snap = await getDocs(collection(db, "cases"));
        cases = snap.docs.map(d => ({ caseId: d.id, ...d.data() }));
      }
      window.allFetchedCases = cases;
    }

    // Build combined filter from search + dropdowns + date range
    const searchQ = (filterQuery || document.getElementById('adminCasesSearch')?.value || '').toLowerCase().trim();
    const statusF = (document.getElementById('adminCasesStatusFilter')?.value || '').toLowerCase();
    const officeF = document.getElementById('adminCasesOfficeFilter')?.value || '';
    const dateFrom = document.getElementById('adminCasesDateFrom')?.value || '';
    const dateTo = document.getElementById('adminCasesDateTo')?.value || '';

    let filtered = cases;
    if (searchQ) {
      filtered = filtered.filter(c => {
        const id = (c.caseId || c.id || '').toLowerCase();
        const name = (c.fullName || '').toLowerCase();
        const ppo = (c.ppoNo || '').toLowerCase();
        const office = (c.officeId || '').toLowerCase();
        return name.includes(searchQ) || ppo.includes(searchQ) || office.includes(searchQ) || id.includes(searchQ);
      });
    }
    if (statusF) filtered = filtered.filter(c => (c.status || 'draft').toLowerCase() === statusF);
    if (officeF) filtered = filtered.filter(c => c.officeId === officeF);
    if (dateFrom) filtered = filtered.filter(c => c.dor && c.dor >= dateFrom);
    if (dateTo) filtered = filtered.filter(c => c.dor && c.dor <= dateTo);

    const countEl = document.getElementById('adminCasesFilterCount');
    if (countEl) countEl.textContent = filtered.length + ' of ' + cases.length + ' cases';

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--mod-text-muted);">No pension cases found.</td></tr>';
      return;
    }

    // Use DOM methods to prevent XSS — columns match headers: Case ID, Office, Name, Retirement, Designation, Action
    tbody.innerHTML = '';
    filtered.forEach(c => {
      const caseId = c.caseId || c.id || 'N/A';
      const name = c.fullName || 'Pensioner';
      const desig = c.designation || '-';
      const office = c.officeId || 'main_headquarters';
      const dor = c.dor || '-';

      const tr = document.createElement('tr');

      const td1 = document.createElement('td');
      const s1 = document.createElement('strong');
      s1.style.cssText = 'cursor:pointer; color:#0062E3; text-decoration:underline; font-size:12.5px; font-weight:700;';
      s1.title = 'Click to edit case fields';
      s1.textContent = caseId;
      s1.addEventListener('click', (e) => {
        e.stopPropagation();
        window.loadCaseById(caseId).then(() => window.switchView('entry'));
      });
      td1.appendChild(s1);
      tr.appendChild(td1);

      const td2 = document.createElement('td');
      const span2 = document.createElement('span');
      span2.style.cssText = 'background:#E9F9EF; color:#2AAE48; border:1px solid #B8E8C8; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:600;';
      span2.textContent = office;
      td2.appendChild(span2);
      tr.appendChild(td2);

      const td3 = document.createElement('td');
      const s3 = document.createElement('strong');
      s3.style.cssText = 'color:#0F172A; font-size:13px;';
      s3.textContent = name;
      td3.appendChild(s3);
      tr.appendChild(td3);

      const td4 = document.createElement('td');
      td4.textContent = dor;
      tr.appendChild(td4);

      const td5 = document.createElement('td');
      td5.textContent = desig;
      tr.appendChild(td5);

      const td6 = document.createElement('td');
      td6.style.textAlign = 'right';
      td6.style.whiteSpace = 'nowrap';
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline';
      btn.style.cssText = 'padding:5px 12px; font-size:12px; font-weight:600; border-color:#007AFF; color:#0062E3;';
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>View';
      btn.addEventListener('click', () => { window.loadCaseById(caseId).then(() => window.switchView('print-centre')); });
      td6.appendChild(btn);
      const tBtn = document.createElement('button');
      tBtn.className = 'btn btn-outline';
      tBtn.style.cssText = 'padding:5px 12px; font-size:12px; font-weight:600; border-color:#7C3AED; color:#6D28D9; margin-left:6px;';
      tBtn.textContent = 'Transfer';
      tBtn.addEventListener('click', () => { window.adminTransferCase(caseId); });
      td6.appendChild(tBtn);
      tr.appendChild(td6);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.warn("adminLoadAllCasesTable error:", err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--mod-danger); padding:16px;">Error loading cases: ${(err.message||'').replace(/</g,'&lt;')}</td></tr>`;
  }
};

// #7 Case filter helper functions
window.adminApplyCaseFilters = function() {
  window.adminLoadAllCasesTable();
};

window.adminClearCaseFilters = function() {
  ['adminCasesStatusFilter', 'adminCasesOfficeFilter', 'adminCasesDateFrom', 'adminCasesDateTo'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const si = document.getElementById('adminCasesSearch');
  if (si) si.value = '';
  window.adminLoadAllCasesTable();
};

window._populateAdminCaseOfficeFilter = function() {
  const sel = document.getElementById('adminCasesOfficeFilter');
  if (!sel) return;
  const cases = window.allFetchedCases || [];
  const offices = new Set();
  cases.forEach(c => { if (c.officeId) offices.add(c.officeId); });
  const current = sel.value;
  sel.innerHTML = '<option value="">All Offices</option>';
  Array.from(offices).sort().forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    if (o === current) opt.selected = true;
    sel.appendChild(opt);
  });
};

// Shared office list (officeId -> display label) used by the admin transfer utility.
window.getOfficeOptions = async function() {
  const offices = new Map(); // officeId -> display name
  offices.set('main_headquarters', 'main_headquarters (Main HQ)');

  try {
    const snap = await getDocs(collection(db, "settings"));
    snap.docs.forEach(d => {
      const p = d.data() || {};
      offices.set(d.id, p.profileName ? p.profileName + ' (' + d.id + ')' : d.id);
    });
  } catch (e) {
    console.warn('getOfficeOptions settings:', e);
  }

  (window.allFetchedCases || []).forEach(c => {
    if (c.officeId && !offices.has(c.officeId)) offices.set(c.officeId, c.officeId);
  });

  return offices;
};

// Case transfer utility for the Admin → Cases tab.
window.adminTransferCase = async function(caseId) {
  const existing = document.getElementById('transferCaseModal');
  if (existing) existing.remove();

  const offices = await window.getOfficeOptions();
  const match = (window.allFetchedCases || []).find(c => (c.caseId || c.id) === caseId);
  const currentOffice = (match && match.officeId) || 'main_headquarters';
  const name = (match && match.fullName) || caseId;

  const overlay = document.createElement('div');
  overlay.id = 'transferCaseModal';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:9999; display:flex; align-items:center; justify-content:center;';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const box = document.createElement('div');
  box.style.cssText = 'background:#FFF; border-radius:14px; padding:20px 24px; width:440px; max-width:92vw; box-shadow:0 20px 50px rgba(0,0,0,0.3); border-top:4px solid #7C3AED;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px; font-weight:800; color:#1E293B; margin-bottom:4px;';
  title.textContent = '🏛️ Transfer Case to Office';

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:12px; color:#64748B; margin-bottom:14px;';
  sub.textContent = 'Case: ' + name + ' (' + caseId + ') · Current office: ' + currentOffice;

  const sel = document.createElement('select');
  sel.id = 'transferTargetOffice';
  sel.style.cssText = 'width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; margin-bottom:6px;';
  Array.from(offices.keys()).sort().forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = offices.get(id);
    if (id === currentOffice) opt.selected = true;
    sel.appendChild(opt);
  });

  const note = document.createElement('div');
  note.style.cssText = 'font-size:11.5px; color:#7C3AED; font-weight:600; margin-bottom:16px;';
  note.textContent = 'The case will move to the selected office and appear in that office\'s case list.';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; justify-content:flex-end; gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-outline';
  cancelBtn.style.cssText = 'padding:8px 18px; font-size:13px;';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn';
  confirmBtn.style.cssText = 'padding:8px 18px; font-size:13px; font-weight:700; background:#7C3AED; border-color:#7C3AED;';
  confirmBtn.textContent = 'Transfer Case';
  confirmBtn.addEventListener('click', async () => {
    const target = sel.value;
    if (!target || target === currentOffice) { overlay.remove(); return; }
    if (!confirm('Transfer case ' + caseId + ' to office "' + target + '"?')) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Transferring...';
    try {
      await setDoc(doc(db, "cases", caseId), { officeId: target, updatedAt: serverTimestamp() }, { merge: true });
      (window.allFetchedCases || []).forEach(c => { if ((c.caseId || c.id) === caseId) c.officeId = target; });
      if (typeof window._logAdminActivity === 'function') {
        window._logAdminActivity('transfer_case', 'Transferred case ' + caseId + ' to ' + target);
      }
      overlay.remove();
      if (typeof window.adminLoadAllCasesTable === 'function') window.adminLoadAllCasesTable();
      if (typeof window.refreshCaseList === 'function') window.refreshCaseList();
      const statusEl = document.getElementById('adminUserStatus');
      if (statusEl) {
        statusEl.textContent = 'Case ' + caseId + ' transferred to ' + target + ' ✓';
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);
      }
    } catch (err) {
      alert('Transfer Error: ' + err.message);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Transfer Case';
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  box.appendChild(title);
  box.appendChild(sub);
  box.appendChild(sel);
  box.appendChild(note);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  sel.focus();
};

// #8 Office Directory editing
window.adminSaveOfficeProfile = async function(officeId) {
  const nameEl = document.getElementById('off_edit_name_' + officeId);
  const addrEl = document.getElementById('off_edit_addr_' + officeId);
  const phoneEl = document.getElementById('off_edit_phone_' + officeId);
  const officerEl = document.getElementById('off_edit_officer_' + officeId);
  const statusEl = document.getElementById('adminUserStatus');
  if (!nameEl) return;

  if (!confirm('Save changes for office "' + officeId + '"?')) return;
  if (statusEl) statusEl.textContent = 'Saving office profile...';

  try {
    await setDoc(doc(db, "settings", officeId), {
      profileName: nameEl.value.trim(),
      officeAddress: addrEl.value.trim(),
      officePhone: phoneEl.value.trim(),
      officerName: officerEl.value.trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    window._logAdminActivity('update_office', 'Updated office profile: ' + officeId);
    if (statusEl) statusEl.textContent = 'Office "' + officeId + '" saved.';
    window.adminLoadOfficeDirectory();
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Error: ' + err.message;
  }
};

window.adminDeleteOfficeProfile = async function(officeId) {
  const statusEl = document.getElementById('adminUserStatus');
  if (!officeId || officeId === 'main_headquarters' || officeId === 'globalConfig') {
    alert('Cannot delete the main/global office profile.');
    return;
  }

  // Block deletion while users are still assigned to this office
  let userCount = 0;
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    userCount = usersSnap.docs.filter(d => d.data().officeId === officeId).length;
  } catch (e) {
    console.warn('adminDeleteOfficeProfile users check:', e);
  }
  if (userCount > 0) {
    alert(`Cannot delete office profile '${officeId}': ${userCount} user account(s) are assigned to this office.`);
    return;
  }

  const caseCount = (window.allFetchedCases || []).filter(c => c.officeId === officeId).length;
  const msg = `Delete office profile '${officeId}'?\n\n` +
    (caseCount
      ? `⚠️ ${caseCount} case(s) are still assigned to this office. The profile (name/address/contacts) will be removed, but the cases will NOT be deleted.\n\n`
      : '') +
    'This cannot be undone.';
  if (!confirm(msg)) return;

  try {
    await deleteDoc(doc(db, "settings", officeId));
    localStorage.removeItem(`pensionSettings_${officeId}`);
    if (typeof window._logAdminActivity === 'function') {
      window._logAdminActivity('delete_office', 'Deleted office profile: ' + officeId);
    }
    if (statusEl) statusEl.textContent = `Office profile '${officeId}' deleted.`;
    if (typeof window.adminLoadOfficeDirectory === 'function') await window.adminLoadOfficeDirectory();
    if (typeof window.renderProfileDropdown === 'function') await window.renderProfileDropdown();
    if (typeof window.refreshCaseList === 'function') window.refreshCaseList();
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Delete error: ' + err.message;
    alert('Delete Error: ' + err.message);
  }
};

window.adminSendPasswordReset = async function(email) {
  if (!email) {
    alert("Error: No email address is associated with this user.");
    return;
  }
  if (!confirm(`Send password reset link to '${email}'?`)) return;

  const statusEl = document.getElementById('adminUserStatus');
  if (statusEl) statusEl.textContent = `Sending reset link to ${email}...`;

  try {
    await sendPasswordResetEmail(auth, email);
    if (statusEl) statusEl.textContent = `✅ Password reset email sent to ${email} successfully!`;
    alert(`✅ Password reset email sent to ${email} successfully!`);
    window._logAdminActivity('password_reset', `Sent password reset to ${email}`);
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error sending reset email: ${err.message}`;
    alert(`Error: ${err.message}`);
  }
};

window.adminToggleUserStatus = async function(userId, currentStatus) {
  const newStatus = (currentStatus === 'suspended') ? 'active' : 'suspended';
  const statusEl = document.getElementById('adminUserStatus');

  if (!confirm(`Are you sure you want to set status of user '${userId}' to '${newStatus.toUpperCase()}'?`)) return;

  if (statusEl) statusEl.textContent = `Updating status for user ${userId}...`;

  try {
    await setDoc(doc(db, "users", userId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (statusEl) statusEl.textContent = `Updated user status to '${newStatus}'!`;
    window._logAdminActivity(newStatus === 'suspended' ? 'suspend_user' : 'update_user', `Set user ${userId} status to ${newStatus}`);
    window.loadAdminUsers();
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error updating status: ${err.message}`;
  }
};

window.saveUserProfile = async function(userId) {
  const roleEl = document.getElementById(`user_role_${userId}`);
  const officeEl = document.getElementById(`user_office_${userId}`);
  const statusEl = document.getElementById('adminUserStatus');

  if (!roleEl || !officeEl) return;

  const newRole = roleEl.value;
  const newOffice = officeEl.value.trim() || 'default_office';

  if (!confirm(`Save changes for user ${userId}?\n\nNew Role: ${newRole}\nNew Office: ${newOffice}`)) return;

  if (statusEl) statusEl.textContent = 'Saving user profile...';

  try {
    await setDoc(doc(db, "users", userId), {
      role: newRole,
      officeId: newOffice,
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (statusEl) statusEl.textContent = `Saved user ${userId} (${newRole} / ${newOffice}) successfully!`;
    window._logAdminActivity('update_user', `Updated role=${newRole}, office=${newOffice} for user ${userId}`);
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error saving profile: ${err.message}`;
  }
};

window.createNewUserProfile = async function() {
  const emailEl = document.getElementById('new_user_email');
  const passwordEl = document.getElementById('new_user_password');
  const roleEl = document.getElementById('new_user_role');
  const officeEl = document.getElementById('new_user_office');
  const statusEl = document.getElementById('adminUserStatus');

  const email = emailEl ? emailEl.value.trim() : '';
  const password = passwordEl ? passwordEl.value.trim() : '';
  const role = roleEl ? roleEl.value : 'office_user';
  const officeId = (officeEl && officeEl.value.trim()) ? officeEl.value.trim() : 'main_headquarters';

  if (!email || !password) {
    if (statusEl) statusEl.textContent = 'Error: Please enter both Dummy User Email and Password.';
    return;
  }

  if (password.length < 6) {
    if (statusEl) statusEl.textContent = 'Error: Password must be at least 6 characters.';
    return;
  }

  // #14 Check if email is already registered in Firestore
  try {
    const existingUsers = await getDocs(collection(db, "users"));
    let emailExists = false;
    existingUsers.docs.forEach(d => {
      if ((d.data().email || '').toLowerCase() === email.toLowerCase()) emailExists = true;
    });
    if (emailExists) {
      if (statusEl) statusEl.textContent = 'Error: A user with this email already exists.';
      return;
    }
  } catch (e) {
    // If we can't check, proceed anyway (will fail at auth level if duplicate)
  }

  if (statusEl) statusEl.textContent = `Creating account & assigning access for ${email}...`;

  try {
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUid = userCred.user.uid;

    await setDoc(doc(db, "users", newUid), {
      email: email,
      role: role,
      officeId: officeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Auto-register the Office Profile in /settings collection: keep the office
    // data section (name, addresses, officer) EMPTY so the admin fills it in,
    // but seed the pension rules inherited from the system-wide config.
    const officeSnap = await getDoc(doc(db, "settings", officeId));
    if (!officeSnap.exists()) {
      let globalRules = {};
      try {
        const gSnap = await getDoc(doc(db, "settings", "globalConfig"));
        if (gSnap.exists()) {
          const g = gSnap.data();
          globalRules = {
            maxGratuity: parseFloat(g.maxGratuity) || 2500000,
            maxQualifyingYears: parseFloat(g.maxQualifyingYears) || 33,
            pensionDivisor: parseFloat(g.pensionDivisor) || 66,
            defaultCommutationPct: parseFloat(g.defaultCommutationPct) || 40
          };
        }
      } catch (e) {}
      await setDoc(doc(db, "settings", officeId), {
        ...globalRules,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (emailEl) emailEl.value = '';
    if (passwordEl) passwordEl.value = '';
    if (officeEl) officeEl.value = '';

    if (statusEl) statusEl.textContent = `✅ Account ${email} (${role} / ${officeId}) created and office assigned successfully!`;
    window._logAdminActivity('create_user', `Created user ${email} (${role} / ${officeId})`);
    window.loadAdminUsers();
    if (typeof window.adminLoadOfficeDirectory === 'function') window.adminLoadOfficeDirectory();
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);

  } catch (err) {
    console.warn("Secondary Auth creation notice:", err);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let targetDocId = null;
      usersSnap.docs.forEach(d => {
        if ((d.data().email || '').toLowerCase() === email.toLowerCase()) {
          targetDocId = d.id;
        }
      });

      if (!targetDocId) {
        targetDocId = `pre_user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }

      await setDoc(doc(db, "users", targetDocId), {
        email: email,
        role: role,
        officeId: officeId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (emailEl) emailEl.value = '';
      if (passwordEl) passwordEl.value = '';
      if (officeEl) officeEl.value = '';

      if (statusEl) statusEl.textContent = `Provisioned role '${role}' for ${email} in Firestore! User can sign in now.`;
      window.loadAdminUsers();
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
    } catch (innerErr) {
      if (statusEl) statusEl.textContent = `Error provisioning user: ${innerErr.message}`;
    }
  }
};

// Secondary App Instance for Direct User Account Creation
let secondaryApp = null;
let secondaryAuth = null;
try {
  secondaryApp = initializeApp(firebaseConfig, "SecondaryAdminApp");
  secondaryAuth = getAuth(secondaryApp);
} catch (e) {
  secondaryAuth = auth;
}

window.adminLoadTrash = async function() {
  const tbody = document.getElementById('adminTrashTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px;"><div class="admin-spinner"></div> Loading Admin Trash...</td></tr>';

  try {
    const snap = await getDocs(collection(db, "trash"));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--mod-text-muted);">Admin Trash is empty. No deleted cases.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    items.forEach(c => {
      const tr = document.createElement('tr');

      const td1 = document.createElement('td');
      const s1 = document.createElement('strong');
      s1.style.cssText = 'font-size:12.5px; color:#0F172A;';
      s1.textContent = c.id;
      td1.appendChild(s1);
      tr.appendChild(td1);

      const td2 = document.createElement('td');
      td2.textContent = c.fullName || c.surname || 'Pension Case';
      tr.appendChild(td2);

      const td3 = document.createElement('td');
      td3.textContent = c.officeId || 'default';
      tr.appendChild(td3);

      const td4 = document.createElement('td');
      const delTs = c.deletedAt && c.deletedAt.seconds;
      td4.textContent = delTs ? new Date(delTs * 1000).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : '—';
      td4.style.fontSize = '12px';
      tr.appendChild(td4);

      const td5 = document.createElement('td');
      td5.style.textAlign = 'right';
      td5.style.whiteSpace = 'nowrap';

      const btnRestore = document.createElement('button');
      btnRestore.className = 'btn';
      btnRestore.style.cssText = 'padding:4px 10px; font-size:11px; margin-right:6px;';
      btnRestore.textContent = 'Restore';
      btnRestore.addEventListener('click', function() { window.adminRestoreCase(c.id); });
      td5.appendChild(btnRestore);

      const btnPermDel = document.createElement('button');
      btnPermDel.className = 'btn btn-secondary';
      btnPermDel.style.cssText = 'padding:4px 10px; font-size:11px; color:#DC2626; border-color:#FCA5A5;';
      btnPermDel.textContent = 'Delete';
      btnPermDel.addEventListener('click', function() { window.adminPermanentDelete(c.id); });
      td5.appendChild(btnPermDel);

      tr.appendChild(td5);
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--mod-danger); padding:12px;">Error loading Trash: ' + (err.message||'').replace(/</g,'&lt;') + '</td></tr>';
  }
};

window.adminRestoreCase = async function(id) {
  const statusEl = document.getElementById('adminUserStatus');
  if (!confirm(`Restore Case #${id} back to active cases list?`)) return;

  if (statusEl) statusEl.textContent = `Restoring Case #${id}...`;

  try {
    const trashSnap = await getDoc(doc(db, "trash", id));
    if (!trashSnap.exists()) throw new Error("Item not found in Trash.");

    const caseData = trashSnap.data();
    delete caseData.deletedAt;
    delete caseData.deletedByUid;

    await setDoc(doc(db, "cases", id), {
      ...caseData,
      updatedAt: serverTimestamp()
    });

    await deleteDoc(doc(db, "trash", id));

    if (statusEl) statusEl.textContent = `✅ Restored Case #${id} successfully!`;
    window._logAdminActivity('restore_case', `Restored case ${id} from trash`);
    window.refreshCaseList();
    window.adminLoadTrash();
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error restoring case: ${err.message}`;
    alert("Restore Error: " + err.message);
  }
};

window.adminLoadOfficeDirectory = async function() {
  const tbody = document.getElementById('adminOfficeTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px;"><div class="admin-spinner"></div> Loading Office Directory...</td></tr>';

  try {
    const snap = await getDocs(collection(db, "settings"));
    const offices = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => o.id !== 'globalConfig');

    if (!offices.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--mod-text-muted);">No custom office profiles registered.</td></tr>';
      return;
    }

    // Use DOM methods to prevent XSS
    tbody.innerHTML = '';
    offices.forEach(o => {
      const officeId = o.id;
      const officeName = o.profileName || officeId;
      const officerName = o.officerName || '';
      const address = o.officeAddress || o.officeAddressEn || '';
      const phone = o.officePhone || '';

      const tr = document.createElement('tr');

      // Office Name (editable)
      const td1 = document.createElement('td');
      const inp1 = document.createElement('input');
      inp1.type = 'text'; inp1.id = 'off_edit_name_' + officeId;
      inp1.value = officeName;
      inp1.style.cssText = 'padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; font-size:12px; width:100%;';
      td1.appendChild(inp1);
      tr.appendChild(td1);

      // Officer Name (editable)
      const td2 = document.createElement('td');
      const inp2 = document.createElement('input');
      inp2.type = 'text'; inp2.id = 'off_edit_officer_' + officeId;
      inp2.value = officerName;
      inp2.style.cssText = 'padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; font-size:12px; width:100%;';
      td2.appendChild(inp2);
      tr.appendChild(td2);

      // Address (editable)
      const td3 = document.createElement('td');
      const inp3 = document.createElement('input');
      inp3.type = 'text'; inp3.id = 'off_edit_addr_' + officeId;
      inp3.value = address;
      inp3.style.cssText = 'padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; font-size:12px; width:100%;';
      td3.appendChild(inp3);
      tr.appendChild(td3);

      // Phone (editable)
      const td4 = document.createElement('td');
      const inp4 = document.createElement('input');
      inp4.type = 'text'; inp4.id = 'off_edit_phone_' + officeId;
      inp4.value = phone;
      inp4.style.cssText = 'padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; font-size:12px; width:100%;';
      td4.appendChild(inp4);
      tr.appendChild(td4);

      // Action - Save & Delete buttons
      const td5 = document.createElement('td');
      td5.style.textAlign = 'right';
      td5.style.whiteSpace = 'nowrap';
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.cssText = 'padding:4px 10px; font-size:11px; margin-right:6px;';
      btn.textContent = 'Save';
      btn.addEventListener('click', function() { window.adminSaveOfficeProfile(officeId); });
      td5.appendChild(btn);
      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.style.cssText = 'padding:4px 10px; font-size:11px; background:#DC2626; border-color:#DC2626;';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', function() { window.adminDeleteOfficeProfile(officeId); });
      td5.appendChild(delBtn);
      tr.appendChild(td5);

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--mod-danger); padding:12px;">Directory load error: ' + (err.message||'').replace(/</g,'&lt;') + '</td></tr>';
  }
};

// ============================================================
// 9. AUDIT TRAIL — Log admin actions to /auditLogs collection
// ============================================================
window._logAdminActivity = async function(action, detail) {
  try {
    await setDoc(doc(collection(db, "auditLogs")), {
      action: action,
      detail: detail || '',
      byUid: window.currentUser?.uid || '',
      byEmail: window.currentUser?.email || '',
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.warn("Audit log error:", e);
  }
};

window.adminLoadAuditLog = async function() {
  const tbody = document.getElementById('adminAuditLogBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px;">Loading activity log...</td></tr>';
  try {
    const snap = await getDocs(collection(db, "auditLogs"));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = (a.timestamp && a.timestamp.seconds) || 0;
        const tb = (b.timestamp && b.timestamp.seconds) || 0;
        return tb - ta;
      }).slice(0, 100);
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px; color:#64748B;">No activity recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    logs.forEach(function(log) {
      const tr = document.createElement('tr');
      const ts = (log.timestamp && log.timestamp.seconds);
      const timeStr = ts ? new Date(ts * 1000).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
      const actionMap = {
        'create_user': { label: 'Created User', color: '#34C759' },
        'delete_user': { label: 'Deleted User', color: '#DC2626' },
        'update_user': { label: 'Updated User', color: '#007AFF' },
        'suspend_user': { label: 'Suspended User', color: '#D97706' },
        'restore_case': { label: 'Restored Case', color: '#34C759' },
        'perm_delete': { label: 'Permanently Deleted', color: '#DC2626' },
        'password_reset': { label: 'Password Reset', color: '#7C3AED' },
        'update_office': { label: 'Updated Office', color: '#D97706' }
      };
      const info = actionMap[log.action] || { label: log.action || 'Unknown', color: '#64748B' };

      const td1 = document.createElement('td');
      const badge = document.createElement('span');
      badge.style.cssText = 'display:inline-block; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; background:' + info.color + '15; color:' + info.color + '; border:1px solid ' + info.color + '30;';
      badge.textContent = info.label;
      td1.appendChild(badge);
      tr.appendChild(td1);

      const td2 = document.createElement('td');
      td2.textContent = log.detail || '—';
      td2.style.fontSize = '12px';
      tr.appendChild(td2);

      const td3 = document.createElement('td');
      td3.textContent = log.byEmail || '—';
      td3.style.fontSize = '12px';
      tr.appendChild(td3);

      const td4 = document.createElement('td');
      td4.textContent = timeStr;
      td4.style.fontSize = '12px';
      tr.appendChild(td4);

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#DC2626; padding:12px;">Error loading log.</td></tr>';
  }
};

// ============================================================
// 5. PERMANENT DELETE FROM TRASH
// ============================================================
window.adminPermanentDelete = async function(id) {
  const statusEl = document.getElementById('adminUserStatus');
  if (!confirm('⚠️ PERMANENTLY DELETE Case #' + id + '?\n\nThis cannot be undone. The case will be permanently removed from the system.')) return;

  if (statusEl) statusEl.textContent = `Permanently deleting Case #${id}...`;
  try {
    await deleteDoc(doc(db, "trash", id));
    window._logAdminActivity('perm_delete', `Permanently deleted case ${id}`);
    if (statusEl) statusEl.textContent = `Case #${id} permanently deleted.`;
    window.adminLoadTrash();
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error deleting: ${err.message}`;
  }
};

// ============================================================
// 6. ADMIN USER DELETION
// ============================================================
window.adminDeleteUser = async function(userId, email) {
  const statusEl = document.getElementById('adminUserStatus');

  try {
    // Read the user's doc first to find their assigned office
    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.exists() ? userSnap.data() : null;
    const officeId = userData?.officeId || null;

    // Determine whether this office's settings profile becomes orphaned
    let willDeleteProfile = false;
    if (officeId && officeId !== 'globalConfig' && officeId !== 'main_headquarters') {
      const usersSnap = await getDocs(collection(db, "users"));
      const otherUserInOffice = usersSnap.docs.some(d => d.id !== userId && d.data().officeId === officeId);
      willDeleteProfile = !otherUserInOffice;
    }

    const profileNote = willDeleteProfile
      ? `\n\nAlso deleting office profile '${officeId}' since no other user belongs to this office.`
      : '';

    if (!confirm(`⚠️ DELETE user '${email || userId}'?\n\nThis will remove their profile from Firestore. Their Firebase Auth account cannot be deleted from the client.${profileNote}`)) return;

    if (statusEl) statusEl.textContent = `Deleting user ${email || userId}...`;

    await deleteDoc(doc(db, "users", userId));

    if (willDeleteProfile) {
      await deleteDoc(doc(db, "settings", officeId));
      localStorage.removeItem(`pensionSettings_${officeId}`);
    }

    window._logAdminActivity('delete_user',
      `Deleted user ${email || userId} (uid: ${userId})` +
      (willDeleteProfile ? ` and orphaned office profile [${officeId}]` : ''));

    if (statusEl) statusEl.textContent = willDeleteProfile
      ? `User ${email || userId} and office profile '${officeId}' deleted.`
      : `User ${email || userId} deleted.`;
    window.loadAdminUsers();
    if (typeof window.adminLoadOfficeDirectory === 'function') window.adminLoadOfficeDirectory();
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error deleting user: ${err.message}`;
  }
};