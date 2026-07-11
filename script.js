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
    resetTodaysSolutions: () => {
      const byDate = loadAllSolutionsByDate();
      delete byDate[utcDateKey(new Date())];
      saveAllSolutionsByDate(byDate);
      console.log('Today\u2019s solutions cleared — reload to see it take effect.');
    },
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
  const winCloseX = document.getElementById('winCloseX');
  const winTimeEl = document.getElementById('winTime');
  const winStreakEl = document.getElementById('winStreak');
  const winRankEl = document.getElementById('winRank');
  const winAchievementsEl = document.getElementById('winAchievements');
  const shareBtn = document.getElementById('shareBtn');
  const shareBtnLabel = document.getElementById('shareBtnLabel');
  const keepPlayingBtn = document.getElementById('keepPlayingBtn');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const timerPill = document.getElementById('timerPill');
  const solutionsCounter = document.getElementById('solutionsCounter');
  const solutionsCountEl = document.getElementById('solutionsCount');
  const solutionsRankTextEl = document.getElementById('solutionsRankText');
  const toastEl = document.getElementById('toast');
  const achvBackdrop = document.getElementById('achvBackdrop');
  const achvCloseBtn = document.getElementById('achvCloseBtn');
  const achvStatsEl = document.getElementById('achvStats');
  const achvListEl = document.getElementById('achvList');
  const achievementsBtn = document.getElementById('achievementsBtn');

  const playAreaEl = document.getElementById('playArea');
  const startGateEl = document.getElementById('startGate');
  const startGateBtn = document.getElementById('startGateBtn');
  const startGateDigitCount = document.getElementById('startGateDigitCount');
  const alreadySolvedGateEl = document.getElementById('alreadySolvedGate');
  const alreadySolvedBtn = document.getElementById('alreadySolvedBtn');
  const alreadySolvedSummaryEl = document.getElementById('alreadySolvedSummary');

  const tutorialBackdrop = document.getElementById('tutorialBackdrop');
  const tutStepLabel = document.getElementById('tutStepLabel');
  const tutSkipBtn = document.getElementById('tutSkipBtn');
  const tutTitleEl = document.getElementById('tutTitle');
  const tutInstructionEl = document.getElementById('tutInstruction');
  const tutTapeEl = document.getElementById('tutTape');
  const tutPlaceholderEl = document.getElementById('tutPlaceholder');
  const tutResultBadge = document.getElementById('tutResultBadge');
  const tutStatusLine = document.getElementById('tutStatusLine');
  const tutNumberTilesEl = document.getElementById('tutNumberTiles');
  const tutOperatorTilesEl = document.getElementById('tutOperatorTiles');
  const tutBackspaceBtn = document.getElementById('tutBackspaceBtn');
  const tutClearBtn = document.getElementById('tutClearBtn');
  const tutCheckBtn = document.getElementById('tutCheckBtn');

  // equation is an ordered list of tokens: { type: 'number'|'operator', display, value, numberId? }
  let equation = [];

  // ---- Persistent, no-login storage (localStorage) --------------------
  // Everything here lives only in this browser on this device. No account,
  // no server — which also means no cross-device sync and no leaderboard.
  // See the README for the upgrade path if that's ever needed.
  const LS_TUTORIAL_KEY = 'goFigure.tutorialSeen.v1';
  const LS_STATS_KEY = 'goFigure.stats.v1';
  const LS_SOLUTIONS_KEY = 'goFigure.solutionsByDate.v1';

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
      recentTimesMs: [],   // last N solve times, oldest first — used for "faster than your own average"
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

  // Solutions found, keyed by UTC date, so today's discoveries survive a
  // reload but next puzzle day naturally starts from zero. Stored as plain
  // string arrays (not Sets — JSON doesn't have a Set type).
  function loadAllSolutionsByDate(){
    const raw = safeGetLS(LS_SOLUTIONS_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e){
      return {};
    }
  }

  function saveAllSolutionsByDate(byDate){
    // Prune to the most recent 30 puzzle-days so this can't grow forever.
    const dateKeys = Object.keys(byDate).sort();
    if (dateKeys.length > 30){
      dateKeys.slice(0, dateKeys.length - 30).forEach(k => delete byDate[k]);
    }
    safeSetLS(LS_SOLUTIONS_KEY, JSON.stringify(byDate));
  }

  function loadTodaysSolutions(){
    const byDate = loadAllSolutionsByDate();
    const todayKey = utcDateKey(new Date());
    return new Set(byDate[todayKey] || []);
  }

  function persistTodaysSolution(raw){
    const byDate = loadAllSolutionsByDate();
    const todayKey = utcDateKey(new Date());
    if (!byDate[todayKey]) byDate[todayKey] = [];
    if (!byDate[todayKey].includes(raw)) byDate[todayKey].push(raw);
    saveAllSolutionsByDate(byDate);
  }
  // ----------------------------------------------------------------------

  // ---- Backend logging (fastest-solve tracking) -------------------------
  // Fire-and-forget calls to a Netlify Function backed by Supabase — see
  // netlify/functions/log-solve.js and schema.sql. Failures are swallowed
  // on purpose: if the backend is down, unreachable (e.g. testing locally
  // without `netlify dev`), or the person is offline, gameplay must never
  // be affected. This only ever sends a solve time and a solutions count —
  // no personal data, and the id is a random token with no way to trace it
  // back to a person.
  const LS_CLIENT_ID_KEY = 'goFigure.clientId.v1';

  function getOrCreateClientId(){
    let id = safeGetLS(LS_CLIENT_ID_KEY);
    if (id) return id;
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : uuidV4Fallback();
    safeSetLS(LS_CLIENT_ID_KEY, id);
    return id;
  }

  function uuidV4Fallback(){
    // Only used for browsers without crypto.randomUUID (pre-2022ish) —
    // good enough for an anonymous, non-cryptographic identifier.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Returns a Promise resolving to the parsed response ({ ok, ranksAvailable,
  // totalPlayers, speedRank, solutionsRank }) on success, or null on any
  // failure — network error, backend not deployed yet, offline, etc. Callers
  // must treat null as "no rank data available" and degrade gracefully
  // rather than showing an error, since this is a nice-to-have, not core
  // gameplay.
  function logSolveToBackend(timeMs, solutionsCount){
    const payload = {
      puzzleDate: utcDateKey(new Date()),
      clientId: getOrCreateClientId(),
      timeMs: Math.max(1, Math.round(timeMs)),
      solutionsCount,
    };
    return fetch('/.netlify/functions/log-solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok){
          res.text().then(msg => console.warn('Go Figure: log-solve returned ' + res.status + ' — ' + msg));
          return null;
        }
        return res.json();
      })
      .then(result => {
        if (result && result.ok && !result.ranksAvailable){
          console.warn('Go Figure: solve saved, but rank computation failed — check Netlify function logs.');
        }
        return result;
      })
      .catch(err => {
        console.warn('Go Figure: log-solve request failed (offline, or the function isn\u2019t deployed yet)', err);
        return null;
      });
  }

  // "1st", "2nd", "3rd", "4th", ... "11th", "21st", etc.
  function ordinal(n){
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const remainder = n % 100;
    return n + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
  }

  // Three tiers, from most to least specific:
  //  - genuinely first to ever solve it today (totalPlayers === 1) → say so
  //  - top 10 by speed → exact ordinal ("3rd fastest of 8")
  //  - everyone else → percentile ("top 23% by speed")
  // Note: rank #1 among MANY players (i.e. currently fastest, but not the
  // literal first person to solve it today) intentionally falls into the
  // "top 10" tier rather than the "first" tier — claiming to be "first"
  // would be misleading if other, slower solves already happened earlier
  // in the day.
  function buildSpeedRankMessage(speedRank, totalPlayers){
    if (!speedRank || !totalPlayers || totalPlayers < 1) return '';
    if (totalPlayers === 1){
      return "You're the first one to complete this puzzle today!";
    }
    if (speedRank <= 10){
      return 'You were ' + ordinal(speedRank) + ' fastest of the ' + totalPlayers + ' people who have played today!';
    }
    const topPercent = Math.min(100, Math.max(1, Math.ceil((speedRank / totalPlayers) * 100)));
    return 'You were in the top ' + topPercent + '% by speed!';
  }
  // ----------------------------------------------------------------------

  // firstWinRecorded: true once the puzzle's been solved at least once —
  // either earlier this session, or (via localStorage) earlier today before
  // a reload. Gates stats/streak recording so exploring extra solutions
  // never double-counts them. boardLocked: true only while the win modal is
  // actively covering the board, to stop clicks leaking through underneath.
  let solvedSignatures = loadTodaysSolutions();
  let firstWinRecorded = solvedSignatures.size > 0;
  let boardLocked = false;
  // Set once, at the first win, so later exploration-mode backend calls
  // (which don't have a fresh elapsed time of their own) have something
  // valid to send. Stays null across a reload, even if firstWinRecorded is
  // already true from a previous session — that's fine, see
  // celebrateExtraSolution()'s fallback.
  let firstWinElapsedMs = null;
  // false until the tutorial finishes (first-timers) or the start gate is
  // clicked (returning players) — blocks all main-game interaction before
  // that, since the digits shouldn't be usable while they're hidden anyway.
  let puzzleStarted = false;

  // Each achievement is checked once per win, in order, against the
  // just-updated stats object. Add more here any time — no other code
  // needs to change.
  const ACHIEVEMENTS = [
    {
      id: 'first_win',
      title: 'First Blood',
      desc: 'Solved your first Go Figure puzzle.',
      check: (stats, ctx) => stats.gamesWon === 1,
    },
    {
      id: 'speedy',
      title: 'Speed Demon',
      desc: 'Solved a puzzle in under 30 seconds.',
      check: (stats, ctx) => ctx.elapsedMs !== null && ctx.elapsedMs < 30000,
    },
    {
      id: 'streak_3',
      title: 'On a Roll',
      desc: '3-day solving streak.',
      check: (stats, ctx) => stats.currentStreak === 3,
    },
    {
      id: 'streak_7',
      title: 'Weekly Warrior',
      desc: '7-day solving streak.',
      check: (stats, ctx) => stats.currentStreak === 7,
    },
    {
      id: 'explorer',
      title: 'Explorer',
      desc: 'Found 3 different solutions to one puzzle.',
      check: (stats, ctx) => ctx.solutionsCount >= 3,
    },
  ];

  function checkAchievements(stats, ctx){
    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach(a => {
      if (!stats.achievements.includes(a.id) && a.check(stats, ctx)){
        stats.achievements.push(a.id);
        newlyUnlocked.push(a);
      }
    });
    return newlyUnlocked;
  }

  function recordWin(elapsedMs){
    const stats = loadStats();
    const todayKey = utcDateKey(new Date());

    // Compare this solve to your own past ones BEFORE adding it to the list,
    // so "faster than X% of your solves" means past solves, not itself.
    const pastTimes = stats.recentTimesMs.slice();
    const selfPercentile = pastTimes.length >= 3
      ? Math.round((pastTimes.filter(t => t > elapsedMs).length / pastTimes.length) * 100)
      : null; // not enough history yet to say anything meaningful

    stats.gamesWon += 1;
    if (stats.bestTimeMs === null || elapsedMs < stats.bestTimeMs){
      stats.bestTimeMs = elapsedMs;
    }
    stats.recentTimesMs.push(elapsedMs);
    if (stats.recentTimesMs.length > 30) stats.recentTimesMs.shift(); // cap history, oldest first

    if (stats.lastWonDate === todayKey){
      // already recorded a win today (e.g. page reload) — don't double-count streak
    } else {
      const yesterdayKey = utcDateKey(new Date(Date.now() - 86400000));
      stats.currentStreak = (stats.lastWonDate === yesterdayKey) ? stats.currentStreak + 1 : 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      stats.lastWonDate = todayKey;
    }

    const newlyUnlocked = checkAchievements(stats, { elapsedMs, solutionsCount: 1 });

    saveStats(stats);
    return { stats, newlyUnlocked, selfPercentile };
  }
  // ----------------------------------------------------------------------

  // ---- Timer ----
  // Starts on the very first tile tap (number or operator), stops the
  // moment a correct equation is submitted. Resets on Clear.
  let startTime = null;
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

  // ---- Start gate (returning players) ----
  // Digits stay hidden behind a blur until this runs, so the timer only
  // ever starts when the player is actually ready to be timed. There are
  // three ways in:
  //  - finishTutorial() → first-ever visit, always timed
  //  - startGateBtn     → returning player, hasn't solved today yet, timed
  //  - alreadySolvedBtn → returning player, ALREADY solved today — no
  //    timer, since the timed attempt already happened earlier
  function revealAndStart(shouldStartTimer){
    startGateEl.hidden = true;
    alreadySolvedGateEl.hidden = true;
    playAreaEl.classList.remove('gated');
    puzzleStarted = true;
    if (shouldStartTimer){
      startTimerIfNeeded();
    } else {
      // Nothing to time — hide the pill rather than let it sit at a static
      // "0:00" that looks like a stalled timer.
      timerPill.style.display = 'none';
    }
  }

  startGateBtn.addEventListener('click', () => revealAndStart(true));
  alreadySolvedBtn.addEventListener('click', () => revealAndStart(false));

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
    if (boardLocked || !puzzleStarted) return;
    startTimerIfNeeded();
    equation.push({ type: 'number', display: String(num), value: String(num), numberId: idx });
    btnEl.classList.add('used');
    pressAnim(btnEl);
    render();
  }

  function useOperator(op, btnEl){
    if (boardLocked || !puzzleStarted) return;
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
    if (boardLocked || !puzzleStarted) return;
    const last = equation.pop();
    if (!last) return;
    if (last.type === 'number'){
      const tile = numberTilesEl.querySelector('[data-number-id="' + last.numberId + '"]');
      if (tile) tile.classList.remove('used');
    }
    render();
  }

  function clearAll(){
    if (boardLocked || !puzzleStarted) return;
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
    if (boardLocked || !puzzleStarted) return;

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

    if (!isTrue){
      showStatus(left.toLocaleString() + ' doesn\u2019t equal ' + right.toLocaleString() + '.', 'bad');
      return;
    }

    if (!firstWinRecorded){
      firstWinRecorded = true;
      solvedSignatures.add(raw);
      persistTodaysSolution(raw);
      showStatus(left.toLocaleString() + ' really does equal ' + right.toLocaleString() + '.', 'good');
      triggerWin();
      return;
    }

    // Already won once (this session or earlier today) — this is exploration
    // mode, hunting for additional distinct solutions using the same digits.
    if (solvedSignatures.has(raw)){
      showStatus('You already found that one — try a different arrangement!', 'good');
      return;
    }
    solvedSignatures.add(raw);
    persistTodaysSolution(raw);
    solutionsCountEl.textContent = solvedSignatures.size;
    showStatus('Another one! That\u2019s ' + solvedSignatures.size + ' solutions now.', 'good');
    celebrateExtraSolution();
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
    boardLocked = true;
    if (timerInterval !== null){ clearInterval(timerInterval); timerInterval = null; }

    const elapsedMs = performance.now() - (startTime !== null ? startTime : performance.now());
    winTimeEl.textContent = formatElapsed(elapsedMs);
    firstWinElapsedMs = elapsedMs;

    const { stats, newlyUnlocked, selfPercentile } = recordWin(elapsedMs);

    winRankEl.textContent = ''; // filled in asynchronously below, once the backend responds
    logSolveToBackend(elapsedMs, solvedSignatures.size).then(result => {
      if (result && result.ok && result.ranksAvailable){
        winRankEl.textContent = buildSpeedRankMessage(result.speedRank, result.totalPlayers);
      }
    });

    const streakText = stats.currentStreak > 1
      ? '🔥 ' + stats.currentStreak + '-day streak'
      : (stats.currentStreak === 1 ? 'First day of a new streak — come back tomorrow!' : '');
    const speedText = selfPercentile !== null
      ? 'Faster than ' + selfPercentile + '% of your past solves'
      : '';
    winStreakEl.textContent = [streakText, speedText].filter(Boolean).join(' · ');

    winAchievementsEl.innerHTML = '';
    newlyUnlocked.forEach(a => winAchievementsEl.appendChild(achievementBadgeEl(a)));

    solutionsCounter.hidden = false;
    solutionsCountEl.textContent = solvedSignatures.size;

    winBackdrop.hidden = false;
    launchConfetti();
  }

  function achievementBadgeEl(a){
    const badge = document.createElement('div');
    badge.className = 'achievement-badge';
    badge.innerHTML = '<span class="badge-title">🏆 ' + a.title + '</span><span class="badge-desc">' + a.desc + '</span>';
    return badge;
  }

  // Dismissing the modal (X, backdrop click, Escape) and "Keep playing" do
  // the same thing: hide the modal and free up the board so more solutions
  // can be tried. The only difference is intent/copy — functionally unified
  // so there's one mental model instead of two dismissal behaviors.
  function closeWinAndResetBoard(){
    winBackdrop.hidden = true;
    stopConfetti();
    boardLocked = false;
    equation = [];
    numberTilesEl.querySelectorAll('.tile').forEach(t => t.classList.remove('used'));
    render();
  }

  winCloseX.addEventListener('click', closeWinAndResetBoard);
  keepPlayingBtn.addEventListener('click', closeWinAndResetBoard);
  winBackdrop.addEventListener('click', (e) => {
    if (e.target === winBackdrop) closeWinAndResetBoard();
  });

  // A lighter celebration for extra solutions found after the first win —
  // no modal, no stats re-recorded, just a quick confetti pop and a check
  // for the "Explorer" achievement (which can only unlock here).
  function celebrateExtraSolution(){
    launchConfetti();

    // firstWinElapsedMs is null if the win happened in an earlier session
    // (e.g. reloaded mid-day) — fall back to the persisted best time so
    // there's still a valid value to send; the backend ignores time_ms on
    // updates anyway, this only matters for the (rare) case where the very
    // first insert never made it to the server.
    const timeForLog = firstWinElapsedMs !== null ? firstWinElapsedMs : (loadStats().bestTimeMs || 1);
    logSolveToBackend(timeForLog, solvedSignatures.size).then(result => {
      if (result && result.ok && result.ranksAvailable){
        solutionsRankTextEl.textContent = ' (Rank: ' + result.solutionsRank + '/' + result.totalPlayers + ')';
      }
    });

    const stats = loadStats();
    const newlyUnlocked = checkAchievements(stats, { elapsedMs: null, solutionsCount: solvedSignatures.size });
    if (newlyUnlocked.length){
      saveStats(stats);
      showToast('🏆 ' + newlyUnlocked.map(a => a.title).join(', ') + ' unlocked!');
    }
  }

  let toastTimeoutId = null;
  function showToast(message){
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (toastTimeoutId !== null) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => { toastEl.hidden = true; }, 4000);
  }

  // ---- Share ----
  function buildShareText(){
    const lines = ['Go Figure — ' + utcDateKey(new Date())];
    lines.push('✅ Solved in ' + winTimeEl.textContent);
    if (winStreakEl.textContent) lines.push(winStreakEl.textContent.replace(' · ', ' — '));
    lines.push('🧩 ' + solvedSignatures.size + ' solution' + (solvedSignatures.size === 1 ? '' : 's') + ' found');
    lines.push(location.origin + location.pathname);
    return lines.join('\n');
  }

  shareBtn.addEventListener('click', async () => {
    const text = buildShareText();

    if (navigator.share){
      try {
        await navigator.share({ text });
      } catch (e){
        // user backed out of the share sheet — not an error, do nothing
      }
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText){
      try {
        await navigator.clipboard.writeText(text);
        flashShareButton();
        return;
      } catch (e){
        // fall through to the manual fallback below
      }
    }

    fallbackCopy(text);
    flashShareButton();
  });

  function flashShareButton(){
    const original = shareBtnLabel.textContent;
    shareBtnLabel.textContent = 'Copied!';
    shareBtn.classList.add('copied');
    setTimeout(() => {
      shareBtnLabel.textContent = original;
      shareBtn.classList.remove('copied');
    }, 1500);
  }

  function fallbackCopy(text){
    // Last resort for browsers without the Clipboard API (older Safari,
    // non-HTTPS contexts, etc.) — a temporary offscreen textarea + execCommand.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e){ /* nothing more we can do */ }
    document.body.removeChild(ta);
  }

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

  // ---- Achievements panel ----
  function statChip(value, label){
    return '<div class="stat-chip"><span class="stat-value">' + value + '</span><span class="stat-label">' + label + '</span></div>';
  }

  function openAchievements(){
    const stats = loadStats();

    achvStatsEl.innerHTML =
      statChip(stats.gamesWon, 'Puzzles won') +
      statChip(stats.bestTimeMs !== null ? formatElapsed(stats.bestTimeMs) : '--', 'Best time') +
      statChip(stats.currentStreak, 'Current streak') +
      statChip(stats.longestStreak, 'Longest streak');

    achvListEl.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const unlocked = stats.achievements.includes(a.id);
      const row = document.createElement('div');
      row.className = 'achievement-row' + (unlocked ? '' : ' locked');
      row.innerHTML =
        '<span class="row-icon">' + (unlocked ? '🏆' : '🔒') + '</span>' +
        '<span class="row-text">' +
          '<span class="row-title">' + a.title + '</span>' +
          '<span class="row-desc">' + a.desc + '</span>' +
        '</span>';
      achvListEl.appendChild(row);
    });

    achvBackdrop.hidden = false;
  }

  function closeAchievements(){
    achvBackdrop.hidden = true;
  }

  achievementsBtn.addEventListener('click', openAchievements);
  achvCloseBtn.addEventListener('click', closeAchievements);
  achvBackdrop.addEventListener('click', (e) => {
    if (e.target === achvBackdrop) closeAchievements();
  });

  // ---- keyboard support ----
  function tryTypeNumberIn(containerEl, digit){
    const btns = containerEl.querySelectorAll('.tile:not(.used)');
    for (const btn of btns){
      if (btn.textContent === digit){ btn.click(); return true; }
    }
    return false;
  }

  function tryTypeOperatorIn(containerEl, key){
    const op = OPERATORS.find(o => o.value === key);
    if (!op) return false;
    const btns = containerEl.querySelectorAll('.tile');
    for (const btn of btns){
      if (btn.textContent === op.display){ btn.click(); return true; }
    }
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (!winBackdrop.hidden){
      if (e.key === 'Enter' || e.key === 'Escape') closeWinAndResetBoard();
      return;
    }
    if (!achvBackdrop.hidden){
      if (e.key === 'Enter' || e.key === 'Escape') closeAchievements();
      return;
    }
    if (!tutorialBackdrop.hidden){
      if (e.key === 'Backspace'){ e.preventDefault(); tutBackspaceBtn.click(); return; }
      if (e.key === 'Enter'){
        e.preventDefault();
        if (!tutCheckBtn.disabled) tutCheckBtn.click();
        return;
      }
      if (/^[0-9]$/.test(e.key)){
        if (tryTypeNumberIn(tutNumberTilesEl, e.key)) e.preventDefault();
        return;
      }
      if (tryTypeOperatorIn(tutOperatorTilesEl, e.key)) e.preventDefault();
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
      if (tryTypeNumberIn(numberTilesEl, e.key)) e.preventDefault();
      return;
    }
    if (tryTypeOperatorIn(operatorTilesEl, e.key)) e.preventDefault();
  });

  // ---- help popover (now purely on-demand — first-time onboarding is the
  // guided tutorial below, not this panel auto-opening) ----
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

  // ---- Guided tutorial (first-time players only) ------------------------
  // Each step is its own tiny self-contained puzzle with its own digits,
  // reusing the exact same tile/tape/eval logic as the real game so it
  // feels identical to actually playing — just smaller and instructive.
  const TUTORIAL_STEPS = [
    {
      digits: [1, 2, 3],
      title: 'The basics',
      instruction: 'Your goal is to build a true equation using every number you\u2019re given. Try proving <strong>1 + 2 = 3</strong>.',
      concept: null,
    },
    {
      digits: [1, 2, 3, 4],
      title: 'Combining digits',
      instruction: 'Play two numbers back-to-back with nothing between them and they combine into one bigger number. Try <strong>12 ÷ 3 = 4</strong>.',
      concept: 'concat',
      conceptHint: 'Correct math, but try combining two digits into one this time — tap 1, then 2, to get 12.',
    },
    {
      digits: [2, 3, 5],
      title: 'Remainders',
      instruction: '<strong>%</strong> gives you the remainder left over after dividing. Try <strong>5 % 3 = 2</strong>.',
      concept: 'percent',
      conceptHint: 'Correct math, but try using the % operator this time.',
    },
    {
      digits: [3, 4, 6],
      title: 'Factorials',
      instruction: '<strong>!</strong> means factorial — multiply the number by every whole number below it. Try <strong>3! = 6</strong> (that\u2019s 3 × 2 × 1).',
      concept: 'factorial',
      conceptHint: 'Correct math, but try using the ! operator this time.',
    },
  ];

  let tutStepIndex = 0;
  let tutEquation = [];

  function buildTutNumberTiles(digits){
    tutNumberTilesEl.innerHTML = '';
    digits.forEach((num, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tile';
      btn.textContent = num;
      btn.dataset.numberId = idx;
      btn.setAttribute('aria-label', 'Number ' + num);
      btn.addEventListener('click', () => {
        tutEquation.push({ type: 'number', display: String(num), value: String(num), numberId: idx });
        btn.classList.add('used');
        pressAnim(btn);
        renderTutTape();
      });
      tutNumberTilesEl.appendChild(btn);
    });
  }

  function buildTutOperatorTiles(){
    tutOperatorTilesEl.innerHTML = '';
    OPERATORS.forEach(op => {
      const btn = document.createElement('button');
      btn.className = 'tile op';
      btn.textContent = op.display;
      btn.setAttribute('aria-label', 'Operator ' + op.display);
      btn.addEventListener('click', () => {
        tutEquation.push({ type: 'operator', display: op.display, value: op.value });
        pressAnim(btn);
        renderTutTape();
      });
      tutOperatorTilesEl.appendChild(btn);
    });
  }

  function renderTutTape(){
    tutTapeEl.querySelectorAll('.tape-token').forEach(el => el.remove());
    if (tutEquation.length === 0){
      tutPlaceholderEl.style.display = 'inline';
    } else {
      tutPlaceholderEl.style.display = 'none';
      tutEquation.forEach((tok, i) => {
        const span = document.createElement('span');
        span.className = 'tape-token' + (tok.type === 'operator' ? ' op' : '');
        span.textContent = tok.display;
        const prev = tutEquation[i - 1];
        if (tok.type === 'number' && prev && prev.type === 'number'){
          span.style.marginLeft = '0px';
        }
        tutTapeEl.insertBefore(span, tutTapeEl.querySelector('.cursor'));
      });
    }
    tutResultBadge.classList.remove('show', 'good', 'bad');
    tutStatusLine.textContent = '';
    tutStatusLine.className = 'status-line';
    const equalsCount = tutEquation.filter(t => t.value === '=').length;
    tutCheckBtn.disabled = tutEquation.length === 0 || equalsCount !== 1;
  }

  function tutHasConcatenation(){
    return tutEquation.some((t, i) => t.type === 'number' && i > 0 && tutEquation[i - 1].type === 'number');
  }

  function loadTutorialStep(i){
    tutStepIndex = i;
    tutEquation = [];
    const step = TUTORIAL_STEPS[i];
    tutStepLabel.textContent = 'Step ' + (i + 1) + ' of ' + TUTORIAL_STEPS.length;
    tutTitleEl.textContent = step.title;
    tutInstructionEl.innerHTML = step.instruction;
    buildTutNumberTiles(step.digits);
    buildTutOperatorTiles();
    renderTutTape();
  }

  function checkTutorialStep(){
    const step = TUTORIAL_STEPS[tutStepIndex];
    const numbersUsed = tutEquation.filter(t => t.type === 'number').length;
    if (numbersUsed < step.digits.length){
      tutStatusLine.textContent = 'Use all ' + step.digits.length + ' numbers first.';
      tutStatusLine.className = 'status-line bad';
      return;
    }

    const raw = tutEquation.map(t => t.value).join('');
    const parts = raw.split('=');
    if (parts.length !== 2){
      tutStatusLine.textContent = 'Add exactly one "=" to check your equation.';
      tutStatusLine.className = 'status-line bad';
      return;
    }

    const left = evaluateSide(parts[0]);
    const right = evaluateSide(parts[1]);
    if (left === null || right === null || Math.abs(left - right) >= 1e-9){
      tutResultBadge.textContent = '✕';
      tutResultBadge.classList.remove('good');
      tutResultBadge.classList.add('bad', 'show');
      tutStatusLine.textContent = 'Not quite — check your math and try again.';
      tutStatusLine.className = 'status-line bad';
      return;
    }

    if (step.concept === 'concat' && !tutHasConcatenation()){
      tutStatusLine.textContent = step.conceptHint;
      tutStatusLine.className = 'status-line bad';
      return;
    }
    if (step.concept === 'percent' && !tutEquation.some(t => t.value === '%')){
      tutStatusLine.textContent = step.conceptHint;
      tutStatusLine.className = 'status-line bad';
      return;
    }
    if (step.concept === 'factorial' && !tutEquation.some(t => t.value === '!')){
      tutStatusLine.textContent = step.conceptHint;
      tutStatusLine.className = 'status-line bad';
      return;
    }

    tutResultBadge.textContent = '✓';
    tutResultBadge.classList.remove('bad');
    tutResultBadge.classList.add('good', 'show');
    tutStatusLine.textContent = 'Nice! ' + left.toLocaleString() + ' = ' + right.toLocaleString() + '.';
    tutStatusLine.className = 'status-line good';
    tutCheckBtn.disabled = true;

    setTimeout(() => {
      if (tutStepIndex + 1 < TUTORIAL_STEPS.length){
        loadTutorialStep(tutStepIndex + 1);
      } else {
        finishTutorial();
      }
    }, 900);
  }

  function startTutorial(){
    tutorialBackdrop.hidden = false;
    loadTutorialStep(0);
  }

  function finishTutorial(){
    safeSetLS(LS_TUTORIAL_KEY, '1');
    tutorialBackdrop.hidden = true;
    // First-timers go straight in — no extra "Start" click needed, they
    // just proved they know how to play. Always timed: finishing the
    // tutorial for the first time can only happen before today's puzzle
    // has been solved in this browser.
    revealAndStart(true);
  }

  tutCheckBtn.addEventListener('click', checkTutorialStep);
  tutBackspaceBtn.addEventListener('click', () => {
    const last = tutEquation.pop();
    if (!last) return;
    if (last.type === 'number'){
      const tile = tutNumberTilesEl.querySelector('[data-number-id="' + last.numberId + '"]');
      if (tile) tile.classList.remove('used');
    }
    renderTutTape();
  });
  tutClearBtn.addEventListener('click', () => {
    tutEquation = [];
    tutNumberTilesEl.querySelectorAll('.tile').forEach(t => t.classList.remove('used'));
    renderTutTape();
  });
  tutSkipBtn.addEventListener('click', finishTutorial);
  // ------------------------------------------------------------------------

  backspaceBtn.addEventListener('click', backspace);
  clearBtn.addEventListener('click', clearAll);
  submitBtn.addEventListener('click', submit);

  buildNumberTiles();
  buildOperatorTiles();
  render();

  if (solvedSignatures.size > 0){
    solutionsCounter.hidden = false;
    solutionsCountEl.textContent = solvedSignatures.size;
  }

  // ---- First load: one of three states —
  //  1. First-ever visit → guided tutorial
  //  2. Already solved today (persisted from earlier) → "already solved" gate, no timer
  //  3. Returning player, haven't solved today yet → normal start gate, timed
  // Never straight into a running timer with no warning, and never a
  // re-running timer for a puzzle already solved today.
  if (!safeGetLS(LS_TUTORIAL_KEY)){
    playAreaEl.classList.add('gated');
    startTutorial();
  } else if (firstWinRecorded){
    playAreaEl.classList.add('gated');
    alreadySolvedSummaryEl.textContent = solvedSignatures.size === 1
      ? "You've found 1 solution so far. Want to keep exploring?"
      : 'You\u2019ve found ' + solvedSignatures.size + ' solutions so far. Want to keep exploring?';
    alreadySolvedGateEl.hidden = false;
  } else {
    playAreaEl.classList.add('gated');
    startGateDigitCount.textContent = NUMBERS.length;
    startGateEl.hidden = false;
  }

})();
