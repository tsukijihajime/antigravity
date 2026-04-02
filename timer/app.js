/* ============================================
   Chrono Timer — Application Logic
   ============================================ */

(function () {
  'use strict';

  // ─── Constants ────────────────────────────
  const CIRCUMFERENCE = 2 * Math.PI * 142; // ~892.5

  // ─── DOM References ───────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    // Mode
    modeTimerBtn: $('#btn-mode-timer'),
    modeStopwatchBtn: $('#btn-mode-stopwatch'),
    sectionTimer: $('#section-timer'),
    sectionStopwatch: $('#section-stopwatch'),

    // Timer
    inputHours: $('#input-hours'),
    inputMinutes: $('#input-minutes'),
    inputSeconds: $('#input-seconds'),
    timerInputGroup: $('#timer-input-group'),
    timerRunningDisplay: $('#timer-running-display'),
    timerDigits: $('#timer-digits'),
    progressFill: $('#progress-fill'),
    btnTimerStart: $('#btn-timer-start'),
    btnTimerStartText: $('#btn-timer-start-text'),
    btnTimerReset: $('#btn-timer-reset'),

    // Stopwatch
    swDigits: $('#sw-digits'),
    swMs: $('#sw-ms'),
    swProgressFill: $('#sw-progress-fill'),
    btnSwStart: $('#btn-sw-start'),
    btnSwStartText: $('#btn-sw-start-text'),
    btnSwLap: $('#btn-sw-lap'),
    btnSwLapText: $('#btn-sw-lap-text'),
    lapsHeader: $('#laps-header'),
    lapsList: $('#laps-list'),
  };

  // ─── State ────────────────────────────────
  const state = {
    mode: 'timer', // 'timer' | 'stopwatch'

    // Timer state
    timer: {
      totalSeconds: 300,
      remainingMs: 300000,
      running: false,
      paused: false,
      complete: false,
      intervalId: null,
      startTime: null,
      pauseElapsed: 0,
    },

    // Stopwatch state
    stopwatch: {
      elapsedMs: 0,
      running: false,
      paused: false,
      intervalId: null,
      startTime: null,
      pauseElapsed: 0,
      laps: [],
      lastLapMs: 0,
    },
  };

  // ─── Audio Context for Alarm ──────────────
  let audioCtx = null;

  function playAlarm() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Play a pleasant multi-tone alarm
    const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 (A major chord)
    const now = audioCtx.currentTime;

    for (let repeat = 0; repeat < 3; repeat++) {
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + repeat * 0.6);
        gain.gain.linearRampToValueAtTime(0.15, now + repeat * 0.6 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + repeat * 0.6 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + repeat * 0.6 + i * 0.08);
        osc.stop(now + repeat * 0.6 + 0.5);
      });
    }
  }

  // ─── Formatting ───────────────────────────
  function formatTime(ms, includeMs = false) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');

    let result = '';
    if (h > 0) {
      result = `${pad(h)}:${pad(m)}:${pad(s)}`;
    } else {
      result = `${pad(m)}:${pad(s)}`;
    }

    if (includeMs) {
      // For stopwatch display: show HH:MM:SS always with hours
      const msVal = Math.floor((ms % 1000) / 10);
      return {
        main: `${pad(h)}:${pad(m)}:${pad(s)}`,
        ms: `.${String(msVal).padStart(2, '0')}`,
      };
    }

    return result;
  }

  function formatTimerDisplay(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');

    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  // ─── Progress Ring ────────────────────────
  function setProgress(element, fraction) {
    const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, fraction)));
    element.style.strokeDashoffset = offset;
  }

  // ─── Mode Switcher ────────────────────────
  function switchMode(mode) {
    state.mode = mode;
    $$('.mode-btn').forEach((btn) => btn.classList.remove('active'));
    if (mode === 'timer') {
      dom.modeTimerBtn.classList.add('active');
      dom.sectionTimer.classList.add('active');
      dom.sectionStopwatch.classList.remove('active');
    } else {
      dom.modeStopwatchBtn.classList.add('active');
      dom.sectionStopwatch.classList.add('active');
      dom.sectionTimer.classList.remove('active');
    }
  }

  // ═══════════════════════════════════════════
  //  TIMER MODE
  // ═══════════════════════════════════════════

  function getInputSeconds() {
    const h = parseInt(dom.inputHours.value) || 0;
    const m = parseInt(dom.inputMinutes.value) || 0;
    const s = parseInt(dom.inputSeconds.value) || 0;
    return h * 3600 + m * 60 + s;
  }

  function timerStart() {
    const t = state.timer;
    if (t.complete) return;

    if (!t.running && !t.paused) {
      // Fresh start
      t.totalSeconds = getInputSeconds();
      if (t.totalSeconds <= 0) return;
      t.remainingMs = t.totalSeconds * 1000;
      t.pauseElapsed = 0;
    }

    // Switch to running display
    dom.timerInputGroup.classList.add('hidden');
    dom.timerRunningDisplay.classList.remove('hidden');

    if (t.paused) {
      // Resume
      t.startTime = performance.now() - t.pauseElapsed;
      t.paused = false;
    } else {
      t.startTime = performance.now();
      t.pauseElapsed = 0;
    }

    t.running = true;
    updateTimerUI();
    updateTimerButtons();

    t.intervalId = requestAnimationFrame(timerTick);
  }

  function timerTick() {
    const t = state.timer;
    if (!t.running) return;

    const elapsed = performance.now() - t.startTime;
    t.remainingMs = t.totalSeconds * 1000 - elapsed;

    if (t.remainingMs <= 0) {
      t.remainingMs = 0;
      t.running = false;
      t.complete = true;
      updateTimerUI();
      updateTimerButtons();
      timerComplete();
      return;
    }

    updateTimerUI();
    t.intervalId = requestAnimationFrame(timerTick);
  }

  function timerPause() {
    const t = state.timer;
    t.running = false;
    t.paused = true;
    t.pauseElapsed = performance.now() - t.startTime;
    if (t.intervalId) cancelAnimationFrame(t.intervalId);
    updateTimerButtons();
  }

  function timerReset() {
    const t = state.timer;
    t.running = false;
    t.paused = false;
    t.complete = false;
    if (t.intervalId) cancelAnimationFrame(t.intervalId);
    t.remainingMs = t.totalSeconds * 1000;
    t.pauseElapsed = 0;

    dom.timerInputGroup.classList.remove('hidden');
    dom.timerRunningDisplay.classList.add('hidden');
    dom.sectionTimer.classList.remove('timer-complete');

    setProgress(dom.progressFill, 0);
    updateTimerButtons();
  }

  function timerComplete() {
    dom.sectionTimer.classList.add('timer-complete');
    playAlarm();
  }

  function updateTimerUI() {
    const t = state.timer;
    dom.timerDigits.textContent = formatTimerDisplay(t.remainingMs);
    const fraction = t.totalSeconds > 0 ? t.remainingMs / (t.totalSeconds * 1000) : 0;
    setProgress(dom.progressFill, fraction);
  }

  function updateTimerButtons() {
    const t = state.timer;

    const playIcon = dom.btnTimerStart.querySelector('.icon-play');
    const pauseIcon = dom.btnTimerStart.querySelector('.icon-pause');

    if (t.running) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
      dom.btnTimerStartText.textContent = '一時停止';
      dom.btnTimerStart.classList.add('running');
      dom.btnTimerReset.disabled = false;
    } else if (t.complete) {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      dom.btnTimerStartText.textContent = 'スタート';
      dom.btnTimerStart.classList.remove('running');
      dom.btnTimerReset.disabled = false;
    } else if (t.paused) {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      dom.btnTimerStartText.textContent = '再開';
      dom.btnTimerStart.classList.remove('running');
      dom.btnTimerReset.disabled = false;
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      dom.btnTimerStartText.textContent = 'スタート';
      dom.btnTimerStart.classList.remove('running');
      dom.btnTimerReset.disabled = true;
    }
  }

  // ═══════════════════════════════════════════
  //  STOPWATCH MODE
  // ═══════════════════════════════════════════

  function swStart() {
    const sw = state.stopwatch;

    if (sw.paused) {
      sw.startTime = performance.now() - sw.pauseElapsed;
      sw.paused = false;
    } else {
      sw.startTime = performance.now();
      sw.pauseElapsed = 0;
      sw.elapsedMs = 0;
      sw.laps = [];
      sw.lastLapMs = 0;
      dom.lapsList.innerHTML = '';
      dom.lapsHeader.classList.add('hidden');
    }

    sw.running = true;
    updateSwButtons();
    sw.intervalId = requestAnimationFrame(swTick);
  }

  function swTick() {
    const sw = state.stopwatch;
    if (!sw.running) return;

    sw.elapsedMs = performance.now() - sw.startTime;
    updateSwUI();
    sw.intervalId = requestAnimationFrame(swTick);
  }

  function swPause() {
    const sw = state.stopwatch;
    sw.running = false;
    sw.paused = true;
    sw.pauseElapsed = performance.now() - sw.startTime;
    if (sw.intervalId) cancelAnimationFrame(sw.intervalId);
    updateSwButtons();
  }

  function swReset() {
    const sw = state.stopwatch;
    sw.running = false;
    sw.paused = false;
    if (sw.intervalId) cancelAnimationFrame(sw.intervalId);
    sw.elapsedMs = 0;
    sw.pauseElapsed = 0;
    sw.laps = [];
    sw.lastLapMs = 0;

    dom.swDigits.textContent = '00:00:00';
    dom.swMs.textContent = '.00';
    dom.lapsList.innerHTML = '';
    dom.lapsHeader.classList.add('hidden');
    setProgress(dom.swProgressFill, 0);
    updateSwButtons();
  }

  function swLap() {
    const sw = state.stopwatch;
    if (!sw.running) {
      // If paused, act as reset
      swReset();
      return;
    }

    const lapTime = sw.elapsedMs - sw.lastLapMs;
    sw.laps.push({ lapTime, totalTime: sw.elapsedMs });
    sw.lastLapMs = sw.elapsedMs;

    dom.lapsHeader.classList.remove('hidden');
    renderLaps();
  }

  function renderLaps() {
    const sw = state.stopwatch;
    const laps = sw.laps;
    if (laps.length <= 1) {
      // Just render normally if 1 or fewer
      dom.lapsList.innerHTML = laps
        .map((lap, i) => lapHTML(i + 1, lap, ''))
        .reverse()
        .join('');
      return;
    }

    // Find best and worst lap times
    const times = laps.map((l) => l.lapTime);
    const bestTime = Math.min(...times);
    const worstTime = Math.max(...times);

    dom.lapsList.innerHTML = laps
      .map((lap, i) => {
        let cls = '';
        if (lap.lapTime === bestTime) cls = 'best';
        else if (lap.lapTime === worstTime) cls = 'worst';
        return lapHTML(i + 1, lap, cls);
      })
      .reverse()
      .join('');
  }

  function lapHTML(num, lap, extraClass) {
    const lapFormatted = formatTime(lap.lapTime, true);
    const totalFormatted = formatTime(lap.totalTime, true);
    return `
      <div class="lap-item ${extraClass}">
        <span class="lap-number">#${num}</span>
        <span class="lap-time">${lapFormatted.main}${lapFormatted.ms}</span>
        <span class="lap-total">${totalFormatted.main}${totalFormatted.ms}</span>
      </div>
    `;
  }

  function updateSwUI() {
    const sw = state.stopwatch;
    const formatted = formatTime(sw.elapsedMs, true);
    dom.swDigits.textContent = formatted.main;
    dom.swMs.textContent = formatted.ms;

    // Progress ring: complete one full revolution per 60 seconds
    const secondFraction = (sw.elapsedMs % 60000) / 60000;
    setProgress(dom.swProgressFill, secondFraction);
  }

  function updateSwButtons() {
    const sw = state.stopwatch;
    const playIcon = dom.btnSwStart.querySelector('.icon-play');
    const pauseIcon = dom.btnSwStart.querySelector('.icon-pause');

    if (sw.running) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
      dom.btnSwStartText.textContent = '停止';
      dom.btnSwStart.classList.add('running');
      dom.btnSwLap.disabled = false;
      dom.btnSwLapText.textContent = 'ラップ';
    } else if (sw.paused) {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      dom.btnSwStartText.textContent = '再開';
      dom.btnSwStart.classList.remove('running');
      dom.btnSwLap.disabled = false;
      dom.btnSwLapText.textContent = 'リセット';
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      dom.btnSwStartText.textContent = 'スタート';
      dom.btnSwStart.classList.remove('running');
      dom.btnSwLap.disabled = true;
      dom.btnSwLapText.textContent = 'ラップ';
    }
  }

  // ─── Event Listeners ──────────────────────

  // Mode switching
  dom.modeTimerBtn.addEventListener('click', () => switchMode('timer'));
  dom.modeStopwatchBtn.addEventListener('click', () => switchMode('stopwatch'));

  // Timer controls
  dom.btnTimerStart.addEventListener('click', () => {
    const t = state.timer;
    if (t.running) timerPause();
    else if (t.complete) {
      timerReset();
      timerStart();
    } else timerStart();
  });

  dom.btnTimerReset.addEventListener('click', timerReset);

  // Presets
  $$('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const seconds = parseInt(btn.dataset.seconds);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      dom.inputHours.value = h;
      dom.inputMinutes.value = m;
      dom.inputSeconds.value = s;

      // Highlight active preset
      $$('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // If timer was complete, reset
      if (state.timer.complete || state.timer.paused) {
        timerReset();
      }
    });
  });

  // Clear preset highlight when manually editing inputs
  [dom.inputHours, dom.inputMinutes, dom.inputSeconds].forEach((input) => {
    input.addEventListener('input', () => {
      $$('.preset-btn').forEach((b) => b.classList.remove('active'));
    });

    // Select all on focus for easy editing
    input.addEventListener('focus', () => input.select());
  });

  // Stopwatch controls
  dom.btnSwStart.addEventListener('click', () => {
    const sw = state.stopwatch;
    if (sw.running) swPause();
    else swStart();
  });

  dom.btnSwLap.addEventListener('click', swLap);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (state.mode === 'timer') {
        dom.btnTimerStart.click();
      } else {
        dom.btnSwStart.click();
      }
    }

    if (e.code === 'KeyR') {
      if (state.mode === 'timer') {
        timerReset();
      } else {
        swReset();
      }
    }

    if (e.code === 'KeyL' && state.mode === 'stopwatch') {
      swLap();
    }

    // Tab to switch modes
    if (e.code === 'Tab') {
      e.preventDefault();
      switchMode(state.mode === 'timer' ? 'stopwatch' : 'timer');
    }
  });

  // ─── Initialize ───────────────────────────
  setProgress(dom.progressFill, 0);
  setProgress(dom.swProgressFill, 0);
  updateTimerButtons();
  updateSwButtons();
})();
