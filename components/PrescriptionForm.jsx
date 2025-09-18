// PrescriptionForm Component - Treatment and medication prescription with printing capability
// Usage: <PrescriptionForm patients={patients} prescriptions={prescriptions} setPrescriptions={setPrescriptions} />

window.HMISComponents = window.HMISComponents || {};

window.HMISComponents.PrescriptionForm = ({ patients, prescriptions, setPrescriptions }) => {
    const [formData, setFormData] = React.useState({
        usn: '',
        medications: [{ 
            name: '', 
            dosage: '', 
            frequency: '', 
            duration: '', 
            instructions: '' 
        }],
        diagnosis: '',
        notes: '',
        followUpDate: '',
        priority: 'Normal'
    });
    const [errors, setErrors] = React.useState({});
    const [selectedPatientDetails, setSelectedPatientDetails] = React.useState(null);
    const [patientSearchTerm, setPatientSearchTerm] = React.useState('');
    const [showPatientDropdown, setShowPatientDropdown] = React.useState(false);

    const safePatients = patients || [];
    const safePrescriptions = prescriptions || [];
    
    // Get prescriptions for the selected patient
    const patientPrescriptions = selectedPatientDetails 
        ? safePrescriptions.filter(p => p.usn === selectedPatientDetails.usn)
        : [];

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.relative')) {
                setShowPatientDropdown(false);
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.usn) newErrors.usn = 'Please select a patient';
        if (!formData.diagnosis.trim()) newErrors.diagnosis = 'Diagnosis is required';
        
        const hasValidMedication = formData.medications.some(med => {
            return med.name && med.name.trim() && med.dosage && med.dosage.trim();
        });
        if (!hasValidMedication) {
            newErrors.medications = 'At least one complete medication is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const nowIso = new Date().toISOString();
        const nowEpoch = Date.now();
        
        // Build IST timestamp
        const istParts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).formatToParts(new Date());
        const part = (t) => (istParts.find(p => p.type === t) || {}).value || '';
        const prescribedAtIST = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}+05:30`;
        
        const prescriptionRecord = {
            id: Date.now().toString(),
            usn: formData.usn,
            patientName: selectedPatientDetails?.fullName || '',
            patientAge: selectedPatientDetails?.age || '',
            patientGender: selectedPatientDetails?.gender || '',
            diagnosis: formData.diagnosis,
            medications: formData.medications.filter(med => med.name && med.name.trim() && med.dosage && med.dosage.trim()),
            notes: formData.notes,
            followUpDate: formData.followUpDate,
            prescribedAt: nowIso,
            prescribedAtIST,
            createdAt: nowEpoch,
            prescribedBy: 'NHCE Clinic',
            priority: formData.priority
        };

        const newPrescriptions = [...prescriptions, prescriptionRecord];
        setPrescriptions(newPrescriptions);
        saveToStorage('prescriptions', newPrescriptions);

        // Sync with database
        const dbPrescriptionData = {
            usn: formData.usn,
            diagnosis: formData.diagnosis,
            medications: prescriptionRecord.medications,
            notes: formData.notes,
            followUpDate: formData.followUpDate,
            prescribedAt: nowIso,
            prescribedAtIST,
            prescribedBy: 'NHCE Clinic',
            status: 'Active',
            patientName: selectedPatientDetails?.fullName || '',
            patientAge: selectedPatientDetails?.age || null,
            patientGender: selectedPatientDetails?.gender || ''
        };
        
        try {
            await syncWithDatabase('prescriptions', dbPrescriptionData);
            alert('✅ Prescription created and synced to database successfully!');
        } catch (error) {
            alert('💾 Prescription created locally. Will sync to database when server is available.');
        }

        // Reset form
        setFormData({
            usn: '',
            medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
            diagnosis: '',
            notes: '',
            followUpDate: '',
            priority: 'Normal'
        });
        setSelectedPatientDetails(null);
        setErrors({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Filter patients based on search term
    const filteredPatients = safePatients.filter(patient => {
        if (!patientSearchTerm) return true;
        const searchLower = patientSearchTerm.toLowerCase();
        return (
            patient.fullName.toLowerCase().includes(searchLower) ||
            patient.usn.toLowerCase().includes(searchLower) ||
            (patient.phone && patient.phone.includes(searchLower))
        );
    });

    const handlePatientSearch = (e) => {
        const searchTerm = e.target.value;
        setPatientSearchTerm(searchTerm);
        setShowPatientDropdown(searchTerm.length > 0);
        
        // Auto-select if exact match
        if (searchTerm.length > 2) {
            const exactMatch = filteredPatients.find(p => 
                p.fullName.toLowerCase() === searchTerm.toLowerCase() ||
                p.usn.toLowerCase() === searchTerm.toLowerCase()
            );
            if (exactMatch) {
                setFormData(prev => ({ ...prev, usn: exactMatch.usn }));
                setSelectedPatientDetails(exactMatch);
                setShowPatientDropdown(false);
            }
        }
    };

    const selectPatientFromSearch = (patient) => {
        setFormData(prev => ({ ...prev, usn: patient.usn }));
        setSelectedPatientDetails(patient);
        setPatientSearchTerm(`${patient.usn} - ${patient.fullName}`);
        setShowPatientDropdown(false);
        if (errors.usn) {
            setErrors(prev => ({ ...prev, usn: '' }));
        }
    };

    const handleMedicationChange = (index, field, value) => {
        const newMedications = [...formData.medications];
        newMedications[index][field] = value;
        setFormData(prev => ({ ...prev, medications: newMedications }));
        if (errors.medications) {
            setErrors(prev => ({ ...prev, medications: '' }));
        }
    };

    const addMedication = () => {
        setFormData(prev => ({
            ...prev,
            medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
        }));
    };

    const removeMedication = (index) => {
        if (formData.medications.length > 1) {
            const newMedications = formData.medications.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, medications: newMedications }));
        }
    };

    const printPrescription = (prescription) => {
        const logoUrl = new URL('./nhce_25-scaled-1-2048x683.png', window.location.href).href;
        const printWindow = window.open('', '_blank');
        const currentDate = new Date().toLocaleDateString('en-IN');
        const currentTime = new Date().toLocaleTimeString('en-IN');

        // Safe data extraction
        const usn = prescription.usn || '';
        const patientName = prescription.patientName || '';
        const patientAge = prescription.patientAge || '';
        const patientGender = prescription.patientGender || '';
        const diagnosis = prescription.diagnosis || '';
        const medications = prescription.medications || [];
        const notes = prescription.notes || '';
        const followUpDate = prescription.followUpDate || '';
        const prescribedAt = prescription.prescribedAt || '';
        const prescribedBy = prescription.prescribedBy || 'NHCE Clinic';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - ${patientName}</title>
                <style>
                    @media print { @page { size: A4; margin: 0.25in 0.35in; } html,body{margin:0;padding:0.05in 0.1in;} .no-print{display:none} }
                    body{ font-family: Arial, sans-serif; max-width:800px; margin:0 auto; padding:10px; color:#000; }
                    .header{ text-align:center; border-bottom:2px solid #333; padding-bottom:6px; margin-bottom:12px; }
                    .clinic-name{ font-size:20px; font-weight:bold; color:#2563eb; }
                    .clinic-subtitle{ font-size:12px; color:#666; margin-bottom:2px; }
                    .clinic-contact{ font-size:11px; color:#555; }
                    .prescription-header{ display:flex; flex-direction:column; gap:12px; }
                    .document-title{ text-align:center; font-size:20px; font-weight:600; letter-spacing:0.5px; margin:0; }
                    .patient-info, .prescription-info{ min-width:240px; }
                    .patient-info h3, .prescription-info h3{ margin-top:0; color:#333; text-align:center; font-size:16px; font-weight:500; }
                    .info-row{ margin-bottom:4px; }
                    .label{ font-weight:bold; display:inline-block; min-width:100px; }
                    .diagnosis{ margin:15px 0; padding:10px; background:#f9f9f9; border-radius:5px; }
                    .medications{ margin:15px 0; }
                    .medications h3{ color:#333; margin-bottom:15px; }
                    .medication-item{ margin-bottom:12px; padding:8px; border:1px solid #e5e5e5; border-radius:5px; }
                    .medication-name{ font-weight:bold; color:#333; margin-bottom:3px; }
                    .medication-details{ font-size:14px; color:#666; }
                    .notes{ margin:15px 0; padding:10px; background:#f0f8ff; border-radius:5px; }
                    .signature-section{ margin-top:40px; text-align:right; }
                    .signature-line{ border-bottom:1px solid #333; width:200px; display:inline-block; margin-bottom:5px; }
                    .footer{ margin-top:20px; padding-top:15px; border-top:1px solid #ddd; text-align:center; font-size:10px; color:#666; }
                    .nhei-stamp{ margin:18px auto 0 auto; padding:10px 20px; border:2px solid #1d4ed8; border-radius:10px; background:linear-gradient(135deg,#eef6ff,#dbeafe); color:#1e3a8a; font-size:13px; font-weight:600; max-width:520px; letter-spacing:0.5px; box-shadow:0 2px 6px -1px rgba(0,0,0,0.08),0 4px 12px -2px rgba(29,78,216,0.15); }
                    .btn{ background:#16a34a; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <img src="${logoUrl}" alt="NHCE Logo" class="app-logo-large" style="margin-right:42px;" />
                        <div style="text-align: left;">
                            <div class="clinic-name">New Horizon Sanjeevani Clinic</div>
                            <div class="clinic-subtitle">New Horizon Knowledge Park, Outer Ring Rd, near Marathalli, Kaverappa Layout, Kadubeesanahalli, Bengaluru, Karnataka - 560103.</div>
                            <div class="clinic-contact">Contact : Manoj VRC Swami  +91 81472 91675<br>Amrutha Varshini D +91 63625 88851</div>
                        </div>
                    </div>
                </div>

                <div class="prescription-header" style="display:flex; flex-direction:column; gap:12px;">
                    <div class="document-title" style="text-align:center; font-size:20px; font-weight:600; letter-spacing:0.5px; margin:0;">Prescription / Treatment Regime Details</div>
                    <div style="display:flex; flex-wrap:wrap; gap:32px; justify-content:center;">
                        <div class="patient-info" style="min-width:240px;">
                            <h3 style="margin-top:0; color:#333; text-align:center; font-size:16px; font-weight:500;">Patient Information</h3>
                            <div class="info-row"><span class="label">Name:</span> ${patientName}</div>
                            <div class="info-row"><span class="label">USN:</span> ${usn}</div>
                            <div class="info-row"><span class="label">Age:</span> ${patientAge} years</div>
                            <div class="info-row"><span class="label">Gender:</span> ${patientGender}</div>
                        </div>
                        <div class="prescription-info" style="min-width:240px;">
                            <h3 style="margin-top:0; color:#333; text-align:center; font-size:16px; font-weight:500;">Consultation Details</h3>
                            <div class="info-row"><span class="label">Date:</span> ${new Date(prescribedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                            <div class="info-row"><span class="label">Time:</span> ${new Date(prescribedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                            <div class="info-row"><span class="label">Staff:</span> ${prescribedBy}</div>
                            <div class="info-row"><span class="label">Rx ID:</span> RX-${prescription.id}</div>
                        </div>
                    </div>
                </div>

                <div class="diagnosis">
                    <strong>Treatment / Diagnosis:</strong> ${diagnosis}
                </div>

                <div class="medications">
                    <h3 style="color: #333; margin-bottom: 15px;">Prescribed Medications</h3>
                    ${medications.map((med, index) => `
                        <div class="medication-item">
                            <div class="medication-name">${index + 1}. ${med.name || 'Unnamed medication'}</div>
                            <div class="medication-details">
                                <strong>Dosage:</strong> ${med.dosage || 'Not specified'} | 
                                <strong>Frequency:</strong> ${med.frequency || 'Not specified'}
                                ${med.duration ? ` | <strong>Duration:</strong> ${med.duration}` : ''}
                            </div>
                            ${med.instructions ? `<div style="margin-top: 5px; font-style: italic;">Instructions: ${med.instructions}</div>` : ''}
                        </div>
                    `).join('')}
                </div>

                ${notes ? `
                    <div class="notes">
                        <strong>Additional Notes:</strong><br>
                        ${notes}
                    </div>
                ` : ''}

                ${followUpDate ? `
                    <div style="margin: 15px 0; padding: 10px; background: #e7f3ff; border-radius: 5px;">
                        <strong>Follow-up Date:</strong> ${new Date(followUpDate).toLocaleDateString()}
                    </div>
                ` : ''}

                <div class="signature-and-footer">
                    <div class="signature-section">
                        <div class="signature-line"></div><br>
                        <strong>${prescribedBy}</strong><br>
                        <small>Authorized Prescriber</small>
                    </div>

                    <div class="footer">
                        <p><strong>New Horizon Sanjeevani Clinic</strong></p>
                        <p>This prescription is computer generated and valid for the medications listed above.</p>
                        <p>Printed on: ${currentDate} at ${currentTime}</p>
                        <p style="margin-top: 10px;">© ${new Date().getFullYear()} Hospital Management Information System - LeadOnyx Apex LLP</p>
                        <p>Contact : Raj Goyal +91 79922 47030 · rajgoyal@duck.com · USN: 1NH23CS329</p>
                        <div class="nhei-stamp">Official internal clinical document &mdash; For exclusive use within New Horizon Education Institutions (NHEI). Unauthorized reproduction, distribution, or external circulation is prohibited.</div>
                    </div>
                </div>

                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button class="btn" onclick="window.print()">🖨️ Print Prescription</button>
                    <button class="btn" onclick="window.close()" style="background: #6c757d;">✕ Close</button>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Auto-print after a short delay
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'card' },
            React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Create Treatment / Prescription'),
            React.createElement('form', { onSubmit: handleSubmit },
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                    // Patient Selection
                    React.createElement('div', { className: 'md:col-span-2' },
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Select Patient *'),
                        React.createElement('div', { className: 'relative' },
                            React.createElement('input', {
                                type: 'text',
                                value: patientSearchTerm,
                                onChange: handlePatientSearch,
                                onFocus: () => setShowPatientDropdown(true),
                                placeholder: 'Search by name, USN, or phone...',
                                className: 'form-input w-full'
                            }),
                            showPatientDropdown && filteredPatients.length > 0 && React.createElement('div', { className: 'absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-auto' },
                                filteredPatients.slice(0, 10).map(patient =>
                                    React.createElement('div', {
                                        key: patient.usn,
                                        onClick: () => selectPatientFromSearch(patient),
                                        className: 'px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0'
                                    },
                                        React.createElement('div', { className: 'font-medium' }, patient.fullName),
                                        React.createElement('div', { className: 'text-xs text-gray-600' }, `${patient.usn} • ${patient.age}y • ${patient.gender}`)
                                    )
                                )
                            )
                        ),
                        errors.usn && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.usn)
                    ),

                    // Treatment/Diagnosis
                    React.createElement('div', { className: 'md:col-span-2' },
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Treatment / Diagnosis *'),
                        React.createElement('textarea', {
                            name: 'diagnosis',
                            value: formData.diagnosis,
                            onChange: handleChange,
                            rows: 3,
                            className: 'form-input w-full',
                            placeholder: 'Enter diagnosis and treatment details...'
                        }),
                        errors.diagnosis && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.diagnosis)
                    ),

                    // Medications
                    React.createElement('div', { className: 'md:col-span-2' },
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Medications *'),
                        formData.medications.map((medication, index) =>
                            React.createElement('div', { key: index, className: 'border border-gray-200 rounded-lg p-4 mb-4' },
                                React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                                    React.createElement('h4', { className: 'font-medium' }, `Medication ${index + 1}`),
                                    formData.medications.length > 1 && React.createElement('button', {
                                        type: 'button',
                                        onClick: () => removeMedication(index),
                                        className: 'text-red-500 hover:text-red-700'
                                    }, '✕ Remove')
                                ),
                                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                                    React.createElement('div', null,
                                        React.createElement('input', {
                                            type: 'text',
                                            placeholder: 'Medicine name *',
                                            value: medication.name,
                                            onChange: (e) => handleMedicationChange(index, 'name', e.target.value),
                                            className: 'form-input w-full'
                                        })
                                    ),
                                    React.createElement('div', null,
                                        React.createElement('input', {
                                            type: 'text',
                                            placeholder: 'Dosage *',
                                            value: medication.dosage,
                                            onChange: (e) => handleMedicationChange(index, 'dosage', e.target.value),
                                            className: 'form-input w-full'
                                        })
                                    ),
                                    React.createElement('div', null,
                                        React.createElement('input', {
                                            type: 'text',
                                            placeholder: 'Frequency',
                                            value: medication.frequency,
                                            onChange: (e) => handleMedicationChange(index, 'frequency', e.target.value),
                                            className: 'form-input w-full'
                                        })
                                    ),
                                    React.createElement('div', null,
                                        React.createElement('input', {
                                            type: 'text',
                                            placeholder: 'Duration',
                                            value: medication.duration,
                                            onChange: (e) => handleMedicationChange(index, 'duration', e.target.value),
                                            className: 'form-input w-full'
                                        })
                                    )
                                ),
                                React.createElement('div', { className: 'mt-3' },
                                    React.createElement('textarea', {
                                        placeholder: 'Special instructions',
                                        value: medication.instructions,
                                        onChange: (e) => handleMedicationChange(index, 'instructions', e.target.value),
                                        rows: 2,
                                        className: 'form-input w-full'
                                    })
                                )
                            )
                        ),
                        React.createElement('button', {
                            type: 'button',
                            onClick: addMedication,
                            className: 'btn btn-secondary'
                        }, '+ Add Another Medication'),
                        errors.medications && React.createElement('p', { className: 'text-red-500 text-sm mt-2' }, errors.medications)
                    ),

                    // Follow-up Date
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Follow-up Date'),
                        React.createElement('input', {
                            type: 'date',
                            name: 'followUpDate',
                            value: formData.followUpDate,
                            onChange: handleChange,
                            className: 'form-input w-full'
                        })
                    ),

                    // Priority
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Priority'),
                        React.createElement('select', {
                            name: 'priority',
                            value: formData.priority,
                            onChange: handleChange,
                            className: 'form-input w-full'
                        },
                            React.createElement('option', { value: 'Normal' }, 'Normal'),
                            React.createElement('option', { value: 'High' }, 'High'),
                            React.createElement('option', { value: 'Urgent' }, 'Urgent')
                        )
                    ),

                    // Notes
                    React.createElement('div', { className: 'md:col-span-2' },
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Additional Notes'),
                        React.createElement('textarea', {
                            name: 'notes',
                            value: formData.notes,
                            onChange: handleChange,
                            rows: 3,
                            className: 'form-input w-full',
                            placeholder: 'Any additional notes or instructions...'
                        })
                    )
                ),

                React.createElement('div', { className: 'flex gap-3 mt-6' },
                    React.createElement('button', {
                        type: 'submit',
                        className: 'btn btn-primary'
                    }, 'Create Prescription'),
                    formData.usn && selectedPatientDetails && React.createElement('button', {
                        type: 'button',
                        onClick: () => printPrescription({
                            id: Date.now().toString(),
                            usn: formData.usn,
                            patientName: selectedPatientDetails.fullName,
                            patientAge: selectedPatientDetails.age,
                            patientGender: selectedPatientDetails.gender,
                            diagnosis: formData.diagnosis,
                            medications: formData.medications.filter(med => med.name && med.dosage),
                            notes: formData.notes,
                            followUpDate: formData.followUpDate,
                            prescribedAt: new Date().toISOString(),
                            prescribedBy: 'NHCE Clinic'
                        }),
                        className: 'btn btn-secondary'
                    }, '🖨️ Preview & Print')
                )
            )
        ),

        // Recent Prescriptions for selected patient
        selectedPatientDetails && patientPrescriptions.length > 0 && React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, `Recent Prescriptions for ${selectedPatientDetails.fullName}`),
            React.createElement('div', { className: 'space-y-3' },
                patientPrescriptions.slice(0, 3).map((prescription) =>
                    React.createElement('div', { key: prescription.id, className: 'border border-gray-200 rounded-lg p-4' },
                        React.createElement('div', { className: 'flex justify-between items-start' },
                            React.createElement('div', null,
                                React.createElement('div', { className: 'font-medium' }, prescription.diagnosis),
                                React.createElement('div', { className: 'text-sm text-gray-600' }, 
                                    new Date(prescription.prescribedAt).toLocaleDateString()
                                ),
                                React.createElement('div', { className: 'text-xs text-gray-500 mt-1' },
                                    `${prescription.medications?.length || 0} medication(s)`
                                )
                            ),
                            React.createElement('button', {
                                onClick: () => printPrescription(prescription),
                                className: 'btn btn-primary text-xs'
                            }, '🖨️ Print')
                        )
                    )
                )
            )
        )
    );
};

// Export to window object for global access
window.PrescriptionForm = PrescriptionForm;

console.log('PrescriptionForm component loaded successfully');