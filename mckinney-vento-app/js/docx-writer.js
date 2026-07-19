/*
 * Minimal .docx (WordprocessingML) writer built on js/zip-writer.js.
 * Produces a title paragraph followed by a bordered table - a report
 * layout, not a full-fidelity data dump (see js/pdf-writer.js comment
 * for why report exports use a curated, narrower column set).
 *
 * Exposes: window.MVDocxWriter.buildDocx(title, subtitle, headers, rows) -> Uint8Array
 */
(function (global) {
  'use strict';

  function escapeXml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c];
    });
  }

  function cellXml(text, bold, colWidthDxa) {
    var runProps = bold ? '<w:rPr><w:b/></w:rPr>' : '';
    return '<w:tc><w:tcPr><w:tcW w:w="' + colWidthDxa + '" w:type="dxa"/></w:tcPr>' +
      '<w:p><w:r>' + runProps + '<w:t xml:space="preserve">' + escapeXml(text) + '</w:t></w:r></w:p></w:tc>';
  }

  function rowXml(cells, bold, colWidths) {
    return '<w:tr>' + cells.map(function (c, i) { return cellXml(c, bold, colWidths[i]); }).join('') + '</w:tr>';
  }

  // Landscape US Letter: 15840 dxa (twips) wide, 720 dxa margins each side.
  var PAGE_WIDTH_DXA = 15840;
  var MARGIN_DXA = 720;

  function tblGridXml(colWidths) {
    return '<w:tblGrid>' + colWidths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>';
  }

  function buildDocumentXml(title, subtitle, headers, rows) {
    var usableWidth = PAGE_WIDTH_DXA - MARGIN_DXA * 2;
    var colWidth = Math.floor(usableWidth / headers.length);
    var colWidths = headers.map(function () { return colWidth; });
    var tableWidth = colWidth * headers.length;

    var tableRows = [rowXml(headers, true, colWidths)];
    rows.forEach(function (row) {
      tableRows.push(rowXml(row.map(function (v) { return v == null ? '' : String(v); }), false, colWidths));
    });

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t xml:space="preserve">' + escapeXml(title) + '</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">' + escapeXml(subtitle) + '</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:tbl>' +
      '<w:tblPr><w:tblW w:w="' + tableWidth + '" w:type="dxa"/>' +
      '<w:tblBorders>' +
      '<w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/>' +
      '<w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/>' +
      '<w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/>' +
      '</w:tblBorders>' +
      '</w:tblPr>' +
      tblGridXml(colWidths) +
      tableRows.join('') +
      '</w:tbl>' +
      '<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>' +
      '</w:body>' +
      '</w:document>';
  }

  var CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '</Types>';

  var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>';

  function buildCoreXml(title) {
    var now = new Date().toISOString();
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + escapeXml(title) + '</dc:title>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
      '</cp:coreProperties>';
  }

  var APP_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
    '<Application>McKinney-Vento Survey Manager</Application>' +
    '</Properties>';

  function buildDocx(title, subtitle, headers, rows) {
    var files = [
      { name: '[Content_Types].xml', data: CONTENT_TYPES },
      { name: '_rels/.rels', data: ROOT_RELS },
      { name: 'docProps/core.xml', data: buildCoreXml(title) },
      { name: 'docProps/app.xml', data: APP_XML },
      { name: 'word/document.xml', data: buildDocumentXml(title, subtitle, headers, rows) }
    ];
    return global.MVZipWriter.buildZip(files);
  }

  global.MVDocxWriter = { buildDocx: buildDocx };
})(typeof window !== 'undefined' ? window : this);
