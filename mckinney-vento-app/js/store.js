/*
 * Local persistence layer (localStorage-backed) for everything that should
 * survive between sessions and be reusable across future imports without
 * touching code: school-name manual overrides, saved column-mapping
 * profiles (keyed by a signature of the header row so a similarly-shaped
 * future file auto-applies the same mapping), and a custom/replacement
 * school reference list.
 *
 * The imported survey DATA itself is intentionally NOT persisted here -
 * it lives only in memory for the session, since it contains personal
 * family information and this is a local, offline, single-user tool.
 */
(function (global) {
  'use strict';

  var KEYS = {
    SCHOOL_OVERRIDES: 'mv_school_overrides_v1',
    MAPPING_PROFILES: 'mv_mapping_profiles_v1',
    CUSTOM_SCHOOLS: 'mv_custom_schools_v1',
    SETTINGS: 'mv_settings_v1'
  };

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Store: failed to read', key, e);
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Store: failed to write', key, e);
      return false;
    }
  }

  // ---- School name overrides ----
  function getSchoolOverrides() {
    return readJSON(KEYS.SCHOOL_OVERRIDES, {});
  }
  function setSchoolOverride(rawInput, officialName) {
    var overrides = getSchoolOverrides();
    overrides[global.MVSchools.key(rawInput)] = officialName;
    writeJSON(KEYS.SCHOOL_OVERRIDES, overrides);
    return overrides;
  }
  function removeSchoolOverride(rawInput) {
    var overrides = getSchoolOverrides();
    delete overrides[global.MVSchools.key(rawInput)];
    writeJSON(KEYS.SCHOOL_OVERRIDES, overrides);
    return overrides;
  }

  // ---- Custom / replacement school reference list ----
  function getCustomSchoolList() {
    return readJSON(KEYS.CUSTOM_SCHOOLS, null); // null = use embedded default
  }
  function setCustomSchoolList(schools, aliases) {
    writeJSON(KEYS.CUSTOM_SCHOOLS, { schools: schools, aliases: aliases || {} });
  }
  function clearCustomSchoolList() {
    localStorage.removeItem(KEYS.CUSTOM_SCHOOLS);
  }

  // ---- Mapping profiles ----
  function headerSignature(headers) {
    // Order-independent signature so column reordering in a future export
    // still matches; based on normalized header text.
    var norm = headers.map(function (h) { return global.MVFuzzy.normalizeBasic(h); }).sort();
    var str = norm.join('|');
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return 'sig_' + Math.abs(hash) + '_' + headers.length;
  }

  function getMappingProfiles() {
    return readJSON(KEYS.MAPPING_PROFILES, []);
  }

  function saveMappingProfile(name, headers, overrides) {
    var profiles = getMappingProfiles();
    var sig = headerSignature(headers);
    var existingIdx = profiles.findIndex(function (p) { return p.signature === sig; });
    var profile = {
      id: existingIdx >= 0 ? profiles[existingIdx].id : 'profile_' + Date.now(),
      name: name,
      signature: sig,
      headers: headers,
      overrides: overrides, // [{header, fieldId, scope}]
      savedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) profiles[existingIdx] = profile;
    else profiles.push(profile);
    writeJSON(KEYS.MAPPING_PROFILES, profiles);
    return profile;
  }

  function deleteMappingProfile(id) {
    var profiles = getMappingProfiles().filter(function (p) { return p.id !== id; });
    writeJSON(KEYS.MAPPING_PROFILES, profiles);
  }

  function findMatchingProfile(headers) {
    var sig = headerSignature(headers);
    var profiles = getMappingProfiles();
    var exact = profiles.find(function (p) { return p.signature === sig; });
    if (exact) return { profile: exact, similarity: 1 };

    // Fallback: best overlap by shared normalized header text
    var headerSet = {};
    headers.forEach(function (h) { headerSet[global.MVFuzzy.normalizeBasic(h)] = 1; });
    var best = null, bestScore = 0;
    profiles.forEach(function (p) {
      var shared = 0;
      p.headers.forEach(function (h) { if (headerSet[global.MVFuzzy.normalizeBasic(h)]) shared++; });
      var score = shared / Math.max(headers.length, p.headers.length);
      if (score > bestScore) { bestScore = score; best = p; }
    });
    return best && bestScore > 0.6 ? { profile: best, similarity: bestScore } : null;
  }

  // ---- Settings ----
  function getSettings() {
    return readJSON(KEYS.SETTINGS, { theme: 'auto' });
  }
  function setSettings(patch) {
    var s = Object.assign(getSettings(), patch);
    writeJSON(KEYS.SETTINGS, s);
    return s;
  }

  // ---- Export/import everything for portability across machines ----
  function exportAll() {
    return {
      schoolOverrides: getSchoolOverrides(),
      mappingProfiles: getMappingProfiles(),
      customSchoolList: getCustomSchoolList(),
      settings: getSettings(),
      exportedAt: new Date().toISOString()
    };
  }
  function importAll(data) {
    if (data.schoolOverrides) writeJSON(KEYS.SCHOOL_OVERRIDES, data.schoolOverrides);
    if (data.mappingProfiles) writeJSON(KEYS.MAPPING_PROFILES, data.mappingProfiles);
    if (data.customSchoolList) writeJSON(KEYS.CUSTOM_SCHOOLS, data.customSchoolList);
    if (data.settings) writeJSON(KEYS.SETTINGS, data.settings);
  }

  global.MVStore = {
    getSchoolOverrides: getSchoolOverrides,
    setSchoolOverride: setSchoolOverride,
    removeSchoolOverride: removeSchoolOverride,
    getCustomSchoolList: getCustomSchoolList,
    setCustomSchoolList: setCustomSchoolList,
    clearCustomSchoolList: clearCustomSchoolList,
    headerSignature: headerSignature,
    getMappingProfiles: getMappingProfiles,
    saveMappingProfile: saveMappingProfile,
    deleteMappingProfile: deleteMappingProfile,
    findMatchingProfile: findMatchingProfile,
    getSettings: getSettings,
    setSettings: setSettings,
    exportAll: exportAll,
    importAll: importAll
  };
})(typeof window !== 'undefined' ? window : this);
