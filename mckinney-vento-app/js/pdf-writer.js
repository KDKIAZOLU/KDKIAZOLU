/*
 * Minimal PDF writer - hand-builds a valid PDF (objects, a paginated
 * table content stream per page, xref table, trailer) with only the
 * standard Helvetica/Helvetica-Bold fonts, so no font embedding is
 * needed. No external library, per this app's "no dependencies" rule.
 *
 * Report exports use a curated, narrower column set rather than the
 * full CSV/Excel column list - a printable table only has so much
 * width, and truncating twenty columns to illegibility would defeat
 * the point of a "printable report" format.
 *
 * Exposes: window.MVPdfWriter.buildPdf(title, subtitle, headers, rows) -> Uint8Array
 */
(function (global) {
  'use strict';

  var PAGE_W = 792, PAGE_H = 612; // US Letter, landscape
  var MARGIN = 30;
  var HEADER_ROW_FONT_SIZE = 8;
  var BODY_FONT_SIZE = 8;
  var ROW_H = 14;

  // Common Unicode punctuation that WinAnsiEncoding (cp1252) still
  // represents as a single byte, just not at the same code point as
  // Unicode - without this map, survey text like curly apostrophes in
  // names ("Corna'ya") or the em dash in report titles would silently
  // fall back to "?" below.
  var WINANSI_HIGH_MAP = {
    0x2013: 0x96, 0x2014: 0x97, // en dash, em dash
    0x2018: 0x91, 0x2019: 0x92, // left/right single quote
    0x201C: 0x93, 0x201D: 0x94, // left/right double quote
    0x2022: 0x95, 0x2026: 0x85, // bullet, ellipsis
    0x00A0: 0xA0
  };

  function encodePdfText(str) {
    var s = String(str == null ? '' : str);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      var ch;
      if (code <= 255) ch = s[i];
      else if (WINANSI_HIGH_MAP[code] != null) ch = String.fromCharCode(WINANSI_HIGH_MAP[code]);
      else ch = '?';
      if (ch === '\\' || ch === '(' || ch === ')') out += '\\' + ch;
      else out += ch;
    }
    return out;
  }

  function truncateToWidth(text, maxChars) {
    var s = String(text == null ? '' : text);
    if (s.length <= maxChars) return s;
    return maxChars > 3 ? s.slice(0, maxChars - 3) + '...' : s.slice(0, maxChars);
  }

  function str2bytes(str) {
    var bytes = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xFF;
    return bytes;
  }

  function buildPages(title, subtitle, headers, rows) {
    var usableWidth = PAGE_W - MARGIN * 2;
    var colWidth = usableWidth / headers.length;
    var maxChars = Math.max(3, Math.floor(colWidth / (BODY_FONT_SIZE * 0.52)));

    var pages = [];
    var current = [];
    var y = 0;

    function startPage(withTitle) {
      current = [];
      y = PAGE_H - MARGIN;
      if (withTitle) {
        current.push({ text: title, x: MARGIN, y: y, size: 16, bold: true });
        y -= 20;
        current.push({ text: subtitle, x: MARGIN, y: y, size: 9, bold: false });
        y -= 18;
      }
      drawHeaderRow();
    }
    function drawHeaderRow() {
      var x = MARGIN;
      headers.forEach(function (h) {
        current.push({ text: truncateToWidth(h, maxChars), x: x, y: y, size: HEADER_ROW_FONT_SIZE, bold: true });
        x += colWidth;
      });
      y -= 4;
      current.push({ line: true, x1: MARGIN, y1: y, x2: PAGE_W - MARGIN, y2: y });
      y -= ROW_H - 4;
    }
    function finishPage() {
      pages.push(current);
    }

    startPage(true);
    rows.forEach(function (row) {
      if (y < MARGIN + ROW_H) {
        finishPage();
        startPage(false);
      }
      var x = MARGIN;
      row.forEach(function (cell) {
        current.push({ text: truncateToWidth(cell, maxChars), x: x, y: y, size: BODY_FONT_SIZE, bold: false });
        x += colWidth;
      });
      y -= ROW_H;
    });
    finishPage();

    if (!rows.length) {
      current.push({ text: '(no records match the current filters)', x: MARGIN, y: y - ROW_H, size: BODY_FONT_SIZE, bold: false });
    }

    return pages;
  }

  function pageContentStream(items) {
    var ops = [];
    items.forEach(function (item) {
      if (item.line) {
        ops.push('q 0.6 0.6 0.6 RG 0.75 w ' + item.x1 + ' ' + item.y1 + ' m ' + item.x2 + ' ' + item.y2 + ' l S Q');
      } else {
        var font = item.bold ? '/F2' : '/F1';
        ops.push('BT ' + font + ' ' + item.size + ' Tf 1 0 0 1 ' + item.x + ' ' + item.y + ' Tm (' + encodePdfText(item.text) + ') Tj ET');
      }
    });
    return ops.join('\n');
  }

  function buildPdf(title, subtitle, headers, rows) {
    var pages = buildPages(title, subtitle, headers, rows);

    // Object numbering: 1=Catalog, 2=Pages, 3=Font F1, 4=Font F2,
    // then for each page: (page object, content-stream object) pairs.
    var objects = []; // { num, body: string } in final serialization order
    var pageObjNums = [];
    var firstPageObjNum = 5;

    pages.forEach(function (pageItems, i) {
      var pageNum = firstPageObjNum + i * 2;
      var contentNum = pageNum + 1;
      pageObjNums.push(pageNum);
      var stream = pageContentStream(pageItems);
      objects.push({
        num: pageNum,
        body: pageNum + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + ']' +
          ' /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + contentNum + ' 0 R >>\nendobj\n'
      });
      objects.push({
        num: contentNum,
        body: contentNum + ' 0 obj\n<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream\nendobj\n'
      });
    });

    var catalog = { num: 1, body: '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' };
    var pagesObj = {
      num: 2,
      body: '2 0 obj\n<< /Type /Pages /Kids [' + pageObjNums.map(function (n) { return n + ' 0 R'; }).join(' ') + '] /Count ' + pageObjNums.length + ' >>\nendobj\n'
    };
    var font1 = { num: 3, body: '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n' };
    var font2 = { num: 4, body: '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n' };

    var allObjects = [catalog, pagesObj, font1, font2].concat(objects);
    allObjects.sort(function (a, b) { return a.num - b.num; });

    var header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    var parts = [header];
    var offsets = [0]; // offsets[0] unused (object 0 is free list head)
    var runningLength = header.length;

    allObjects.forEach(function (obj) {
      offsets[obj.num] = runningLength;
      parts.push(obj.body);
      runningLength += obj.body.length;
    });

    var xrefStart = runningLength;
    var xrefLines = ['xref', '0 ' + (allObjects.length + 1), '0000000000 65535 f '];
    for (var n = 1; n <= allObjects.length; n++) {
      xrefLines.push(String(offsets[n]).padStart(10, '0') + ' 00000 n ');
    }
    var xref = xrefLines.join('\n') + '\n';
    var trailer = 'trailer\n<< /Size ' + (allObjects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';

    parts.push(xref, trailer);
    var fullString = parts.join('');
    return str2bytes(fullString);
  }

  global.MVPdfWriter = { buildPdf: buildPdf };
})(typeof window !== 'undefined' ? window : this);
