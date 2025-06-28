// Sample quotes data
let quotes = [
    { text: "The only way to do great work is to love what you do.", category: "Motivation" },
    { text: "Life is what happens when you're busy making other plans.", category: "Life" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", category: "Dreams" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Success" },
    { text: "In the middle of difficulty lies opportunity.", category: "Opportunity" },
    { text: "The best way to predict the future is to create it.", category: "Future" },
    { text: "Don't watch the clock; do what it does. Keep going.", category: "Persistence" },
    { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Belief" }
];

let currentCategoryFilter = 'all';

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const quoteList = document.getElementById('quoteList');
const stats = document.getElementById('stats');
const categoryFilter = document.getElementById('categoryFilter');

// Event listeners
document.getElementById('newQuote').addEventListener('click', showRandomQuote);
document.getElementById('showAllQuotes').addEventListener('click', showAllQuotes);
document.getElementById('clearQuotes').addEventListener('click', clearDisplay);

// Initialize the application
function init() {
    populateCategories();
    updateStats();
    showRandomQuote();
}

// Show a random quote
function showRandomQuote() {
    if (quotes.length === 0) {
        quoteDisplay.textContent = "No quotes available. Add some quotes first!";
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    
    quoteDisplay.innerHTML = `
        <div style="font-style: italic; margin-bottom: 10px;">"${quote.text}"</div>
        <div style="color: #666; font-size: 14px;">— ${quote.category}</div>
    `;
}

// Show all quotes
function showAllQuotes() {
    if (quotes.length === 0) {
        quoteDisplay.textContent = "No quotes available. Add some quotes first!";
        return;
    }
    
    let allQuotesHTML = '<h3>All Quotes:</h3>';
    quotes.forEach((quote, index) => {
        allQuotesHTML += `
            <div style="margin: 10px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                <div style="font-style: italic;">"${quote.text}"</div>
                <div style="color: #666; font-size: 12px;">— ${quote.category}</div>
            </div>
        `;
    });
    
    quoteDisplay.innerHTML = allQuotesHTML;
}

// Clear the display
function clearDisplay() {
    quoteDisplay.textContent = "Click 'Show New Quote' to get started!";
}

// Add a new quote
function addQuote() {
    const quoteText = document.getElementById('newQuoteText').value.trim();
    const quoteCategory = document.getElementById('newQuoteCategory').value.trim();
    
    if (!quoteText) {
        alert('Please enter a quote text!');
        return;
    }
    
    if (!quoteCategory) {
        alert('Please enter a category!');
        return;
    }
    
    const newQuote = {
        text: quoteText,
        category: quoteCategory
    };
    
    quotes.push(newQuote);
    
    // Clear the form
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    // Update the UI
    populateCategories();
    updateStats();
    updateQuoteList();
    
    // Show success message
    quoteDisplay.innerHTML = `
        <div style="color: #28a745; font-weight: bold;">Quote added successfully!</div>
        <div style="font-style: italic; margin-top: 10px;">"${newQuote.text}"</div>
        <div style="color: #666; font-size: 14px;">— ${newQuote.category}</div>
    `;
}

// Delete a quote
function deleteQuote(index) {
    if (confirm('Are you sure you want to delete this quote?')) {
        quotes.splice(index, 1);
        populateCategories();
        updateStats();
        updateQuoteList();
        
        quoteDisplay.innerHTML = '<div style="color: #28a745;">Quote deleted successfully!</div>';
    }
}

// Populate categories dropdown
function populateCategories() {
    const categories = ['all'];
    quotes.forEach(quote => {
        if (!categories.includes(quote.category)) {
            categories.push(quote.category);
        }
    });
    
    categoryFilter.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category === 'all' ? 'All Categories' : category;
        categoryFilter.appendChild(option);
    });
}

// Filter quotes by category
function filterQuotes() {
    currentCategoryFilter = categoryFilter.value;
    updateQuoteList();
}

// Update the quote list display
function updateQuoteList() {
    let filteredQuotes = quotes;
    
    if (currentCategoryFilter !== 'all') {
        filteredQuotes = quotes.filter(quote => quote.category === currentCategoryFilter);
    }
    
    if (filteredQuotes.length === 0) {
        quoteList.innerHTML = '<p>No quotes found for this category.</p>';
        return;
    }
    
    let quotesHTML = '<h3>Quote List:</h3>';
    filteredQuotes.forEach((quote, index) => {
        const originalIndex = quotes.indexOf(quote);
        quotesHTML += `
            <div class="quote-item">
                <div class="quote-text">"${quote.text}"</div>
                <div class="quote-category">— ${quote.category}</div>
                <button class="delete-btn" onclick="deleteQuote(${originalIndex})">Delete</button>
            </div>
        `;
    });
    
    quoteList.innerHTML = quotesHTML;
}

// Update statistics
function updateStats() {
    const totalQuotes = quotes.length;
    const categories = [...new Set(quotes.map(quote => quote.category))];
    const totalCategories = categories.length;
    
    stats.innerHTML = `
        <h3>Statistics</h3>
        <p><strong>Total Quotes:</strong> ${totalQuotes}</p>
        <p><strong>Total Categories:</strong> ${totalCategories}</p>
        <p><strong>Categories:</strong> ${categories.join(', ')}</p>
    `;
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);
