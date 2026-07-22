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

  // Baltimore City's official USPS ZIP range: 21201-21231, plus 21237,
  // 21239, 21251, 21287. A handful of these (notably 21234, shared with
  // Parkville) genuinely straddle the city/county line, so a match here
  // is a "may be outside the city" signal, not a certainty either way.
  var CITY_ZIP_MIN = 21201, CITY_ZIP_MAX = 21231;
  var CITY_ZIP_EXTRA = { 21237: 1, 21239: 1, 21251: 1, 21287: 1 };
  function isKnownCityZip(zip) {
    var n = parseInt(zip, 10);
    if (isNaN(n)) return null;
    return (n >= CITY_ZIP_MIN && n <= CITY_ZIP_MAX) || !!CITY_ZIP_EXTRA[n];
  }

  // Explicit Baltimore County / neighboring-jurisdiction place names that
  // sometimes turn up in free-text addresses. Excludes matches immediately
  // followed by a street-suffix word (e.g. "Woodlawn Rd" and "Reisterstown
  // Rd" are real streets *within* Baltimore City, not the separate
  // Baltimore County communities of the same name) to avoid false alarms.
  var OTHER_JURISDICTION_PLACES = [
    'catonsville', 'dundalk', 'towson', 'essex', 'randallstown', 'windsor mill',
    'woodlawn', 'pikesville', 'glen burnie', 'owings mills', 'reisterstown',
    'middle river', 'rosedale', 'parkville', 'halethorpe', 'lansdowne', 'arbutus',
    'gwynn oak', 'brooklyn park', 'linthicum', 'severn', 'laurel', 'silver spring',
    'gaithersburg', 'annapolis', 'bel air', 'forest hill', 'perry hall',
    'white marsh', 'nottingham', 'carney', 'overlea', 'fullerton'
  ];
  var STREET_SUFFIX_RE = '(rd|road|ave|avenue|st|street|blvd|boulevard|ct|court|ln|lane|dr|drive|way|pkwy|parkway|cir|circle|pl|place)\\.?\\b';
  var PLACE_NAME_RE = new RegExp(
    '\\b(' + OTHER_JURISDICTION_PLACES.map(function (p) { return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b(?!\\s*' + STREET_SUFFIX_RE + ')',
    'i'
  );

  /**
   * Best-effort, review-not-certainty check for whether a free-text address
   * looks like it's outside Baltimore City. Returns { flagged, reason } -
   * reason is null when flagged is false. Never a hard "no" either: absence
   * of a hit just means nothing recognizable was found, not confirmation
   * the address is in the city.
   */
  function checkOutsideBaltimoreCity(address) {
    var addr = String(address || '');
    if (!addr.trim()) return { flagged: false, reason: null };

    var placeMatch = addr.match(PLACE_NAME_RE);
    if (placeMatch) {
      return { flagged: true, reason: 'Address mentions "' + placeMatch[1] + '", which is outside Baltimore City.' };
    }

    // Take the LAST 5-digit number in the string, not the first - PO Box
    // numbers and similar (e.g. "P.O Box 29112 Baltimore MD 21205") would
    // otherwise be mistaken for the ZIP that correctly follows at the end.
    var zipMatches = addr.match(/\b\d{5}\b/g);
    if (zipMatches) {
      var lastZip = zipMatches[zipMatches.length - 1];
      if (isKnownCityZip(lastZip) === false) {
        return { flagged: true, reason: 'ZIP code ' + lastZip + ' is not in Baltimore City’s standard ZIP range.' };
      }
    }

    return { flagged: false, reason: null };
  }

  global.MVZoning = {
    ZONING_MAP_URL: ZONING_MAP_URL,
    extractZip: extractZip,
    parseGradeRange: parseGradeRange,
    approxGradeFromAge: approxGradeFromAge,
    gradeRangeContainsAge: gradeRangeContainsAge,
    findNearbySchools: findNearbySchools,
    checkOutsideBaltimoreCity: checkOutsideBaltimoreCity
  };
})(typeof window !== 'undefined' ? window : this);
