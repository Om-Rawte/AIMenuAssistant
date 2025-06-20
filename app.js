// app.js
import { fetchMenu, addOrder, addOrderItems, fetchOrderStatus, addFeedback, subscribeToOrderItems, subscribeToMenu, upsertOrderConfirmation, fetchOrderConfirmations, subscribeToOrderConfirmations, clearOrderConfirmation } from './supabase.js';
import { translateText, getAIRecommendations, setAIProvider, getAIProvider, getAIChatResponse } from './ai.js';
import { saveToStorage, loadFromStorage, clearStorage, uuidv4, getQRSessionData, validateReservationName, startSessionTimer, clearSessionTimer, getSessionExpiry } from './utils.js';

// --- Globals ---
let currentLanguage = 'en';
let menuData = [];
let cart = [];
let tableId = null;
let orderId = null;
let userId = null;
let groupCarts = [];
let groupConsensus = false;
let orderConsensusSubscription = null;

// --- Theme Management ---
function applyTheme() {
  const theme = localStorage.getItem('theme');
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

// --- Language Selection & Translation ---
async function setupLanguageSelector() {
  const select = document.getElementById('language-select');
  if (!select) return;
  const languages = [
    { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' }, { code: 'zh', name: 'Chinese' }, { code: 'ar', name: 'Arabic' },
    { code: 'ru', name: 'Russian' }, { code: 'ja', name: 'Japanese' }, { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
  ];
  select.innerHTML = languages.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
  select.value = loadFromStorage('language') || 'en';
  currentLanguage = select.value;
  select.addEventListener('change', async (e) => {
    currentLanguage = e.target.value;
    saveToStorage('language', currentLanguage);
    await renderMenu();
    await updateAIAssistant();
  });
}

// --- Menu Fetch & Display ---
async function renderMenu() {
  const menuList = document.getElementById('menu-list');
  if (!menuList) return;
  menuList.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
  menuData = await fetchMenu();
  if (currentLanguage !== 'en') {
    for (let item of menuData) {
      item.translatedName = await translateText(item.name, currentLanguage);
      item.translatedDescription = await translateText(item.description, currentLanguage);
    }
  }
  menuList.innerHTML = menuData.map(item => `
    <div class="col">
      <div class="menu-card h-100">
        ${item.imageURLs && item.imageURLs.length ? `<img src="${item.imageURLs[0]}" alt="${item.name}" class="card-img-top">` : ''}
        <div class="menu-card-content">
          <div class="menu-card-header">
            <h3>${item.translatedName || item.name}</h3>
            <div class="price">$${item.price.toFixed(2)}</div>
          </div>
          <p class="desc">${item.translatedDescription || item.description}</p>
          <div class="tags">
            <span class="tag">${item.category}</span>
            ${item.allergens && item.allergens.length ? `<span class="tag">Allergens: ${item.allergens.join(', ')}</span>` : ''}
            ${item.dietary && item.dietary.length ? `<span class="tag">Dietary: ${item.dietary.join(', ')}</span>` : ''}
          </div>
          <button class="btn btn-primary w-100" data-id="${item.id}">Add to Order</button>
        </div>
      </div>
    </div>
  `).join('');
  menuList.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.getAttribute('data-id')));
  });
}

// --- Cart Logic ---
function addToCart(itemId) {
  const item = menuData.find(i => i.id === itemId);
  if (!item) return;
  cart.push({ ...item, cartId: uuidv4() });
  saveToStorage('cart', cart);
  updateCartCount();
  renderCart(); // Local user cart
  syncGroupCart(false);
}
function updateCartCount() {
  const count = cart.length;
  const cartCount = document.getElementById('cart-count');
  if (cartCount) cartCount.textContent = count;
}
function renderCart() {
  const itemsDiv = document.getElementById('cart-items');
  if (!itemsDiv) return;
  let allItems = [];
  groupCarts.forEach(c => {
    if (Array.isArray(c.cart)) allItems = allItems.concat(c.cart);
  });
  if (!allItems.length) {
    itemsDiv.innerHTML = '<div class="text-center text-muted">Your group order is empty.</div>';
  } else {
    itemsDiv.innerHTML = allItems.map(item => `
      <div class="cart-item">
        <span>${item.translatedName || item.name}</span>
        <strong>$${item.price.toFixed(2)}</strong>
      </div>
    `).join('');
  }
}
function setupCartModal() {
  const toggle = document.getElementById('cart-toggle');
  const modal = document.getElementById('cart-modal');
  const close = document.getElementById('close-cart');
  if (!toggle || !modal || !close) return;
  
  // Use Bootstrap modal methods
  const bootstrapModal = new bootstrap.Modal(modal);
  
  toggle.addEventListener('click', () => {
    bootstrapModal.show();
  });
  
  close.addEventListener('click', () => {
    bootstrapModal.hide();
  });
  
  document.getElementById('ready-to-order').addEventListener('click', handleReadyToOrder);
  subscribeGroupConsensus();
}

