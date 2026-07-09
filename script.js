(function(){

  /* =========================================================
     CONFIG
     PUZZLE_BANK is loaded from puzzles.js (see index.html) —
     that's the file you'll edit daily. OPERATORS lives here
     since it rarely changes.

     OPERATORS: `display` is what shows on the tile / in the
     equation, `value` is what's actually evaluated AND what
     your keyboard key must match to trigger it (so if you add
     a symbol here, type that exact character to use it).
     ========================================================= */

  // Falls back to the most recent date on or before today that actually
  // has an entry, so the game never breaks if you forget to add "today".
  function getDailyDigits(){
    const todayKey = utcDateKey(new Date());
    if (PUZZLE_BANK[todayKey]) return PUZZLE_BANK[todayKey];

    const availableKeys = Object.keys(PUZZLE_BANK).sort();
    const pastKeys = availableKeys.filter(k => k <= todayKey);
    if (pastKeys.length){
      console.warn('Go Figure: no puzzle set for ' + todayKey + ' — reusing ' + pastKeys[pastKeys.length - 1] + '.');
      return PUZZLE_BANK[pastKeys[pastKeys.length - 1]];
    }

    console.warn('Go Figure: PUZZLE_BANK is empty — using a placeholder puzzle.');
    return [1, 2, 3, 4];
  }

  function utcDateKey(date){
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // ---- Optional authoring helper -------------------------------------
  // Not used automatically — this is here so you can sanity-check a
  // candidate puzzle from the browser console before adding it to
  // PUZZLE_BANK, e.g. GoFigure.isSolvable([7, 9, 7, 9]) -> true/false.
  // Only checks +-*/ with one "="; a puzzle can still be "solvable" and
  // dull (like 7,9,7,9), so use this to rule out dead ends, not to pick
  // the puzzle for you.
  function permute(arr){
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i++){
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of permute(rest)) out.push([arr[i]].concat(p));
    }
    return out;
  }

  function evalChain(nums, ops){
    let str = String(nums[0]);
    for (let i = 0; i < ops.length; i++) str += ops[i] + nums[i + 1];
    try {
      const v = Function('"use strict"; return (' + str + ');')();
      return typeof v === 'number' && isFinite(v) ? v : NaN;
    } catch (e){
      return NaN;
    }
  }

  function isSolvable(digits){
    const basicOps = ['+', '-', '*', '/'];
    for (const perm of permute(digits)){
      for (let k = 1; k <= perm.length - 1; k++){
        const left = perm.slice(0, k);
        const right = perm.slice(k);
        const leftSlots = left.length - 1;
        const rightSlots = right.length - 1;
        const combos = Math.pow(basicOps.length, leftSlots + rightSlots);
        for (let c = 0; c < combos; c++){
          let rem = c;
          const leftOps = [];
          for (let i = 0; i < leftSlots; i++){ leftOps.push(basicOps[rem % basicOps.length]); rem = Math.floor(rem / basicOps.length); }
          const rightOps = [];
          for (let i = 0; i < rightSlots; i++){ rightOps.push(basicOps[rem % basicOps.length]); rem = Math.floor(rem / basicOps.length); }
          const l = evalChain(left, leftOps);
          const r = evalChain(right, rightOps);
          if (Number.isFinite(l) && Number.isFinite(r) && Math.abs(l - r) < 1e-9) return true;
        }
      }
    }
    return false;
  }

  window.GoFigure = {
    isSolvable,
    PUZZLE_BANK,
    // Debugging helpers — run these from the browser console:
    getStats: loadStats,
    resetStats: () => { safeSetLS(LS_STATS_KEY, JSON.stringify(defaultStats())); console.log('Stats reset.'); },
    resetTutorial: () => { try { localStorage.removeItem(LS_TUTORIAL_KEY); } catch(e){} console.log('Tutorial will show again on next reload.'); },
  };
  // ----------------------------------------------------------------------

  const NUMBERS = getDailyDigits();

  const OPERATORS = [
    { display: '+', value: '+' },
    { display: '−', value: '-' },
    { display: '×', value: '*' },
    { display: '÷', value: '/' },
    { display: '^', value: '^' },   // exponent, e.g. 2^3 = 8
    { display: '!', value: '!' },   // factorial, e.g. 3! = 6
    { display: '%', value: '%' },   // remainder
    { display: '(', value: '(' },
    { display: ')', value: ')' },
    { display: '=', value: '=' },
  ];
  /* ========================================================= */

  const numberTilesEl = document.getElementById('numberTiles');
  const operatorTilesEl = document.getElementById('operatorTiles');
  const tapeEl = document.getElementById('tape');
  const tapePlaceholder = document.getElementById('tapePlaceholder');
  const statusLine = document.getElementById('statusLine');
  const resultBadge = document.getElementById('resultBadge');
  const submitBtn = document.getElementById('submitBtn');
  const backspaceBtn = document.getElementById('backspaceBtn');
  const clearBtn = document.getElementById('clearBtn');
  const helpBtn = document.getElementById('helpBtn');
  const helpPanel = document.getElementById('helpPanel');
  const winBackdrop = document.getElementById('winBackdrop');
  const winCard = document.getElementById('winCard');
  const winTimeEl = document.getElementById('winTime');
  const winStreakEl = document.getElementById('winStreak');
  const winAchievementsEl = document.getElementById('winAchievements');
  const winCloseBtn = document.getElementById('winCloseBtn');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const timerPill = document.getElementById('timerPill');

  // equation is an ordered list of tokens: { type: 'number'|'operator', display, value, numberId? }
  let equation = [];

  // ---- Persistent, no-login storage (localStorage) --------------------
  // Everything here lives only in this browser on this device. No account,
  // no server — which also means no cross-device sync and no leaderboard.
  // See the README for the upgrade path if that's ever needed.
  const LS_TUTORIAL_KEY = 'goFigure.tutorialSeen.v1';
  const LS_STATS_KEY = 'goFigure.stats.v1';

  function safeGetLS(key){
    try { return localStorage.getItem(key); } catch (e){ return null; }
  }
  function safeSetLS(key, value){
    try { localStorage.setItem(key, value); } catch (e){ /* private mode, storage full, etc — fail silently */ }
  }

  function defaultStats(){
    return {
      gamesWon: 0,
      bestTimeMs: null,
      currentStreak: 0,
      longestStreak: 0,
      lastWonDate: null,   // UTC date key, e.g. '2026-07-09'
      achievements: [],    // array of achievement ids already unlocked
    };
  }

  function loadStats(){
    const raw = safeGetLS(LS_STATS_KEY);
    if (!raw) return defaultStats();
    try {
      const parsed = JSON.parse(raw);
      return Object.assign(defaultStats(), parsed);
    } catch (e){
      return defaultStats();
    }
  }

  function saveStats(stats){
    safeSetLS(LS_STATS_KEY, JSON.stringify(stats));
  }

  // Each achievement is checked once per win, in order, against the
  // just-updated stats object. Add more here any time — no other code
  // needs to change.
  const ACHIEVEMENTS = [
    {
      id: 'first_win',
      title: 'First Blood',
      desc: 'Solved your first Go Figure puzzle.',
      check: (stats) => stats.gamesWon === 1,
    },
    {
      id: 'speedy',
      title: 'Speed Demon',
      desc: 'Solved a puzzle in under 30 seconds.',
      check: (stats, elapsedMs) => elapsedMs < 30000,
    },
    {
      id: 'streak_3',
      title: 'On a Roll',
      desc: '3-day solving streak.',
      check: (stats) => stats.currentStreak === 3,
    },
    {
      id: 'streak_7',
      title: 'Weekly Warrior',
      desc: '7-day solving streak.',
      check: (stats) => stats.currentStreak === 7,
    },
  ];

  function recordWin(elapsedMs){
    const stats = loadStats();
    const todayKey = utcDateKey(new Date());

    stats.gamesWon += 1;
    if (stats.bestTimeMs === null || elapsedMs < stats.bestTimeMs){
      stats.bestTimeMs = elapsedMs;
    }

    if (stats.lastWonDate === todayKey){
      // already recorded a win today (e.g. page reload) — don't double-count streak
    } else {
      const yesterdayKey = utcDateKey(new Date(Date.now() - 86400000));
      stats.currentStreak = (stats.lastWonDate === yesterdayKey) ? stats.currentStreak + 1 : 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      stats.lastWonDate = todayKey;
    }

    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach(a => {
      if (!stats.achievements.includes(a.id) && a.check(stats, elapsedMs)){
        stats.achievements.push(a.id);
        newlyUnlocked.push(a);
      }
    });

    saveStats(stats);
    return { stats, newlyUnlocked };
  }
  // ----------------------------------------------------------------------

  // ---- Timer ----
  // Starts on the very first tile tap (number or operator), stops the
  // moment a correct equation is submitted. Resets on Clear.
  let startTime = null;
  let hasWon = false;
  let timerInterval = null;

  function startTimerIfNeeded(){
    if (startTime !== null) return;
    startTime = performance.now();
    timerInterval = setInterval(updateTimerDisplay, 200);
  }

  function updateTimerDisplay(){
    if (startTime === null) return;
    timerPill.textContent = '⏱ ' + formatElapsed(performance.now() - startTime);
  }

  function formatElapsed(ms){
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + String(seconds).padStart(2, '0');
  }

  function buildNumberTiles(){
    numberTilesEl.innerHTML = '';
    NUMBERS.forEach((num, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tile';
      btn.textContent = num;
      btn.dataset.numberId = idx;
      btn.setAttribute('aria-label', 'Number ' + num);
      btn.addEventListener('click', () => useNumber(idx, num, btn));
      numberTilesEl.appendChild(btn);
    });
  }

  function buildOperatorTiles(){
    operatorTilesEl.innerHTML = '';
    OPERATORS.forEach(op => {
      const btn = document.createElement('button');
      btn.className = 'tile op';
      btn.textContent = op.display;
      btn.setAttribute('aria-label', 'Operator ' + op.display);
      btn.addEventListener('click', () => useOperator(op, btn));
      operatorTilesEl.appendChild(btn);
    });
  }

  function useNumber(idx, num, btnEl){
    if (hasWon) return;
    startTimerIfNeeded();
    equation.push({ type: 'number', display: String(num), value: String(num), numberId: idx });
    btnEl.classList.add('used');
    pressAnim(btnEl);
    render();
  }

  function useOperator(op, btnEl){
    if (hasWon) return;
    startTimerIfNeeded();
    equation.push({ type: 'operator', display: op.display, value: op.value });
    pressAnim(btnEl);
    render();
  }

  function pressAnim(btnEl){
    btnEl.classList.add('pressed');
    setTimeout(() => btnEl.classList.remove('pressed'), 90);
    // Without this, a tile stays focused after being clicked (or activated via
    // keyboard), so a later Enter press would re-trigger it as a native button
    // click before our own keydown handler gets to treat Enter as "submit".
    btnEl.blur();
  }

  function backspace(){
    if (hasWon) return;
    const last = equation.pop();
    if (!last) return;
    if (last.type === 'number'){
      const tile = numberTilesEl.querySelector('[data-number-id="' + last.numberId + '"]');
      if (tile) tile.classList.remove('used');
    }
    render();
  }

  function clearAll(){
    if (hasWon) return;
    equation = [];
    numberTilesEl.querySelectorAll('.tile').forEach(t => t.classList.remove('used'));
    render();
  }

  function render(){
    tapeEl.querySelectorAll('.tape-token').forEach(el => el.remove());
    if (equation.length === 0){
      tapePlaceholder.style.display = 'inline';
    } else {
      tapePlaceholder.style.display = 'none';
      equation.forEach((tok, i) => {
        const span = document.createElement('span');
        span.className = 'tape-token' + (tok.type === 'operator' ? ' op' : '');
        span.textContent = tok.display;
        // numbers played back to back sit tight against each other to read as one concatenated number
        const prev = equation[i - 1];
        if (tok.type === 'number' && prev && prev.type === 'number'){
          span.style.marginLeft = '0px';
        }
        tapeEl.insertBefore(span, tapeEl.querySelector('.cursor'));
      });
    }

    // reset result feedback whenever the equation changes
    resultBadge.classList.remove('show', 'good', 'bad');
    statusLine.textContent = '';
    statusLine.className = 'status-line';

    const equalsCount = equation.filter(t => t.value === '=').length;
    submitBtn.disabled = equation.length === 0 || equalsCount !== 1;
  }

  // Turns "3!" into "fact(3)" and "(2+2)!" into "fact((2+2))" so a plain JS eval can handle it.
  function applyFactorials(str){
    let out = str;
    let guard = 0;
    while (out.includes('!') && guard < 50){
      guard++;
      const idx = out.indexOf('!');
      let start;
      if (out[idx - 1] === ')'){
        let depth = 0;
        let i = idx - 1;
        for (; i >= 0; i--){
          if (out[i] === ')') depth++;
          else if (out[i] === '('){
            depth--;
            if (depth === 0){ start = i; break; }
          }
        }
        if (start === undefined) return null; // unbalanced parens
      } else {
        let i = idx - 1;
        while (i >= 0 && /[0-9.]/.test(out[i])) i--;
        start = i + 1;
        if (start === idx) return null; // "!" with nothing before it
      }
      const operand = out.slice(start, idx);
      out = out.slice(0, start) + 'fact(' + operand + ')' + out.slice(idx + 1);
    }
    return out;
  }

  function factorial(n){
    n = Number(n);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return NaN;
    if (n > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  function evaluateSide(str){
    if (!/^[0-9+\-*/^!%().\s]+$/.test(str) || str.trim() === ''){
      return null;
    }
    const withFact = applyFactorials(str);
    if (withFact === null) return null;
    const withPow = withFact.replace(/\^/g, '**');
    try {
      const fn = new Function('fact', '"use strict"; return (' + withPow + ');');
      const result = fn(factorial);
      return typeof result === 'number' && isFinite(result) ? result : null;
    } catch (e){
      return null;
    }
  }

  function submit(){
    if (hasWon) return;

    const numbersUsed = equation.filter(t => t.type === 'number').length;
    if (numbersUsed < NUMBERS.length){
      showBadge(false);
      showStatus('Use all ' + NUMBERS.length + ' numbers — ' + (NUMBERS.length - numbersUsed) + ' still unplayed.', 'bad');
      return;
    }

    const raw = equation.map(t => t.value).join('');
    const parts = raw.split('=');
    if (parts.length !== 2){
      showStatus('Add exactly one "=" to check an equation.', 'bad');
      return;
    }

    const left = evaluateSide(parts[0]);
    const right = evaluateSide(parts[1]);

    if (left === null || right === null){
      showStatus("That expression doesn't quite compute — check both sides.", 'bad');
      showBadge(false);
      return;
    }

    const isTrue = Math.abs(left - right) < 1e-9;
    showBadge(isTrue);
    showStatus(
      isTrue
        ? left.toLocaleString() + ' really does equal ' + right.toLocaleString() + '.'
        : left.toLocaleString() + ' doesn\u2019t equal ' + right.toLocaleString() + '.',
      isTrue ? 'good' : 'bad'
    );

    if (isTrue) triggerWin();
  }

  function showBadge(isTrue){
    resultBadge.textContent = isTrue ? '✓' : '✕';
    resultBadge.classList.remove('good', 'bad');
    resultBadge.classList.add(isTrue ? 'good' : 'bad', 'show');
  }

  function showStatus(msg, kind){
    statusLine.textContent = msg;
    statusLine.className = 'status-line ' + kind;
  }

  // ---- Victory: modal + confetti ----
  function triggerWin(){
    hasWon = true;
    if (timerInterval !== null){ clearInterval(timerInterval); timerInterval = null; }

    const elapsedMs = performance.now() - (startTime !== null ? startTime : performance.now());
    winTimeEl.textContent = formatElapsed(elapsedMs);

    const { stats, newlyUnlocked } = recordWin(elapsedMs);

    winStreakEl.textContent = stats.currentStreak > 1
      ? '🔥 ' + stats.currentStreak + '-day streak'
      : (stats.currentStreak === 1 ? 'First day of a new streak — come back tomorrow!' : '');

    winAchievementsEl.innerHTML = '';
    newlyUnlocked.forEach(a => {
      const badge = document.createElement('div');
      badge.className = 'achievement-badge';
      badge.innerHTML = '<span class="badge-title">🏆 ' + a.title + '</span><span class="badge-desc">' + a.desc + '</span>';
      winAchievementsEl.appendChild(badge);
    });

    winBackdrop.hidden = false;
    launchConfetti();
  }

  function closeWin(){
    winBackdrop.hidden = true;
    stopConfetti();
  }

  winCloseBtn.addEventListener('click', closeWin);
  winBackdrop.addEventListener('click', (e) => {
    if (e.target === winBackdrop) closeWin();
  });

  // Small self-contained particle-based confetti burst — no external
  // libraries, so it works even if a CDN is blocked or you're offline.
  let confettiRafId = null;
  const confettiColors = ['#c9a227', '#4c9a6a', '#f4ebd9', '#e08d7c', '#7fb8a4', '#ddb830'];

  function launchConfetti(){
    const ctx = confettiCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resize(){
      confettiCanvas.width = window.innerWidth * dpr;
      confettiCanvas.height = window.innerHeight * dpr;
      confettiCanvas.style.width = window.innerWidth + 'px';
      confettiCanvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const particleCount = 160;
    const particles = [];
    for (let i = 0; i < particleCount; i++){
      particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight * 0.35 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 6,
        size: Math.random() * 8 + 5,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 18,
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
      });
    }

    const gravity = 0.35;
    const drag = 0.995;
    const startedAt = performance.now();
    const durationMs = 3200;

    function frame(now){
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles.forEach(p => {
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / durationMs);
        if (p.shape === 'rect'){
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (elapsed < durationMs){
        confettiRafId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }

    window.addEventListener('resize', resize);
    confettiRafId = requestAnimationFrame(frame);
  }

  function stopConfetti(){
    if (confettiRafId !== null){
      cancelAnimationFrame(confettiRafId);
      confettiRafId = null;
    }
    const ctx = confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  // ---- keyboard support ----
  function tryTypeNumber(digit){
    const btns = numberTilesEl.querySelectorAll('.tile:not(.used)');
    for (const btn of btns){
      if (btn.textContent === digit){ btn.click(); return true; }
    }
    return false;
  }

  function tryTypeOperator(key){
    const op = OPERATORS.find(o => o.value === key);
    if (!op) return false;
    const btns = operatorTilesEl.querySelectorAll('.tile');
    for (const btn of btns){
      if (btn.textContent === op.display){ btn.click(); return true; }
    }
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (!winBackdrop.hidden){
      if (e.key === 'Enter' || e.key === 'Escape') closeWin();
      return;
    }

    if (e.key === 'Backspace'){ e.preventDefault(); backspace(); return; }
    if (e.key === 'Enter'){
      e.preventDefault();
      if (!submitBtn.disabled) submit();
      return;
    }
    if (e.key === 'Escape'){ closeHelp(); return; }

    if (/^[0-9]$/.test(e.key)){
      if (tryTypeNumber(e.key)) e.preventDefault();
      return;
    }
    if (tryTypeOperator(e.key)) e.preventDefault();
  });

  // ---- help popover ----
  function openHelp(){
    helpPanel.hidden = false;
    helpBtn.setAttribute('aria-expanded', 'true');
  }
  function closeHelp(){
    helpPanel.hidden = true;
    helpBtn.setAttribute('aria-expanded', 'false');
  }
  helpBtn.addEventListener('click', () => {
    helpPanel.hidden ? openHelp() : closeHelp();
  });

  // First-ever visit (per browser): pop the instructions open automatically
  // so new players aren't dropped in cold. Every visit after that, it stays
  // closed by default — same idea as Squaredle not re-showing its tutorial —
  // and players can still reopen it manually any time via "How this works."
  if (!safeGetLS(LS_TUTORIAL_KEY)){
    openHelp();
    safeSetLS(LS_TUTORIAL_KEY, '1');
  }

  backspaceBtn.addEventListener('click', backspace);
  clearBtn.addEventListener('click', clearAll);
  submitBtn.addEventListener('click', submit);

  buildNumberTiles();
  buildOperatorTiles();
  render();

})();
