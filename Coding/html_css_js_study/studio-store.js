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

  function createStore(storageOrGetter) {
    var loaded = false;
    var baselineRaw = null;
    var baselineData = null;
    var blocked = null;
    function storage() {
      var candidate = typeof storageOrGetter === 'function' ? storageOrGetter() : storageOrGetter;
      if (!candidate || typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function') throw new Error('Storage is unavailable.');
      return candidate;
    }
    function failure(code, error) { return { data: null, error: error, code: code }; }

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

    function exportData() {
      var records = {};
      var errors = [];
      for (var key of [KEY, LEGACY_KEY]) {
        try { records[key] = storage().getItem(key); }
        catch (_) { errors.push('Could not read ' + key + '.'); }
      }
      return {
        format: 'commonplace-web-studio-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        records: records,
        error: errors.length ? errors.join(' ') : null
      };
    }

    return { key: KEY, load: load, save: save, exportData: exportData };
  }

  return { KEY: KEY, LEGACY_KEY: LEGACY_KEY, createStore: createStore };
});
