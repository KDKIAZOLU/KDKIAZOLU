/*
 * Data cleaning engine: normalizes raw cell values coming out of the
 * import + schema-mapping stage. Pure functions, no DOM/UI dependencies,
 * so they're independently testable and reusable for any future dataset
 * that follows the same canonical field types.
 */
(function (global) {
  'use strict';

  function trim(v) {
    return (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
  }

  // Bilingual Yes/No -> boolean|null. Handles "Yes / Sí", "Yes /  Sí", "No", "Sí", etc.
  function parseYesNo(raw) {
    var v = trim(raw).toLowerCase();
    if (!v) return null;
    if (/^(yes|si|sí|y|s)\b/.test(v) || v.indexOf('yes') === 0) return true;
    if (/^(no|n)\b/.test(v)) return false;
    if (v.indexOf('yes') !== -1) return true;
    if (v.indexOf(' no') !== -1 || v === 'no') return false;
    return null;
  }

  // Choice-style bilingual answers ("Some concerns / Algunas preocupaciones") ->
  // returns the English portion (before the first "/") trimmed, or the raw
  // value if no "/" separator is present.
  function englishPortion(raw) {
    var v = trim(raw);
    if (!v) return '';
    var slashIdx = v.indexOf('/');
    if (slashIdx > 0) return v.slice(0, slashIdx).trim();
    return v;
  }

  // Splits a Google-Forms-style multi-select checkbox answer ("A, B, C")
  // into an array of English-portion labels, handling embedded commas inside
  // a single option's parenthetical text (e.g. "...must be more than 1 mile
  // away...") by splitting only on ", " boundaries that precede a capitalized
  // new option pattern is unreliable - instead we split on the known option
  // separator produced by Google Forms: ", " between full option phrases.
  function splitMultiSelect(raw, knownOptions) {
    var v = trim(raw);
    if (!v) return [];
    if (knownOptions && knownOptions.length) {
      // Greedily match known option strings (longest first) out of the raw text
      var remaining = v;
      var found = [];
      var sorted = knownOptions.slice().sort(function (a, b) { return b.length - a.length; });
      var guard = 0;
      while (remaining.length && guard++ < 50) {
        var matchedOne = false;
        for (var i = 0; i < sorted.length; i++) {
          if (remaining.indexOf(sorted[i]) === 0) {
            found.push(englishPortion(sorted[i]));
            remaining = remaining.slice(sorted[i].length).replace(/^,\s*/, '');
            matchedOne = true;
            break;
          }
        }
        if (!matchedOne) break;
      }
      if (found.length) return found;
    }
    // Fallback: naive split
    return v.split(',').map(function (s) { return englishPortion(s.trim()); }).filter(Boolean);
  }

  var HOUSEHOLD_NEEDS_OPTIONS = [
    'Behavioral Health / Salud mental y emocional',
    'Hygiene Items / Equipos de Higiene',
    'Immunization / Vacunación',
    'No assistance Needed / No se necesita asistencia',
    'School supplies / Utiles escolares',
    'Transportation / Transporte - (Must be more than 1 mile away. Transportation type may change from what was previously provided (e.g., school bus to MTA).'
  ];

  function parsePhoneEmail(raw) {
    var v = trim(raw);
    var emailMatch = v.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    var phoneMatch = v.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return {
      raw: v,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : ''
    };
  }

  function normalizeDate(raw) {
    var v = trim(raw);
    if (!v) return '';
    // Already ISO (from xlsx parser)
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    // M/D/YYYY or MM/DD/YYYY
    var m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      var mm = m[1].padStart(2, '0'), dd = m[2].padStart(2, '0');
      var yy = m[3].length === 2 ? ('20' + m[3]) : m[3];
      return yy + '-' + mm + '-' + dd;
    }
    var parsed = Date.parse(v);
    if (!isNaN(parsed)) {
      var d = new Date(parsed);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    return v; // leave as-is, flagged elsewhere as unparsed
  }

  function ageFromDob(isoDob, asOfDate) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(isoDob)) return null;
    var dob = new Date(isoDob);
    var now = asOfDate || new Date();
    var age = now.getFullYear() - dob.getFullYear();
    var m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  function parseTimestamp(raw) {
    var v = trim(raw);
    if (!v) return '';
    var parsed = Date.parse(v);
    if (!isNaN(parsed)) return new Date(parsed).toISOString();
    return v;
  }

  global.MVCleaning = {
    trim: trim,
    parseYesNo: parseYesNo,
    englishPortion: englishPortion,
    splitMultiSelect: splitMultiSelect,
    HOUSEHOLD_NEEDS_OPTIONS: HOUSEHOLD_NEEDS_OPTIONS,
    parsePhoneEmail: parsePhoneEmail,
    normalizeDate: normalizeDate,
    ageFromDob: ageFromDob,
    parseTimestamp: parseTimestamp
  };
})(typeof window !== 'undefined' ? window : this);
