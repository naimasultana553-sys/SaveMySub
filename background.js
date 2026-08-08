// background.js - Service Worker

// Handle alarms for renewal reminders
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("Alarm triggered:", alarm.name);
  checkSubscriptionsAndNotify();
});

async function checkSubscriptionsAndNotify() {
  const data = await chrome.storage.local.get(['subscriptions']);
  if (!data.subscriptions) return;

  const now = new Date();
  
  data.subscriptions.forEach(sub => {
    const renewalDate = new Date(sub.renewalDate);
    const diffTime = renewalDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Notification triggers: 7, 3, 1, and 0 days before
    if ([7, 3, 1, 0].includes(diffDays)) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'SaveMySub: Renewal Reminder',
        message: `Your subscription to ${sub.name} (${sub.plan}) renews in ${diffDays === 0 ? 'today' : diffDays + ' days'}.`,
        priority: 2
      });
    }
  });
}

// Create recurring check every 24 hours
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('daily_check', { periodInMinutes: 1440 });
  console.log("SaveMySub background service worker initialized.");
});
