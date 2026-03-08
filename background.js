// ============================================================
// Smart Tab Manager — background.js
// Background Service Worker
//
// This worker handles ONE job:
//
// 1. Detect inactive tabs
// 2. Send a notification if a tab has been inactive too long
// ============================================================


// ------------------------------------------------------------
// How long before a tab is considered inactive
// 30 minutes = 30 * 60 * 1000
// ------------------------------------------------------------
const INACTIVE_LIMIT_MS = 30 * 60 * 1000;

// For testing you can use:
// const INACTIVE_LIMIT_MS = 10 * 1000;


// ============================================================
// RECORD TAB ACTIVITY
// Whenever a tab becomes active we record the time
// ============================================================

chrome.tabs.onActivated.addListener((activeInfo) => {

  const now = Date.now();

  chrome.storage.local.get("tabLastActive", (data) => {

    const tabLastActive = data.tabLastActive || {};

    tabLastActive[activeInfo.tabId] = now;

    chrome.storage.local.set({ tabLastActive });

  });

});


// ============================================================
// CHECK INACTIVE TABS
// We run this check every 5 minutes
// ============================================================

chrome.alarms.create("checkInactiveTabs", { periodInMinutes: 5 });


chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name !== "checkInactiveTabs") return;

  const now = Date.now();

  chrome.tabs.query({}, (allTabs) => {

    chrome.storage.local.get("tabLastActive", (data) => {

      const tabLastActive = data.tabLastActive || {};

      allTabs.forEach((tab) => {

        const lastActive = tabLastActive[tab.id];

        // Skip if we don't have activity data
        if (!lastActive) return;

        // Skip currently active tab
        if (tab.active) return;

        const inactiveFor = now - lastActive;

        if (inactiveFor >= INACTIVE_LIMIT_MS) {

          const minutes = Math.floor(inactiveFor / 60000);
          const tabTitle = tab.title || "A tab";

          chrome.notifications.create(`inactive-${tab.id}`, {

            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "⏰ Inactive Tab Alert!",
            message: `"${tabTitle.substring(0, 50)}" has been inactive for ${minutes} minutes. Consider closing it!`,
            priority: 1

          });

          // Reset timer so it doesn't spam notifications
          tabLastActive[tab.id] = now;

          chrome.storage.local.set({ tabLastActive });

        }

      });

    });

  });

});


// ============================================================
// CLEAN STORAGE WHEN TAB CLOSES
// ============================================================

chrome.tabs.onRemoved.addListener((tabId) => {

  chrome.storage.local.get("tabLastActive", (data) => {

    const tabLastActive = data.tabLastActive || {};

    delete tabLastActive[tabId];

    chrome.storage.local.set({ tabLastActive });

  });

});