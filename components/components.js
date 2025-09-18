// All HMIS Components in one file for easier management
// Note: This file should be loaded after utilities.js and React libraries

// Export all components to window object for global access
window.HMISComponents = window.HMISComponents || {};

// Dashboard Component (already created separately, but included here for completeness)
window.HMISComponents.Dashboard = ({ patients, vitals, prescriptions, caseReports, sickIntimations, setActiveTab }) => {
    // Dashboard implementation here (already in Dashboard.js)
    // This would be the full Dashboard code from the separate file
    return React.createElement('div', null, 'Dashboard Component - Load from Dashboard.js');
};

// Patient Form Component 
window.HMISComponents.PatientForm = ({ patients, setPatients, selectedPatient, setSelectedPatient }) => {
    const [formData, setFormData] = React.useState({
        usn: '',
        fullName: '',
        age: '',
        gender: '',
        address: '',
        phone: '',
        email: ''
    });
    const [errors, setErrors] = React.useState({});
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (selectedPatient) {
            setFormData({
                usn: selectedPatient.usn || '',
                fullName: selectedPatient.fullName || '',
                age: selectedPatient.age || '',
                gender: selectedPatient.gender || '',
                address: selectedPatient.address || '',
                phone: selectedPatient.phone || '',
                email: selectedPatient.email || ''
            });
        } else {
            setFormData({
                usn: '', fullName: '', age: '', gender: '', address: '', phone: '', email: ''
            });
        }
    }, [selectedPatient]);

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[0-9\-\s]{7,15}$/;
        if (!formData.usn?.trim()) newErrors.usn = 'USN is required';
        if (!formData.fullName?.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.age || Number(formData.age) <= 0) newErrors.age = 'Valid age is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (formData.email && !emailRegex.test(formData.email)) newErrors.email = 'Invalid email';
        if (formData.phone && !phoneRegex.test(formData.phone)) newErrors.phone = 'Invalid phone';

        if (!selectedPatient && formData.usn?.trim()) {
            const exists = (patients || []).some(p => (p.usn || '').toLowerCase() === formData.usn.trim().toLowerCase());
            if (exists) newErrors.usn = 'USN already exists';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const resetForm = () => {
        setSelectedPatient(null);
        setFormData({ usn: '', fullName: '', age: '', gender: '', address: '', phone: '', email: '' });
        setErrors({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSaving(true);

        try {
            const nowMs = Date.now();
            const payload = {
                usn: formData.usn.trim(),
                fullName: formData.fullName.trim(),
                age: Number(formData.age),
                gender: formData.gender,
                address: formData.address?.trim() || '',
                phone: formData.phone?.trim() || '',
                email: formData.email?.trim() || '',
                createdAt: selectedPatient?.createdAt || nowMs,
                updatedAt: nowMs
            };

            let updatedList = [];
            if (selectedPatient) {
                updatedList = (patients || []).map(p => 
                    p.usn === selectedPatient.usn ? { ...p, ...payload, createdAt: p.createdAt, updatedAt: nowMs } : p
                );
            } else {
                updatedList = [ ...(patients || []), payload ];
            }

            setPatients(updatedList);
            saveToStorage('patients', updatedList);

            const actionText = selectedPatient ? 'updated' : 'added';
            try {
                await syncWithDatabase('patients', payload, 'POST');
                alert(`✅ Patient ${actionText} and synced to database successfully!`);
            } catch (_) {
                alert(`💾 Patient ${actionText} locally. Will sync when server is available.`);
            }

            resetForm();
        } finally {
            setSaving(false);
        }
    };

    return React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
            React.createElement('h2', { className: 'text-xl font-semibold' }, 
                selectedPatient ? 'Edit Patient' : 'Add New Patient'
            ),
            React.createElement('div', { className: 'text-sm text-gray-500' }, 'Fields marked * are required')
        ),
        React.createElement('form', { onSubmit: handleSubmit },
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                // USN field
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'USN *'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'usn',
                        value: formData.usn,
                        onChange: handleChange,
                        className: 'form-input',
                        placeholder: 'e.g., 1NH21CS001',
                        disabled: !!selectedPatient
                    }),
                    errors.usn && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.usn)
                ),
                // Full Name field
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Full Name *'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'fullName',
                        value: formData.fullName,
                        onChange: handleChange,
                        className: 'form-input',
                        placeholder: 'Student/Staff name'
                    }),
                    errors.fullName && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.fullName)
                ),
                // Age field
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Age *'),
                    React.createElement('input', {
                        type: 'number',
                        name: 'age',
                        value: formData.age,
                        onChange: handleChange,
                        className: 'form-input',
                        min: '1'
                    }),
                    errors.age && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.age)
                ),
                // Gender field  
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Gender *'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'gender',
                        value: formData.gender,
                        onChange: handleChange,
                        className: 'form-input',
                        placeholder: 'e.g., Male, Female, Other'
                    }),
                    errors.gender && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.gender)
                ),
                // Address field
                React.createElement('div', { className: 'md:col-span-2' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Address'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'address',
                        value: formData.address,
                        onChange: handleChange,
                        className: 'form-input',
                        placeholder: 'Optional'
                    })
                ),
                // Phone field
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Phone'),
                    React.createElement('input', {
                        type: 'tel',
                        name: 'phone',
                        value: formData.phone,
                        onChange: handleChange,
                        className: 'form-input',
                        placeholder: 'Optional'
                    }),
                    errors.phone && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.phone)
                ),
                // Email field
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Email'),
                    React.createElement('input', {
                        type: 'email',
                        name: 'email',
                        value: formData.email,
                        onChange: handleChange,
                        className: 'form-input',
                        placeholder: 'Optional'
                    }),
                    errors.email && React.createElement('p', { className: 'text-red-500 text-sm' }, errors.email)
                )
            ),
            React.createElement('div', { className: 'flex flex-wrap gap-3 mt-6' },
                React.createElement('button', {
                    type: 'submit',
                    className: 'btn btn-primary',
                    disabled: saving
                }, saving ? 'Saving...' : selectedPatient ? 'Update Patient' : 'Add Patient'),
                selectedPatient && React.createElement('button', {
                    type: 'button',
                    onClick: resetForm,
                    className: 'btn btn-secondary'
                }, 'Cancel Edit')
            )
        )
    );
};

