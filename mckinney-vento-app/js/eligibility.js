/*
 * McKinney-Vento Homeless Assistance Act eligibility engine.
 *
 * Federal definition (42 U.S.C. 11434a): a child/youth who "lacks a fixed,
 * regular, and adequate nighttime residence," which includes children who
 * are: sharing housing due to loss of housing/economic hardship ("doubled
 * up"); living in motels/hotels/trailer parks/camping grounds due to lack
 * of alternative accommodations; living in emergency or transitional
 * shelters; or living in cars, parks, public spaces, substandard housing,
 * bus/train stations, or similar settings ("unsheltered"). Children living
 * in housing they/their family own or lease under a regular, permanent
 * arrangement are NOT considered homeless under the Act.
 *
 * This module maps the survey's "current living situation" answer (and
 * corroborating follow-up answers) onto that federal framework and the
 * subcategories commonly used in McKinney-Vento reporting: Doubled-Up,
 * Hotels/Motels, Shelters, Transitional Housing, Unsheltered/Other.
 */
(function (global) {
  'use strict';

  var clean = global.MVCleaning;

  var CATEGORY_RULES = [
    { test: /own.*mortgage|rent.*lease|own or rent|apartment that we own/, category: 'Stable Housing (Owned/Leased)', eligible: false },
    { test: /hotel|motel/, category: 'Hotels/Motels', eligible: true },
    { test: /transitional/, category: 'Transitional Housing', eligible: true },
    { test: /shelter/, category: 'Shelters', eligible: true },
    { test: /temporary.*with others|staying with others|doubled/, category: 'Doubled-Up (Sharing Housing)', eligible: true },
    { test: /other temporary/, category: 'Unsheltered/Other', eligible: true }
  ];

  function categorizeLivingSituation(raw) {
    var v = clean.trim(raw).toLowerCase();
    if (!v) return null;
    for (var i = 0; i < CATEGORY_RULES.length; i++) {
      if (CATEGORY_RULES[i].test.test(v)) {
        return { category: CATEGORY_RULES[i].category, eligible: CATEGORY_RULES[i].eligible };
      }
    }
    return { category: 'Other/Unrecognized Response', eligible: null };
  }

  /**
   * family: normalized family record with cleaned fields:
   *   livingSituation, stayingWithOthers (bool|null), timeLimitOnStay (bool|null),
   *   housingSafeAdequate (string englishPortion), housingPermanent (string englishPortion)
   *
   * Precedence:
   *   1. The primary living-situation question is dispositive whenever it's
   *      answered with a recognized response. "In a home or apartment that
   *      we own (mortgage) or rent (lease)" means NOT eligible, full stop -
   *      it is not overridden by the follow-up questions, since a family
   *      that owns/rents a stable home has a fixed, regular, and adequate
   *      residence by definition. Likewise, any of the homeless-indicating
   *      categories (shelter, hotel/motel, transitional, doubled-up,
   *      unsheltered) is dispositive on its own toward ELIGIBLE.
   *   2. Only when the primary question is left blank or answered with
   *      unrecognized free text do the four follow-up questions (staying
   *      with others due to hardship and a time-limited stay both speak to
   *      "regular"; safety/adequacy speaks to "adequate"; intended
   *      permanence speaks to "fixed") serve as a fallback test: any single
   *      one indicating instability is enough to mark the family eligible.
   *   A stable primary answer alongside a contradicting follow-up (e.g.
   *   "we own our home" but also "there's a time limit on our stay") is
   *   still recorded as NOT eligible per the primary response, but the
   *   contradiction itself is surfaced separately as a data-quality note
   *   worth a human double-checking (see contradictionFlags below).
   */
  function determineEligibility(family) {
    var primary = categorizeLivingSituation(family.livingSituation);
    var supplementalFlags = [];

    if (family.stayingWithOthers === true) supplementalFlags.push('Staying with others due to loss of housing/financial hardship (not "regular")');
    if (family.timeLimitOnStay === true) supplementalFlags.push('Time limit/condition on current stay (not "regular")');
    var safe = clean.trim(family.housingSafeAdequate).toLowerCase();
    if (safe === 'no' || safe.indexOf('some concerns') !== -1) supplementalFlags.push('Housing reported as not safe/adequate (not "adequate")');
    var permanent = clean.trim(family.housingPermanent).toLowerCase();
    if (permanent === 'no' || permanent.indexOf('not sure') !== -1) supplementalFlags.push('Housing arrangement not intended to be permanent (not "fixed")');

    var result = {
      eligible: null,
      category: 'Unknown/Insufficient Data',
      basis: '',
      needsReview: false,
      supplementalFlags: supplementalFlags,
      contradictionFlags: [] // populated only when a stable primary answer conflicts with a follow-up
    };

    if (primary && primary.eligible === false) {
      // Dispositive: owns/rents a stable home. Not overridden by follow-ups.
      result.eligible = false;
      result.category = primary.category;
      result.basis = 'Living situation reported as stable, owned/leased housing. Not eligible under McKinney-Vento.';
      if (supplementalFlags.length > 0) {
        result.contradictionFlags = supplementalFlags;
        result.basis += ' Note: follow-up answers suggest possible instability (' + supplementalFlags.join('; ') + '), but the primary "own/rent" response is treated as dispositive - worth a human double-check.';
      }
      return result;
    }

    if (primary && primary.eligible === true) {
      // Dispositive toward eligible: a recognized homeless-indicating category.
      result.eligible = true;
      result.category = primary.category;
      result.basis = 'Living situation reported as "' + primary.category + '", which qualifies as homeless under McKinney-Vento.';
      return result;
    }

    // Primary question was left blank, or answered with unrecognized free
    // text - fall back to the follow-up questions as the best available signal.
    if (supplementalFlags.length > 0) {
      result.eligible = true;
      result.category = 'Unstable Housing (Follow-Up Indicates Instability)';
      result.basis = (primary ? 'Living-situation response was unrecognized' : 'No living-situation response was given') +
        ', but follow-up answers indicate the residence is not fixed, regular, and adequate: ' + supplementalFlags.join('; ') + '.';
      result.needsReview = true; // primary question missing/unclear - worth a look for completeness
      return result;
    }

    result.basis = primary
      ? 'Living-situation response ("' + clean.trim(family.livingSituation) + '") was not recognized and no corroborating instability signals were found.'
      : 'No living-situation response and no corroborating instability signals provided.';
    result.needsReview = true;
    return result;
  }

  global.MVEligibility = {
    categorizeLivingSituation: categorizeLivingSituation,
    determineEligibility: determineEligibility,
    CATEGORY_RULES: CATEGORY_RULES
  };
})(typeof window !== 'undefined' ? window : this);
