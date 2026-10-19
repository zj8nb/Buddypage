/* Note Wall
   Inspired by a sticky note wall in a café near my home.
   Click fits sticky notes well, since you just press a note onto
   the wall. 
   Advantages: nothing to install. can stay open in a tab while working,
   so small things can be jotted down quickly. It is also more fun than 
   the computer's built-in notepad. */
/* AI used:
chatgpt was helped me find tutorials and solve problems
   such as the "typo" many of my errors have been due to typos...
   also translated the comments.  */


const wall = document.getElementById('wall');
const desk = document.getElementById('desk');
const hand = document.getElementById('hand');
const heldNote = hand.querySelector('.held-note');
const heldPen = hand.querySelector('.held-pen');
const toolButtons = document.querySelectorAll('.tool');
const bin = document.getElementById('bin');
const binView = document.getElementById('bin-view');
const binList = document.getElementById('bin-list');
const binCount = document.getElementById('bin-count');

const colors = ['#f6e7a1', '#f4c7a8', '#cfdcb6', '#ecc3c3', '#efe6d6'];
const NOTE_SIZE = 160;
const CLICK_DELAY = 260; // ms to wait before treating a click as a single click (so a double-click can cancel it)

let colorIndex = 0;
let zCounter = 1;
let currentTool = 'note';
let pendingDrop = null;

// Pen settings live in one place so colour / thickness controls can be added later.
const pen = { color: '#1f2a44', size: 2.5 };
let stroke = null; // { note, ctx, lastX, lastY } while the pen is pressed on paper

/* ---------- Helpers ---------- */

function randomTilt() {
  return +(Math.random() * 12 - 6).toFixed(1);
}

function prepareHeldNote() {
  heldNote.style.setProperty('--note-color', colors[colorIndex]);
  heldNote.dataset.tilt = randomTilt();
  heldNote.style.setProperty('--tilt', heldNote.dataset.tilt + 'deg');
}

function isOverDesk(y) {
  return y >= desk.getBoundingClientRect().top;
}

// Topmost real note under a screen point (the hand itself ignores the pointer).
function noteAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest('#wall .note') : null;
}

/* Each note gets a random tilt so the wall feels handmade. When I added the pencil,
   strokes landed off to the side of the nib on tilted notes, because the mouse gives
   screen coordinates but each note's canvas rotates with the note. Rather than drop
   the tilt, I rotate the mouse point back by the note's angle before drawing
   (formula adapted from Mike, 2012). */
function toNoteCoords(note, x, y) {
  const cx = parseFloat(note.style.left);
  const cy = parseFloat(note.style.top);
  const a = -parseFloat(note.dataset.tilt) * Math.PI / 180;
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: dx * Math.cos(a) - dy * Math.sin(a) + NOTE_SIZE / 2,
    y: dx * Math.sin(a) + dy * Math.cos(a) + NOTE_SIZE / 2
  };
}

/* ---------- Creating notes ---------- */

function createNote(x, y) {
  const note = document.createElement('div');
  note.className = 'note just-pinned';
  note.style.left = x + 'px';
  note.style.top = y + 'px';
  note.style.zIndex = zCounter++;
  note.style.setProperty('--note-color', colors[colorIndex]);
  note.dataset.tilt = heldNote.dataset.tilt;
  note.style.setProperty('--tilt', note.dataset.tilt + 'deg');

  const text = document.createElement('div');
  text.className = 'note-text';
  note.appendChild(text);

  // Each note has its own canvas, so ink belongs to the paper and moves/falls with it.
  const ink = document.createElement('canvas');
  ink.className = 'ink';
  // Extra canvas pixels for high-density screens so handwriting stays sharp (MDN, devicePixelRatio).
  const dpr = window.devicePixelRatio || 1;
  ink.width = NOTE_SIZE * dpr;
  ink.height = NOTE_SIZE * dpr;
  const ctx = ink.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  note.appendChild(ink);

  note.addEventListener('animationend', () => {
    note.classList.remove('just-pinned');
  }, { once: true });

  wall.appendChild(note);

  colorIndex = (colorIndex + 1) % colors.length;
  prepareHeldNote();
}

/* ---------- Switching tools ---------- */

function setTool(tool) {
  if (tool === currentTool) return;
  stopEditing();

  // The tool we were holding goes back onto the desk...
  const previous = document.querySelector(`.tool[data-tool="${currentTool}"]`);
  previous.classList.remove('in-hand');
  previous.classList.add('returning');
  previous.querySelector('img').addEventListener('animationend', () => {
    previous.classList.remove('returning');
  }, { once: true });

  // ...and the new one leaves an empty spot where it was lying.
  document.querySelector(`.tool[data-tool="${tool}"]`).classList.add('in-hand');

  currentTool = tool;
  document.body.dataset.tool = tool;
}

toolButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setTool(btn.dataset.tool);
  });
});

// Escape finishes typing on a note.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') stopEditing();
});

/* ---------- Typing on a note (cursor tool, double-click) ---------- */

