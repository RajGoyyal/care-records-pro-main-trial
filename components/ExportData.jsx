// ExportData Component - CSV export functionality for all data types
// Usage: <ExportData patients={patients} vitals={vitals} prescriptions={prescriptions} />

window.HMISComponents = window.HMISComponents || {};

window.HMISComponents.ExportData = ({ patients, vitals, prescriptions }) => {
    const safePatients = patients || [];
    const safeVitals = vitals || [];
    const safePrescriptions = prescriptions || [];

    // Helper functions
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        if (str.includes('"')) str = str.replace(/"/g, '""');
        if (/[",\n]/.test(str)) str = `"${str}"`;
        return str;
    };

    const downloadCSV = (rows, filename, columns, headers) => {
        if (!rows || rows.length === 0) {
            alert('No data to export');
            return;
        }
        const headerLine = (headers || columns).map(escapeCSV).join(',');
        const dataLines = rows.map(r => columns.map(col => escapeCSV(r[col])).join(','));
        const csvContent = [headerLine, ...dataLines].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Attempt server export then fallback to shaped local data
    const tryDatabaseExport = async (endpoint, shapedData, filename, columns, headers) => {
        let success = false;
        try {
            console.log(`Attempting database export for ${endpoint}...`);
            const BACKEND_BASE = 'http://localhost:5000'; // Fallback base URL
            const response = await fetch(`${BACKEND_BASE}/api/export/${endpoint}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                alert(`${endpoint} exported successfully from database!`);
                success = true;
            } else {
                console.warn(`Database export failed for ${endpoint}, status: ${response.status}`);
            }
        } catch (err) {
            console.warn(`Database export failed for ${endpoint}:`, err);
        }
        if (!success) {
            console.log(`Falling back to local shaped data for ${endpoint}`);
            downloadCSV(shapedData, filename, columns, headers);
            alert(`${endpoint} exported from local data (database not available)`);
        }
        return success;
    };

    // Shape data functions
    const shapePatients = () => safePatients.map(p => ({
        usn: p.usn,
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        phone: p.phone || '',
        email: p.email || '',
        address: p.address || '',
        createdAt: p.createdAt || ''
    }));

    const shapeVitals = () => safeVitals.map(v => ({
        id: v.id,
        usn: v.usn,
        patientName: v.patientName || '',
        weight: v.weight ?? '',
        height: v.height ?? '',
        bmi: v.bmi ?? '',
        systolic: v.bloodPressureSystolic ?? '',
        diastolic: v.bloodPressureDiastolic ?? '',
        heartRate: v.heartRate ?? '',
        temperature: v.temperature ?? '',
        respiratoryRate: v.respiratoryRate ?? '',
        oxygenSaturation: v.oxygenSaturation ?? '',
        recordedAt: v.recordedAt || '',
        recordedBy: v.recordedBy || ''
    }));

    const flattenMedications = (medList) => (medList || []).map(m => 
        `${m.name} (${m.dosage || ''}; ${m.frequency || ''}${m.duration ? '; ' + m.duration : ''})${m.instructions ? ' - ' + m.instructions : ''}`
    ).join(' | ');

    const shapePrescriptions = () => safePrescriptions.map(p => ({
        id: p.id,
        usn: p.usn,
        patientName: p.patientName || '',
        age: p.patientAge || '',
        gender: p.patientGender || '',
        diagnosis: p.diagnosis || '',
        medications: flattenMedications(p.medications),
        followUpDate: p.followUpDate || '',
        prescribedAt: p.prescribedAt || '',
        prescribedAtIST: p.prescribedAtIST || '',
        prescribedBy: p.prescribedBy || '',
        priority: p.priority || '',
        notes: (p.notes || '').replace(/\n/g,' '),
        status: p.status || ''
    }));

    const getAllDataForExport = () => safePatients.map(p => {
        const vRecs = safeVitals.filter(v => v.usn === p.usn);
        const latest = vRecs.length ? vRecs[vRecs.length - 1] : {};
        const pres = safePrescriptions.filter(pr => pr.usn === p.usn);
        return {
            usn: p.usn,
            fullName: p.fullName,
            age: p.age,
            gender: p.gender,
            phone: p.phone || '',
            email: p.email || '',
            latestWeight: latest.weight ?? '',
            latestHeight: latest.height ?? '',
            latestBMI: latest.bmi ?? '',
            latestSystolic: latest.bloodPressureSystolic ?? '',
            latestDiastolic: latest.bloodPressureDiastolic ?? '',
            latestHeartRate: latest.heartRate ?? '',
            latestTemperature: latest.temperature ?? '',
            totalVitals: vRecs.length,
            totalPrescriptions: pres.length
        };
    });

    // Column definitions
    const patientCols = ['usn','fullName','age','gender','phone','email','address','createdAt'];
    const patientHeaders = ['USN','Full Name','Age','Gender','Phone','Email','Address','Created At'];

    const vitalsCols = ['id','usn','patientName','weight','height','bmi','systolic','diastolic','heartRate','temperature','respiratoryRate','oxygenSaturation','recordedAt','recordedBy'];
    const vitalsHeaders = ['ID','USN','Patient Name','Weight(kg)','Height(cm)','BMI','Systolic','Diastolic','Heart Rate','Temp(°C)','Resp Rate','SpO2','Recorded At','Recorded By'];

    const prescriptionCols = ['id','usn','patientName','age','gender','diagnosis','medications','followUpDate','prescribedAt','prescribedAtIST','prescribedBy','priority','notes','status'];
    const prescriptionHeaders = ['ID','USN','Patient Name','Age','Gender','Treatment / Diagnosis','Medications','Follow Up','Prescribed At','Prescribed At (IST)','Prescribed By','Priority','Notes','Status'];

    const completeCols = ['usn','fullName','age','gender','phone','email','latestWeight','latestHeight','latestBMI','latestSystolic','latestDiastolic','latestHeartRate','latestTemperature','totalVitals','totalPrescriptions'];
    const completeHeaders = ['USN','Full Name','Age','Gender','Phone','Email','Latest Weight','Latest Height','Latest BMI','Latest Systolic','Latest Diastolic','Latest HR','Latest Temp','Total Vitals','Total Prescriptions'];

    // Export functions
    const exportPatients = () => tryDatabaseExport('patients', shapePatients(), 'patients.csv', patientCols, patientHeaders);
    const exportVitals = () => tryDatabaseExport('vitals', shapeVitals(), 'vitals.csv', vitalsCols, vitalsHeaders);
    const exportPrescriptions = () => tryDatabaseExport('prescriptions', shapePrescriptions(), 'prescriptions.csv', prescriptionCols, prescriptionHeaders);
    const exportAllData = () => tryDatabaseExport('complete', getAllDataForExport(), 'complete_patient_data.csv', completeCols, completeHeaders);

    return React.createElement('div', { className: 'card' },
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Export Data'),
        
        React.createElement('div', { className: 'grid gap-4 md:grid-cols-2 lg:grid-cols-4' },
            React.createElement('div', { className: 'p-4 border rounded-lg' },
                React.createElement('h3', { className: 'font-medium mb-2' }, 'Patients'),
                React.createElement('p', { className: 'text-sm text-gray-600 mb-3' }, `${safePatients.length} records`),
                React.createElement('button', {
                    onClick: exportPatients,
                    className: 'btn btn-primary w-full text-sm',
                    disabled: safePatients.length === 0
                }, 'Export Patients CSV')
            ),

            React.createElement('div', { className: 'p-4 border rounded-lg' },
                React.createElement('h3', { className: 'font-medium mb-2' }, 'Vitals'),
                React.createElement('p', { className: 'text-sm text-gray-600 mb-3' }, `${safeVitals.length} records`),
                React.createElement('button', {
                    onClick: exportVitals,
                    className: 'btn btn-primary w-full text-sm',
                    disabled: safeVitals.length === 0
                }, 'Export Vitals CSV')
            ),

            React.createElement('div', { className: 'p-4 border rounded-lg' },
                React.createElement('h3', { className: 'font-medium mb-2' }, 'Prescriptions'),
                React.createElement('p', { className: 'text-sm text-gray-600 mb-3' }, `${safePrescriptions.length} records`),
                React.createElement('button', {
                    onClick: exportPrescriptions,
                    className: 'btn btn-primary w-full text-sm',
                    disabled: safePrescriptions.length === 0
                }, 'Export Prescriptions CSV')
            ),

            React.createElement('div', { className: 'p-4 border rounded-lg bg-blue-50' },
                React.createElement('h3', { className: 'font-medium mb-2' }, 'Complete Data'),
                React.createElement('p', { className: 'text-sm text-gray-600 mb-3' }, 'All patient info with latest vitals'),
                React.createElement('button', {
                    onClick: exportAllData,
                    className: 'btn btn-primary w-full text-sm',
                    disabled: safePatients.length === 0
                }, 'Export All Data CSV')
            )
        ),

        React.createElement('div', { className: 'mt-6 p-4 bg-gray-50 rounded' },
            React.createElement('h4', { className: 'font-medium mb-2' }, 'Export Information:'),
            React.createElement('ul', { className: 'text-sm text-gray-600 space-y-1' },
                React.createElement('li', null, '• ', React.createElement('strong', null, 'Patients CSV:'), ' Basic patient information'),
                React.createElement('li', null, '• ', React.createElement('strong', null, 'Vitals CSV:'), ' All recorded vital signs'),
                React.createElement('li', null, '• ', React.createElement('strong', null, 'Prescriptions CSV:'), ' All prescription records'),
                React.createElement('li', null, '• ', React.createElement('strong', null, 'Complete Data CSV:'), ' Comprehensive report with patient info + latest vitals + prescription counts')
            )
        )
    );
};

// Export to window object for global access
window.ExportData = ExportData;

console.log('ExportData component loaded successfully');