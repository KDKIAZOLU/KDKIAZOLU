/*
 * Minimal .xlsx workbook reader built on MVZip + MVInflate + the browser's
 * built-in DOMParser (no external libraries).
 *
 * Exposes: window.MVXlsx.parse(ArrayBuffer) -> {
 *   sheetNames: string[],
 *   sheets: { [name]: { rows: any[][], header: string[] } }
 * }
 */
(function (global) {
  'use strict';

  var BUILTIN_DATE_FMT_IDS = {
    14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1,
    27: 1, 28: 1, 29: 1, 30: 1, 31: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1,
    45: 1, 46: 1, 47: 1, 50: 1, 57: 1
  };

  function excelSerialToISODate(serial) {
    // Excel's epoch is 1899-12-30 (accounts for the 1900 leap-year bug)
    var utcDays = Math.floor(serial) - 25569;
    var utcMs = utcDays * 86400 * 1000;
    var date = new Date(utcMs);
    var frac = serial - Math.floor(serial);
    if (frac > 0.0001) {
      var totalSeconds = Math.round(frac * 86400);
      date = new Date(utcMs + totalSeconds * 1000);
      return date.toISOString();
    }
    var y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function colLettersToIndex(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) {
      n = n * 26 + (letters.charCodeAt(i) - 64);
    }
    return n - 1;
  }

  function parseSharedStrings(xmlText) {
    if (!xmlText) return [];
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    var siNodes = doc.getElementsByTagName('si');
    var arr = [];
    for (var i = 0; i < siNodes.length; i++) {
      var tNodes = siNodes[i].getElementsByTagName('t');
      if (tNodes.length === 1 && siNodes[i].getElementsByTagName('r').length === 0) {
        arr.push(tNodes[0].textContent);
      } else {
        // Rich text: concatenate all <t> runs
        var text = '';
        for (var j = 0; j < tNodes.length; j++) text += tNodes[j].textContent;
        arr.push(text);
      }
    }
    return arr;
  }

  function parseStyles(xmlText) {
    var dateFmtByStyleIdx = {};
    if (!xmlText) return dateFmtByStyleIdx;
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    var customDateFmtIds = {};
    var numFmts = doc.getElementsByTagName('numFmts');
    if (numFmts.length) {
      var fmtNodes = numFmts[0].getElementsByTagName('numFmt');
      for (var i = 0; i < fmtNodes.length; i++) {
        var id = parseInt(fmtNodes[i].getAttribute('numFmtId'), 10);
        var code = fmtNodes[i].getAttribute('formatCode') || '';
        if (/[ymdhs]/i.test(code) && !/general/i.test(code)) {
          customDateFmtIds[id] = 1;
        }
      }
    }
    var cellXfsNodes = doc.getElementsByTagName('cellXfs');
    if (cellXfsNodes.length) {
      var xfNodes = cellXfsNodes[0].getElementsByTagName('xf');
      for (var s = 0; s < xfNodes.length; s++) {
        var numFmtId = parseInt(xfNodes[s].getAttribute('numFmtId') || '0', 10);
        if (BUILTIN_DATE_FMT_IDS[numFmtId] || customDateFmtIds[numFmtId]) {
          dateFmtByStyleIdx[s] = 1;
        }
      }
    }
    return dateFmtByStyleIdx;
  }

  function parseWorkbookXml(xmlText) {
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    var sheetNodes = doc.getElementsByTagName('sheet');
    var sheets = [];
    for (var i = 0; i < sheetNodes.length; i++) {
      sheets.push({
        name: sheetNodes[i].getAttribute('name'),
        sheetId: sheetNodes[i].getAttribute('sheetId'),
        rId: sheetNodes[i].getAttribute('r:id') || sheetNodes[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
      });
    }
    return sheets;
  }

  function parseRelsXml(xmlText) {
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    var relNodes = doc.getElementsByTagName('Relationship');
    var map = {};
    for (var i = 0; i < relNodes.length; i++) {
      map[relNodes[i].getAttribute('Id')] = relNodes[i].getAttribute('Target');
    }
    return map;
  }

  function parseSheetXml(xmlText, sharedStrings, dateFmtByStyleIdx) {
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    var rowNodes = doc.getElementsByTagName('row');
    var grid = [];
    var maxCol = 0;
    for (var r = 0; r < rowNodes.length; r++) {
      var rowNode = rowNodes[r];
      var rowIdx = parseInt(rowNode.getAttribute('r'), 10) - 1;
      var cellNodes = rowNode.getElementsByTagName('c');
      var rowArr = grid[rowIdx] || (grid[rowIdx] = []);
      for (var c = 0; c < cellNodes.length; c++) {
        var cellNode = cellNodes[c];
        var ref = cellNode.getAttribute('r') || '';
        var colLetters = ref.replace(/[0-9]/g, '');
        var colIdx = colLetters ? colLettersToIndex(colLetters) : c;
        var type = cellNode.getAttribute('t');
        var styleIdx = cellNode.getAttribute('s') ? parseInt(cellNode.getAttribute('s'), 10) : null;
        var vNode = cellNode.getElementsByTagName('v')[0];
        var value = null;

        if (type === 's') {
          var sIdx = vNode ? parseInt(vNode.textContent, 10) : -1;
          value = sharedStrings[sIdx] != null ? sharedStrings[sIdx] : '';
        } else if (type === 'inlineStr') {
          var isNode = cellNode.getElementsByTagName('is')[0];
          value = isNode ? isNode.textContent : '';
        } else if (type === 'str') {
          value = vNode ? vNode.textContent : '';
        } else if (type === 'b') {
          value = vNode ? vNode.textContent === '1' : false;
        } else {
          // numeric (or blank)
          if (vNode) {
            var num = parseFloat(vNode.textContent);
            if (styleIdx != null && dateFmtByStyleIdx[styleIdx]) {
              value = excelSerialToISODate(num);
            } else {
              value = num;
            }
          } else {
            value = null;
          }
        }
        rowArr[colIdx] = value;
        if (colIdx > maxCol) maxCol = colIdx;
      }
    }
    // Normalize into a dense 2D array
    var out = [];
    for (var i2 = 0; i2 < grid.length; i2++) {
      var row = grid[i2] || [];
      var dense = [];
      for (var j = 0; j <= maxCol; j++) dense.push(row[j] != null ? row[j] : '');
      out.push(dense);
    }
    return out;
  }

  function parse(arrayBuffer) {
    var zip = global.MVZip.readZip(arrayBuffer);
    var workbookXml = zip.readText('xl/workbook.xml');
    if (!workbookXml) throw new Error('Not a valid .xlsx file (missing xl/workbook.xml)');
    var sheetsMeta = parseWorkbookXml(workbookXml);
    var relsXml = zip.readText('xl/_rels/workbook.xml.rels');
    var relsMap = relsXml ? parseRelsXml(relsXml) : {};

    var sharedStringsXml = zip.readText('xl/sharedStrings.xml');
    var sharedStrings = parseSharedStrings(sharedStringsXml);

    var stylesXml = zip.readText('xl/styles.xml');
    var dateFmtByStyleIdx = parseStyles(stylesXml);

    var sheetNames = [];
    var sheets = {};

    for (var i = 0; i < sheetsMeta.length; i++) {
      var meta = sheetsMeta[i];
      var target = relsMap[meta.rId];
      if (!target) continue;
      var path = target.indexOf('/') === 0 ? target.slice(1) : 'xl/' + target;
      var sheetXml = zip.readText(path);
      if (!sheetXml) continue;
      var rows = parseSheetXml(sheetXml, sharedStrings, dateFmtByStyleIdx);
      var header = rows.length ? rows[0] : [];
      sheetNames.push(meta.name);
      sheets[meta.name] = { rows: rows, header: header };
    }

    return { sheetNames: sheetNames, sheets: sheets };
  }

  global.MVXlsx = { parse: parse };
})(typeof window !== 'undefined' ? window : this);
