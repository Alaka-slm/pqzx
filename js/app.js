'use strict';
/* 渲染、三种视角（俯视 / 鸟瞰 / 第一人称）与界面 */
(async function () {
  const PQ = window.PQ, $ = id => document.getElementById(id);
  const status = t => { $('status').textContent = t; };
  let THREE;
  try { THREE = await PQ.loadThree(status); } catch (e) { status(e.message); return; }
  status('正在生成校园模型…');
  await new Promise(r => setTimeout(r, 60));
  try { start(); } catch (e) { console.error(e); status('生成失败：' + e.message); }

  function start() {
    const canvas = $('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: /[?&]shot=1/.test(location.search), powerPreference: 'high-performance' });
    let pr = Math.min(window.devicePixelRatio || 1, 1.5); renderer.setPixelRatio(pr);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
    PQ.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();
    const fog = new THREE.Fog(0xcfe0ee, 700, 3000);

    /* 天空 */
    const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir;' +
        'void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0); vec3 c = mix(hor, top, pow(h, 0.55));' +
        ' float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 1.6 + pow(s, 14.0) * 0.22);' +
        ' if (d.y < 0.0) c = mix(hor, vec3(0.42, 0.5, 0.4), min(-d.y * 5.0, 1.0)); gl_FragColor = vec4(c, 1.0); }'
    }));
    sky.scale.setScalar(60); sky.renderOrder = -1000; sky.frustumCulled = false; scene.add(sky);

    /* 光照 */
    const hemi = new THREE.HemisphereLight(0xe4eeff, 0x8c9078, 1.1); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3e0, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera; sc.left = -330; sc.right = 330; sc.top = 330; sc.bottom = -330; sc.near = 50; sc.far = 1500;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.06;
    sun.target.position.set(0, 0, 0); scene.add(sun); scene.add(sun.target);
    const cA = new THREE.Color(), cB = new THREE.Color();
    const lerpC = (a, b, k) => cA.set(a).lerp(cB.set(b), k);
    function setSun(hour) {
      const lat = 22.25 * Math.PI / 180, dec = 15 * Math.PI / 180, H = (hour - 12) * 15 * Math.PI / 180;
      const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H), el = Math.asin(sinEl);
      const azN = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) + Math.PI;
      const E = Math.cos(el) * Math.sin(azN), N = Math.cos(el) * Math.cos(azN);
      const d = new THREE.Vector3((E - N) * Math.SQRT1_2, Math.max(sinEl, 0.07), -(E + N) * Math.SQRT1_2).normalize();
      sun.position.copy(d).multiplyScalar(800);
      const k = Math.min(1, Math.max(0, (sinEl - .03) / .42)), kk = k * k * (3 - 2 * k);
      sun.intensity = 2.5 * Math.min(1, Math.max(0, sinEl / .22)); sun.color.copy(lerpC(0xffa25e, 0xfff4e2, kk));
      hemi.intensity = .5 + .7 * kk;
      skyU.top.value.copy(lerpC(0x2a4270, 0x3d82dc, kk)); skyU.hor.value.copy(lerpC(0xf0b384, 0xd3e5f4, kk));
      skyU.sunDir.value.copy(d); skyU.sunCol.value.copy(lerpC(0xffb070, 0xfff6dd, kk));
      fog.color.copy(skyU.hor.value); renderer.setClearColor(fog.color);
      renderer.shadowMap.needsUpdate = true;
      const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60);
      $('timeV').textContent = hh + ':' + (mm < 10 ? '0' : '') + mm;
    }

    /* 场景 */
    PQ.makeMats(); PQ.buildCampus(scene); PQ.buildTrees(scene);

    /* 相机与状态 */
    const camTop = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000);
    const camBird = new THREE.PerspectiveCamera(45, 1, 1, 6000);
    const camFp = new THREE.PerspectiveCamera(72, 1, 0.2, 5000);
    const S = PQ.S = {
      mode: 'bird',
      top: { x: 0, z: -8, zoom: 1, rot: 0 },
      bird: { tx: 10, tz: 0, r: 420, th: Math.PI, ph: 0.92 },
      fp: { x: 29, z: -131, y: 1.65, yaw: Math.PI, pitch: -0.02, vy: 0, fly: false }
    };
    let aspect = 1;
    function resize() {
      const w = window.innerWidth, h = window.innerHeight; aspect = w / h;
      renderer.setSize(w, h, false); camBird.aspect = camFp.aspect = aspect; camBird.updateProjectionMatrix(); camFp.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();
    function applyCam() {
      if (S.mode === 'top') {
        const t = S.top, H = 440 / t.zoom, W = H * aspect;
        camTop.left = -W / 2; camTop.right = W / 2; camTop.top = H / 2; camTop.bottom = -H / 2; camTop.updateProjectionMatrix();
        camTop.position.set(t.x, 900, t.z); camTop.up.set(Math.sin(t.rot), 0, -Math.cos(t.rot)); camTop.lookAt(t.x, 0, t.z);
        return camTop;
      }
      if (S.mode === 'bird') {
        const b = S.bird, sp = Math.sin(b.ph);
        let px = b.tx + b.r * sp * Math.sin(b.th), py = b.r * Math.cos(b.ph), pz = b.tz + b.r * sp * Math.cos(b.th);
        py = Math.max(py, PQ.heightAt(px, -pz) + 3);
        camBird.position.set(px, py, pz); camBird.lookAt(b.tx, 0, b.tz);
        const nr = Math.max(0.5, Math.min(30, (py - 55) * 0.5)); if (Math.abs(nr - camBird.near) > 0.01) { camBird.near = nr; camBird.updateProjectionMatrix(); }
        return camBird;
      }
      const f = S.fp; camFp.position.set(f.x, f.y, f.z); camFp.rotation.set(f.pitch, f.yaw, 0, 'YXZ');
      return camFp;
    }

    /* 输入 */
    const keys = {};
    const locked = () => document.pointerLockElement === canvas;
    const look = (dx, dy) => { const f = S.fp; f.yaw -= dx * 0.0024; f.pitch = Math.max(-1.5, Math.min(1.5, f.pitch - dy * 0.0024)); };
    let drag = null;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey };
      if (S.mode === 'fp' && e.button === 0 && !locked()) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (err) { } }
      else { try { canvas.setPointerCapture(e.pointerId); } catch (err) { } }
    });
    canvas.addEventListener('pointermove', e => {
      if (S.mode === 'fp' && locked()) { look(e.movementX, e.movementY); return; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      const alt = drag.b === 2 || drag.shift;
      if (S.mode === 'top') {
        const t = S.top, mpp = 440 / t.zoom / window.innerHeight;
        if (alt) t.rot += dx * 0.006;
        else { const rx = Math.cos(t.rot), rz = Math.sin(t.rot), ux = Math.sin(t.rot), uz = -Math.cos(t.rot); t.x += (-rx * dx + ux * dy) * mpp; t.z += (-rz * dx + uz * dy) * mpp; }
      } else if (S.mode === 'bird') {
        const b = S.bird;
        if (alt) { const k = b.r * 0.0016, fx = -Math.sin(b.th), fz = -Math.cos(b.th), rx = Math.cos(b.th), rz = -Math.sin(b.th); b.tx += (-rx * dx + fx * dy) * k; b.tz += (-rz * dx + fz * dy) * k; }
        else { b.th -= dx * 0.005; b.ph = Math.max(0.08, Math.min(1.52, b.ph - dy * 0.005)); }
      } else look(dx * 1.3, dy * 1.3);
    });
    const endDrag = () => { drag = null; };
    canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const k = Math.exp(e.deltaY * 0.0012);
      if (S.mode === 'top') S.top.zoom = Math.max(0.45, Math.min(14, S.top.zoom / k));
      else if (S.mode === 'bird') S.bird.r = Math.max(12, Math.min(1500, S.bird.r * k));
      else { camFp.fov = Math.max(30, Math.min(90, camFp.fov * (e.deltaY > 0 ? 1.06 : 0.94))); camFp.updateProjectionMatrix(); }
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (/INPUT|SELECT/.test(e.target.tagName)) return;
      keys[e.code] = true;
      if (e.code === 'Digit1') setMode('top'); else if (e.code === 'Digit2') setMode('bird'); else if (e.code === 'Digit3') setMode('fp');
      else if (e.code === 'KeyF' && S.mode === 'fp') { S.fp.fly = !S.fp.fly; S.fp.vy = 0; hint(); }
      else if (e.code === 'KeyM') $('tgMini').click();
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    document.addEventListener('pointerlockchange', hint);

    function collide(f) {
      let nx = f.x, ny = -f.z; const r = 0.4, feet = f.y - 1.65;
      for (const c of PQ.colliders) {
        if (c.length > 4 && feet < c[4] - 1) continue;          // 高处的栏板不挡地面上的人
        const qx = Math.max(c[0], Math.min(nx, c[1])), qy = Math.max(c[2], Math.min(ny, c[3]));
        const dx = nx - qx, dy = ny - qy, d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = qx + dx / d * r; ny = qy + dy / d * r; }
        else { const l = nx - c[0], rr = c[1] - nx, b = ny - c[2], t = c[3] - ny, mn = Math.min(l, rr, b, t); if (mn === l) nx = c[0] - r; else if (mn === rr) nx = c[1] + r; else if (mn === b) ny = c[2] - r; else ny = c[3] + r; }
      }
      f.x = Math.max(-500, Math.min(500, nx)); f.z = Math.max(-500, Math.min(500, -ny));
    }
    // 台阶、平台等高处表面：surfaceAt 返回脚下可踩的最高表面；blockedAt 判断前方是否是迈不上去的实心台阶
    function surfaceAt(X, Y, feet) { let h = -1e9; for (const s of PQ.surfaces) if (X >= s[0] && X <= s[1] && Y >= s[2] && Y <= s[3] && s[4] <= feet + 0.55 && s[4] > h) h = s[4]; return h; }
    function blockedAt(X, Y, feet) { for (const s of PQ.surfaces) if (s[5] && X >= s[0] && X <= s[1] && Y >= s[2] && Y <= s[3] && s[4] > feet + 0.55) return true; return false; }
    function update(dt) {
      const ax = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), az = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
      const arX = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), arY = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
      const rotK = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0), fast = keys.ShiftLeft || keys.ShiftRight;
      if (S.mode === 'top') {
        const t = S.top, v = 260 / t.zoom * dt * (fast ? 2.5 : 1), mx = ax + arX, my = az + arY;
        t.x += (Math.cos(t.rot) * mx + Math.sin(t.rot) * my) * v; t.z += (Math.sin(t.rot) * mx - Math.cos(t.rot) * my) * v; t.rot += rotK * dt * 1.2;
      } else if (S.mode === 'bird') {
        const b = S.bird, v = b.r * .9 * dt * (fast ? 2.5 : 1), mx = ax + arX, my = az + arY;
        b.tx += (Math.cos(b.th) * mx - Math.sin(b.th) * my) * v; b.tz += (-Math.sin(b.th) * mx - Math.cos(b.th) * my) * v; b.th += rotK * dt * 1.2;
        b.tx = Math.max(-480, Math.min(480, b.tx)); b.tz = Math.max(-480, Math.min(480, b.tz));
      } else {
        const f = S.fp; f.yaw -= arX * dt * 1.9;
        const mz = az + arY, sy = Math.sin(f.yaw), cy = Math.cos(f.yaw);
        if (f.fly) {
          const v = (fast ? 45 : 16) * dt, cp = Math.cos(f.pitch), sp = Math.sin(f.pitch);
          f.x += (-sy * cp * mz + cy * ax) * v; f.z += (-cy * cp * mz - sy * ax) * v;
          f.y += (sp * mz + ((keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0))) * v;
          f.x = Math.max(-500, Math.min(500, f.x)); f.z = Math.max(-500, Math.min(500, f.z));
          f.y = Math.max(PQ.heightAt(f.x, -f.z) + 0.6, Math.min(600, f.y));
        } else {
          let vx = -sy * mz + cy * ax, vz = -cy * mz - sy * ax; const l = Math.hypot(vx, vz);
          if (l > 0) { const v = (fast ? 11 : 4.6) * dt / l, ox = f.x, oz = f.z; f.x += vx * v; f.z += vz * v; collide(f); const ft = f.y - 1.65; if (blockedAt(f.x, -f.z, ft) || PQ.heightAt(f.x, -f.z) - ft > 0.6) { f.x = ox; f.z = oz; } }   // 挡墙、陡坎迈不上去
          const g = Math.max(PQ.heightAt(f.x, -f.z), surfaceAt(f.x, -f.z, f.y - 1.65)) + 1.65;
          f.vy -= 22 * dt; f.y += f.vy * dt;
          if (f.y <= g) { f.y = g; f.vy = 0; if (keys.Space) f.vy = 6.8; }
        }
      }
      const wm = PQ.mats.water.m.map; wm.offset.x += dt * 0.012; wm.offset.y += dt * 0.007;
    }

    /* 界面 */
    const HELP = {
      top: '俯视：左键拖动平移 · 滚轮缩放 · 右键拖动 / Q、E 旋转 · WASD 平移',
      bird: '鸟瞰：左键拖动环绕 · 右键拖动（或 Shift+拖动）平移 · 滚轮缩放 · WASD 平移 · Q、E 旋转',
      fp: '第一人称：点击画面锁定鼠标转向（Esc 释放；也可按住左键拖动）· WASD 移动 · ←→ 转向 · Shift 奔跑 · 空格 跳跃 · F 飞行（空格升 / C 降）· 滚轮变焦'
    };
    function hint() {
      $('help').textContent = HELP[S.mode] + (S.mode === 'fp' && S.fp.fly ? '　【飞行模式】' : '');
      $('lock').style.display = (S.mode === 'fp' && !locked()) ? 'block' : 'none';
      $('cross').style.display = S.mode === 'fp' ? 'block' : 'none';
    }
    function setMode(mode) {
      if (mode !== 'fp' && locked()) document.exitPointerLock();
      S.mode = mode;
      for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === mode);
      sky.visible = mode !== 'top'; scene.fog = mode === 'top' ? null : fog;
      if (mode === 'fp') { const f = S.fp; f.y = Math.max(f.y, PQ.heightAt(f.x, -f.z) + 1.65); f.vy = 0; }
      hint();
    }
    PQ.setMode = setMode;
    for (const b of document.querySelectorAll('#modes button')) b.addEventListener('click', () => { setMode(b.dataset.mode); b.blur(); });
    const sel = $('spots');
    PQ.spots.forEach((s, i) => { const o = document.createElement('option'); o.value = i; o.textContent = s.name; sel.appendChild(o); });
    function goSpot(i) {
      const s = PQ.spots[i]; if (!s) return;
      const f = S.fp; f.x = s.pos[0]; f.z = -s.pos[1]; f.y = PQ.heightAt(s.pos[0], s.pos[1]) + 1.65; f.vy = 0; f.fly = false; f.pitch = 0;
      f.yaw = Math.atan2(-(s.look[0] - s.pos[0]), (s.look[1] - s.pos[1]));
      S.bird.tx = s.look[0]; S.bird.tz = -s.look[1]; S.bird.r = Math.min(S.bird.r, 150);
      S.top.x = s.look[0]; S.top.z = -s.look[1]; S.top.zoom = Math.max(S.top.zoom, 2.4);
      hint();
    }
    PQ.goSpot = goSpot;
    sel.addEventListener('change', () => { if (sel.value !== '') goSpot(+sel.value); sel.value = ''; sel.blur(); });
    $('time').addEventListener('input', e => setSun(+e.target.value));
    let showMini = true;
    $('tgMini').addEventListener('click', e => { showMini = !showMini; e.target.classList.toggle('on', showMini); $('miniWrap').style.display = showMini ? 'block' : 'none'; e.target.blur(); });
    $('bReset').addEventListener('click', e => { S.top = { x: 0, z: -8, zoom: 1, rot: 0 }; S.bird = { tx: 10, tz: 0, r: 420, th: Math.PI, ph: 0.92 }; e.target.blur(); });

    /* 小地图（校园坐标系：上方为环市西路/东北方向） */
    const mini = $('mini'), mg = mini.getContext('2d'), MW = mini.width, MH = mini.height, MS = 0.58;
    const mX = X => MW / 2 + (X + 5) * MS, mY = Y => MH / 2 - (Y - 12) * MS;
    const base = document.createElement('canvas'); base.width = MW; base.height = MH;
    (function () {
      const g = base.getContext('2d'); g.fillStyle = '#6f8a52'; g.fillRect(0, 0, MW, MH);
      for (const p of PQ.plan) { g.fillStyle = p[4]; g.fillRect(mX(p[0]), mY(p[3]), (p[1] - p[0]) * MS, (p[3] - p[2]) * MS); }
      const T = PQ.track, r = 40.2 * MS;
      g.strokeStyle = '#b9462f'; g.lineWidth = 7.9 * MS; g.beginPath();
      g.moveTo(mX(T.cx - T.hl), mY(T.cy) - r); g.lineTo(mX(T.cx + T.hl), mY(T.cy) - r); g.arc(mX(T.cx + T.hl), mY(T.cy), r, -Math.PI / 2, Math.PI / 2);
      g.lineTo(mX(T.cx - T.hl), mY(T.cy) + r); g.arc(mX(T.cx - T.hl), mY(T.cy), r, Math.PI / 2, Math.PI * 1.5); g.stroke();
      g.fillStyle = '#5d9a3b'; g.fillRect(mX(T.cx - 50), mY(T.cy + 32), 100 * MS, 64 * MS);
      // 指北针（正北 = 校园坐标的左上 45°）
      g.save(); g.translate(22, 24); g.rotate(-Math.PI / 4); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -13); g.lineTo(6, 8); g.lineTo(0, 4); g.lineTo(-6, 8); g.fill();
      g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('N', 0, -16); g.restore();
    })();
    function drawMini() {
      if (!showMini) return;
      mg.drawImage(base, 0, 0);
      let x, y, a;
      if (S.mode === 'fp') { x = S.fp.x; y = -S.fp.z; a = S.fp.yaw; }
      else if (S.mode === 'bird') { const p = camBird.position; x = p.x; y = -p.z; a = S.bird.th + Math.PI; mg.strokeStyle = 'rgba(255,255,255,.7)'; mg.lineWidth = 1; mg.beginPath(); mg.moveTo(mX(x), mY(y)); mg.lineTo(mX(S.bird.tx), mY(-S.bird.tz)); mg.stroke(); }
      else { x = S.top.x; y = -S.top.z; a = S.top.rot; const H = 440 / S.top.zoom * MS, W = H * aspect; mg.save(); mg.translate(mX(x), mY(y)); mg.rotate(a); mg.strokeStyle = '#ffeb3b'; mg.lineWidth = 1.5; mg.strokeRect(-W / 2, -H / 2, W, H); mg.restore(); }
      const cx = Math.max(6, Math.min(MW - 6, mX(x))), cy = Math.max(6, Math.min(MH - 6, mY(y)));
      mg.save(); mg.translate(cx, cy); mg.rotate(-a); mg.fillStyle = '#ffeb3b'; mg.strokeStyle = '#3a2a00'; mg.lineWidth = 1.2;
      mg.beginPath(); mg.moveTo(0, -9); mg.lineTo(6, 7); mg.lineTo(0, 3); mg.lineTo(-6, 7); mg.closePath(); mg.fill(); mg.stroke(); mg.restore();
    }
    mini.addEventListener('click', e => {
      const r = mini.getBoundingClientRect(), X = (e.clientX - r.left) * MW / r.width, Y = (e.clientY - r.top) * MH / r.height;
      const cx = (X - MW / 2) / MS - 5, cy = -(Y - MH / 2) / MS + 12;
      if (S.mode === 'fp') { const f = S.fp; f.x = cx; f.z = -cy; collide(f); f.y = PQ.heightAt(f.x, -f.z) + (f.fly ? 30 : 1.65); f.vy = 0; }
      else if (S.mode === 'bird') { S.bird.tx = cx; S.bird.tz = -cy; } else { S.top.x = cx; S.top.z = -cy; }
    });

    /* 主循环 */
    setSun(+$('time').value); setMode('bird');
    $('loading').style.display = 'none';
    let last = performance.now(), fN = 0, fT = 0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      update(dt);
      const cam = applyCam();
      sky.position.copy(cam.position);
      renderer.render(scene, cam);
      drawMini();
      fN++; fT += dt;
      if (fT > 1) {            // 帧率过低时自动降低渲染分辨率
        PQ.fps = fN / fT; fN = 0; fT = 0;
        if (PQ.fps < 24 && pr > 0.8) { pr = Math.max(0.8, pr - 0.25); renderer.setPixelRatio(pr); resize(); }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
