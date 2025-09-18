// CaseReportManagement Component - Manage medical case reports and sick intimations
// Usage: <CaseReportManagement patients={patients} caseReports={caseReports} setCaseReports={setCaseReports} sickIntimations={sickIntimations} setSickIntimations={setSickIntimations} />

window.HMISComponents = window.HMISComponents || {};

window.HMISComponents.CaseReportManagement = ({ patients, caseReports, setCaseReports, sickIntimations, setSickIntimations }) => {
    const [subTab, setSubTab] = React.useState('case-report');
    const [formData, setFormData] = React.useState({
        usn: '',
        reportType: 'medical',
        chiefComplaint: '',
        historyOfPresentIllness: '',
        pastMedicalHistory: '',
        familyHistory: '',
        socialHistory: '',
        physicalExamination: '',
        investigations: '',
        diagnosis: '',
        treatment: '',
        prognosis: '',
        recommendations: '',
        followUp: '',
        doctorName: 'Mr. Manoj VRC Swami NH-1581',
        reportDate: new Date().toISOString().split('T')[0]
    });
    const [sickFormData, setSickFormData] = React.useState({
        usn: '',
        sickLeaveFrom: '',
        sickLeaveTo: '',
        totalDays: '',
        reason: '',
        symptoms: '',
        restRecommended: true,
        doctorName: 'Mr. Manoj VRC Swami NH-1581',
        issueDate: new Date().toISOString().split('T')[0],
        caseReportId: ''
    });
    const [errors, setErrors] = React.useState({});
    const [selectedPatientDetails, setSelectedPatientDetails] = React.useState(null);

    const safePatients = patients || [];
    const safeCaseReports = caseReports || [];
    const safeSickIntimations = sickIntimations || [];

    // Generate unique IDs for reports
    const generateCaseReportNumber = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `CR-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}-${random}`;
    };

    const generateSickIntimationNumber = (caseReportNumber) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const baseNumber = caseReportNumber ? caseReportNumber.split('-').slice(-2).join('') : timestamp.toString().slice(-6);
        return `SI-${new Date().getFullYear()}-${baseNumber}-${random}`;
    };

    const handleCaseReportSubmit = async () => {
        if (!formData.usn || !formData.diagnosis) {
            alert('Please select a patient and provide treatment administered / diagnosis');
            return;
        }

        const reportNumber = generateCaseReportNumber();

        const caseReportRecord = {
            id: Date.now().toString(),
            reportNumber: reportNumber,
            usn: formData.usn,
            patientName: selectedPatientDetails?.fullName || '',
            patientAge: selectedPatientDetails?.age || '',
            patientGender: selectedPatientDetails?.gender || '',
            reportType: formData.reportType,
            chiefComplaint: formData.chiefComplaint,
            historyOfPresentIllness: formData.historyOfPresentIllness,
            pastMedicalHistory: formData.pastMedicalHistory,
            familyHistory: formData.familyHistory,
            socialHistory: formData.socialHistory,
            physicalExamination: formData.physicalExamination,
            investigations: formData.investigations,
            diagnosis: formData.diagnosis,
            treatment: formData.treatment,
            prognosis: formData.prognosis,
            recommendations: formData.recommendations,
            followUp: formData.followUp,
            doctorName: formData.doctorName,
            reportDate: formData.reportDate,
            createdAt: new Date().toISOString(),
            status: 'Active'
        };

        const newCaseReports = [...safeCaseReports, caseReportRecord];
        setCaseReports(newCaseReports);
        saveToStorage('caseReports', newCaseReports);

        try {
            await syncWithDatabase('case-reports', {
                reportNumber: reportNumber,
                usn: formData.usn,
                patientName: selectedPatientDetails?.fullName || '',
                reportType: formData.reportType,
                chiefComplaint: formData.chiefComplaint,
                diagnosis: formData.diagnosis,
                treatment: formData.treatment,
                doctorName: formData.doctorName,
                reportDate: formData.reportDate
            });
            alert(`✅ Case Report ${reportNumber} created and synced to database successfully!`);
        } catch (error) {
            alert(`💾 Case Report ${reportNumber} created locally. Will sync to database when server is available.`);
        }

        // Reset form
        setFormData({
            usn: '', reportType: 'medical', chiefComplaint: '', historyOfPresentIllness: '',
            pastMedicalHistory: '', familyHistory: '', socialHistory: '', physicalExamination: '',
            investigations: '', diagnosis: '', treatment: '', prognosis: '', recommendations: '',
            followUp: '', doctorName: 'Mr. Manoj VRC Swami NH-1581',
            reportDate: new Date().toISOString().split('T')[0]
        });
        setSelectedPatientDetails(null);
    };

    const handleSickIntimationSubmit = async () => {
        if (!sickFormData.usn || !sickFormData.reason || !sickFormData.sickLeaveFrom || !sickFormData.sickLeaveTo) {
            alert('Please fill all required fields');
            return;
        }

        const patientCaseReports = safeCaseReports.filter(cr => cr.usn === sickFormData.usn);
        if (patientCaseReports.length === 0) {
            alert('Sick intimation can only be created if there is a valid case report for this patient. Please create a case report first.');
            return;
        }

        const intimationNumber = generateSickIntimationNumber(sickFormData.caseReportId || patientCaseReports[0].reportNumber);

        const sickIntimationRecord = {
            id: Date.now().toString(),
            intimationNumber: intimationNumber,
            usn: sickFormData.usn,
            patientName: selectedPatientDetails?.fullName || '',
            patientAge: selectedPatientDetails?.age || '',
            patientGender: selectedPatientDetails?.gender || '',
            caseReportId: sickFormData.caseReportId || patientCaseReports[0].reportNumber,
            sickLeaveFrom: sickFormData.sickLeaveFrom,
            sickLeaveTo: sickFormData.sickLeaveTo,
            totalDays: sickFormData.totalDays,
            reason: sickFormData.reason,
            symptoms: sickFormData.symptoms,
            restRecommended: sickFormData.restRecommended,
            doctorName: sickFormData.doctorName,
            issueDate: sickFormData.issueDate,
            createdAt: new Date().toISOString(),
            status: 'Active'
        };

        const newSickIntimations = [...safeSickIntimations, sickIntimationRecord];
        setSickIntimations(newSickIntimations);
        saveToStorage('sickIntimations', newSickIntimations);

        try {
            await syncWithDatabase('sick-intimations', {
                intimationNumber: intimationNumber,
                usn: sickFormData.usn,
                patientName: selectedPatientDetails?.fullName || '',
                caseReportId: sickFormData.caseReportId || patientCaseReports[0].reportNumber,
                sickLeaveFrom: sickFormData.sickLeaveFrom,
                sickLeaveTo: sickFormData.sickLeaveTo,
                totalDays: sickFormData.totalDays,
                reason: sickFormData.reason,
                doctorName: sickFormData.doctorName,
                issueDate: sickFormData.issueDate
            });
            alert(`✅ Sick Intimation ${intimationNumber} created and synced to database successfully!`);
        } catch (error) {
            alert(`💾 Sick Intimation ${intimationNumber} created locally. Will sync to database when server is available.`);
        }

        // Reset form
        setSickFormData({
            usn: '', sickLeaveFrom: '', sickLeaveTo: '', totalDays: '', reason: '', symptoms: '',
            restRecommended: true, doctorName: 'Mr. Manoj VRC Swami NH-1581',
            issueDate: new Date().toISOString().split('T')[0], caseReportId: ''
        });
        setSelectedPatientDetails(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSickChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSickFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handlePatientSelect = (e) => {
        const usn = e.target.value;
        const patient = safePatients.find(p => p.usn === usn);
        setSelectedPatientDetails(patient);
        
        if (subTab === 'case-report') {
            setFormData(prev => ({ ...prev, usn }));
        } else {
            setSickFormData(prev => ({ ...prev, usn }));
            // Auto-populate case report ID from latest case report for this patient
            const patientCaseReports = safeCaseReports.filter(cr => cr.usn === usn);
            if (patientCaseReports.length > 0) {
                const latestCaseReport = patientCaseReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                setSickFormData(prev => ({ ...prev, caseReportId: latestCaseReport.reportNumber }));
            }
        }
    };

    const calculateDays = (fromDate, toDate) => {
        if (fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            const diffTime = Math.abs(to - from);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays;
        }
        return '';
    };

    const handleSickDateChange = (field, value) => {
        setSickFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'sickLeaveFrom' || field === 'sickLeaveTo') {
                updated.totalDays = calculateDays(
                    field === 'sickLeaveFrom' ? value : prev.sickLeaveFrom,
                    field === 'sickLeaveTo' ? value : prev.sickLeaveTo
                );
            }
            return updated;
        });
    };

    return React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'mb-6' },
            React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Case Report & Sick Leave Management'),
            React.createElement('div', { className: 'flex border-b' },
                React.createElement('button', {
                    onClick: () => setSubTab('case-report'),
                    className: `px-4 py-2 border-b-2 transition-colors ${subTab === 'case-report' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`
                }, 'Case Reports'),
                React.createElement('button', {
                    onClick: () => setSubTab('sick-intimation'),
                    className: `px-4 py-2 border-b-2 transition-colors ${subTab === 'sick-intimation' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`
                }, 'Sick Leave Intimations')
            )
        ),

        subTab === 'case-report' ? React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-medium mb-4' }, 'Create Medical Case Report'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                // Patient Selection
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Select Patient *'),
                    React.createElement('select', {
                        value: formData.usn,
                        onChange: handlePatientSelect,
                        className: 'form-input w-full'
                    },
                        React.createElement('option', { value: '' }, 'Select a patient...'),
                        safePatients.map(p =>
                            React.createElement('option', { key: p.usn, value: p.usn }, `${p.usn} - ${p.fullName}`)
                        )
                    )
                ),

                // Chief Complaint
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Chief Complaint'),
                    React.createElement('textarea', {
                        name: 'chiefComplaint',
                        value: formData.chiefComplaint,
                        onChange: handleChange,
                        rows: 3,
                        className: 'form-input w-full',
                        placeholder: 'Primary reason for consultation...'
                    })
                ),

                // Diagnosis/Treatment (Required)
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Treatment Administered / Diagnosis *'),
                    React.createElement('textarea', {
                        name: 'diagnosis',
                        value: formData.diagnosis,
                        onChange: handleChange,
                        rows: 4,
                        className: 'form-input w-full',
                        placeholder: 'Diagnosis and treatment details (required)...'
                    })
                ),

                // Physical Examination
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Physical Examination'),
                    React.createElement('textarea', {
                        name: 'physicalExamination',
                        value: formData.physicalExamination,
                        onChange: handleChange,
                        rows: 3,
                        className: 'form-input w-full',
                        placeholder: 'Physical examination findings...'
                    })
                ),

                // Recommendations
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Recommendations'),
                    React.createElement('textarea', {
                        name: 'recommendations',
                        value: formData.recommendations,
                        onChange: handleChange,
                        rows: 3,
                        className: 'form-input w-full',
                        placeholder: 'Treatment recommendations...'
                    })
                )
            ),

            React.createElement('div', { className: 'mt-6' },
                React.createElement('button', {
                    onClick: handleCaseReportSubmit,
                    className: 'btn btn-primary'
                }, 'Create Case Report')
            )
        ) : React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-medium mb-4' }, 'Create Sick Leave Intimation'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                // Patient Selection
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Select Patient *'),
                    React.createElement('select', {
                        value: sickFormData.usn,
                        onChange: handlePatientSelect,
                        className: 'form-input w-full'
                    },
                        React.createElement('option', { value: '' }, 'Select a patient...'),
                        safePatients.map(p =>
                            React.createElement('option', { key: p.usn, value: p.usn }, `${p.usn} - ${p.fullName}`)
                        )
                    )
                ),

                // Sick Leave From
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Sick Leave From *'),
                    React.createElement('input', {
                        type: 'date',
                        value: sickFormData.sickLeaveFrom,
                        onChange: (e) => handleSickDateChange('sickLeaveFrom', e.target.value),
                        className: 'form-input w-full'
                    })
                ),

                // Sick Leave To
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Sick Leave To *'),
                    React.createElement('input', {
                        type: 'date',
                        value: sickFormData.sickLeaveTo,
                        onChange: (e) => handleSickDateChange('sickLeaveTo', e.target.value),
                        className: 'form-input w-full'
                    })
                ),

                // Total Days (Auto-calculated)
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Total Days'),
                    React.createElement('input', {
                        type: 'text',
                        value: sickFormData.totalDays,
                        readOnly: true,
                        className: 'form-input w-full bg-gray-100'
                    })
                ),

                // Reason
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Reason for Sick Leave *'),
                    React.createElement('textarea', {
                        name: 'reason',
                        value: sickFormData.reason,
                        onChange: handleSickChange,
                        rows: 3,
                        className: 'form-input w-full',
                        placeholder: 'Medical reason for sick leave...'
                    })
                ),

                // Symptoms
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Symptoms'),
                    React.createElement('textarea', {
                        name: 'symptoms',
                        value: sickFormData.symptoms,
                        onChange: handleSickChange,
                        rows: 2,
                        className: 'form-input w-full',
                        placeholder: 'Patient symptoms...'
                    })
                )
            ),

            React.createElement('div', { className: 'mt-6' },
                React.createElement('button', {
                    onClick: handleSickIntimationSubmit,
                    className: 'btn btn-primary'
                }, 'Create Sick Intimation')
            )
        ),

        // Display existing records
        React.createElement('div', { className: 'mt-8' },
            React.createElement('h3', { className: 'text-lg font-medium mb-4' }, 
                subTab === 'case-report' ? 'Recent Case Reports' : 'Recent Sick Intimations'
            ),
            (subTab === 'case-report' ? safeCaseReports : safeSickIntimations).length === 0 ? 
                React.createElement('p', { className: 'text-gray-500 text-center py-4' }, 
                    `No ${subTab === 'case-report' ? 'case reports' : 'sick intimations'} created yet.`
                ) :
                React.createElement('div', { className: 'overflow-x-auto' },
                    React.createElement('table', { className: 'table' },
                        React.createElement('thead', null,
                            React.createElement('tr', null,
                                React.createElement('th', null, 'Date'),
                                React.createElement('th', null, 'Patient'),
                                React.createElement('th', null, 'USN'),
                                React.createElement('th', null, subTab === 'case-report' ? 'Diagnosis' : 'Reason'),
                                React.createElement('th', null, subTab === 'case-report' ? 'Report ID' : 'Days')
                            )
                        ),
                        React.createElement('tbody', null,
                            (subTab === 'case-report' ? safeCaseReports : safeSickIntimations)
                                .slice(0, 5)
                                .map((record) =>
                                    React.createElement('tr', { key: record.id },
                                        React.createElement('td', null, 
                                            new Date(record.createdAt).toLocaleDateString()
                                        ),
                                        React.createElement('td', null, record.patientName),
                                        React.createElement('td', null, record.usn),
                                        React.createElement('td', null, 
                                            subTab === 'case-report' ? record.diagnosis : record.reason
                                        ),
                                        React.createElement('td', null, 
                                            subTab === 'case-report' ? record.reportNumber : `${record.totalDays} days`
                                        )
                                    )
                                )
                        )
                    )
                )
        )
    );
};

console.log('CaseReportManagement component loaded successfully');