/* =====================================================================
   editor.js — 수정 도구 (허브 · 슬라이드 공용)
   · 오른쪽 편집 패널: 입력 칸, 목록 추가/삭제/순서, 테마 색, 백업
   · 화면의 글자를 직접 눌러 고치기
   · 되돌리기(⌘Z), 저장(⌘S)
   ===================================================================== */
(function () {
  'use strict';
  var W = window, D = document, MS = W.MS, S = MS.store;
  var Ed = MS.editor = { on: false };
  var host = null, panel, bodyEl, tabsEl, saveBtn, stateEl, undoBtn, activeTab = 0;
  var syncers = [], undo = [], lastSnap = 0;

  function el(tag, cls, text) {
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  Ed.el = el;
  Ed.button = function (label, fn, cls, title) {
    var b = el('button', 'ed-btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button'; if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  Ed.group = function (box, title, open) {
    var d = el('details', 'ed-group'); if (open !== false) d.open = true;
    d.appendChild(el('summary', '', title));
    var inner = el('div', 'ed-group-in'); d.appendChild(inner); box.appendChild(d);
    return inner;
  };

  /* ---------- 되돌리기 ---------- */
  function snap(force) {
    var now = Date.now();
    if (!force && now - lastSnap < 900) return;
    lastSnap = now;
    undo.push(JSON.stringify(MS.content));
    if (undo.length > 60) undo.shift();
    if (undoBtn) undoBtn.disabled = false;
  }
  Ed.snap = snap;
  Ed.undo = function () {
    if (!undo.length) { MS.toast('되돌릴 내용이 없어요'); return; }
    MS.content = W.CONTENT = JSON.parse(undo.pop());
    lastSnap = 0;
    if (undoBtn) undoBtn.disabled = !undo.length;
    MS.applyTheme(); S.touch();
    host.rerender('all'); Ed.refresh();
    MS.toast('되돌렸어요');
  };
  /* 내용을 바꿀 때는 항상 이 함수를 통해서 */
  Ed.change = function (fn, kind) {
    snap(kind === 'struct' || kind === 'all');
    fn(); S.touch();
    if (kind === 'theme') { MS.applyTheme(); return; }
    host.rerender(kind || 'text');
    if (kind === 'struct' || kind === 'all') Ed.refresh();
  };

  /* =====================================================================
     입력 칸 만들기
     field = { k:'경로', t:'text|area|lines|number|select|check|image|list', label, hint, sub, blank, opts, rows }
     ===================================================================== */
  var uid = 0;
  Ed.form = function (box, fields, target) {
    fields.forEach(function (f) {
      var row = el('div', 'ed-field ed-' + f.t), id = 'edf' + (++uid), inp;
      var read = function () { return MS.get(target(), f.k); };
      var write = function (v, kind) { Ed.change(function () { MS.set(target(), f.k, v); }, kind); };
      if (f.t !== 'check' && f.label) { var lb = el('label', 'ed-label', f.label); lb.htmlFor = id; row.appendChild(lb); }

      if (f.t === 'text' || f.t === 'number') {
        inp = el('input'); inp.type = f.t === 'number' ? 'number' : 'text'; inp.id = id;
        if (f.t === 'number') { inp.min = f.min == null ? 0 : f.min; inp.step = f.step || 1; }
        inp.value = read() == null ? '' : read();
        inp.addEventListener('input', function () { write(f.t === 'number' ? (parseFloat(inp.value) || 0) : inp.value); });
        syncers.push(function () { if (D.activeElement !== inp) inp.value = read() == null ? '' : read(); });
        row.appendChild(inp);
      } else if (f.t === 'area') {
        inp = el('textarea'); inp.id = id; inp.rows = f.rows || 3; inp.value = read() || '';
        inp.addEventListener('input', function () { write(inp.value); });
        syncers.push(function () { if (D.activeElement !== inp) inp.value = read() || ''; });
        row.appendChild(inp);
      } else if (f.t === 'lines') {
        inp = el('textarea'); inp.id = id; inp.rows = f.rows || 5; inp.value = (read() || []).join('\n');
        inp.addEventListener('input', function () {
          write(inp.value.split('\n').map(function (x) { return x.replace(/\s+$/, ''); }).filter(Boolean));
        });
        syncers.push(function () { if (D.activeElement !== inp) inp.value = (read() || []).join('\n'); });
        row.appendChild(inp);
        if (!f.hint) row.appendChild(el('p', 'ed-hint', '한 줄에 하나씩 적어요.'));
      } else if (f.t === 'select') {
        inp = el('select'); inp.id = id;
        f.opts.forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; inp.appendChild(op); });
        inp.value = read() == null ? f.opts[0][0] : read();
        inp.addEventListener('change', function () { write(inp.value, f.kind || 'struct'); });
        row.appendChild(inp);
      } else if (f.t === 'check') {
        var lab = el('label', 'ed-check'); inp = el('input'); inp.type = 'checkbox'; inp.checked = !!read();
        inp.addEventListener('change', function () { write(inp.checked, f.kind || 'struct'); });
        lab.appendChild(inp); lab.appendChild(el('span', '', f.label)); row.appendChild(lab);
      } else if (f.t === 'image') {
        var line = el('div', 'ed-row');
        inp = el('input'); inp.type = 'text'; inp.id = id; inp.placeholder = 'assets/img/파일이름.png';
        var cur = read() || ''; inp.value = cur.indexOf('data:') === 0 ? '(파일 안에 넣은 이미지)' : cur;
        inp.addEventListener('change', function () { if (inp.value.indexOf('(') !== 0) write(inp.value.trim(), 'struct'); });
        var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
        file.addEventListener('change', function () {
          if (!file.files[0]) return;
          S.addImage(file.files[0]).then(function (src) { write(src, 'struct'); })
            .catch(function (e) { alert(e.message || e); });
        });
        line.appendChild(inp); line.appendChild(file);
        line.appendChild(Ed.button('사진 고르기', function () { file.click(); }));
        line.appendChild(Ed.button('비우기', function () { write('', 'struct'); }, 'quiet'));
        row.appendChild(line);
      } else if (f.t === 'list') {
        var arr = read() || [], wrap = el('div', 'ed-list');
        arr.forEach(function (item, i) {
          var card = el('div', 'ed-item'), head = el('div', 'ed-item-h');
          head.appendChild(el('b', '', (f.item || '항목') + ' ' + (i + 1)));
          var move = function (d) {
            return function () {
              Ed.change(function () { var a = read(), j = i + d; if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; }, 'struct');
            };
          };
          var up = Ed.button('↑', move(-1), 'mini', '위로'); up.disabled = i === 0;
          var dn = Ed.button('↓', move(1), 'mini', '아래로'); dn.disabled = i === arr.length - 1;
          head.appendChild(up); head.appendChild(dn);
          head.appendChild(Ed.button('✕', function () { Ed.change(function () { read().splice(i, 1); }, 'struct'); }, 'mini danger', '삭제'));
          card.appendChild(head);
          Ed.form(card, f.sub, function () { return read()[i]; });
          wrap.appendChild(card);
        });
        row.appendChild(wrap);
        row.appendChild(Ed.button('＋ ' + (f.item || '항목') + ' 추가', function () {
          Ed.change(function () {
            var a = read(); if (!a) { a = []; MS.set(target(), f.k, a); }
            a.push(MS.clone(f.blank || {}));
          }, 'struct');
        }, 'add'));
      }
      if (f.hint) row.appendChild(el('p', 'ed-hint', f.hint));
      box.appendChild(row);
    });
  };

  /* ---------- 전체 설정: 테마 · 배경 효과 · 백업 ---------- */
  Ed.themeUI = function (box) {
    var g = Ed.group(box, '테마 색');
    var sw = el('div', 'ed-swatches'), t = MS.content.theme;
    var setAccent = function (c) {
      snap(true); MS.content.theme.accent = c; MS.applyTheme(); S.touch(); mark();
    };
    function mark() {
      MS.$$('.ed-sw', sw).forEach(function (b) { b.classList.toggle('on', b.dataset.c.toLowerCase() === (MS.content.theme.accent || '').toLowerCase()); });
      pick.value = MS.content.theme.accent || '#4B4DED';
    }
    MS.THEMES.forEach(function (th) {
      var b = el('button', 'ed-sw'); b.type = 'button'; b.title = th[1]; b.dataset.c = th[0]; b.style.background = th[0];
      b.addEventListener('click', function () { setAccent(th[0]); });
      sw.appendChild(b);
    });
    var pick = el('input'); pick.type = 'color'; pick.className = 'ed-color'; pick.title = '직접 고르기';
    pick.addEventListener('input', function () { MS.content.theme.accent = pick.value; MS.applyTheme(); S.touch(); mark(); });
    pick.addEventListener('pointerdown', function () { snap(true); });
    sw.appendChild(pick); g.appendChild(sw); mark();
    g.appendChild(el('p', 'ed-hint', '색 하나만 고르면 선·배경·글자색이 함께 맞춰집니다. 허브와 모든 차시에 같이 적용돼요.'));

    var g2 = Ed.group(box, '배경 효과');
    Ed.form(g2, [{
      k: 'ambient', t: 'select', label: '화면에 떠다니는 효과', kind: 'theme',
      opts: [['sparkle', '반짝이'], ['snow', '눈'], ['none', '없음']]
    }], function () { return MS.content.theme; });
  };

  Ed.backupUI = function (box) {
    var g = Ed.group(box, '저장 · 백업');
    var how = S.mode === 'server'
      ? '서버로 열려 있어요. [저장]을 누르면 data/content.js 에 바로 저장되고, 이전 내용은 data/backup 폴더에 남습니다.'
      : (W.showOpenFilePicker
        ? '파일로 열려 있어요. [저장]을 처음 누를 때 한 번만 data/content.js 를 골라 주면, 그다음부터는 바로 저장됩니다.'
        : '이 브라우저는 파일에 바로 저장할 수 없어요. [저장]을 누르면 content.js 를 내려받으니 data 폴더에 덮어써 주세요. (크롬·엣지 또는 "편집용으로 열기" 사용을 권장)');
    g.appendChild(el('p', 'ed-hint', how));
    g.appendChild(el('p', 'ed-hint', '저장 전 편집 내용도 이 브라우저에 임시 보관되어, 창을 닫았다 열어도 이어집니다.'));
    var row = el('div', 'ed-row wrap');
    row.appendChild(Ed.button('백업 파일 내려받기', function () {
      var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
      MS.download('슬라이드백업-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json',
        JSON.stringify(MS.content, null, 2), 'application/json');
    }));
    var file = el('input'); file.type = 'file'; file.accept = '.json,.js'; file.hidden = true;
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      f.text().then(function (txt) {
        var s = txt.indexOf('{'), e = txt.lastIndexOf('}');
        var data = JSON.parse(txt.slice(s, e + 1));
        if (!data.decks) throw new Error('슬라이드 내용 파일이 아니에요.');
        if (!confirm('지금 내용을 불러온 파일의 내용으로 바꿉니다. 계속할까요?\n(⌘Z 로 되돌릴 수 있어요)')) return;
        snap(true);
        data.rev = MS.content.rev; data.id = MS.content.id;
        MS.content = W.CONTENT = data; MS.applyTheme(); S.touch();
        host.rerender('all'); Ed.refresh(); MS.toast('불러왔어요. [저장]을 눌러 파일에 반영하세요.', 4200);
      }).catch(function (e) { alert('불러오지 못했어요.\n' + (e.message || e)); });
      file.value = '';
    });
    row.appendChild(file);
    row.appendChild(Ed.button('백업 파일 불러오기', function () { file.click(); }));
    g.appendChild(row);
  };

  Ed.helpUI = function (box) {
    var g = Ed.group(box, '편집 방법', false);
    ['화면의 글자를 직접 눌러 고칠 수 있어요.',
      '*별표*로 감싼 글자는 강조색으로 보입니다.',
      '프롬프트에서 [대괄호]는 바꿔 쓸 부분으로 표시돼요.',
      '⌘S 저장 · ⌘Z 되돌리기 · E 편집 켜고 끄기',
      '이미지는 assets/img 폴더에 넣고 경로를 적거나, [사진 고르기]로 넣습니다.'
    ].forEach(function (t) { g.appendChild(el('p', 'ed-hint', '· ' + t)); });
  };

  /* =====================================================================
     패널
     ===================================================================== */
  function build() {
    panel = el('aside', 'ed-panel'); panel.setAttribute('aria-label', '편집 도구');
    var head = el('div', 'ed-head');
    head.appendChild(el('b', 'ed-title', '편집 도구'));
    stateEl = el('span', 'ed-state'); head.appendChild(stateEl);
    undoBtn = Ed.button('되돌리기', Ed.undo, 'quiet', '되돌리기 (⌘Z)'); undoBtn.disabled = true; head.appendChild(undoBtn);
    saveBtn = Ed.button('저장', function () { S.save(); }, 'primary', '파일에 저장 (⌘S)'); head.appendChild(saveBtn);
    head.appendChild(Ed.button('✕', function () { Ed.toggle(false); }, 'mini', '편집 닫기 (E)'));
    panel.appendChild(head);
    tabsEl = el('div', 'ed-tabs'); panel.appendChild(tabsEl);
    bodyEl = el('div', 'ed-body'); panel.appendChild(bodyEl);
    D.body.appendChild(panel);
    state();
  }
  function state() {
    D.body.classList.toggle('ms-dirty', !!S.dirty);
    if (!stateEl) return;
    stateEl.textContent = S.saving ? '저장 중…' : (S.dirty ? '저장 안 됨' : '저장됨');
    stateEl.classList.toggle('dirty', !!S.dirty);
    saveBtn.disabled = !!S.saving;
  }

  /* 패널 다시 그리기 (스크롤 위치와 접힌 상태는 유지) */
  Ed.refresh = function () {
    if (!panel || !Ed.on) return;
    var top = bodyEl.scrollTop;
    var closed = MS.$$('details.ed-group', bodyEl).filter(function (d) { return !d.open; }).map(function (d) { return d.firstChild.textContent; });
    var opened = MS.$$('details.ed-group', bodyEl).filter(function (d) { return d.open; }).map(function (d) { return d.firstChild.textContent; });
    syncers = [];
    var tabs = host.tabs();
    if (activeTab >= tabs.length) activeTab = 0;
    tabsEl.innerHTML = '';
    tabs.forEach(function (t, i) {
      var b = el('button', 'ed-tab' + (i === activeTab ? ' on' : ''), t.name); b.type = 'button';
      b.addEventListener('click', function () { activeTab = i; bodyEl.scrollTop = 0; Ed.refresh(); });
      tabsEl.appendChild(b);
    });
    bodyEl.innerHTML = '';
    tabs[activeTab].build(bodyEl);
    MS.$$('details.ed-group', bodyEl).forEach(function (d) {
      var n = d.firstChild.textContent;
      if (closed.indexOf(n) >= 0) d.open = false; else if (opened.indexOf(n) >= 0) d.open = true;
    });
    bodyEl.scrollTop = top;
  };
  /* 화면에서 직접 고친 값을 패널 입력 칸에 반영 */
  Ed.sync = function () { syncers.forEach(function (fn) { try { fn(); } catch (e) { } }); };

  Ed.toggle = function (v) {
    Ed.on = v == null ? !Ed.on : !!v;
    try { sessionStorage.setItem('ms-edit', Ed.on ? '1' : ''); } catch (e) { }
    D.body.classList.toggle('editing', Ed.on);
    if (Ed.on && !panel) build();
    host.rerender('mode');
    if (Ed.on) Ed.refresh();
  };

  Ed.mount = function (h) {
    host = h;
    D.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey, k = (e.key || '').toLowerCase();
      if (mod && k === 's') { e.preventDefault(); if (Ed.on || S.dirty) S.save(); return; }
      var typing = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
      if (mod && k === 'z' && !e.shiftKey && Ed.on && !typing) { e.preventDefault(); Ed.undo(); return; }
      if (!mod && !e.altKey && (k === 'e' || k === 'ㄷ') && !typing) { e.preventDefault(); Ed.toggle(); }
    });
    var want = false;
    try { want = sessionStorage.getItem('ms-edit') === '1'; } catch (e) { }
    if (/[?&]edit\b/.test(location.search)) want = true;
    S.on(function (what) {
      state();
      if (what === 'external') { host.rerender('all'); if (Ed.on) Ed.refresh(); }
    });
    state();
    if (want) Ed.toggle(true);
  };

  /* =====================================================================
     화면에서 직접 고치기 — [data-edit="경로"] 요소
     resolve(el) → 그 경로가 가리키는 대상 객체
     ===================================================================== */
  function toRaw(node) {
    var out = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) out += n.nodeValue;
      else if (n.nodeName === 'BR') out += '\n';
      else if (n.nodeName === 'EM') { var t = toRaw(n); out += t ? '*' + t + '*' : ''; }
      else if (n.nodeName === 'DIV' || n.nodeName === 'P') out += (out && out.slice(-1) !== '\n' ? '\n' : '') + toRaw(n);
      else out += toRaw(n);
    });
    return out;
  }
  Ed.inline = function (root, resolve, after) {
    var plain = (function () { var d = D.createElement('div'); d.setAttribute('contenteditable', 'PLAINTEXT-ONLY'); return d.contentEditable === 'plaintext-only'; })();
    function editable(t) { return Ed.on && t && t.closest ? t.closest('[data-edit]') : null; }
    Ed.arm = function (scope) {
      MS.$$('[data-edit]', scope || root).forEach(function (e) {
        if (Ed.on) { e.setAttribute('contenteditable', plain ? 'plaintext-only' : 'true'); e.spellcheck = false; }
        else e.removeAttribute('contenteditable');
      });
    };
    root.addEventListener('focusin', function (e) { var t = editable(e.target); if (t) snap(true); });
    root.addEventListener('input', function (e) {
      var t = editable(e.target); if (!t) return;
      var obj = resolve(t); if (!obj) return;
      var v = toRaw(t).replace(/ /g, ' ');
      if (!t.hasAttribute('data-ml')) v = v.replace(/\n/g, ' ');
      MS.set(obj, t.dataset.edit, v); S.touch();
    });
    root.addEventListener('focusout', function (e) {
      var t = editable(e.target); if (!t) return;
      var obj = resolve(t); if (!obj) return;
      var v = MS.get(obj, t.dataset.edit); if (v == null) v = '';
      v = String(v).replace(/\s+$/, ''); MS.set(obj, t.dataset.edit, v);
      t.innerHTML = t.dataset.fmt === 'prompt' ? MS.fmtPrompt(v) : MS.fmt(v);
      Ed.sync(); if (after) after(t);
    });
    root.addEventListener('keydown', function (e) {
      var t = editable(e.target); if (!t) return;
      if (e.key === 'Escape') { e.preventDefault(); t.blur(); }
      else if (e.key === 'Enter' && !t.hasAttribute('data-ml')) { e.preventDefault(); t.blur(); }
    });
    root.addEventListener('paste', function (e) {
      var t = editable(e.target); if (!t || plain) return;
      e.preventDefault();
      D.execCommand('insertText', false, (e.clipboardData || W.clipboardData).getData('text/plain'));
    });
    /* 편집 중에는 글자를 눌러도 링크로 이동하지 않게 */
    root.addEventListener('click', function (e) {
      if (Ed.on && e.target.closest('[data-edit]') && e.target.closest('a')) e.preventDefault();
    }, true);
  };
})();
