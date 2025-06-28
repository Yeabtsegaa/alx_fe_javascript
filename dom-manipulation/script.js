// Storage keys
const STORAGE_KEYS = {
  QUOTES: 'dynamicQuoteGenerator_quotes',
  PREFERENCES: 'dynamicQuoteGenerator_preferences',
  LAST_QUOTE: 'dynamicQuoteGenerator_lastQuote',
  SESSION_PREFERENCES: 'dynamicQuoteGenerator_sessionPrefs'
};

// Default quotes array
const DEFAULT_QUOTES = [
  { text: "Believe in yourself.", category: "Motivation" },
  { text: "Stay curious.", category: "Education" },
  { text: "Do one thing every day that scares you.", category: "Growth" },
  { text: "Code is like humor. When you have to explain it, it's bad.", category: "Programming" },
  { text: "The only way to do great work is to love what you do.", category: "Motivation" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Motivation" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", category: "Inspiration" },
  { text: "In the middle of difficulty lies opportunity.", category: "Growth" },
  { text: "The best way to predict the future is to invent it.", category: "Innovation" }
];

// Global variables
let quotes = [];
let currentCategoryFilter = "";
let userPreferences = {
  autoSave: true,
  rememberLastQuote: false,
  darkMode: false
};

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const showAllQuotesBtn = document.getElementById("showAllQuotes");
const clearQuotesBtn = document.getElementById("clearQuotes");
const categorySelect = document.getElementById("categorySelect");
const statsDiv = document.getElementById("stats");
const quoteListDiv = document.getElementById("quoteList");

// Storage Management Functions
function saveQuotes() {
  if (userPreferences.autoSave) {
    try {
      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
      console.log('Quotes saved to local storage');
    } catch (error) {
      console.error('Error saving quotes to local storage:', error);
      showNotification('Error saving quotes to local storage', 'error');
    }
  }
}

function loadQuotes() {
  try {
    const savedQuotes = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (savedQuotes) {
      quotes = JSON.parse(savedQuotes);
      console.log('Quotes loaded from local storage');
    } else {
      quotes = [...DEFAULT_QUOTES];
      console.log('Using default quotes');
    }
  } catch (error) {
    console.error('Error loading quotes from local storage:', error);
    quotes = [...DEFAULT_QUOTES];
    showNotification('Error loading quotes, using defaults', 'error');
  }
}

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(userPreferences));
    console.log('Preferences saved to local storage');
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

