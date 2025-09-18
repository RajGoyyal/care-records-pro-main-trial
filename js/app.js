// Main application initialization and coordination

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Global application state
const AppState = {
    currentTab: 'dashboard',
    serverHealth: false,
    isLoading: false,
    alerts: [],
    components: {}
};

// Initialize the main application
function initializeApp() {
    try {
        console.log('🚀 Initializing HMIS Application...');
        
        // Check server health
        checkServerHealth();
        
        // Set up event listeners
        setupEventListeners();
        
        // Add delay to ensure Babel has transpiled all JSX components
        setTimeout(() => {
            // Initialize components after a short delay
            initializeComponents();
            
            // Show initial tab
            showTab('dashboard');
            
            console.log('✅ HMIS Application initialized successfully');
        }, 1000); // 1 second delay to ensure all components are loaded
        
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        showAlert('Failed to initialize application. Please refresh the page.', 'error');
    }
}

// Initialize all React components
function initializeComponents() {
    try {
        const { createElement } = React;
        const { render } = ReactDOM;
        
        console.log('🔄 Initializing React components...');
        
        // Initialize Dashboard
        if (window.Dashboard) {
            console.log('✅ Loading Dashboard component');
            AppState.components.dashboard = window.Dashboard;
            render(
                createElement(window.Dashboard),
                document.getElementById('dashboard-content')
            );
        } else {
            console.warn('⚠️ Dashboard component not found');
        }
        
        // Initialize Patient Form
        if (window.PatientForm) {
            console.log('✅ Loading PatientForm component');
            AppState.components.patientForm = window.PatientForm;
            render(
                createElement(window.PatientForm),
                document.getElementById('patients-content')
            );
        } else {
            console.warn('⚠️ PatientForm component not found');
        }
        
        // Initialize Vitals Form
        if (window.VitalsForm) {
            console.log('✅ Loading VitalsForm component');
            AppState.components.vitalsForm = window.VitalsForm;
            render(
                createElement(window.VitalsForm),
                document.getElementById('vitals-content')
            );
        } else {
            console.warn('⚠️ VitalsForm component not found');
        }
        
        // Initialize Prescription Form
        if (window.PrescriptionForm) {
            console.log('✅ Loading PrescriptionForm component');
            AppState.components.prescriptionForm = window.PrescriptionForm;
            render(
                createElement(window.PrescriptionForm),
                document.getElementById('prescriptions-content')
            );
        } else {
            console.warn('⚠️ PrescriptionForm component not found');
        }
        
        // Initialize Prescription Management
        if (window.PrescriptionManagement) {
            console.log('✅ Loading PrescriptionManagement component');
            AppState.components.prescriptionManagement = window.PrescriptionManagement;
            render(
                createElement(window.PrescriptionManagement),
                document.getElementById('prescription-management-content')
            );
        } else {
            console.warn('⚠️ PrescriptionManagement component not found');
        }
        
        // Initialize Patient List
        if (window.PatientList) {
            console.log('✅ Loading PatientList component');
            AppState.components.patientList = window.PatientList;
            render(
                createElement(window.PatientList),
                document.getElementById('patient-list-content')
            );
        } else {
            console.warn('⚠️ PatientList component not found');
        }
        
        // Initialize Export Data
        if (window.ExportData) {
            console.log('✅ Loading ExportData component');
            AppState.components.exportData = window.ExportData;
            render(
                createElement(window.ExportData),
                document.getElementById('export-content')
            );
        } else {
            console.warn('⚠️ ExportData component not found');
        }
        
        // Initialize Case Report Management
        if (window.CaseReportManagement) {
            console.log('✅ Loading CaseReportManagement component');
            AppState.components.caseReportManagement = window.CaseReportManagement;
            render(
                createElement(window.CaseReportManagement),
                document.getElementById('case-reports-content')
            );
        } else {
            console.warn('⚠️ CaseReportManagement component not found');
        }
        
        console.log('✅ Components initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing components:', error);
        showAlert('Failed to initialize components. Some features may not work.', 'error');
    }
}

