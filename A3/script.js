const wall = document.getElementById('wall');
const preview = document.getElementById('preview');

const colors = ['#f6e7a1', '#f4c7a8', '#cfdcb6', '#ecc3c3', '#efe6d6'];
let colorIndex = 0;
let zCounter = 1;

function randomTilt() {
  return (Math.random() * 12 - 6).toFixed(1) + 'deg';
}

function preparePreview() {
  preview.style.setProperty('--note-color', colors[colorIndex]);
  preview.style.setProperty('--tilt', randomTilt());
}

document.addEventListener('mousemove', (e) => {
  preview.style.left = e.clientX + 'px';
  preview.style.top = e.clientY + 'px';
});

document.addEventListener('click', (e) => {
  const note = document.createElement('div');
  note.className = 'note';
  note.style.left = e.clientX + 'px';
  note.style.top = e.clientY + 'px';
  note.style.zIndex = zCounter++;
  note.style.setProperty('--note-color', colors[colorIndex]);
  note.style.setProperty('--tilt', preview.style.getPropertyValue('--tilt'));
  wall.appendChild(note);

  colorIndex = (colorIndex + 1) % colors.length;
  preparePreview();
});

preparePreview();
