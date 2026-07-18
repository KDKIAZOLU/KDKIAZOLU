/*
 * School-name correction engine.
 * Given a messy, misspelled, or abbreviated school name from a survey
 * response, finds the best matching official school name from the
 * reference list (SY2526_School_List.xlsx by default), using:
 *   1. Exact match (case/whitespace-insensitive)
 *   2. Known alias/acronym lookup
 *   3. User-saved manual overrides (persisted in localStorage)
 *   4. Fuzzy string matching (Levenshtein + token similarity)
 *
 * The reference list and user overrides can be replaced/extended at
 * runtime without touching any code, so a future school year's list
 * (or a different district entirely) can be dropped in via Settings.
 */
(function (global) {
  'use strict';

  // Tuned empirically against the sample survey's 693 school-name entries:
  // scores >= 0.55 were, on manual spot-check, uniformly correct matches
  // (mostly single-word shorthand like "Waverly" for "Waverly Elementary/
  // Middle School", or minor typos); scores between 0.25 and 0.55 were a
  // genuine mix of correct-but-terse entries and truly wrong guesses (e.g.
  // out-of-district schools, unrelated free text) - exactly the zone that
  // should be surfaced to a human rather than auto-applied.
  var CONFIDENCE = {
    AUTO_ACCEPT: 0.55,   // apply correction silently
    SUGGEST: 0.25        // show as a suggestion for human review
  };

  function key(s) {
    return global.MVFuzzy.normalizeBasic(s).replace(/\s+/g, ' ').trim();
  }

  function SchoolMatcher(referenceList, aliases, overrides) {
    this.referenceList = referenceList || [];
    this.aliases = aliases || {};
    this.overrides = overrides || {}; // key(inputText) -> officialName
    this._exactIndex = {};
    this._buildIndex();
  }

  SchoolMatcher.prototype._buildIndex = function () {
    var self = this;
    this._exactIndex = {};
    this.referenceList.forEach(function (s) {
      self._exactIndex[key(s.name)] = s.name;
    });
  };

  SchoolMatcher.prototype.setOverride = function (rawInput, officialName) {
    this.overrides[key(rawInput)] = officialName;
  };

  SchoolMatcher.prototype.removeOverride = function (rawInput) {
    delete this.overrides[key(rawInput)];
  };

  SchoolMatcher.prototype.match = function (rawInput) {
    var input = (rawInput || '').trim();
    if (!input) {
      return { input: input, matched: null, method: 'empty', score: 0, needsReview: false };
    }
    var k = key(input);

    if (this.overrides[k]) {
      return { input: input, matched: this.overrides[k], method: 'override', score: 1, needsReview: false };
    }
    if (this._exactIndex[k]) {
      return { input: input, matched: this._exactIndex[k], method: 'exact', score: 1, needsReview: false };
    }
    if (this.aliases[k]) {
      return { input: input, matched: this.aliases[k], method: 'alias', score: 0.98, needsReview: false };
    }

    // Alias containment: an alias key (e.g. "mervo", "carver vo tech") is
    // considered matched if every one of its tokens appears among the
    // input's tokens - handles inputs like "Mervo high school" that embed
    // a known nickname alongside extra words. The most specific (longest
    // token-count) alias wins when several contain-match.
    var inputTokens = {};
    global.MVFuzzy.tokenize(input).forEach(function (t) { inputTokens[t] = 1; });
    var bestContainAlias = null, bestContainLen = 0;
    for (var aKey in this.aliases) {
      var aTokens = global.MVFuzzy.tokenize(aKey);
      var allPresent = aTokens.length > 0 && aTokens.every(function (t) { return inputTokens[t]; });
      if (allPresent && aTokens.length > bestContainLen) {
        bestContainLen = aTokens.length;
        bestContainAlias = aKey;
      }
    }
    if (bestContainAlias) {
      return { input: input, matched: this.aliases[bestContainAlias], method: 'alias', score: 0.95, needsReview: false };
    }

    // Fuzzy match against official names (and secondarily against alias keys,
    // so a near-miss on a known nickname still resolves confidently)
    var best = global.MVFuzzy.bestMatch(input, this.referenceList, function (s) { return s.name; });
    var bestAliasKey = null, bestAliasScore = -1;
    for (var aliasKey in this.aliases) {
      var score = global.MVFuzzy.combinedScore(input, aliasKey);
      if (score > bestAliasScore) { bestAliasScore = score; bestAliasKey = aliasKey; }
    }

    var candidateName = best.match ? best.match.name : null;
    var candidateScore = best.score;
    if (bestAliasScore > candidateScore) {
      candidateName = this.aliases[bestAliasKey];
      candidateScore = bestAliasScore;
    }

    if (!candidateName) {
      return { input: input, matched: null, method: 'none', score: 0, needsReview: true };
    }

    if (candidateScore >= CONFIDENCE.AUTO_ACCEPT) {
      return { input: input, matched: candidateName, method: 'fuzzy', score: candidateScore, needsReview: false };
    }
    if (candidateScore >= CONFIDENCE.SUGGEST) {
      return { input: input, matched: candidateName, method: 'fuzzy-low', score: candidateScore, needsReview: true };
    }
    return { input: input, matched: candidateName, method: 'fuzzy-verylow', score: candidateScore, needsReview: true };
  };

  global.MVSchools = {
    SchoolMatcher: SchoolMatcher,
    CONFIDENCE: CONFIDENCE,
    key: key
  };
})(typeof window !== 'undefined' ? window : this);
