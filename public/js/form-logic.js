// ============================================================
// FORM LOGIC, DYNAMIC INPUTS, & DATA COLLECTION
// ============================================================

let currentStep = 1;

// Note: $(), val(), setVal(), fDate(), fDateOpt(), toGuj(), parseGuj(),
// formatDateForBox(), formatDateStandard(), createDateBoxesHTML(),
// createPinBoxesHTML(), createPhoneBoxesHTML(), createCharBoxes(),
// setCheck(), setText() are defined in utils.js

// ------------------------------------------------------------
// KEYBOARD SHORTCUTS
// ------------------------------------------------------------
// Note: Ctrl+S is handled globally in app.js
document.addEventListener('keydown', function(e) {
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'view-entry') {
        // Enter key to advance focus through form inputs
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                e.preventDefault();
                const focusables = Array.from(document.querySelectorAll('#view-entry input:not([type="hidden"]), #view-entry select'))
                                       .filter(el => !el.disabled && el.offsetParent !== null);
                const index = focusables.indexOf(e.target);
                if (index > -1 && index < focusables.length - 1) {
                    focusables[index + 1].focus();
                }
            }
        }
        // Ctrl+Enter or Cmd+Enter to advance to the next step
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            window.goNextStep();
        }
    }
});

// ------------------------------------------------------------
// SMART ALERTS & LOGIC VALIDATION
// ------------------------------------------------------------
window.formatNumInput = function(inp) {
  if (!inp) return;
  const raw = (inp.dataset.raw !== undefined && inp.dataset.raw !== '') ? inp.dataset.raw : inp.value;
  const num = parseFloat(String(raw).replace(/[, ]/g, ''));
  if (!isNaN(num)) {
    inp.dataset.raw = String(num);
    inp.value = num.toLocaleString('en-IN');
  } else {
    inp.dataset.raw = '';
    inp.value = '';
  }
};

function generateSmartAlert(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const safeMsg = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    el.innerHTML = `<div class="smart-alert"><span class="smart-alert-icon">⚠️</span><span>${safeMsg}</span></div>`;
    el.style.display = 'block';
}

function clearSmartAlert(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = 'none';
}

function validateSectionLogic() {
    const doj = document.getElementById('f_doj');
    const dor = document.getElementById('f_dor');
    if (doj.value && dor.value && new Date(doj.value) >= new Date(dor.value)) {
        doj.classList.add('input-err'); 
        dor.classList.add('input-err');
        generateSmartAlert('smartAlert_dates', "Logical Error: The Date of Joining (DOJ) cannot be after the Date of Retirement (DOR).");
    } else {
        if (doj) doj.classList.remove('input-err');
        if (dor) dor.classList.remove('input-err');
        clearSmartAlert('smartAlert_dates');
    }
    
    let totalMonths = 0;
    const countInputs = document.querySelectorAll('#payPeriodsBody .p-count');
    countInputs.forEach(inp => { totalMonths += parseInt(inp.value) || 0; });
    const payTotalEl = document.getElementById('payMonthsTotal');
    if (payTotalEl) {
        payTotalEl.textContent = 'Total: ' + totalMonths + ' / 10 months';
        payTotalEl.style.color = totalMonths === 10 ? '#34C759' : '#D97706';
        payTotalEl.style.fontWeight = '700';
    }
    if (countInputs.length > 0 && totalMonths !== 10) {
        countInputs.forEach(inp => inp.classList.add('input-err'));
        generateSmartAlert('smartAlert_pay', `Calculation Error: Total pay months must equal exactly 10. Currently equals ${totalMonths}.`);
    } else {
        countInputs.forEach(inp => inp.classList.remove('input-err'));
        clearSmartAlert('smartAlert_pay');
    }
}

