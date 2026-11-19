/* Named local projects and a standalone website export. This module has no storage writes. */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WebStudioProjects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var MAX_PROJECTS = 20, MAX_NAME = 80, MAX_FILE = 150000, serial = 0;
  var BASE_CSS = 'html{color-scheme:light dark}body{margin:0;padding:16px;background:Canvas;color:CanvasText;font:16px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{min-height:44px}h1{font-size:26px;line-height:1.2}';
  var own = function (value, key) { return Object.prototype.hasOwnProperty.call(value, key); };
  var record = function (value) { return value !== null && Object.prototype.toString.call(value) === '[object Object]'; };
  var copy = function (value) { return JSON.parse(JSON.stringify(value)); };
  function put(target, key, value) { Object.defineProperty(target, key, { value: value, enumerable: true, writable: true, configurable: true }); }
  function overlay(previous, next) {
    var result = {};
    for (var source of [previous, next]) if (record(source)) for (var key of Object.keys(source)) put(result, key, copy(source[key]));
    return result;
  }
  function files(value, fallback) {
    if (!record(value)) throw new Error('The project files could not be read.');
    var result = overlay(fallback, value);
    for (var key of ['html', 'css', 'js']) {
      if (!own(result, key)) result[key] = '';
      if (typeof result[key] !== 'string') throw new Error('The ' + key.toUpperCase() + ' file must be text.');
    }
    return result;
  }
  function fileProblem(value) {
    if (!record(value)) return 'The project files could not be read.';
    for (var key of ['html', 'css', 'js']) {
      if (typeof value[key] !== 'string') return 'The ' + key.toUpperCase() + ' file must be text.';
      if (value[key].length > MAX_FILE) return 'Keep each project file under 150,000 characters. Your current work is kept; export a study backup before shortening it.';
    }
    return null;
  }
  function nameOf(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > MAX_NAME) throw new Error('Give the project a name of 1–80 characters.');
    return value.trim();
  }
  function makeId() {
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      return 'project-' + Array.from(global.crypto.getRandomValues(new Uint8Array(12)), function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    }
    // These are local record IDs, not credentials. The sequence also prevents
    // duplicates if two projects are created in the same millisecond.
    return 'project-' + Date.now().toString(36) + '-' + (++serial).toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function create(saved, initialProject, options) {
    saved = record(saved) ? saved : {}; options = options || {};
    var clock = options.now || function () { return new Date().toISOString(); };
    var nextId = options.newId || makeId;
    var initial = files(initialProject || { html: '', css: '', js: '' });
    var state;
    function timestamp() {
      var value = clock();
      if (value instanceof Date) value = value.toISOString();
      if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new Error('The project date could not be recorded.');
      return value;
    }
    function uniqueId() {
      for (var i = 0; i < 30; i++) {
        var id = nextId();
        if (typeof id === 'string' && id.length && id.length <= 100 && (!state || !state.items.some(function (item) { return item.id === id; }))) return id;
      }
      throw new Error('A unique project identifier could not be created. Try again.');
    }
    function current() { return state.items.find(function (item) { return item.id === state.activeId; }); }
    if (own(saved, 'projects')) {
      if (!record(saved.projects) || saved.projects.version !== 1 || !Array.isArray(saved.projects.items) || !saved.projects.items.length || saved.projects.items.length > MAX_PROJECTS) throw new Error('The saved project library could not be read. Its original data has been kept.');
      state = copy(saved.projects);
      var ids = new Set();
      for (var item of state.items) {
        if (!record(item) || typeof item.id !== 'string' || !item.id || item.id.length > 100 || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > MAX_NAME || !record(item.files)) throw new Error('A saved project could not be read. Its original data has been kept.');
        ids.add(item.id); item.files = files(item.files);
      }
      if (!current()) throw new Error('The active saved project could not be found. Its original data has been kept.');
      // The working copy is kept for older app versions. It is authoritative on
      // reopening, because an older cached controller may have edited only it.
      if (record(saved.project)) {
        var working = files(saved.project, current().files);
        if (JSON.stringify(working) !== JSON.stringify(current().files)) { current().files = working; current().updatedAt = timestamp(); }
      }
    } else {
      var time = timestamp(), first = { id: uniqueId(), name: 'Study project', createdAt: time, updatedAt: time, files: files(record(saved.project) ? saved.project : initial, initial) };
      state = { version: 1, activeId: first.id, items: [first] };
    }
    var templateList = [
      { id: 'study-card', name: 'Study card', files: initial },
      { id: 'blank', name: 'Blank page', files: { html: '<main>\n  <h1>My new page</h1>\n  <p>Start with one idea.</p>\n</main>', css: 'body {\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  padding: 24px;\n}\n', js: '// Add your JavaScript here.\n' } },
      { id: 'personal-card', name: 'Personal card', files: { html: '<main class="profile">\n  <p class="eyebrow">A little about me</p>\n  <h1>Your name</h1>\n  <p>I am learning to build useful things for the web.</p>\n  <button id="hello">Say hello</button>\n  <p id="greeting" aria-live="polite"></p>\n</main>', css: 'body { font-family: system-ui, sans-serif; padding: 24px; background: #eff4f1; color: #203a31; }\n.profile { max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #bed1c5; border-radius: 16px; background: white; }\n.eyebrow { font-size: 14px; letter-spacing: 0.06em; }\nbutton { padding: 12px 18px; border: 0; border-radius: 8px; background: #315d4e; color: white; }', js: 'document.querySelector("#hello").addEventListener("click", () => {\n  document.querySelector("#greeting").textContent = "Hello! Thanks for visiting my page.";\n});' } }
    ];
    function capture(currentFiles, strict) {
      var next = files(currentFiles || current().files, current().files), problem = strict && fileProblem(next);
      if (problem) throw new Error(problem);
      if (JSON.stringify(next) !== JSON.stringify(current().files)) { current().files = next; current().updatedAt = timestamp(); }
    }
    function mutation(callback) {
      var before = copy(state);
      try { return callback(); } catch (error) { state = before; return { ok: false, error: error.message || 'The project change could not be completed.' }; }
    }
    function success() { return { ok: true, files: copy(current().files), project: copy(current()) }; }
    function add(name, newFiles, currentFiles) {
      return mutation(function () {
        name = nameOf(name);
        if (state.items.length >= MAX_PROJECTS) throw new Error('This library can hold 20 projects. Export a study backup to keep your work safe.');
        newFiles = files(newFiles); var problem = fileProblem(newFiles); if (problem) throw new Error(problem);
        var id = uniqueId(), time = timestamp();
        capture(currentFiles, true);
        state.items.push({ id: id, name: name, createdAt: time, updatedAt: time, files: newFiles }); state.activeId = id;
        return success();
      });
    }
    return {
      active: function () { return copy(current()); },
      list: function () { return copy(state.items); },
      templates: function () { return copy(templateList); },
      // Oversized unsaved drafts must still be available to the recovery export.
      // The store rejects an invalid library write without replacing saved data.
      snapshot: function (currentFiles) { capture(currentFiles, false); return copy(state); },
      create: function (name, templateId, currentFiles) {
        var template = templateList.find(function (item) { return item.id === templateId; });
        return template ? add(name, template.files, currentFiles) : { ok: false, error: 'Choose an available project template.' };
      },
      duplicate: function (name, currentFiles) {
        try { return add(name, files(currentFiles || current().files, current().files), currentFiles); }
        catch (error) { return { ok: false, error: error.message }; }
      },
      rename: function (name) { return mutation(function () { name = nameOf(name); if (current().name !== name) { current().name = name; current().updatedAt = timestamp(); } return success(); }); },
      switchTo: function (id, currentFiles) { return mutation(function () {
        if (!state.items.some(function (item) { return item.id === id; })) throw new Error('This saved project could not be found.');
        capture(currentFiles, true); state.activeId = id; return success();
      }); }
    };
  }
  function filename(name) {
    var safe = String(name || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '').slice(0, 70).replace(/[. ]+$/g, '');
    if (!safe) safe = 'web-studio-project';
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = 'project-' + safe;
    return safe + '.html';
  }
  function exportWarnings(value) {
    var project = files(value), text = project.html + '\n' + project.css + '\n' + project.js, warnings = [];
    if (/(?:https?:\/\/|["'`(]\s*\/\/)[^\s"'`<>]+/i.test(text)) warnings.push('This code contains a possible external URL. That service or asset may need internet when the exported website is opened.');
    if (/(?:\b(?:src|href|poster)\s*=\s*["']\s*(?!data:|#|https?:|\/\/)[^"']+|url\s*\(\s*["']?\s*(?!data:|#|https?:|\/\/)[^\s)]+)/i.test(project.html + '\n' + project.css)) warnings.push('Relative file references are not bundled. Only the three code files and images already embedded as data URLs are included.');
    if (/<\s*(?:script|iframe|frame|object|embed|base|meta|link)\b/i.test(project.html)) warnings.push('This editor uses an HTML fragment. Embedded scripts and full-document resources may behave differently; keep JavaScript in script.js and CSS in style.css.');
    return warnings;
  }
  function exportWebsite(value, title) {
    var project = files(value);
    // Include only the three source strings: metadata and study/session records
    // can never leak into this executable export, even if files has future keys.
    var source = { html: project.html, css: project.css, js: project.js };
    var encoded = JSON.stringify(source).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    var escapedTitle = String(title || 'My Web Studio project').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    // Inserting textContent avoids HTML raw-text parsing of learner CSS/JS, so
    // literal closing tags, Unicode and tagged-template raw strings stay exact.
    // Student JavaScript runs as its own global script after the HTML and CSS.
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + escapedTitle + '</title>\n<style>' + BASE_CSS + '</style>\n</head>\n<body>\n<script>\n(function(){\n  const project=' + encoded + ';\n  const style=document.createElement("style");\n  style.textContent=project.css;\n  document.head.appendChild(style);\n  document.body.innerHTML=project.html;\n  const script=document.createElement("script");\n  script.textContent=project.js;\n  document.body.appendChild(script);\n})();\n</script>\n</body>\n</html>\n';
  }
  return { create: create, exportWebsite: exportWebsite, exportWarnings: exportWarnings, filename: filename, MAX_PROJECTS: MAX_PROJECTS, MAX_NAME: MAX_NAME, MAX_FILE: MAX_FILE };
});
