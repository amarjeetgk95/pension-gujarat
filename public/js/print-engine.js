// Native Print UI Popups
function cleanStylesForPrint(htmlStr) {
  return htmlStr
    .replace(/margin-bottom:\s*[^;"]+!important;?/gi, '')
    .replace(/padding:\s*[^;"]+!important;?/gi, '')
    .replace(/padding-bottom:\s*[^;"]+!important;?/gi, '')
    .replace(/line-height:\s*[^;"]+;?/gi, '');
}

function popupNativePrint(viewId) {
  const viewElement = document.getElementById(viewId);
  if (!viewElement) return;

  let styles = '';
  document.querySelectorAll('link[rel="stylesheet"]').forEach(s => { styles += s.outerHTML; });
  document.querySelectorAll('style').forEach(s => { styles += s.outerHTML; });

  let printContent = '';
  const containers = viewElement.querySelectorAll('.page-container');
  containers.forEach(c => {
    const clone = c.cloneNode(true);
    const originalInputs = c.querySelectorAll('input, textarea');
    const clonedInputs = clone.querySelectorAll('input, textarea');
    originalInputs.forEach((input, index) => {
        if(input.tagName === 'TEXTAREA') clonedInputs[index].innerHTML = input.value;
        else clonedInputs[index].setAttribute('value', input.value);
    });
    printContent += clone.outerHTML;
  });
  
  printContent = cleanStylesForPrint(printContent);

  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert("Please allow pop-ups to print."); return; }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <title>Pension Case Print</title>
      ${styles}
      <style>
        @page { size: A4 portrait; margin: 0mm !important; }
        body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; }
        .page-container { height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; border: none !important; box-shadow: none !important; margin: 0 !important; }
        .layout-table { margin-bottom: var(--table-mb, 12px) !important; }
        .layout-table td, .layout-table th, .service-table td, .service-table th { padding: var(--td-pad, 4px) 4px !important; }
        .gujarati-text { margin-bottom: var(--text-mb, 8px) !important; }
      </style>
    </head>
    <body>
      ${printContent}
      <script>
        window.onload = function() {
          const pages = document.querySelectorAll('.page-container');
          pages.forEach(page => {
              let tdPad = 8, textMb = 12, tableMb = 16, stampH = 40;
              const setVars = function() {
                  page.style.setProperty('--td-pad', tdPad + 'px'); 
                  page.style.setProperty('--text-mb', textMb + 'px'); 
                  page.style.setProperty('--table-mb', tableMb + 'px'); 
                  page.style.setProperty('--stamp-h', stampH + 'px');
              };
              setVars();
              let guard = 0;
              while (tdPad > 1 && guard < 50) {
                  const sig = page.querySelector('.signature-block');
                  const over = page.scrollHeight > page.clientHeight + 1;
                  let sigOver = false;
                  if (sig) {
                      const mb = parseFloat(getComputedStyle(sig).marginBottom) || 0;
                      sigOver = (sig.offsetTop + sig.offsetHeight + mb) > page.clientHeight + 1;
                  }
                  if (!over && !sigOver) break;
                  tdPad -= 0.5; textMb -= 1; tableMb -= 1; if(stampH > 15) stampH -= 2; 
                  setVars();
                  guard++;
              }
          });
          setTimeout(function() { window.print(); window.close(); }, 500);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function popupNativePrintAll() {
  renderForwarding();
  renderCover();
  renderPart1();
  renderPart2();
  
  let styles = '';
  document.querySelectorAll('link[rel="stylesheet"]').forEach(s => { styles += s.outerHTML; });
  document.querySelectorAll('style').forEach(s => { styles += s.outerHTML; });

  let printContent = '';
  const fwContainers = document.getElementById('print-forwarding').querySelectorAll('.page-container');
  const coverContainers = document.getElementById('print-cover').querySelectorAll('.page-container');
  const part1Containers = document.getElementById('print-part1').querySelectorAll('.page-container');
  const part2Containers = document.getElementById('print-part2').querySelectorAll('.page-container');
  
  const allContainers = [...fwContainers, ...coverContainers, ...part1Containers, ...part2Containers];

  allContainers.forEach(c => {
    const clone = c.cloneNode(true);
    const originalInputs = c.querySelectorAll('input, textarea');
    const clonedInputs = clone.querySelectorAll('input, textarea');
    originalInputs.forEach((input, index) => {
        if(input.tagName === 'TEXTAREA') clonedInputs[index].innerHTML = input.value;
        else clonedInputs[index].setAttribute('value', input.value);
    });
    printContent += clone.outerHTML;
  });

  printContent = cleanStylesForPrint(printContent);

  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert("Please allow pop-ups to print."); return; }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <title>Full Pension Case</title>
      ${styles}
      <style>
        @page { size: A4 portrait; margin: 0mm !important; }
        body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; }
        .page-container { height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; border: none !important; box-shadow: none !important; margin: 0 !important; }
        .layout-table { margin-bottom: var(--table-mb, 12px) !important; }
        .layout-table td, .layout-table th, .service-table td, .service-table th { padding: var(--td-pad, 4px) 4px !important; }
        .gujarati-text { margin-bottom: var(--text-mb, 8px) !important; }
      </style>
    </head>
    <body>
      ${printContent}
      <script>
        window.onload = function() {
          const pages = document.querySelectorAll('.page-container');
          pages.forEach(page => {
              let tdPad = 8, textMb = 12, tableMb = 16, stampH = 40;
              const setVars = function() {
                  page.style.setProperty('--td-pad', tdPad + 'px'); 
                  page.style.setProperty('--text-mb', textMb + 'px'); 
                  page.style.setProperty('--table-mb', tableMb + 'px'); 
                  page.style.setProperty('--stamp-h', stampH + 'px');
              };
              setVars();
              let guard = 0;
              while (tdPad > 1 && guard < 50) {
                  const sig = page.querySelector('.signature-block');
                  const over = page.scrollHeight > page.clientHeight + 1;
                  let sigOver = false;
                  if (sig) {
                      const mb = parseFloat(getComputedStyle(sig).marginBottom) || 0;
                      sigOver = (sig.offsetTop + sig.offsetHeight + mb) > page.clientHeight + 1;
                  }
                  if (!over && !sigOver) break;
                  tdPad -= 0.5; textMb -= 1; tableMb -= 1; if(stampH > 15) stampH -= 2; 
                  setVars();
                  guard++;
              }
          });
          setTimeout(function() { window.print(); window.close(); }, 500);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function openPrintTab(evt, tabId) {
    if (evt && evt.preventDefault) evt.preventDefault();
    document.querySelectorAll('.print-tab-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    document.querySelectorAll('.print-nav-link').forEach(el => el.classList.remove('active'));
    
    let target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');

    if (tabId === 'print-forwarding' && typeof renderForwarding === 'function') renderForwarding();
    if (tabId === 'print-cover' && typeof renderCover === 'function') renderCover();
    if (tabId === 'print-part1' && typeof renderPart1 === 'function') renderPart1();
    if (tabId === 'print-part2' && typeof renderPart2 === 'function') renderPart2();
}

// Rendering Engines
function setLines(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!text) return;
  el.innerHTML = String(text).split(/\r?\n/).map(function(l) {
    return (typeof window.sanitize === 'function') ? window.sanitize(l) : l;
  }).join('<br>');
}

function showHide(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? '' : 'none';
}

function renderForwarding() {
  let d = currentCaseData || {};
  let s = window.officeProfilesData || {};
  let titleStr = (d.gender === 'Female') ? 'શ્રીમતી' : 'શ્રી';
  let fullGujName = ((d.surnameGuj||'') + ' ' + (d.firstNameGuj||'') + ' ' + (d.fatherNameGuj||'')).trim();
  
  let t = new Date();
  let todayStr = toGuj(('0'+t.getDate()).slice(-2) + '-' + ('0'+(t.getMonth()+1)).slice(-2) + '-' + t.getFullYear());
  let printedDate = d.formDate ? formatDateStandard(d.formDate) : todayStr;
  
  setText('fw_dateTop', printedDate); 
  
  for (let i = 1; i <= 3; i++) {
      setText('fw_title' + i, titleStr);
      setText('fw_name' + i, fullGujName);
      setText('fw_desig' + i, d.designation);
  }
  
  setText('fw_dor', formatDateStandard(d.dor));

  // 1. Letterhead: first 2 lines = office name (same font, centered), rest = address small on one line
  const offAdd = d.officeAddress || s.officeAddress || '';
  if (offAdd) {
    const offLines = String(offAdd).split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
    if (offLines.length) {
      setLines('fw_officeName', offLines.slice(0, 2).join('\n'));
      if (offLines.length > 2) {
        setLines('fw_officeAddress', offLines.slice(2).join(', '));
      }
    }
  }

  // 1. Phone number and email on a single line
  const offPhone = d.officePhone || s.officePhone || '';
  const offEmail = d.officeEmail || s.officeEmail || '';
  const contact = [];
  if (offPhone) contact.push('ફોન નં. - ' + toGuj(offPhone));
  if (offEmail) contact.push('E-mail - ' + offEmail);
  showHide('fw_officeContact', contact.length > 0);
  if (contact.length) setLines('fw_officeContact', contact.join(', '));

  // 2. Reference number (જા.નં.) mapped to forwarding / system setting
  const refNo = s.fwRefNo || d.fwRefNo || '';
  setLines('fw_refNo', refNo);

  // 2. Stamp of office mapped to system setting (falls back to designation + head office)
  const stamp = s.forwardStamp || buildForwardStamp(d, s) || '';
  setLines('fw_stampBlock', stamp);

  // 3. Forwarding recipient & top To Address mapped to Forwarding / To Address (system setting)
  const toAddr = s.toAddress || d.toAddress || '';
  setLines('fw_toAddress', toAddr);

  // 4. Office shown below 'સવિનય રવાના મારફતે પ્રતિ' mapped to સવિનય રવાના મારફતે પ્રતિ (system setting), falls back to To Address
  const fwdTo = s.fwForwardTo || toAddr;
  setLines('fw_forwardTo', fwdTo);

  // 5. Head office in paragraph 2 mapped to Head Office (system setting)
  setText('fw_headOfficeDesig', d.headOffice || s.headOffice || 'પશુપાલન નિયામકશ્રી');
}

function buildForwardStamp(d, s) {
  const lines = [];
  const desig = d.headOfOfficeDesignation || s.officerDesig || '';
  const office = d.headOffice || s.headOffice || '';
  if (desig) lines.push(desig);
  if (office) lines.push(office);
  return lines.join('\n');
}

function renderCover() {
  let d = currentCaseData || {};
  
  let titleStr = (d.gender === 'Female') ? 'શ્રીમતી' : 'શ્રી';
  setText('cov_genderTitle', titleStr);
  
  let fullGujName = ((d.surnameGuj||'') + ' ' + (d.firstNameGuj||'') + ' ' + (d.fatherNameGuj||'')).trim();
  setText('cov_fullNameTitle', fullGujName);
  setText('cov_designationTitle', d.designation);
  
  setText('cov_surname', d.surnameGuj);
  setText('cov_firstName', d.firstNameGuj);
  setText('cov_fatherName', d.fatherNameGuj);
  
  setText('cov_designation', d.designation);
  
  let elOffAdd = document.getElementById('cov_officeAddress');
  if(elOffAdd) elOffAdd.textContent = toGuj(d.officeAddress || '');
  
  let pinBox = document.getElementById('cov_officePin_box');
  if(pinBox) pinBox.innerHTML = createPinBoxesHTML(d.officePin || d.pinCode || '');
  
  let phoneBox = document.getElementById('cov_officePhone_box');
  if(phoneBox) phoneBox.innerHTML = createPhoneBoxesHTML(d.officePhone || d.phone || '');
  
  setText('cov_headOffice', d.headOffice); 
  setText('cov_department', d.department);
  
  let bDob = document.getElementById('cov_dob_box'); if(bDob) bDob.innerHTML = createDateBoxesHTML(formatDateForBox(d.dob));
  let bDoj = document.getElementById('cov_doj_box'); if(bDoj) bDoj.innerHTML = createDateBoxesHTML(formatDateForBox(d.doj));
  let bDor = document.getElementById('cov_dor_box'); if(bDor) bDor.innerHTML = createDateBoxesHTML(formatDateForBox(d.dor));
  
  let pTypes = {
    '1': 'વય નિવૃત્તિ', '2': 'નિવૃત્તિ પેન્શન (અપરિપક્વ)', '3': 'સ્વૈચ્છિક નિવૃત્તિ (૨૦ વર્ષ)',
    '4': 'અશક્તતા પેન્શન', '5': 'સ્વૈચ્છિક નિવૃત્તિ (૨૫ વર્ષ)', '6': 'ઘા અથવા ઈજા પેન્શન',
    '7': 'કુટુંબ પેન્શન', '8': 'વળતર પેન્શન', '9': 'રહેમિયત પેન્શન', '10': 'અન્ય પ્રકાર'
  };
  setText('cov_pensionType', pTypes[d.pensionType] || 'વય નિવૃત્તિ');
}

function renderPart1() {
  let d = currentCaseData || {};
  let titleStr = (d.gender === 'Female') ? 'શ્રીમતી' : 'શ્રી';
  
  let p1tCover1 = document.getElementById('p1_coverTitle'); if(p1tCover1) p1tCover1.innerText = titleStr;
  let p1tCover2 = document.getElementById('p1_coverTitle2'); if(p1tCover2) p1tCover2.innerText = titleStr;
  let p1t1 = document.getElementById('p1_title1'); if(p1t1) p1t1.innerText = titleStr;
  let p1t2 = document.getElementById('p1_title2'); if(p1t2) p1t2.innerText = titleStr;

  let printedDate = d.formDate ? formatDateStandard(d.formDate) : '';
  setText('p1_coverDateTop', printedDate);
  setText('p1_coverDor', formatDateStandard(d.dor));
  setText('p1_coverDor2', formatDateStandard(d.dor));
  setText('p1_coverDistrict', d.district);
  
  let fullGujName = ((d.surnameGuj||'') + ' ' + (d.firstNameGuj||'') + ' ' + (d.fatherNameGuj||'')).trim();
  let fullGujNameTitle = titleStr + ' ' + fullGujName;
  setText('p1_coverName', fullGujName);
  setText('p1_coverName2', fullGujName);
  setText('p1_fullName', fullGujName);
  setText('p1_fullNameUndertaking', fullGujName); 
  setText('p1_signName', fullGujNameTitle);
  setText('p1_signName2', fullGujNameTitle);
  setText('p1_designation', d.designation);
  setText('p1_designation2', d.designation);
  setText('p1_designationUndertaking', d.designation); 
  setText('p1_signDesignation', d.designation);
  setText('p1_signDesignation2', d.designation);
  setText('p1_headOfOfficeName', d.headOfOfficeName || d.officerName);
  setText('p1_headOfOfficeName2', d.headOfOfficeName || d.officerName);
  setText('p1_headOfOfficeDesignation', d.headOfOfficeDesignation);
  setText('p1_headOfOfficeDesignation2', d.headOfOfficeDesignation);
  setText('p1_dor', formatDateStandard(d.dor));
  setText('p1_dorUndertaking', formatDateStandard(d.dor));
  setText('p1_surname', d.surnameGuj);
  setText('p1_firstName', d.firstNameGuj);
  setText('p1_fatherName', d.fatherNameGuj);
  
  // Serial 3: office name (first 2 lines) + address (remaining lines) + PIN/phone
  const p1OffAdd = d.officeAddress || p1Settings.officeAddress || '';
  const p1OffLines = String(p1OffAdd).split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
  if (p1OffLines.length) {
    setLines('p1_officeName', p1OffLines.slice(0, 2).join('\n'));
    let p1AddrTxt = p1OffLines.slice(2).join('\n');
    if (d.officePin || d.officePhone) {
      p1AddrTxt += '\nPIN: ' + toGuj(d.officePin || '') + ' | Ph: ' + toGuj(d.officePhone || '');
    }
    let elAdd = document.getElementById('p1_officeAddress');
    if(elAdd) elAdd.textContent = p1AddrTxt ? toGuj(p1AddrTxt) : '';
  }
  
  let p1Settings = window.officeProfilesData || {};
  let p1Stamp = p1Settings.forwardStamp || buildForwardStamp(d, p1Settings) || '';
  let p1PratiLines = String(p1Stamp).split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
  if (p1PratiLines.length) p1PratiLines[0] = p1PratiLines[0] + 'શ્રી';
  let elPrati = document.getElementById('p1_part1Prati');
  if(elPrati) setLines('p1_part1Prati', p1PratiLines.join('\n'));

  let p1_dob_box = document.getElementById('p1_dob_box'); if(p1_dob_box) p1_dob_box.innerHTML = createDateBoxesHTML(formatDateForBox(d.dob));
  let p1_doj_box = document.getElementById('p1_doj_box'); if(p1_doj_box) p1_doj_box.innerHTML = createDateBoxesHTML(formatDateForBox(d.doj));
  let p1_dor2_box = document.getElementById('p1_dor2_box'); if(p1_dor2_box) p1_dor2_box.innerHTML = createDateBoxesHTML(formatDateForBox(d.dor));
  
  let elAddr2 = document.getElementById('p1_address');
  if(elAddr2) {
      let txt = toGuj(d.address || '');
      if (d.pinCode || d.phone) {
          txt += '\nPIN: ' + toGuj(d.pinCode || '') + ' | Ph: ' + toGuj(d.phone || '');
      }
      elAddr2.textContent = txt;
  }
  
  setText('p1_treasury', d.treasury);
  setText('p1_district', d.district);
  setText('p1_taluka', d.taluka);
  setText('p1_commPct', d.commPct);
  setText('p1_commDate', formatDateStandard(d.commDate || d.formDate));
  setText('p1_familyDate', formatDateStandard(d.commDate || d.formDate));
  
  let printedPlace = d.place || d.district || '';
  setText('p1_place', printedPlace);
  setText('p1_place2', printedPlace);
  setText('p1_todayDate', printedDate); 
  setText('p1_todayDateForm', printedDate); 
  setText('p1_todayDateForm2', printedDate);

  setCheck('p1_emp_gaz', (d.empCategory === 'રાજ્યપત્રિત'));
  setCheck('p1_emp_non', (d.empCategory === 'બિનરાજ્યપત્રિત'));
  setText('p1_coverPlace', printedPlace);
  setText('p1_coverDate2', printedDate);

  let tbody = document.getElementById('p1_familyBody');
  if (tbody) {
    tbody.innerHTML = '';
    let fam = d.family || [];
    let validCount = 0;
    
    fam.forEach((m) => {
      if (!m.name && !m.relation && !m.dob) return;
      validCount++;
      let tr = document.createElement('tr');
      tr.innerHTML = '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;">' + toGuj(validCount) + '</span></td>' +
                     '<td style="text-align:left;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;">' + (m.name||'') + '</span></td>' +
                     '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;">' + toGuj(formatDateStandard(m.dob)) + '</span></td>' +
                     '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;">' + (m.relation||'') + '</span></td>' +
                     '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;">' + (m.marital||'') + '</span></td>';
      tbody.appendChild(tr);
    });
    
    while (validCount < 4) {
      validCount++;
      let tr = document.createElement('tr');
      tr.innerHTML = '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;">' + toGuj(validCount) + '</span></td>' +
                     '<td style="text-align:left;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;"></span></td>' +
                     '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;"></span></td>' +
                     '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;"></span></td>' +
                     '<td style="text-align:center;"><span class="editable-field" contenteditable="true" style="width:100%; border-bottom:none;"></span></td>';
      tbody.appendChild(tr);
    }
  }
}

const getRules = () => window.PENSION_RULES || (typeof PENSION_RULES !== 'undefined' ? PENSION_RULES : { maxQualifyingYears: 33, pensionDivisor: 66, maxGratuity: 2500000, defaultCommutationPct: 40 });
const getFactors = () => window.COMMUTATION_FACTORS || (typeof COMMUTATION_FACTORS !== 'undefined' ? COMMUTATION_FACTORS : {});

function renderPart2() {
  let d = window.currentCaseData;
  if (!d || Object.keys(d).length === 0) {
    if (typeof window.collectFormData === 'function') {
      d = window.collectFormData() || {};
      window.currentCaseData = d;
    } else {
      d = {};
    }
  }
  let dojStr = d.doj || '';
  let dorStr = d.dor || '';
  let dobStr = d.dob || '';
  
  let t = new Date();
  let todayStr = toGuj(('0'+t.getDate()).slice(-2) + '-' + ('0'+(t.getMonth()+1)).slice(-2) + '-' + t.getFullYear());
  let printedDate = d.formDate ? formatDateStandard(d.formDate) : todayStr;
  let printedPlace = d.place || d.district || '';
  let offName = d.headOfOfficeName || d.officerName || '';
  let offDesig = d.headOfOfficeDesignation || '';

  let titleStr = (d.gender === 'Female') ? 'શ્રીમતી' : 'શ્રી';
  for (let i = 1; i <= 5; i++) {
      let p2t = document.getElementById('p2_title' + i);
      if(p2t) p2t.innerText = titleStr;
  }

  setText('p2_gujSurname', d.surnameGuj);
  setText('p2_gujFirstName', d.firstNameGuj);
  setText('p2_gujFatherName', d.fatherNameGuj);
  
  let enSurBox = document.getElementById('p2_enSurnameBox'); if (enSurBox) enSurBox.innerHTML = createCharBoxes(d.surname, 15);
  let enFirstBox = document.getElementById('p2_enFirstNameBox'); if (enFirstBox) enFirstBox.innerHTML = createCharBoxes(d.firstName, 15);
  let enSecondBox = document.getElementById('p2_enSecondNameBox'); if (enSecondBox) enSecondBox.innerHTML = createCharBoxes(d.fatherName, 15);

  setText('p2_designation', d.designation);
  setText('p2_designationEn', (d.designationEn || '').toUpperCase());
  
  let p2_dob_box = document.getElementById('p2_dob_box'); if(p2_dob_box) p2_dob_box.innerHTML = createDateBoxesHTML(formatDateForBox(dobStr));
  let p2_doj_box = document.getElementById('p2_doj_box'); if(p2_doj_box) p2_doj_box.innerHTML = createDateBoxesHTML(formatDateForBox(dojStr));
  let p2_dor_box = document.getElementById('p2_dor_box'); if(p2_dor_box) p2_dor_box.innerHTML = createDateBoxesHTML(formatDateForBox(dorStr));

  let elAdd = document.getElementById('p2_address');
  if(elAdd) {
      let txt = toGuj(d.address || '');
      if (d.pinCode || d.phone || d.email) {
          txt += '\nPIN: ' + toGuj(d.pinCode || '') + ' | Ph: ' + toGuj(d.phone || '') + ' | Email: ' + (d.email || '');
      }
      elAdd.textContent = txt;
  }

  let elOff = document.getElementById('p2_officeAddress');
  if(elOff) {
      let offText = toGuj(d.officeAddress || '');
      if (d.officePin || d.officePhone || d.officeEmail) {
          offText += '\nPIN: ' + toGuj(d.officePin || '') + ' | Ph: ' + toGuj(d.officePhone || '') + ' | Email: ' + (d.officeEmail || '');
      }
      if (d.officeAddressEn) {
          offText += '\n\nENG:\n' + d.officeAddressEn.toUpperCase();
      }
      elOff.textContent = offText;
  }

  let gpfEl = document.getElementById('p2_gpf'); if(gpfEl) gpfEl.innerHTML = createCharBoxes(d.gpf, 12);
  
  for(let i=1; i<=10; i++) setCheck('p2_pt_'+i, (String(d.pensionType) === String(i)));

  let b20 = document.getElementById('p2_notional20_box'); if(b20) b20.innerHTML = createDateBoxesHTML(formatDateForBox(d.notional20));
  let b25 = document.getElementById('p2_notional25_box'); if(b25) b25.innerHTML = createDateBoxesHTML(formatDateForBox(d.notional25));

  setCheck('p2_emp_gaz', (d.empCategory === 'રાજ્યપત્રિત'));
  setCheck('p2_emp_non', (d.empCategory === 'બિનરાજ્યપત્રિત'));
  setText('p2_district', d.district);
  setText('p2_taluka', d.taluka);
  setText('p2_treasury', d.treasury);
  setText('p2_headOffice', d.headOffice);
  
  let p2_ho_code = document.getElementById('p2_headOfficeCode'); if(p2_ho_code) p2_ho_code.innerHTML = createCharBoxes(d.headOfficeCode, 4);
  setText('p2_department', d.department);
  let p2_dept_code = document.getElementById('p2_deptCode'); if(p2_dept_code) p2_dept_code.innerHTML = createCharBoxes(d.deptCode, 4);

  setText('p2_heirGujSurname', d.heirSurnameGuj);
  setText('p2_heirGujFirstName', d.heirFirstNameGuj);
  setText('p2_heirGujFatherName', d.heirFatherNameGuj);

  let hsBox = document.getElementById('p2_heirEnSurnameBox'); if(hsBox) hsBox.innerHTML = createCharBoxes(d.heirSurname, 15);
  let hfBox = document.getElementById('p2_heirEnFirstNameBox'); if(hfBox) hfBox.innerHTML = createCharBoxes(d.heirFirstName, 15);
  let hsnBox = document.getElementById('p2_heirEnSecondNameBox'); if(hsnBox) hsnBox.innerHTML = createCharBoxes(d.heirFatherName, 15);

  let ngEl = document.getElementById('p2_nomineeGuj');
  if(ngEl) ngEl.innerHTML = ((d.heirSurnameGuj||'') + ' ' + (d.heirFirstNameGuj||d.firstNameGuj||'') + ' ' + (d.heirFatherNameGuj||'')).trim();

  const rules = getRules();
  const comFactors = getFactors();

  setText('p2_commDate', formatDateStandard(d.commDate || d.formDate));
  setText('p2_commPct', d.commPct || rules.defaultCommutationPct);

  let gYears = 0, gMonths = 0, gDays = 0, nYears = 0, nMonths = 0, nDays = 0, finalQsYears = 0;

  if (dojStr && dorStr) {
    let d1 = new Date(dojStr), d2 = new Date(dorStr);
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      let startDay = d1.getDate(), startMonth = d1.getMonth(), startYear = d1.getFullYear();
      let endDay = d2.getDate(), endMonth = d2.getMonth(), endYear = d2.getFullYear();
      let days = endDay - startDay + 1;
      let months = endMonth - startMonth;
      let years = endYear - startYear;
      if (days < 0) { months--; days += new Date(endYear, endMonth, 0).getDate(); }
      if (days >= 30) { months++; days -= 30; }
      if (months < 0) { years--; months += 12; }
      gYears = years; gMonths = months; gDays = days;
      let dedY = parseInt(d.dedY) || 0, dedM = parseInt(d.dedM) || 0, dedD = parseInt(d.dedD) || 0;
      nDays = gDays - dedD; nMonths = gMonths - dedM; nYears = gYears - dedY;
      if (nDays < 0) { nDays += 30; nMonths--; }
      if (nMonths < 0) { nMonths += 12; nYears--; }
      if (nYears < 0) { nYears = 0; nMonths = 0; nDays = 0; }
      finalQsYears = nYears;
      if (nMonths >= 6) finalQsYears++;
      if (finalQsYears > rules.maxQualifyingYears) finalQsYears = rules.maxQualifyingYears;
    }
  }

  setText('p2_doj2', formatDateStandard(dojStr));
  setText('p2_dor2', formatDateStandard(dorStr));

  let gYStr = ('0' + gYears).slice(-2), gMStr = ('0' + gMonths).slice(-2), gDStr = ('0' + gDays).slice(-2);
  setText('p2_g_Y1', gYStr[0]); setText('p2_g_Y2', gYStr[1]); setText('p2_g_M1', gMStr[0]); setText('p2_g_M2', gMStr[1]); setText('p2_g_D1', gDStr[0]); setText('p2_g_D2', gDStr[1]);

  let dedYStr = ('0' + (parseInt(d.dedY) || 0)).slice(-2), dedMStr = ('0' + (parseInt(d.dedM) || 0)).slice(-2), dedDStr = ('0' + (parseInt(d.dedD) || 0)).slice(-2);
  setText('p2_ded_Y1', dedYStr[0]); setText('p2_ded_Y2', dedYStr[1]); setText('p2_ded_M1', dedMStr[0]); setText('p2_ded_M2', dedMStr[1]); setText('p2_ded_D1', dedDStr[0]); setText('p2_ded_D2', dedDStr[1]);
  
  let nYStr = ('0' + nYears).slice(-2), nMStr = ('0' + nMonths).slice(-2), nDStr = ('0' + nDays).slice(-2);
  setText('p2_n_Y1', nYStr[0]); setText('p2_n_Y2', nYStr[1]); setText('p2_n_M1', nMStr[0]); setText('p2_n_M2', nMStr[1]); setText('p2_n_D1', nDStr[0]); setText('p2_n_D2', nDStr[1]); 
  
  let fYStr = ('0' + finalQsYears).slice(-2);
  setText('p2_final_Y1', fYStr[0]); setText('p2_final_Y2', fYStr[1]);

  let factor = 0;
  if (dobStr && dorStr) {
      let bday = new Date(dobStr), retDate = new Date(dorStr);
      if (!isNaN(bday) && !isNaN(retDate)) {
          let age = retDate.getFullYear() - bday.getFullYear();
          let mDiff = retDate.getMonth() - bday.getMonth();
          if (mDiff < 0 || (mDiff === 0 && retDate.getDate() < bday.getDate())) {
              age--;
          }
          let ageNextBirthday = age + 1;
          factor = comFactors[ageNextBirthday] || 0;
      }
  }
  setText('p2_commCalcFactor', factor);

  let recBody = document.getElementById('p2_recoveryBody');
  if (recBody) {
    if (d.recoveryType === 'નીલ') {
       recBody.innerHTML = '';
       let recLabels = ['મકાન પેશગી', 'વાહન પેશગી', 'પગાર ભથ્થાની વસુલાત', 'અન્ય વસુલાત'];
       let recMsgs = ['નો-ડ્યુ પ્રમાણપત્ર સામેલ છે.', 'નો-ડ્યુ પ્રમાણપત્ર સામેલ છે.', 'કોઈ વસુલાત બાકીમાં નથી.', 'કોઈ વસુલાત બાકીમાં નથી.'];
       for(let i=0; i<4; i++) {
          let tr = document.createElement('tr');
          tr.innerHTML = '<td>'+toGuj(i+1)+'</td><td>'+recLabels[i]+'</td><td colspan="4" style="text-align:center; vertical-align:middle;"><strong>'+recMsgs[i]+'</strong></td>';
          recBody.appendChild(tr);
       }
       let fTr = document.createElement('tr');
       fTr.innerHTML = '<td colspan="2" style="text-align:right; font-weight:700;">કુલ વસુલાત :</td><td colspan="4" style="text-align:center; vertical-align:middle;"><strong>------ શુન્ય ------</strong></td>';
       recBody.appendChild(fTr);
    } else {
       recBody.innerHTML = '';
       let labels = ['મકાન પેશગી', 'વાહન પેશગી', 'પગાર ભથ્થાની વસુલાત', 'અન્ય વસુલાત'];
       for(let i=0; i<4; i++) {
          let tr = document.createElement('tr');
          tr.innerHTML = '<td>'+toGuj(i+1)+'</td><td>'+labels[i]+'</td><td><span class="editable-area" contenteditable="true"></span></td><td><span class="editable-area" contenteditable="true"></span></td><td><span class="editable-area" contenteditable="true"></span></td><td><span class="editable-area" contenteditable="true"></span></td>';
          recBody.appendChild(tr);
       }
       let fTr = document.createElement('tr');
       fTr.innerHTML = '<td colspan="4" style="text-align:right; font-weight:700;">કુલ વસુલાત :</td><td colspan="2"><span id="p2_totalRecovery" class="editable-area" contenteditable="true">અંકે રૂપિયા </span></td>';
       recBody.appendChild(fTr);
    }
  }

  let tbody = document.getElementById('p2_tenMonthPayBody');
  if (tbody) {
    tbody.innerHTML = '';
    if (dorStr) {
      let dorDate = new Date(dorStr);
      let monthNames = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઇ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];
      
      let p1Basic = parseFloat(d.pay1Basic) || 0;
      let p1Npa = parseFloat(d.pay1Npa) || 0;
      let p1Count = parseInt(d.pay1Count) || 0;
      
      let p2Basic = parseFloat(d.pay2Basic) || parseFloat(d.lastPay) || 0;
      let p2Npa = parseFloat(d.pay2Npa) || parseFloat(d.npa) || 0;
      
      for (let i = 9; i >= 0; i--) {
        let mDate = new Date(dorDate.getFullYear(), dorDate.getMonth() - i, 1);
        let mLabel = toGuj(monthNames[mDate.getMonth()] + '-' + mDate.getFullYear());
        if (i === 9) setText('p2_tenMonthsStart', formatDateStandard(mDate));
        if (i === 0) setText('p2_tenMonthsEnd', formatDateStandard(dorStr));
        
        let monthIndex = 10 - i;
        let isPeriod1 = monthIndex <= p1Count; 
        
        let bVal = isPeriod1 ? p1Basic : p2Basic;
        let nVal = isPeriod1 ? p1Npa : p2Npa;
        let monthlyTotal = bVal + nVal;

        let tr = document.createElement('tr');
        tr.innerHTML = '<td class="text-center">' + toGuj(monthIndex) + '</td>' +
                       '<td>' + mLabel + '</td>' +
                       '<td class="text-right"><span class="editable-field pay-val" style="width:100%; text-align:right;">' + (bVal ? toGuj(bVal.toFixed(2)) : '૦.૦૦') + '</span></td>' +
                       '<td class="text-right"><span class="editable-field npa-val" style="width:100%; text-align:right;">' + (nVal ? toGuj(nVal.toFixed(2)) : '૦.૦૦') + '</span></td>' +
                       '<td class="text-right"><span class="editable-field bold total-val" style="width:100%; text-align:right;">' + (monthlyTotal ? toGuj(monthlyTotal.toFixed(2)) : '૦.૦૦') + '</span></td>';
        tbody.appendChild(tr);
      }
    }
  }

  let fullGujName = ((d.surnameGuj||'') + ' ' + (d.firstNameGuj||'') + ' ' + (d.fatherNameGuj||'')).trim();
  setText('p2_fullNameCert1', fullGujName);
  setText('p2_fullNameCert2', fullGujName);
  setText('p2_fullNameCert3', fullGujName);
  setText('p2_fullNameCert4', fullGujName);
  
  setText('p2_designationCert4', d.designation);
  setText('p2_dorCert1', formatDateStandard(dorStr));

  for (let i = 1; i <= 3; i++) {
    setText('p2_fullName' + i, fullGujName);
    setText('p2_designation' + i, d.designation);
    
    let tNode = document.getElementById('p2_photoTitle' + i); if(tNode) tNode.innerText = titleStr;
    
    let offNode = document.getElementById('p2_office' + i);
    if (offNode) offNode.textContent = toGuj(d.officeAddress || '');
    
    let bId = document.getElementById('p2_dor_box' + i); if(bId) bId.innerHTML = createDateBoxesHTML(formatDateForBox(dorStr));
    setText('p2_idMark' + i, d.idMark);
    setText('p2_height' + i, d.height);
  }
  
  setText('p2_certDate1', printedDate);
  setText('p2_certDate2', printedDate);
  setText('p2_certPlace', printedPlace);
  
  for (let i = 1; i <= 3; i++) {
      setText('p2_photoDate' + i, printedDate);
      setText('p2_photoOfficerName' + i, offName);
      setText('p2_photoOfficerDesig' + i, offDesig);
  }

  recalculatePart2(d); 
}

function recalculatePart2(d) {
  let tbody = document.getElementById('p2_tenMonthPayBody');
  if (!tbody) return;
  d = d || window.currentCaseData || {};
  const rules = getRules();

  let tenMonthTotal = 0, lastRecordedPay = 0, lastRecordedNpa = 0;
  let rows = tbody.querySelectorAll('tr');
  rows.forEach(function(tr) {
    let payEl = tr.querySelector('.pay-val'), npaEl = tr.querySelector('.npa-val');
    if(payEl && npaEl) {
      let p = parseGuj(payEl.textContent), n = parseGuj(npaEl.textContent);
      let rowTotal = p + n;
      tenMonthTotal += rowTotal; 
      lastRecordedPay = p; 
      lastRecordedNpa = n;
    }
  });

  let calcBasePay = lastRecordedPay; 
  setText('p2_tenMonthSum', tenMonthTotal.toFixed(2));
  setText('p2_avgPay', (tenMonthTotal / 10).toFixed(2));
  
  let realLastPay = parseFloat(d.pay2Basic) || parseFloat(d.lastPay) || calcBasePay;
  let realLastNpa = parseFloat(d.pay2Npa) || parseFloat(d.npa) || lastRecordedNpa;
  
  let pensionableSalary = realLastPay + realLastNpa;
  let daRate = parseFloat(d.pay2Da) || parseFloat(d.daRate) || 0;
  let calculatedDa = Math.round((pensionableSalary * daRate) / 100);
  
  setText('p2_calcAvgPay', pensionableSalary); setText('p2_lastPay', pensionableSalary);
  setText('p2_lastPay_23', pensionableSalary);
  
  let halfPayVal = Math.round(pensionableSalary / 2);
  setText('p2_halfMinPay', halfPayVal);

  let y1 = document.getElementById('p2_final_Y1'), y2 = document.getElementById('p2_final_Y2');
  let finalQsYears = 0;
  if(y1 && y2) finalQsYears = parseGuj(y1.textContent + y2.textContent) || 0;
  
  if (finalQsYears > rules.maxQualifyingYears) finalQsYears = rules.maxQualifyingYears;
  setText('p2_calcYears', finalQsYears); setText('p2_dcrgYears', finalQsYears);
  
  let formulaVal = Math.round((pensionableSalary * finalQsYears) / rules.pensionDivisor);
  setText('p2_calcPensionFormula', formulaVal); 

  let finalPension = Math.max(formulaVal, halfPayVal);
  setText('p2_finalPension', finalPension);

  let fp30 = Math.round((pensionableSalary * 30) / 100);
  setText('p2_fp1', finalPension); setText('p2_lastPayFp1', pensionableSalary); setText('p2_fp30', fp30);
  setText('p2_fp2', fp30); setText('p2_lastPayFp2', pensionableSalary); setText('p2_fp30_2', fp30);

  let dcrg = Math.round(((pensionableSalary + calculatedDa) * finalQsYears) / 2);
  setText('p2_calcDcrg', dcrg);
  
  let maxDcrg = rules.maxGratuity;
  let finalDcrg = dcrg > maxDcrg ? maxDcrg : dcrg;
  setText('p2_dcrgPay', pensionableSalary); setText('p2_dcrgDa', calculatedDa); setText('p2_finalDcrg', finalDcrg); 
  setText('p2_maxGratuityLimitText', Math.round(maxDcrg / 100000));

  let commPctEl = document.getElementById('p2_commPct');
  let commPct = commPctEl ? (parseGuj(commPctEl.textContent) || rules.defaultCommutationPct) : rules.defaultCommutationPct;
  let commAmt = Math.round(finalPension * (commPct / 100));
  
  setText('p2_commBasePension', finalPension);
  setText('p2_commPctDisplay', commPct);
  setText('p2_commCalcPensionStep', commAmt);
  setText('p2_commCalcPension', commAmt);

  let factorStr = document.getElementById('p2_commCalcFactor');
  let factor = factorStr ? parseGuj(factorStr.textContent) : 0;
  let totalComm = Math.round(commAmt * factor * 12);
  setText('p2_commCalcTotal', totalComm);
}

// Live web view input handler for Part 2 edits
document.addEventListener('input', function(e) {
  if (e.target && e.target.closest('#print-part2')) {
    if (typeof recalculatePart2 === 'function') {
      recalculatePart2(window.currentCaseData || {});
    }
  }
});

// Explicitly export to window object for global availability
window.renderPart2 = renderPart2;
window.recalculatePart2 = recalculatePart2;
window.renderPart1 = renderPart1;
window.renderCover = renderCover;
window.renderForwarding = renderForwarding;
window.openPrintTab = openPrintTab;