// --- AI Assistant ---
async function updateAIAssistant() {
  const aiDiv = document.getElementById('ai-assistant');
  if (!aiDiv) return;
  aiDiv.textContent = 'Thinking...';
  const context = JSON.stringify({ menu: menuData, cart, time: new Date().toLocaleString() });
  try {
    const recs = await getAIRecommendations(context, currentLanguage);
    if (!recs || recs.toLowerCase().includes('unavailable') || recs.toLowerCase().includes('api key')) {
      aiDiv.innerHTML = '<span class="text-danger">AI features are currently unavailable. Please contact the restaurant or try again later.</span>';
    } else {
      aiDiv.textContent = recs;
    }
  } catch (e) {
    aiDiv.innerHTML = '<span class="text-danger">AI features are currently unavailable. Please contact the restaurant or try again later.</span>';
  }
}

// --- Group Cart/Consensus Logic ---
async function syncGroupCart(confirmed = false) {
  if (!tableId || !userId) return;
  await upsertOrderConfirmation(tableId, userId, cart, confirmed);
}
async function subscribeGroupConsensus() {
  if (!tableId) return;
  groupCarts = await fetchOrderConfirmations(tableId);
  renderGroupCart();
  if (orderConsensusSubscription) orderConsensusSubscription.unsubscribe();
  orderConsensusSubscription = subscribeToOrderConfirmations(tableId, async () => {
    groupCarts = await fetchOrderConfirmations(tableId);
    renderGroupCart();
    checkConsensusAndPlaceOrder();
  });
}
function renderGroupCart() {
  renderCart(); // Re-render the cart items display
  const readyBtn = document.getElementById('ready-to-order');
  const consensusStatus = document.getElementById('consensus-status');
  if (!readyBtn || !consensusStatus) return;
  const withItems = groupCarts.filter(c => c.cart && c.cart.length > 0);
  const confirmedUsers = withItems.filter(c => c.confirmed).length;
  const waiting = withItems.some(c => !c.confirmed);
  readyBtn.disabled = waiting || !cart.length;
  if (waiting && withItems.length > 0) {
    readyBtn.textContent = 'Waiting for others...';
    consensusStatus.textContent = `${confirmedUsers} of ${withItems.length} people are ready.`;
  } else {
    readyBtn.textContent = 'I am Ready to Order';
    consensusStatus.textContent = withItems.length > 0 ? `All ${withItems.length} people are ready!` : '';
  }
}
async function handleReadyToOrder() {
  await syncGroupCart(true);
}
async function checkConsensusAndPlaceOrder() {
  const withItems = groupCarts.filter(c => c.cart && c.cart.length);
  if (withItems.length && withItems.every(c => c.confirmed)) {
    if (!groupConsensus) {
      groupConsensus = true;
      await placeGroupOrder();
    }
  } else {
    groupConsensus = false;
  }
}
async function placeGroupOrder() {
  let allItems = [];
  groupCarts.forEach(c => {
    if (Array.isArray(c.cart)) allItems = allItems.concat(c.cart);
  });
  if (!allItems.length) return;
  const order = { table_id: tableId, status: 'pending', created_at: new Date().toISOString(), notes: '' };
  const orderData = await addOrder(order);
  orderId = orderData.id;
  const items = allItems.map(item => ({ order_id: orderId, menu_item_id: item.id, quantity: 1, status: 'pending' }));
  await addOrderItems(items);
  for (const c of groupCarts) {
    await clearOrderConfirmation(tableId, c.user_id);
  }
  clearStorage('cart');
  saveToStorage('orderId', orderId); // Save order ID for session persistence
  window.location.href = 'order-status.html';
}

