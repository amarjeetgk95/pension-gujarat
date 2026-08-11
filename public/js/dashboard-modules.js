// ============================================================
// DASHBOARD ANALYTICS, SEARCH, DIRECTORY & NOTIFICATIONS
// Modules #2, #4, #6, #7
// ============================================================

function _esc(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  var today = new Date();
  today.setHours(0,0,0,0);
  return Math.ceil((d - today) / (1000*60*60*24));
}
window._daysUntil = _daysUntil;

// ============================================================
// MODULE 2: DASHBOARD ANALYTICS
// ============================================================

var STATUS_COLORS = {
  'draft': '#D97706',
  'pending': '#007AFF',
  'sent for sanction': '#7C3AED',
  'approved': '#0EA5E9',
  'completed': '#34C759',
  'rejected': '#DC2626'
};

var STATUS_LABELS = {
  'draft': 'Draft',
  'pending': 'Pending',
  'sent for sanction': 'Sent for Sanction',
  'approved': 'Approved',
  'completed': 'Completed',
  'rejected': 'Rejected'
};

function _normalizeStatus(s) {
  var st = String(s == null ? '' : s).toLowerCase().trim();
  if (st === 'sent_for_sanction' || st === 'sent-for-sanction' || st === 'pending for sanction') st = 'sent for sanction';
  return (st && STATUS_COLORS[st]) ? st : 'draft';
}

window.renderGreeting = function() {
  var profile = window.currentUserProfile || {};
  var role = String(profile.role || '').toLowerCase();
  var isAdmin = (role === 'admin' || role === 'super_admin');

  var hour = new Date().getHours();
  var part = hour < 12 ? 'Good morning' : (hour < 17 ? 'Good afternoon' : 'Good evening');

  var nameEl = document.getElementById('greetName');
  var officeEl = document.getElementById('greetOffice');
  var dateEl = document.getElementById('greetDate');

  if (nameEl) {
    var who = 'Officer';
    if (profile.email) {
      who = profile.email.split('@')[0].replace(/[._\-]+/g, ' ');
      who = who.replace(/\b\w/g, function(ch) { return ch.toUpperCase(); });
    }
    nameEl.textContent = part + ', ' + who;
  }
  if (officeEl) {
    if (isAdmin) {
      officeEl.textContent = 'Administrator · All Offices';
    } else {
      var friendly = (window.officeProfilesData && window.officeProfilesData.profileName) || profile.officeId || 'main_headquarters';
      officeEl.textContent = 'Office: ' + friendly;
    }
  }
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
};

function _renderStatusDonut(cases) {
  var svg = document.getElementById('statusDonutSvg');
  var legend = document.getElementById('statusDonutLegend');
  var center = document.getElementById('donutCenterValue');
  if (!svg || !legend) return;

  svg.querySelectorAll('circle.donut-seg').forEach(function(c) { c.remove(); });

  var counts = {};
  cases.forEach(function(c) { var st = _normalizeStatus(c.status); counts[st] = (counts[st] || 0) + 1; });
  var total = cases.length;

  var doneCount = (counts['completed'] || 0) + (counts['approved'] || 0);
  if (center) center.textContent = total ? Math.round((doneCount / total) * 100) + '%' : '0%';

  if (!total) {
    legend.innerHTML = '<li class="legend-item"><span class="legend-name">No data yet</span></li>';
    return;
  }

  var order = ['completed', 'approved', 'sent for sanction', 'pending', 'draft', 'rejected'];
  var C = 2 * Math.PI * 15.9;
  var offset = 0;
  var ns = 'http://www.w3.org/2000/svg';

  order.forEach(function(key) {
    var n = counts[key] || 0;
    if (!n) return;
    var len = (n / total) * C;
    var circ = document.createElementNS(ns, 'circle');
    circ.setAttribute('class', 'donut-seg');
    circ.setAttribute('cx', '21'); circ.setAttribute('cy', '21'); circ.setAttribute('r', '15.9');
    circ.setAttribute('fill', 'none');
    circ.setAttribute('stroke', STATUS_COLORS[key]);
    circ.setAttribute('stroke-width', '4.5');
    circ.setAttribute('stroke-linecap', 'round');
    circ.setAttribute('stroke-dasharray', len + ' ' + (C - len));
    circ.setAttribute('stroke-dashoffset', -offset);
    circ.setAttribute('transform', 'rotate(-90 21 21)');
    svg.appendChild(circ);
    offset += len;
  });

  legend.innerHTML = '';
  order.forEach(function(key) {
    var n = counts[key] || 0;
    if (!n) return;
    var li = document.createElement('li');
    li.className = 'legend-item';
    var dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = STATUS_COLORS[key];
    var name = document.createElement('span');
    name.className = 'legend-name';
    name.textContent = STATUS_LABELS[key];
    var val = document.createElement('span');
    val.className = 'legend-val';
    val.textContent = n + ' · ' + Math.round((n / total) * 100) + '%';
    li.appendChild(dot); li.appendChild(name); li.appendChild(val);
    legend.appendChild(li);
  });
}

