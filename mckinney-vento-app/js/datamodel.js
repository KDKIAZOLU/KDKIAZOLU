/*
 * Turns raw imported rows + a column mapping into normalized "family" and
 * "student" records, applying field-type-aware cleaning, school-name
 * correction, and McKinney-Vento eligibility determination. Also surfaces
 * a list of data-quality issues for the review UI.
 */
(function (global) {
  'use strict';

  var clean = global.MVCleaning;
  var schema = global.MVSchema;

  function fieldTypeLookup(defs) {
    var map = {};
    defs.forEach(function (f) { map[f.id] = f; });
    return map;
  }
  var FAMILY_TYPES = fieldTypeLookup(schema.FAMILY_FIELDS);
  var STUDENT_TYPES = fieldTypeLookup(schema.STUDENT_FIELDS);

  function firstNonEmpty(values) {
    for (var i = 0; i < values.length; i++) {
      if (clean.trim(values[i]) !== '') return values[i];
    }
    return '';
  }

  function cleanValueForType(fieldId, type, rawValues) {
    switch (type) {
      case 'yesno':
        for (var i = 0; i < rawValues.length; i++) {
          var yn = clean.parseYesNo(rawValues[i]);
          if (yn !== null) return yn;
        }
        return null;
      case 'choice':
        return clean.englishPortion(firstNonEmpty(rawValues));
      case 'date':
        return clean.normalizeDate(firstNonEmpty(rawValues));
      case 'number':
        var raw = firstNonEmpty(rawValues);
        var n = parseInt(String(raw).replace(/[^\d.-]/g, ''), 10);
        return isNaN(n) ? null : n;
      case 'multiselect':
        var options = fieldId === 'householdNeeds' ? clean.HOUSEHOLD_NEEDS_OPTIONS : null;
        var rawMulti = firstNonEmpty(rawValues);
        return clean.splitMultiSelect(rawMulti, options);
      case 'text':
      default:
        return clean.trim(firstNonEmpty(rawValues));
    }
  }

  function groupColumnsByField(columns) {
    var byField = {};
    columns.forEach(function (col) {
      if (!col.fieldId) return;
      (byField[col.fieldId] || (byField[col.fieldId] = [])).push(col.index);
    });
    return byField;
  }

  function extractFamilyRecord(row, mapping) {
    var byField = groupColumnsByField(mapping.familyColumns);
    var record = {};
    Object.keys(byField).forEach(function (fieldId) {
      var type = (FAMILY_TYPES[fieldId] || {}).type || 'text';
      var rawValues = byField[fieldId].map(function (idx) { return row[idx]; });
      record[fieldId] = cleanValueForType(fieldId, type, rawValues);
    });
    var contact = clean.parsePhoneEmail(record.contactInfo || '');
    record.contactEmail = contact.email;
    record.contactPhone = contact.phone;
    record.timestamp = clean.parseTimestamp(record.timestamp || '');
    return record;
  }

  function extractStudentRecord(row, block, schoolMatcher) {
    var byField = groupColumnsByField(block.columns);
    var student = {};

    ['studentName', 'schoolName', 'dob', 'needsUniform', 'uniformSizeGroup', 'hasAnotherStudent'].forEach(function (fieldId) {
      if (!byField[fieldId]) return;
      var type = (STUDENT_TYPES[fieldId] || {}).type || 'text';
      var rawValues = byField[fieldId].map(function (idx) { return row[idx]; });
      student[fieldId] = cleanValueForType(fieldId, type, rawValues);
    });

    ['uniformShirtSize', 'uniformPantsSize', 'uniformColor'].forEach(function (fieldId) {
      var indices = byField[fieldId] || [];
      var values = indices.map(function (idx) { return clean.trim(row[idx]); }).filter(Boolean);
      student[fieldId] = values.length ? values[0] : '';
      student[fieldId + 'All'] = values;
    });

    if (!student.studentName) return null; // empty block slot - no student here

    student.dobAge = student.dob ? clean.ageFromDob(student.dob) : null;

    if (schoolMatcher && student.schoolName) {
      var match = schoolMatcher.match(student.schoolName);
      student.schoolNameRaw = student.schoolName;
      student.schoolNameCorrected = match.matched || student.schoolName;
      student.schoolMatchMethod = match.method;
      student.schoolMatchScore = match.score;
      student.schoolNeedsReview = match.needsReview;

      var schoolRecord = match.matched ? schoolMatcher.getRecordByName(match.matched) : null;
      student.schoolAddress = schoolRecord ? (schoolRecord.address || '') : '';
      student.schoolZip = schoolRecord ? (schoolRecord.zip || '') : '';
      student.schoolGrades = schoolRecord ? (schoolRecord.grades || '') : '';
      student.schoolManagementType = schoolRecord ? (schoolRecord.mgmt || '') : '';
    } else {
      student.schoolNameRaw = student.schoolName || '';
      student.schoolNameCorrected = student.schoolName || '';
      student.schoolMatchMethod = 'n/a';
      student.schoolMatchScore = 0;
      student.schoolNeedsReview = !!student.schoolName;
      student.schoolAddress = '';
      student.schoolZip = '';
      student.schoolGrades = '';
      student.schoolManagementType = '';
    }

    return student;
  }

  function buildRecords(rows, mapping, options) {
    options = options || {};
    var schoolMatcher = options.schoolMatcher || null;
    var families = [];
    var students = [];
    var issues = [];
    var seenFamilyKeys = {};

    rows.forEach(function (row, rowIdx) {
      if (row.every(function (c) { return clean.trim(c) === ''; })) return; // skip blank rows

      var family = extractFamilyRecord(row, mapping);
      family.id = 'F' + rowIdx;
      family.sourceRowIndex = rowIdx;

      var rowStudents = [];
      mapping.blocks.forEach(function (block, blockIdx) {
        var s = extractStudentRecord(row, block, schoolMatcher);
        if (s) {
          s.id = 'F' + rowIdx + '-S' + blockIdx;
          s.familyId = family.id;
          rowStudents.push(s);
          students.push(s);
        }
      });

      var elig = global.MVEligibility.determineEligibility(family);
      family.eligibility = elig;
      family.studentIds = rowStudents.map(function (s) { return s.id; });
      family.studentCount = rowStudents.length;

      if (schoolMatcher && global.MVZoning) {
        var familyNearby = global.MVZoning.findNearbySchools(schoolMatcher.referenceList, family.currentAddress, null, 5);
        family.zoningZip = familyNearby.zip;
        family.nearbySchools = familyNearby.schools.map(function (s) { return s.name; });

        rowStudents.forEach(function (s) {
          var studentNearby = global.MVZoning.findNearbySchools(schoolMatcher.referenceList, family.currentAddress, s.dobAge, 5);
          s.nearbySchools = studentNearby.schools.map(function (sch) { return sch.name; });
        });
      } else {
        family.zoningZip = null;
        family.nearbySchools = [];
        rowStudents.forEach(function (s) { s.nearbySchools = []; });
      }

      if (global.MVZoning) {
        var outsideCheck = global.MVZoning.checkOutsideBaltimoreCity(family.currentAddress);
        family.possiblyOutsideBaltimoreCity = outsideCheck.flagged;
        family.outsideBaltimoreCityReason = outsideCheck.reason;
      } else {
        family.possiblyOutsideBaltimoreCity = false;
        family.outsideBaltimoreCityReason = null;
      }

      families.push(family);

      // --- Data quality issue detection ---
      if (!clean.trim(family.parentName)) {
        issues.push({ level: 'error', familyId: family.id, field: 'parentName', message: 'Missing parent/guardian name.' });
      }
      if (!clean.trim(family.currentAddress)) {
        issues.push({ level: 'warning', familyId: family.id, field: 'currentAddress', message: 'Missing current address.' });
      }
      if (!clean.trim(family.livingSituation)) {
        issues.push({ level: 'warning', familyId: family.id, field: 'livingSituation', message: 'Missing living-situation response; eligibility inferred from other answers.' });
      }
      if (elig.needsReview) {
        issues.push({ level: 'review', familyId: family.id, field: 'eligibility', message: elig.basis });
      }
      if (rowStudents.length === 0) {
        issues.push({ level: 'warning', familyId: family.id, field: 'students', message: 'No students listed on this submission.' });
      }
      if (family.possiblyOutsideBaltimoreCity) {
        issues.push({ level: 'review', familyId: family.id, field: 'currentAddress', message: family.outsideBaltimoreCityReason + ' The zoning map and "possible nearby schools" hint are Baltimore City Schools-specific and may not apply to this family.' });
      }
      rowStudents.forEach(function (s) {
        if (s.schoolNeedsReview) {
          issues.push({ level: 'review', familyId: family.id, studentId: s.id, field: 'schoolName', message: 'School name "' + s.schoolNameRaw + '" needs review (matched "' + s.schoolNameCorrected + '" at ' + Math.round(s.schoolMatchScore * 100) + '% confidence).' });
        }
        if (s.dob && !/^\d{4}-\d{2}-\d{2}$/.test(s.dob)) {
          issues.push({ level: 'warning', familyId: family.id, studentId: s.id, field: 'dob', message: 'Date of birth "' + s.dob + '" could not be parsed into a standard date.' });
        }
      });

      var famKey = global.MVFuzzy.normalizeBasic(family.parentName) + '|' + global.MVFuzzy.normalizeBasic(family.currentAddress);
      if (famKey.trim() !== '|' && seenFamilyKeys[famKey]) {
        issues.push({ level: 'review', familyId: family.id, field: 'duplicate', message: 'Possible duplicate submission of family "' + family.parentName + '" (also see ' + seenFamilyKeys[famKey] + ').' });
      } else if (famKey.trim() !== '|') {
        seenFamilyKeys[famKey] = family.id;
      }
    });

    return { families: families, students: students, issues: issues };
  }

  global.MVDataModel = {
    buildRecords: buildRecords,
    FAMILY_TYPES: FAMILY_TYPES,
    STUDENT_TYPES: STUDENT_TYPES
  };
})(typeof window !== 'undefined' ? window : this);
