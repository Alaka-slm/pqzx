'use strict';
/* 台山市鹏权中学 校园模型数据与建模
   平面尺寸来自高德/百度卫星图量测（校园坐标系见 core.js），外观参考公开实景照片。 */
(function () {
  const PQ = window.PQ;

  /* ---------------- 地形：校园以南、西南为山林 ---------------- */
  const FLAT = [[-520, 520, -20, 520], [-122, 182, -130, -20], [-190, -122, -126, -20], [182, 520, -70, -20], [-520, -190, -45, -20]];
  const HILLS = [[70, -255, 44, 150], [-60, -240, 32, 120], [-230, -215, 34, 130], [220, -215, 26, 120], [380, -330, 40, 200], [-400, -330, 45, 220]];
  const hill = PQ.hillAt = function (X, Y) {
    let d = 1e9;
    for (const r of FLAT) { const dx = Math.max(r[0] - X, 0, X - r[1]), dy = Math.max(r[2] - Y, 0, Y - r[3]); d = Math.min(d, Math.hypot(dx, dy)); }
    if (d <= 0) return 0;
    const t = Math.min(1, d / 60), s = t * t * (3 - 2 * t);
    let h = 1.5 + 1.5 * Math.sin(X * 0.05) * Math.cos(Y * 0.043);
    for (const k of HILLS) h += k[2] * Math.exp(-1.6 * ((X - k[0]) ** 2 + (Y - k[1]) ** 2) / (k[3] * k[3]));
    return s * h;
  };

  /* ---------------- 拔高区（按需求设计，非实测） ----------------
     运动场地（新建）和第二教学楼、科艺楼一带整体比田径场、第一教学楼地面高 RH 米。
     - 第一教学楼左右两侧的路是坡道：右侧坡底在主干道路口（X=25），左侧坡底在跑道外侧（X=8）；左侧坡到楼间位置（X=-57.5）到顶，右侧坡到科艺楼近端（X=-65）到顶，之后是平路
     - 第一教学楼正后方（X -57 起）到后面两栋楼之间是一整段草坡，坡顶 X = xTop(Y) */
  const RH = PQ.RH = 2.5;
  const rampS = PQ.rampS = X => RH * Math.min(1, Math.max(0, (8 - X) / 65.5));     // 左侧坡道：坡底 X=8（避开跑道）
  const rampN = PQ.rampN = X => RH * Math.min(1, Math.max(0, (25 - X) / 90));
  const xTop = Y => Y <= 33 ? -73 : Y >= 41 ? -65 : -73 + (Y - 33);
  function raisedAt(X, Y) {
    if (X > 25 || X < -185.2) return 0;
    if (Y >= -27 && Y <= -17) return rampS(X);
    if (Y >= 98 && Y <= 112.2) return (X < -153.2 || (X > 5 && Y > 108)) ? 0 : rampN(X);
    if (Y < -27) return ((X >= -120.2 && X <= -32 && Y >= -102.2) || (X < -120 && Y >= -29.2)) ? RH : 0;
    if (Y > -17 && Y < 98) {
      const xt = xTop(Y);
      if (X <= xt) return X >= (Y < 33 ? -185.2 : -153.2) ? RH : 0;
      if (X < -57) return RH * (-57 - X) / (-57 - xt);
    }
    return 0;
  }
  PQ.heightAt = function (X, Y) { const r = raisedAt(X, Y); return r > 0 ? r : hill(X, Y); };

  /* ---------------- 材质与程序化贴图 ---------------- */
  PQ.makeMats = function () {
    const R = PQ.rng(11), tex = PQ.tex, M = PQ.M;
    const noise = (base, cols, n, s) => (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; g.globalAlpha = .2 + R() * .35; const r = (.5 + R()) * s; g.fillRect(R() * w, R() * h, r, r); }
      g.globalAlpha = 1;
    };
    const grid = (base, line, step, alpha, sp) => (g, w, h) => {
      noise(base, sp || [base], sp ? 900 : 0, 3)(g, w, h);
      g.strokeStyle = line; g.globalAlpha = alpha; g.lineWidth = 1;
      for (let x = 0; x < w; x += step) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
      for (let y = 0; y < h; y += step) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
      g.globalAlpha = 1;
    };
    const N = (name, base, cols, n, s, tw, o) => M(name, Object.assign({ map: tex(256, 256, noise(base, cols, n, s)), tw }, o || {}));
    const Gd = (name, base, line, step, a, tw, sp, o) => M(name, Object.assign({ map: tex(256, 256, grid(base, line, step, a, sp)), tw }, o || {}));
    const C = (name, color, o) => M(name, Object.assign({ color }, o || {}));

    // 地面
    N('grass', '#5f8040', ['#52733a', '#6b8c47', '#5a7a3c', '#74914f'], 2600, 5, 18);
    N('lawn', '#6ea544', ['#62983c', '#7cb24e', '#88bb58'], 2600, 4, 10, { po: 1 });
    N('hedge', '#4b8530', ['#3f7628', '#5a9638', '#447d2c'], 2200, 4, 3);
    N('hedgeY', '#a8c43c', ['#98b834', '#b8cf48', '#8fae30'], 2200, 4, 3);
    N('dirt', '#ab9069', ['#9f845f', '#b89c74', '#96805c'], 2400, 5, 12, { po: 1 });
    N('asphalt', '#404245', ['#38393c', '#48494c', '#434548'], 2600, 3, 10, { po: 2 });
    N('city', '#8d8c86', ['#85847e', '#96958f', '#7f7e78'], 2000, 5, 24, { po: 1 });
    Gd('conc', '#bdbab1', '#8f8c84', 128, .55, 8, ['#b5b2a9', '#c4c1b8'], { po: 2 });
    Gd('granite', '#aeadaa', '#7e7d7a', 64, .6, 4, ['#a5a4a1', '#b6b5b2'], { po: 3 });
    N('granR', '#ad6a5c', ['#a36153', '#b77365'], 1500, 3, 4, { po: 4 });
    Gd('deck', '#d9d0be', '#b3aa98', 32, .5, 2, null, { po: 2 });
    N('track', '#b9462f', ['#b0402a', '#c24e36', '#a83c28'], 2400, 2, 6, { po: 4 });
    N('trackD', '#a9503a', ['#a04934', '#b25840'], 2000, 2, 6, { po: 3 });
    M('pitch', { map: tex(256, 256, (g, w, h) => { noise('#5d9a3b', ['#56923a', '#64a040'], 1800, 3)(g, w, h); g.globalAlpha = .28; g.fillStyle = '#3f7a2c'; g.fillRect(0, 0, w / 2, h); g.globalAlpha = 1; }), tw: 11, po: 4 });
    N('sand', '#d9c07a', ['#cfb56e', '#e2ca86', '#c9ad64', '#dcc47f'], 2600, 3, 6, { po: 3 });
    M('pitch2', { map: tex(256, 256, (g, w, h) => { noise('#5d9a3b', ['#56923a', '#64a040'], 1800, 3)(g, w, h); g.globalAlpha = .28; g.fillStyle = '#3f7a2c'; g.fillRect(0, 0, w, h / 2); g.globalAlpha = 1; }), tw: 10, po: 3 });
    N('apron', '#a9bfa6', ['#a0b69d', '#b2c7af'], 1800, 4, 8, { po: 2 });
    N('courtG', '#3f8f5e', ['#3a8756', '#459764'], 1200, 3, 6, { po: 3 });
    N('courtR', '#b5563f', ['#ad4f39', '#bd5e47'], 1200, 3, 6, { po: 4 });
    C('white', 0xf2f2ee, { noShadow: true, po: 6 }); C('yellow', 0xe4c02a, { noShadow: true, po: 6 });
    M('water', { map: tex(256, 256, (g, w, h) => { g.fillStyle = '#2f9db6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8fe0ee'; g.globalAlpha = .35; for (let i = 0; i < 90; i++) { g.beginPath(); const x = R() * w, y = R() * h; g.moveTo(x, y); g.quadraticCurveTo(x + 12, y + (R() - .5) * 10, x + 26, y + (R() - .5) * 6); g.stroke(); } g.globalAlpha = 1; }), tw: 7, phong: true, shininess: 120, transparent: true, opacity: .9, noShadow: true, po: 5 });
    Gd('poolTile', '#8fd3e6', '#5fa9c0', 32, .7, 2, null, { po: 3 });
    // 建筑通用
    N('roof', '#8c8e8f', ['#838586', '#959798', '#7c7e7f'], 2400, 4, 10);
    N('roofW', '#dcddd9', ['#d2d3cf', '#e6e7e3'], 1500, 4, 10);
    M('roofB', { map: tex(64, 64, (g, w, h) => { g.fillStyle = '#4f7fc0'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f6aa6'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h); }), tw: 3 });
    M('roofR', { map: tex(64, 64, (g, w, h) => { g.fillStyle = '#a5503d'; g.fillRect(0, 0, w, h); g.fillStyle = '#8c4030'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2); }), tw: 2 });
    M('roofT', { map: tex(64, 64, (g, w, h) => { g.fillStyle = '#5d6b78'; g.fillRect(0, 0, w, h); g.fillStyle = '#4b5864'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2); }), tw: 2 });
    Gd('wWhite', '#edeae3', '#c9c5bc', 16, .5, 2);
    Gd('wPink', '#dca690', '#c08e79', 16, .5, 2);
    Gd('wCream', '#e9dfc6', '#cdc3aa', 16, .5, 2);
    Gd('wGrey', '#c8c9c6', '#a9aaa7', 16, .5, 2);
    Gd('retain', '#a39e94', '#77726a', 32, .6, 4, ['#9a958b', '#aca79d']);
    C('wTan', 0xdcb891); C('wRed', 0xb24a3b); C('wDark', 0x555b63); C('wRedDark', 0x5e231d);
    C('slab', 0xe4e1d9); C('ceil', 0xd2cfc8); N('cfloor', '#b9a58f', ['#b09c86', '#c2ae98'], 1200, 2, 3); C('col', 0xefece6);
    C('steel', 0xc2c9ce, { phong: true }); C('granDark', 0x55585c); N('stone', '#8f8a80', ['#7f7a70', '#a09b90', '#6f6b63'], 1500, 5, 3);
    C('wood', 0x8a5a3a); C('red', 0xc0392b); C('gold', 0xd8b24a); C('lamp', 0xfff1b8, { basic: true, noShadow: true });
    C('stR', 0xc8402f, { po: 6 }); C('stY', 0xe2bf3a); C('stG', 0x3f9a58); C('hoop', 0xe0622a); C('tire', 0x1d1e20);
    C('carW', 0xf2f2f2, { phong: true }); C('carK', 0x2b2d30, { phong: true }); C('carR', 0xb3261e, { phong: true }); C('carS', 0xaeb4ba, { phong: true }); C('carB', 0x2f5d9e, { phong: true });
    C('carGlass', 0x27323a, { phong: true, shininess: 120 });

    /* ---- 立面贴图：一块 = 一个开间 × 一层 ---- */
    const glassG = (g, x, y, w, h, c0, c1) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    const win = (g, x, y, w, h, panes, o) => {
      o = o || {}; g.fillStyle = o.frame || '#e3e7e8'; g.fillRect(x, y, w, h);
      const pw = (w - 3) / panes;
      for (let i = 0; i < panes; i++) glassG(g, x + 3 + i * pw, y + 3, pw - 3, h - 6, o.c0 || '#7aa9b9', o.c1 || '#3f6b7c');
      if (o.transom) { g.fillStyle = o.frame || '#e3e7e8'; g.fillRect(x, y + h * o.transom, w, 3); }
      g.globalAlpha = .16; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + w * .12, y + h); g.lineTo(x + w * .42, y); g.lineTo(x + w * .58, y); g.lineTo(x + w * .28, y + h); g.fill(); g.globalAlpha = 1;
    };
    const wallBase = (g, w, h, base, line) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = line; g.globalAlpha = .35; g.lineWidth = 1;
      for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
      for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
      g.globalAlpha = 1;
    };
    const F = (name, tw, th, paint, o) => M(name, Object.assign({ map: tex(256, 256, paint), tw, th }, o || {}));
    // 老教学楼：白色面砖 + 窗下粉色横带
    F('faCls', 4.5, 3.6, (g, w, h) => { wallBase(g, w, h, '#edeae3', '#c9c5bc'); g.fillStyle = '#dca690'; g.fillRect(0, 186, w, 70); g.fillStyle = '#f6f4ef'; g.fillRect(0, 183, w, 6); win(g, 26, 40, 204, 145, 4, { transom: .3 }); });
    // 外廊内墙：门 + 高窗
    F('faCor', 4.5, 3.6, (g, w, h) => { wallBase(g, w, h, '#f0ede6', '#d6d2c9'); g.fillStyle = '#d5e0d0'; g.fillRect(0, 171, w, 85); g.fillStyle = '#7d5a44'; g.fillRect(20, 100, 54, 156); g.fillStyle = '#6a4a37'; g.fillRect(24, 104, 46, 148); glassG(g, 34, 116, 26, 40, '#8fb7c4', '#56808f'); win(g, 20, 66, 54, 30, 1); win(g, 108, 58, 128, 96, 3); });
    // 东侧综合楼：粉色墙面
    F('faE2', 4.5, 3.5, (g, w, h) => { wallBase(g, w, h, '#e2aa94', '#c9927c'); g.fillStyle = '#f1eee7'; g.fillRect(0, 236, w, 20); g.fillRect(0, 0, w, 10); win(g, 40, 60, 176, 116, 4, { transom: .3 }); });
    F('faCanteen', 4.75, 4.5, (g, w, h) => { g.fillStyle = '#e9e7e2'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9785a'; g.fillRect(0, 0, w, 30); win(g, 8, 40, 240, 190, 4, { frame: '#3c4248', c0: '#9ac6d6', c1: '#4f8196', transom: .25 }); g.fillStyle = '#8f8f8a'; g.fillRect(0, 236, w, 20); });
    F('faGlass', 3, 3.6, (g, w, h) => { glassG(g, 0, 0, w, h, '#6fb1c4', '#3a7a90'); g.fillStyle = '#e9eef0'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 3, h); g.fillRect(0, 0, w, 4); g.fillRect(0, 150, w, 3); g.globalAlpha = .14; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h); g.lineTo(110, 0); g.lineTo(170, 0); g.lineTo(60, h); g.fill(); g.globalAlpha = 1; }, { phong: true, shininess: 110 });
    // 周边城市建筑
    ['#e6dcc8', '#d9d6cf', '#e8d2b0', '#dcc4bd'].forEach((c, i) => F('faRes' + i, 3.6, 3.0, (g, w, h) => { wallBase(g, w, h, c, '#00000030'); win(g, 30, 70, 110, 110, 2, { c0: '#6f97ab', c1: '#3e6073' }); g.fillStyle = '#00000022'; g.fillRect(160, 60, 80, 196); g.fillStyle = '#cfcfc8'; g.fillRect(160, 170, 80, 86); g.fillStyle = '#e8e8e2'; g.fillRect(176, 196, 34, 24); g.fillStyle = '#00000018'; g.fillRect(0, 250, w, 6); }));
    F('faShed', 4, 4, (g, w, h) => { g.fillStyle = '#cfd3d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8bcc0'; for (let x = 0; x < w; x += 10) g.fillRect(x, 0, 2, h); g.fillStyle = '#7f8b96'; g.fillRect(40, 150, 70, 106); });
    F('faVilla', 4, 3, (g, w, h) => { wallBase(g, w, h, '#f0ebe0', '#d9d3c6'); win(g, 60, 70, 136, 120, 3, { c0: '#7da3b4', c1: '#44687a' }); });
    // 学生宿舍（7层）正立面：4个开间、土黄色壁柱
    M('faE1', { tw: 47.5, th: 23.1, map: tex(1024, 512, (g, w, h) => {
      const fhp = h / 7; g.fillStyle = '#e9e8e3'; g.fillRect(0, 0, w, h);
      for (let b = 0; b < 4; b++) {
        const x0 = b * 256;
        for (let f = 0; f < 6; f++) {
          const y = f * fhp; g.fillStyle = '#e6c3a6'; g.fillRect(x0 + 40, y + fhp - 20, 216, 20);
          for (let k = 0; k < 2; k++) { const wx = x0 + 58 + k * 100; g.fillStyle = '#f3f3f0'; g.fillRect(wx, y + 12, 82, fhp - 34); g.fillStyle = '#3e5560'; g.fillRect(wx + 3, y + 15, 36, fhp - 40); g.fillRect(wx + 43, y + 15, 36, fhp - 40); if (R() < .6) { g.fillStyle = ['#c9d7e8', '#e8d0c9', '#d7e8c9', '#f0f0f0'][(R() * 4) | 0]; g.fillRect(wx + 8 + R() * 50, y + 26, 14, 20); } }
        }
        g.fillStyle = '#dfb48f'; g.fillRect(x0, 0, 40, fhp * 6);
        g.font = 'bold 34px "KaiTi","STKaiti","楷体",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c99a2e';
        const s = b % 2 ? '勤学笃行' : '爱国爱校'; for (let i = 0; i < 4; i++) g.fillText(s[i], x0 + 20, 60 + i * 96);
        // 首层
        g.fillStyle = '#f2f1ec'; g.fillRect(x0, fhp * 6, 256, fhp); win(g, x0 + 30, fhp * 6 + 14, 200, fhp - 30, 4, { c0: '#6f97ab', c1: '#3e6073' });
      }
      g.fillStyle = '#fafaf6'; g.fillRect(0, 0, w, 6);
    }, { clamp: true }) });
    // 围栏、球门网、伸缩门
    M('fence', { tw: 2, th: 2, alphaTest: .5, double: true, noShadow: true, map: tex(128, 128, (g, w, h) => { g.fillStyle = '#2f5d3a'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h); g.fillRect(0, 6, w, 4); g.fillRect(0, h - 12, w, 4); }) });
    M('net', { tw: 1, th: 1, alphaTest: .4, double: true, noShadow: true, map: tex(64, 64, (g, w, h) => { g.strokeStyle = '#ffffff'; g.lineWidth = 2; for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } }) });
    M('gate', { tw: 1.2, th: 1.4, alphaTest: .5, double: true, map: tex(128, 128, (g, w, h) => { g.strokeStyle = '#c9d0d5'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6); g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); }) });
  };

  /* ---------------- 校园建模 ---------------- */
  PQ.buildCampus = function (scene) {
    const m = PQ.mats, G = new PQ.Batch(), B = new PQ.Batch(), R = PQ.rng(2026), PI = Math.PI;
    let SH = 0, SV = 0;                           // 当前整体平移量：shift(d, v) 之后创建的几何、碰撞体、标注、树木沿 X 平移 d 米，几何和标注再抬高 v 米
    const shift = (d, v) => { SH = d; SV = v || 0; B.dx = G.dx = d; B.dy = G.dy = SV; };
    const col = (X0, X1, Y0, Y1, hmin) => PQ.colliders.push(hmin === undefined ? [X0 + SH, X1 + SH, Y0, Y1] : [X0 + SH, X1 + SH, Y0, Y1, hmin]);   // hmin：只对站在该高度附近的人生效
    const surf = (X0, X1, Y0, Y1, h, solid) => PQ.surfaces.push([X0 + SH, X1 + SH, Y0, Y1, h, solid ? 1 : 0]);   // 可行走的高处表面（台阶、平台）
    const plan = (X0, X1, Y0, Y1, c) => PQ.plan.push([X0 + SH, X1 + SH, Y0, Y1, c]);
    const label = (name, X, Y, h) => PQ.labels.push({ name, X: X + SH, Y, h: h + SV });
    const tree = (X, Y, t, s) => PQ.trees.push({ X: X + SH, Y, t, s: s || 1 });
    const row = (Xa, Ya, Xb, Yb, sp, t, s, jit) => { const L = Math.hypot(Xb - Xa, Yb - Ya), n = Math.max(1, Math.round(L / sp)); for (let i = 0; i <= n; i++) tree(Xa + (Xb - Xa) * i / n + (jit ? (R() - .5) * jit : 0), Ya + (Yb - Ya) * i / n + (jit ? (R() - .5) * jit : 0), t, (s || 1) * (.85 + R() * .3)); };
    const scatter = (X0, X1, Y0, Y1, n, t, s) => { for (let i = 0; i < n; i++) tree(X0 + R() * (X1 - X0), Y0 + R() * (Y1 - Y0), t, (s || 1) * (.75 + R() * .5)); };
    const alt = (e, tw, th) => ({ m: e.m, tw, th, name: e.name + '_' + tw + '_' + th });
    const txtM = (name, text, o, mo) => PQ.M(name, Object.assign({ map: PQ.textTex(text, o) }, mo || {}));
    const SANS = '"SimHei","Microsoft YaHei","黑体",sans-serif';

    /* --- 地形 --- */
    (function () {
      const S = 8, n = 131, half = 520, pos = [], uv = [], idx = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const X = -half + i * S, Y = -half + j * S; pos.push(X, PQ.hillAt(X, Y), -Y); uv.push(X / 18, Y / 18); }
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, b, d, a, d, c); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, m.grass.m); mesh.receiveShadow = true; scene.add(mesh);
    })();

    /* --- 通用构件 --- */
    function wing(o) {
      const fh = o.fh || 3.6, fl = o.fl, base = o.base || 0, H = base + fl * fh, bw = o.bw || 4.5, st = o.st, c = o.cor || '', cw = c ? (o.cw || 2.4) : 0;
      const X0 = o.X0, X1 = o.X1, Y0 = o.Y0, Y1 = o.Y1, alongY = (Y1 - Y0) > (X1 - X0);
      let rx0 = X0, rx1 = X1, ry0 = Y0, ry1 = Y1;
      if (c === 'E') rx1 -= cw; else if (c === 'W') rx0 += cw; else if (c === 'N') ry1 -= cw; else if (c === 'S') ry0 += cw;
      const fac = alongY ? { E: st.win, W: st.win, N: st.end, S: st.end } : { N: st.win, S: st.win, E: st.end, W: st.end };
      if (c) fac[c] = st.cor;
      if (o.fac) Object.assign(fac, o.fac);
      const hb = base + (o.g0 ? fh : 0);
      B.box({ N: fac.N, S: fac.S, E: fac.E, W: fac.W, B: o.g0 ? m.ceil : null }, rx0, rx1, ry0, ry1, hb, H, { fit: true, vb: base });
      if (c) {
        const t = .14, cy = (c === 'E' || c === 'W');
        const sr = c === 'E' ? [rx1, X1, Y0, Y1] : c === 'W' ? [X0, rx0, Y0, Y1] : c === 'N' ? [X0, X1, ry1, Y1] : [X0, X1, Y0, ry0];
        const pr = c === 'E' ? [X1 - t, X1, Y0, Y1] : c === 'W' ? [X0, X0 + t, Y0, Y1] : c === 'N' ? [X0, X1, Y1 - t, Y1] : [X0, X1, Y0, Y0 + t];
        for (let f = base ? 0 : 1; f < fl; f++) {
          const h = base + f * fh;
          B.box({ N: m.slab, S: m.slab, E: m.slab, W: m.slab, T: m.cfloor, B: m.ceil }, sr[0], sr[1], sr[2], sr[3], h - .14, h);
          B.box(st.par, pr[0], pr[1], pr[2], pr[3], h, h + 1.0);
          B.box(st.cap, pr[0] - .03, pr[1] + .03, pr[2] - .03, pr[3] + .03, h + 1.0, h + 1.1);
        }
        const L = cy ? Y1 - Y0 : X1 - X0, n = Math.max(1, Math.round(L / bw)), e = .18;
        for (let i = 0; i <= n; i++) {
          const s = (cy ? Y0 : X0) + L * i / n;
          if (cy) { const cx = c === 'E' ? X1 - .2 : X0 + .2; B.box(m.col, cx - e, cx + e, Math.max(Y0, s - e), Math.min(Y1, s + e), base, H); }
          else { const cc = c === 'N' ? Y1 - .2 : Y0 + .2; B.box(m.col, Math.max(X0, s - e), Math.min(X1, s + e), cc - e, cc + e, base, H); }
        }
      }
      if (o.g0) {
        const L = alongY ? Y1 - Y0 : X1 - X0, n = Math.max(1, Math.round(L / bw)), e = .28;
        for (let i = 0; i <= n; i++) {
          const s = (alongY ? Y0 : X0) + L * i / n;
          if (alongY) for (const cx of [rx0 + .4, rx1 - .4]) B.box(m.col, cx - e, cx + e, Math.max(Y0, s - e), Math.min(Y1, s + e), 0, fh);
          else for (const cc of [ry0 + .4, ry1 - .4]) B.box(m.col, Math.max(X0, s - e), Math.min(X1, s + e), cc - e, cc + e, 0, fh);
        }
      }
      B.box({ N: st.wall, S: st.wall, E: st.wall, W: st.wall, T: m.roof, B: m.ceil }, X0 - .2, X1 + .2, Y0 - .2, Y1 + .2, H, H + .2);
      const par = o.par === undefined ? 'NSEW' : o.par, ph = H + .2, pt = H + .9;
      if (par.includes('N')) B.box(st.wall, X0 - .2, X1 + .2, Y1 + .04, Y1 + .2, ph, pt);
      if (par.includes('S')) B.box(st.wall, X0 - .2, X1 + .2, Y0 - .2, Y0 - .04, ph, pt);
      if (par.includes('E')) B.box(st.wall, X1 + .04, X1 + .2, Y0 - .2, Y1 + .2, ph, pt);
      if (par.includes('W')) B.box(st.wall, X0 - .2, X0 - .04, Y0 - .2, Y1 + .2, ph, pt);
      if (!o.g0 && !o.noCol) col(X0, X1, Y0, Y1);
      if (!o.noPlan) plan(X0, X1, Y0, Y1, o.pc || '#e8e2d6');
      return H;
    }
    function link(X0, X1, Y0, Y1, fl, fh, st, f0) {
      fh = fh || 3.6; const alongX = (X1 - X0) >= (Y1 - Y0), t = .14;
      for (let f = f0 || 1; f <= fl; f++) {
        const h = f * fh;
        B.box({ N: m.slab, S: m.slab, E: m.slab, W: m.slab, T: f === fl ? m.roof : m.cfloor, B: m.ceil }, X0, X1, Y0, Y1, h - .14, h);
        if (f < fl) {
          if (alongX) for (const y of [Y0, Y1 - t]) { B.box(st.par, X0, X1, y, y + t, h, h + 1.0); B.box(st.cap, X0, X1, y - .03, y + t + .03, h + 1.0, h + 1.1); }
          else for (const x of [X0, X1 - t]) { B.box(st.par, x, x + t, Y0, Y1, h, h + 1.0); B.box(st.cap, x - .03, x + t + .03, Y0, Y1, h + 1.0, h + 1.1); }
        }
      }
      const L = alongX ? X1 - X0 : Y1 - Y0, n = Math.max(1, Math.round(L / 4.5)), e = .18;
      for (let i = 0; i <= n; i++) {
        const s = (alongX ? X0 : Y0) + L * i / n;
        if (alongX) for (const y of [Y0 + .2, Y1 - .2]) B.box(m.col, s - e, s + e, y - e, y + e, 0, fl * fh);
        else for (const x of [X0 + .2, X1 - .2]) B.box(m.col, x - e, x + e, s - e, s + e, 0, fl * fh);
      }
      plan(X0, X1, Y0, Y1, '#d8d2c6');
    }
    function wall(Xa, Ya, Xb, Yb, fence, base) {      // base：墙脚所在地面高度（拔高区的围墙从 0 一直砌到 base+2.3）
      base = base || 0;
      const X0 = Math.min(Xa, Xb) - .12, X1 = Math.max(Xa, Xb) + .12, Y0 = Math.min(Ya, Yb) - .12, Y1 = Math.max(Ya, Yb) + .12;
      if (fence) {
        B.box(m.wCream, X0, X1, Y0, Y1, 0, .5);
        if (X1 - X0 > Y1 - Y0) B.box({ N: m.fence, S: m.fence }, X0, X1, (Y0 + Y1) / 2 - .01, (Y0 + Y1) / 2 + .01, .5, 2.3);
        else B.box({ E: m.fence, W: m.fence }, (X0 + X1) / 2 - .01, (X0 + X1) / 2 + .01, Y0, Y1, .5, 2.3);
      } else { B.box(m.wCream, X0, X1, Y0, Y1, 0, base + 2.3); B.box(m.wRed, X0 - .05, X1 + .05, Y0 - .05, Y1 + .05, base + 2.3, base + 2.42); }
      col(X0, X1, Y0, Y1);
    }
    function car(X, Y, ax, mat) {
      const l = 2.2, w = .9;
      const bx = (h0, h1, il, iw, mm) => ax ? B.box(mm, X - l + il, X + l - il, Y - w + iw, Y + w - iw, h0, h1) : B.box(mm, X - w + iw, X + w - iw, Y - l + il, Y + l - il, h0, h1);
      bx(.28, .95, 0, 0, mat); bx(.95, 1.45, .75, .08, m.carGlass); bx(1.45, 1.5, .8, .1, mat); bx(0, .28, .35, .12, m.tire);
    }
    const CARS = [m.carW, m.carK, m.carS, m.carR, m.carB, m.carW, m.carS];
    const rcar = () => CARS[(R() * CARS.length) | 0];
    function court(cx, cy, ax) {
      const P = (u, v) => ax ? [cx + u, cy + v] : [cx + v, cy + u];
      const L = (u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v1); G.line(m.white, a[0], a[1], b[0], b[1], .06, .1); };
      const R4 = (mat, u0, u1, v0, v1, h) => { const a = P(u0, v0), b = P(u1, v1); G.flat(mat, Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1]), h); };
      const arc = (cu, cv, r, a0, a1) => { const sg = 18; for (let i = 0; i < sg; i++) { const t0 = a0 + (a1 - a0) * i / sg, t1 = a0 + (a1 - a0) * (i + 1) / sg; L(cu + r * Math.cos(t0), cv + r * Math.sin(t0), cu + r * Math.cos(t1), cv + r * Math.sin(t1)); } };
      R4(m.courtG, -14, 14, -7.5, 7.5, .075);
      L(-14, -7.5, 14, -7.5); L(-14, 7.5, 14, 7.5); L(-14, -7.5, -14, 7.5); L(14, -7.5, 14, 7.5); L(0, -7.5, 0, 7.5); arc(0, 0, 1.8, 0, 2 * PI);
      for (const s of [-1, 1]) {
        R4(m.courtR, s * 14, s * 8.2, -2.45, 2.45, .085);
        L(s * 14, -2.45, s * 8.2, -2.45); L(s * 14, 2.45, s * 8.2, 2.45); L(s * 8.2, -2.45, s * 8.2, 2.45);
        arc(s * 8.2, 0, 1.8, 0, 2 * PI);
        const a = 78 * PI / 180; arc(s * 12.425, 0, 6.75, s > 0 ? PI - a : -a, s > 0 ? PI + a : a);
        L(s * 14, -6.6, s * 11.02, -6.6); L(s * 14, 6.6, s * 11.02, 6.6);
        // 篮球架
        const bx = (mat, u0, u1, v0, v1, h0, h1) => { const p = P(u0, v0), q = P(u1, v1); B.box(mat, Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1]), h0, h1); };
        bx(m.steel, s * 15.0, s * 15.2, -.1, .1, 0, 3.3); bx(m.steel, s * 15.0, s * 13.0, -.06, .06, 3.1, 3.25);
        bx(m.white, s * 12.95, s * 13.0, -.9, .9, 2.9, 3.95); bx(m.hoop, s * 12.95, s * 12.5, -.23, .23, 3.03, 3.07);
      }
    }

    /* --- 城市地面与环市西路 --- */
    G.flat(m.city, -520, 520, 179, 520, .02); G.flat(m.city, -520, -192, -45, 179, .02); G.flat(m.city, 192, 520, -70, 179, .02);
    G.flat(m.conc, -520, 520, 138.5, 141.5, .05); G.flat(m.conc, -520, 520, 175.5, 179, .05);
    G.flat(m.asphalt, -520, 520, 141.5, 157, .04); G.flat(m.asphalt, -520, 520, 160, 175.5, .04);
    G.flat(m.lawn, -520, 49, 157, 160, .07); G.flat(m.lawn, 60, 520, 157, 160, .07); G.flat(m.asphalt, 49, 60, 157, 160, .04);
    for (const y of [141.9, 156.6, 160.4, 175.1]) G.line(m.white, -520, y, 520, y, .15, .07);
    for (const y of [145.6, 149.3, 153, 163.9, 167.7, 171.4]) for (let x = -510; x < 510; x += 15) if (x < 44 || x > 62) G.line(m.white, x, y, x + 6, y, .15, .07);
    for (let y = 142.3; y < 156.2; y += 1.2) G.flat(m.white, 52, 57, y, y + .6, .075);
    for (let y = 160.8; y < 174.8; y += 1.2) G.flat(m.white, 52, 57, y, y + .6, .075);
    for (let x = -505; x < 510; x += 13) if (x < 44 || x > 64) { tree(x, 158.5, 's', 1.1); if (((x + 505) / 13) % 2 < 1) tree(x + 6, 158.5, 'b', .75); }
    row(-500, 177.2, 500, 177.2, 17, 'b', .8);
    plan(-230, 230, 141.5, 175.5, '#55585c');
    // 公交站“鹏权中学”
    B.box(m.steel, 70, 82, 139.3, 139.45, 0, 2.5); B.box(m.roofB, 69.6, 82.4, 138.9, 140.9, 2.5, 2.62, { bottom: true });
    B.box({ N: txtM('busSign', '鹏权中学', { cell: 96, bg: '#1f5fae', color: '#ffffff', font: SANS, size: .7 }) }, 73, 79, 139.46, 139.5, 1.2, 2.2, { full: true });
    for (let i = 0; i < 16; i++) { const up = i % 2, x = -480 + i * 62 + R() * 20; car(x, up ? 147.5 + (i % 4 > 1 ? 3.7 : 0) : 165.8 + (i % 4 > 1 ? 3.7 : 0), true, rcar()); }

    /* --- 校门前区 --- */
    G.flat(m.dirt, -153, 0, 112.2, 138.5, .03); row(-148, 135, -4, 135, 8.5, 'b', 1.1, 2);
    for (let i = 0; i < 5; i++) car(-120 + i * 21 + R() * 5, 122 + R() * 4, R() < .5, rcar());
    G.flat(m.lawn, 0, 20, 111.5, 138.5, .045); B.box(m.hedgeY, 1, 19, 113.2, 131, 0, .5); B.box(m.hedge, .6, 19.4, 136.6, 138, 0, .8);
    G.flat(m.conc, 20, 50, 110, 138.5, .05);
    for (let i = 0; i < 4; i++) G.line(m.white, 40.5, 114 + i * 3, 49.5, 114 + i * 3, .12, .07);
    car(45, 115.5, true, m.carW); car(45, 118.5, true, m.carS); car(45, 124.6, true, m.carK);
    G.flat(m.lawn, 50, 165, 131, 138.5, .045); B.box(m.hedge, 52, 163, 137, 138.2, 0, .9); row(56, 134.6, 160, 134.6, 9, 'b', 1.1, 1.5);
    // 校名墙（深红色花岗岩 + 金字）
    const mName = PQ.M('nameWall', { map: PQ.textTex('台山市鹏權中學', { cell: 150, pad: 60, color: '#e9c55c', shadow: '#3a130e', paint: (g, w, h) => { g.fillStyle = '#6d2a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = ['#7a342b', '#5e221b', '#84392f'][(R() * 3) | 0]; g.globalAlpha = .5; g.fillRect(R() * w, R() * h, 2 + R() * 3, 2 + R() * 3); } g.globalAlpha = 1; } }) });
    B.box(m.granDark, 4.8, 19.7, 110.1, 111.3, 0, .45);
    B.box({ N: mName }, 5, 19.5, 110.3, 111.1, .45, 2.65, { full: true });
    B.box({ S: m.wRedDark, E: m.wRedDark, W: m.wRedDark, T: m.wRedDark }, 5, 19.5, 110.3, 111.1, .45, 2.65);
    col(4.8, 19.7, 110.1, 111.3);
    for (const x of [21, 37]) {
      B.box(m.wCream, x - .65, x + .65, 109.6, 110.9, 0, 5.2); B.box(m.slab, x - .8, x + .8, 109.45, 111.05, 5.2, 5.45);
      B.box({ N: m.wGrey }, x - .4, x + .4, 110.9, 110.93, 1.2, 4.4);
      for (const d of [[-.35, -.35], [.35, -.35], [-.35, .35], [.35, .35]]) B.cyl(m.lamp, x + d[0], 110.25 + d[1], .2, 5.75, 6.15, 8, m.lamp);
      B.cyl(m.steel, x, 110.25, .05, 5.45, 6.4, 6); B.cyl(m.lamp, x, 110.25, .24, 6.4, 6.9, 8, m.lamp);
      col(x - .65, x + .65, 109.6, 110.9);
    }
    B.box({ N: m.gate, S: m.gate }, 21.7, 30.2, 110.2, 110.24, .1, 1.5); B.box(m.steel, 30.2, 30.8, 109.95, 110.5, 0, 1.6); col(21.7, 30.8, 110, 110.5);
    // 门卫室
    B.box({ N: m.faCanteen, W: m.faCanteen, S: m.wCream, E: m.wCream }, 38.5, 45, 103.5, 110, 0, 3.2, { fit: true }); B.box(m.slab, 37.6, 45.9, 102.7, 111.3, 3.2, 3.5, { bottom: true });
    col(38.5, 45, 103.5, 110); plan(38.5, 45, 103.5, 110, '#e8e2d6');
    label('校门', 29, 110.3, 8);

    /* --- 围墙 --- */
    [[-153, 112, -65, 112, 0, RH], [45, 110, 50, 110, 1], [50, 110, 50, 131, 1], [50, 131, 165, 131, 1], [165, 131, 165, 52], [165, 52, 190, 52], [190, 52, 190, -50], [190, -50, 174, -50], [174, -50, 174, -128],
      [174, -128, -25, -128], [-25, -128, -25, -102], [-25, -102, -32, -102], [-32, -102, -120, -102, 0, RH], [-120, -102, -120, -29, 0, RH], [-120, -29, -185, -29, 0, RH], [-185, -29, -185, 33, 0, RH], [-185, 33, -153, 33, 0, RH], [-153, 33, -153, 112, 0, RH]]
      .forEach(w => wall(w[0], w[1], w[2], w[3], w[4], w[5]));

    /* --- 道路与铺装 --- */
    [[25, 39, -17, 110], [3.5, 25, 22, 58],
      [39, 150, 10.6, 14], [39, 50.7, -12, 14], [104, 165, 14, 72], [128, 165, 72, 131], [165, 190, 14, 52], [112, 190, -12, 14]]
      .forEach(r => G.flat(m.conc, r[0], r[1], r[2], r[3], .05));
    plan(25, 39, -17, 110, '#c9c6bd'); plan(-190, 8, -27, -17, '#c9c6bd'); plan(-150, 25, 98, 108, '#c9c6bd');

    /* --- 拔高区：高台、挡墙、两侧坡道、楼后草坡（高度函数见文件开头 raisedAt） --- */
    (function () {
      const H = RH, rS = PQ.rampS, rN = PQ.rampN, R0 = m.retain;
      // 高台顶面 + 四周垂直挡墙（朝田径场一侧即运动场地东缘 X=-32）
      const P = [[-185, -29], [-120, -29], [-120, -102], [-32, -102], [-32, -27], [-57.5, -27], [-57.5, -17], [-73, -17], [-73, 33], [-65, 41], [-65, 112], [-153, 112], [-153, 33], [-185, 33]];
      G.poly(m.grass, P, H);
      P.forEach((a, i) => {
        if (i >= 5 && i <= 9) return;               // 与坡道顶、草坡顶相接的边不需要挡墙
        const b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        B.quad(R0, [a[0], 0, -a[1]], [b[0], 0, -b[1]], [b[0], H, -b[1]], [a[0], H, -a[1]], [dy / L, 0, dx / L], [0, 0, L / R0.tw, 0, L / R0.tw, H / R0.th, 0, H / R0.th]);
      });
      // 平路段（高处）与坡道路面
      shift(0, H); G.flat(m.conc, -185, -57.5, -27, -17, .05); G.flat(m.conc, -150, -65, 98, 108, .05); shift(0);
      const rq = (mat, x0, x1, y0, y1, hf, off) => G.quad(mat, [x0, hf(x0) + off, -y0], [x1, hf(x1) + off, -y0], [x1, hf(x1) + off, -y1], [x0, hf(x0) + off, -y1], [0, 1, 0],
        [x0 / mat.tw, y0 / mat.th, x1 / mat.tw, y0 / mat.th, x1 / mat.tw, y1 / mat.th, x0 / mat.tw, y1 / mat.th]);
      rq(m.conc, -57.5, 8, -27, -17, rS, .05);                              // 左侧坡道（靠运动场地）
      rq(m.conc, -65, 25, 98, 108, rN, .05); rq(m.lawn, -65, 5, 108, 112, rN, .03);   // 右侧坡道（通往科艺楼）
      // 坡道两侧的挡墙兼护栏：墙顶随坡度升高，比路面高 ex 米
      const rw = (mat, xa, xb, y0, y1, hf, ex) => {
        const ta = hf(xa) + ex, tb = hf(xb) + ex, u0 = xa / mat.tw, u1 = xb / mat.tw, t = mat.th;
        B.quad(mat, [xb, 0, -y1], [xa, 0, -y1], [xa, ta, -y1], [xb, tb, -y1], [0, 0, -1], [u1, 0, u0, 0, u0, ta / t, u1, tb / t]);
        B.quad(mat, [xa, 0, -y0], [xb, 0, -y0], [xb, tb, -y0], [xa, ta, -y0], [0, 0, 1], [u0, 0, u1, 0, u1, tb / t, u0, ta / t]);
        B.quad(mat, [xa, ta, -y0], [xb, tb, -y0], [xb, tb, -y1], [xa, ta, -y1], [0, 1, 0], [u0, 0, u1, 0, u1, .1, u0, .1]);
        B.quad(mat, [xb, 0, -y0], [xb, 0, -y1], [xb, tb, -y1], [xb, tb, -y0], [1, 0, 0], [0, 0, .1, 0, .1, tb / t, 0, tb / t]);
        B.quad(mat, [xa, 0, -y1], [xa, 0, -y0], [xa, ta, -y0], [xa, ta, -y1], [-1, 0, 0], [0, 0, .1, 0, .1, ta / t, 0, ta / t]);
        col(xa, xb, y0, y1);
      };
      rw(R0, -71.5, -57.5, -17, -16.75, rS, .9); rw(R0, -57.5, 8, -17, -16.75, rS, .9);   // 左坡道北侧：墙下就是第一教学楼旁的小巷
      rw(R0, -32, 8, -27.25, -27, rS, .9);                                                // 左坡道南侧
      rw(R0, -65, 25, 97.75, 98, rN, .9);                                                  // 右坡道南侧：墙下是第一教学楼另一侧的小巷
      rw(R0, 5, 25, 108, 108.25, rN, .9); B.box(R0, 5, 5.25, 108.25, 112, 0, rN(5) + .9); col(5, 5.25, 108.25, 112);
      rw(m.wCream, -65, 5, 111.88, 112.12, rN, 2.3);                                       // 右坡道北侧的校园围墙随坡升高
      // 高台边缘护栏：排球场一侧高于坡道，东缘高于田径场
      shift(0, H); B.box(R0, -57.5, -32, -27.25, -27, 0, .9); B.box(R0, -32.25, -32, -102, -27.25, 0, .9); shift(0);
      col(-57.5, -32, -27.25, -27); col(-32.25, -32, -102, -27.25);
      // 第一教学楼正后方：整段草坡 + 一排树
      const sl = (ya, yb, xa, xb) => { const w = -57 - (xa + xb) / 2, k = Math.hypot(H, w); G.quad(m.lawn, [xa, H + .02, -ya], [-57, .02, -ya], [-57, .02, -yb], [xb, H + .02, -yb], [H / k, w / k, 0], [xa / 10, ya / 10, -5.7, ya / 10, -5.7, yb / 10, xb / 10, yb / 10]); };
      sl(-17, 33, -73, -73); sl(33, 41, -73, -65); sl(41, 98, -65, -65);
      row(-61, -12, -61, 94, 8, 'b', .9);
    })();
    for (let y = -10; y < 104; y += 9) G.line(m.yellow, 32, y, 32, y + 4.5, .12, .065);
    // 中心广场：灰色花岗岩 + 红色石带
    G.poly(m.granite, [[39, 14], [104, 14], [104, 72], [61, 72], [61, 52], [39, 52]], .06); plan(39, 104, 14, 72, '#bdbcb8');
    G.arc(m.granR, 72, 38, 21, 0, 2 * PI, 1.1, .075, 56); G.arc(m.granR, 72, 38, 10.5, 0, 2 * PI, .9, .075, 40);
    for (let k = 0; k < 8; k++) { const a = k * PI / 4 + PI / 8; G.line(m.granR, 72 + 10.5 * Math.cos(a), 38 + 10.5 * Math.sin(a), 72 + 21 * Math.cos(a), 38 + 21 * Math.sin(a), .9, .075); }
    G.line(m.granR, 40, 15.5, 103, 15.5, 1, .075); G.line(m.granR, 103, 15.5, 103, 71, 1, .075); G.line(m.granR, 62, 71, 103, 71, 1, .075); G.line(m.granR, 40, 15.5, 40, 51, 1, .075);
    label('中心广场', 72, 38, 3);
    G.flat(m.lawn, 39.6, 60.4, 52.6, 71.4, .08); B.box(m.hedge, 39.6, 60.4, 52.6, 53.4, 0, .6); scatter(42, 58, 55, 70, 7, 'b', 1.1);
    G.flat(m.lawn, 41, 62, 73, 108, .045); scatter(46, 60, 76, 105, 9, 'b', 1.05);
    G.flat(m.lawn, 62, 165, 108, 131, .045); scatter(96, 160, 111, 128, 10, 'b', 1.1);
    row(42, 17.2, 100, 17.2, 9.6, 'b', .7);

    /* --- 花园（第一教学大楼以东） --- */
    G.flat(m.lawn, 6, 24, 60, 97, .045); G.flat(m.lawn, 6, 24, -8, 20, .045);
    B.box(m.hedge, 6, 24, 59.6, 60.3, 0, .7); B.box(m.hedge, 6, 24, 19.7, 20.4, 0, .7); B.box(m.hedge, 23.4, 24, 60, 97, 0, .7); B.box(m.hedge, 23.4, 24, -8, 20, 0, .7);
    B.box(m.hedge, 4.2, 5.6, -12, 30, 0, .8); B.box(m.hedge, 4.2, 5.6, 46, 86, 0, .8);
    // 假山水池
    B.cyl(m.wRed, 14, 84, 4.9, 0, .45, 24); G.disc(m.water, 14, 84, 4.75, .32, 24);
    [[13, 84.5, 2.1, 3.4], [15.4, 83.2, 1.5, 2.5], [12.2, 82.6, 1.3, 2.0], [14.6, 86, 1.2, 1.8], [16, 85, .9, 1.3]].forEach(r => B.pyr(m.stone, r[0] - r[2], r[0] + r[2], r[1] - r[2], r[1] + r[2], .2, r[3]));
    // 凉亭
    B.box(m.slab, 11.8, 18.2, 64.8, 71.2, 0, .3);
    for (const p of [[12.6, 65.6], [17.4, 65.6], [12.6, 70.4], [17.4, 70.4]]) B.cyl(m.col, p[0], p[1], .2, .3, 3.2, 10);
    B.box(m.slab, 12, 18, 65, 71, 3.2, 3.35, { bottom: true }); B.pyr(m.roofT, 11.2, 18.8, 64.2, 71.8, 3.35, 5.1);
    B.box(m.stone, 14, 16, 67.6, 68.4, .3, .75);
    scatter(7, 23, 61, 80, 5, 'b', .9); scatter(7, 22, 88, 96, 3, 'b', .9); tree(9, 92, 'c', 1.3); tree(21, 63, 'c', 1.2); tree(21, 78, 'c', 1.1);
    scatter(7, 23, -7, 19, 5, 'p', 1); scatter(7, 23, -7, 19, 4, 'b', .9);
    // 圆形花坛 + LED 屏（办学理念）
    B.cyl(m.granR, 17, 51.5, 4.5, 0, .4, 28, m.granite);
    const mLed = PQ.M('led', { basic: true, map: PQ.tex(512, 256, (g, w, h) => { g.fillStyle = '#120606'; g.fillRect(0, 0, w, h); g.font = 'bold 76px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff3a2a'; g.fillText('鸿鹄怀宏志', w / 2, 82); g.fillText('高翔翱万里', w / 2, 176); g.fillStyle = '#120606'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1); }, { clamp: true }) });
    B.box({ E: mLed }, 17.0, 17.16, 48.9, 54.1, 1.5, 4.1, { full: true }); B.box({ N: m.wDark, S: m.wDark, W: m.wDark, T: m.wDark }, 17.0, 17.16, 48.9, 54.1, 1.5, 4.1);
    B.box(m.wDark, 16.98, 17.18, 49.5, 49.8, .4, 1.5); B.box(m.wDark, 16.98, 17.18, 53.2, 53.5, .4, 1.5);
    label('花园', 15, 76, 6);
    // 主干道棕榈与宣传栏
    row(23.9, 62, 23.9, 106, 7.4, 'p', 1.15); row(40.3, 76, 40.3, 106, 7.5, 'p', 1.15); row(6, 109.2, 18, 109.2, 6, 'p', 1.1); tree(46.8, 100.5, 'p', 1.2);
    ['#c0392b', '#2f6fb3', '#2e9a5b', '#d0892a'].forEach((c, i) => {
      const y0 = 78 + i * 6.6, mb = PQ.M('board' + i, { map: PQ.tex(256, 128, (g, w, h) => { g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = c; g.fillRect(0, 0, w, 26); g.fillRect(8, 36, 110, 82); g.fillStyle = '#9aa0a6'; for (let k = 0; k < 7; k++) g.fillRect(130, 40 + k * 11, 60 + ((k * 37) % 50), 4); }, { clamp: true }) });
      B.box({ W: mb }, 42.6, 42.7, y0, y0 + 5, .9, 2.6, { full: true }); B.box({ E: m.wGrey, N: m.wGrey, S: m.wGrey }, 42.6, 42.7, y0, y0 + 5, .9, 2.6);
      B.box(m.steel, 42.55, 42.75, y0, y0 + .12, 0, 2.7); B.box(m.steel, 42.55, 42.75, y0 + 4.88, y0 + 5, 0, 2.7); B.box(m.roofB, 42.2, 43.1, y0 - .2, y0 + 5.2, 2.7, 2.8);
    });

    /* --- 教学区 --- */
    const stOld = { win: m.faCls, cor: m.faCor, end: m.wWhite, wall: m.wWhite, par: m.wWhite, cap: m.wPink };
    const stE2 = { win: m.faE2, cor: alt(m.faCor, 4.5, 3.5), end: m.wPink, wall: m.wPink, par: m.wWhite, cap: m.wRed };
    // 教学楼群（第一教学大楼及其后方相连的第二教学楼、科艺楼）按需求整体前移 30 米：
    // 第一教学大楼东立面由 X=-26.5 移到 X=3.5，正好覆盖原新教学楼（X -9.5~3.5）的位置。下面仍按原始量测坐标书写。
    // 其中第二教学楼、科艺楼及其周围地面再整体抬高 RH 米（与运动场地同高），第一教学楼留在原地面高度。
    shift(30, RH);
    [[-150, -141, 32, 98], [-150, -103, 31.5, 40], [-124.7, -107.5, 49, 90.5]].forEach(r => G.flat(m.conc, r[0], r[1], r[2], r[3], .05));
    // 科艺楼（西北，4层，U形）
    wing({ X0: -136, X1: -124.7, Y0: 49, Y1: 93, fl: 4, cor: 'E', st: stOld });
    wing({ X0: -107.5, X1: -95, Y0: 49, Y1: 93, fl: 4, cor: 'W', st: stOld });
    wing({ X0: -136, X1: -95, Y0: 41, Y1: 49, fl: 4, cor: 'N', cw: 2, st: stOld });
    link(-124.7, -107.5, 90.5, 93, 4, 3.6, stOld, 2);
    G.flat(m.lawn, -121, -111, 54, 76, .06); tree(-118, 60, 'b', 1); tree(-114, 70, 'b', .9);
    car(-121, 84, false, m.carW); car(-117.5, 84, false, m.carK); car(-113, 84, false, m.carS);
    label('科艺楼', -115.5, 67, 17);
    // 第二教学楼（西南，5层，三排）
    wing({ X0: -173.5, X1: -159.5, Y0: -8.6, Y1: 25, fl: 5, cor: 'E', st: stOld });
    wing({ X0: -144, X1: -132, Y0: -8.6, Y1: 25, fl: 5, cor: 'E', st: stOld });
    wing({ X0: -115, X1: -103, Y0: -8.6, Y1: 25, fl: 5, cor: 'W', st: stOld });
    wing({ X0: -173.5, X1: -103, Y0: -16, Y1: -8.6, fl: 5, cor: 'N', cw: 2.2, st: stOld });
    link(-173.5, -103, 25, 30, 5, 3.6, stOld);
    G.flat(m.lawn, -159.5, -144, -8.6, 25, .045); G.flat(m.lawn, -132, -115, -8.6, 25, .045);
    scatter(-157, -147, -4, 20, 3, 'b', .9); scatter(-129, -118, -4, 20, 3, 'b', .9); row(-180.5, -24, -180.5, 30, 7, 'b', 1);
    label('第二教学楼', -138, 7, 21);
    shift(30, 0);
    // 第一教学大楼（5层，围合两个庭院，东侧为玻璃幕墙门厅）
    wing({ X0: -75, X1: -61, Y0: -3, Y1: 60, fl: 5, cor: 'E', st: stOld });
    wing({ X0: -80, X1: -61, Y0: 60, Y1: 82, fl: 5, st: stOld });
    wing({ X0: -61, X1: -28.3, Y0: 80, Y1: 88, fl: 5, cor: 'S', cw: 2, st: stOld });
    wing({ X0: -39.5, X1: -28.3, Y0: 44.5, Y1: 80, fl: 5, cor: 'W', st: stOld });
    wing({ X0: -37.5, X1: -26.5, Y0: -3, Y1: 31, fl: 5, cor: 'W', st: stOld });
    wing({ X0: -85, X1: -26.5, Y0: -13, Y1: -3, fl: 5, cor: 'N', cw: 2.2, st: stOld });
    wing({ X0: -86.5, X1: -75, Y0: -3, Y1: 35, fl: 5, st: stOld });
    B.box({ N: m.wWhite, S: m.wWhite, W: m.wWhite, T: m.roof }, -46.5, -23.5, 31, 44.5, 0, 22.2);
    B.cyl(m.faGlass, -23.5, 37.75, 6.75, 0, 22.2, 16, m.roof, -PI / 2, PI / 2);
    B.cyl(m.wWhite, -23.5, 37.75, 6.9, 22.2, 22.9, 16, null, -PI / 2, PI / 2);
    col(-46.5, -23.5, 31, 44.5); col(-23.5, -17.5, 32.5, 43); plan(-46.5, -17, 31, 44.5, '#cfe3ea');
    B.box({ E: txtM('signT3', '第一教学大楼', { cell: 128, bg: '#f4f2ea', color: '#c2261c', font: SANS, size: .72 }) }, -19.2, -19.0, 32.6, 42.9, 23.2, 25.0, { full: true });
    B.box({ W: m.wWhite, N: m.wWhite, S: m.wWhite, T: m.wWhite }, -19.2, -19.0, 32.6, 42.9, 23.2, 25.0); B.box(m.steel, -19.3, -19.1, 34, 34.2, 22.2, 23.2); B.box(m.steel, -19.3, -19.1, 41.4, 41.6, 22.2, 23.2);
    const slog = { cell: 128, color: '#d0281e', font: SANS, size: .8 }, slogM = { basic: true, transparent: true, alphaTest: .4, double: true, noShadow: true };
    B.box({ E: txtM('slogS', '千教万教教人求真', slog, slogM) }, -26.2, -26.19, -1, 29, 19.3, 21.6, { full: true });
    B.box({ E: txtM('slogN', '千学万学学做真人', slog, slogM) }, -28.0, -27.99, 46.5, 78.5, 19.3, 21.6, { full: true });
    G.flat(m.lawn, -61, -39.5, 44.5, 80, .045); G.flat(m.lawn, -61, -37.5, -3, 31, .045); scatter(-58, -43, 48, 77, 4, 'b', .9); scatter(-58, -41, 0, 28, 5, 'b', .9);
    label('第一教学楼', -52, 37, 25);
    shift(0);
    row(-148, 110.3, -2, 110.3, 9.5, 'b', 1);
    scatter(-182, -149, -14, 30, 12, 'b', 1.1); scatter(-150, -124, 42, 96, 9, 'b', 1.1);   // 教学楼群前移后空出的西侧绿地
    // 大楼梯：门厅二层平台（原为通往新教学楼的连廊平台）直接落到地面
    (function () {
      const y0 = 32.75, y1 = 42.75, bal = (xa, xb, h) => { B.box(m.wWhite, xa, xb, y0 - .3, y0, 0, h + .95); B.box(m.wWhite, xa, xb, y1, y1 + .3, 0, h + .95); };
      B.box({ N: m.slab, S: m.slab, E: m.slab, W: m.slab, T: m.granite, B: m.ceil }, 9.5, 16, y0 - .5, y1 + .5, 3.3, 3.6); surf(9.5, 16, y0 - .5, y1 + .5, 3.6, false);
      for (const y of [y0 - .5, y1 + .3]) { B.box(m.wWhite, 11.2, 16, y, y + .2, 3.6, 4.55); B.box(m.wPink, 11.17, 16.03, y - .03, y + .23, 4.55, 4.65); col(11.2, 16, y, y + .2, 3.6); }
      B.cyl(m.col, 12.2, y0 - .15, .25, 0, 3.3, 12); B.cyl(m.col, 12.2, y1 + .15, .25, 0, 3.3, 12);
      B.box({ W: m.wWhite }, 16, 16.02, y0 - .3, y1 + .3, 0, 3.45);
      const flight = (x0, hTop, n) => { for (let k = 1; k <= n; k++) { const xa = x0 + (k - 1) * .3, h = hTop - k * .15; B.box({ N: m.slab, S: m.slab, E: m.slab, T: m.granite }, xa, xa + .3, y0, y1, 0, h); surf(xa, xa + .3, y0, y1, h, true); bal(xa, xa + .3, h); } };
      flight(16, 3.6, 12);                                   // 第一跑：12 级，降到 1.8 米
      B.box({ N: m.slab, S: m.slab, E: m.slab, T: m.granite }, 19.6, 21.2, y0, y1, 0, 1.8); surf(19.6, 21.2, y0, y1, 1.8, true); bal(19.6, 21.2, 1.8);   // 休息平台
      flight(21.2, 1.8, 11);                                 // 第二跑：11 级到地面
      for (let x = 16.15; x < 24.5; x += 1.2) { const h = x < 19.6 ? 3.6 - Math.ceil((x - 16) / .3) * .15 : x < 21.2 ? 1.8 : 1.8 - Math.ceil((x - 21.2) / .3) * .15; B.cyl(m.steel, x, 37.75, .03, h, h + .95, 6, m.steel); }
      col(16, 24.5, y0 - .3, y0); col(16, 24.5, y1, y1 + .3);
      plan(9.5, 16, y0 - .5, y1 + .5, '#d8d2c6'); plan(16, 24.5, y0, y1, '#c9c6bd'); label('大楼梯', 20.4, 37.75, 4.5);
    })();

    /* --- 生活区（东侧） --- */
    // 学生宿舍（7层）
    B.box({ W: m.faE1 }, 104, 120, 20.5, 68, 0, 23.1, { full: true });
    B.box({ N: m.wWhite, S: m.wWhite, E: alt(m.faE2, 4.4, 3.3) }, 104, 120, 20.5, 68, 0, 23.1, { fit: true });
    B.box({ N: m.wWhite, S: m.wWhite, E: m.wWhite, W: m.wWhite, T: m.roof }, 103.8, 120.2, 20.3, 68.2, 23.1, 23.3);
    B.box(m.wWhite, 120, 123.2, 60.5, 68, 0, 24.5); B.box(m.wWhite, 120, 123.2, 20.5, 28, 0, 24.5);
    for (let b = 0; b < 4; b++) {            // 顶部弧形檐口
      const ya = 20.5 + b * 11.875 + .5, yb = ya + 10.875, sg = 10;
      for (let i = 0; i < sg; i++) {
        const t0 = i / sg, t1 = (i + 1) / sg, y0 = ya + (yb - ya) * t0, y1 = ya + (yb - ya) * t1, h0 = 23.5 + 1.2 * Math.sin(PI * t0), h1 = 23.5 + 1.2 * Math.sin(PI * t1);
        B.quad(m.slab, [102.4, h0, -y0], [106, h0, -y0], [106, h1, -y1], [102.4, h1, -y1], [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
        B.quad(m.ceil, [102.4, h0 - .22, -y1 + (y1 - y0)], [102.4, h1 - .22, -y1], [106, h1 - .22, -y1], [106, h0 - .22, -y0], [0, -1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
        B.quad(m.slab, [102.4, h0 - .22, -y1], [102.4, h0 - .22, -y0], [102.4, h0, -y0], [102.4, h1, -y1], [-1, 0, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
      }
    }
    col(104, 123.2, 20.5, 68); plan(104, 123.2, 20.5, 68, '#ead9c6'); label('学生宿舍', 112, 44, 28);
    // 综合楼（5层，两排 + 连接体，含三个天井）
    wing({ X0: 131.7, X1: 141, Y0: 20, Y1: 102.3, fl: 5, fh: 3.5, cor: 'W', cw: 1.8, st: stE2, pc: '#ecc9b8' });
    wing({ X0: 149, X1: 158.7, Y0: 20, Y1: 102.3, fl: 5, fh: 3.5, cor: 'W', cw: 1.8, st: stE2, pc: '#ecc9b8' });
    for (const y of [[92.6, 102.3], [63.7, 73.4], [42.9, 53.3], [20, 31]]) { B.box({ N: m.wPink, S: m.wPink, T: m.roof }, 141, 149, y[0], y[1], 0, 17.5); plan(141, 149, y[0], y[1], '#ecc9b8'); col(141, 149, y[0], y[1]); }
    B.box({ N: m.wWhite, S: m.wWhite, T: m.roof }, 123.2, 131.7, 39.2, 45.9, 3.4, 17.5, { bottom: true });
    label('综合楼（宿舍·饭堂）', 145, 66, 22);
    wing({ X0: 170.6, X1: 183.2, Y0: 22.2, Y1: 45.2, fl: 3, fh: 3.4, cor: 'W', cw: 1.6, st: stE2, pc: '#ecc9b8' });
    row(126.5, 24, 126.5, 36, 6, 'b', .8); row(126.5, 50, 126.5, 66, 8, 'b', .8);

    /* --- 游泳池 --- */
    B.box({ N: m.wWhite, S: m.wWhite, E: m.wWhite, W: m.wWhite }, 62, 128, 72, 108, 0, .25);
    [[62, 128, 102, 108], [62, 128, 72, 80], [62, 72, 80, 102], [122, 128, 80, 102]].forEach(r => G.flat(m.deck, r[0], r[1], r[2], r[3], .25));
    G.flat(m.poolTile, 72, 122, 80, 102, .05); G.flat(m.water, 72, 122, 80, 102, .14);
    for (let k = 1; k < 8; k++) G.line(k % 2 ? m.stR : m.white, 72, 80 + k * 2.75, 122, 80 + k * 2.75, .12, .16);
    for (let k = 0; k < 8; k++) B.box(m.white, 71.2, 71.9, 81 + k * 2.75, 81.7 + k * 2.75, .25, .7);
    B.box({ E: m.faCor, W: m.wWhite, N: m.wWhite, S: m.wWhite, T: m.roofW }, 63.5, 68, 74, 98, .25, 3.5, { fit: true }); col(63.5, 68, 74, 98); plan(63.5, 68, 74, 98, '#e8e2d6');
    B.box(m.roofR, 104, 119, 73, 78, 2.6, 2.75, { bottom: true }); for (const p of [[104.4, 73.4], [118.6, 73.4], [104.4, 77.6], [118.6, 77.6]]) B.cyl(m.steel, p[0], p[1], .08, .25, 2.6, 8);
    G.flat(m.deck, 70, 92, 112, 128.5, .2); G.flat(m.water, 74, 88, 115.5, 125, .22);
    for (const f of [[62, 128, 108, 108], [70, 128, 72, 72], [62, 62, 72, 108], [128, 128, 72, 108]]) {
      if (f[0] === f[1]) B.box({ E: m.fence, W: m.fence }, f[0] - .01, f[0] + .01, f[2], f[3], .25, 2.25); else B.box({ N: m.fence, S: m.fence }, f[0], f[1], f[2] - .01, f[2] + .01, .25, 2.25);
      col(Math.min(f[0], f[1]) - .1, Math.max(f[0], f[1]) + .1, f[2] - .1, f[3] + .1);
    }
    plan(72, 122, 80, 102, '#3aa5c2'); plan(74, 88, 115.5, 125, '#3aa5c2'); label('游泳池', 97, 91, 4);

    /* --- 田径场 --- */
    const TC = { cx: 81.5, cy: -61.5, hl: 42.195 }; PQ.track = TC;
    G.flat(m.apron, -8, 172, -112.5, -12, .055);
    const stadium = (r, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = -PI / 2 + PI * i / n; p.push([TC.cx + TC.hl + r * Math.cos(a), TC.cy + r * Math.sin(a)]); } for (let i = 0; i <= n; i++) { const a = PI / 2 + PI * i / n; p.push([TC.cx - TC.hl + r * Math.cos(a), TC.cy + r * Math.sin(a)]); } return p; };
    const ring = (mat, r0, r1, h, n) => { const a = stadium(r0, n), b = stadium(r1, n); for (let i = 0; i < a.length; i++) { const j = (i + 1) % a.length; G.quad(mat, [a[i][0], h, -a[i][1]], [b[i][0], h, -b[i][1]], [b[j][0], h, -b[j][1]], [a[j][0], h, -a[j][1]], [0, 1, 0], [a[i][0] / mat.tw, a[i][1] / mat.th, b[i][0] / mat.tw, b[i][1] / mat.th, b[j][0] / mat.tw, b[j][1] / mat.th, a[j][0] / mat.tw, a[j][1] / mat.th]); } };
    ring(m.track, 36.2, 44.15, .08, 28);
    for (let k = 0; k <= 6; k++) ring(m.white, 36.5 + k * 1.22 - .03, 36.5 + k * 1.22 + .03, .1, 28);
    G.poly(m.trackD, stadium(36.2, 28), .07);
    const px0 = TC.cx - 50, px1 = TC.cx + 50, py0 = TC.cy - 32, py1 = TC.cy + 32;
    G.flat(m.pitch, px0, px1, py0, py1, .085); G.rectLine(m.white, px0, px1, py0, py1, .12, .105);
    G.line(m.white, TC.cx, py0, TC.cx, py1, .12, .105); G.arc(m.white, TC.cx, TC.cy, 9.15, 0, 2 * PI, .12, .105, 36);
    for (const s of [-1, 1]) {
      const gx = TC.cx + s * 50;
      G.line(m.white, gx, TC.cy - 20.15, gx - s * 16.5, TC.cy - 20.15, .12, .105); G.line(m.white, gx, TC.cy + 20.15, gx - s * 16.5, TC.cy + 20.15, .12, .105); G.line(m.white, gx - s * 16.5, TC.cy - 20.15, gx - s * 16.5, TC.cy + 20.15, .12, .105);
      G.line(m.white, gx, TC.cy - 9.16, gx - s * 5.5, TC.cy - 9.16, .12, .105); G.line(m.white, gx, TC.cy + 9.16, gx - s * 5.5, TC.cy + 9.16, .12, .105); G.line(m.white, gx - s * 5.5, TC.cy - 9.16, gx - s * 5.5, TC.cy + 9.16, .12, .105);
      G.arc(m.white, gx - s * 11, TC.cy, 9.15, s > 0 ? PI - .93 : -.93, s > 0 ? PI + .93 : .93, .12, .105, 14);
      B.cyl(m.white, gx, TC.cy - 3.66, .07, 0, 2.44, 8); B.cyl(m.white, gx, TC.cy + 3.66, .07, 0, 2.44, 8); B.box(m.white, gx - .07, gx + .07, TC.cy - 3.66, TC.cy + 3.66, 2.37, 2.51);
      B.box({ E: m.net, W: m.net }, gx + s * 1.8 - .01, gx + s * 1.8 + .01, TC.cy - 3.66, TC.cy + 3.66, 0, 2.44);
      B.box({ T: m.net }, Math.min(gx, gx + s * 1.8), Math.max(gx, gx + s * 1.8), TC.cy - 3.66, TC.cy + 3.66, 2.43, 2.44);
    }
    plan(-8, 172, -112.5, -12, '#a9bfa6'); label('田径场', 81.5, -61.5, 3);
    // 主席台（南侧）、彩色看台、标语牌、旗杆
    B.box(m.slab, 57, 78, -123, -113, 0, 1.2); B.box(m.wWhite, 57, 78, -123.4, -123, 1.2, 6); B.box(m.wWhite, 57, 57.3, -123, -116, 1.2, 6); B.box(m.wWhite, 77.7, 78, -123, -116, 1.2, 6);
    B.box({ N: m.wWhite, S: m.wWhite, E: m.wWhite, W: m.wWhite, T: m.roofW, B: m.ceil }, 56, 79, -124, -111.6, 6, 6.4);
    for (const x of [58, 64.3, 70.7, 77]) B.cyl(m.red, x, -113.6, .22, 1.2, 6, 10);
    B.box({ N: txtM('rost', '台山市鹏权中学', { cell: 128, bg: '#f6f4ee', color: '#c2261c', font: SANS, size: .74 }) }, 58, 77, -111.62, -111.58, 6.45, 7.75, { full: true });
    B.box({ S: m.wWhite, E: m.wWhite, W: m.wWhite, T: m.wWhite }, 58, 77, -111.9, -111.62, 6.4, 7.75);
    B.box(m.slab, 61, 74, -113, -112.2, 0, .8); B.box(m.slab, 61, 74, -112.2, -111.4, 0, .4);
    col(57, 78, -123.4, -113); plan(56, 79, -124, -112, '#e8e2d6'); label('主席台', 67.5, -118, 9.5);
    const terr = (x0, x1, mat) => { for (let k = 0; k < 3; k++) B.box(mat, x0, x1, -113.6 - k * .8, -112.8 - k * .8, 0, (k + 1) * .4); };
    terr(14, 26, m.stR); terr(26, 38, m.stY); terr(38, 48, m.stG); terr(80, 104, m.stG); terr(104, 128, m.stY); terr(128, 151, m.stR);
    const boards = (txt, xa, xb) => { for (let i = 0; i < txt.length; i++) { const x = xa + (xb - xa) * i / (txt.length - 1); B.box({ N: txtM('sb_' + txt[i] + i + xa, txt[i], { cell: 128, bg: '#e8c53a', color: '#c2261c', font: SANS, size: .8 }) }, x - .85, x + .85, -117.05, -117, 2.5, 4.2, { full: true }); B.box({ S: m.stY, E: m.stY, W: m.stY, T: m.stY }, x - .85, x + .85, -117.1, -117.05, 2.5, 4.2); B.cyl(m.steel, x, -117.15, .06, 0, 2.5, 6); } };
    boards('发展体育运动', 16, 46); boards('增强人民体质', 84, 148);
    const mFlag = PQ.M('flagCN', { double: true, noShadow: true, map: PQ.tex(192, 128, (g, w, h) => { g.fillStyle = '#de2910'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffde00'; const star = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * .4 : r; g.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } g.fill(); }; star(32, 32, 19); star(64, 13, 6); star(77, 26, 6); star(77, 45, 6); star(64, 58, 6); }, { clamp: true }) });
    [[50.5, 11, m.stG], [53, 13, mFlag], [55.5, 11, m.stY]].forEach(f => { B.cyl(m.steel, f[0], -114.6, .07, 0, f[1], 8); B.box({ N: f[2], S: f[2] }, f[0] + .08, f[0] + 2.5, -114.61, -114.59, f[1] - 1.75, f[1] - .15, { full: true }); });
    row(170.5, -110, 170.5, -55, 7, 'b', 1.1);

    /* --- 球场 --- */
    // 原“篮球场”场地（中心广场与田径场之间）已整体搬到生活楼原址并改为排球场，这里只留硬化空场地和一排树
    G.flat(m.conc, 50.7, 112, -12, 10.6, .05); row(55, -9.8, 110, -9.8, 10.9, 'b', 1);
    // 生活楼原址：橡胶地排球场（场地大小与原篮球场场地相同，61.3×15.6 米，两个 18×9 米的场）
    G.flat(m.courtG, 124.5, 185.8, -5, 10.6, .065); plan(124.5, 185.8, -5, 10.6, '#3f8f5e'); label('排球场', 155, 2.8, 4);
    for (const x of [139.5, 171.4]) {
      G.flat(m.courtR, x - 9, x + 9, -1.7, 7.3, .075); G.rectLine(m.white, x - 9, x + 9, -1.7, 7.3, .06, .1);
      G.line(m.white, x, -1.7, x, 7.3, .06, .1); G.line(m.white, x - 3, -1.7, x - 3, 7.3, .06, .1); G.line(m.white, x + 3, -1.7, x + 3, 7.3, .06, .1);
      B.cyl(m.steel, x, -2.7, .06, 0, 2.55, 8); B.cyl(m.steel, x, 8.3, .06, 0, 2.55, 8);
      B.box({ E: m.net, W: m.net }, x - .01, x + .01, -2.7, 8.3, 1.43, 2.43); B.box(m.white, x - .03, x + .03, -2.7, 8.3, 2.4, 2.46);
    }
    // 篮球场：排球场朝田径场一侧、靠围墙的两个并排场
    G.flat(m.courtG, 156, 189, -45, -11.5, .065); court(164.5, -28, false); court(181, -28, false); plan(156, 189, -45, -11.5, '#3f8f5e'); label('篮球场', 172.5, -28, 4);
    // 西侧新建运动场地（原土操场硬化）：整体抬高 RH 米，东缘与田径场之间是垂直挡墙
    shift(0, RH);
    // 西半部：沙地排球场三个（不画线，只设球网；球网沿 Y 方向拉开，三副网沿 Y 方向排成一行）
    G.flat(m.sand, -117, -66, -97, -30, .06); plan(-117, -66, -97, -30, '#d9c07a');
    for (const y of [-85, -63.5, -42]) {
      B.cyl(m.steel, -91.5, y - 5.5, .07, 0, 2.55, 8); B.cyl(m.steel, -91.5, y + 5.5, .07, 0, 2.55, 8);
      B.box({ E: m.net, W: m.net }, -91.51, -91.49, y - 5.5, y + 5.5, 1.43, 2.43); B.box(m.white, -91.53, -91.47, y - 5.5, y + 5.5, 2.4, 2.46);
    }
    // 东半部：小足球场（28×60 米，长边沿 Y 方向）
    G.flat(m.pitch2, -66, -32, -97, -30, .06); plan(-66, -32, -97, -30, '#5d9a3b');
    (function () {
      const cx = -49, cy = -63.5, hw = 14, hl = 30, L = (xa, ya, xb, yb) => G.line(m.white, xa, ya, xb, yb, .1, .1);
      G.rectLine(m.white, cx - hw, cx + hw, cy - hl, cy + hl, .1, .1); L(cx - hw, cy, cx + hw, cy); G.arc(m.white, cx, cy, 5, 0, 2 * PI, .1, .1, 28);
      for (const s of [-1, 1]) {
        const gy = cy + s * hl, ny = gy + s * 1.4;
        L(cx - 9, gy, cx - 9, gy - s * 8); L(cx + 9, gy, cx + 9, gy - s * 8); L(cx - 9, gy - s * 8, cx + 9, gy - s * 8);          // 禁区
        L(cx - 4.5, gy, cx - 4.5, gy - s * 3); L(cx + 4.5, gy, cx + 4.5, gy - s * 3); L(cx - 4.5, gy - s * 3, cx + 4.5, gy - s * 3);  // 球门区
        B.cyl(m.white, cx - 2.5, gy, .06, 0, 2, 8); B.cyl(m.white, cx + 2.5, gy, .06, 0, 2, 8); B.box(m.white, cx - 2.5, cx + 2.5, gy - .06, gy + .06, 1.94, 2.06);
        B.box({ N: m.net, S: m.net }, cx - 2.5, cx + 2.5, ny - .01, ny + .01, 0, 2);
        B.box({ T: m.net }, cx - 2.5, cx + 2.5, Math.min(gy, ny), Math.max(gy, ny), 1.99, 2);
        for (const x of [cx - 2.5, cx + 2.5]) B.box({ E: m.net, W: m.net }, x - .01, x + .01, Math.min(gy, ny), Math.max(gy, ny), 0, 2);
      }
    })();
    row(-22, -95, -22, -33, 8, 'b', 1); row(-28, -99.6, -114, -99.6, 9.5, 'b', .9);
    label('运动场地（新建）', -74, -63, 4);
    shift(0);

    /* --- 教师宿舍（桃李园，校园西南） --- */
    const stRes = [0, 1, 2, 3].map(i => ({ win: m['faRes' + i], cor: m['faRes' + i], end: m['faRes' + i], wall: m.wGrey, par: m.wGrey, cap: m.wGrey }));
    B.rot(-149, -98, 27); wing({ X0: -174, X1: -124, Y0: -105, Y1: -91, fl: 6, fh: 3, bw: 3.6, st: stRes[0], noCol: true, noPlan: true }); B.rot();
    col(-170, -128, -111, -85); plan(-170, -128, -108, -88, '#d9d6cf'); label('教师宿舍（桃李园）', -149, -98, 21);
    scatter(-183, -123, -68, -32, 28, 'b', 1.2); scatter(-190, -156, 36, 108, 22, 'b', 1.2);

    /* --- 周边城市与山林 --- */
    const block = (X0, X1, Y0, Y1, fl, k, roofM) => { const st = stRes[k]; B.box({ N: st.win, S: st.win, E: st.win, W: st.win }, X0, X1, Y0, Y1, 0, fl * 3, { fit: true }); B.box({ N: m.wGrey, S: m.wGrey, E: m.wGrey, W: m.wGrey, T: roofM || m.roof }, X0 - .2, X1 + .2, Y0 - .2, Y1 + .2, fl * 3, fl * 3 + .7); if (R() < .6) B.box(m.wGrey, X0 + 3, X0 + 7, Y0 + 3, Y0 + 7, fl * 3 + .7, fl * 3 + 3.2); col(X0, X1, Y0, Y1); plan(X0, X1, Y0, Y1, '#b9b6ae'); };
    for (let r = 0; r < 7; r++) { const y0 = 185 + r * 34; for (let x = -505; x < 480;) { const w = 24 + R() * 18; block(x, x + w, y0 + R() * 3, y0 + 15 + R() * 5, 5 + ((R() * 5) | 0) + (r === 0 ? 1 : 0), (R() * 4) | 0); x += w + 7 + R() * 10; } }
    for (let x = -505; x < -205; x += 23) for (const ys of [[-38, 14], [24, 74], [84, 134]]) block(x, x + 13, ys[0] + R() * 5, ys[1] - R() * 5, 6 + ((R() * 2) | 0), (R() * 4) | 0);
    const shed = (X0, X1, Y0, Y1, h, roofM) => { B.box({ N: m.faShed, S: m.faShed, E: m.faShed, W: m.faShed, T: roofM }, X0, X1, Y0, Y1, 0, h, { fit: true }); col(X0, X1, Y0, Y1); plan(X0, X1, Y0, Y1, '#b9c2cc'); };
    shed(168, 190, 100, 129, 6, m.roofW); shed(168, 188, 60, 92, 5, m.roofW);
    for (let gx = 0; gx < 7; gx++) for (let gy = 0; gy < 5; gy++) { const x = 200 + gx * 44 + R() * 8, y = -62 + gy * 47 + R() * 8; if (R() < .85) shed(x, x + 22 + R() * 14, y, y + 18 + R() * 16, 5 + R() * 4, R() < .5 ? m.roofB : m.roofW); }
    const villa = (X, Y) => { const h0 = PQ.heightAt(X, Y) - .6, w = 5 + R() * 1.5, d = 4.2 + R(); B.box({ N: m.faVilla, S: m.faVilla, E: m.faVilla, W: m.faVilla }, X - w, X + w, Y - d, Y + d, h0, h0 + 9.6, { fit: true, vb: h0 }); B.pyr(R() < .5 ? m.roofR : m.roofT, X - w - .6, X + w + .6, Y - d - .6, Y + d + .6, h0 + 9.6, h0 + 12.4); col(X - w, X + w, Y - d, Y + d); };
    [[38, -246], [62, -262], [90, -250], [108, -270], [18, -272], [-76, -236], [-52, -252], [-222, -206], [-246, -226], [-204, -238], [214, -212], [242, -226], [130, -258], [-100, -258]].forEach(v => villa(v[0], v[1]));
    for (let i = 0; i < 12; i++) villa(-250 + R() * 110, -190 + R() * 70);
    for (let i = 0; i < 1700; i++) {
      const X = -505 + R() * 1010, Y = -505 + R() * 485, h = PQ.hillAt(X, Y);   // 只在山地种林，不含校内拔高区
      if (h < 1.2) continue;
      if (X > -178 && X < -120 && Y > -116 && Y < -80) continue;
      tree(X, Y, R() < .1 ? 'c' : 'f', 1 + R() * .7);
    }

    G.build(scene, { cast: false }); B.build(scene);

    /* --- 快速定位点（第一人称站位 / 朝向） --- */
    PQ.spots = [
      { name: '校门', pos: [29, 131], look: [29, 90] }, { name: '林荫主道', pos: [32, 102], look: [32, 40] }, { name: '中心广场', pos: [58, 30], look: [104, 44] },
      { name: '第一教学楼 · 大楼梯', pos: [33, 37.75], look: [10, 37.75] }, { name: '花园凉亭', pos: [20, 58], look: [14, 80] },
      { name: '田径场', pos: [81.5, -18], look: [67, -115] }, { name: '游泳池', pos: [66, 69], look: [97, 91] }, { name: '排球场', pos: [155, 13], look: [155, 2] }, { name: '篮球场', pos: [172, -8], look: [172, -28] },
      { name: '新建运动场地', pos: [-29, -24], look: [-75, -63] }, { name: '科艺楼', pos: [-86, 103], look: [-86, 70] },
      { name: '第二教学楼', pos: [-66, -22], look: [-108, 7] }
    ];
  };

  /* ---------------- 树木（实例化渲染） ---------------- */
  PQ.buildTrees = function (scene) {
    const R = PQ.rng(5), by = { b: [], p: [], c: [], s: [], f: [] };
    for (const t of PQ.trees) by[t.t].push(t);
    const d = new THREE.Object3D(), color = new THREE.Color();
    const inst = (geo, mat, n) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); im.castShadow = true; im.receiveShadow = true; im.count = n; scene.add(im); return im; };
    const put = (im, i, x, y, z, sx, sy, sz, ry) => { d.position.set(x, y, z); d.scale.set(sx, sy, sz); d.rotation.set(0, ry || 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); };
    // 阔叶树
    {
      const n = by.b.length, tg = new THREE.CylinderGeometry(.16, .27, 1, 6); tg.translate(0, .5, 0);
      const cg = new THREE.IcosahedronGeometry(1, 1), p = cg.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .16 * Math.sin(5 * x + 1.3) * Math.sin(4 * y + .7) + .1 * Math.sin(6 * z); p.setXYZ(i, x * k, y * k * .85, z * k); }
      const trunks = inst(tg, new THREE.MeshLambertMaterial({ color: 0x6b5138 }), n), cans = inst(cg, new THREE.MeshLambertMaterial({ color: 0xffffff }), n * 2 + by.f.length);
      for (let i = 0; i < n; i++) {
        const t = by.b[i], y0 = PQ.heightAt(t.X, t.Y), H = (5.5 + R() * 3) * t.s, rad = (2.5 + R() * 1.4) * t.s, ry = R() * 6.28;
        put(trunks, i, t.X, y0, -t.Y, t.s, H * .6, t.s, ry);
        put(cans, i * 2, t.X, y0 + H * .6 + rad * .4, -t.Y, rad, rad * .85, rad, ry); color.setHSL(.26 + R() * .07, .42 + R() * .16, .25 + R() * .1); cans.setColorAt(i * 2, color);
        const r2 = rad * .66; put(cans, i * 2 + 1, t.X + (R() - .5) * rad, y0 + H * .6 + rad * .85, -t.Y + (R() - .5) * rad, r2, r2 * .85, r2, ry + 1); color.offsetHSL(0, 0, .04); cans.setColorAt(i * 2 + 1, color);
      }
      for (let i = 0; i < by.f.length; i++) {   // 山林：单个树冠
        const t = by.f[i], y0 = PQ.heightAt(t.X, t.Y), rad = (3.6 + R() * 1.8) * t.s;
        put(cans, n * 2 + i, t.X, y0 + rad * .75, -t.Y, rad, rad * 1.05, rad, R() * 6.28); color.setHSL(.27 + R() * .07, .4 + R() * .16, .2 + R() * .1); cans.setColorAt(n * 2 + i, color);
      }
      if (cans.instanceColor) cans.instanceColor.needsUpdate = true;
    }
    // 大王椰
    {
      const n = by.p.length, tg = new THREE.CylinderGeometry(.17, .25, 1, 7); tg.translate(0, .5, 0);
      const pos = [], idx = [], nor = [], Fr = 11, Sg = 5;
      for (let k = 0; k < Fr; k++) {
        const a = k / Fr * Math.PI * 2 + (k % 2) * .25, ca = Math.cos(a), sa = Math.sin(a), b0 = pos.length / 3, lift = (k % 2) ? .6 : .3;
        for (let s = 0; s <= Sg; s++) { const t = s / Sg, dd = 3.3 * t, y = lift * 3.3 * t - (k % 2 ? 1.9 : 2.8) * t * t, w = .5 * Math.sin(Math.PI * Math.min(1, t * 1.02 + .06)) + .03; pos.push(ca * dd - sa * w, y, sa * dd + ca * w, ca * dd + sa * w, y, sa * dd - ca * w); nor.push(0, 1, 0, 0, 1, 0); }
        for (let s = 0; s < Sg; s++) { const i0 = b0 + s * 2; idx.push(i0, i0 + 2, i0 + 1, i0 + 1, i0 + 2, i0 + 3); }
      }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); cg.setIndex(idx);
      const shaft = new THREE.CylinderGeometry(.2, .22, 1, 7); shaft.translate(0, .5, 0);
      const trunks = inst(tg, new THREE.MeshLambertMaterial({ color: 0xb3ab9a }), n), crowns = inst(cg, new THREE.MeshLambertMaterial({ color: 0x4f8f36, side: THREE.DoubleSide }), n), shafts = inst(shaft, new THREE.MeshLambertMaterial({ color: 0x5d9440 }), n);
      for (let i = 0; i < n; i++) { const t = by.p[i], y0 = PQ.heightAt(t.X, t.Y), H = (8 + R() * 3) * t.s; put(trunks, i, t.X, y0, -t.Y, t.s, H, t.s, 0); put(shafts, i, t.X, y0 + H, -t.Y, t.s, 1.3 * t.s, t.s, 0); put(crowns, i, t.X, y0 + H + 1.1 * t.s, -t.Y, t.s, t.s, t.s, R() * 6.28); }
    }
    // 针叶树（南洋杉等）与灌木球
    {
      const n = by.c.length, cg = new THREE.ConeGeometry(1, 1, 8); cg.translate(0, .5, 0);
      const cones = inst(cg, new THREE.MeshLambertMaterial({ color: 0x2f6b3a }), n);
      for (let i = 0; i < n; i++) { const t = by.c[i], y0 = PQ.heightAt(t.X, t.Y); put(cones, i, t.X, y0 + .6, -t.Y, 1.9 * t.s, (8 + R() * 3) * t.s, 1.9 * t.s, R() * 6); }
      const m2 = by.s.length, sg = new THREE.IcosahedronGeometry(1, 1), sh = inst(sg, new THREE.MeshLambertMaterial({ color: 0x4f8a34 }), m2);
      for (let i = 0; i < m2; i++) { const t = by.s[i]; put(sh, i, t.X, PQ.heightAt(t.X, t.Y) + .55 * t.s, -t.Y, .9 * t.s, .7 * t.s, .9 * t.s, 0); }
    }
  };
})();
