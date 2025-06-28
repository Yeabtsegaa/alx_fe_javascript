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
let syncInterval;
let isOnline = navigator.onLine;
let lastSyncTime = null;
let pendingChanges = [];
let syncInProgress = false;

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const quoteList = document.getElementById('quoteList');
const stats = document.getElementById('stats');
const categoryFilter = document.getElementById('categoryFilter');

// Event listeners
document.getElementById('newQuote').addEventListener('click', showRandomQuote);
document.getElementById('showAllQuotes').addEventListener('click', showAllQuotes);
document.getElementById('clearQuotes').addEventListener('click', clearDisplay);

// Network status monitoring
window.addEventListener('online', () => {
    isOnline = true;
    showNotification('Connection restored. Syncing with server...', 'success');
    syncQuotes();
});

window.addEventListener('offline', () => {
    isOnline = false;
    showNotification('Connection lost. Working offline.', 'warning');
});

// Initialize the application
function init() {
    populateCategories();
    updateStats();
    showRandomQuote();
    startPeriodicSync();
    loadFromLocalStorage();
}

// Mock API functions using JSONPlaceholder simulation
async function fetchQuotesFromServer() {
    try {
        // Simulate JSONPlaceholder API call
        const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=10');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const posts = await response.json();
        
        // Convert posts to quotes format
        const serverQuotes = posts.map((post, index) => ({
            text: post.title,
            category: getRandomCategory(),
            id: post.id
        }));
        
        // Add some predefined quotes to simulate server data
        const additionalQuotes = [
            { text: "Innovation distinguishes between a leader and a follower.", category: "Leadership", id: 101 },
            { text: "The journey of a thousand miles begins with one step.", category: "Motivation", id: 102 },
            { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", category: "Success", id: 103 },
            { text: "The only impossible journey is the one you never begin.", category: "Motivation", id: 104 },
            { text: "Believe you can and you're halfway there.", category: "Belief", id: 105 }
        ];
        
        return [...serverQuotes, ...additionalQuotes];
        
    } catch (error) {
        console.error('Error fetching quotes from server:', error);
        
        // Fallback to mock data if API fails
        return [
            { text: "Innovation distinguishes between a leader and a follower.", category: "Leadership", id: 101 },
            { text: "The journey of a thousand miles begins with one step.", category: "Motivation", id: 102 },
            { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", category: "Success", id: 103 },
            { text: "The only impossible journey is the one you never begin.", category: "Motivation", id: 104 },
            { text: "Believe you can and you're halfway there.", category: "Belief", id: 105 }
        ];
    }
}

async function postQuotesToServer(quotesData) {
    try {
        // Simulate posting to JSONPlaceholder API
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: 'Quote Sync',
                body: JSON.stringify(quotesData),
                userId: 1
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Data posted to server successfully:', result);
        
        return { success: true, message: 'Data synced successfully', id: result.id };
        
    } catch (error) {
        console.error('Error posting quotes to server:', error);
        throw error;
    }
}

// Helper function to get random category
function getRandomCategory() {
    const categories = ['Motivation', 'Success', 'Life', 'Leadership', 'Belief', 'Dreams', 'Persistence', 'Opportunity'];
    return categories[Math.floor(Math.random() * categories.length)];
}

// Legacy function for backward compatibility
async function fetchFromServer() {
    return await fetchQuotesFromServer();
}

// Main sync function
async function syncQuotes() {
    if (syncInProgress || !isOnline) {
        if (!isOnline) {
            showNotification('Cannot sync while offline.', 'error');
        }
        return;
    }
    
    syncInProgress = true;
    updateSyncStatus('Syncing quotes with server...', 'syncing');
    
    try {
        // Fetch latest quotes from server
        const serverQuotes = await fetchQuotesFromServer();
        
        // Merge local and server data with conflict resolution
        const mergeResult = mergeQuotesWithConflicts(quotes, serverQuotes);
        
        if (mergeResult.conflicts.length > 0) {
            // Handle conflicts
            handleQuoteConflicts(mergeResult.conflicts, mergeResult.mergedQuotes);
        } else {
            // No conflicts, update directly
            quotes = mergeResult.mergedQuotes;
            saveToLocalStorage();
            updateUI();
            showNotification(`${mergeResult.newQuotesCount} new quotes synced!`, 'success');
        }
        
        // Post local changes to server
        await postQuotesToServer(quotes);
        
        lastSyncTime = new Date();
        updateSyncStatus('Last synced: ' + lastSyncTime.toLocaleTimeString(), 'success');
        
    } catch (error) {
        updateSyncStatus('Sync failed: ' + error.message, 'error');
        showNotification('Sync failed. Please try again.', 'error');
    } finally {
        syncInProgress = false;
    }
}

// Enhanced merge function with conflict detection
function mergeQuotesWithConflicts(localQuotes, serverQuotes) {
    const conflicts = [];
    const mergedQuotes = [...localQuotes];
    let newQuotesCount = 0;
    
    serverQuotes.forEach(serverQuote => {
        // Check if quote exists locally by text content
        const localIndex = mergedQuotes.findIndex(q => q.text === serverQuote.text);
        
        if (localIndex === -1) {
            // New quote from server
            mergedQuotes.push(serverQuote);
            newQuotesCount++;
        } else if (mergedQuotes[localIndex].category !== serverQuote.category) {
            // Conflict detected - same quote, different category
            conflicts.push({
                local: mergedQuotes[localIndex],
                server: serverQuote,
                index: localIndex
            });
        }
    });
    
    return { 
        mergedQuotes, 
        conflicts, 
        newQuotesCount 
    };
}

// Enhanced conflict handling
function handleQuoteConflicts(conflicts, mergedQuotes) {
    const conflictDialog = document.createElement('div');
    conflictDialog.className = 'conflict-dialog';
    conflictDialog.innerHTML = `
        <div class="conflict-content">
            <h3>Quote Conflicts Detected</h3>
            <p>${conflicts.length} conflict(s) found. Please resolve them:</p>
            ${conflicts.map((conflict, index) => `
                <div class="conflict-item">
                    <p><strong>Quote:</strong> "${conflict.local.text}"</p>
                    <div class="conflict-options">
                        <label>
                            <input type="radio" name="conflict-${index}" value="local" checked>
                            Keep local category: <strong>${conflict.local.category}</strong>
                        </label>
                        <label>
                            <input type="radio" name="conflict-${index}" value="server">
                            Use server category: <strong>${conflict.server.category}</strong>
                        </label>
                    </div>
                </div>
            `).join('')}
            <div class="conflict-actions">
                <button onclick="resolveQuoteConflicts()">Resolve Conflicts</button>
                <button onclick="useServerQuoteData()">Use Server Data</button>
                <button onclick="cancelQuoteConflictResolution()">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(conflictDialog);
    
    // Store conflicts for resolution
    window.currentQuoteConflicts = conflicts;
    window.mergedQuoteData = mergedQuotes;
}

function resolveQuoteConflicts() {
    const conflicts = window.currentQuoteConflicts;
    const mergedQuotes = window.mergedQuoteData;
    
    conflicts.forEach((conflict, index) => {
        const selected = document.querySelector(`input[name="conflict-${index}"]:checked`).value;
        
        if (selected === 'server') {
            mergedQuotes[conflict.index] = conflict.server;
        }
    });
    
    quotes = mergedQuotes;
    saveToLocalStorage();
    updateUI();
    showNotification('Quote conflicts resolved successfully!', 'success');
    
    // Clean up
    document.querySelector('.conflict-dialog').remove();
    delete window.currentQuoteConflicts;
    delete window.mergedQuoteData;
}

function useServerQuoteData() {
    quotes = window.mergedQuoteData;
    saveToLocalStorage();
    updateUI();
    showNotification('Using server data for all quote conflicts.', 'info');
    
    // Clean up
    document.querySelector('.conflict-dialog').remove();
    delete window.currentQuoteConflicts;
    delete window.mergedQuoteData;
}

function cancelQuoteConflictResolution() {
    document.querySelector('.conflict-dialog').remove();
    delete window.currentQuoteConflicts;
    delete window.mergedQuoteData;
    showNotification('Quote conflict resolution cancelled.', 'warning');
}

// Periodic sync for checking new quotes
function startPeriodicSync() {
    // Check for new quotes every 30 seconds
    syncInterval = setInterval(() => {
        if (isOnline && !syncInProgress) {
            checkForNewQuotes();
        }
    }, 30000);
}

async function checkForNewQuotes() {
    try {
        const serverQuotes = await fetchQuotesFromServer();
        const mergeResult = mergeQuotesWithConflicts(quotes, serverQuotes);
        
        if (mergeResult.newQuotesCount > 0) {
            showNotification(`${mergeResult.newQuotesCount} new quotes available!`, 'info');
        }
        
        if (mergeResult.conflicts.length > 0) {
            showNotification(`${mergeResult.conflicts.length} conflicts detected. Please resolve them.`, 'warning');
        }
        
    } catch (error) {
        console.error('Error checking for new quotes:', error);
    }
}

function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Local storage functions with enhanced error handling
function saveToLocalStorage() {
    try {
        localStorage.setItem('quotes', JSON.stringify(quotes));
        localStorage.setItem('lastSync', new Date().toISOString());
        localStorage.setItem('quoteCount', quotes.length.toString());
        
        console.log('Quotes saved to localStorage:', quotes.length);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showNotification('Failed to save quotes locally.', 'error');
    }
}

function loadFromLocalStorage() {
    try {
        const savedQuotes = localStorage.getItem('quotes');
        if (savedQuotes) {
            quotes = JSON.parse(savedQuotes);
            updateUI();
            console.log('Quotes loaded from localStorage:', quotes.length);
        }
        
        const lastSync = localStorage.getItem('lastSync');
        if (lastSync) {
            lastSyncTime = new Date(lastSync);
            updateSyncStatus('Last synced: ' + lastSyncTime.toLocaleTimeString(), 'success');
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        showNotification('Failed to load saved quotes.', 'error');
    }
}

// UI update functions
function updateUI() {
    populateCategories();
    updateStats();
    updateQuoteList();
}

function updateSyncStatus(message, status) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = message;
        syncStatus.className = `sync-status ${status}`;
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Manual sync function
function manualSync() {
    if (!isOnline) {
        showNotification('Cannot sync while offline.', 'error');
        return;
    }
    
    if (syncInProgress) {
        showNotification('Sync already in progress.', 'warning');
        return;
    }
    
    syncQuotes();
}

// Legacy function for backward compatibility
async function syncWithServer() {
    return await syncQuotes();
}

// Legacy function for backward compatibility
function mergeQuotes(localQuotes, serverQuotes) {
    return mergeQuotesWithConflicts(localQuotes, serverQuotes);
}

// Legacy function for backward compatibility
function handleConflicts(conflicts, mergedQuotes) {
    return handleQuoteConflicts(conflicts, mergedQuotes);
}

// Legacy function for backward compatibility
function resolveConflicts() {
    return resolveQuoteConflicts();
}

// Legacy function for backward compatibility
function useServerData() {
    return useServerQuoteData();
}

// Legacy function for backward compatibility
function cancelConflictResolution() {
    return cancelQuoteConflictResolution();
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
    saveToLocalStorage();
    
    // Clear the form
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    // Update the UI
    updateUI();
    
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
        saveToLocalStorage();
        updateUI();
        
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
        <p><strong>Network Status:</strong> <span style="color: ${isOnline ? '#28a745' : '#dc3545'}">${isOnline ? 'Online' : 'Offline'}</span></p>
    `;
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);
