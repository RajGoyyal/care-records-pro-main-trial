// PatientList Component - Display and manage patient list with search and print functionality  
// Usage: <PatientList patients={patients} onEdit={onEdit} onDelete={onDelete} />

window.HMISComponents = window.HMISComponents || {};

window.HMISComponents.PatientList = ({ patients, onEdit, onDelete }) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    const safePatients = patients || [];

    const printPatient = (patient) => {
        if (!patient) return;
        const printWindow = window.open('', '_blank');
        const currentDate = new Date().toLocaleDateString('en-IN');
        const currentTime = new Date().toLocaleTimeString('en-IN');
        const safe = {
            usn: patient.usn || 'N/A',
            fullName: patient.fullName || 'N/A',
            age: patient.age ?? 'N/A',
            gender: patient.gender || 'N/A',
            phone: patient.phone || 'N/A',
            email: patient.email || 'N/A',
            address: patient.address || 'N/A',
        };
        const logoUrl = new URL('./nhce_25-scaled-1-2048x683.png', window.location.href).href;
        
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
        setTimeout(() => printWindow.print(), 300);
    };

    const filteredPatients = safePatients.filter(patient =>
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.usn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-xl font-semibold' }, 'Patient List'),
            React.createElement('input', {
                type: 'text',
                placeholder: 'Search patients...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: 'form-input w-64'
            })
        ),

        filteredPatients.length === 0 ? React.createElement('p', { className: 'text-gray-500 text-center py-8' },
            searchTerm ? 'No patients found matching your search.' : 'No patients added yet.'
        ) : React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'table' },
                React.createElement('thead', null,
                    React.createElement('tr', null,
                        React.createElement('th', null, 'USN'),
                        React.createElement('th', null, 'Full Name'),
                        React.createElement('th', null, 'Age'),
                        React.createElement('th', null, 'Gender'),
                        React.createElement('th', null, 'Phone'),
                        React.createElement('th', null, 'Actions')
                    )
                ),
                React.createElement('tbody', null,
                    filteredPatients.map((patient) =>
                        React.createElement('tr', { key: patient.usn },
                            React.createElement('td', null, patient.usn),
                            React.createElement('td', null, patient.fullName),
                            React.createElement('td', null, patient.age),
                            React.createElement('td', null,
                                React.createElement('span', {
                                    className: `badge ${
                                        patient.gender === 'Male' ? 'badge-blue' : 
                                        patient.gender === 'Female' ? 'badge-red' : 'badge-green'
                                    }`
                                }, patient.gender)
                            ),
                            React.createElement('td', null, patient.phone || 'N/A'),
                            React.createElement('td', null,
                                React.createElement('div', { className: 'flex gap-2' },
                                    React.createElement('button', {
                                        onClick: () => onEdit(patient),
                                        className: 'btn btn-primary text-sm',
                                        title: 'Edit patient'
                                    }, 'Edit'),
                                    React.createElement('button', {
                                        onClick: () => printPatient(patient),
                                        className: 'btn btn-success text-sm',
                                        title: 'Print patient details'
                                    }, '🖨️ Print'),
                                    React.createElement('button', {
                                        onClick: () => onDelete(patient.usn),
                                        className: 'btn btn-secondary text-sm',
                                        title: 'Delete patient'
                                    }, 'Delete')
                                )
                            )
                        )
                    )
                )
            )
        )
    );
};

// Export to window object for global access
window.PatientList = window.HMISComponents.PatientList;

console.log('PatientList component loaded successfully');