// API Configuration
const API_URL = 'https://api.escuelajs.co/api/v1/products';

// State Management
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = '';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const itemsPerPageSelect = document.getElementById('itemsPerPage');
const sortOptionsSelect = document.getElementById('sortOptions');
const productTableBody = document.getElementById('productTableBody');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const loadingSpinner = document.getElementById('loadingSpinner');
const tableContainer = document.getElementById('tableContainer');
const noResults = document.getElementById('noResults');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    fetchProducts();
});

// Event Listeners
function initializeEventListeners() {
    // Search input with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch(e.target.value);
        }, 300);
    });

    // Items per page change
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderProducts();
    });

    // Sort options change
    sortOptionsSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        handleSort();
    });
}

// Fetch Products from API
async function fetchProducts() {
    try {
        showLoading(true);
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        allProducts = data;
        filteredProducts = [...allProducts];

        renderProducts();
        showLoading(false);
    } catch (error) {
        console.error('Error fetching products:', error);
        showLoading(false);
        showError('Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.');
    }
}

// Search Handler
function handleSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();

    if (term === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product =>
            product.title.toLowerCase().includes(term)
        );
    }

    // Reapply current sort if any
    if (currentSort) {
        applySorting(currentSort);
    }

    currentPage = 1;
    renderProducts();
}

// Sort Handler
function handleSort() {
    if (currentSort) {
        applySorting(currentSort);
        currentPage = 1;
        renderProducts();
    }
}

// Apply Sorting
function applySorting(sortType) {
    switch (sortType) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'name-desc':
            filteredProducts.sort((a, b) => b.title.localeCompare(a.title));
            break;
        default:
            // No sorting
            break;
    }
}

// Render Products
function renderProducts() {
    if (filteredProducts.length === 0) {
        showNoResults(true);
        return;
    }

    showNoResults(false);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);

    productTableBody.innerHTML = productsToShow.map(product => createProductRow(product)).join('');

    renderPagination();
    updatePageInfo();
}

// Multi-proxy image loading strategies
function getImageWithStrategies(originalUrl) {
    if (!originalUrl) return '';

    // Use hash to consistently pick same strategy for same URL
    const hash = originalUrl.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const strategies = [
        originalUrl, // Direct
        `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&default=1`,
        `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&default=1`,
    ];

    return strategies[Math.abs(hash) % strategies.length];
}

// Create Product Row
function createProductRow(product) {
    const images = product.images || [];
    const category = product.category || {};

    // Filter out only truly invalid URLs
    const validImages = images.filter(img => {
        if (!img || typeof img !== 'string') return false;
        const cleanImg = img.trim().replace(/^\["|"\]$/g, '');

        try {
            const url = new URL(cleanImg);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            if (cleanImg.startsWith('http://') || cleanImg.startsWith('https://')) {
                return true;
            }
            return false;
        }
    });

    // Debug logging
    if (validImages.length !== images.length) {
        console.log(`Product ${product.id}: ${images.length} total, ${validImages.length} valid images`);
    }

    return `
        <tr>
            <td class="text-center">${product.id}</td>
            <td>
                <div class="product-title">${escapeHtml(product.title)}</div>
            </td>
            <td class="text-center">
                <span class="price-badge">$${product.price.toFixed(2)}</span>
            </td>
            <td>
                <div class="product-description">${escapeHtml(product.description)}</div>
            </td>
            <td>
                <div class="category-badge">
                    ${category.image ? `<img src="${getImageWithStrategies(category.image)}" alt="${escapeHtml(category.name)}" class="category-image" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="handleImageError(this, '${category.image}')">` : ''}
                    <span>${escapeHtml(category.name || 'N/A')}</span>
                </div>
            </td>
            <td>
                <div class="product-images">
                    ${validImages.length > 0 ? validImages.map((img, index) => {
        const cleanImg = img.trim().replace(/^\["|"\]$/g, '');
        const proxiedUrl = getImageWithStrategies(cleanImg);
        return `
                        <div class="product-image-wrapper" data-image-index="${index}" data-product-id="${product.id}" data-original-url="${escapeHtml(cleanImg)}" data-attempt="0">
                            <img src="${proxiedUrl}" 
                                 alt="${escapeHtml(product.title)} - Ảnh ${index + 1}" 
                                 class="product-image" 
                                 referrerpolicy="no-referrer"
                                 crossorigin="anonymous"
                                 onerror="handleImageError(this, '${cleanImg}')"
                                 loading="lazy">
                            <div class="image-overlay">
                                <i class="bi bi-zoom-in"></i>
                            </div>
                        </div>
                    `}).join('') : '<div class="text-muted small">Không có hình ảnh</div>'}
                </div>
            </td>
        </tr>
    `;
}

// Render Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(1); return false;">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a>
            </li>
        `;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    pagination.innerHTML = paginationHTML;
}

// Change Page
function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    if (page < 1 || page > totalPages) {
        return;
    }

    currentPage = page;
    renderProducts();

    // Scroll to top of table
    tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Update Page Info
function updatePageInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredProducts.length);
    const total = filteredProducts.length;

    pageInfo.textContent = `Hiển thị ${startIndex} - ${endIndex} trong tổng số ${total} sản phẩm`;
}

// Show/Hide Loading
function showLoading(show) {
    if (show) {
        loadingSpinner.style.display = 'block';
        tableContainer.style.display = 'none';
        noResults.style.display = 'none';
    } else {
        loadingSpinner.style.display = 'none';
        tableContainer.style.display = 'block';
    }
}

// Show/Hide No Results
function showNoResults(show) {
    if (show) {
        noResults.style.display = 'block';
        tableContainer.style.display = 'none';
    } else {
        noResults.style.display = 'none';
        tableContainer.style.display = 'block';
    }
}

// Show Error
function showError(message) {
    productTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger py-5">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                <p class="mt-3">${message}</p>
            </td>
        </tr>
    `;
    tableContainer.style.display = 'block';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

// Handle Image Error with fallback strategies
function handleImageError(img, originalUrl) {
    // Check if already replaced to avoid infinite loop
    if (img.classList.contains('image-error')) {
        return;
    }

    const wrapper = img.closest('.product-image-wrapper');
    if (!wrapper) {
        // Category image - just hide it
        if (img.classList.contains('category-image')) {
            img.style.display = 'none';
        }
        return;
    }

    // Get current attempt number
    let attempt = parseInt(wrapper.getAttribute('data-attempt') || '0');
    attempt++;

    console.log(`Image load failed (attempt ${attempt}):`, img.src);

    // Try different proxy strategies
    const strategies = [
        originalUrl, // Direct
        `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&default=1`,
        `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&default=1`,
        `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`,
    ];

    if (attempt < strategies.length) {
        // Try next strategy
        wrapper.setAttribute('data-attempt', attempt);
        img.src = strategies[attempt];
        console.log(`Trying strategy ${attempt + 1}:`, strategies[attempt]);
    } else {
        // All strategies failed - show placeholder
        img.classList.add('image-error');
        const productId = wrapper.getAttribute('data-product-id');
        const imageIndex = wrapper.getAttribute('data-image-index');
        console.log(`All strategies failed for product ${productId}, image ${imageIndex}`);

        wrapper.innerHTML = `
            <div class="image-placeholder">
                <i class="bi bi-image-slash"></i>
                <small>Ảnh không còn tồn tại</small>
            </div>
        `;
    }
}

// Make changePage available globally
window.changePage = changePage;
