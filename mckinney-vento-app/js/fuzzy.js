/*
 * String similarity utilities used by the column-mapping engine and the
 * school-name correction engine. No external dependencies.
 */
(function (global) {
  'use strict';

  function levenshtein(a, b) {
    if (a === b) return 0;
    var al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    var prev = new Array(bl + 1);
    var curr = new Array(bl + 1);
    for (var j = 0; j <= bl; j++) prev[j] = j;
    for (var i = 1; i <= al; i++) {
      curr[0] = i;
      var ac = a.charCodeAt(i - 1);
      for (j = 1; j <= bl; j++) {
        var cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,      // deletion
          curr[j - 1] + 1,  // insertion
          prev[j - 1] + cost // substitution
        );
      }
      var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[bl];
  }

  function levenshteinSimilarity(a, b) {
    var maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
  }

  var STOPWORDS = {
    'school': 1, 'elementary': 1, 'middle': 1, 'high': 1, 'academy': 1,
    'the': 1, 'of': 1, 'at': 1, 'and': 1, 'for': 1, 'a': 1, 'an': 1,
    'public': 1, 'charter': 1, 'no': 1
  };

  function tokenize(s) {
    return normalizeBasic(s)
      .split(/[^a-z0-9]+/)
      .filter(function (t) { return t.length > 0; });
  }

  function tokenizeSignificant(s) {
    return tokenize(s).filter(function (t) { return !STOPWORDS[t]; });
  }

  function normalizeBasic(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
      .replace(/&/g, ' and ')
      .replace(/[.,'’\/#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Jaccard-style token set similarity, robust to word order and missing "Elementary/Middle School" suffixes
  function tokenSetSimilarity(a, b) {
    var ta = tokenize(a), tb = tokenize(b);
    if (ta.length === 0 || tb.length === 0) return 0;
    var setA = {}, setB = {};
    ta.forEach(function (t) { setA[t] = 1; });
    tb.forEach(function (t) { setB[t] = 1; });
    var intersection = 0;
    for (var k in setA) if (setB[k]) intersection++;
    var union = Object.keys(setA).length + Object.keys(setB).length - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  // Significant-token similarity ignores generic words like "Elementary","School","Middle"
  function significantTokenSimilarity(a, b) {
    var ta = tokenizeSignificant(a), tb = tokenizeSignificant(b);
    if (ta.length === 0 || tb.length === 0) return tokenSetSimilarity(a, b);
    var setA = {}, setB = {};
    ta.forEach(function (t) { setA[t] = 1; });
    tb.forEach(function (t) { setB[t] = 1; });
    var intersection = 0;
    for (var k in setA) if (setB[k]) intersection++;
    var union = Object.keys(setA).length + Object.keys(setB).length - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  // Token-level fuzzy overlap: each token in `a` is matched against its best
  // (unused) counterpart in `b` via Levenshtein similarity rather than exact
  // string equality. This lets minor misspellings within a single word
  // ("Douglas" vs "Douglass", "Rodewell" vs "Rodwell") still count as a
  // match, which plain Jaccard/token-set overlap cannot do.
  function fuzzyTokenOverlap(tokensA, tokensB, simThreshold) {
    if (tokensA.length === 0 || tokensB.length === 0) return 0;
    var usedB = new Array(tokensB.length).fill(false);
    var matched = 0;
    tokensA.forEach(function (ta) {
      var bestIdx = -1, bestSim = 0;
      tokensB.forEach(function (tb, i) {
        if (usedB[i]) return;
        var sim = levenshteinSimilarity(ta, tb);
        if (sim > bestSim) { bestSim = sim; bestIdx = i; }
      });
      if (bestIdx >= 0 && bestSim >= simThreshold) { matched++; usedB[bestIdx] = true; }
    });
    return matched / Math.max(tokensA.length, tokensB.length);
  }

  // Combined score used for header matching and school matching (0..1).
  // Deliberately leans on *significant*-token overlap (ignoring generic
  // words like "Elementary"/"High"/"School") rather than all-token overlap:
  // including those generic words inflates similarity for short official
  // names whose tokens are mostly boilerplate (e.g. "Western High School"
  // would otherwise out-score "Mergenthaler ... High School" against input
  // "Merganthal High School" purely because dividing by a smaller token
  // count makes the 2 shared boilerplate words count for more).
  function combinedScore(a, b) {
    var na = normalizeBasic(a), nb = normalizeBasic(b);
    var lev = levenshteinSimilarity(na, nb);
    var sigOverlap = fuzzyTokenOverlap(tokenizeSignificant(a), tokenizeSignificant(b), 0.72);
    return sigOverlap * 0.75 + lev * 0.25;
  }

  function bestMatch(input, candidates, getText) {
    var best = null, bestScore = -1;
    for (var i = 0; i < candidates.length; i++) {
      var text = getText ? getText(candidates[i]) : candidates[i];
      var score = combinedScore(input, text);
      if (score > bestScore) { bestScore = score; best = candidates[i]; }
    }
    return { match: best, score: bestScore };
  }

  global.MVFuzzy = {
    levenshtein: levenshtein,
    levenshteinSimilarity: levenshteinSimilarity,
    tokenize: tokenize,
    normalizeBasic: normalizeBasic,
    tokenSetSimilarity: tokenSetSimilarity,
    significantTokenSimilarity: significantTokenSimilarity,
    fuzzyTokenOverlap: fuzzyTokenOverlap,
    combinedScore: combinedScore,
    bestMatch: bestMatch
  };
})(typeof window !== 'undefined' ? window : this);