function _renderRetiringSegments(cases) {
  var c30 = 0, c60 = 0, c90 = 0;
  cases.forEach(function(c) {
    var d = _daysUntil(c.dor);
    if (d > 0) {
      if (d <= 30) c30++;
      if (d <= 60) c60++;
      if (d <= 90) c90++;
    }
  });
  var set = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
  set('retiring30', c30);
  set('retiring60', c60);
  set('retiring90', c90);
}

function _renderNeedsAction(cases) {
  var stale = 0, incomplete = 0, retiring = 0;
  var nowSec = Date.now() / 1000;
  cases.forEach(function(c) {
    var st = (c.status || '').toLowerCase();
    if (st === 'draft') {
      var ts = (c.updatedAt && c.updatedAt.seconds) || (c.createdAt && c.createdAt.seconds);
      if (ts && (nowSec - ts) / 86400 > 7) stale++;
    }
    if (!c.fullName || !c.dor || !c.designation || !c.doj || !c.lastPay) incomplete++;
    var d = _daysUntil(c.dor);
    if (d > 0 && d <= 30) retiring++;
  });

  var staleEl = document.getElementById('needsStaleNum');
  var incompEl = document.getElementById('needsIncompleteNum');
  var retEl = document.getElementById('needsRetiringNum');
  if (staleEl)  { staleEl.textContent = stale;  staleEl.className  = 'needs-num ' + (stale > 0 ? 'is-warn' : 'is-ok'); }
  if (incompEl) { incompEl.textContent = incomplete; incompEl.className = 'needs-num ' + (incomplete > 0 ? 'is-danger' : 'is-ok'); }
  if (retEl)    { retEl.textContent = retiring; retEl.className = 'needs-num ' + (retiring > 0 ? 'is-danger' : 'is-ok'); }

  ['needsStaleTile', 'needsIncompleteTile', 'needsRetiringTile'].forEach(function(id) {
    var tile = document.getElementById(id);
    if (!tile) return;
    tile.onclick = function() {
      var f = tile.getAttribute('data-filter');
      if (typeof window.setFilter === 'function') {
        var pill = document.querySelector('.dash-filter-pill[data-filter="' + f + '"]');
        window.setFilter(pill, f);
      }
    };
  });
}

window.renderDashboardAnalytics = function() {
  var cases = window.allFetchedCases || [];
  if (typeof window.renderGreeting === 'function') window.renderGreeting();
  if (cases.length) _populateOfficeFilters(cases);
};

