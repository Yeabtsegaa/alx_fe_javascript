// Storage keys
const STORAGE_KEYS = {
  QUOTES: 'dynamicQuoteGenerator_quotes',
  PREFERENCES: 'dynamicQuoteGenerator_preferences',
  LAST_QUOTE: 'dynamicQuoteGenerator_lastQuote',
  SESSION_PREFERENCES: 'dynamicQuoteGenerator_sessionPrefs',
  LAST_FILTER: 'dynamicQuoteGenerator_lastFilter',
  LAST_SYNC: 'dynamicQuoteGenerator_lastSync',
  SYNC_CONFLICTS: 'dynamicQuoteGenerator_syncConflicts'
};

// Server simulation configuration
const SERVER_CONFIG = {
  BASE_URL: 'https://jsonplaceholder.typicode.com',
  SYNC_INTERVAL: 30000, // 30 seconds
  MAX_RETRIES: 3,
  TIMEOUT: 5000
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
  darkMode: false,
  autoSync: true,
  syncInterval: 30
};
let syncInterval = null;
let lastSyncTimestamp = null;
let syncConflicts = [];
let isOnline = navigator.onLine;

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const showAllQuotesBtn = document.getElementById("showAllQuotes");
const clearQuotesBtn = document.getElementById("clearQuotes");
const categoryFilter = document.getElementById("categoryFilter");
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
    
    // Also save the last filter to localStorage for persistence across sessions
    if (currentCategoryFilter) {
      localStorage.setItem(STORAGE_KEYS.LAST_FILTER, currentCategoryFilter);
    } else {
      localStorage.removeItem(STORAGE_KEYS.LAST_FILTER);
    }
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
    
    // Load the last filter from localStorage for persistence across sessions
    const lastFilter = localStorage.getItem(STORAGE_KEYS.LAST_FILTER);
    if (lastFilter && !currentCategoryFilter) {
      currentCategoryFilter = lastFilter;
    }
  } catch (error) {
    console.error('Error loading session data:', error);
  }
}

// Enhanced JSON Import/Export Functions with better validation
function exportToJson() {
  try {
    // Validate quotes before export
    if (!quotes || quotes.length === 0) {
      showNotification('No quotes to export!', 'error');
      return;
    }

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
    
    showNotification(`Exported ${quotes.length} quotes successfully!`, 'success');
  } catch (error) {
    console.error('Error exporting quotes:', error);
    showNotification('Error exporting quotes', 'error');
  }
}

