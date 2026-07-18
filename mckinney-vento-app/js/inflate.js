/*
 * Minimal pure-JavaScript RFC1951 "raw DEFLATE" decompressor.
 * Implemented directly from the DEFLATE specification (RFC 1951) so the
 * app can read .xlsx files (which are ZIP archives of XML) with zero
 * external libraries and zero network/build dependencies.
 *
 * Exposes: window.MVInflate.inflateRaw(Uint8Array) -> Uint8Array
 */
(function (global) {
  'use strict';

  var LENGTH_BASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  var LENGTH_EXTRA = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  var DIST_BASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  var DIST_EXTRA = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  var CLC_ORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  function BitReader(bytes) {
    this.bytes = bytes;
    this.pos = 0; // byte position
    this.bitBuf = 0;
    this.bitCount = 0;
  }
  BitReader.prototype.getBit = function () {
    if (this.bitCount === 0) {
      this.bitBuf = this.bytes[this.pos++];
      this.bitCount = 8;
    }
    var bit = this.bitBuf & 1;
    this.bitBuf >>= 1;
    this.bitCount--;
    return bit;
  };
  BitReader.prototype.getBits = function (n) {
    var v = 0;
    for (var i = 0; i < n; i++) v |= this.getBit() << i;
    return v;
  };
  BitReader.prototype.alignByte = function () {
    this.bitBuf = 0;
    this.bitCount = 0;
  };

  function HuffTree() {
    this.counts = new Uint16Array(16); // number of codes of each length
    this.symbols = new Uint16Array(288); // symbols sorted by canonical code order
  }

  function buildTree(tree, lengths, n) {
    var i;
    for (i = 0; i < 16; i++) tree.counts[i] = 0;
    for (i = 0; i < n; i++) tree.counts[lengths[i]]++;
    tree.counts[0] = 0;
    var offs = new Uint16Array(16);
    for (i = 1; i < 16; i++) offs[i] = offs[i - 1] + tree.counts[i - 1];
    for (i = 0; i < n; i++) {
      if (lengths[i]) {
        tree.symbols[offs[lengths[i]]++] = i;
      }
    }
  }

  function decodeSymbol(br, tree) {
    var sum = 0, cur = 0, len = 0;
    do {
      cur = 2 * cur + br.getBit();
      len++;
      sum += tree.counts[len];
      cur -= tree.counts[len];
    } while (cur >= 0);
    return tree.symbols[sum + cur];
  }

  function buildFixedTrees() {
    var i;
    var litLengths = new Uint8Array(288);
    for (i = 0; i < 144; i++) litLengths[i] = 8;
    for (i = 144; i < 256; i++) litLengths[i] = 9;
    for (i = 256; i < 280; i++) litLengths[i] = 7;
    for (i = 280; i < 288; i++) litLengths[i] = 8;
    var litTree = new HuffTree();
    buildTree(litTree, litLengths, 288);

    var distLengths = new Uint8Array(30);
    for (i = 0; i < 30; i++) distLengths[i] = 5;
    var distTree = new HuffTree();
    buildTree(distTree, distLengths, 30);

    return { lit: litTree, dist: distTree };
  }
  var FIXED = buildFixedTrees();

  function GrowBuffer(initialSize) {
    this.buf = new Uint8Array(initialSize || 1 << 16);
    this.len = 0;
  }
  GrowBuffer.prototype.ensure = function (extra) {
    if (this.len + extra > this.buf.length) {
      var newSize = this.buf.length * 2;
      while (newSize < this.len + extra) newSize *= 2;
      var nb = new Uint8Array(newSize);
      nb.set(this.buf.subarray(0, this.len));
      this.buf = nb;
    }
  };
  GrowBuffer.prototype.pushByte = function (b) {
    this.ensure(1);
    this.buf[this.len++] = b;
  };
  GrowBuffer.prototype.copyBack = function (dist, length) {
    this.ensure(length);
    var start = this.len - dist;
    for (var i = 0; i < length; i++) {
      this.buf[this.len + i] = this.buf[start + i];
    }
    this.len += length;
  };
  GrowBuffer.prototype.result = function () {
    return this.buf.subarray(0, this.len);
  };

  function inflateBlock(br, out, litTree, distTree) {
    for (;;) {
      var sym = decodeSymbol(br, litTree);
      if (sym === 256) return; // end of block
      if (sym < 256) {
        out.pushByte(sym);
        continue;
      }
      sym -= 257;
      if (sym >= LENGTH_BASE.length) throw new Error('MVInflate: bad length code');
      var length = LENGTH_BASE[sym] + br.getBits(LENGTH_EXTRA[sym]);
      var distSym = decodeSymbol(br, distTree);
      if (distSym >= DIST_BASE.length) throw new Error('MVInflate: bad distance code');
      var dist = DIST_BASE[distSym] + br.getBits(DIST_EXTRA[distSym]);
      out.copyBack(dist, length);
    }
  }

  function inflateDynamicBlock(br, out) {
    var hlit = br.getBits(5) + 257;
    var hdist = br.getBits(5) + 1;
    var hclen = br.getBits(4) + 4;

    var clcLengths = new Uint8Array(19);
    for (var i = 0; i < hclen; i++) clcLengths[CLC_ORDER[i]] = br.getBits(3);
    var clcTree = new HuffTree();
    buildTree(clcTree, clcLengths, 19);

    var lengths = new Uint8Array(hlit + hdist);
    var idx = 0;
    while (idx < hlit + hdist) {
      var sym = decodeSymbol(br, clcTree);
      if (sym < 16) {
        lengths[idx++] = sym;
      } else if (sym === 16) {
        var prev = idx > 0 ? lengths[idx - 1] : 0;
        var rep = br.getBits(2) + 3;
        while (rep-- > 0) lengths[idx++] = prev;
      } else if (sym === 17) {
        var rep2 = br.getBits(3) + 3;
        while (rep2-- > 0) lengths[idx++] = 0;
      } else if (sym === 18) {
        var rep3 = br.getBits(7) + 11;
        while (rep3-- > 0) lengths[idx++] = 0;
      } else {
        throw new Error('MVInflate: bad code length symbol');
      }
    }

    var litTree = new HuffTree();
    buildTree(litTree, lengths.subarray(0, hlit), hlit);
    var distTree = new HuffTree();
    buildTree(distTree, lengths.subarray(hlit, hlit + hdist), hdist);

    inflateBlock(br, out, litTree, distTree);
  }

  function inflateStoredBlock(br, out) {
    br.alignByte();
    var lo = br.bytes[br.pos++];
    var hi = br.bytes[br.pos++];
    var len = lo | (hi << 8);
    br.pos += 2; // skip NLEN
    out.ensure(len);
    for (var i = 0; i < len; i++) out.pushByte(br.bytes[br.pos++]);
  }

  function inflateRaw(bytes) {
    var br = new BitReader(bytes);
    var out = new GrowBuffer(Math.max(1 << 16, bytes.length * 4));
    var final;
    do {
      final = br.getBit();
      var type = br.getBits(2);
      if (type === 0) {
        inflateStoredBlock(br, out);
      } else if (type === 1) {
        inflateBlock(br, out, FIXED.lit, FIXED.dist);
      } else if (type === 2) {
        inflateDynamicBlock(br, out);
      } else {
        throw new Error('MVInflate: unsupported block type 3');
      }
    } while (!final);
    return out.result();
  }

  global.MVInflate = { inflateRaw: inflateRaw };
})(typeof window !== 'undefined' ? window : this);
