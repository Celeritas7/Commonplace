/* Web Studio preview: real browser HTML/CSS/DOM JavaScript, isolated from study data.
 * Acorn instruments loops and functions. Script hashes prohibit dynamic/uninstrumented
 * scripts (including eval/Function and inline handlers). Native browser operations are
 * not preemptible; this is a learning runner, not a hostile-code execution service.
 */
(function (global, factory) {
  var api = factory(global);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.WebStudioPreview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var LIMIT = 150000;
  function instrument(source, name, parser) {
    if (!parser || typeof parser.parse !== 'function') throw new Error('The local JavaScript parser did not load. Reload the app and try again.');
    if (source.length > LIMIT) throw new Error('Keep JavaScript under 150,000 characters in this learning workspace.');
    // HTML parsing normalises CRLF and replaces NUL; hash the exact text the browser sees.
    source = source.replace(/\r\n?/g, '\n');
    if (source.indexOf('\0') !== -1) throw new Error('Remove the hidden NUL character from script.js and try again.');
    if (!/^__ws_guard_[a-f0-9]+$/.test(name)) throw new Error('Invalid preview identifier.');
    var comments = [], tree = parser.parse(source, { ecmaVersion: 2022, sourceType: 'script', onComment: comments, allowHashBang: true });
    var insertions = new Map();
    function put(at, text) { if (!insertions.has(at)) insertions.set(at, []); insertions.get(at).push(text); }
    function blockGuard(body) {
      var at = body.start + 1;
      for (var i = 0; i < body.body.length && body.body[i].directive; i++) at = body.body[i].end;
      put(at, ';' + name + '();');
    }
    function walk(node) {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'TaggedTemplateExpression' && node.quasi.quasis.some(function (part) { return /<\/script|<!--/i.test(part.value.raw); })) {
        throw new Error('Tagged templates containing HTML script delimiters are not supported in this learning preview. Use a normal string or template literal.');
      }
      if (/^(?:ForStatement|ForInStatement|ForOfStatement|WhileStatement|DoWhileStatement)$/.test(node.type)) {
        if (node.body.type === 'BlockStatement') put(node.body.start + 1, name + '();');
        else { put(node.body.start, '{' + name + '();'); put(node.body.end, '}'); }
      }
      if (/^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
        if (node.body.type === 'BlockStatement') blockGuard(node.body);
        else { put(node.body.start, '(' + name + '(),'); put(node.body.end, ')'); }
      }
      for (var key of Object.keys(node)) {
        var value = node[key];
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value);
      }
    }
    walk(tree);
    // Preserve line endings/ASI while removing comments, including HTML-style comments.
    var characters = source.split('');
    comments.forEach(function (comment) { for (var i = comment.start; i < comment.end; i++) if (characters[i] !== '\n' && characters[i] !== '\r') characters[i] = ' '; });
    var clean = characters.join('');
    Array.from(insertions.keys()).sort(function (a, b) { return b - a; }).forEach(function (at) {
      clean = clean.slice(0, at) + insertions.get(at).join('') + clean.slice(at);
    });
    // Neutralise HTML raw-script delimiters in JS strings/templates/regular expressions.
    return clean.replace(/<\/script/gi, function (match) { return '<\\/' + match.slice(2); }).replace(/<!--/g, '<\\!--');
  }

  function inspectMarkup(html, css, doc) {
    if (html.length > LIMIT || css.length > LIMIT) throw new Error('Keep each file under 150,000 characters in this learning workspace.');
    if (/<\s*(?:script|iframe|frame|object|embed|base|meta|link)\b/i.test(html)) throw new Error('Put JavaScript in script.js. Embedded scripts, frames and external resources are not supported in the learning preview.');
    if (/<[^>]*\s+on[\w:-]+\s*=/i.test(html)) throw new Error('Use addEventListener in script.js instead of an inline HTML event handler.');
    if (/@import\b|url\s*\(/i.test(css) || /@import\b|url\s*\(/i.test(html)) throw new Error('External CSS and URL assets are blocked here. Keep this exercise self-contained.');
    if (doc) {
      var template = doc.createElement('template');
      template.innerHTML = html;
      Array.from(template.content.querySelectorAll('*')).forEach(function (element) {
        Array.from(element.attributes).forEach(function (attribute) {
          var name = attribute.name.toLowerCase(), value = attribute.value.trim();
          if (/^on/.test(name)) throw new Error('Use addEventListener in script.js instead of an inline HTML event handler.');
          if (/^(?:src|srcset|href|xlink:href|action|formaction|poster|data)$/.test(name) && value && !/^#/.test(value) && !(name === 'src' && element.tagName === 'IMG' && /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value))) {
            throw new Error('External assets, links and services are blocked in this local preview. Use a fragment link or a self-contained example.');
          }
        });
      });
    }
  }

  function guardCode(name) {
    return 'const ' + name + '=(()=>{let active=false,left=0,until=0;const clock=performance.now.bind(performance),later=setTimeout.bind(globalThis);return()=>{if(!active){active=true;left=100000;until=clock()+300;later(()=>{active=false},0);}if(--left<0||clock()>until)throw new Error("Execution limit reached. Check for an endless loop or recursion, then run again.");};})();';
  }

  async function digest(text, crypto) {
    var bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    var binary = Array.from(new Uint8Array(bytes), function (b) { return String.fromCharCode(b); }).join('');
    return btoa(binary);
  }

  var EXERCISE_CHECKS = {
    'html-reading-card': [
      ['main', 'main.card exists'], ['heading', 'Non-empty h1 inside main.card'],
      ['paragraph', 'Non-empty p inside main.card'], ['button', 'Start reading']
    ],
    'css-card-spacing': [
      ['card', 'main.card exists'], ['padding', '32px / 32px / 32px / 32px'],
      ['corners', '12px / 12px / 12px / 12px']
    ],
    'js-count-twos': [
      ['button', 'Enabled button#counter'], ['initial', 'Clicks: 0'],
      ['click-1', 'Clicks: 2'], ['click-2', 'Clicks: 4'], ['click-3', 'Clicks: 6']
    ]
  };

  // This trusted function is captured in the bootstrap, before student code.
  // It observes actual DOM, computed CSS and native clicks in the opaque frame.
  // It is a teaching check for these small, synchronous exercises, not an exam
  // security boundary or a claim to validate arbitrary future asynchronous work.
  function exerciseHarness(exerciseId, token, state, report) {
    const send = parent.postMessage.bind(parent), later = setTimeout.bind(globalThis);
    const query = document.querySelector.bind(document);
    const within = Function.prototype.call.bind(Element.prototype.querySelector);
    const matches = Function.prototype.call.bind(Element.prototype.matches);
    const click = Function.prototype.call.bind(HTMLElement.prototype.click);
    const text = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get);
    const style = getComputedStyle.bind(globalThis), PromiseType = Promise;
    const normal = value => String(value).replace(/\s+/g, ' ').trim().slice(0, 500);
    const label = element => element ? normal(text(element)) : 'Not found';
    const pause = delay => new PromiseType(resolve => later(resolve, delay));
    const rows = [];
    const add = (id, passed, expected, actual) => rows.push({ id, passed: !!passed, expected, actual: normal(actual) });
    return async function () {
      try {
        // Let immediate microtasks, browser errors and policy violations arrive.
        await pause(0);
        if (state.error) return;
        if (exerciseId === 'html-reading-card') {
          const card = query('main.card'), heading = card && within(card, 'h1');
          const paragraph = card && within(card, 'p'), button = card && within(card, 'button#counter');
          add('main', !!card, 'main.card exists', card ? 'main.card exists' : 'Not found');
          add('heading', !!heading && !!label(heading), 'Non-empty h1 inside main.card', label(heading));
          add('paragraph', !!paragraph && !!label(paragraph), 'Non-empty p inside main.card', label(paragraph));
          add('button', !!button && label(button) === 'Start reading', 'Start reading', label(button));
        } else if (exerciseId === 'css-card-spacing') {
          const card = query('main.card'), computed = card && style(card);
          const padding = computed ? [computed.paddingTop, computed.paddingRight, computed.paddingBottom, computed.paddingLeft] : [];
          const corners = computed ? [computed.borderTopLeftRadius, computed.borderTopRightRadius, computed.borderBottomRightRadius, computed.borderBottomLeftRadius] : [];
          add('card', !!card, 'main.card exists', card ? 'main.card exists' : 'Not found');
          add('padding', padding.length === 4 && padding.every(value => value === '32px'), '32px / 32px / 32px / 32px', card ? padding.join(' / ') : 'Card not found');
          add('corners', corners.length === 4 && corners.every(value => value === '12px'), '12px / 12px / 12px / 12px', card ? corners.join(' / ') : 'Card not found');
        } else {
          const button = query('button#counter'), enabled = !!button && !matches(button, ':disabled');
          add('button', enabled, 'Enabled button#counter', enabled ? 'Enabled button#counter' : button ? 'Button is disabled' : 'Not found');
          add('initial', !!button && label(button) === 'Clicks: 0', 'Clicks: 0', label(button));
          for (let i = 1; i <= 3; i++) {
            if (enabled) click(button);
            await pause(40);
            if (state.error) return;
            const expected = 'Clicks: ' + i * 2;
            add('click-' + i, enabled && label(button) === expected, expected, label(button));
          }
        }
        // Catch errors/rejections queued by the final handler before a pass.
        await pause(80);
        if (!state.error) send({ source: 'commonplace-web-preview', token, type: 'checks', exerciseId, checks: rows }, '*');
      } catch (error) {
        report('error', error && error.message || 'The exercise could not be checked.');
      }
    };
  }

  function validateChecks(exerciseId, rows) {
    var expected = EXERCISE_CHECKS[exerciseId];
    if (!expected || !Array.isArray(rows) || rows.length !== expected.length) return null;
    var result = [];
    for (var i = 0; i < expected.length; i++) {
      var row = rows[i];
      if (!row || row.id !== expected[i][0] || typeof row.passed !== 'boolean' ||
          row.expected !== expected[i][1] || typeof row.actual !== 'string' || row.actual.length > 500) return null;
      result.push({ id: row.id, passed: row.passed, expected: row.expected, actual: row.actual });
    }
    return result;
  }

  async function buildDocument(files, token, parser, crypto, doc, exerciseId) {
    var html = String(files.html || ''), css = String(files.css || ''), js = String(files.js || '');
    inspectMarkup(html, css, doc);
    if (!/^[a-f0-9]{48}$/.test(token)) throw new Error('Invalid preview token.');
    if (exerciseId && !Object.prototype.hasOwnProperty.call(EXERCISE_CHECKS, exerciseId)) throw new Error('This exercise check is not available.');
    var guard = '__ws_guard_' + token, state = '__ws_state_' + token, checker = '__ws_check_' + token;
    var compiled = instrument(js, guard, parser);
    var reporter = '__ws_report_' + token;
    var bootstrap = guardCode(guard) + 'const ' + state + '={error:""};' +
      'const ' + reporter + '=(()=>{const send=parent.postMessage.bind(parent);let count=0,errors=0;return(type,message)=>{message=String(message).slice(0,3000);if(type==="error"){' + state + '.error=message;if(++errors>1)return;}else if(++count>250)return;send({source:"commonplace-web-preview",token:' + JSON.stringify(token) + ',type,message},"*");};})();' +
      'addEventListener("error",e=>{' + reporter + '("error",e.message||"JavaScript error");e.preventDefault();});' +
      'addEventListener("unhandledrejection",e=>{' + reporter + '("error",e.reason&&e.reason.message||String(e.reason));e.preventDefault();});' +
      'addEventListener("securitypolicyviolation",e=>{' + reporter + '("error","Blocked "+e.effectiveDirective+". External resources, inline handlers and dynamic code are disabled in this preview.");});' +
      '["log","info","warn","error"].forEach(level=>{console[level]=(...args)=>{' + reporter + '("log",level+": "+args.slice(0,10).map(x=>{try{return String(x).slice(0,500)}catch(e){return "[unprintable]"}}).join(" "));};});' +
      (exerciseId ? 'const ' + checker + '=(' + exerciseHarness.toString() + ')(' + JSON.stringify(exerciseId) + ',' + JSON.stringify(token) + ',' + state + ',' + reporter + ');' : '');
    var user = '(()=>{"use strict";try{' + guard + '();\n' + compiled + '\n' + reporter + '("ready","Preview running. Changes are local; external assets and services are blocked.");}catch(e){' + reporter + '("error",e&&e.message||String(e));}})();';
    var scripts = [bootstrap, user];
    if (exerciseId) scripts.push(checker + '();');
    var hashes = await Promise.all(scripts.map(function (script) { return digest(script, crypto); }));
    var policy = "default-src 'none'; script-src " + hashes.map(function (hash) { return "'sha256-" + hash + "'"; }).join(' ') + "; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="' + policy + '"><style>html{color-scheme:light dark}body{margin:0;padding:16px;background:Canvas;color:CanvasText;font:16px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{min-height:44px}h1{font-size:26px;line-height:1.2}\n' + css.replace(/<\/style/gi, '<\\/style') + '</style><script>' + bootstrap + '</script></head><body>' + html + '<script>' + scripts.slice(1).join('</script><script>') + '</script></body></html>';
  }

  function create(options) {
    if (!options || !options.container) throw new Error('A preview container is required.');
    var container = options.container, doc = container.ownerDocument || global.document;
    var onStatus = typeof options.onStatus === 'function' ? options.onStatus : function () {};
    var onLog = typeof options.onLog === 'function' ? options.onLog : function () {};
    var active = null;
    function settle(session, result) {
      if (!session.resolve || session.settled) return;
      session.settled = true;
      global.clearTimeout(session.timeout);
      session.resolve(result);
    }
    function dispose() {
      if (!active) return;
      var old = active; active = null;
      global.clearTimeout(old.timeout);
      if (old.listener) global.removeEventListener('message', old.listener);
      if (old.frame) old.frame.remove();
      settle(old, { status: 'cancelled', checks: [], error: 'Check cancelled. Your code is kept.' });
    }
    function stop() { dispose(); container.replaceChildren(); onStatus('Preview stopped. Your code and study data are kept.', false); }
    function fail(session, message) {
      if (active !== session) return;
      session.failed = true;
      global.clearTimeout(session.timeout);
      onStatus(message, true);
      settle(session, { status: 'error', checks: [], error: message });
      // A failed check cannot continue running student timers after settlement.
      if (session.exerciseId) dispose();
    }
    async function launch(files, exerciseId, resolve) {
      dispose(); container.replaceChildren(); onStatus(exerciseId ? 'Checking a fresh copy of your code…' : 'Preparing local preview…', false);
      var session = { frame: null, failed: false, timeout: null, listener: null, exerciseId: exerciseId, resolve: resolve, settled: false };
      active = session;
      // Deadline includes document construction/hash generation, not just loading.
      session.timeout = global.setTimeout(function () {
        if (active === session) fail(session, exerciseId ? 'Exercise check timed out. Stop, inspect your code and try Check again.' : 'Preview startup did not finish. Press Stop, check the code, then Run again.');
      }, 5000);
      try {
        var crypto = global.crypto;
        if (!crypto || !crypto.subtle || !crypto.getRandomValues) throw new Error('This preview needs HTTPS or localhost for safe execution. Open the Commonplace website and try again.');
        var token = Array.from(crypto.getRandomValues(new Uint8Array(24)), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
        var source = await buildDocument(files, token, global.acorn, crypto, doc, exerciseId);
        if (active !== session || session.failed) return;
        var frame = doc.createElement('iframe'); session.frame = frame;
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.setAttribute('title', exerciseId ? 'Web Studio exercise check' : 'Web Studio browser preview');
        frame.setAttribute('allow', "camera 'none'; microphone 'none'; geolocation 'none'");
        frame.style.cssText = 'display:block;width:100%;min-height:320px;border:0;background:transparent';
        session.listener = function (event) {
          var data = event.data;
          if (active !== session || event.source !== frame.contentWindow || !data || data.source !== 'commonplace-web-preview' || data.token !== token) return;
          if (data.type === 'checks' && exerciseId && !session.settled) {
            var rows = data.exerciseId === exerciseId && validateChecks(exerciseId, data.checks);
            if (!rows) { fail(session, 'The exercise returned an invalid result. Check again.'); return; }
            if (session.failed) return;
            var passed = rows.every(function (row) { return row.passed; });
            onStatus(passed ? 'Automatic checks passed. Review the page visually too.' : 'Some checks need work. Review the feedback and try again.', false);
            settle(session, { status: passed ? 'passed' : 'failed', checks: rows });
            // Freeze the observation: no later timer or click can silently change
            // an already recorded attempt. Run preview remains separately available.
            dispose();
            return;
          }
          if (typeof data.message !== 'string') return;
          if (data.type === 'log') { onLog(data.message.slice(0,3000)); return; }
          if (data.type !== 'ready' && data.type !== 'error') return;
          if (data.type === 'error') { fail(session, data.message.slice(0,3000)); return; }
          if (!exerciseId) { global.clearTimeout(session.timeout); if (!session.failed) onStatus(data.message.slice(0,3000), false); }
          // A ready message never settles a grading request or removes its deadline.
        };
        global.addEventListener('message', session.listener);
        frame.srcdoc = source;
        container.replaceChildren(frame);
      } catch (error) {
        fail(session, error && error.message || 'The preview could not start.');
      }
    }
    function run(files) { return launch(files, null, null); }
    function check(files, exerciseId) {
      if (!Object.prototype.hasOwnProperty.call(EXERCISE_CHECKS, exerciseId)) {
        stop();
        var error = 'This exercise check is not available.';
        onStatus(error, true);
        return Promise.resolve({ status: 'error', checks: [], error: error });
      }
      return new Promise(function (resolve) { launch(files, exerciseId, resolve); });
    }
    return { run: run, check: check, stop: stop };
  }
  return { create: create, _test: { instrument: instrument, inspectMarkup: inspectMarkup, guardCode: guardCode, buildDocument: buildDocument, validateChecks: validateChecks, exerciseChecks: EXERCISE_CHECKS } };
});
