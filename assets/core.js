/* =====================================================================
   core.js — 공용 도구 (허브 · 슬라이드가 함께 씁니다)
   · 내용(data/content.js) 불러오기, 임시 저장, 파일 저장
   · 글자 서식(*강조*, [바꿔 쓸 부분]), 테마 색, 배경 효과
   ===================================================================== */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  var MS = W.MS = {};

  /* ---------- 작은 도우미 ---------- */
  var $ = MS.$ = function (s, r) { return (r || D).querySelector(s); };
  MS.$$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  MS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  /* *별표* → 강조색, 줄바꿈 → <br> */
  MS.fmt = function (s) {
    return MS.esc(s).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  };
  /* [대괄호] → 바꿔 쓸 부분 표시 */
  MS.fmtPrompt = function (s) {
    return MS.esc(s).replace(/\[([^\]\n]+)\]/g, '<mark>[$1]</mark>');
  };
  MS.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  MS.get = function (o, path) {
    var ks = String(path).split('.');
    for (var i = 0; i < ks.length && o != null; i++) o = o[ks[i]];
    return o;
  };
  MS.set = function (o, path, v) {
    var ks = String(path).split('.');
    for (var i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = v;
  };
  MS.reduce = !!(W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  MS.EASE = 'cubic-bezier(.2,.8,.2,1)';

  /* ---------- 내용 ---------- */
  MS.content = W.CONTENT || { id: 'deck', rev: 0, theme: {}, hub: {}, decks: {} };
  if (!MS.content.theme) MS.content.theme = {};
  if (!MS.content.decks) MS.content.decks = {};
  if (!MS.content.hub) MS.content.hub = {};

  /* ---------- 알림 ---------- */
  var toastEl, toastT;
  MS.toast = function (msg, ms) {
    if (!toastEl) {
      toastEl = D.createElement('div'); toastEl.className = 'ms-toast';
      toastEl.setAttribute('role', 'status'); D.body.appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, ms || 2600);
  };

  /* ---------- 테마 ---------- */
  MS.THEMES = [
    ['#4B4DED', '바이올렛'], ['#E3157A', '핑크'], ['#EF5B2B', '코랄'],
    ['#0E9F6E', '그린'], ['#1D6FE8', '블루'], ['#7A3FF2', '퍼플'], ['#D9480F', '오렌지'], ['#1F2937', '먹색']
  ];
  MS.applyTheme = function () {
    var t = MS.content.theme || {};
    H.style.setProperty('--accent', t.accent || '#4B4DED');
    if (MS.fx) MS.fx.mode(t.ambient || 'sparkle');
  };

  /* =====================================================================
     저장소: 임시 저장(브라우저) + 파일 저장(content.js)
     ===================================================================== */
  var S = MS.store = { mode: 'file', dirty: false, key: '', root: '', handle: null, restored: false };
  var subs = [];
  S.on = function (fn) { subs.push(fn); };
  function emit(what) { subs.forEach(function (fn) { try { fn(what || 'state'); } catch (e) { console.error(e); } }); }

  function draftWrite(saved) {
    try {
      localStorage.setItem(S.key, JSON.stringify({ baseRev: MS.content.rev, saved: !!saved, t: Date.now(), content: MS.content }));
      S.quota = false;
    } catch (e) {
      if (!S.quota) MS.toast('내용이 커서 임시 저장을 못 했어요. [저장] 버튼으로 파일에 저장해 주세요.', 5000);
      S.quota = true;
    }
  }
  var dT;
  /* 내용이 바뀔 때마다 부르기 */
  S.touch = function () {
    S.dirty = true;
    clearTimeout(dT); dT = setTimeout(function () { draftWrite(false); }, 250);
    emit('state');
  };

  var HEADER = '/* 슬라이드 내용 파일입니다. 편집 도구의 [저장] 버튼이 이 파일을 덮어씁니다.\n' +
    '   직접 고쳐도 됩니다. *별표* 로 감싼 글자는 강조색, [대괄호] 는 프롬프트의 바꿔 쓸 부분입니다. */\n';
  function serialize(rev) {
    var c = MS.content, old = c.rev; c.rev = rev;
    var t = HEADER + 'window.CONTENT = ' + JSON.stringify(c, null, 2) + ';\n';
    c.rev = old; return t;
  }
  S.serialize = serialize;
  function revOf(text) { var m = /"rev":\s*(\d+)/.exec(text || ''); return m ? +m[1] : null; }

  function download(name, text, type) {
    var a = D.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/javascript;charset=utf-8' }));
    a.download = name; D.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  MS.download = download;

  /* 파일 핸들 기억 (같은 폴더에서 다시 열 때 다시 고르지 않도록) */
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('motion-slide', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('h'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet() {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var q = db.transaction('h').objectStore('h').get(S.key);
        q.onsuccess = function () { res(q.result || null); };
        q.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function idbSet(h) {
    idb().then(function (db) { db.transaction('h', 'readwrite').objectStore('h').put(h, S.key); }).catch(function () { });
  }

  function post(url, body, extra) {
    var h = { 'X-Motion-Slide': '1' };
    for (var k in (extra || {})) h[k] = extra[k];
    return fetch(url, { method: 'POST', headers: h, body: body });
  }

  S.saving = false;
  S.save = async function () {
    if (S.saving) return false;
    S.saving = true; emit('state');
    var prev = MS.content.rev, next = Math.max(Date.now(), (prev || 0) + 1);
    try {
      if (S.mode === 'server') {
        var r = await post('api/save', serialize(next), { 'Content-Type': 'text/plain;charset=utf-8', 'X-Base-Rev': String(prev) });
        if (r.status === 409) {
          if (!confirm('다른 창에서 먼저 저장한 내용이 있어요.\n지금 화면의 내용으로 덮어쓸까요?')) return false;
          r = await post('api/save', serialize(next), { 'Content-Type': 'text/plain;charset=utf-8', 'X-Force': '1' });
        }
        if (!r.ok) throw new Error('서버에 저장하지 못했어요 (' + r.status + ')');
      } else if (W.showOpenFilePicker) {
        var h = S.handle || await idbGet();
        if (h) {
          var p = await h.queryPermission({ mode: 'readwrite' });
          if (p !== 'granted') p = await h.requestPermission({ mode: 'readwrite' });
          if (p !== 'granted') h = null;
        }
        if (h) {
          var disk = revOf(await (await h.getFile()).text());
          if (disk !== null && disk !== prev &&
            !confirm('파일이 다른 창에서 먼저 저장되었어요.\n지금 화면의 내용으로 덮어쓸까요?')) return false;
        } else {
          alert('처음 한 번만 저장할 파일을 지정합니다.\n\n이 자료 폴더 안의  data  →  content.js  를 골라 주세요.\n(다음부터는 [저장]을 누르면 바로 저장됩니다)');
          var picked = await W.showOpenFilePicker({
            multiple: false,
            types: [{ description: '슬라이드 내용 파일 (content.js)', accept: { 'text/javascript': ['.js'] } }]
          });
          h = picked[0];
          var cur = await (await h.getFile()).text();
          if ((cur.indexOf('window.CONTENT') < 0 || revOf(cur) !== prev) &&
            !confirm('고른 파일이 지금 열려 있는 자료의 content.js 가 아닌 것 같아요.\n그래도 이 파일에 저장할까요?')) return false;
          if (await h.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('파일 쓰기 권한이 허용되지 않았어요.');
        }
        var w = await h.createWritable(); await w.write(serialize(next)); await w.close();
        S.handle = h; idbSet(h);
      } else {
        download('content.js', serialize(next));
        MS.toast('content.js 를 내려받았어요. 자료 폴더의 data 폴더에 덮어써 주세요.', 7000);
        return 'download';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      console.error(e); alert('저장하지 못했어요.\n' + (e && e.message || e)); return false;
    } finally { S.saving = false; emit('state'); }
    MS.content.rev = next; S.dirty = false; clearTimeout(dT); draftWrite(true);
    emit('state'); MS.toast('저장했어요');
    return true;
  };

  /* 이미지 넣기: 서버로 열었으면 assets/img 에 저장, 아니면 내용 파일 안에 넣기 */
  S.addImage = async function (file) {
    if (S.mode === 'server') {
      var name = file.name.replace(/[^\w.\-가-힣]+/g, '_');
      var r = await post('api/upload?name=' + encodeURIComponent(name), file, { 'Content-Type': 'application/octet-stream' });
      if (r.ok) { var j = await r.json(); return j.path; }
    }
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = D.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var png = /png|gif|svg/.test(file.type);
        var out = c.toDataURL(png ? 'image/webp' : 'image/jpeg', .86);
        if (out.indexOf('data:image/webp') !== 0 && png) out = c.toDataURL('image/png');
        res(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('이미지를 읽지 못했어요')); };
      img.src = url;
    });
  };

  /* 다른 탭에서 편집·저장하면 따라가기 */
  W.addEventListener('storage', function (e) {
    if (e.key !== S.key || !e.newValue) return;
    try {
      var d = JSON.parse(e.newValue);
      if (d.content && d.content.id === MS.content.id) {
        MS.content = W.CONTENT = d.content; S.dirty = !d.saved;
        MS.applyTheme(); emit('external');
      }
    } catch (x) { }
  });

  /* 시작: 임시 저장된 편집 내용이 있으면 이어서 불러온 뒤 fn 실행 */
  MS.boot = function (fn) {
    function go() {
      try {
        var d = JSON.parse(localStorage.getItem(S.key) || 'null'), fileRev = MS.content.rev;
        if (d && d.content && d.content.id === MS.content.id) {
          if (d.baseRev === fileRev) {
            if (!d.saved) { MS.content = W.CONTENT = d.content; S.dirty = true; S.restored = true; }
          } else if (d.baseRev > fileRev && confirm('이 파일보다 최신인 편집 내용이 브라우저에 남아 있어요.\n(저장할 때 다른 위치의 파일을 골랐을 수 있어요)\n\n그 내용을 불러올까요?')) {
            MS.content = W.CONTENT = d.content; MS.content.rev = fileRev; S.dirty = true; S.restored = true;
          } else localStorage.removeItem(S.key);
        }
      } catch (e) { }
      MS.applyTheme(); fn();
      if (S.restored) MS.toast('저장하지 않은 편집 내용을 이어서 불러왔어요', 3600);
    }
    var dir = decodeURI(location.pathname.replace(/[^\/]*$/, ''));
    if (/^http/.test(location.protocol)) {
      fetch('api/ping', { headers: { 'X-Motion-Slide': '1' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.ok) { S.mode = 'server'; S.root = j.root || ''; } })
        .catch(function () { })
        .then(function () { S.key = 'motion-slide:' + (S.root || location.host + dir); go(); });
    } else { S.key = 'motion-slide:' + dir; go(); }
  };

  /* =====================================================================
     배경 효과: 은은히 떠오르는 반짝이 / 눈 + 클릭할 때 작은 불꽃
     ===================================================================== */
  MS.fx = (function () {
    var cv = D.createElement('canvas'), ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, parts = [], bursts = [], mode = 'none', raf = 0, last = 0, col = [75, 77, 237];
    cv.className = 'ms-fx'; cv.setAttribute('aria-hidden', 'true');

    function readColor() {
      var v = (MS.content.theme && MS.content.theme.accent) || '#4B4DED';
      var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v);
      if (m) col = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    }
    function rgba(a) { return 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a + ')'; }
    function target() { return mode === 'none' || MS.reduce ? 0 : Math.min(mode === 'snow' ? 90 : 46, Math.round(w * h / (mode === 'snow' ? 21000 : 42000))); }
    function make(anywhere) {
      var r = Math.random;
      if (mode === 'snow') return { x: r() * w, y: anywhere ? r() * h : -12, r: 1.4 + r() * 3, vy: .3 + r() * .7, ph: r() * 6.28, sw: .3 + r() * .8, a: .55 + r() * .4, star: 0 };
      return { x: r() * w, y: anywhere ? r() * h : h + 12, r: 1.2 + r() * 2.8, vy: -(.1 + r() * .32), ph: r() * 6.28, sw: .2 + r() * .5, a: .16 + r() * .3, star: r() < .34 ? 1 : 0 };
    }
    function fill() { var n = target(); while (parts.length < n) parts.push(make(true)); if (parts.length > n) parts.length = n; }
    function resize() {
      dpr = Math.min(W.devicePixelRatio || 1, 2); w = W.innerWidth; h = W.innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fill(); wake();
    }
    function star(x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
      ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    }
    function frame(t) {
      raf = 0;
      var dt = last ? Math.min(2.4, (t - last) / 16.67) : 1; last = t;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.ph += .014 * dt; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * .4 * dt;
        if (p.y > h + 16 || p.y < -16 || p.x < -20 || p.x > w + 20) { parts[i] = make(false); continue; }
        if (mode === 'snow') {
          ctx.fillStyle = 'rgba(255,255,255,' + p.a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.4, 0, 6.283); ctx.fill();
          ctx.strokeStyle = rgba(p.a * .3); ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
        } else {
          var tw = .55 + .45 * Math.sin(p.ph * 2.2);
          ctx.fillStyle = rgba(p.a * tw);
          if (p.star) star(p.x, p.y, p.r * 2.6); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
        }
      }
      var now = performance.now();
      for (var k = bursts.length - 1; k >= 0; k--) {
        var b = bursts[k], q = (now - b.t) / 620;
        if (q >= 1) { bursts.splice(k, 1); continue; }
        var e = 1 - Math.pow(1 - q, 3);
        ctx.strokeStyle = rgba(.5 * (1 - q)); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(b.x, b.y, 6 + 22 * e, 0, 6.283); ctx.stroke();
        ctx.fillStyle = rgba(.9 * (1 - q));
        for (var j = 0; j < 8; j++) {
          var a = b.rot + j * .785, d = 8 + 30 * e;
          star(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d + 8 * q * q, (j % 2 ? 4.5 : 3) * (1 - q * .6));
        }
      }
      if (parts.length || bursts.length) wake();
    }
    function wake() { if (!raf && !D.hidden) raf = requestAnimationFrame(frame); }

    function start() {
      D.body.appendChild(cv); resize();
      W.addEventListener('resize', resize);
      D.addEventListener('visibilitychange', function () { last = 0; wake(); });
      D.addEventListener('pointerdown', function (e) {
        if (MS.reduce || e.target.closest('.ed-panel,input,textarea,select,[contenteditable]')) return;
        bursts.push({ x: e.clientX, y: e.clientY, t: performance.now(), rot: Math.random() * 6.28 });
        if (bursts.length > 10) bursts.shift();
        wake();
      }, true);
    }
    if (D.body) start(); else D.addEventListener('DOMContentLoaded', start);
    return {
      mode: function (m) { if (m !== mode) { mode = m; parts = []; } readColor(); fill(); last = 0; wake(); },
      current: function () { return mode; }
    };
  })();
})();