// Set up global event listeners
function setupEventListeners() {
    // Server health check interval
    setInterval(checkServerHealth, 30000); // Check every 30 seconds
    
    // Global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        showAlert('An unexpected error occurred. Please try again.', 'error');
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showAlert('A network or processing error occurred. Please try again.', 'error');
    });
    
    // Handle before unload for data saving
    window.addEventListener('beforeunload', function(event) {
        if (hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    });
}

// Check server health status
async function checkServerHealth() {
    try {
        const indicator = document.getElementById('server-indicator');
        const text = document.getElementById('server-text');
        
        if (window.checkServerHealth) {
            const isHealthy = await window.checkServerHealth();
            AppState.serverHealth = isHealthy;
            
            if (indicator && text) {
                if (isHealthy) {
                    indicator.className = 'w-3 h-3 rounded-full bg-green-400';
                    text.textContent = 'Server Connected';
                } else {
                    indicator.className = 'w-3 h-3 rounded-full bg-red-400';
                    text.textContent = 'Server Offline';
                }
            }
        }
    } catch (error) {
        console.warn('Server health check failed:', error);
        AppState.serverHealth = false;
        
        const indicator = document.getElementById('server-indicator');
        const text = document.getElementById('server-text');
        
        if (indicator && text) {
            indicator.className = 'w-3 h-3 rounded-full bg-yellow-400';
            text.textContent = 'Connection Error';
        }
    }
}

// Show tab content
function showTab(tabName) {
    // Update current tab
    AppState.currentTab = tabName;
    
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
    }
    
    // Trigger component updates if needed
    triggerComponentUpdate(tabName);
}

// Trigger component updates when switching tabs
function triggerComponentUpdate(tabName) {
    try {
        switch (tabName) {
            case 'dashboard':
                if (AppState.components.dashboard && AppState.components.dashboard.refresh) {
                    AppState.components.dashboard.refresh();
                }
                break;
            case 'patient-list':
                if (AppState.components.patientList && AppState.components.patientList.refresh) {
                    AppState.components.patientList.refresh();
                }
                break;
            case 'prescription-management':
                if (AppState.components.prescriptionManagement && AppState.components.prescriptionManagement.refresh) {
                    AppState.components.prescriptionManagement.refresh();
                }
                break;
        }
    } catch (error) {
        console.warn('Error triggering component update:', error);
    }
}

// Show alert message
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertId = Date.now();
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} fade-in`;
    alertElement.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button class="ml-4 text-lg font-bold opacity-70 hover:opacity-100" onclick="dismissAlert('${alertId}')">&times;</button>
        </div>
    `;
    alertElement.id = `alert-${alertId}`;
    
    alertContainer.appendChild(alertElement);
    AppState.alerts.push(alertId);
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => dismissAlert(alertId), duration);
    }
}

// Dismiss alert
function dismissAlert(alertId) {
    const alertElement = document.getElementById(`alert-${alertId}`);
    if (alertElement) {
        alertElement.classList.add('fade-out');
        setTimeout(() => {
            alertElement.remove();
            AppState.alerts = AppState.alerts.filter(id => id !== alertId);
        }, 300);
    }
}

// Check for unsaved changes
function hasUnsavedChanges() {
    // This would be implemented by individual components
    // For now, return false
    return false;
}

// Utility function to refresh all data
function refreshAllData() {
    try {
        showAlert('Refreshing data...', 'info', 2000);
        
        // Trigger refresh on all components
        Object.values(AppState.components).forEach(component => {
            if (component && component.refresh) {
                component.refresh();
            }
        });
        
        // Refresh current tab
        triggerComponentUpdate(AppState.currentTab);
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        showAlert('Failed to refresh data. Please try again.', 'error');
    }
}

// Export global functions
window.AppState = AppState;
window.showAlert = showAlert;
window.dismissAlert = dismissAlert;
window.showTab = showTab;
window.refreshAllData = refreshAllData;

// Add CSS for fade effects
const style = document.createElement('style');
style.textContent = `
    .fade-out {
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease-in-out;
    }
`;
document.head.appendChild(style);