function _renderUpcomingRetirements(cases) {
  var el = document.getElementById('upcomingRetirementsList');
  var badge = document.getElementById('upcomingCount');
  if (!el) return;
  var upcoming = cases
    .map(function(c) { var copy = Object.assign({}, c); copy._daysLeft = _daysUntil(c.dor); return copy; })
    .filter(function(c) { return c._daysLeft > 0 && c._daysLeft <= 180; })
    .sort(function(a,b) { return a._daysLeft - b._daysLeft; });
  if (badge) badge.textContent = upcoming.length;
  if (!upcoming.length) {
    el.innerHTML = '<div class="dash-analytics-empty">No retirements in the next 6 months</div>';
    return;
  }
  el.innerHTML = '';
  upcoming.slice(0, 10).forEach(function(c) {
    var icon = c._daysLeft <= 30 ? '\uD83D\uDD34' : c._daysLeft <= 90 ? '\uD83D\uDFE1' : '\uD83D\uDFE2';
    var item = document.createElement('div');
    item.className = 'dash-analytics-item';
    item.innerHTML = '<div class="dash-analytics-item-left">' +
      '<span class="dash-analytics-item-name">' + _esc(c.fullName || 'Unknown') + '</span>' +
      '<span class="dash-analytics-item-sub">' + _esc(c.designation || '') + ' &middot; ' + _esc(c.officeId || '') + '</span>' +
      '</div><span class="dash-analytics-item-right">' + icon + ' ' + c._daysLeft + 'd</span>';
    el.appendChild(item);
  });
}

function _renderOfficeBreakdown(cases) {
  var card = document.getElementById('officeBreakdownCard');
  var el = document.getElementById('officeBreakdownList');
  var userRole = String(window.currentUserProfile && window.currentUserProfile.role || '').toLowerCase();
  if (!card || !el) return;
  if (userRole !== 'admin' && userRole !== 'super_admin') { card.style.display = 'none'; return; }
  card.style.display = '';
  var officeMap = {};
  cases.forEach(function(c) {
    var off = c.officeId || 'Unknown';
    officeMap[off] = (officeMap[off] || 0) + 1;
  });
  var sorted = Object.entries(officeMap).sort(function(a,b) { return b[1] - a[1]; });
  var maxCount = sorted.length ? sorted[0][1] : 1;
  el.innerHTML = '';
  sorted.forEach(function(entry) {
    var name = entry[0], count = entry[1];
    var bar = document.createElement('div');
    bar.className = 'dash-office-bar';
    var pct = Math.round((count / maxCount) * 100);
    bar.innerHTML = '<span class="dash-office-bar-name">' + _esc(name) + '</span>' +
      '<div class="dash-office-bar-track"><div class="dash-office-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="dash-office-bar-count">' + count + '</span>';
    el.appendChild(bar);
  });
}

function _renderPayoutEstimates(cases) {
  var el = document.getElementById('payoutEstimatesList');
  if (!el) return;
  var totalGratuity = 0, totalPension = 0, caseCount = 0;
  cases.forEach(function(c) {
    var pay = parseFloat(c.lastPay || c.pay2Basic || c.pay1Basic || 0);
    if (!pay || !c.dor) return;
    caseCount++;
    var years = 33;
    if (c.doj && c.dor) {
      var days = (new Date(c.dor) - new Date(c.doj)) / (1000*60*60*24);
      years = Math.min(33, Math.floor(days / 365.25));
    }
    totalGratuity += Math.min(2500000, pay * years * 0.5);
    totalPension += Math.round(pay * 0.5);
  });
  el.innerHTML =
    '<div class="dash-analytics-item"><span class="dash-analytics-item-left"><span class="dash-analytics-item-name">Cases with Estimates</span></span><span class="dash-analytics-item-right">' + caseCount + '</span></div>' +
    '<div class="dash-analytics-item"><span class="dash-analytics-item-left"><span class="dash-analytics-item-name">Total Est. Gratuity</span></span><span class="dash-analytics-item-right" style="color:#34C759;">\u20B9' + (totalGratuity / 100000).toFixed(1) + 'L</span></div>' +
    '<div class="dash-analytics-item"><span class="dash-analytics-item-left"><span class="dash-analytics-item-name">Total Est. Monthly Pension</span></span><span class="dash-analytics-item-right" style="color:#007AFF;">\u20B9' + Math.round(totalPension).toLocaleString('en-IN') + '/mo</span></div>' +
    '<div class="dash-analytics-item"><span class="dash-analytics-item-left"><span class="dash-analytics-item-name">Avg. Monthly Pension</span></span><span class="dash-analytics-item-right">' + (caseCount ? '\u20B9' + Math.round(totalPension / caseCount).toLocaleString('en-IN') : '\u2014') + '</span></div>';
}

