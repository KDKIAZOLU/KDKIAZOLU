/*
 * Minimal ZIP (PKZIP) archive reader, enough to read .xlsx packages.
 * Supports "stored" (method 0) and "deflate" (method 8) entries.
 * No external dependencies - uses MVInflate for decompression.
 *
 * Exposes: window.MVZip.readZip(ArrayBuffer) -> { names: string[], readText(name), readBytes(name) }
 */
(function (global) {
  'use strict';

  function readZip(arrayBuffer) {
    var bytes = new Uint8Array(arrayBuffer);
    var view = new DataView(arrayBuffer);

    // Find End Of Central Directory record by scanning backwards for signature 0x06054b50
    var EOCD_SIG = 0x06054b50;
    var eocdOffset = -1;
    var maxScan = Math.min(bytes.length, 1 << 16) + 22;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - maxScan); i--) {
      if (view.getUint32(i, true) === EOCD_SIG) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) throw new Error('MVZip: not a valid ZIP file (EOCD not found)');

    var totalEntries = view.getUint16(eocdOffset + 10, true);
    var cdOffset = view.getUint32(eocdOffset + 16, true);

    var entries = {};
    var names = [];
    var offset = cdOffset;
    var CFH_SIG = 0x02014b50;
    for (var e = 0; e < totalEntries; e++) {
      if (view.getUint32(offset, true) !== CFH_SIG) break;
      var method = view.getUint16(offset + 10, true);
      var compSize = view.getUint32(offset + 20, true);
      var uncompSize = view.getUint32(offset + 24, true);
      var nameLen = view.getUint16(offset + 28, true);
      var extraLen = view.getUint16(offset + 30, true);
      var commentLen = view.getUint16(offset + 32, true);
      var localHeaderOffset = view.getUint32(offset + 42, true);
      var nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLen);
      var name = utf8Decode(nameBytes);

      entries[name] = {
        method: method,
        compSize: compSize,
        uncompSize: uncompSize,
        localHeaderOffset: localHeaderOffset
      };
      names.push(name);

      offset += 46 + nameLen + extraLen + commentLen;
    }

    function extract(name) {
      var entry = entries[name];
      if (!entry) return null;
      var LFH_SIG = 0x04034b50;
      var lo = entry.localHeaderOffset;
      if (view.getUint32(lo, true) !== LFH_SIG) {
        throw new Error('MVZip: bad local file header for ' + name);
      }
      var lNameLen = view.getUint16(lo + 26, true);
      var lExtraLen = view.getUint16(lo + 28, true);
      var dataStart = lo + 30 + lNameLen + lExtraLen;
      var compData = bytes.subarray(dataStart, dataStart + entry.compSize);

      if (entry.method === 0) {
        return compData.slice();
      } else if (entry.method === 8) {
        return global.MVInflate.inflateRaw(compData);
      } else {
        throw new Error('MVZip: unsupported compression method ' + entry.method + ' for ' + name);
      }
    }

    function utf8Decode(u8) {
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(u8);
      }
      // Fallback manual UTF-8 decode
      var out = '', i = 0;
      while (i < u8.length) {
        var c = u8[i++];
        if (c < 0x80) {
          out += String.fromCharCode(c);
        } else if (c < 0xE0) {
          out += String.fromCharCode(((c & 0x1F) << 6) | (u8[i++] & 0x3F));
        } else if (c < 0xF0) {
          var c2 = u8[i++], c3 = u8[i++];
          out += String.fromCharCode(((c & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F));
        } else {
          var c2b = u8[i++], c3b = u8[i++], c4b = u8[i++];
          var cp = ((c & 0x07) << 18) | ((c2b & 0x3F) << 12) | ((c3b & 0x3F) << 6) | (c4b & 0x3F);
          cp -= 0x10000;
          out += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
        }
      }
      return out;
    }

    return {
      names: names,
      readBytes: function (name) { return extract(name); },
      readText: function (name) {
        var b = extract(name);
        return b ? utf8Decode(b) : null;
      },
      hasEntry: function (name) { return !!entries[name]; }
    };
  }

  global.MVZip = { readZip: readZip };
})(typeof window !== 'undefined' ? window : this);
