import React, { useState, useEffect } from 'react';
import { vitalsApi, patientApi } from '../services/api';
import { Patient, Vitals } from '../types/hmis';

const VitalsPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [vitals, setVitals] = useState<Vitals[]>([]);
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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedPatientDetails, setSelectedPatientDetails] = useState<Patient | null>(null);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const fetchedPatients = await patientApi.getAll();
                setPatients(fetchedPatients);
            } catch (error) {
                console.error('Error fetching patients:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Fetch vitals when patient is selected
    useEffect(() => {
        const fetchVitals = async () => {
            if (selectedPatientDetails) {
                try {
                    const fetchedVitals = await vitalsApi.getByUsn(selectedPatientDetails.usn);
                    setVitals(fetchedVitals);
                } catch (error) {
                    console.error('Error fetching vitals:', error);
                }
            } else {
                setVitals([]);
            }
        };
        fetchVitals();
    }, [selectedPatientDetails]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.usn) newErrors.usn = 'Please select a patient';
        if (!formData.weight || parseFloat(formData.weight) <= 0) newErrors.weight = 'Valid weight is required';
        if (!formData.height || parseFloat(formData.height) <= 0) newErrors.height = 'Valid height is required';
        if (!formData.bloodPressureSystolic || parseFloat(formData.bloodPressureSystolic) <= 0) newErrors.bloodPressureSystolic = 'Valid systolic BP is required';
        if (!formData.bloodPressureDiastolic || parseFloat(formData.bloodPressureDiastolic) <= 0) newErrors.bloodPressureDiastolic = 'Valid diastolic BP is required';
        if (!formData.heartRate || parseFloat(formData.heartRate) <= 0) newErrors.heartRate = 'Valid heart rate is required';
        if (!formData.temperature || parseFloat(formData.temperature) <= 0) newErrors.temperature = 'Valid temperature is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateBMI = (weight: number, height: number) => {
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    };

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
        if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
        if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
        return { category: 'Obese', color: 'text-red-600' };
    };

    const getBloodPressureCategory = (systolic: number, diastolic: number) => {
        if (systolic < 120 && diastolic < 80) return { category: 'Normal', color: 'text-green-600' };
        if (systolic < 130 && diastolic < 80) return { category: 'Elevated', color: 'text-yellow-600' };
        if (systolic < 140 || diastolic < 90) return { category: 'Stage 1 Hypertension', color: 'text-orange-600' };
        return { category: 'Stage 2 Hypertension', color: 'text-red-600' };
    };

    const getVitalSuggestions = (patient: Patient) => {
        if (!patient) return null;
        const age = patient.age;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const vitalRecord: Omit<Vitals, 'id'> = {
            usn: formData.usn,
            weight: parseFloat(formData.weight),
            height: parseFloat(formData.height),
            bloodPressure: `${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic}`,
            pulse: parseInt(formData.heartRate),
            temperature: parseFloat(formData.temperature),
            recordedAt: new Date().toISOString(),
            notes: formData.notes
        };

        try {
            const newVital = await vitalsApi.create(vitalRecord);
            setVitals([...vitals, newVital]);
            alert('✅ Vitals recorded and synced to database successfully!');
            
            // Reset form
            setFormData({
                usn: '', weight: '', height: '', bloodPressureSystolic: '', bloodPressureDiastolic: '',
                heartRate: '', temperature: '', respiratoryRate: '', oxygenSaturation: '', notes: ''
            });
            setSelectedPatientDetails(null);
            setErrors({});
        } catch (error) {
            console.error('Error saving vitals:', error);
            alert('❌ Failed to save vitals. Please try again.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePatientSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setPatientSearchTerm(term);
        setShowPatientDropdown(true);
        if (!term) {
            setFormData(prev => ({ ...prev, usn: '' }));
            setSelectedPatientDetails(null);
        }
    };

    const selectPatientFromSearch = (patient: Patient) => {
        setFormData(prev => ({ ...prev, usn: patient.usn }));
        setSelectedPatientDetails(patient);
        setPatientSearchTerm(`${patient.usn} - ${patient.fullName}`);
        setShowPatientDropdown(false);
        if (errors.usn) setErrors(prev => ({ ...prev, usn: '' }));
    };

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.vitals-patient-select')) {
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

    const filteredPatients = patientSearchTerm
        ? patients.filter(p => {
            const term = patientSearchTerm.toLowerCase();
            return (p.usn && p.usn.toLowerCase().includes(term)) || (p.fullName && p.fullName.toLowerCase().includes(term));
        })
        : patients;
    const vitalSuggestions = selectedPatientDetails ? getVitalSuggestions(selectedPatientDetails) : null;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Vitals Module...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Record Patient Vitals</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Patient Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Select Patient *</label>
                            <div className="relative vitals-patient-select">
                                <input
                                    type="text"
                                    value={patientSearchTerm}
                                    onChange={handlePatientSearch}
                                    onFocus={() => setShowPatientDropdown(true)}
                                    placeholder="Search patient by USN or name..."
                                    className="form-input pr-8 w-full"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 10-14 0 7 7 0 0014 0z" />
                                    </svg>
                                </div>
                                {showPatientDropdown && filteredPatients.length > 0 && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-auto">
                                        {filteredPatients.slice(0, 10).map(p => (
                                            <div
                                                key={p.usn}
                                                onClick={() => selectPatientFromSearch(p)}
                                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                            >
                                                <div className="font-medium">{p.fullName}</div>
                                                <div className="text-xs text-gray-600">{p.usn} • {p.age}y • {p.gender}</div>
                                            </div>
                                        ))}
                                        {filteredPatients.length > 10 && (
                                            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">Showing first 10 results...</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {errors.usn && <p className="text-red-500 text-sm">{errors.usn}</p>}
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Weight (kg) *</label>
                            <input
                                type="number"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                step="0.1"
                                className="form-input w-full"
                                placeholder={vitalSuggestions?.idealWeightRange ? `${vitalSuggestions.idealWeightRange.min}-${vitalSuggestions.idealWeightRange.max}` : 'kg'}
                            />
                            {errors.weight && <p className="text-red-500 text-sm">{errors.weight}</p>}
                            {vitalSuggestions?.idealWeightRange && <p className="text-xs text-gray-500">Ideal: {vitalSuggestions.idealWeightRange.min}-{vitalSuggestions.idealWeightRange.max} kg (BMI 18.5-24.9)</p>}
                        </div>

                        {/* Height */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Height (cm) *</label>
                            <input
                                type="number"
                                name="height"
                                value={formData.height}
                                onChange={handleChange}
                                className="form-input w-full"
                                placeholder={vitalSuggestions?.idealHeightRange ? `${vitalSuggestions.idealHeightRange.min}-${vitalSuggestions.idealHeightRange.max}` : 'cm'}
                            />
                            {errors.height && <p className="text-red-500 text-sm">{errors.height}</p>}
                            {vitalSuggestions?.idealHeightRange && <p className="text-xs text-gray-500">Expected Height Range: {vitalSuggestions.idealHeightRange.min}-{vitalSuggestions.idealHeightRange.max} cm</p>}
                        </div>

                        {/* BMI Display */}
                        {currentBMI && bmiInfo && (
                            <div className="md:col-span-2 p-3 bg-gray-50 rounded">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">BMI: {currentBMI}</span>
                                    <span className={`font-medium ${bmiInfo.color}`}>{bmiInfo.category}</span>
                                </div>
                            </div>
                        )}

                        {/* Blood Pressure Systolic */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Blood Pressure - Systolic (mmHg) *</label>
                            <input
                                type="number"
                                name="bloodPressureSystolic"
                                value={formData.bloodPressureSystolic}
                                onChange={handleChange}
                                className="form-input w-full"
                                placeholder="120"
                            />
                            {errors.bloodPressureSystolic && <p className="text-red-500 text-sm">{errors.bloodPressureSystolic}</p>}
                        </div>

                        {/* Blood Pressure Diastolic */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Blood Pressure - Diastolic (mmHg) *</label>
                            <input
                                type="number"
                                name="bloodPressureDiastolic"
                                value={formData.bloodPressureDiastolic}
                                onChange={handleChange}
                                className="form-input w-full"
                                placeholder="80"
                            />
                            {errors.bloodPressureDiastolic && <p className="text-red-500 text-sm">{errors.bloodPressureDiastolic}</p>}
                            {vitalSuggestions?.bpRange && <p className="text-xs text-gray-500">Normal Range: {vitalSuggestions.bpRange} mmHg</p>}
                        </div>

                        {/* Blood Pressure Display */}
                        {bpInfo && (
                            <div className="md:col-span-2 p-3 bg-gray-50 rounded">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Blood Pressure: {formData.bloodPressureSystolic}/{formData.bloodPressureDiastolic}</span>
                                    <span className={`font-medium ${bpInfo.color}`}>{bpInfo.category}</span>
                                </div>
                            </div>
                        )}

                        {/* Heart Rate */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Heart Rate (bpm) *</label>
                            <input
                                type="number"
                                name="heartRate"
                                value={formData.heartRate}
                                onChange={handleChange}
                                className="form-input w-full"
                                placeholder="72"
                            />
                            {errors.heartRate && <p className="text-red-500 text-sm">{errors.heartRate}</p>}
                            {vitalSuggestions?.heartRate && <p className="text-xs text-gray-500">Expected: {vitalSuggestions.heartRate} bpm</p>}
                        </div>

                        {/* Temperature */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Temperature (°C) *</label>
                            <input
                                type="number"
                                name="temperature"
                                value={formData.temperature}
                                onChange={handleChange}
                                step="0.1"
                                className="form-input w-full"
                                placeholder="37.0"
                            />
                            {errors.temperature && <p className="text-red-500 text-sm">{errors.temperature}</p>}
                            {vitalSuggestions?.temperature && <p className="text-xs text-gray-500">Normal: {vitalSuggestions.temperature} °C</p>}
                        </div>

                        {/* Respiratory Rate */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Respiratory Rate (breaths/min)</label>
                            <input
                                type="number"
                                name="respiratoryRate"
                                value={formData.respiratoryRate}
                                onChange={handleChange}
                                className="form-input w-full"
                                placeholder="16"
                            />
                            {vitalSuggestions?.respiratoryRate && <p className="text-xs text-gray-500">Normal RR: {vitalSuggestions.respiratoryRate} breaths/min</p>}
                        </div>

                        {/* Oxygen Saturation */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Oxygen Saturation (%)</label>
                            <input
                                type="number"
                                name="oxygenSaturation"
                                value={formData.oxygenSaturation}
                                onChange={handleChange}
                                min="70"
                                max="100"
                                className="form-input w-full"
                                placeholder="98"
                            />
                            {vitalSuggestions?.oxygenSaturation && <p className="text-xs text-gray-500">Normal SpO₂: {vitalSuggestions.oxygenSaturation}%</p>}
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Clinical Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                className="form-input w-full"
                                placeholder="Additional observations or notes..."
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            type="submit"
                            className="btn btn-primary"
                        >
                            Record Vitals
                        </button>
                    </div>
                </form>
            </div>

            {/* Patient Vitals History */}
            {selectedPatientDetails && vitals.length > 0 && (
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Recent Vitals History for {selectedPatientDetails.fullName}</h3>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Weight</th>
                                    <th>BMI</th>
                                    <th>BP</th>
                                    <th>Heart Rate</th>
                                    <th>Temperature</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vitals.slice().reverse().slice(0, 5).map((vital) => (
                                    <tr key={vital.id}>
                                        <td>{new Date(vital.recordedAt).toLocaleDateString()}</td>
                                        <td>{vital.weight} kg</td>
                                        <td>{vital.bmi}</td>
                                        <td>{vital.bloodPressure}</td>
                                        <td>{vital.pulse} bpm</td>
                                        <td>{vital.temperature}°C</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VitalsPage;
