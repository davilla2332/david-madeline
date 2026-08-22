import { APP_CONFIG, isSupabaseConfigured } from './config.js';
import { getCloudState, login, logout, listPhotos, uploadPhoto, updatePhoto, deletePhoto } from './supabase-gallery.js';
import { listChapters, createChapter, updateChapter, deleteChapter } from './supabase-story.js';
import { generateRomanticMessage } from './ai.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const toast = $('#toast');
let toastTimer = null;
let currentSession = null;
let chaptersCache = [];
const photosById = new Map();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// Reveal on scroll
const revealItems = $$('.reveal');
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.13 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

// Theme
const themeToggle = $('#themeToggle');
const savedTheme = localStorage.getItem('dm-theme');
if (savedTheme === 'dark') document.body.classList.add('dark');
updateThemeButton();

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('dm-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  updateThemeButton();
});

function updateThemeButton() {
  const dark = document.body.classList.contains('dark');
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', dark ? 'Usar tema claro' : 'Usar tema oscuro');
  themeToggle.querySelector('span').textContent = dark ? '☀' : '☾';
}

// Music
const audio = $('#loveAudio');
const musicToggle = $('#musicToggle');
musicToggle.addEventListener('click', async () => {
  try {
    if (audio.paused) {
      await audio.play();
      musicToggle.setAttribute('aria-pressed', 'true');
      musicToggle.setAttribute('aria-label', 'Pausar música');
    } else {
      audio.pause();
      musicToggle.setAttribute('aria-pressed', 'false');
      musicToggle.setAttribute('aria-label', 'Reproducir música');
    }
  } catch {
    showToast('El navegador bloqueó el audio. Intenta tocar el botón otra vez.');
  }
});

// Relationship counter
const startDate = new Date(APP_CONFIG.couple.startedTalking);
function updateCounter() {
  let diff = Date.now() - startDate.getTime();
  if (!Number.isFinite(diff) || diff < 0) diff = 0;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  $('#daysCount').textContent = String(days);
  $('#hoursCount').textContent = String(hours).padStart(2, '0');
  $('#minutesCount').textContent = String(minutes).padStart(2, '0');
  $('#secondsCount').textContent = String(seconds).padStart(2, '0');
}
updateCounter();
setInterval(updateCounter, 1000);

// Proposal interactions
const proposalStage = $('#proposalStage');
const noButton = $('#noButton');
const yesButton = $('#yesButton');
const proposalHint = $('#proposalHint');
let noMoves = 0;
const noMessages = [
  '¿Segura? 😳',
  'Creo que ese botón no quiere que lo presiones…',
  'Madeline, el botón está luchando por nuestra historia 😂',
  'Última oportunidad… bueno, quizá no 😌',
  'Ese “No” se está quedando sin escondites ❤️'
];

function moveNoButton() {
  const stageRect = proposalStage.getBoundingClientRect();
  const btnRect = noButton.getBoundingClientRect();
  const padding = 14;
  const maxX = Math.max(padding, stageRect.width - btnRect.width - padding);
  const maxY = Math.max(70, stageRect.height - btnRect.height - 58);
  const x = padding + Math.random() * Math.max(1, maxX - padding);
  const y = 55 + Math.random() * Math.max(1, maxY - 55);

  noButton.style.position = 'absolute';
  noButton.style.left = `${x}px`;
  noButton.style.top = `${y}px`;
  noMoves += 1;
  proposalHint.textContent = noMessages[Math.min(noMoves - 1, noMessages.length - 1)];

  if (noMoves >= 6) {
    noButton.textContent = 'Bueno… tal vez sí 🥹';
  }
}

noButton.addEventListener('pointerenter', (event) => {
  if (event.pointerType !== 'touch') moveNoButton();
});
noButton.addEventListener('click', (event) => {
  event.preventDefault();
  moveNoButton();
});

yesButton.addEventListener('click', () => {
  proposalHint.textContent = 'Sabía que este capítulo todavía tenía mucho por contar ❤️';
  launchHearts(120);
  openLetter();
});

// Dialog helpers
function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}
$$('[data-close-dialog]').forEach((item) => item.addEventListener('click', () => closeDialog(item.closest('dialog'))));
$$('dialog').forEach((dialog) => dialog.addEventListener('cancel', () => closeDialog(dialog)));

