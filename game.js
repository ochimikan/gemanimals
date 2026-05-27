// ===== 動物データ =====
// 行クリア順にアンロックされる (1行クリア = ANIMALS[0]、2行で[1] …)
const ANIMALS = [
  { key: 'rabbit',  name: 'さくらクォーツうさぎ',           img: 'img/usagi.png',    base:'usagi',    tint:'#f9c5d1' },
  { key: 'cat',     name: 'アクアマリンねこ',               img: 'img/neko.png',     base:'neko',     tint:'#b5e3e3' },
  { key: 'chick',   name: 'レモンクリスタルひよこ',         img: 'img/hiyoko.png',   base:'hiyoko',   tint:'#fce99b' },
  { key: 'bear',    name: 'ラベンダーアメジストこぐま',     img: 'img/kuma.png',     base:'kuma',     tint:'#d4c1e8' },
  { key: 'fox',     name: 'ミントジェイドきつね',           img: 'img/kitsune.png',  base:'kitsune',  tint:'#c2e0ce' },
  { key: 'fawn',    name: 'ピーチオパールこじか',           img: 'img/shika.png',    base:'kojika',   tint:'#f7d4b8' },
  { key: 'penguin', name: 'ムーンストーンペンギン',         img: 'img/pengin.png',   base:'pengin',   tint:'#b5cce8' },
  { key: 'hamster', name: 'キャンディトルマリンハムスター', img: 'img/hamu.png',     base:'hamu',     tint:'#f9c5d1' },
  { key: 'seal',    name: 'パールあざらし',                 img: 'img/azarashi.png', base:'azarashi', tint:'#f5ebe0' },
  { key: 'panda',   name: 'ベビーダイヤパンダ',             img: 'img/panda.png',    base:'panda',    tint:'#d6d6d6' },
];
const ANIMAL_BY_KEY = Object.fromEntries(ANIMALS.map(a => [a.key, a]));
// 宝石画像のリスト (各動物 × 3パーツ = 30個)
const GEM_IMGS = [];
ANIMALS.forEach(a => {
  for (let i = 1; i <= 3; i++) {
    GEM_IMGS.push(`img/${a.base}${String(i).padStart(3,'0')}.png`);
  }
});

// ===== 行データ (5文字単位、や行・わ行は3文字) =====
const ROWS_HIRA = [
  ['あ','い','う','え','お'],
  ['か','き','く','け','こ'],
  ['さ','し','す','せ','そ'],
  ['た','ち','つ','て','と'],
  ['な','に','ぬ','ね','の'],
  ['は','ひ','ふ','へ','ほ'],
  ['ま','み','む','め','も'],
  ['や','ゆ','よ'],
  ['ら','り','る','れ','ろ'],
  ['わ','を','ん'],
];
const ROWS_KATA = [
  ['ア','イ','ウ','エ','オ'],
  ['カ','キ','ク','ケ','コ'],
  ['サ','シ','ス','セ','ソ'],
  ['タ','チ','ツ','テ','ト'],
  ['ナ','ニ','ヌ','ネ','ノ'],
  ['ハ','ヒ','フ','ヘ','ホ'],
  ['マ','ミ','ム','メ','モ'],
  ['ヤ','ユ','ヨ'],
  ['ラ','リ','ル','レ','ロ'],
  ['ワ','ヲ','ン'],
];
const ALL_ROWS = ROWS_HIRA.concat(ROWS_KATA);
function getRowOf(ch) { return ALL_ROWS.find(r => r.includes(ch)); }
function isRowComplete(row) { return row.every(c => state.tracedChars.has(c)); }
function countClearedRows() { return ALL_ROWS.filter(isRowComplete).length; }

function animalCard(key, { withSparkles = true } = {}) {
  const a = ANIMAL_BY_KEY[key];
  if (!a) return '';
  const sparkles = withSparkles ? `
    <span class="ai-sparkle s1">✦</span><span class="ai-sparkle s2">✧</span>
    <span class="ai-sparkle s3">✦</span><span class="ai-sparkle s4">✧</span>` : '';
  return `<div class="animal-img-wrap" style="--tint:${a.tint}">
    <div class="animal-glow"></div>
    <img src="${a.img}" alt="${a.name}" draggable="false"/>
    ${sparkles}
  </div>`;
}

