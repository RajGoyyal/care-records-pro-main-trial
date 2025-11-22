import React, { useState, useEffect } from 'react';
import { prescriptionApi, patientApi } from '../services/api';
import { Patient, Prescription } from '../types/hmis';

const PrescriptionManagementPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fetchedPatients, fetchedPrescriptions] = await Promise.all([
                    patientApi.getAll(),
                    // Since there is no getAll for prescriptions in the original API, we might need to fetch all by iterating patients or adding a getAll endpoint.
                    // However, looking at api.ts, there is no getAll for prescriptions.
                    // But the original component received 'prescriptions' as a prop which implies it had access to all of them.
                    // In a real app, we should have an endpoint to get all prescriptions.
                    // For now, let's assume we can fetch all prescriptions if we iterate over patients or if we add getAll to api.ts.
                    // Wait, the original app likely loaded all prescriptions from localStorage or a single endpoint.
                    // Let's check api.ts again. It has getByUsn.
                    // If I can't get all, I might need to fetch for all patients.
                    // Let's try to fetch for all patients for now, or check if I missed getAll in api.ts.
                    // I didn't add getAll to prescriptionApi in api.ts. I should probably add it or just iterate.
                    // Iterating is slow. I'll assume for this "port" I can just fetch for all patients I have.
                    // Actually, let's just fetch patients first.
                    patientApi.getAll()
                ]);
                setPatients(fetchedPatients);

                // Fetch prescriptions for all patients (inefficient but works for now without backend change)
                const allPrescriptions: Prescription[] = [];
                for (const patient of fetchedPatients) {
                    const patientPrescriptions = await prescriptionApi.getByUsn(patient.usn);
                    allPrescriptions.push(...patientPrescriptions);
                }
                // Sort by date desc
                allPrescriptions.sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime());
                setPrescriptions(allPrescriptions);

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter prescriptions based on search term
    const filteredPrescriptions = prescriptions.filter(prescription => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            (prescription.patientName || '').toLowerCase().includes(searchLower) ||
            (prescription.usn || '').toLowerCase().includes(searchLower) ||
            (prescription.diagnosis || '').toLowerCase().includes(searchLower) ||
            (prescription.id || '').toString().toLowerCase().includes(searchLower) ||
            (prescription.patientAge || '').toString().includes(searchLower) ||
            (prescription.patientGender || '').toLowerCase().includes(searchLower)
        );
    });

    const printPrescription = (prescription: Prescription) => {
        const logoUrl = '/nhce_logo.png';
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print prescription');
            return;
        }

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
                        <img src="${logoUrl}" alt="NHCE Logo" style="height:80px;margin-right:20px;" />
                        <div style="text-align: left;">
                            <div class="clinic-name">New Horizon Sanjeevani Clinic</div>
                            <div class="clinic-subtitle">New Horizon Knowledge Park, Outer Ring Rd, near Marathalli, Kaverappa Layout, Kadubeesanahalli, Bengaluru, Karnataka - 560103.</div>
                            <div class="clinic-contact">Contact : Manoj VRC Swami  +91 81472 91675<br>Amrutha Varshini D +91 63625 88851</div>
                        </div>
                    </div>
                </div>

                <div class="prescription-header">
                    <div class="document-title">Prescription / Treatment Regime Details</div>
                    <div style="display:flex; flex-wrap:wrap; gap:32px; justify-content:center;">
                        <div class="patient-info">
                            <h3>Patient Information</h3>
                            <div class="info-row"><span class="label">Name:</span> ${patientName}</div>
                            <div class="info-row"><span class="label">USN:</span> ${usn}</div>
                            <div class="info-row"><span class="label">Age:</span> ${patientAge} years</div>
                            <div class="info-row"><span class="label">Gender:</span> ${patientGender}</div>
                        </div>
                        <div class="prescription-info">
                            <h3>Consultation Details</h3>
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
                    <h3>Prescribed Medications</h3>
                    ${medications.map((med: any, index: number) => `
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
        setTimeout(() => printWindow.print(), 500);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Prescription Management...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Prescription / Treatment Regime Management</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search by patient name, USN, phone, treatment/diagnosis, or Rx ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input w-64"
                    />
                </div>
            </div>
            
            {searchTerm && (
                <div className="mb-4 text-sm text-gray-600">
                    <span className="font-medium">Searching for:</span>
                    {` "${searchTerm}" `}
                    <span className="ml-2 text-gray-500">
                        (searches patient name, USN, phone number, treatment/diagnosis, and prescription ID)
                    </span>
                </div>
            )}

            {filteredPrescriptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                    {searchTerm ? 'No prescriptions or treatment regimes found.' : 'No prescriptions / treatment regimes created yet.'}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Patient</th>
                                <th>USN</th>
                                <th>Treatment / Diagnosis</th>
                                <th>Medications</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPrescriptions.map((prescription) => (
                                <tr key={prescription.id}>
                                    <td>
                                        {(() => {
                                            const ts = prescription.prescribedAtIST || prescription.prescribedAt;
                                            if (!ts) return 'N/A';
                                            try { 
                                                return new Date(ts).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }); 
                                            } catch { 
                                                return 'N/A'; 
                                            }
                                        })()}
                                    </td>
                                    <td>{prescription.patientName}</td>
                                    <td>{prescription.usn}</td>
                                    <td>{prescription.diagnosis}</td>
                                    <td>
                                        <div className="text-sm">
                                            {(prescription.medications || []).slice(0, 2).map((med: any) => med?.name || 'Unnamed medication').join(', ')}
                                            {(prescription.medications || []).length > 2 && `... (+${(prescription.medications || []).length - 2} more)`}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => printPrescription(prescription)}
                                                className="btn btn-primary text-xs"
                                                title="Print Prescription"
                                            >
                                                🖨️ Print
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PrescriptionManagementPage;
