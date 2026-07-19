/*
 * "Check Zoning" link + "possible nearby schools" heuristic.
 *
 * This is deliberately NOT an attempt to replicate Baltimore City Schools'
 * official zoning determination in-app. Doing that correctly requires
 * geocoding each family's home address to a coordinate and testing it
 * against zone boundary polygons - which means either sending every
 * family's home address to an external geocoding service at runtime
 * (a real confidentiality regression for this data) or embedding a large,
 * error-prone offline address-matching dataset whose mistakes could send
 * a family to the wrong school with real consequences. Neither trade-off
 * is worth it here.
 *
 * Instead: (1) a link that opens the district's own live, authoritative
 * zoning map in a new tab (nothing is transmitted automatically - the
 * user decides whether to look something up, same as clicking any
 * external link), and (2) a rough, clearly-labeled "same ZIP code, and
 * serves an age-appropriate grade" shortlist computed entirely from data
 * already in the browser (the family's own typed address + the embedded
 * school reference list) - a proximity hint, not a zoning answer.
 */
(function (global) {
  'use strict';

  var ZONING_MAP_URL = 'https://city-schools-gis.maps.arcgis.com/apps/webappviewer/index.html?id=c71a6229d08647ecba6769d89b6480f6';

  // Baltimore City ZIP codes are all 212xx.
  function extractZip(address) {
    var m = String(address || '').match(/\b(212\d{2})\b/);
    return m ? m[1] : null;
  }

  var GRADE_TOKEN_VALUE = { PK: -1, K: 0 };
  function gradeTokenToNumber(tok) {
    tok = tok.trim().toUpperCase();
    if (GRADE_TOKEN_VALUE.hasOwnProperty(tok)) return GRADE_TOKEN_VALUE[tok];
    var n = parseInt(tok, 10);
    return isNaN(n) ? null : n;
  }

  // "PK to 8", "9 to 12", "K to 5" -> {min, max}; null if unparseable.
  function parseGradeRange(gradesStr) {
    var m = String(gradesStr || '').match(/^\s*(\S+)\s+to\s+(\S+)\s*$/i);
    if (!m) return null;
    var min = gradeTokenToNumber(m[1]);
    var max = gradeTokenToNumber(m[2]);
    if (min == null || max == null) return null;
    return { min: min, max: max };
  }

  // Rough age -> grade-level mapping (Baltimore City uses a Sept 1 cutoff;
  // this is intentionally approximate, only used to rank/filter a shortlist).
  function approxGradeFromAge(age) {
    if (age == null) return null;
    if (age <= 4) return -1; // PK
    if (age === 5) return 0; // K
    return Math.max(0, Math.min(12, age - 5));
  }

  function gradeRangeContainsAge(gradesStr, age) {
    var range = parseGradeRange(gradesStr);
    var grade = approxGradeFromAge(age);
    if (!range || grade == null) return null; // unknown, not false
    return grade >= range.min && grade <= range.max;
  }

  /**
   * Returns { zip, schools } where schools is up to `limit` entries
   * { name, address, grades, mgmt, gradeMatch } from the reference list
   * sharing the family's ZIP code, age-appropriate matches listed first.
   * schools is [] (not an error) when no ZIP could be found in the
   * address or no reference-list schools share that ZIP.
   */
  function findNearbySchools(schoolsList, address, age, limit) {
    limit = limit || 5;
    var zip = extractZip(address);
    if (!zip) return { zip: null, schools: [] };

    // Alternative/support programs (behavioral health services, re-engagement
    // centers, etc.) aren't standard neighborhood enrollment options, so they'd
    // just be noise in a "nearby schools" shortlist meant for regular zoning.
    var candidates = (schoolsList || []).filter(function (s) {
      return String(s.zip) === zip && !/alternative/i.test(s.mgmt || '');
    });
    candidates = candidates.map(function (s) {
      return {
        name: s.name,
        address: s.address || '',
        grades: s.grades || '',
        mgmt: s.mgmt || '',
        gradeMatch: gradeRangeContainsAge(s.grades, age)
      };
    });
    candidates.sort(function (a, b) {
      var av = a.gradeMatch === true ? 0 : a.gradeMatch === null ? 1 : 2;
      var bv = b.gradeMatch === true ? 0 : b.gradeMatch === null ? 1 : 2;
      if (av !== bv) return av - bv;
      return a.name.localeCompare(b.name);
    });

    return { zip: zip, schools: candidates.slice(0, limit) };
  }

  global.MVZoning = {
    ZONING_MAP_URL: ZONING_MAP_URL,
    extractZip: extractZip,
    parseGradeRange: parseGradeRange,
    approxGradeFromAge: approxGradeFromAge,
    gradeRangeContainsAge: gradeRangeContainsAge,
    findNearbySchools: findNearbySchools
  };
})(typeof window !== 'undefined' ? window : this);