// ===== 状態 =====
const state = {
  displayGems: 0,            // 装飾用カウンタ (累計獲得宝石)
  tracedChars: new Set(),     // なぞり完了した文字
  unlocked: new Set(),
  charKind: 'hira',
  currentChar: null,
  currentStroke: 0,
  currentWordChar: null,
  lastWordChar: null,
  kanjiData: null,
};

// ===== KanjiVG ストロークデータ取得 =====
// CC-BY-SA 3.0 license: https://kanjivg.tagaini.net/
const KVG_CACHE_PREFIX = 'kvg_v1_';
async function loadKanjiVGStrokes(ch) {
  const code = ch.codePointAt(0).toString(16).padStart(5, '0');
  const cacheKey = KVG_CACHE_PREFIX + code;
  // キャッシュ確認
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch(e){}
  try {
    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${code}.svg`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('http ' + res.status);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const paths = [...doc.querySelectorAll('path')];
    const texts = [...doc.querySelectorAll('text')];
    if (paths.length === 0) throw new Error('no paths');

    // 各pathの d, start, end を抽出 (一時SVGに入れて計算)
    const ns = 'http://www.w3.org/2000/svg';
    const tempSvg = document.createElementNS(ns, 'svg');
    tempSvg.setAttribute('viewBox', '0 0 109 109');
    tempSvg.style.cssText = 'position:absolute;width:1px;height:1px;visibility:hidden;left:-9999px';
    document.body.appendChild(tempSvg);
    const strokes = paths.map(p => {
      const d = p.getAttribute('d');
      const tp = document.createElementNS(ns, 'path');
      tp.setAttribute('d', d);
      tempSvg.appendChild(tp);
      const total = tp.getTotalLength();
      const s = tp.getPointAtLength(0);
      const e = tp.getPointAtLength(total);
      // 開始の少し先で方向を取得 (矢印の方向計算用)
      const dirPt = tp.getPointAtLength(Math.min(total, 4));
      tempSvg.removeChild(tp);
      return {
        d,
        start: [s.x, s.y],
        end: [e.x, e.y],
        dir: [dirPt.x - s.x, dirPt.y - s.y],
      };
    });
    // 番号位置 (text の matrix から)
    texts.forEach((t, i) => {
      if (i < strokes.length) {
        const tr = t.getAttribute('transform') || '';
        const nums = (tr.match(/-?\d+\.?\d*/g) || []).map(parseFloat);
        if (nums.length >= 6) {
          // matrix(a b c d e f) → e,f が translation
          strokes[i].numPos = [nums[4], nums[5] - 2.5]; // テキストはbaselineなので少し上に
        }
      }
    });
    document.body.removeChild(tempSvg);
    const data = { strokes, viewBox: 109 };
    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e){}
    return data;
  } catch(e) {
    console.warn('KanjiVG load failed for', ch, e);
    return null;
  }
}
const STORAGE_KEY = 'gemAnimalGame_v3';
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Array.isArray(s.unlocked)) state.unlocked = new Set(s.unlocked);
    if (Array.isArray(s.tracedChars)) state.tracedChars = new Set(s.tracedChars);
    if (typeof s.displayGems === 'number') state.displayGems = s.displayGems;
  } catch(e){}
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      unlocked: [...state.unlocked],
      tracedChars: [...state.tracedChars],
      displayGems: state.displayGems,
    }));
  } catch(e){}
}

// ===== 音 =====
let audioCtx;
function getCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
  }
  return audioCtx;
}
function playSound(type) {
  const ctx = getCtx(); if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  const tones = {
    correct: { freqs:[659,784,1047], type:'sine', step:0.08, vol:0.16, dur:0.35 },
    wrong:   { freqs:[350,220], type:'sine', step:0, vol:0.14, dur:0.35, slide:true },
    catch:   { freqs:[523,659,784,1047,1319], type:'triangle', step:0.1, vol:0.18, dur:0.55 },
    gem:     { freqs:[1200,2400], type:'sine', step:0, vol:0.08, dur:0.2, slide:true },
    stroke:  { freqs:[880,1100], type:'sine', step:0.05, vol:0.1, dur:0.18 },
  };
  const t = tones[type]; if (!t) return;
  if (t.slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = t.type;
    o.frequency.setValueAtTime(t.freqs[0], now);
    o.frequency.linearRampToValueAtTime(t.freqs[1], now + t.dur*0.7);
    g.gain.setValueAtTime(t.vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + t.dur);
    o.connect(g).connect(ctx.destination);
    o.start(now); o.stop(now + t.dur + 0.05);
  } else {
    t.freqs.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = t.type; o.frequency.value = f;
      const tt = now + i * t.step;
      g.gain.setValueAtTime(0, tt);
      g.gain.linearRampToValueAtTime(t.vol, tt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, tt + t.dur);
      o.connect(g).connect(ctx.destination);
      o.start(tt); o.stop(tt + t.dur + 0.05);
    });
  }
}
function speak(text) {
  if (!window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 0.85; u.pitch = 1.2;
    speechSynthesis.speak(u);
  } catch(e){}
}

// ===== 画面遷移 =====
function $(id) { return document.getElementById(id); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  if (id === 'screenStart') startTopGemRain();
  else stopTopGemRain();
}

// ===== 宝石カウンタ・行進捗 =====
function addGems(n = 1) {
  state.displayGems += n;
  saveState();
  updateGemDisplay();
}
function updateGemDisplay() {
  document.querySelectorAll('.gem-count').forEach(el => el.textContent = state.displayGems);
  // 現在進行中の行 (未完で何か文字をなぞった行) または次の未完行
  let target = null;
  for (const row of ALL_ROWS) {
    if (isRowComplete(row)) continue;
    const done = row.filter(c => state.tracedChars.has(c)).length;
    if (done > 0) { target = { row, done }; break; }
  }
  if (!target) {
    for (const row of ALL_ROWS) {
      if (!isRowComplete(row)) { target = { row, done: 0 }; break; }
    }
  }
  document.querySelectorAll('.progress-fill').forEach(fill => {
    if (target) {
      const pct = (target.done / target.row.length) * 100;
      fill.style.width = pct + '%';
    } else {
      fill.style.width = '100%';
    }
  });
  document.querySelectorAll('.progress-label').forEach(lab => {
    if (target) {
      const remain = target.row.length - target.done;
      lab.textContent = remain > 0 ? `つぎの どうぶつまで あと ${remain} もじ` : 'もうすぐ！';
    } else {
      lab.textContent = 'ぜんぶ あつめた！';
    }
  });
}
// 行クリアで動物アンロック
function unlockAnimalIfRowCleared(ch) {
  const row = getRowOf(ch);
  if (!row || !isRowComplete(row)) return null;
  const cleared = countClearedRows();
  // 既に N匹アンロック済みなら N+1 番目をアンロック
  for (let i = 0; i < Math.min(cleared, ANIMALS.length); i++) {
    if (!state.unlocked.has(ANIMALS[i].key)) {
      state.unlocked.add(ANIMALS[i].key);
      saveState();
      return ANIMALS[i];
    }
  }
  return null;
}

// ===== シャッフル/ランダム =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ===== なぞり：文字選択画面 =====
function renderCharGrid() {
  const table = state.charKind === 'hira' ? HIRA_TABLE : KATA_TABLE;
  const grid = $('charGrid');
  grid.innerHTML = table.flat().map(c => {
    if (c === null) return '<div class="char-cell empty" aria-hidden="true"></div>';
    return `<button class="char-cell supported" data-char="${c}"><span class="cc">${c}</span></button>`;
  }).join('');
  document.querySelectorAll('#kindTabs .kind-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.kind === state.charKind);
  });
  grid.querySelectorAll('.char-cell.supported').forEach(btn => {
    btn.addEventListener('click', () => startTrace(btn.dataset.char));
  });
}

// ===== なぞり：練習画面 =====
async function startTrace(ch) {
  state.currentChar = ch;
  state.currentStroke = 0;
  state.kanjiData = null;
  $('traceTitle').textContent = ch;
  speak(ch);
  showScreen('screenTrace');
  // ロード表示
  $('traceSvg').innerHTML = `<text x="54.5" y="56" text-anchor="middle" style="font-family:'M PLUS Rounded 1c';font-size:8px;fill:#a08070">よみこみちゅう…</text>`;
  $('strokeIndicator').innerHTML = '';
  // ロード
  const data = await loadKanjiVGStrokes(ch);
  if (state.currentChar !== ch) return; // 他の文字に切り替わってたら中止
  state.kanjiData = data;
  renderTraceArea();
}
function renderTraceArea() {
  const ch = state.currentChar;
  const data = state.kanjiData;
  const svg = $('traceSvg');
  let html = '';
  if (data && data.strokes && data.strokes.length) {
    const strokes = data.strokes;
    // 各ストロークパスを表示 (色分け)
    strokes.forEach((s, i) => {
      const done = i < state.currentStroke;
      const current = i === state.currentStroke;
      const cls = done ? 'done' : (current ? 'cur' : 'todo');
      html += `<path class="kvg-stroke ${cls}" d="${s.d}"/>`;
    });
    // 番号バッジ + 矢印 (現在のストロークのみ)
    strokes.forEach((s, i) => {
      const done = i < state.currentStroke;
      const current = i === state.currentStroke;
      const cls = done ? 'done' : (current ? 'cur' : 'todo');
      // 番号位置: KanjiVGの番号位置 or start位置
      const [nx, ny] = s.numPos || [s.start[0]-4, s.start[1]-4];
      // 矢印 (現在のみ): startから少し進んだ方向
      let arrowSvg = '';
      if (current) {
        const [dx, dy] = s.dir;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx/len, uy = dy/len;
        const sx = s.start[0], sy = s.start[1];
        const ax = sx + ux * 10;
        const ay = sy + uy * 10;
        const back = 3, side = 2.4;
        const p1x = ax - ux*back - uy*side;
        const p1y = ay - uy*back + ux*side;
        const p2x = ax - ux*back + uy*side;
        const p2y = ay - uy*back - ux*side;
        arrowSvg = `
          <line class="num-arrow-line" x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}"/>
          <polygon class="num-arrow-head" points="${ax.toFixed(1)},${ay.toFixed(1)} ${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}"/>`;
      }
      html += `<g class="num-badge ${cls}">
        ${arrowSvg}
        <circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="6"/>
        <text x="${nx.toFixed(1)}" y="${(ny+2.2).toFixed(1)}" text-anchor="middle">${i+1}</text>
      </g>`;
    });
  } else {
    // フォールバック: フォント描画で自由なぞり
    html += `<text class="bg-char" x="54.5" y="68" text-anchor="middle">${ch}</text>
      <text class="free-hint" x="54.5" y="100" text-anchor="middle">じゆうに なぞってね</text>`;
  }
  // ユーザー軌跡
  html += `<path class="user-trail" id="userTrail" d="" />`;
  svg.innerHTML = html;
  // インジケータ
  const ind = $('strokeIndicator');
  if (data && data.strokes && data.strokes.length) {
    ind.innerHTML = data.strokes.map((_, i) => {
      const done = i < state.currentStroke;
      const cur = i === state.currentStroke;
      return `<span class="dot ${done?'done':cur?'cur':''}">${i+1}</span>`;
    }).join('');
  } else {
    ind.innerHTML = '<span class="free-label">じゆうに なぞる</span>';
  }
  resetTrail();
}

// ===== なぞり：タッチ判定 =====
let isTracing = false;
let trail = [];      // 現在ストロークの軌跡 ([x,y]の配列)
let allTrails = [];  // 完了したストロークの軌跡履歴

function resetTrail() {
  trail = [];
  allTrails = [];
  $('userTrail').setAttribute('d', '');
}
function svgPoint(svg, evt) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const x = (evt.clientX - rect.left) / rect.width * vb.width;
  const y = (evt.clientY - rect.top) / rect.height * vb.height;
  return [x, y];
}
function trailPathD() {
  // 全履歴 + 現在の軌跡をパスにする
  let d = '';
  for (const t of allTrails) {
    if (t.length < 2) continue;
    d += `M${t[0][0].toFixed(1)},${t[0][1].toFixed(1)}`;
    for (let i = 1; i < t.length; i++) {
      d += ` L${t[i][0].toFixed(1)},${t[i][1].toFixed(1)}`;
    }
  }
  if (trail.length >= 1) {
    d += ` M${trail[0][0].toFixed(1)},${trail[0][1].toFixed(1)}`;
    for (let i = 1; i < trail.length; i++) {
      d += ` L${trail[i][0].toFixed(1)},${trail[i][1].toFixed(1)}`;
    }
  }
  return d;
}
function setupTraceEvents() {
  const svg = $('traceSvg');
  svg.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    isTracing = true;
    trail = [svgPoint(svg, e)];
    $('userTrail').setAttribute('d', trailPathD());
  });
  svg.addEventListener('pointermove', (e) => {
    if (!isTracing) return;
    e.preventDefault();
    trail.push(svgPoint(svg, e));
    $('userTrail').setAttribute('d', trailPathD());
  });
  const finish = (e) => {
    if (!isTracing) return;
    isTracing = false;
    evaluateStroke();
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
  svg.addEventListener('pointerleave', finish);
}
function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

function evaluateStroke() {
  const data = state.kanjiData;
  if (!data || !data.strokes || data.strokes.length === 0) {
    // 自由なぞりモード: 一定の長さなぞれば成功
    const len = trailLength(trail);
    if (len > 60) {
      allTrails.push(trail);
      trail = [];
      $('userTrail').setAttribute('d', trailPathD());
      const totalLen = allTrails.reduce((s, t) => s + trailLength(t), 0);
      if (totalLen > 130) completeChar();
    } else {
      trail = [];
      $('userTrail').setAttribute('d', trailPathD());
    }
    return;
  }
  const strokes = data.strokes;
  const stroke = strokes[state.currentStroke];
  if (!stroke) return;
  if (trail.length < 3) { trail = []; $('userTrail').setAttribute('d', trailPathD()); return; }
  // viewBox 109 単位での閾値 (子供向けにかなりゆるめ)
  const startOK = dist(trail[0], stroke.start) < 42;
  const len = trailLength(trail);
  if (startOK && len > 16) {
    allTrails.push(trail);
    trail = [];
    state.currentStroke++;
    playSound('stroke');
    renderTraceArea();
    $('userTrail').setAttribute('d', trailPathD());
    if (state.currentStroke >= strokes.length) {
      completeChar();
    }
  } else {
    trail = [];
    $('userTrail').setAttribute('d', trailPathD());
    flashHint();
  }
}
function trailLength(t) {
  let L = 0;
  for (let i = 1; i < t.length; i++) L += dist(t[i-1], t[i]);
  return L;
}
function flashHint() {
  const svg = $('traceSvg');
  svg.classList.add('hint-flash');
  setTimeout(() => svg.classList.remove('hint-flash'), 400);
}
function completeChar() {
  const ch = state.currentChar;
  // 既になぞり済みかどうかでメッセージ変更
  const wasNew = !state.tracedChars.has(ch);
  state.tracedChars.add(ch);
  playSound('correct');
  setTimeout(() => playSound('gem'), 200);
  $('traceFeedback').innerHTML = '<span class="feedback correct">できた！🎉</span>';
  // 宝石飛び (派手に)
  flyGemsFromEl($('traceSvg'), 10);
  addGems(5);
  // 行クリア判定
  const newly = wasNew ? unlockAnimalIfRowCleared(ch) : null;
  saveState();
  updateGemDisplay();
  setTimeout(() => {
    if (newly) {
      showCatchModal(newly);
    } else {
      goNextTraceChar();
    }
  }, 1700);
}
function goNextTraceChar() {
  const chars = state.charKind === 'hira' ? HIRA_CHARS : KATA_CHARS;
  const idx = chars.indexOf(state.currentChar);
  const next = chars[idx + 1];
  if (next) {
    startTrace(next);
  } else {
    // 最後まで来たら文字選択に戻る
    showScreen('screenCharSelect');
  }
}

// ===== ことばクイズ =====
function getWordPool() {
  const chars = state.charKind === 'hira' ? HIRA_CHARS : KATA_CHARS;
  return chars.filter(c => WORDS[c]);
}
function newWordQuestion() {
  const pool = getWordPool();
  let ch;
  do { ch = pick(pool); } while (ch === state.lastWordChar && pool.length > 1);
  state.lastWordChar = ch;
  state.currentWordChar = ch;
  const { emoji, word } = WORDS[ch];
  $('wordEmoji').textContent = emoji;
  const rest = word.substring(1);
  $('wordHint').innerHTML = `<span class="blank">？</span><span class="rest">${rest}</span>`;
  // 4択
  const others = pool.filter(c => c !== ch);
  const distractors = shuffle(others).slice(0, 3);
  const choices = shuffle([ch, ...distractors]);
  const grid = $('wordChoices');
  grid.innerHTML = choices.map(c => `<button class="word-choice" data-char="${c}">${c}</button>`).join('');
  grid.querySelectorAll('.word-choice').forEach(btn => {
    btn.addEventListener('click', () => checkWordAnswer(btn));
  });
  $('wordFeedback').innerHTML = '';
}
function checkWordAnswer(btn) {
  const all = document.querySelectorAll('.word-choice');
  if (btn.disabled) return;
  all.forEach(b => b.disabled = true);
  const ch = btn.dataset.char;
  if (ch === state.currentWordChar) {
    btn.classList.add('correct');
    $('wordFeedback').innerHTML = '<span class="feedback correct">せいかい！🌟</span>';
    playSound('correct');
    setTimeout(() => playSound('gem'), 200);
    flyGemsFromEl(btn, 5);
    burstSparkles(btn);
    addGems(2);
    setTimeout(() => newWordQuestion(), 1100);
  } else {
    btn.classList.add('wrong');
    $('wordFeedback').innerHTML = '<span class="feedback wrong">もういちど！</span>';
    playSound('wrong');
    all.forEach(b => { if (b.dataset.char === state.currentWordChar) b.classList.add('correct'); });
    speak(WORDS[state.currentWordChar].word);
    setTimeout(newWordQuestion, 1800);
  }
}

// ===== 共通 演出 =====
function flyGemsFromEl(el, count = 6) {
  const rect = el.getBoundingClientRect();
  const targetEl = document.querySelector('.screen.active .gem-counter');
  if (!targetEl) return;
  const target = targetEl.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const sx = rect.left + rect.width * (0.25 + Math.random() * 0.5);
      const sy = rect.top  + rect.height * (0.25 + Math.random() * 0.5);
      const tx = target.left + target.width/2 - sx;
      const ty = target.top + target.height/2 - sy;
      const gem = document.createElement('img');
      gem.className = 'gem-fly';
      gem.src = GEM_IMGS[Math.floor(Math.random() * GEM_IMGS.length)];
      gem.draggable = false;
      gem.style.left = sx + 'px';
      gem.style.top = sy + 'px';
      gem.style.setProperty('--mx', (Math.random()*140-70) + 'px');
      gem.style.setProperty('--my', (-70 - Math.random()*60) + 'px');
      gem.style.setProperty('--tx', tx + 'px');
      gem.style.setProperty('--ty', ty + 'px');
      gem.style.setProperty('--rot', (Math.random()*720-360) + 'deg');
      gem.style.setProperty('--size', (58 + Math.random()*36) + 'px');
      document.body.appendChild(gem);
      setTimeout(() => gem.remove(), 1400);
    }, i * 55);
  }
}

// ===== TOPページ宝石シャワー =====
let gemRainTimer = null;
function spawnRainGem() {
  if (!$('screenStart').classList.contains('active')) return;
  const img = document.createElement('img');
  img.className = 'gem-rain';
  img.src = GEM_IMGS[Math.floor(Math.random() * GEM_IMGS.length)];
  img.draggable = false;
  img.style.left = (Math.random() * 100) + 'vw';
  const dur = 5 + Math.random() * 5;
  img.style.setProperty('--dur', dur + 's');
  img.style.setProperty('--size', (40 + Math.random() * 44) + 'px');
  img.style.setProperty('--sway', (Math.random() * 140 - 70) + 'px');
  img.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
  img.style.setProperty('--start-y', (-100 - Math.random() * 60) + 'px');
  document.body.appendChild(img);
  setTimeout(() => img.remove(), (dur + 1) * 1000);
}
function startTopGemRain() {
  stopTopGemRain();
  // 起動バースト: テンション最高潮
  for (let i = 0; i < 22; i++) {
    setTimeout(spawnRainGem, i * 90);
  }
  gemRainTimer = setInterval(() => {
    if ($('screenStart').classList.contains('active')) {
      spawnRainGem();
      if (Math.random() < 0.35) spawnRainGem();
    }
  }, 280);
}
function stopTopGemRain() {
  if (gemRainTimer) { clearInterval(gemRainTimer); gemRainTimer = null; }
  document.querySelectorAll('.gem-rain').forEach(g => g.remove());
}
function burstSparkles(elem) {
  const rect = elem.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const marks = ['✨','⭐','💫','✦','✧'];
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div');
    s.className = 'spark-burst';
    s.style.left = cx + 'px';
    s.style.top = cy + 'px';
    s.textContent = marks[Math.floor(Math.random()*marks.length)];
    s.style.color = ['#f9c5d1','#fce99b','#d4c1e8','#b5cce8','#c2e0ce'][Math.floor(Math.random()*5)];
    const angle = (Math.PI * 2 / 10) * i + Math.random()*0.3;
    const dist = 70 + Math.random()*50;
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0.2) rotate(${Math.random()*360}deg)`;
      s.style.opacity = '0';
    });
    setTimeout(() => s.remove(), 900);
  }
}
function showCatchModal(animal) {
  $('catchAnimal').innerHTML = animalCard(animal.key);
  $('catchName').textContent = animal.name;
  $('catchSub').textContent = `${state.unlocked.size} / ${ANIMALS.length} ひき`;
  $('catchModal').classList.add('active');
  playSound('catch');
  fireConfetti();
  setTimeout(() => speak(animal.name), 600);
}
function fireConfetti() {
  const modal = $('catchModal');
  const colors = ['#f9c5d1','#fce99b','#c2e0ce','#b5cce8','#d4c1e8','#f7d4b8','#ffffff'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const conf = document.createElement('div');
      conf.className = 'confetti';
      conf.style.left = (Math.random() * 100) + '%';
      conf.style.background = colors[Math.floor(Math.random()*colors.length)];
      conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
      conf.style.setProperty('--cx', (Math.random()*300-150) + 'px');
      modal.appendChild(conf);
      setTimeout(() => conf.remove(), 3100);
    }, i * 40);
  }
}

