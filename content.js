// content.js - Intelligence & Extraction Engine

/**
 * Configuration for detection patterns
 */
const DETECTION_RULES = [
  { pattern: /(netflix|spotify|disney\+|hulu|hbomax|prime\svideo)/i, category: 'Streaming' },
  { pattern: /(chatgpt|claude|gemini|midjourney|copilot)/i, category: 'AI Tools' },
  { pattern: /(canva|adobe|figma|notion)/i, category: 'Productivity' },
  { pattern: /(github|cursor|vercel|aws|google\scloud)/i, category: 'Developer Tools' }
];

/**
 * Fallback Extraction: Uses rules instead of AI
 */
async function fallbackExtraction(pageText) {
  console.log("SaveMySub: Using Rule-Based Fallback mode...");
  
  // Heuristic extraction logic
  const findPrice = (text) => {
    const priceRegex = /[\$\£\€]\s?\d+(\.\d{2})?/;
    const match = text.match(priceRegex);
    return match ? parseFloat(match[0].replace(/[\$\£\€]\s?/, '')) : 9.99;
  };

  const findCycle = (text) => {
    if (/monthly|per month|month/i.test(text)) return 'monthly';
    if (/yearly|annual|per year/i.test(text)) return 'yearly';
    return 'monthly';
  };

  let serviceName = "Detected Service";
  let category = "Other";

  for (const rule of DETECTION_RULES) {
    if (rule.pattern.test(pageText)) {
      const match = pageText.match(rule.pattern);
      serviceName = match[0];
      category = rule.category;
      break;
    }
  }

  return {
    success: true,
    data: {
      name: serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
      plan: "Standard Plan", 
      price: findPrice(pageText),
      currency: pageText.match(/[\$\£\€]/)?.[0] || "$",
      billingCycle: findCycle(pageText),
      category: category,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      confidenceScore: 0.5 // Lower confidence for rule-based
    }
  };
}

/**
 * Real Gemini API Integration
 */
async function callGeminiAPI(pageText) {
  const data = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = data.geminiApiKey;

  if (!apiKey) {
    return { success: false, error: 'NO_API_KEY' };
  }

  const prompt = `Analyze the following text from a website and extract details about any subscription or free trial offered. 
  Return ONLY a valid JSON object with these exact keys:
  "name": (the service name),
  "plan": (the plan name),
  "price": (the numerical price),
  "currency": (the currency symbol, e.g. "$"),
  "billingCycle": (either "monthly" or "yearly"),
  "category": (one of: AI Tools, Streaming, Music, Productivity, Education, Developer Tools, Gaming, VPN, Shopping, Cloud Storage, Finance, Health),
  "success": true.

  If no subscription is found, return: {"success": false}.

  Text to analyze:
  ${pageText.substring(0, 5000)}`; 

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const result = await response.json();
    
    if (result.error) return { success: false, error: result.error.message };

    const rawText = result.candidates[0].content.parts[0].text;
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResponse = JSON.parse(cleanJsonText);

    if (jsonResponse.success) {
      jsonResponse.data = {
        ...jsonResponse,
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        confidenceScore: 0.9
      };
      return { success: true, data: jsonResponse.data };
    }

    return { success: false, error: 'NO_SUBSCRIPTION_FOUND' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function performScan() {
  const bodyText = document.body.innerText;
  const indicators = ['subscribe', 'pricing', 'trial', 'billing', 'plan', 'premium', 'cost', 'price'];
  const foundIndicator = indicators.some(word => bodyText.toLowerCase().includes(word));

  if (!foundIndicator) {
    chrome.storage.local.set({ scanStatus: 'no_match' });
    return;
  }

  // 1. Try API first
  const data = await chrome.storage.local.get(['geminiApiKey']);
  let result;
  
  if (data.geminiApiKey) {
    result = await callGeminiAPI(bodyText);
  } else {
    // 2. Use Fallback if no key
    result = await fallbackExtraction(bodyText);
  }
  
  if (result.success) {
    chrome.storage.local.set({ 
      lastDetectedSub: result.data,
      scanStatus: result.data.confidenceScore < 0.6 ? 'rule_based' : 'success'
    });
  } else if (result.error === 'NO_API_KEY') {
    chrome.storage.local.set({ scanStatus: 'error_no_key' });
  } else if (result.error === 'NO_SUBSCRIPTION_FOUND') {
    chrome.storage.local.set({ scanStatus: 'no_match' });
  } else {
    chrome.storage.local.set({ scanStatus: 'error' });
  }
}

setTimeout(performScan, 3000);
