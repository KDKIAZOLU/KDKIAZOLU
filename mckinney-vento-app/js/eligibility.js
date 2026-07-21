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
   * The statute requires a residence to be fixed AND regular AND adequate
   * for a family to be considered NOT homeless - so failing any single one
   * of those three (surfaced here via four follow-up questions: staying
   * with others due to hardship and time-limited stay both speak to
   * "regular"; safety/adequacy speaks to "adequate"; intended permanence
   * speaks to "fixed") is dispositive on its own. It doesn't matter what
   * the primary living-situation question says - one failing follow-up
   * answer is enough to qualify as homeless, full stop, not merely a
   * "contradiction" to flag for review.
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
      supplementalFlags: supplementalFlags
    };

    // Any single failing follow-up answer is dispositive by itself, per the
    // statute's "fixed AND regular AND adequate" test - this overrides
    // whatever the primary living-situation question says.
    if (supplementalFlags.length > 0) {
      result.eligible = true;
      result.category = (primary && primary.eligible === true) ? primary.category : 'Unstable Housing (Follow-Up Indicates Instability)';
      result.basis = 'Residence is not fixed, regular, and adequate: ' + supplementalFlags.join('; ') + '. This alone qualifies as homeless under McKinney-Vento, regardless of the primary living-situation answer.';
      if (!primary) result.needsReview = true; // primary question was still left blank - worth a look for completeness
      return result;
    }

    if (!primary) {
      result.basis = 'No living-situation response and no corroborating instability signals provided.';
      result.needsReview = true;
      return result;
    }

    result.category = primary.category;

    if (primary.eligible === true) {
      result.eligible = true;
      result.basis = 'Living situation reported as "' + primary.category + '", which qualifies as homeless under McKinney-Vento.';
      return result;
    }

    if (primary.eligible === false) {
      result.eligible = false;
      result.basis = 'Living situation reported as stable, owned/leased housing, and all follow-up answers indicate the residence is fixed, regular, and adequate. Not eligible under McKinney-Vento.';
      return result;
    }

    // primary.eligible === null -> unrecognized free-text response, no supplemental flags either
    result.basis = 'Living-situation response ("' + clean.trim(family.livingSituation) + '") was not recognized and no corroborating instability signals were found.';
    result.needsReview = true;
    return result;
  }

  global.MVEligibility = {
    categorizeLivingSituation: categorizeLivingSituation,
    determineEligibility: determineEligibility,
    CATEGORY_RULES: CATEGORY_RULES
  };
})(typeof window !== 'undefined' ? window : this);
