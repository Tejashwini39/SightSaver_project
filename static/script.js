function handleFileSelect(input) {
    const selectedText = document.getElementById('selectedFileText');
    const dropZoneText = document.getElementById('dropZoneText');
    const dropZone = document.getElementById('dropZone');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        selectedText.innerHTML = `<i class="fa-solid fa-file-image"></i> ${file.name}`;
        dropZoneText.innerText = "File Selected";
        dropZone.style.borderColor = "var(--primary)";
        dropZone.style.background = "rgba(59, 130, 246, 0.05)";
    }
}

// Recent Searches Logic
function saveSearch(product) {
    let searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    // Avoid duplicates
    searches = searches.filter(s => s.image !== product.image);
    searches.unshift({
        name: product.name,
        image: product.image,
        timestamp: new Date().toLocaleTimeString()
    });
    localStorage.setItem('recentSearches', JSON.stringify(searches.slice(0, 5)));
    renderRecentSearches();
}

function renderRecentSearches() {
    const list = document.getElementById('recentSearches');
    if (!list) return;
    const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    
    if (searches.length === 0) return;

    list.innerHTML = searches.map(s => `
        <div class="recent-item animate-fade-in" onclick="location.reload()">
            <img src="/${s.image}" alt="">
            <div class="recent-info">
                <h5>${s.name}</h5>
                <span>${s.timestamp}</span>
            </div>
        </div>
    `).join('');
}

// Call on load
document.addEventListener('DOMContentLoaded', renderRecentSearches);

async function uploadImage() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const loading = document.getElementById('loading');
    const resultsGrid = document.getElementById('results');

    if (!file) {
        alert("Please select a product image first!");
        return;
    }

    // Show loading overlay
    loading.style.display = 'flex';
    resultsGrid.innerHTML = '';

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const products = await response.json();
        renderResults(products);
        if (products.length > 0) saveSearch(products[0]);
    } catch (error) {
        console.error(error);
        alert("Error analyzing image. Please try again.");
    } finally {
        loading.style.display = 'none';
    }
}