function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.name.toLowerCase().endsWith('.json')) {
    showNotification('Please select a valid JSON file', 'error');
    event.target.value = '';
    return;
  }

  // Validate file size (max 1MB)
  if (file.size > 1024 * 1024) {
    showNotification('File too large. Please select a file smaller than 1MB', 'error');
    event.target.value = '';
    return;
  }

  const fileReader = new FileReader();
  
  fileReader.onload = function(e) {
    try {
      const importedQuotes = JSON.parse(e.target.result);
      
      // Validate the imported data
      if (!Array.isArray(importedQuotes)) {
        throw new Error('Invalid JSON format: expected an array');
      }
      
      if (importedQuotes.length === 0) {
        throw new Error('JSON file contains no quotes');
      }
      
      // Validate each quote object
      const validQuotes = [];
      const invalidQuotes = [];
      
      importedQuotes.forEach((quote, index) => {
        if (quote && typeof quote.text === 'string' && typeof quote.category === 'string' && 
            quote.text.trim().length > 0 && quote.category.trim().length > 0) {
          validQuotes.push({
            text: quote.text.trim(),
            category: quote.category.trim()
          });
        } else {
          invalidQuotes.push(index + 1);
        }
      });
      
      if (validQuotes.length === 0) {
        throw new Error('No valid quotes found in the file');
      }
      
      // Check for duplicates
      const existingQuotes = quotes.map(q => `${q.text.toLowerCase()}-${q.category.toLowerCase()}`);
      const newQuotes = validQuotes.filter(quote => 
        !existingQuotes.includes(`${quote.text.toLowerCase()}-${quote.category.toLowerCase()}`)
      );
      
      if (newQuotes.length === 0) {
        showNotification('All quotes in the file already exist!', 'info');
        event.target.value = '';
        return;
      }
      
      // Add imported quotes to existing quotes
      quotes.push(...newQuotes);
      
      // Save to local storage
      saveQuotes();
      
      // Update UI
      populateCategories();
      updateStats();
      
      // Show detailed import results
      let message = `${newQuotes.length} quotes imported successfully!`;
      if (invalidQuotes.length > 0) {
        message += ` ${invalidQuotes.length} invalid quotes skipped.`;
      }
      if (validQuotes.length > newQuotes.length) {
        message += ` ${validQuotes.length - newQuotes.length} duplicates ignored.`;
      }
      
      showNotification(message, 'success');
      
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
      // Stop auto-sync
      stopAutoSync();
      
      // Clear local storage
      localStorage.removeItem(STORAGE_KEYS.QUOTES);
      localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      localStorage.removeItem(STORAGE_KEYS.LAST_FILTER);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
      localStorage.removeItem(STORAGE_KEYS.SYNC_CONFLICTS);
      
      // Clear session storage
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_PREFERENCES);
      
      // Reset quotes to defaults
      quotes = [...DEFAULT_QUOTES];
      
      // Reset preferences
      userPreferences = {
        autoSave: true,
        rememberLastQuote: false,
        darkMode: false,
        autoSync: true,
        syncInterval: 30
      };
      
      // Reset filter state
      currentCategoryFilter = "";
      
      // Reset sync state
      lastSyncTimestamp = null;
      syncConflicts = [];
      
      // Update UI
      populateCategories();
      updateStats();
      clearDisplay();
      
      // Update preference checkboxes
      updatePreferenceCheckboxes();
      
      // Update sync status
      updateSyncStatus();
      
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

  // Check if this is a new category
  const existingCategories = [...new Set(quotes.map(quote => quote.category))];
  const isNewCategory = !existingCategories.includes(newCategory);

  // Add new quote to the array
  quotes.push({ text: newText, category: newCategory });

  // Clear input fields
  textInput.value = "";
  categoryInput.value = "";

  // Save to storage
  saveQuotes();

  // Update the UI - this will also update the categories dropdown if a new category was introduced
  populateCategories();
  updateStats();
  
  // Show the newly added quote
  quoteDisplay.innerHTML = `
    <div style="font-size: 1.4em; margin-bottom: 10px; color: #28a745;">"${newText}"</div>
    <div style="color: #666; font-size: 0.9em;">— ${newCategory} (Newly Added!)</div>
  `;

  // Show success message with category information
  const successMessage = isNewCategory 
    ? `Quote added successfully! New category "${newCategory}" created.`
    : 'Quote added successfully!';
  showNotification(successMessage, 'success');
}

function deleteQuote(index) {
  if (confirm('Are you sure you want to delete this quote?')) {
    const deletedQuote = quotes[index];
    quotes.splice(index, 1);
    saveQuotes();
    
    // Check if this was the last quote in its category
    const remainingQuotesInCategory = quotes.filter(quote => quote.category === deletedQuote.category);
    const categoryRemoved = remainingQuotesInCategory.length === 0;
    
    // Update the UI
    populateCategories();
    updateStats();
    
    // Update the display if showing all quotes
    if (quoteListDiv.innerHTML !== '') {
      showAllQuotes();
    }
    
    // Show appropriate notification
    const notificationMessage = categoryRemoved 
      ? `Quote deleted. Category "${deletedQuote.category}" is now empty.`
      : 'Quote deleted successfully!';
    showNotification(notificationMessage, 'info');
  }
}

function updateCategorySelect() {
  populateCategories();
}

// Function to populate categories dynamically (as required by the task)
function populateCategories() {
  try {
    // Extract unique categories from the quotes array
    const categories = [...new Set(quotes.map(quote => quote.category))];
    
    // Sort categories alphabetically for better user experience
    categories.sort();
    
    // Clear existing options and add the default "All Categories" option
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    // If no categories exist, show a message
    if (categories.length === 0) {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "No categories available";
      option.disabled = true;
      categoryFilter.appendChild(option);
      return;
    }
    
    // Populate the dropdown with categories
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      
      // Count quotes in this category for better UX
      const quoteCount = quotes.filter(quote => quote.category === category).length;
      option.textContent = `${category} (${quoteCount})`;
      
      categoryFilter.appendChild(option);
    });
    
    // Restore current filter if it exists and is still valid
    if (currentCategoryFilter && categories.includes(currentCategoryFilter)) {
      categoryFilter.value = currentCategoryFilter;
    } else if (currentCategoryFilter && !categories.includes(currentCategoryFilter)) {
      // If the current filter is no longer valid, reset it
      currentCategoryFilter = "";
      categoryFilter.value = "all";
      showNotification(`Category "${currentCategoryFilter}" no longer exists. Filter reset.`, 'info');
    }
    
    console.log(`Categories populated: ${categories.length} categories found`);
    
  } catch (error) {
    console.error('Error populating categories:', error);
    showNotification('Error loading categories', 'error');
    
    // Fallback: show basic options
    categoryFilter.innerHTML = `
      <option value="all">All Categories</option>
      <option value="" disabled>Error loading categories</option>
    `;
  }
}

