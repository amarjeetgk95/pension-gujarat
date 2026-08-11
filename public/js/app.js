// Global App Variables
let currentCaseId = null;
let currentCaseData = {};
let liveDebounceTimer = null;

const PENSION_RULES = {
  maxQualifyingYears: 33,
  pensionDivisor: 66,
  maxGratuity: 2500000,
  defaultCommutationPct: 40
};
window.PENSION_RULES = PENSION_RULES;

const COMMUTATION_FACTORS = {
  20: 9.188, 21: 9.187, 22: 9.186, 23: 9.185, 24: 9.184, 25: 9.183, 26: 9.182, 27: 9.180, 28: 9.178, 29: 9.176,
  30: 9.173, 31: 9.169, 32: 9.164, 33: 9.159, 34: 9.152, 35: 9.145, 36: 9.136, 37: 9.126, 38: 9.116, 39: 9.103,
  40: 9.090, 41: 9.075, 42: 9.059, 43: 9.040, 44: 9.019, 45: 8.996, 46: 8.971, 47: 8.943, 48: 8.913, 49: 8.881,
  50: 8.846, 51: 8.808, 52: 8.768, 53: 8.724, 54: 8.678, 55: 8.627, 56: 8.572, 57: 8.512, 58: 8.446, 59: 8.371,
  60: 8.287, 61: 8.194, 62: 8.093, 63: 7.982, 64: 7.862, 65: 7.731, 66: 7.591, 67: 7.431, 68: 7.262, 69: 7.083,
  70: 6.897, 71: 6.703, 72: 6.502, 73: 6.296, 74: 6.085, 75: 5.872, 76: 5.657, 77: 5.443, 78: 5.229, 79: 5.018,
  80: 4.812, 81: 4.611
};
window.COMMUTATION_FACTORS = COMMUTATION_FACTORS;

// Settings Top-Nav Icons Initializer
window.initSettingsNavIcons = function() {
  const officeBtn = document.getElementById('set-tab-office');
  if (officeBtn && !officeBtn.querySelector('svg')) {
    const num = officeBtn.querySelector('.step-num');
    if (num) num.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path><path d="M9 7h1"></path><path d="M9 11h1"></path><path d="M9 15h1"></path><path d="M14 7h1"></path><path d="M14 11h1"></path><path d="M14 15h1"></path></svg>`;
  }
  const forwardingBtn = document.getElementById('set-tab-forwarding');
  if (forwardingBtn && !forwardingBtn.querySelector('svg')) {
    const num = forwardingBtn.querySelector('.step-num');
    if (num) num.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`;
  }
  const officerBtn = document.getElementById('set-tab-officer');
  if (officerBtn && !officerBtn.querySelector('svg')) {
    const num = officerBtn.querySelector('.step-num');
    if (num) num.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`;
  }
  const rulesBtn = document.getElementById('set-tab-rules');
  if (rulesBtn && !rulesBtn.querySelector('svg')) {
    const num = rulesBtn.querySelector('.step-num');
    if (num) num.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line></svg>`;
  }
  const profilesBtn = document.getElementById('set-tab-profiles');
  if (profilesBtn && !profilesBtn.querySelector('svg')) {
    const num = profilesBtn.querySelector('.step-num');
    if (num) num.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline></svg>`;
  }
};

// Settings Top-Nav Tab Switcher
window.switchSettingsTab = function(tabId) {
  window.currentSettingsTab = tabId;
  if (typeof window.initSettingsNavIcons === 'function') window.initSettingsNavIcons();

  const tabs = document.querySelectorAll('#settingsNav .step-link, .settings-tab');
  tabs.forEach(t => t.classList.remove('active'));

  const panels = document.querySelectorAll('.settings-panel');
  panels.forEach(p => p.classList.remove('active'));

  const activeBtn = document.getElementById(`set-tab-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  const activePanel = document.getElementById(`set-panel-${tabId}`);
  if (activePanel) activePanel.classList.add('active');
};

// Admin Studio Tab Switcher Handler
window.openAdminStudioTab = function(evt, tabId) {
  if (evt && evt.preventDefault) evt.preventDefault();
  
  const nav = document.getElementById('adminStudioNav');
  if (nav) {
    nav.querySelectorAll('.step-link').forEach(el => el.classList.remove('active'));
  }
  if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');

  document.querySelectorAll('.admin-tab-workspace').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }

  if (tabId === 'atab-cases' && typeof window.adminLoadAllCasesTable === 'function') {
    window.adminLoadAllCasesTable();
    window._populateAdminCaseOfficeFilter();
  }
  if (tabId === 'atab-offices' && typeof window.adminLoadOfficeDirectory === 'function') {
    window.adminLoadOfficeDirectory();
  }
  if (tabId === 'atab-directory' && typeof window.renderDirectory === 'function') {
    window.renderDirectory();
  }
  if (tabId === 'atab-trash' && typeof window.adminLoadTrash === 'function') {
    window.adminLoadTrash();
  }
  if (tabId === 'atab-audit' && typeof window.adminLoadAuditLog === 'function') {
    window.adminLoadAuditLog();
  }
  if (tabId === 'atab-analytics' && typeof window.renderAdminAnalytics === 'function') {
    window.renderAdminAnalytics();
  }
};

