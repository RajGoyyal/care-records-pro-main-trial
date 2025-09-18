// Comprehensive HMIS Components File
// This file contains all React components for the HMIS application
// Components have been extracted from the original hmis-standalone.html for modularity

// NOTE: Individual components are now in separate .jsx files:
// - Dashboard.jsx: Interactive dashboard with charts and statistics  
// - PatientForm.jsx: Patient registration and management
// - VitalsForm.jsx: Vital signs recording with BMI calculations
// - PrescriptionForm.jsx: Prescription creation and printing
// - PrescriptionManagement.jsx: Prescription search and management  
// - ExportData.jsx: CSV export functionality
// - PatientList.jsx: Patient listing and search
// - CaseReportManagement.jsx: Medical case reports and sick leave
// - utilities.js: Shared utility functions

console.log('🚀 All HMIS components are now modular!');
console.log('📁 Components available in separate .jsx files');
console.log('⚡ Load individual components as needed');

// Export global access for components (loaded from separate files)
window.HMISComponents = window.HMISComponents || {};

// Components will be available after their respective .jsx files are loaded
// Example usage:
// ReactDOM.render(React.createElement(Dashboard), document.getElementById('dashboard-content'));