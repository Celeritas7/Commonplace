/* Original Commonplace exercises for the three sample lessons.
 * These check a small published rubric, not every possible solution or design.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WebStudioExercises = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var readingHTML = '<main class="card">\n  <h1>My reading list</h1>\n  <p>Next: a book about the night sky.</p>\n  <button id="counter">Start reading</button>\n</main>';
  var counterHTML = '<main class="card">\n  <h1>My study desk</h1>\n  <p>Click the button to count your steps.</p>\n  <button id="counter">Clicks: 0</button>\n</main>';
  var cardCSS = '.card {\n  padding: 24px;\n  background: #edf5ff;\n  color: #244f7c;\n  border-radius: 12px;\n}';
  function counterCode(step) {
    return 'const button = document.querySelector("#counter");\nlet count = 0;\n\nbutton.addEventListener("click", () => {\n  count += ' + step + ';\n  button.textContent = "Clicks: " + count;\n});';
  }
  var list = [
    {
      id: 'html-reading-card', version: 1, language: 'html', lessonId: 'html-elements',
      title: 'Build a reading card',
      goal: 'Inside main.card, add an h1 heading and a paragraph with your own words. Keep a real button with id="counter" and the label Start reading.',
      hints: [
        'Start with the HTML roles: use h1 for the main heading, p for a sentence, and button for the control. Put all three inside main.',
        'The container needs class="card" so the selector main.card can find it. The button needs id="counter"; plain text or a link is not the same as a button.',
        'Add words between the empty h1 and p tags. Use <button id="counter">Start reading</button>. The heading and paragraph may say anything meaningful to you.'
      ],
      starter: {
        html: '<main class="card">\n  <h1></h1>\n  <p></p>\n  <button id="counter">Start reading</button>\n</main>',
        css: cardCSS,
        js: ''
      },
      solution: { html: readingHTML, css: cardCSS, js: '' },
      checks: [
        { id: 'main', label: 'A main content area with class card', why: 'main identifies the main content. The card class connects this container to its stylesheet.' },
        { id: 'heading', label: 'A nonempty h1 inside the card', why: 'The heading must be an h1 element containing words, not just large text styled with CSS.' },
        { id: 'paragraph', label: 'A nonempty paragraph inside the card', why: 'A p element gives your sentence a paragraph role. Whitespace alone is not content.' },
        { id: 'button', label: 'A button labelled Start reading', why: 'Use a button element inside the card, with id="counter" and the requested label. This exercise checks its structure, not a reading action.' }
      ],
      visualReview: 'Run the preview and check that the heading, sentence and button are visible and readable. This HTML exercise does not attach a reading action to the button.'
    },
    {
      id: 'css-card-spacing', version: 1, language: 'css', lessonId: 'css-spacing',
      title: 'Give the card room',
      goal: 'Style main.card with 32px of padding on every side and 12px rounded corners. Keep the HTML content in place.',
      hints: [
        'Select the container with .card. Padding adds room inside its edge; margin adds room outside it.',
        'Write declarations inside braces, using a colon between the property and value. A nonzero pixel length needs px.',
        'Set padding: 32px; and border-radius: 12px; inside .card. If a check still reports another value, look for a later rule or inline style overriding yours.'
      ],
      starter: {
        html: readingHTML,
        css: '.card {\n  padding: 24px;\n  background: #edf5ff;\n  color: #244f7c;\n  border-radius: 0;\n}',
        js: ''
      },
      solution: {
        html: readingHTML,
        css: '.card {\n  padding: 32px;\n  background: #edf5ff;\n  color: #244f7c;\n  border-radius: 12px;\n}',
        js: ''
      },
      checks: [
        { id: 'card', label: 'The main.card element exists', why: 'The stylesheet needs an element to match. Keep class="card" on the main container.' },
        { id: 'padding', label: '32px padding on all four sides', why: 'The check reads the browser’s computed padding. Adding margin, an invalid unit, or a rule that loses to another rule will not create the requested inner space.' },
        { id: 'corners', label: '12px rounding at all four corners', why: 'border-radius controls the corners. Each computed corner must have a 12px radius.' }
      ],
      visualReview: 'Run the preview and compare the gap between the card edge and its text. Check that the rounded corners and text remain easy to see; passing the numeric checks does not judge the whole design.'
    },
    {
      id: 'js-count-twos', version: 1, language: 'js', lessonId: 'js-events',
      title: 'Count in twos',
      goal: 'In index.html, give the enabled button with id="counter" the initial label Clicks: 0. In script.js, make successive clicks show Clicks: 2, Clicks: 4 and Clicks: 6.',
      hints: [
        'Select #counter after the HTML exists, and attach a function with addEventListener("click", ...). The function should wait for the click.',
        'Keep count outside the click handler and initialize it to 0. Inside the handler, add 2 each time instead of assigning a fixed final number.',
        'Use count += 2; followed by button.textContent = "Clicks: " + count; inside the handler. Keep the HTML button label Clicks: 0 for a fresh run.'
      ],
      starter: { html: counterHTML, css: cardCSS, js: counterCode(1) },
      solution: { html: counterHTML, css: cardCSS, js: counterCode(2) },
      checks: [
        { id: 'button', label: 'An enabled counter button exists', why: 'A real enabled button with id="counter" must receive the click. Check that the JavaScript selector matches the HTML.' },
        { id: 'initial', label: 'A fresh run starts at Clicks: 0', why: 'The starting value and label should agree. Registering an event listener should not increment the counter.' },
        { id: 'click-1', label: 'The first click displays Clicks: 2', why: 'The event handler should add 2 to the initial zero and then update the displayed text.' },
        { id: 'click-2', label: 'The second click displays Clicks: 4', why: 'Keep the accumulated count between clicks. Do not reset it inside the handler or replace it with a fixed answer.' },
        { id: 'click-3', label: 'The third click displays Clicks: 6', why: 'Repeated clicks should continue the same rule. This extra click checks that the counter keeps changing.' }
      ],
      visualReview: 'Run a fresh preview and click the button yourself. Confirm that you can see 0, 2, 4 and 6 in order. Running again resets this example’s counter; saved code and study records remain.'
    }
  ];
  return {
    list: list,
    get: function (id) { return list.find(function (exercise) { return exercise.id === id; }); },
    byLanguage: function (language) { return list.find(function (exercise) { return exercise.language === language; }); }
  };
});
