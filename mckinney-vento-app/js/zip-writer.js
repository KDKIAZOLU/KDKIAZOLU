/*
 * Minimal ZIP archive writer, the counterpart to js/zip.js (reader).
 * Writes "stored" (uncompressed) entries only - no DEFLATE encoder is
 * needed for that, and stored entries are perfectly valid ZIP/OOXML
 * (.xlsx, .docx) content that Excel, Word, and LibreOffice all open
 * without complaint. Keeping this write-side simple (vs. implementing a
 * DEFLATE compressor) trades a larger file for a much smaller, more
 * reliably correct amount of code.
 *
 * Exposes: window.MVZipWriter.buildZip([{name, data: Uint8Array|string}]) -> Uint8Array
 */
(function (global) {
  'use strict';

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8Encode(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    // Fallback manual UTF-8 encode
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.codePointAt(i);
      if (code > 0xFFFF) i++;
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
      else if (code < 0x10000) bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
      else bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
    }
    return new Uint8Array(bytes);
  }

  function writeUint32LE(arr, offset, value) {
    arr[offset] = value & 0xFF;
    arr[offset + 1] = (value >>> 8) & 0xFF;
    arr[offset + 2] = (value >>> 16) & 0xFF;
    arr[offset + 3] = (value >>> 24) & 0xFF;
  }
  function writeUint16LE(arr, offset, value) {
    arr[offset] = value & 0xFF;
    arr[offset + 1] = (value >>> 8) & 0xFF;
  }

  function buildZip(files) {
    var chunks = [];
    var centralEntries = [];
    var offset = 0;

    files.forEach(function (file) {
      var nameBytes = utf8Encode(file.name);
      var dataBytes = typeof file.data === 'string' ? utf8Encode(file.data) : file.data;
      var crc = crc32(dataBytes);
      var localHeaderOffset = offset;

      var localHeader = new Uint8Array(30 + nameBytes.length);
      writeUint32LE(localHeader, 0, 0x04034b50);
      writeUint16LE(localHeader, 4, 20);   // version needed
      writeUint16LE(localHeader, 6, 0x0800); // general purpose flag: UTF-8 filenames
      writeUint16LE(localHeader, 8, 0);    // method 0 = stored
      writeUint16LE(localHeader, 10, 0);   // mod time
      writeUint16LE(localHeader, 12, 0);   // mod date
      writeUint32LE(localHeader, 14, crc);
      writeUint32LE(localHeader, 18, dataBytes.length); // compressed size
      writeUint32LE(localHeader, 22, dataBytes.length); // uncompressed size
      writeUint16LE(localHeader, 26, nameBytes.length);
      writeUint16LE(localHeader, 28, 0);   // extra field length
      localHeader.set(nameBytes, 30);

      chunks.push(localHeader, dataBytes);
      offset += localHeader.length + dataBytes.length;

      centralEntries.push({ nameBytes: nameBytes, crc: crc, size: dataBytes.length, localHeaderOffset: localHeaderOffset });
    });

    var centralStart = offset;
    centralEntries.forEach(function (entry) {
      var central = new Uint8Array(46 + entry.nameBytes.length);
      writeUint32LE(central, 0, 0x02014b50);
      writeUint16LE(central, 4, 20);   // version made by
      writeUint16LE(central, 6, 20);   // version needed
      writeUint16LE(central, 8, 0x0800);
      writeUint16LE(central, 10, 0);
      writeUint16LE(central, 12, 0);
      writeUint16LE(central, 14, 0);
      writeUint32LE(central, 16, entry.crc);
      writeUint32LE(central, 20, entry.size);
      writeUint32LE(central, 24, entry.size);
      writeUint16LE(central, 28, entry.nameBytes.length);
      writeUint16LE(central, 30, 0); // extra length
      writeUint16LE(central, 32, 0); // comment length
      writeUint16LE(central, 34, 0); // disk number start
      writeUint16LE(central, 36, 0); // internal attrs
      writeUint32LE(central, 38, 0); // external attrs
      writeUint32LE(central, 42, entry.localHeaderOffset);
      central.set(entry.nameBytes, 46);
      chunks.push(central);
      offset += central.length;
    });
    var centralSize = offset - centralStart;

    var eocd = new Uint8Array(22);
    writeUint32LE(eocd, 0, 0x06054b50);
    writeUint16LE(eocd, 4, 0);
    writeUint16LE(eocd, 6, 0);
    writeUint16LE(eocd, 8, centralEntries.length);
    writeUint16LE(eocd, 10, centralEntries.length);
    writeUint32LE(eocd, 12, centralSize);
    writeUint32LE(eocd, 16, centralStart);
    writeUint16LE(eocd, 20, 0);
    chunks.push(eocd);

    var totalLen = chunks.reduce(function (s, c) { return s + c.length; }, 0);
    var out = new Uint8Array(totalLen);
    var pos = 0;
    chunks.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return out;
  }

  global.MVZipWriter = { buildZip: buildZip, crc32: crc32, utf8Encode: utf8Encode };
})(typeof window !== 'undefined' ? window : this);
