import { 
  database, 
  ref, 
  onValue, 
  set, 
  update, 
  push, 
  limitToLast, 
  orderByChild, 
  query,
  get
} from './firebase-config.js';

let userId = null;
let username = null;

// DOM elements
const authContainer = document.getElementById('auth-container');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username');
const leaderboardList = document.getElementById('top-traders');

// Horse colors
const horseColors = {
  "sir-gallops-a-lot": "rgb(255, 99, 132)",
  "midnight-muffin": "rgb(54, 162, 235)",
  "laserhoof": "rgb(255, 206, 86)",
  "thunderhoof": "rgb(75, 192, 192)"
};

// Initialize game
function initGame() {
  // Set up realtime listeners
  onValue(ref(database, 'horses'), updateHorsePrices);
  onValue(query(ref(database, 'news'), limitToLast(20)), (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      addNewsItem(childSnapshot);
    });
  });
  onValue(query(ref(database, 'leaderboard'), orderByChild('balance'), limitToLast(10)), updateLeaderboard);
  
  // Load user portfolio
  onValue(ref(database, `portfolios/${userId}`), updateUserPortfolio);
}

// Authentication
loginBtn.addEventListener('click', () => {
  username = usernameInput.value.trim();
  if (username) {
    // Simple "authentication" - just store the username
    userId = generateUserId();
    localStorage.setItem('horseUserId', userId);
    localStorage.setItem('horseUsername', username);
    
    // Hide auth UI
    authContainer.style.display = 'none';
    
    // Initialize user in database
    set(ref(database, `portfolios/${userId}`), {
      username: username,
      balance: 1000,
      holdings: {}
    });
    
    initGame();
  }
});

// Check if user is already "logged in"
window.addEventListener('load', () => {
  userId = localStorage.getItem('horseUserId');
  username = localStorage.getItem('horseUsername');
  
  if (userId && username) {
    authContainer.style.display = 'none';
    initGame();
  }
});

// Generate a simple user ID
function generateUserId() {
  return 'user-' + Math.random().toString(36).substr(2, 9);
}

// Update horse prices from Firebase
function updateHorsePrices(snapshot) {
  const horses = snapshot.val();
  const horseList = document.getElementById('horse-list');
  horseList.innerHTML = '';
  
  Object.entries(horses).forEach(([horseId, horse]) => {
    const div = document.createElement('div');
    div.className = 'horse';
    div.innerHTML = `
      <strong>${horse.name}</strong> – $${horse.price.toFixed(2)} 
      <span style="color: ${horse.change.includes('+') ? 'green' : 'red'}">${horse.change}</span>
      <br/>
      <button onclick="buyHorse('${horseId}')">Buy</button>
      <button onclick="sellHorse('${horseId}')">Sell</button>
    `;
    horseList.appendChild(div);
  });
  
  updateTicker(horses);
  updateChart(horses);
}

// Update ticker
function updateTicker(horses) {
  const ticker = document.getElementById('ticker');
  ticker.textContent = Object.values(horses).map(h => 
    `${h.name}: $${h.price.toFixed(2)} (${h.change})`
  ).join(" | ");
}

// Update user portfolio
function updateUserPortfolio(snapshot) {
  const portfolio = snapshot.val();
  if (portfolio) {
    document.getElementById('user-balance').textContent = `Balance: $${portfolio.balance.toFixed(2)}`;
    
    const holdingsDiv = document.getElementById('user-holdings');
    holdingsDiv.innerHTML = '<h3>Your Holdings:</h3>';
    
    if (portfolio.holdings) {
      const ul = document.createElement('ul');
      Object.entries(portfolio.holdings).forEach(([horseId, shares]) => {
        const li = document.createElement('li');
        li.textContent = `${horseId}: ${shares} shares`;
        ul.appendChild(li);
      });
      holdingsDiv.appendChild(ul);
    } else {
      holdingsDiv.innerHTML += '<p>No holdings yet</p>';
    }
  }
}

// Update leaderboard
function updateLeaderboard(snapshot) {
  const leaders = snapshot.val();
  leaderboardList.innerHTML = '';
  
  if (leaders) {
    // Convert to array and sort by balance (descending)
    const leadersArray = Object.entries(leaders)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.balance - a.balance);
    
    leadersArray.forEach((user, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${index + 1}. ${user.username}</strong>: $${user.balance.toFixed(2)}`;
      leaderboardList.appendChild(li);
    });
  }
}

// Buy horse function
async function buyHorse(horseId) {
  if (!userId) return;
  
  const horseRef = ref(database, `horses/${horseId}`);
  const horseSnap = await get(horseRef);
  const horse = horseSnap.val();
  
  const portfolioRef = ref(database, `portfolios/${userId}`);
  const portfolioSnap = await get(portfolioRef);
  const portfolio = portfolioSnap.val();
  
  if (portfolio.balance >= horse.price) {
    const updates = {};
    updates[`portfolios/${userId}/balance`] = portfolio.balance - horse.price;
    updates[`portfolios/${userId}/holdings/${horseId}`] = 
      (portfolio.holdings && portfolio.holdings[horseId] || 0) + 1;
    
    update(ref(database), updates);
    
    // Update leaderboard
    set(ref(database, `leaderboard/${userId}`), {
      username: portfolio.username,
      balance: portfolio.balance - horse.price
    });
  } else {
    alert('Not enough funds!');
  }
}

// Sell horse function
async function sellHorse(horseId) {
  if (!userId) return;
  
  const horseRef = ref(database, `horses/${horseId}`);
  const horseSnap = await get(horseRef);
  const horse = horseSnap.val();
  
  const portfolioRef = ref(database, `portfolios/${userId}`);
  const portfolioSnap = await get(portfolioRef);
  const portfolio = portfolioSnap.val();
  const currentShares = portfolio.holdings && portfolio.holdings[horseId] || 0;
  
  if (currentShares > 0) {
    const updates = {};
    updates[`portfolios/${userId}/balance`] = portfolio.balance + horse.price;
    updates[`portfolios/${userId}/holdings/${horseId}`] = currentShares - 1;
    
    if (currentShares - 1 === 0) {
      updates[`portfolios/${userId}/holdings/${horseId}`] = null; // Remove if zero
    }
    
    update(ref(database), updates);
    
    // Update leaderboard
    set(ref(database, `leaderboard/${userId}`), {
      username: portfolio.username,
      balance: portfolio.balance + horse.price
    });
  } else {
    alert("You don't own this horse!");
  }
}

// Initialize chart
let chartInstance = null;
function updateChart(horses) {
  const ctx = document.getElementById('price