// Letter
const letterModal = $('#letterModal');
const letterWrap = $('.letter-wrap');
function openLetter() {
  if (!letterModal.open) letterModal.showModal();
  letterWrap.classList.remove('opened');
  setTimeout(() => letterWrap.classList.add('opened'), prefersReducedMotion ? 0 : 450);
}
$('#reopenLetterButton').addEventListener('click', openLetter);

// Random reasons
const extraReasons = [
  'Porque una simple notificación tuya puede cambiarme el ánimo.',
  'Porque contigo siempre queda una conversación pendiente que quiero continuar.',
  'Porque me gusta descubrir poco a poco las cosas que te hacen sonreír.',
  'Porque conocerte hizo que ciertas canciones empezaran a sonar diferente.',
  'Porque todavía me emociona recordar que el 16 de agosto por fin te vi frente a mí.',
  'Porque me gusta la idea de que esta página tenga que crecer con nosotros.',
  'Porque entre tantas personas, coincidimos tú y yo en el momento exacto.',
  'Porque quiero conocer todas esas versiones de ti que solo aparecen con el tiempo.'
];
let lastReason = -1;
$('#randomReasonButton').addEventListener('click', async () => {
  const target = $('#randomReasonText');
  if (currentSession) {
    const previous = target.textContent;
    target.textContent = 'Pensando en una razón nueva… ✨';
    try {
      target.textContent = await generateRomanticMessage({ type: 'reason', maxLength: 260 });
      return;
    } catch (error) {
      console.warn('IA razón:', error);
      target.textContent = previous;
      showToast('La IA no respondió; usaré una razón guardada.');
    }
  }
  let next = Math.floor(Math.random() * extraReasons.length);
  if (extraReasons.length > 1 && next === lastReason) next = (next + 1) % extraReasons.length;
  lastReason = next;
  target.textContent = extraReasons[next];
});

// Memory jar
const jarMessages = [
  'Si estás leyendo esto, aquí va un recordatorio: me alegra muchísimo haberte conocido.',
  'Hay recuerdos que todavía no existen y ya tengo ganas de vivirlos contigo.',
  'Tu nombre terminó apareciendo en pensamientos donde antes no había nadie.',
  'Espero que nunca dejemos de contarnos hasta las cosas pequeñas del día.',
  'Si hoy no fue tu mejor día, mañana sigue siendo otra oportunidad para sonreír.',
  'Me gusta que nuestro comienzo tenga fechas que ya puedo recordar de memoria.',
  'Ojalá algún día esta página se quede corta para todas las fotos que tengamos.',
  'No necesitas hacer nada extraordinario para ser especial para mí.',
  '12 de julio: una conversación. 16 de agosto: un recuerdo. Lo demás, lo escribimos nosotros.',
  'Si encontraste este mensaje al azar, tómalo como una señal: te mando un abrazo enorme.'
];
let jarIndex = -1;
$('#jarButton').addEventListener('click', async () => {
  let text = '';
  if (currentSession) {
    $('#jarMessage').innerHTML = '<p>Pensando en algo bonito para ti… ✨</p>';
    try {
      text = await generateRomanticMessage({ type: 'jar', maxLength: 340 });
    } catch (error) {
      console.warn('IA frasquito:', error);
    }
  }
  if (!text) {
    let next = Math.floor(Math.random() * jarMessages.length);
    if (jarMessages.length > 1 && next === jarIndex) next = (next + 1) % jarMessages.length;
    jarIndex = next;
    text = jarMessages[next];
  }
  $('#jarMessage').innerHTML = '';
  const p = document.createElement('p');
  p.textContent = text;
  $('#jarMessage').appendChild(p);
  if (!prefersReducedMotion) {
    $('#jarButton').animate([
      { transform: 'rotate(0deg)' }, { transform: 'rotate(-4deg)' },
      { transform: 'rotate(4deg)' }, { transform: 'rotate(0deg)' }
    ], { duration: 500, easing: 'ease' });
  }
});

// Open when messages
const messageModal = $('#messageModal');
let currentOpenWhenSituation = '';
$$('.mini-envelope').forEach((button) => {
  button.addEventListener('click', () => {
    currentOpenWhenSituation = button.dataset.situation || button.textContent.trim();
    $('#openWhenMessage').textContent = button.dataset.message;
    $('#aiOpenWhenNote').textContent = currentSession ? 'Puedes pedir un mensaje distinto cada vez.' : 'Inicia sesión para generar mensajes nuevos con IA.';
    messageModal.showModal();
  });
});

