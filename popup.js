// ============================================================
//  Smart Tab Manager — popup.js
//  This file runs when the extension popup opens.
//  It reads all open tabs and builds the UI dynamically.
// ============================================================

// ------------------------------------------------------------
//  STEP 1 — CATEGORY RULES
//  Each category has a list of keywords.
//  If a tab's URL contains any keyword, it belongs there.
// ------------------------------------------------------------
const CATEGORY_RULES = {
  Study: [
    "coursera", "wikipedia", "geeksforgeeks", "kaggle",
    "khanacademy", "edx", "udemy", "scholar","leetcode","codechef","unstop",
    "codeforces", "atcoder", "hackerrank", "interviewbit",
    "freecodecamp",
    "tutorialspoint",
    "w3schools",
    "brilliant.org",
    "researchgate",
    "arxiv"
  ],
  Work: [
    "github",
    "gitlab",
    "bitbucket",
    "stackoverflow",
    "stackexchange",
    "docs.google",
    "notion",
    "slack",
    "figma",
    "jira",
    "linear.app",
    "trello",
    "asana",
    "clickup",
    "microsoft.com",
    "office.com",
    "outlook",
    "teams.microsoft",
    "zoom.us",
    "meet.google"
  ],
  Entertainment: [
      "youtube",
    "netflix",
    "primevideo",
    "disneyplus",
    "hulu",
    "spotify",
    "soundcloud",
    "twitch",
    "reddit",
    "instagram",
    "facebook",
    "twitter",
    "x.com",
    "snapchat",
    "pinterest",
    "tiktok",
    "9gag",
    "imdb",
    "hotstar"
  ],
AI: [
  "openai",
  "chatgpt",
  "huggingface",
  "replicate",
  "perplexity",
  "anthropic",
  "deepmind",
  "stability.ai",
  "midjourney",
  "runpod",
  "together.ai",
  "cohere.ai",
  "langchain",
  "luma.ai",
  "character.ai",
  "poe.com",
  "you.com",
  "phind.com",
  "jan.ai",
  "ollama",
  "weights.ai",
  "modal.com",
  "fal.ai",
  "gradio",
  "streamlit",
  "krea.ai",
  "playground.ai",
  "clipdrop",
  "leonardo.ai",
  "tensor.art"
]

};

// The order in which categories are shown in the popup
const CATEGORY_ORDER = ["Study", "Work", "AI", "Entertainment", "Other"];

// CSS class names for each category (used for colour theming)
const CATEGORY_CLASS = {
  Study:         "cat-study",
  Work:          "cat-work",
  AI:            "cat-ai",
  Entertainment: "cat-entertainment",
  Other:         "cat-other"
};

// Emoji icon shown next to each category heading
const CATEGORY_ICON = {
  Study:         "📚",
  Work:          "💼",
  AI:            "🤖",
  Entertainment: "🎬",
  Other:         "📌"
};

// ------------------------------------------------------------
//  STEP 2 — HELPER: categorise a single tab
//  Returns "Study", "Work", "Entertainment", or "Other"
// ------------------------------------------------------------
function categoriseTab(tab) {
  // Use the URL for matching; fall back to an empty string if missing
  const url = (tab.url || "").toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (url.includes(keyword)) {
        return category;          // Found a match — return this category
      }
    }
  }

  return "Other";                 // No match found — default to Other
}

// ------------------------------------------------------------
//  STEP 3 — HELPER: extract the root domain from a URL
//  e.g. "https://www.github.com/user" → "github.com"
// ------------------------------------------------------------
function getDomain(url) {
  try {
    const hostname = new URL(url).hostname;         // e.g. "www.github.com"
    return hostname.replace(/^www\./, "");          // Strip "www."
  } catch {
    return url;                                     // If URL is weird, return as-is
  }
}

// ------------------------------------------------------------
//  STEP 4 — HELPER: show a brief toast message
// ------------------------------------------------------------
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";

  // Hide the toast after 2.5 seconds
  setTimeout(() => { toast.style.display = "none"; }, 2500);
}