// Auto-Calculate Retirement Date (DOR) strictly at 58 Years standard from Date of Birth (DOB)
window.autoCalculateDOR = function(force) {
  const dobVal = val('f_dob');
  if (!dobVal) return;

  const dob = new Date(dobVal);
  if (isNaN(dob.getTime())) return;

  // Strict Standard Retirement Age: 58 Years
  let retYear = dob.getFullYear() + 58;
  let retMonth = dob.getMonth(); 

  // Govt Rule: Born on 1st of month retires on last day of previous month
  if (dob.getDate() === 1) { retMonth -= 1; }

  const dor = new Date(retYear, retMonth + 1, 0);
  const yyyy = dor.getFullYear();
  const mm = String(dor.getMonth() + 1).padStart(2, '0');
  const dd = String(dor.getDate()).padStart(2, '0');
  
  const dorEl = document.getElementById('f_dor');
  if (dorEl) {
    // Auto-fill 58-year standard, but allow user full authority to edit/change afterward
    if (force || !dorEl.value || dorEl.dataset.userEdited !== "true") {
      dorEl.value = `${yyyy}-${mm}-${dd}`;
    }
  }

  if (typeof window.emitLive === 'function') window.emitLive();
};

document.addEventListener('DOMContentLoaded', () => {
  const dobEl = document.getElementById('f_dob');
  const dorEl = document.getElementById('f_dor');
  const pTypeEl = document.getElementById('f_pensionType');
  const catEl = document.getElementById('f_empCategory');

  if (dorEl) {
    // Preserve manual user edits/authority
    ['input', 'change'].forEach(evt => {
      dorEl.addEventListener(evt, () => {
        dorEl.dataset.userEdited = "true";
      });
    });
  }

  if (dobEl) {
    dobEl.addEventListener('change', () => {
      if (dorEl) dorEl.dataset.userEdited = "false";
      window.autoCalculateDOR(true);
    });
    dobEl.addEventListener('input', () => {
      if (dorEl) dorEl.dataset.userEdited = "false";
      window.autoCalculateDOR(true);
    });
  }

  [pTypeEl, catEl].forEach(el => {
    if (el) {
      el.addEventListener('change', () => window.autoCalculateDOR(false));
    }
  });
});

// ------------------------------------------------------------
// STEP TAB NAVIGATION
// ------------------------------------------------------------
window.goNextStep = function() {
  if (currentStep >= 6) return;
  const data = window.collectFormData();
  const res = window.validateCaseData(data);
  const stepErrors = res.errors.filter(e => e.step === currentStep);
  if (stepErrors.length > 0) {
    window.showStepErrors(currentStep, stepErrors);
    return;
  }
  openStep(currentStep + 1);
};
window.goPrevStep = function() { if (currentStep > 1) openStep(currentStep - 1); };

