// content.js - Automation Execution & Visual Picker Engine
(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__acExtensionLoaded) return;
  window.__acExtensionLoaded = true;

  // Root state
  let config = {
    steps: [],
    loopCount: 0, // 0 = infinite
    loopDelay: 1000,
    refreshAfterCycle: false,
    resumeAfterReload: false,
    resumeDelay: 1500,
    showMarkers: true,
    playSound: true,
    showRipple: true,
    scrollOnSwipe: true,
    humanizeTiming: true
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

  let executionState = {
    isRunning: false,
    mode: 'none', // 'sequence' | 'quick'
    currentStepIndex: -1,
    currentLoop: 0,
    abortController: null,
    quickTimerId: null,
    autoRefreshTimerId: null,
    nextRefreshTime: null
  };

  let overlayRoot = null;
  let markersContainer = null;
  let activePicker = null;
  let audioContext = null;

  // Initialize
  init();

  async function init() {
    createOverlayRoot();
    await loadSettings();
    renderMarkers();
    checkAutoResume();
    setupAutoRefresh();
  }

  // Create isolated container for all injected DOM
  function createOverlayRoot() {
    if (document.getElementById('ac-overlay-root')) {
      overlayRoot = document.getElementById('ac-overlay-root');
      markersContainer = overlayRoot.querySelector('.ac-markers-container');
      return;
    }

    overlayRoot = document.createElement('div');
    overlayRoot.id = 'ac-overlay-root';

    markersContainer = document.createElement('div');
    markersContainer.className = 'ac-markers-container';
    overlayRoot.appendChild(markersContainer);

    document.documentElement.appendChild(overlayRoot);
  }

  // Load persisted configuration from chrome.storage.local
  async function loadSettings() {
    try {
      const data = await chrome.storage.local.get([
        'sequenceConfig',
        'quickClickerConfig',
        'autoRefreshConfig',
        'uiSettings'
      ]);

      if (data.sequenceConfig) {
        config = { ...config, ...data.sequenceConfig };
      }
      if (data.quickClickerConfig) {
        quickClickerConfig = { ...quickClickerConfig, ...data.quickClickerConfig };
      }
      if (data.autoRefreshConfig) {
        autoRefreshConfig = { ...autoRefreshConfig, ...data.autoRefreshConfig };
      }
      if (data.uiSettings) {
        config.showMarkers = data.uiSettings.showMarkers ?? config.showMarkers;
        config.playSound = data.uiSettings.playSound ?? config.playSound;
        config.showRipple = data.uiSettings.showRipple ?? config.showRipple;
        config.humanizeTiming = data.uiSettings.humanizeTiming ?? config.humanizeTiming;
      }
    } catch (err) {
      console.warn('AutoClicker: Error loading settings:', err);
    }
  }

  async function saveSettings() {
    try {
      await chrome.storage.local.set({
        sequenceConfig: {
          steps: config.steps,
          loopCount: config.loopCount,
          loopDelay: config.loopDelay,
          refreshAfterCycle: config.refreshAfterCycle,
          resumeAfterReload: config.resumeAfterReload,
          resumeDelay: config.resumeDelay,
          scrollOnSwipe: config.scrollOnSwipe,
          humanizeTiming: config.humanizeTiming
        },
        quickClickerConfig,
        autoRefreshConfig,
        uiSettings: {
          showMarkers: config.showMarkers,
          playSound: config.playSound,
          showRipple: config.showRipple,
          humanizeTiming: config.humanizeTiming
        }
      });
    } catch (err) {
      console.warn('AutoClicker: Error saving settings:', err);
    }
  }

  // ==========================================================================
  // AUDIO & SOUND
  // ==========================================================================
  function playClickAudio() {
    if (!config.playSound) return;
    try {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioContext = new AudioCtx();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      if (audioContext) {
        // Synthesize a clean, crisp mechanical click sound
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.035);
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + 0.04);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // ==========================================================================
  // VISUAL EFFECTS (RIPPLE, TRAILS, TOAST)
  // ==========================================================================
  function showClickRipple(x, y) {
    if (!config.showRipple) return;
    const ripple = document.createElement('div');
    ripple.className = 'ac-click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    overlayRoot.appendChild(ripple);
    setTimeout(() => ripple.remove(), 450);
  }

  function showSwipeTrail(x1, y1, x2, y2, duration) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const trail = document.createElement('div');
    trail.className = 'ac-swipe-trail';
    trail.style.left = `${x1}px`;
    trail.style.top = `${y1}px`;
    trail.style.width = `${length}px`;
    trail.style.transform = `rotate(${angle}deg)`;
    trail.style.animationDuration = `${duration || 400}ms`;

    overlayRoot.appendChild(trail);
    setTimeout(() => trail.remove(), (duration || 400) + 100);
  }

  function showToast(message, icon = 'ℹ️') {
    const existing = overlayRoot.querySelector('.ac-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ac-toast';
    toast.innerHTML = `<span class="ac-toast-icon">${icon}</span><span>${message}</span>`;
    overlayRoot.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }

  // Helper to get true underlying webpage element without extension overlay interference
  function getUnderlyingElement(x, y) {
    const prevDisplay = overlayRoot ? overlayRoot.style.display : '';
    if (overlayRoot) overlayRoot.style.display = 'none';

    let el = document.elementFromPoint(x, y);

    if (overlayRoot) overlayRoot.style.display = prevDisplay;
    return el || document.body;
  }

  // ==========================================================================
  // DISPATCH REALISTIC DOM EVENTS (CLICK & SWIPE)
  // ==========================================================================
  async function triggerClick(x, y, clickType = 'single', signal) {
    if (signal?.aborted) return;

    // 1. Get true underlying element on the webpage (guaranteed not blocked by pins/overlay)
    const targetEl = getUnderlyingElement(x, y);

    // 2. Identify the closest interactive target (link, button, input, etc.)
    const clickable = targetEl.closest('a, button, [role="button"], input, select, textarea, label, [tabindex], [onclick]') || targetEl;

    // 3. Show visual ripple effect & audio
    showClickRipple(x, y);
    playClickAudio();

    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: (window.screenX || 0) + x,
      screenY: (window.screenY || 0) + y,
      button: 0,
      buttons: 1
    };

    const count = clickType === 'double' ? 2 : 1;
    const holdDuration = clickType === 'long' ? 500 : 35;

    for (let i = 0; i < count; i++) {
      if (signal?.aborted) return;

      // Pointer over & enter
      targetEl.dispatchEvent(new PointerEvent('pointerover', eventInit));
      targetEl.dispatchEvent(new MouseEvent('mouseover', eventInit));
      targetEl.dispatchEvent(new PointerEvent('pointerenter', eventInit));
      targetEl.dispatchEvent(new MouseEvent('mouseenter', eventInit));

      // Pointer & Mouse down
      targetEl.dispatchEvent(new PointerEvent('pointerdown', eventInit));
      targetEl.dispatchEvent(new MouseEvent('mousedown', eventInit));

      // Set focus to the element
      try {
        if (typeof clickable.focus === 'function') {
          clickable.focus();
        } else if (typeof targetEl.focus === 'function') {
          targetEl.focus();
        }
      } catch (e) {}

      // Wait hold duration
      await new Promise(r => setTimeout(r, holdDuration));
      if (signal?.aborted) return;

      // Pointer & Mouse up
      const upInit = { ...eventInit, buttons: 0 };
      targetEl.dispatchEvent(new PointerEvent('pointerup', upInit));
      targetEl.dispatchEvent(new MouseEvent('mouseup', upInit));

      // Click event on target
      targetEl.dispatchEvent(new MouseEvent('click', eventInit));

      // Also dispatch click on clickable if target is child
      if (clickable !== targetEl) {
        clickable.dispatchEvent(new MouseEvent('click', eventInit));
      }

      // Native .click() invocation (required by browsers for native button/link actions)
      try {
        if (typeof clickable.click === 'function') {
          clickable.click();
        } else if (typeof targetEl.click === 'function') {
          targetEl.click();
        }
      } catch (e) {
        console.warn('Native click trigger error:', e);
      }

      // Checkbox and radio toggle support
      if (clickable.tagName === 'INPUT' && (clickable.type === 'checkbox' || clickable.type === 'radio')) {
        clickable.dispatchEvent(new Event('input', { bubbles: true }));
        clickable.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Explicit link navigation fallback if browser blocked navigation from synthetic click
      if (clickable.tagName === 'A' && clickable.href && !clickable.href.startsWith('javascript:')) {
        const href = clickable.href;
        if (clickable.target === '_blank') {
          window.open(href, '_blank');
        } else if (!href.endsWith('#') && href !== window.location.href + '#') {
          // If after a small gap navigation hasn't begun, navigate explicitly
          setTimeout(() => {
            if (window.location.href !== href && !signal?.aborted) {
              window.location.assign(href);
            }
          }, 80);
        }
      }

      if (i === 1) {
        targetEl.dispatchEvent(new MouseEvent('dblclick', eventInit));
      }

      if (count > 1 && i === 0) {
        await new Promise(r => setTimeout(r, 90));
      }
    }
  }

  async function triggerSwipe(x1, y1, x2, y2, duration = 400, scrollPage = false, signal) {
    if (signal?.aborted) return;

    showSwipeTrail(x1, y1, x2, y2, duration);

    const startEl = document.elementFromPoint(x1, y1) || document.body;
    const totalSteps = Math.max(12, Math.floor(duration / 16));
    const stepDuration = duration / totalSteps;

    const dx = x2 - x1;
    const dy = y2 - y1;

    // Start event
    const startInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x1,
      clientY: y1,
      screenX: window.screenX + x1,
      screenY: window.screenY + y1,
      button: 0,
      buttons: 1
    };

    startEl.dispatchEvent(new PointerEvent('pointerdown', startInit));
    startEl.dispatchEvent(new MouseEvent('mousedown', startInit));

    // Touch event simulation if Touch constructor is supported
    try {
      if (window.TouchEvent && window.Touch) {
        const touch = new Touch({
          identifier: Date.now(),
          target: startEl,
          clientX: x1,
          clientY: y1,
          screenX: window.screenX + x1,
          screenY: window.screenY + y1,
          pageX: x1 + window.scrollX,
          pageY: y1 + window.scrollY
        });
        startEl.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
      }
    } catch (e) {}

    // Interpolation steps
    for (let step = 1; step <= totalSteps; step++) {
      if (signal?.aborted) break;

      const progress = step / totalSteps;
      const currentX = x1 + dx * progress;
      const currentY = y1 + dy * progress;

      const currentEl = document.elementFromPoint(currentX, currentY) || startEl;

      const moveInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: currentX,
        clientY: currentY,
        screenX: window.screenX + currentX,
        screenY: window.screenY + currentY,
        button: 0,
        buttons: 1
      };

      currentEl.dispatchEvent(new PointerEvent('pointermove', moveInit));
      currentEl.dispatchEvent(new MouseEvent('mousemove', moveInit));

      // If scroll is enabled, scroll the window along the gesture
      if (scrollPage) {
        const stepScrollX = -(dx / totalSteps);
        const stepScrollY = -(dy / totalSteps);
        window.scrollBy({ left: stepScrollX, top: stepScrollY, behavior: 'auto' });
      }

      await new Promise(r => setTimeout(r, stepDuration));
    }

    if (signal?.aborted) return;

    // End event
    const endEl = document.elementFromPoint(x2, y2) || startEl;
    const endInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x2,
      clientY: y2,
      screenX: window.screenX + x2,
      screenY: window.screenY + y2,
      button: 0,
      buttons: 0
    };

    endEl.dispatchEvent(new PointerEvent('pointerup', endInit));
    endEl.dispatchEvent(new MouseEvent('mouseup', endInit));

    try {
      if (window.TouchEvent && window.Touch) {
        const touch = new Touch({
          identifier: Date.now(),
          target: endEl,
          clientX: x2,
          clientY: y2,
          screenX: window.screenX + x2,
          screenY: window.screenY + y2,
          pageX: x2 + window.scrollX,
          pageY: y2 + window.scrollY
        });
        endEl.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch]
        }));
      }
    } catch (e) {}
  }

  // ==========================================================================
  // ON-SCREEN MARKERS & DRAGGABLE PINS
  // ==========================================================================
  function renderMarkers() {
    if (!markersContainer) return;
    markersContainer.innerHTML = '';

    if (!config.showMarkers) return;

    // SVG container for swipe arrows
    let svg = markersContainer.querySelector('.ac-swipe-svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'ac-swipe-svg');

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'ac-arrowhead');
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '7');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '3.5');
      marker.setAttribute('orient', 'auto');

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
      polygon.setAttribute('class', 'ac-swipe-arrowhead');

      marker.appendChild(polygon);
      defs.appendChild(marker);
      svg.appendChild(defs);
      markersContainer.appendChild(svg);
    }

    // Render markers for enabled steps
    config.steps.forEach((step, index) => {
      if (!step || step.enabled === false) return;

      const stepNum = index + 1;

      if (step.type === 'click') {
        const pin = createPin({
          text: String(stepNum),
          x: step.x,
          y: step.y,
          className: 'ac-pin-click',
          tooltip: `Step ${stepNum}: Click (${Math.round(step.x)}, ${Math.round(step.y)})`,
          onDragEnd: async (newX, newY) => {
            step.x = Math.round(newX);
            step.y = Math.round(newY);
            await saveSettings();
            renderMarkers();
            showToast(`Updated Step ${stepNum} to (${step.x}, ${step.y})`, '🎯');
          }
        });
        pin.dataset.stepIndex = index;
        markersContainer.appendChild(pin);
      } else if (step.type === 'swipe') {
        // Pin A
        const pinA = createPin({
          text: `A${stepNum}`,
          x: step.startX,
          y: step.startY,
          className: 'ac-pin-swipe-a',
          tooltip: `Step ${stepNum}: Swipe Start (${Math.round(step.startX)}, ${Math.round(step.startY)})`,
          onDragEnd: async (newX, newY) => {
            step.startX = Math.round(newX);
            step.startY = Math.round(newY);
            await saveSettings();
            renderMarkers();
            showToast(`Updated Step ${stepNum} Start to (${step.startX}, ${step.startY})`, '👉');
          }
        });
        pinA.dataset.stepIndex = index;
        markersContainer.appendChild(pinA);

        // Pin B
        const pinB = createPin({
          text: `B${stepNum}`,
          x: step.endX,
          y: step.endY,
          className: 'ac-pin-swipe-b',
          tooltip: `Step ${stepNum}: Swipe End (${Math.round(step.endX)}, ${Math.round(step.endY)})`,
          onDragEnd: async (newX, newY) => {
            step.endX = Math.round(newX);
            step.endY = Math.round(newY);
            await saveSettings();
            renderMarkers();
            showToast(`Updated Step ${stepNum} End to (${step.endX}, ${step.endY})`, '👉');
          }
        });
        pinB.dataset.stepIndex = index;
        markersContainer.appendChild(pinB);

        // SVG Arrow line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', step.startX);
        line.setAttribute('y1', step.startY);
        line.setAttribute('x2', step.endX);
        line.setAttribute('y2', step.endY);
        line.setAttribute('class', 'ac-swipe-line');
        line.setAttribute('marker-end', 'url(#ac-arrowhead)');
        svg.appendChild(line);
      }
    });
  }

  function createPin({ text, x, y, className, tooltip, onDragEnd }) {
    const pin = document.createElement('div');
    pin.className = `ac-pin ${className}`;
    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;
    pin.innerHTML = `<span>${text}</span><div class="ac-pin-tooltip">${tooltip}</div>`;

    // Make pin draggable
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let originalLeft = 0;
    let originalTop = 0;

    pin.addEventListener('mousedown', (e) => {
      if (executionState.isRunning) return;
      e.stopPropagation();
      e.preventDefault();

      isDragging = true;
      pin.classList.add('dragging');
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      originalLeft = parseFloat(pin.style.left) || 0;
      originalTop = parseFloat(pin.style.top) || 0;

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const currentX = Math.max(0, Math.min(window.innerWidth, originalLeft + (ev.clientX - dragStartX)));
        const currentY = Math.max(0, Math.min(window.innerHeight, originalTop + (ev.clientY - dragStartY)));
        pin.style.left = `${currentX}px`;
        pin.style.top = `${currentY}px`;
      };

      const onMouseUp = (ev) => {
        if (!isDragging) return;
        isDragging = false;
        pin.classList.remove('dragging');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const finalX = Math.max(0, Math.min(window.innerWidth, originalLeft + (ev.clientX - dragStartX)));
        const finalY = Math.max(0, Math.min(window.innerHeight, originalTop + (ev.clientY - dragStartY)));

        if (typeof onDragEnd === 'function') {
          onDragEnd(finalX, finalY);
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    return pin;
  }

  function highlightActivePin(stepIndex) {
    if (!markersContainer) return;
    const pins = markersContainer.querySelectorAll('.ac-pin');
    pins.forEach(pin => {
      if (pin.dataset.stepIndex === String(stepIndex)) {
        pin.classList.add('active-step');
      } else {
        pin.classList.remove('active-step');
      }
    });
  }

  // ==========================================================================
  // INTERACTIVE POINT & SWIPE PICKER
  // ==========================================================================
  function startPointPicker(mode = 'click', stepIndex = 0) {
    if (activePicker) cancelPicker();

    // Temporarily hide markers during picker
    if (markersContainer) markersContainer.style.display = 'none';

    const backdrop = document.createElement('div');
    backdrop.className = 'ac-picker-backdrop';

    const banner = document.createElement('div');
    banner.className = 'ac-picker-banner';

    const coordsTag = document.createElement('div');
    coordsTag.className = 'ac-cursor-coords';
    coordsTag.textContent = 'X: 0, Y: 0';

    let swipeState = {
      step: 1, // 1: Pick start (A), 2: Pick end (B)
      startX: 0,
      startY: 0
    };

    function updateBannerText() {
      if (mode === 'click') {
        banner.innerHTML = `
          <div class="ac-picker-banner-text">
            <span class="ac-picker-banner-badge">Step ${stepIndex + 1}</span>
            <span>🎯 Click anywhere on the page to set Click Location</span>
          </div>
          <button class="ac-picker-cancel-btn" id="ac-cancel-picker">Cancel [Esc]</button>
        `;
      } else {
        if (swipeState.step === 1) {
          banner.innerHTML = `
            <div class="ac-picker-banner-text">
              <span class="ac-picker-banner-badge">Step ${stepIndex + 1}</span>
              <span>👉 Click Start Point [A] (or click & drag to Point [B])</span>
            </div>
            <button class="ac-picker-cancel-btn" id="ac-cancel-picker">Cancel [Esc]</button>
          `;
        } else {
          banner.innerHTML = `
            <div class="ac-picker-banner-text">
              <span class="ac-picker-banner-badge">Step ${stepIndex + 1}</span>
              <span>👉 Now click End Point [B] to complete swipe vector</span>
            </div>
            <button class="ac-picker-cancel-btn" id="ac-cancel-picker">Cancel [Esc]</button>
          `;
        }
      }

      const cancelBtn = banner.querySelector('#ac-cancel-picker');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          cancelPicker();
        });
      }
    }

    updateBannerText();
    overlayRoot.appendChild(backdrop);
    overlayRoot.appendChild(banner);
    overlayRoot.appendChild(coordsTag);

    // Track mouse coordinates
    const onMouseMove = (e) => {
      coordsTag.textContent = `X: ${Math.round(e.clientX)}, Y: ${Math.round(e.clientY)}`;
      coordsTag.style.left = `${e.clientX}px`;
      coordsTag.style.top = `${e.clientY}px`;
    };

    // Drag detection for swipe
    let isMouseDown = false;
    let mouseDownX = 0;
    let mouseDownY = 0;

    const onMouseDown = (e) => {
      if (e.target.closest('.ac-picker-banner')) return;
      isMouseDown = true;
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
    };

    const onMouseUp = async (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;
      if (e.target.closest('.ac-picker-banner')) return;

      const clickX = Math.round(e.clientX);
      const clickY = Math.round(e.clientY);
      const dist = Math.hypot(clickX - mouseDownX, clickY - mouseDownY);

      if (mode === 'click') {
        await finishClickPicker(clickX, clickY, stepIndex);
      } else {
        // If dragged > 20px, automatically treat as swipe from mouseDown to mouseUp!
        if (dist > 20) {
          await finishSwipePicker(Math.round(mouseDownX), Math.round(mouseDownY), clickX, clickY, stepIndex);
        } else {
          // Point by point
          if (swipeState.step === 1) {
            swipeState.step = 2;
            swipeState.startX = clickX;
            swipeState.startY = clickY;
            showClickRipple(clickX, clickY);
            updateBannerText();
          } else {
            await finishSwipePicker(swipeState.startX, swipeState.startY, clickX, clickY, stepIndex);
          }
        }
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        cancelPicker();
      }
    };

    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('keydown', onKeyDown, true);

    activePicker = {
      cleanup: () => {
        window.removeEventListener('mousemove', onMouseMove, true);
        window.removeEventListener('mousedown', onMouseDown, true);
        window.removeEventListener('mouseup', onMouseUp, true);
        window.removeEventListener('keydown', onKeyDown, true);
        backdrop.remove();
        banner.remove();
        coordsTag.remove();
        if (markersContainer) markersContainer.style.display = '';
        activePicker = null;
      }
    };
  }

  async function finishClickPicker(x, y, stepIndex) {
    showClickRipple(x, y);
    playClickAudio();

    if (stepIndex === -1) {
      // Quick clicker mode
      quickClickerConfig.x = x;
      quickClickerConfig.y = y;
      await saveSettings();
      showToast(`Quick Clicker location set to (${x}, ${y})`, '🎯');
    } else {
      // Sequence step
      if (!config.steps[stepIndex]) {
        config.steps[stepIndex] = {
          id: 'step_' + Date.now(),
          type: 'click',
          enabled: true,
          x,
          y,
          delay: 500,
          clickType: 'single'
        };
      } else {
        config.steps[stepIndex].x = x;
        config.steps[stepIndex].y = y;
        config.steps[stepIndex].type = 'click';
      }
      await saveSettings();
      renderMarkers();
      showToast(`Step ${stepIndex + 1} Click point set to (${x}, ${y})`, '🎯');
    }

    cancelPicker();
    notifyPopup({ action: 'PICKER_COMPLETED', mode: 'click', stepIndex, x, y });
  }

  async function finishSwipePicker(startX, startY, endX, endY, stepIndex) {
    showSwipeTrail(startX, startY, endX, endY, 400);
    playClickAudio();

    if (!config.steps[stepIndex]) {
      config.steps[stepIndex] = {
        id: 'step_' + Date.now(),
        type: 'swipe',
        enabled: true,
        startX,
        startY,
        endX,
        endY,
        duration: 400,
        delay: 500,
        scrollPage: config.scrollOnSwipe
      };
    } else {
      config.steps[stepIndex].startX = startX;
      config.steps[stepIndex].startY = startY;
      config.steps[stepIndex].endX = endX;
      config.steps[stepIndex].endY = endY;
      config.steps[stepIndex].type = 'swipe';
    }

    await saveSettings();
    renderMarkers();
    showToast(`Step ${stepIndex + 1} Swipe set from (${startX}, ${startY}) to (${endX}, ${endY})`, '👉');

    cancelPicker();
    notifyPopup({ action: 'PICKER_COMPLETED', mode: 'swipe', stepIndex, startX, startY, endX, endY });
  }

  function cancelPicker() {
    if (activePicker) {
      activePicker.cleanup();
      showToast('Picking cancelled', '❌');
      notifyPopup({ action: 'PICKER_CANCELLED' });
    }
  }

  // ==========================================================================
  // FLOATING STATUS PILL
  // ==========================================================================
  function showFloatingStatus(text) {
    let pill = overlayRoot.querySelector('.ac-floating-status');
    if (!pill) {
      pill = document.createElement('div');
      pill.className = 'ac-floating-status';
      pill.innerHTML = `
        <span class="ac-status-dot"></span>
        <span class="ac-status-text">${text}</span>
        <button class="ac-status-stop-btn">Stop</button>
      `;
      pill.querySelector('.ac-status-stop-btn').addEventListener('click', () => {
        stopAutomation();
      });
      overlayRoot.appendChild(pill);
    } else {
      pill.querySelector('.ac-status-text').textContent = text;
    }
  }

  function removeFloatingStatus() {
    const pill = overlayRoot.querySelector('.ac-floating-status');
    if (pill) pill.remove();
  }

  // ==========================================================================
  // SEQUENCE EXECUTION ENGINE
  // ==========================================================================
  async function startSequence() {
    if (executionState.isRunning) {
      stopAutomation();
      return;
    }

    // Filter enabled steps
    const activeSteps = config.steps.filter(s => s && s.enabled !== false);
    if (activeSteps.length === 0) {
      showToast('No active steps configured! Add or enable steps first.', '⚠️');
      return;
    }

    executionState.isRunning = true;
    executionState.mode = 'sequence';
    executionState.abortController = new AbortController();
    executionState.currentLoop = 0;

    const signal = executionState.abortController.signal;

    if (overlayRoot) overlayRoot.classList.add('ac-running-mode');

    // Update persistent running state in storage
    await chrome.storage.local.set({
      globalExecutionStatus: {
        isRunning: true,
        mode: 'sequence',
        resuming: false,
        loop: executionState.currentLoop || 1,
        updatedAt: Date.now()
      }
    });

    // Update background badge and notify popup
    try {
      await chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', isRunning: true, text: 'RUN' });
      await chrome.runtime.sendMessage({ action: 'AUTOMATION_STATUS_CHANGED', isRunning: true, mode: 'sequence' });
    } catch (e) {}

    showToast('Automation sequence started (Alt+Shift+S to stop)', '▶️');

    // Run execution loop
    (async () => {
      try {
        while (!signal.aborted) {
          executionState.currentLoop++;
          const loopStr = config.loopCount > 0 ? `Loop ${executionState.currentLoop}/${config.loopCount}` : `Loop ${executionState.currentLoop}`;

          for (let i = 0; i < config.steps.length; i++) {
            if (signal.aborted) break;

            const step = config.steps[i];
            if (!step || step.enabled === false) continue;

            executionState.currentStepIndex = i;
            const stepNum = i + 1;

            showFloatingStatus(`${loopStr} • Step ${stepNum} (${step.type})`);
            highlightActivePin(i);

            // Wait for step delay (with humanized natural timing variance if enabled)
            let stepDelay = Math.max(0, step.delay || 500);
            if (config.humanizeTiming !== false && stepDelay > 200) {
              // Add ±15% natural random variance
              stepDelay = Math.round(stepDelay * (0.85 + Math.random() * 0.30));
            }

            if (stepDelay > 0) {
              await new Promise((resolve) => {
                const timer = setTimeout(resolve, stepDelay);
                signal.addEventListener('abort', () => clearTimeout(timer));
              });
            }

            if (signal.aborted) break;

            // Execute Step with micro-jitter for organic human movement
            if (step.type === 'click') {
              let clickX = step.x;
              let clickY = step.y;
              if (config.humanizeTiming !== false) {
                clickX += Math.round((Math.random() - 0.5) * 6);
                clickY += Math.round((Math.random() - 0.5) * 6);
              }
              await triggerClick(clickX, clickY, step.clickType, signal);
            } else if (step.type === 'swipe') {
              let sX = step.startX;
              let sY = step.startY;
              let eX = step.endX;
              let eY = step.endY;
              let dur = step.duration || 400;

              if (config.humanizeTiming !== false) {
                sX += Math.round((Math.random() - 0.5) * 6);
                sY += Math.round((Math.random() - 0.5) * 6);
                eX += Math.round((Math.random() - 0.5) * 6);
                eY += Math.round((Math.random() - 0.5) * 6);
                dur = Math.round(dur * (0.9 + Math.random() * 0.2));
              }

              await triggerSwipe(sX, sY, eX, eY, dur, step.scrollPage ?? config.scrollOnSwipe, signal);
            }
          }

          if (signal.aborted) break;

          // Check if loop limit reached
          if (config.loopCount > 0 && executionState.currentLoop >= config.loopCount) {
            showToast(`Sequence completed all ${config.loopCount} loops!`, '✅');
            break;
          }

          // Check if refresh after cycle is enabled
          if (config.refreshAfterCycle) {
            showToast('Cycle finished. Refreshing page...', '🔄');
            await prepareReloadAndResume();
            return;
          }

          // Wait cycle delay
          const cycleDelay = Math.max(0, config.loopDelay || 1000);
          showFloatingStatus(`${loopStr} completed. Waiting ${Math.round(cycleDelay / 1000)}s...`);
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, cycleDelay);
            signal.addEventListener('abort', () => clearTimeout(timer));
          });
        }
      } catch (err) {
        console.error('Sequence execution error:', err);
      } finally {
        stopAutomation();
      }
    })();
  }

  // ==========================================================================
  // QUICK CLICKER ENGINE (Continuous Single Point)
  // ==========================================================================
  function startQuickClicker() {
    if (executionState.isRunning) {
      stopAutomation();
      return;
    }

    if (!quickClickerConfig.x && !quickClickerConfig.y) {
      showToast('Please set Click Location first!', '⚠️');
      return;
    }

    executionState.isRunning = true;
    executionState.mode = 'quick';
    executionState.abortController = new AbortController();
    const signal = executionState.abortController.signal;

    try {
      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', isRunning: true, text: 'QC' });
    } catch (e) {}

    showToast('Quick clicker started', '⚡');
    let clickCount = 0;

    const interval = Math.max(50, quickClickerConfig.interval || 1000);

    const runClick = async () => {
      if (signal.aborted) return;
      clickCount++;
      showFloatingStatus(`Quick Clicker: ${clickCount} clicks`);
      await triggerClick(quickClickerConfig.x, quickClickerConfig.y, 'single', signal);

      if (quickClickerConfig.repeatCount > 0 && clickCount >= quickClickerConfig.repeatCount) {
        showToast(`Quick Clicker completed ${clickCount} clicks!`, '✅');
        stopAutomation();
        return;
      }

      if (!signal.aborted) {
        executionState.quickTimerId = setTimeout(runClick, interval);
      }
    };

    runClick();
  }

  // ==========================================================================
  // STOP AUTOMATION
  // ==========================================================================
  function stopAutomation() {
    if (executionState.abortController) {
      executionState.abortController.abort();
      executionState.abortController = null;
    }
    if (executionState.quickTimerId) {
      clearTimeout(executionState.quickTimerId);
      executionState.quickTimerId = null;
    }

    executionState.isRunning = false;
    executionState.mode = 'none';
    executionState.currentStepIndex = -1;

    if (overlayRoot) overlayRoot.classList.remove('ac-running-mode');

    highlightActivePin(-1);
    removeFloatingStatus();

    // Persist stopped state
    chrome.storage.local.set({
      globalExecutionStatus: {
        isRunning: false,
        mode: 'none',
        resuming: false,
        updatedAt: Date.now()
      },
      sequenceState: null
    }).catch(() => {});

    try {
      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', isRunning: false });
      chrome.runtime.sendMessage({ action: 'AUTOMATION_STATUS_CHANGED', isRunning: false, mode: 'none' });
    } catch (e) {}

    notifyPopup({ action: 'AUTOMATION_STOPPED' });
  }

  // ==========================================================================
  // AUTO REFRESH CURRENT WEBPAGE (Requirement 4)
  // ==========================================================================
  function setupAutoRefresh() {
    if (executionState.autoRefreshTimerId) {
      clearInterval(executionState.autoRefreshTimerId);
      executionState.autoRefreshTimerId = null;
    }

    if (!autoRefreshConfig.enabled || autoRefreshConfig.intervalSeconds <= 0) return;

    const intervalMs = autoRefreshConfig.intervalSeconds * 1000;
    executionState.nextRefreshTime = Date.now() + intervalMs;

    executionState.autoRefreshTimerId = setInterval(() => {
      if (autoRefreshConfig.enabled) {
        doPageRefresh();
      }
    }, intervalMs);
  }

  async function doPageRefresh() {
    if (autoRefreshConfig.autoStartSequence) {
      // Store flag to resume sequence after reload
      await chrome.storage.local.set({
        sequenceState: {
          autoResume: true,
          resumeDelay: config.resumeDelay || 2000
        },
        globalExecutionStatus: {
          isRunning: true,
          mode: 'sequence',
          resuming: true,
          updatedAt: Date.now()
        }
      });
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'RELOAD_TAB',
        bypassCache: !!autoRefreshConfig.bypassCache
      });
    } catch (e) {
      location.reload();
    }
  }

  async function prepareReloadAndResume() {
    try {
      await chrome.storage.local.set({
        sequenceState: {
          autoResume: true,
          loop: executionState.currentLoop,
          resumeDelay: config.resumeDelay || 1500
        },
        globalExecutionStatus: {
          isRunning: true,
          mode: 'sequence',
          resuming: true,
          loop: executionState.currentLoop,
          updatedAt: Date.now()
        }
      });
      try {
        await chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', isRunning: true, text: 'REL' });
        await chrome.runtime.sendMessage({ action: 'AUTOMATION_STATUS_CHANGED', isRunning: true, mode: 'sequence' });
      } catch (e) {}
      await chrome.runtime.sendMessage({ action: 'RELOAD_TAB' });
    } catch (e) {
      location.reload();
    }
  }

  async function checkAutoResume() {
    try {
      const data = await chrome.storage.local.get(['sequenceState', 'globalExecutionStatus']);
      if (data.sequenceState?.autoResume || data.globalExecutionStatus?.resuming) {
        // Keep status as running & resuming in storage so popup knows immediately
        await chrome.storage.local.set({
          globalExecutionStatus: {
            isRunning: true,
            mode: 'sequence',
            resuming: true,
            loop: data.sequenceState?.loop || 1,
            updatedAt: Date.now()
          }
        });
        await chrome.storage.local.remove(['sequenceState']);

        showToast('Page refreshed. Resuming automation...', '🔄');
        const delay = data.sequenceState?.resumeDelay || config.resumeDelay || 1500;

        setTimeout(async () => {
          await startSequence();
        }, delay);
      }
    } catch (e) {}
  }

  // ==========================================================================
  // TEST SINGLE ACTION
  // ==========================================================================
  async function testAction(step) {
    if (!step) return;
    showToast(`Testing ${step.type}...`, '🧪');
    if (step.type === 'click') {
      await triggerClick(step.x, step.y, step.clickType || 'single', null);
    } else if (step.type === 'swipe') {
      await triggerSwipe(step.startX, step.startY, step.endX, step.endY, step.duration || 400, step.scrollPage ?? config.scrollOnSwipe, null);
    }
  }

  // ==========================================================================
  // MESSAGE COMMUNICATION (Popup & Background)
  // ==========================================================================
  function notifyPopup(msg) {
    try {
      chrome.runtime.sendMessage(msg).catch(() => {});
    } catch (e) {}
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        switch (message.action) {
          case 'GET_STATUS': {
            sendResponse({
              isRunning: executionState.isRunning,
              mode: executionState.mode,
              currentStepIndex: executionState.currentStepIndex,
              currentLoop: executionState.currentLoop,
              config,
              quickClickerConfig,
              autoRefreshConfig
            });
            break;
          }

          case 'START_PICKER': {
            startPointPicker(message.mode, message.stepIndex ?? 0);
            sendResponse({ success: true });
            break;
          }

          case 'CANCEL_PICKER': {
            cancelPicker();
            sendResponse({ success: true });
            break;
          }

          case 'START_SEQUENCE': {
            if (message.config) {
              config = { ...config, ...message.config };
              await saveSettings();
            }
            startSequence();
            sendResponse({ success: true });
            break;
          }

          case 'START_QUICK_CLICKER': {
            if (message.quickConfig) {
              quickClickerConfig = { ...quickClickerConfig, ...message.quickConfig };
              await saveSettings();
            }
            startQuickClicker();
            sendResponse({ success: true });
            break;
          }

          case 'STOP_AUTOMATION':
          case 'STOP_SEQUENCE': {
            stopAutomation();
            sendResponse({ success: true });
            break;
          }

          case 'TOGGLE_AUTOMATION': {
            if (executionState.isRunning) {
              stopAutomation();
            } else {
              startSequence();
            }
            sendResponse({ success: true, isRunning: executionState.isRunning });
            break;
          }

          case 'TEST_ACTION': {
            await testAction(message.step);
            sendResponse({ success: true });
            break;
          }

          case 'UPDATE_CONFIG': {
            if (message.config) {
              config = { ...config, ...message.config };
              renderMarkers();
            }
            if (message.quickClickerConfig) {
              quickClickerConfig = { ...quickClickerConfig, ...message.quickClickerConfig };
            }
            if (message.autoRefreshConfig) {
              autoRefreshConfig = { ...autoRefreshConfig, ...message.autoRefreshConfig };
              setupAutoRefresh();
            }
            await saveSettings();
            sendResponse({ success: true });
            break;
          }

          case 'TOGGLE_MARKERS': {
            config.showMarkers = !!message.showMarkers;
            await saveSettings();
            renderMarkers();
            sendResponse({ success: true, showMarkers: config.showMarkers });
            break;
          }

          case 'MANUAL_REFRESH_PAGE': {
            try {
              await chrome.runtime.sendMessage({
                action: 'RELOAD_TAB',
                bypassCache: !!message.bypassCache
              });
            } catch (e) {
              location.reload();
            }
            sendResponse({ success: true });
            break;
          }

          case 'RESUME_SEQUENCE': {
            startSequence();
            sendResponse({ success: true });
            break;
          }

          case 'GET_VIEWPORT_INFO': {
            sendResponse({
              width: window.innerWidth,
              height: window.innerHeight,
              scrollX: window.scrollX,
              scrollY: window.scrollY
            });
            break;
          }

          default:
            sendResponse({ success: true });
            break;
        }
      } catch (err) {
        console.error('Error handling message in content script:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async response
  });
})();