// ------------------------------------------------------------
//  STEP 5 — BUILD THE TAB LIST
//  This is the main function — it reads all open tabs and
//  renders them grouped by category in the popup.
// ------------------------------------------------------------
function buildTabList(allTabs) {
  const tabListEl = document.getElementById("tab-list");
  const totalCountEl = document.getElementById("total-count");

  // Update the tab count badge in the header
  totalCountEl.textContent = `${allTabs.length} tab${allTabs.length !== 1 ? "s" : ""}`;

  // --- Show alert if too many tabs are open ---
  checkTabAlert(allTabs.length);

  // Group tabs into categories
  // Start with empty arrays for each category
  const groups = { Study: [], Work: [], Entertainment: [], AI: [], Other: [] };

  for (const tab of allTabs) {
    const category = categoriseTab(tab);
    groups[category].push(tab);
  }

  // Clear the current contents of the tab list
  tabListEl.innerHTML = "";

  // Track whether any tabs were shown
  let totalShown = 0;

  // Render each category in the defined order
  for (const categoryName of CATEGORY_ORDER) {
    const tabs = groups[categoryName];

    // Skip empty categories — no need to show them
    if (tabs.length === 0) continue;

    totalShown += tabs.length;

    // --- Build the category section element ---
    const section = document.createElement("div");
    section.className = `category-section ${CATEGORY_CLASS[categoryName]}`;

    // Category heading row
    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `
      <span class="category-dot"></span>
      ${CATEGORY_ICON[categoryName]} ${categoryName}
      <span class="category-count">${tabs.length}</span>
    `;
    section.appendChild(header);

    // --- Add a row for each tab in this category ---
    for (const tab of tabs) {
      const row = createTabRow(tab, allTabs);
      section.appendChild(row);
    }

    tabListEl.appendChild(section);
  }

  // Show empty state if somehow nothing rendered
  if (totalShown === 0) {
    tabListEl.innerHTML = `
      <div class="empty-state">
        <span class="emoji">✨</span>
        No tabs open right now!
      </div>`;
  }
}

// ------------------------------------------------------------
//  STEP 5b — URL CONTEXT PARSER
//  Reads the URL of a tab and returns a human-friendly label
//  describing WHAT is open inside that site.
//  e.g. github.com/user/repo/issues → "📋 Issues"
//  e.g. youtube.com/watch?v=... → "▶️ Watching Video"
// ------------------------------------------------------------
function getUrlContext(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    const params = u.searchParams;

    // --- GITHUB ---
    if (host.includes("github.com")) {
      if (path === "/" || path === "")         return "🏠 Home Feed";
      if (path.includes("/issues/new"))        return "🆕 New Issue";
      if (path.includes("/issues"))            return "📋 Issues";
      if (path.includes("/pull/"))             return "🔀 Pull Request";
      if (path.includes("/pulls"))             return "🔀 Pull Requests";
      if (path.includes("/actions"))           return "⚙️ Actions";
      if (path.includes("/settings"))          return "⚙️ Settings";
      if (path.includes("/wiki"))              return "📖 Wiki";
      if (path.includes("/blob/") || path.includes("/tree/")) return "📁 File Browser";
      if (path.includes("/commit"))            return "✅ Commit";
      if (path.includes("/releases"))          return "🚀 Releases";
      if (path.includes("/discussions"))       return "💬 Discussions";
      const parts = path.split("/").filter(Boolean);
      if (parts.length === 1)                  return "👤 Profile";
      if (parts.length === 2)                  return `📦 Repo: ${parts[1]}`;
      return "📦 Repository";
    }

    // --- YOUTUBE ---
    if (host.includes("youtube.com")) {
      if (params.get("v"))                     return "▶️ Watching Video";
      if (path.includes("/results"))           return "🔍 Search Results";
      if (path.includes("/channel") || path.includes("/@")) return "📺 Channel";
      if (path.includes("/playlist"))          return "📃 Playlist";
      if (path.includes("/shorts"))            return "🎬 Shorts";
      if (path.includes("/feed/subscriptions")) return "🔔 Subscriptions";
      if (path === "/" || path === "")         return "🏠 Home Feed";
      return "▶️ YouTube";
    }

    // --- STACKOVERFLOW ---
    if (host.includes("stackoverflow.com")) {
      if (path.includes("/questions/ask"))     return "✏️ Asking Question";
      if (path.includes("/questions/"))        return "❓ Question";
      if (path.includes("/questions"))         return "📋 Questions List";
      if (path.includes("/tags"))              return "🏷️ Tags";
      if (path.includes("/users"))             return "👤 User Profile";
      if (path === "/" || path === "")         return "🏠 Home";
      return "💬 StackOverflow";
    }

    // --- NOTION ---
    if (host.includes("notion.so")) {
      if (path.includes("/login"))             return "🔐 Login";
      if (path === "/" || path === "")         return "🏠 Dashboard";
      return "📝 Page";
    }

    // --- FIGMA ---
    if (host.includes("figma.com")) {
      if (path.includes("/design/"))           return "🎨 Design File";
      if (path.includes("/proto/"))            return "📱 Prototype";
      if (path.includes("/board/"))            return "📌 FigJam Board";
      if (path === "/" || path === "")         return "🏠 Figma Home";
      return "🎨 Figma";
    }

    // --- GOOGLE DOCS / SHEETS / SLIDES ---
    if (host.includes("docs.google.com")) {
      if (path.includes("/document"))         return "📄 Google Doc";
      if (path.includes("/spreadsheets"))     return "📊 Google Sheet";
      if (path.includes("/presentation"))     return "📽️ Google Slides";
      if (path.includes("/forms"))            return "📋 Google Form";
      return "📁 Google Drive";
    }

    // --- REDDIT ---
    if (host.includes("reddit.com")) {
      if (path.includes("/r/") && path.includes("/comments/")) return "💬 Post";
      if (path.includes("/r/"))               return "🏘️ Subreddit";
      if (path.includes("/user/"))            return "👤 User Profile";
      if (path === "/" || path === "")        return "🏠 Home Feed";
      return "🔶 Reddit";
    }

    // --- WIKIPEDIA ---
    if (host.includes("wikipedia.org")) {
      if (path.includes("/wiki/"))            return `📖 Article`;
      return "📖 Wikipedia";
    }

    // --- NETFLIX ---
    if (host.includes("netflix.com")) {
      if (path.includes("/watch/"))           return "🎬 Watching";
      if (path.includes("/browse"))           return "🏠 Browse";
      return "🎬 Netflix";
    }

    // --- SPOTIFY ---
    if (host.includes("spotify.com")) {
      if (path.includes("/track/"))           return "🎵 Song";
      if (path.includes("/album/"))           return "💿 Album";
      if (path.includes("/playlist/"))        return "📃 Playlist";
      if (path.includes("/artist/"))          return "🎤 Artist";
      return "🎵 Spotify";
    }

    // --- JIRA ---
    if (host.includes("atlassian.net") || host.includes("jira.com")) {
      if (path.includes("/board"))            return "📋 Board";
      if (path.includes("/backlog"))          return "📝 Backlog";
      if (path.includes("/browse/"))          return "🎫 Ticket";
      return "📋 Jira";
    }

    return null; // No context found for this site

  } catch {
    return null; // If URL parsing fails, return nothing
  }
}


