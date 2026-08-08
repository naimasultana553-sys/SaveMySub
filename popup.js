// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const statusArea = document.getElementById('status-area');
  const detectionArea = document.getElementById('detection-area');
  const dashboardLinkArea = document.getElementById('dashboard-link-area');
  const detectText = document.getElementById('detect-text');
  const trackBtn = document.getElementById('track-btn');
  const ignoreBtn = document.getElementById('ignore-btn');
  const openDashboardBtn = document.getElementById('open-dashboard');

  let detectedSub = null;

  // Load initial state from storage
  const data = await chrome.storage.local.get(['subscriptions', 'lastDetectedSub', 'scanStatus']);
  
  // 1. Handle Detected Subscriptions (Highest priority)
  if (data.lastDetectedSub) {
    detectedSub = data.lastDetectedSub;
    statusArea.classList.add('hidden');
    detectionArea.classList.remove('hidden');
    detectText.innerHTML = `
      <strong style="display:block; margin-bottom:4px;">${detectedSub.name}</strong>
      <span style="font-size: 0.9em; color: var(--secondary-color);">
        ${detectedSub.plan} - ${detectedSub.currency}${detectedSub.price.toFixed(2)}/${detectedSub.billingCycle}
      </span>
    `;
  } 
  // 2. Handle status messages if no subscription is active
  else {
    statusArea.classList.remove('hidden');
    detectionArea.classList.add('hidden');

    if (data.scanStatus === 'error_no_key') {
      statusArea.innerHTML = '<span style="color: var(--danger-color);">⚠️ Please set your Gemini API Key in the Dashboard settings.</span>';
    } else if (data.scanStatus === 'no_match') {
      statusArea.innerText = 'No subscription detected on this page.';
    } else if (data.scanStatus === 'error') {
      statusArea.innerText = 'An error occurred during detection.';
    } else {
      statusArea.innerText = 'Scanning for subscriptions...';
    }
  }

  // 3. Show Dashboard Link if subscriptions exist
  if (data.subscriptions && data.subscriptions.length > 0) {
    dashboardLinkArea.classList.remove('hidden');
  }

  // Event Listeners
  trackBtn.addEventListener('click', async () => {
    if (!detectedSub) return;

    const currentData = await chrome.storage.local.get(['subscriptions']);
    const subs = currentData.subscriptions || [];
    const newSub = { ...detectedSub, id: Date.now() };
    
    await chrome.storage.local.set({ 
      subscriptions: [...subs, newSub],
      lastDetectedSub: null,
      scanStatus: null
    });
    
    alert("Subscription tracked successfully!");
    window.close();
  });

  ignoreBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({ lastDetectedSub: null, scanStatus: 'no_match' });
    detectionArea.classList.add('hidden');
    statusArea.classList.remove('hidden');
    statusArea.innerText = 'No subscription detected on this page.';
  });

  openDashboardBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
