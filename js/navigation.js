// Navigation and tab management

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
});

// Initialize navigation system
function initializeNavigation() {
    try {
        setupTabListeners();
        setupKeyboardNavigation();
        setupMobileNavigation();
        
        console.log('✅ Navigation system initialized');
    } catch (error) {
        console.error('❌ Error initializing navigation:', error);
    }
}

// Set up tab click listeners
function setupTabListeners() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.dataset.tab;
            
            if (tabName && tabName !== window.AppState?.currentTab) {
                navigateToTab(tabName);
            }
        });
        
        // Add keyboard support for tabs
        tab.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// Navigate to specific tab
function navigateToTab(tabName) {
    try {
        // Validate tab exists
        const targetContent = document.getElementById(`${tabName}-content`);
        if (!targetContent) {
            console.warn(`Tab content not found for: ${tabName}`);
            return;
        }
        
        // Show loading state
        setLoadingState(true);
        
        // Use the global showTab function
        if (window.showTab) {
            window.showTab(tabName);
        } else {
            // Fallback implementation
            showTabFallback(tabName);
        }
        
        // Update URL hash without triggering scroll
        updateUrlHash(tabName);
        
        // Track navigation
        trackNavigation(tabName);
        
        // Clear loading state
        setTimeout(() => setLoadingState(false), 300);
        
    } catch (error) {
        console.error('Error navigating to tab:', error);
        setLoadingState(false);
        
        if (window.showAlert) {
            window.showAlert(`Failed to navigate to ${tabName}. Please try again.`, 'error');
        }
    }
}

// Fallback tab navigation
function showTabFallback(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update tab content
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
    });
    
    const activePane = document.getElementById(`${tabName}-content`);
    if (activePane) {
        activePane.classList.add('active');
        activePane.classList.add('fade-in');
    }
}

// Set up keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Number keys for tab navigation
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '8') {
            e.preventDefault();
            
            const tabIndex = parseInt(e.key) - 1;
            const tabs = document.querySelectorAll('.tab');
            
            if (tabs[tabIndex]) {
                const tabName = tabs[tabIndex].dataset.tab;
                navigateToTab(tabName);
            }
        }
        
        // Alt + Left/Right for tab switching
        if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            navigateToAdjacentTab(e.key === 'ArrowRight' ? 1 : -1);
        }
    });
}

// Navigate to adjacent tab
function navigateToAdjacentTab(direction) {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentTab = tabs.find(tab => tab.classList.contains('active'));
    
    if (!currentTab) return;
    
    const currentIndex = tabs.indexOf(currentTab);
    let newIndex = currentIndex + direction;
    
    // Wrap around
    if (newIndex >= tabs.length) newIndex = 0;
    if (newIndex < 0) newIndex = tabs.length - 1;
    
    const newTab = tabs[newIndex];
    if (newTab) {
        navigateToTab(newTab.dataset.tab);
    }
}

// Set up mobile navigation
function setupMobileNavigation() {
    // Handle mobile tab scrolling
    const tabContainer = document.querySelector('nav .flex');
    if (!tabContainer) return;
    
    // Add scroll indicators for mobile
    updateScrollIndicators();
    
    tabContainer.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);
}

// Update scroll indicators for mobile tabs
function updateScrollIndicators() {
    const tabContainer = document.querySelector('nav .flex');
    if (!tabContainer) return;
    
    const canScrollLeft = tabContainer.scrollLeft > 0;
    const canScrollRight = tabContainer.scrollLeft < (tabContainer.scrollWidth - tabContainer.clientWidth);
    
    // Add/remove classes to indicate scroll state
    tabContainer.classList.toggle('can-scroll-left', canScrollLeft);
    tabContainer.classList.toggle('can-scroll-right', canScrollRight);
}

// Update URL hash
function updateUrlHash(tabName) {
    try {
        const newHash = `#${tabName}`;
        if (window.location.hash !== newHash) {
            history.replaceState(null, null, newHash);
        }
    } catch (error) {
        console.warn('Could not update URL hash:', error);
    }
}

// Track navigation for analytics
function trackNavigation(tabName) {
    try {
        console.log(`📊 Navigation: ${tabName}`);
        
        // Could integrate with analytics here
        if (window.gtag) {
            gtag('event', 'page_view', {
                page_title: tabName,
                page_location: window.location.href
            });
        }
    } catch (error) {
        console.warn('Navigation tracking failed:', error);
    }
}

// Set loading state
function setLoadingState(isLoading) {
    const body = document.body;
    
    if (isLoading) {
        body.classList.add('loading');
    } else {
        body.classList.remove('loading');
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function(e) {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(`${hash}-content`)) {
        navigateToTab(hash);
    }
});

// Initialize from URL hash on load
window.addEventListener('load', function() {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(`${hash}-content`)) {
        navigateToTab(hash);
    }
});

// Breadcrumb navigation
function updateBreadcrumb(tabName) {
    const breadcrumbMap = {
        'dashboard': ['Dashboard'],
        'patients': ['Patients', 'Registration'],
        'vitals': ['Patients', 'Vitals'],
        'prescriptions': ['Patients', 'Prescriptions'],
        'prescription-management': ['Management', 'Prescriptions'],
        'patient-list': ['Management', 'Patient List'],
        'export': ['Tools', 'Export Data'],
        'case-reports': ['Reports', 'Case Reports']
    };
    
    const breadcrumb = breadcrumbMap[tabName] || [tabName];
    
    // Update breadcrumb if element exists
    const breadcrumbElement = document.getElementById('breadcrumb');
    if (breadcrumbElement) {
        breadcrumbElement.innerHTML = breadcrumb
            .map((item, index) => {
                if (index === breadcrumb.length - 1) {
                    return `<span class="text-gray-500">${item}</span>`;
                } else {
                    return `<span class="text-blue-600 cursor-pointer">${item}</span>`;
                }
            })
            .join(' <span class="text-gray-300">›</span> ');
    }
}

// Export navigation functions
window.navigateToTab = navigateToTab;
window.updateBreadcrumb = updateBreadcrumb;