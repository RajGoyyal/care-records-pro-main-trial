# 🏥 HMIS Care Records Pro

**Health Management Information System - Complete Medical Clinic Management Solution**

A comprehensive medical clinic management system that helps healthcare providers manage patient records, prescriptions, vitals, and generate reports efficiently. This system includes both a modern React frontend and a Python backend with database functionality.

## 📋 Table of Contents
- [🌟 Features](#-features)
- [🏗️ System Architecture](#️-system-architecture)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [💻 Development Setup](#-development-setup)
- [🐍 Python Backend Setup](#-python-backend-setup)
- [📱 Using the Application](#-using-the-application)
- [🔧 Configuration](#-configuration)
- [📊 Data Management](#-data-management)
- [🖨️ Printing Features](#️-printing-features)
- [🚨 Troubleshooting](#-troubleshooting)
- [🤝 Support](#-support)

## 🌟 Features

### 📋 Patient Management
- **Patient Registration**: Complete patient information with demographics
- **Medical History**: Track patient's medical background and allergies
- **Search & Filter**: Quick patient lookup with multiple search criteria
- **Patient Dashboard**: Overview of patient's complete medical journey

### 💊 Prescription Management
- **Digital Prescriptions**: Create and manage electronic prescriptions
- **Drug Database**: Comprehensive medication database with dosage information
- **Prescription History**: Track all medications prescribed to patients
- **Print Ready**: Professional prescription formats for printing

### 📊 Vital Signs Tracking
- **Comprehensive Vitals**: Blood pressure, heart rate, temperature, weight, height
- **BMI Calculation**: Automatic BMI calculation and classification
- **Vital History**: Track vital sign trends over time
- **Visual Charts**: Graphical representation of vital sign patterns

### 📈 Analytics & Reports
- **Dashboard Analytics**: Real-time statistics and insights
- **Patient Reports**: Comprehensive patient summary reports
- **Prescription Reports**: Medication usage and prescription analytics
- **Sick Leave Certificates**: Generate official medical certificates

### 🖨️ Professional Printing
- **NHCE Clinic Branding**: Official clinic letterhead and logos
- **Multiple Formats**: Prescriptions, certificates, reports
- **Print Optimization**: Clean, professional layouts for all documents

## 🏗️ System Architecture

### Frontend (React Application)
- **Technology**: React + TypeScript + Vite
- **UI Framework**: Shadcn/ui + Tailwind CSS
- **Storage**: Local Storage with sync capabilities
- **File**: `hmis-standalone.html` (Complete standalone application)

### Backend (Python Flask)
- **Technology**: Python 3.9+ + Flask + SQLite
- **Database**: SQLite for data persistence
- **API**: RESTful endpoints for data operations
- **Location**: `python_hmis/` directory

## 📋 Prerequisites

### For Everyone (Non-Technical Users)
- **Computer**: Windows, Mac, or Linux computer
- **Internet Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Internet Connection**: Required for initial setup

### For Developers
- **Node.js**: Version 16 or higher
- **Python**: Version 3.9 or higher
- **Git**: For version control
- **Code Editor**: VS Code recommended

## 🚀 Quick Start Guide

### Option 1: Simple Setup (No Installation Required)
1. **Download the Project**
   - Download the project as a ZIP file
   - Extract it to your desired location

2. **Open the Application**
   - Navigate to the project folder
   - Open `hmis-standalone.html` in your web browser
   - Start using the system immediately!

### Option 2: Full Development Setup
Follow the [Development Setup](#-development-setup) section below.

## 💻 Development Setup

### Step 1: Install Node.js
1. **Download Node.js**
   - Visit [nodejs.org](https://nodejs.org/)
   - Download and install the LTS (Long Term Support) version
   - Verify installation: Open terminal/command prompt and type:
     ```bash
     node --version
     npm --version
     ```

### Step 2: Clone/Download the Project
```bash
# If using Git
git clone <YOUR_GIT_URL>
cd care-records-pro-main

# Or download ZIP and extract
```

### Step 3: Install Dependencies
```bash
# Install all required packages
npm install
```

### Step 4: Start Development Server
```bash
# Start the development server
npm run dev
```

The application will open in your browser at `http://localhost:5173`

### Step 5: Build for Production
```bash
# Create production build
npm run build
```

## 🐍 Python Backend Setup

### Step 1: Install Python
1. **Download Python**
   - Visit [python.org](https://python.org/)
   - Download Python 3.9 or higher
   - During installation, check "Add Python to PATH"

2. **Verify Installation**
   ```bash
   python --version
   pip --version
   ```

### Step 2: Setup Python Environment
```bash
# Navigate to Python backend directory
cd python_hmis

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

### Step 3: Start Python Server
```bash
# Start the Flask server
python app.py
```

The Python backend will run at `http://localhost:5000`

## 📱 Using the Application

### 🆕 Getting Started
1. **Open the Application**
   - Open `hmis-standalone.html` in your browser
   - Or access the development server at `http://localhost:5173`

2. **Dashboard Overview**
   - View patient statistics
   - Quick access to all features
   - Real-time analytics

### 👥 Managing Patients
1. **Add New Patient**
   - Click "Patient Registration"
   - Fill in patient details (name, age, contact, etc.)
   - Add medical history and allergies
   - Save patient record

2. **Search Patients**
   - Use the search bar to find patients
   - Filter by name, phone, or patient ID
   - View patient details and history

### 💊 Creating Prescriptions
1. **Start New Prescription**
   - Select a patient
   - Click "New Prescription"
   - Add medications with dosage and instructions
   - Save and print if needed

2. **View Prescription History**
   - Access patient's prescription history
   - Track medication compliance
   - Generate reports

### 📊 Recording Vitals
1. **Add Vital Signs**
   - Select patient
   - Click "Record Vitals"
   - Enter blood pressure, heart rate, temperature, weight, height
   - BMI is calculated automatically
   - Save the records

### 🖨️ Printing Documents
1. **Print Prescriptions**
   - Open prescription
   - Click "Print" button
   - Professional NHCE clinic format

2. **Print Certificates**
   - Generate sick leave certificates
   - Medical reports
   - Patient summaries

## 🔧 Configuration

### 🏥 Clinic Information
Update clinic details in the application:
- Clinic name and address
- Doctor information
- Contact details
- Logo and branding

### 💾 Data Storage
- **Local Storage**: Data stored in browser (standalone mode)
- **Database**: SQLite database (Python backend mode)
- **Sync**: Automatic synchronization between frontend and backend

### 🖨️ Print Settings
- Adjust print margins
- Configure page layouts
- Set default paper sizes

## 📊 Data Management

### 💾 Backup Your Data
1. **Local Storage Backup**
   - Export data from the application
   - Save backup files regularly

2. **Database Backup**
   - Copy the SQLite database file
   - Store in secure location

### 📤 Data Export
- Export patient data to CSV
- Generate comprehensive reports
- Create data snapshots

### 📥 Data Import
- Import patient data from CSV files
- Bulk import prescriptions
- Migrate from other systems

## 🖨️ Printing Features

### 📋 Available Print Formats
1. **Prescriptions**
   - Professional medical prescription format
   - NHCE clinic letterhead
   - Doctor signature area

2. **Sick Leave Certificates**
   - Official medical certificate format
   - Customizable duration and reasons
   - Legal compliance

3. **Patient Reports**
   - Comprehensive medical summaries
   - Vital signs history
   - Prescription history

### 🖨️ Print Tips
- Use A4 paper for best results
- Ensure printer has adequate margins
- Preview before printing
- Check logo and formatting

## 🚨 Troubleshooting

### 🔧 Common Issues

#### Application Won't Load
- **Check browser compatibility**: Use Chrome, Firefox, Safari, or Edge
- **Clear browser cache**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- **Disable browser extensions**: Try in incognito/private mode

#### Data Not Saving
- **Check browser storage**: Ensure cookies and local storage are enabled
- **Browser storage full**: Clear old data or use a different browser
- **JavaScript disabled**: Enable JavaScript in browser settings

#### Print Issues
- **Logo not showing**: Check file paths and permissions
- **Layout problems**: Adjust print margins and page setup
- **Missing content**: Ensure all required fields are filled

#### Python Backend Issues
- **Port already in use**: Change port in `app.py` or stop other applications
- **Database errors**: Check SQLite file permissions
- **Module not found**: Ensure virtual environment is activated and dependencies installed

### 🆘 Getting Help

#### Self-Help Resources
1. **Check browser console**: F12 → Console tab for error messages
2. **Verify file permissions**: Ensure all files are accessible
3. **Update browser**: Use the latest version
4. **Restart application**: Close and reopen the browser

#### Common Error Solutions
- **"Cannot read property"**: Refresh the page
- **"Network error"**: Check internet connection and backend server
- **"Storage quota exceeded"**: Clear browser data or export/delete old records

## 🤝 Support

### 📞 Getting Help
- **Technical Issues**: Check troubleshooting section first
- **Feature Requests**: Create detailed requirements
- **Bug Reports**: Include steps to reproduce

### 📚 Additional Resources
- **User Manual**: Detailed feature documentation
- **Video Tutorials**: Step-by-step guides
- **FAQ**: Frequently asked questions

### 🔄 Updates and Maintenance
- **Regular Backups**: Export data regularly
- **Browser Updates**: Keep browser updated
- **System Updates**: Update dependencies periodically

---

## 📝 Quick Reference

### 🚀 Essential Commands
```bash
# Start development
npm run dev

# Build for production
npm run build

# Start Python backend
cd python_hmis && python app.py

# Install dependencies
npm install
pip install -r requirements.txt
```

### 📁 Important Files
- `hmis-standalone.html` - Complete standalone application
- `python_hmis/app.py` - Python Flask backend
- `package.json` - Node.js dependencies
- `requirements.txt` - Python dependencies

### 🌐 Default URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000
- **Standalone**: Open `hmis-standalone.html` directly

---

**Ready to transform your clinic's patient management? Start with the Quick Start Guide above! 🚀**
