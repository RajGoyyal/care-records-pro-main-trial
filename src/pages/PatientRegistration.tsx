import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { patientApi } from '../services/api';
import { Patient } from '../types/hmis';

const PatientRegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const editingPatient = location.state?.patient as Patient | undefined;

    const [formData, setFormData] = useState({
        usn: '',
        fullName: '',
        age: '',
        gender: '',
        address: '',
        phone: '',
        email: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editingPatient) {
            setFormData({
                usn: editingPatient.usn || '',
                fullName: editingPatient.fullName || '',
                age: editingPatient.age.toString() || '',
                gender: editingPatient.gender || '',
                address: editingPatient.address || '',
                phone: editingPatient.contact || '', // Note: api.ts uses 'contact', legacy used 'phone'
                email: editingPatient.email || ''
            });
        }
    }, [editingPatient]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[0-9\-\s]{7,15}$/;
        
        if (!formData.usn?.trim()) newErrors.usn = 'USN is required';
        if (!formData.fullName?.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.age || Number(formData.age) <= 0) newErrors.age = 'Valid age is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (formData.email && !emailRegex.test(formData.email)) newErrors.email = 'Invalid email';
        if (formData.phone && !phoneRegex.test(formData.phone)) newErrors.phone = 'Invalid phone';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSaving(true);

        try {
            const patientData: any = {
                usn: formData.usn.trim(),
                fullName: formData.fullName.trim(),
                age: Number(formData.age),
                gender: formData.gender as "Male" | "Female" | "Other",
                address: formData.address?.trim() || '',
                contact: formData.phone?.trim() || '', // Map phone to contact
                email: formData.email?.trim() || '',
            };

            if (editingPatient) {
                await patientApi.update(editingPatient.usn, patientData);
                alert('✅ Patient updated successfully!');
            } else {
                // Check if USN exists first (optional, api might handle it)
                const existing = await patientApi.getByUsn(patientData.usn);
                if (existing) {
                    setErrors(prev => ({ ...prev, usn: 'USN already exists' }));
                    setSaving(false);
                    return;
                }
                await patientApi.create(patientData);
                alert('✅ Patient registered successfully!');
            }
            navigate('/patients');
        } catch (error) {
            console.error('Error saving patient:', error);
            alert('❌ Failed to save patient. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editingPatient ? 'Edit Patient' : 'Register New Patient'}</h2>
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
                            className="form-input w-full"
                            placeholder="e.g., 1NH21CS001"
                            disabled={!!editingPatient}
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
                            className="form-input w-full"
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
                            className="form-input w-full"
                            min="1"
                        />
                        {errors.age && <p className="text-red-500 text-sm">{errors.age}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Gender *</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="form-input w-full"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="form-input w-full"
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
                            className="form-input w-full"
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
                            className="form-input w-full"
                            placeholder="Optional"
                        />
                        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : editingPatient ? 'Update Patient' : 'Register Patient'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => navigate('/patients')} 
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PatientRegistrationPage;
