class DCNCafeMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.allCafes = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.currentSearch = '';
        this.currentState = '';
        this.totalPages = 1;
        this.totalCafes = 0;
        
        this.initializeMap();
        this.setupEventListeners();
        this.loadCafeData();
    }

    initializeMap() {
        // Initialize map centered on US
        this.map = L.map('map').setView([39.8283, -98.5795], 4);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const stateFilter = document.getElementById('stateFilter');
        const clearFilters = document.getElementById('clearFilters');
        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value.trim();
                this.currentPage = 1;
                this.loadCafeData();
            }, 500);
        });

        stateFilter.addEventListener('change', (e) => {
            this.currentState = e.target.value;
            this.currentPage = 1;
            this.loadCafeData();
        });

        clearFilters.addEventListener('click', () => {
            searchInput.value = '';
            stateFilter.value = '';
            this.currentSearch = '';
            this.currentState = '';
            this.currentPage = 1;
            this.loadCafeData();
        });

        // Pagination controls
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadCafeData();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadCafeData();
            }
        });

        document.getElementById('pageSize').addEventListener('change', (e) => {
            this.pageSize = e.target.value === 'all' ? 1000 : parseInt(e.target.value);
            this.currentPage = 1;
            this.loadCafeData();
        });

        // Refresh button
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadCafeData(true);
        });
    }

    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (show) {
            loadingElement.classList.add('active');
        } else {
            loadingElement.classList.remove('active');
        }
    }

    async loadCafeData(forceRefresh = false) {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                search: this.currentSearch,
                state: this.currentState
            });

            if (forceRefresh) {
                params.append('_t', Date.now()); // Cache busting
            }

            const response = await fetch(`/api/cafes?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.allCafes = data.cafes;
            this.totalPages = data.totalPages;
            this.totalCafes = data.totalCafes;
            
            this.displayCafes();
            this.updateControls();
            this.populateStateFilter();
            
        } catch (error) {
            console.error('Error loading cafe data:', error);
            this.showError('Failed to load cafe data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    displayCafes() {
        this.clearMarkers();
        
        if (this.allCafes.length === 0) {
            this.updateStats('No cafes found');
            return;
        }
        
        const bounds = L.latLngBounds();
        let validCafes = 0;
        
        this.allCafes.forEach(cafe => {
            if (cafe.latitude && cafe.longitude) {
                const marker = this.createMarker(cafe);
                this.markers.push(marker);
                bounds.extend([cafe.latitude, cafe.longitude]);
                validCafes++;
            }
        });
        
        if (validCafes > 0) {
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }
        
        this.updateStats(`${validCafes} cafes displayed`);
    }

    createMarker(cafe) {
        const icon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #d27636; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        const marker = L.marker([cafe.latitude, cafe.longitude], { icon })
            .addTo(this.map);
        
        const popupContent = this.createPopupContent(cafe);
        marker.bindPopup(popupContent, {
            maxWidth: 350,
            className: 'cafe-popup-wrapper'
        });
        
        return marker;
    }

    createPopupContent(cafe) {
        // Use image proxy for reliable image loading
        const imageHtml = cafe.imageUrl ? 
            `<div class="cafe-image-wrapper">
                <img src="/api/image-proxy?url=${encodeURIComponent(cafe.imageUrl)}" 
                     alt="${cafe.name}" class="cafe-image" 
                     onload="this.style.opacity='1'" 
                     onerror="this.parentElement.style.display='none'">
            </div>` : '';
        
        return `
            <div class="cafe-popup">
                ${imageHtml}
                <div class="content">
                    <h3>${cafe.name}</h3>
                    <p class="address">${cafe.address}</p>
                    <blockquote class="snippet">${cafe.snippet}</blockquote>
                    <div class="popup-footer">
                        <a href="${cafe.articleUrl}" target="_blank" class="read-more">Read full article</a>
                        <span class="date">${this.formatDate(cafe.date)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    updateControls() {
        // Update pagination
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        const pagination = document.getElementById('paginationTop');
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
        pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        
        // Show/hide pagination based on total pages
        if (this.totalPages > 1) {
            pagination.style.display = 'flex';
        } else {
            pagination.style.display = 'none';
        }
    }

    updateStats(message) {
        const countElement = document.getElementById('cafeCount');
        countElement.textContent = message || `${this.totalCafes} total cafes`;
    }

    async populateStateFilter() {
        // Extract unique states from loaded cafes for quick filtering
        const states = new Set();
        this.allCafes.forEach(cafe => {
            const address = cafe.address.toLowerCase();
            // Simple state extraction - could be improved
            const stateMatches = address.match(/,\s*([a-z\s]+)$/i);
            if (stateMatches) {
                const state = stateMatches[1].trim();
                if (state.length <= 20) { // Reasonable state name length
                    states.add(state);
                }
            }
        });
        
        const stateFilter = document.getElementById('stateFilter');
        const currentValue = stateFilter.value;
        
        // Clear existing options except "All States"
        stateFilter.innerHTML = '<option value="">All States</option>';
        
        // Add state options
        Array.from(states).sort().forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateFilter.appendChild(option);
        });
        
        // Restore previous selection
        stateFilter.value = currentValue;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            return dateString;
        }
    }

    showError(message) {
        // Simple error display - could be improved with a proper notification system
        alert(message);
    }
}

// Initialize the map when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DCNCafeMap();
});