// Function to filter quotes based on selected category (as required by the task)
function filterQuotes() {
  try {
    const selectedCategory = categoryFilter.value;
    
    // Update the current filter state
    if (selectedCategory === 'all') {
      currentCategoryFilter = "";
    } else {
      currentCategoryFilter = selectedCategory;
    }
    
    // Save the filter preference to web storage
    saveSessionData();
    
    // Update the display based on current view
    if (quoteListDiv.innerHTML !== '') {
      // If showing all quotes, update the list
      showAllQuotes();
    } else {
      // If showing a single quote, show a new random quote from the filtered category
      showRandomQuote();
    }
    
    // Update statistics to reflect the current filter
    updateStats();
    
    // Show notification about the filter change
    const filterMessage = currentCategoryFilter 
      ? `Filtered to show quotes from category: "${currentCategoryFilter}"`
      : 'Showing quotes from all categories';
    showNotification(filterMessage, 'info');
    
    console.log(`Filter applied: ${currentCategoryFilter || 'All categories'}`);
    
  } catch (error) {
    console.error('Error applying filter:', error);
    showNotification('Error applying filter', 'error');
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
  document.getElementById('autoSync').checked = userPreferences.autoSync;
  document.getElementById('syncInterval').value = userPreferences.syncInterval;
}

function handlePreferenceChange(preference, value) {
  userPreferences[preference] = value;
  savePreferences();
  
  if (preference === 'darkMode') {
    toggleDarkMode(value);
  } else if (preference === 'autoSync') {
    if (value) {
      startAutoSync();
    } else {
      stopAutoSync();
    }
    updateSyncStatus();
  } else if (preference === 'syncInterval') {
    if (userPreferences.autoSync) {
      startAutoSync(); // Restart with new interval
    }
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

document.getElementById('autoSync').addEventListener('change', function() {
  handlePreferenceChange('autoSync', this.checked);
});

document.getElementById('syncInterval').addEventListener('change', function() {
  handlePreferenceChange('syncInterval', parseInt(this.value));
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

// Function to validate categories population (for debugging and testing)
function validateCategoriesPopulation() {
  const categories = [...new Set(quotes.map(quote => quote.category))];
  const dropdownOptions = Array.from(categoryFilter.options).map(option => option.value);
  
  console.log('Categories validation:');
  console.log('- Quotes array categories:', categories);
  console.log('- Dropdown options:', dropdownOptions);
  console.log('- Current filter:', currentCategoryFilter);
  
  // Check if all categories from quotes are in the dropdown
  const missingCategories = categories.filter(cat => !dropdownOptions.includes(cat));
  if (missingCategories.length > 0) {
    console.warn('Missing categories in dropdown:', missingCategories);
    return false;
  }
  
  // Check if current filter is valid
  if (currentCategoryFilter && !categories.includes(currentCategoryFilter)) {
    console.warn('Current filter is invalid:', currentCategoryFilter);
    return false;
  }
  
  console.log('Categories validation passed');
  return true;
}

// Test function to verify populateCategories functionality
function testPopulateCategories() {
  console.log('=== Testing populateCategories Function ===');
  
  // Test 1: Check if function exists
  if (typeof populateCategories === 'function') {
    console.log('✓ populateCategories function exists');
  } else {
    console.error('✗ populateCategories function not found');
    return false;
  }
  
  // Test 2: Check if categoryFilter element exists
  if (categoryFilter) {
    console.log('✓ categoryFilter element found');
  } else {
    console.error('✗ categoryFilter element not found');
    return false;
  }
  
  // Test 3: Check if quotes array has data
  if (quotes && quotes.length > 0) {
    console.log(`✓ Quotes array has ${quotes.length} items`);
  } else {
    console.error('✗ Quotes array is empty or undefined');
    return false;
  }
  
  // Test 4: Manually trigger populateCategories
  console.log('Triggering populateCategories...');
  populateCategories();
  
  // Test 5: Validate the results
  const validationResult = validateCategoriesPopulation();
  
  if (validationResult) {
    console.log('✓ All tests passed!');
    showNotification('Categories population test passed!', 'success');
    return true;
  } else {
    console.error('✗ Some tests failed');
    showNotification('Categories population test failed!', 'error');
    return false;
  }
}

// Test function to verify web storage functionality
function testWebStorage() {
  console.log('=== Testing Web Storage Functionality ===');
  
  let allTestsPassed = true;
  
  // Test 1: Check if localStorage is available
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('✓ localStorage is available');
  } catch (error) {
    console.error('✗ localStorage is not available:', error);
    allTestsPassed = false;
  }
  
  // Test 2: Check if sessionStorage is available
  try {
    sessionStorage.setItem('test', 'test');
    sessionStorage.removeItem('test');
    console.log('✓ sessionStorage is available');
  } catch (error) {
    console.error('✗ sessionStorage is not available:', error);
    allTestsPassed = false;
  }
  
  // Test 3: Test saveQuotes function
  try {
    const originalQuotes = [...quotes];
    const testQuotes = [{ text: 'Test quote', category: 'Test' }];
    quotes = testQuotes;
    saveQuotes();
    
    const savedData = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      if (Array.isArray(parsedData) && parsedData.length === 1) {
        console.log('✓ saveQuotes function works correctly');
      } else {
        console.error('✗ saveQuotes function failed validation');
        allTestsPassed = false;
      }
    } else {
      console.error('✗ saveQuotes function failed to save data');
      allTestsPassed = false;
    }
    
    // Restore original quotes
    quotes = originalQuotes;
    saveQuotes();
  } catch (error) {
    console.error('✗ saveQuotes test failed:', error);
    allTestsPassed = false;
  }
  
  // Test 4: Test JSON export functionality
  try {
    if (typeof exportToJson === 'function') {
      console.log('✓ exportToJson function exists');
    } else {
      console.error('✗ exportToJson function not found');
      allTestsPassed = false;
    }
  } catch (error) {
    console.error('✗ exportToJson test failed:', error);
    allTestsPassed = false;
  }
  
  // Test 5: Test JSON import functionality
  try {
    if (typeof importFromJsonFile === 'function') {
      console.log('✓ importFromJsonFile function exists');
    } else {
      console.error('✗ importFromJsonFile function not found');
      allTestsPassed = false;
    }
  } catch (error) {
    console.error('✗ importFromJsonFile test failed:', error);
    allTestsPassed = false;
  }
  
  if (allTestsPassed) {
    console.log('✓ All web storage tests passed!');
    showNotification('Web storage tests passed!', 'success');
    return true;
  } else {
    console.error('✗ Some web storage tests failed');
    showNotification('Web storage tests failed!', 'error');
    return false;
  }
}

// Function to create sample JSON data for testing
function createSampleJsonData() {
  const sampleQuotes = [
    { text: "Sample quote 1", category: "Sample" },
    { text: "Sample quote 2", category: "Test" },
    { text: "Sample quote 3", category: "Demo" }
  ];
  
  const dataStr = JSON.stringify(sampleQuotes, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sample_quotes.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showNotification('Sample JSON file created!', 'success');
}

// Test function to verify sync functionality
function testSyncFunctionality() {
  console.log('=== Testing Sync Functionality ===');
  
  let allTestsPassed = true;
  
  // Test 1: Check if sync functions exist
  const syncFunctions = ['syncWithServer', 'mergeQuotes', 'detectConflicts', 'resolveConflict'];
  syncFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      console.log(`✓ ${funcName} function exists`);
    } else {
      console.error(`✗ ${funcName} function not found`);
      allTestsPassed = false;
    }
  });
  
  // Test 2: Test mergeQuotes function
  try {
    const localQuotes = [{ text: 'Local quote', category: 'Test' }];
    const serverQuotes = [{ text: 'Server quote', category: 'Test' }];
    const merged = mergeQuotes(localQuotes, serverQuotes);
    
    if (merged.length === 2) {
      console.log('✓ mergeQuotes function works correctly');
    } else {
      console.error('✗ mergeQuotes function failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.error('✗ mergeQuotes test failed:', error);
    allTestsPassed = false;
  }
  
  // Test 3: Test conflict detection
  try {
    const localQuotes = [{ text: 'Same quote', category: 'Test' }];
    const serverQuotes = [{ text: 'Different quote', category: 'Test' }];
    const conflicts = detectConflicts(localQuotes, serverQuotes);
    
    if (Array.isArray(conflicts)) {
      console.log('✓ detectConflicts function works correctly');
    } else {
      console.error('✗ detectConflicts function failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.error('✗ detectConflicts test failed:', error);
    allTestsPassed = false;
  }
  
  // Test 4: Check network status
  console.log(`✓ Network status: ${isOnline ? 'Online' : 'Offline'}`);
  
  // Test 5: Check auto-sync status
  console.log(`✓ Auto-sync: ${userPreferences.autoSync ? 'Enabled' : 'Disabled'}`);
  
  if (allTestsPassed) {
    console.log('✓ All sync tests passed!');
    showNotification('Sync functionality tests passed!', 'success');
    return true;
  } else {
    console.error('✗ Some sync tests failed');
    showNotification('Sync functionality tests failed!', 'error');
    return false;
  }
}

// Make test functions available globally for manual testing
window.testPopulateCategories = testPopulateCategories;
window.testWebStorage = testWebStorage;
window.testSyncFunctionality = testSyncFunctionality;
window.createSampleJsonData = createSampleJsonData;

// Comprehensive validation function for all functionality
function validateAllFunctionality() {
  console.log('=== Comprehensive Functionality Validation ===');
  
  const results = {
    webStorage: false,
    jsonExport: false,
    jsonImport: false,
    categories: false,
    sessionStorage: false
  };
  
  // Test web storage
  try {
    localStorage.setItem('validation_test', 'test');
    const testValue = localStorage.getItem('validation_test');
    localStorage.removeItem('validation_test');
    results.webStorage = testValue === 'test';
    console.log(`✓ Web Storage: ${results.webStorage ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('✗ Web Storage test failed:', error);
  }
  
  // Test session storage
  try {
    sessionStorage.setItem('validation_test', 'test');
    const testValue = sessionStorage.getItem('validation_test');
    sessionStorage.removeItem('validation_test');
    results.sessionStorage = testValue === 'test';
    console.log(`✓ Session Storage: ${results.sessionStorage ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('✗ Session Storage test failed:', error);
  }
  
  // Test JSON export
  try {
    results.jsonExport = typeof exportToJson === 'function';
    console.log(`✓ JSON Export: ${results.jsonExport ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('✗ JSON Export test failed:', error);
  }
  
  // Test JSON import
  try {
    results.jsonImport = typeof importFromJsonFile === 'function';
    console.log(`✓ JSON Import: ${results.jsonImport ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('✗ JSON Import test failed:', error);
  }
  
  // Test categories functionality
  try {
    results.categories = typeof populateCategories === 'function' && categoryFilter;
    console.log(`✓ Categories: ${results.categories ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('✗ Categories test failed:', error);
  }
  
  // Summary
  const allPassed = Object.values(results).every(result => result === true);
  console.log(`\n=== Validation Summary ===`);
  console.log(`Overall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  if (allPassed) {
    showNotification('All functionality validated successfully!', 'success');
  } else {
    showNotification('Some functionality validation failed. Check console for details.', 'error');
  }
  
  return allPassed;
}

// Automatic Syncing Functions
function startAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  if (userPreferences.autoSync && isOnline) {
    const intervalMs = userPreferences.syncInterval * 1000;
    syncInterval = setInterval(async () => {
      if (isOnline) {
        await syncWithServer();
      }
    }, intervalMs);
    
    console.log(`Auto-sync started with ${userPreferences.syncInterval}s interval`);
  }
}

function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Auto-sync stopped');
  }
}

function updateSyncStatus() {
  const syncStatus = document.getElementById('syncStatus');
  if (syncStatus) {
    const status = isOnline ? 'Online' : 'Offline';
    const syncState = userPreferences.autoSync ? 'Auto-sync enabled' : 'Auto-sync disabled';
    const lastSync = lastSyncTimestamp ? 
      `Last sync: ${new Date(lastSyncTimestamp).toLocaleTimeString()}` : 
      'Never synced';
    
    syncStatus.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span><strong>Status:</strong> ${status}</span>
        <span><strong>${syncState}</strong></span>
      </div>
      <div style="font-size: 12px; color: #666;">${lastSync}</div>
      ${syncConflicts.length > 0 ? `<div style="color: #dc3545; font-size: 12px;">${syncConflicts.length} unresolved conflicts</div>` : ''}
    `;
  }
}

// Network status monitoring
function setupNetworkMonitoring() {
  window.addEventListener('online', () => {
    isOnline = true;
    showNotification('Internet connection restored', 'success');
    updateSyncStatus();
    if (userPreferences.autoSync) {
      startAutoSync();
    }
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    showNotification('Internet connection lost', 'warning');
    updateSyncStatus();
    stopAutoSync();
  });
}

// Manual sync functions
function manualSync() {
  if (!isOnline) {
    showNotification('Cannot sync: No internet connection', 'error');
    return;
  }
  
  syncWithServer().then(success => {
    if (success) {
      updateSyncStatus();
    }
  });
}

function forceSync() {
  if (!isOnline) {
    showNotification('Cannot sync: No internet connection', 'error');
    return;
  }
  
  showNotification('Force syncing with server...', 'info');
  
  // Clear any existing conflicts and force sync
  syncConflicts = [];
  saveSyncConflicts();
  
  syncWithServer().then(success => {
    if (success) {
      updateSyncStatus();
      showNotification('Force sync completed', 'success');
    }
  });
}

// Data Syncing Functions
async function syncWithServer() {
  if (!isOnline) {
    showNotification('Cannot sync: No internet connection', 'error');
    return false;
  }

  try {
    console.log('Starting server sync...');
    showNotification('Syncing with server...', 'info');

    // Fetch data from server
    const serverResponse = await simulateServerFetch();
    
    if (!serverResponse.success) {
      throw new Error(serverResponse.error);
    }

    const serverQuotes = serverResponse.data;
    const localQuotes = [...quotes];
    
    // Merge server and local data
    const mergedQuotes = mergeQuotes(localQuotes, serverQuotes);
    
    // Check for conflicts
    const conflicts = detectConflicts(localQuotes, serverQuotes);
    
    if (conflicts.length > 0) {
      syncConflicts = conflicts;
      saveSyncConflicts();
      showConflictResolutionDialog(conflicts);
    } else {
      // Update local data with merged quotes
      quotes = mergedQuotes;
      saveQuotes();
      
      // Update UI
      populateCategories();
      updateStats();
      
      // Post updated data back to server
      const postResponse = await simulateServerPost(quotes);
      
      if (postResponse.success) {
        lastSyncTimestamp = Date.now();
        saveLastSyncTimestamp();
        showNotification(`Sync completed successfully! ${mergedQuotes.length - localQuotes.length} new quotes added.`, 'success');
      } else {
        showNotification('Sync completed but failed to update server', 'warning');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    showNotification(`Sync failed: ${error.message}`, 'error');
    return false;
  }
}

function mergeQuotes(localQuotes, serverQuotes) {
  const merged = [...localQuotes];
  const localIds = new Set(localQuotes.map(q => q.id || q.text + q.category));
  
  serverQuotes.forEach(serverQuote => {
    const serverId = serverQuote.id || serverQuote.text + serverQuote.category;
    
    if (!localIds.has(serverId)) {
      // Add new server quote
      merged.push({
        ...serverQuote,
        source: 'server',
        syncedAt: Date.now()
      });
    } else {
      // Update existing quote if server version is newer
      const localIndex = merged.findIndex(q => 
        (q.id || q.text + q.category) === serverId
      );
      
      if (localIndex !== -1) {
        const localQuote = merged[localIndex];
        if (serverQuote.timestamp > (localQuote.timestamp || 0)) {
          merged[localIndex] = {
            ...serverQuote,
            source: 'server',
            syncedAt: Date.now()
          };
        }
      }
    }
  });
  
  return merged;
}

function detectConflicts(localQuotes, serverQuotes) {
  const conflicts = [];
  
  localQuotes.forEach(localQuote => {
    const localId = localQuote.id || localQuote.text + localQuote.category;
    const serverQuote = serverQuotes.find(sq => 
      (sq.id || sq.text + sq.category) === localId
    );
    
    if (serverQuote) {
      // Check if there are differences in the same quote
      if (localQuote.text !== serverQuote.text || localQuote.category !== serverQuote.category) {
        conflicts.push({
          id: localId,
          local: localQuote,
          server: serverQuote,
          type: 'content_conflict',
          timestamp: Date.now()
        });
      }
    }
  });
  
  return conflicts;
}

function resolveConflict(conflictId, resolution) {
  const conflict = syncConflicts.find(c => c.id === conflictId);
  if (!conflict) return;
  
  switch (resolution) {
    case 'local':
      // Keep local version
      showNotification('Keeping local version', 'info');
      break;
    case 'server':
      // Use server version
      const localIndex = quotes.findIndex(q => 
        (q.id || q.text + q.category) === conflictId
      );
      if (localIndex !== -1) {
        quotes[localIndex] = {
          ...conflict.server,
          source: 'server',
          syncedAt: Date.now()
        };
        saveQuotes();
        populateCategories();
        updateStats();
        showNotification('Using server version', 'info');
      }
      break;
    case 'merge':
      // Merge both versions (keep both)
      const mergedQuote = {
        ...conflict.local,
        text: `${conflict.local.text} (Merged: ${conflict.server.text})`,
        category: conflict.local.category,
        source: 'merged',
        syncedAt: Date.now()
      };
      
      const localIndex2 = quotes.findIndex(q => 
        (q.id || q.text + q.category) === conflictId
      );
      if (localIndex2 !== -1) {
        quotes[localIndex2] = mergedQuote;
        saveQuotes();
        populateCategories();
        updateStats();
        showNotification('Merged both versions', 'info');
      }
      break;
  }
  
  // Remove resolved conflict
  syncConflicts = syncConflicts.filter(c => c.id !== conflictId);
  saveSyncConflicts();
  
  // Update conflict dialog if still open
  updateConflictDialog();
}

function showConflictResolutionDialog(conflicts) {
  const dialog = document.createElement('div');
  dialog.id = 'conflictDialog';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #dc3545;
    border-radius: 10px;
    padding: 20px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  
  dialog.innerHTML = `
    <h3 style="color: #dc3545; margin-top: 0;">Data Conflicts Detected</h3>
    <p>Some quotes have been modified on the server. Choose how to resolve each conflict:</p>
    <div id="conflictList"></div>
    <div style="margin-top: 20px; text-align: right;">
      <button onclick="closeConflictDialog()" style="background-color: #6c757d; margin-left: 10px;">Close</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  updateConflictDialog();
  
  showNotification(`${conflicts.length} conflicts detected. Please resolve them.`, 'warning');
}

function updateConflictDialog() {
  const conflictList = document.getElementById('conflictList');
  if (!conflictList) return;
  
  conflictList.innerHTML = '';
  
  syncConflicts.forEach(conflict => {
    const conflictDiv = document.createElement('div');
    conflictDiv.style.cssText = `
      border: 1px solid #ddd;
      margin: 10px 0;
      padding: 15px;
      border-radius: 5px;
      background-color: #f8f9fa;
    `;
    
    conflictDiv.innerHTML = `
      <h4>Conflict: ${conflict.local.text.substring(0, 50)}...</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 10px 0;">
        <div>
          <strong>Local Version:</strong>
          <p><em>"${conflict.local.text}"</em></p>
          <p>Category: ${conflict.local.category}</p>
        </div>
        <div>
          <strong>Server Version:</strong>
          <p><em>"${conflict.server.text}"</em></p>
          <p>Category: ${conflict.server.category}</p>
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button onclick="resolveConflict('${conflict.id}', 'local')" style="background-color: #28a745;">Keep Local</button>
        <button onclick="resolveConflict('${conflict.id}', 'server')" style="background-color: #007bff;">Use Server</button>
        <button onclick="resolveConflict('${conflict.id}', 'merge')" style="background-color: #ffc107; color: #212529;">Merge Both</button>
      </div>
    `;
    
    conflictList.appendChild(conflictDiv);
  });
  
  if (syncConflicts.length === 0) {
    conflictList.innerHTML = '<p style="color: #28a745;">All conflicts resolved!</p>';
  }
}

function closeConflictDialog() {
  const dialog = document.getElementById('conflictDialog');
  if (dialog) {
    dialog.remove();
  }
}

// Storage functions for sync data
function saveLastSyncTimestamp() {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastSyncTimestamp.toString());
  } catch (error) {
    console.error('Error saving last sync timestamp:', error);
  }
}

function loadLastSyncTimestamp() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    lastSyncTimestamp = saved ? parseInt(saved) : null;
  } catch (error) {
    console.error('Error loading last sync timestamp:', error);
  }
}

function saveSyncConflicts() {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_CONFLICTS, JSON.stringify(syncConflicts));
  } catch (error) {
    console.error('Error saving sync conflicts:', error);
  }
}

function loadSyncConflicts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SYNC_CONFLICTS);
    syncConflicts = saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading sync conflicts:', error);
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Load data from storage
  loadPreferences();
  loadQuotes();
  loadSessionData();
  loadLastSyncTimestamp();
  loadSyncConflicts();
  
  // Initialize UI
  populateCategories();
  updateStats();
  updatePreferenceCheckboxes();
  createAddQuoteForm();
  
  // Setup network monitoring
  setupNetworkMonitoring();
  
  // Start auto-sync if enabled
  if (userPreferences.autoSync) {
    startAutoSync();
  }
  
  // Validate categories population
  setTimeout(() => {
    validateCategoriesPopulation();
  }, 100);
  
  // Comprehensive validation
  setTimeout(() => {
    validateAllFunctionality();
  }, 200);
  
  // Show initial quote
  if (!userPreferences.rememberLastQuote || !quoteDisplay.textContent.includes('"')) {
    showRandomQuote();
  }
  
  // Apply dark mode if enabled
  if (userPreferences.darkMode) {
    toggleDarkMode(true);
  }
  
  // Update sync status
  updateSyncStatus();
});

