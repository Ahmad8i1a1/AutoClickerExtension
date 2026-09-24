// background.js - Service Worker for Auto Clicker & Swipe Automation

// Listen for global shortcut (Alt+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-automation') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_AUTOMATION' });
      }
    } catch (err) {
      console.warn('Could not send toggle command to active tab:', err);
    }
  }
});

// Handle incoming messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'UPDATE_BADGE': {
          const tabId = sender.tab?.id || message.tabId;
          const text = message.isRunning ? (message.text || 'ON') : '';
          const color = message.isRunning ? '#10B981' : '#6B7280';

          if (tabId) {
            await chrome.action.setBadgeText({ text, tabId });
            await chrome.action.setBadgeBackgroundColor({ color, tabId });
          } else {
            await chrome.action.setBadgeText({ text });
            await chrome.action.setBadgeBackgroundColor({ color });
          }
          sendResponse({ success: true });
          break;
        }

        case 'RELOAD_TAB': {
          const tabId = message.tabId || sender.tab?.id;
          if (tabId) {
            await chrome.tabs.reload(tabId, { bypassCache: !!message.bypassCache });
            sendResponse({ success: true });
          } else {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id) {
              await chrome.tabs.reload(activeTab.id, { bypassCache: !!message.bypassCache });
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'No active tab found' });
            }
          }
          break;
        }

        case 'OPEN_TAB': {
          if (message.url) {
            const newTab = await chrome.tabs.create({ url: message.url });
            sendResponse({ success: true, tabId: newTab.id });
          }
          break;
        }

        default:
          sendResponse({ success: true, message: 'Received' });
          break;
      }
    } catch (error) {
      console.error('Error handling background message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Keep message channel open for async response
});

// Tab update listener to help restore state if tab refreshed during sequence
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    try {
      const data = await chrome.storage.local.get(['sequenceState', 'autoRefreshState']);
      
      // If sequence was running and marked for auto-resume on reload for this tab
      if (data.sequenceState?.autoResume && data.sequenceState?.targetTabId === tabId) {
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tabId, {
              action: 'RESUME_SEQUENCE',
              state: data.sequenceState
            });
          } catch (e) {
            console.log('Tab not ready for resume yet:', e);
          }
        }, data.sequenceState?.resumeDelay || 1500);
      }
    } catch (err) {
      console.error('Error on tab update:', err);
    }
  }
});