// Local future checklist
const futureChecks = $$('.future-list input[type="checkbox"]');
try {
  const saved = JSON.parse(localStorage.getItem('dm-future-checks') || '[]');
  futureChecks.forEach((check, index) => { check.checked = Boolean(saved[index]); });
} catch {}
futureChecks.forEach((check) => {
  check.addEventListener('change', () => {
    localStorage.setItem('dm-future-checks', JSON.stringify(futureChecks.map((item) => item.checked)));
  });
});

// Easter egg: 5 taps/clicks on brand mark
let brandTaps = 0;
let brandTapTimer = null;
$('.brand-mark').addEventListener('click', (event) => {
  event.preventDefault();
  brandTaps += 1;
  clearTimeout(brandTapTimer);
  brandTapTimer = setTimeout(() => { brandTaps = 0; }, 2200);
  if (brandTaps >= 5) {
    brandTaps = 0;
    launchHearts(70);
    showToast('Secreto encontrado: David ❤️ Madeline');
  }
});

// Hearts canvas
const canvas = $('#heartsCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let rafId = null;
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas, { passive: true });

function launchHearts(count = 80) {
  if (prefersReducedMotion) return;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: innerWidth / 2 + (Math.random() - .5) * Math.min(innerWidth * .35, 260),
      y: innerHeight * .68 + Math.random() * 50,
      vx: (Math.random() - .5) * 3.7,
      vy: -2.2 - Math.random() * 4.5,
      size: 8 + Math.random() * 16,
      life: 1,
      decay: .007 + Math.random() * .009,
      rotate: (Math.random() - .5) * .4
    });
  }
  if (!rafId) rafId = requestAnimationFrame(animateHearts);
}

function animateHearts() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += .025;
    p.life -= p.decay;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotate);
    ctx.font = `${p.size}px Georgia`;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a94f6d';
    ctx.fillText('♥', 0, 0);
    ctx.restore();
  });
  if (particles.length) rafId = requestAnimationFrame(animateHearts);
  else {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    rafId = null;
  }
}

// Cloud gallery + online administration
const uploadModal = $('#uploadModal');
const uploadUnavailable = $('#uploadUnavailable');
const authPanel = $('#authPanel');
const uploadPanel = $('#uploadPanel');
const cloudStatus = $('#cloudStatus');
const openUploadButton = $('#openUploadButton');
const loginForm = $('#loginForm');
const photoUploadForm = $('#photoUploadForm');
const photoInput = $('#photoInput');
const uploadPreview = $('#uploadPreview');
let previewUrl = null;
let editPreviewUrl = null;

function applyAdminState() {
  const loggedIn = Boolean(currentSession);
  $$('.photo-edit-button').forEach((button) => { button.hidden = !loggedIn; });
  $$('.chapter-admin-actions').forEach((actions) => { actions.hidden = !loggedIn; });
  $('#chapterStatus').textContent = loggedIn
    ? 'Modo edición activo · puedes agregar, editar o eliminar capítulos.'
    : 'Los capítulos son públicos; inicia sesión desde “Subir una foto” para administrarlos.';
  $('#aiLetterNote').textContent = loggedIn
    ? 'IA activa: puedes generar una versión distinta.'
    : 'La IA requiere que hayas iniciado sesión.';
}

openUploadButton.addEventListener('click', async () => {
  uploadModal.showModal();
  await refreshCloudUI();
});

async function refreshCloudUI() {
  if (!isSupabaseConfigured()) {
    currentSession = null;
    uploadUnavailable.hidden = false;
    authPanel.hidden = true;
    uploadPanel.hidden = true;
    cloudStatus.classList.remove('online');
    cloudStatus.lastChild.textContent = 'Galería local activa';
    applyAdminState();
    return;
  }

  try {
    const state = await getCloudState();
    currentSession = state.session;
    uploadUnavailable.hidden = true;
    authPanel.hidden = Boolean(state.session);
    uploadPanel.hidden = !state.session;
    cloudStatus.classList.add('online');
    cloudStatus.lastChild.textContent = state.session ? 'Galería online · edición activa' : 'Galería online conectada';
    applyAdminState();
    renderChapters();
  } catch (error) {
    currentSession = null;
    uploadUnavailable.hidden = false;
    authPanel.hidden = true;
    uploadPanel.hidden = true;
    uploadUnavailable.querySelector('h2').textContent = 'No se pudo conectar con la galería';
    uploadUnavailable.querySelector('p').textContent = error.message || 'Revisa la configuración de Supabase.';
    applyAdminState();
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#loginMessage');
  message.textContent = 'Entrando…';
  try {
    await login($('#loginEmail').value.trim(), $('#loginPassword').value);
    message.textContent = '';
    loginForm.reset();
    await refreshCloudUI();
    showToast('Acceso correcto ❤️ Edición e IA activadas.');
  } catch (error) {
    message.textContent = error.message || 'No se pudo iniciar sesión.';
  }
});

