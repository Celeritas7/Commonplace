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

  async function buildDocument(files, token, parser, crypto, doc) {
    var html = String(files.html || ''), css = String(files.css || ''), js = String(files.js || '');
    inspectMarkup(html, css, doc);
    if (!/^[a-f0-9]{48}$/.test(token)) throw new Error('Invalid preview token.');
    var guard = '__ws_guard_' + token;
    var compiled = instrument(js, guard, parser);
    var reporter = '__ws_report_' + token;
    var bootstrap = guardCode(guard) +
      'const ' + reporter + '=(()=>{const send=parent.postMessage.bind(parent);let count=0;return(type,message)=>{if(++count>250)return;send({source:"commonplace-web-preview",token:' + JSON.stringify(token) + ',type,message:String(message).slice(0,3000)},"*");};})();' +
      'addEventListener("error",e=>{' + reporter + '("error",e.message||"JavaScript error");e.preventDefault();});' +
      'addEventListener("unhandledrejection",e=>{' + reporter + '("error",e.reason&&e.reason.message||String(e.reason));e.preventDefault();});' +
      'addEventListener("securitypolicyviolation",e=>{' + reporter + '("error","Blocked "+e.effectiveDirective+". External resources, inline handlers and dynamic code are disabled in this preview.");});' +
      '["log","info","warn","error"].forEach(level=>{console[level]=(...args)=>{' + reporter + '("log",level+": "+args.slice(0,10).map(x=>{try{return String(x).slice(0,500)}catch(e){return "[unprintable]"}}).join(" "));};});';
    var user = '(()=>{"use strict";try{' + guard + '();\n' + compiled + '\n' + reporter + '("ready","Preview running. Changes are local; external assets and services are blocked.");}catch(e){' + reporter + '("error",e&&e.message||String(e));}})();';
    var hashes = await Promise.all([digest(bootstrap, crypto), digest(user, crypto)]);
    var policy = "default-src 'none'; script-src 'sha256-" + hashes[0] + "' 'sha256-" + hashes[1] + "'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="' + policy + '"><style>html{color-scheme:light dark}body{margin:0;padding:16px;background:Canvas;color:CanvasText;font:16px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{min-height:44px}h1{font-size:26px;line-height:1.2}\n' + css.replace(/<\/style/gi, '<\\/style') + '</style><script>' + bootstrap + '</script></head><body>' + html + '<script>' + user + '</script></body></html>';
  }

  function create(options) {
    if (!options || !options.container) throw new Error('A preview container is required.');
    var container = options.container, doc = container.ownerDocument || global.document;
    var onStatus = typeof options.onStatus === 'function' ? options.onStatus : function () {};
    var onLog = typeof options.onLog === 'function' ? options.onLog : function () {};
    var active = null, generation = 0;
    function dispose() {
      if (!active) return;
      global.clearTimeout(active.timeout);
      global.removeEventListener('message', active.listener);
      active.frame.remove();
      active = null;
    }
    function stop() { generation++; dispose(); container.replaceChildren(); onStatus('Preview stopped. Your code and study data are kept.', false); }
    async function run(files) {
      var ownGeneration = ++generation;
      dispose(); container.replaceChildren(); onStatus('Preparing local preview…', false);
      try {
        var crypto = global.crypto;
        if (!crypto || !crypto.subtle || !crypto.getRandomValues) throw new Error('This preview needs HTTPS or localhost for safe execution. Open the Commonplace website and try again.');
        var token = Array.from(crypto.getRandomValues(new Uint8Array(24)), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
        var source = await buildDocument(files, token, global.acorn, crypto, doc);
        if (generation !== ownGeneration) return;
        var frame = doc.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.setAttribute('title', 'Web Studio browser preview');
        frame.setAttribute('allow', "camera 'none'; microphone 'none'; geolocation 'none'");
        frame.style.cssText = 'display:block;width:100%;min-height:320px;border:0;background:transparent';
        var session = { frame: frame, failed: false, timeout: null, listener: null };
        session.listener = function (event) {
          var data = event.data;
          if (active !== session || event.source !== frame.contentWindow || !data || data.source !== 'commonplace-web-preview' || data.token !== token || typeof data.message !== 'string') return;
          if (data.type === 'log') { onLog(data.message.slice(0,3000)); return; }
          if (data.type !== 'ready' && data.type !== 'error') return;
          global.clearTimeout(session.timeout);
          if (data.type === 'error') { session.failed = true; onStatus(data.message.slice(0,3000), true); }
          else if (!session.failed) onStatus(data.message.slice(0,3000), false);
        };
        active = session;
        global.addEventListener('message', session.listener);
        frame.srcdoc = source;
        container.replaceChildren(frame);
        session.timeout = global.setTimeout(function () {
          if (active === session) onStatus('Preview startup did not finish. Press Stop, check the code, then Run again.', true);
        }, 5000);
      } catch (error) {
        if (generation === ownGeneration) onStatus(error && error.message || 'The preview could not start.', true);
      }
    }
    return { run: run, stop: stop };
  }
  return { create: create, _test: { instrument: instrument, inspectMarkup: inspectMarkup, guardCode: guardCode, buildDocument: buildDocument } };
});