function _renderRecentActivity(cases) {
  var el = document.getElementById('recentActivityList');
  if (!el) return;
  var sorted = cases
    .filter(function(c) { return c.updatedAt || c.createdAt; })
    .sort(function(a, b) {
      var ta = (a.updatedAt && a.updatedAt.seconds) || (a.createdAt && a.createdAt.seconds) || 0;
      var tb = (b.updatedAt && b.updatedAt.seconds) || (b.createdAt && b.createdAt.seconds) || 0;
      return tb - ta;
    })
    .slice(0, 8);
  if (!sorted.length) { el.innerHTML = '<div class="dash-analytics-empty">No activity yet</div>'; return; }
  el.innerHTML = '';
  sorted.forEach(function(c) {
    var ts = (c.updatedAt && c.updatedAt.seconds) || (c.createdAt && c.createdAt.seconds);
    var timeStr = ts ? new Date(ts * 1000).toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) : '\u2014';
    var item = document.createElement('div');
    item.className = 'dash-analytics-item';
    var sc = (c.status || '').toLowerCase() === 'completed' ? '#34C759' : '#D97706';
    item.innerHTML = '<div class="dash-analytics-item-left"><span class="dash-analytics-item-name">' + _esc(c.fullName || 'Unknown') + '</span><span class="dash-analytics-item-sub">' + _esc(c.caseId || '') + '</span></div><span class="dash-analytics-item-right" style="color:' + sc + '; font-size:11px;">' + timeStr + '</span>';
    el.appendChild(item);
  });
}

