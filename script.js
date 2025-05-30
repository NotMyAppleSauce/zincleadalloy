let balance = parseFloat(localStorage.getItem("balance")) || 1000;
let portfolio = JSON.parse(localStorage.getItem("portfolio")) || {};

let horses = JSON.parse(localStorage.getItem("horses")) || [
  { name: "Sir Gallops-a-Lot", price: 120, change: "+0.0%" },
  { name: "Midnight Muffin", price: 98, change: "+0.0%" },
  { name: "Laserhoof", price: 150, change: "+0.0%" },
  { name: "Thunderhoof", price: 110, change: "+0.0%" },
];

let newsHistory = JSON.parse(localStorage.getItem("newsHistory")) || [];

const newsTemplates = [
  "{horse} was seen {action} near the {location}.",
  "BREAKING: {horse} just {event}!",
  "Analysts predict {horse} will {prediction} by next week.",
  "{horse} caught in a {situation}—market reacts.",
  "Fans cheer as {horse} {achievement} during training."
];

const madlibData = {
  horse: ["Sir Gallops-a-Lot", "Midnight Muffin", "Laserhoof", "Thunderhoof"],
  action: ["galloping wildly", "eating oats", "kicking fences", "posing for selfies"],
  location: ["stable", "race track", "training field", "hay barn"],
  event: ["broke a speed record", "tripped over a carrot", "neighed at the moon", "won a surprise race"],
  prediction: ["double in value", "retire early", "become a meme", "join a unicorn league"],
  situation: ["mudslide", "carrot heist", "fan stampede", "hay shortage"],
  achievement: ["nailed a perfect trot", "outpaced a drone", "won a neigh-off", "jumped a fence backwards"]
};

const horseColors = {
  "Sir Gallops-a-Lot": "rgb(255, 99, 132)",
  "Midnight Muffin": "rgb(54, 162, 235)",
  "Laserhoof": "rgb(255, 206, 86)",
  "Thunderhoof": "rgb(75, 192, 192)"
};

function saveState() {
  localStorage.setItem("balance", balance);
  localStorage.setItem("portfolio", JSON.stringify(portfolio));
  localStorage.setItem("horses", JSON.stringify(horses));
  localStorage.setItem("priceHistory", JSON.stringify(priceHistory));
  localStorage.setItem("newsHistory", JSON.stringify(newsHistory));
}

function populateTicker() {
  const ticker = document.getElementById("ticker");
  ticker.textContent = horses.map(h => `${h.name}: $${h.price.toFixed(2)} (${h.change})`).join(" | ");
}

function populateHorseList() {
  const list = document.getElementById("horse-list");
  list.innerHTML = "";
  horses.forEach((horse, index) => {
    const div = document.createElement("div");
    div.className = "horse";
    div.innerHTML = `
      <strong>${horse.name}</strong> – $${horse.price.toFixed(2)} 
      <span style="color: ${horse.change.includes('+') ? 'green' : 'red'}">${horse.change}</span>
      <br/>
      <button onclick="buyHorse(${index})">Buy</button>
      <button onclick="sellHorse(${index})">Sell</button>
    `;
    list.appendChild(div);
  });
}

function updatePortfolio() {
  const portfolioDiv = document.getElementById("portfolio");
  portfolioDiv.innerHTML = `<h2>💼 Portfolio</h2><p>Balance: $${balance.toFixed(2)}</p>`;
  const ul = document.createElement("ul");
  for (const horse in portfolio) {
    const li = document.createElement("li");
    li.textContent = `${horse}: ${portfolio[horse]} shares`;
    ul.appendChild(li);
  }
  portfolioDiv.appendChild(ul);
}

function buyHorse(index) {
  const horse = horses[index];
  if (balance >= horse.price) {
    balance -= horse.price;
    portfolio[horse.name] = (portfolio[horse.name] || 0) + 1;
    updatePortfolio();
    saveState();
  } else {
    alert("Not enough funds!");
  }
}

function sellHorse(index) {
  const horse = horses[index];
  if (portfolio[horse.name] > 0) {
    balance += horse.price;
    portfolio[horse.name] -= 1;
    if (portfolio[horse.name] === 0) delete portfolio[horse.name];
    updatePortfolio();
    saveState();
  } else {
    alert("You don't own this horse!");
  }
}

let priceHistory = JSON.parse(localStorage.getItem("priceHistory")) || {
  "Sir Gallops-a-Lot": [],
  "Midnight Muffin": [],
  "Laserhoof": [],
  "Thunderhoof": []
};

function updatePriceHistory() {
  horses.forEach(horse => {
    if (!priceHistory[horse.name]) priceHistory[horse.name] = [];
    priceHistory[horse.name].push(horse.price);
    if (priceHistory[horse.name].length > 10) {
      priceHistory[horse.name].shift();
    }
  });
}

let chartInstance = null;

function renderChart() {
  const ctx = document.getElementById("priceChart").getContext("2d");
  const labels = Array.from({ length: 10 }, (_, i) => `T-${9 - i}`);

  const datasets = horses.map(horse => ({
    label: horse.name,
    data: priceHistory[horse.name] || [],
    borderColor: horseColors[horse.name] || "gray",
    backgroundColor: horseColors[horse.name] || "gray",
    fill: false,
    tension: 0.3
  }));

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Horse Price History (Last 10 Updates)' }
      }
    }
  });
}

function simulatePriceChanges() {
  horses.forEach(horse => {
    const change = (Math.random() * 10 - 5).toFixed(2);
    const percent = (change / horse.price * 100).toFixed(2);
    horse.price = Math.max(1, horse.price + parseFloat(change));
    horse.change = `${change >= 0 ? '+' : ''}${percent}%`;
  });

  updatePriceHistory();
  saveState();
  populateTicker();
  populateHorseList();
  updatePortfolio();
  renderChart();
}

function generateNewsItem() {
  const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
  const text = template.replace(/{(.*?)}/g, (_, key) => {
    const options = madlibData[key];
    return options[Math.floor(Math.random() * options.length)];
  });

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { text, timestamp };
}

function populateNewsFeed() {
  const feed = document.getElementById("news-feed");
  const newsItem = generateNewsItem();

  newsHistory.unshift(newsItem);
  if (newsHistory.length > 50) newsHistory.pop();
  localStorage.setItem("newsHistory", JSON.stringify(newsHistory));

  const li = document.createElement("li");
  li.innerHTML = `<strong>[${newsItem.timestamp}]</strong> ${newsItem.text}`;
  feed.insertBefore(li, feed.firstChild);

  if (feed.children.length > 20) {
    feed.removeChild(feed.lastChild);
  }
}

function loadSavedNews() {
  const feed = document.getElementById("news-feed");
  newsHistory.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>[${item.timestamp}]</strong> ${item.text}`;
    feed.appendChild(li);
  });
}

// Initial load
updatePriceHistory();
renderChart();
populateTicker();
populateHorseList();
updatePortfolio();
loadSavedNews();

// Intervals
setInterval(simulatePriceChanges, 5000);
setInterval(populateNewsFeed, 7000);
