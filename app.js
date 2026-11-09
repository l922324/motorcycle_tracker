(function () {
  'use strict';

  const STORAGE_APP = 'bike_tracker_app';
  const STORAGE_LEGACY = {
    bike: 'bike_tracker_bike',
    fuel: 'bike_tracker_fuel',
    service: 'bike_tracker_service',
    parts: 'bike_tracker_parts'
  };

  var ICON_EDIT = '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var ICON_DELETE = '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const ROAD_TAX_REMINDER_DAYS = 14;
  const REMINDER_THRESHOLD = 0.85;
  const SESSION_DISMISS_PART_TOAST = 'bike_tracker_dismissPartToast';

  function getStored(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function createEmptyState() {
    return {
      version: 2,
      bikes: [],
      selectedBikeId: null,
      dataByBikeId: {}
    };
  }

  function ensureBikeDataSlot(state, bikeId) {
    if (!state.dataByBikeId[bikeId]) {
      state.dataByBikeId[bikeId] = { fuel: [], service: [], parts: [] };
    } else {
      ['fuel', 'service', 'parts'].forEach(function (k) {
        if (!Array.isArray(state.dataByBikeId[bikeId][k])) state.dataByBikeId[bikeId][k] = [];
      });
    }
  }

  function normalizeBikeRecord(raw) {
    const id = raw && raw.id ? raw.id : generateId();
    const b = raw && typeof raw === 'object' ? raw : {};
    return {
      id: id,
      name: b.name != null ? String(b.name) : '',
      model: b.model != null ? String(b.model) : '',
      engineCc: b.engineCc != null && b.engineCc !== '' ? parseInt(b.engineCc, 10) : null,
      manufacturedDate: b.manufacturedDate || null,
      purchaseDate: b.purchaseDate || '',
      chassisNumber: b.chassisNumber != null ? String(b.chassisNumber) : '',
      engineNumber: b.engineNumber != null ? String(b.engineNumber) : '',
      mileage: b.mileage != null && b.mileage !== '' ? parseInt(b.mileage, 10) : null,
      obuNumber: b.obuNumber != null ? String(b.obuNumber) : '',
      vehicleNo: b.vehicleNo != null ? String(b.vehicleNo) : '',
      roadTaxExpiryDate: b.roadTaxExpiryDate || null,
      coeExpiry: b.coeExpiry || null,
      insuranceCompany: b.insuranceCompany != null ? String(b.insuranceCompany) : '',
      insurancePolicyNumber: b.insurancePolicyNumber != null ? String(b.insurancePolicyNumber) : '',
      insurancePeriodStart: b.insurancePeriodStart || null,
      insurancePeriodEnd: b.insurancePeriodEnd || null,
      policyDocName: b.policyDocName || null,
      policyDocData: b.policyDocData || null,
      motorDocName: b.motorDocName || null,
      motorDocData: b.motorDocData || null,
      documents: Array.isArray(b.documents) ? b.documents.slice() : []
    };
  }

  function migrateFromLegacy() {
    const oldBike = getStored(STORAGE_LEGACY.bike, null);
    const fuel = getStored(STORAGE_LEGACY.fuel, null);
    const svc = getStored(STORAGE_LEGACY.service, null);
    const parts = getStored(STORAGE_LEGACY.parts, null);
    const hasFuel = Array.isArray(fuel) && fuel.length > 0;
    const hasSvc = Array.isArray(svc) && svc.length > 0;
    const hasParts = Array.isArray(parts) && parts.length > 0;
    const hasLegacy = !!oldBike || hasFuel || hasSvc || hasParts;
    const state = createEmptyState();
    if (hasLegacy) {
      const id = oldBike && oldBike.id ? oldBike.id : generateId();
      const bike = normalizeBikeRecord(oldBike ? { ...oldBike, id: id } : { id: id, name: '', model: '' });
      state.bikes = [bike];
      state.selectedBikeId = id;
      state.dataByBikeId[id] = {
        fuel: hasFuel ? fuel : [],
        service: hasSvc ? svc : [],
        parts: hasParts ? parts : []
      };
    }
    setStored(STORAGE_APP, state);
    try {
      Object.values(STORAGE_LEGACY).forEach(function (k) { localStorage.removeItem(k); });
    } catch (_) {}
    return state;
  }

  function getAppState() {
    let s = getStored(STORAGE_APP, null);
    if (s == null) {
      s = migrateFromLegacy();
    } else {
      var fixed = false;
      if (s.version !== 2) {
        s.version = 2;
        fixed = true;
      }
      if (!Array.isArray(s.bikes)) {
        s.bikes = [];
        fixed = true;
      }
      if (!s.dataByBikeId || typeof s.dataByBikeId !== 'object') {
        s.dataByBikeId = {};
        fixed = true;
      }
      if (fixed) saveAppState(s);
    }
    s.bikes.forEach(function (bike) {
      ensureBikeDataSlot(s, bike.id);
    });
    if (s.bikes.length && (!s.selectedBikeId || !s.bikes.some(function (b) { return b.id === s.selectedBikeId; }))) {
      s.selectedBikeId = s.bikes[0].id;
      setStored(STORAGE_APP, s);
    }
    if (!s.bikes.length) {
      s.selectedBikeId = null;
      setStored(STORAGE_APP, s);
    }
    return s;
  }

  function saveAppState(state) {
    setStored(STORAGE_APP, state);
  }

  function getSelectedBikeId() {
    return getAppState().selectedBikeId;
  }

  function setSelectedBikeId(id) {
    const s = getAppState();
    if (!id || !s.bikes.some(function (b) { return b.id === id; })) return;
    s.selectedBikeId = id;
    saveAppState(s);
  }

  function deleteBikeById(bikeId) {
    const s = getAppState();
    s.bikes = s.bikes.filter(function (b) { return b.id !== bikeId; });
    delete s.dataByBikeId[bikeId];
    if (s.selectedBikeId === bikeId) {
      s.selectedBikeId = s.bikes.length ? s.bikes[0].id : null;
    }
    saveAppState(s);
  }

  function getBike() {
    const s = getAppState();
    if (!s.selectedBikeId) return null;
    const b = s.bikes.find(function (x) { return x.id === s.selectedBikeId; });
    return b || null;
  }

  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error('File too large (max 2MB)'));
        return;
      }
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  var MAX_JSON_IMPORT_BYTES = 50 * 1024 * 1024;

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      if (file.size > MAX_JSON_IMPORT_BYTES) {
        reject(new Error('File too large (max 50MB)'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(file);
    });
  }

  function getFuelList() {
    const id = getSelectedBikeId();
    if (!id) return [];
    const s = getAppState();
    return (s.dataByBikeId[id] && s.dataByBikeId[id].fuel) ? s.dataByBikeId[id].fuel.slice() : [];
  }

  function getServiceList() {
    const id = getSelectedBikeId();
    if (!id) return [];
    const s = getAppState();
    return (s.dataByBikeId[id] && s.dataByBikeId[id].service) ? s.dataByBikeId[id].service.slice() : [];
  }

  function getParts() {
    const id = getSelectedBikeId();
    if (!id) return [];
    const s = getAppState();
    const arr = s.dataByBikeId[id] && s.dataByBikeId[id].parts;
    return Array.isArray(arr) ? arr.slice() : [];
  }

  function saveBike(bike) {
    const s = getAppState();
    ensureBikeDataSlot(s, bike.id);
    const idx = s.bikes.findIndex(function (b) { return b.id === bike.id; });
    if (idx === -1) {
      s.bikes.push(bike);
    } else {
      s.bikes[idx] = bike;
    }
    s.selectedBikeId = bike.id;
    saveAppState(s);
  }

  function saveFuelList(list) {
    const id = getSelectedBikeId();
    if (!id) return;
    const s = getAppState();
    ensureBikeDataSlot(s, id);
    s.dataByBikeId[id].fuel = list.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveAppState(s);
  }

  function saveServiceList(list) {
    const id = getSelectedBikeId();
    if (!id) return;
    const s = getAppState();
    ensureBikeDataSlot(s, id);
    s.dataByBikeId[id].service = list.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveAppState(s);
  }

  function saveParts(parts) {
    const id = getSelectedBikeId();
    if (!id) return;
    const s = getAppState();
    ensureBikeDataSlot(s, id);
    s.dataByBikeId[id].parts = parts;
    saveAppState(s);
  }

  function getBackupData() {
    return getAppState();
  }

  function applyBackup(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup data');
    }
    if (data.version === 2 && Array.isArray(data.bikes)) {
      const next = {
        version: 2,
        bikes: data.bikes.map(function (b) { return normalizeBikeRecord(b); }),
        selectedBikeId: data.selectedBikeId || null,
        dataByBikeId: data.dataByBikeId && typeof data.dataByBikeId === 'object' ? data.dataByBikeId : {}
      };
      next.bikes.forEach(function (b) {
        ensureBikeDataSlot(next, b.id);
        const src = data.dataByBikeId && data.dataByBikeId[b.id];
        if (src) {
          if (Array.isArray(src.fuel)) next.dataByBikeId[b.id].fuel = src.fuel;
          if (Array.isArray(src.service)) next.dataByBikeId[b.id].service = src.service;
          if (Array.isArray(src.parts)) next.dataByBikeId[b.id].parts = src.parts;
        }
      });
      if (!next.bikes.length) {
        next.selectedBikeId = null;
      } else if (!next.selectedBikeId || !next.bikes.some(function (b) { return b.id === next.selectedBikeId; })) {
        next.selectedBikeId = next.bikes[0].id;
      }
      saveAppState(next);
      return;
    }
    if (data.bike || Array.isArray(data.fuel) || Array.isArray(data.service) || Array.isArray(data.parts)) {
      const id = data.bike && data.bike.id ? data.bike.id : generateId();
      const bike = normalizeBikeRecord(data.bike ? { ...data.bike, id: id } : { id: id, name: '', model: '' });
      const state = createEmptyState();
      state.bikes = [bike];
      state.selectedBikeId = id;
      state.dataByBikeId[id] = {
        fuel: Array.isArray(data.fuel) ? data.fuel : [],
        service: Array.isArray(data.service) ? data.service : [],
        parts: Array.isArray(data.parts) ? data.parts : []
      };
      saveAppState(state);
    }
  }

  /**
   * Append bike(s) from backup-style JSON without replacing the whole garage.
   * New internal IDs are assigned so imports never collide with existing bikes.
   */
  function mergeBikesFromImportData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid file');
    }
    const s = getAppState();
    if (data.version === 2 && Array.isArray(data.bikes) && data.bikes.length > 0) {
      var lastNewId = null;
      data.bikes.forEach(function (rawBike) {
        var oldId = rawBike.id;
        var newId = generateId();
        var bike = normalizeBikeRecord(Object.assign({}, rawBike, { id: newId }));
        s.bikes.push(bike);
        ensureBikeDataSlot(s, newId);
        var src = data.dataByBikeId && oldId && data.dataByBikeId[oldId];
        if (src) {
          if (Array.isArray(src.fuel)) {
            s.dataByBikeId[newId].fuel = JSON.parse(JSON.stringify(src.fuel));
          }
          if (Array.isArray(src.service)) {
            s.dataByBikeId[newId].service = JSON.parse(JSON.stringify(src.service));
          }
          if (Array.isArray(src.parts)) {
            s.dataByBikeId[newId].parts = JSON.parse(JSON.stringify(src.parts));
          }
        }
        lastNewId = newId;
      });
      if (lastNewId) {
        s.selectedBikeId = lastNewId;
      }
      saveAppState(s);
      return;
    }
    if (data.bike || Array.isArray(data.fuel) || Array.isArray(data.service) || Array.isArray(data.parts)) {
      var newIdLegacy = generateId();
      var bikeLegacy = normalizeBikeRecord(data.bike ? Object.assign({}, data.bike, { id: newIdLegacy }) : { id: newIdLegacy, name: '', model: '' });
      s.bikes.push(bikeLegacy);
      ensureBikeDataSlot(s, newIdLegacy);
      s.dataByBikeId[newIdLegacy] = {
        fuel: Array.isArray(data.fuel) ? JSON.parse(JSON.stringify(data.fuel)) : [],
        service: Array.isArray(data.service) ? JSON.parse(JSON.stringify(data.service)) : [],
        parts: Array.isArray(data.parts) ? JSON.parse(JSON.stringify(data.parts)) : []
      };
      s.selectedBikeId = newIdLegacy;
      saveAppState(s);
      return;
    }
    throw new Error('Unrecognized JSON. Use a Bike Tracker backup export (.json) with bike data.');
  }

  function renderAppMeta() {
    var wrap = document.getElementById('app-meta');
    var elV = document.getElementById('app-meta-version');
    var elR = document.getElementById('app-meta-release');
    var elM = document.getElementById('app-meta-maintainer');
    if (!wrap || !elV || !elR || !elM) return;
    fetch('app-meta.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('no meta');
        return r.json();
      })
      .then(function (meta) {
        if (!meta || typeof meta !== 'object') return;
        var ver = meta.appVersion != null && String(meta.appVersion).trim() !== '' ? String(meta.appVersion).trim()
          : (meta.version != null ? String(meta.version).trim() : '');
        var rel = meta.releaseDate != null ? String(meta.releaseDate).trim() : '';
        var name = meta.maintainerName != null ? String(meta.maintainerName).trim() : '';
        var contact = meta.maintainerContact != null ? String(meta.maintainerContact).trim() : '';
        elV.textContent = ver ? 'Version ' + ver : '';
        if (rel) {
          var rd = new Date(rel);
          elR.textContent = !isNaN(rd.getTime())
            ? ('Released ' + rd.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }))
            : ('Released ' + rel);
        } else {
          elR.textContent = '';
        }
        if (name || contact) {
          var parts = [];
          if (name) parts.push('Maintainer: ' + name);
          if (contact) parts.push('Contact: ' + contact);
          elM.textContent = parts.join(' · ');
        } else {
          elM.textContent = '';
        }
        if (ver || rel || name || contact) {
          wrap.classList.remove('hidden');
        }
      })
      .catch(function () {});
  }

  function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatCurrency(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function partProgress(part, currentMileage) {
    const lastDate = part.lastChangedDate ? new Date(part.lastChangedDate) : null;
    const lastMileage = part.lastChangedMileage != null ? Number(part.lastChangedMileage) : null;
    const now = new Date();
    let progressKm = 0, progressTime = 0;
    let nextKm = null, nextDate = null;

    if (part.cycleKm > 0 && currentMileage != null) {
      const start = lastMileage != null ? lastMileage : 0;
      const used = Math.max(0, currentMileage - start);
      progressKm = Math.min(1, used / part.cycleKm);
      nextKm = (lastMileage != null ? lastMileage : 0) + part.cycleKm;
    }

    if (part.cycleMonths > 0) {
      const start = lastDate || now;
      const end = addMonths(start, part.cycleMonths);
      const total = end - start;
      const elapsed = now - start;
      progressTime = total > 0 ? Math.min(1, elapsed / total) : 0;
      nextDate = lastDate ? addMonths(lastDate, part.cycleMonths) : addMonths(now, part.cycleMonths);
    }

    const progress = Math.max(progressKm, progressTime);
    let status = 'ok';
    if (progress >= 1) status = 'due';
    else if (progress >= REMINDER_THRESHOLD) status = 'soon';

    return {
      progress,
      status,
      nextKm,
      nextDate: nextDate ? nextDate.toISOString().slice(0, 10) : null,
      lastDate: part.lastChangedDate,
      lastMileage: part.lastChangedMileage
    };
  }

  function showModal(id) {
    document.querySelectorAll('.modal').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function hideModals() {
    document.querySelectorAll('.modal').forEach(el => el.classList.add('hidden'));
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-screen') === screenId);
    });
    const el = document.getElementById('screen-' + screenId);
    if (el) el.classList.add('active');
    if (screenId === 'patrol') {
      renderFuelList();
    } else if (screenId === 'servicing') {
      renderServiceList();
      renderParts();
    }
  }

  function renderBikePicker() {
    const sel = document.getElementById('bike-selector');
    const delBtn = document.getElementById('btn-delete-bike');
    if (!sel) return;
    const s = getAppState();
    sel.innerHTML = '';
    s.bikes.forEach(function (b) {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name || b.model || ('Bike ' + String(b.id).slice(-6));
      sel.appendChild(opt);
    });
    sel.disabled = s.bikes.length === 0;
    if (s.selectedBikeId && s.bikes.some(function (b) { return b.id === s.selectedBikeId; })) {
      sel.value = s.selectedBikeId;
    } else if (s.bikes.length) {
      sel.value = s.bikes[0].id;
    }
    if (delBtn) delBtn.disabled = s.bikes.length === 0;
  }

  function refreshActiveBikeContext() {
    const bike = getBike();
    const msg = bike
      ? ('Records for: ' + (bike.name || bike.model || 'Unnamed bike'))
      : 'Add or select a bike on the Bike tab to keep fuel and servicing records.';
    ['context-fuel-bike', 'context-service-bike'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = msg;
    });
  }

  function renderBike() {
    renderBikePicker();
    refreshActiveBikeContext();
    const bike = getBike();
    const placeholder = document.getElementById('bike-placeholder');
    const details = document.getElementById('bike-details');
    if (!bike) {
      placeholder.classList.remove('hidden');
      details.classList.add('hidden');
      checkRoadTaxReminder();
      return;
    }

    placeholder.classList.add('hidden');
    details.classList.remove('hidden');
    document.getElementById('bike-name-display').textContent = bike.name || 'Unnamed bike';
    document.getElementById('bike-model-display').textContent = [bike.model, bike.engineCc ? bike.engineCc + 'cc' : ''].filter(Boolean).join(' · ') || '—';
    document.getElementById('bike-purchase-date').textContent = formatDate(bike.purchaseDate);
    document.getElementById('bike-chassis').textContent = bike.chassisNumber || '—';
    document.getElementById('bike-engine').textContent = bike.engineNumber || '—';
    document.getElementById('bike-mileage').textContent = bike.mileage != null ? bike.mileage.toLocaleString() + ' km' : '—';
    document.getElementById('bike-obu').textContent = bike.obuNumber || '—';
    document.getElementById('bike-vehicle-no').textContent = bike.vehicleNo || '—';
    document.getElementById('bike-roadtax-expiry').textContent = formatDate(bike.roadTaxExpiryDate);
    document.getElementById('bike-coe-expiry').textContent = formatDate(bike.coeExpiry);
    document.getElementById('bike-insurance-company').textContent = bike.insuranceCompany || '—';
    document.getElementById('bike-insurance-policy').textContent = bike.insurancePolicyNumber || '—';
    const periodStart = formatDate(bike.insurancePeriodStart);
    const periodEnd = formatDate(bike.insurancePeriodEnd);
    document.getElementById('bike-insurance-period').textContent = (periodStart !== '—' || periodEnd !== '—') ? periodStart + ' – ' + periodEnd : '—';

    if (!Array.isArray(bike.documents)) {
      bike.documents = [];
    }
    // Migrate legacy single docs into documents array once
    if (bike.documents.length === 0) {
      const migrated = [];
      if (bike.policyDocData && bike.policyDocName) {
        migrated.push({ id: generateId(), name: bike.policyDocName, data: bike.policyDocData });
      }
      if (bike.motorDocData && bike.motorDocName) {
        migrated.push({ id: generateId(), name: bike.motorDocName, data: bike.motorDocData });
      }
      if (migrated.length) {
        bike.documents = migrated;
        bike.policyDocData = null;
        bike.policyDocName = null;
        bike.motorDocData = null;
        bike.motorDocName = null;
        saveBike(bike);
      }
    }

    var docEl = document.getElementById('bike-doc-links');
    docEl.innerHTML = '';
    if (!bike.documents || !bike.documents.length) {
      var empty = document.createElement('li');
      empty.textContent = 'No documents yet.';
      empty.className = 'doc-empty';
      docEl.appendChild(empty);
    } else {
      bike.documents.forEach(function (doc) {
        var li = document.createElement('li');
        li.className = 'doc-item';
        li.dataset.id = doc.id;
        li.innerHTML =
          '<div class="doc-main"><span class="doc-name">' + escapeHtml(doc.name) + '</span></div>' +
          '<div class="doc-actions">' +
          '<button type="button" class="doc-open">Open</button>' +
          '<button type="button" class="doc-download">Download</button>' +
          '<button type="button" class="doc-delete">Delete</button>' +
          '</div>';
        docEl.appendChild(li);
      });
    }
    checkRoadTaxReminder();
  }

  function checkRoadTaxReminder() {
    const bike = getBike();
    const toast = document.getElementById('roadtax-toast');
    const text = document.getElementById('roadtax-text');
    if (!bike) {
      if (toast) toast.classList.add('hidden');
      return;
    }
    const expiry = bike.roadTaxExpiryDate;
    if (!expiry) {
      toast.classList.add('hidden');
      return;
    }
    const exp = new Date(expiry);
    const now = new Date();
    const daysLeft = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
    if (daysLeft < 0) {
      text.textContent = 'Road tax expired on ' + formatDate(expiry) + '. Renew soon.';
      toast.classList.remove('hidden');
    } else if (daysLeft <= ROAD_TAX_REMINDER_DAYS) {
      text.textContent = 'Due on ' + formatDate(expiry) + ' (' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left).';
      toast.classList.remove('hidden');
    } else {
      toast.classList.add('hidden');
    }
  }

  function handleDocClick(e) {
    var li = e.target.closest('li[data-id]');
    if (!li) return;
    var id = li.dataset.id;
    var bikeNow = getBike();
    if (!bikeNow) return;
    var docs = (bikeNow.documents || []);
    var d = docs.find(function (x) { return x.id === id; });
    if (!d) return;
    if (e.target.classList.contains('doc-open')) {
      var viewer = document.getElementById('doc-viewer');
      var titleEl = document.getElementById('doc-modal-title');
      if (!viewer || !titleEl) return;
      titleEl.textContent = d.name || 'Document';
      viewer.innerHTML = '';
      if (typeof d.data === 'string' && d.data.indexOf('data:image/') === 0) {
        var img = document.createElement('img');
        img.src = d.data;
        viewer.appendChild(img);
      } else {
        var iframe = document.createElement('iframe');
        iframe.src = d.data;
        iframe.style.height = '70vh';
        viewer.appendChild(iframe);
      }
      showModal('modal-doc');
    } else if (e.target.classList.contains('doc-download')) {
      var a = document.createElement('a');
      a.href = d.data;
      a.download = d.name || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (e.target.classList.contains('doc-delete')) {
      if (!confirm('Delete this document?')) return;
      var bikeNow = getBike();
      bikeNow.documents = (bikeNow.documents || []).filter(function (x) { return x.id !== id; });
      saveBike(bikeNow);
      renderBike();
    }
  }

  function fillBikeForm(bike) {
    const form = document.getElementById('form-bike');
    if (!form) return;
    const bikeIdField = document.getElementById('form-bike-id');
    if (bike === undefined) {
      bike = getBike();
    }
    if (!bike) {
      if (bikeIdField) bikeIdField.value = '';
      form.reset();
      document.getElementById('docs-selected-name').textContent = '';
      return;
    }
    if (bikeIdField) bikeIdField.value = bike.id;
    form.name.value = bike.name || '';
    form.model.value = bike.model || '';
    form.engineCc.value = bike.engineCc || '';
    form.manufacturedDate.value = bike.manufacturedDate || '';
    form.purchaseDate.value = bike.purchaseDate || '';
    form.chassisNumber.value = bike.chassisNumber || '';
    form.engineNumber.value = bike.engineNumber || '';
    form.mileage.value = bike.mileage != null ? bike.mileage : '';
    form.obuNumber.value = bike.obuNumber || '';
    form.vehicleNo.value = bike.vehicleNo || '';
    form.roadTaxExpiryDate.value = bike.roadTaxExpiryDate || '';
    form.coeExpiry.value = bike.coeExpiry || '';
    form.insuranceCompany.value = bike.insuranceCompany || '';
    form.insurancePolicyNumber.value = bike.insurancePolicyNumber || '';
    form.insurancePeriodStart.value = bike.insurancePeriodStart || '';
    form.insurancePeriodEnd.value = bike.insurancePeriodEnd || '';
    form.docs.value = '';
    document.getElementById('docs-selected-name').textContent = '';
  }

  function renderFuelList() {
    const list = getFuelList();
    if (syncBikeMileageFromFuel(list)) {
      renderBike();
    }
    const ul = document.getElementById('fuel-list');
    if (!ul) return;
    ul.innerHTML = '';
    const kmPerLById = computeFuelEfficiencies(list);
    list.forEach(function (entry) {
      const id = entry.id;
      var paid = entry.totalPrice != null && !isNaN(entry.totalPrice) ? entry.totalPrice : (entry.litres && entry.pricePerLitre ? entry.litres * entry.pricePerLitre : null);
      var orig = entry.originalPrice != null && !isNaN(entry.originalPrice) ? entry.originalPrice : null;
      var meta = [];
      var eff = kmPerLById[id];
      if (eff != null) meta.push(eff.toFixed(1) + ' km/L');
      if (entry.litres != null && entry.pricePerLitre != null) meta.push(entry.litres + 'L @ $' + formatCurrency(entry.pricePerLitre));
      if (orig != null) meta.push('$' + formatCurrency(orig));
      if (paid != null) meta.push('$' + formatCurrency(paid));
      var suffix = [];
      if (entry.station) suffix.push(entry.station);
      if (entry.grade) suffix.push(entry.grade);
      const li = document.createElement('li');
      li.dataset.id = id;
      li.innerHTML = '<div class="list-item-body">' +
        '<div class="row"><span class="date">' + formatDate(entry.date) + '</span><span class="title">' + (entry.litres ? entry.litres + ' L' : '') + '</span></div>' +
        '<div class="meta">' + meta.join(' → ') + (suffix.length ? ' · ' + suffix.join(' · ') : '') + '</div>' +
        '</div><div class="list-item-actions"><button type="button" class="btn btn-icon btn-icon-action fuel-edit" aria-label="Edit">' + ICON_EDIT + '</button><button type="button" class="btn btn-icon btn-icon-action fuel-delete" aria-label="Delete">' + ICON_DELETE + '</button></div>';
      ul.appendChild(li);
    });
    renderFuelAnalytics();
  }

  function renderServiceList() {
    const list = getServiceList();
    const ul = document.getElementById('service-list');
    if (!ul) return;
    ul.innerHTML = '';
    list.forEach(function (entry) {
      const id = entry.id;
      const li = document.createElement('li');
      li.dataset.id = id;
      li.innerHTML = '<div class="list-item-body">' +
        '<div class="row"><span class="date">' + formatDate(entry.date) + '</span>' + (entry.price != null ? '<span class="title">$' + formatCurrency(entry.price) + '</span>' : '') + '</div>' +
        '<div class="meta">' + (entry.location ? entry.location + ' · ' : '') + (entry.mileage != null ? entry.mileage + ' km' : '') + '</div>' +
        (entry.content ? '<div class="meta" style="margin-top:6px">' + escapeHtml(entry.content) + '</div>' : '') +
        '</div><div class="list-item-actions"><button type="button" class="btn btn-icon btn-icon-action service-edit" aria-label="Edit">' + ICON_EDIT + '</button><button type="button" class="btn btn-icon btn-icon-action service-delete" aria-label="Delete">' + ICON_DELETE + '</button></div>';
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function computeFuelEfficiencies(list) {
    const sorted = list
      .filter(e => e.date)
      .slice()
      .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    const kmPerLById = {};
    let prev = null;
    sorted.forEach(function (entry) {
      if (prev && entry.mileage != null && prev.mileage != null) {
        const distance = entry.mileage - prev.mileage;
        if (distance > 0 && entry.litres) {
          kmPerLById[entry.id] = distance / entry.litres;
        }
      }
      prev = entry;
    });
    return kmPerLById;
  }

  function syncBikeMileageFromFuel(list) {
    var bike = getBike();
    if (!bike || !Array.isArray(list) || !list.length) return false;
    var sorted = list
      .filter(function (e) { return e && e.date; })
      .slice()
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var latestWithMileage = sorted.find(function (e) { return e.mileage != null && !isNaN(e.mileage); });
    if (!latestWithMileage) return false;
    var nextMileage = Number(latestWithMileage.mileage);
    if (isNaN(nextMileage) || nextMileage < 0) return false;
    if (bike.mileage !== nextMileage) {
      saveBike({ ...bike, mileage: nextMileage });
      return true;
    }
    return false;
  }

  function renderFuelAnalytics() {
    const list = getFuelList();
    const container = document.getElementById('fuel-analytics');
    if (!container) return;
    container.classList.remove('hidden');

    const avgEffEl = document.getElementById('fuel-avg-efficiency');
    const avgUsageEl = document.getElementById('fuel-avg-usage');
    const totalEl = document.getElementById('fuel-total-spent');
    const monthlyEl = document.getElementById('fuel-avg-monthly');

    if (!list.length) {
      if (avgEffEl) avgEffEl.textContent = '—';
      if (avgUsageEl) avgUsageEl.textContent = '—';
      if (totalEl) totalEl.textContent = '—';
      if (monthlyEl) monthlyEl.textContent = '—';
      return;
    }

    const sorted = list
      .filter(function (e) { return e.date; })
      .slice()
      .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    var totalLitresForEfficiency = 0;
    sorted.slice(1).forEach(function (e) {
      if (e.litres != null && !isNaN(e.litres)) totalLitresForEfficiency += Number(e.litres);
    });
    var totalLitresForUsage = 0;
    sorted.forEach(function (e) {
      if (e.litres != null && !isNaN(e.litres)) totalLitresForUsage += Number(e.litres);
    });
    var oldestMileage = 0;
    var latestMileage = 0;
    if (sorted.length) {
      var oldestEntry = sorted[0];
      var latestEntry = sorted[sorted.length - 1];
      oldestMileage = (oldestEntry && oldestEntry.mileage != null && !isNaN(oldestEntry.mileage)) ? Number(oldestEntry.mileage) : 0;
      if (latestEntry && latestEntry.mileage != null && !isNaN(latestEntry.mileage)) {
        latestMileage = Number(latestEntry.mileage);
      } else {
        for (var i = sorted.length - 1; i >= 0; i -= 1) {
          if (sorted[i].mileage != null && !isNaN(sorted[i].mileage)) {
            latestMileage = Number(sorted[i].mileage);
            break;
          }
        }
      }
    }
    var mileageDistance = Math.max(0, latestMileage - oldestMileage);
    if (avgEffEl) {
      avgEffEl.textContent = totalLitresForEfficiency > 0 ? (mileageDistance / totalLitresForEfficiency).toFixed(1) + ' km/L' : '—';
    }
    if (avgUsageEl) {
      avgUsageEl.textContent = sorted.length ? (totalLitresForUsage / sorted.length).toFixed(1) + ' L/fill' : '—';
    }

    /** Paid price (totalPrice) if it is a valid number; else originalPrice. Uses Number() so string values from JSON never break + (concat) the running total. */
    function fuelRecordLineCost(entry) {
      var paid = entry.totalPrice;
      if (paid != null && paid !== '') {
        var p = Number(paid);
        if (Number.isFinite(p)) return p;
      }
      var orig = entry.originalPrice;
      if (orig != null && orig !== '') {
        var o = Number(orig);
        if (Number.isFinite(o)) return o;
      }
      return null;
    }

    var totalSpend = 0;
    var firstDate = null;
    var lastDate = null;
    sorted.forEach(function (entry) {
      if (!entry.date) return;
      var d = new Date(entry.date);
      if (!firstDate || d < firstDate) firstDate = d;
      if (!lastDate || d > lastDate) lastDate = d;
      var line = fuelRecordLineCost(entry);
      if (line != null) totalSpend += line;
    });
    var avgMonthly = null;
    if (firstDate && lastDate) {
      var msPerDay = 24 * 60 * 60 * 1000;
      var timeSpanMs = lastDate - firstDate;
      var daySpan = Math.max(1, timeSpanMs / msPerDay);
      avgMonthly = totalSpend / daySpan * 30.4375;
    }
    if (totalEl) totalEl.textContent = totalSpend ? '$' + formatCurrency(totalSpend) : '—';
    if (monthlyEl) monthlyEl.textContent = avgMonthly != null ? '$' + formatCurrency(avgMonthly) + '/mo' : '—';
  }

  function renderParts() {
    const bike = getBike();
    const currentMileage = bike && bike.mileage != null ? Number(bike.mileage) : 0;
    const parts = getParts();
    const ul = document.getElementById('parts-list');
    if (!ul) return;
    ul.innerHTML = '';
    parts.forEach(part => {
      const p = partProgress(part, currentMileage);
      const li = document.createElement('li');
      li.dataset.partId = part.id;
      const cycleDesc = [part.cycleKm ? part.cycleKm + ' km' : '', part.cycleMonths ? part.cycleMonths + ' mth' : ''].filter(Boolean).join(' / ') || '—';
      li.innerHTML = '<div class="part-row"><span class="part-name">' + escapeHtml(part.name) + '</span><span class="part-badge ' + p.status + '">' + (p.status === 'due' ? 'Due' : p.status === 'soon' ? 'Soon' : 'OK') + '</span></div>' +
        '<div class="part-cycle">Every ' + cycleDesc + '</div>' +
        '<div class="progress-bar"><div class="progress-fill ' + p.status + '" style="width:' + Math.round(p.progress * 100) + '%"></div></div>';
      ul.appendChild(li);
    });
    checkReminders();
  }

  function checkReminders() {
    const toast = document.getElementById('reminder-toast');
    const text = document.getElementById('reminder-text');
    if (!toast || !text) return;
    try {
      if (sessionStorage.getItem(SESSION_DISMISS_PART_TOAST) === '1') {
        toast.classList.add('hidden');
        return;
      }
    } catch (_) {}
    const bike = getBike();
    if (!bike) {
      toast.classList.add('hidden');
      return;
    }
    const currentMileage = bike.mileage != null ? Number(bike.mileage) : 0;
    const parts = getParts();
    const dueSoon = parts.filter(p => {
      const prog = partProgress(p, currentMileage);
      return prog.progress >= REMINDER_THRESHOLD;
    });
    if (dueSoon.length === 0) {
      toast.classList.add('hidden');
      return;
    }
    text.textContent = dueSoon.map(p => p.name).join(', ') + (dueSoon.length > 1 ? ' are' : ' is') + ' due soon.';
    toast.classList.remove('hidden');
  }

  function openPartDetail(partId) {
    const parts = getParts();
    const part = parts.find(p => p.id === partId);
    if (!part) return;
    const bike = getBike();
    const currentMileage = bike && bike.mileage != null ? Number(bike.mileage) : 0;
    const p = partProgress(part, currentMileage);

    document.getElementById('part-detail-name').textContent = part.name;
    document.getElementById('part-detail-last').textContent = formatDate(part.lastChangedDate);
    document.getElementById('part-detail-mileage').textContent = part.lastChangedMileage != null ? part.lastChangedMileage.toLocaleString() + ' km' : '—';
    document.getElementById('part-detail-next-mileage').textContent = p.nextKm != null ? p.nextKm.toLocaleString() + ' km' : '—';
    document.getElementById('part-detail-next-date').textContent = formatDate(p.nextDate);

    const fill = document.getElementById('part-detail-progress');
    fill.style.width = Math.round(p.progress * 100) + '%';
    fill.className = 'progress-fill ' + p.status;
    document.getElementById('part-detail-progress-text').textContent =
      Math.round(p.progress * 100) + '% used · ' + (p.progress >= 1 ? 'Due for change' : 'Next in ' + (p.nextKm != null ? (p.nextKm - currentMileage) + ' km' : '') + (p.nextDate ? ' or by ' + formatDate(p.nextDate) : ''));

    document.getElementById('modal-part').dataset.partId = partId;
    showModal('modal-part');
  }

  function openPartChangeModal(partId, title, isEdit) {
    var part = getParts().find(function (p) { return p.id === partId; });
    if (!part) return;
    document.getElementById('modal-part-change').dataset.partId = partId;
    document.getElementById('part-change-modal-title').textContent = title;
    var form = document.getElementById('form-part-change');
    form.dateChanged.value = isEdit && part.lastChangedDate ? part.lastChangedDate : new Date().toISOString().slice(0, 10);
    var b = getBike();
    form.mileageChanged.value = (isEdit && part.lastChangedMileage != null) ? part.lastChangedMileage : (b && b.mileage != null ? b.mileage : '');
    showModal('modal-part-change');
  }

  function savePartChange(partId, dateChanged, mileageChanged) {
    const parts = getParts();
    const part = parts.find(function (p) { return p.id === partId; });
    if (!part) return;
    const idx = parts.indexOf(part);
    parts[idx] = {
      ...part,
      lastChangedDate: dateChanged || null,
      lastChangedMileage: mileageChanged !== '' && mileageChanged != null ? parseInt(mileageChanged, 10) : null
    };
    saveParts(parts);
    hideModals();
    renderParts();
    renderBike();
  }

  function openPartCycleModal(partId) {
    var part = getParts().find(function (p) { return p.id === partId; });
    if (!part) return;
    document.getElementById('modal-part-cycle').dataset.partId = partId;
    document.getElementById('part-cycle-modal-title').textContent = 'Edit part: ' + part.name;
    var form = document.getElementById('form-part-cycle');
    form.partName.value = part.name || '';
    form.cycleKm.value = part.cycleKm != null ? part.cycleKm : '';
    form.cycleMonths.value = part.cycleMonths != null ? part.cycleMonths : '';
    showModal('modal-part-cycle');
  }

  function savePartCycle(partId, partName, cycleKm, cycleMonths) {
    const parts = getParts();
    const part = parts.find(function (p) { return p.id === partId; });
    if (!part) return;
    const idx = parts.indexOf(part);
    const nameTrim = (partName != null ? String(partName) : '').trim();
    var km = cycleKm !== '' && cycleKm != null ? parseInt(cycleKm, 10) : 0;
    var mo = cycleMonths !== '' && cycleMonths != null ? parseInt(cycleMonths, 10) : 0;
    parts[idx] = {
      ...part,
      name: nameTrim || part.name,
      cycleKm: isNaN(km) ? 0 : Math.max(0, km),
      cycleMonths: isNaN(mo) ? 0 : Math.max(0, mo)
    };
    saveParts(parts);
    hideModals();
    renderParts();
  }

  function init() {
    getAppState();
    var s = getAppState();
    var stateDirty = false;
    s.bikes.forEach(function (bike) {
      var slot = s.dataByBikeId[bike.id];
      if (!slot || !Array.isArray(slot.fuel)) return;
      slot.fuel.forEach(function (e) {
        if (!e.id) { e.id = generateId(); stateDirty = true; }
        if (typeof e.mileage === 'undefined') { e.mileage = null; stateDirty = true; }
        if (typeof e.grade === 'undefined') { e.grade = null; stateDirty = true; }
      });
      if (Array.isArray(slot.service)) {
        slot.service.forEach(function (e) {
          if (!e.id) { e.id = generateId(); stateDirty = true; }
        });
      }
    });
    if (stateDirty) saveAppState(s);
    syncBikeMileageFromFuel(getFuelList());

    renderAppMeta();
    renderBike();
    renderFuelList();
    renderServiceList();
    renderParts();

    var docContainer = document.getElementById('bike-doc-links');
    if (docContainer) {
      docContainer.addEventListener('click', handleDocClick);
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        showScreen(this.getAttribute('data-screen'));
      });
    });

    document.getElementById('bike-card').addEventListener('click', function () {
      if (!getBike()) {
        showModal('modal-add-bike');
      }
    });

    document.querySelector('.edit-bike-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      fillBikeForm(getBike());
      showModal('modal-bike');
    });

    var bikeSelector = document.getElementById('bike-selector');
    if (bikeSelector) {
      bikeSelector.addEventListener('change', function () {
        setSelectedBikeId(this.value);
        renderBike();
        renderFuelList();
        renderServiceList();
        renderParts();
      });
    }

    var btnAddBike = document.getElementById('btn-add-bike');
    if (btnAddBike) {
      btnAddBike.addEventListener('click', function (e) {
        e.stopPropagation();
        showModal('modal-add-bike');
      });
    }

    var btnAddBikeManual = document.getElementById('btn-add-bike-manual');
    if (btnAddBikeManual) {
      btnAddBikeManual.addEventListener('click', function () {
        hideModals();
        fillBikeForm(null);
        showModal('modal-bike');
      });
    }

    var btnAddBikeJson = document.getElementById('btn-add-bike-json');
    var addBikeJsonInput = document.getElementById('add-bike-json-input');
    if (btnAddBikeJson && addBikeJsonInput) {
      btnAddBikeJson.addEventListener('click', function () {
        addBikeJsonInput.value = '';
        addBikeJsonInput.click();
      });
      addBikeJsonInput.addEventListener('change', function () {
        var file = addBikeJsonInput.files && addBikeJsonInput.files[0];
        if (!file) return;
        readFileAsText(file)
          .then(function (text) {
            var data = JSON.parse(text);
            mergeBikesFromImportData(data);
            hideModals();
            renderBike();
            renderFuelList();
            renderServiceList();
            renderParts();
          })
          .catch(function (err) {
            alert(err && err.message ? err.message : 'Could not import JSON.');
          })
          .then(function () {
            addBikeJsonInput.value = '';
          });
      });
    }

    var btnDeleteBike = document.getElementById('btn-delete-bike');
    if (btnDeleteBike) {
      btnDeleteBike.addEventListener('click', function (e) {
        e.stopPropagation();
        var b = getBike();
        if (!b) return;
        if (!confirm('Delete this bike and all of its fuel, service, and parts data?')) return;
        deleteBikeById(b.id);
        renderBike();
        renderFuelList();
        renderServiceList();
        renderParts();
      });
    }

    document.getElementById('form-bike').addEventListener('submit', function (e) {
      e.preventDefault();
      const form = e.target;
      const formBikeId = (document.getElementById('form-bike-id') && document.getElementById('form-bike-id').value) || '';
      const existing = formBikeId ? getAppState().bikes.find(function (b) { return b.id === formBikeId; }) : null;
      const prevDocs = existing && Array.isArray(existing.documents) ? existing.documents.slice() : [];
      const next = {
        id: existing ? existing.id : generateId(),
        name: form.name.value.trim(),
        model: form.model.value.trim(),
        engineCc: form.engineCc.value !== '' ? parseInt(form.engineCc.value, 10) : null,
        manufacturedDate: form.manufacturedDate.value || null,
        purchaseDate: form.purchaseDate.value || '',
        chassisNumber: form.chassisNumber.value.trim(),
        engineNumber: form.engineNumber.value.trim(),
        mileage: form.mileage.value !== '' ? parseInt(form.mileage.value, 10) : null,
        obuNumber: form.obuNumber.value.trim(),
        vehicleNo: form.vehicleNo.value.trim(),
        roadTaxExpiryDate: form.roadTaxExpiryDate.value || null,
        coeExpiry: form.coeExpiry.value || null,
        insuranceCompany: form.insuranceCompany.value.trim(),
        insurancePolicyNumber: form.insurancePolicyNumber.value.trim(),
        insurancePeriodStart: form.insurancePeriodStart.value || null,
        insurancePeriodEnd: form.insurancePeriodEnd.value || null,
        policyDocName: existing ? existing.policyDocName : null,
        policyDocData: existing ? existing.policyDocData : null,
        motorDocName: existing ? existing.motorDocName : null,
        motorDocData: existing ? existing.motorDocData : null,
        documents: prevDocs
      };
      const files = Array.from(form.docs.files || []);
      if (!files.length) {
        saveBike(next);
        hideModals();
        renderBike();
        renderFuelList();
        renderServiceList();
        renderParts();
        return;
      }
      Promise.all(files.map(function (file) { return readFileAsDataUrl(file).then(function (data) { return { file: file, data: data }; }); }))
        .then(function (items) {
          items.forEach(function (item) {
            next.documents.push({
              id: generateId(),
              name: item.file.name,
              data: item.data
            });
          });
          saveBike(next);
          hideModals();
          renderBike();
          renderFuelList();
          renderServiceList();
          renderParts();
        }).catch(function (err) {
          alert(err.message || 'File upload failed');
        });
    });

    document.querySelectorAll('.modal-cancel').forEach(function (el) {
      el.addEventListener('click', hideModals);
    });

    document.querySelector('#form-bike input[name="docs"]').addEventListener('change', function () {
      var files = Array.from(this.files || []);
      if (!files.length) {
        document.getElementById('docs-selected-name').textContent = '';
      } else if (files.length === 1) {
        document.getElementById('docs-selected-name').textContent = files[0].name;
      } else {
        document.getElementById('docs-selected-name').textContent = files.length + ' files selected';
      }
    });

    var backupBtn = document.getElementById('btn-backup');
    var backupFileInput = document.getElementById('backup-file-input');
    var backupExport = document.getElementById('btn-backup-export');
    var backupImport = document.getElementById('btn-backup-import');
    if (backupBtn && backupFileInput && backupExport && backupImport) {
      backupBtn.addEventListener('click', function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        showModal('modal-backup');
      });
      backupExport.addEventListener('click', function () {
        try {
          var data = getBackupData();
          var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'bike-tracker-backup.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          alert('Export failed.');
        }
      });
      backupImport.addEventListener('click', function () {
        try {
          var file = backupFileInput.files[0];
          if (!file) {
            alert('Please choose a backup .json file first.');
            return;
          }
          var reader = new FileReader();
          reader.onload = function () {
            try {
              var data = JSON.parse(reader.result);
              applyBackup(data);
              hideModals();
              renderBike();
              renderFuelList();
              renderServiceList();
              renderParts();
            } catch (e2) {
              alert('Import failed. File content is not valid JSON.');
            }
          };
          reader.onerror = function () {
            alert('Failed to read backup file.');
          };
          reader.readAsText(file);
        } catch (err) {
          alert('Import failed.');
        }
      });
    }

    function autoFillFuelOriginalPrice(form) {
      if (!form) return;
      var litres = form.litres.value !== '' ? parseFloat(form.litres.value) : NaN;
      var ppl = form.pricePerLitre.value !== '' ? parseFloat(form.pricePerLitre.value) : NaN;
      if (!isNaN(litres) && litres >= 0 && !isNaN(ppl) && ppl >= 0) {
        form.originalPrice.value = (litres * ppl).toFixed(2);
      } else {
        form.originalPrice.value = '';
      }
    }

    function getLatestFuelRecordForPrefill() {
      var list = getFuelList().slice();
      if (!list.length) return null;
      list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      return list[0] || null;
    }

    document.getElementById('btn-add-fuel').addEventListener('click', function () {
      if (!getSelectedBikeId()) {
        alert('Add or select a bike on the Bike tab first.');
        return;
      }
      var fuelForm = document.getElementById('form-fuel');
      fuelForm.reset();
      document.getElementById('fuel-modal-title').textContent = 'Add fill-up';
      formFuelIdField.value = '';
      fuelForm.date.value = new Date().toISOString().slice(0, 10);
      var prev = getLatestFuelRecordForPrefill();
      if (prev) {
        fuelForm.litres.value = prev.litres != null ? prev.litres : '';
        fuelForm.mileage.value = prev.mileage != null ? prev.mileage : '';
        fuelForm.grade.value = prev.grade || '';
        fuelForm.station.value = prev.station || '';
        fuelForm.pricePerLitre.value = prev.pricePerLitre != null ? prev.pricePerLitre : '';
        fuelForm.totalPrice.value = prev.totalPrice != null ? prev.totalPrice : '';
        autoFillFuelOriginalPrice(fuelForm);
      }
      showModal('modal-fuel');
    });

    var formFuelIdField = document.querySelector('#form-fuel input[name="id"]');
    var fuelFormForCalc = document.getElementById('form-fuel');
    if (fuelFormForCalc) {
      fuelFormForCalc.litres.addEventListener('input', function () { autoFillFuelOriginalPrice(fuelFormForCalc); });
      fuelFormForCalc.pricePerLitre.addEventListener('input', function () { autoFillFuelOriginalPrice(fuelFormForCalc); });
    }
    document.getElementById('form-fuel').addEventListener('submit', function (e) {
      e.preventDefault();
      const form = e.target;
      const list = getFuelList();
      autoFillFuelOriginalPrice(form);
      const payload = {
        date: form.date.value,
        litres: form.litres.value ? parseFloat(form.litres.value) : null,
        mileage: form.mileage.value ? parseInt(form.mileage.value, 10) : null,
        grade: form.grade.value.trim() || null,
        station: form.station.value.trim() || null,
        pricePerLitre: form.pricePerLitre.value ? parseFloat(form.pricePerLitre.value) : null,
        originalPrice: (form.litres.value !== '' && form.pricePerLitre.value !== '') ? Number((parseFloat(form.litres.value) * parseFloat(form.pricePerLitre.value)).toFixed(2)) : null,
        totalPrice: form.totalPrice.value ? parseFloat(form.totalPrice.value) : null
      };
      const id = formFuelIdField.value;
      if (id) {
        const idx = list.findIndex(function (x) { return x.id === id; });
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...payload };
        }
      } else {
        payload.id = generateId();
        list.push(payload);
      }
      saveFuelList(list);
      syncBikeMileageFromFuel(list);
      hideModals();
      renderBike();
      renderFuelList();
    });

    document.getElementById('fuel-list').addEventListener('click', function (e) {
      var li = e.target.closest('li[data-id]');
      if (!li) return;
      var id = li.dataset.id;
      if (e.target.closest('.fuel-delete')) {
        if (confirm('Delete this fill-up?')) {
          var list = getFuelList().filter(function (x) { return x.id !== id; });
          saveFuelList(list);
          syncBikeMileageFromFuel(list);
          renderBike();
          renderFuelList();
        }
      } else if (e.target.closest('.fuel-edit')) {
        var entry = getFuelList().find(function (x) { return x.id === id; });
        if (!entry) return;
        document.getElementById('fuel-modal-title').textContent = 'Edit fill-up';
        formFuelIdField.value = entry.id;
        var f = document.getElementById('form-fuel');
        f.date.value = entry.date || '';
        f.litres.value = entry.litres != null ? entry.litres : '';
        f.mileage.value = entry.mileage != null ? entry.mileage : '';
        f.grade.value = entry.grade || '';
        f.station.value = entry.station || '';
        f.pricePerLitre.value = entry.pricePerLitre != null ? entry.pricePerLitre : '';
        f.originalPrice.value = entry.originalPrice != null ? entry.originalPrice : '';
        f.totalPrice.value = entry.totalPrice != null ? entry.totalPrice : '';
        autoFillFuelOriginalPrice(f);
        showModal('modal-fuel');
      }
    });

    document.getElementById('btn-add-service').addEventListener('click', function () {
      if (!getSelectedBikeId()) {
        alert('Add or select a bike on the Bike tab first.');
        return;
      }
      document.getElementById('form-service').reset();
      document.getElementById('service-modal-title').textContent = 'Add service record';
      formServiceIdField.value = '';
      const bike = getBike();
      document.querySelector('#form-service input[name="date"]').value = new Date().toISOString().slice(0, 10);
      document.querySelector('#form-service input[name="mileage"]').value = bike && bike.mileage != null ? bike.mileage : '';
      showModal('modal-service');
    });

    var formServiceIdField = document.querySelector('#form-service input[name="id"]');
    document.getElementById('form-service').addEventListener('submit', function (e) {
      e.preventDefault();
      const form = e.target;
      const list = getServiceList();
      const payload = {
        date: form.date.value,
        location: form.location.value.trim() || null,
        price: form.price.value ? parseFloat(form.price.value) : null,
        mileage: form.mileage.value !== '' ? parseInt(form.mileage.value, 10) : null,
        content: form.content.value.trim() || null
      };
      const id = formServiceIdField.value;
      if (id) {
        const idx = list.findIndex(function (x) { return x.id === id; });
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...payload };
        }
      } else {
        payload.id = generateId();
        list.push(payload);
      }
      saveServiceList(list);
      hideModals();
      renderServiceList();
    });

    document.getElementById('service-list').addEventListener('click', function (e) {
      var li = e.target.closest('li[data-id]');
      if (!li) return;
      var id = li.dataset.id;
      if (e.target.closest('.service-delete')) {
        if (confirm('Delete this service record?')) {
          var list = getServiceList().filter(function (x) { return x.id !== id; });
          saveServiceList(list);
          renderServiceList();
        }
      } else if (e.target.closest('.service-edit')) {
        var entry = getServiceList().find(function (x) { return x.id === id; });
        if (!entry) return;
        document.getElementById('service-modal-title').textContent = 'Edit service record';
        formServiceIdField.value = entry.id;
        var f = document.getElementById('form-service');
        f.date.value = entry.date || '';
        f.location.value = entry.location || '';
        f.price.value = entry.price != null ? entry.price : '';
        f.mileage.value = entry.mileage != null ? entry.mileage : '';
        f.content.value = entry.content || '';
        showModal('modal-service');
      }
    });

    document.getElementById('parts-list').addEventListener('click', function (e) {
      const li = e.target.closest('li[data-part-id]');
      if (li) openPartDetail(li.dataset.partId);
    });

    document.getElementById('btn-reset-part').addEventListener('click', function () {
      var id = document.getElementById('modal-part').dataset.partId;
      if (id) {
        hideModals();
        openPartChangeModal(id, 'Mark as changed (reset)', false);
      }
    });

    document.getElementById('btn-edit-part-last').addEventListener('click', function () {
      var id = document.getElementById('modal-part').dataset.partId;
      if (id) {
        hideModals();
        openPartChangeModal(id, 'Edit last change', true);
      }
    });

    document.getElementById('btn-edit-part-cycle').addEventListener('click', function () {
      var id = document.getElementById('modal-part').dataset.partId;
      if (id) {
        hideModals();
        openPartCycleModal(id);
      }
    });

    document.getElementById('form-part-change').addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('modal-part-change').dataset.partId;
      var form = e.target;
      if (id) savePartChange(id, form.dateChanged.value, form.mileageChanged.value);
    });

    document.getElementById('form-part-cycle').addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('modal-part-cycle').dataset.partId;
      var form = e.target;
      if (id) savePartCycle(id, form.partName.value, form.cycleKm.value, form.cycleMonths.value);
    });

    var btnDeletePart = document.getElementById('btn-delete-part');
    if (btnDeletePart) {
      btnDeletePart.addEventListener('click', function () {
        var id = document.getElementById('modal-part').dataset.partId;
        if (!id) return;
        if (!confirm('Delete this part from the list for this bike?')) return;
        saveParts(getParts().filter(function (p) { return p.id !== id; }));
        hideModals();
        renderParts();
      });
    }

    var btnAddPart = document.getElementById('btn-add-part');
    if (btnAddPart) {
      btnAddPart.addEventListener('click', function () {
        if (!getSelectedBikeId()) {
          alert('Add or select a bike on the Bike tab first.');
          return;
        }
        var f = document.getElementById('form-part-add');
        if (f) f.reset();
        showModal('modal-part-add');
      });
    }

    var formPartAdd = document.getElementById('form-part-add');
    if (formPartAdd) {
      formPartAdd.addEventListener('submit', function (e) {
        e.preventDefault();
        var form = e.target;
        var name = form.partName.value.trim();
        if (!name) return;
        var cycleKm = parseInt(form.cycleKm.value, 10);
        var cycleMonths = parseInt(form.cycleMonths.value, 10);
        if (isNaN(cycleKm)) cycleKm = 0;
        if (isNaN(cycleMonths)) cycleMonths = 0;
        var parts = getParts().slice();
        parts.push({
          id: generateId(),
          name: name,
          cycleKm: Math.max(0, cycleKm),
          cycleMonths: Math.max(0, cycleMonths),
          lastChangedDate: null,
          lastChangedMileage: null
        });
        saveParts(parts);
        hideModals();
        renderParts();
      });
    }

    var partToastDismiss = document.getElementById('reminder-toast-dismiss');
    if (partToastDismiss) {
      partToastDismiss.addEventListener('click', function (e) {
        e.stopPropagation();
        try { sessionStorage.setItem(SESSION_DISMISS_PART_TOAST, '1'); } catch (_) {}
        var t = document.getElementById('reminder-toast');
        if (t) t.classList.add('hidden');
      });
    }

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', function () {
        const tabName = this.getAttribute('data-tab');
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const panel = document.getElementById('tab-' + tabName);
        if (panel) panel.classList.add('active');
      });
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) hideModals();
      });
    });

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