window.openStep = function(stepNumber) {
    if (stepNumber > currentStep && typeof window.validateCaseData === 'function') {
        const data = window.collectFormData ? window.collectFormData() : {};
        const res = window.validateCaseData(data);
        const priorErrors = (res.errors || []).filter(e => e.step < stepNumber);
        if (priorErrors.length > 0) {
            const stepErrors = (res.errors || []).filter(e => e.step === currentStep);
            if (typeof window.showStepErrors === 'function') {
                window.showStepErrors(currentStep, stepErrors.length > 0 ? stepErrors : priorErrors);
            }
            return;
        }
    }
    const tabs = ['sec-basic', 'sec-office', 'sec-dates', 'sec-pay', 'sec-family', 'sec-review'];
    const targetId = tabs[stepNumber - 1];
    
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    let target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
    
    currentStep = stepNumber;
    
    document.querySelectorAll('#formNav .step-link').forEach((el, index) => {
        if (index === stepNumber - 1) el.classList.add('active');
        else el.classList.remove('active');
    });

    const STEP_SVGS = [
      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="6" x2="9" y2="6.01"></line><line x1="15" y1="6" x2="15" y2="6.01"></line><line x1="9" y1="10" x2="9" y2="10.01"></line><line x1="15" y1="10" x2="15" y2="10.01"></line></svg>`,
      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path></svg>`,
      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-3-3.87"></path><path d="M9 21v-2a4 4 0 0 1 3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><circle cx="9" cy="7" r="4"></circle></svg>`,
      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`
    ];

    // Mark passed steps as "done" (✓ SVG) and restore SVG icons for future/current steps
    document.querySelectorAll('#formNav .step-link').forEach((el, index) => {
        const numEl = el.querySelector('.step-num');
        if (!numEl) return;
        if (index < currentStep - 1) {
            el.classList.add('done');
            numEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else {
            el.classList.remove('done');
            numEl.innerHTML = STEP_SVGS[index] || '';
        }
    });
    
    const btnPrev = document.getElementById('btnPrevStep');
    const btnNext = document.getElementById('btnNextStep');
    
    if (btnPrev) btnPrev.style.display = (stepNumber === 1) ? 'none' : 'inline-flex';
    if (btnNext) {
        if (stepNumber === 6) { 
            btnNext.style.display = 'none'; 
        } else {
            btnNext.style.display = 'inline-flex';
            const nextLabels = [
                'Next: Office Details &rarr;', 'Next: Service Dates &rarr;',
                'Next: Pension & Pay &rarr;', 'Next: Family Details &rarr;', 'Next: Review Case ✅'
            ];
            btnNext.innerHTML = nextLabels[stepNumber - 1];
        }
    }
    
    if (targetId === 'sec-review' && typeof window.renderReviewTab === 'function') {
        window.renderReviewTab();
    }
    
    let scrollContainer = document.querySelector('.content-area');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
};

// ------------------------------------------------------------
// VALIDATION ENGINE & REVIEW (Step 6)
// ------------------------------------------------------------
const PENSION_TYPE_LABELS = {
  '1': 'Superannuation', '2': 'Premature Retirement', '3': 'Voluntary (20 yrs)', '4': 'Invalid',
  '5': 'Voluntary (25 yrs)', '6': 'Injury Pension', '7': 'Family Pension', '8': 'Compensation',
  '9': 'Compassionate Pension', '10': 'Other'
};

window.validateCaseData = function(data) {
  if (!data) data = window.collectFormData ? window.collectFormData() : {};
  const errors = [];
  const warnings = [];
  const addErr = (step, field, message) => errors.push({ step: step, field: field, message: message });
  const addWarn = (step, field, message) => warnings.push({ step: step, field: field, message: message });

  // Step 1: Employee
  if (!data.fullName || !String(data.fullName).trim()) addErr(1, 'f_firstNameGuj', 'Full name is required');
  if (!data.dob) addErr(1, 'f_dob', 'Date of birth is required');
  if (!data.designation && !data.designationEn) addWarn(1, 'f_designation', 'Designation is missing');
  const gujDigits = (v) => window.gujToEnDigits ? window.gujToEnDigits(v) : String(v);
  const phone = gujDigits(data.phone || '').replace(/[\s-]/g, '');
  if (phone && !/^\d{10}$/.test(phone)) addErr(1, 'f_phone', 'Mobile number must be 10 digits');
  const pin = gujDigits(data.pinCode || '').trim();
  if (pin && !/^\d{6}$/.test(pin)) addErr(1, 'f_pinCode', 'PIN code must be 6 digits');
  const email = String(data.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) addErr(1, 'f_email', 'Invalid email address');

  // Step 2: Office (soft)
  if (!data.toAddress) addWarn(2, 'f_toAddress', 'Forwarding address (To Address) is empty');
  if (!data.officeAddress && !data.officeAddressEn) addWarn(2, 'f_officeAddress', 'Office address is empty');

  // Step 3: Service dates
  if (!data.doj) addErr(3, 'f_doj', 'Date of Joining (DOJ) is required');
  if (!data.dor) addErr(3, 'f_dor', 'Date of Retirement (DOR) is required');
  const dt = (v) => { const t = new Date(v); return isNaN(t.getTime()) ? null : t; };
  const dobD = dt(data.dob), dojD = dt(data.doj), dorD = dt(data.dor);
  if (dojD && dorD && dojD.getTime() >= dorD.getTime()) addErr(3, 'f_dor', 'DOJ must be before DOR');
  if (dobD && dojD && dobD.getTime() > dojD.getTime()) addErr(3, 'f_doj', 'DOJ cannot be earlier than DOB');
  if ((parseInt(data.dedM) || 0) > 11) addErr(3, 'f_dedM', 'Deduction months cannot exceed 11');
  if ((parseInt(data.dedD) || 0) > 31) addErr(3, 'f_dedD', 'Deduction days cannot exceed 31');

  // Step 4: Pay
  const pay1 = parseFloat(data.pay1Basic), pay2 = parseFloat(data.pay2Basic);
  const c1 = parseInt(data.pay1Count) || 0, c2 = parseInt(data.pay2Count) || 0;
  const totalMonths = c1 + c2;
  if (!pay1 && !pay2) {
    addErr(4, 'pay', 'At least one pay period (Basic Pay) is required');
  } else if (totalMonths !== 10) {
    addErr(4, 'pay', 'Pay periods must total exactly 10 months (currently ' + totalMonths + ')');
  }

  // Step 5: Family & Commutation
  const comm = parseFloat(data.commPct);
  if (data.commPct === '' || data.commPct == null || isNaN(comm)) addErr(5, 'f_commPct', 'Commutation % is required');
  else if (comm < 0 || comm > 100) addErr(5, 'f_commPct', 'Commutation % must be between 0 and 100');
  if (String(data.pensionType) === '7' && !data.heirSurnameGuj && !data.heirFirstNameGuj && !data.heirSurname && !data.heirFirstName) {
    addErr(5, 'heir', 'Heir details are required for Family Pension');
  }
  if (comm > 0 && !data.commDate) addWarn(5, 'f_commDate', 'Commutation request date is missing');

  return { errors: errors, warnings: warnings };
};

window.computeConfidence = function(data) {
  if (!data) data = window.collectFormData ? window.collectFormData() : {};
  const checks = [
    { label: 'Full Name', ok: !!(data.fullName && String(data.fullName).trim()) },
    { label: 'Date of Birth', ok: !!data.dob },
    { label: 'Designation', ok: !!(data.designation || data.designationEn) },
    { label: 'Contact (Phone/Email)', ok: !!(data.phone || data.email) },
    { label: 'Date of Joining', ok: !!data.doj },
    { label: 'Date of Retirement', ok: !!data.dor },
    { label: 'Pay Periods (10 months)', ok: (parseInt(data.pay1Count) || 0) + (parseInt(data.pay2Count) || 0) === 10 },
    { label: 'Basic Pay entered', ok: !!(parseFloat(data.pay1Basic) || parseFloat(data.pay2Basic)) },
    { label: 'Commutation %', ok: !isNaN(parseFloat(data.commPct)) },
    { label: 'Heir Details', ok: !!(data.heirFirstNameGuj || data.heirFirstName) },
    { label: 'Office Address', ok: !!(data.officeAddress || data.officeAddressEn) },
    { label: 'Family Members', ok: (data.family || []).some(f => f.name || f.relation) }
  ];
  const okCount = checks.filter(c => c.ok).length;
  const score = Math.round((okCount / checks.length) * 100);
  return { score: score, checks: checks };
};

window.renderReviewTab = function() {
  const container = document.getElementById('reviewDataContainer');
  const checklistEl = document.getElementById('reviewChecklist');
  const scoreEl = document.getElementById('reviewConfidenceScore');
  let data = window.collectFormData ? window.collectFormData() : (window.currentCaseData || {});

  const conf = window.computeConfidence ? window.computeConfidence(data) : { score: 0, checks: [] };
  const res = window.validateCaseData ? window.validateCaseData(data) : { errors: [], warnings: [] };

  if (scoreEl) {
    scoreEl.textContent = conf.score + '%';
    scoreEl.style.color = conf.score >= 80 ? '#34C759' : conf.score >= 50 ? '#D97706' : '#DC2626';
  }

  if (checklistEl) {
    const total = conf.checks.length;
    const ok = conf.checks.filter(c => c.ok).length;
    let html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
      '<strong style="font-size:13px;">Completeness Checklist</strong>' +
      '<span style="font-size:12px; font-weight:700; color:#0F172A;">' + ok + '/' + total + '</span></div>';
    html += conf.checks.map(c =>
      '<div style="display:flex; gap:8px; align-items:flex-start; padding:4px 0; font-size:13px;">' +
      '<span style="color:' + (c.ok ? '#34C759' : '#DC2626') + ';">' + (c.ok ? '✔' : '✘') + '</span>' +
      '<span style="' + (c.ok ? '' : 'color:#DC2626; font-weight:600;') + '">' + c.label + '</span></div>'
    ).join('');
    if (res.errors.length) {
      html += '<div style="border-top:1px solid #FDE68A; margin-top:8px; padding-top:8px;">' +
        '<strong style="font-size:12px; color:#92400E;">Blocking Errors</strong>' +
        res.errors.map(e => '<div style="display:flex; gap:8px; padding:4px 0; color:#B45309; font-size:12.5px;"><span>⚠️</span><span>Step ' + e.step + ': ' + e.message + '</span></div>').join('') +
        '</div>';
    }
    checklistEl.innerHTML = html;
  }

  if (container) {
    const esc = (s) => String(s == null ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows = [
      ['નામ (Name)', data.fullName],
      ['જન્મ તારીખ (DOB)', data.dob],
      ['જોડાણ તારીખ (DOJ)', data.doj],
      ['નિવૃત્તિ તારીખ (DOR)', data.dor],
      ['હોદ્દો (Designation)', data.designation || data.designationEn],
      ['પેન્શન પ્રકાર (Type)', PENSION_TYPE_LABELS[data.pensionType] || data.pensionType || ''],
      ['છેલ્લો પગાર (Last Pay)', data.lastPay ? '₹' + Number(data.lastPay).toLocaleString('en-IN') : ''],
      ['કમ્યુટેશન (Comm %)', data.commPct != null && data.commPct !== '' ? data.commPct + '%' : ''],
      ['GPF', data.gpf],
      ['તિજોરી (Treasury)', data.treasury],
      ['કચેરી (Office)', data.officeAddress || data.officeAddressEn],
      ['વારસદાર (Heir)', data.heirFirstNameGuj || data.heirFirstName]
    ];
    container.innerHTML = '<table style="width:100%; border-collapse:collapse; font-size:13px;">' +
      rows.map(r => '<tr style="border-bottom:1px solid #E2E8F0;">' +
        '<td style="padding:7px 10px; color:#475569; font-weight:600; width:42%;">' + r[0] + '</td>' +
        '<td style="padding:7px 10px; font-weight:700; color:#0F172A;">' + (r[1] != null && r[1] !== '' ? esc(r[1]) : '—') + '</td>' +
        '</tr>').join('') + '</table>';
  }
};

// ------------------------------------------------------------
// STEP VALIDATION UI HELPERS
// ------------------------------------------------------------
window.clearFieldErrors = function() {
  document.querySelectorAll('.input-err').forEach(el => el.classList.remove('input-err'));
  document.querySelectorAll('.step-error-banner').forEach(el => el.remove());
  ['smartAlert_dates', 'smartAlert_pay', 'smartAlert_family'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
};

window.showStepErrors = function(stepNumber, errors) {
  window.clearFieldErrors();
  const tabs = ['sec-basic', 'sec-office', 'sec-dates', 'sec-pay', 'sec-family', 'sec-review'];
  const section = document.getElementById(tabs[stepNumber - 1]);
  if (!section || !errors || !errors.length) return;

  errors.forEach(e => {
    if (!e.field) return;
    if (e.field === 'pay') {
      section.querySelectorAll('.p-count').forEach(el => el.classList.add('input-err'));
    } else {
      const el = document.getElementById(e.field);
      if (el) el.classList.add('input-err');
    }
  });

  let banner = section.querySelector('.step-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'step-error-banner';
    section.insertBefore(banner, section.firstChild);
  }
  banner.innerHTML = '<span style="font-size:16px; flex-shrink:0;">🚫</span><div>' +
    errors.map(e => '<div>• Step ' + e.step + ': ' + String(e.message).replace(/</g, '&lt;') + '</div>').join('') +
    '</div>';
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// ------------------------------------------------------------
// PRINT GATING
// ------------------------------------------------------------
window.goToPrint = async function() {
  const data = window.collectFormData();
  const res = window.validateCaseData(data);
  if (res.errors.length > 0) {
    window.openStep(6);
    if (typeof window.renderReviewTab === 'function') window.renderReviewTab();
    window.showStepErrors(6, res.errors);
    return false;
  }
  if (typeof window.saveOrUpdateCase !== 'function') return false;
  const saved = await window.saveOrUpdateCase();
  if (saved) {
    if (typeof window.switchView === 'function') window.switchView('print-centre');
    return true;
  }
  return false;
};

// ------------------------------------------------------------
// UNSAVED-CHANGE TRACKING
// ------------------------------------------------------------
window.markFormDirty = function() {
  window._formDirty = true;
  const dot = document.getElementById('headDirtyDot');
  if (dot) dot.style.display = 'inline-flex';
};

window.clearFormDirty = function() {
  window._formDirty = false;
  const dot = document.getElementById('headDirtyDot');
  if (dot) dot.style.display = 'none';
};

window.confirmClearCase = function() {
  if (window._formDirty && !confirm('This will clear all entered data for this case. Continue?')) return;
  if (typeof window.startNewCase === 'function') window.startNewCase();
};

window.addEventListener('beforeunload', function(e) {
  if (window._formDirty && !window._savingCase) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ------------------------------------------------------------
// DYNAMIC ROWS: PAY PERIODS & FAMILY MEMBERS
// ------------------------------------------------------------
window.checkPayRows = function() {
    let tbody = document.getElementById('payPeriodsBody');
    let btn = document.getElementById('btnAddPay');
    if (tbody && btn) btn.style.display = (tbody.querySelectorAll('tr').length >= 2) ? 'none' : 'inline-block';
};

window.addPayRow = function(m) {
    m = m || { basic: '', npa: 0, da: 0, count: '' };
    let tbody = document.getElementById('payPeriodsBody');
    if (!tbody) return;
    let rows = tbody.querySelectorAll('tr');
    if (rows.length >= 2 && !m.isInit) return; 

    let tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" inputmode="decimal" class="p-basic" value="${escAttr(m.basic)}" placeholder="Basic Pay"></td>
                    <td><input type="text" inputmode="decimal" class="p-npa" value="${escAttr(m.npa)}"></td>
                    <td><input type="text" inputmode="decimal" class="p-da" value="${escAttr(m.da)}"></td>
                    <td><input type="number" class="p-count" value="${escAttr(m.count)}" placeholder="Months (e.g. 10)"></td>
                    <td><button type="button" class="btn btn-danger" style="padding:4px 8px; border-radius:6px;" onclick="this.closest('tr').remove(); window.checkPayRows(); window.emitLive();">×</button></td>`;
    
    tbody.appendChild(tr);
    tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', window.emitLive);
        inp.addEventListener('change', window.emitLive);
        if (inp.classList.contains('p-basic') || inp.classList.contains('p-npa') || inp.classList.contains('p-da')) {
            inp.addEventListener('change', function() { window.formatNumInput(inp); window.emitLive(); });
            inp.addEventListener('blur', function() { window.formatNumInput(inp); });
        }
    });
    window.checkPayRows();
    if (!m.isInit) window.emitLive();
};

function handleFamilyGridKeydown(e) {
    if (e.key === 'Enter' && e.target.parentElement.cellIndex === 4) {
        window.addFamilyRow();
        let rows = $('familyBody').querySelectorAll('tr');
        rows[rows.length - 1].querySelector('input').focus();
    }
}

function escAttr(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addFamilyRow = function(m) {
    m = m || {};
    let tbody = $('familyBody');
    if (!tbody) return;
    let n = tbody.querySelectorAll('tr').length + 1;
    let tr = document.createElement('tr');
    tr.innerHTML = `<td>${n}</td>
                    <td><input type="text" value="${escAttr(m.name)}"></td>
                    <td><input type="date" value="${escAttr(m.dob)}"></td>
                    <td><input type="text" value="${escAttr(m.relation)}"></td>
                    <td><input type="text" value="${escAttr(m.marital)}"></td>
                    <td><button type="button" class="btn btn-danger" style="padding:4px 8px; border-radius:6px;" onclick="this.closest('tr').remove(); window.renumberFamily(); window.emitLive();">×</button></td>`;
    tbody.appendChild(tr);
    tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', window.emitLive);
        inp.addEventListener('change', window.emitLive);
        inp.addEventListener('keydown', handleFamilyGridKeydown);
    });
};

window.renumberFamily = function() {
    document.querySelectorAll('#familyBody tr').forEach((tr, i) => { tr.cells[0].textContent = i + 1; });
};

// ------------------------------------------------------------
// DATA COLLECTION & REAL-TIME EMISSION
// ------------------------------------------------------------
window.collectFamily = function() {
    let list = [];
    document.querySelectorAll('#familyBody tr').forEach(tr => {
        let i = tr.querySelectorAll('input');
        if (i.length < 4) return;
        let n = (i[0].value || '').trim(), d = (i[1].value || '').trim(), r = (i[2].value || '').trim(), m = (i[3].value || '').trim();
        if (n || r) list.push({ name: n, dob: d, relation: r, marital: m });
    });
    return list;
};

window.collectFormData = function() {
    let payRows = document.querySelectorAll('#payPeriodsBody tr');
    let pay1 = { basic: 0, npa: 0, da: 0, count: 0 };
    let pay2 = { basic: 0, npa: 0, da: 0, count: 0 };
    
    const readNum = (el) => {
        if (!el) return 0;
        return String(el.value || '').replace(/[, ]/g, '');
    };

    if (payRows.length === 1) {
        let i = payRows[0].querySelectorAll('input');
        const basic = readNum(i[0]), npa = readNum(i[1]), da = readNum(i[2]), count = parseInt(i[3].value) || 10;
        pay1 = { basic, npa, da, count };
        pay2 = { basic, npa, da, count: 0 };
    } else if (payRows.length >= 2) {
        let i1 = payRows[0].querySelectorAll('input');
        pay1 = { basic: readNum(i1[0]), npa: readNum(i1[1]), da: readNum(i1[2]), count: parseInt(i1[3].value) || 0 };
        let i2 = payRows[1].querySelectorAll('input');
        pay2 = { basic: readNum(i2[0]), npa: readNum(i2[1]), da: readNum(i2[2]), count: parseInt(i2[3].value) || 0 };
    }

    return {
        gender: val('f_gender') || 'Male',
        recoveryType: val('f_recoveryType') || 'નીલ',
        fullName: (val('f_surnameGuj') + ' ' + val('f_firstNameGuj') + ' ' + val('f_fatherNameGuj')).trim(),
        surnameGuj: val('f_surnameGuj'), firstNameGuj: val('f_firstNameGuj'), fatherNameGuj: val('f_fatherNameGuj'),
        surname: val('f_surname').toUpperCase(), firstName: val('f_firstName').toUpperCase(), fatherName: val('f_fatherName').toUpperCase(),
        dob: val('f_dob'), doj: val('f_doj'), dor: val('f_dor'),
        dedY: val('f_dedY'), dedM: val('f_dedM'), dedD: val('f_dedD'),
        pay1Basic: pay1.basic, pay1Da: pay1.da, pay1Npa: pay1.npa, pay1Count: pay1.count,
        pay2Basic: pay2.basic, pay2Da: pay2.da, pay2Npa: pay2.npa, pay2Count: pay2.count,
        lastPay: pay2.basic,
        notional20: val('f_notional20'), notional25: val('f_notional25'),
        designation: val('f_designation'), designationEn: val('f_designationEn').toUpperCase(),
        toAddress: val('f_toAddress'),
        headOfOfficeName: val('f_headOfOfficeName'), headOfOfficeDesignation: val('f_headOfOfficeDesignation'),
        officeAddress: val('f_officeAddress'), officeAddressEn: val('f_officeAddressEn').toUpperCase(),
        headOffice: val('f_headOffice'), headOfficeCode: val('f_headOfficeCode'),
        department: val('f_department'), deptCode: val('f_deptCode'),
        address: val('f_address'), gpf: val('f_gpf').toUpperCase(),
        treasury: val('f_treasury'), district: val('f_district'), taluka: val('f_taluka'),
        status: val('f_status') || 'Draft', pensionType: val('f_pensionType'), empCategory: val('f_empCategory'),
        commPct: val('f_commPct') !== '' ? val('f_commPct') : 40, commDate: val('f_commDate'), 
        phone: val('f_phone'), pinCode: val('f_pinCode'), email: val('f_email'),
        officePin: val('f_officePin'), officePhone: val('f_officePhone'), officeEmail: val('f_officeEmail'),
        height: val('f_height'), idMark: val('f_idMark'),
        heirSurnameGuj: val('f_heirSurnameGuj'), heirFirstNameGuj: val('f_heirFirstNameGuj'), heirFatherNameGuj: val('f_heirFatherNameGuj'),
        heirSurname: val('f_heirSurname').toUpperCase(), heirFirstName: val('f_heirFirstName').toUpperCase(), heirFatherName: val('f_heirFatherName').toUpperCase(),
        place: val('f_place'), formDate: val('f_formDate'),
        caseNotes: val('f_caseNotes'),
        family: window.collectFamily()
    };
};

window.emitLive = function() {
    validateSectionLogic();
    let d = window.collectFormData();
    
    let live = Object.assign({}, d, {
        Gender: d.gender, RecoveryType: d.recoveryType, FullName: d.fullName,
        Surname: d.surname, FirstName: d.firstName, FatherName: d.fatherName,
        DOB: d.dob, DOJ: d.doj, DOR: d.dor, Designation: d.designation, DesignationEn: d.designationEn,
        ToAddress: d.toAddress, HeadOfOfficeName: d.headOfOfficeName, HeadOfOfficeDesignation: d.headOfOfficeDesignation,
        OfficeAddress: d.officeAddress, LastPay: d.lastPay, NPA: d.pay2Npa, DARate: d.pay2Da,
        CorrespondenceAddress: d.address, GPF: d.gpf, Treasury: d.treasury, District: d.district, Taluka: d.taluka,
        Status: d.status, PensionType: d.pensionType, EmpCategory: d.empCategory,
        CommPct: d.commPct, Phone: d.phone, PinCode: d.pinCode, Email: d.email, 
        OfficePin: d.officePin, OfficePhone: d.officePhone, Height: d.height, IdMark: d.idMark, 
        HeirSurname: d.heirSurname, HeirFirstName: d.heirFirstName, HeirFatherName: d.heirFatherName,
        Place: d.place, FormDate: d.formDate, family: d.family
    });
    
    window.currentCaseData = live;

    if (typeof window.handleLiveFormChange === 'function') window.handleLiveFormChange(live);

    const part2Tab = document.getElementById('print-part2');
    if (part2Tab && part2Tab.style.display !== 'none' && typeof window.renderPart2 === 'function') {
        window.renderPart2();
    }
};

window.bindLive = function() {
    let form = $('pensionForm');
    if (!form) return;
    form.querySelectorAll('input,select,textarea').forEach(el => {
        el.addEventListener('input', () => { window.markFormDirty(); window.emitLive(); });
        el.addEventListener('change', () => { window.markFormDirty(); window.emitLive(); });
    });
    let dobEl = $('f_dob');
    if (dobEl) dobEl.addEventListener('change', window.autoCalculateDOR);
    window.clearFormDirty();
};

window.setStatus = function(id, msg, isErr) {
    let el = $(id);
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'form-status' + (isErr ? ' err' : '');
};

// Initialize form bindings on startup
setTimeout(() => {
    if (window.bindLive) window.bindLive();
    if ($('familyBody') && !$('familyBody').children.length) { window.addFamilyRow(); window.addFamilyRow(); }
    if ($('payPeriodsBody') && !$('payPeriodsBody').children.length) { window.addPayRow({ basic: '', npa: 0, da: 0, count: 10, isInit: true }); }
    if (window.emitLive) window.emitLive();
}, 500);