/* =====================================================================
   hub.js — 전체 안내(허브) 페이지
   · 내용(data/content.js)의 hub 를 그림
   · 스크롤 등장, 대화창 타이핑 모션, 시간 막대, 숫자 카운트
   ===================================================================== */
(function () {
  'use strict';
  var W = window, D = document, MS = W.MS;
  var $ = MS.$, $$ = MS.$$, esc = MS.esc, fmt = MS.fmt, Ed = MS.editor;
  var app, chatT = 0, chatRun = 0, io = null;

  function hub() { return MS.content.hub; }
  var ML = { title: 1, sub: 1, flowDesc: 1, partsDesc: 1, closingTitle: 1, closingSub: 1, text: 1, flowTitle: 1, partsTitle: 1, prepTitle: 1, instTitle: 1 };
  /* 고칠 수 있는 글자 요소 */
  function T(p, tag, cls, o) {
    o = o || {};
    var v = MS.get(hub(), p); if (v == null) v = '';
    if (v === '' && !Ed.on) return '';
    var last = p.split('.').pop();
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + ' data-edit="' + p + '"' + (ML[last] ? ' data-ml' : '') +
      (Ed.on ? ' data-ph="입력"' : '') + (o.attr || '') + '>' + fmt(v) + '</' + tag + '>';
  }

  function render() {
    var h = hub(), parts = h.parts || [];
    var html = '';
    /* 상단 바 */
    html += '<header class="top" id="top"><div class="wrap">' + T('org', 'span', 'org') +
      '<nav aria-label="바로가기"><a href="#flow">연수 흐름</a><a href="#parts">강의 입장</a><a href="#prep">준비물</a><a href="#teacher">강사 소개</a></nav>' +
      '<button class="btn ghost sm top-edit" type="button">편집</button><a class="btn sm" href="#parts">강의 입장</a></div></header>';

    /* 히어로 */
    html += '<main><section class="hero" id="home"><div class="blobs" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">' +
      '<div class="hx-top reveal">' + T('org', 'span', 'hx-org') + '<span class="grow"></span>' + T('tag', 'span', 'hx-tag') + '</div>' +
      '<div class="hx-body"><div class="hx-text">' + T('title', 'h1', 'reveal d1') +
      '<p class="subt reveal d2">' + T('sub', 'span', '') + T('subStrong', 'b', '') + '</p>' +
      '<div class="hx-info reveal d2">' + (h.info || []).map(function (x, i) {
        return '<div>' + T('info.' + i + '.label', 'small', '') + T('info.' + i + '.value', 'b', i === 0 ? 'pk' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="cta reveal d3">' + parts.map(function (x, i) {
        return '<a class="btn' + (i ? ' ghost' : '') + '" href="' + esc(x.href || '#') + '">' + esc(String(x.tag || '').replace(/\*/g, '') + (x.when ? ' · ' + x.when : '')) + ' 입장</a>';
      }).join('') + '</div></div>' +
      '<div class="hx-art reveal d2" aria-hidden="true"><div class="chat"><div class="chat-bar"><i></i><i></i><i></i><span>AI 조교</span></div>' +
      '<div class="chat-body"><div class="bub me"><span></span></div><div class="bub ai"><b class="ai-dot"></b><span></span><i class="sk"></i><i class="sk s2"></i><i class="sk s3"></i></div></div>' +
      '<div class="chat-in"><span class="ci-text"></span><b class="ci-send"></b></div></div>' +
      '<span class="spark s1"></span><span class="spark s2"></span></div></div></div></section>';

    /* 연수 흐름 */
    html += '<section id="flow"><div class="wrap">' + T('flowKicker', 'span', 'kicker reveal') + T('flowTitle', 'h2', 'sec-h reveal d1') + T('flowDesc', 'p', 'sec-p reveal d2') +
      (h.sessions || []).map(function (ss, si) {
        var slots = ss.slots || [], n = 0, cols = slots.map(function (s) { return 'minmax(0,' + (+s.min || 10) + 'fr)'; }).join(' ');
        return '<div class="flow reveal d' + Math.min(si + 1, 3) + '">' + T('sessions.' + si + '.name', 'h3', 'flow-name') +
          '<div class="bar">' + slots.map(function (s, i) {
            return '<span class="' + ((+s.min || 10) <= 15 ? 'bm' : 'b' + (n++ % 2)) + '" style="flex:' + (+s.min || 10) + ';transition-delay:' + (i * .12) + 's"></span>';
          }).join('') + '</div>' +
          '<div class="slots" style="grid-template-columns:' + cols + '">' + slots.map(function (s, i) {
            var p = 'sessions.' + si + '.slots.' + i + '.';
            return '<div class="slot' + ((+s.min || 10) <= 15 ? ' mini' : '') + '">' + T(p + 'time', 'time', '') + T(p + 'title', 'h4', '') + T(p + 'text', 'p', '') + '</div>';
          }).join('') + '</div></div>';
      }).join('') + '</div></section>';

    /* 강의 입장 */
    html += '<section id="parts"><div class="wrap">' + T('partsKicker', 'span', 'kicker reveal') + T('partsTitle', 'h2', 'sec-h reveal d1') + T('partsDesc', 'p', 'sec-p reveal d2') +
      '<div class="parts">' + parts.map(function (x, i) {
        var p = 'parts.' + i + '.';
        return '<a class="pcard reveal d' + Math.min(i + 1, 3) + '" href="' + esc(x.href || '#') + '"><div class="pn">' + T(p + 'tag', 'b', '') + T(p + 'time', 'time', '') + '</div>' +
          T(p + 'title', 'h3', '') + '<ul>' + (x.items || []).map(function (it, k) { return T(p + 'items.' + k, 'li', ''); }).join('') + '</ul>' +
          '<div class="enter">' + T(p + 'ready', 'span', 'small') + '<span class="btn">' + (x.when ? esc(x.when) + ' · ' : '') + '입장하기</span></div></a>';
      }).join('') + '</div></div></section>';

    /* 준비물 */
    html += '<section id="prep"><div class="wrap">' + T('prepKicker', 'span', 'kicker reveal') + T('prepTitle', 'h2', 'sec-h reveal d1') +
      '<div class="preps">' + (h.prep || []).map(function (x, i) {
        var p = 'prep.' + i + '.';
        return '<div class="prep reveal d' + Math.min(i + 1, 3) + '">' + T(p + 'tag', 'b', 'c-tag') + T(p + 'title', 'h3', '') + T(p + 'text', 'p', '') + '</div>';
      }).join('') + '</div></div></section>';

    /* 강사 소개 */
    var inst = h.inst || {};
    html += '<section id="teacher"><div class="wrap">' + T('instKicker', 'span', 'kicker reveal') + T('instTitle', 'h2', 'sec-h reveal d1') +
      '<div class="inst"><aside class="inst-card reveal d1"><div class="avatar" aria-hidden="true">' + esc(String(inst.name || '강').replace(/\*/g, '').charAt(0)) + '</div>' +
      T('inst.name', 'h3', '') + T('inst.role', 'p', 'aff') +
      '<ul>' + (inst.lines || []).map(function (x, i) { return T('inst.lines.' + i, 'li', ''); }).join('') + '</ul>' +
      '<div class="chips">' + (inst.chips || []).map(function (x, i) { return T('inst.chips.' + i, 'span', 'chip'); }).join('') + '</div></aside>' +
      '<div class="stats4 reveal d2">' + T('statsTitle', 'p', 'st-h') + '<div class="st-row">' + (h.stats || []).map(function (x, i) {
        var p = 'stats.' + i + '.', num = /^[\d,]+$/.test(String(x.value || ''));
        return '<div class="st"><p class="v">' + T(p + 'value', 'b', '', { attr: num && !Ed.on ? ' data-count="' + String(x.value).replace(/,/g, '') + '"' : '' }) + T(p + 'unit', 'i', '') + '</p>' + T(p + 'label', 'span', '') + '</div>';
      }).join('') + '</div></div></div></div></section>';

    /* 마무리 */
    html += '<section class="closing"><div class="blobs" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap">' + T('closingKicker', 'span', 'kicker reveal') +
      T('closingTitle', 'h2', 'reveal d1') + T('closingSub', 'p', 'sec-p reveal d2') +
      '<div class="cta reveal d3">' + parts.map(function (x, i) {
        return '<a class="btn' + (i ? ' ghost' : '') + '" href="' + esc(x.href || '#') + '">' + esc(String(x.tag || '').replace(/\*/g, '') + (x.when ? ' · ' + x.when : '')) + ' 입장</a>';
      }).join('') + '</div></div></section></main>' +
      '<footer><div class="wrap"><span>' + esc(String(h.org || '').replace(/\*/g, '')) + '</span><span>E 키를 누르면 편집 도구가 열립니다</span></div></footer>';

    app.innerHTML = html;
    D.title = String(h.title || '').replace(/\*/g, '').replace(/\n/g, ' ');
    $('.top-edit', app).onclick = function () { Ed.toggle(); };
    if (Ed.arm) Ed.arm(app);
    observe(); chat(); onScroll();
  }

  /* ---------- 스크롤 등장 + 숫자 카운트 ---------- */
  function countUp(e) {
    var to = parseFloat(e.dataset.count) || 0, t0 = null;
    if (MS.reduce) { e.textContent = to.toLocaleString('ko-KR'); return; }
    function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1300); p = 1 - Math.pow(1 - p, 3); e.textContent = Math.round(to * p).toLocaleString('ko-KR'); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function observe() {
    if (io) io.disconnect();
    var els = $$('.reveal', app);
    if (Ed.on || MS.reduce || !W.IntersectionObserver) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in'); io.unobserve(en.target);
        $$('[data-count]', en.target).forEach(countUp);
      });
    }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
    /* 첫 화면에 보이는 것은 바로 등장, 나머지는 스크롤할 때 등장 */
    var vh = W.innerHeight;
    els.forEach(function (e) {
      if (e.getBoundingClientRect().top < vh * .92) {
        requestAnimationFrame(function () { requestAnimationFrame(function () { e.classList.add('in'); $$('[data-count]', e).forEach(countUp); }); });
        setTimeout(function () { e.classList.add('in'); }, 400);
      } else io.observe(e);
    });
  }
  function onScroll() { var t = $('#top', app); if (t) t.classList.toggle('sc', W.scrollY > 24); }

  /* ---------- 대화창 모션: 질문이 써지고 → 보내지고 → 답이 나타남 ---------- */
  function chat() {
    var run = ++chatRun; clearTimeout(chatT);
    var list = (hub().chat || []).filter(function (c) { return c && c.q; });
    var box = $('.chat', app); if (!box || !list.length) return;
    var input = $('.ci-text', box), me = $('.bub.me', box), ai = $('.bub.ai', box), send = $('.ci-send', box), i = 0;
    function wait(ms, fn) { chatT = setTimeout(function () { if (run === chatRun && box.isConnected) fn(); }, ms); }
    function type(el, text, speed, done) {
      var n = 0;
      (function tick() {
        if (run !== chatRun || !box.isConnected) return;
        n++; el.textContent = text.slice(0, n);
        if (n < text.length) chatT = setTimeout(tick, speed); else done();
      })();
    }
    function cycle() {
      var c = list[i % list.length]; i++;
      me.classList.remove('on'); ai.classList.remove('on', 'done'); input.textContent = ''; box.classList.add('typing');
      if (MS.reduce || Ed.on) {
        $('span', me).textContent = c.q; $('span', ai).textContent = c.a || ''; me.classList.add('on'); ai.classList.add('on', 'done'); box.classList.remove('typing');
        if (!Ed.on) wait(5200, cycle);
        return;
      }
      wait(500, function () {
        type(input, c.q, 46, function () {
          wait(380, function () {
            send.classList.add('hit'); wait(260, function () { send.classList.remove('hit'); });
            box.classList.remove('typing'); input.textContent = '';
            $('span', me).textContent = c.q; me.classList.add('on');
            $('span', ai).textContent = '';
            wait(520, function () {
              ai.classList.add('on');
              wait(1100, function () {
                ai.classList.add('done');
                type($('span', ai), c.a || '', 24, function () { wait(2600, cycle); });
              });
            });
          });
        });
      });
    }
    cycle();
  }

  /* ---------- 편집 패널 ---------- */
  var SCHEMA = [
    ['첫 화면', [
      { k: 'org', t: 'text', label: '연수 이름 (왼쪽 위)' }, { k: 'tag', t: 'text', label: '오른쪽 위 문구' },
      { k: 'title', t: 'area', label: '큰 제목', rows: 2, hint: '*별표*로 감싸면 강조색이 됩니다.' },
      { k: 'sub', t: 'text', label: '부제 1' }, { k: 'subStrong', t: 'text', label: '부제 2 (굵게)' },
      { k: 'info', t: 'list', label: '일시 · 시간 · 장소', item: '정보', blank: { label: '항목', value: '내용' }, sub: [{ k: 'label', t: 'text', label: '이름' }, { k: 'value', t: 'text', label: '내용' }] },
      { k: 'chat', t: 'list', label: '대화창 모션 (질문과 답)', item: '대화', blank: { q: '질문', a: '답' }, sub: [{ k: 'q', t: 'text', label: '질문' }, { k: 'a', t: 'text', label: '답' }] }
    ]],
    ['연수 흐름', [
      { k: 'flowKicker', t: 'text', label: '작은 머리말' }, { k: 'flowTitle', t: 'area', label: '제목', rows: 2 }, { k: 'flowDesc', t: 'area', label: '설명', rows: 3 },
      {
        k: 'sessions', t: 'list', label: '차시별 시간표', item: '차시', blank: { name: '새 차시', slots: [{ time: '0분', title: '내용', text: '', min: 30 }] }, sub: [
          { k: 'name', t: 'text', label: '차시 이름' },
          { k: 'slots', t: 'list', label: '시간 칸', item: '칸', blank: { time: '0분', title: '내용', text: '', min: 20 }, sub: [{ k: 'time', t: 'text', label: '시간' }, { k: 'title', t: 'text', label: '제목' }, { k: 'text', t: 'text', label: '설명' }, { k: 'min', t: 'number', label: '길이 (분) — 막대와 칸 너비', min: 5, step: 5 }] }
        ]
      }
    ]],
    ['강의 입장 카드', [
      { k: 'partsKicker', t: 'text', label: '작은 머리말' }, { k: 'partsTitle', t: 'area', label: '제목', rows: 2 }, { k: 'partsDesc', t: 'area', label: '설명', rows: 3 },
      {
        k: 'parts', t: 'list', label: '차시 카드', item: '카드', blank: { tag: '새 차시', time: '120분', title: '제목', items: ['내용'], ready: '준비물', href: 'part1.html' }, sub: [
          { k: 'tag', t: 'text', label: '차시 이름' }, { k: 'time', t: 'text', label: '시간' }, { k: 'when', t: 'text', label: '강의 일시 (입장 단추에 표시)' }, { k: 'title', t: 'area', label: '제목', rows: 2 },
          { k: 'items', t: 'lines', label: '다루는 내용', rows: 4 }, { k: 'ready', t: 'text', label: '준비 안내' }, { k: 'href', t: 'text', label: '열 파일 (part1.html 등)' }
        ]
      }
    ]],
    ['준비물', [
      { k: 'prepKicker', t: 'text', label: '작은 머리말' }, { k: 'prepTitle', t: 'area', label: '제목', rows: 2 },
      { k: 'prep', t: 'list', label: '준비물 카드', item: '카드', blank: { tag: '00', title: '준비물', text: '설명' }, sub: [{ k: 'tag', t: 'text', label: '번호' }, { k: 'title', t: 'text', label: '제목' }, { k: 'text', t: 'area', label: '설명', rows: 2 }] }
    ]],
    ['강사 소개', [
      { k: 'instKicker', t: 'text', label: '작은 머리말' }, { k: 'instTitle', t: 'area', label: '제목', rows: 2 },
      { k: 'inst.name', t: 'text', label: '이름' }, { k: 'inst.role', t: 'text', label: '소속 · 직함' },
      { k: 'inst.lines', t: 'lines', label: '약력', rows: 4 }, { k: 'inst.chips', t: 'lines', label: '꼬리표', rows: 4 },
      { k: 'statsTitle', t: 'text', label: '숫자 상자 제목' },
      { k: 'stats', t: 'list', label: '숫자', item: '숫자', blank: { value: '10', unit: '개', label: '설명' }, sub: [{ k: 'value', t: 'text', label: '숫자' }, { k: 'unit', t: 'text', label: '단위' }, { k: 'label', t: 'text', label: '설명' }] }
    ]],
    ['마무리', [
      { k: 'closingKicker', t: 'text', label: '작은 머리말' }, { k: 'closingTitle', t: 'area', label: '제목', rows: 2 }, { k: 'closingSub', t: 'area', label: '설명', rows: 2 }
    ]]
  ];
  function pageTab(box) {
    SCHEMA.forEach(function (sec, i) { Ed.form(Ed.group(box, sec[0], i === 0), sec[1], hub); });
  }
  function allTab(box) {
    Ed.themeUI(box);
    var g = Ed.group(box, '다른 화면');
    var p = Ed.el('p', 'ed-hint');
    p.innerHTML = Object.keys(MS.content.decks).map(function (k) { return '<a href="' + esc(k) + '.html">' + esc(MS.content.decks[k].part || k) + ' 슬라이드 편집하기</a>'; }).join(' · ');
    g.appendChild(p);
    Ed.backupUI(box); Ed.helpUI(box);
  }

  var rt;
  MS.boot(function () {
    app = D.getElementById('app');
    Ed.inline(app, function () { return hub(); }, function () { });
    render();
    W.addEventListener('scroll', onScroll, { passive: true });
    Ed.mount({
      tabs: function () { return [{ name: '페이지 내용', build: pageTab }, { name: '전체 설정', build: allTab }]; },
      rerender: function (kind) {
        if (kind === 'text') { clearTimeout(rt); rt = setTimeout(keepScroll, 220); return; }
        clearTimeout(rt); keepScroll();
      }
    });
  });
  function keepScroll() { var y = W.scrollY; render(); W.scrollTo(0, y); }
})();
