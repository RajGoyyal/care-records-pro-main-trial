// PatientForm Component
const { useState, useEffect } = React;

const PatientForm = ({ patients, setPatients, selectedPatient, setSelectedPatient, saveToStorage, syncWithDatabase, checkServerHealth, serverAvailable }) => {
    const [formData, setFormData] = useState({
        usn: '',
        fullName: '',
        age: '',
        gender: '',
        address: '',
        phone: '',
        email: ''
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
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

        // Unique USN check when creating new
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
                // Timestamps help prevent server refresh from overwriting local edits
                createdAt: typeof selectedPatient?.createdAt === 'number' ? selectedPatient.createdAt : (selectedPatient?.createdAt ? Date.parse(selectedPatient.createdAt) || nowMs : nowMs),
                updatedAt: nowMs
            };

            let updatedList = [];
            if (selectedPatient) {
                // Update existing
                updatedList = (patients || []).map(p => {
                    if (p.usn === selectedPatient.usn) {
                        return {
                            ...p,
                            ...payload,
                            createdAt: typeof p.createdAt === 'number' ? p.createdAt : (p.createdAt ? Date.parse(p.createdAt) || payload.createdAt : payload.createdAt), // preserve original creation time
                            updatedAt: nowMs
                        };
                    }
                    return p;
                });
            } else {
                // Add new
                updatedList = [ ...(patients || []), payload ];
            }

            setPatients(updatedList);
            saveToStorage('patients', updatedList);

            // Try to sync with server and inform user where it's stored
            const wasEdit = !!selectedPatient;
            const actionText = wasEdit ? 'updated' : 'added';
            let synced = false;
            try {
                // Backend accepts POST for both create and update (INSERT OR REPLACE)
                synced = await syncWithDatabase('patients', payload, 'POST');
            } catch (_) { synced = false; }

            if (synced) {
                alert(`✅ Patient ${actionText} and synced to database successfully!`);
            } else if (serverAvailable) {
                alert(`❌ Patient ${actionText} locally but failed to sync. Will retry when online.`);
            } else {
                alert(`💾 Patient ${actionText} locally. Will sync when server is available.`);
            }

            resetForm();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedPatient ? 'Edit Patient' : 'Add New Patient'}</h2>
                <div className="text-sm text-gray-500">Fields marked * are required</div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">USN *</label>
                        <input
                            type="text"
                            name="usn"
                            value={formData.usn}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="e.g., 1NH21CS001"
                            disabled={!!selectedPatient}
                        />
                        {errors.usn && <p className="text-red-500 text-sm">{errors.usn}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name *</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Student/Staff name"
                        />
                        {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Age *</label>
                        <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            className="form-input"
                            min="1"
                        />
                        {errors.age && <p className="text-red-500 text-sm">{errors.age}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Gender *</label>
                        <input
                            type="text"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="e.g., Male, Female, Other"
                        />
                        {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Optional"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Optional"
                        />
                        {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Optional"
                        />
                        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : selectedPatient ? 'Update Patient' : 'Add Patient'}
                    </button>
                    {selectedPatient && (
                        <button type="button" onClick={resetForm} className="btn btn-secondary">Cancel Edit</button>
                    )}
                    <button 
                        type="button" 
                        onClick={async () => {
                            const isHealthy = await checkServerHealth();
                            serverAvailable = isHealthy;
                            if (isHealthy) {
                                alert('✅ Database connection successful!');
                            } else {
                                alert('❌ Database connection failed. Please ensure the Python server is running on localhost:5000');
                            }
                        }}
                        className="btn bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        🔧 Test DB Connection
                    </button>
                </div>
            </form>
        </div>
    );
};

// Export to window object for global access
window.PatientForm = PatientForm;