$('#logoutButton').addEventListener('click', async () => {
  try {
    await logout();
    await refreshCloudUI();
    showToast('Sesión cerrada.');
  } catch (error) {
    showToast(error.message || 'No se pudo cerrar la sesión.');
  }
});

photoInput.addEventListener('change', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  uploadPreview.innerHTML = '';
  const file = photoInput.files?.[0];
  if (!file) {
    uploadPreview.textContent = 'Selecciona una imagen';
    return;
  }
  previewUrl = URL.createObjectURL(file);
  const img = document.createElement('img');
  img.src = previewUrl;
  img.alt = 'Vista previa de la foto seleccionada';
  uploadPreview.appendChild(img);
});

function validateImageFile(file) {
  if (!file) return null;
  if (!APP_CONFIG.upload.allowedTypes.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.';
  const maxBytes = APP_CONFIG.upload.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) return `La imagen supera ${APP_CONFIG.upload.maxFileSizeMB} MB.`;
  return null;
}

photoUploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#uploadMessage');
  const submitButton = $('#uploadSubmitButton');
  const file = photoInput.files?.[0];
  if (!file) return;
  const validation = validateImageFile(file);
  if (validation) { message.textContent = validation; return; }

  submitButton.disabled = true;
  message.textContent = 'Guardando este recuerdo en la nube…';
  try {
    const photo = await uploadPhoto({
      file,
      title: $('#photoTitle').value,
      caption: $('#photoCaption').value
    });
    addCloudPhotoCard(photo, true);
    photoUploadForm.reset();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    uploadPreview.textContent = 'Selecciona una imagen';
    message.textContent = 'Foto guardada ❤️';
    launchHearts(45);
    showToast('Nuevo recuerdo agregado al álbum.');
  } catch (error) {
    message.textContent = error.message || 'No se pudo subir la foto.';
  } finally {
    submitButton.disabled = false;
  }
});

function addCloudPhotoCard(photo, prepend = false) {
  photosById.set(photo.id, photo);
  const existing = document.querySelector(`.cloud-photo-card[data-photo-id="${photo.id}"]`);
  if (existing) existing.remove();

  const figure = document.createElement('figure');
  figure.className = 'photo-card cloud-photo-card visible';
  figure.dataset.photoId = photo.id;
  const img = document.createElement('img');
  img.src = photo.public_url;
  img.alt = photo.title || 'Recuerdo de David y Madeline';
  img.loading = 'lazy';
  const caption = document.createElement('figcaption');
  const strong = document.createElement('strong');
  strong.textContent = photo.title || 'Un recuerdo';
  const span = document.createElement('span');
  span.textContent = photo.caption || 'Guardado en nuestro álbum online.';
  caption.append(strong, span);

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'photo-edit-button';
  editButton.textContent = 'Editar ✎';
  editButton.hidden = !currentSession;
  editButton.addEventListener('click', () => openPhotoEditor(photo.id));

  figure.append(img, caption, editButton);
  const grid = $('#photoGrid');
  if (prepend) grid.prepend(figure);
  else grid.append(figure);
}

async function loadCloudPhotos() {
  if (!isSupabaseConfigured()) return;
  try {
    const photos = await listPhotos();
    photosById.clear();
    $$('.cloud-photo-card').forEach((card) => card.remove());
    photos.forEach((photo) => addCloudPhotoCard(photo));
    cloudStatus.classList.add('online');
    cloudStatus.lastChild.textContent = 'Galería online conectada';
    $('#emptyCloudGallery').hidden = photos.length !== 0;
  } catch (error) {
    console.warn('Galería online:', error);
    cloudStatus.classList.remove('online');
    cloudStatus.lastChild.textContent = 'No se pudo cargar la nube';
  }
}

