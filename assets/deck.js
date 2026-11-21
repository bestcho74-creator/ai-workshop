/* =====================================================================
   deck.js — 모션 슬라이드 엔진
   · 1920×1080 무대를 화면에 맞춰 축소/확대
   · 내용(data/content.js)의 slides 배열을 레이아웃별로 그림
   · 등장 모션, 단계별 등장, 타이핑, 숫자 카운트, 타이머, 목록 보기, 교사 메모
   ===================================================================== */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement, MS = W.MS;
  var $ = MS.$, $$ = MS.$$, esc = MS.esc, fmt = MS.fmt, Ed = MS.editor, S = MS.store;
  var ID = D.body.dataset.deck || 'part1';

  /* =====================================================================
     레이아웃 정의 — fields 는 편집 패널의 입력 칸, sample 은 새 슬라이드의 기본 내용
     ===================================================================== */
  var HEAD = [
    { k: 'kicker', t: 'text', label: '작은 머리말' },
    { k: 'title', t: 'area', label: '제목', rows: 2, hint: '*별표*로 감싸면 강조색이 됩니다.' }
  ];
  var CALLOUT = { k: 'callout', t: 'area', label: '강조 상자 (비우면 숨김)', rows: 2 };
  var LAYOUTS = {
    cover: {
      name: '표지', desc: '큰 제목과 기본 정보',
      fields: [
        { k: 'kicker', t: 'text', label: '왼쪽 위 문구' }, { k: 'tag', t: 'text', label: '오른쪽 위 문구' },
        { k: 'title', t: 'area', label: '제목', rows: 2, hint: '*별표*로 감싸면 강조색이 됩니다.' },
        { k: 'sub', t: 'area', label: '부제', rows: 2 },
        { k: 'info', t: 'list', label: '정보 칸', item: '정보', blank: { label: '항목', value: '내용' }, sub: [{ k: 'label', t: 'text', label: '이름' }, { k: 'value', t: 'text', label: '내용' }] },
        { k: 'chips', t: 'lines', label: '꼬리표', rows: 3 }
      ],
      sample: { layout: 'cover', kicker: '차시 이름', tag: 'ONLINE', title: '제목을 입력하세요\n*강조할 부분*', sub: '부제를 입력하세요', info: [{ label: '시간', value: '120분' }, { label: '준비물', value: '로그인' }] }
    },
    section: {
      name: '구역 표지', desc: '큰 번호와 구역 제목',
      fields: [{ k: 'num', t: 'text', label: '번호' }, { k: 'title', t: 'area', label: '제목', rows: 2 }, { k: 'sub', t: 'area', label: '설명', rows: 2 }],
      sample: { layout: 'section', num: '01', title: '구역 제목', sub: '이 구역에서 다룰 내용을 한 줄로' }
    },
    bullets: {
      name: '글머리 목록', desc: '제목과 여러 줄 목록',
      fields: HEAD.concat([{ k: 'lead', t: 'area', label: '설명 (선택)', rows: 2 }, { k: 'items', t: 'lines', label: '목록', rows: 6 }, CALLOUT]),
      sample: { layout: 'bullets', kicker: '머리말', title: '제목을 *입력*하세요', items: ['첫 번째 내용', '두 번째 내용', '세 번째 내용'] }
    },
    cards: {
      name: '카드', desc: '나란히 놓인 카드 2~6장',
      fields: HEAD.concat([
        { k: 'lead', t: 'area', label: '설명 (선택)', rows: 2 },
        { k: 'cards', t: 'list', label: '카드', item: '카드', blank: { tag: '00', title: '카드 제목', text: '설명' }, sub: [{ k: 'tag', t: 'text', label: '큰 글자 (번호·낱말)' }, { k: 'title', t: 'text', label: '제목' }, { k: 'text', t: 'area', label: '설명', rows: 2 }] },
        { k: 'cols', t: 'select', label: '한 줄에 놓을 카드 수', opts: [['', '자동'], ['2', '2장'], ['3', '3장'], ['4', '4장']] },
        CALLOUT
      ]),
      sample: { layout: 'cards', kicker: '머리말', title: '제목을 *입력*하세요', cards: [{ tag: '01', title: '카드 제목', text: '설명' }, { tag: '02', title: '카드 제목', text: '설명' }, { tag: '03', title: '카드 제목', text: '설명' }] }
    },
    flips: {
      name: '뒤집는 카드', desc: '누르면 뒷면이 보이는 카드',
      fields: HEAD.concat([{ k: 'cards', t: 'list', label: '카드', item: '카드', blank: { front: '앞면', back: '뒷면' }, sub: [{ k: 'front', t: 'area', label: '앞면', rows: 2 }, { k: 'back', t: 'area', label: '뒷면', rows: 2 }] }]),
      sample: { layout: 'flips', kicker: '머리말', title: '제목을 *입력*하세요', cards: [{ front: '질문이나 상황', back: '답이나 해결' }, { front: '질문이나 상황', back: '답이나 해결' }, { front: '질문이나 상황', back: '답이나 해결' }] }
    },
    flow: {
      name: '흐름 · 단계', desc: '번호가 이어지는 단계와 시간표',
      fields: HEAD.concat([
        { k: 'nodes', t: 'list', label: '단계', item: '단계', blank: { title: '단계 이름', text: '설명' }, sub: [{ k: 'title', t: 'text', label: '이름' }, { k: 'text', t: 'text', label: '설명' }] },
        { k: 'rows', t: 'list', label: '시간표 (선택)', item: '줄', blank: { time: '0분', text: '내용' }, sub: [{ k: 'time', t: 'text', label: '시간' }, { k: 'text', t: 'text', label: '내용' }] }
      ]),
      sample: { layout: 'flow', kicker: '머리말', title: '제목을 *입력*하세요', nodes: [{ title: '첫 단계', text: '설명' }, { title: '둘째 단계', text: '설명' }, { title: '셋째 단계', text: '설명' }] }
    },
    compare: {
      name: '비교', desc: '왼쪽과 오른쪽을 나란히',
      fields: HEAD.concat([
        { k: 'left.label', t: 'text', label: '왼쪽 · 꼬리표' }, { k: 'left.title', t: 'area', label: '왼쪽 · 제목', rows: 2 }, { k: 'left.items', t: 'lines', label: '왼쪽 · 목록', rows: 4 },
        { k: 'right.label', t: 'text', label: '오른쪽 · 꼬리표' }, { k: 'right.title', t: 'area', label: '오른쪽 · 제목', rows: 2 }, { k: 'right.items', t: 'lines', label: '오른쪽 · 목록', rows: 4 },
        { k: 'plain', t: 'check', label: '좌우를 같은 톤으로 (전·후 구분 없이 나란히)' },
        CALLOUT
      ]),
      sample: { layout: 'compare', kicker: '머리말', title: '제목을 *입력*하세요', left: { label: '전', title: '바꾸기 전', items: ['내용', '내용'] }, right: { label: '후', title: '바꾼 뒤', items: ['내용', '내용'] } }
    },
    prompt: {
      name: '프롬프트', desc: '타이핑되는 프롬프트와 복사 버튼',
      fields: HEAD.concat([
        { k: 'promptTitle', t: 'text', label: '프롬프트 이름' },
        { k: 'prompt', t: 'area', label: '프롬프트', rows: 10, hint: '[대괄호] 안은 바꿔 쓸 부분으로 표시됩니다.' },
        { k: 'tips', t: 'lines', label: '오른쪽 꿀팁 (비우면 프롬프트만 크게)', rows: 4 }
      ]),
      sample: { layout: 'prompt', kicker: '복사해서 써 보세요', title: '제목을 *입력*하세요', promptTitle: '프롬프트 이름', prompt: '너는 [역할]이야.\n[상황]에서 [과제]를 해 줘.\n- 형식: [형식]', tips: ['꿀팁 한 줄', '꿀팁 한 줄'] }
    },
    quote: {
      name: '한 문장', desc: '화면 가운데 큰 문장',
      fields: [{ k: 'kicker', t: 'text', label: '작은 머리말' }, { k: 'text', t: 'area', label: '문장', rows: 3, hint: '*별표*로 감싸면 강조색이 됩니다.' }, { k: 'by', t: 'text', label: '아래 작은 글 (선택)' }],
      sample: { layout: 'quote', kicker: '기억할 한 문장', text: '전하고 싶은 문장을\n*여기에* 적으세요', by: '' }
    },
    image: {
      name: '이미지', desc: '사진·캡처와 설명',
      fields: HEAD.concat([
        { k: 'src', t: 'image', label: '이미지' }, { k: 'caption', t: 'text', label: '이미지 아래 설명 (선택)' },
        { k: 'text', t: 'area', label: '옆에 놓을 글', rows: 4 },
        { k: 'side', t: 'select', label: '배치', opts: [['right', '글 왼쪽 · 그림 오른쪽'], ['left', '그림 왼쪽 · 글 오른쪽'], ['full', '그림만 크게']] }
      ]),
      sample: { layout: 'image', kicker: '머리말', title: '제목을 *입력*하세요', src: '', caption: '', text: '이미지 옆에 놓을 설명을 적으세요.', side: 'right' }
    },
    guide: {
      name: '따라 하기', desc: '실제 화면을 한 단계씩 넘기며 따라 하기',
      fields: HEAD.concat([
        {
          k: 'steps', t: 'list', label: '단계', item: '단계', blank: { src: '', title: '단계 이름', text: '무엇을 누르고 입력할지 적으세요.' }, sub: [
            { k: 'src', t: 'image', label: '화면 (사진 · 움직이는 그림)' }, { k: 'title', t: 'text', label: '단계 이름' }, { k: 'text', t: 'area', label: '설명', rows: 2 },
            { k: 'say', t: 'area', label: '입력할 말 (선택 · 복사 버튼이 생깁니다)', rows: 3 },
            { k: 'x', t: 'number', label: '누를 곳 표시 — 가로 % (0이면 숨김)' }, { k: 'y', t: 'number', label: '누를 곳 표시 — 세로 %' }
          ]
        }
      ]),
      sample: { layout: 'guide', kicker: '따라 하기', title: '화면을 보며 *천천히* 따라 하세요', steps: [{ src: '', title: '첫 단계', text: '무엇을 누르고 입력할지 적으세요.' }, { src: '', title: '둘째 단계', text: '무엇을 누르고 입력할지 적으세요.' }] }
    },
    gallery: {
      name: '나란히 보기', desc: '그림 · 영상 여러 개를 나란히 비교',
      fields: HEAD.concat([
        { k: 'lead', t: 'area', label: '설명 (선택)', rows: 2 },
        {
          k: 'items', t: 'list', label: '항목', item: '항목', blank: { src: '', label: '이름', text: '' }, sub: [
            { k: 'src', t: 'image', label: '그림 · 영상 (영상은 경로를 직접 적어요)' }, { k: 'label', t: 'text', label: '이름' }, { k: 'text', t: 'text', label: '한 줄 설명' }
          ]
        },
        { k: 'cols', t: 'select', label: '한 줄에 놓을 개수', opts: [['', '자동'], ['2', '2개'], ['3', '3개'], ['4', '4개'], ['5', '5개']] },
        { k: 'step', t: 'check', label: '하나씩 차례로 보여 주기' },
        CALLOUT
      ]),
      sample: { layout: 'gallery', kicker: '머리말', title: '나란히 놓고 *비교*해 보세요', items: [{ src: '', label: '첫째', text: '' }, { src: '', label: '둘째', text: '' }, { src: '', label: '셋째', text: '' }] }
    },
    stats: {
      name: '숫자', desc: '올라가는 숫자로 보여 주기',
      fields: HEAD.concat([{ k: 'stats', t: 'list', label: '숫자', item: '숫자', blank: { value: '10', unit: '개', label: '설명' }, sub: [{ k: 'value', t: 'text', label: '숫자' }, { k: 'unit', t: 'text', label: '단위' }, { k: 'label', t: 'text', label: '설명' }] }]),
      sample: { layout: 'stats', kicker: '머리말', title: '숫자로 보는 *제목*', stats: [{ value: '10', unit: '개', label: '설명' }, { value: '3', unit: '번', label: '설명' }, { value: '120', unit: '분', label: '설명' }] }
    },
    table: {
      name: '표', desc: '간단한 표',
      fields: HEAD.concat([{ k: 'table', t: 'area', label: '표 내용', rows: 8, hint: '칸은 | 기호로 나누고, 첫 줄은 제목 줄입니다.' }]),
      sample: { layout: 'table', kicker: '머리말', title: '제목을 *입력*하세요', table: '구분 | 내용 | 비고\n첫째 | 내용 | -\n둘째 | 내용 | -' }
    },
    checklist: {
      name: '체크리스트', desc: '눌러서 체크하는 점검표',
      fields: HEAD.concat([{ k: 'items', t: 'lines', label: '점검 항목', rows: 6 }]),
      sample: { layout: 'checklist', kicker: '머리말', title: '제목을 *입력*하세요', items: ['첫 번째 점검 항목', '두 번째 점검 항목', '세 번째 점검 항목'] }
    },
    practice: {
      name: '실습 · 타이머', desc: '미션, 순서, 카운트다운',
      fields: HEAD.concat([{ k: 'mission', t: 'area', label: '미션', rows: 3 }, { k: 'steps', t: 'lines', label: '순서', rows: 5 }, { k: 'minutes', t: 'number', label: '타이머 (분, 0이면 숨김)', step: .5 }]),
      sample: { layout: 'practice', kicker: '실습', title: '실습 제목', mission: '무엇을 해 볼지 *한 문장*으로 적으세요.', steps: ['첫 단계', '둘째 단계', '셋째 단계'], minutes: 5 }
    },
    closing: {
      name: '마무리', desc: '가운데 큰 인사',
      fields: [{ k: 'kicker', t: 'text', label: '작은 머리말' }, { k: 'title', t: 'area', label: '제목', rows: 2 }, { k: 'sub', t: 'area', label: '설명', rows: 2 }, { k: 'chips', t: 'lines', label: '꼬리표', rows: 3 }],
      sample: { layout: 'closing', kicker: 'THANK YOU', title: '마무리 인사를\n*여기에*', sub: '한 줄 덧붙이기' }
    }
  };
  var ANIMS = [['', '기본 (아래에서 위로)'], ['pop', '톡 튀어나오기'], ['blur', '흐릿하게 나타나기'], ['left', '왼쪽에서'], ['right', '오른쪽에서'], ['zoom', '확대되며'], ['down', '위에서 아래로'], ['fade', '서서히']];

  function deck() {
    var d = MS.content.decks[ID];
    if (!d) d = MS.content.decks[ID] = { part: ID, title: '새 차시', slides: [] };
    if (!d.slides || !d.slides.length) d.slides = [MS.clone(LAYOUTS.cover.sample)];
    return d;
  }
  function slides() { return deck().slides; }
  function fieldDef(layout, path) {
    var L = LAYOUTS[layout]; if (!L) return null;
    var parts = path.split('.');
    for (var i = 0; i < L.fields.length; i++) {
      var f = L.fields[i];
      if (f.k === path) return f;
      if (f.t === 'list' && f.k === parts[0] && parts.length === 3) {
        for (var j = 0; j < f.sub.length; j++) if (f.sub[j].k === parts[2]) return f.sub[j];
      }
      if (f.t === 'lines' && path.indexOf(f.k + '.') === 0) return { t: 'text', label: f.label };
    }
    return null;
  }

  /* =====================================================================
     그리기
     ===================================================================== */
  /* 고칠 수 있는 글자 요소 하나 */
  function T(s, p, tag, cls, an, o) {
    o = o || {};
    var v = MS.get(s, p); if (v == null) v = '';
    if (v === '' && !Ed.on) return '';
    var f = fieldDef(s.layout, p) || {};
    var a = ' data-edit="' + p + '"';
    if (f.t === 'area') a += ' data-ml';
    if (o.fmt) a += ' data-fmt="' + o.fmt + '"';
    if (Ed.on) a += ' data-ph="' + esc((f.label || '입력').replace(/\s*\(.*\)$/, '')) + '"';
    if (an) a += ' data-in="' + an + '"';
    if (o.frag) a += ' data-frag';
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + a + (o.attr || '') + '>' +
      (o.fmt === 'prompt' ? MS.fmtPrompt(v) : fmt(v)) + '</' + tag + '>';
  }
  function head(s, A) {
    return '<header class="head">' + T(s, 'kicker', 'span', 'kicker', 'fade') + T(s, 'title', 'h2', '', A) + T(s, 'lead', 'p', 'lead', A) + '</header>';
  }
  function callout(s, A) {
    var inner = T(s, 'callout', 'p', '');
    return inner ? '<div class="callout" data-in="' + A + '"' + (s.step ? ' data-frag' : '') + '><i class="co-ic"></i>' + inner + '</div>' : '';
  }
  function chips(s, A) {
    var c = s.chips || [];
    return c.length ? '<div class="chips" data-in="' + A + '">' + c.map(function (x, i) { return T(s, 'chips.' + i, 'span', 'chip'); }).join('') + '</div>' : '';
  }
  var BLOBS = '<div class="blobs" aria-hidden="true"><i></i><i></i><i></i></div>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  var R = {};
  R.cover = function (s, A) {
    var info = s.info || [];
    return BLOBS + '<div class="inner cv">' +
      '<div class="cv-top" data-in="fade">' + T(s, 'kicker', 'span', 'cv-kicker') + '<span class="grow"></span>' + T(s, 'tag', 'span', 'cv-tag') + '</div>' +
      T(s, 'title', 'h1', 'cv-title', A === 'up' ? 'blur' : A) + T(s, 'sub', 'p', 'lead cv-sub', A) +
      (info.length ? '<div class="cv-info">' + info.map(function (x, i) {
        return '<div data-in="' + A + '">' + T(s, 'info.' + i + '.label', 'small', '') + T(s, 'info.' + i + '.value', 'b', '') + '</div>';
      }).join('') + '</div>' : '') + chips(s, A) + '</div>';
  };
  R.section = function (s, A) {
    return '<div class="inner sec">' + T(s, 'num', 'div', 'sec-num', 'pop') + T(s, 'title', 'h1', '', A) + T(s, 'sub', 'p', 'lead', A) + '<i class="sec-line" data-in="line"></i></div>';
  };
  R.bullets = function (s, A) {
    return '<div class="inner">' + head(s, A) + '<ul class="dots big">' + (s.items || []).map(function (x, i) {
      return T(s, 'items.' + i, 'li', '', A, { frag: s.step });
    }).join('') + '</ul>' + callout(s, A) + '</div>';
  };
  R.cards = function (s, A) {
    var c = s.cards || [], n = +s.cols || (c.length <= 4 ? Math.max(c.length, 1) : 3);
    return '<div class="inner">' + head(s, A) + '<div class="cards' + (c.length > 4 ? ' dense' : '') + '" style="--n:' + n + '">' + c.map(function (x, i) {
      var p = 'cards.' + i + '.';
      return '<div class="card" data-in="' + A + '"' + (s.step ? ' data-frag' : '') + '>' +
        T(s, p + 'tag', 'b', 'c-tag' + (String(x.tag || '').length > 3 ? ' long' : '')) + T(s, p + 'title', 'h3', '') + T(s, p + 'text', 'p', '') + '</div>';
    }).join('') + '</div>' + callout(s, A) + '</div>';
  };
  R.flips = function (s, A) {
    var c = s.cards || [];
    return '<div class="inner">' + head(s, A) + '<div class="flips" style="--n:' + Math.min(Math.max(c.length, 1), 4) + '">' + c.map(function (x, i) {
      var p = 'cards.' + i + '.';
      return '<div class="flip" data-in="' + A + '"' + (Ed.on ? '' : ' tabindex="0" role="button"') + '><div class="flip-in">' +
        '<div class="f-front"><b class="f-num">' + (i < 9 ? '0' : '') + (i + 1) + '</b>' + T(s, p + 'front', 'h3', '') + '<span class="f-hint">눌러서 열기</span></div>' +
        '<div class="f-back">' + T(s, p + 'back', 'p', '') + '</div></div>' +
        (Ed.on ? '<button class="f-turn" type="button">뒤집어 보기</button>' : '') + '</div>';
    }).join('') + '</div></div>';
  };
  R.flow = function (s, A) {
    var n = s.nodes || [], r = s.rows || [];
    return '<div class="inner">' + head(s, A) + '<div class="flow-line" style="--n:' + Math.max(n.length, 1) + '">' + n.map(function (x, i) {
      var p = 'nodes.' + i + '.';
      return '<div class="fl" data-in="pop"' + (s.step ? ' data-frag' : '') + '><i>' + (i + 1) + '</i>' + T(s, p + 'title', 'b', '') + T(s, p + 'text', 'small', '') + '</div>';
    }).join('') + '</div>' + (r.length ? '<div class="rows" style="--r:' + Math.ceil(r.length / 2) + '" data-in="' + A + '">' + r.map(function (x, i) {
      var p = 'rows.' + i + '.';
      return '<div class="rw">' + T(s, p + 'time', 'time', '') + T(s, p + 'text', 'span', '') + '</div>';
    }).join('') + '</div>' : '') + '</div>';
  };
  function side(s, k, cls) {
    var o = s[k] || {};
    return '<div class="vs-p ' + cls + '" data-in="' + (cls === 'a' ? 'left' : 'right') + '">' + T(s, k + '.label', 'span', 'vs-label') + T(s, k + '.title', 'h3', '') +
      '<ul class="dots">' + (o.items || []).map(function (x, i) { return T(s, k + '.items.' + i, 'li', ''); }).join('') + '</ul></div>';
  }
  R.compare = function (s, A) {
    return '<div class="inner">' + head(s, A) + '<div class="vs' + (s.plain ? ' plain' : '') + '">' + side(s, 'left', 'a') +
      '<i class="vs-mid" data-in="pop">' + (s.plain ? 'VS' : ARROW) + '</i>' + side(s, 'right', 'b') + '</div>' + callout(s, A) + '</div>';
  };
  R.prompt = function (s, A) {
    var tips = s.tips || [];
    return '<div class="inner">' + head(s, A) + '<div class="pr' + (tips.length ? '' : ' solo') + '"><div class="prompt" data-in="' + A + '">' +
      '<div class="p-head"><i class="p-dots"></i>' + T(s, 'promptTitle', 'span', 'p-title') + '<span class="grow"></span>' +
      (Ed.on ? '' : '<span class="p-hint">색칠된 곳은 눌러서 고치고 · 상자를 누르면 복사</span>') + '<button class="btn sm copy" type="button">복사</button></div>' +
      T(s, 'prompt', 'pre', 'p-body', '', { fmt: 'prompt' }) + '</div>' +
      (tips.length ? '<ul class="tips">' + tips.map(function (x, i) { return T(s, 'tips.' + i, 'li', '', 'right', { frag: s.step }); }).join('') + '</ul>' : '') + '</div></div>';
  };
  R.quote = function (s, A) {
    return BLOBS + '<div class="inner center qt">' + T(s, 'kicker', 'span', 'kicker', 'fade') + T(s, 'text', 'blockquote', '', A === 'up' ? 'blur' : A) + T(s, 'by', 'p', 'lead', A) + '</div>';
  };
  R.image = function (s, A) {
    var where = s.side || 'right';
    var pic = '<figure class="pic" data-in="zoom">' + (s.src ? media(s.src) :
      '<div class="pic-empty">' + (Ed.on ? '오른쪽 편집 도구에서 이미지를 넣어 주세요' : '') + '</div>') + T(s, 'caption', 'figcaption', '') + '</figure>';
    var txt = where === 'full' ? '' : '<div class="pic-text">' + T(s, 'text', 'p', 'lead', A) + '</div>';
    return '<div class="inner">' + head(s, A) + '<div class="pic-wrap ' + where + '">' + (where === 'left' ? pic + txt : txt + pic) + '</div></div>';
  };
  function gMark(x) {
    return (+x.x || +x.y) ? '<i class="g-mark" style="left:' + (+x.x || 0) + '%;top:' + (+x.y || 0) + '%"></i>' : '';
  }
  function isVideo(src) { return /\.(mp4|webm|mov)(\?|$)/i.test(src || ''); }
  /* 그림이면 <img>, 영상이면 소리 없이 되풀이되는 <video> */
  function isPage(src) { return /\.html?(\?|#|$)/i.test(src || ''); }
  function media(src, big) {
    if (isPage(src)) return '<iframe class="embed" src="' + esc(src) + '" title="직접 눌러 보는 화면" loading="lazy"></iframe>';
    return isVideo(src) ? '<video src="' + esc(src) + '" loop playsinline preload="metadata"' + (big ? ' controls autoplay' : ' muted') + '></video>' : '<img src="' + esc(src) + '" alt="">';
  }
  R.gallery = function (s, A) {
    var it = s.items || [], n = +s.cols || Math.min(Math.max(it.length, 1), 4);
    return '<div class="inner">' + head(s, A) + '<div class="gal' + (it.length > n ? ' multi' : '') + '" style="--n:' + n + '">' + it.map(function (x, i) {
      var p = 'items.' + i + '.';
      return '<figure class="gal-i" data-k="' + i + '" data-in="' + A + '"' + (s.step ? ' data-frag' : '') + '><div class="gal-m">' +
        (x.src ? media(x.src) : '<div class="pic-empty">' + (Ed.on ? '편집 도구에서 그림을 넣어 주세요' : '준비 중') + '</div>') + '</div>' +
        '<figcaption>' + T(s, p + 'label', 'b', '') + T(s, p + 'text', 'span', '') + '</figcaption></figure>';
    }).join('') + '</div>' + callout(s, A) + '</div>';
  };
  R.guide = function (s, A) {
    var st = s.steps || [];
    return '<div class="inner">' + head(s, A) + '<div class="guide" data-at="0"><div class="g-stage" data-in="zoom">' + st.map(function (x, i) {
      return '<figure class="g-shot' + (i ? '' : ' on') + '">' + (x.src ? '<div class="g-frame">' + media(x.src) + gMark(x) + '</div>' :
        '<div class="pic-empty">' + (Ed.on ? '편집 도구에서 이 단계의 화면을 넣어 주세요' : '화면 준비 중') + '</div>') + '</figure>';
    }).join('') + '<span class="g-cnt"></span><span class="g-hint">화면을 누르면 크게 보여요</span></div>' +
      '<ol class="g-list">' + st.map(function (x, i) {
        var p = 'steps.' + i + '.';
        return '<li class="g-step' + (i ? '' : ' on') + '" data-k="' + i + '" data-in="right"><i>' + (i + 1) + '</i><div class="g-body">' + T(s, p + 'title', 'b', 'g-t') + T(s, p + 'text', 'p', 'g-d') +
          (x.say || Ed.on ? '<div class="g-say">' + T(s, p + 'say', 'pre', 'g-say-t', '', { fmt: 'prompt' }) + '<button class="btn sm g-copy" type="button">복사</button></div>' : '') + '</div></li>';
      }).join('') + '</ol></div></div>';
  };
  R.stats = function (s, A) {
    var st = s.stats || [];
    return '<div class="inner">' + head(s, A) + '<div class="stats" style="--n:' + Math.max(st.length, 1) + '">' + st.map(function (x, i) {
      var p = 'stats.' + i + '.', num = /^[\d,]+(\.\d+)?$/.test(String(x.value || ''));
      return '<div class="st" data-in="' + A + '"><p class="v">' +
        T(s, p + 'value', 'b', '', '', { attr: num && !Ed.on ? ' data-count="' + String(x.value).replace(/,/g, '') + '"' : '' }) + T(s, p + 'unit', 'i', '') + '</p>' + T(s, p + 'label', 'span', '') + '</div>';
    }).join('') + '</div></div>';
  };
  R.table = function (s, A) {
    var rows = String(s.table || '').split('\n').filter(function (r) { return r.trim(); }).map(function (r) { return r.split('|').map(function (c) { return c.trim(); }); });
    var h = rows.shift() || [];
    return '<div class="inner">' + head(s, A) + '<table class="tbl" data-in="' + A + '"><thead><tr>' + h.map(function (c) { return '<th>' + fmt(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i ? '<td>' + fmt(c) + '</td>' : '<th>' + fmt(c) + '</th>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      (Ed.on ? '<p class="small">표의 내용은 오른쪽 편집 도구에서 고칩니다.</p>' : '') + '</div>';
  };
  R.checklist = function (s, A) {
    return '<div class="inner">' + head(s, A) + '<div class="checklist">' + (s.items || []).map(function (x, i) {
      return '<div class="check" role="checkbox" aria-checked="false"' + (Ed.on ? '' : ' tabindex="0"') + ' data-in="' + A + '"><i></i>' + T(s, 'items.' + i, 'span', '') + '</div>';
    }).join('') + '<p class="ck-done small"></p></div></div>';
  };
  R.practice = function (s, A) {
    var st = s.steps || [], sec = Math.max(0, Math.round((+s.minutes || 0) * 60));
    return '<div class="inner">' + head(s, A) + '<div class="prac' + (sec ? '' : ' solo') + '"><div class="prac-l">' + T(s, 'mission', 'p', 'lead mission', A) +
      '<ol class="nums">' + st.map(function (x, i) { return '<li data-in="' + A + '"><i>' + (i + 1) + '</i>' + T(s, 'steps.' + i, 'span', '') + '</li>'; }).join('') + '</ol></div>' +
      (sec ? '<div class="timer" data-sec="' + sec + '" data-in="pop"><div class="t-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="tr" cx="60" cy="60" r="52"/><circle class="tp" cx="60" cy="60" r="52"/></svg><div class="t-num"></div></div>' +
        '<div class="t-btns"><button class="btn t-go" type="button">시작</button><button class="btn ghost t-reset" type="button">다시</button></div></div>' : '') + '</div></div>';
  };
  R.closing = function (s, A) {
    return BLOBS + '<div class="inner center cl">' + T(s, 'kicker', 'span', 'kicker', 'fade') + T(s, 'title', 'h1', '', A === 'up' ? 'blur' : A) + T(s, 'sub', 'p', 'lead', A) + chips(s, A) + '</div>';
  };

  function renderSlide(s, i) {
    var L = R[s.layout] ? s.layout : 'bullets';
    return '<section class="slide l-' + L + (s.hidden ? ' is-hidden' : '') + '" data-i="' + i + '">' + R[L](s, s.anim || 'up') +
      (s.hidden && Ed.on ? '<span class="hid-badge">숨긴 슬라이드 · 발표할 때는 건너뜁니다</span>' : '') + '</section>';
  }

  /* =====================================================================
     무대 만들기
     ===================================================================== */
  var IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.2 12 4l8 7.2"/><path d="M6.2 9.8V20h11.6V9.8"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="6.4" height="6.4" rx="1.6"/><rect x="13.6" y="4" width="6.4" height="6.4" rx="1.6"/><rect x="4" y="13.6" width="6.4" height="6.4" rx="1.6"/><rect x="13.6" y="13.6" width="6.4" height="6.4" rx="1.6"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    memo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v11.5L14.5 20H5z"/><path d="M9 9h6M9 13h3.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4.2L19.5 8.7a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8z"/><path d="m13.5 6.5 4 4"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9"/><path d="M12 16.9v.1"/></svg>'
  };
  var vp, stage, deckEl, hud, bar, grid, gl, memo, help, zoom, cur = 0, typeId = 0, leaveAnim = null;

  function build() {
    D.body.classList.add('deck-page');
    vp = D.createElement('div'); vp.id = 'vp';
    stage = D.createElement('div'); stage.id = 'stage';
    stage.innerHTML =
      '<div class="deck"></div>' +
      '<div id="hud"><a class="hub" href="index.html" title="전체 안내로">' + IC.home + '<span>전체 안내</span></a>' +
      '<div class="part"><b></b><span></span></div><span class="grow"></span><div class="hud-timer"></div><div class="clock"></div><div class="cnt"></div></div>' +
      '<div id="tools"><button class="t-full" type="button" title="전체 화면 (F)">' + IC.full + '<span>전체 화면</span></button>' +
      '<button class="t-memo" type="button" title="교사 메모 (T)">' + IC.memo + '<span>교사 메모</span></button>' +
      '<button class="t-edit" type="button" title="편집 (E)">' + IC.edit + '<span>편집</span></button>' +
      '<button class="t-help" type="button" title="도움말 (?)">' + IC.help + '<span>도움말</span></button></div>' +
      '<div id="nav"><button class="n-grid" type="button" title="목록 보기 (G)" aria-label="목록 보기">' + IC.grid + '</button>' +
      '<button class="n-prev" type="button" aria-label="이전">' + IC.prev + '</button><button class="n-next" type="button" aria-label="다음">' + IC.next + '</button></div>' +
      '<div id="bar"></div>' +
      '<div id="memo"><b>교사 메모</b><p></p></div>' +
      '<div id="zoom"></div>' +
      '<div id="grid"><div class="gh"><h4>슬라이드 목록</h4><button class="btn ghost sm g-x" type="button">닫기</button></div><div class="gl"></div></div>' +
      '<div id="help"><div class="hp"><h4>단축키와 사용법</h4><div class="hp-cols">' +
      '<dl><dt>→ · Space · Enter</dt><dd>다음 (단계가 있으면 한 단계씩)</dd><dt>←</dt><dd>이전</dd><dt>G</dt><dd>슬라이드 목록</dd><dt>F</dt><dd>전체 화면</dd><dt>Home · End</dt><dd>처음 · 끝으로</dd></dl>' +
      '<dl><dt>T</dt><dd>교사 메모와 시계</dd><dt>S</dt><dd>배경 효과 켜고 끄기</dd><dt>E</dt><dd>편집 도구 열고 닫기</dd><dt>⌘S · ⌘Z</dt><dd>저장 · 되돌리기 (편집 중)</dd><dt>?</dt><dd>이 도움말</dd></dl>' +
      '</div><p>편집 도구를 열면 화면의 글자를 직접 눌러 고칠 수 있고, 오른쪽 패널에서 슬라이드를 추가·삭제·이동할 수 있습니다.</p>' +
      '<button class="btn sm h-x" type="button">닫기</button></div></div>';
    vp.appendChild(stage); D.body.insertBefore(vp, D.body.firstChild);
    deckEl = $('.deck', stage); hud = $('#hud', stage); bar = $('#bar', stage);
    grid = $('#grid', stage); gl = $('.gl', grid); memo = $('#memo', stage); help = $('#help', stage);
    zoom = $('#zoom', stage); zoom.onclick = function (e) { if (!e.target.closest('video')) zoomOff(); };

    $('.n-next', stage).onclick = next; $('.n-prev', stage).onclick = prev;
    $('.n-grid', stage).onclick = function () { gridShow(); };
    $('.g-x', grid).onclick = function () { gridShow(false); };
    $('.t-full', stage).onclick = full; $('.t-memo', stage).onclick = teacher;
    $('.t-edit', stage).onclick = function () { Ed.toggle(); };
    $('.t-help', stage).onclick = function () { help.classList.toggle('on'); };
    $('.h-x', help).onclick = function () { help.classList.remove('on'); };
    help.addEventListener('click', function (e) { if (e.target === help) help.classList.remove('on'); });
    gl.addEventListener('click', function (e) { var b = e.target.closest('.gc'); if (b) { gridShow(false); show(+b.dataset.i, 1); } });

    deckEl.addEventListener('click', onDeckClick);
    deckEl.addEventListener('keydown', function (e) {
      if (Ed.on || (e.key !== 'Enter' && e.key !== ' ')) return;
      var t = e.target.closest('.flip,.check');
      if (t) { e.preventDefault(); e.stopPropagation(); t.click(); }
    });
    W.addEventListener('resize', fit);
    W.addEventListener('hashchange', function () { var n = parseInt(location.hash.slice(1), 10); if (n && n - 1 !== cur && slides()[n - 1]) show(n - 1, n - 1 > cur ? 1 : -1); });
    D.addEventListener('keydown', onKey);
    D.addEventListener('fullscreenchange', fit);
    setInterval(clock, 15000); clock();
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { var el = curEl(); if (el) fitSlide(el); });
  }

  function fit() {
    var s = Math.min(vp.clientWidth / 1920, vp.clientHeight / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  /* 내용이 넘치면 그 슬라이드만 살짝 줄여서 맞춤 */
  function fitSlide(el) {
    var inner = $('.inner', el); if (!inner) return;
    inner.style.transform = ''; inner.style.width = ''; inner.style.minHeight = '';
    var cs = getComputedStyle(el), avail = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var need = inner.scrollHeight;
    if (need <= avail + 2) return;
    var k = avail / need;
    for (var n = 0; n < 4; n++) {
      k = Math.max(.5, k);
      inner.style.width = (100 / k) + '%'; inner.style.minHeight = (100 / k) + '%'; inner.style.transform = 'scale(' + k + ')';
      need = inner.scrollHeight * k;
      if (need <= avail + 2 || k <= .5) break;
      k *= avail / need;
    }
  }

  function renderAll() {
    $$('.timer', deckEl).forEach(function (t) { if (t._stop) t._stop(true); });
    deckEl.innerHTML = slides().map(renderSlide).join('');
    $$('.slide', deckEl).forEach(wire);
    if (Ed.arm) Ed.arm(deckEl);
  }
  function curEl() { return deckEl.children[cur] || null; }
  function rerenderCur() {
    var old = curEl(); if (!old || !slides()[cur]) { renderAll(); show(Math.min(cur, slides().length - 1), 1, true); return; }
    $$('.timer', old).forEach(function (t) { if (t._stop) t._stop(true); });
    var flipped = $$('.flip', old).map(function (f) { return f.classList.contains('on'); });
    var gOld = $('.guide', old), gAt = gOld ? +gOld.dataset.at || 0 : 0;
    var tmp = D.createElement('div'); tmp.innerHTML = renderSlide(slides()[cur], cur);
    var el = tmp.firstChild; old.replaceWith(el); el.classList.add('active');
    $$('.flip', el).forEach(function (f, i) { if (flipped[i]) f.classList.add('on'); });
    guideSet(el, gAt);
    wire(el); if (Ed.arm) Ed.arm(el); fitSlide(el); hudUpd();
  }

  /* ---------- 슬라이드 안의 동작 ---------- */
  function wire(el) {
    $$('.timer', el).forEach(timer);
    $$('.checklist', el).forEach(ckDone);
  }
  function ckDone(cl) {
    var items = $$('.check', cl), n = items.filter(function (c) { return c.classList.contains('on'); }).length, d = $('.ck-done', cl);
    if (d) d.textContent = !items.length ? '' : (n === items.length ? '모두 확인했어요' : n + ' / ' + items.length + ' 확인');
  }
  function copyText(t, btn) {
    function done() {
      MS.toast('복사했어요. 붙여 넣고 내 상황에 맞게 고치세요');
      if (btn) { btn.textContent = '복사됨'; btn.classList.add('ok'); clearTimeout(btn._t); btn._t = setTimeout(function () { btn.textContent = '복사'; btn.classList.remove('ok'); }, 1600); }
    }
    function old() {
      var ta = D.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-999px;top:0';
      D.body.appendChild(ta); ta.select(); try { D.execCommand('copy'); done(); } catch (e) { MS.toast('복사하지 못했어요'); } ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, old); else old();
  }
  /* ---------- 따라 하기: 한 슬라이드 안에서 화면을 한 단계씩 ---------- */
  function guideSet(el, k) {
    var g = el && $('.guide', el); if (!g) return;
    var shots = $$('.g-shot', g), n = shots.length; if (!n) return;
    k = Math.max(0, Math.min(k, n - 1)); g.dataset.at = k;
    shots.forEach(function (f, i) { f.classList.toggle('on', i === k); });
    $$('.g-step', g).forEach(function (li, i) { li.classList.toggle('on', i === k); li.classList.toggle('done', i < k); });
    var c = $('.g-cnt', g); if (c) c.textContent = (k + 1) + ' / ' + n;
    zoomSync();
  }
  function guideMove(el, d) {
    var g = el && $('.guide', el); if (!g) return false;
    var n = $$('.g-shot', g).length, k = (+g.dataset.at || 0) + d;
    if (k < 0 || k >= n) return false;
    guideSet(el, k);
    anim($('.g-shot.on', g), IN.fade, { duration: 300 });
    fitSlide(el); hudUpd(); return true;
  }
  function guideMore(el) {
    var g = el && $('.guide', el);
    return !!g && (+g.dataset.at || 0) < $$('.g-shot', g).length - 1;
  }
  function zoomOff() {
    if (!zoom || !zoom.classList.contains('on')) return;
    var item = !zoom.classList.contains('guide');
    zoom.classList.remove('on', 'guide'); zoom.innerHTML = '';
    if (item) playVideos(curEl(), true);
  }
  /* 따라 하기 화면을 크게 — 크게 본 채로 → 를 누르면 다음 단계로 넘어갑니다 */
  function zoomSync(open) {
    if (!zoom) return;
    if (open) zoom.classList.add('on', 'guide');
    if (!zoom.classList.contains('guide')) return;
    var el = curEl(), g = el && $('.guide', el), s = slides()[cur], k = g ? +g.dataset.at || 0 : 0, x = s && s.steps && s.steps[k];
    if (!g || !x || !x.src) { zoomOff(); return; }
    zoom.innerHTML = '<div class="z-frame">' + media(x.src) + gMark(x) + '</div>' +
      '<p class="z-cap"><b>' + (k + 1) + ' / ' + s.steps.length + '</b><span>' + fmt(x.title || '') + '</span><small>눌러서 닫기 · → 다음 단계</small></p>';
    var v = $('video', zoom); if (v) { v.muted = true; v.play().catch(function () { }); }
  }
  /* 나란히 보기의 그림·영상 하나를 크게 (영상은 소리와 함께) */
  function zoomItem(x) {
    if (!zoom || !x || !x.src) return;
    playVideos(curEl(), false);
    zoom.classList.remove('guide'); zoom.classList.add('on');
    zoom.innerHTML = '<div class="z-frame">' + media(x.src, true) + '</div><p class="z-cap"><span>' + fmt(x.label || '') + '</span><small>바깥을 눌러서 닫기</small></p>';
  }
  function playVideos(el, on) {
    $$('video', el || D.createElement('div')).forEach(function (v) {
      if (on) { try { v.currentTime = 0; } catch (e) { } v.play().catch(function () { }); } else v.pause();
    });
  }
  function onDeckClick(e) {
    var t = e.target, x;
    if ((x = t.closest('.pic img,.pic video')) && !Ed.on) {
      var is = slides()[+x.closest('.slide').dataset.i]; zoomItem(is && { src: is.src, label: is.caption || '' }); return;
    }
    if ((x = t.closest('.gal-m')) && !Ed.on) {
      var qs = slides()[+x.closest('.slide').dataset.i]; zoomItem(qs && qs.items && qs.items[+x.parentNode.dataset.k]); return;
    }
    if ((x = t.closest('.g-copy')) || (!Ed.on && (x = t.closest('.g-step.on .g-say')))) {
      var gs = slides()[+x.closest('.slide').dataset.i], gli = x.closest('.g-step'), gk = +gli.dataset.k;
      copyText((gs && gs.steps && gs.steps[gk] && gs.steps[gk].say) || '', $('.g-copy', gli)); return;
    }
    /* 프롬프트: 색칠된 [바꿔 쓸 부분]은 눌러서 고치고, 상자를 누르면 고친 그대로 복사 */
    if (!Ed.on && t.closest('.p-body mark')) return;
    if (!Ed.on && (x = t.closest('.prompt'))) {
      var ps = x.closest('.slide'), pre = $('.p-body', ps), pd = slides()[+ps.dataset.i];
      var shown = pre && !$('.caret', pre) ? pre.innerText.replace(/ /g, ' ').trim() : '';
      copyText(shown || (pd && pd.prompt) || '', $('.copy', ps)); return;
    }
    if ((x = t.closest('.g-frame')) && !Ed.on) { zoomSync(true); return; }
    if ((x = t.closest('.g-step'))) { var ge = x.closest('.slide'); guideSet(ge, +x.dataset.k); fitSlide(ge); hudUpd(); if (!Ed.on) return; }
    if ((x = t.closest('.copy'))) { var s = slides()[+x.closest('.slide').dataset.i]; copyText((s && s.prompt) || ''); return; }
    if ((x = t.closest('.f-turn'))) { x.parentNode.classList.toggle('on'); return; }
    if ((x = t.closest('.flip')) && !Ed.on) { x.classList.toggle('on'); return; }
    if ((x = t.closest('.check')) && (!Ed.on || t.tagName === 'I')) {
      var on = x.classList.toggle('on'); x.setAttribute('aria-checked', on ? 'true' : 'false');
      if (on) anim(x, [{ transform: 'scale(.98)' }, { transform: 'scale(1.015)' }, { transform: 'none' }], { duration: 280 });
      ckDone(x.parentNode);
    }
  }
  function beep() {
    try {
      var AC = W.AudioContext || W.webkitAudioContext, c = new AC();
      [[660, 0], [880, .22], [1174, .44]].forEach(function (n) {
        var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0, c.currentTime + n[1]); g.gain.linearRampToValueAtTime(.22, c.currentTime + n[1] + .03);
        g.gain.exponentialRampToValueAtTime(.001, c.currentTime + n[1] + .42);
        o.connect(g); g.connect(c.destination); o.start(c.currentTime + n[1]); o.stop(c.currentTime + n[1] + .45);
      });
    } catch (e) { }
  }
  function timer(tm) {
    var total = +tm.dataset.sec || 60, left = total, iv = null, C = 2 * Math.PI * 52;
    var num = $('.t-num', tm), ring = $('.tp', tm), go = $('.t-go', tm), pill = $('.hud-timer', hud);
    ring.style.strokeDasharray = C;
    function txt() { var m = Math.floor(left / 60), s = left % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
    function draw() {
      num.textContent = txt(); ring.style.strokeDashoffset = C * (1 - left / total);
      go.textContent = iv ? '일시정지' : (left === 0 ? '끝!' : (left === total ? '시작' : '계속'));
      tm.classList.toggle('run', !!iv); tm.classList.toggle('done', left === 0);
      if (iv) { pill.textContent = '실습 ' + txt(); pill.classList.add('on'); pill._by = tm; }
      else if (pill._by === tm) pill.classList.remove('on');
    }
    function stop() { clearInterval(iv); iv = null; draw(); }
    go.onclick = function () {
      if (iv) { stop(); return; }
      if (left === 0) return;
      var end = Date.now() + left * 1000;
      iv = setInterval(function () {
        left = Math.max(0, Math.round((end - Date.now()) / 1000));
        if (left === 0) { stop(); beep(); MS.toast('시간이 다 됐어요'); } else draw();
      }, 250);
      draw();
    };
    $('.t-reset', tm).onclick = function () { clearInterval(iv); iv = null; left = total; draw(); };
    tm._stop = stop; draw();
  }

  /* =====================================================================
     모션
     ===================================================================== */
  function anim(el, frames, o) {
    if (!el || !el.animate || MS.reduce) return null;
    o = o || {};
    return el.animate(frames, { duration: o.duration || 620, delay: o.delay || 0, easing: o.easing || MS.EASE, fill: o.fill || 'backwards' });
  }
  var IN = {
    up: [{ opacity: 0, transform: 'translateY(38px)' }, { opacity: 1, transform: 'none' }],
    down: [{ opacity: 0, transform: 'translateY(-30px)' }, { opacity: 1, transform: 'none' }],
    left: [{ opacity: 0, transform: 'translateX(-56px)' }, { opacity: 1, transform: 'none' }],
    right: [{ opacity: 0, transform: 'translateX(56px)' }, { opacity: 1, transform: 'none' }],
    pop: [{ opacity: 0, transform: 'scale(.66)' }, { opacity: 1, transform: 'scale(1.05)', offset: .7 }, { opacity: 1, transform: 'none' }],
    zoom: [{ opacity: 0, transform: 'scale(1.1)' }, { opacity: 1, transform: 'none' }],
    blur: [{ opacity: 0, filter: 'blur(16px)', transform: 'translateY(14px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }],
    fade: [{ opacity: 0 }, { opacity: 1 }],
    line: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]
  };
  function playIn(el, base) {
    base = base || 0;
    $$('[data-in]', el).filter(function (e) { return !e.classList.contains('frag-off'); }).forEach(function (e, i) {
      var k = IN[e.dataset.in] ? e.dataset.in : 'up';
      anim(e, IN[k], { duration: k === 'line' ? 900 : (k === 'pop' ? 620 : 680), delay: base + Math.min(i * 85, 900) });
    });
    counters(el, base); typing(el, base);
  }
  function counters(el, base) {
    $$('[data-count]', el).forEach(function (e) {
      var to = parseFloat(e.dataset.count) || 0, dec = (String(e.dataset.count).split('.')[1] || '').length, t0 = null;
      function f(v) { return dec ? v.toFixed(dec) : Math.round(v).toLocaleString('ko-KR'); }
      if (MS.reduce) { e.textContent = f(to); return; }
      e.textContent = f(0);
      function stepFn(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1300); p = 1 - Math.pow(1 - p, 3); e.textContent = f(to * p); if (p < 1) requestAnimationFrame(stepFn); }
      setTimeout(function () { requestAnimationFrame(stepFn); }, (base || 0) + 380);
    });
  }
  /* 프롬프트가 한 글자씩 써지는 모션 */
  function typing(el, base) {
    var pre = $('.p-body', el); if (!pre || Ed.on || MS.reduce) return;
    var s = slides()[+el.dataset.i], txt = (s && s.prompt) || ''; if (!txt) return;
    var total = Math.min(2400, txt.length * 13), t0 = null, id = ++typeId;
    pre.style.minHeight = pre.offsetHeight + 'px'; pre.innerHTML = '<i class="caret"></i>';
    function tick(t) {
      if (id !== typeId || !pre.isConnected) return;
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / total);
      pre.innerHTML = MS.fmtPrompt(txt.slice(0, Math.round(txt.length * p))) + (p < 1 ? '<i class="caret"></i>' : '');
      if (p < 1) requestAnimationFrame(tick); else { pre.style.minHeight = ''; armPrompt(el); }
    }
    setTimeout(function () { requestAnimationFrame(tick); }, (base || 0) + 480);
  }
  /* 발표 화면에서 프롬프트의 [바꿔 쓸 부분]을 바로 고칠 수 있게 */
  function armPrompt(el) {
    if (Ed.on) return;
    $$('.p-body mark', el).forEach(function (m) { m.contentEditable = 'true'; m.spellcheck = false; });
  }
  function restorePrompt(el) {
    var pre = $('.p-body', el), s = slides()[+el.dataset.i];
    if (pre && s) { pre.innerHTML = MS.fmtPrompt(s.prompt || ''); pre.style.minHeight = ''; }
  }

  /* =====================================================================
     이동
     ===================================================================== */
  function visible(i) { var s = slides()[i]; return !!s && (Ed.on || !s.hidden); }
  function seek(from, d) { var n = slides().length, i = from + d; while (i >= 0 && i < n && !visible(i)) i += d; return i >= 0 && i < n ? i : -1; }
  function posOf(i) { var n = 0; for (var k = 0; k <= i; k++) if (visible(k)) n++; return n; }
  function count() { var n = 0; for (var k = 0; k < slides().length; k++) if (visible(k)) n++; return n; }

  function show(i, dir, instant, fullState) {
    var el = deckEl.children[i]; if (!el) return;
    var old = $('.slide.active', deckEl);
    typeId++;
    if (leaveAnim) { leaveAnim.el.classList.remove('leaving'); leaveAnim.a.cancel(); leaveAnim = null; }
    if (old && old !== el) {
      old.classList.remove('active'); restorePrompt(old);
      if (!instant && !MS.reduce && old.animate) {
        old.classList.add('leaving');
        var a = old.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-46 * dir) + 'px)' }], { duration: 230, easing: 'ease-in', fill: 'forwards' });
        var rec = leaveAnim = { el: old, a: a };
        a.onfinish = function () { old.classList.remove('leaving'); a.cancel(); if (leaveAnim === rec) leaveAnim = null; };
      }
    }
    if (old && old !== el) playVideos(old, false);
    el.classList.add('active'); cur = i;
    zoomOff();
    $$('[data-frag]', el).forEach(function (e) { e.classList.toggle('frag-off', !fullState && !Ed.on && !instant); });
    guideSet(el, fullState ? 1e9 : 0);
    playVideos(el, true);
    if (instant || MS.reduce) armPrompt(el);
    fitSlide(el);
    if (!instant && !MS.reduce) {
      var wait = old && old !== el ? 150 : 0;
      anim(el, [{ opacity: 0, transform: 'translateX(' + (54 * dir) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: wait });
      playIn(el, wait + 40);
    }
    hudUpd();
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) { }
  }
  function next() {
    var el = curEl(), f = el && $('.frag-off', el);
    if (f) { f.classList.remove('frag-off'); anim(f, IN[f.dataset.in] || IN.up, { duration: 560 }); hudUpd(); return; }
    if (guideMove(el, 1)) return;
    var i = seek(cur, 1); if (i >= 0) show(i, 1);
  }
  function prev() {
    var el = curEl();
    if (guideMove(el, -1)) return;
    if (el && !Ed.on) {
      var shown = $$('[data-frag]', el).filter(function (e) { return !e.classList.contains('frag-off'); });
      if (shown.length) { shown[shown.length - 1].classList.add('frag-off'); hudUpd(); return; }
    }
    var i = seek(cur, -1); if (i >= 0) show(i, -1, false, true);
  }
  function label(s) { return String(s.label || s.title || s.text || LAYOUTS[s.layout] && LAYOUTS[s.layout].name || '').replace(/\*/g, '').replace(/\n/g, ' '); }
  function clock() {
    var d = new Date(), c = $('.clock', hud);
    if (c) c.textContent = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }
  function hudUpd() {
    var d = deck(), s = slides()[cur] || {}, n = count();
    $('.part b', hud).textContent = d.part || ''; $('.part b', hud).style.display = d.part ? '' : 'none';
    $('.part span', hud).textContent = d.title || '';
    $('.cnt', hud).innerHTML = '<b>' + posOf(cur) + '</b> / ' + n;
    bar.style.width = (n ? posOf(cur) / n * 100 : 0) + '%';
    $('.n-prev', stage).disabled = seek(cur, -1) < 0;
    $('.n-next', stage).disabled = seek(cur, 1) < 0 && !$('.frag-off', curEl() || D) && !guideMore(curEl());
    $('p', memo).textContent = s.notes || '이 슬라이드에는 메모가 없습니다.';
    D.title = (d.part ? d.part + ' · ' : '') + (d.title || '') ;
    if (grid.classList.contains('on')) buildGrid();
  }
  function buildGrid() {
    gl.innerHTML = slides().map(function (s, i) {
      if (!visible(i)) return '';
      return '<button class="gc' + (i === cur ? ' on' : '') + (s.hidden ? ' hid' : '') + '" type="button" data-i="' + i + '"><b>' + posOf(i) + '</b><span>' + esc(label(s)) + '</span><small>' +
        esc((LAYOUTS[s.layout] || LAYOUTS.bullets).name) + (s.hidden ? ' · 숨김' : '') + '</small></button>';
    }).join('');
    var on = $('.gc.on', gl); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'center' });
  }
  function gridShow(v) {
    var on = v == null ? !grid.classList.contains('on') : v;
    grid.classList.toggle('on', on); if (on) buildGrid();
  }
  function teacher() { H.classList.toggle('teacher'); clock(); }
  function full() {
    if (D.fullscreenElement) D.exitFullscreen();
    else if (H.requestFullscreen) H.requestFullscreen().catch(function () { MS.toast('전체 화면을 열지 못했어요'); });
  }
  var fxOff = false;
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t.closest && t.closest('input,textarea,select,[contenteditable],.ed-panel')) return;
    var k = e.key;
    if (k === 'Escape') { gridShow(false); help.classList.remove('on'); zoomOff(); return; }
    if (zoom.classList.contains('on') && !zoom.classList.contains('guide')) zoomOff();
    if (help.classList.contains('on')) { if (k === '?' || k === 'h') help.classList.remove('on'); return; }
    if (grid.classList.contains('on')) { if (k === 'g' || k === 'G' || k === 'ㅎ') gridShow(false); return; }
    if ((k === 'Enter' || k === ' ') && t.closest && t.closest('button,a,[role=button],[role=checkbox]')) return;
    switch (k) {
      case 'ArrowRight': case 'PageDown': case ' ': case 'Enter': case 'ArrowDown': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'PageUp': case 'Backspace': case 'ArrowUp': e.preventDefault(); prev(); break;
      case 'Home': show(seek(-1, 1), -1); break;
      case 'End': show(seek(slides().length, -1), 1, false, true); break;
      case 'g': case 'G': case 'ㅎ': gridShow(); break;
      case 'f': case 'F': case 'ㄹ': full(); break;
      case 't': case 'T': case 'ㅅ': teacher(); break;
      case 's': case 'S': case 'ㄴ': fxOff = !fxOff; MS.fx.mode(fxOff ? 'none' : (MS.content.theme.ambient || 'sparkle')); MS.toast(fxOff ? '배경 효과를 껐어요' : '배경 효과를 켰어요', 1400); break;
      case '?': case 'h': case 'H': help.classList.add('on'); break;
    }
  }

  /* =====================================================================
     편집 도구 연결
     ===================================================================== */
  var rt;
  function editTabs() {
    return [{ name: '이 슬라이드', build: slideTab }, { name: '전체 설정', build: allTab }];
  }
  function mutate(fn, goTo) {
    Ed.snap(true); fn(); S.touch();
    renderAll(); show(Math.max(0, Math.min(goTo == null ? cur : goTo, slides().length - 1)), 1, true); Ed.refresh();
  }
  function slideTab(box) {
    var el = Ed.el, s = slides()[cur], L = LAYOUTS[s.layout] || LAYOUTS.bullets, n = slides().length;

    var navRow = el('div', 'ed-slidebar');
    var pv = Ed.button('◀', function () { var i = seek(cur, -1); if (i >= 0) { show(i, -1, true); Ed.refresh(); } }, 'mini', '이전 슬라이드');
    var nx = Ed.button('▶', function () { var i = seek(cur, 1); if (i >= 0) { show(i, 1, true); Ed.refresh(); } }, 'mini', '다음 슬라이드');
    navRow.appendChild(pv); navRow.appendChild(el('b', '', '슬라이드 ' + (cur + 1) + ' / ' + n)); navRow.appendChild(nx);
    box.appendChild(navRow);

    var ops = el('div', 'ed-row wrap');
    var menu = el('div', 'ed-menu'); menu.hidden = true;
    Object.keys(LAYOUTS).forEach(function (k) {
      var b = el('button', 'ed-lay'); b.type = 'button';
      b.appendChild(el('b', '', LAYOUTS[k].name)); b.appendChild(el('small', '', LAYOUTS[k].desc));
      b.addEventListener('click', function () { mutate(function () { slides().splice(cur + 1, 0, MS.clone(LAYOUTS[k].sample)); }, cur + 1); });
      menu.appendChild(b);
    });
    ops.appendChild(Ed.button('＋ 새 슬라이드', function () { menu.hidden = !menu.hidden; }, 'add'));
    ops.appendChild(Ed.button('복제', function () { mutate(function () { slides().splice(cur + 1, 0, MS.clone(slides()[cur])); }, cur + 1); }));
    var up = Ed.button('앞으로 옮기기', function () { mutate(function () { var a = slides(), t = a[cur]; a[cur] = a[cur - 1]; a[cur - 1] = t; }, cur - 1); }, '', '순서를 한 칸 앞으로');
    up.disabled = cur === 0;
    var dn = Ed.button('뒤로 옮기기', function () { mutate(function () { var a = slides(), t = a[cur]; a[cur] = a[cur + 1]; a[cur + 1] = t; }, cur + 1); }, '', '순서를 한 칸 뒤로');
    dn.disabled = cur === n - 1;
    var del = Ed.button('삭제', function () {
      if (!confirm('이 슬라이드를 삭제할까요?\n(⌘Z 로 되돌릴 수 있어요)')) return;
      mutate(function () { slides().splice(cur, 1); }, Math.min(cur, n - 2));
    }, 'danger');
    del.disabled = n <= 1;
    ops.appendChild(up); ops.appendChild(dn); ops.appendChild(del);
    box.appendChild(ops); box.appendChild(menu);

    var g0 = Ed.group(box, '내용 — ' + L.name);
    var row = el('div', 'ed-field'), lb = el('label', 'ed-label', '레이아웃'), sel = el('select');
    Object.keys(LAYOUTS).forEach(function (k) { var o = el('option', '', LAYOUTS[k].name + ' — ' + LAYOUTS[k].desc); o.value = k; sel.appendChild(o); });
    sel.value = LAYOUTS[s.layout] ? s.layout : 'bullets';
    sel.addEventListener('change', function () {
      mutate(function () {
        var t = slides()[cur], sm = LAYOUTS[sel.value].sample;
        Object.keys(sm).forEach(function (k) { if (t[k] == null || t[k] === '') t[k] = MS.clone(sm[k]); });
        t.layout = sel.value;
      });
    });
    row.appendChild(lb); row.appendChild(sel); g0.appendChild(row);
    Ed.form(g0, L.fields, function () { return slides()[cur]; });

    var g1 = Ed.group(box, '모션');
    Ed.form(g1, [
      { k: 'anim', t: 'select', label: '등장 효과', opts: ANIMS },
      { k: 'step', t: 'check', label: '클릭할 때마다 하나씩 등장 (카드·목록·단계)' }
    ], function () { return slides()[cur]; });
    g1.appendChild(Ed.button('▶ 모션 미리 보기', function () {
      var e = curEl(); if (!e) return;
      $$('[data-frag]', e).forEach(function (x) { x.classList.remove('frag-off'); });
      anim(e, [{ opacity: 0, transform: 'translateX(54px)' }, { opacity: 1, transform: 'none' }], { duration: 420 });
      var was = Ed.on; Ed.on = false; playIn(e, 40); Ed.on = was;
      setTimeout(function () { if (Ed.on && curEl() === e) restorePrompt(e); }, 3400);
    }));

    var g2 = Ed.group(box, '교사 메모 · 기타');
    Ed.form(g2, [
      { k: 'notes', t: 'area', label: '교사 메모 (T 키로 발표 중 확인)', rows: 3 },
      { k: 'label', t: 'text', label: '목록에 보일 이름 (비우면 제목)' },
      { k: 'hidden', t: 'check', label: '이 슬라이드 숨기기 (발표 때 건너뜀)' }
    ], function () { return slides()[cur]; });
  }
  function allTab(box) {
    Ed.themeUI(box);
    var g = Ed.group(box, '이 차시 정보');
    Ed.form(g, [{ k: 'part', t: 'text', label: '차시 표시 (왼쪽 위 알약)' }, { k: 'title', t: 'text', label: '차시 제목' }], deck);
    var links = Ed.el('p', 'ed-hint');
    links.innerHTML = '다른 화면: <a href="index.html">전체 안내</a>' + Object.keys(MS.content.decks).map(function (k) {
      return k === ID ? '' : ' · <a href="' + esc(k) + '.html">' + esc(MS.content.decks[k].part || k) + '</a>';
    }).join('');
    g.appendChild(links);
    Ed.backupUI(box); Ed.helpUI(box);
  }
  function afterInline(t) {
    var s = slides()[cur], m = /^(.*)\.(\d+)$/.exec(t.dataset.edit);
    if (m && s) {
      var arr = MS.get(s, m[1]);
      if (Array.isArray(arr) && arr[+m[2]] === '') { arr.splice(+m[2], 1); Ed.sync(); rerenderCur(); return; }
    }
    var e = curEl(); if (e) fitSlide(e); hudUpd();
  }

  /* =====================================================================
     시작
     ===================================================================== */
  MS.boot(function () {
    build(); renderAll(); fit();
    var n = parseInt(location.hash.slice(1), 10) || 1;
    cur = Math.max(0, Math.min(n - 1, slides().length - 1));
    if (!visible(cur)) cur = Math.max(0, seek(cur, 1));
    Ed.inline(deckEl, function (t) { var sl = t.closest('.slide'); return sl ? slides()[+sl.dataset.i] : null; }, afterInline);
    Ed.mount({
      tabs: editTabs,
      rerender: function (kind) {
        if (kind === 'mode' || kind === 'all') {
          cur = Math.max(0, Math.min(cur, slides().length - 1));
          if (!visible(cur)) { var j = seek(cur, 1); cur = j >= 0 ? j : Math.max(0, seek(cur, -1)); }
          renderAll(); fit(); show(cur, 1, true); return;
        }
        if (kind === 'struct') { clearTimeout(rt); rerenderCur(); return; }
        clearTimeout(rt); rt = setTimeout(rerenderCur, 140);
      }
    });
    show(cur, 1);
  });
})();