window.refreshAdminStudio = function() {
  const activeTab = document.querySelector('.admin-tab-workspace.active');
  if (!activeTab) return;
  const id = activeTab.id;
  if (id === 'atab-users' && typeof window.loadAdminUsers === 'function') window.loadAdminUsers();
  if (id === 'atab-cases' && typeof window.adminLoadAllCasesTable === 'function') window.adminLoadAllCasesTable();
  if (id === 'atab-offices' && typeof window.adminLoadOfficeDirectory === 'function') window.adminLoadOfficeDirectory();
  if (id === 'atab-directory' && typeof window.renderDirectory === 'function') window.renderDirectory();
  if (id === 'atab-trash' && typeof window.adminLoadTrash === 'function') window.adminLoadTrash();
  if (id === 'atab-audit' && typeof window.adminLoadAuditLog === 'function') window.adminLoadAuditLog();
  if (id === 'atab-analytics' && typeof window.renderAdminAnalytics === 'function') window.renderAdminAnalytics();
  if (id === 'atab-live' && typeof window.startAdminPresenceMonitor === 'function') window.startAdminPresenceMonitor();
};

// UI & Navigation Logic
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.initSettingsNavIcons === 'function') window.initSettingsNavIcons();
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  
  function toggleMenu() { 
      sidebar.classList.toggle('open'); 
      overlay.classList.toggle('active'); 
  }
  
  if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
  if (overlay) overlay.addEventListener('click', toggleMenu);

  // Auto-translate numeric input to Gujarati in print boxes
  document.addEventListener('input', function(e) {
    if (e.target.classList && e.target.classList.contains('digit-box') && e.target.isContentEditable) {
      let text = e.target.innerText;
      let gujText = toGuj(text);
      if (text !== gujText) {
        e.target.innerText = gujText;
        let range = document.createRange();
        let sel = window.getSelection();
        range.selectNodeContents(e.target);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  });
});

