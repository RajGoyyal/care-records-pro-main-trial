import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '@/services/api';
import { Patient } from '@/types/hmis';

// Import logo for print function - assuming it's in public or assets
// Since we are in Vite, we can import it if it's in src/assets, or reference public URL
// The original code used './nhce_25-scaled-1-2048x683.png' relative to the component.
// We'll assume it's in the public folder for now or use a placeholder.
const LOGO_URL = '/nhce_logo.png'; // Updated to match what was seen in HTML files

const PatientList = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const data = await patientApi.getAll();
            setPatients(data);
        } catch (error) {
            console.error("Failed to fetch patients", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (usn: string) => {
        if (window.confirm('Are you sure you want to delete this patient?')) {
            try {
                await patientApi.delete(usn);
                setPatients(patients.filter(p => p.usn !== usn));
            } catch (error) {
                console.error("Failed to delete patient", error);
                alert("Failed to delete patient");
            }
        }
    };

    const handleEdit = (patient: Patient) => {
        navigate('/register-patient', { state: { patient } });
    };

    const printPatient = (patient: Patient) => {
        if (!patient) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const currentDate = new Date().toLocaleDateString('en-IN');
        const currentTime = new Date().toLocaleTimeString('en-IN');
        const safe = {
            usn: patient.usn || 'N/A',
            fullName: patient.fullName || 'N/A',
            age: patient.age ?? 'N/A',
            gender: patient.gender || 'N/A',
            phone: patient.contact || 'N/A', // Changed from phone to contact based on type definition usually found in these apps
            email: patient.email || 'N/A',
            address: patient.address || 'N/A',
        };
        
        // Use absolute URL for logo to ensure it loads in print window
        const logoUrl = new URL(LOGO_URL, window.location.origin).href;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Patient Details - ${safe.fullName}</title>
                <style>
                    @media print { @page { size: A4; margin: 0.25in 0.35in; } html,body{margin:0;padding:0.05in 0.1in;} .no-print{display:none} }
                    body{ font-family: Arial, sans-serif; max-width:800px; margin:0 auto; padding:10px; color:#000; }
                    .header{ text-align:center; border-bottom:2px solid #333; padding-bottom:6px; margin-bottom:12px; }
                    .clinic-name{ font-size:20px; font-weight:bold; color:#2563eb; }
                    .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
                    .label{ font-weight:bold; display:inline-block; min-width:110px; }
                    .section{ margin:14px 0; }
                    .footer{ margin-top:18px; padding-top:10px; border-top:1px solid #ddd; font-size:9px; color:#666; text-align:center; }
                    .footer p { margin: 2px 0; }
                    .nhei-stamp { margin:18px auto 0 auto; padding:10px 20px; border:2px solid #1d4ed8; border-radius:10px; background:linear-gradient(135deg,#eef6ff,#dbeafe); color:#1e3a8a; font-size:13px; font-weight:600; max-width:520px; letter-spacing:0.5px; box-shadow:0 2px 6px -1px rgba(0,0,0,0.08),0 4px 12px -2px rgba(29,78,216,0.15); }
                    .btn{ background:#16a34a; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; }
                    .btn:hover{ background:#15803d; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="display:flex; align-items:center; justify-content:center; gap:12px;">
                        <img src="${logoUrl}" alt="NHCE Logo" style="height:120px;" />
                        <div style="text-align:left;">
                            <div class="clinic-name">New Horizon Sanjeevani Clinic</div>
                            <div style="font-size:12px;color:#555">New Horizon Knowledge Park, Outer Ring Rd, near Marathalli, Kaverappa Layout, Kadubeesanahalli, Bengaluru, Karnataka - 560103.</div>
                        </div>
                    </div>
                </div>
                <h2 style="margin:0 0 8px 0;">Patient Details</h2>
                <div class="section">
                    <div><span class="label">Name:</span> ${safe.fullName}</div>
                    <div><span class="label">USN:</span> ${safe.usn}</div>
                    <div><span class="label">Age:</span> ${safe.age}</div>
                    <div><span class="label">Gender:</span> ${safe.gender}</div>
                    <div><span class="label">Phone:</span> ${safe.phone}</div>
                    <div><span class="label">Email:</span> ${safe.email}</div>
                    <div><span class="label">Address:</span> ${safe.address}</div>
                </div>
                <div class="footer">
                    <p><strong>New Horizon Sanjeevani Clinic</strong></p>
                    <p>This document is computer generated and issued by the clinic.</p>
                    <p>Contact : Raj Goyal +91 79922 47030 · rajgoyal@duck.com · USN: 1NH23CS329</p>
                    <p>Printed on: ${currentDate} at ${currentTime}</p>
                    <p style="margin-top: 6px;">© ${new Date().getFullYear()} Hospital Management Information System - LeadOnyx Apex LLP</p>
                    <div class="nhei-stamp">Official internal clinical document &mdash; For exclusive use within New Horizon Education Institutions (NHEI). Unauthorized reproduction, distribution, or external circulation is prohibited.</div>
                </div>
                <div class="no-print" style="text-align:center; margin-top:12px;">
                    <button class="btn" onclick="window.print()">🖨️ Print</button>
                    <button class="btn" onclick="window.close()" style="background:#6c757d; margin-left:6px;">✕ Close</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        // setTimeout(() => printWindow.print(), 300); // Auto print might be annoying during dev
    };

    const filteredPatients = patients.filter(patient =>
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.usn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Patient List</h2>
                    <div className="flex gap-3 items-center">
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input w-64 px-3 py-2 border rounded-lg"
                        />
                        <button
                            onClick={() => navigate('/register-patient')}
                            className="btn btn-primary whitespace-nowrap"
                        >
                            + Register Patient
                        </button>
                    </div>
                </div>

                {filteredPatients.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">
                        {searchTerm ? 'No patients found matching your search.' : 'No patients added yet.'}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-600 text-sm">
                                    <th className="py-3 px-4 font-semibold">USN</th>
                                    <th className="py-3 px-4 font-semibold">Full Name</th>
                                    <th className="py-3 px-4 font-semibold">Age</th>
                                    <th className="py-3 px-4 font-semibold">Gender</th>
                                    <th className="py-3 px-4 font-semibold">Phone</th>
                                    <th className="py-3 px-4 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPatients.map((patient) => (
                                    <tr key={patient.usn} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">{patient.usn}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900">{patient.fullName}</td>
                                        <td className="py-3 px-4">{patient.age}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                patient.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 
                                                patient.gender === 'Female' ? 'bg-pink-100 text-pink-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {patient.gender}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500">{patient.contact || 'N/A'}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(patient)}
                                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                                    title="Edit patient"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => printPatient(patient)}
                                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                    title="Print patient details"
                                                >
                                                    🖨️ Print
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(patient.usn)}
                                                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                                    title="Delete patient"
                                                >
                                                    Delete
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
        </div>
    );
};

export default PatientList;
