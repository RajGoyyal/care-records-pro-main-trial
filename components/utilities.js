// Shared utilities for HMIS components

// Storage utilities
const saveToStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
};

const loadFromStorage = (key, defaultValue = []) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
};

// API utilities
const apiRequest = async (url, options = {}) => {
    try {
        const response = await fetch(`http://localhost:5000${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// Server health check
const checkServerHealth = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return response.ok;
    } catch (error) {
        console.warn('Server health check failed:', error);
        return false;
    }
};

// Database sync utility
const syncWithDatabase = async (endpoint, data, method = 'POST') => {
    try {
        const response = await apiRequest(`/api/${endpoint}`, {
            method: method,
            body: JSON.stringify(data)
        });
        return response;
    } catch (error) {
        console.error(`Failed to sync with database (${endpoint}):`, error);
        return null;
    }
};

// Merge arrays utility - prioritizes newer data based on timestamps and local modifications
const mergeArrays = (localArray, serverArray, keyField) => {
    const localMap = new Map();
    const merged = [];
    
    // First pass: add all local items
    localArray.forEach(item => {
        localMap.set(item[keyField], item);
        merged.push(item);
    });
    
    // Second pass: add server items that aren't local or are newer
    serverArray.forEach(serverItem => {
        const localItem = localMap.get(serverItem[keyField]);
        if (!localItem) {
            merged.push(serverItem);
        } else {
            // Keep local if it's newer or has been modified locally
            const localTime = localItem.updatedAt || localItem.createdAt || 0;
            const serverTime = serverItem.updatedAt || serverItem.createdAt || 0;
            if (serverTime > localTime) {
                const index = merged.findIndex(item => item[keyField] === serverItem[keyField]);
                if (index !== -1) merged[index] = serverItem;
            }
        }
    });
    
    return merged;
};

// Cleanup old protection entries for locally modified prescriptions
const cleanupLocalProtections = () => {
    try {
        const protections = JSON.parse(localStorage.getItem('localModifications') || '{}');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        Object.keys(protections).forEach(key => {
            if (now - protections[key] > oneHour) {
                delete protections[key];
            }
        });
        
        localStorage.setItem('localModifications', JSON.stringify(protections));
    } catch (error) {
        console.error('Error cleaning up local protections:', error);
    }
};

// Recovery function to restore backup data
const restoreBackupData = () => {
    const backupPatients = loadFromStorage('backup_patients', []);
    const backupVitals = loadFromStorage('backup_vitals', []);
    const backupPrescriptions = loadFromStorage('backup_prescriptions', []);
    const backupCaseReports = loadFromStorage('backup_caseReports', []);
    const backupSickIntimations = loadFromStorage('backup_sickIntimations', []);
    
    if (backupPatients.length > 0) saveToStorage('patients', backupPatients);
    if (backupVitals.length > 0) saveToStorage('vitals', backupVitals);
    if (backupPrescriptions.length > 0) saveToStorage('prescriptions', backupPrescriptions);
    if (backupCaseReports.length > 0) saveToStorage('caseReports', backupCaseReports);
    if (backupSickIntimations.length > 0) saveToStorage('sickIntimations', backupSickIntimations);
    
    return {
        patients: backupPatients,
        vitals: backupVitals,
        prescriptions: backupPrescriptions,
        caseReports: backupCaseReports,
        sickIntimations: backupSickIntimations
    };
};