function switchView(viewName) {
  if (viewName === 'settings' && typeof window.initSettingsNavIcons === 'function') window.initSettingsNavIcons();
  const userRole = String(window.currentUserProfile?.role || '').toLowerCase();
  const isAdmin = (userRole === 'admin' || userRole === 'super_admin');

  if (viewName === 'admin' && !isAdmin) {
    alert("Access restricted: Admin Panel requires Super Admin role.");
    viewName = 'dashboard';
  }

  const activeViewEl = document.querySelector('.view.active');
  if (activeViewEl && activeViewEl.id === 'view-entry' && viewName !== 'entry' && window._formDirty && !window._savingCase) {
    if (!confirm('You have unsaved changes in the case form. Leave anyway?')) return;
  }

  document.querySelectorAll('.nav-btn').forEach(btn => { 
      btn.classList.remove('active'); 
      btn.removeAttribute('aria-current'); 
  });
  
  let activeBtn = document.getElementById('nav-' + viewName);
  if (activeBtn) { 
      activeBtn.classList.add('active'); 
      activeBtn.setAttribute('aria-current', 'page'); 
  }
  
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById('view-' + viewName);
  if (targetView) targetView.classList.add('active');

  let badge = document.getElementById('liveSyncBadge');
  if (badge) badge.style.display = (viewName === 'entry' || viewName === 'print-centre') ? 'inline-block' : 'none';
  
  let sideSum = document.getElementById('sidebarSummary');
  if (sideSum) sideSum.style.display = (viewName === 'entry' || viewName === 'print-centre') ? 'flex' : 'none';
  
  if (viewName === 'print-centre') {
      if(typeof renderForwarding === 'function') renderForwarding();
      if(typeof renderCover === 'function') renderCover();
      if(typeof renderPart1 === 'function') renderPart1();
      if(typeof renderPart2 === 'function') renderPart2();
  }

  if (viewName === 'admin') {
      if (typeof window.loadAdminUsers === 'function') window.loadAdminUsers();
  }
  
  if (window.innerWidth <= 800) { 
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open'); 
      if (overlay) overlay.classList.remove('active'); 
  }
  window.scrollTo(0, 0);
}

function updateDynamicHeader(name, status, caseId) {
  document.getElementById('headName').textContent = name || 'No Active Case';
  const statusEl = document.getElementById('headStatus');
  if (status) {
      statusEl.style.display = 'inline-flex';
      statusEl.textContent = status;
      const sk = String(status).toLowerCase();
      const sc = (sk === 'draft') ? 'draft'
        : (sk === 'completed' || sk === 'approved') ? 'completed'
        : (sk === 'rejected') ? 'rejected'
        : 'pending';
      statusEl.className = 'status-indicator ' + sc;
  } else {
      statusEl.style.display = 'none';
  }
  document.getElementById('headCaseNo').textContent = caseId ? 'Case #' + caseId : '';
  let now = new Date();
  document.getElementById('headSaved').textContent = caseId ? 'Opened ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
}

// Utility formatting functions — now provided by utils.js (toGuj, parseGuj, createDateBoxesHTML, createPinBoxesHTML, createPhoneBoxesHTML, createCharBoxes, formatDateForBox, formatDateStandard, setCheck, setText)