// Photo editor
const editPhotoModal = $('#editPhotoModal');
const editPhotoFile = $('#editPhotoFile');
function openPhotoEditor(id) {
  const photo = photosById.get(id);
  if (!photo || !currentSession) return;
  $('#editPhotoId').value = photo.id;
  $('#editPhotoStoragePath').value = photo.storage_path || '';
  $('#editPhotoTitle').value = photo.title || '';
  $('#editPhotoCaption').value = photo.caption || '';
  $('#editPhotoMessage').textContent = '';
  editPhotoFile.value = '';
  $('#editPhotoPreview').innerHTML = `<img src="${photo.public_url}" alt="Vista previa">`;
  editPhotoModal.showModal();
}

editPhotoFile.addEventListener('change', () => {
  const file = editPhotoFile.files?.[0];
  if (!file) return;
  const validation = validateImageFile(file);
  if (validation) { $('#editPhotoMessage').textContent = validation; return; }
  if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl);
  editPreviewUrl = URL.createObjectURL(file);
  $('#editPhotoPreview').innerHTML = `<img src="${editPreviewUrl}" alt="Nueva vista previa">`;
});

$('#photoEditForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#savePhotoEditButton');
  const message = $('#editPhotoMessage');
  const replacementFile = editPhotoFile.files?.[0] || null;
  const validation = validateImageFile(replacementFile);
  if (validation) { message.textContent = validation; return; }
  button.disabled = true;
  message.textContent = 'Guardando cambios…';
  try {
    const photo = await updatePhoto({
      id: $('#editPhotoId').value,
      oldStoragePath: $('#editPhotoStoragePath').value,
      title: $('#editPhotoTitle').value,
      caption: $('#editPhotoCaption').value,
      replacementFile
    });
    addCloudPhotoCard(photo, true);
    closeDialog(editPhotoModal);
    showToast('Foto actualizada ❤️');
  } catch (error) {
    message.textContent = error.message || 'No se pudo editar la foto.';
  } finally {
    button.disabled = false;
  }
});

$('#deletePhotoButton').addEventListener('click', async () => {
  const id = $('#editPhotoId').value;
  const photo = photosById.get(id);
  if (!photo || !confirm('¿Quieres eliminar esta foto del álbum? Esta acción no se puede deshacer.')) return;
  const message = $('#editPhotoMessage');
  message.textContent = 'Eliminando…';
  try {
    await deletePhoto({ id, storagePath: photo.storage_path });
    photosById.delete(id);
    document.querySelector(`.cloud-photo-card[data-photo-id="${id}"]`)?.remove();
    closeDialog(editPhotoModal);
    showToast('Foto eliminada del álbum.');
  } catch (error) {
    message.textContent = error.message || 'No se pudo eliminar la foto.';
  }
});

// Chapters
const chapterModal = $('#chapterModal');
function formatChapterDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function renderChapters() {
  const grid = $('#chapterGrid');
  grid.innerHTML = '';
  $('#emptyChapters').hidden = chaptersCache.length > 0;
  chaptersCache.forEach((chapter, index) => {
    const card = document.createElement('article');
    card.className = 'chapter-card visible';
    card.dataset.chapterId = chapter.id;
    const meta = document.createElement('div');
    meta.className = 'chapter-meta';
    meta.innerHTML = `<span class="chapter-emoji">${chapter.emoji || '❤'}</span><span>Capítulo ${String(index + 2).padStart(2, '0')} · ${formatChapterDate(chapter.story_date)}</span>`;
    const title = document.createElement('h3');
    title.textContent = chapter.title;
    const body = document.createElement('p');
    body.textContent = chapter.body;
    const actions = document.createElement('div');
    actions.className = 'chapter-admin-actions';
    actions.hidden = !currentSession;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'text-button';
    edit.textContent = 'Editar capítulo';
    edit.addEventListener('click', () => openChapterEditor(chapter.id));
    actions.appendChild(edit);
    card.append(meta, title, body, actions);
    grid.appendChild(card);
  });
}

async function loadChapters() {
  if (!isSupabaseConfigured()) return;
  try {
    chaptersCache = await listChapters();
    renderChapters();
  } catch (error) {
    console.warn('Capítulos:', error);
    $('#chapterStatus').textContent = 'No se pudieron cargar los capítulos online.';
  }
}

