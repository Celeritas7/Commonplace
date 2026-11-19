/* Pure, three-way Web Studio reconciliation. No storage, network or clock reads.
 * A confirmed common base makes removals and unchecked progress meaningful.
 * Conflicting source text is never spliced: retain a separate named project.
 * Concurrent notes retain both versions; quizzes retain one coherent attempt.
 * Unknown compatible JSON fields survive. All inputs remain untouched. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./studio-store.js'));
  else root.WebStudioSyncMerge = factory(root.WebStudioStore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (store) {
  'use strict';
  var MISSING = Symbol('missing'), EMPTY = { version: 1, study: null, legacy: null };
  var KEYS = ['html', 'css', 'js'], NOTE_SEPARATOR = '\n\n— Note from another device —\n';
  var EPOCH = '1970-01-01T00:00:00.000Z';
  var LESSON_IDS = ['html-elements', 'css-spacing', 'js-events'];
  var EXERCISE_IDS = ['html-reading-card', 'css-card-spacing', 'js-count-twos'];
  var own = function (value, key) { return Object.prototype.hasOwnProperty.call(value, key); };
  var object = function (value) { return value !== null && Object.prototype.toString.call(value) === '[object Object]'; };
  function put(target, key, value) { Object.defineProperty(target, key, { value: value, enumerable: true, writable: true, configurable: true }); }
  function get(value, key) { return object(value) && own(value, key) ? value[key] : MISSING; }
  function copy(value) { return value === MISSING ? MISSING : JSON.parse(JSON.stringify(value)); }
  function equal(a, b) {
    if (a === b) return true;
    if (a === MISSING || b === MISSING || a === null || b === null || typeof a !== typeof b) return false;
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (item, index) { return equal(item, b[index]); });
    if (!object(a) || !object(b)) return false;
    var keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(function (key) { return own(b, key) && equal(a[key], b[key]); });
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (object(value)) return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + canonical(value[key]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  function fingerprint(value) {
    // IDs only, never a security checksum. A second hash plus collision checks
    // prevents a hash collision from silently discarding a source version.
    var text = canonical(value), a = 2166136261, b = 3335557771;
    for (var i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b ^ text.charCodeAt(i), 2246822519); }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }
  function validJSON(value, ancestors) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if ((!Array.isArray(value) && !object(value)) || ancestors.has(value)) throw new Error('Sync records must contain finite JSON values.');
    ancestors.add(value);
    for (var key of Object.keys(value)) validJSON(value[key], ancestors);
    ancestors.delete(value);
  }
  function validate(snapshot) {
    try {
      validJSON(snapshot, new Set());
      if (!object(snapshot) || snapshot.version !== 1 || !own(snapshot, 'study') || !own(snapshot, 'legacy')) return 'This cloud study record uses an unsupported format.';
      if (!store || typeof store.validate !== 'function') return 'Study validation is unavailable. Reload the app before syncing.';
      if (snapshot.study !== null) { var issue = store.validate(snapshot.study); if (issue) return issue; }
      if (snapshot.legacy !== null) {
        if (typeof store.validateLegacy === 'function') { var legacyIssue = store.validateLegacy(snapshot.legacy); if (legacyIssue) return legacyIssue; }
        else {
          var inspected = store.inspectBackup(JSON.stringify({ format: 'commonplace-web-studio-backup', version: 1, records: { commonplace_web_studio_v1: JSON.stringify({ version: 1 }), commonplace_wdb_v1: JSON.stringify(snapshot.legacy) } }));
          if (!inspected.ok) return inspected.error;
        }
      }
      return null;
    } catch (error) { return error.message || 'The cloud study record could not be read.'; }
  }
  function conflict(report, message) { if (!report.includes(message)) report.push(message); }
  function simple(base, local, remote) {
    if (equal(local, remote)) return { value: copy(local) };
    if (equal(local, base)) return { value: copy(remote) };
    if (equal(remote, base)) return { value: copy(local) };
    return null;
  }
  function generic(base, local, remote, report, path) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (object(local) && object(remote)) {
      var result = {};
      for (var key of new Set(Object.keys(local).concat(Object.keys(remote), object(base) ? Object.keys(base) : []))) {
        var value = generic(get(base, key), get(local, key), get(remote, key), report, path + '.' + key);
        if (value !== MISSING) put(result, key, value);
      }
      return result;
    }
    conflict(report, 'Different changes to ' + path + ' were found. ' + (local === MISSING ? 'The edited value was kept.' : 'This device’s value was kept.'));
    return copy(local === MISSING ? remote : local);
  }
  function objectFields(base, local, remote, report, path, handlers) {
    var result = {};
    for (var key of new Set(Object.keys(local).concat(Object.keys(remote), object(base) ? Object.keys(base) : []))) {
      var handler = handlers && own(handlers, key) ? handlers[key] : generic;
      var value = handler(get(base, key), get(local, key), get(remote, key), report, path + '.' + key);
      if (value !== MISSING) put(result, key, value);
    }
    return result;
  }
  function note(base, local, remote, report, path) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (typeof local !== 'string' || typeof remote !== 'string') return generic(base, local, remote, report, path);
    conflict(report, 'Notes changed on two devices at ' + path + '; both versions were kept.');
    if (!local) return remote;
    if (!remote) return local;
    var localParts = local.split(NOTE_SEPARATOR), remoteParts = remote.split(NOTE_SEPARATOR);
    if (remoteParts.every(function (part) { return localParts.includes(part); })) return local;
    if (localParts.every(function (part) { return remoteParts.includes(part); })) return remote;
    return Array.from(new Set(localParts.concat(remoteParts))).join(NOTE_SEPARATOR);
  }
  function setValues(base, local, remote, report, path) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (!Array.isArray(local) || !Array.isArray(remote)) return generic(base, local, remote, report, path);
    var previous = new Set(Array.isArray(base) ? base : []), a = new Set(local), b = new Set(remote);
    // An observed removal wins over an unchanged membership. Without a common
    // base, existing bookmarks on either device are retained.
    return Array.from(new Set(local.concat(remote))).filter(function (value) { return previous.has(value) ? a.has(value) && b.has(value) : a.has(value) || b.has(value); }).sort(function (x, y) { return x - y; });
  }
  function mapMerge(base, local, remote, report, path, handler) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (!object(local) || !object(remote)) return generic(base, local, remote, report, path);
    var result = {};
    for (var key of new Set(Object.keys(local).concat(Object.keys(remote), object(base) ? Object.keys(base) : []))) {
      var value = handler(get(base, key), get(local, key), get(remote, key), report, path + '.' + key);
      if (value !== MISSING) put(result, key, value);
    }
    return result;
  }
  function initialCompletion(base, local, remote, report, path) {
    if (base === MISSING && typeof local === 'boolean' && typeof remote === 'boolean') return local || remote;
    return generic(base, local, remote, report, path);
  }
  function initialMark(base, local, remote, report, path) {
    if (base === MISSING && local !== MISSING && remote !== MISSING && !!local !== !!remote) return copy(local || remote);
    return generic(base, local, remote, report, path);
  }
  function lesson(base, local, remote, report, path) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (!object(local) || !object(remote)) return generic(base, local, remote, report, path);
    var result = objectFields(base, local, remote, report, path, { note: note, bookmarks: setValues, read: initialCompletion, practised: initialCompletion, answers: function () { return MISSING; }, question: function () { return MISSING; }, submitted: function () { return MISSING; } });
    function quiz(source) { var result = {}; for (var key of ['answers', 'question', 'submitted']) if (object(source) && own(source, key)) put(result, key, copy(source[key])); return result; }
    var b = quiz(base), a = quiz(local), c = quiz(remote), choice = simple(b, a, c);
    if (!choice) {
      var blank = function (value) { return !value.submitted && (!value.answers || value.answers.every(function (answer) { return answer === null; })); };
      if (base === MISSING && blank(a) && !blank(c)) choice = { value: c };
      else { choice = { value: a }; conflict(report, 'Quiz answers changed on two devices at ' + path + '; this device’s complete quiz attempt was kept.'); }
    }
    for (var quizKey of Object.keys(choice.value)) put(result, quizKey, choice.value[quizKey]);
    return result;
  }
  function attemptUnion(local, remote, report, path) {
    var items = copy(Array.isArray(local) ? local : []);
    for (var attempt of Array.isArray(remote) ? remote : []) {
      var sameId = items.find(function (item) { return item.id === attempt.id; });
      if (!sameId) { items.push(copy(attempt)); continue; }
      if (equal(sameId, attempt)) continue;
      var stem = attempt.id.slice(0, 70) + '-cloud-' + fingerprint(attempt), next = copy(attempt), number = 1;
      next.id = stem;
      while (items.some(function (item) { return item.id === next.id && !equal(item, next); })) next.id = stem + '-' + number++;
      if (!items.some(function (item) { return equal(item, next); })) items.push(next);
      conflict(report, 'Two different exercise attempts shared an identifier at ' + path + '; both were retained.');
    }
    items.sort(function (a, b) { return a.at.localeCompare(b.at) || a.id.localeCompare(b.id); });
    return items;
  }
  function exercise(base, local, remote, report, path) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (!object(local) || !object(remote)) return generic(base, local, remote, report, path);
    var skip = function () { return MISSING; };
    var result = objectFields(base, local, remote, report, path, { attempts: skip, totalAttempts: skip, hintsSeen: skip, solutionViewed: skip });
    if (own(local, 'attempts') || own(remote, 'attempts')) {
      var attempts = attemptUnion(local.attempts, remote.attempts, report, path);
      result.attempts = attempts.slice(-20);
      var oldIds = new Set(object(base) && Array.isArray(base.attempts) ? base.attempts.map(function (item) { return item.id; }) : []);
      var fresh = attempts.filter(function (item) { return !oldIds.has(item.id); }).length;
      result.totalAttempts = Math.max(local.totalAttempts || 0, remote.totalAttempts || 0, (object(base) ? base.totalAttempts || oldIds.size : 0) + fresh, attempts.length);
    } else if (own(local, 'totalAttempts') || own(remote, 'totalAttempts')) result.totalAttempts = Math.max(local.totalAttempts || 0, remote.totalAttempts || 0);
    if (own(local, 'hintsSeen') || own(remote, 'hintsSeen')) result.hintsSeen = Math.max(local.hintsSeen || 0, remote.hintsSeen || 0);
    if (own(local, 'solutionViewed') || own(remote, 'solutionViewed')) result.solutionViewed = !!local.solutionViewed || !!remote.solutionViewed;
    return result;
  }
  function completeFiles(source, fallback) {
    var result = copy(fallback || {});
    for (var key of Object.keys(source || {})) put(result, key, copy(source[key]));
    for (var file of KEYS) if (!own(result, file)) put(result, file, '');
    return result;
  }
  function normalProjects(study, legacyId) {
    if (!object(study)) return null;
    var library = study.projects ? copy(study.projects) : null;
    if (!library && study.project) library = { version: 1, activeId: legacyId, items: [{ id: legacyId, name: 'Study project', createdAt: EPOCH, updatedAt: EPOCH, files: completeFiles(study.project) }] };
    if (library && study.project) {
      var active = library.items.find(function (item) { return item.id === library.activeId; });
      active.files = completeFiles(study.project, active.files);
    }
    return library;
  }
  function sameFiles(a, b) { return equal(a.files, b.files); }
  function generatedConflict(item) {
    var mark = item._syncConflict;
    if (!object(mark) || mark.version !== 1 || typeof mark.sourceId !== 'string' || typeof mark.familyId !== 'string' || typeof mark.name !== 'string' || item.name !== mark.name || mark.fingerprint !== fingerprint(item.files)) return null;
    var stem = mark.sourceId.slice(0, 70) + '-cloud-' + mark.fingerprint;
    if (item.id !== stem && !(item.id.startsWith(stem + '-') && /^[1-9][0-9]*$/.test(item.id.slice(stem.length + 1)))) return null;
    return mark;
  }
  function substantiveProject(item) {
    var value = copy(item);
    for (var key of ['id', 'name', 'createdAt', 'updatedAt', '_syncConflict']) delete value[key];
    return value;
  }
  function projectMerge(base, local, remote, report, path, copies) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (!object(local) || !object(remote)) return generic(base, local, remote, report, path);
    var fileConflict = false;
    function fileValue(b, a, c, messages, field) {
      var decided = simple(b, a, c); if (decided) return decided.value;
      if (KEYS.includes(field.split('.').pop())) { fileConflict = true; return copy(a === MISSING ? c : a); }
      return generic(b, a, c, messages, field);
    }
    var result = objectFields(base, local, remote, report, path, {
      files: function (b, a, c, messages, field) { return mapMerge(b, a, c, messages, field, fileValue); },
      updatedAt: function (b, a, c) { return [a, c].filter(function (value) { return typeof value === 'string'; }).sort().pop(); },
      createdAt: function (b, a, c) { return b !== MISSING ? copy(b) : [a, c].filter(function (value) { return typeof value === 'string'; }).sort()[0]; }
    });
    if (fileConflict) {
      result.files = copy(local.files);
      copies.push(copy(remote));
      conflict(report, 'Code changed in the same file of “' + local.name + '” on two devices. The other version was kept as a separate project.');
    }
    return result;
  }
  function projects(baseStudy, localStudy, remoteStudy, resultStudy, report) {
    var fallbackId = baseStudy && baseStudy.projects ? baseStudy.projects.activeId : localStudy.projects ? localStudy.projects.activeId : remoteStudy.projects ? remoteStudy.projects.activeId : 'study-project';
    var b = normalProjects(baseStudy, fallbackId), a = normalProjects(localStudy, fallbackId), c = normalProjects(remoteStudy, fallbackId);
    if (!a && !c) return;
    if (!a || !c) {
      var single = a || c;
      if (localStudy.projects || remoteStudy.projects) resultStudy.projects = copy(single);
      resultStudy.project = copy(single.items.find(function (item) { return item.id === single.activeId; }).files); return;
    }
    var before = new Map((b ? b.items : []).map(function (item) { return [item.id, item]; })), left = new Map(a.items.map(function (item) { return [item.id, item]; })), right = new Map(c.items.map(function (item) { return [item.id, item]; }));
    var items = [], copies = [];
    for (var id of new Set(a.items.concat(c.items, b ? b.items : []).map(function (item) { return item.id; }))) {
      var item = projectMerge(before.has(id) ? before.get(id) : MISSING, left.has(id) ? left.get(id) : MISSING, right.has(id) ? right.get(id) : MISSING, report, 'project ' + id, copies);
      if (item !== MISSING) items.push(item);
    }
    for (var other of copies) {
      // Repeated sync against an older base must reuse the retained version.
      var stem = other.id.slice(0, 70) + '-cloud-' + fingerprint(other.files), candidate = copy(other), number = 1;
      candidate.id = stem; candidate.name = other.name.slice(0, 65) + ' (other device)';
      var sourceMark = generatedConflict(other);
      candidate._syncConflict = { version: 1, sourceId: other.id, familyId: sourceMark ? sourceMark.familyId : other.id, fingerprint: fingerprint(other.files), name: candidate.name };
      while (items.some(function (item) { return item.id === candidate.id && !sameFiles(item, candidate); })) candidate.id = stem + '-' + number++;
      if (!items.some(function (item) { return item.id === candidate.id && sameFiles(item, candidate); })) items.push(candidate);
    }
    // Reciprocal sync may bring back the generated copy of our own primary
    // version. Remove that redundant representation before enforcing capacity.
    // Provenance, unchanged generated name/content and equal unknown payload
    // are required: ordinary duplicates or subsequently edited copies stay.
    var collapsed = new Map();
    items = items.filter(function (item) {
      var mark = generatedConflict(item); if (!mark) return true;
      var primary = items.find(function (candidate) { return candidate.id === mark.familyId && !generatedConflict(candidate); });
      if (!primary || !equal(substantiveProject(primary), substantiveProject(item))) return true;
      collapsed.set(item.id, primary.id); return false;
    });
    if (items.length > 20) throw new Error('Sync would exceed 20 projects while preserving both code versions. Export a backup and review the project collection before retrying.');
    if (!items.length) { delete resultStudy.project; delete resultStudy.projects; return; }
    var library = objectFields(b || MISSING, a, c, report, 'project library', { items: function () { return MISSING; }, activeId: function () { return MISSING; } });
    library.items = items;
    // The visible working project stays local, unless it no longer exists.
    var localActive = collapsed.get(a.activeId) || a.activeId, remoteActive = collapsed.get(c.activeId) || c.activeId;
    library.activeId = items.some(function (item) { return item.id === localActive; }) ? localActive : items.some(function (item) { return item.id === remoteActive; }) ? remoteActive : items[0].id;
    resultStudy.project = copy(items.find(function (item) { return item.id === library.activeId; }).files);
    if (localStudy.projects || remoteStudy.projects || items.length > 1) resultStudy.projects = library;
    else delete resultStudy.projects;
  }
  function study(base, local, remote, report, path) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (!object(local) || !object(remote)) return generic(base, local, remote, report, path);
    var skip = function () { return MISSING; };
    var result = objectFields(base, local, remote, report, path, {
      lessons: function (b, a, c, messages, name) { return mapMerge(b, a, c, messages, name, function (before, left, right, notes, field) { return (LESSON_IDS.includes(field.split('.').pop()) ? lesson : generic)(before, left, right, notes, field); }); },
      exercises: function (b, a, c, messages, name) { return mapMerge(b, a, c, messages, name, function (before, left, right, notes, field) { return (EXERCISE_IDS.includes(field.split('.').pop()) ? exercise : generic)(before, left, right, notes, field); }); },
      project: skip, projects: skip
    });
    projects(object(base) ? base : null, local, remote, result, report);
    return result;
  }
  function legacy(base, local, remote, report, path) {
    var decided = simple(base, local, remote); if (decided) return decided.value;
    if (!object(local) || !object(remote)) return generic(base, local, remote, report, path);
    return objectFields(base, local, remote, report, path, {
      notes: function (b, a, c, messages, name) { return mapMerge(b, a, c, messages, name, note); },
      done: function (b, a, c, messages, name) { return mapMerge(b, a, c, messages, name, initialMark); },
      star: function (b, a, c, messages, name) { return mapMerge(b, a, c, messages, name, initialMark); }
    });
  }
  function merge(base, local, remote) {
    base = base === null || base === undefined ? EMPTY : base;
    for (var snapshot of [base, local, remote]) { var problem = validate(snapshot); if (problem) throw new Error(problem); }
    var conflicts = [];
    var snapshot = objectFields(base, local, remote, conflicts, 'study data', { study: study, legacy: legacy });
    var error = validate(snapshot); if (error) throw new Error('Sync kept your original data because the combined record was invalid: ' + error);
    return { snapshot: snapshot, conflicts: conflicts };
  }
  return { merge: merge, equal: equal, validate: validate };
});
