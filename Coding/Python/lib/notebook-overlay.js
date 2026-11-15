/* Keep the lesson in place while its linked, same-origin notebook is open. */
(function () {
  'use strict';
  var dialog, opener, frame, previousOverflow;
  function close() { if (dialog && dialog.open) dialog.close(); }
  function create() {
    dialog = document.createElement('dialog');
    dialog.className = 'notebook-overlay';
    dialog.setAttribute('aria-labelledby', 'notebook-overlay-title');
    dialog.innerHTML = '<header><h2 id="notebook-overlay-title">Lesson 0.3 · Counter experiment</h2><button type="button">Back to lesson</button></header><p class="notebook-overlay-help">Run Cell 11 once, then Cell 12 twice: 55 → 110. <a target="_blank" rel="noopener">Open full page</a></p><iframe title="For Loops counter experiment"></iframe>';
    document.body.appendChild(dialog);
    frame = dialog.querySelector('iframe');
    dialog.querySelector('button').addEventListener('click', close);
    dialog.addEventListener('close', function () {
      document.documentElement.style.overflow = previousOverflow;
      frame.removeAttribute('src');
      if (opener) opener.focus({ preventScroll: true });
    });
    // Escape inside the iframe and its lesson-return link should close the overlay.
    frame.addEventListener('load', function () {
      try {
        var doc = frame.contentDocument;
        if (!doc || !doc.querySelector('.np')) return;
        doc.documentElement.classList.add('notebook-embedded');
        doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        doc.addEventListener('click', function (e) {
          var a = e.target.closest('a');
          if (a && new URL(a.href).pathname === location.pathname) { e.preventDefault(); close(); }
        });
      } catch (e) { /* The full-page link remains available if a frame cannot be inspected. */ }
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-notebook-overlay]');
    if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;
    var target = new URL(a.href);
    if (target.origin !== location.origin) return;
    e.preventDefault();
    if (!dialog) create();
    if (dialog.open) return;
    opener = a; previousOverflow = document.documentElement.style.overflow;
    dialog.querySelector('a').href = target.href;
    frame.src = target.href;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    dialog.querySelector('button').focus();
  });
})();
