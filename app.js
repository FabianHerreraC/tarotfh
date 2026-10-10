// Tarot FH — barajador, mesa libre y frases.
// Estado en memoria; nada se guarda entre sesiones.

(() => {
  'use strict';

  const P = PI_DECIMALES;
  const ROMANOS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
    'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII'];

  const $ = (s) => document.querySelector(s);
  const mesa = $('#mesa');
  const mazo = $('#mazo');
  const pila = $('#mazo-pila');
  const cuenta = $('#mazo-cuenta');
  const cotas = $('#cotas');
  const rastro = $('#rastro');
  const capas = [...document.querySelectorAll('.haiku-capa')];
  const aviso = $('#aviso');
  const reinicio = $('#reinicio');

  const mqMovil = matchMedia('(max-width: 767px)');
  const mqQuieto = matchMedia('(prefers-reduced-motion: reduce)');

  const MEZCLA_MS = 1000;
  const ENTREGA_MS = 360;
  const RECOGER_MS = 600;
  const ESCALA_MAZO_MOVIL = 0.42;
  const SUAVE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

  let arcanos = [];
  let anversos = [];
  const estado = {
    restantes: [],
    extraidas: 0,
    mesa: [],
    haikuVisible: null,
    opciones: { invertidas: false, frase: true, rastro: true, sonido: false },
  };

  let modo = mqMovil.matches ? 'movil' : 'mesa';
  let ocupado = false;
  let zTope = 10;
  const geo = { W: 0, H: 0, cw: 0, ch: 0, mazo: { x: 0, y: 0, s: 1 }, casilla: { x: 0, y: 0 }, descarte: { x: 0, y: 0 } };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const transformDe = (x, y, rot = 0, s = 1) =>
    `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot}deg) scale(${s})`;

  // ——— Dibujo: reverso con π y anversos de lámina técnica ———

  const ATR = 'fill="none" stroke="currentColor" vector-effect="non-scaling-stroke"';

  function construirReverso() {
    const cx = 35, cy = 60, R = 26;
    const partes = [];
    partes.push(`<rect x="5" y="5" width="60" height="110" rx="3" ${ATR} stroke-dasharray="2 2" opacity=".55"/>`);
    partes.push(`<circle cx="${cx}" cy="${cy}" r="${R}" ${ATR}/>`);
    // Surcos: los dígitos impares de π a partir del 21.º trazan un surco
    for (let i = 0; i < 9; i++) {
      if (Number(P[20 + i]) % 2) partes.push(`<circle cx="${cx}" cy="${cy}" r="${(11 + i * 1.6).toFixed(1)}" ${ATR} opacity=".45"/>`);
    }
    partes.push(`<circle cx="${cx}" cy="${cy}" r="8" ${ATR}/>`);
    partes.push(`<circle cx="${cx}" cy="${cy}" r="1.2" ${ATR}/>`);
    // Marcas radiales: longitud = dígito de π, repetidas a 180° (simetría central)
    const N = 20;
    for (let j = 0; j < N; j++) {
      const largo = 1 + Number(P[j]) * 0.55;
      for (const giro of [0, Math.PI]) {
        const a = (j / N) * Math.PI + giro - Math.PI / 2;
        const x1 = cx + Math.cos(a) * (R + 1.5), y1 = cy + Math.sin(a) * (R + 1.5);
        const x2 = cx + Math.cos(a) * (R + 1.5 + largo), y2 = cy + Math.sin(a) * (R + 1.5 + largo);
        partes.push(`<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}" ${ATR}/>`);
      }
    }
    // Diagonales de esquina, como el empaque de la lámina de referencia
    for (const [ex, ey] of [[65, 5], [5, 115]]) {
      const dx = ex - cx, dy = ey - cy, d = Math.hypot(dx, dy);
      const px = cx + (dx / d) * (R + 8), py = cy + (dy / d) * (R + 8);
      partes.push(`<path d="M${ex} ${ey}L${px.toFixed(2)} ${py.toFixed(2)}" ${ATR}/>`);
    }
    $('#reverso').innerHTML = partes.join('');
  }

  // Glifos de cada arcano, en coordenadas centradas (±17)
  const GLIFOS = [
    /* 0  Loco */ '<path d="M-17 9H4V18"/><circle cx="0" cy="-6" r="5"/><path d="M4 -2L12 6"/>',
    /* I  Mago */ '<path d="M0 -8C4 -3 12 -3 12 -8C12 -13 4 -13 0 -8C-4 -3 -12 -3 -12 -8C-12 -13 -4 -13 0 -8Z"/><path d="M-15 6H15M-12 6V16M12 6V16M0 -1V6"/>',
    /* II Papisa */ '<rect x="-15" y="-16" width="5" height="32"/><rect x="10" y="-16" width="5" height="32"/><path d="M-5 -5H5V10H-5ZM0 -5V10"/><circle cx="0" cy="-11" r="2"/>',
    /* III Emperatriz */ '<path d="M0 17V-15M-6 -9L0 -4L6 -9M-6 -2L0 3L6 -2M-6 5L0 10L6 5M-14 17H14"/>',
    /* IV Emperador */ '<rect x="-12" y="-1" width="24" height="17"/><path d="M-6 -1V-15M-9 -11H-3"/><circle cx="6" cy="-7" r="4"/><path d="M6 -11V-15"/>',
    /* V Papa */ '<path d="M-10 10L10 -10M-10 -10L10 10M8 -12L12 -8M-8 -12L-12 -8"/><circle cx="-12" cy="12" r="3"/><circle cx="12" cy="12" r="3"/>',
    /* VI Enamorados */ '<circle cx="-11" cy="10" r="5"/><circle cx="11" cy="10" r="5"/><path d="M-6 15L0 -10L6 15M0 -10C-3 -13 -1 -16 0 -18C1 -16 3 -13 0 -10"/>',
    /* VII Carro */ '<rect x="-12" y="-11" width="24" height="15"/><path d="M-15 -11H15"/><circle cx="-8" cy="10" r="5"/><circle cx="8" cy="10" r="5"/>',
    /* VIII Fuerza */ '<circle cx="0" cy="5" r="8"/><path d="M0 -12C3 -9 8 -9 8 -12C8 -15 3 -15 0 -12C-3 -9 -8 -9 -8 -12C-8 -15 -3 -15 0 -12Z"/><path d="M-11 5H-14M11 5H14M0 16V19M-8 13L-10 15M8 13L10 15M-8 -3L-10 -5M8 -3L10 -5"/>',
    /* IX Ermitaño */ '<path d="M8 -11V17M-17 17H17"/><path d="M-4 -15L-1.6 -8.3L-9 -12.4H1L-6.4 -8.3Z"/>',
    /* X Rueda */ '<circle cx="0" cy="0" r="14"/><circle cx="0" cy="0" r="3"/><path d="M0 -14V-3M0 3V14M-14 0H-3M3 0H14M-9.9 -9.9L-2.1 -2.1M2.1 2.1L9.9 9.9M9.9 -9.9L2.1 -2.1M-2.1 2.1L-9.9 9.9"/>',
    /* XI Justicia */ '<path d="M0 -16V16M-14 -8H14M-14 -8L-18 2H-10ZM14 -8L10 2H18ZM-4 16H4"/>',
    /* XII Colgado */ '<path d="M-14 -16H14M0 -16V-6M0 -6V7M0 -6L-6 -1M0 -1L6 -6"/><circle cx="0" cy="11" r="4"/>',
    /* XIII Muerte */ '<path d="M-10 16L8 -14M8 -14C0 -18 -12 -14 -16 -6"/><path d="M5 16L7 11L10 14L13 11L15 16Z"/>',
    /* XIV Templanza */ '<path d="M-16 -15H-6L-8 -5H-14ZM6 4H16L14 14H8ZM-9 -5C-4 0 2 -2 9 4"/>',
    /* XV Diablo */ '<path d="M-12 -14H12L0 6ZM-4 0L-7 9M4 0L7 9"/><circle cx="-7" cy="12" r="3"/><circle cx="7" cy="12" r="3"/>',
    /* XVI Torre */ '<path d="M-7 17V-6H7V17M-5 -9L-7 -14L-3 -12L0 -16L3 -12L7 -14L5 -9M16 -17L7 -9L11 -8L2 0"/>',
    /* XVII Estrella */ '<path d="M0 -17L2 -9L8 -12L5 -6L13 -4L5 -2L8 4L2 1L0 9L-2 1L-8 4L-5 -2L-13 -4L-5 -6L-8 -12L-2 -9Z"/><path d="M-15 14Q-11.25 11 -7.5 14T0 14T7.5 14T15 14"/>',
    /* XVIII Luna */ '<path d="M4 -15.2A10 10 0 1 0 4 3.2A12 12 0 0 1 4 -15.2Z"/><path d="M-15 17V8H-11V17M11 17V8H15V17"/>',
    /* XIX Sol */ '<circle cx="0" cy="0" r="7"/><path d="M0 -10V-15M0 10V15M-10 0H-15M10 0H15M7.1 -7.1L10.6 -10.6M-7.1 7.1L-10.6 10.6M7.1 7.1L10.6 10.6M-7.1 -7.1L-10.6 -10.6M3.8 -9.2L5.7 -13.9M-3.8 9.2L-5.7 13.9M9.2 3.8L13.9 5.7M-9.2 -3.8L-13.9 -5.7M-3.8 -9.2L-5.7 -13.9M3.8 9.2L5.7 13.9M-9.2 3.8L-13.9 5.7M9.2 -3.8L13.9 -5.7"/>',
    /* XX Juicio */ '<path d="M-14 -10L4 -16V-4ZM-14 -10H-17M-15 16H15M-8 16V8M0 16V6M8 16V8"/><circle cx="-8" cy="5" r="2"/><circle cx="0" cy="3" r="2"/><circle cx="8" cy="5" r="2"/>',
    /* XXI Mundo */ '<ellipse cx="0" cy="0" rx="11" ry="16"/><circle cx="0" cy="-8" r="2"/><path d="M0 -6V5M-4 -2H4M0 5L-3 10M0 5L3 10"/><circle cx="-15" cy="-15" r="1.4"/><circle cx="15" cy="-15" r="1.4"/><circle cx="-15" cy="15" r="1.4"/><circle cx="15" cy="15" r="1.4"/>',
  ];

  function construirAnverso(a) {
    const nombre = a.nombre.toUpperCase();
    const fs = Math.min(4.4, 54 / (0.72 * nombre.length));
    const glifo = GLIFOS[a.id].replace(/<(path|rect|circle|ellipse)/g, `<$1 ${ATR}`);
    return `<svg viewBox="0 0 70 120" aria-hidden="true">
      <rect x="4" y="4" width="62" height="112" rx="3" ${ATR} stroke-dasharray="2 2" opacity=".5"/>
      <text x="35" y="16.5" text-anchor="middle" font-size="6.2" fill="currentColor">[${a.numero}]</text>
      <path d="M12 22H58M12 20.5V23.5M58 20.5V23.5" ${ATR} opacity=".5"/>
      <circle cx="35" cy="59" r="23" ${ATR} opacity=".3"/>
      <path d="M35 33V36M35 82V85M9 59H12M58 59H61" ${ATR} opacity=".5"/>
      <g transform="translate(35 59)">${glifo}</g>
      <path d="M12 95H58M12 93.5V96.5M58 93.5V96.5" ${ATR} opacity=".5"/>
      <text x="35" y="105" text-anchor="middle" font-size="${fs.toFixed(2)}" letter-spacing="${(fs * 0.12).toFixed(2)}" fill="currentColor">${nombre}</text>
    </svg>`;
  }

  const LAMINA = '<svg viewBox="0 0 70 120" aria-hidden="true"><use href="#reverso"/></svg>';

  // ——— Geometría ———

  function calcular() {
    geo.W = mesa.clientWidth;
    geo.H = mesa.clientHeight;
    const { W, H } = geo;
    if (modo === 'mesa') {
      geo.cw = clamp(Math.round(W * 0.072), 92, 124);
    } else {
      geo.cw = Math.round(Math.min(H * 0.4, W * 0.5 * 12 / 7) * 7 / 12);
    }
    geo.ch = geo.cw * 12 / 7;
    document.documentElement.style.setProperty('--cw', geo.cw + 'px');

    if (modo === 'mesa') {
      geo.mazo = { x: 80, y: 76, s: 1 };
      geo.casilla = { x: 80 + geo.cw + 56, y: 76 };
    } else {
      const { cw, ch } = geo;
      const arriba = estado.extraidas > 0;
      if (arriba) {
        const s = ESCALA_MAZO_MOVIL;
        const cx = W / 2 - cw * 0.34, visTop = 24;
        geo.mazo = { x: cx - cw / 2, y: visTop - ch * (1 - s) / 2, s };
        geo.descarte = { x: W / 2 + cw * 0.34 - cw / 2, y: geo.mazo.y };
      } else {
        geo.mazo = { x: W / 2 - cw / 2, y: H / 2 - ch / 2 - 24, s: 1 };
        geo.descarte = { x: W / 2 + cw * 0.34 - cw / 2, y: 24 - ch * (1 - ESCALA_MAZO_MOVIL) / 2 };
      }
      const bajoMazoChico = 24 + ch * ESCALA_MAZO_MOVIL;
      geo.casilla = { x: W / 2 - cw / 2, y: Math.max(bajoMazoChico + 34, (H - ch) / 2 - 30) };
      document.body.style.setProperty('--haiku-top', geo.casilla.y + ch + 22 + 'px');
    }
  }

  function colocarMazo() {
    const { x, y, s } = geo.mazo;
    mazo.style.transform = transformDe(x, y, 0, s);
    const n = estado.restantes.length;
    const visBottom = y + geo.ch / 2 + (geo.ch * s) / 2;
    if (modo === 'mesa') {
      cuenta.style.transform = `translate(${x}px, ${visBottom + 14}px)`;
      cuenta.textContent = n ? `${ROMANOS[n]} · MAZO` : 'MAZO VACÍO';
    } else {
      cuenta.style.transform = `translate(${x + geo.cw / 2}px, ${visBottom + 8}px) translateX(-50%)`;
      cuenta.textContent = n ? ROMANOS[n] : '—';
    }
    mazo.classList.toggle('vacio', n === 0);
    mazo.setAttribute('aria-label', n
      ? `Mazo con ${n} cartas: tocar para barajar y sacar una carta`
      : 'Mazo vacío: usa el botón de reinicio');
  }

  function renderPila() {
    const n = estado.restantes.length;
    let html = '';
    for (let j = 0; j < n; j++) {
      html += `<div class="lamina" style="transform:${baseLamina(j)}">${LAMINA}</div>`;
    }
    pila.innerHTML = html;
  }

  const baseLamina = (j) => `translate(${(-j * 0.35).toFixed(2)}px, ${(-j * 0.35).toFixed(2)}px)`;

  function dibujarCotas() {
    if (modo !== 'mesa') { cotas.innerHTML = ''; return; }
    const { W, H, cw, ch } = geo;
    const d = geo.mazo, c = geo.casilla;
    const L = (x1, y1, x2, y2, extra = '') =>
      `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="currentColor" ${extra}/>`;
    const F = 'marker-start="url(#fl)" marker-end="url(#fl)"';
    const T = (x, y, s, rot = 0, cls = '') =>
      `<text x="${x}" y="${y}" text-anchor="middle" ${cls ? `class="${cls}"` : ''} ${rot ? `transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`;

    const y1 = d.y - 22, y3 = d.y - 46, xL = d.x - 24, xR = W - 32;
    const fin = Math.max(H * 0.5, H - 170);
    const partes = [
      `<defs><marker id="fl" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 2L10 5L0 8Z" fill="currentColor"/></marker></defs>`,
      // [01] ancho y alto del mazo
      L(d.x, d.y - 6, d.x, y1 - 6), L(d.x + cw, d.y - 6, d.x + cw, y1 - 6),
      L(d.x + 1, y1, d.x + cw - 1, y1, F), T(d.x + cw / 2, y1 - 7, '[01]'),
      L(d.x - 6, d.y, xL - 8, d.y), L(d.x - 6, d.y + ch, xL - 8, d.y + ch),
      L(xL, d.y + 1, xL, d.y + ch - 1, F), T(xL - 8, d.y + ch / 2, '[01]', -90),
      // [02] casilla de entrega
      `<rect x="${c.x}" y="${c.y}" width="${cw}" height="${ch}" rx="8" fill="none" stroke="currentColor" stroke-dasharray="3 3"/>`,
      T(c.x + cw / 2, c.y + ch / 2 + 4, '[02]'),
      T(c.x + cw / 2, c.y + ch / 2 + 20, 'ENTREGA', 0, 'tenue'),
      // [03] la mesa
      L(d.x, d.y - 6 - 22, d.x, y3 - 6), L(xR, y3 - 6, xR, y3 + 6),
      L(d.x + 1, y3, xR - 1, y3, F), T((c.x + cw + xR) / 2, y3 - 7, '[03]'),
      L(xR - 6, y3, xR + 6, y3),
      L(xR, y3 + 1, xR, fin, 'marker-end="url(#fl)"'), T(xR + 14, (y3 + fin) / 2, '[03]', 90),
      T((c.x + cw + xR) / 2, y3 + 16, 'CONTINENTE', 0, 'tenue'),
    ];
    cotas.innerHTML = partes.join('');
  }

  // ——— Cartas ———

  function aplicar(c) {
    c.el.style.transform = transformDe(c.x * geo.W, c.y * geo.H, c.rot, c.s);
    c.el.style.zIndex = c.z;
  }

  function alFrente(c) {
    if (zTope > 3000) {
      estado.mesa.slice().sort((a, b) => a.z - b.z).forEach((o, i) => { o.z = 10 + i; o.el.style.zIndex = o.z; });
      zTope = 10 + estado.mesa.length;
    }
    c.z = ++zTope;
    c.el.style.zIndex = c.z;
  }

  function etiqueta(c) {
    const a = arcanos[c.carta];
    return c.volteada
      ? `${a.numero} · ${a.nombre}${c.invertida ? ', invertida' : ''}. Tocar para leer su frase`
      : 'Carta boca abajo. Tocar para voltear';
  }

  function crearCarta(c) {
    const el = document.createElement('div');
    el.className = 'carta' + (c.invertida ? ' invertida' : '');
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.innerHTML = `<div class="carta-cuerpo"><div class="carta-giro">
      <div class="cara reverso">${LAMINA}</div>
      <div class="cara anverso">${anversos[c.carta]}<img class="ilustracion" src="${arcanos[c.carta].imagen}" alt="" draggable="false" decoding="async"></div>
    </div></div>`;
    c.el = el;
    el.setAttribute('aria-label', etiqueta(c));
    el.addEventListener('pointerdown', (e) => agarrar(e, c));
    el.addEventListener('keydown', (e) => teclaCarta(e, c));
    // Si la ilustración no carga, queda el dibujo de línea que hay debajo
    el.querySelector('.ilustracion').addEventListener('error', (e) => e.target.remove());
    return el;
  }

  function agarrar(e, c) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (c.quieta) return;
    e.preventDefault();
    e.stopPropagation();
    const el = c.el;
    el.setPointerCapture(e.pointerId);
    alFrente(c);

    const p0 = { x: e.clientX, y: e.clientY };
    let agarre = { dx: e.clientX - c.x * geo.W, dy: e.clientY - c.y * geo.H };
    let arrastre = false;
    let ancla = null;

    const mover = (ev) => {
      if (!arrastre) {
        if (Math.hypot(ev.clientX - p0.x, ev.clientY - p0.y) < 5 || modo !== 'mesa') return;
        arrastre = true;
        el.classList.add('arrastrando');
      }
      if (ev.shiftKey) {
        // Shift: la carta gira en pasos de 15° con el movimiento horizontal
        if (!ancla) ancla = { x: ev.clientX, rot: c.rot };
        c.rot = ancla.rot + 15 * Math.round((ev.clientX - ancla.x) / 24);
      } else {
        if (ancla) {
          ancla = null;
          agarre = { dx: ev.clientX - c.x * geo.W, dy: ev.clientY - c.y * geo.H };
        }
        c.x = clamp(ev.clientX - agarre.dx, 0, geo.W - geo.cw) / geo.W;
        c.y = clamp(ev.clientY - agarre.dy, 0, geo.H - geo.ch) / geo.H;
      }
      aplicar(c);
    };
    const soltar = (ev) => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      if (arrastre) el.classList.remove('arrastrando');
      else if (ev.type === 'pointerup') tocarODoble(c);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  function teclaCarta(e, c) {
    if (c.quieta) return;
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); if (!c.volteada) tocar(c); ampliar(c); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alFrente(c); tocar(c); return; }
    if (modo !== 'mesa') return;
    const paso = e.shiftKey ? 32 : 8;
    const mov = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (mov) {
      e.preventDefault();
      c.x = clamp(c.x * geo.W + mov[0], 0, geo.W - geo.cw) / geo.W;
      c.y = clamp(c.y * geo.H + mov[1], 0, geo.H - geo.ch) / geo.H;
      aplicar(c);
    } else if (e.key === 'r' || e.key === 'R') {
      c.rot += e.key === 'R' ? -15 : 15;
      aplicar(c);
    }
  }

  // Dos toques seguidos (< 350 ms) amplían la carta en vez de repetir el toque
  function tocarODoble(c) {
    const ahora = performance.now();
    if (c.ultimoToque && ahora - c.ultimoToque < 350) {
      c.ultimoToque = 0;
      ampliar(c);
      return;
    }
    c.ultimoToque = ahora;
    tocar(c);
  }

  function tocar(c) {
    if (!c.volteada) {
      c.volteada = true;
      c.el.classList.add('volteada');
      c.el.setAttribute('aria-label', etiqueta(c));
      if (modo === 'movil') setTimeout(() => { if (c.volteada && !c.quieta) mostrarHaiku(c); }, mqQuieto.matches ? 200 : 500);
    } else {
      mostrarHaiku(c);
    }
  }

  // ——— Barajador ———

  let tPresion = null;

  mazo.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    tPresion = performance.now();
  });
  mazo.addEventListener('pointerup', () => {
    if (tPresion === null) return;
    const g = performance.now() - tPresion;
    const t = tPresion;
    tPresion = null;
    sacar(t, g);
  });
  mazo.addEventListener('pointercancel', () => { tPresion = null; });
  mazo.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); tPresion = performance.now(); }
  });
  mazo.addEventListener('keyup', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && tPresion !== null) {
      e.preventDefault();
      const t = tPresion;
      tPresion = null;
      sacar(t, performance.now() - t);
    }
  });

  function barajar() {
    const laminas = [...pila.children];
    if (mqQuieto.matches) {
      return pila.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 300 }).finished;
    }
    const N = laminas.length;
    const mitad = Math.ceil(N / 2);
    const ease = 'cubic-bezier(0.3, 0.1, 0.3, 1)';
    const anims = laminas.map((el, j) => {
      const base = baseLamina(j);
      const izq = j < mitad;
      const r = izq ? j / mitad : (j - mitad) / Math.max(1, N - mitad);
      const fase = izq ? 0 : 0.5 / mitad;
      const dx = (izq ? -1 : 1) * geo.cw * 0.58;
      const abre = `${base} translate(${dx.toFixed(1)}px, ${izq ? 3 : -5}px) rotate(${izq ? -4 : 4}deg)`;
      const v1 = 0.3 + (r + fase) * 0.1;
      const v2 = 0.74 + (r + fase) * 0.1;
      const k = (transform, offset) => ({ transform, offset, easing: ease });
      return el.animate([
        k(base, 0), k(abre, 0.16), k(abre, v1 - 0.06), k(base, v1), k(base, 0.46),
        k(abre, 0.6), k(abre, v2 - 0.06), k(base, v2), k(base, 1),
      ], { duration: MEZCLA_MS });
    });
    return Promise.all(anims.map((a) => a.finished));
  }

  function casillaLibre() {
    const { x, y } = geo.casilla;
    for (let i = 0; i < 24; i++) {
      const X = clamp(x + i * 16, 0, geo.W - geo.cw);
      const Y = clamp(y + i * 16, 0, geo.H - geo.ch);
      const ocupada = estado.mesa.some((o) => Math.abs(o.x * geo.W - X) < 6 && Math.abs(o.y * geo.H - Y) < 6);
      if (!ocupada) return { X, Y };
    }
    return { X: x, Y: y };
  }

  async function sacar(t, g) {
    if (ocupado || !arcanos.length || estado.restantes.length === 0) return;
    ocupado = true;
    ocultarAviso();

    const lectura = leerPi(P, t, g, estado.extraidas, estado.restantes.length, estado.opciones);
    sonarBaraja();
    contarBarajada();
    await entregar(lectura.i, {
      barajar: true,
      volteada: false,
      invertida: lectura.invertida,
      pi: { k: lectura.k, digitos: lectura.digitos },
    });
    ocupado = false;
  }

  // La rueda: trae una carta concreta del mazo, sin barajar y boca arriba
  async function traer(carta) {
    const i = estado.restantes.indexOf(carta);
    if (ocupado || i < 0) return;
    ocupado = true;
    ocultarAviso();
    const c = await entregar(i, { barajar: false, volteada: true, invertida: false, pi: null });
    mostrarHaiku(c);
    ocupado = false;
  }

  async function entregar(i, op) {
    const n = estado.restantes.length;

    if (modo === 'movil') {
      const anterior = estado.mesa[estado.mesa.length - 1];
      if (anterior) { ocultarHaiku(); descartar(anterior); }
    }

    if (op.barajar) await barajar();

    // La carta sale desde lo alto de la pila
    const desde = { x: geo.mazo.x - (n - 1) * 0.35, y: geo.mazo.y - (n - 1) * 0.35, s: geo.mazo.s };
    const carta = estado.restantes.splice(i, 1)[0];
    estado.extraidas++;
    renderPila();

    if (modo === 'movil') calcular();
    colocarMazo();

    const destino = modo === 'mesa' ? casillaLibre() : { X: geo.casilla.x, Y: geo.casilla.y };
    const c = {
      carta,
      x: destino.X / geo.W,
      y: destino.Y / geo.H,
      rot: 0,
      s: 1,
      volteada: op.volteada,
      invertida: op.invertida,
      z: ++zTope,
      pi: op.pi,
    };
    mesa.appendChild(crearCarta(c));
    if (c.volteada) c.el.classList.add('volteada');
    aplicar(c);
    estado.mesa.push(c);
    anotarRastro(c);

    const anim = mqQuieto.matches
      ? c.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
      : c.el.animate([
        { transform: transformDe(desde.x, desde.y, 0, desde.s) },
        { transform: transformDe(destino.X, destino.Y, 0, 1) },
      ], { duration: ENTREGA_MS, easing: SUAVE });
    await anim.finished;
    actualizarRueda();
    return c;
  }

  function descartar(c) {
    const i = estado.mesa.indexOf(c);
    const de = c.el.style.transform;
    c.quieta = true;
    c.s = ESCALA_MAZO_MOVIL;
    c.el.style.pointerEvents = 'none';
    c.el.tabIndex = -1;
    c.el.setAttribute('aria-hidden', 'true');
    // Pila de descarte: cada carta un poco más arriba que la anterior
    c.x = (geo.descarte.x - i * 0.35) / geo.W;
    c.y = (geo.descarte.y - i * 0.35) / geo.H;
    aplicar(c);
    if (!mqQuieto.matches) c.el.animate([{ transform: de }, { transform: c.el.style.transform }], { duration: 420, easing: SUAVE });
  }

  // ——— Rueda: buscador que solo muestra los números ———

  const rueda = $('#rueda');
  const disco = $('#rueda-disco');
  const giroRueda = $('#rueda-giro');
  const centroRueda = $('#rueda-centro');
  const PASO = 360 / 22;
  const R_NUM = 153;
  let theta = 0;           // giro del disco en grados; arriba queda la carta round(-θ/PASO)
  let rotulos = [];
  let animRueda = null;
  let destinoRueda = null;  // número hacia el que gira el disco (para pasos rápidos seguidos)

  const enRueda = () => (((Math.round(-theta / PASO) % 22) + 22) % 22);

  function construirRueda() {
    const fija = [
      '<circle r="192"/>', '<circle r="186" class="fina"/>', '<circle r="122" class="fina"/>',
      '<circle r="66" class="tenue"/>',
      // índice fijo arriba, como la marca de un dial
      '<path d="M0 -197V-176" />', '<path d="M-5 -204L0 -197L5 -204Z" fill="currentColor"/>',
    ];
    $('#rueda-fija').innerHTML = fija.join('');
    let g = '';
    for (let j = 0; j < 22 * 5; j++) {
      const mayor = j % 5 === 0;
      const a = (j * PASO) / 5;
      g += `<path d="M0 -186V${mayor ? -174 : -181}" transform="rotate(${a})" class="${mayor ? 'fina' : 'tenue'}"/>`;
      if (mayor) g += `<path d="M0 -122V-128" transform="rotate(${a + PASO / 2})" class="tenue"/>`;
    }
    for (let i = 0; i < 22; i++) {
      g += `<g transform="rotate(${i * PASO})"><text x="0" y="${-R_NUM}" data-i="${i}">${ROMANOS[i]}</text></g>`;
    }
    giroRueda.innerHTML = g;
    rotulos = [...giroRueda.querySelectorAll('text')];
  }

  function pintarRueda() {
    giroRueda.setAttribute('transform', `rotate(${theta.toFixed(3)})`);
    const sel = enRueda();
    rotulos.forEach((t, i) => {
      // cada número gira al revés para quedar siempre derecho
      t.setAttribute('transform', `rotate(${(-(i * PASO + theta)).toFixed(3)} 0 ${-R_NUM})`);
      t.classList.toggle('activa', i === sel);
      t.classList.toggle('fuera', !estado.restantes.includes(i));
    });
    const libre = estado.restantes.includes(sel);
    $('#rueda-num').textContent = ROMANOS[sel];
    $('#rueda-accion').textContent = libre ? 'TRAER' : 'EN MESA';
    centroRueda.disabled = !libre;
    centroRueda.setAttribute('aria-label', libre ? `Traer la carta ${ROMANOS[sel]}` : `La carta ${ROMANOS[sel]} ya salió`);
    disco.setAttribute('aria-valuenow', String(sel));
    disco.setAttribute('aria-valuetext', ROMANOS[sel] + (libre ? '' : ', ya salió'));
  }

  function actualizarRueda() { if (!rueda.hidden) pintarRueda(); }

  function animarTheta(destino, ms = 380) {
    cancelAnimationFrame(animRueda);
    if (mqQuieto.matches) { theta = destino; destinoRueda = null; pintarRueda(); return; }
    const desde = theta, t0 = performance.now();
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      theta = desde + (destino - desde) * e;
      pintarRueda();
      if (p < 1) animRueda = requestAnimationFrame(paso);
      else destinoRueda = null;
    };
    animRueda = requestAnimationFrame(paso);
  }

  const encajar = (th) => Math.round(th / PASO) * PASO;

  const siguiente = (mov) => ((destinoRueda ?? enRueda()) + mov + 22) % 22;

  function girarA(i) {
    destinoRueda = i;
    const base = -i * PASO;
    animarTheta(base + 360 * Math.round((theta - base) / 360));
  }

  function abrirRueda() {
    if (!rueda.hidden || !arcanos.length) return;
    ocultarAviso();
    rueda.hidden = false;
    theta = encajar(theta);
    pintarRueda();
    disco.focus();
    if (!mqQuieto.matches) {
      rueda.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
      disco.animate([{ transform: 'scale(0.96) rotate(-8deg)' }, { transform: 'none' }], { duration: 420, easing: SUAVE });
    }
  }

  function cerrarRueda() {
    if (rueda.hidden) return;
    cancelAnimationFrame(animRueda);
    theta = destinoRueda !== null ? -destinoRueda * PASO : encajar(theta);
    destinoRueda = null;
    rueda.hidden = true;
    $('#abrir-rueda').focus({ preventScroll: true });
  }

  function traerDeRueda() {
    const sel = destinoRueda ?? enRueda();
    if (!estado.restantes.includes(sel) || ocupado) return;
    cerrarRueda();
    traer(sel);
  }

  // Arrastre con inercia: el disco sigue al dedo y al soltar encaja en un número
  disco.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.rueda-centro')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    cancelAnimationFrame(animRueda);
    destinoRueda = null;
    disco.setPointerCapture(e.pointerId);
    const r = disco.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const angulo = (ev) => (Math.atan2(ev.clientX - cx, cy - ev.clientY) * 180) / Math.PI;
    let previo = angulo(e);
    let recorrido = 0;
    let muestras = [{ t: performance.now(), th: theta }];
    const objetivo = e.target.dataset && e.target.dataset.i;

    const mover = (ev) => {
      const a = angulo(ev);
      let d = a - previo;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      previo = a;
      theta += d;
      recorrido += Math.abs(d);
      if (recorrido > 2) disco.classList.add('girando');
      muestras.push({ t: performance.now(), th: theta });
      if (muestras.length > 6) muestras.shift();
      pintarRueda();
    };
    const soltar = () => {
      disco.removeEventListener('pointermove', mover);
      disco.removeEventListener('pointerup', soltar);
      disco.removeEventListener('pointercancel', soltar);
      disco.classList.remove('girando');
      if (recorrido <= 2) {
        if (objetivo !== undefined) girarA(Number(objetivo));
        else animarTheta(encajar(theta), 200);
        return;
      }
      const a = muestras[0], b = muestras[muestras.length - 1];
      const v = (b.th - a.th) / Math.max(16, b.t - a.t);   // grados por ms
      animarTheta(encajar(theta + clamp(v * 220, -180, 180)), 520);
    };
    disco.addEventListener('pointermove', mover);
    disco.addEventListener('pointerup', soltar);
    disco.addEventListener('pointercancel', soltar);
  });

  let acumulado = 0;
  disco.addEventListener('wheel', (e) => {
    e.preventDefault();
    acumulado += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(acumulado) < 40) return;
    const pasos = Math.sign(acumulado);
    acumulado = 0;
    girarA(siguiente(pasos));
  }, { passive: false });

  disco.addEventListener('keydown', (e) => {
    const mov = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (mov) { e.preventDefault(); girarA(siguiente(mov)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); traerDeRueda(); }
    else if (e.key === 'Home') { e.preventDefault(); girarA(0); }
    else if (e.key === 'End') { e.preventDefault(); girarA(21); }
  });

  centroRueda.addEventListener('click', traerDeRueda);
  rueda.addEventListener('click', (e) => { if (e.target === rueda) cerrarRueda(); });
  $('#abrir-rueda').addEventListener('click', abrirRueda);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarRueda(); });

  // ——— Lupa: la carta ampliada a su resolución nativa ———

  const lupa = $('#lupa');
  const lupaImg = $('#lupa-img');
  let lupaCarta = null;
  let lupaAnim = false;

  // Rectángulo final: lo más grande que quepa en pantalla sin pasar de 1 px de imagen por px CSS
  function medidaLupa() {
    const nw = lupaImg.naturalWidth || 600, nh = lupaImg.naturalHeight || 1036;
    const altoMax = Math.min(window.innerHeight - 120, nh);
    const anchoMax = Math.min(window.innerWidth - 32, nw);
    const k = Math.min(altoMax / nh, anchoMax / nw);
    return { w: nw * k, h: nh * k, nw, nh };
  }

  // Transformación que lleva la imagen ampliada a donde está la carta en la mesa
  function desdeCarta(c, m) {
    const r = c.el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const fx = lupaImg.getBoundingClientRect();
    const dx = cx - (fx.left + fx.width / 2), dy = cy - (fx.top + fx.height / 2);
    const s = (geo.cw * (c.s || 1)) / m.w;
    return `translate(${dx}px, ${dy}px) rotate(${c.rot}deg) scale(${s})`;
  }

  async function ampliar(c) {
    if (lupaAnim || !lupa.hidden) return;
    const a = arcanos[c.carta];
    lupaAnim = true;
    lupaCarta = c;
    ocultarHaiku();
    lupaImg.src = a.imagen;
    try { await lupaImg.decode(); } catch (e) { lupaAnim = false; return; }
    const m = medidaLupa();
    lupaImg.style.width = m.w + 'px';
    lupaImg.style.height = m.h + 'px';
    lupaImg.classList.toggle('invertida', c.invertida);
    $('#lupa-titulo').textContent = `[${a.numero}] ${a.nombre.toUpperCase()}${c.invertida ? ' · INVERTIDA' : ''}`;
    $('#lupa-medida').textContent = `${m.nw} × ${m.nh} PX · ${Math.round((m.w / m.nw) * 100)} %`;
    lupaImg.alt = `${a.nombre}, ilustración Rider-Waite-Smith`;
    lupa.hidden = false;
    c.el.style.visibility = 'hidden';
    lupa.focus();
    if (!mqQuieto.matches) {
      const giro = c.invertida ? ' rotate(180deg)' : '';
      lupa.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease' });
      await lupaImg.animate([
        { transform: desdeCarta(c, m) + giro },
        { transform: 'translate(0px, 0px)' + giro },
      ], { duration: 460, easing: SUAVE }).finished;
    }
    lupaAnim = false;
  }

  async function cerrarLupa() {
    if (lupaAnim || lupa.hidden) return;
    lupaAnim = true;
    const c = lupaCarta;
    if (!mqQuieto.matches && c && c.el.isConnected) {
      const m = { w: lupaImg.offsetWidth };
      const giro = c.invertida ? ' rotate(180deg)' : '';
      lupa.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease', fill: 'forwards' });
      await lupaImg.animate([
        { transform: 'translate(0px, 0px)' + giro },
        { transform: desdeCarta(c, m) + giro },
      ], { duration: 380, easing: SUAVE, fill: 'forwards' }).finished;
    }
    lupa.hidden = true;
    lupa.getAnimations({ subtree: true }).forEach((an) => an.cancel());
    if (c) { c.el.style.visibility = ''; c.el.focus({ preventScroll: true }); }
    lupaCarta = null;
    lupaAnim = false;
  }

  lupa.tabIndex = -1;
  lupa.addEventListener('click', cerrarLupa);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarLupa(); });

  // ——— Haiku ———

  let capaActiva = 0;
  let relojHaiku = null;

  function mostrarHaiku(c) {
    if (!estado.opciones.frase) return;
    const a = arcanos[c.carta];
    const nueva = capas[1 - capaActiva];
    const vieja = capas[capaActiva];
    nueva.innerHTML = `<p class="frase"><span class="frase-titulo"><span class="num">[${a.numero}]</span> <span class="nombre">${a.nombre}</span>${c.invertida ? ' <span class="marca-inv">INVERTIDA</span>' : ''}</span> <span class="frase-texto">${a.frases.join(' ')}</span></p>`;
    vieja.classList.remove('visible');
    nueva.classList.add('visible');
    capaActiva = 1 - capaActiva;
    setTimeout(() => { if (!vieja.classList.contains('visible')) vieja.innerHTML = ''; }, 450);
    estado.haikuVisible = c.carta;
    clearTimeout(relojHaiku);
    relojHaiku = setTimeout(ocultarHaiku, 12000);
  }

  function ocultarHaiku() {
    clearTimeout(relojHaiku);
    capas.forEach((el) => el.classList.remove('visible'));
    estado.haikuVisible = null;
  }

  mesa.addEventListener('click', (e) => {
    if (e.target === mesa) ocultarHaiku();
  });

  // ——— Rastro de π ———

  function anotarRastro(c) {
    // Solo el segmento de π que eligió la carta (las traídas con la rueda no leen π)
    if (!c.pi) return;
    rastro.insertAdjacentHTML('beforeend', `<li>${c.pi.digitos}</li>`);
  }

  // ——— Reinicio ———

  reinicio.addEventListener('click', () => {
    if (ocupado) return;
    if (estado.mesa.length >= 3) mostrarAviso();
    else recoger();
  });

  function mostrarAviso() {
    aviso.hidden = false;
    aviso.querySelector('[data-respuesta="no"]').focus();
  }
  function ocultarAviso() { aviso.hidden = true; }

  aviso.addEventListener('click', (e) => {
    const r = e.target.dataset.respuesta;
    if (!r) return;
    ocultarAviso();
    if (r === 'si') recoger();
    else reinicio.focus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !aviso.hidden) ocultarAviso(); });

  async function recoger() {
    if (ocupado) return;
    ocupado = true;
    ocultarHaiku();
    const cartas = estado.mesa.slice();
    estado.extraidas = 0;
    calcular();
    const destino = transformDe(geo.mazo.x, geo.mazo.y, 0, geo.mazo.s);

    if (modo === 'movil') colocarMazo();
    const anims = cartas.map((c, i) => {
      c.el.classList.remove('volteada', 'arrastrando');
      if (mqQuieto.matches) return c.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished;
      const de = c.el.style.transform;
      c.el.style.transform = destino;
      return c.el.animate([{ transform: de }, { transform: destino }],
        { duration: RECOGER_MS, delay: i * 18, easing: SUAVE, fill: 'backwards' }).finished;
    });
    await Promise.all(anims);
    reiniciarEstado();
    ocupado = false;
  }

  function reiniciarEstado() {
    if (!lupa.hidden) { lupa.hidden = true; lupaCarta = null; }
    actualizarRueda();
    estado.mesa.forEach((c) => c.el.remove());
    estado.mesa = [];
    estado.restantes = arcanos.map((a) => a.id);
    estado.extraidas = 0;
    estado.haikuVisible = null;
    zTope = 10;
    rastro.innerHTML = '';
    ocultarHaiku();
    calcular();
    renderPila();
    colocarMazo();
    dibujarCotas();
  }

  // ——— Opciones y tema ———

  document.querySelectorAll('[data-opcion]').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.dataset.opcion;
      estado.opciones[k] = !estado.opciones[k];
      b.setAttribute('aria-pressed', String(estado.opciones[k]));
      if (k === 'rastro') rastro.classList.toggle('oculto', !estado.opciones.rastro);
      if (k === 'frase' && !estado.opciones.frase) ocultarHaiku();
    });
  });

  const botonTema = $('#tema');
  function pintarTema() {
    const claro = document.documentElement.dataset.theme === 'light';
    botonTema.querySelector('.rotulo').textContent = claro ? 'PAPEL' : 'TINTA';
  }
  botonTema.addEventListener('click', () => {
    const claro = document.documentElement.dataset.theme !== 'light';
    if (claro) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('tarotfh-tema', claro ? 'light' : 'dark'); } catch (e) {}
    pintarTema();
  });

  // ——— Sonido (apagado por defecto): roce de papel sintetizado ———

  let audio = null;
  let ruido = null;

  function sonarBaraja() {
    if (!estado.opciones.sonido) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (!ruido) {
        ruido = audio.createBuffer(1, audio.sampleRate * 0.6, audio.sampleRate);
        const d = ruido.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t0 = audio.currentTime + 0.01;
      const roce = (t, dur, vol, freq) => {
        const src = audio.createBufferSource();
        src.buffer = ruido;
        const f = audio.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = freq;
        f.Q.value = 0.9;
        const gn = audio.createGain();
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.exponentialRampToValueAtTime(vol, t + 0.004);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(gn).connect(audio.destination);
        src.start(t, Math.random() * 0.4, dur + 0.02);
      };
      const D = mqQuieto.matches ? 0.3 : MEZCLA_MS / 1000;
      for (const [a, b] of [[0.26, 0.42], [0.7, 0.86]]) {
        for (let j = 0; j < 14; j++) roce(t0 + (a + ((b - a) * j) / 14) * D, 0.03, 0.05, 2400 + Math.random() * 1800);
      }
      roce(t0 + 0.94 * D, 0.14, 0.06, 900);
    } catch (e) { /* sin audio, sin drama */ }
  }

  // ——— Foto de la tirada: la mesa dibujada en un lienzo, para llevársela ———

  const botonFoto = $('#foto');

  const cargarImagen = (src) => new Promise((ok, mal) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = mal;
    im.src = src;
  });

  const svgComoImagen = (svg) =>
    cargarImagen('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));

  // Texto en el lienzo con la misma letra, tamaño y espaciado que en pantalla
  function fuenteDe(ctx, el) {
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    ctx.fillStyle = cs.color;
    return cs;
  }

  function textoEnSuSitio(ctx, el) {
    if (!el || !el.textContent.trim() || !el.getClientRects().length) return;
    const r = el.getBoundingClientRect();
    fuenteDe(ctx, el);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(el.textContent, r.left, r.top + r.height / 2);
  }

  // Parte un texto en líneas que quepan en un ancho
  function partir(ctx, texto, ancho) {
    const lineas = [];
    let linea = '';
    for (const palabra of texto.split(' ')) {
      const prueba = linea ? linea + ' ' + palabra : palabra;
      if (ctx.measureText(prueba).width > ancho && linea) { lineas.push(linea); linea = palabra; }
      else linea = prueba;
    }
    if (linea) lineas.push(linea);
    return lineas;
  }

  async function sacarFoto() {
    if (!arcanos.length || ocupado) return;
    botonFoto.disabled = true;
    try {
      await document.fonts.ready;
      const raiz = getComputedStyle(document.documentElement);
      const color = (v) => raiz.getPropertyValue(v).trim();
      const C = {
        fondo: color('--fondo'), carta: color('--carta'), tinta: color('--tinta'),
        media: color('--tinta-media'), tenue: color('--tinta-tenue'), fina: color('--tinta-fina'),
      };
      const W = window.innerWidth, H = window.innerHeight;
      const k = Math.max(2, window.devicePixelRatio || 1);
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(W * k);
      lienzo.height = Math.round(H * k);
      const ctx = lienzo.getContext('2d');
      ctx.scale(k, k);

      // Papel y retícula de cruces, igual que en pantalla
      ctx.fillStyle = C.fondo;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.tenue;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 64; x < W; x += 128) {
        for (let y = 64; y < H; y += 128) {
          ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
          ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
        }
      }
      ctx.stroke();

      const rm = mesa.getBoundingClientRect();

      // Cotas: las líneas como imagen, los rótulos con la letra de la página
      if (modo === 'mesa' && cotas.innerHTML) {
        const copia = cotas.cloneNode(true);
        copia.querySelectorAll('text').forEach((t) => t.remove());
        copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        copia.setAttribute('width', rm.width * k);
        copia.setAttribute('height', rm.height * k);
        copia.setAttribute('viewBox', `0 0 ${rm.width} ${rm.height}`);
        copia.setAttribute('style', `color:${C.fina}`);
        copia.setAttribute('stroke-width', '1');
        const lineas = await svgComoImagen(new XMLSerializer().serializeToString(copia));
        ctx.drawImage(lineas, rm.left, rm.top, rm.width, rm.height);
        cotas.querySelectorAll('text').forEach((t) => {
          const x = Number(t.getAttribute('x')) + rm.left;
          const y = Number(t.getAttribute('y')) + rm.top;
          const giro = /rotate\(([-\d.]+)/.exec(t.getAttribute('transform') || '');
          fuenteDe(ctx, t);
          ctx.fillStyle = getComputedStyle(t).fill;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.save();
          ctx.translate(x, y);
          if (giro) ctx.rotate((Number(giro[1]) * Math.PI) / 180);
          ctx.fillText(t.textContent, 0, 0);
          ctx.restore();
        });
      }

      // Reverso compartido, rasterizado al tamaño de la carta
      const { cw, ch } = geo;
      const reverso = await svgComoImagen(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 120" width="${cw * k}" height="${ch * k}" style="color:${C.tinta}" stroke-width="1">${$('#reverso').innerHTML}</svg>`);
      const reversoTenue = await svgComoImagen(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 120" width="${cw * k}" height="${ch * k}" style="color:${C.fina}" stroke-width="1">${$('#reverso').innerHTML}</svg>`);

      const marco = (borde, dash) => {
        ctx.beginPath();
        ctx.roundRect(0, 0, cw, ch, 8);
        ctx.fillStyle = C.carta;
        ctx.fill();
        ctx.setLineDash(dash || []);
        ctx.strokeStyle = borde;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // El mazo, con su grosor
      const n = estado.restantes.length;
      const { x: mx, y: my, s: ms } = geo.mazo;
      ctx.save();
      ctx.translate(rm.left + mx + cw / 2, rm.top + my + ch / 2);
      ctx.scale(ms, ms);
      ctx.translate(-cw / 2, -ch / 2);
      if (n === 0) {
        ctx.beginPath();
        ctx.roundRect(0, 0, cw, ch, 8);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = C.fina;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (let j = 0; j < n; j++) {
        ctx.save();
        ctx.translate(-j * 0.35, -j * 0.35);
        marco(j === n - 1 ? C.fina : C.tenue);
        if (j === n - 1) ctx.drawImage(reversoTenue, 0, 0, cw, ch);
        ctx.restore();
      }
      ctx.restore();
      textoEnSuSitio(ctx, cuenta);

      // Las cartas, en su orden de capas
      const ilustraciones = {};
      await Promise.all(estado.mesa.filter((c) => c.volteada).map(async (c) => {
        try { ilustraciones[c.carta] = await cargarImagen(arcanos[c.carta].imagen); } catch (e) { /* sin imagen */ }
      }));
      for (const c of estado.mesa.slice().sort((a, b) => a.z - b.z)) {
        ctx.save();
        ctx.translate(rm.left + c.x * geo.W + cw / 2, rm.top + c.y * geo.H + ch / 2);
        ctx.rotate((c.rot * Math.PI) / 180);
        ctx.scale(c.s || 1, c.s || 1);
        ctx.translate(-cw / 2, -ch / 2);
        ctx.shadowColor = C.fondo === '#faf8f4' ? 'rgba(40,32,20,0.18)' : 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        marco(c.volteada ? C.tinta : C.fina);
        ctx.shadowColor = 'transparent';
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, cw, ch, 8);
        ctx.clip();
        const im = c.volteada && ilustraciones[c.carta];
        if (im) {
          if (c.invertida) { ctx.translate(cw, ch); ctx.rotate(Math.PI); }
          // object-fit: cover
          const e = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
          const iw = im.naturalWidth * e, ih = im.naturalHeight * e;
          ctx.drawImage(im, (cw - iw) / 2, (ch - ih) / 2, iw, ih);
        } else if (!c.volteada) {
          ctx.drawImage(reverso, 0, 0, cw, ch);
        }
        ctx.restore();
        ctx.beginPath();
        ctx.roundRect(0.5, 0.5, cw - 1, ch - 1, 8);
        ctx.strokeStyle = c.volteada ? C.tinta : C.fina;
        ctx.stroke();
        ctx.restore();
      }

      // Rastro de π y frase visible, donde están
      if (estado.opciones.rastro) rastro.querySelectorAll('li').forEach((li) => textoEnSuSitio(ctx, li));
      const frase = document.querySelector('.haiku-capa.visible .frase');
      if (frase) {
        const r = frase.getBoundingClientRect();
        const cs = fuenteDe(ctx, frase);
        const alto = parseFloat(cs.lineHeight);
        const tituloEl = frase.querySelector('.frase-titulo');
        const texto = frase.querySelector('.frase-texto').textContent;
        // En móvil el título va en su propio renglón, como en pantalla
        const tituloAparte = getComputedStyle(tituloEl).display === 'block';
        const titulo = tituloEl.textContent.trim();
        let arriba = r.top;
        if (tituloAparte) {
          const rt = tituloEl.getBoundingClientRect();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = C.tinta;
          ctx.fillText(titulo, rt.left + rt.width / 2, rt.top + rt.height / 2);
          ctx.fillStyle = cs.color;
          arriba = rt.bottom + parseFloat(getComputedStyle(tituloEl).marginBottom);
        }
        const lineas = partir(ctx, tituloAparte ? texto : `${titulo}  ${texto}`, r.width);
        const centrada = cs.textAlign === 'center';
        ctx.textAlign = centrada ? 'center' : 'right';
        ctx.textBaseline = 'middle';
        const x = centrada ? r.left + r.width / 2 : r.right;
        lineas.forEach((l, i) => {
          if (i === 0 && !tituloAparte && l.startsWith(titulo)) {
            // el título va en tinta, el resto en gris, como en pantalla
            const resto = l.slice(titulo.length);
            const anchoResto = ctx.measureText(resto).width;
            const anchoTitulo = ctx.measureText(titulo).width;
            const derecha = centrada ? x + (anchoTitulo + anchoResto) / 2 : x;
            ctx.textAlign = 'right';
            ctx.fillStyle = cs.color;
            ctx.fillText(resto, derecha, arriba + alto * (i + 0.5));
            ctx.fillStyle = C.tinta;
            ctx.fillText(titulo, derecha - anchoResto, arriba + alto * (i + 0.5));
            ctx.textAlign = centrada ? 'center' : 'right';
            ctx.fillStyle = cs.color;
          } else {
            ctx.fillText(l, x, arriba + alto * (i + 0.5));
          }
        });
      }

      // Firma: nombre, fecha y barajadas
      const ahora = new Date();
      const dd = (v) => String(v).padStart(2, '0');
      const fecha = `${dd(ahora.getDate())}.${dd(ahora.getMonth() + 1)}.${ahora.getFullYear()} · ${dd(ahora.getHours())}:${dd(ahora.getMinutes())}`;
      ctx.letterSpacing = '1.2px';
      ctx.textBaseline = 'alphabetic';
      if (modo === 'mesa') {
        ctx.fillStyle = C.tinta;
        ctx.font = '400 15px "IBM Plex Mono", monospace';
        ctx.textAlign = 'left';
        ctx.letterSpacing = '0.3px';
        ctx.fillText('[00]', 48, 40);
        ctx.font = '400 10px "IBM Plex Mono", monospace';
        ctx.letterSpacing = '1.2px';
        ctx.fillText('TAROT FH', 96, 36);
        ctx.textAlign = 'right';
        ctx.fillStyle = C.tinta;
        ctx.font = '400 10px "IBM Plex Mono", monospace';
        ctx.fillText(fecha, W - 48, 36);
        ctx.fillStyle = C.media;
        ctx.font = '400 9px "IBM Plex Mono", monospace';
        ctx.fillText(`${contador.textContent} BARAJADAS · AZAR π`, W - 48, 52);
        ctx.strokeStyle = C.fina;
        ctx.beginPath();
        ctx.moveTo(48, 75.5);
        ctx.lineTo(W - 48, 75.5);
        ctx.stroke();
      } else {
        ctx.font = '400 9px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = C.media;
        ctx.fillText(`TAROT FH · ${fecha}`, W / 2, H - 20);
      }

      const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/png'));
      const nombre = `tarotfh-${ahora.getFullYear()}${dd(ahora.getMonth() + 1)}${dd(ahora.getDate())}-${dd(ahora.getHours())}${dd(ahora.getMinutes())}.png`;
      destello();
      await entregarFoto(blob, nombre);
    } catch (e) {
      console.error('No se pudo sacar la foto', e);
    } finally {
      botonFoto.disabled = false;
    }
  }

  function destello() {
    if (mqQuieto.matches) return;
    const d = document.createElement('div');
    d.className = 'destello';
    document.body.appendChild(d);
    d.animate([{ opacity: 0.35 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }).finished.then(() => d.remove());
  }

  // En el teléfono, el menú de compartir (guardar en fotos, enviar); si no, descarga el PNG
  async function entregarFoto(blob, nombre) {
    const archivo = new File([blob], nombre, { type: 'image/png' });
    if (modo === 'movil' && navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: 'Tarot FH' });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  botonFoto.addEventListener('click', sacarFoto);

  // ——— Contador global de barajadas ———
  // Abacus: contador público sin cuentas ni servidor propio. Cada visita suma al mismo total.
  // En localhost se usa otra clave para que las pruebas no inflen el número real.

  const CONTADOR_URL = 'https://abacus.jasoncameron.dev';
  const CONTADOR_CLAVE = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
    ? 'tarotfh/barajadas-prueba'
    : 'tarotfh/barajadas';
  const contador = $('#contador');
  let barajadas = null;

  function pintarContador() {
    contador.textContent = barajadas === null ? '······' : String(barajadas).padStart(6, '0');
    contador.setAttribute('aria-label', barajadas === null ? 'Barajadas: sin conexión' : `${barajadas} barajadas en total`);
  }

  async function pedirContador(accion) {
    const r = await fetch(`${CONTADOR_URL}/${accion}/${CONTADOR_CLAVE}`, { cache: 'no-store' });
    if (r.status === 404) return 0;
    if (!r.ok) throw new Error('contador ' + r.status);
    return (await r.json()).value;
  }

  async function iniciarContador() {
    try { barajadas = await pedirContador('get'); } catch (e) { /* sin red: queda en puntos */ }
    pintarContador();
  }

  async function contarBarajada() {
    if (barajadas !== null) { barajadas++; pintarContador(); }   // se ve al instante
    try {
      barajadas = await pedirContador('hit');                     // y luego el total real
      pintarContador();
    } catch (e) { /* sin red: la barajada no se cuenta */ }
  }

  // ——— Tamaño de ventana y cambio de modo ———

  let relojResize = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(relojResize);
    relojResize = requestAnimationFrame(() => {
      calcular();
      colocarMazo();
      dibujarCotas();
      estado.mesa.forEach((c) => {
        if (modo === 'mesa') {
          c.x = clamp(c.x * geo.W, 0, geo.W - geo.cw) / geo.W;
          c.y = clamp(c.y * geo.H, 0, geo.H - geo.ch) / geo.H;
        }
        aplicar(c);
      });
    });
  });

  mqMovil.addEventListener('change', () => {
    modo = mqMovil.matches ? 'movil' : 'mesa';
    document.body.classList.toggle('movil', modo === 'movil');
    ocultarAviso();
    reiniciarEstado();
  });

  // ——— Arranque ———

  async function iniciar() {
    document.body.classList.toggle('movil', modo === 'movil');
    pintarTema();
    construirReverso();
    construirRueda();
    iniciarContador();
    try {
      const r = await fetch('arcanos.json');
      arcanos = await r.json();
    } catch (e) {
      cuenta.textContent = 'ABRIR CON UN SERVIDOR LOCAL';
      return;
    }
    anversos = arcanos.map(construirAnverso);
    // Precarga las ilustraciones (Rider-Waite-Smith, 1909) para que el volteo no espere
    arcanos.forEach((a) => { const im = new Image(); im.src = a.imagen; });
    reiniciarEstado();
  }

  iniciar();
})();