// Live Calculations Handler for Pension Case Module
window.handleLiveFormChange = function(liveData) {
  if (liveData) {
    window.currentCaseData = Object.assign({}, window.currentCaseData || {}, liveData);
  }
  const d = window.currentCaseData || {};
  const dojVal = document.getElementById('f_doj')?.value || d.doj || d.DOJ;
  const dorVal = document.getElementById('f_dor')?.value || d.dor || d.DOR;
  const dobVal = document.getElementById('f_dob')?.value || d.dob || d.DOB;

  // Extract Last Pay, NPA & DA
  let lastPayVal = parseFloat(d.pay2Basic || d.lastPay || d.pay1Basic || 0);
  let npaVal = parseFloat(d.pay2Npa || d.pay1Npa || d.npa || 0);
  if (!lastPayVal || isNaN(lastPayVal)) {
    const pBasics = document.querySelectorAll('#payPeriodsBody .p-basic');
    pBasics.forEach(inp => {
      const v = parseFloat(String(inp.value || '').replace(/[, ]/g, ''));
      if (!isNaN(v) && v > 0) lastPayVal = v;
    });
  }
  if (isNaN(lastPayVal)) lastPayVal = 0;
  if (!npaVal || isNaN(npaVal)) {
    const pNpas = document.querySelectorAll('#payPeriodsBody .p-npa');
    pNpas.forEach(inp => {
      const v = parseFloat(String(inp.value || '').replace(/[, ]/g, ''));
      if (!isNaN(v) && v > 0) npaVal = v;
    });
  }
  if (isNaN(npaVal)) npaVal = 0;

  let daRate = parseFloat(d.pay2Da || d.daRate || 0);
  // Pensionable emoluments = Last Basic Pay + NPA (non-practising allowance)
  let pensionableSalary = lastPayVal + npaVal;

  const commPctVal = parseFloat(document.getElementById('f_commPct')?.value || d.commPct || 40) / 100;
  const rules = window.PENSION_RULES || { maxQualifyingYears: 33, pensionDivisor: 66, maxGratuity: 2500000 };

  // 1. Precise Qualifying Service Years Calculation (with deductions & 6-month rounding rule)
  let qualYears = 0;
  let hasService = false;
  let grossDetail = '';
  let serviceText = '—';
  if (dojVal && dorVal) {
    const d1 = new Date(dojVal);
    const d2 = new Date(dorVal);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
      let days = d2.getDate() - d1.getDate() + 1;
      let months = d2.getMonth() - d1.getMonth();
      let years = d2.getFullYear() - d1.getFullYear();
      if (days < 0) { months--; days += new Date(d2.getFullYear(), d2.getMonth(), 0).getDate(); }
      if (days >= 30) { months++; days -= 30; }
      if (months < 0) { years--; months += 12; }

      const dedY = parseInt(d.dedY) || 0, dedM = parseInt(d.dedM) || 0, dedD = parseInt(d.dedD) || 0;
      let nDays = days - dedD, nMonths = months - dedM, nYears = years - dedY;
      if (nDays < 0) { nDays += 30; nMonths--; }
      if (nMonths < 0) { nMonths += 12; nYears--; }
      if (nYears < 0) { nYears = 0; nMonths = 0; nDays = 0; }

      qualYears = nYears;
      if (nMonths >= 6) qualYears++; // 6-month rounding rule
      if (qualYears > rules.maxQualifyingYears) qualYears = rules.maxQualifyingYears;

      hasService = true;
      serviceText = qualYears + ' yrs';
      grossDetail = 'Gross ' + years + 'y ' + months + 'm − Deductions ' + dedY + 'y ' + dedM + 'm ' + dedD + 'd → ' + qualYears + ' yrs qualifying';
    }
  }
  const sumYearsEl = document.getElementById('sum_years');
  if (sumYearsEl) {
    sumYearsEl.textContent = serviceText;
    if (grossDetail) sumYearsEl.title = grossDetail; else sumYearsEl.removeAttribute('title');
  }

  // 2. Last Basic Pay (+ DA)
  const sumLastPayEl = document.getElementById('sum_lastpay');
  if (sumLastPayEl) sumLastPayEl.textContent = lastPayVal > 0 ? '₹' + Math.round(lastPayVal).toLocaleString('en-IN') : '—';
  const sumNpaEl = document.getElementById('sum_paynpa');
  if (sumNpaEl) {
    sumNpaEl.textContent = (lastPayVal > 0 && npaVal > 0) ? '+ ₹' + Math.round(npaVal).toLocaleString('en-IN') + ' NPA' : '';
  }

  // 3. Monthly Pension (Pay + NPA) ÷ 2 (Math.max(Half Pay, Formula) for safety)
  const formulaPension = Math.round((pensionableSalary * qualYears) / rules.pensionDivisor);
  const halfPayMin = Math.round(pensionableSalary / 2);
  const monthlyPension = Math.max(formulaPension, halfPayMin);
  // DA is calculated on the pension amount: (Basic + NPA) ÷ 2 × DA%
  let daAmt = Math.round((monthlyPension * daRate) / 100);
  const sumPensionEl = document.getElementById('sum_pension');
  if (sumPensionEl) {
    if (hasService && lastPayVal > 0) {
      sumPensionEl.textContent = '₹' + monthlyPension.toLocaleString('en-IN');
      let tip = 'Pension = (Pay ₹' + Math.round(lastPayVal).toLocaleString('en-IN') + ' + NPA ₹' + Math.round(npaVal).toLocaleString('en-IN') + ') ÷ 2 = ₹' + halfPayMin.toLocaleString('en-IN');
      if (daRate > 0) tip += ' · DA ' + daRate + '% of pension = ₹' + Math.round(daAmt).toLocaleString('en-IN');
      sumPensionEl.title = tip;
    } else {
      sumPensionEl.textContent = '—';
      sumPensionEl.removeAttribute('title');
    }
  }
  const sumPayDaEl = document.getElementById('sum_payda');
  if (sumPayDaEl) {
    sumPayDaEl.textContent = (hasService && lastPayVal > 0 && daRate > 0) ? '+ ₹' + Math.round(daAmt).toLocaleString('en-IN') + ' DA (' + daRate + '%)' : '';
  }

  // 4. Commutation (CVP)
  let commFactor = 8.371;
  if (dobVal && dorVal) {
    const bday = new Date(dobVal), retDate = new Date(dorVal);
    if (!isNaN(bday.getTime()) && !isNaN(retDate.getTime())) {
      let age = retDate.getFullYear() - bday.getFullYear();
      let mDiff = retDate.getMonth() - bday.getMonth();
      if (mDiff < 0 || (mDiff === 0 && retDate.getDate() < bday.getDate())) age--;
      const ageNextBirthday = age + 1;
      commFactor = (window.COMMUTATION_FACTORS || COMMUTATION_FACTORS)[ageNextBirthday] || 8.371;
    }
  }
  const commAmt = Math.round(monthlyPension * commPctVal);
  const cvpTotal = Math.round(commAmt * commFactor * 12);
  const sumCvpEl = document.getElementById('sum_cvp');
  if (sumCvpEl) {
    if (hasService && lastPayVal > 0 && dobVal) {
      sumCvpEl.textContent = '₹' + cvpTotal.toLocaleString('en-IN');
      sumCvpEl.title = 'Commutation ' + Math.round(commPctVal * 100) + '% × factor ' + commFactor + ' × 12';
    } else {
      sumCvpEl.textContent = '—';
      sumCvpEl.removeAttribute('title');
    }
  }

  // 5. DCRG Gratuity (Includes Basic Pay + DA on Salary)
  const salaryDaAmt = Math.round((pensionableSalary * daRate) / 100);
  const dcrgRaw = Math.round(((pensionableSalary + salaryDaAmt) * qualYears) / 2);
  const gratuityFinal = Math.min(rules.maxGratuity, dcrgRaw);
  const sumGratuityEl = document.getElementById('sum_gratuity');
  if (sumGratuityEl) {
    if (hasService && lastPayVal > 0) {
      sumGratuityEl.textContent = '₹' + gratuityFinal.toLocaleString('en-IN');
      sumGratuityEl.title = 'Pay ₹' + Math.round(pensionableSalary).toLocaleString('en-IN') + ' + DA ₹' + salaryDaAmt.toLocaleString('en-IN') + ' × ' + qualYears + ' yrs ÷ 2 (Capped at ₹' + rules.maxGratuity.toLocaleString('en-IN') + ')';
    } else {
      sumGratuityEl.textContent = '—';
      sumGratuityEl.removeAttribute('title');
    }
  }

  // 6. Completeness ring
  if (typeof window.updateCompletenessRing === 'function') window.updateCompletenessRing();
};