// ===== ずかん =====
function renderCollection() {
  const grid = $('collectionGrid');
  grid.innerHTML = ANIMALS.map(a => {
    const got = state.unlocked.has(a.key);
    return `<div class="animal-slot ${got ? 'unlocked' : 'locked'}" data-key="${a.key}" title="${got ? a.name : 'まだ つかまえてない'}">
      ${got ? animalCard(a.key, { withSparkles: false }) : ''}
    </div>`;
  }).join('');
  $('collectionSub').textContent = `あつめた どうぶつ ${state.unlocked.size} / ${ANIMALS.length} ひき`;
  grid.querySelectorAll('.animal-slot.unlocked').forEach(slot => {
    slot.addEventListener('click', () => {
      const a = ANIMAL_BY_KEY[slot.dataset.key];
      if (a) showCatchModal(a);
    });
  });
}

// ===== スタート画面の動物 =====
function renderStartIllust() {
  const el = $('startIllust');
  if (!el) return;
  const picks = shuffle(ANIMALS).slice(0, 3);
  el.innerHTML = picks.map(a => `<div class="start-anim" style="--tint:${a.tint}">
    <img src="${a.img}" alt="${a.name}" draggable="false"/>
  </div>`).join('');
}

// ===== スタート画面の周りの宝石装飾 =====
function renderStartDecor() {
  const el = $('startDecor');
  if (!el) return;
  const slots = [
    { p:'top:3%;left:2%',          size:72, ra:'-10deg', rb:'6deg',  dur:'4.2s', dl:'0s' },
    { p:'top:9%;right:3%',         size:80, ra:'8deg',   rb:'-10deg',dur:'4.8s', dl:'-0.7s' },
    { p:'top:28%;left:1%',         size:58, ra:'-14deg', rb:'10deg', dur:'3.6s', dl:'-1.3s' },
    { p:'top:36%;right:2%',        size:66, ra:'12deg',  rb:'-6deg', dur:'5.0s', dl:'-0.4s' },
    { p:'top:55%;left:3%',         size:62, ra:'-6deg',  rb:'12deg', dur:'4.0s', dl:'-1.6s' },
    { p:'top:50%;right:1%',        size:70, ra:'10deg',  rb:'-4deg', dur:'4.4s', dl:'-1.0s' },
    { p:'bottom:18%;left:6%',      size:56, ra:'-12deg', rb:'8deg',  dur:'3.8s', dl:'-2.0s' },
    { p:'bottom:22%;right:6%',     size:60, ra:'7deg',   rb:'-11deg',dur:'4.6s', dl:'-0.3s' },
    { p:'bottom:4%;left:14%',      size:48, ra:'-8deg',  rb:'6deg',  dur:'4.0s', dl:'-1.2s' },
    { p:'bottom:6%;right:18%',     size:52, ra:'6deg',   rb:'-9deg', dur:'4.2s', dl:'-0.8s' },
  ];
  // ランダムにシャッフルした宝石画像を割当
  const picks = shuffle(GEM_IMGS).slice(0, slots.length);
  el.innerHTML = slots.map((s, i) => {
    return `<img src="${picks[i]}" alt="" draggable="false"
      style="${s.p};width:${s.size}px;--rot-a:${s.ra};--rot-b:${s.rb};--dur:${s.dur};--delay:${s.dl}"/>`;
  }).join('');
}

