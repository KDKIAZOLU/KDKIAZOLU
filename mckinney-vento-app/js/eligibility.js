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
   */
  function determineEligibility(family) {
    var primary = categorizeLivingSituation(family.livingSituation);
    var supplementalFlags = [];

    if (family.stayingWithOthers === true) supplementalFlags.push('Staying with others due to loss of housing/financial hardship');
    if (family.timeLimitOnStay === true) supplementalFlags.push('Time limit/condition on current stay');
    var safe = clean.trim(family.housingSafeAdequate).toLowerCase();
    if (safe === 'no' || safe.indexOf('some concerns') !== -1) supplementalFlags.push('Housing reported as not safe/adequate');
    var permanent = clean.trim(family.housingPermanent).toLowerCase();
    if (permanent === 'no' || permanent.indexOf('not sure') !== -1) supplementalFlags.push('Housing arrangement not intended to be permanent');

    var result = {
      eligible: null,
      category: 'Unknown/Insufficient Data',
      basis: '',
      needsReview: false,
      supplementalFlags: supplementalFlags
    };

    if (!primary) {
      // No primary answer at all - fall back entirely to supplemental signals
      if (supplementalFlags.length > 0) {
        result.eligible = true;
        result.category = 'Doubled-Up (Sharing Housing)';
        result.basis = 'Inferred from follow-up answers (no direct living-situation response): ' + supplementalFlags.join('; ');
        result.needsReview = true;
      } else {
        result.basis = 'No living-situation response and no corroborating risk signals provided.';
        result.needsReview = true;
      }
      return result;
    }

    result.category = primary.category;

    if (primary.eligible === true) {
      result.eligible = true;
      result.basis = 'Living situation reported as "' + primary.category + '", which qualifies as homeless under McKinney-Vento.';
      if (supplementalFlags.length) result.basis += ' Corroborated by: ' + supplementalFlags.join('; ') + '.';
      return result;
    }

    if (primary.eligible === false) {
      if (supplementalFlags.length > 0) {
        // Contradiction: says stable housing but also reports risk signals - flag for human review
        result.eligible = null;
        result.basis = 'Reported stable owned/leased housing, but follow-up answers suggest possible instability: ' + supplementalFlags.join('; ') + '. Needs manual review.';
        result.needsReview = true;
      } else {
        result.eligible = false;
        result.basis = 'Living situation reported as stable, owned/leased housing with no corroborating risk signals. Not eligible under McKinney-Vento.';
      }
      return result;
    }

    // primary.eligible === null -> unrecognized free-text response
    if (supplementalFlags.length > 0) {
      result.eligible = true;
      result.basis = 'Living-situation response was unrecognized, but follow-up answers indicate housing instability: ' + supplementalFlags.join('; ') + '.';
      result.needsReview = true;
    } else {
      result.basis = 'Living-situation response ("' + clean.trim(family.livingSituation) + '") was not recognized and no corroborating signals were found.';
      result.needsReview = true;
    }
    return result;
  }

  global.MVEligibility = {
    categorizeLivingSituation: categorizeLivingSituation,
    determineEligibility: determineEligibility,
    CATEGORY_RULES: CATEGORY_RULES
  };
})(typeof window !== 'undefined' ? window : this);