// Manual re-run of the live estimates (refresh button in the summary bar)
window.recalcSummary = function() {
  let data = window.currentCaseData || {};
  if (typeof window.collectFormData === 'function') {
    data = Object.assign({}, data, window.collectFormData());
  }
  window.currentCaseData = data;
  if (typeof window.handleLiveFormChange === 'function') window.handleLiveFormChange(data);
  const daRate = parseFloat(data.pay2Da || data.daRate || 0);
  const lastPay = parseFloat(data.pay2Basic || data.lastPay || data.pay1Basic || 0);
  const btn = document.getElementById('sumRefreshBtn');
  if (btn) {
    btn.setAttribute('title', 'Re-run ✓ · Pay ₹' + (lastPay || 0).toLocaleString('en-IN') + (daRate ? ' · DA ' + daRate + '%' : ''));
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 600);
  }
};

// Completeness ring click → jump to the first missing/invalid field
window.jumpToFirstMissing = function() {
  const viewEl = document.getElementById('view-entry');
  if (!viewEl) return;
  const firstErr = viewEl.querySelector('.input-err');
  if (firstErr) {
    firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstErr.focus({ preventScroll: true });
    return;
  }
  const requiredIds = ['f_fullName', 'f_dob', 'f_designation', 'f_doj', 'f_dor'];
  for (const id of requiredIds) {
    const el = document.getElementById(id);
    if (el && !el.value) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
      return;
    }
  }
};

