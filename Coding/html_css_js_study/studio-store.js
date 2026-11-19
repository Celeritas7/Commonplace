/* Web Studio owns only this versioned study record. No shared storage is cleared. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WebStudioStore = api.createStore(function () { return root.localStorage; });
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var KEY = 'commonplace_web_studio_v1';
  var LEGACY_KEY = 'commonplace_wdb_v1';
  var JOURNAL_KEY = 'commonplace_web_studio_import_v1';
  var MAX_BACKUP = 12 * 1024 * 1024;
  var LESSONS = ['html-elements', 'css-spacing', 'js-events'];
  var EXERCISES = ['html-reading-card', 'css-card-spacing', 'js-count-twos'];
  var own = function (value, key) { return Object.prototype.hasOwnProperty.call(value, key); };
  var record = function (value) {
    return value !== null && Object.prototype.toString.call(value) === '[object Object]';
  };
  var integer = function (value, low, high) {
    return Number.isInteger(value) && value >= low && value <= high;
  };
  var text = function (value, max, nonempty) {
    return typeof value === 'string' && value.length <= max && (!nonempty || value.length > 0);
  };
  var timestamp = function (value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
    var parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
  };

  function validateAttempt(attempt) {
    if (!record(attempt) || !text(attempt.id, 100, true) || !timestamp(attempt.at) || attempt.exerciseVersion !== 1) return false;
    if (!['passed', 'failed', 'error'].includes(attempt.status) || typeof attempt.assisted !== 'boolean') return false;
    if (!Array.isArray(attempt.checks) || attempt.checks.length > 10) return false;
    for (var check of attempt.checks) {
      if (!record(check) || !text(check.id, 100, true) || typeof check.passed !== 'boolean' || !text(check.expected, 1000) || !text(check.actual, 1000)) return false;
    }
    if (own(attempt, 'error') && !text(attempt.error, 3000)) return false;
    if (!record(attempt.files)) return false;
    var size = 0;
    for (var file of ['html', 'css', 'js']) {
      if (!own(attempt.files, file) || typeof attempt.files[file] !== 'string') return false;
      size += attempt.files[file].length;
    }
    return size <= 30000;
  }

  function validate(value) {
    if (!record(value)) return 'The saved study record must be an object.';
    if (value.version !== 1) return 'This study record uses an unsupported version. Its original data has been kept.';
    if (own(value, 'language') && !['html', 'css', 'js'].includes(value.language)) return 'The saved language is invalid.';
    if (own(value, 'view') && typeof value.view !== 'string') return 'The saved view is invalid.';
    if (own(value, 'textSize') && (typeof value.textSize !== 'number' || !Number.isFinite(value.textSize))) return 'The saved reading size is invalid.';
    if (own(value, 'project')) {
      if (!record(value.project)) return 'The saved project is invalid.';
      for (var file of ['html', 'css', 'js']) {
        if (own(value.project, file) && typeof value.project[file] !== 'string') return 'The saved ' + file.toUpperCase() + ' file is invalid.';
      }
    }
    if (own(value, 'projects')) {
      var projects = value.projects;
      if (!record(projects) || projects.version !== 1 || !text(projects.activeId, 100, true) || !Array.isArray(projects.items) || projects.items.length < 1 || projects.items.length > 20) return 'The saved project collection is invalid.';
      var ids = new Set();
      for (var project of projects.items) {
        if (!record(project) || !text(project.id, 100, true) || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(project.id) || ids.has(project.id) || !text(project.name, 80, true) || !project.name.trim() || !timestamp(project.createdAt) || !timestamp(project.updatedAt) || !record(project.files)) return 'A saved project is invalid.';
        ids.add(project.id);
        for (var projectFile of ['html', 'css', 'js']) if (!own(project.files, projectFile) || !text(project.files[projectFile], 150000)) return 'A saved project file is invalid or too large.';
      }
      if (!ids.has(projects.activeId)) return 'The active saved project is missing.';
    }
    if (own(value, 'lessons')) {
      if (!record(value.lessons)) return 'The saved lessons are invalid.';
      for (var id of LESSONS) {
        if (!own(value.lessons, id)) continue;
        var lesson = value.lessons[id];
        if (!record(lesson)) return 'The saved lesson ' + id + ' is invalid.';
        if (own(lesson, 'part') && !integer(lesson.part, 0, 8)) return 'The saved reading position is invalid.';
        if (own(lesson, 'note') && typeof lesson.note !== 'string') return 'A saved lesson note is invalid.';
        if (own(lesson, 'bookmarks') && (!Array.isArray(lesson.bookmarks) || !lesson.bookmarks.every(function (part) { return integer(part, 0, 8); }))) return 'The saved bookmarks are invalid.';
        if (own(lesson, 'answers') && (!Array.isArray(lesson.answers) || lesson.answers.length !== 5 || !lesson.answers.every(function (answer) { return answer === null || integer(answer, 0, 2); }))) return 'The saved quiz answers are invalid.';
        if (own(lesson, 'question') && !integer(lesson.question, 0, 4)) return 'The saved quiz position is invalid.';
        if (own(lesson, 'prediction') && lesson.prediction !== null && !integer(lesson.prediction, 0, 2)) return 'The saved prediction is invalid.';
        for (var flag of ['submitted', 'practised', 'read']) {
          if (own(lesson, flag) && typeof lesson[flag] !== 'boolean') return 'A saved lesson completion value is invalid.';
        }
      }
    }
    // The exercise extension is optional, so older saved books need no rewrite.
    // Only this release's known exercises are interpreted; future records remain
    // opaque and are retained by the same merge/export rules as other study data.
    if (own(value, 'exercises')) {
      if (!record(value.exercises)) return 'The saved exercises are invalid.';
      for (var exerciseId of EXERCISES) {
        if (!own(value.exercises, exerciseId)) continue;
        var exercise = value.exercises[exerciseId];
        if (!record(exercise)) return 'The saved exercise ' + exerciseId + ' is invalid.';
        if (own(exercise, 'attempts')) {
          if (!Array.isArray(exercise.attempts) || exercise.attempts.length > 20) return 'The saved exercise attempts are invalid.';
          for (var attempt of exercise.attempts) {
            if (!validateAttempt(attempt)) return 'A saved exercise attempt is invalid.';
          }
        }
        if (own(exercise, 'totalAttempts') && !integer(exercise.totalAttempts, 0, Number.MAX_SAFE_INTEGER)) return 'The saved exercise attempt count is invalid.';
        if (own(exercise, 'hintsSeen') && !integer(exercise.hintsSeen, 0, 10)) return 'The saved exercise hint count is invalid.';
        if (own(exercise, 'solutionViewed') && typeof exercise.solutionViewed !== 'boolean') return 'The saved exercise solution state is invalid.';
      }
    }
    return null;
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value, function (key, item) {
      if (typeof item === 'undefined' || typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint' || (typeof item === 'number' && !Number.isFinite(item))) {
        throw new Error('Study records must contain JSON values.');
      }
      return item;
    }));
  }

  // Replacing known fields must not discard fields written by another compatible
  // UI version. defineProperty also treats a literal __proto__ key as plain data.
  function merge(previous, next) {
    if (!record(previous) || !record(next)) return copy(next);
    var result = {};
    for (var key of new Set(Object.keys(previous).concat(Object.keys(next)))) {
      var value = own(next, key)
        ? (own(previous, key) ? merge(previous[key], next[key]) : copy(next[key]))
        : copy(previous[key]);
      Object.defineProperty(result, key, { value: value, enumerable: true, writable: true, configurable: true });
    }
    return result;
  }

  function validateLegacy(value) {
    if (!record(value)) return 'The course tracker record must be an object.';
    for (var name of ['done', 'star', 'notes', 'open', 'hide']) {
      if (own(value, name) && !record(value[name])) return 'The course ' + name + ' map is invalid.';
    }
    if (value.notes && Object.values(value.notes).some(function (note) { return typeof note !== 'string'; })) return 'A course note is invalid.';
    return null;
  }
  function set(object, key, value) {
    Object.defineProperty(object, key, { value: value, enumerable: true, writable: true, configurable: true });
  }
  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function completeFiles(files) {
    var result = copy(files || {});
    for (var file of ['html', 'css', 'js']) if (!own(result, file)) result[file] = '';
    return result;
  }
  function sameFiles(a, b) { return ['html', 'css', 'js'].every(function (file) { return (a[file] || '') === (b[file] || ''); }); }
  function summaryOf(study, legacy) {
    return {
      projects: study ? (study.projects ? study.projects.items.length : study.project ? 1 : 0) : 0,
      lessonNotes: study && study.lessons ? Object.values(study.lessons).filter(function (lesson) { return record(lesson) && !!lesson.note; }).length : 0,
      legacyNotes: legacy && legacy.notes ? Object.values(legacy.notes).filter(Boolean).length : 0,
      attempts: study && study.exercises ? Object.values(study.exercises).reduce(function (n, exercise) { return n + (record(exercise) && Array.isArray(exercise.attempts) ? exercise.attempts.length : 0); }, 0) : 0
    };
  }
  function inspectBackup(source) {
    try {
      if (typeof source !== 'string' || source.length > MAX_BACKUP) throw new Error('Choose a Web Studio JSON backup smaller than 12 MB.');
      var backup = JSON.parse(source);
      if (!record(backup) || backup.format !== 'commonplace-web-studio-backup' || backup.version !== 1 || !record(backup.records)) throw new Error('This is not a supported Web Studio backup.');
      if (Object.keys(backup.records).some(function (key) { return key !== KEY && key !== LEGACY_KEY; })) throw new Error('This backup contains unrelated storage keys. Import only a scoped Web Studio backup.');
      if (backup.error) throw new Error('This backup reports an incomplete export. Keep it for recovery; make a complete backup before importing.');
      function readRecord(key, validator, draftKey) {
        var value = null;
        if (own(backup.records, key) && backup.records[key] !== null) {
          if (typeof backup.records[key] !== 'string') throw new Error('A saved backup record is not JSON text.');
          value = JSON.parse(backup.records[key]);
          var problem = validator(value); if (problem) throw new Error(problem);
        }
        if (own(backup, draftKey) && backup[draftKey] !== null) {
          var draftProblem = validator(backup[draftKey]); if (draftProblem) throw new Error(draftProblem);
          value = backup[draftKey];
        }
        return value === null ? null : copy(value);
      }
      var study = readRecord(KEY, validate, 'currentDraft');
      var legacy = readRecord(LEGACY_KEY, validateLegacy, 'currentLegacyDraft');
      if (study === null && legacy === null) throw new Error('This backup has no study or course records to import.');
      return { ok: true, study: study, legacy: legacy, exportedAt: timestamp(backup.exportedAt) ? backup.exportedAt : '1970-01-01T00:00:00.000Z', summary: summaryOf(study, legacy), error: null };
    } catch (error) {
      return { ok: false, error: error instanceof SyntaxError ? 'The selected file is not valid JSON. No data was changed.' : error.message };
    }
  }

  // Merge is deliberately local-first for conflicting values. Notes and code
  // receive explicit retention rules; no attempt is made to merge source text.
  function keepLocal(local, incoming, report) {
    if (record(local) && record(incoming)) {
      var result = copy(local);
      for (var key of Object.keys(incoming)) {
        if (!own(local, key)) set(result, key, copy(incoming[key]));
        else set(result, key, keepLocal(local[key], incoming[key], report));
      }
      return result;
    }
    if (!equal(local, incoming)) report.conflicts++;
    return copy(local);
  }
  function joinNote(local, incoming, report) {
    if (!local) return incoming || '';
    if (!incoming || local === incoming || local.includes(incoming)) return local;
    report.notesAppended++;
    return local + '\n\n— Imported note —\n' + incoming;
  }
  function normalProjects(study, importedAt, incoming) {
    var projects = study.projects ? copy(study.projects) : { version: 1, activeId: incoming ? 'imported-study' : 'study-project', items: [] };
    if (!projects.items.length && study.project) projects.items.push({ id: projects.activeId, name: incoming ? 'Imported study project' : 'Study project', createdAt: importedAt, updatedAt: importedAt, files: completeFiles(study.project) });
    if (projects.items.length && study.project) {
      // The compatibility working copy is authoritative after an older app edit.
      projects.items.find(function (item) { return item.id === projects.activeId; }).files = completeFiles(study.project);
    }
    return projects;
  }
  function mergeStudy(local, incoming, report, importedAt) {
    if (!local) return copy(incoming);
    if (!incoming) return copy(local);
    var result = keepLocal(local, incoming, report);
    if (incoming.lessons) {
      for (var id of LESSONS) {
        if (!own(incoming.lessons, id) || !own(local.lessons || {}, id)) continue;
        var a = local.lessons[id], b = incoming.lessons[id], lesson = result.lessons[id];
        if (own(a, 'note') || own(b, 'note')) lesson.note = joinNote(a.note, b.note, report);
        if (a.bookmarks || b.bookmarks) lesson.bookmarks = Array.from(new Set((a.bookmarks || []).concat(b.bookmarks || []))).sort(function (x, y) { return x - y; });
        for (var flag of ['read', 'practised']) if (own(a, flag) || own(b, flag)) lesson[flag] = !!a[flag] || !!b[flag];
        if ((!a.answers || a.answers.every(function (answer) { return answer === null; })) && !a.submitted) {
          for (var quizKey of ['answers', 'submitted', 'question']) if (own(b, quizKey)) lesson[quizKey] = copy(b[quizKey]);
        }
        if ((a.prediction === null || !own(a, 'prediction')) && own(b, 'prediction')) lesson.prediction = b.prediction;
      }
    }
    if (incoming.exercises) {
      for (var exerciseId of EXERCISES) {
        if (!own(incoming.exercises, exerciseId) || !own(local.exercises || {}, exerciseId)) continue;
        var x = local.exercises[exerciseId], y = incoming.exercises[exerciseId], exercise = result.exercises[exerciseId];
        var attempts = copy(x.attempts || []), added = 0;
        for (var attempt of y.attempts || []) {
          var match = attempts.find(function (saved) { return saved.id === attempt.id; });
          if (match && equal(match, attempt)) continue;
          if (match && attempts.some(function (saved) { var renamed = copy(saved); renamed.id = attempt.id; return saved.id.startsWith(attempt.id.slice(0, 80) + '-imported-') && equal(renamed, attempt); })) continue;
          var next = copy(attempt);
          if (match) { var suffix = 1; do { next.id = attempt.id.slice(0, 80) + '-imported-' + suffix++; } while (attempts.some(function (saved) { return saved.id === next.id; })); }
          attempts.push(next); added++;
        }
        attempts.sort(function (a, b) { return a.at.localeCompare(b.at); });
        exercise.attempts = attempts.slice(-20);
        exercise.totalAttempts = Math.max((x.totalAttempts || (x.attempts || []).length) + added, y.totalAttempts || 0, attempts.length);
        exercise.hintsSeen = Math.max(x.hintsSeen || 0, y.hintsSeen || 0);
        exercise.solutionViewed = !!x.solutionViewed || !!y.solutionViewed;
      }
    }
    if (incoming.project || incoming.projects) {
      var localProjects = normalProjects(local, importedAt, false), imported = normalProjects(incoming, importedAt, true);
      if (!localProjects.items.length) { localProjects = imported; result.project = completeFiles(incoming.project || imported.items.find(function (item) { return item.id === imported.activeId; }).files); }
      else for (var item of imported.items) {
        var existing = localProjects.items.find(function (saved) { return saved.id === item.id; });
        if (existing && sameFiles(existing.files, item.files)) {
          localProjects.items[localProjects.items.indexOf(existing)] = keepLocal(existing, item, report); continue;
        }
        if ((existing && localProjects.items.some(function (saved) { return saved.id.startsWith(item.id.slice(0, 80) + '-imported-') && sameFiles(saved.files, item.files); })) || (!incoming.projects && localProjects.items.some(function (saved) { return sameFiles(saved.files, item.files); }))) continue;
        var project = copy(item), n = 1;
        if (existing) {
          do { project.id = item.id.slice(0, 80) + '-imported-' + n; project.name = item.name.slice(0, 63) + ' (imported ' + n++ + ')'; } while (localProjects.items.some(function (saved) { return saved.id === project.id; }));
        }
        if (localProjects.items.length >= 20) throw new Error('Merging would exceed 20 projects. Export your current work and review your projects before importing.');
        localProjects.items.push(project); report.projectsAdded++;
      }
      if (localProjects.items.length) {
        var combined = keepLocal(localProjects, imported, report);
        combined.items = localProjects.items; combined.activeId = localProjects.activeId;
        result.projects = combined;
        result.project = completeFiles(local.project || localProjects.items.find(function (item) { return item.id === localProjects.activeId; }).files);
      }
    }
    return result;
  }
  function mergeLegacy(local, incoming, report) {
    if (!local) return copy(incoming);
    if (!incoming) return copy(local);
    var result = keepLocal(local, incoming, report);
    for (var id of Object.keys(incoming.notes || {})) {
      if (!result.notes) result.notes = {};
      set(result.notes, id, joinNote(own(local.notes || {}, id) ? local.notes[id] : '', incoming.notes[id], report));
    }
    for (var map of ['done', 'star']) {
      if (!incoming[map]) continue;
      if (!result[map]) result[map] = {};
      for (var key of Object.keys(incoming[map])) if (incoming[map][key]) set(result[map], key, incoming[map][key]);
    }
    return result;
  }
  function planValues(inspected, currentDraft, currentLegacyDraft, mode) {
    if (!inspected || !inspected.ok || !['merge', 'replace'].includes(mode)) throw new Error('Review a valid backup and choose Merge or Replace first.');
    if (inspected.study !== null) { var studyProblem = validate(inspected.study); if (studyProblem) throw new Error(studyProblem); }
    if (inspected.legacy !== null) { var legacyProblem = validateLegacy(inspected.legacy); if (legacyProblem) throw new Error(legacyProblem); }
    if (currentDraft !== null) { var currentProblem = validate(currentDraft); if (currentProblem) throw new Error(currentProblem); }
    if (currentLegacyDraft !== null) { var currentLegacyProblem = validateLegacy(currentLegacyDraft); if (currentLegacyProblem) throw new Error(currentLegacyProblem); }
    var report = { mode: mode, conflicts: 0, notesAppended: 0, projectsAdded: 0, messages: [] };
    var study = inspected.study === null ? copy(currentDraft) : mode === 'replace' ? copy(inspected.study) : mergeStudy(currentDraft, inspected.study, report, inspected.exportedAt);
    var legacy = inspected.legacy === null ? copy(currentLegacyDraft) : mode === 'replace' ? copy(inspected.legacy) : mergeLegacy(currentLegacyDraft, inspected.legacy, report);
    if (study !== null) { var plannedProblem = validate(study); if (plannedProblem) throw new Error(plannedProblem); }
    if (legacy !== null) { var plannedLegacyProblem = validateLegacy(legacy); if (plannedLegacyProblem) throw new Error(plannedLegacyProblem); }
    Object.assign(report, summaryOf(study, legacy));
    if (inspected.study === null || inspected.legacy === null) report.messages.push('Records absent from this backup are kept on this device, including with Replace.');
    if (mode === 'merge') report.messages.push('Your active code stays selected. Conflicting imported code is kept as another project. Distinct notes are appended; existing quiz answers and other conflicting settings stay local.');
    else report.messages.push('The records present in this backup replace this section’s corresponding records. Other Commonplace sections and sign-in data are untouched.');
    if (report.conflicts) report.messages.push(report.conflicts + ' differing fields were encountered. Local choices are kept except the note, bookmark, completion, attempt and project retention rules described above.');
    report.messages.push('Exercise history keeps at most the latest 20 attempts per exercise.');
    return { ok: true, study: study, legacy: legacy, summary: report, error: null };
  }

  function createStore(storageOrGetter) {
    var loaded = false;
    var baselineRaw = null;
    var baselineData = null;
    var blocked = null;
    var baselineLegacyRaw = null;
    var plans = new WeakMap();
    function storage() {
      var candidate = typeof storageOrGetter === 'function' ? storageOrGetter() : storageOrGetter;
      if (!candidate || typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function') throw new Error('Storage is unavailable.');
      return candidate;
    }
    function failure(code, error) { return { data: null, error: error, code: code }; }
    function readJournal(raw) {
      if (arguments.length === 0) raw = storage().getItem(JOURNAL_KEY);
      if (raw === null) return null;
      var value;
      try { value = JSON.parse(raw); } catch (_) { throw new Error('The import recovery record could not be read. Export it before repairing this section.'); }
      if (!record(value) || value.format !== 'commonplace-web-studio-import' || value.version !== 1 || !['pending', 'complete'].includes(value.phase) || !timestamp(value.createdAt)) throw new Error('The import recovery record has an unsupported format. Export it before repairing this section.');
      for (var side of ['before', 'after']) {
        if (!record(value[side]) || Object.keys(value[side]).length !== 2 || ![KEY, LEGACY_KEY].every(function (key) { return own(value[side], key) && (value[side][key] === null || typeof value[side][key] === 'string'); })) throw new Error('The import recovery record is incomplete. Export it before repairing this section.');
      }
      return value;
    }
    function getImportRecovery() {
      var raw;
      try { raw = storage().getItem(JOURNAL_KEY); }
      catch (_) { return { pending: false, available: false, error: 'Browser storage is unavailable. Recovery status could not be checked.' }; }
      try {
        var journal = readJournal(raw);
        return journal ? { pending: journal.phase === 'pending', available: true, createdAt: journal.createdAt, records: copy(journal.before), error: null } : { pending: false, available: false, error: null };
      } catch (error) { return { pending: true, available: false, error: error.message }; }
    }
    function rawRecords(target) {
      var result = {}; result[KEY] = target.getItem(KEY); result[LEGACY_KEY] = target.getItem(LEGACY_KEY); return result;
    }
    function putRaw(target, key, raw) {
      if (raw === null) {
        if (typeof target.removeItem !== 'function') throw new Error('Storage removal is unavailable.');
        target.removeItem(key);
      } else target.setItem(key, raw);
    }
    function restoreJournal(target, journal) {
      // A third value belongs to another tab. Never roll that change back.
      var current = rawRecords(target);
      for (var key of [KEY, LEGACY_KEY]) if (current[key] !== journal.before[key] && current[key] !== journal.after[key]) throw new Error('Another tab changed data after this import. Its work was kept. Export the recovery backup and review before restoring.');
      for (var restoreKey of [KEY, LEGACY_KEY]) if (target.getItem(restoreKey) !== journal.before[restoreKey]) putRaw(target, restoreKey, journal.before[restoreKey]);
      if (!equal(rawRecords(target), journal.before)) throw new Error('The original data could not be verified after recovery.');
      journal.phase = 'complete'; journal.outcome = 'rolled-back';
      target.setItem(JOURNAL_KEY, JSON.stringify(journal));
    }
    function recoverImport() {
      try {
        var target = storage(), journal = readJournal();
        if (!journal || journal.phase !== 'pending') return { ok: false, error: 'There is no interrupted import to recover.', code: 'no-recovery' };
        restoreJournal(target, journal);
        return { ok: true, error: null };
      } catch (error) { return { ok: false, error: error.message, code: 'recovery-failed', recoveryPending: true }; }
    }
    function keepCurrentImport() {
      try {
        var target = storage(), journal = readJournal();
        if (!journal || journal.phase !== 'pending') return { ok: false, error: 'There is no interrupted import to resolve.', code: 'no-recovery' };
        var current = rawRecords(target);
        for (var key of [KEY, LEGACY_KEY]) {
          if (current[key] === null) continue;
          var parsed = JSON.parse(current[key]);
          var problem = key === KEY ? validate(parsed) : validateLegacy(parsed);
          if (problem) throw new Error(problem);
        }
        if (!equal(rawRecords(target), current)) throw new Error('Saved records changed while being checked. Try again.');
        // This choice releases the recovery lock without writing live records.
        // The original before-snapshot remains available for a separate export.
        journal.phase = 'complete'; journal.outcome = 'kept-current'; journal.after = current;
        target.setItem(JOURNAL_KEY, JSON.stringify(journal));
        return { ok: true, error: null };
      } catch (error) { return { ok: false, error: 'Current saved data could not be kept: ' + error.message, code: 'recovery-failed', recoveryPending: true }; }
    }

    function load() {
      var raw;
      try { raw = storage().getItem(KEY); }
      catch (_) {
        loaded = false;
        blocked = failure('storage-unavailable', 'Browser storage is unavailable. Changes cannot be saved; keep this page open and export your work.');
        return blocked;
      }
      loaded = true;
      baselineRaw = raw;
      baselineData = null;
      blocked = null;
      try { baselineLegacyRaw = storage().getItem(LEGACY_KEY); }
      catch (_) { baselineLegacyRaw = null; }
      var recovery = getImportRecovery();
      if (recovery.pending) {
        blocked = failure('import-recovery', recovery.error || 'An interrupted backup import needs recovery. Saving is paused. Open Projects and backup to restore the previous data, then reload.');
        return blocked;
      }
      if (raw === null) return { data: null, error: null };
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (_) {
        blocked = failure('invalid-data', 'The saved Web Studio record could not be read. It has not been changed. Export a backup before repairing it.');
        return blocked;
      }
      var problem = validate(parsed);
      if (problem) {
        blocked = failure('invalid-data', problem + ' Saving is paused to protect your existing record. Export a backup before repairing it.');
        return blocked;
      }
      baselineData = parsed;
      return { data: copy(parsed), error: null };
    }

    function save(data) {
      if (!loaded) load();
      if (blocked) return { ok: false, error: blocked.error, code: blocked.code };
      if (getImportRecovery().pending) return { ok: false, error: 'An interrupted import needs recovery before saving. Open Projects and backup.', code: 'import-recovery' };
      var next, problem;
      try {
        problem = validate(data);
        if (problem) return { ok: false, error: problem, code: 'invalid-input' };
        next = merge(baselineData || {}, data);
        problem = validate(next);
        if (problem) return { ok: false, error: problem, code: 'invalid-input' };
      } catch (_) {
        return { ok: false, error: 'This change could not be saved as a study record. Your previous saved work is unchanged.', code: 'invalid-input' };
      }
      var target, raw;
      try {
        target = storage();
        raw = target.getItem(KEY);
      } catch (_) {
        return { ok: false, error: 'Browser storage is unavailable. Keep this page open and export your work before closing it.', code: 'storage-unavailable' };
      }
      // localStorage has no compare-and-swap primitive. This detects a stale tab
      // before its write; no delayed autosave or storage-event overwrite is used.
      if (raw !== baselineRaw) {
        return { ok: false, error: 'Another tab changed this study record. This tab has not overwritten it. Export your current work, then reload to review the latest saved version.', code: 'conflict' };
      }
      var serialized;
      try {
        serialized = JSON.stringify(next);
        target.setItem(KEY, serialized);
      } catch (_) {
        return { ok: false, error: 'Changes could not be saved. Browser storage may be full or blocked. Keep this page open, export your work and retry after storage is available.', code: 'write-failed' };
      }
      baselineRaw = serialized;
      baselineData = next;
      return { ok: true, error: null };
    }

    function planImport(inspected, currentDraft, currentLegacyDraft, mode) {
      try {
        if (!loaded) load();
        var recovery = getImportRecovery();
        if (recovery.pending) throw new Error('Recover the interrupted import before importing another backup.');
        if (recovery.error) throw new Error(recovery.error);
        var target = storage(), before = rawRecords(target);
        if (before[KEY] !== baselineRaw) throw new Error('Another tab changed this study record. Export your draft and reload before reviewing an import.');
        var rawStudy = null, rawLegacy = null, invalidStudy = false, invalidLegacy = false;
        try { if (before[KEY] !== null) { rawStudy = JSON.parse(before[KEY]); if (validate(rawStudy)) invalidStudy = true; } } catch (_) { invalidStudy = true; }
        try { if (before[LEGACY_KEY] !== null) { rawLegacy = JSON.parse(before[LEGACY_KEY]); if (validateLegacy(rawLegacy)) invalidLegacy = true; } } catch (_) { invalidLegacy = true; }
        if (mode === 'merge' && (invalidStudy || invalidLegacy)) throw new Error('Saved data is unreadable. Merge is paused to protect it. Export a recovery backup and choose Replace only after reviewing a valid backup.');
        // The legacy tracker has its own save path; an exact current snapshot
        // identifies its successful writes without accepting a stale other tab.
        var normalizedLegacy = rawLegacy === null || invalidLegacy ? null : copy(rawLegacy);
        if (normalizedLegacy) {
          for (var map of ['done', 'star', 'notes', 'open', 'hide']) if (!own(normalizedLegacy, map)) normalizedLegacy[map] = {};
          if (!normalizedLegacy.show) normalizedLegacy.show = 'all';
        }
        if (before[LEGACY_KEY] !== baselineLegacyRaw && (normalizedLegacy === null || !record(currentLegacyDraft) || !equal(normalizedLegacy, currentLegacyDraft))) throw new Error('Another tab changed course records. Export your draft and reload before importing.');
        var plan = planValues(inspected, currentDraft === undefined ? rawStudy : currentDraft, currentLegacyDraft === undefined ? rawLegacy : currentLegacyDraft, mode);
        var after = {};
        after[KEY] = invalidStudy && inspected.study === null ? before[KEY] : plan.study === null ? null : JSON.stringify(plan.study);
        after[LEGACY_KEY] = invalidLegacy && inspected.legacy === null ? before[LEGACY_KEY] : plan.legacy === null ? null : JSON.stringify(plan.legacy);
        if (invalidStudy || invalidLegacy) plan.summary.messages.push('The unreadable original records will remain in the pre-import recovery backup. Records absent from this import remain unchanged.');
        plans.set(plan, { before: before, after: after });
        return plan;
      } catch (error) { return { ok: false, error: error.message }; }
    }
    function applyImport(plan) {
      var prepared = plan && plans.get(plan), target, journal;
      if (!prepared) return { ok: false, error: 'Review the backup again before importing.', code: 'invalid-plan' };
      plans.delete(plan);
      try {
        target = storage();
        if (getImportRecovery().pending) throw new Error('Recover the interrupted import before importing another backup.');
        if (!equal(rawRecords(target), prepared.before)) return { ok: false, error: 'Study data changed after the import review. Nothing was replaced. Review the backup again.', code: 'conflict' };
        if (typeof target.removeItem !== 'function' && Object.values(prepared.before).some(function (value) { return value === null; })) throw new Error('Storage does not support recoverable imports.');
        journal = { format: 'commonplace-web-studio-import', version: 1, phase: 'pending', createdAt: new Date().toISOString(), before: prepared.before, after: prepared.after };
        // Saving the originals is mandatory. A full disk fails here without
        // touching either live record; no destructive clear-and-retry is used.
        target.setItem(JOURNAL_KEY, JSON.stringify(journal));
        if (!equal(rawRecords(target), prepared.before)) throw new Error('Another tab changed data while preparing this import.');
        for (var key of [KEY, LEGACY_KEY]) if (prepared.before[key] !== prepared.after[key]) putRaw(target, key, prepared.after[key]);
        if (!equal(rawRecords(target), prepared.after)) throw new Error('Imported records could not be verified.');
        journal.phase = 'complete'; journal.outcome = 'imported';
        target.setItem(JOURNAL_KEY, JSON.stringify(journal));
        baselineRaw = prepared.after[KEY]; baselineLegacyRaw = prepared.after[LEGACY_KEY];
        try { baselineData = baselineRaw === null ? null : JSON.parse(baselineRaw); } catch (_) { baselineData = null; }
        blocked = null;
        return { ok: true, error: null };
      } catch (error) {
        var recoveryPending = false;
        if (journal) {
          try { if (target.getItem(JOURNAL_KEY) === JSON.stringify(journal) || readJournal()?.phase === 'pending') restoreJournal(target, journal); }
          catch (_) { recoveryPending = true; }
        }
        return { ok: false, code: recoveryPending ? 'import-recovery' : 'write-failed', recoveryPending: recoveryPending, error: recoveryPending ? 'Import could not finish, and automatic rollback could not complete. The originals are retained in the recovery backup. Keep this page open and use Recover previous data before continuing.' : 'Import did not finish. Your original saved records are unchanged. Storage may be full or blocked; export your draft and try again after storage is available.' };
      }
    }

    function exportData() {
      var records = {};
      var errors = [];
      for (var key of [KEY, LEGACY_KEY]) {
        try { records[key] = storage().getItem(key); }
        catch (_) { errors.push('Could not read ' + key + '.'); }
      }
      var result = {
        format: 'commonplace-web-studio-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        records: records,
        error: errors.length ? errors.join(' ') : null
      };
      var recovery = getImportRecovery();
      if (recovery.available) result.recovery = { pending: recovery.pending, createdAt: recovery.createdAt, records: recovery.records };
      else if (recovery.error) { try { result.recoveryRaw = storage().getItem(JOURNAL_KEY); } catch (_) {} }
      return result;
    }

    return { key: KEY, load: load, save: save, exportData: exportData, validate: validate, inspectBackup: inspectBackup, planImport: planImport, applyImport: applyImport, getImportRecovery: getImportRecovery, recoverImport: recoverImport, keepCurrentImport: keepCurrentImport };
  }

  return { KEY: KEY, LEGACY_KEY: LEGACY_KEY, JOURNAL_KEY: JOURNAL_KEY, createStore: createStore, validate: validate, validateLegacy: validateLegacy, inspectBackup: inspectBackup };
});
