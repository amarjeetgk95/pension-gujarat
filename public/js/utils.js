// ============================================================
// SHARED UTILITIES MODULE
// Consolidates helpers used across firebase-auth.js, form-logic.js, app.js
// ============================================================

// --- DOM Helpers ---
window.$ = function(id) { return document.getElementById(id); };
window.val = function(id) { var el = window.$(id); return el ? (el.value || '').trim() : ''; };
window.setVal = function(id, v) { var el = window.$(id); if (el) el.value = (v == null || v === undefined) ? '' : v; };

// --- XSS Sanitization ---
window.sanitize = function(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Creates a safe text node inside a container (no HTML parsing)
window.safeText = function(parentEl, text) {
  if (!parentEl) return;
  parentEl.textContent = (text == null) ? '' : String(text);
};

// --- Date Helpers ---
window.fDate = function(dStr) {
  if (!dStr) return '<span style="color:var(--mod-danger)">⚠ Missing</span>';
  var parts = dStr.split('-');
  if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
  return dStr;
};

window.fDateOpt = function(dStr) {
  if (!dStr) return '-';
  var parts = dStr.split('-');
  if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
  return dStr;
};

// --- Gujarati Number Helpers ---
window.toGuj = function(str) {
  if (!str && str !== 0) return '';
  var map = { '0':'૦', '1':'૧', '2':'૨', '3':'૩', '4':'૪', '5':'૫', '6':'૬', '7':'૭', '8':'૮', '9':'૯' };
  return String(str).replace(/[0-9]/g, function(m) { return map[m]; });
};

window.parseGuj = function(str) {
  if (!str) return 0;
  var map = {'૦':'0','૧':'1','૨':'2','૩':'3','૪':'4','૫':'5','૬':'6','૭':'7','૮':'8','૯':'9'};
  var engStr = String(str).replace(/[૦-૯]/g, function(m){ return map[m]; });
  var val = parseFloat(engStr.replace(/[^0-9.-]/g, ''));
  return isNaN(val) ? 0 : val;
};

// Converts Gujarati numerals (૦-૯) to English digits (0-9), leaving other chars intact
window.gujToEnDigits = function(str) {
  if (str == null) return '';
  var map = {'૦':'0','૧':'1','૨':'2','૩':'3','૪':'4','૫':'5','૬':'6','૭':'7','૮':'8','૯':'9'};
  return String(str).replace(/[૦-૯]/g, function(m) { return map[m]; });
};

// --- Format Helpers ---
window.formatDateForBox = function(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.indexOf('-') !== -1) {
    var p = dateStr.split('T')[0].split('-');
    if (p.length === 3 && p[0].length === 4) return p[2] + p[1] + p[0];
  }
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + d.getFullYear();
};

window.formatDateStandard = function(dateStr) {
  if(!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.indexOf('-') !== -1) {
    var p = dateStr.split('T')[0].split('-');
    if(p.length === 3 && p[0].length === 4) return p[2] + '-' + p[1] + '-' + p[0];
  }
  var d = new Date(dateStr);
  if(isNaN(d)) return '';
  return ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear();
};

// --- Print Box Helpers ---
window.createDateBoxesHTML = function(str) {
  str = String(str || '').replace(/[^0-9૦-૯]/g, '');
  var html = '<div class="box-container" style="gap:2px;">';
  for (var i = 0; i < 8; i++) { html += '<span class="digit-box" contenteditable="true">' + toGuj(str[i]||'') + '</span>'; }
  html += '</div>';
  return html;
};

window.createPinBoxesHTML = function(str) {
  str = String(str || '').replace(/[^0-9૦-૯]/g, '');
  var html = '<div class="box-container" style="gap:2px;">';
  for (var i = 0; i < 6; i++) { html += '<span class="digit-box" contenteditable="true">' + toGuj(str[i]||'') + '</span>'; }
  html += '</div>';
  return html;
};

window.createPhoneBoxesHTML = function(str) {
  str = String(str || '').replace(/[^0-9૦-૯+]/g, '');
  var len = Math.max(11, str.length);
  if (len > 13) len = 13;
  var html = '<div class="box-container" style="gap:2px;">';
  for (var i = 0; i < len; i++) { html += '<span class="digit-box" contenteditable="true">' + toGuj(str[i]||'') + '</span>'; }
  html += '</div>';
  return html;
};

window.createCharBoxes = function(str, length) {
  str = String(str || '').toUpperCase().replace(/[^A-Z0-9૦-૯]/gi, '');
  var html = '<div class="box-container" style="gap:2px; flex-wrap:wrap;">';
  for (var i = 0; i < length; i++) { html += '<span class="digit-box" contenteditable="true">' + (str[i]||'') + '</span>'; }
  html += '</div>';
  return html;
};

// --- Print Helper Functions ---
window.setCheck = function(id, isChecked) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = isChecked ? '✔' : '&nbsp;';
};

window.setText = function(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = toGuj(value || '');
};