// Completeness ring in the live summary bar (driven by the validation confidence score)
window.updateCompletenessRing = function() {
  const circle = document.getElementById('sumRingCircle');
  const label = document.getElementById('sumRingLabel');
  if (!circle || !label) return;
  let score = 0;
  if (typeof window.computeConfidence === 'function') {
    const conf = window.computeConfidence(window.currentCaseData || {});
    score = conf && conf.score ? conf.score : 0;
  }
  const C = 106.8;
  circle.style.strokeDashoffset = String(C - (score / 100) * C);
  circle.style.stroke = score >= 80 ? '#34C759' : score >= 50 ? '#D97706' : '#DC2626';
  label.textContent = score + '%';
};

// Print Centre Tab Navigation Handler
window.openPrintTab = function(evt, tabId) {
  if (evt && evt.preventDefault) evt.preventDefault();
  document.querySelectorAll('.print-nav-link').forEach(el => el.classList.remove('active'));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
  document.querySelectorAll('.print-tab-content').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }

  if (typeof window.collectFormData === 'function') {
    const live = window.collectFormData();
    window.currentCaseData = Object.assign({}, window.currentCaseData || {}, live);
  }

  if (tabId === 'print-forwarding' && typeof renderForwarding === 'function') renderForwarding();
  if (tabId === 'print-cover' && typeof renderCover === 'function') renderCover();
  if (tabId === 'print-part1' && typeof renderPart1 === 'function') renderPart1();
  if (tabId === 'print-part2' && typeof renderPart2 === 'function') renderPart2();
};

// 1-Click Complete Case File Print Bundle
window.popupNativePrintAll = function() {
  if (typeof window.collectFormData === 'function') {
    const live = window.collectFormData();
    window.currentCaseData = Object.assign({}, window.currentCaseData || {}, live);
  }
  if (typeof renderForwarding === 'function') renderForwarding();
  if (typeof renderCover === 'function') renderCover();
  if (typeof renderPart1 === 'function') renderPart1();
  if (typeof renderPart2 === 'function') renderPart2();

  if (typeof switchView === 'function') switchView('print-centre');

  const tabs = document.querySelectorAll('.print-tab-content');
  tabs.forEach(t => {
    t.classList.add('active');
    t.style.display = 'block';
  });

  setTimeout(() => {
    window.print();
    tabs.forEach((t, idx) => {
      if (idx === 0) {
        t.classList.add('active');
        t.style.display = 'block';
      } else {
        t.classList.remove('active');
        t.style.display = 'none';
      }
    });
  }, 300);
};

// Speed Keyboard Shortcuts (Global Hotkeys)
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();

    // Ctrl + S : Save Case
    if (key === 's') {
      e.preventDefault();
      if (typeof window.saveOrUpdateCase === 'function') {
        window.saveOrUpdateCase();
      }
    }
    // Ctrl + N : New Case
    else if (key === 'n') {
      e.preventDefault();
      if (typeof window.startNewCase === 'function') {
        window.startNewCase();
        if (typeof window.switchView === 'function') window.switchView('entry');
      }
    }
    // Ctrl + P : Print Complete Case File (gated from the entry form)
    else if (key === 'p') {
      e.preventDefault();
      const activeView = document.querySelector('.view.active');
      if (activeView && activeView.id === 'view-entry' && typeof window.goToPrint === 'function') {
        window.goToPrint();
      } else if (typeof window.popupNativePrintAll === 'function') {
        window.popupNativePrintAll();
      }
    }
    // Ctrl + F : Focus Search Bar in Dashboard
    else if (key === 'f') {
      const searchInp = document.getElementById('searchInput');
      const dashView = document.getElementById('view-dashboard');
      if (searchInp && dashView && dashView.classList.contains('active')) {
        e.preventDefault();
        searchInp.focus();
      }
    }
  }
});

// Auto-save is handled by the debounce timer in form-logic.js (single mechanism)
// The previous 20-second interval auto-save has been removed to prevent conflicts.