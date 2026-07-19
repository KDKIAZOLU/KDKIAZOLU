(function () {
  'use strict';

  var clean = window.MVCleaning;
  var fuzzy = window.MVFuzzy;

  var state = {
    fileName: '',
    headers: [],
    rawRows: [],
    mapping: null,
    families: [],
    students: [],
    issues: [],
    schoolMatcher: null,
    filters: { school: '', eligibility: '', category: '', need: '', sizeGroup: '' },
    records: { mode: 'families', page: 1, pageSize: 25, search: '', sortField: null, sortDir: 1 }
  };

  // ---------------------------------------------------------------- utils
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(message, type) {
    var container = $('#toastContainer');
    var t = el('div', { class: 'toast ' + (type || '') }, []);
    t.textContent = message;
    container.appendChild(t);
    setTimeout(function () { t.remove(); }, 4500);
  }
  function downloadBlob(content, filename, mime) {
    // When this app is running inside a claude.ai Artifact preview, it's
    // sandboxed and the plain Blob-URL + <a download> click below is
    // silently swallowed - file saves have to go through the host's
    // window.claude.downloads bridge instead. That bridge only accepts a
    // fixed extension allowlist (gif png jpg jpeg webp mp4 webm txt json
    // md - notably no .csv, .xlsx, .docx, or .pdf). CSV exports get
    // renamed to .txt in that path (the comma-delimited content is still
    // perfectly importable in Excel/Sheets); .xlsx/.docx/.pdf are binary
    // formats that can't be renamed around the allowlist, so those saves
    // are only available when the app is opened outside this preview.
    if (window.claude && window.claude.downloads && window.claude.downloads.save) {
      var claudeFilename = /\.csv$/i.test(filename) ? filename.replace(/\.csv$/i, '.txt') : filename;
      window.claude.downloads.save({ filename: claudeFilename, data: content })
        .then(function () { toast('Saved "' + claudeFilename + '".', 'success'); })
        .catch(function (err) {
          var code = err && err.code;
          if (code === 'declined') return; // user said no - don't nag
          if (code === 'rate_limited') { toast('A save prompt is already open — try again in a moment.', 'error'); return; }
          if (code === 'too_large') { toast('This export is too large to save from this preview (16 MiB limit). Narrow your filters and try again.', 'error'); return; }
          if (code === 'rejected_extension') { toast('This file format isn’t downloadable from this preview. Use CSV/JSON here, or open the app outside the preview for Excel/PDF/Word.', 'error'); return; }
          toast('Could not save the file from this preview. Try opening the app directly (outside the preview) instead.', 'error');
        });
      return;
    }
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // ---------------------------------------------------------------- tabs
  function switchTab(viewName) {
    $all('.tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.view === viewName); });
    $all('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + viewName); });
    if (viewName === 'dashboard' && state.families.length) {
      // Canvas charts drawn while this tab was display:none bake in a
      // fallback size (getBoundingClientRect is all-zero for hidden
      // ancestors), so redraw now that real layout dimensions exist.
      requestAnimationFrame(renderDashboard);
    }
  }
  $all('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.view); });
  });

  // ---------------------------------------------------------------- theme
  function applyTheme(theme) {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }
  (function initTheme() {
    var settings = window.MVStore.getSettings();
    applyTheme(settings.theme || 'auto');
  })();
  $('#btnTheme').addEventListener('click', function () {
    var current = window.MVStore.getSettings().theme || 'auto';
    var next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
    window.MVStore.setSettings({ theme: next });
    applyTheme(next);
    toast('Theme: ' + next);
    renderDashboard(); // re-render charts with correct text color
  });

  // ---------------------------------------------------------------- file import
  $('#btnImportTop').addEventListener('click', function () { $('#fileInput').click(); });
  $('#fileInput').addEventListener('change', function (e) {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
  var dropzone = $('#dropzone');
  dropzone.addEventListener('click', function () { $('#fileInput').click(); });
  ['dragenter', 'dragover'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  function setProgress(msg) {
    var box = $('#importProgress');
    if (!msg) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    $('#importProgressText').textContent = msg;
  }

  function pickBestSheet(sheets, sheetNames) {
    var best = null, bestScore = -1;
    sheetNames.forEach(function (name) {
      var rows = sheets[name].rows;
      var score = rows.length;
      if (score > bestScore) { bestScore = score; best = name; }
    });
    return best;
  }

  function handleFile(file) {
    state.fileName = file.name;
    setProgress('Reading "' + file.name + '"…');
    var reader = new FileReader();
    var isXlsx = /\.xlsx$/i.test(file.name);

    reader.onerror = function () { setProgress(null); toast('Failed to read file.', 'error'); };

    if (isXlsx) {
      reader.onload = function (e) {
        try {
          setProgress('Parsing Excel workbook…');
          var wb = window.MVXlsx.parse(e.target.result);
          var sheetName = pickBestSheet(wb.sheets, wb.sheetNames);
          var rows = wb.sheets[sheetName].rows;
          if (!rows.length) throw new Error('The selected sheet appears to be empty.');
          var headers = rows[0].map(function (h) { return String(h == null ? '' : h); });
          var dataRows = rows.slice(1).map(function (r) { return r.map(function (c) { return c == null ? '' : String(c); }); });
          onParsed(headers, dataRows);
        } catch (err) {
          console.error(err);
          setProgress(null);
          toast('Could not parse Excel file: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = function (e) {
        try {
          setProgress('Parsing CSV…');
          var parsed = window.MVCsv.parse(e.target.result);
          if (!parsed.rows.length) throw new Error('The file appears to be empty.');
          var headers = parsed.rows[0];
          var dataRows = parsed.rows.slice(1);
          onParsed(headers, dataRows);
        } catch (err) {
          console.error(err);
          setProgress(null);
          toast('Could not parse CSV file: ' + err.message, 'error');
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  }

  function onParsed(headers, dataRows) {
    state.headers = headers;
    state.rawRows = dataRows;
    setProgress('Detecting column meaning…');

    var mapping = window.MVSchema.buildColumnMapping(headers);
    var matchedProfile = window.MVStore.findMatchingProfile(headers);
    if (matchedProfile) {
      matchedProfile.profile.overrides.forEach(function (o) {
        var idx = headers.indexOf(o.header);
        if (idx !== -1) window.MVSchema.applyOverride(mapping, idx, o.fieldId, o.scope);
      });
      toast('Applied saved mapping profile "' + matchedProfile.profile.name + '" (' + Math.round(matchedProfile.similarity * 100) + '% header match).', 'success');
    }
    state.mapping = mapping;

    setProgress('Matching school names & determining eligibility…');
    setTimeout(function () {
      rebuildRecords();
      setProgress(null);
      renderImportSummary();
      renderMappingTab();
      switchTab('mapping');
      toast('Imported ' + state.families.length + ' family submissions covering ' + state.students.length + ' students.', 'success');
    }, 30);
  }

  function buildSchoolMatcher() {
    var custom = window.MVStore.getCustomSchoolList();
    var schools = custom ? custom.schools : window.MVSchoolsData.SCHOOLS;
    var aliases = custom ? (custom.aliases || {}) : window.MVSchoolsData.ALIASES;
    var overrides = window.MVStore.getSchoolOverrides();
    return new window.MVSchools.SchoolMatcher(schools, aliases, overrides);
  }

  function rebuildRecords() {
    state.schoolMatcher = buildSchoolMatcher();
    var result = window.MVDataModel.buildRecords(state.rawRows, state.mapping, { schoolMatcher: state.schoolMatcher });
    state.families = result.families;
    state.students = result.students;
    state.issues = result.issues;
    state.records.page = 1;
    updateStatusBar();
    renderSchoolsTab();
    renderQualityTab();
    populateDashboardFilterOptions();
    renderDashboard();
    renderRecordsTab();
  }

  function updateStatusBar() {
    var box = $('#datasetStatus');
    if (!state.families.length) { box.textContent = ''; return; }
    box.textContent = state.fileName + ' — ' + state.families.length + ' families / ' + state.students.length + ' students';
  }

  // ---------------------------------------------------------------- import summary
  function renderImportSummary() {
    var card = $('#importSummaryCard');
    card.style.display = 'block';
    var b = $('#importSummaryBody');
    var m = state.mapping;
    var unmappedN = m.unmapped.length;
    b.innerHTML =
      '<div class="grid grid-3">' +
        kpiHtml(state.families.length, 'Family Submissions', 'primary') +
        kpiHtml(state.students.length, 'Students', 'primary') +
        kpiHtml(m.blocks.length, 'Student Blocks Detected', 'primary') +
      '</div>' +
      '<p class="small muted" style="margin-top:10px;">' + m.familyColumns.length + ' household-level columns and ' +
      (state.headers.length - m.familyColumns.length - unmappedN) + ' student-level columns were classified automatically' +
      (unmappedN ? ('; <strong>' + unmappedN + ' column(s)</strong> could not be classified confidently and are listed on the Column Mapping tab.') : ' with zero unmapped columns.') +
      '</p>';
  }

  function kpiHtml(value, label, accent) {
    return '<div class="kpi-tile' + (accent ? ' accent-' + accent : '') + '"><div class="kpi-value">' + value + '</div><div class="kpi-label">' + label + '</div></div>';
  }

  // ---------------------------------------------------------------- mapping tab
  var ALL_FIELD_OPTIONS = window.MVSchema.FAMILY_FIELDS.map(function (f) { return { id: f.id, label: f.label, scope: 'family' }; })
    .concat(window.MVSchema.STUDENT_FIELDS.map(function (f) { return { id: f.id, label: f.label, scope: 'block' }; }));

  function fieldLabel(fieldId) {
    var f = ALL_FIELD_OPTIONS.find(function (x) { return x.id === fieldId; });
    return f ? f.label : (fieldId || '(unmapped)');
  }

  function renderMappingTab() {
    var m = state.mapping;
    var tbody = $('#mappingTable tbody');
    tbody.innerHTML = '';

    var rowsByIndex = {};
    m.familyColumns.forEach(function (c) { rowsByIndex[c.index] = { col: c, group: 'Household', blockN: null }; });
    m.blocks.forEach(function (b, bi) {
      b.columns.forEach(function (c) { rowsByIndex[c.index] = { col: c, group: 'Student Block ' + (bi + 1), blockN: bi }; });
    });
    m.unmapped.forEach(function (u) { if (!rowsByIndex[u.index]) rowsByIndex[u.index] = { col: { index: u.index, header: u.header, fieldId: null, score: 0 }, group: u.scope === 'family' ? 'Household' : 'Unmapped' }; });

    state.headers.forEach(function (header, idx) {
      var info = rowsByIndex[idx];
      if (!info) return;
      var col = info.col;
      var scoreVal = col.score || 0;
      var confBadge = col.manual ? '<span class="badge badge-info">Manual</span>' :
        !col.fieldId ? '<span class="badge badge-muted">Unmapped</span>' :
        scoreVal >= 0.95 ? '<span class="badge badge-success">' + Math.round(scoreVal * 100) + '%</span>' :
        scoreVal >= 0.5 ? '<span class="badge badge-warning">' + Math.round(scoreVal * 100) + '%</span>' :
        '<span class="badge badge-danger">' + Math.round(scoreVal * 100) + '%</span>';

      var scope = info.group === 'Household' ? 'family' : 'block';
      var select = el('select', { 'data-index': idx, 'data-scope': scope });
      select.appendChild(el('option', { value: '' }, [document.createTextNode('— Ignore / Unmapped —')]));
      var groupFamily = el('optgroup', { label: 'Household Fields' });
      var groupStudent = el('optgroup', { label: 'Student Fields' });
      ALL_FIELD_OPTIONS.forEach(function (f) {
        var opt = el('option', { value: f.id }, [document.createTextNode(f.label)]);
        if (f.id === col.fieldId) opt.selected = true;
        (f.scope === 'family' ? groupFamily : groupStudent).appendChild(opt);
      });
      select.appendChild(groupFamily);
      select.appendChild(groupStudent);
      select.addEventListener('change', function () {
        var newScope = select.value ? (ALL_FIELD_OPTIONS.find(function (f) { return f.id === select.value; }).scope === 'family' ? 'family' : 'block') : scope;
        window.MVSchema.applyOverride(state.mapping, idx, select.value || null, newScope);
        rebuildRecords();
        renderMappingTab();
      });

      var tr = el('tr', {}, [
        el('td', { text: String(idx) }),
        el('td', { class: 'wrap', text: header }),
        el('td', { text: fieldLabel(col.fieldId) }),
        el('td', { text: info.group }),
        el('td', { html: confBadge }),
        el('td', {}, [select])
      ]);
      tbody.appendChild(tr);
    });

    var notice = $('#mappingUnmappedNotice');
    notice.innerHTML = m.unmapped.length
      ? '<p class="small" style="color:var(--warning);">⚠ ' + m.unmapped.length + ' column(s) were not confidently classified. They are preserved in exports but excluded from KPIs unless you map them above.</p>'
      : '<p class="small" style="color:var(--success);">✓ All columns classified.</p>';
  }

  $('#btnSaveProfile').addEventListener('click', function () {
    if (!state.mapping) { toast('Import a file first.', 'error'); return; }
    var name = prompt('Name this mapping profile (e.g. "McKinney-Vento Annual Survey"):', state.fileName.replace(/\.(csv|xlsx)$/i, ''));
    if (!name) return;
    var overrides = [];
    state.mapping.familyColumns.concat(state.mapping.blocks.reduce(function (acc, b) { return acc.concat(b.columns); }, []))
      .filter(function (c) { return c.manual; })
      .forEach(function (c) { overrides.push({ header: c.header, fieldId: c.fieldId, scope: window.MVSchema.FAMILY_FIELDS.some(function (f) { return f.id === c.fieldId; }) ? 'family' : 'block' }); });
    window.MVStore.saveMappingProfile(name, state.headers, overrides);
    renderProfilesList();
    toast('Mapping profile "' + name + '" saved with ' + overrides.length + ' manual override(s).', 'success');
  });

  // ---------------------------------------------------------------- schools tab
  function renderSchoolsTab() {
    var byRaw = {};
    state.students.forEach(function (s) {
      if (!s.schoolNeedsReview || !s.schoolNameRaw) return;
      var key = s.schoolNameRaw;
      if (!byRaw[key]) byRaw[key] = { raw: key, count: 0, suggested: s.schoolNameCorrected, score: s.schoolMatchScore };
      byRaw[key].count++;
    });
    var list = Object.values(byRaw).sort(function (a, b) { return b.count - a.count; });

    var badge = $('#badgeSchools');
    if (list.length) { badge.textContent = list.length; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');

    var officialNames = ((window.MVStore.getCustomSchoolList() || {}).schools || window.MVSchoolsData.SCHOOLS).map(function (s) { return s.name; }).sort();

    var tbody = $('#schoolsTable tbody');
    tbody.innerHTML = '';
    list.forEach(function (item) {
      var select = el('select', { style: 'min-width:220px;' });
      select.appendChild(el('option', { value: '' }, [document.createTextNode('— keep raw value —')]));
      officialNames.forEach(function (name) {
        var opt = el('option', { value: name }, [document.createTextNode(name)]);
        if (name === item.suggested) opt.selected = true;
        select.appendChild(opt);
      });
      var confirmBtn = el('button', { class: 'btn btn-sm btn-primary', text: 'Apply' });
      confirmBtn.addEventListener('click', function () {
        var chosen = select.value || item.raw;
        window.MVStore.setSchoolOverride(item.raw, chosen);
        rebuildRecords();
        toast('Saved correction: "' + item.raw + '" → "' + chosen + '"', 'success');
      });

      var scoreBadge = item.score >= 0.4 ? 'badge-warning' : 'badge-danger';
      var tr = el('tr', { class: 'school-review-row', 'data-raw': item.raw.toLowerCase() }, [
        el('td', { text: item.raw }),
        el('td', { text: String(item.count) }),
        el('td', {}, [select]),
        el('td', { html: '<span class="badge ' + scoreBadge + '">' + Math.round(item.score * 100) + '%</span>' }),
        el('td', {}, [confirmBtn])
      ]);
      tbody.appendChild(tr);
    });

    if (!list.length) {
      tbody.appendChild(el('tr', {}, [el('td', { colspan: '5', class: 'muted', text: 'No school names currently need review. 🎉' })]));
    }
  }
  $('#schoolSearchFilter').addEventListener('input', function () {
    var q = this.value.toLowerCase();
    $all('#schoolsTable tbody tr').forEach(function (tr) {
      var raw = tr.getAttribute('data-raw') || '';
      tr.style.display = raw.indexOf(q) === -1 ? 'none' : '';
    });
  });

  // ---------------------------------------------------------------- quality tab
  function renderQualityTab() {
    var badge = $('#badgeQuality');
    if (state.issues.length) { badge.textContent = state.issues.length; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
    renderQualityList();
  }
  function renderQualityList() {
    var level = $('#qualityLevelFilter').value;
    var list = state.issues.filter(function (i) { return !level || i.level === level; });
    var box = $('#qualityList');
    box.innerHTML = '';
    if (!list.length) { box.innerHTML = '<p class="muted small" style="padding:10px;">No issues at this level. 🎉</p>'; return; }
    var levelBadge = { error: 'badge-danger', warning: 'badge-warning', review: 'badge-info' };
    list.slice(0, 500).forEach(function (issue) {
      var fam = state.families.find(function (f) { return f.id === issue.familyId; });
      var row = el('div', { class: 'issue-row' }, [
        el('div', {}, [
          el('span', { class: 'badge ' + (levelBadge[issue.level] || 'badge-muted'), text: issue.level }),
          el('span', { class: 'small muted', text: '  ' + (fam ? fam.parentName || '(no name)' : issue.familyId) + '  ·  field: ' + issue.field })
        ]),
        el('div', { class: 'msg', text: issue.message })
      ]);
      box.appendChild(row);
    });
    if (list.length > 500) box.appendChild(el('p', { class: 'small muted', text: '…and ' + (list.length - 500) + ' more.' }));
  }
  $('#qualityLevelFilter').addEventListener('change', renderQualityList);

  // ---------------------------------------------------------------- dashboard filters
  function populateDashboardFilterOptions() {
    var schoolSet = {}, categorySet = {}, needSet = {}, sizeSet = {};
    state.students.forEach(function (s) { if (s.schoolNameCorrected) schoolSet[s.schoolNameCorrected] = 1; if (s.uniformSizeGroup) sizeSet[s.uniformSizeGroup] = 1; });
    state.families.forEach(function (f) {
      if (f.eligibility && f.eligibility.category) categorySet[f.eligibility.category] = 1;
      (f.householdNeeds || []).forEach(function (n) { needSet[n] = 1; });
    });
    fillSelect('#filterSchool', Object.keys(schoolSet).sort(), 'All Schools');
    fillSelect('#filterCategory', Object.keys(categorySet).sort(), 'All Categories');
    fillSelect('#filterNeed', Object.keys(needSet).sort(), 'All Needs');
    fillSelect('#filterSizeGroup', Object.keys(sizeSet).sort(), 'All Sizes');
  }
  function fillSelect(sel, values, allLabel) {
    var el2 = $(sel);
    var current = el2.value;
    el2.innerHTML = '';
    el2.appendChild(el('option', { value: '' }, [document.createTextNode(allLabel)]));
    values.forEach(function (v) { el2.appendChild(el('option', { value: v }, [document.createTextNode(v)])); });
    if (values.indexOf(current) !== -1) el2.value = current;
  }
  ['filterSchool', 'filterEligibility', 'filterCategory', 'filterNeed', 'filterSizeGroup'].forEach(function (id) {
    $('#' + id).addEventListener('change', function () {
      var map = { filterSchool: 'school', filterEligibility: 'eligibility', filterCategory: 'category', filterNeed: 'need', filterSizeGroup: 'sizeGroup' };
      state.filters[map[id]] = this.value;
      state.records.page = 1;
      renderDashboard();
      renderRecordsTab();
    });
  });
  $('#btnResetFilters').addEventListener('click', function () {
    state.filters = { school: '', eligibility: '', category: '', need: '', sizeGroup: '' };
    ['filterSchool', 'filterEligibility', 'filterCategory', 'filterNeed', 'filterSizeGroup'].forEach(function (id) { $('#' + id).value = ''; });
    renderDashboard();
    renderRecordsTab();
  });

  function eligibilityBucket(f) {
    if (f.eligibility.needsReview) return 'review';
    return f.eligibility.eligible ? 'eligible' : 'not_eligible';
  }

  function familyMatchesFilters(f) {
    var filt = state.filters;
    if (filt.eligibility && eligibilityBucket(f) !== filt.eligibility) return false;
    if (filt.category && f.eligibility.category !== filt.category) return false;
    if (filt.need && (f.householdNeeds || []).indexOf(filt.need) === -1) return false;
    if (filt.school || filt.sizeGroup) {
      var studs = studentsOfFamily(f.id);
      if (filt.school && !studs.some(function (s) { return s.schoolNameCorrected === filt.school; })) return false;
      if (filt.sizeGroup && !studs.some(function (s) { return s.uniformSizeGroup === filt.sizeGroup; })) return false;
    }
    return true;
  }
  function studentsOfFamily(familyId) {
    return state.students.filter(function (s) { return s.familyId === familyId; });
  }
  function getFilteredFamilies() { return state.families.filter(familyMatchesFilters); }
  function getFilteredStudents() {
    var famIds = {};
    getFilteredFamilies().forEach(function (f) { famIds[f.id] = 1; });
    return state.students.filter(function (s) { return famIds[s.familyId]; });
  }

  // ---------------------------------------------------------------- dashboard render
  function renderDashboard() {
    var families = getFilteredFamilies();
    var students = getFilteredStudents();

    var eligibleCount = families.filter(function (f) { return eligibilityBucket(f) === 'eligible'; }).length;
    var notEligibleCount = families.filter(function (f) { return eligibilityBucket(f) === 'not_eligible'; }).length;
    var reviewCount = families.filter(function (f) { return eligibilityBucket(f) === 'review'; }).length;
    var uniformNeedCount = students.filter(function (s) { return s.needsUniform === true; }).length;
    var schoolsRepresented = {};
    students.forEach(function (s) { if (s.schoolNameCorrected) schoolsRepresented[s.schoolNameCorrected] = 1; });
    var duplicateCount = state.issues.filter(function (i) { return i.field === 'duplicate' && families.some(function (f) { return f.id === i.familyId; }); }).length;

    $('#kpiRow').innerHTML =
      kpiHtml(families.length, 'Families (filtered)', 'primary') +
      kpiHtml(students.length, 'Students (filtered)', 'primary') +
      kpiHtml(eligibleCount, 'Eligible — McKinney-Vento', 'success') +
      kpiHtml(notEligibleCount, 'Not Eligible (Stable Housing)', 'danger') +
      kpiHtml(reviewCount, 'Needs Review', 'warning') +
      kpiHtml(uniformNeedCount, 'Students Needing Uniforms', 'warning') +
      kpiHtml(Object.keys(schoolsRepresented).length, 'Schools Represented', 'primary') +
      kpiHtml(duplicateCount, 'Possible Duplicate Submissions', 'warning');

    // Category donut
    var catCounts = {};
    families.forEach(function (f) { var c = f.eligibility.category; catCounts[c] = (catCounts[c] || 0) + 1; });
    window.MVCharts.drawDonutChart($('#chartCategory'), Object.keys(catCounts).map(function (k) { return { label: k, value: catCounts[k] }; }));

    // Eligibility donut
    var eligData = [
      { label: 'Eligible', value: eligibleCount, color: '#16a34a' },
      { label: 'Not Eligible', value: notEligibleCount, color: '#dc2626' },
      { label: 'Needs Review', value: reviewCount, color: '#d97706' }
    ].filter(function (d) { return d.value > 0; });
    window.MVCharts.drawDonutChart($('#chartEligibility'), eligData);

    // Schools bar (top 15)
    var schoolCounts = {};
    students.forEach(function (s) { if (s.schoolNameCorrected) schoolCounts[s.schoolNameCorrected] = (schoolCounts[s.schoolNameCorrected] || 0) + 1; });
    var schoolBars = Object.keys(schoolCounts).map(function (k) { return { label: k, value: schoolCounts[k] }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 15);
    window.MVCharts.drawBarChart($('#chartSchools'), schoolBars, { color: '#2563eb' });

    // Needs bar
    var needCounts = {};
    families.forEach(function (f) { (f.householdNeeds || []).forEach(function (n) { needCounts[n] = (needCounts[n] || 0) + 1; }); });
    var needBars = Object.keys(needCounts).map(function (k) { return { label: k, value: needCounts[k] }; }).sort(function (a, b) { return b.value - a.value; });
    window.MVCharts.drawBarChart($('#chartNeeds'), needBars, { color: '#7c3aed' });

    // Uniform size group bar
    var sizeCounts = {};
    students.forEach(function (s) { if (s.uniformSizeGroup) sizeCounts[s.uniformSizeGroup] = (sizeCounts[s.uniformSizeGroup] || 0) + 1; });
    var sizeBars = Object.keys(sizeCounts).map(function (k) { return { label: k, value: sizeCounts[k] }; }).sort(function (a, b) { return b.value - a.value; });
    window.MVCharts.drawBarChart($('#chartUniformGroup'), sizeBars, { color: '#0891b2' });

    // Housing safety bar
    var safetyCounts = {};
    families.forEach(function (f) { var v = clean.trim(f.housingSafeAdequate) || '(blank)'; safetyCounts[v] = (safetyCounts[v] || 0) + 1; });
    var safetyBars = Object.keys(safetyCounts).map(function (k) { return { label: k, value: safetyCounts[k] }; }).sort(function (a, b) { return b.value - a.value; });
    window.MVCharts.drawBarChart($('#chartSafety'), safetyBars, { color: '#db2777' });
  }

  window.addEventListener('resize', debounce(function () { if (state.families.length) renderDashboard(); }, 200));
  function debounce(fn, ms) {
    var t;
    return function () {
      var ctx = this, a = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, a); }, ms);
    };
  }

  // ---------------------------------------------------------------- export
  function familyToRow(f) {
    var studs = studentsOfFamily(f.id);
    return {
      'Family ID': f.id,
      'Timestamp': f.timestamp,
      'Parent/Guardian Name': f.parentName,
      'Current Address': f.currentAddress,
      'Contact Phone': f.contactPhone,
      'Contact Email': f.contactEmail,
      'Living Situation (raw)': f.livingSituation,
      'Eligibility Category': f.eligibility.category,
      'McKinney-Vento Eligible': f.eligibility.eligible === true ? 'Yes' : f.eligibility.eligible === false ? 'No' : 'Needs Review',
      'Eligibility Basis': f.eligibility.basis,
      'Staying With Others': f.stayingWithOthers === true ? 'Yes' : f.stayingWithOthers === false ? 'No' : '',
      'Time Limit On Stay': f.timeLimitOnStay === true ? 'Yes' : f.timeLimitOnStay === false ? 'No' : '',
      'Housing Safe/Adequate': f.housingSafeAdequate,
      'Housing Intended Permanent': f.housingPermanent,
      'Number of Students': studs.length,
      'Household Needs': (f.householdNeeds || []).join('; '),
      'Household Needs Description': f.householdNeedsDescription,
      'Student Names': studs.map(function (s) { return s.studentName; }).join('; '),
      'Schools': studs.map(function (s) { return s.schoolNameCorrected; }).join('; '),
      'Possible Nearby Schools (same ZIP, approximate)': (f.nearbySchools || []).join('; '),
      'Official Zoning Map': window.MVZoning.ZONING_MAP_URL
    };
  }
  function studentToRow(s) {
    var f = state.families.find(function (x) { return x.id === s.familyId; });
    return {
      'Student ID': s.id,
      'Family ID': s.familyId,
      'Parent/Guardian Name': f ? f.parentName : '',
      'Student Name': s.studentName,
      'Date of Birth': s.dob,
      'Age': s.dobAge,
      'School (as entered)': s.schoolNameRaw,
      'School (corrected)': s.schoolNameCorrected,
      'School Address': s.schoolAddress,
      'School Zip': s.schoolZip,
      'School Grades Served': s.schoolGrades,
      'School Management Type': s.schoolManagementType,
      'School Match Method': s.schoolMatchMethod,
      'School Match Confidence': s.schoolMatchScore != null ? Math.round(s.schoolMatchScore * 100) + '%' : '',
      'Needs Uniform': s.needsUniform === true ? 'Yes' : s.needsUniform === false ? 'No' : '',
      'Uniform Size Group': s.uniformSizeGroup,
      'Shirt Size': s.uniformShirtSize,
      'Pants Size': s.uniformPantsSize,
      'Uniform Color': s.uniformColor,
      'Household Needs': f ? (f.householdNeeds || []).join('; ') : '',
      'Possible Nearby Schools (same ZIP, approximate)': (s.nearbySchools || []).join('; '),
      'Official Zoning Map': window.MVZoning.ZONING_MAP_URL,
      'McKinney-Vento Eligible': f ? (f.eligibility.eligible === true ? 'Yes' : f.eligibility.eligible === false ? 'No' : 'Needs Review') : '',
      'Eligibility Category': f ? f.eligibility.category : ''
    };
  }
  function objectRowsToTable(rows, keys) {
    var headers = keys || (rows.length ? Object.keys(rows[0]) : []);
    var body = rows.map(function (r) { return headers.map(function (h) { return r[h]; }); });
    return { headers: headers, rows: body };
  }
  function rowsToCsv(rows, keys) {
    if (!rows.length) return '';
    var table = objectRowsToTable(rows, keys);
    var out = [table.headers].concat(table.rows);
    return window.MVCsv.stringify(out);
  }

  // Full-fidelity column sets (CSV/Excel) come from familyToRow/studentToRow
  // directly. PDF/Word are print-formatted reports, not data dumps, so they
  // use a condensed column set that actually fits on a page.
  var REPORT_FAMILY_KEYS = ['Parent/Guardian Name', 'Current Address', 'Living Situation (raw)', 'Eligibility Category', 'McKinney-Vento Eligible', 'Number of Students', 'Household Needs'];
  var REPORT_STUDENT_KEYS = ['Student Name', 'School (corrected)', 'Date of Birth', 'Age', 'Needs Uniform', 'Uniform Size Group', 'Household Needs', 'McKinney-Vento Eligible'];

  function currentExportSelection() {
    var mode = $('#exportDataType').value; // 'families' | 'students'
    if (mode === 'families') {
      return { mode: mode, rows: getFilteredFamilies().map(familyToRow), reportKeys: REPORT_FAMILY_KEYS, label: 'families' };
    }
    return { mode: mode, rows: getFilteredStudents().map(studentToRow), reportKeys: REPORT_STUDENT_KEYS, label: 'students' };
  }

  $('#btnExportCSV').addEventListener('click', function () {
    var sel = currentExportSelection();
    if (!sel.rows.length) return toast('No ' + sel.label + ' match the current filters.', 'error');
    downloadBlob(rowsToCsv(sel.rows), sel.label + '_filtered.csv', 'text/csv;charset=utf-8;');
  });

  $('#btnExportXLSX').addEventListener('click', function () {
    var sel = currentExportSelection();
    if (!sel.rows.length) return toast('No ' + sel.label + ' match the current filters.', 'error');
    var table = objectRowsToTable(sel.rows);
    var bytes = window.MVXlsxWriter.buildXlsx(sel.label, table.headers, table.rows);
    downloadBlob(bytes, sel.label + '_filtered.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  $('#btnExportPDF').addEventListener('click', function () {
    var sel = currentExportSelection();
    if (!sel.rows.length) return toast('No ' + sel.label + ' match the current filters.', 'error');
    var table = objectRowsToTable(sel.rows, sel.reportKeys);
    var title = 'McKinney-Vento Survey Manager — ' + (sel.label === 'families' ? 'Families' : 'Students') + ' Report';
    var subtitle = table.rows.length + ' record(s) · exported ' + new Date().toLocaleString() + ' · filters applied as shown on the Dashboard';
    var bytes = window.MVPdfWriter.buildPdf(title, subtitle, table.headers, table.rows);
    downloadBlob(bytes, sel.label + '_filtered.pdf', 'application/pdf');
  });

  $('#btnExportDOCX').addEventListener('click', function () {
    var sel = currentExportSelection();
    if (!sel.rows.length) return toast('No ' + sel.label + ' match the current filters.', 'error');
    var table = objectRowsToTable(sel.rows, sel.reportKeys);
    var title = 'McKinney-Vento Survey Manager — ' + (sel.label === 'families' ? 'Families' : 'Students') + ' Report';
    var subtitle = table.rows.length + ' record(s) · exported ' + new Date().toLocaleString();
    var bytes = window.MVDocxWriter.buildDocx(title, subtitle, table.headers, table.rows);
    downloadBlob(bytes, sel.label + '_filtered.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  $('#btnExportJSON').addEventListener('click', function () {
    var families = getFilteredFamilies().map(function (f) {
      var copy = Object.assign({}, f);
      copy.students = studentsOfFamily(f.id);
      return copy;
    });
    if (!families.length) return toast('No families match the current filters.', 'error');
    downloadBlob(JSON.stringify(families, null, 2), 'mckinney_vento_filtered.json', 'application/json');
  });

  // ---------------------------------------------------------------- records tab
  $('#recordsMode').addEventListener('change', function () { state.records.mode = this.value; state.records.page = 1; renderRecordsTab(); });
  $('#recordsSearch').addEventListener('input', debounce(function () { state.records.search = this.value.toLowerCase(); state.records.page = 1; renderRecordsTab(); }, 200));
  $('#recordsPrev').addEventListener('click', function () { if (state.records.page > 1) { state.records.page--; renderRecordsTab(); } });
  $('#recordsNext').addEventListener('click', function () { state.records.page++; renderRecordsTab(); });

  var FAMILY_COLUMNS = ['parentName', 'currentAddress', 'livingSituation', 'eligibility.category', 'eligibility.eligible', 'studentCount', 'householdNeeds', 'nearbySchools', 'checkZoning'];
  var FAMILY_HEADERS = ['Parent/Guardian', 'Address', 'Living Situation', 'Category', 'Eligible', '# Students', 'Household Needs', 'Possible Nearby Schools (same ZIP)', 'Zoning'];
  var STUDENT_COLUMNS = ['studentName', 'schoolNameCorrected', 'schoolAddress', 'schoolZip', 'schoolGrades', 'schoolManagementType', 'dob', 'dobAge', 'needsUniform', 'uniformSizeGroup', 'householdNeeds', 'nearbySchools', 'checkZoning', 'schoolNeedsReview'];
  var STUDENT_HEADERS = ['Student Name', 'School', 'School Address', 'Zip', 'Grades Served', 'Management Type', 'DOB', 'Age', 'Needs Uniform', 'Size Group', 'Household Needs', 'Possible Nearby Schools (same ZIP)', 'Zoning', 'School Flagged'];

  // "Check Zoning" never auto-transmits the address anywhere - it only
  // copies it to the clipboard (a browser-local action) and opens the
  // district's own live zoning map in a new tab for the user to paste
  // it into themselves. See js/zoning.js for why this app doesn't try to
  // determine zoning itself.
  function handleCheckZoningClick(address) {
    var addr = clean.trim(address);
    if (!addr) { toast('No address on file for this record.', 'error'); return; }
    var opened = window.open(window.MVZoning.ZONING_MAP_URL, '_blank', 'noopener');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(function () {
        toast(opened
          ? 'Address copied — paste it into the map’s search box to find zoned schools.'
          : 'Address copied. Pop-up blocked — allow pop-ups for this page, or open the zoning map manually and paste it in.',
          opened ? 'success' : 'error');
      }).catch(function () {
        toast(opened ? 'Opened the zoning map. Address to look up: ' + addr : 'Pop-up blocked. Address to look up: ' + addr, opened ? 'success' : 'error');
      });
    } else {
      toast(opened ? 'Opened the zoning map. Address to look up: ' + addr : 'Pop-up blocked. Address to look up: ' + addr, opened ? 'success' : 'error');
    }
  }

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? null : o[k]; }, obj);
  }

  function renderRecordsTab() {
    var mode = state.records.mode;
    var thead = $('#recordsTable thead');
    var tbody = $('#recordsTable tbody');
    var headers = mode === 'families' ? FAMILY_HEADERS : STUDENT_HEADERS;
    thead.innerHTML = '<tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>';

    var data = mode === 'families' ? getFilteredFamilies() : getFilteredStudents();
    var search = state.records.search;
    if (search) {
      data = data.filter(function (r) {
        var haystack = mode === 'families'
          ? [r.parentName, r.currentAddress, r.livingSituation].join(' ').toLowerCase()
          : [r.studentName, r.schoolNameCorrected, r.schoolNameRaw].join(' ').toLowerCase();
        return haystack.indexOf(search) !== -1;
      });
    }

    var total = data.length;
    var pageSize = state.records.pageSize;
    var maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (state.records.page > maxPage) state.records.page = maxPage;
    var start = (state.records.page - 1) * pageSize;
    var pageData = data.slice(start, start + pageSize);

    tbody.innerHTML = '';
    var cols = mode === 'families' ? FAMILY_COLUMNS : STUDENT_COLUMNS;
    pageData.forEach(function (r) {
      var tr = document.createElement('tr');
      var ownerFamily = mode === 'students' ? state.families.find(function (f) { return f.id === r.familyId; }) : r;
      cols.forEach(function (c) {
        if (c === 'checkZoning') {
          var td = document.createElement('td');
          var btn = el('button', { class: 'btn btn-sm', text: '📍 Check Zoning' });
          btn.addEventListener('click', function () { handleCheckZoningClick(ownerFamily ? ownerFamily.currentAddress : ''); });
          td.appendChild(btn);
          tr.appendChild(td);
          return;
        }
        var val;
        if (c === 'householdNeeds' && mode === 'students') {
          val = ownerFamily ? ownerFamily.householdNeeds : [];
        } else {
          val = getPath(r, c);
        }
        if (Array.isArray(val)) val = val.join(', ');
        if (val === true) val = 'Yes';
        if (val === false) val = 'No';
        if (c === 'eligibility.eligible') val = val === 'Yes' ? '✅ Yes' : val === 'No' ? '⛔ No' : '❓ Review';
        if (c === 'schoolNeedsReview') val = val === 'Yes' ? '⚠️ Yes' : '';
        var td = document.createElement('td');
        td.textContent = val == null ? '' : val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="' + headers.length + '" class="muted">No records match.</td></tr>';
    }

    $('#recordsCount').textContent = total + ' record(s)';
    $('#recordsPage').textContent = 'Page ' + state.records.page + ' / ' + maxPage;
  }

  // ---------------------------------------------------------------- settings tab
  function renderSettingsTab() {
    var custom = window.MVStore.getCustomSchoolList();
    $('#schoolListCount').textContent = custom ? custom.schools.length : window.MVSchoolsData.SCHOOLS.length;
    renderProfilesList();
    renderOverridesList();
  }
  function renderProfilesList() {
    var box = $('#profilesList');
    var profiles = window.MVStore.getMappingProfiles();
    box.innerHTML = '';
    if (!profiles.length) { box.innerHTML = '<p class="muted">No saved profiles yet.</p>'; return; }
    profiles.forEach(function (p) {
      var row = el('div', { class: 'flex-between', style: 'padding:6px 0;border-bottom:1px solid var(--border);' }, [
        el('div', {}, [
          el('div', { text: p.name }),
          el('div', { class: 'muted small', text: p.headers.length + ' columns · ' + p.overrides.length + ' overrides · saved ' + new Date(p.savedAt).toLocaleDateString() })
        ]),
        el('button', { class: 'btn btn-sm btn-danger', text: 'Delete' }, [])
      ]);
      row.querySelector('button').addEventListener('click', function () {
        window.MVStore.deleteMappingProfile(p.id);
        renderProfilesList();
      });
      box.appendChild(row);
    });
  }
  function renderOverridesList() {
    var box = $('#overridesList');
    var overrides = window.MVStore.getSchoolOverrides();
    var keys = Object.keys(overrides);
    box.innerHTML = '';
    if (!keys.length) { box.innerHTML = '<p class="muted">No manual school corrections saved yet.</p>'; return; }
    keys.forEach(function (k) {
      var row = el('div', { class: 'flex-between', style: 'padding:6px 0;border-bottom:1px solid var(--border);' }, [
        el('div', { text: k + ' → ' + overrides[k] }),
        el('button', { class: 'btn btn-sm btn-danger', text: 'Remove' })
      ]);
      row.querySelector('button').addEventListener('click', function () {
        window.MVStore.removeSchoolOverride(k);
        renderOverridesList();
        if (state.families.length) rebuildRecords();
      });
      box.appendChild(row);
    });
  }

  $('#btnUploadSchoolList').addEventListener('click', function () { $('#schoolListFileInput').click(); });
  $('#schoolListFileInput').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    var isXlsx = /\.xlsx$/i.test(file.name);
    reader.onload = function (ev) {
      try {
        var headers, rows;
        if (isXlsx) {
          var wb = window.MVXlsx.parse(ev.target.result);
          var sheetName = pickBestSheet(wb.sheets, wb.sheetNames);
          var allRows = wb.sheets[sheetName].rows;
          headers = allRows[0].map(String);
          rows = allRows.slice(1);
        } else {
          var parsed = window.MVCsv.parse(ev.target.result);
          headers = parsed.rows[0];
          rows = parsed.rows.slice(1);
        }
        // The main school name column is required; address/zip/grades/
        // management type are optional extras carried through if the
        // replacement file happens to have equivalent columns, using the
        // same header-synonym matching as the main survey import so a
        // future year's list works without any code changes.
        var REF_FIELDS = [
          { id: 'name', synonyms: ['school name', 'name of school', 'nombre de la escuela'], required: true },
          { id: 'address', synonyms: ['address', 'street address'], required: false },
          { id: 'zip', synonyms: ['zip', 'zip code', 'postal code'], required: false },
          { id: 'grades', synonyms: ['current grades served', 'grades served', 'grade configuration'], required: false },
          { id: 'mgmt', synonyms: ['management type'], required: false }
        ];
        var colIdxByField = {};
        REF_FIELDS.forEach(function (field) {
          var best = -1, bestFieldScore = 0;
          headers.forEach(function (h, i) {
            var c = window.MVSchema.classifyHeader(h, [{ id: field.id, synonyms: field.synonyms }]);
            if (c && c.score > bestFieldScore) { bestFieldScore = c.score; best = i; }
          });
          if (best !== -1) colIdxByField[field.id] = best;
        });
        if (colIdxByField.name == null) { toast('Could not find a "School Name" column in that file.', 'error'); return; }
        var schools = rows.map(function (r) {
          return {
            name: clean.trim(r[colIdxByField.name]),
            address: colIdxByField.address != null ? clean.trim(r[colIdxByField.address]) : '',
            zip: colIdxByField.zip != null ? clean.trim(r[colIdxByField.zip]) : '',
            grades: colIdxByField.grades != null ? clean.trim(r[colIdxByField.grades]) : '',
            mgmt: colIdxByField.mgmt != null ? clean.trim(r[colIdxByField.mgmt]) : ''
          };
        }).filter(function (s) { return s.name; });
        window.MVStore.setCustomSchoolList(schools, {});
        toast('Replaced school reference list with ' + schools.length + ' schools from "' + file.name + '".', 'success');
        renderSettingsTab();
        if (state.families.length) rebuildRecords();
      } catch (err) {
        console.error(err);
        toast('Could not parse that file: ' + err.message, 'error');
      }
    };
    if (isXlsx) reader.readAsArrayBuffer(file); else reader.readAsText(file, 'utf-8');
  });
  $('#btnResetSchoolList').addEventListener('click', function () {
    window.MVStore.clearCustomSchoolList();
    toast('Reset to the embedded default school list.', 'success');
    renderSettingsTab();
    if (state.families.length) rebuildRecords();
  });

  $('#btnExportSettings').addEventListener('click', function () {
    downloadBlob(JSON.stringify(window.MVStore.exportAll(), null, 2), 'mv_app_settings.json', 'application/json');
  });
  $('#btnImportSettings').addEventListener('click', function () { $('#settingsFileInput').click(); });
  $('#settingsFileInput').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        window.MVStore.importAll(JSON.parse(ev.target.result));
        toast('Settings imported.', 'success');
        renderSettingsTab();
        if (state.families.length) rebuildRecords();
      } catch (err) { toast('Invalid settings file.', 'error'); }
    };
    reader.readAsText(file, 'utf-8');
  });
  $('#btnClearSession').addEventListener('click', function () {
    if (!confirm('Clear the currently loaded dataset from memory? Saved mappings and school corrections are kept.')) return;
    state.headers = []; state.rawRows = []; state.mapping = null;
    state.families = []; state.students = []; state.issues = [];
    updateStatusBar();
    $('#importSummaryCard').style.display = 'none';
    $('#mappingTable tbody').innerHTML = '';
    renderSchoolsTab(); renderQualityTab(); renderDashboard(); renderRecordsTab();
    switchTab('import');
    toast('Dataset cleared from memory.', 'success');
  });

  // ---------------------------------------------------------------- init
  renderSettingsTab();
  updateStatusBar();
  if (window.claude && window.claude.downloads) {
    // The claude.ai downloads bridge only accepts a fixed extension
    // allowlist (images, mp4/webm, txt/json/md) - .xlsx/.docx/.pdf will
    // always be rejected there, so don't show buttons that can only fail.
    $('#previewDownloadNote').classList.remove('hidden');
    $all('.requires-full-browser').forEach(function (btn) { btn.classList.add('hidden'); });
  }
})();
