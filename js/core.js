'use strict';
/* 公共工具：three.js 加载、随机数、程序化贴图、几何批处理
   坐标约定（校园坐标系，单位：米）：
     X 轴 = 沿环市西路方向（指向东南），Y 轴 = 指向东北（校门/环市西路一侧）
     原点 = 百度地图“台山市鹏权中学”POI 点
   three.js 世界坐标：x = X，z = -Y，y = 高度 */
(function () {
  const PQ = window.PQ = { mats: {}, colliders: [], labels: [], plan: [], spots: [], trees: [] };

  PQ.loadThree = async function (onStatus) {
    if (window.THREE && window.THREE.WebGLRenderer) return window.THREE;   // 本地 vendor/three.global.js 已加载（离线可用）
    const v = '0.170.0', list = [];
    list.push(                                                             // 本地文件缺失时退回 CDN
      `https://fastly.jsdelivr.net/npm/three@${v}/build/three.module.min.js`,
      `https://cdnjs.cloudflare.com/ajax/libs/three.js/${v}/three.module.min.js`,
      `https://unpkg.com/three@${v}/build/three.module.min.js`,
      `https://registry.npmmirror.com/three/${v}/files/build/three.module.min.js`,
      `https://cdn.bootcdn.net/ajax/libs/three.js/${v}/three.module.min.js`,
      `https://cdn.jsdelivr.net/npm/three@${v}/build/three.module.min.js`);
    for (const u of list) {
      try {
        if (onStatus) onStatus('正在加载三维引擎 three.js …');
        const mod = await Promise.race([import(u), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
        if (mod && mod.WebGLRenderer) { window.THREE = mod; return mod; }
      } catch (e) { console.warn('three.js 加载失败，尝试下一个源：', u, e.message); }
    }
    throw new Error('无法加载 three.js，请检查网络连接后刷新页面。');
  };

  PQ.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  PQ.tex = function (w, h, draw, o) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = (o && o.clamp) ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = PQ.aniso || 4;
    return t;
  };

  /* 材质登记：tw/th 为贴图一次平铺对应的米数 */
  PQ.M = function (name, o) {
    const p = {};
    if (o.color !== undefined) p.color = o.color;
    if (o.map) p.map = o.map;
    if (o.transparent) { p.transparent = true; p.opacity = o.opacity === undefined ? 1 : o.opacity; }
    if (o.alphaTest) p.alphaTest = o.alphaTest;
    if (o.double) p.side = THREE.DoubleSide;
    let m;
    if (o.basic) m = new THREE.MeshBasicMaterial(p);
    else if (o.phong) { p.shininess = o.shininess || 70; p.specular = new THREE.Color(o.specular || 0x777777); m = new THREE.MeshPhongMaterial(p); }
    else m = new THREE.MeshLambertMaterial(p);
    if (o.emissive && m.emissive) m.emissive = new THREE.Color(o.emissive);
    if (o.po) { m.polygonOffset = true; m.polygonOffsetFactor = -o.po; m.polygonOffsetUnits = -o.po * 4; }   // 贴地图层防止深度冲突
    const e = { m, tw: o.tw || 1, th: o.th || o.tw || 1, name, noShadow: !!o.noShadow };
    PQ.mats[name] = e;
    return e;
  };

  class Batch {
    constructor() { this.groups = new Map(); this.xf = null; }
    _g(mat) { let o = this.groups.get(mat); if (!o) { o = { p: [], n: [], u: [], i: [] }; this.groups.set(mat, o); } return o; }
    /* 绕 (X,Y) 逆时针旋转 deg 度（校园坐标系俯视）；不带参数则取消 */
    rot(X, Y, deg) {
      if (deg === undefined) { this.xf = null; return; }
      const a = -deg * Math.PI / 180;
      this.xf = { cx: X, cz: -Y, c: Math.cos(a), s: Math.sin(a) };
    }
    quad(mat, a, b, c, d, n, uv) {
      const o = this._g(mat), base = o.p.length / 3, xf = this.xf, pts = [a, b, c, d];
      for (let k = 0; k < 4; k++) {
        let x = pts[k][0], y = pts[k][1], z = pts[k][2], nx, ny, nz;
        if (n.length === 12) { nx = n[k * 3]; ny = n[k * 3 + 1]; nz = n[k * 3 + 2]; } else { nx = n[0]; ny = n[1]; nz = n[2]; }
        if (xf) {
          const dx = x - xf.cx, dz = z - xf.cz;
          x = xf.cx + dx * xf.c - dz * xf.s; z = xf.cz + dx * xf.s + dz * xf.c;
          const tx = nx * xf.c - nz * xf.s; nz = nx * xf.s + nz * xf.c; nx = tx;
        }
        o.p.push(x, y, z); o.n.push(nx, ny, nz);
      }
      for (let k = 0; k < 8; k++) o.u.push(uv[k]);
      o.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    tri(mat, a, b, c) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      this.quad(mat, a, b, c, c, [nx, ny, nz], [0, 0, 1, 0, .5, 1, .5, 1]);
    }
    /* 轴对齐长方体。m 可为单一材质，或 {N,S,E,W,T,B} 各面材质（缺省的面不生成）
       N=+Y 面（朝环市西路），S=-Y，E=+X，W=-X。o.fit：横向平铺取整；o.full：整面 0..1；o.vb：纵向贴图起算高度 */
    box(m, X0, X1, Y0, Y1, h0, h1, o) {
      o = o || {};
      const f = (m && m.m) ? { N: m, S: m, E: m, W: m, T: m, B: o.bottom ? m : null } : m;
      const x0 = X0, x1 = X1, zN = -Y1, zS = -Y0, lx = X1 - X0, ly = Y1 - Y0, vb = o.vb || 0;
      const side = (mat, a, b, c, d, n, len) => {
        if (!mat) return;
        let u1 = o.fit ? Math.max(1, Math.round(len / mat.tw)) : len / mat.tw;
        let v0 = (h0 - vb) / mat.th, v1 = (h1 - vb) / mat.th;
        if (o.full) { u1 = 1; v0 = 0; v1 = 1; }
        this.quad(mat, a, b, c, d, n, [0, v0, u1, v0, u1, v1, 0, v1]);
      };
      side(f.N, [x1, h0, zN], [x0, h0, zN], [x0, h1, zN], [x1, h1, zN], [0, 0, -1], lx);
      side(f.S, [x0, h0, zS], [x1, h0, zS], [x1, h1, zS], [x0, h1, zS], [0, 0, 1], lx);
      side(f.E, [x1, h0, zS], [x1, h0, zN], [x1, h1, zN], [x1, h1, zS], [1, 0, 0], ly);
      side(f.W, [x0, h0, zN], [x0, h0, zS], [x0, h1, zS], [x0, h1, zN], [-1, 0, 0], ly);
      if (f.T) {
        const t = f.T;
        const uv = o.full ? [0, 0, 1, 0, 1, 1, 0, 1] : [X0 / t.tw, Y0 / t.th, X1 / t.tw, Y0 / t.th, X1 / t.tw, Y1 / t.th, X0 / t.tw, Y1 / t.th];
        this.quad(t, [x0, h1, zS], [x1, h1, zS], [x1, h1, zN], [x0, h1, zN], [0, 1, 0], uv);
      }
      if (f.B) {
        const t = f.B;
        this.quad(t, [x0, h0, zN], [x1, h0, zN], [x1, h0, zS], [x0, h0, zS], [0, -1, 0],
          [X0 / t.tw, Y1 / t.th, X1 / t.tw, Y1 / t.th, X1 / t.tw, Y0 / t.th, X0 / t.tw, Y0 / t.th]);
      }
    }
    flat(m, X0, X1, Y0, Y1, h, o) { this.box({ T: m }, X0, X1, Y0, Y1, h, h, o); }
    poly(m, pts, h) {
      const o = this._g(m), base = o.p.length / 3;
      let contour = pts.map(p => new THREE.Vector2(p[0], p[1]));
      if (THREE.ShapeUtils.isClockWise(contour)) contour = contour.reverse();
      const tris = THREE.ShapeUtils.triangulateShape(contour, []);
      for (const p of contour) { o.p.push(p.x, h, -p.y); o.n.push(0, 1, 0); o.u.push(p.x / m.tw, p.y / m.th); }
      for (const t of tris) o.i.push(base + t[0], base + t[1], base + t[2]);
    }
    line(m, Xa, Ya, Xb, Yb, w, h) {
      const dx = Xb - Xa, dy = Yb - Ya, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
      this.quad(m, [Xa - nx, h, -(Ya - ny)], [Xb - nx, h, -(Yb - ny)], [Xb + nx, h, -(Yb + ny)], [Xa + nx, h, -(Ya + ny)], [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
    }
    rectLine(m, X0, X1, Y0, Y1, w, h) {
      this.line(m, X0, Y0, X1, Y0, w, h); this.line(m, X0, Y1, X1, Y1, w, h);
      this.line(m, X0, Y0, X0, Y1, w, h); this.line(m, X1, Y0, X1, Y1, w, h);
    }
    arc(m, cx, cy, r, a0, a1, w, h, seg) {
      seg = seg || 24;
      for (let i = 0; i < seg; i++) {
        const t0 = a0 + (a1 - a0) * i / seg, t1 = a0 + (a1 - a0) * (i + 1) / seg;
        this.line(m, cx + r * Math.cos(t0), cy + r * Math.sin(t0), cx + r * Math.cos(t1), cy + r * Math.sin(t1), w, h);
      }
    }
    disc(m, cx, cy, r, h, seg, a0, a1) {
      seg = seg || 28; a0 = a0 || 0; a1 = a1 === undefined ? Math.PI * 2 : a1;
      const pts = []; const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
      for (let i = 0; i < (full ? seg : seg + 1); i++) { const t = a0 + (a1 - a0) * i / seg; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
      this.poly(m, pts, h);
    }
    cyl(m, X, Y, r, h0, h1, n, capM, a0, a1) {
      n = n || 10; a0 = a0 || 0; a1 = a1 === undefined ? Math.PI * 2 : a1;
      for (let i = 0; i < n; i++) {
        const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
        const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
        const u0 = r * (t0 - a0) / m.tw, u1 = r * (t1 - a0) / m.tw;
        this.quad(m, [X + r * c0, h0, -(Y + r * s0)], [X + r * c1, h0, -(Y + r * s1)], [X + r * c1, h1, -(Y + r * s1)], [X + r * c0, h1, -(Y + r * s0)],
          [c0, 0, -s0, c1, 0, -s1, c1, 0, -s1, c0, 0, -s0], [u0, h0 / m.th, u1, h0 / m.th, u1, h1 / m.th, u0, h1 / m.th]);
      }
      if (capM) this.disc(capM, X, Y, r, h1, n, a0, a1);
    }
    pyr(m, X0, X1, Y0, Y1, h0, h1) {
      const x0 = X0, x1 = X1, zN = -Y1, zS = -Y0, ap = [(X0 + X1) / 2, h1, -(Y0 + Y1) / 2];
      this.tri(m, [x0, h0, zS], [x1, h0, zS], ap); this.tri(m, [x1, h0, zS], [x1, h0, zN], ap);
      this.tri(m, [x1, h0, zN], [x0, h0, zN], ap); this.tri(m, [x0, h0, zN], [x0, h0, zS], ap);
    }
    build(parent, o) {
      o = o || {};
      for (const [mat, g] of this.groups) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.u, 2));
        geo.setIndex(g.i);
        const mesh = new THREE.Mesh(geo, mat.m);
        mesh.castShadow = o.cast !== false && !mat.noShadow;
        mesh.receiveShadow = true;
        mesh.name = mat.name;
        if (mat.m.transparent) mesh.renderOrder = 2;
        parent.add(mesh);
      }
    }
  }
  PQ.Batch = Batch;

  /* 文字贴图：chars 为字符串；o.vertical 竖排 */
  PQ.textTex = function (text, o) {
    const n = text.length, cell = o.cell || 128, pad = o.pad || 0;
    const w = o.vertical ? cell : cell * n + pad * 2, h = o.vertical ? cell * n + pad * 2 : cell;
    return PQ.tex(w, h, (g) => {
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
      if (o.paint) o.paint(g, w, h);
      g.font = (o.weight || 'bold') + ' ' + Math.round(cell * (o.size || 0.78)) + 'px ' + (o.font || '"KaiTi","STKaiti","楷体","FangSong",serif');
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const x = o.vertical ? cell / 2 : pad + cell * (i + .5), y = o.vertical ? pad + cell * (i + .5) : cell / 2 + cell * 0.03;
        if (o.shadow) { g.fillStyle = o.shadow; g.fillText(text[i], x + cell * .025, y + cell * .03); }
        g.fillStyle = o.color || '#fff'; g.fillText(text[i], x, y);
      }
    }, { clamp: true });
  };
})();