// --- Order Status Real-Time Updates ---
async function setupOrderStatusPage() {
  const orderId = loadFromStorage('orderId');
  const container = document.getElementById('order-status-list');
  if (!orderId || !container) {
    if (container) {
      container.innerHTML = `
        <div class="text-center text-muted">
          <i class="bi bi-exclamation-circle fs-1"></i>
          <p class="mt-3">No active order found.</p>
          <a href="index.html" class="btn btn-primary">Return to Menu</a>
        </div>
      `;
    }
    return;
  }
  
  const statuses = ['pending', 'cooking', 'ready', 'served', 'completed'];
  
  async function renderStatus() {
    const items = await fetchOrderStatus(orderId);
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted">
          <i class="bi bi-clock fs-1"></i>
          <p class="mt-3">Order details not available.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = items.map(item => {
      const statusIndex = statuses.indexOf(item.status);
      const progress = statusIndex >= 0 ? ((statusIndex + 1) / statuses.length) * 100 : 0;
      const statusClass = item.status === 'completed' ? 'success' : 
                         item.status === 'ready' ? 'warning' : 
                         item.status === 'cooking' ? 'info' : 'secondary';
      
      return `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title mb-0">${item.menu_item_name || 'Item'}</h5>
              <span class="badge bg-${statusClass} text-capitalize">${item.status}</span>
            </div>
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar bg-${statusClass}" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <small class="text-muted">Progress: ${Math.round(progress)}%</small>
          </div>
        </div>
      `;
    }).join('');
  }
  
  await renderStatus();
  subscribeToOrderItems(orderId, renderStatus);
}

// --- Feedback Submission ---
function setupFeedbackPage() {
  const form = document.getElementById('feedback-form');
  const messageDiv = document.getElementById('feedback-message');
  const stars = document.querySelectorAll('.star-rating span');
  const ratingInput = document.getElementById('rating');
  
  if (!form || !stars.length) return;
  
  let currentRating = 0;
  
  stars.forEach(star => {
    star.addEventListener('click', () => {
      currentRating = parseInt(star.dataset.value);
      ratingInput.value = currentRating;
      
      stars.forEach((s, index) => {
        const starIcon = s.querySelector('i');
        if (index < currentRating) {
          starIcon.className = 'bi bi-star-fill';
          s.classList.add('selected');
        } else {
          starIcon.className = 'bi bi-star';
          s.classList.remove('selected');
        }
      });
    });
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rating = parseInt(ratingInput.value);
    const feedback = document.getElementById('feedback-text').value.trim();
    
    if (rating === 0) {
      showMessage('Please select a rating.', 'danger');
      return;
    }
    
    try {
      await addFeedback({ rating, feedback });
      showMessage('Thank you for your feedback!', 'success');
      form.reset();
      
      // Reset stars
      stars.forEach(s => {
        s.querySelector('i').className = 'bi bi-star';
        s.classList.remove('selected');
      });
      currentRating = 0;
      ratingInput.value = 0;
      
    } catch (error) {
      showMessage('Failed to submit feedback. Please try again.', 'danger');
      console.error('Feedback submission error:', error);
    }
  });
  
  function showMessage(text, type) {
    messageDiv.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${text}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }
}

// --- Session Management ---
function loadSessionData() {
  cart = loadFromStorage('cart') || [];
  orderId = loadFromStorage('orderId') || null;
  userId = loadFromStorage('userId') || uuidv4();
  saveToStorage('userId', userId);
  const sessionData = getQRSessionData();
  tableId = sessionData.tableId;
  // Set AI provider from QR if present
  if (sessionData.aiProvider) {
    setAIProvider(sessionData.aiProvider);
  }
}

