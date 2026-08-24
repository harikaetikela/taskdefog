document.addEventListener('DOMContentLoaded', () => {
  const defogForm = document.getElementById('defog-form');
  const taskInput = document.getElementById('task-input');
  const charCountSpan = document.getElementById('char-count');
  const submitBtn = document.getElementById('submit-btn');
  const outputSection = document.getElementById('output-section');
  const emptyState = document.getElementById('empty-state');
  const resultContent = document.getElementById('result-content');
  
  // Result DOM elements
  const realityCheckBanner = document.getElementById('reality-check-banner');
  const realityCheckText = document.getElementById('reality-check-text');
  const top3List = document.getElementById('top3-list');
  const quickWinsList = document.getElementById('quick-wins-list');
  const thisWeekList = document.getElementById('this-week-list');
  const canWaitList = document.getElementById('can-wait-list');
  const resultSummary = document.getElementById('result-summary');
  const copyReportBtn = document.getElementById('copy-report-btn');
  const globalMuteBtn = document.getElementById('global-mute-btn');
  
  // Surprise Progress elements
  const surpriseToggleBtn = document.getElementById('surprise-toggle-btn');
  const surprisePanel = document.getElementById('surprise-panel');
  const modeFlowerBtn = document.getElementById('mode-flower-btn');
  const modeCarBtn = document.getElementById('mode-car-btn');
  const flowerDisplay = document.getElementById('flower-display');
  const carDisplay = document.getElementById('car-display');
  
  let currentResponseData = null;
  let isMuted = false;
  
  // Track active Pomodoro timers (taskIndex -> timerState)
  const taskTimers = {};
  
  // Progress Celebration state
  let selectedMode = localStorage.getItem('defogCelebrationMode') || 'flower';
  let isCelebrationTriggered = false; // Prevent double burst trigger

  // Input Character Counter
  taskInput.addEventListener('input', () => {
    charCountSpan.textContent = taskInput.value.length;
  });

  // Example Chips
  document.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      taskInput.value = chip.dataset.text;
      charCountSpan.textContent = taskInput.value.length;
      taskInput.focus();
    });
  });

  // Global Mute Toggle
  if (globalMuteBtn) {
    globalMuteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      if (isMuted) {
        globalMuteBtn.classList.add('muted');
        globalMuteBtn.innerHTML = '<span class="mute-icon">🔇</span> Sounds: Off';
      } else {
        globalMuteBtn.classList.remove('muted');
        globalMuteBtn.innerHTML = '<span class="mute-icon">🔊</span> Sounds: On';
      }
    });
  }

  // Surprise Panel Toggle
  surpriseToggleBtn.addEventListener('click', () => {
    surprisePanel.classList.toggle('hidden');
    if (!surprisePanel.classList.contains('hidden')) {
      surpriseToggleBtn.classList.add('active');
      // Initialize SVG structures if they are empty
      if (!flowerDisplay.querySelector('svg')) {
        initializeFlowerSVG();
      }
      if (!carDisplay.querySelector('svg')) {
        initializeCarSVG();
      }
      updateCelebrationProgress();
    } else {
      surpriseToggleBtn.classList.remove('active');
    }
  });

  // Progress Mode Switchers
  modeFlowerBtn.addEventListener('click', () => {
    setCelebrationMode('flower');
  });

  modeCarBtn.addEventListener('click', () => {
    setCelebrationMode('car');
  });

  function setCelebrationMode(mode) {
    selectedMode = mode;
    localStorage.setItem('defogCelebrationMode', mode);
    
    if (mode === 'flower') {
      modeFlowerBtn.classList.add('active');
      modeCarBtn.classList.remove('active');
      flowerDisplay.classList.remove('hidden');
      carDisplay.classList.add('hidden');
    } else {
      modeFlowerBtn.classList.remove('active');
      modeCarBtn.classList.add('active');
      flowerDisplay.classList.add('hidden');
      carDisplay.classList.remove('hidden');
    }
    updateCelebrationProgress();
  }

  // Audio Synth Alert using Web Audio API
  function playBeepAlert() {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      function playTone(freq, startTime, duration) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gainNode.gain.setValueAtTime(0.25, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.02);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      }

      // Play pleasant Pomodoro complete chime (C5 -> E5 -> G5 -> C6)
      const now = ctx.currentTime;
      playTone(523.25, now, 0.15);       // C5
      playTone(659.25, now + 0.15, 0.15); // E5
      playTone(783.99, now + 0.30, 0.15); // G5
      playTone(1046.50, now + 0.45, 0.40); // C6
    } catch (e) {
      console.error("Audio Context beep failed", e);
    }
  }

  // Helper to parse "1h 30m", "45m", etc. into minutes
  function parseTimeEstimateToMinutes(timeStr) {
    if (!timeStr) return 25; // default Pomodoro
    const cleaned = timeStr.toLowerCase().trim();
    
    const hourMatch = cleaned.match(/(\d+)\s*h/);
    const minMatch = cleaned.match(/(\d+)\s*m/);
    
    let totalMin = 0;
    if (hourMatch) {
      totalMin += parseInt(hourMatch[1], 10) * 60;
    }
    if (minMatch) {
      totalMin += parseInt(minMatch[1], 10);
    }
    
    if (totalMin > 0) return totalMin;
    
    // Fallback if it is just a number
    const numberMatch = cleaned.match(/\d+/);
    if (numberMatch) {
      return parseInt(numberMatch[0], 10);
    }
    
    return 25;
  }

  // Submit Handler
  defogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskDescription = taskInput.value.trim();
    if (!taskDescription) return;

    // Show Loading
    document.body.classList.add('loading');
    submitBtn.disabled = true;

    // Clear any running timers before rendering new tasks
    Object.keys(taskTimers).forEach(idx => stopTaskTimer(idx));

    try {
      const response = await fetch('/api/defog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskDescription })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const data = await response.json();
      currentResponseData = data;
      renderResults(data);
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message || 'Something went wrong. Please check that your server is running and Gemini API is accessible.'}`);
    } finally {
      // Hide Loading
      document.body.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  // Render Results to UI
  function renderResults(data) {
    outputSection.classList.remove('empty');
    emptyState.classList.add('hidden');
    resultContent.classList.remove('hidden');

    if (window.innerWidth <= 968) {
      outputSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 1. Reality Check Banner
    if (data.realityCheck) {
      realityCheckText.textContent = data.realityCheck;
      realityCheckBanner.classList.remove('hidden');
    } else {
      realityCheckBanner.classList.add('hidden');
    }

    // 2. Top 3 Today checklist
    top3List.innerHTML = '';
    const top3 = data.top3 || [];
    if (top3.length === 0) {
      top3List.innerHTML = '<li class="checklist-item">No priorities assigned for today.</li>';
    } else {
      top3.forEach((item, index) => {
        const defaultMinutes = parseTimeEstimateToMinutes(item.timeEstimate);
        const li = document.createElement('li');
        li.className = 'checklist-item';
        li.id = `top3-item-${index}`;
        li.innerHTML = `
          <div class="checklist-checkbox-wrapper">
            <input type="checkbox" id="top3-chk-${index}">
          </div>
          <div class="checklist-content" style="position: relative;">
            <label for="top3-chk-${index}">
              <div class="checklist-title-wrapper">
                <span class="checklist-title">${escapeHtml(item.task)}</span>
                ${item.timeEstimate ? `<span class="time-badge">${escapeHtml(item.timeEstimate)}</span>` : ''}
              </div>
              <div class="checklist-desc">${escapeHtml(item.details || '')}</div>
            </label>
            
            <!-- Timer Actions & Popups -->
            <div class="task-item-footer">
              <button type="button" class="timer-trigger-btn" id="timer-trigger-${index}">
                ⏱ Timer
              </button>
              
              <!-- Absolute Setup Popup -->
              <div class="timer-setup-popup hidden" id="timer-setup-${index}">
                <div class="popup-title">Pomodoro Presets</div>
                <div class="presets-grid">
                  <button type="button" class="preset-btn" data-min="15">15m</button>
                  <button type="button" class="preset-btn" data-min="25">25m</button>
                  <button type="button" class="preset-btn" data-min="45">45m</button>
                  <button type="button" class="preset-btn" data-min="60">60m</button>
                </div>
                <div class="popup-title" style="margin-top: 4px;">Custom Minutes</div>
                <div class="custom-input-row">
                  <input type="number" id="custom-min-${index}" min="1" max="999" value="${defaultMinutes}">
                  <label>min</label>
                </div>
                <button type="button" class="start-timer-btn" id="start-btn-${index}">Start Focus Session</button>
              </div>
            </div>
            
            <!-- Active Timer Countdown Display -->
            <div class="active-timer-display hidden" id="active-display-${index}">
              <div class="countdown-clock" id="clock-${index}">00:00</div>
              <div class="timer-controls">
                <button type="button" class="timer-ctrl-btn play-pause-btn" id="play-pause-${index}" title="Pause/Resume">⏸</button>
                <button type="button" class="timer-ctrl-btn stop-btn" id="stop-${index}" title="Stop Focus Session">⏹</button>
                <button type="button" class="timer-ctrl-btn skip-btn" id="skip-${index}" title="Complete & Skip Task">➔</button>
              </div>
            </div>
          </div>
        `;
        
        // Add Toggle Event for Done Checklist Items
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            li.classList.add('checked');
            stopTaskTimer(index);
          } else {
            li.classList.remove('checked');
          }
          // Update visual progress arena in real-time
          updateCelebrationProgress();
        });

        // Toggle Timer Setup Popup Open/Close
        const triggerBtn = li.querySelector(`#timer-trigger-${index}`);
        const setupPopup = li.querySelector(`#timer-setup-${index}`);
        triggerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setupPopup.classList.toggle('hidden');
        });

        // Hide popup if clicking outside
        document.addEventListener('click', (e) => {
          if (!setupPopup.contains(e.target) && e.target !== triggerBtn) {
            setupPopup.classList.add('hidden');
          }
        });

        // Preset Button Clicks
        setupPopup.querySelectorAll('.preset-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            setupPopup.querySelector(`#custom-min-${index}`).value = btn.dataset.min;
          });
        });

        // Start Timer Action
        const startBtn = li.querySelector(`#start-btn-${index}`);
        startBtn.addEventListener('click', () => {
          const minutes = parseInt(setupPopup.querySelector(`#custom-min-${index}`).value, 10) || defaultMinutes;
          setupPopup.classList.add('hidden');
          triggerBtn.classList.add('hidden');
          startTaskTimer(index, minutes);
        });

        // Timer Control Event Listeners
        li.querySelector(`#play-pause-${index}`).addEventListener('click', () => togglePauseTimer(index));
        li.querySelector(`#stop-${index}`).addEventListener('click', () => stopTaskTimer(index));
        li.querySelector(`#skip-${index}`).addEventListener('click', () => skipTask(index));

        top3List.appendChild(li);
      });
    }

    // 3. Quick Wins Column
    quickWinsList.innerHTML = '';
    const quickWins = data.quickWins || [];
    if (quickWins.length === 0) {
      quickWinsList.innerHTML = '<li class="column-list-item"><div class="item-desc">No quick wins found.</div></li>';
    } else {
      quickWins.forEach(item => {
        const li = document.createElement('li');
        li.className = 'column-list-item';
        li.innerHTML = `
          <div class="item-title-wrapper">
            <span class="item-title">${escapeHtml(item.task)}</span>
            ${item.timeEstimate ? `<span class="item-time-badge">${escapeHtml(item.timeEstimate)}</span>` : ''}
          </div>
        `;
        quickWinsList.appendChild(li);
      });
    }

    // 4. This Week Column
    thisWeekList.innerHTML = '';
    const thisWeek = data.thisWeek || [];
    if (thisWeek.length === 0) {
      thisWeekList.innerHTML = '<li class="column-list-item"><div class="item-desc">No weekly tasks listed.</div></li>';
    } else {
      thisWeek.forEach(item => {
        const li = document.createElement('li');
        li.className = 'column-list-item';
        li.innerHTML = `
          <div class="item-title-wrapper">
            <span class="item-title">${escapeHtml(item.task)}</span>
          </div>
          ${item.details ? `<div class="item-desc">${escapeHtml(item.details)}</div>` : ''}
        `;
        thisWeekList.appendChild(li);
      });
    }

    // 5. Can Wait Column
    canWaitList.innerHTML = '';
    const canWait = data.canWait || [];
    if (canWait.length === 0) {
      canWaitList.innerHTML = '<li class="column-list-item"><div class="item-desc">No parked tasks.</div></li>';
    } else {
      canWait.forEach(item => {
        const li = document.createElement('li');
        li.className = 'column-list-item';
        li.innerHTML = `
          <div class="item-title-wrapper">
            <span class="item-title">${escapeHtml(item.task)}</span>
          </div>
          ${item.details ? `<div class="item-desc">${escapeHtml(item.details)}</div>` : ''}
        `;
        canWaitList.appendChild(li);
      });
    }

    // 6. Summary at bottom
    resultSummary.textContent = data.summary || 'Summary unavailable.';

    // Setup Surprise Progress configuration
    setCelebrationMode(selectedMode);
    isCelebrationTriggered = false;
  }

  // --- Pomodoro Timer Functionality ---

  function startTaskTimer(index, minutes) {
    stopTaskTimer(index);

    const totalSeconds = minutes * 60;
    taskTimers[index] = {
      totalSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      isPaused: false,
      intervalId: null
    };

    const activeDisplay = document.getElementById(`active-display-${index}`);
    const triggerBtn = document.getElementById(`timer-trigger-${index}`);
    if (activeDisplay) activeDisplay.classList.remove('hidden');
    if (triggerBtn) triggerBtn.classList.add('hidden');

    updateClockUI(index);

    taskTimers[index].intervalId = setInterval(() => {
      if (taskTimers[index] && !taskTimers[index].isPaused) {
        taskTimers[index].remainingSeconds--;
        updateClockUI(index);

        if (taskTimers[index].remainingSeconds <= 0) {
          playBeepAlert();
          stopTaskTimer(index);
          alert(`⏱ Focus session complete for: "${currentResponseData.top3[index].task}"! Time for a short break.`);
        }
      }
    }, 1000);
  }

  function togglePauseTimer(index) {
    const timer = taskTimers[index];
    if (!timer) return;

    timer.isPaused = !timer.isPaused;
    const playPauseBtn = document.getElementById(`play-pause-${index}`);
    if (timer.isPaused) {
      playPauseBtn.textContent = '▶';
      playPauseBtn.title = 'Resume Session';
    } else {
      playPauseBtn.textContent = '⏸';
      playPauseBtn.title = 'Pause Session';
    }
  }

  function stopTaskTimer(index) {
    const timer = taskTimers[index];
    if (!timer) return;

    clearInterval(timer.intervalId);
    delete taskTimers[index];

    const activeDisplay = document.getElementById(`active-display-${index}`);
    const triggerBtn = document.getElementById(`timer-trigger-${index}`);
    if (activeDisplay) activeDisplay.classList.add('hidden');
    if (triggerBtn) triggerBtn.classList.remove('hidden');
  }

  function skipTask(index) {
    stopTaskTimer(index);
    
    const li = document.getElementById(`top3-item-${index}`);
    if (li) {
      const checkbox = li.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = true;
        li.classList.add('checked');
      }
    }

    // Trigger celebration update immediately
    updateCelebrationProgress();

    const nextIndex = parseInt(index, 10) + 1;
    const nextLi = document.getElementById(`top3-item-${nextIndex}`);
    if (nextLi) {
      const nextCheckbox = nextLi.querySelector('input[type="checkbox"]');
      if (nextCheckbox && !nextCheckbox.checked) {
        const nextPopup = nextLi.querySelector(`.timer-setup-popup`);
        if (nextPopup) {
          nextPopup.classList.remove('hidden');
          nextLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  function updateClockUI(index) {
    const timer = taskTimers[index];
    if (!timer) return;

    const clock = document.getElementById(`clock-${index}`);
    if (!clock) return;

    const mins = Math.floor(timer.remainingSeconds / 60);
    const secs = timer.remainingSeconds % 60;
    clock.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- Visual Progress Celebrations (Flower Growth & Car Racing Mode) ---

  function initializeFlowerSVG() {
    flowerDisplay.innerHTML = `
      <svg width="220" height="220" viewBox="0 0 200 200" style="overflow: visible;">
        <!-- Glowing sparkles background (only active on Stage 3) -->
        <g class="ambient-sparkles hidden" id="flower-sparkles">
          <circle cx="60" cy="50" r="2.5" class="ambient-sparkle-dot" style="animation-delay: 0.1s;" />
          <circle cx="140" cy="40" r="3" class="ambient-sparkle-dot" style="animation-delay: 0.6s;" />
          <circle cx="100" cy="15" r="2" class="ambient-sparkle-dot" style="animation-delay: 1.1s;" />
          <circle cx="50" cy="90" r="2.5" class="ambient-sparkle-dot" style="animation-delay: 0.3s;" />
          <circle cx="150" cy="80" r="3.5" class="ambient-sparkle-dot" style="animation-delay: 0.8s;" />
        </g>
        
        <!-- Stem -->
        <path id="flower-stem-path" class="flower-stem" d="M100,160 Q100,160 100,160" />
        
        <!-- Left Leaf -->
        <path id="flower-leaf-l" class="flower-leaf" d="M100,135 C80,130 75,145 100,150 Z" style="transform: scale(0); opacity: 0;" />
        <!-- Right Leaf -->
        <path id="flower-leaf-r" class="flower-leaf" d="M100,115 C120,110 125,125 100,130 Z" style="transform: scale(0); opacity: 0;" />
        
        <!-- Flower Head Group -->
        <g id="flower-head" style="transform: translate(0px, 0px); transform-origin: 100px 80px;">
          <!-- Bloomed Petals (Stage 3) -->
          <g id="flower-petals" style="transform: scale(0); transform-origin: 100px 80px;">
            <circle cx="100" cy="64" r="16" class="flower-petal" />
            <circle cx="116" cy="74" r="16" class="flower-petal" />
            <circle cx="110" cy="92" r="16" class="flower-petal" />
            <circle cx="90" cy="92" r="16" class="flower-petal" />
            <circle cx="84" cy="74" r="16" class="flower-petal" />
          </g>
          <!-- Center Pistil (Stage 3) -->
          <circle id="flower-pistil" cx="100" cy="80" r="10" class="flower-center" style="transform: scale(0); transform-origin: 100px 80px;" />
          <!-- Flower Bud (Stage 2) -->
          <path id="flower-bud" class="flower-bud" d="M100,68 C90,75 92,90 100,90 C108,90 110,75 100,68 Z" style="transform: scale(0); transform-origin: 100px 80px;" />
        </g>
        
        <!-- Potted Soil & Base Pot -->
        <ellipse cx="100" cy="160" rx="35" ry="8" class="flower-soil" />
        <polygon points="70,160 130,160 122,192 78,192" class="flower-pot" />
      </svg>
    `;
  }

  function initializeCarSVG() {
    carDisplay.innerHTML = `
      <svg width="280" height="220" viewBox="0 0 200 120" style="overflow: visible;">
        <!-- Race track outline -->
        <path id="race-track-path" class="race-track-road" d="M 25 90 C 25 30, 175 30, 175 90" />
        <path class="race-track-centerline" d="M 25 90 C 25 30, 175 30, 175 90" />
        
        <!-- Start line (Checkers) -->
        <g transform="translate(15, 80) rotate(15)">
          <rect x="0" y="0" width="20" height="6" class="race-checkers-bg" />
          <rect x="0" y="0" width="5" height="3" class="race-checkers-pattern" />
          <rect x="10" y="0" width="5" height="3" class="race-checkers-pattern" />
          <rect x="5" y="3" class="race-checkers-pattern" />
          <rect x="15" y="3" class="race-checkers-pattern" />
        </g>
        
        <!-- Finish line (Checkers) -->
        <g transform="translate(165, 80) rotate(-15)">
          <rect x="0" y="0" width="20" height="6" class="race-checkers-bg" />
          <rect x="0" y="0" width="5" height="3" class="race-checkers-pattern" />
          <rect x="10" y="0" width="5" height="3" class="race-checkers-pattern" />
          <rect x="5" y="3" class="race-checkers-pattern" />
          <rect x="15" y="3" class="race-checkers-pattern" />
        </g>
        
        <!-- Finish Ribbon Tape (Stage 0, 1, 2 = solid; Stage 3 = broken) -->
        <path id="race-tape" class="race-tape" d="M 162 76 L 188 84" />
        
        <!-- Glowing star near finish line (Stage 3) -->
        <path id="finish-star" class="finish-star" d="M 180 54 L 182.5 59.5 L 188.5 60 L 184 64 L 185.5 70 L 180 66.5 L 174.5 70 L 176 64 L 171.5 60 L 177.5 59.5 Z" />
        
        <!-- Car Node -->
        <g id="race-car-node" class="race-car" transform="translate(25, 86) rotate(-90)">
          <!-- Wrapper for Hop Animation relative to car coordinate pivot -->
          <g id="car-body-bounce">
            <!-- spoiler -->
            <rect x="-8" y="-7" width="2" height="4" fill="#a49db5" />
            <rect x="-9" y="-9" width="4" height="2" fill="var(--accent-pink)" />
            <!-- chassis -->
            <path d="M-8,3 C-8,-2 -6,-4 0,-4 C6,-4 8,-2 8,3 Z" fill="var(--accent-pink)" />
            <!-- cabin window -->
            <path d="M-4,-4 C-4,-8 -2,-9 0,-9 C2,-9 4,-8 4,-4 Z" fill="#ffd166" />
            <!-- wheels -->
            <circle cx="-5" cy="4" r="3" fill="#1b1735" stroke="#fff" stroke-width="0.8" />
            <circle cx="5" cy="4" r="3" fill="#1b1735" stroke="#fff" stroke-width="0.8" />
          </g>
        </g>
      </svg>
    `;
  }

  function updateCelebrationProgress() {
    if (surprisePanel.classList.contains('hidden')) return;

    // Check checkboxes inside the Top 3 list
    const checkboxes = top3List.querySelectorAll('input[type="checkbox"]');
    const checkedCount = top3List.querySelectorAll('input[type="checkbox"]:checked').length;
    const totalCount = checkboxes.length || 3;

    // Trigger celebration sparkles/confetti only when moving to 3/3 done
    if (checkedCount === totalCount && totalCount > 0) {
      if (!isCelebrationTriggered) {
        isCelebrationTriggered = true;
        triggerCelebrationEffects();
      }
    } else {
      isCelebrationTriggered = false;
    }

    if (selectedMode === 'flower') {
      updateFlowerGrowth(checkedCount, totalCount);
    } else {
      updateCarRacing(checkedCount, totalCount);
    }
  }

  function updateFlowerGrowth(checked, total) {
    const stem = document.getElementById('flower-stem-path');
    const leafL = document.getElementById('flower-leaf-l');
    const leafR = document.getElementById('flower-leaf-r');
    const head = document.getElementById('flower-head');
    const bud = document.getElementById('flower-bud');
    const petals = document.getElementById('flower-petals');
    const pistil = document.getElementById('flower-pistil');
    const sparkles = document.getElementById('flower-sparkles');
    const goalBanner = document.getElementById('race-goal-banner');

    if (!stem) return;

    // Clear animations/states
    head.classList.remove('bloom-sparkle');
    if (sparkles) sparkles.classList.add('hidden');
    if (goalBanner) {
      goalBanner.classList.remove('show');
      goalBanner.classList.add('hidden');
    }

    if (checked === 0) {
      // Seedling state
      stem.setAttribute('d', 'M100,160 Q100,160 100,160');
      leafL.style.transform = 'scale(0)';
      leafL.style.opacity = '0';
      leafR.style.transform = 'scale(0)';
      leafR.style.opacity = '0';
      bud.style.transform = 'scale(0)';
      petals.style.transform = 'scale(0)';
      pistil.style.transform = 'scale(0)';
    } 
    else if (checked === 1) {
      // Small sprout stage
      stem.setAttribute('d', 'M100,160 Q95,145 100,130');
      leafL.style.transform = 'scale(1) translate(0px, 0px)';
      leafL.style.opacity = '1';
      leafR.style.transform = 'scale(0)';
      leafR.style.opacity = '0';
      bud.style.transform = 'scale(0)';
      petals.style.transform = 'scale(0)';
      pistil.style.transform = 'scale(0)';
    } 
    else if (checked === 2) {
      // Medium plant with Bud
      stem.setAttribute('d', 'M100,160 Q95,120 100,80');
      leafL.style.transform = 'scale(1) translate(0px, 0px)';
      leafL.style.opacity = '1';
      leafR.style.transform = 'scale(1) translate(0px, 0px)';
      leafR.style.opacity = '1';
      bud.style.transform = 'scale(1)';
      petals.style.transform = 'scale(0)';
      pistil.style.transform = 'scale(0)';
    } 
    else if (checked >= 3) {
      // Fully Bloomed celebration
      stem.setAttribute('d', 'M100,160 Q95,120 100,80');
      leafL.style.transform = 'scale(1) translate(0px, 0px)';
      leafL.style.opacity = '1';
      leafR.style.transform = 'scale(1) translate(0px, 0px)';
      leafR.style.opacity = '1';
      bud.style.transform = 'scale(0)';
      petals.style.transform = 'scale(1)';
      pistil.style.transform = 'scale(1)';
      
      head.classList.add('bloom-sparkle');
      if (sparkles) sparkles.classList.remove('hidden');
    }
  }

  function updateCarRacing(checked, total) {
    const track = document.getElementById('race-track-path');
    const car = document.getElementById('race-car-node');
    const tape = document.getElementById('race-tape');
    const star = document.getElementById('finish-star');
    const carBody = document.getElementById('car-body-bounce');
    const goalBanner = document.getElementById('race-goal-banner');

    if (!track || !car) return;

    const totalLength = track.getTotalLength();
    
    // Determine progress fraction
    let progress = 0;
    if (checked === 1) progress = 0.33;
    else if (checked === 2) progress = 0.66;
    else if (checked >= 3) progress = 1.0;

    const currentLength = progress * totalLength;
    const p1 = track.getPointAtLength(Math.max(0, currentLength - 2));
    const p2 = track.getPointAtLength(Math.min(totalLength, currentLength + 2));
    
    // Rotate car based on slope tangent
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

    // Position car offset slightly above centerline (y - 4)
    car.setAttribute('transform', `translate(${p1.x}, ${p1.y - 4}) rotate(${angle})`);

    // Handle Goal Celebration states
    if (checked >= 3) {
      if (tape) tape.classList.add('tape-broken');
      if (star) star.classList.add('finish-star-show');
      if (carBody) carBody.classList.add('car-bounce-active');
      if (goalBanner) {
        goalBanner.classList.remove('hidden');
        setTimeout(() => goalBanner.classList.add('show'), 40);
      }
    } else {
      if (tape) tape.classList.remove('tape-broken');
      if (star) star.classList.remove('finish-star-show');
      if (carBody) carBody.classList.remove('car-bounce-active');
      if (goalBanner) {
        goalBanner.classList.remove('show');
        goalBanner.classList.add('hidden');
      }
    }
  }

  function triggerCelebrationEffects() {
    playBeepAlert();
    triggerConfettiBurst(surprisePanel.querySelector('.celebration-arena'));
  }

  function triggerConfettiBurst(parentEl) {
    // Specifically pick pink/red/cyan colors: hot-pink, coral-red, cyan
    const colors = ['#f72585', '#ff7043', '#06d6a0'];
    
    // Generate 12 elegant confetti pieces falling gracefully
    for (let i = 0; i < 12; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Spawn near the finish line coordinates (translated to screen %)
      if (selectedMode === 'car') {
        confetti.style.left = `calc(75% + ${Math.random() * 40 - 20}px)`;
        confetti.style.top = `60%`;
      } else {
        // Spawn near bloomed flower head (center)
        confetti.style.left = `calc(50% + ${Math.random() * 40 - 20}px)`;
        confetti.style.top = `40%`;
      }
      
      // Drift settings
      const drift = Math.random() * 60 - 30;
      confetti.style.setProperty('--drift', `${drift}px`);
      confetti.style.animationDelay = `${Math.random() * 0.3}s`;
      
      parentEl.appendChild(confetti);
      setTimeout(() => confetti.remove(), 2500);
    }
  }

  // Copy Report Clipboard Helper
  copyReportBtn.addEventListener('click', () => {
    if (!currentResponseData) return;

    let markdown = `## 🎯 TaskDefog Daily Priorities\n\n`;
    if (currentResponseData.realityCheck) {
      markdown += `⚠️ **Reality Check**: ${currentResponseData.realityCheck}\n\n`;
    }
    
    markdown += `### Top 3 Today:\n`;
    currentResponseData.top3.forEach(item => {
      markdown += `- [ ] **${item.task}** (${item.timeEstimate || 'No limit'}): ${item.details || ''}\n`;
    });

    markdown += `\n### ⚡ Quick Wins (<10min):\n`;
    if (currentResponseData.quickWins.length > 0) {
      currentResponseData.quickWins.forEach(item => {
        markdown += `- **${item.task}** (${item.timeEstimate || '10m'})\n`;
      });
    } else {
      markdown += `*None*\n`;
    }

    markdown += `\n### 📅 This Week:\n`;
    if (currentResponseData.thisWeek.length > 0) {
      currentResponseData.thisWeek.forEach(item => {
        markdown += `- **${item.task}**: ${item.details || 'No notes'}\n`;
      });
    } else {
      markdown += `*None*\n`;
    }

    markdown += `\n### 📥 Can Wait:\n`;
    if (currentResponseData.canWait.length > 0) {
      currentResponseData.canWait.forEach(item => {
        markdown += `- **${item.task}**: ${item.details || 'No notes'}\n`;
      });
    } else {
      markdown += `*None*\n`;
    }

    markdown += `\n### 📝 Daily Summary:\n${currentResponseData.summary}\n`;

    navigator.clipboard.writeText(markdown).then(() => {
      copyReportBtn.textContent = 'Copied!';
      copyReportBtn.classList.add('copied');
      setTimeout(() => {
        copyReportBtn.innerHTML = '<span class="copy-icon">📋</span> Copy';
        copyReportBtn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  });

  // Simple HTML Escaper
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
