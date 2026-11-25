/* =============================================================
   hero-box.js — the 3D Marlowby box on the homepage.

   Everything in this scene is built from code: no 3D model files,
   no downloaded images. Shapes are simple boxes and cylinders, and
   every printed label is drawn on a <canvas> and wrapped onto the
   model as a texture.

   HOW IT WORKS
   1. buildBox()    the box: five walls plus a lid hinged at the back
   2. buildItems()  the six goods inside (jar, coffee, candle, ...)
   3. buildCards()  three city postcards that fly out
   4. frame()       runs about 60 times a second. It reads the scroll
                    position (0 = top of hero, 1 = end) and the mouse
                    position, then moves everything to match.

   This file is bundled with Three.js by esbuild into
   js/hero-box.min.js (run: npm run js). main.js loads that file
   only after the page is ready and only if the device supports it.
   ============================================================= */

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Vector3, Color,
  BoxGeometry, CylinderGeometry, PlaneGeometry, BufferGeometry, BufferAttribute,
  MeshStandardMaterial, ShadowMaterial, PointsMaterial, Points,
  HemisphereLight, DirectionalLight, SpotLight,
  CanvasTexture, SRGBColorSpace, PCFSoftShadowMap, NeutralToneMapping,
} from 'three';

const hero = document.querySelector('[data-hero]');
if (hero) start().catch(() => document.documentElement.classList.add('no-3d'));