function startEditing(note) {
  stopEditing();
  const text = note.querySelector('.note-text');
  note.classList.add('editing');
  text.contentEditable = 'true';
  text.focus();
  // Put the caret at the end of whatever is already written.
  const range = document.createRange();
  range.selectNodeContents(text);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function stopEditing() {
  const note = document.querySelector('.note.editing');
  if (!note) return;
  const text = note.querySelector('.note-text');
  text.contentEditable = 'false';
  text.blur();
  note.classList.remove('editing');
}

/* ---------- Knocking a note off (cursor tool, single click) ---------- */

function dropNote(note) {
  note.style.setProperty('--spin-dir', Math.random() < 0.5 ? -1 : 1);
  note.style.setProperty('--drift', (Math.random() * 120 - 60).toFixed(0) + 'px');
  note.classList.add('falling');
  note.addEventListener('animationend', () => throwInBin(note), { once: true });
}

// The note isn't deleted: the same element is moved into the bin,
// so its text and canvas drawing come along unchanged.
function throwInBin(note) {
  note.classList.remove('falling');
  note.style.left = '';
  note.style.top = '';
  note.style.zIndex = '';
  binList.prepend(note);
  binCount.textContent = binList.children.length;
}

bin.addEventListener('click', (e) => {
  e.stopPropagation();
  binView.hidden = !binView.hidden;
});

/* ---------- Pointer handling ---------- */

document.addEventListener('pointermove', (e) => {
  hand.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  document.body.classList.toggle('over-desk', isOverDesk(e.clientY));

  // Press → move → release drawing, based on MDN's mousemove canvas example and the
  // course modules. A stroke stays on the note it started on.
  if (stroke) {
    const p = toNoteCoords(stroke.note, e.clientX, e.clientY);
    stroke.ctx.beginPath();
    stroke.ctx.moveTo(stroke.lastX, stroke.lastY);
    stroke.ctx.lineTo(p.x, p.y);
    stroke.ctx.stroke();
    stroke.lastX = p.x;
    stroke.lastY = p.y;
  }
});

document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || isOverDesk(e.clientY)) return;

  if (currentTool === 'note') {
    heldNote.classList.add('pressing');
  }

  if (currentTool === 'pen') {
    const note = noteAt(e.clientX, e.clientY);
    if (!note) {
      heldPen.classList.remove('nope');
      void heldPen.offsetWidth; // reading offsetWidth restarts the shake animation (Coyier, 2011)
      heldPen.classList.add('nope');
      return;
    }
    const ctx = note.querySelector('.ink').getContext('2d');
    ctx.strokeStyle = pen.color;
    ctx.lineWidth = pen.size;
    const p = toNoteCoords(note, e.clientX, e.clientY);
    // A dot, so a single tap still leaves a mark.
    ctx.beginPath();
    ctx.arc(p.x, p.y, pen.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = pen.color;
    ctx.fill();
    stroke = { note, ctx, lastX: p.x, lastY: p.y };
  }
});

document.addEventListener('pointerup', () => {
  heldNote.classList.remove('pressing');
  stroke = null;
});

wall.addEventListener('click', (e) => {
  if (currentTool === 'note') {
    createNote(e.clientX, e.clientY);
    return;
  }

  if (currentTool === 'cursor') {
    const note = noteAt(e.clientX, e.clientY);
    if (note && note.classList.contains('editing')) return; // clicking inside the text just moves the caret
    stopEditing();
    if (!note) return;
    // Single click waits 260 ms so a double-click (to type) doesn't knock the note off first (Coyier, 2013).
    clearTimeout(pendingDrop);
    pendingDrop = setTimeout(() => dropNote(note), CLICK_DELAY);
  }
});

wall.addEventListener('dblclick', (e) => {
  if (currentTool !== 'cursor') return;
  clearTimeout(pendingDrop);
  const note = noteAt(e.clientX, e.clientY);
  if (note) startEditing(note);
});

/* ---------- Start ---------- */

document.querySelector('.tool[data-tool="note"]').classList.add('in-hand');
prepareHeldNote();

/* ---------- References ----------
   Coyier, C (2011) Restart CSS animation, CSS-Tricks, accessed 19 October 2026.
     https://css-tricks.com/restart-css-animation/
   Coyier, C (2013) Bind different events to click and double click, CSS-Tricks,
     accessed 19 October 2026.
     https://css-tricks.com/snippets/javascript/bind-different-events-to-click-and-double-click/
   MDN contributors (n.d.) Element: dblclick event, MDN Web Docs, accessed 19 October 2026.
     https://developer.mozilla.org/en-US/docs/Web/API/Element/dblclick_event
   MDN contributors (n.d.) Element: mousemove event, MDN Web Docs, accessed 19 October 2026.
     https://developer.mozilla.org/en-US/docs/Web/API/Element/mousemove_event
   MDN contributors (n.d.) Pointer events, MDN Web Docs, accessed 19 October 2026.
     https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
   MDN contributors (n.d.) Window: devicePixelRatio property, MDN Web Docs,
     accessed 19 October 2026.
     https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
   Mike (2012) GameDev math recipes: rotating one point around another point,
     GameFromScratch, accessed 19 October 2026.
     https://gamefromscratch.com/gamedev-math-recipes-rotating-one-point-around-another-point/
   Powell, K (n.d.) CSS reset [video], YouTube, accessed 19 October 2026.
     https://youtu.be/cCAtD_BAHNw
   Salaja, R (n.d.) 12 principles of animation, userinterface.wiki, accessed 19 October 2026.
     https://userinterface-wiki.vercel.app/12-principles-of-animation
   Image credits: see the comment at the bottom of index.html.
*/