//  Builds the HTML row for one tab, including its favicon,
//  title, URL context label, and the "Close Site Tabs" button.
// ------------------------------------------------------------
function createTabRow(tab, allTabs) {
  const domain = getDomain(tab.url || "");
  const context = getUrlContext(tab.url || ""); // NEW: get context label

  // Wrapper holds the row
  const wrapper = document.createElement("div");
  wrapper.className = "tab-wrapper";

  const row = document.createElement("div");
  row.className = "tab-item";

  // Favicon image
  const favicon = document.createElement("img");
  favicon.className = "tab-favicon";
  favicon.src = tab.favIconUrl || "icons/icon16.png";
  favicon.onerror = () => { favicon.style.display = "none"; };

  // Info block — stacks title + context badge vertically
  const infoBlock = document.createElement("div");
  infoBlock.className = "tab-info";

  // Tab title
  const title = document.createElement("span");
  title.className = "tab-title";
  title.textContent = tab.title || domain || "Untitled";
  title.title = tab.url;

  infoBlock.appendChild(title);

  // Context badge — only shown if we detected something from the URL
  if (context) {
    const badge = document.createElement("span");
    badge.className = "tab-context-badge";
    badge.textContent = context;
    infoBlock.appendChild(badge);
  }

  // "Close Site Tabs" button
  const closeSiteBtn = document.createElement("button");
  closeSiteBtn.className = "btn-close-site";
  closeSiteBtn.textContent = "✕ Site";
  closeSiteBtn.title = `Close all tabs from ${domain}`;

  closeSiteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSiteTabs(domain, allTabs);
  });

  // Clicking the row switches focus to that tab
  row.addEventListener("click", () => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });

  row.appendChild(favicon);
  row.appendChild(infoBlock);
  row.appendChild(closeSiteBtn);
  wrapper.appendChild(row);

  return wrapper;
}

// ------------------------------------------------------------
//  STEP 7 — CLOSE DUPLICATE TABS
//  Finds tabs with the same URL and removes all but the first.
// ------------------------------------------------------------
function closeDuplicateTabs() {
  chrome.tabs.query({}, (allTabs) => {
    const seenUrls = new Set(); // Track URLs we've already seen
    const tabsToClose = [];

    for (const tab of allTabs) {
      if (seenUrls.has(tab.url)) {
        // Already seen this URL — mark this tab for closing
        tabsToClose.push(tab.id);
      } else {
        // First time seeing this URL — keep it
        seenUrls.add(tab.url);
      }
    }

    if (tabsToClose.length === 0) {
      showToast("✅ No duplicate tabs found!");
      return;
    }

    chrome.tabs.remove(tabsToClose, () => {
      showToast(`🗑️ Closed ${tabsToClose.length} duplicate tab(s)`);
      refreshTabList(); // Re-render the list after changes
    });
  });
}

