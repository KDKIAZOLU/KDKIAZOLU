/*
 * Minimal .xlsx (OOXML spreadsheet) writer built on js/zip-writer.js.
 * Produces a single-sheet workbook from a header row + array-of-arrays,
 * with numbers written as native numeric cells and everything else as
 * inline strings (no sharedStrings.xml needed, which keeps this simple).
 *
 * Exposes: window.MVXlsxWriter.buildXlsx(sheetName, headers, rows) -> Uint8Array
 */
(function (global) {
  'use strict';

  function escapeXml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c];
    });
  }

  function colName(index) {
    // 0 -> A, 25 -> Z, 26 -> AA, ...
    var name = '';
    index += 1;
    while (index > 0) {
      var rem = (index - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      index = Math.floor((index - 1) / 26);
    }
    return name;
  }

  function cellXml(colIndex, rowIndex, value) {
    var ref = colName(colIndex) + rowIndex;
    if (typeof value === 'number' && isFinite(value)) {
      return '<c r="' + ref + '" t="n"><v>' + value + '</v></c>';
    }
    var text = value == null ? '' : String(value);
    return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + escapeXml(text) + '</t></is></c>';
  }

  function buildSheetXml(headers, rows) {
    var rowsXml = [];
    rowsXml.push('<row r="1">' + headers.map(function (h, i) { return cellXml(i, 1, h); }).join('') + '</row>');
    rows.forEach(function (row, r) {
      var rowNum = r + 2;
      rowsXml.push('<row r="' + rowNum + '">' + row.map(function (v, i) { return cellXml(i, rowNum, v); }).join('') + '</row>');
    });
    var lastCol = colName(Math.max(headers.length - 1, 0));
    var lastRow = rows.length + 1;
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + lastCol + lastRow + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetData>' + rowsXml.join('') + '</sheetData>' +
      '</worksheet>';
  }

  var CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  function buildWorkbookXml(sheetName) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + escapeXml(sheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>';
  }

  var WORKBOOK_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  function buildXlsx(sheetName, headers, rows) {
    var files = [
      { name: '[Content_Types].xml', data: CONTENT_TYPES },
      { name: '_rels/.rels', data: ROOT_RELS },
      { name: 'xl/workbook.xml', data: buildWorkbookXml(sheetName) },
      { name: 'xl/_rels/workbook.xml.rels', data: WORKBOOK_RELS },
      { name: 'xl/styles.xml', data: STYLES_XML },
      { name: 'xl/worksheets/sheet1.xml', data: buildSheetXml(headers, rows) }
    ];
    return global.MVZipWriter.buildZip(files);
  }

  global.MVXlsxWriter = { buildXlsx: buildXlsx };
})(typeof window !== 'undefined' ? window : this);
