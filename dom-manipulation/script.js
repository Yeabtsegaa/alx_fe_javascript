// Array to store quotes with more initial data
let quotes = [
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

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const showAllQuotesBtn = document.getElementById("showAllQuotes");
const clearQuotesBtn = document.getElementById("clearQuotes");
const categorySelect = document.getElementById("categorySelect");
const statsDiv = document.getElementById("stats");
const quoteListDiv = document.getElementById("quoteList");

// Current filter state
let currentCategoryFilter = "";

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  updateCategorySelect();
  updateStats();
  showRandomQuote();
});

// Function to show a random quote
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
}

// Function to show all quotes in a list format
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

// Function to clear the display
function clearDisplay() {
  quoteDisplay.innerHTML = 'Click "Show New Quote" to get started!';
  quoteListDiv.innerHTML = '';
}

// Function to add a new quote
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

// Function to delete a quote
function deleteQuote(index) {
  if (confirm('Are you sure you want to delete this quote?')) {
    quotes.splice(index, 1);
    updateCategorySelect();
    updateStats();
    showAllQuotes();
    showNotification('Quote deleted successfully!', 'info');
  }
}

// Function to update category select dropdown
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
}

// Function to update statistics
function updateStats() {
  const totalQuotes = quotes.length;
  const categories = [...new Set(quotes.map(quote => quote.category))];
  const categoryCounts = {};
  
  quotes.forEach(quote => {
    categoryCounts[quote.category] = (categoryCounts[quote.category] || 0) + 1;
  });

  const mostPopularCategory = Object.keys(categoryCounts).reduce((a, b) => 
    categoryCounts[a] > categoryCounts[b] ? a : b, Object.keys(categoryCounts)[0]);

  statsDiv.innerHTML = `
    <strong>Statistics:</strong><br>
    Total Quotes: ${totalQuotes}<br>
    Categories: ${categories.length}<br>
    Most Popular Category: ${mostPopularCategory || 'N/A'} (${categoryCounts[mostPopularCategory] || 0} quotes)
  `;
}

// Function to show notifications
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

// Function to create add quote form (as requested in the task)
function createAddQuoteForm() {
  // This function creates a dynamic form for adding quotes
  // The form is already in the HTML, but we can enhance it dynamically
  
  const formSection = document.querySelector('.form-section');
  
  // Add a character counter
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
  
  // Add category suggestions
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

// Event listeners
newQuoteBtn.addEventListener('click', showRandomQuote);
showAllQuotesBtn.addEventListener('click', showAllQuotes);
clearQuotesBtn.addEventListener('click', clearDisplay);

categorySelect.addEventListener('change', function() {
  currentCategoryFilter = this.value;
  if (quoteListDiv.innerHTML !== '') {
    showAllQuotes();
  }
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

// Initialize the enhanced form
document.addEventListener('DOMContentLoaded', function() {
  createAddQuoteForm();
});
