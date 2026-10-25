/* Authored quiz bank — Lesson 0.2 · Installing Python. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 5, ask: 'In plain Command Prompt you run <code>pip install requests</code> and it says <i>Successfully installed</i>. In Anaconda Prompt you start Python and type <code>import requests</code>. Most likely result?',
    options: ['ModuleNotFoundError: the two prompts are using different Pythons', 'It works: pip is pip, there is one package store per machine', 'It works, but with a version warning', 'SyntaxError, because pip and conda syntax differ'], answer: 0,
    why: 'A package is installed for <b>one interpreter</b>, into its own site-packages. The plain prompt found some other pip on the PATH. Install and run from the same prompt.' },
  { type: 'mcq', sec: 3, ask: 'You type <code>where python</code> and get this. Which one runs when you type <code>python</code>?', code: 'C:\\Users\\me\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe\nC:\\Users\\me\\anaconda3\\python.exe',
    options: ['The first line, the WindowsApps one', 'The second line, the Anaconda one', 'Whichever is newer', 'Both; Windows runs them in turn'], answer: 0, html: false,
    why: '<code>where python</code> lists every python.exe on the PATH in search order. The <b>first</b> line wins, which here is not Anaconda: a ModuleNotFoundError waiting to happen.' },
  { type: 'mcq', sec: 8, ask: '<code>where python</code> and <code>python -c "import sys; print(sys.executable)"</code> disagree. Which do you trust?',
    options: ['sys.executable: it is Python reporting where the running interpreter lives', 'where python: Windows knows its own PATH best', 'Neither; reinstall Python', 'Whichever path contains anaconda3'], answer: 0,
    why: '<code>where</code> shows what Windows <i>would</i> run; <code>sys.executable</code> shows what <i>is</i> running your code.' },
  { type: 'mcq', sec: 6, ask: "You see <code>'python' is not recognized as an internal or external command</code>. What is the likely cause?",
    options: ['You are in plain Command Prompt, and Anaconda is not on the global PATH by default', 'Anaconda is not installed', 'You need to install Python from python.org as well', 'The python command was renamed to conda'], answer: 0,
    why: 'Anaconda deliberately stays off the global PATH. Open the <b>Anaconda Prompt</b> shortcut, which has the paths set up, and the message goes away.' },
  { type: 'fill', sec: 3, ask: 'The three commands that answer everything.', code: '# which Python, and what version?\npython {{1}}\n# where does that executable live?\n{{2}} python\n# what is already installed for it?\nconda {{3}}',
    blanks: [{ a: '--version', alt: ['-V'] }, 'where', 'list'] },
  { type: 'fill', sec: 2, ask: 'Complete the mental model.', text: 'Everything you pip install lands in the interpreter\'s {{1}} folder. Each interpreter has its own, which is why pandas installed for one is invisible to another.',
    blanks: [{ a: 'site-packages', alt: ['site packages', 'sitepackages'] }] },
  { type: 'match', sec: 2, ask: 'Match each piece to what it is',
    pairs: { 'The interpreter': 'python.exe, the program that reads and runs your source', 'The standard library': 'math, json, pathlib: ships with Python, no install', 'site-packages': 'where pip and conda installs land, one per interpreter', 'Anaconda': 'a distribution: an interpreter plus about 250 packages', 'conda': 'the tool to prefer for installs and for making new environments' } }
];
