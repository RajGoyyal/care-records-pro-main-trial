import React, { useState } from 'react';
import { exportApi, patientApi, vitalsApi, prescriptionApi } from '../services/api';
import { Patient, Vitals, Prescription } from '../types/hmis';

const ExportDataPage: React.FC = () => {
    const [loading, setLoading] = useState(false);

    const escapeCSV = (str: string | number | undefined | null) => {
        if (str === undefined || str === null) return '';
        const stringValue = String(str);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const downloadCSV = (content: string, fileName: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const tryDatabaseExport = async (endpoint: string, filename: string) => {
        try {
            const blob = await exportApi.exportData(endpoint);
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Database export failed for ${endpoint}:`, error);
            return false;
        }
    };

    const shapePatients = (patients: Patient[]) => {
        const header = ['ID', 'USN', 'Full Name', 'Age', 'Gender', 'Contact', 'Email', 'Address', 'Created At'];
        const rows = patients.map(p => [
            p.id,
            p.usn,
            p.fullName,
            p.age,
            p.gender,
            p.contact,
            p.email || '',
            p.address,
            p.createdAt
        ].map(escapeCSV).join(','));
        return [header.join(','), ...rows].join('\n');
    };

    const shapeVitals = (vitals: Vitals[]) => {
        const header = ['ID', 'USN', 'Date', 'Weight (kg)', 'Height (cm)', 'BMI', 'BP', 'Pulse', 'Temp (C)', 'Notes'];
        const rows = vitals.map(v => [
            v.id,
            v.usn,
            v.recordedAt,
            v.weight,
            v.height,
            v.bmi,
            v.bloodPressure,
            v.pulse,
            v.temperature,
            v.notes
        ].map(escapeCSV).join(','));
        return [header.join(','), ...rows].join('\n');
    };

    const shapePrescriptions = (prescriptions: Prescription[]) => {
        const header = ['ID', 'USN', 'Date', 'Patient Name', 'Diagnosis', 'Medications', 'Notes', 'Follow Up', 'Prescribed By'];
        const rows = prescriptions.map(p => [
            p.id,
            p.usn,
            p.prescribedAt,
            p.patientName,
            p.diagnosis,
            (p.medications || []).map((m: any) => `${m.name} (${m.dosage})`).join('; '),
            p.notes,
            p.followUpDate,
            p.prescribedBy
        ].map(escapeCSV).join(','));
        return [header.join(','), ...rows].join('\n');
    };

    const handleExport = async (type: 'patients' | 'vitals' | 'prescriptions' | 'all') => {
        setLoading(true);
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            if (type === 'patients' || type === 'all') {
                const success = await tryDatabaseExport('patients', `patients_export_${timestamp}.csv`);
                if (!success) {
                    // Fallback to local fetching
                    const patients = await patientApi.getAll();
                    const csv = shapePatients(patients);
                    downloadCSV(csv, `patients_local_export_${timestamp}.csv`);
                }
            }

            if (type === 'vitals' || type === 'all') {
                const success = await tryDatabaseExport('vitals', `vitals_export_${timestamp}.csv`);
                if (!success) {
                    // Fallback: fetch all vitals (inefficient but necessary if backend export fails)
                    // We need to iterate patients to get all vitals if no getAll endpoint
                    const patients = await patientApi.getAll();
                    let allVitals: Vitals[] = [];
                    for (const p of patients) {
                        const v = await vitalsApi.getByUsn(p.usn);
                        allVitals = [...allVitals, ...v];
                    }
                    const csv = shapeVitals(allVitals);
                    downloadCSV(csv, `vitals_local_export_${timestamp}.csv`);
                }
            }

            if (type === 'prescriptions' || type === 'all') {
                const success = await tryDatabaseExport('prescriptions', `prescriptions_export_${timestamp}.csv`);
                if (!success) {
                    // Fallback
                    const patients = await patientApi.getAll();
                    let allPrescriptions: Prescription[] = [];
                    for (const p of patients) {
                        const pr = await prescriptionApi.getByUsn(p.usn);
                        allPrescriptions = [...allPrescriptions, ...pr];
                    }
                    const csv = shapePrescriptions(allPrescriptions);
                    downloadCSV(csv, `prescriptions_local_export_${timestamp}.csv`);
                }
            }

            alert('Export completed successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-center">Export Data</h2>
            <p className="text-gray-600 mb-8 text-center">
                Download your data as CSV files. You can export individual datasets or all data at once.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => handleExport('patients')}
                    disabled={loading}
                    className="p-6 border-2 border-blue-100 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex flex-col items-center justify-center gap-3"
                >
                    <div className="text-3xl">👥</div>
                    <div className="font-medium text-lg">Export Patients</div>
                    <div className="text-xs text-gray-500">Download patient demographics</div>
                </button>

                <button
                    onClick={() => handleExport('vitals')}
                    disabled={loading}
                    className="p-6 border-2 border-green-100 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors flex flex-col items-center justify-center gap-3"
                >
                    <div className="text-3xl">💗</div>
                    <div className="font-medium text-lg">Export Vitals</div>
                    <div className="text-xs text-gray-500">Download vital signs history</div>
                </button>

                <button
                    onClick={() => handleExport('prescriptions')}
                    disabled={loading}
                    className="p-6 border-2 border-purple-100 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors flex flex-col items-center justify-center gap-3"
                >
                    <div className="text-3xl">💊</div>
                    <div className="font-medium text-lg">Export Prescriptions</div>
                    <div className="text-xs text-gray-500">Download medication records</div>
                </button>

                <button
                    onClick={() => handleExport('all')}
                    disabled={loading}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-3 bg-gray-50"
                >
                    <div className="text-3xl">📦</div>
                    <div className="font-medium text-lg">Export All Data</div>
                    <div className="text-xs text-gray-500">Download everything</div>
                </button>
            </div>

            {loading && (
                <div className="mt-6 text-center text-blue-600">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                    <p>Processing export...</p>
                </div>
            )}
        </div>
    );
};

export default ExportDataPage;