// ------------------------------------------------------------
//  STEP 8 — CLOSE ALL TABS FROM A DOMAIN
//  Called when user clicks "✕ Site" on a tab row.
// ------------------------------------------------------------
function closeSiteTabs(domain, allTabs) {
  // Find every tab whose URL contains this domain
  const matchingTabs = allTabs.filter((tab) => {
    return getDomain(tab.url || "").includes(domain);
  });

  const idsToClose = matchingTabs.map((tab) => tab.id);

  if (idsToClose.length === 0) return;

  chrome.tabs.remove(idsToClose, () => {
    showToast(`✕ Closed ${idsToClose.length} tab(s) from ${domain}`);
    refreshTabList(); // Re-render the list
  });
}

// ------------------------------------------------------------
//  ENTERTAINMENT SITES TO BLOCK — used for dynamic rules
// ------------------------------------------------------------
const BLOCK_DOMAINS = [
  "youtube.com", "netflix.com", "spotify.com", "primevideo.com",
  "twitch.tv", "hulu.com", "disneyplus.com", "reddit.com",
  "instagram.com", "snapchat.com", "twitter.com", "x.com",
  "facebook.com", "pinterest.com"
];

// Build one rule per domain
// requestDomains list includes BOTH "youtube.com" AND "www.youtube.com"
// because Chrome treats them as separate domains
function buildDynamicRules() {

  return BLOCK_DOMAINS.map((domain, index) => ({
    id: 1000 + index,
    priority: 1,
    action: { type: "block" },
    condition: {
      requestDomains: [domain],
      resourceTypes: ["main_frame"]
    }
  }));

}

// ------------------------------------------------------------
//  STEP 9 — FOCUS MODE (DYNAMIC RULES — MOST RELIABLE)
//
//  Instead of toggling a ruleset file, we ADD and REMOVE
//  dynamic rules directly. These take effect INSTANTLY
//  and don't depend on any file or service worker state.
// ------------------------------------------------------------
function activateFocusMode() {

  chrome.storage.local.get("focusModeOn", (data) => {

    const isCurrentlyOn = data.focusModeOn || false;

    if (isCurrentlyOn) {

      // TURN OFF
      const ruleIds = BLOCK_DOMAINS.map((_, i) => 1000 + i);

      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
        addRules: []
      }, () => {

        chrome.storage.local.set({ focusModeOn: false });

        showToast("🔓 Focus Mode OFF — distractions allowed!");
        updateFocusButton(false);

      });

    } else {

      // TURN ON
      const ruleIds = BLOCK_DOMAINS.map((_, i) => 1000 + i);

      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
        addRules: buildDynamicRules()
      }, () => {

        chrome.storage.local.set({ focusModeOn: true });

        showToast("🎯 Focus Mode ON! Distraction sites blocked!");
        updateFocusButton(true);

      });

    }

  });

}
// ------------------------------------------------------------
//  Update the Focus Mode button to show ON / OFF state
// ------------------------------------------------------------
function updateFocusButton(isOn) {
  const btn = document.getElementById("btn-focus");
  if (isOn) {
    btn.textContent = "🔴 Focus Mode ON";
    btn.style.background = "rgba(249, 83, 198, 0.35)";
    btn.style.borderColor = "var(--entertain)";
  } else {
    btn.textContent = "🎯 Focus Mode";
    btn.style.background = "";
    btn.style.borderColor = "";
  }
}

// ------------------------------------------------------------
//  STEP 10 — CLOSE ALL TABS OF A SPECIFIC WEBSITE (USER INPUT)
//  Asks the user to type a website name, then closes all tabs
//  from that site. e.g. typing "youtube" closes all youtube tabs.
// ------------------------------------------------------------
function closeAllTabsOfWebsite() {
  // Ask the user which website they want to close
  const input = prompt("Type the website name to close all its tabs:\n(e.g. youtube, github, google)");

  // If user clicked Cancel or left it empty — do nothing
  if (!input || input.trim() === "") {
    showToast("⚠️ No website entered.");
    return;
  }

  const keyword = input.trim().toLowerCase();

  chrome.tabs.query({}, (allTabs) => {
    // Find every tab whose URL contains the keyword the user typed
    const matchingTabs = allTabs.filter((tab) => {
      const url = (tab.url || "").toLowerCase();
      return url.includes(keyword);
    });

    if (matchingTabs.length === 0) {
      showToast(`🔍 No tabs found for "${keyword}"`);
      return;
    }

    const idsToClose = matchingTabs.map((tab) => tab.id);

    chrome.tabs.remove(idsToClose, () => {
      showToast(`✕ Closed ${idsToClose.length} tab(s) for "${keyword}"`);
      refreshTabList(); // Re-render the list
    });
  });
}