// Save session data before page unload
window.addEventListener('beforeunload', function() {
  saveSessionData();
});

// Server Simulation Functions
async function simulateServerFetch() {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate server data with some random quotes
    const serverQuotes = [
      { id: 1, text: "Server quote 1", category: "Server", timestamp: Date.now() - 3600000 },
      { id: 2, text: "Server quote 2", category: "Test", timestamp: Date.now() - 1800000 },
      { id: 3, text: "Server quote 3", category: "Demo", timestamp: Date.now() - 900000 }
    ];
    
    // Randomly add or remove quotes to simulate server changes
    if (Math.random() > 0.7) {
      serverQuotes.push({
        id: Date.now(),
        text: `New server quote ${Date.now()}`,
        category: "New",
        timestamp: Date.now()
      });
    }
    
    return {
      success: true,
      data: serverQuotes,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Server fetch simulation failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

async function simulateServerPost(quotes) {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate server response
    const response = {
      success: true,
      message: 'Data synced successfully',
      timestamp: Date.now(),
      conflicts: []
    };
    
    // Simulate potential conflicts
    if (Math.random() > 0.8) {
      response.conflicts = [
        {
          type: 'conflict',
          message: 'Server has newer version of some quotes',
          timestamp: Date.now()
        }
      ];
    }
    
    return response;
  } catch (error) {
    console.error('Server post simulation failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// Real API functions (using JSONPlaceholder for actual server interaction)
async function fetchFromServer() {
  try {
    const response = await fetch(`${SERVER_CONFIG.BASE_URL}/posts?_limit=5`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const posts = await response.json();
    
    // Convert posts to quotes format
    const serverQuotes = posts.map((post, index) => ({
      id: post.id,
      text: post.title,
      category: `Server-${index + 1}`,
      timestamp: Date.now() - (index * 60000)
    }));
    
    return {
      success: true,
      data: serverQuotes,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to fetch from server:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

async function postToServer(quotes) {
  try {
    const response = await fetch(`${SERVER_CONFIG.BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Quote Sync - ${new Date().toISOString()}`,
        body: JSON.stringify(quotes),
        userId: 1
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      message: 'Data synced to server',
      timestamp: Date.now(),
      serverId: result.id
    };
  } catch (error) {
    console.error('Failed to post to server:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// Test sync functionality
testSyncFunctionality()

// Manual sync
manualSync()

// Force sync
forceSync()

// Check sync status
console.log('Network status:', navigator.onLine)
console.log('Auto-sync enabled:', userPreferences.autoSync)
console.log('Last sync:', lastSyncTimestamp ? new Date(lastSyncTimestamp) : 'Never')
