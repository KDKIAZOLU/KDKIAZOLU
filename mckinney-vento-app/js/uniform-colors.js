/*
 * Uniform color normalization.
 *
 * The survey's uniform color field is free text, bilingual, and often
 * describes a shirt color and a pants color together in one sentence
 * ("Black shirt, khaki pants" / "Camisa azul pantalón caqui") - 329
 * distinct values across 693 students in a real sample, which makes it
 * useless as a filter dropdown on its own. Rather than force each
 * response into a single bucket (which would misrepresent two-color
 * answers), this extracts every canonical color keyword mentioned, in
 * either language, as a set of labels - a student can match "Black" AND
 * "Khaki/Tan/Brown" from the same raw answer.
 *
 * Responses with no recognizable color keyword (e.g. "N/A", "Not sure")
 * are left with an empty label set rather than force-matched to a color -
 * about 8% of populated responses in the sample, and it would be
 * actively wrong to guess a color for them.
 */
(function (global) {
  'use strict';

  var COLOR_KEYWORDS = [
    { label: 'Black', re: /black|negr[oa]s?/i },
    { label: 'Blue', re: /blue|navy|azul(?:es)?|celeste|marino/i },
    { label: 'Gray', re: /gray|grey|gris/i },
    { label: 'Green', re: /green|verde/i },
    { label: 'Burgundy/Maroon', re: /burgundy|maroon|burgendey/i },
    { label: 'Gold/Yellow', re: /gold|yellow|amarillo|dorado/i },
    { label: 'White', re: /white|blanc[oa]/i },
    { label: 'Khaki/Tan/Brown', re: /khaki|kaki|caqui|\btan\b|beige|beis|crema|cafe|café|brown|marr[oó]n/i },
    { label: 'Red', re: /\bred\b|rojo/i },
    { label: 'Purple', re: /purple|morado|p[uú]rpura/i }
  ];

  function extractColorLabels(raw) {
    var text = String(raw || '');
    if (!text.trim()) return [];
    var found = [];
    COLOR_KEYWORDS.forEach(function (c) {
      if (c.re.test(text)) found.push(c.label);
    });
    return found;
  }

  global.MVUniformColors = {
    COLOR_KEYWORDS: COLOR_KEYWORDS,
    extractColorLabels: extractColorLabels
  };
})(typeof window !== 'undefined' ? window : this);
