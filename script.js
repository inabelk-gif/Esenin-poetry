// Рисуем берёзы по бокам и раскачиваем ветки с листьями при прокрутке
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 340, H = 1000;
  const LEAF = 'images/leaves-cut.png';
  const LEAF_RATIO = 390 / 355;

  // Простой генератор случайных чисел с seed — чтобы берёзы были одинаковыми при каждой загрузке
  function rng(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  // Точка и касательная на квадратичной кривой
  function bez(p0, c, p2, t) {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y,
      dx: 2 * u * (c.x - p0.x) + 2 * t * (p2.x - c.x),
      dy: 2 * u * (c.y - p0.y) + 2 * t * (p2.y - c.y)
    };
  }

  const swayers = [];
  const trees = [];

  function drawBirch(container, seed) {
    const r = rng(seed);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMax slice' });
    container.appendChild(svg);

    const trunks = [
      { bx: 196, tx: 110, cx: 210, w0: 34, w1: 5 },
      { bx: 214, tx: 200, cx: 236, w0: 26, w1: 4 },
      { bx: 228, tx: 280, cx: 230, w0: 22, w1: 4 }
    ];

    // Всё дерево целиком — чтобы раскачивать его вместе со стволами
    const tree = el('g', {}, svg);
    trees.push({ g: tree, px: 212, py: H, phase: seed % 7 });
    const branchLayer = el('g', {}, tree);
    const trunkLayer = el('g', {}, tree);

    trunks.forEach((tr, ti) => {
      const p0 = { x: tr.bx, y: H + 20 }, c = { x: tr.cx, y: H * 0.5 }, p2 = { x: tr.tx, y: -60 };
      const width = t => tr.w0 + (tr.w1 - tr.w0) * Math.pow(t, 0.8);
      const N = 50, left = [], right = [], mid = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = bez(p0, c, p2, t);
        const len = Math.hypot(p.dx, p.dy), nx = -p.dy / len, ny = p.dx / len, w = width(t) / 2;
        left.push([p.x - nx * w, p.y - ny * w]);
        right.push([p.x + nx * w, p.y + ny * w]);
        mid.push([p.x + nx * w * 0.15, p.y + ny * w * 0.15]);
      }
      const poly = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      // Ствол
      el('polygon', { points: poly(left.concat(right.slice().reverse())), fill: '#f5f2ea' }, trunkLayer);
      // Тень с одной стороны
      el('polygon', { points: poly(mid.concat(right.slice().reverse())), fill: '#cfc8b8', opacity: .55 }, trunkLayer);

      // (тёмную кору у основания убрали; пропускаем её случайные числа, чтобы форма деревьев не изменилась)
      for (let i = 0; i < 36; i++) r();

      // Чёрные чечевички — характерные полоски берёзы
      const marks = 34 + Math.floor(r() * 10);
      for (let i = 0; i < marks; i++) {
        const t = 0.1 + r() * 0.85, p = bez(p0, c, p2, t), w = width(t);
        const off = (r() - 0.5) * w * 0.5, len = w * (0.25 + r() * 0.5), th = 1 + r() * 2.5 * (1 - t);
        const x1 = p.x + off - len / 2, x2 = p.x + off + len / 2;
        el('path', {
          d: `M${x1.toFixed(1)},${p.y.toFixed(1)} Q${p.x + off},${(p.y + th).toFixed(1)} ${x2.toFixed(1)},${p.y.toFixed(1)}`,
          stroke: '#2b2622', 'stroke-width': th.toFixed(1), 'stroke-linecap': 'round', fill: 'none', opacity: (0.55 + r() * 0.4).toFixed(2)
        }, trunkLayer);
      }

      // Ветви с листьями
      const nb = 5 + Math.floor(r() * 3);
      for (let i = 0; i < nb; i++) {
        const t = 0.3 + (i / nb) * 0.62 + r() * 0.05, p = bez(p0, c, p2, t);
        const dir = (i + ti) % 3 === 0 ? 1 : -1; // в основном наружу (влево)
        const len = 70 + r() * 90, ox = p.x, oy = p.y;
        const ex = ox + dir * len, ey = oy - 30 + r() * 70;
        const cxx = ox + dir * len * 0.5, cyy = oy - 40 - r() * 30;

        const g = el('g', {}, branchLayer);
        el('path', {
          d: `M${ox},${oy} Q${cxx},${cyy} ${ex},${ey}`,
          stroke: '#3b2f29', 'stroke-width': (2.6 * (1 - t) + 1).toFixed(1), fill: 'none', 'stroke-linecap': 'round'
        }, g);
        // Тонкие свисающие веточки
        for (let k = 0; k < 4; k++) {
          const s = 0.4 + k * 0.18, sx = ox + (ex - ox) * s, sy = oy + (ey - oy) * s - 16 * Math.sin(Math.PI * s);
          el('path', {
            d: `M${sx.toFixed(1)},${sy.toFixed(1)} q${dir * 12},${10} ${dir * (8 + r() * 14)},${30 + r() * 30}`,
            stroke: '#4a3a32', 'stroke-width': .9, fill: 'none', opacity: .8
          }, g);
        }
        // Листья
        const leaves = 1 + Math.floor(r() * 2);
        for (let k = 0; k < leaves; k++) {
          const s = k === 0 ? 1 : 0.6, lx = ox + (ex - ox) * s, ly = oy + (ey - oy) * s - (k ? 10 : 0);
          const size = 70 + r() * 60, h = size * LEAF_RATIO;
          const ang = dir < 0 ? -(110 + r() * 80) : (110 + r() * 80);
          el('image', {
            href: LEAF, width: size.toFixed(0), height: h.toFixed(0),
            x: (lx - size * 0.55).toFixed(1), y: (ly - h).toFixed(1),
            transform: `rotate(${ang.toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})`
          }, g);
        }
        swayers.push({ g, ox, oy, phase: r() * Math.PI * 2, amp: 2 + r() * 3, dir });
      }
    });

    // Крона — отдельные пучки листьев наверху
    const crown = el('g', {}, tree);
    for (let i = 0; i < 6; i++) {
      const lx = 60 + r() * 240, ly = 60 + r() * 260, size = 80 + r() * 70, h = size * LEAF_RATIO;
      const g = el('g', {}, crown);
      el('image', {
        href: LEAF, width: size.toFixed(0), height: h.toFixed(0),
        x: (lx - size * 0.55).toFixed(1), y: (ly - h).toFixed(1),
        transform: `rotate(${(150 + r() * 60).toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})`
      }, g);
      swayers.push({ g, ox: lx, oy: ly, phase: r() * Math.PI * 2, amp: 3 + r() * 3, dir: -1 });
    }
  }

  drawBirch(document.querySelector('.birch--left'), 1913);
  drawBirch(document.querySelector('.birch--right'), 1924);

  // Покачивание при прокрутке
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastY = window.scrollY, velocity = 0, gust = 0;

  function frame(time) {
    const y = window.scrollY;
    velocity = y - lastY;
    lastY = y;
    // порыв «ветра» от скорости прокрутки, плавно затухает
    gust += (Math.max(-40, Math.min(40, velocity)) - gust) * 0.08;
    const breeze = reduce ? 0 : Math.sin(time / 1800);

    // Стволы гнутся от основания и ходят влево-вправо
    for (const t of trees) {
      const bend = 4 * Math.sin(y / 260 + t.phase) + gust * 0.18 + breeze * 1.2;
      const shift = 10 * Math.sin(y / 340 + t.phase);
      t.g.setAttribute('transform',
        `translate(${(t.px + shift).toFixed(2)} ${t.py}) skewX(${bend.toFixed(2)}) translate(${-t.px} ${-t.py})`);
    }

    for (const s of swayers) {
      const a = s.amp * Math.sin(y / 140 + s.phase) + gust * 0.25 * s.dir + breeze * 0.6;
      const dy = Math.sin(y / 220 + s.phase) * 6;
      s.g.setAttribute('transform', `translate(0 ${dy.toFixed(2)}) rotate(${a.toFixed(2)} ${s.ox} ${s.oy})`);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