function _populateOfficeFilters(cases) {
  var offices = [];
  var seen = {};
  cases.forEach(function(c) {
    if (c.officeId && !seen[c.officeId]) { seen[c.officeId] = true; offices.push(c.officeId); }
  });
  offices.sort();

  ['filterOffice', 'dirOfficeFilter'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">All Offices</option>';
    offices.forEach(function(o) {
      var opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      if (o === current) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

// Search & filter functions are defined in firebase-auth.js (enhanced version)
// toggleAdvancedFilters and clearAdvancedFilters are called from HTML onclick

// ============================================================
// MODULE 6: PENSIONER DIRECTORY
// ============================================================

window.renderDirectory = function() {
  var tbody = document.getElementById('directoryTableBody');
  if (!tbody) return;
  var cases = window.allFetchedCases || [];
  var userRole = String(window.currentUserProfile && window.currentUserProfile.role || '').toLowerCase();
  var isAdmin = (userRole === 'admin' || userRole === 'super_admin');
  if (!isAdmin) {
    var userOffice = window.currentUserProfile && window.currentUserProfile.officeId;
    cases = cases.filter(function(c) { return c.officeId === userOffice; });
  }
  window._directoryData = cases;
  _renderDirectoryRows(cases);
};

function _renderDirectoryRows(cases) {
  var tbody = document.getElementById('directoryTableBody');
  if (!tbody) return;
  if (!cases.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="dash-empty-state"><div class="empty-icon">\uD83D\uDCD2</div><h3>No pensioners found</h3><p>Directory populates from saved cases.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = '';
  cases.forEach(function(c) {
    var tr = document.createElement('tr');
    var td1 = document.createElement('td');
    td1.textContent = c.fullName || '\u2014';
    td1.style.fontWeight = '600';
    tr.appendChild(td1);

    var td2 = document.createElement('td');
    td2.textContent = c.designation || '\u2014';
    tr.appendChild(td2);

    var td3 = document.createElement('td');
    var sp = document.createElement('span');
    sp.style.cssText = 'background:#E9F9EF; color:#2AAE48; border:1px solid #B8E8C8; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:600;';
    sp.textContent = c.officeId || '\u2014';
    td3.appendChild(sp);
    tr.appendChild(td3);

    var td4 = document.createElement('td');
    td4.textContent = c.phone || c.fatherPhone || '\u2014';
    td4.style.fontFamily = 'monospace';
    tr.appendChild(td4);

    var td5 = document.createElement('td');
    td5.textContent = (typeof formatDateStandard === 'function' ? formatDateStandard(c.dor) : (c.dor || '\u2014'));
    tr.appendChild(td5);

    var td6 = document.createElement('td');
    td6.style.cssText = 'text-align:right; white-space:nowrap;';
    var btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.style.cssText = 'display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:6px 12px; font-size:13px; font-weight:600; line-height:1; vertical-align:middle;';
    btn.textContent = '\u270F\uFE0F View';
    btn.setAttribute('data-case-id', c.caseId);
    btn.addEventListener('click', function() {
      var cid = this.getAttribute('data-case-id');
      window.loadCaseById(cid).then(function() { window.switchView('entry'); });
    });
    td6.appendChild(btn);
    tr.appendChild(td6);
    tbody.appendChild(tr);
  });
}

window.filterDirectory = function() {
  var searchEl = document.getElementById('dirSearchInput');
  var officeEl = document.getElementById('dirOfficeFilter');
  var q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  var off = officeEl ? officeEl.value : '';
  var data = window._directoryData || window.allFetchedCases || [];
  if (q) {
    data = data.filter(function(c) {
      return (
        (c.fullName || '').toLowerCase().indexOf(q) !== -1 ||
        (c.phone || '').toLowerCase().indexOf(q) !== -1 ||
        (c.fatherPhone || '').toLowerCase().indexOf(q) !== -1 ||
        (c.officeId || '').toLowerCase().indexOf(q) !== -1 ||
        (c.designation || '').toLowerCase().indexOf(q) !== -1
      );
    });
  }
  if (off) data = data.filter(function(c) { return c.officeId === off; });
  _renderDirectoryRows(data);
};

window.exportDirectoryCSV = function() {
  var cases = window._directoryData || window.allFetchedCases || [];
  if (!cases.length) { alert('No data to export.'); return; }
  var header = 'Name,Designation,Office,Phone,DOR,Case ID\n';
  var rows = cases.map(function(c) {
    return [
      '"' + (c.fullName || '').replace(/"/g,'""') + '"',
      '"' + (c.designation || '').replace(/"/g,'""') + '"',
      '"' + (c.officeId || '').replace(/"/g,'""') + '"',
      '"' + (c.phone || c.fatherPhone || '').replace(/"/g,'""') + '"',
      '"' + (c.dor || '') + '"',
      '"' + (c.caseId || '') + '"'
    ].join(',');
  }).join('\n');
  var blob = new Blob(['\uFEFF' + header + rows], {type: 'text/csv;charset=utf-8;'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pensioner_directory_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
};

// ============================================================
// MODULE 7: NOTIFICATIONS & ALERTS
// ============================================================

window.refreshNotifications = function() {
  var cases = window.allFetchedCases || [];
  _renderStaleCases(cases);
  _renderRetiringSoon(cases);
  _renderIncompleteCases(cases);
  _renderRecentCompleted(cases);
  _updateNotifBadge(cases);
};

function _renderStaleCases(cases) {
  var el = document.getElementById('staleCasesList');
  var badge = document.getElementById('staleCasesCount');
  if (!el) return;
  var stale = cases.filter(function(c) {
    if ((c.status || '').toLowerCase() !== 'draft') return false;
    var ts = (c.updatedAt && c.updatedAt.seconds) || (c.createdAt && c.createdAt.seconds);
    if (!ts) return false;
    var daysSince = (Date.now() / 1000 - ts) / 86400;
    return daysSince > 7;
  }).sort(function(a,b) {
    var ta = (a.updatedAt && a.updatedAt.seconds) || (a.createdAt && a.createdAt.seconds) || 0;
    var tb = (b.updatedAt && b.updatedAt.seconds) || (b.createdAt && b.createdAt.seconds) || 0;
    return ta - tb;
  });
  if (badge) badge.textContent = stale.length;
  if (!stale.length) { el.innerHTML = '<div class="dash-analytics-empty">No stale cases \u2014 great job!</div>'; return; }
  el.innerHTML = '';
  stale.forEach(function(c) {
    var ts = (c.updatedAt && c.updatedAt.seconds) || (c.createdAt && c.createdAt.seconds);
    var daysAgo = Math.floor((Date.now() / 1000 - ts) / 86400);
    var item = document.createElement('div');
    item.className = 'dash-analytics-item';
    item.innerHTML = '<div class="dash-analytics-item-left"><span class="dash-analytics-item-name">' + _esc(c.fullName || 'Unknown') + '</span><span class="dash-analytics-item-sub">' + _esc(c.caseId || '') + ' &middot; ' + _esc(c.officeId || '') + '</span></div><span class="dash-analytics-item-right" style="color:#DC2626;">' + daysAgo + 'd ago</span>';
    el.appendChild(item);
  });
}

function _renderRetiringSoon(cases) {
  var el = document.getElementById('retiringSoonList');
  var badge = document.getElementById('retiringSoonCount');
  if (!el) return;
  var soon = cases.filter(function(c) {
    var d = _daysUntil(c.dor);
    return d > 0 && d <= 30;
  }).sort(function(a,b) { return _daysUntil(a.dor) - _daysUntil(b.dor); });
  if (badge) badge.textContent = soon.length;
  if (!soon.length) { el.innerHTML = '<div class="dash-analytics-empty">No retirements in the next 30 days</div>'; return; }
  el.innerHTML = '';
  soon.forEach(function(c) {
    var d = _daysUntil(c.dor);
    var item = document.createElement('div');
    item.className = 'dash-analytics-item';
    item.innerHTML = '<div class="dash-analytics-item-left"><span class="dash-analytics-item-name">' + _esc(c.fullName || 'Unknown') + '</span><span class="dash-analytics-item-sub">' + _esc(c.designation || '') + ' &middot; ' + _esc(c.officeId || '') + '</span></div><span class="dash-analytics-item-right" style="color:#D97706;">' + d + 'd left</span>';
    el.appendChild(item);
  });
}

function _renderIncompleteCases(cases) {
  var el = document.getElementById('incompleteCasesList');
  var badge = document.getElementById('incompleteCasesCount');
  if (!el) return;
  var incomplete = cases.filter(function(c) {
    return !c.fullName || !c.dor || !c.designation || !c.doj || !c.lastPay;
  });
  if (badge) badge.textContent = incomplete.length;
  if (!incomplete.length) { el.innerHTML = '<div class="dash-analytics-empty">All cases have complete info</div>'; return; }
  el.innerHTML = '';
  incomplete.slice(0, 10).forEach(function(c) {
    var missing = [];
    if (!c.fullName) missing.push('Name');
    if (!c.dor) missing.push('DOR');
    if (!c.designation) missing.push('Desig');
    if (!c.doj) missing.push('DOJ');
    if (!c.lastPay) missing.push('Pay');
    var item = document.createElement('div');
    item.className = 'dash-analytics-item';
    item.innerHTML = '<div class="dash-analytics-item-left"><span class="dash-analytics-item-name">' + _esc(c.fullName || 'Unnamed') + '</span><span class="dash-analytics-item-sub">Missing: ' + _esc(missing.join(', ')) + '</span></div><span class="dash-analytics-item-right" style="color:#D97706;">\u26A0</span>';
    el.appendChild(item);
  });
}

function _renderRecentCompleted(cases) {
  var el = document.getElementById('recentCompletedList');
  var badge = document.getElementById('recentCompletedCount');
  if (!el) return;
  var completed = cases.filter(function(c) { return (c.status || '').toLowerCase() === 'completed'; })
    .sort(function(a,b) {
      var ta = (a.updatedAt && a.updatedAt.seconds) || 0;
      var tb = (b.updatedAt && b.updatedAt.seconds) || 0;
      return tb - ta;
    })
    .slice(0, 8);
  if (badge) badge.textContent = completed.length;
  if (!completed.length) { el.innerHTML = '<div class="dash-analytics-empty">No completed cases yet</div>'; return; }
  el.innerHTML = '';
  completed.forEach(function(c) {
    var ts = c.updatedAt && c.updatedAt.seconds;
    var timeStr = ts ? new Date(ts * 1000).toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) : '\u2014';
    var item = document.createElement('div');
    item.className = 'dash-analytics-item';
    item.innerHTML = '<div class="dash-analytics-item-left"><span class="dash-analytics-item-name">' + _esc(c.fullName || 'Unknown') + '</span><span class="dash-analytics-item-sub">' + _esc(c.caseId || '') + '</span></div><span class="dash-analytics-item-right" style="color:#34C759;">' + timeStr + '</span>';
    el.appendChild(item);
  });
}

function _updateNotifBadge(cases) {
  var count = 0;
  cases.forEach(function(c) {
    if ((c.status || '').toLowerCase() === 'draft') {
      var ts = (c.updatedAt && c.updatedAt.seconds) || (c.createdAt && c.createdAt.seconds);
      if (ts && (Date.now() / 1000 - ts) / 86400 > 7) count++;
    }
    if (_daysUntil(c.dor) > 0 && _daysUntil(c.dor) <= 30) count++;
  });
  var badge = document.getElementById('navNotifBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Analytics & notifications are auto-called from refreshCaseList in firebase-auth.js

// ============================================================
// MODULE 8: ADMIN ANALYTICS & INSIGHTS
// ============================================================
window.renderAdminAnalytics = function() {
  var grid = document.getElementById('adminAnalyticsGrid');
  if (!grid) return;
  var cases = window.allFetchedCases || [];

  var total = cases.length;
  var completed = 0, draft = 0, stale = 0, retiring30 = 0, retiring90 = 0, incomplete = 0;
  var officeMap = {};
  var totalPay = 0, payCount = 0;

  cases.forEach(function(c) {
    var st = (c.status || '').toLowerCase();
    if (st === 'completed' || st === 'approved') completed++;
    else if (st === 'rejected') { /* counted as neither */ }
    else draft++;

    if (st === 'draft') {
      var ts = (c.updatedAt && c.updatedAt.seconds) || (c.createdAt && c.createdAt.seconds);
      if (ts && (Date.now() / 1000 - ts) / 86400 > 7) stale++;
    }

    var days = _daysUntil(c.dor);
    if (days > 0 && days <= 30) retiring30++;
    if (days > 0 && days <= 90) retiring90++;

    if (!c.fullName || !c.dor || !c.designation || !c.doj || !c.lastPay) incomplete++;

    var off = c.officeId || 'Unknown';
    officeMap[off] = (officeMap[off] || 0) + 1;

    var pay = parseFloat(c.lastPay || c.pay2Basic || c.pay1Basic || 0);
    if (pay > 0) { totalPay += pay; payCount++; }
  });

  var completionRate = total ? Math.round((completed / total) * 100) : 0;
  var avgPay = payCount ? Math.round(totalPay / payCount) : 0;
  var officeCount = Object.keys(officeMap).length;

  grid.innerHTML = '';

  // Card 1: Overview
  _addAnalyticsCard(grid, 'Overview', '#0062E3', '#E8F2FF', [
    { label: 'Total Cases', value: total },
    { label: 'Completion Rate', value: completionRate + '%', color: completionRate >= 70 ? '#34C759' : completionRate >= 40 ? '#D97706' : '#DC2626' },
    { label: 'Completed', value: completed, color: '#34C759' },
    { label: 'Draft / In Progress', value: draft, color: '#D97706' },
    { label: 'Active Offices', value: officeCount }
  ]);

  // Card 2: Attention Required
  _addAnalyticsCard(grid, 'Needs Attention', '#DC2626', '#FEF2F2', [
    { label: 'Stale Drafts (>7d)', value: stale, color: stale > 0 ? '#DC2626' : '#34C759' },
    { label: 'Incomplete Cases', value: incomplete, color: incomplete > 0 ? '#D97706' : '#34C759' },
    { label: 'Retiring within 30 days', value: retiring30, color: retiring30 > 0 ? '#DC2626' : '#34C759' },
    { label: 'Retiring within 90 days', value: retiring90, color: retiring90 > 0 ? '#D97706' : '#34C759' }
  ]);

  // Card 3: Financial
  _addAnalyticsCard(grid, 'Financial Estimates', '#34C759', '#E9F9EF', [
    { label: 'Avg. Last Basic Pay', value: avgPay ? '\u20B9' + avgPay.toLocaleString('en-IN') : '\u2014' },
    { label: 'Cases with Pay Data', value: payCount },
    { label: 'Cases without Pay', value: total - payCount, color: (total - payCount) > 0 ? '#D97706' : '#34C759' }
  ]);

  // Card 4: Office Breakdown
  var offCard = document.createElement('div');
  offCard.style.cssText = 'background:#fff; border:1px solid #E2E8F0; border-radius:12px; padding:16px;';
  offCard.innerHTML = '<div style="font-size:13px; font-weight:700; color:#0F172A; margin-bottom:12px;">Cases by Office</div>';
  var sorted = Object.entries(officeMap).sort(function(a,b) { return b[1] - a[1]; });
  var maxOC = sorted.length ? sorted[0][1] : 1;
  sorted.forEach(function(entry) {
    var pct = Math.round((entry[1] / maxOC) * 100);
    var barWrap = document.createElement('div');
    barWrap.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:6px;';
    barWrap.innerHTML = '<span style="font-size:11px; font-weight:600; color:#334155; width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + _esc(entry[0]) + '</span>' +
      '<div style="flex:1; height:6px; background:#F1F5F9; border-radius:3px; overflow:hidden;"><div style="height:100%; width:' + pct + '%; background:linear-gradient(90deg,#007AFF,#5FDC7E); border-radius:3px;"></div></div>' +
      '<span style="font-size:11px; font-weight:800; color:#0F172A; width:24px; text-align:right;">' + entry[1] + '</span>';
    offCard.appendChild(barWrap);
  });
  if (!sorted.length) offCard.innerHTML += '<div style="text-align:center; padding:12px; color:#64748B; font-size:12px;">No data</div>';
  grid.appendChild(offCard);
};

function _addAnalyticsCard(grid, title, borderColor, bgColor, items) {
  var card = document.createElement('div');
  card.style.cssText = 'background:#fff; border:1px solid #E2E8F0; border-top:3px solid ' + borderColor + '; border-radius:12px; padding:16px;';
  var h = document.createElement('div');
  h.style.cssText = 'font-size:13px; font-weight:700; color:#0F172A; margin-bottom:12px;';
  h.textContent = title;
  card.appendChild(h);
  items.forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #F1F5F9;';
    row.innerHTML = '<span style="font-size:12px; color:#64748B;">' + _esc(item.label) + '</span>' +
      '<span style="font-size:13px; font-weight:800; color:' + (item.color || '#0F172A') + ';">' + _esc(String(item.value)) + '</span>';
    card.appendChild(row);
  });
  grid.appendChild(card);
}