function openChapterEditor(id = null) {
  if (!currentSession) {
    uploadModal.showModal();
    refreshCloudUI();
    showToast('Inicia sesión para agregar capítulos.');
    return;
  }
  const chapter = id ? chaptersCache.find((item) => item.id === id) : null;
  $('#chapterId').value = chapter?.id || '';
  $('#chapterDate').value = chapter?.story_date || new Date().toISOString().slice(0, 10);
  $('#chapterEmoji').value = chapter?.emoji || '❤';
  $('#chapterTitle').value = chapter?.title || '';
  $('#chapterBody').value = chapter?.body || '';
  $('#chapterModalTitle').textContent = chapter ? 'Editar capítulo' : 'Agregar capítulo';
  $('#deleteChapterButton').hidden = !chapter;
  $('#chapterMessage').textContent = '';
  chapterModal.showModal();
}

$('#addChapterButton').addEventListener('click', () => openChapterEditor());

$('#chapterForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = $('#chapterId').value;
  const button = $('#saveChapterButton');
  const message = $('#chapterMessage');
  const payload = {
    title: $('#chapterTitle').value,
    storyDate: $('#chapterDate').value,
    body: $('#chapterBody').value,
    emoji: $('#chapterEmoji').value
  };
  button.disabled = true;
  message.textContent = 'Guardando capítulo…';
  try {
    if (id) await updateChapter({ id, ...payload });
    else await createChapter(payload);
    chaptersCache = await listChapters();
    renderChapters();
    closeDialog(chapterModal);
    launchHearts(35);
    showToast(id ? 'Capítulo actualizado ❤️' : 'Nuevo capítulo agregado ❤️');
  } catch (error) {
    message.textContent = error.message || 'No se pudo guardar el capítulo.';
  } finally {
    button.disabled = false;
  }
});

$('#deleteChapterButton').addEventListener('click', async () => {
  const id = $('#chapterId').value;
  if (!id || !confirm('¿Quieres eliminar este capítulo?')) return;
  const message = $('#chapterMessage');
  message.textContent = 'Eliminando capítulo…';
  try {
    await deleteChapter(id);
    chaptersCache = chaptersCache.filter((item) => item.id !== id);
    renderChapters();
    closeDialog(chapterModal);
    showToast('Capítulo eliminado.');
  } catch (error) {
    message.textContent = error.message || 'No se pudo eliminar el capítulo.';
  }
});

// AI helpers
$('#aiChapterButton').addEventListener('click', async () => {
  const message = $('#chapterMessage');
  const notes = $('#chapterBody').value.trim();
  const context = `Título: ${$('#chapterTitle').value || 'sin título'}. Fecha: ${$('#chapterDate').value || 'sin fecha'}. Notas: ${notes || 'Escribe un recuerdo romántico breve para este capítulo.'}`;
  message.textContent = 'La IA está ayudando a escribir este capítulo… ✨';
  try {
    $('#chapterBody').value = await generateRomanticMessage({ type: 'chapter', context, maxLength: 1200 });
    message.textContent = 'Texto generado. Puedes editarlo antes de guardar.';
  } catch (error) {
    message.textContent = error.message || 'No se pudo usar la IA.';
  }
});

$('#aiOpenWhenButton').addEventListener('click', async () => {
  const note = $('#aiOpenWhenNote');
  if (!currentSession) {
    note.textContent = 'Inicia sesión desde la galería para activar la IA.';
    return;
  }
  note.textContent = 'Creando un mensaje nuevo… ✨';
  try {
    $('#openWhenMessage').textContent = await generateRomanticMessage({ type: 'open_when', context: currentOpenWhenSituation, maxLength: 600 });
    note.textContent = 'Mensaje nuevo generado con IA.';
  } catch (error) {
    note.textContent = error.message || 'No se pudo generar otro mensaje.';
  }
});

$('#aiLetterButton').addEventListener('click', async () => {
  const note = $('#aiLetterNote');
  if (!currentSession) {
    note.textContent = 'Inicia sesión desde la galería para activar la IA.';
    return;
  }
  note.textContent = 'Escribiendo una nueva carta… ✨';
  try {
    const text = await generateRomanticMessage({ type: 'letter', maxLength: 1500 });
    let result = $('#aiLetterResult');
    if (!result) {
      result = document.createElement('p');
      result.id = 'aiLetterResult';
      result.className = 'ai-letter-result';
      $('#aiLetterButton').before(result);
    }
    result.textContent = text;
    note.textContent = 'Nueva carta generada. Cada vez puede ser diferente.';
  } catch (error) {
    note.textContent = error.message || 'No se pudo crear la carta.';
  }
});

await refreshCloudUI();
await Promise.all([loadCloudPhotos(), loadChapters()]);
applyAdminState();
