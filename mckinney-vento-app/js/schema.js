/*
 * Flexible import / schema-mapping engine.
 *
 * Instead of relying on fixed column positions, every incoming header is
 * scored against a dictionary of canonical field synonyms (English +
 * Spanish, since the source survey is bilingual) and assigned to the
 * best-matching canonical field automatically. This lets the same app
 * ingest a differently-ordered, renamed, or partially-different CSV/XLSX
 * export (e.g. next school year's form) without any code changes -
 * only the synonym dictionary or a saved mapping profile needs to grow.
 *
 * The source form also repeats an entire "student" block of columns once
 * per enrolled child (Google Forms "add another student" pattern). The
 * engine detects these repeating blocks by locating every column that
 * matches the "Student Name" anchor field, then classifies every other
 * column as either a household/family-level field or a member of the
 * nearest preceding student block.
 */
(function (global) {
  'use strict';

  var fuzzy = global.MVFuzzy;

  function norm(s) {
    return fuzzy.normalizeBasic(s);
  }
  function tokenSet(s) {
    var toks = fuzzy.tokenize(s);
    var set = {};
    toks.forEach(function (t) { set[t] = 1; });
    return set;
  }

  // Fraction of the synonym phrase's own tokens that appear in the header text.
  // Robust to headers that are long, bilingual, and contain extra boilerplate.
  function containment(headerTokenSet, synonymPhrase) {
    var synToks = fuzzy.tokenize(synonymPhrase);
    if (synToks.length === 0) return 0;
    var matched = 0;
    synToks.forEach(function (t) { if (headerTokenSet[t]) matched++; });
    return matched / synToks.length;
  }

  var FAMILY_FIELDS = [
    { id: 'timestamp', label: 'Timestamp', type: 'text',
      synonyms: ['timestamp', 'date submitted', 'submission date', 'marca temporal'] },
    { id: 'parentName', label: 'Parent/Guardian Name', type: 'text',
      synonyms: ['parent guardian name', 'nombre del padre o tutor', 'nombre del padre', 'guardian name', 'parent name'] },
    { id: 'currentAddress', label: 'Current Temporary Address', type: 'text',
      synonyms: ['current temporary address', 'direccion temporal actual', 'current address', 'home address'] },
    { id: 'contactInfo', label: 'Contact Information', type: 'text',
      synonyms: ['contact information', 'informacion de contacto', 'phone number email', 'contact info'] },
    { id: 'livingSituation', label: 'Current Living Situation', type: 'choice',
      synonyms: [
        'which best describe where your family is currently living',
        'cual describe mejor donde vive actualmente su familia',
        'current living situation', 'housing status', 'where does your family currently live'
      ] },
    { id: 'shelterName', label: 'Shelter / Hotel / Program Name', type: 'text',
      synonyms: [
        'name of the shelter hotel motel or transitional housing program',
        'nombre del albergue hotel hostal o programa de vivienda transitoria',
        'shelter name'
      ] },
    { id: 'stayingWithOthers', label: 'Staying With Others (loss of housing)', type: 'yesno',
      synonyms: [
        'are you staying with others because of loss of housing financial hardship',
        'esta viviendo con otras personas debido a la perdida de vivienda',
        'staying with others due to loss of housing'
      ] },
    { id: 'timeLimitOnStay', label: 'Time Limit / Condition on Stay', type: 'yesno',
      synonyms: [
        'is there a time limit or condition on how long you can stay',
        'hay un limite de tiempo o alguna condicion para quedarse',
        'time limit on stay'
      ] },
    { id: 'housingSafeAdequate', label: 'Housing Feels Safe & Adequate', type: 'choice',
      synonyms: [
        'does your current housing feel safe and adequate for your family',
        'en su vivienda actual se siente segura y adecuada para su familia',
        'housing safe and adequate'
      ] },
    { id: 'housingPermanent', label: 'Housing Intended to be Permanent', type: 'choice',
      synonyms: [
        'is your current housing arrangement intended to be permanent',
        'planea quedarse viviendo en este lugar de manera permanente',
        'housing intended to be permanent'
      ] },
    { id: 'additionalHousingNotes', label: 'Additional Housing Notes', type: 'text',
      synonyms: [
        'is there anything else you would like us to know about your housing situation',
        'hay algo mas que le gustaria que sepamos sobre su situacion de vivienda',
        'additional notes about housing'
      ] },
    { id: 'numChildrenEnrolled', label: 'Number of Children Enrolled', type: 'number',
      synonyms: [
        'how many children do you have enrolled in city schools',
        'cuantos ninos tiene inscritos en city schools',
        'number of children enrolled', 'how many students'
      ] },
    { id: 'householdNeeds', label: 'Other Household/Student Needs', type: 'multiselect',
      synonyms: [
        'do your students need assistance other than uniforms from the school',
        'necesita alguna asistencia por parte de la escuela en este momento',
        'other assistance needed'
      ] },
    { id: 'householdNeedsDescription', label: 'Description of Other Needs', type: 'text',
      synonyms: [
        'please describe any other needs or challenges your student has that may require support',
        'describa cualquier otra necesidad o dificultad que su estudiante tenga',
        'describe other needs or challenges'
      ] }
  ];

  var STUDENT_FIELDS = [
    { id: 'studentName', label: 'Student Name', type: 'text', isAnchor: true,
      synonyms: ['student name', 'nombre del estudiante'] },
    { id: 'schoolName', label: 'School Name', type: 'text',
      synonyms: ['school name', 'nombre de la escuela'] },
    { id: 'dob', label: 'Date of Birth', type: 'date',
      synonyms: ['date of birth', 'fecha de nacimiento', 'birthdate', 'dob'] },
    { id: 'needsUniform', label: 'Needs Uniform / Clothing Assistance', type: 'yesno',
      synonyms: [
        'does your student need school uniforms or clothing assistance',
        'tu estudiante necesita uniformes escolares o asistencia con ropa',
        'needs uniform assistance'
      ] },
    { id: 'uniformSizeGroup', label: 'Uniform Size Group', type: 'choice',
      synonyms: [
        'which uniform size group should we use',
        'que grupo de tallas de uniforme deberiamos usar',
        'uniform size group'
      ] },
    { id: 'uniformShirtSize', label: 'Uniform Shirt/Top Size', type: 'text', repeatable: true,
      synonyms: ['shirt top camisa', 'shirt size', 'top size'] },
    { id: 'uniformPantsSize', label: 'Uniform Pants/Bottom Size', type: 'text', repeatable: true,
      synonyms: ['pants bottom pantalones', 'pants size', 'bottom size'] },
    { id: 'uniformColor', label: 'Uniform Color', type: 'text', repeatable: true,
      synonyms: ['uniform color top bottom', 'color de uniforme'] },
    { id: 'hasAnotherStudent', label: 'Add Another Student?', type: 'yesno',
      synonyms: ['do you have another student to add', 'tiene a otro estudiante que guste anadir'] }
  ];

  // Anchor detection (the column that marks "start of a new student block")
  // requires near-total containment of a short, precise synonym like
  // "student name" / "nombre del estudiante" - a looser threshold here
  // causes false positives on headers that merely share a couple of common
  // words (e.g. "Nombre del Padre" partially overlaps "Nombre del Estudiante").
  var ANCHOR_THRESHOLD = 0.95;
  var MATCH_THRESHOLD = 0.5;

  function classifyHeader(header, fieldDefs) {
    var hSet = tokenSet(header);
    var best = null, bestScore = 0, bestSynonym = null;
    fieldDefs.forEach(function (field) {
      field.synonyms.forEach(function (syn) {
        var score = containment(hSet, syn);
        if (score > bestScore) {
          bestScore = score;
          best = field;
          bestSynonym = syn;
        }
      });
    });
    return best ? { field: best, score: bestScore, synonym: bestSynonym } : null;
  }

  function buildColumnMapping(headers) {
    var n = headers.length;
    var classifications = headers.map(function (h) {
      return {
        header: h,
        family: classifyHeader(h, FAMILY_FIELDS),
        student: classifyHeader(h, STUDENT_FIELDS)
      };
    });

    // Anchor detection: columns confidently matching the studentName field
    var anchors = [];
    classifications.forEach(function (c, idx) {
      if (c.student && c.student.field.id === 'studentName' && c.student.score >= ANCHOR_THRESHOLD) {
        anchors.push(idx);
      }
    });

    var mode = anchors.length >= 1 ? 'blocks' : 'flat';
    var familyColumns = [];
    var blocks = [];
    var unmapped = [];

    if (mode === 'flat') {
      // One student per row: classify every column against both dictionaries,
      // preferring whichever scores higher (family vs student), all landing
      // in a single implicit block covering the whole row.
      var flatBlockCols = [];
      for (var i = 0; i < n; i++) {
        var c0 = classifications[i];
        var famScore = c0.family ? c0.family.score : 0;
        var stuScore = c0.student ? c0.student.score : 0;
        if (famScore < MATCH_THRESHOLD && stuScore < MATCH_THRESHOLD) {
          unmapped.push({ index: i, header: headers[i] });
          continue;
        }
        if (famScore >= stuScore) {
          familyColumns.push({ index: i, header: headers[i], fieldId: c0.family.field.id, score: famScore });
        } else {
          flatBlockCols.push({ index: i, header: headers[i], fieldId: c0.student.field.id, score: stuScore });
        }
      }
      blocks.push({ startIndex: 0, columns: flatBlockCols });
    } else {
      var currentBlock = null;
      for (var j = 0; j < n; j++) {
        var c = classifications[j];
        var isAnchor = anchors.indexOf(j) !== -1;
        if (isAnchor) {
          currentBlock = { startIndex: j, columns: [] };
          blocks.push(currentBlock);
          currentBlock.columns.push({ index: j, header: headers[j], fieldId: 'studentName', score: c.student.score });
          continue;
        }
        var famScore2 = c.family ? c.family.score : 0;
        var stuScore2 = c.student ? c.student.score : 0;

        if (currentBlock === null) {
          // Before the first block starts, everything is family-level
          if (famScore2 >= MATCH_THRESHOLD) {
            familyColumns.push({ index: j, header: headers[j], fieldId: c.family.field.id, score: famScore2 });
          } else {
            unmapped.push({ index: j, header: headers[j], scope: 'family' });
          }
          continue;
        }

        if (famScore2 >= MATCH_THRESHOLD && famScore2 >= stuScore2) {
          familyColumns.push({ index: j, header: headers[j], fieldId: c.family.field.id, score: famScore2 });
        } else if (stuScore2 >= MATCH_THRESHOLD) {
          currentBlock.columns.push({ index: j, header: headers[j], fieldId: c.student.field.id, score: stuScore2 });
        } else {
          unmapped.push({ index: j, header: headers[j], scope: 'block', blockStart: currentBlock.startIndex });
          currentBlock.columns.push({ index: j, header: headers[j], fieldId: null, score: 0 });
        }
      }
    }

    return {
      mode: mode,
      familyColumns: familyColumns,
      blocks: blocks,
      unmapped: unmapped,
      headers: headers
    };
  }

  // Applies a manual override moving one header's classification to a
  // specific field id, mutating a previously-built mapping object in place.
  function applyOverride(mapping, headerIndex, newFieldId, scope) {
    function strip(list) {
      return list.filter(function (col) { return col.index !== headerIndex; });
    }
    mapping.familyColumns = strip(mapping.familyColumns);
    mapping.blocks.forEach(function (b) { b.columns = strip(b.columns); });
    mapping.unmapped = mapping.unmapped.filter(function (u) { return u.index !== headerIndex; });

    var header = mapping.headers[headerIndex];
    if (scope === 'family') {
      mapping.familyColumns.push({ index: headerIndex, header: header, fieldId: newFieldId, score: 1, manual: true });
    } else {
      var target = mapping.blocks.slice().reverse().find(function (b) { return b.startIndex <= headerIndex; }) || mapping.blocks[mapping.blocks.length - 1];
      if (target) target.columns.push({ index: headerIndex, header: header, fieldId: newFieldId, score: 1, manual: true });
    }
  }

  global.MVSchema = {
    FAMILY_FIELDS: FAMILY_FIELDS,
    STUDENT_FIELDS: STUDENT_FIELDS,
    classifyHeader: classifyHeader,
    buildColumnMapping: buildColumnMapping,
    applyOverride: applyOverride
  };
})(typeof window !== 'undefined' ? window : this);
