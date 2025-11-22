import React, { useState, useEffect } from 'react';
import { caseReportsApi, sickIntimationsApi, patientApi } from '../services/api';
import { Patient, CaseReport, SickIntimation } from '../types/hmis';

const CaseReportsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'case-report' | 'sick-intimation' | 'manage-cases' | 'manage-sick'>('case-report');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [caseReports, setCaseReports] = useState<CaseReport[]>([]);
    const [sickIntimations, setSickIntimations] = useState<SickIntimation[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [loading, setLoading] = useState(true);

    // Case Report State
    const [caseFormData, setCaseFormData] = useState({
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
        followUp: ''
    });

    // Sick Intimation State
    const [sickFormData, setSickFormData] = useState({
        sickLeaveFrom: '',
        sickLeaveTo: '',
        reason: '',
        symptoms: '',
        restRecommended: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fetchedPatients, fetchedCaseReports, fetchedSickIntimations] = await Promise.all([
                    patientApi.getAll(),
                    caseReportsApi.getAll(),
                    sickIntimationsApi.getAll()
                ]);
                setPatients(fetchedPatients);
                setCaseReports(fetchedCaseReports);
                setSickIntimations(fetchedSickIntimations);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePatientSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPatientSearchTerm(e.target.value);
        setShowPatientDropdown(true);
    };

    const selectPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setPatientSearchTerm(`${patient.usn} - ${patient.fullName}`);
        setShowPatientDropdown(false);
    };

    const filteredPatients = patients.filter(p => 
        p.fullName.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        p.usn.toLowerCase().includes(patientSearchTerm.toLowerCase())
    );

    const filteredCaseReports = caseReports.filter(report => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            report.patientName.toLowerCase().includes(term) ||
            report.usn.toLowerCase().includes(term) ||
            report.diagnosis.toLowerCase().includes(term) ||
            report.reportNumber.toLowerCase().includes(term) ||
            report.chiefComplaint.toLowerCase().includes(term)
        );
    });

    const filteredSickIntimations = sickIntimations.filter(intimation => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            intimation.patientName.toLowerCase().includes(term) ||
            intimation.usn.toLowerCase().includes(term) ||
            intimation.intimationNumber.toLowerCase().includes(term) ||
            intimation.reason.toLowerCase().includes(term)
        );
    });

    const generateReportNumber = () => `CR-${Date.now().toString().slice(-6)}`;
    const generateIntimationNumber = () => `SI-${Date.now().toString().slice(-6)}`;

    const calculateDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    };

    const handleCaseReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) {
            alert('Please select a patient first');
            return;
        }

        const report: CaseReport = {
            reportNumber: generateReportNumber(),
            usn: selectedPatient.usn,
            patientName: selectedPatient.fullName,
            patientAge: selectedPatient.age,
            patientGender: selectedPatient.gender,
            reportType: 'medical',
            ...caseFormData,
            doctorName: 'Dr. NHCE Clinic',
            reportDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'Finalized'
        };

        try {
            const newReport = await caseReportsApi.create(report);
            setCaseReports([...caseReports, newReport]);
            alert('✅ Case Report generated successfully!');
            setCaseFormData({
                chiefComplaint: '', historyOfPresentIllness: '', pastMedicalHistory: '',
                familyHistory: '', socialHistory: '', physicalExamination: '',
                investigations: '', diagnosis: '', treatment: '', prognosis: '',
                recommendations: '', followUp: ''
            });
            setSelectedPatient(null);
            setPatientSearchTerm('');
        } catch (error) {
            console.error('Error creating case report:', error);
            alert('❌ Failed to create case report');
        }
    };

    const handleSickIntimationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) {
            alert('Please select a patient first');
            return;
        }

        const intimation: SickIntimation = {
            intimationNumber: generateIntimationNumber(),
            usn: selectedPatient.usn,
            patientName: selectedPatient.fullName,
            patientAge: selectedPatient.age,
            patientGender: selectedPatient.gender,
            caseReportId: '',
            ...sickFormData,
            totalDays: calculateDays(sickFormData.sickLeaveFrom, sickFormData.sickLeaveTo).toString(),
            doctorName: 'Dr. NHCE Clinic',
            issueDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'Issued'
        };

        try {
            const newIntimation = await sickIntimationsApi.create(intimation);
            setSickIntimations([...sickIntimations, newIntimation]);
            alert('✅ Sick Intimation generated successfully!');
            setSickFormData({
                sickLeaveFrom: '', sickLeaveTo: '', reason: '', symptoms: '', restRecommended: true
            });
            setSelectedPatient(null);
            setPatientSearchTerm('');
        } catch (error) {
            console.error('Error creating sick intimation:', error);
            alert('❌ Failed to create sick intimation');
        }
    };

    const printCaseReport = (report: CaseReport) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print case report');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Case Report - ${report.patientName}</title>
                <style>
                    @media print { @page { size: A4; margin: 0.5in; } .no-print{display:none} }
                    body{ font-family: Arial, sans-serif; max-width:800px; margin:0 auto; padding:20px; }
                    .header{ text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:20px; }
                    .section{ margin:15px 0; }
                    .label{ font-weight:bold; color:#333; }
                    .btn{ background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin:5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Medical Case Report</h1>
                    <p>New Horizon Sanjeevani Clinic</p>
                </div>
                <div class="section">
                    <p><span class="label">Report Number:</span> ${report.reportNumber}</p>
                    <p><span class="label">Patient Name:</span> ${report.patientName}</p>
                    <p><span class="label">USN:</span> ${report.usn}</p>
                    <p><span class="label">Age/Gender:</span> ${report.patientAge} years / ${report.patientGender}</p>
                    <p><span class="label">Report Date:</span> ${new Date(report.reportDate).toLocaleDateString()}</p>
                    <p><span class="label">Doctor:</span> ${report.doctorName}</p>
                </div>
                <div class="section">
                    <p><span class="label">Chief Complaint:</span></p>
                    <p>${report.chiefComplaint}</p>
                </div>
                ${report.historyOfPresentIllness ? `
                <div class="section">
                    <p><span class="label">History of Present Illness:</span></p>
                    <p>${report.historyOfPresentIllness}</p>
                </div>` : ''}
                ${report.physicalExamination ? `
                <div class="section">
                    <p><span class="label">Physical Examination:</span></p>
                    <p>${report.physicalExamination}</p>
                </div>` : ''}
                <div class="section">
                    <p><span class="label">Diagnosis:</span></p>
                    <p>${report.diagnosis}</p>
                </div>
                <div class="section">
                    <p><span class="label">Treatment Plan:</span></p>
                    <p>${report.treatment}</p>
                </div>
                ${report.recommendations ? `
                <div class="section">
                    <p><span class="label">Recommendations:</span></p>
                    <p>${report.recommendations}</p>
                </div>` : ''}
                <div class="no-print" style="text-align:center; margin-top:30px;">
                    <button class="btn" onclick="window.print()">🖨️ Print</button>
                    <button class="btn" onclick="window.close()" style="background:#6c757d;">✕ Close</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const printSickIntimation = (intimation: SickIntimation) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print sick intimation');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sick Leave Intimation - ${intimation.patientName}</title>
                <style>
                    @media print { @page { size: A4; margin: 0.5in; } .no-print{display:none} }
                    body{ font-family: Arial, sans-serif; max-width:800px; margin:0 auto; padding:20px; }
                    .header{ text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:20px; }
                    .section{ margin:15px 0; }
                    .label{ font-weight:bold; color:#333; }
                    .highlight{ background:#fef3c7; padding:10px; border-radius:5px; margin:10px 0; }
                    .btn{ background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin:5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Sick Leave Intimation</h1>
                    <p>New Horizon Sanjeevani Clinic</p>
                </div>
                <div class="section">
                    <p><span class="label">Intimation Number:</span> ${intimation.intimationNumber}</p>
                    <p><span class="label">Patient Name:</span> ${intimation.patientName}</p>
                    <p><span class="label">USN:</span> ${intimation.usn}</p>
                    <p><span class="label">Age/Gender:</span> ${intimation.patientAge} years / ${intimation.patientGender}</p>
                    <p><span class="label">Issue Date:</span> ${new Date(intimation.issueDate).toLocaleDateString()}</p>
                    <p><span class="label">Doctor:</span> ${intimation.doctorName}</p>
                </div>
                <div class="highlight">
                    <p><span class="label">Leave Period:</span> ${new Date(intimation.sickLeaveFrom).toLocaleDateString()} to ${new Date(intimation.sickLeaveTo).toLocaleDateString()}</p>
                    <p><span class="label">Total Days:</span> ${intimation.totalDays} days</p>
                </div>
                <div class="section">
                    <p><span class="label">Reason for Leave:</span></p>
                    <p>${intimation.reason}</p>
                </div>
                ${intimation.symptoms ? `
                <div class="section">
                    <p><span class="label">Symptoms:</span></p>
                    <p>${intimation.symptoms}</p>
                </div>` : ''}
                <div class="section">
                    <p><span class="label">Bed Rest Recommended:</span> ${intimation.restRecommended ? 'Yes' : 'No'}</p>
                </div>
                <div class="no-print" style="text-align:center; margin-top:30px;">
                    <button class="btn" onclick="window.print()">🖨️ Print</button>
                    <button class="btn" onclick="window.close()" style="background:#6c757d;">✕ Close</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Clinical Documentation</h2>
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                    <button
                        className={`py-2 px-4 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'case-report' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('case-report')}
                    >
                        Create Case Report
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'manage-cases' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('manage-cases')}
                    >
                        Manage Case Reports ({caseReports.length})
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'sick-intimation' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('sick-intimation')}
                    >
                        Create Sick Intimation
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'manage-sick' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('manage-sick')}
                    >
                        Manage Sick Intimations ({sickIntimations.length})
                    </button>
                </div>

                {/* Create Case Report Tab */}
                {activeTab === 'case-report' && (
                    <>
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">Select Patient *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={patientSearchTerm}
                                    onChange={handlePatientSearch}
                                    onFocus={() => setShowPatientDropdown(true)}
                                    placeholder="Search patient..."
                                    className="form-input w-full"
                                />
                                {showPatientDropdown && filteredPatients.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-auto">
                                        {filteredPatients.slice(0, 10).map(p => (
                                            <div
                                                key={p.usn}
                                                onClick={() => selectPatient(p)}
                                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                            >
                                                <div className="font-medium">{p.fullName}</div>
                                                <div className="text-xs text-gray-600">{p.usn}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleCaseReportSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Chief Complaint *</label>
                                    <textarea
                                        required
                                        value={caseFormData.chiefComplaint}
                                        onChange={e => setCaseFormData({...caseFormData, chiefComplaint: e.target.value})}
                                        className="form-input w-full"
                                        rows={2}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">History of Present Illness</label>
                                    <textarea
                                        value={caseFormData.historyOfPresentIllness}
                                        onChange={e => setCaseFormData({...caseFormData, historyOfPresentIllness: e.target.value})}
                                        className="form-input w-full"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Past Medical History</label>
                                    <textarea
                                        value={caseFormData.pastMedicalHistory}
                                        onChange={e => setCaseFormData({...caseFormData, pastMedicalHistory: e.target.value})}
                                        className="form-input w-full"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Family History</label>
                                    <textarea
                                        value={caseFormData.familyHistory}
                                        onChange={e => setCaseFormData({...caseFormData, familyHistory: e.target.value})}
                                        className="form-input w-full"
                                        rows={2}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Physical Examination Findings</label>
                                    <textarea
                                        value={caseFormData.physicalExamination}
                                        onChange={e => setCaseFormData({...caseFormData, physicalExamination: e.target.value})}
                                        className="form-input w-full"
                                        rows={2}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Diagnosis *</label>
                                    <input
                                        type="text"
                                        required
                                        value={caseFormData.diagnosis}
                                        onChange={e => setCaseFormData({...caseFormData, diagnosis: e.target.value})}
                                        className="form-input w-full"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Treatment Plan *</label>
                                    <textarea
                                        required
                                        value={caseFormData.treatment}
                                        onChange={e => setCaseFormData({...caseFormData, treatment: e.target.value})}
                                        className="form-input w-full"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary mt-4">Generate Case Report</button>
                        </form>
                    </>
                )}

                {/* Manage Case Reports Tab */}
                {activeTab === 'manage-cases' && (
                    <div>
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search by patient, USN, diagnosis, or report number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input w-full"
                            />
                        </div>
                        {filteredCaseReports.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No case reports found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Report #</th>
                                            <th>Date</th>
                                            <th>Patient</th>
                                            <th>USN</th>
                                            <th>Chief Complaint</th>
                                            <th>Diagnosis</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCaseReports.map((report) => (
                                            <tr key={report.id}>
                                                <td>{report.reportNumber}</td>
                                                <td>{new Date(report.reportDate).toLocaleDateString()}</td>
                                                <td>{report.patientName}</td>
                                                <td>{report.usn}</td>
                                                <td className="max-w-xs truncate">{report.chiefComplaint}</td>
                                                <td>{report.diagnosis}</td>
                                                <td>
                                                    <button
                                                        onClick={() => printCaseReport(report)}
                                                        className="btn btn-primary text-xs"
                                                    >
                                                        🖨️ Print
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Create Sick Intimation Tab */}
                {activeTab === 'sick-intimation' && (
                    <>
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">Select Patient *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={patientSearchTerm}
                                    onChange={handlePatientSearch}
                                    onFocus={() => setShowPatientDropdown(true)}
                                    placeholder="Search patient..."
                                    className="form-input w-full"
                                />
                                {showPatientDropdown && filteredPatients.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-auto">
                                        {filteredPatients.slice(0, 10).map(p => (
                                            <div
                                                key={p.usn}
                                                onClick={() => selectPatient(p)}
                                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                            >
                                                <div className="font-medium">{p.fullName}</div>
                                                <div className="text-xs text-gray-600">{p.usn}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSickIntimationSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Leave From *</label>
                                    <input
                                        type="date"
                                        required
                                        value={sickFormData.sickLeaveFrom}
                                        onChange={e => setSickFormData({...sickFormData, sickLeaveFrom: e.target.value})}
                                        className="form-input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Leave To *</label>
                                    <input
                                        type="date"
                                        required
                                        value={sickFormData.sickLeaveTo}
                                        onChange={e => setSickFormData({...sickFormData, sickLeaveTo: e.target.value})}
                                        className="form-input w-full"
                                    />
                                </div>
                                {sickFormData.sickLeaveFrom && sickFormData.sickLeaveTo && (
                                    <div className="md:col-span-2 bg-blue-50 p-3 rounded">
                                        <p className="text-sm font-medium text-blue-900">
                                            Total Leave Days: {calculateDays(sickFormData.sickLeaveFrom, sickFormData.sickLeaveTo)}
                                        </p>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Reason for Leave *</label>
                                    <textarea
                                        required
                                        value={sickFormData.reason}
                                        onChange={e => setSickFormData({...sickFormData, reason: e.target.value})}
                                        className="form-input w-full"
                                        rows={2}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Symptoms (Optional)</label>
                                    <textarea
                                        value={sickFormData.symptoms}
                                        onChange={e => setSickFormData({...sickFormData, symptoms: e.target.value})}
                                        className="form-input w-full"
                                        rows={2}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={sickFormData.restRecommended}
                                            onChange={e => setSickFormData({...sickFormData, restRecommended: e.target.checked})}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium">Strict Bed Rest Recommended</span>
                                    </label>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary mt-4">Generate Sick Intimation</button>
                        </form>
                    </>
                )}

                {/* Manage Sick Intimations Tab */}
                {activeTab === 'manage-sick' && (
                    <div>
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search by patient, USN, intimation number, or reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input w-full"
                            />
                        </div>
                        {filteredSickIntimations.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No sick intimations found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Intimation #</th>
                                            <th>Issue Date</th>
                                            <th>Patient</th>
                                            <th>USN</th>
                                            <th>Leave Period</th>
                                            <th>Days</th>
                                            <th>Reason</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSickIntimations.map((intimation) => (
                                            <tr key={intimation.id}>
                                                <td>{intimation.intimationNumber}</td>
                                                <td>{new Date(intimation.issueDate).toLocaleDateString()}</td>
                                                <td>{intimation.patientName}</td>
                                                <td>{intimation.usn}</td>
                                                <td className="text-xs">
                                                    {new Date(intimation.sickLeaveFrom).toLocaleDateString()} - {new Date(intimation.sickLeaveTo).toLocaleDateString()}
                                                </td>
                                                <td>{intimation.totalDays}</td>
                                                <td className="max-w-xs truncate">{intimation.reason}</td>
                                                <td>
                                                    <button
                                                        onClick={() => printSickIntimation(intimation)}
                                                        className="btn btn-primary text-xs"
                                                    >
                                                        🖨️ Print
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaseReportsPage;