// --- Page Initialization ---
async function initializeSession() {
  loadSessionData();
  const sessionData = getQRSessionData();
  if (!sessionData.tableId) {
    document.body.innerHTML = '<h1>Invalid QR Code</h1><p>Please scan a valid table QR code.</p>';
    return;
  }
  if (sessionData.reservationId) {
    const reservationName = loadFromStorage(`reservation_${sessionData.reservationId}`);
    if (!reservationName) {
      promptForReservationName(sessionData.reservationId);
      return; // Stop execution until name is provided
    }
  }
  if (restoreSessionIfExpired()) {
    // Session restored, continue
  }
  setupSessionTimer();
  // Initialize page-specific logic
  if (document.getElementById('menu-list')) {
    await setupLanguageSelector();
    await renderMenu();
    await updateAIAssistant();
    setupCartModal();
    updateCartCount();
  }
  if (document.getElementById('order-status-list')) {
    await setupOrderStatusPage();
  }
  if (document.getElementById('feedback-form')) {
    setupFeedbackPage();
  }
  if (document.getElementById('reset-password-form')) {
    // Auth logic is separate in auth.js
  }
}

function promptForReservationName(reservationId) {
  const name = prompt("Please enter the name for your reservation:");
  if (name && validateReservationName(reservationId, name)) {
    saveToStorage(`reservation_${reservationId}`, name);
    window.location.reload();
  } else {
    alert("Invalid reservation name. Please try again.");
  }
}

function handleSessionExpiry() {
  const shouldRescan = confirm("Your session has expired. Please re-scan the QR code to continue.");
  if (shouldRescan) {
    clearStorage(); // Clear all session data
    // The user needs to physically re-scan
  }
}

function setupSessionTimer() {
  const expiry = getSessionExpiry();
  if (expiry) {
    const timeRemaining = expiry - Date.now();
    if (timeRemaining <= 0) {
      handleSessionExpiry();
    } else {
      setTimeout(handleSessionExpiry, timeRemaining);
    }
  } else {
    startSessionTimer(); // Start a new timer if none exists
  }
}

function restoreSessionIfExpired() {
  // If user re-scans, QR data will be in URL.
  // This logic assumes re-scan reloads the page.
  const expiry = getSessionExpiry();
  if (expiry && Date.now() > expiry) {
    clearStorage();
    // Re-initialize with new QR data
  }
  return true;
}

// --- AI Chatbot ---
function setupAIChatbot() {
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');

    if (!chatbotToggle || !chatbotWindow || !chatbotClose || !chatbotInput || !chatbotSend) return;

    chatbotToggle.addEventListener('click', () => {
        const cartModal = document.getElementById('cart-modal');
        if (cartModal && cartModal.classList.contains('visible')) {
            cartModal.classList.remove('visible');
        }
        chatbotWindow.classList.add('visible');
        chatbotToggle.style.display = 'none';
        addMessageToChat('assistant', 'Hello! How can I help you with the menu today?');
    });

    chatbotClose.addEventListener('click', () => {
        chatbotWindow.classList.remove('visible');
        chatbotToggle.style.display = 'flex';
    });

    chatbotSend.addEventListener('click', handleSendMessage);
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    async function handleSendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        chatbotInput.value = '';
        addTypingIndicator();
        try {
            const context = JSON.stringify({ menu: menuData, user_query: message });
            const language = currentLanguage || 'en';
            const response = await getAIChatResponse(context, language);
            removeTypingIndicator();
            if (!response || response.toLowerCase().includes('unavailable') || response.toLowerCase().includes('api key')) {
              addMessageToChat('assistant', "AI assistant is currently unavailable. Please contact the restaurant or try again later.");
            } else {
              addMessageToChat('assistant', response);
            }
        } catch (error) {
            removeTypingIndicator();
            addMessageToChat('assistant', "AI assistant is currently unavailable. Please contact the restaurant or try again later.");
            console.error("Chatbot error:", error);
        }
    }

    function addMessageToChat(sender, message) {
        const chatBody = document.getElementById('chatbot-body');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);
        messageDiv.textContent = message;
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function addTypingIndicator() {
        const chatBody = document.getElementById('chatbot-body');
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('chat-message', 'assistant', 'typing');
        typingDiv.id = 'typing-indicator';
        typingDiv.textContent = 'Assistant is typing...';
        chatBody.appendChild(typingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  const path = window.location.pathname;
  if (path.endsWith('index.html') || path === '/') {
    await setupLanguageSelector();
    await renderMenu();
    await updateAIAssistant();
    setupCartModal();
    setupAIChatbot(); // Initialize chatbot
    initializeSession();
  } else if (path.endsWith('order-status.html')) {
    setupOrderStatusPage();
  } else if (path.endsWith('feedback.html')) {
    setupFeedbackPage();
  }
}); 