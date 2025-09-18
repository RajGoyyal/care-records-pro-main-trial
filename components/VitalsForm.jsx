// VitalsForm Component - Patient vital signs recording with BMI and BP analysis
// Usage: <VitalsForm patients={patients} vitals={vitals} setVitals={setVitals} />

const { useState, useEffect } = React;

const VitalsForm = ({ patients, vitals, setVitals }) => {
    const safePatients = patients || [];
    const safeVitals = vitals || [];
    
    const [formData, setFormData] = useState({
        usn: '',
        weight: '',
        height: '',
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        heartRate: '',
        temperature: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const [selectedPatientDetails, setSelectedPatientDetails] = useState(null);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.usn) newErrors.usn = 'Please select a patient';
        if (!formData.weight || formData.weight <= 0) newErrors.weight = 'Valid weight is required';
        if (!formData.height || formData.height <= 0) newErrors.height = 'Valid height is required';
        if (!formData.bloodPressureSystolic || formData.bloodPressureSystolic <= 0) newErrors.bloodPressureSystolic = 'Valid systolic BP is required';
        if (!formData.bloodPressureDiastolic || formData.bloodPressureDiastolic <= 0) newErrors.bloodPressureDiastolic = 'Valid diastolic BP is required';
        if (!formData.heartRate || formData.heartRate <= 0) newErrors.heartRate = 'Valid heart rate is required';
        if (!formData.temperature || formData.temperature <= 0) newErrors.temperature = 'Valid temperature is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateBMI = (weight, height) => {
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    };

    const getBMICategory = (bmi) => {
        if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
        if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
        if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
        return { category: 'Obese', color: 'text-red-600' };
    };

    const getBloodPressureCategory = (systolic, diastolic) => {
        if (systolic < 120 && diastolic < 80) return { category: 'Normal', color: 'text-green-600' };
        if (systolic < 130 && diastolic < 80) return { category: 'Elevated', color: 'text-yellow-600' };
        if (systolic < 140 || diastolic < 90) return { category: 'Stage 1 Hypertension', color: 'text-orange-600' };
        return { category: 'Stage 2 Hypertension', color: 'text-red-600' };
    };

    // Vital sign suggestion ranges based on age and gender
    const getVitalSuggestions = (patient) => {
        if (!patient) return null;
        const age = parseInt(patient.age, 10);
        const genderRaw = (patient.gender || '').toString().toLowerCase();
        let heartRate = '60-100';
        let respiratoryRate = '12-20';
        let temperature = '36.1-37.2';
        let oxygenSaturation = '95-100';
        let bpRange = '90-120 / 60-80';
        let idealHeightRange = { min: 150, max: 170 };

        if (age < 1) {
            heartRate = '100-160';
            respiratoryRate = '30-60';
            bpRange = '70-100 / 50-65';
            idealHeightRange = { min: 50, max: 75 };
        } else if (age < 6) {
            heartRate = '80-120';
            respiratoryRate = '20-30';
            bpRange = '80-110 / 50-70';
            idealHeightRange = { min: 75, max: 110 };
        } else if (age < 13) {
            heartRate = '70-110';
            respiratoryRate = '18-25';
            bpRange = '85-115 / 55-75';
            idealHeightRange = { min: 110, max: 150 };
        } else if (age < 18) {
            heartRate = '60-100';
            respiratoryRate = '12-20';
            bpRange = '90-120 / 60-80';
            if (genderRaw.startsWith('m')) {
                idealHeightRange = { min: 150, max: 180 };
            } else if (genderRaw.startsWith('f')) {
                idealHeightRange = { min: 145, max: 170 };
            } else {
                idealHeightRange = { min: 145, max: 178 };
            }
        } else {
            if (genderRaw.startsWith('m')) {
                idealHeightRange = { min: 160, max: 185 };
            } else if (genderRaw.startsWith('f')) {
                idealHeightRange = { min: 150, max: 175 };
            } else {
                idealHeightRange = { min: 155, max: 180 };
            }
        }

        let idealWeightRange = null;
        const h = parseFloat(formData.height);
        if (h && h > 0) {
            const hM = h / 100;
            idealWeightRange = {
                min: (18.5 * hM * hM).toFixed(1),
                max: (24.9 * hM * hM).toFixed(1)
            };
        }

        return { heartRate, respiratoryRate, temperature, oxygenSaturation, bpRange, idealWeightRange, idealHeightRange };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const vitalRecord = {
            id: Date.now().toString(),
            usn: formData.usn,
            patientName: selectedPatientDetails?.fullName || '',
            weight: parseFloat(formData.weight),
            height: parseFloat(formData.height),
            bmi: calculateBMI(parseFloat(formData.weight), parseFloat(formData.height)),
            bloodPressureSystolic: parseInt(formData.bloodPressureSystolic),
            bloodPressureDiastolic: parseInt(formData.bloodPressureDiastolic),
            heartRate: parseInt(formData.heartRate),
            temperature: parseFloat(formData.temperature),
            respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : null,
            oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : null,
            notes: formData.notes,
            recordedAt: new Date().toISOString(),
            recordedBy: 'System User'
        };

        const newVitals = [...vitals, vitalRecord];
        setVitals(newVitals);
        saveToStorage('vitals', newVitals);

        // Sync with database
        const dbVitalData = {
            usn: formData.usn,
            weight: parseFloat(formData.weight),
            height: parseFloat(formData.height),
            bloodPressureSystolic: parseInt(formData.bloodPressureSystolic),
            bloodPressureDiastolic: parseInt(formData.bloodPressureDiastolic),
            heartRate: parseInt(formData.heartRate),
            temperature: parseFloat(formData.temperature),
            respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : null,
            oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : null,
            notes: formData.notes
        };
        
        try {
            await syncWithDatabase('vitals', dbVitalData);
            alert('✅ Vitals recorded and synced to database successfully!');
        } catch (error) {
            alert('💾 Vitals recorded locally. Will sync when server is available.');
        }

        // Reset form
        setFormData({
            usn: '', weight: '', height: '', bloodPressureSystolic: '', bloodPressureDiastolic: '',
            heartRate: '', temperature: '', respiratoryRate: '', oxygenSaturation: '', notes: ''
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

    const handlePatientSearch = (e) => {
        const term = e.target.value;
        setPatientSearchTerm(term);
        setShowPatientDropdown(true);
        if (!term) {
            setFormData(prev => ({ ...prev, usn: '' }));
            setSelectedPatientDetails(null);
        }
    };

    const selectPatientFromSearch = (patient) => {
        setFormData(prev => ({ ...prev, usn: patient.usn }));
        setSelectedPatientDetails(patient);
        setPatientSearchTerm(`${patient.usn} - ${patient.fullName}`);
        setShowPatientDropdown(false);
        if (errors.usn) setErrors(prev => ({ ...prev, usn: '' }));
    };

    useEffect(() => {
        const onClick = (e) => {
            if (!e.target.closest('.vitals-patient-select')) {
                setShowPatientDropdown(false);
            }
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);

    const currentBMI = formData.weight && formData.height ? calculateBMI(parseFloat(formData.weight), parseFloat(formData.height)) : null;
    const bmiInfo = currentBMI ? getBMICategory(parseFloat(currentBMI)) : null;
    const bpInfo = formData.bloodPressureSystolic && formData.bloodPressureDiastolic ? 
        getBloodPressureCategory(parseInt(formData.bloodPressureSystolic), parseInt(formData.bloodPressureDiastolic)) : null;

    const patientVitals = selectedPatientDetails ? (vitals || []).filter(v => v.usn === selectedPatientDetails.usn).slice(-5) : [];
    const filteredPatients = patientSearchTerm
        ? safePatients.filter(p => {
            const term = patientSearchTerm.toLowerCase();
            return (p.usn && p.usn.toLowerCase().includes(term)) || (p.fullName && p.fullName.toLowerCase().includes(term));
        })
        : safePatients;
    const vitalSuggestions = selectedPatientDetails ? getVitalSuggestions(selectedPatientDetails) : null;

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'card' },
            React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Record Patient Vitals'),
            React.createElement('form', { onSubmit: handleSubmit },
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                    // Patient Selection
                    React.createElement('div', { className: 'md:col-span-2' },
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Select Patient *'),
                        React.createElement('div', { className: 'relative vitals-patient-select' },
                            React.createElement('input', {
                                type: 'text',
                                value: patientSearchTerm,
                                onChange: handlePatientSearch,
                                onFocus: () => setShowPatientDropdown(true),
                                placeholder: 'Search patient by USN or name...',
                                className: 'form-input pr-8'
                            }),
                            React.createElement('div', { className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400' },
                                React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M21 21l-6-6m2-5a7 7 0 10-14 0 7 7 0 0014 0z' })
                                )
                            ),
                            showPatientDropdown && filteredPatients.length > 0 && React.createElement('div', { className: 'absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-auto' },
                                filteredPatients.slice(0, 10).map(p =>
                                    React.createElement('div', {
                                        key: p.usn,
                                        onClick: () => selectPatientFromSearch(p),
                                        className: 'px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0'
                                    },
                                        React.createElement('div', { className: 'font-medium' }, p.fullName),
                                        React.createElement('div', { className: 'text-xs text-gray-600' }, `${p.usn} • ${p.age}y • ${p.gender}`)
                                    )
                                ),
                                filteredPatients.length > 10 && React.createElement('div', { className: 'px-3 py-2 text-xs text-gray-500 bg-gray-50' }, 'Showing first 10 results...')
                            )
                        ),
                        errors.usn && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.usn)
                    ),

                    // Weight
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Weight (kg) *'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'weight',
                            value: formData.weight,
                            onChange: handleChange,
                            step: '0.1',
                            className: 'form-input',
                            placeholder: vitalSuggestions?.idealWeightRange ? `${vitalSuggestions.idealWeightRange.min}-${vitalSuggestions.idealWeightRange.max}` : 'kg'
                        }),
                        errors.weight && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.weight),
                        vitalSuggestions?.idealWeightRange && React.createElement('p', { className: 'text-xs text-gray-500' }, `Ideal: ${vitalSuggestions.idealWeightRange.min}-${vitalSuggestions.idealWeightRange.max} kg (BMI 18.5-24.9)`)
                    ),

                    // Height
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Height (cm) *'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'height',
                            value: formData.height,
                            onChange: handleChange,
                            className: 'form-input',
                            placeholder: vitalSuggestions?.idealHeightRange ? `${vitalSuggestions.idealHeightRange.min}-${vitalSuggestions.idealHeightRange.max}` : 'cm'
                        }),
                        errors.height && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.height),
                        vitalSuggestions?.idealHeightRange && React.createElement('p', { className: 'text-xs text-gray-500' }, `Expected Height Range: ${vitalSuggestions.idealHeightRange.min}-${vitalSuggestions.idealHeightRange.max} cm`)
                    ),

                    // BMI Display
                    currentBMI && React.createElement('div', { className: 'md:col-span-2 p-3 bg-gray-50 rounded' },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                            React.createElement('span', { className: 'font-medium' }, `BMI: ${currentBMI}`),
                            React.createElement('span', { className: `font-medium ${bmiInfo.color}` }, bmiInfo.category)
                        )
                    ),

                    // Blood Pressure Systolic
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Blood Pressure - Systolic (mmHg) *'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'bloodPressureSystolic',
                            value: formData.bloodPressureSystolic,
                            onChange: handleChange,
                            className: 'form-input',
                            placeholder: '120'
                        }),
                        errors.bloodPressureSystolic && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.bloodPressureSystolic)
                    ),

                    // Blood Pressure Diastolic
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Blood Pressure - Diastolic (mmHg) *'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'bloodPressureDiastolic',
                            value: formData.bloodPressureDiastolic,
                            onChange: handleChange,
                            className: 'form-input',
                            placeholder: '80'
                        }),
                        errors.bloodPressureDiastolic && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.bloodPressureDiastolic),
                        vitalSuggestions?.bpRange && React.createElement('p', { className: 'text-xs text-gray-500' }, `Normal Range: ${vitalSuggestions.bpRange} mmHg`)
                    ),

                    // Blood Pressure Display
                    bpInfo && React.createElement('div', { className: 'md:col-span-2 p-3 bg-gray-50 rounded' },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                            React.createElement('span', { className: 'font-medium' }, `Blood Pressure: ${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic}`),
                            React.createElement('span', { className: `font-medium ${bpInfo.color}` }, bpInfo.category)
                        )
                    ),

                    // Heart Rate
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Heart Rate (bpm) *'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'heartRate',
                            value: formData.heartRate,
                            onChange: handleChange,
                            className: 'form-input',
                            placeholder: '72'
                        }),
                        errors.heartRate && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.heartRate),
                        vitalSuggestions?.heartRate && React.createElement('p', { className: 'text-xs text-gray-500' }, `Expected: ${vitalSuggestions.heartRate} bpm`)
                    ),

                    // Temperature
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Temperature (°C) *'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'temperature',
                            value: formData.temperature,
                            onChange: handleChange,
                            step: '0.1',
                            className: 'form-input',
                            placeholder: '37.0'
                        }),
                        errors.temperature && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.temperature),
                        vitalSuggestions?.temperature && React.createElement('p', { className: 'text-xs text-gray-500' }, `Normal: ${vitalSuggestions.temperature} °C`)
                    ),

                    // Respiratory Rate
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Respiratory Rate (breaths/min)'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'respiratoryRate',
                            value: formData.respiratoryRate,
                            onChange: handleChange,
                            className: 'form-input',
                            placeholder: '16'
                        }),
                        vitalSuggestions?.respiratoryRate && React.createElement('p', { className: 'text-xs text-gray-500' }, `Normal RR: ${vitalSuggestions.respiratoryRate} breaths/min`)
                    ),

                    // Oxygen Saturation
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Oxygen Saturation (%)'),
                        React.createElement('input', {
                            type: 'number',
                            name: 'oxygenSaturation',
                            value: formData.oxygenSaturation,
                            onChange: handleChange,
                            min: '70',
                            max: '100',
                            className: 'form-input',
                            placeholder: '98'
                        }),
                        vitalSuggestions?.oxygenSaturation && React.createElement('p', { className: 'text-xs text-gray-500' }, `Normal SpO₂: ${vitalSuggestions.oxygenSaturation}%`)
                    ),

                    // Notes
                    React.createElement('div', { className: 'md:col-span-2' },
                        React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Clinical Notes'),
                        React.createElement('textarea', {
                            name: 'notes',
                            value: formData.notes,
                            onChange: handleChange,
                            rows: 3,
                            className: 'form-input',
                            placeholder: 'Additional observations or notes...'
                        })
                    )
                ),

                React.createElement('div', { className: 'mt-6' },
                    React.createElement('button', {
                        type: 'submit',
                        className: 'btn btn-primary'
                    }, 'Record Vitals')
                )
            )
        ),

        // Patient Vitals History
        selectedPatientDetails && patientVitals.length > 0 && React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, `Recent Vitals History for ${selectedPatientDetails.fullName}`),
            React.createElement('div', { className: 'overflow-x-auto' },
                React.createElement('table', { className: 'table' },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            React.createElement('th', null, 'Date'),
                            React.createElement('th', null, 'Weight'),
                            React.createElement('th', null, 'BMI'),
                            React.createElement('th', null, 'BP'),
                            React.createElement('th', null, 'Heart Rate'),
                            React.createElement('th', null, 'Temperature')
                        )
                    ),
                    React.createElement('tbody', null,
                        patientVitals.map((vital) =>
                            React.createElement('tr', { key: vital.id },
                                React.createElement('td', null, new Date(vital.recordedAt).toLocaleDateString()),
                                React.createElement('td', null, `${vital.weight} kg`),
                                React.createElement('td', null, vital.bmi),
                                React.createElement('td', null, `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`),
                                React.createElement('td', null, `${vital.heartRate} bpm`),
                                React.createElement('td', null, `${vital.temperature}°C`)
                            )
                        )
                    )
                )
            )
        )
    );
};

// Export to window object for global access
window.VitalsForm = VitalsForm;

console.log('VitalsForm component loaded successfully');