// Placeholder for other components - these would contain the full implementations
window.HMISComponents.VitalsForm = ({ patients, vitals, setVitals }) => {
    return React.createElement('div', { className: 'card' }, 
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Vitals Form'),
        React.createElement('p', null, 'Vitals form component - to be implemented from original code')
    );
};

window.HMISComponents.PrescriptionForm = ({ patients, prescriptions, setPrescriptions }) => {
    return React.createElement('div', { className: 'card' }, 
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Treatment Form'),
        React.createElement('p', null, 'Treatment/Prescription form component - to be implemented from original code')
    );
};

window.HMISComponents.PrescriptionManagement = ({ patients, prescriptions, setPrescriptions }) => {
    return React.createElement('div', { className: 'card' }, 
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Treatment Management'),
        React.createElement('p', null, 'Treatment/Prescription management component - to be implemented from original code')
    );
};

window.HMISComponents.ExportData = ({ patients, vitals, prescriptions }) => {
    return React.createElement('div', { className: 'card' }, 
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Export Data'),
        React.createElement('p', null, 'Export data component - to be implemented from original code')
    );
};

window.HMISComponents.PatientList = ({ patients, onEdit, onDelete }) => {
    return React.createElement('div', { className: 'card' }, 
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Patient List'),
        React.createElement('p', null, 'Patient list component - to be implemented from original code')
    );
};

window.HMISComponents.CaseReportManagement = ({ patients, caseReports, setCaseReports, sickIntimations, setSickIntimations }) => {
    return React.createElement('div', { className: 'card' }, 
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Case Report Management'),
        React.createElement('p', null, 'Case report management component - to be implemented from original code')
    );
};

console.log('HMIS Components loaded successfully');