function renderResults(products) {
    const resultsGrid = document.getElementById('results');
    const insightsContainer = document.getElementById('insightsSummary');
    resultsGrid.innerHTML = '';
    insightsContainer.innerHTML = '';
    insightsContainer.style.display = 'none';

    if (products.length === 0) {
        resultsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--text-muted);">No matching products found.</p>';
        return;
    }

    // --- Calculate Insights ---
    const premiumChoice = products.reduce((prev, curr) => (prev.quality_score > curr.quality_score) ? prev : curr);
    
    // Best Value = highest (quality_score / price)
    const bestValue = products.reduce((prev, curr) => {
        const prevPrice = Math.min(...Object.values(prev.price).filter(p => p > 0));
        const currPrice = Math.min(...Object.values(curr.price).filter(p => p > 0));
        return (prev.quality_score / prevPrice > curr.quality_score / currPrice) ? prev : curr;
    });

    insightsContainer.style.display = 'grid';
    insightsContainer.innerHTML = `
        <div class="insight-card animate-fade-in">
            <div class="insight-icon bg-gold">
                <i class="fa-solid fa-crown"></i>
            </div>
            <div class="insight-content">
                <h4>Premium Choice</h4>
                <h3>${premiumChoice.name}</h3>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Highest AI Quality Score detected.</p>
            </div>
        </div>
        <div class="insight-card animate-fade-in" style="animation-delay: 0.2s">
            <div class="insight-icon bg-blue">
                <i class="fa-solid fa-tags"></i>
            </div>
            <div class="insight-content">
                <h4>Best Value</h4>
                <h3>${bestValue.name}</h3>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Optimal price-to-quality ratio.</p>
            </div>
        </div>
    `;

    const bestQualityProduct = premiumChoice;

    products.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'product-card animate-fade-in';
        card.style.animationDelay = `${index * 0.1}s`;
        if (product.image === bestQualityProduct.image) card.classList.add('top-choice');

        const prices = product.price;
        let bestPlatform = 'Amazon';
        let minPrice = Infinity;
        let maxPrice = 0;

        // Add mock platform prices to comparison logic
        const meeshoPriceVal = prices.Amazon ? Math.round(prices.Amazon * 0.85) : Infinity;
        const nykaaPriceVal = prices.Flipkart ? Math.round(prices.Flipkart * 1.1) : Infinity;
        const allPrices = { ...prices, "Meesho": meeshoPriceVal, "Nykaa": nykaaPriceVal };

        for (const [platform, price] of Object.entries(allPrices)) {
            if (price && price < minPrice) {
                minPrice = price;
                bestPlatform = platform;
            }
            if (price && price > maxPrice && price !== Infinity) {
                maxPrice = price;
            }
        }

        const savings = maxPrice - minPrice;
        const savingsPercent = Math.round((savings / maxPrice) * 100);

        const qualityColor = product.quality_score > 0.8 ? '#10b981' : 
                            product.quality_score > 0.6 ? '#3b82f6' : 
                            product.quality_score > 0.4 ? '#f59e0b' : '#ef4444';

        card.innerHTML = `
            <div class="product-image-container">
                <img src="/${product.image}" alt="${product.name}">
                <div class="similarity-badge">
                    <i class="fa-solid fa-bullseye"></i> 
                    ${(product.similarity * 100).toFixed(1)}% Match
                </div>
                ${savings > 0 ? `<div class="savings-badge">Save ${savingsPercent}%</div>` : ''}
            </div>
            <div class="product-info">
                <h3 title="${product.name}">${product.name}</h3>
                
                <div class="platform-prices">
                    <div class="price-row ${bestPlatform === 'Amazon' ? 'best-price' : ''}" id="p-amazon-${index}">
                        <span class="platform-name"><i class="fa-brands fa-amazon"></i> Amazon</span>
                        <span class="price-value status-searching">Searching...</span>
                    </div>
                    <div class="price-row ${bestPlatform === 'Flipkart' ? 'best-price' : ''}" id="p-flipkart-${index}">
                        <span class="platform-name"><i class="fa-solid fa-bag-shopping"></i> Flipkart</span>
                        <span class="price-value status-searching">Searching...</span>
                    </div>
                    <div class="price-row ${bestPlatform === 'Nykaa' ? 'best-price' : ''}" id="p-nykaa-${index}">
                        <span class="platform-name"><i class="fa-solid fa-droplet"></i> Nykaa</span>
                        <span class="price-value status-searching">Searching...</span>
                    </div>
                    <div class="price-row ${bestPlatform === 'Meesho' ? 'best-price' : ''}" id="p-meesho-${index}">
                        <span class="platform-name"><i class="fa-solid fa-cart-shopping"></i> Meesho</span>
                        <span class="price-value status-searching">Searching...</span>
                    </div>
                </div>

                <div class="quality-meter">
                    <div class="meter-label">
                        <span>AI Quality Score</span>
                        <span style="color: ${qualityColor}; font-weight: 800;">${(product.quality_score * 100).toFixed(1)}%</span>
                    </div>
                    <div class="meter-bar">
                        <div class="meter-fill" style="width: ${product.quality_score * 100}%; background: ${qualityColor}; box-shadow: 0 0 10px ${qualityColor}44;"></div>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-outline" onclick='viewQuality(${JSON.stringify(product).replace(/'/g, "&apos;")})'>
                        <i class="fa-solid fa-chart-line"></i>
                    </button>
                    <button class="btn btn-primary" onclick="viewDeal('${bestPlatform}', '${product.name}')" style="flex: 1;">
                        Buy Now ₹${minPrice}
                    </button>
                </div>
            </div>
        `;
        resultsGrid.appendChild(card);

        // Simulation for live data extraction
        setTimeout(() => {
            document.querySelector(`#p-amazon-${index} .price-value`).innerText = `₹${prices.Amazon || 'N/A'}`;
            document.querySelector(`#p-amazon-${index} .price-value`).classList.remove('status-searching');
        }, 500 + Math.random() * 1000);

        setTimeout(() => {
            document.querySelector(`#p-flipkart-${index} .price-value`).innerText = `₹${prices.Flipkart || 'N/A'}`;
            document.querySelector(`#p-flipkart-${index} .price-value`).classList.remove('status-searching');
        }, 800 + Math.random() * 1000);

        setTimeout(() => {
            document.querySelector(`#p-nykaa-${index} .price-value`).innerText = `₹${nykaaPriceVal}`;
            document.querySelector(`#p-nykaa-${index} .price-value`).classList.remove('status-searching');
        }, 1200 + Math.random() * 1000);

        setTimeout(() => {
            document.querySelector(`#p-meesho-${index} .price-value`).innerText = `₹${meeshoPriceVal}`;
            document.querySelector(`#p-meesho-${index} .price-value`).classList.remove('status-searching');
        }, 1500 + Math.random() * 1000);
    });
    
    // Smooth scroll to results
    window.scrollTo({
        top: resultsGrid.offsetTop - 100,
        behavior: 'smooth'
    });
}

function viewQuality(product) {
    localStorage.setItem('selectedProduct', JSON.stringify(product));
    window.location.href = `/quality-analysis?image=${encodeURIComponent(product.image)}`;
}

function viewDeal(platform, productName) {
    // In a real app, this would be a real affiliate link or marketplace URL
    const urls = {
        'Amazon': `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`,
        'Flipkart': `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`,
        'Meesho': `https://www.meesho.com/search?q=${encodeURIComponent(productName)}`,
        'Nykaa': `https://www.nykaa.com/search/result/?q=${encodeURIComponent(productName)}`
    };
    
    window.open(urls[platform] || urls['Amazon'], '_blank');
}

// Handle Drag and Drop
const dropZone = document.getElementById('dropZone');
if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('active'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('active'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        document.getElementById('fileInput').files = files;
        handleFileSelect(document.getElementById('fileInput'));
    }, false);
}