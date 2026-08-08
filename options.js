// options.js - Full Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('subscription-table-body');
  const monthlyTotalEl = document.getElementById('monthly-total');
  const yearlyTotalEl = document.getElementById('yearly-total');
  const activeCountEl = document.getElementById('active-count');
  const searchInput = document.getElementById('search-input');
  const themeToggle = document.getElementById('theme-toggle');
  const exportBtn = document.getElementById('export-btn');
  
  // API Key elements
  const apiKeyInput = document.getElementById('api-key');
  const saveSettingsBtn = document.getElementById('save-settings');

  // Load settings & Theme
  const prefs = await chrome.storage.local.get(['darkMode', 'geminiApiKey']);
  if (prefs.darkMode) {
    document.body.setAttribute('data-theme', 'dark');
  }
  if (prefs.geminiApiKey) {
    apiKeyInput.value = '********************************'; // Mask it
  }

  // Save API Key
  saveSettingsBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value;
    if (key && key !== '********************************') {
      await chrome.storage.local.set({ geminiApiKey: key });
      alert('API Key saved successfully!');
    } else if (key === '********************************') {
      await chrome.storage.local.set({ geminiApiKey: '' });
      alert('API Key cleared.');
    } else {
      alert('Please enter a valid key.');
    }
  });

  themeToggle.addEventListener('click', async () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    await chrome.storage.local.set({ darkMode: newTheme === 'dark' });
  });

  async function renderDashboard(filter = '') {
    const data = await chrome.storage.local.get(['subscriptions']);
    const subs = data.subscriptions || [];
    
    tableBody.innerHTML = '';
    let monthlyTotal = 0;
    let activeCount = 0;

    const filteredSubs = subs.filter(sub => 
      sub.name.toLowerCase().includes(filter.toLowerCase()) ||
      sub.plan.toLowerCase().includes(filter.toLowerCase())
    );

    filteredSubs.forEach(sub => {
      const row = document.createElement('tr');
      
      const price = parseFloat(sub.price);
      if (sub.billingCycle === 'monthly') {
        monthlyTotal += price;
      } else {
        monthlyTotal += (price / 12);
      }
      
      if (sub.status === 'active') activeCount++;

      row.innerHTML = `
        <td><strong>${sub.name}</strong></td>
        <td>${sub.plan}</td>
        <td>${sub.currency}${sub.price.toFixed(2)}</td>
        <td>${new Date(sub.renewalDate).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-danger" data-id="${sub.id}" style="padding: 4px 8px; font-size: 12px;">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    monthlyTotalEl.innerText = `$${monthlyTotal.toFixed(2)}`;
    yearlyTotalEl.innerText = `$${(monthlyTotal * 12).toFixed(2)}`;
    activeCountEl.innerText = activeCount;

    document.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', () => deleteSubscription(btn.getAttribute('data-id')));
    });
  }

  async function deleteSubscription(id) {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    
    const data = await chrome.storage.local.get(['subscriptions']);
    const filtered = data.subscriptions.filter(s => s.id != id);
    await chrome.storage.local.set({ subscriptions: filtered });
    renderDashboard();
  }

  searchInput.addEventListener('input', (e) => {
    renderDashboard(e.target.value);
  });

  exportBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['subscriptions']);
    const blob = new Blob([JSON.stringify(data.subscriptions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'savesub_subscriptions.json';
    a.click();
  });

  renderDashboard();
});