async function start() {
  const track = hero.querySelector('[data-hero-track]');
  const stage = hero.querySelector('.hero__stage');

  /* ---------- Small helpers ---------- */
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  // seg(): turns overall progress p into 0→1 progress for one step that runs from a to b
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  // A gentle overshoot used once, for the lid "settling" open
  const easeBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  const mat = (color, roughness = 0.7, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness });
  const mesh = (geo, material) => { const m = new Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; return m; };

  // Wait for the site fonts so the canvas labels use Bodoni, not a fallback
  if (document.fonts && document.fonts.load) {
    await Promise.race([
      Promise.all(['500 60px "Bodoni Moda"', 'italic 400 60px "Bodoni Moda"', '500 20px "DM Mono"', '600 20px "Instrument Sans"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  }

  /* ---------- Canvas drawing helpers for labels ---------- */
  function texture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  // Letter-spaced text (canvas has no letter-spacing in every browser yet)
  function spaced(x, str, cx, y, gap) {
    const widths = [...str].map((ch) => x.measureText(ch).width);
    let px = cx - (widths.reduce((a, b) => a + b, 0) + gap * (str.length - 1)) / 2;
    x.textAlign = 'left';
    [...str].forEach((ch, i) => { x.fillText(ch, px, y); px += widths[i] + gap; });
  }
  function ring(x, cx, cy, r, lw) { x.lineWidth = lw; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); }

  // City scenes for the postcards: the same SVG paths used on the site's postcards
  const SCENES = {
    savannah: { name: 'Savannah', no: '01', sky: ['#f5e3c3', '#e6bf95'], sun: '#fff2d2', far: '#93a67c', near: '#2f4a36',
      farD: ['M0 150Q75 132 150 142T300 136V200H0Z'],
      nearD: ['M40 152 46 104Q20 104 14 88Q8 66 34 62Q44 40 72 48Q96 34 116 54Q140 56 136 80Q134 100 104 102L58 104 62 152Z', 'M232 154 236 120Q214 120 210 106Q208 90 228 88Q238 72 258 78Q280 74 286 92Q292 110 270 116L246 118 250 154Z', 'M0 160Q150 148 300 160V200H0Z'] },
    duluth: { name: 'Duluth', no: 'P3', sky: ['#dcebea', '#b4d3d1'], sun: '#f7ebc8', far: '#7faeb0', near: '#24545b',
      farD: ['M0 120Q60 98 120 112T240 104T300 110V200H0Z'],
      nearD: ['M52 162V66H66V162ZM234 162V66H248V162ZM44 58H256V72H44ZM66 128H234V136H66Z', 'M0 160Q75 154 150 160T300 160V200H0Z'] },
    santafe: { name: 'Santa Fe', no: 'P4', sky: ['#f7dcc0', '#e8b49a'], sun: '#fff1d0', far: '#b9798f', near: '#6a3f5d',
      farD: ['M0 140H30L44 104H120L132 140H180L194 116H250L262 140H300V200H0Z'],
      nearD: ['M60 200V128Q60 120 68 120H170Q178 120 178 128V200Z', 'M0 186H300V200H0Z'] },
  };
  function drawScene(x, s, X, Y, W, H) {
    x.save();
    x.beginPath(); x.rect(X, Y, W, H); x.clip();
    x.translate(X, Y); x.scale(W / 300, H / 200);
    const g = x.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, s.sky[0]); g.addColorStop(1, s.sky[1]);
    x.fillStyle = g; x.fillRect(0, 0, 300, 200);
    x.fillStyle = s.sun; x.beginPath(); x.arc(220, 58, 20, 0, Math.PI * 2); x.fill();
    x.fillStyle = s.far; s.farD.forEach((d) => x.fill(new Path2D(d)));
    x.fillStyle = s.near; s.nearD.forEach((d) => x.fill(new Path2D(d)));
    x.restore();
  }

  /* ---------- Printed surfaces ---------- */
  const GOLD = '#c9a462', GOLD_LIGHT = '#d9bc80', PINE = '#1f3a2e', LINEN = '#fbf7ee';

  const lidTex = texture(1024, 736, (x, w, h) => {
    x.fillStyle = PINE; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(201,164,98,0.07)'; x.lineWidth = 2;            // fine pinstripe
    for (let i = -h; i < w; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); }
    x.strokeStyle = GOLD; x.lineWidth = 3; x.strokeRect(34, 34, w - 68, h - 68);
    x.lineWidth = 1; x.strokeRect(48, 48, w - 96, h - 96);
    x.fillStyle = GOLD_LIGHT;
    x.font = '500 24px "DM Mono"'; spaced(x, 'BOX NO. 01', w * 0.36, h * 0.37, 8);
    x.font = '500 96px "Bodoni Moda"'; spaced(x, 'MARLOWBY', w * 0.36, h * 0.54, 10);
    x.font = '500 22px "DM Mono"'; spaced(x, 'EXPLORE YOUR CITY', w * 0.36, h * 0.65, 7);
    // Postmark in the corner
    x.strokeStyle = GOLD_LIGHT; ring(x, w * 0.86, h * 0.24, 66, 4); ring(x, w * 0.86, h * 0.24, 52, 1.5);
    x.font = '500 20px "DM Mono"'; x.textAlign = 'center'; x.fillText('SAVANNAH', w * 0.86, h * 0.235);
    x.font = '500 15px "DM Mono"'; x.fillText('MAR · 2027', w * 0.86, h * 0.27);
  });

  const frontTex = texture(1024, 427, (x, w, h) => {
    x.fillStyle = PINE; x.fillRect(0, 0, w, h);
    // Kraft shipping label (the top ~26% hides under the lid)
    const lx = w * 0.08, ly = h * 0.36, lw = w * 0.42, lh = h * 0.52;
    x.fillStyle = '#e6d3ad'; x.fillRect(lx, ly, lw, lh);
    x.strokeStyle = PINE; x.lineWidth = 3; x.strokeRect(lx + 10, ly + 10, lw - 20, lh - 20);
    x.fillStyle = PINE; x.textAlign = 'left';
    x.font = '500 40px "Bodoni Moda"'; x.fillText('Marlowby Post', lx + 30, ly + 62);
    x.font = '500 20px "DM Mono"'; x.fillText('BOX NO. 01 · SAVANNAH, GA', lx + 30, ly + 100);
    for (let i = 0; i < 30; i++) x.fillRect(lx + 30 + i * 9, ly + 122, i % 3 ? 3 : 6, 52);   // barcode
    // Gold postmark on the right, clear of the ribbon (which sits near 76% across)
    x.strokeStyle = GOLD_LIGHT; ring(x, w * 0.9, h * 0.62, 58, 3); ring(x, w * 0.9, h * 0.62, 46, 1.2);
    x.fillStyle = GOLD_LIGHT; x.textAlign = 'center';
    x.font = '500 30px "Bodoni Moda"'; x.fillText('No. 01', w * 0.9, h * 0.64);
    x.font = '500 13px "DM Mono"'; x.fillText('SAVANNAH', w * 0.9, h * 0.705);
  });

  const sealTex = texture(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w * 0.4, h * 0.38, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#9a3a31'); g.addColorStop(1, '#5e1b17');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,220,200,0.35)'; ring(x, w / 2, h / 2, w * 0.36, 6);
    x.strokeStyle = 'rgba(255,225,205,0.8)'; x.lineWidth = 12; x.lineJoin = 'round'; x.lineCap = 'round';
    x.beginPath(); x.moveTo(84, 172); x.lineTo(84, 86); x.lineTo(128, 140); x.lineTo(172, 86); x.lineTo(172, 172); x.stroke();
  });

  const cardBackTex = texture(512, 340, (x, w, h) => {
    x.fillStyle = LINEN; x.fillRect(0, 0, w, h);
    x.strokeStyle = GOLD; x.lineWidth = 2; x.strokeRect(14, 14, w - 28, h - 28);
    x.strokeStyle = 'rgba(31,58,46,0.4)'; x.beginPath(); x.moveTo(w / 2, 44); x.lineTo(w / 2, h - 44); x.stroke();
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(w / 2 + 28, 150 + i * 38); x.lineTo(w - 44, 150 + i * 38); x.stroke(); }
    x.fillStyle = PINE; x.textAlign = 'left';
    x.font = 'italic 500 30px "Bodoni Moda"'; x.fillText('Wish you were here.', 40, 130);
    x.font = '500 15px "DM Mono"'; x.fillText('MARLOWBY POST', 40, h - 48);
  });

  function cardFrontTex(s) {
    return texture(512, 340, (x, w, h) => {
      x.fillStyle = LINEN; x.fillRect(0, 0, w, h);
      drawScene(x, s, 16, 16, w - 32, h - 32);
      const g = x.createLinearGradient(0, h * 0.45, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
      x.fillStyle = g; x.fillRect(16, h * 0.45, w - 32, h * 0.55 - 16);
      x.strokeStyle = 'rgba(184,151,90,0.8)'; x.lineWidth = 1.5; x.strokeRect(22, 22, w - 44, h - 44);
      x.fillStyle = '#fff'; x.textAlign = 'left';
      x.font = '500 15px "DM Mono"'; x.fillText('GREETINGS FROM', 40, h - 92);
      x.font = 'italic 500 62px "Bodoni Moda"'; x.fillText(s.name, 36, h - 40);
      x.fillStyle = LINEN; x.fillRect(w - 100, 34, 62, 74);                    // stamp
      x.strokeStyle = GOLD; x.lineWidth = 2; x.strokeRect(w - 94, 40, 50, 62);
      x.fillStyle = PINE; x.font = '500 26px "Bodoni Moda"'; x.textAlign = 'center'; x.fillText(s.no, w - 69, 80);
    });
  }

  /* =============================================================
     1. The box
     ============================================================= */
  const W = 2.4, D = 1.7, H = 1.0, T = 0.05;     // width, depth, height, wall thickness

  function buildBox() {
    const g = new Group();
    const outer = mat(PINE, 0.5);
    const inner = mat('#efe6d2', 0.9);
    const front = new MeshStandardMaterial({ map: frontTex, roughness: 0.5 });

    // BoxGeometry takes one material per face, in this order: +x, -x, +y, -y, +z, -z
    const wall = (w, h, d, x, y, z, innerFace, printFace) => {
      const faces = Array(6).fill(outer);
      if (innerFace !== undefined) faces[innerFace] = inner;
      if (printFace !== undefined) faces[printFace] = front;
      const m = mesh(new BoxGeometry(w, h, d), faces);
      m.position.set(x, y, z);
      g.add(m);
    };
    wall(W, T, D, 0, T / 2, 0, 2);                             // floor (inside faces up)
    wall(W, H, T, 0, H / 2, D / 2 - T / 2, 5, 4);              // front (printed outside)
    wall(W, H, T, 0, H / 2, -D / 2 + T / 2, 4);                // back
    wall(T, H, D - 2 * T, W / 2 - T / 2, H / 2, 0, 1);         // right
    wall(T, H, D - 2 * T, -W / 2 + T / 2, H / 2, 0, 0);        // left

    // The lid hangs from a "pivot" on the back top edge. Rotating the
    // pivot swings the whole lid open like a real hinged box.
    const lw = W + 0.12, ld = D + 0.12, lt = 0.06, skirt = 0.26;
    const pivot = new Group();
    pivot.position.set(0, H + lt / 2, -ld / 2);
    g.add(pivot);
    const lid = new Group();
    lid.position.z = ld / 2;
    pivot.add(lid);

    const lidOuter = mat(PINE, 0.5);
    const lidTop = new MeshStandardMaterial({ map: lidTex, roughness: 0.45 });
    lid.add(mesh(new BoxGeometry(lw, lt, ld), [lidOuter, lidOuter, lidTop, inner, lidOuter, lidOuter]));
    const sy = lt / 2 - skirt / 2;
    [[lw, skirt, T, 0, sy, ld / 2 - T / 2], [lw, skirt, T, 0, sy, -ld / 2 + T / 2],
     [T, skirt, ld - 2 * T, lw / 2 - T / 2, sy, 0], [T, skirt, ld - 2 * T, -lw / 2 + T / 2, sy, 0]]
      .forEach(([w, h, d, x, y, z]) => { const m = mesh(new BoxGeometry(w, h, d), lidOuter); m.position.set(x, y, z); lid.add(m); });

    // Gold ribbon: over the lid, down its front and back, and down the box
    const ribbon = mat(GOLD, 0.3, 0.75);
    const rx = 0.62, rw = 0.2;
    const r1 = mesh(new BoxGeometry(rw, lt + 0.012, ld + 0.012), ribbon); r1.position.x = rx; lid.add(r1);
    [ld / 2 + 0.006, -ld / 2 - 0.006].forEach((z) => { const m = mesh(new BoxGeometry(rw, skirt, 0.012), ribbon); m.position.set(rx, sy, z); lid.add(m); });
    [D / 2 + 0.006, -D / 2 - 0.006].forEach((z) => { const m = mesh(new BoxGeometry(rw, H - skirt + 0.02, 0.012), ribbon); m.position.set(rx, (H - skirt) / 2, z); g.add(m); });

    // Wax seal sitting on the ribbon
    const sealSide = mat('#6e2320', 0.45);
    const seal = mesh(new CylinderGeometry(0.24, 0.26, 0.05, 48), [sealSide, new MeshStandardMaterial({ map: sealTex, roughness: 0.4 }), sealSide]);
    const sealY = lt / 2 + 0.025;
    seal.position.set(rx, sealY, 0.42);
    lid.add(seal);

    return { group: g, pivot, seal, sealY };
  }

  /* =============================================================
     2. The goods inside (Box No. 01, Savannah)
     ============================================================= */
  function buildItems() {
    const jar = () => { const g = new Group();
      g.add(mesh(new CylinderGeometry(0.17, 0.17, 0.34, 40), mat('#e0973a', 0.18, 0.05)));
      g.add(mesh(new CylinderGeometry(0.174, 0.174, 0.15, 40, 1, true), mat(LINEN, 0.85)));
      const l = mesh(new CylinderGeometry(0.18, 0.18, 0.07, 40), mat(GOLD, 0.3, 0.8)); l.position.y = 0.2; g.add(l); return g; };
    const coffee = () => { const g = new Group();
      g.add(mesh(new BoxGeometry(0.36, 0.5, 0.16), mat('#b99364', 0.9)));
      const f = mesh(new BoxGeometry(0.37, 0.07, 0.17), mat(PINE, 0.6)); f.position.y = 0.22; g.add(f);
      const lb = mesh(new BoxGeometry(0.22, 0.2, 0.01), mat(LINEN, 0.9)); lb.position.set(0, -0.03, 0.085); g.add(lb); return g; };
    const candle = () => { const g = new Group();
      g.add(mesh(new CylinderGeometry(0.17, 0.17, 0.2, 40), mat('#a9b0aa', 0.3, 0.75)));
      const w = mesh(new CylinderGeometry(0.155, 0.155, 0.012, 40), mat('#f4ead5', 0.9)); w.position.y = 0.1; g.add(w); return g; };
    const tin = () => { const g = new Group();
      g.add(mesh(new CylinderGeometry(0.22, 0.22, 0.12, 40), mat('#2c5240', 0.45, 0.3)));
      const b = mesh(new CylinderGeometry(0.224, 0.224, 0.03, 40), mat(GOLD, 0.3, 0.8)); b.position.y = 0.05; g.add(b); return g; };
    const print = () => mesh(new BoxGeometry(0.62, 0.012, 0.44), mat('#efe3c6', 0.9));
    const ticket = () => mesh(new BoxGeometry(0.42, 0.01, 0.2), mat(GOLD_LIGHT, 0.6));

    const V = (x, y, z) => new Vector3(x, y, z);
    // start = packed inside the box; end = floating above it; rot = final tilt
    return [
      { obj: jar(),    start: V(-0.62, 0.22, -0.28), end: V(-1.2, 1.6, 0.35),  rot: V(0.2, 0.8, -0.15), label: ['Peach & Vanilla Bean Preserves', 'Whitfield Pantry'] },
      { obj: coffee(), start: V(0.12, 0.3, -0.32),   end: V(-0.05, 2.0, -0.2),  rot: V(0.1, -0.5, 0.12), label: ['Chicory Morning Blend', 'Forsyth Lane Roasters'] },
      { obj: candle(), start: V(0.72, 0.15, 0.3),    end: V(1.15, 1.55, 0.4),    rot: V(0.35, 0.3, 0.18), label: ['Magnolia & Cedar Candle', 'Lantern & Lark'] },
      { obj: tin(),    start: V(-0.35, 0.11, 0.38),  end: V(-0.6, 1.3, 0.95),   rot: V(0.5, 0.9, 0.3) },
      { obj: print(),  start: V(0.3, 0.07, 0.15),    end: V(0.62, 1.3, 1.0),    rot: V(1.1, 0.2, -0.25) },
      { obj: ticket(), start: V(-0.1, 0.09, 0.0),    end: V(0.05, 1.05, 1.2),   rot: V(1.2, -0.4, 0.2) },
    ];
  }

  /* =============================================================
     3. Postcards
     ============================================================= */
  function buildCards() {
    const geo = new PlaneGeometry(1.16, 0.77);
    const back = new MeshStandardMaterial({ map: cardBackTex, roughness: 0.8 });
    const ends = [[-2.35, 1.55, -0.7, 0.45, 0.08], [2.3, 1.9, -0.9, -0.45, -0.06], [2.05, 0.6, 1.05, -0.4, 0.05]];
    return ['savannah', 'duluth', 'santafe'].map((key, i) => {
      const g = new Group();
      const f = new Mesh(geo, new MeshStandardMaterial({ map: cardFrontTex(SCENES[key]), roughness: 0.6 }));
      const b = new Mesh(geo, back); b.rotation.y = Math.PI;
      f.castShadow = b.castShadow = true;
      g.add(f, b);
      g.visible = false;
      const [x, y, z, ry, rz] = ends[i];
      return { g, end: new Vector3(x, y, z), ry, rz };
    });
  }

  /* =============================================================
     Scene, camera, lights
     ============================================================= */
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__canvas';
  canvas.setAttribute('aria-hidden', 'true');   // decorative: the same content is in the page text
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = NeutralToneMapping;     // keeps brand colors close to their true values

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);

  scene.add(new HemisphereLight('#fff4e0', '#0b1712', 1.1));
  const key = new DirectionalLight('#ffffff', 2.0);
  key.position.set(3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0006;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
  scene.add(key);
  const fill = new DirectionalLight('#ffffff', 0.45); fill.position.set(-5, 3, 3); scene.add(fill);
  const rim = new DirectionalLight('#e9c98a', 2.2); rim.position.set(-2, 4, -6); scene.add(rim);
  const spot = new SpotLight('#ffefd2', 80, 0, 0.45, 0.7, 2);
  spot.position.set(0, 9, 2.5); spot.target.position.set(0, 0.4, 0);
  scene.add(spot, spot.target);

  const ground = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const root = new Group();            // everything that turns with the mouse
  scene.add(root);
  const box = buildBox();
  root.add(box.group);
  const items = buildItems();
  items.forEach((it) => { it.obj.position.copy(it.start); root.add(it.obj); });
  const cards = buildCards();
  cards.forEach((c) => root.add(c.g));

  // Gold dust drifting through the spotlight
  const dustCount = 320;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 12;
    dustPos[i * 3 + 1] = Math.random() * 6 - 0.5;
    dustPos[i * 3 + 2] = Math.random() * -7 + 2;
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new BufferAttribute(dustPos, 3));
  const dust = new Points(dustGeo, new PointsMaterial({ color: new Color('#e9c98a'), size: 0.03, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(dust);

  /* ---------- Page elements this scene controls ---------- */
  const copy = stage.querySelector('.hero__copy');
  const reveal = stage.querySelector('.hero__reveal');
  const hint = stage.querySelector('.hero__hint');
  const bar = stage.querySelector('.hero__progress span');
  const layers = [...stage.querySelectorAll('[data-depth]')];
  const calloutBox = stage.querySelector('.hero__callouts');
  const callouts = items.filter((it) => it.label).map((it) => {
    const el = document.createElement('div');
    el.className = 'hero__callout';
    el.innerHTML = `<b>${it.label[0]}</b><span>${it.label[1]}</span>`;
    calloutBox.appendChild(el);
    return { it, el };
  });

  stage.insertBefore(canvas, stage.querySelector('.hero__grid'));
  hero.classList.add('is-3d');

  /* ---------- Layout: different framing for wide vs. narrow screens ---------- */
  let wide = true, dist = 6.6, spread = 1, offsetX = 0, lift = 0, sw = 1, sh = 1;
  function layout() {
    sw = stage.clientWidth; sh = stage.clientHeight;
    renderer.setSize(sw, sh, false);
    camera.aspect = sw / sh;
    camera.updateProjectionMatrix();
    const aspect = sw / sh;
    wide = sw >= 1024 && aspect > 1.1;
    dist = wide ? 6.6 : 6.6 * Math.min(2.3, 1.4 / aspect);  // pull back on tall screens so the box fits
    spread = wide ? 1 : Math.max(0.5, aspect * 0.75);     // pull floating items inward on phones
    offsetX = wide ? 1.35 : 0;                             // box sits right of the headline on desktop
    lift = wide ? 0.3 : 2.9;                               // on phones, frame the box below the headline
  }
  layout();
  new ResizeObserver(layout).observe(stage);

  /* ---------- Inputs: scroll progress and mouse ---------- */
  let p = 0, target = 0, mx = 0, my = 0, tmx = 0, tmy = 0, visible = true;

  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', onUpdate: (s) => { target = s.progress; } });
  } else {
    const onScroll = () => { const r = track.getBoundingClientRect(); target = clamp01(-r.top / (r.height - window.innerHeight)); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width) * 2 - 1;
    tmy = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  stage.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });
  // Stop drawing when the hero is off screen, to save battery
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);

  /* =============================================================
     4. The animation loop
     Progress p runs 0 → 1 across the hero's scroll distance:
       0.00–0.42  box glides to center, headline fades away
       0.02–0.20  wax seal lifts and spins
       0.18–0.46  lid swings open
       0.38–0.80  goods rise out and float
       0.56–0.95  postcards fly out
       0.82–0.94  closing line fades in
     ============================================================= */
  const look = new Vector3(), tmp = new Vector3();
  const start = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = (now - start) / 1000;

    // Ease toward the real values so motion feels smooth, never jumpy
    p += (target - p) * 0.08;
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;

    const slide = easeInOut(seg(p, 0.04, 0.42));
    root.position.x = offsetX * (1 - slide);
    root.rotation.y = -0.45 + Math.sin(t * 0.5) * 0.08 + mx * 0.45 + p * 0.4;
    root.rotation.x = my * 0.08;

    // Seal pops up and spins, then settles back down
    const s = seg(p, 0.02, 0.2);
    box.seal.position.y = box.sealY + Math.sin(s * Math.PI) * 0.4;
    box.seal.rotation.y = easeInOut(s) * Math.PI * 2;

    // Lid opens past vertical with a slight settle
    box.pivot.rotation.x = -easeBack(seg(p, 0.18, 0.46)) * 1.95;

    // Goods rise one after another, then bob gently and slowly turn
    items.forEach((it, i) => {
      const e = easeOut(seg(p, 0.38 + i * 0.045, 0.7 + i * 0.03));
      it.obj.position.set(
        lerp(it.start.x, it.end.x * spread, e),
        lerp(it.start.y, it.end.y, e) + Math.sin(t * 1.2 + i * 1.7) * 0.05 * e,
        lerp(it.start.z, it.end.z, e),
      );
      it.obj.rotation.set(it.rot.x * e, it.rot.y * e + t * 0.25 * e, it.rot.z * e);
    });

    // Postcards fly out, then turn slightly toward the cursor
    cards.forEach((c, i) => {
      const k = seg(p, 0.56 + i * 0.06, 0.88 + i * 0.03), e = easeOut(k);
      c.g.visible = k > 0;
      c.g.position.set(lerp(0, c.end.x * spread, e), lerp(0.5, c.end.y, e) + Math.sin(t * 1.1 + i) * 0.07 * e, lerp(0, c.end.z, e));
      c.g.scale.setScalar(0.15 + 0.85 * e);
      c.g.rotation.set(lerp(-Math.PI / 2, -0.05 + my * 0.15, e), lerp(0, c.ry, e) + mx * 0.3 * e, lerp(0, c.rz, e));
    });

    dust.rotation.y = t * 0.02 + mx * 0.08;
    dust.position.y = -p * 0.6;

    // Camera moves in and tilts down to look into the open box
    const cam = easeInOut(seg(p, 0.1, 0.7));
    camera.position.set(mx * 0.35, 2.0 + cam * 0.7 - my * 0.15, dist * (1 - cam * 0.14));
    look.set(0, 0.6 + lift * (1 - slide) + cam * 0.6, 0);
    camera.lookAt(look);
    renderer.render(scene, camera);

    // ---- Page elements ----
    const fade = seg(p, 0.03, 0.24);
    copy.style.opacity = String(1 - fade);
    copy.style.transform = `translateY(${-fade * 80}px)`;
    copy.style.visibility = fade >= 1 ? 'hidden' : 'visible';
    const rv = seg(p, 0.82, 0.94);
    reveal.style.opacity = String(rv);
    reveal.style.visibility = rv > 0 ? 'visible' : 'hidden';
    hint.style.opacity = String(1 - seg(p, 0, 0.04));
    bar.style.transform = `scaleX(${p.toFixed(4)})`;

    layers.forEach((el) => {
      const d = parseFloat(el.dataset.depth);
      el.style.transform = `translate3d(${-mx * d * 40}px, ${-my * d * 26 - p * d * 200}px, 0)`;
    });

    // Labels follow their item on screen (3D position → 2D pixels)
    const show = wide ? seg(p, 0.72, 0.84) : 0;   // too crowded on phones, so desktop only
    callouts.forEach(({ it, el }) => {
      it.obj.getWorldPosition(tmp);
      tmp.y += 0.3;
      tmp.project(camera);
      let x = (tmp.x * 0.5 + 0.5) * sw + 14;
      const y = (-tmp.y * 0.5 + 0.5) * sh - 10;
      x = Math.min(x, sw - (wide ? 220 : 170));
      el.style.opacity = String(show);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
  }
  requestAnimationFrame(frame);
}