function loadPreferences() {
  try {
    const savedPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (savedPrefs) {
      userPreferences = { ...userPreferences, ...JSON.parse(savedPrefs) };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

function saveSessionData() {
  try {
    const sessionData = {
      lastViewedQuote: quoteDisplay.textContent,
      currentCategoryFilter: currentCategoryFilter,
      timestamp: new Date().toISOString()
    };
    sessionStorage.setItem(STORAGE_KEYS.SESSION_PREFERENCES, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Error saving session data:', error);
  }
}

function loadSessionData() {
  try {
    const sessionData = sessionStorage.getItem(STORAGE_KEYS.SESSION_PREFERENCES);
    if (sessionData) {
      const data = JSON.parse(sessionData);
      currentCategoryFilter = data.currentCategoryFilter || "";
      
      if (userPreferences.rememberLastQuote && data.lastViewedQuote) {
        quoteDisplay.innerHTML = data.lastViewedQuote;
      }
    }
  } catch (error) {
    console.error('Error loading session data:', error);
  }
}

// JSON Import/Export Functions
function exportToJson() {
  try {
    const dataStr = JSON.stringify(quotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `quotes_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Quotes exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting quotes:', error);
    showNotification('Error exporting quotes', 'error');
  }
}

function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileReader = new FileReader();
  
  fileReader.onload = function(e) {
    try {
      const importedQuotes = JSON.parse(e.target.result);
      
      // Validate the imported data
      if (!Array.isArray(importedQuotes)) {
        throw new Error('Invalid JSON format: expected an array');
      }
      
      // Validate each quote object
      const validQuotes = importedQuotes.filter(quote => {
        return quote && typeof quote.text === 'string' && typeof quote.category === 'string';
      });
      
      if (validQuotes.length === 0) {
        throw new Error('No valid quotes found in the file');
      }
      
      // Add imported quotes to existing quotes
      quotes.push(...validQuotes);
      
      // Save to local storage
      saveQuotes();
      
      // Update UI
      updateCategorySelect();
      updateStats();
      
      showNotification(`${validQuotes.length} quotes imported successfully!`, 'success');
      
      // Clear the file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error importing quotes:', error);
      showNotification(`Error importing quotes: ${error.message}`, 'error');
      event.target.value = '';
    }
  };
  
  fileReader.onerror = function() {
    showNotification('Error reading file', 'error');
    event.target.value = '';
  };
  
  fileReader.readAsText(file);
}

function clearAllStorage() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    try {
      // Clear local storage
      localStorage.removeItem(STORAGE_KEYS.QUOTES);
      localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      
      // Clear session storage
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_PREFERENCES);
      
      // Reset quotes to defaults
      quotes = [...DEFAULT_QUOTES];
      
      // Reset preferences
      userPreferences = {
        autoSave: true,
        rememberLastQuote: false,
        darkMode: false
      };
      
      // Update UI
      updateCategorySelect();
      updateStats();
      clearDisplay();
      
      // Update preference checkboxes
      updatePreferenceCheckboxes();
      
      showNotification('All data cleared successfully!', 'success');
    } catch (error) {
      console.error('Error clearing storage:', error);
      showNotification('Error clearing data', 'error');
    }
  }
}

// Core Application Functions
function showRandomQuote() {
  if (quotes.length === 0) {
    quoteDisplay.innerHTML = '<em>No quotes available. Please add one.</em>';
    return;
  }

  let filteredQuotes = quotes;
  if (currentCategoryFilter) {
    filteredQuotes = quotes.filter(quote => quote.category === currentCategoryFilter);
  }

  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML = `<em>No quotes available in category "${currentCategoryFilter}".</em>`;
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const quote = filteredQuotes[randomIndex];

  // Create quote display with enhanced styling
  const quoteElement = document.createElement('div');
  quoteElement.innerHTML = `
    <div style="font-size: 1.4em; margin-bottom: 10px;">"${quote.text}"</div>
    <div style="color: #666; font-size: 0.9em;">— ${quote.category}</div>
  `;

  // Clear and update the display
  quoteDisplay.innerHTML = '';
  quoteDisplay.appendChild(quoteElement);
  
  // Save session data
  saveSessionData();
}

function showAllQuotes() {
  quoteListDiv.innerHTML = '';
  
  if (quotes.length === 0) {
    quoteListDiv.innerHTML = '<p><em>No quotes available.</em></p>';
    return;
  }

  const filteredQuotes = currentCategoryFilter 
    ? quotes.filter(quote => quote.category === currentCategoryFilter)
    : quotes;

  filteredQuotes.forEach((quote, index) => {
    const quoteItem = document.createElement('div');
    quoteItem.className = 'quote-item';
    quoteItem.innerHTML = `
      <div style="margin-bottom: 5px;">"${quote.text}"</div>
      <div class="quote-category">${quote.category}</div>
      <button onclick="deleteQuote(${index})" style="background-color: #dc3545; margin-top: 5px; padding: 5px 10px; font-size: 12px;">Delete</button>
    `;
    quoteListDiv.appendChild(quoteItem);
  });
}

function clearDisplay() {
  quoteDisplay.innerHTML = 'Click "Show New Quote" to get started!';
  quoteListDiv.innerHTML = '';
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const newText = textInput.value.trim();
  const newCategory = categoryInput.value.trim();

  // Enhanced validation
  if (!newText || !newCategory) {
    alert("Please fill in both the quote and the category.");
    return;
  }

  if (newText.length < 3) {
    alert("Quote must be at least 3 characters long.");
    return;
  }

  // Add new quote to the array
  quotes.push({ text: newText, category: newCategory });

  // Clear input fields
  textInput.value = "";
  categoryInput.value = "";

  // Save to storage
  saveQuotes();

  // Update the UI
  updateCategorySelect();
  updateStats();
  
  // Show the newly added quote
  quoteDisplay.innerHTML = `
    <div style="font-size: 1.4em; margin-bottom: 10px; color: #28a745;">"${newText}"</div>
    <div style="color: #666; font-size: 0.9em;">— ${newCategory} (Newly Added!)</div>
  `;

  // Show success message
  showNotification('Quote added successfully!', 'success');
}

function deleteQuote(index) {
  if (confirm('Are you sure you want to delete this quote?')) {
    quotes.splice(index, 1);
    saveQuotes();
    updateCategorySelect();
    updateStats();
    showAllQuotes();
    showNotification('Quote deleted successfully!', 'info');
  }
}

function updateCategorySelect() {
  const categories = [...new Set(quotes.map(quote => quote.category))];
  
  // Clear existing options except the first one
  categorySelect.innerHTML = '<option value="">All Categories</option>';
  
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  
  // Restore current filter
  if (currentCategoryFilter) {
    categorySelect.value = currentCategoryFilter;
  }
}

function updateStats() {
  const totalQuotes = quotes.length;
  const categories = [...new Set(quotes.map(quote => quote.category))];
  const categoryCounts = {};
  
  quotes.forEach(quote => {
    categoryCounts[quote.category] = (categoryCounts[quote.category] || 0) + 1;
  });

  const mostPopularCategory = Object.keys(categoryCounts).reduce((a, b) => 
    categoryCounts[a] > categoryCounts[b] ? a : b, Object.keys(categoryCounts)[0]);

  const storageInfo = userPreferences.autoSave ? 'Enabled' : 'Disabled';

  statsDiv.innerHTML = `
    <strong>Statistics:</strong><br>
    Total Quotes: ${totalQuotes}<br>
    Categories: ${categories.length}<br>
    Most Popular Category: ${mostPopularCategory || 'N/A'} (${categoryCounts[mostPopularCategory] || 0} quotes)<br>
    Local Storage: ${storageInfo}
  `;
}

function updatePreferenceCheckboxes() {
  document.getElementById('autoSave').checked = userPreferences.autoSave;
  document.getElementById('rememberLastQuote').checked = userPreferences.rememberLastQuote;
  document.getElementById('darkMode').checked = userPreferences.darkMode;
}

function handlePreferenceChange(preference, value) {
  userPreferences[preference] = value;
  savePreferences();
  
  if (preference === 'darkMode') {
    toggleDarkMode(value);
  }
  
  updateStats();
}

function toggleDarkMode(enabled) {
  if (enabled) {
    document.body.style.backgroundColor = '#2c3e50';
    document.querySelector('.container').style.backgroundColor = '#34495e';
    document.querySelector('.container').style.color = '#ecf0f1';
  } else {
    document.body.style.backgroundColor = '#f5f5f5';
    document.querySelector('.container').style.backgroundColor = 'white';
    document.querySelector('.container').style.color = '#333';
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  
  switch(type) {
    case 'success':
      notification.style.backgroundColor = '#28a745';
      break;
    case 'error':
      notification.style.backgroundColor = '#dc3545';
      break;
    default:
      notification.style.backgroundColor = '#17a2b8';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function createAddQuoteForm() {
  const textInput = document.getElementById("newQuoteText");
  const charCounter = document.createElement('div');
  charCounter.id = 'charCounter';
  charCounter.style.cssText = 'font-size: 12px; color: #666; margin-top: 5px;';
  
  textInput.parentNode.appendChild(charCounter);
  
  textInput.addEventListener('input', function() {
    const length = this.value.length;
    charCounter.textContent = `${length} characters`;
    charCounter.style.color = length > 200 ? '#dc3545' : '#666';
  });
  
  const categoryInput = document.getElementById("newQuoteCategory");
  const suggestions = document.createElement('div');
  suggestions.id = 'categorySuggestions';
  suggestions.style.cssText = 'font-size: 12px; color: #666; margin-top: 5px;';
  
  categoryInput.parentNode.appendChild(suggestions);
  
  categoryInput.addEventListener('input', function() {
    const value = this.value.toLowerCase();
    const categories = [...new Set(quotes.map(quote => quote.category))];
    const matches = categories.filter(cat => 
      cat.toLowerCase().includes(value) && value.length > 0
    );
    
    if (matches.length > 0 && value.length > 0) {
      suggestions.innerHTML = `Suggestions: ${matches.slice(0, 3).join(', ')}`;
    } else {
      suggestions.innerHTML = '';
    }
  });
}

// Event Listeners
newQuoteBtn.addEventListener('click', showRandomQuote);
showAllQuotesBtn.addEventListener('click', showAllQuotes);
clearQuotesBtn.addEventListener('click', clearDisplay);

categorySelect.addEventListener('change', function() {
  currentCategoryFilter = this.value;
  if (quoteListDiv.innerHTML !== '') {
    showAllQuotes();
  }
});

// Preference change listeners
document.getElementById('autoSave').addEventListener('change', function() {
  handlePreferenceChange('autoSave', this.checked);
});

document.getElementById('rememberLastQuote').addEventListener('change', function() {
  handlePreferenceChange('rememberLastQuote', this.checked);
});

document.getElementById('darkMode').addEventListener('change', function() {
  handlePreferenceChange('darkMode', this.checked);
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Load data from storage
  loadPreferences();
  loadQuotes();
  loadSessionData();
  
  // Initialize UI
  updateCategorySelect();
  updateStats();
  updatePreferenceCheckboxes();
  createAddQuoteForm();
  
  // Show initial quote
  if (!userPreferences.rememberLastQuote || !quoteDisplay.textContent.includes('"')) {
    showRandomQuote();
  }
  
  // Apply dark mode if enabled
  if (userPreferences.darkMode) {
    toggleDarkMode(true);
  }
});

// Save session data before page unload
window.addEventListener('beforeunload', function() {
  saveSessionData();
});
