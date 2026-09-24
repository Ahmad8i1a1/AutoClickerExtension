// popup.js - Controller for Auto Clicker & Swipe Automation Popup

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const globalStatusPill = document.getElementById('globalStatusPill');
  const masterToggleBtn = document.getElementById('masterToggleBtn');
  const masterBtnText = document.getElementById('masterBtnText');
  const toggleMarkersBtn = document.getElementById('toggleMarkersBtn');
  const footerTabStatus = document.getElementById('footerTabStatus');

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Sequence Tab Elements
  const stepsList = document.getElementById('stepsList');
  const emptyStepsState = document.getElementById('emptyStepsState');
  const addStepBtn = document.getElementById('addStepBtn');
  const emptyAddStepBtn = document.getElementById('emptyAddStepBtn');
  const stepCountBadge = document.getElementById('stepCountBadge');
  const seqLoopCount = document.getElementById('seqLoopCount');
  const seqLoopDelay = document.getElementById('seqLoopDelay');
  const seqRefreshAfterCycle = document.getElementById('seqRefreshAfterCycle');

  // Quick Clicker Elements
  const quickCoordPill = document.getElementById('quickCoordPill');
  const quickPickBtn = document.getElementById('quickPickBtn');
  const quickInterval = document.getElementById('quickInterval');
  const quickRepeatCount = document.getElementById('quickRepeatCount');
  const quickToggleBtn = document.getElementById('quickToggleBtn');
  const quickBtnText = document.getElementById('quickBtnText');

  // Auto Refresh Elements
  const refreshEnabled = document.getElementById('refreshEnabled');
  const refreshIntervalSeconds = document.getElementById('refreshIntervalSeconds');
  const refreshBypassCache = document.getElementById('refreshBypassCache');
  const refreshAutoStartSequence = document.getElementById('refreshAutoStartSequence');
  const manualRefreshBtn = document.getElementById('manualRefreshBtn');
  const presetPills = document.querySelectorAll('.preset-pill');

  // Settings Elements
  const settingPlaySound = document.getElementById('settingPlaySound');
  const settingShowRipple = document.getElementById('settingShowRipple');
  const settingShowMarkers = document.getElementById('settingShowMarkers');
  const settingScrollOnSwipe = document.getElementById('settingScrollOnSwipe');
  const exportPresetBtn = document.getElementById('exportPresetBtn');
  const importPresetBtn = document.getElementById('importPresetBtn');
  const importFileInput = document.getElementById('importFileInput');
  const clearAllStepsBtn = document.getElementById('clearAllStepsBtn');

  // State
  let activeTabId = null;
  let isAutomationRunning = false;
  let runningMode = 'none';

  let config = {
    steps: [],
    loopCount: 0,
    loopDelay: 1000,
    refreshAfterCycle: false,
    resumeAfterReload: false,
    resumeDelay: 1500,
    showMarkers: true,
    playSound: true,
    showRipple: true,
    scrollOnSwipe: true
  };

  let quickClickerConfig = {
    enabled: false,
    x: 0,
    y: 0,
    interval: 1000,
    repeatCount: 0
  };

  let autoRefreshConfig = {
    enabled: false,
    intervalSeconds: 30,
    bypassCache: false,
    autoStartSequence: false
  };

  // 1. Initialize Active Tab
  await initActiveTab();

  // 2. Load Stored Data & Query Content Script Status
  await loadState();

  // 3. Setup Event Listeners
  setupEventListeners();

  // ==========================================================================
  // INITIALIZATION & TAB COMMUNICATION
  // ==========================================================================
  async function initActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        activeTabId = tab.id;
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
          footerTabStatus.textContent = 'Restricted Page (Open standard website)';
          footerTabStatus.style.color = '#ef4444';
          masterToggleBtn.disabled = true;
          return;
        }
        footerTabStatus.textContent = tab.title ? tab.title.substring(0, 24) + '...' : 'Ready';
        footerTabStatus.style.color = '';
      }
    } catch (e) {
      console.warn('Error querying active tab:', e);
    }
  }

  async function sendTabMessage(msg) {
    if (!activeTabId) return null;
    try {
      return await chrome.tabs.sendMessage(activeTabId, msg);
    } catch (err) {
      // Content script may not be injected yet (e.g. if extension just installed or reloaded)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          files: ['content/content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: activeTabId },
          files: ['content/content.css']
        });
        return await chrome.tabs.sendMessage(activeTabId, msg);
      } catch (injectionErr) {
        console.warn('Failed to communicate with tab:', injectionErr);
        return null;
      }
    }
  }

  async function loadState() {
    // Read from storage first
    try {
      const data = await chrome.storage.local.get([
        'sequenceConfig',
        'quickClickerConfig',
        'autoRefreshConfig',
        'uiSettings'
      ]);

      if (data.sequenceConfig) config = { ...config, ...data.sequenceConfig };
      if (data.quickClickerConfig) quickClickerConfig = { ...quickClickerConfig, ...data.quickClickerConfig };
      if (data.autoRefreshConfig) autoRefreshConfig = { ...autoRefreshConfig, ...data.autoRefreshConfig };
      if (data.uiSettings) {
        config.showMarkers = data.uiSettings.showMarkers ?? config.showMarkers;
        config.playSound = data.uiSettings.playSound ?? config.playSound;
        config.showRipple = data.uiSettings.showRipple ?? config.showRipple;
      }
    } catch (e) {
      console.warn('Error loading storage:', e);
    }

    // Ping content script to check if it's currently running
    const status = await sendTabMessage({ action: 'GET_STATUS' });
    if (status) {
      isAutomationRunning = !!status.isRunning;
      runningMode = status.mode || 'none';
      if (status.config) config = { ...config, ...status.config };
      if (status.quickClickerConfig) quickClickerConfig = { ...quickClickerConfig, ...status.quickClickerConfig };
      if (status.autoRefreshConfig) autoRefreshConfig = { ...autoRefreshConfig, ...status.autoRefreshConfig };
    }

    renderUI();
  }

  // ==========================================================================
  // RENDER UI
  // ==========================================================================
  function renderUI() {
    updateRunningStateUI();
    renderStepsList();

    // Sequence Controls Inputs
    seqLoopCount.value = config.loopCount ?? 0;
    seqLoopDelay.value = config.loopDelay ?? 1000;
    seqRefreshAfterCycle.checked = !!config.refreshAfterCycle;

    // Quick Clicker Inputs
    quickInterval.value = quickClickerConfig.interval ?? 1000;
    quickRepeatCount.value = quickClickerConfig.repeatCount ?? 0;
    updateQuickCoordDisplay();

    // Auto Refresh Inputs
    refreshEnabled.checked = !!autoRefreshConfig.enabled;
    refreshIntervalSeconds.value = autoRefreshConfig.intervalSeconds ?? 30;
    refreshBypassCache.checked = !!autoRefreshConfig.bypassCache;
    refreshAutoStartSequence.checked = !!autoRefreshConfig.autoStartSequence;

    // Settings Inputs
    settingPlaySound.checked = !!config.playSound;
    settingShowRipple.checked = !!config.showRipple;
    settingShowMarkers.checked = !!config.showMarkers;
    settingScrollOnSwipe.checked = !!config.scrollOnSwipe;

    toggleMarkersBtn.classList.toggle('active', !!config.showMarkers);
  }

  function updateRunningStateUI() {
    if (isAutomationRunning) {
      globalStatusPill.textContent = runningMode === 'quick' ? 'Quick Clicker' : 'Running';
      globalStatusPill.className = 'status-pill running';

      masterToggleBtn.className = 'primary-btn stop-btn';
      masterBtnText.textContent = 'Stop Automation';

      quickToggleBtn.className = 'primary-btn stop-btn';
      quickBtnText.textContent = 'Stop Quick Clicker';
    } else {
      globalStatusPill.textContent = 'Idle';
      globalStatusPill.className = 'status-pill idle';

      masterToggleBtn.className = 'primary-btn start-btn';
      masterBtnText.textContent = 'Start Sequence';

      quickToggleBtn.className = 'primary-btn start-btn';
      quickBtnText.textContent = 'Start Quick Clicker';
    }
  }

  function updateQuickCoordDisplay() {
    if (quickClickerConfig.x || quickClickerConfig.y) {
      quickCoordPill.textContent = `X: ${quickClickerConfig.x}, Y: ${quickClickerConfig.y}`;
      quickCoordPill.style.color = '#38bdf8';
    } else {
      quickCoordPill.textContent = 'X: --, Y: --';
      quickCoordPill.style.color = '';
    }
  }

  // ==========================================================================
  // RENDER STEP CARDS (UP TO 10 POINTS)
  // ==========================================================================
  function renderStepsList() {
    stepsList.innerHTML = '';
    const steps = config.steps || [];
    const count = steps.length;

    stepCountBadge.textContent = `${count} / 10`;
    addStepBtn.disabled = count >= 10;
    if (count >= 10) {
      stepCountBadge.textContent = '10 / 10 (Max)';
    }

    if (count === 0) {
      emptyStepsState.style.display = 'flex';
      stepsList.style.display = 'none';
      return;
    }

    emptyStepsState.style.display = 'none';
    stepsList.style.display = 'flex';

    steps.forEach((step, index) => {
      const stepCard = createStepCardElement(step, index);
      stepsList.appendChild(stepCard);
    });
  }

  function createStepCardElement(step, index) {
    const card = document.createElement('div');
    card.className = 'step-card';
    card.dataset.index = index;

    const stepNum = index + 1;
    const isClick = step.type === 'click';

    card.innerHTML = `
      <div class="step-header">
        <div class="step-header-left">
          <span class="step-num-pill">Step ${stepNum}</span>
          <div class="step-type-group">
            <button class="type-toggle-btn ${isClick ? 'active' : ''}" data-type="click">🖱️ Click</button>
            <button class="type-toggle-btn ${!isClick ? 'active' : ''}" data-type="swipe">👉 Swipe</button>
          </div>
        </div>
        <div class="step-header-right">
          <label class="switch" title="Enable / Disable Step">
            <input type="checkbox" class="step-enable-toggle" ${step.enabled !== false ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <button class="delete-step-btn" title="Delete Step">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="step-body">
        ${isClick ? `
          <!-- Click Mode Inputs -->
          <div class="coord-row">
            <div class="coord-box">
              <span class="coord-label">X:</span>
              <input type="number" class="coord-input input-x" value="${step.x || 0}">
            </div>
            <div class="coord-box">
              <span class="coord-label">Y:</span>
              <input type="number" class="coord-input input-y" value="${step.y || 0}">
            </div>
            <button class="pick-btn pick-step-btn" title="Pick point on screen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/>
                <line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>
              </svg>
              Pick Point
            </button>
            <button class="test-btn test-step-btn" title="Test Click now">
              ▶ Test
            </button>
          </div>

          <div class="step-options-row">
            <div class="option-group">
              <span class="option-label">Delay:</span>
              <input type="number" class="mini-input input-delay" min="0" step="100" value="${step.delay ?? 500}">
              <span class="hint-text">ms</span>
            </div>
            <div class="option-group">
              <span class="option-label">Action:</span>
              <select class="mini-select select-click-type">
                <option value="single" ${step.clickType === 'single' ? 'selected' : ''}>Single Click</option>
                <option value="double" ${step.clickType === 'double' ? 'selected' : ''}>Double Click</option>
                <option value="long" ${step.clickType === 'long' ? 'selected' : ''}>Long Press (500ms)</option>
              </select>
            </div>
          </div>
        ` : `
          <!-- Swipe Mode Inputs -->
          <div class="coord-row">
            <div class="coord-box" title="Start Point A">
              <span class="coord-label">A:</span>
              <input type="number" class="coord-input input-start-x" value="${step.startX || 0}" style="width:40px;">,
              <input type="number" class="coord-input input-start-y" value="${step.startY || 0}" style="width:40px;">
            </div>
            <div class="coord-box" title="End Point B">
              <span class="coord-label">B:</span>
              <input type="number" class="coord-input input-end-x" value="${step.endX || 0}" style="width:40px;">,
              <input type="number" class="coord-input input-end-y" value="${step.endY || 0}" style="width:40px;">
            </div>
            <button class="pick-btn pick-step-btn" title="Pick swipe vector (A to B)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              Pick A➔B
            </button>
            <button class="test-btn test-step-btn" title="Test Swipe now">
              ▶ Test
            </button>
          </div>

          <div class="step-options-row">
            <div class="option-group">
              <span class="option-label">Duration:</span>
              <input type="number" class="mini-input input-duration" min="50" step="50" value="${step.duration ?? 400}">
              <span class="hint-text">ms</span>
            </div>
            <div class="option-group">
              <span class="option-label">Delay:</span>
              <input type="number" class="mini-input input-delay" min="0" step="100" value="${step.delay ?? 500}">
              <span class="hint-text">ms</span>
            </div>
          </div>
        `}
      </div>
    `;

    // Event Bindings for this Step Card
    const typeButtons = card.querySelectorAll('.type-toggle-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const newType = btn.dataset.type;
        if (newType !== step.type) {
          step.type = newType;
          if (newType === 'swipe' && !step.endX) {
            step.startX = step.x || 100;
            step.startY = step.y || 200;
            step.endX = (step.x || 100) + 150;
            step.endY = step.y || 200;
            step.duration = 400;
          }
          await saveAndSync();
          renderStepsList();
        }
      });
    });

    const enableToggle = card.querySelector('.step-enable-toggle');
    enableToggle.addEventListener('change', async () => {
      step.enabled = enableToggle.checked;
      await saveAndSync();
    });

    const deleteBtn = card.querySelector('.delete-step-btn');
    deleteBtn.addEventListener('click', async () => {
      config.steps.splice(index, 1);
      await saveAndSync();
      renderStepsList();
    });

    const pickBtn = card.querySelector('.pick-step-btn');
    pickBtn.addEventListener('click', async () => {
      await startPickingForStep(step.type, index);
    });

    const testBtn = card.querySelector('.test-step-btn');
    testBtn.addEventListener('click', async () => {
      await sendTabMessage({ action: 'TEST_ACTION', step });
    });

    // Inputs binding
    if (isClick) {
      const inputX = card.querySelector('.input-x');
      const inputY = card.querySelector('.input-y');
      const inputDelay = card.querySelector('.input-delay');
      const selectClickType = card.querySelector('.select-click-type');

      inputX.addEventListener('input', async () => {
        step.x = parseInt(inputX.value, 10) || 0;
        await saveAndSync();
      });
      inputY.addEventListener('input', async () => {
        step.y = parseInt(inputY.value, 10) || 0;
        await saveAndSync();
      });
      inputDelay.addEventListener('input', async () => {
        step.delay = parseInt(inputDelay.value, 10) || 0;
        await saveAndSync();
      });
      selectClickType.addEventListener('change', async () => {
        step.clickType = selectClickType.value;
        await saveAndSync();
      });
    } else {
      const inputStartX = card.querySelector('.input-start-x');
      const inputStartY = card.querySelector('.input-start-y');
      const inputEndX = card.querySelector('.input-end-x');
      const inputEndY = card.querySelector('.input-end-y');
      const inputDuration = card.querySelector('.input-duration');
      const inputDelay = card.querySelector('.input-delay');

      inputStartX.addEventListener('input', async () => {
        step.startX = parseInt(inputStartX.value, 10) || 0;
        await saveAndSync();
      });
      inputStartY.addEventListener('input', async () => {
        step.startY = parseInt(inputStartY.value, 10) || 0;
        await saveAndSync();
      });
      inputEndX.addEventListener('input', async () => {
        step.endX = parseInt(inputEndX.value, 10) || 0;
        await saveAndSync();
      });
      inputEndY.addEventListener('input', async () => {
        step.endY = parseInt(inputEndY.value, 10) || 0;
        await saveAndSync();
      });
      inputDuration.addEventListener('input', async () => {
        step.duration = parseInt(inputDuration.value, 10) || 400;
        await saveAndSync();
      });
      inputDelay.addEventListener('input', async () => {
        step.delay = parseInt(inputDelay.value, 10) || 0;
        await saveAndSync();
      });
    }

    return card;
  }

  // ==========================================================================
  // EVENT LISTENERS & ACTION HANDLERS
  // ==========================================================================
  function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Master Start/Stop Sequence Button
    masterToggleBtn.addEventListener('click', async () => {
      if (isAutomationRunning) {
        await sendTabMessage({ action: 'STOP_AUTOMATION' });
        isAutomationRunning = false;
        runningMode = 'none';
      } else {
        await saveAndSync();
        await sendTabMessage({ action: 'START_SEQUENCE', config });
        isAutomationRunning = true;
        runningMode = 'sequence';
      }
      updateRunningStateUI();
    });

    // Add Step Buttons
    const handleAddStep = async () => {
      if ((config.steps || []).length >= 10) return;
      config.steps = config.steps || [];
      const newIndex = config.steps.length;

      // Default step: click near center of typical screen or offset
      config.steps.push({
        id: 'step_' + Date.now(),
        type: 'click',
        enabled: true,
        x: 200 + (newIndex * 30),
        y: 200 + (newIndex * 30),
        delay: 500,
        clickType: 'single'
      });

      await saveAndSync();
      renderStepsList();
    };

    addStepBtn.addEventListener('click', handleAddStep);
    emptyAddStepBtn.addEventListener('click', handleAddStep);

    // Sequence options
    seqLoopCount.addEventListener('input', async () => {
      config.loopCount = parseInt(seqLoopCount.value, 10) || 0;
      await saveAndSync();
    });
    seqLoopDelay.addEventListener('input', async () => {
      config.loopDelay = parseInt(seqLoopDelay.value, 10) || 1000;
      await saveAndSync();
    });
    seqRefreshAfterCycle.addEventListener('change', async () => {
      config.refreshAfterCycle = seqRefreshAfterCycle.checked;
      await saveAndSync();
    });

    // Quick Clicker Controls
    quickPickBtn.addEventListener('click', async () => {
      await startPickingForStep('click', -1);
    });

    quickInterval.addEventListener('input', async () => {
      quickClickerConfig.interval = parseInt(quickInterval.value, 10) || 1000;
      await saveAndSync();
    });

    quickRepeatCount.addEventListener('input', async () => {
      quickClickerConfig.repeatCount = parseInt(quickRepeatCount.value, 10) || 0;
      await saveAndSync();
    });

    quickToggleBtn.addEventListener('click', async () => {
      if (isAutomationRunning && runningMode === 'quick') {
        await sendTabMessage({ action: 'STOP_AUTOMATION' });
        isAutomationRunning = false;
        runningMode = 'none';
      } else {
        await saveAndSync();
        await sendTabMessage({ action: 'START_QUICK_CLICKER', quickConfig: quickClickerConfig });
        isAutomationRunning = true;
        runningMode = 'quick';
      }
      updateRunningStateUI();
    });

    // Auto Refresh Controls (Requirement 4)
    refreshEnabled.addEventListener('change', async () => {
      autoRefreshConfig.enabled = refreshEnabled.checked;
      await saveAndSync();
    });

    refreshIntervalSeconds.addEventListener('input', async () => {
      autoRefreshConfig.intervalSeconds = parseInt(refreshIntervalSeconds.value, 10) || 30;
      await saveAndSync();
    });

    presetPills.forEach(pill => {
      pill.addEventListener('click', async () => {
        const interval = parseInt(pill.dataset.interval, 10);
        refreshIntervalSeconds.value = interval;
        autoRefreshConfig.intervalSeconds = interval;
        await saveAndSync();
      });
    });

    refreshBypassCache.addEventListener('change', async () => {
      autoRefreshConfig.bypassCache = refreshBypassCache.checked;
      await saveAndSync();
    });

    refreshAutoStartSequence.addEventListener('change', async () => {
      autoRefreshConfig.autoStartSequence = refreshAutoStartSequence.checked;
      await saveAndSync();
    });

    manualRefreshBtn.addEventListener('click', async () => {
      await sendTabMessage({
        action: 'MANUAL_REFRESH_PAGE',
        bypassCache: autoRefreshConfig.bypassCache
      });
      window.close();
    });

    // Settings
    settingPlaySound.addEventListener('change', async () => {
      config.playSound = settingPlaySound.checked;
      await saveAndSync();
    });

    settingShowRipple.addEventListener('change', async () => {
      config.showRipple = settingShowRipple.checked;
      await saveAndSync();
    });

    settingShowMarkers.addEventListener('change', async () => {
      config.showMarkers = settingShowMarkers.checked;
      toggleMarkersBtn.classList.toggle('active', config.showMarkers);
      await sendTabMessage({ action: 'TOGGLE_MARKERS', showMarkers: config.showMarkers });
      await saveAndSync();
    });

    settingScrollOnSwipe.addEventListener('change', async () => {
      config.scrollOnSwipe = settingScrollOnSwipe.checked;
      await saveAndSync();
    });

    toggleMarkersBtn.addEventListener('click', async () => {
      config.showMarkers = !config.showMarkers;
      settingShowMarkers.checked = config.showMarkers;
      toggleMarkersBtn.classList.toggle('active', config.showMarkers);
      await sendTabMessage({ action: 'TOGGLE_MARKERS', showMarkers: config.showMarkers });
      await saveAndSync();
    });

    // Export Preset
    exportPresetBtn.addEventListener('click', () => {
      const presetData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        config,
        quickClickerConfig,
        autoRefreshConfig
      };
      const blob = new Blob([JSON.stringify(presetData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autoclicker-preset-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import Preset
    importPresetBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (imported.config) config = imported.config;
        if (imported.quickClickerConfig) quickClickerConfig = imported.quickClickerConfig;
        if (imported.autoRefreshConfig) autoRefreshConfig = imported.autoRefreshConfig;
        await saveAndSync();
        renderUI();
        alert('Preset imported successfully!');
      } catch (err) {
        alert('Failed to import preset JSON: ' + err.message);
      }
      importFileInput.value = '';
    });

    // Clear All Steps
    clearAllStepsBtn.addEventListener('click', async () => {
      if (confirm('Clear all configured action steps?')) {
        config.steps = [];
        await saveAndSync();
        renderStepsList();
      }
    });

    // Listen to messages from content script (e.g. picker finished, automation stopped)
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'PICKER_COMPLETED') {
        loadState();
      } else if (message.action === 'AUTOMATION_STOPPED') {
        isAutomationRunning = false;
        runningMode = 'none';
        updateRunningStateUI();
      }
    });
  }

  // ==========================================================================
  // PICKER INITIATION
  // ==========================================================================
  async function startPickingForStep(mode, stepIndex) {
    await sendTabMessage({
      action: 'START_PICKER',
      mode,
      stepIndex
    });
    // Close popup so user has unobstructed view to click/drag on page
    window.close();
  }

  // ==========================================================================
  // SAVE & SYNC
  // ==========================================================================
  async function saveAndSync() {
    try {
      await chrome.storage.local.set({
        sequenceConfig: {
          steps: config.steps,
          loopCount: config.loopCount,
          loopDelay: config.loopDelay,
          refreshAfterCycle: config.refreshAfterCycle,
          resumeAfterReload: config.resumeAfterReload,
          resumeDelay: config.resumeDelay,
          scrollOnSwipe: config.scrollOnSwipe
        },
        quickClickerConfig,
        autoRefreshConfig,
        uiSettings: {
          showMarkers: config.showMarkers,
          playSound: config.playSound,
          showRipple: config.showRipple
        }
      });

      // Notify content script
      await sendTabMessage({
        action: 'UPDATE_CONFIG',
        config,
        quickClickerConfig,
        autoRefreshConfig
      });
    } catch (e) {
      console.warn('Error saving settings:', e);
    }
  }
});