// ===== イベント =====
function bindEvents() {
  // モード選択
  $('toTraceBtn').addEventListener('click', () => {
    getCtx();
    renderCharGrid();
    showScreen('screenCharSelect');
  });
  $('toWordBtn').addEventListener('click', () => {
    getCtx();
    newWordQuestion();
    showScreen('screenWord');
  });
  $('showCollectionBtn').addEventListener('click', () => {
    renderCollection();
    showScreen('screenCollection');
  });
  // タブ切替
  document.querySelectorAll('#kindTabs .kind-tab').forEach(t => {
    t.addEventListener('click', () => {
      state.charKind = t.dataset.kind;
      renderCharGrid();
    });
  });
  // 共通 戻る
  document.querySelectorAll('[data-back]').forEach(b => {
    b.addEventListener('click', () => {
      const tgt = b.dataset.back;
      if (window.speechSynthesis) speechSynthesis.cancel();
      showScreen(tgt);
    });
  });
  // 宝石カウンタ → ずかん
  document.querySelectorAll('.gem-counter').forEach(el => {
    el.addEventListener('click', () => {
      renderCollection();
      showScreen('screenCollection');
    });
  });
  // ことば: 音声・絵をタップで再生
  $('wordEmoji').addEventListener('click', () => {
    if (state.currentWordChar) speak(WORDS[state.currentWordChar].word);
  });
  // なぞり: もういちど
  $('traceResetBtn').addEventListener('click', () => {
    state.currentStroke = 0;
    renderTraceArea();
  });
  // なぞり: つぎへ
  $('traceNextBtn').addEventListener('click', () => {
    const chars = state.charKind === 'hira' ? HIRA_CHARS : KATA_CHARS;
    const supported = chars.filter(c => STROKES[c]);
    const next = supported[Math.floor(Math.random()*supported.length)];
    startTrace(next);
  });
  // なぞり: 文字を読み上げ
  $('traceSpeakBtn').addEventListener('click', () => {
    speak(state.currentChar);
  });
  // 捕獲モーダルを閉じる
  $('catchCloseBtn').addEventListener('click', () => {
    $('catchModal').classList.remove('active');
    if ($('screenWord').classList.contains('active')) {
      newWordQuestion();
    } else if ($('screenTrace').classList.contains('active')) {
      goNextTraceChar();
    }
  });
  // SVGのタッチ初期化
  setupTraceEvents();
}

// ===== 初期化 =====
loadState();
bindEvents();
updateGemDisplay();
renderStartIllust();
renderStartDecor();
startTopGemRain();