// ------------------------------------------------------------
//  STEP 11 — TAB ALERT
//  Shows a warning banner if the user has too many tabs open.
//  Levels: 10+ tabs = yellow warning, 20+ tabs = red danger
// ------------------------------------------------------------
function checkTabAlert(count) {
  const alertEl = document.getElementById("tab-alert");

  if (count >= 20) {
    // Red danger alert — too many tabs!
    alertEl.style.display = "block";
    alertEl.className = "tab-alert alert-danger";
    alertEl.innerHTML = `🚨 <strong>Too many tabs!</strong> You have ${count} tabs open. Your browser may slow down!`;

  } else if (count >= 10) {
    // Yellow warning alert — getting a lot
    alertEl.style.display = "block";
    alertEl.className = "tab-alert alert-warning";
    alertEl.innerHTML = `⚠️ <strong>Heads up!</strong> You have ${count} tabs open. Consider closing some.`;

  } else {
    // All good — hide the alert
    alertEl.style.display = "none";
  }
}

// ------------------------------------------------------------
//  STEP 12 — TAB SEARCH
//  Filters the visible tab rows in real time as the user types.
//  It shows only tabs whose title or URL matches the search text.
// ------------------------------------------------------------
function handleSearch() {
  // Get what the user typed and make it lowercase for comparison
  const query = document.getElementById("search-input").value.toLowerCase().trim();

  // Get every single tab row currently in the list
  const allRows = document.querySelectorAll(".tab-item");
  const allSections = document.querySelectorAll(".category-section");

  // If search is empty — show everything again
  if (query === "") {
    allRows.forEach((row) => row.style.display = "flex");
    allSections.forEach((section) => section.style.display = "block");
    return;
  }

  // Loop through every tab row and show/hide based on match
  allRows.forEach((row) => {
    const titleEl = row.querySelector(".tab-title");
    const titleText = (titleEl ? titleEl.textContent : "").toLowerCase();
    const urlText = (titleEl ? titleEl.title : "").toLowerCase(); // title attr = full URL

    // Check if the query matches the tab title OR the URL
    const isMatch = titleText.includes(query) || urlText.includes(query);
    row.style.display = isMatch ? "flex" : "none";
  });

  // Hide any category section that has NO visible tabs left
  allSections.forEach((section) => {
    const visibleRows = section.querySelectorAll(".tab-item[style*='flex']");
    section.style.display = visibleRows.length > 0 ? "block" : "none";
  });
}


//  Re-queries all tabs and rebuilds the UI from scratch.
//  Called after any close operation.
// ------------------------------------------------------------
function refreshTabList() {
  chrome.tabs.query({}, (allTabs) => {
    buildTabList(allTabs);
  });
}

// ------------------------------------------------------------
//  STEP 13 — WIRE UP BUTTONS & INITIALISE
//  This runs as soon as the popup HTML is loaded.
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  // Wire up the "Close Duplicates" button
  document.getElementById("btn-dupes").addEventListener("click", closeDuplicateTabs);

  // Wire up the "Focus Mode" button
  document.getElementById("btn-focus").addEventListener("click", activateFocusMode);

  // Wire up the "Close Website Tabs" button
  document.getElementById("btn-close-website").addEventListener("click", closeAllTabsOfWebsite);

  // Wire up the search input — runs handleSearch on every keystroke
  document.getElementById("search-input").addEventListener("input", handleSearch);

  // Wire up the clear (✕) button next to the search box
  document.getElementById("search-clear").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    handleSearch(); // Reset the list to show everything
  });

  // Check if Focus Mode is already ON — update button AND sync rules
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("focusModeOn", (data) => {
      const isOn = data.focusModeOn || false;
      updateFocusButton(isOn);

      // Sync dynamic rules to match saved state every time popup opens
      const ruleIds = BLOCK_DOMAINS.map((_, i) => 1000 + i);
      if (isOn) {
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds,
          addRules: buildDynamicRules()
        });
      } else {
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds,
          addRules: []
        });
      }
    });
  }

  // Load and display all tabs immediately when the popup opens
  refreshTabList();
});