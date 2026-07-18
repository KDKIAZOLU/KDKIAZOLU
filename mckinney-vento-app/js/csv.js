/*
 * Small dependency-free CSV parser/writer.
 * Handles: quoted fields, embedded commas/newlines, escaped quotes ("" ),
 * UTF-8 BOM, \r\n or \n line endings, and delimiter auto-detection
 * (comma, semicolon, or tab) for robustness against varied exports.
 */
(function (global) {
  'use strict';

  function detectDelimiter(sampleText) {
    var firstLine = sampleText.split(/\r\n|\r|\n/, 1)[0] || '';
    var candidates = [',', ';', '\t'];
    var best = ',', bestCount = -1;
    candidates.forEach(function (d) {
      var count = firstLine.split(d).length;
      if (count > bestCount) { bestCount = count; best = d; }
    });
    return best;
  }

  function parse(text, options) {
    options = options || {};
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM
    var delimiter = options.delimiter || detectDelimiter(text);

    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    var len = text.length;

    function pushField() {
      row.push(field);
      field = '';
    }
    function pushRow() {
      pushField();
      rows.push(row);
      row = [];
    }

    while (i < len) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        } else {
          field += ch; i++; continue;
        }
      } else {
        if (ch === '"') { inQuotes = true; i++; continue; }
        if (ch === delimiter) { pushField(); i++; continue; }
        if (ch === '\r') { i++; continue; }
        if (ch === '\n') { pushRow(); i++; continue; }
        field += ch; i++; continue;
      }
    }
    // last field/row (if any content remains)
    if (field.length > 0 || row.length > 0) pushRow();

    // drop fully-empty trailing rows
    while (rows.length && rows[rows.length - 1].every(function (c) { return c === ''; })) {
      rows.pop();
    }

    return { rows: rows, delimiter: delimiter };
  }

  function escapeField(value, delimiter) {
    var s = value == null ? '' : String(value);
    if (s.indexOf('"') !== -1 || s.indexOf(delimiter) !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function stringify(rows, options) {
    options = options || {};
    var delimiter = options.delimiter || ',';
    return rows.map(function (row) {
      return row.map(function (cell) { return escapeField(cell, delimiter); }).join(delimiter);
    }).join('\r\n');
  }

  global.MVCsv = { parse: parse, stringify: stringify, detectDelimiter: detectDelimiter };
})(typeof window !== 'undefined' ? window : this);
