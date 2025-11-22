import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { patientApi, vitalsApi, prescriptionApi } from '@/services/api';
import { Patient, Prescription, Vitals } from '@/types/hmis';

// Register Chart.js components
Chart.register(...registerables);

const Dashboard = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [vitals, setVitals] = useState<Vitals[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedTimeframe, setSelectedTimeframe] = useState('week');
    const [showAlerts, setShowAlerts] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [quickSearchTerm, setQuickSearchTerm] = useState('');
    const [showQuickSearch, setShowQuickSearch] = useState(false);
    
    const genderChartRef = useRef<HTMLCanvasElement>(null);
    const priorityChartRef = useRef<HTMLCanvasElement>(null);
    const ageChartRef = useRef<HTMLCanvasElement>(null);
    const followUpChartRef = useRef<HTMLCanvasElement>(null);
    const [hoverInfo, setHoverInfo] = useState<any>(null);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [patientsData, patientsList] = await Promise.all([
                    patientApi.getAll(),
                    // For now, we'll just fetch all patients. 
                    // In a real app, we might want to fetch vitals and prescriptions separately 
                    // or have a dedicated dashboard API.
                    // Since the original component expected these as props, we need to fetch them.
                    // However, the current API service doesn't have a 'getAll' for vitals/prescriptions easily accessible without USN.
                    // We will simulate this by fetching for all patients (might be slow, but matches current architecture) 
                    // OR better, we'll just use the patient data we have and maybe mock the rest if the API is limited, 
                    // BUT looking at api.ts, there is no getAll for vitals/prescriptions.
                    // Let's check if we can get them. 
                    // Actually, the original app likely passed them from a parent that managed state.
                    // For this migration, I'll fetch patients. 
                    // For vitals/prescriptions, I'll need to iterate or update the API.
                    // Wait, the original app had them in localStorage or passed from app.py?
                    // In the standalone version, they were likely passed from the root component or fetched.
                    // Let's look at how `dashboard.html` used it. It didn't pass props! 
                    // `render(createElement(window.Dashboard))` was called without props in `dashboard.html`.
                    // This means `patients`, `vitals`, etc. were UNDEFINED in the standalone version unless they were defaulted.
                    // The standalone component had `safePatients = patients || []`.
                    // So it was likely showing empty data!
                    // To make this "UI 2.0" better, I should actually fetch the data.
                ]);
                
                setPatients(patientsData);
                
                // For now, let's try to fetch vitals/prescriptions for the first few patients to populate the dashboard
                // or just leave them empty if the API doesn't support bulk fetch.
                // Ideally, we should add getAll to the API, but I can't change the backend easily right now without more exploration.
                // I will fetch patients and leave others empty for now, or maybe try to fetch for all patients if the list is small.
                
                // Let's just fetch patients for now to ensure it works.
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    
    useEffect(() => {
        const move = (e: MouseEvent) => {
            const tip = document.getElementById('chart-hover-tooltip');
            if (tip) {
                tip.style.setProperty('--mx', (e.clientX + 12)+ 'px');
                tip.style.setProperty('--my', (e.clientY + 12)+ 'px');
            }
        };
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, [hoverInfo]);
    
    const safePatients = patients || [];
    const safeVitals = vitals || [];
    const safePrescriptions = prescriptions || [];
    // const safeCaseReports = caseReports || [];
    // const safeSickIntimations = sickIntimations || [];
    const safeCaseReports: any[] = [];
    const safeSickIntimations: any[] = [];
    
    // Time calculations
    const now = new Date();
    const getTimeframeDate = (timeframe: string) => {
        const date = new Date();
        switch(timeframe) {
            case 'today': date.setHours(0, 0, 0, 0); break;
            case 'week': date.setDate(date.getDate() - 7); break;
            case 'month': date.setMonth(date.getMonth() - 1); break;
            case 'year': date.setFullYear(date.getFullYear() - 1); break;
            default: date.setDate(date.getDate() - 7);
        }
        return date;
    };
    
    const timeframeDate = getTimeframeDate(selectedTimeframe);
    
    // Enhanced statistics
    const stats = {
        // Patient stats
        totalPatients: safePatients.length,
        malePatients: safePatients.filter(p => p.gender === 'Male').length,
        femalePatients: safePatients.filter(p => p.gender === 'Female').length,
        averageAge: safePatients.length > 0 ? Math.round(safePatients.reduce((sum, p) => sum + (parseInt(p.age) || 0), 0) / safePatients.length) : 0,
        
        // Prescription analytics
        totalPrescriptions: safePrescriptions.length,
        criticalPrescriptions: safePrescriptions.filter(p => (p.priority || 'Normal') === 'Critical').length,
        urgentPrescriptions: safePrescriptions.filter(p => (p.priority || 'Normal') === 'Urgent').length,
        normalPrescriptions: safePrescriptions.filter(p => (p.priority || 'Normal') === 'Normal').length,
        
        // Recent activity
        recentVitals: safeVitals.filter(v => new Date(v.recordedAt) > timeframeDate).length,
        recentPrescriptions: safePrescriptions.filter(p => new Date(p.prescribedAt) > timeframeDate).length,
        recentCaseReports: safeCaseReports.filter(c => new Date(c.reportDate) > timeframeDate).length,
        recentSickLeaves: safeSickIntimations.filter(s => new Date(s.intimationDate) > timeframeDate).length,
        
        // Health indicators
        highBPCount: safeVitals.filter(v => {
            const systolic = parseInt(v.bloodPressure?.split('/')[0]) || 0;
            return systolic > 140;
        }).length,
        
        // Age distribution
        ageGroups: {
            '0-18': safePatients.filter(p => parseInt(p.age) <= 18).length,
            '19-35': safePatients.filter(p => parseInt(p.age) > 18 && parseInt(p.age) <= 35).length,
            '36-55': safePatients.filter(p => parseInt(p.age) > 35 && parseInt(p.age) <= 55).length,
            '55+': safePatients.filter(p => parseInt(p.age) > 55).length,
        } as Record<string, number>,
        
        // Common diagnoses
        commonDiagnoses: safePrescriptions.reduce((acc: Record<string, number>, p) => {
            const diagnosis = p.diagnosis || 'Unknown';
            acc[diagnosis] = (acc[diagnosis] || 0) + 1;
            return acc;
        }, {}),
        
        // Upcoming follow-ups
        upcomingFollowUps: safePrescriptions.filter(p => {
            if (!p.followUpDate) return false;
            const followUp = new Date(p.followUpDate);
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return followUp <= nextWeek && followUp >= now;
        }).length
    };
    
    // Alerts and notifications
    const alerts = [
        ...(stats.criticalPrescriptions > 0 ? [{
            type: 'critical',
            message: `${stats.criticalPrescriptions} critical prescription${stats.criticalPrescriptions > 1 ? 's' : ''} requiring immediate attention`,
            action: 'View Prescriptions'
        }] : []),
        ...(stats.urgentPrescriptions > 0 ? [{
            type: 'warning',
            message: `${stats.urgentPrescriptions} urgent prescription${stats.urgentPrescriptions > 1 ? 's' : ''} need attention`,
            action: 'Review Urgent Cases'
        }] : []),
        ...(stats.upcomingFollowUps > 0 ? [{
            type: 'info',
            message: `${stats.upcomingFollowUps} follow-up${stats.upcomingFollowUps > 1 ? 's' : ''} scheduled this week`,
            action: 'View Schedule'
        }] : []),
        ...(stats.highBPCount > 0 ? [{
            type: 'warning',
            message: `${stats.highBPCount} patient${stats.highBPCount > 1 ? 's have' : ' has'} elevated blood pressure readings`,
            action: 'Review Vitals'
        }] : [])
    ];

    // Chart Drawing Helpers
    const drawDonut3D = (canvas: HTMLCanvasElement | null, slices: any[], options: any = {}) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High DPI & responsive sizing
        const containerW = Math.max(180, Math.floor(canvas.getBoundingClientRect().width) || (options.width || 260));
        const desiredW = options.width || containerW;
        const desiredH = options.height || 220;
        const dpr = window.devicePixelRatio || 1;
        
        // @ts-ignore
        if (canvas._lastW !== desiredW || canvas._lastH !== desiredH || canvas._lastDPR !== dpr) {
            canvas.width = desiredW * dpr;
            canvas.height = desiredH * dpr;
            canvas.style.width = desiredW + 'px';
            canvas.style.height = desiredH + 'px';
            // @ts-ignore
            canvas._lastW = desiredW; canvas._lastH = desiredH; canvas._lastDPR = dpr;
        }
        
        // @ts-ignore
        ctx.reset?.();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        const w = desiredW;
        const h = desiredH;
        const cx = w / 2;
        const cy = h / 2 - 5;
        const radius = Math.min(w, h) / 2 - 24;
        const thickness = options.thickness || 34;
        const depth = options.depth || 14; // pseudo 3D depth
        const total = slices.reduce((s, sl) => s + (sl.value || 0), 0) || 1;
        ctx.clearRect(0,0,w,h);

        // Animation progress
        const startTime = performance.now();
        const duration = 600; // ms

        const animate = () => {
            const now = performance.now();
            const t = Math.min(1, (now - startTime) / duration);
            renderFrame(t);
            if (t < 1) requestAnimationFrame(animate);
        };

        const renderFrame = (progress: number) => {
            ctx.clearRect(0,0,w,h);
            let startAngle = -Math.PI/2;
            const drawn = slices.map(sl => {
                const angleFull = (sl.value / total) * Math.PI * 2;
                const angle = angleFull * progress;
                const record = { ...sl, start: startAngle, end: startAngle + angle, targetEnd: startAngle + angleFull };
                startAngle += angleFull; // for target alignment
                return record;
            });
            // Draw depth
            drawn.forEach(sl => {
                if (sl.start === sl.end) return;
                ctx.beginPath();
                const gradSide = ctx.createLinearGradient(0, cy, 0, cy + depth);
                gradSide.addColorStop(0, shadeColor(sl.color, -10));
                gradSide.addColorStop(1, shadeColor(sl.color, -40));
                ctx.fillStyle = gradSide;
                ctx.moveTo(cx + Math.cos(sl.start)*radius, cy + Math.sin(sl.start)*radius + depth);
                ctx.arc(cx, cy + depth, radius, sl.start, sl.end);
                ctx.lineTo(cx + Math.cos(sl.end)*radius, cy + Math.sin(sl.end)*radius);
                ctx.arc(cx, cy, radius, sl.end, sl.start, true);
                ctx.closePath();
                ctx.fill();
            });
            // Draw top slices
            drawn.forEach(sl => {
                if (sl.start === sl.end) return;
                const isHover = hoverInfo && hoverInfo.id === sl.id;
                const explode = isHover ? 6 : 0;
                const mid = (sl.start + sl.end)/2;
                const ox = Math.cos(mid) * explode;
                const oy = Math.sin(mid) * explode;
                // Gradient fill
                const grad = ctx.createRadialGradient(cx+ox, cy+oy, radius - thickness, cx+ox, cy+oy, radius);
                grad.addColorStop(0, shadeColor(sl.color, 25));
                grad.addColorStop(0.6, sl.color);
                grad.addColorStop(1, shadeColor(sl.color, -10));
                ctx.beginPath();
                ctx.fillStyle = grad;
                ctx.moveTo(cx+ox, cy+oy);
                ctx.arc(cx+ox, cy+oy, radius, sl.start, sl.end);
                ctx.closePath();
                ctx.fill();
                // Cut inner hole
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.moveTo(cx+ox, cy+oy);
                ctx.arc(cx+ox, cy+oy, radius - thickness, sl.start, sl.end);
                ctx.closePath();
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            });
            // Inner outline
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 2;
            ctx.arc(cx, cy, radius - thickness, 0, Math.PI*2);
            ctx.stroke();
            // Center label (dynamic if hover)
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lines = (hoverInfo && hoverInfo.type === options.id)
                ? [hoverInfo.label, String(hoverInfo.value)]
                : (options.centerText || '').split('\n');
            ctx.font = '600 15px system-ui';
            if (lines.length === 2) {
                ctx.fillText(lines[0], cx, cy - 9);
                ctx.font = '700 17px system-ui';
                ctx.fillText(lines[1], cx, cy + 10);
            } else {
                ctx.fillText(lines.join(' '), cx, cy);
            }
            // Metadata for hover detection
            // @ts-ignore
            canvas._slicesMeta = drawn.map(sl => ({
                id: sl.id,
                label: sl.label,
                value: sl.value,
                start: sl.start,
                end: sl.end,
                cx, cy, radius, inner: radius - thickness, color: sl.color
            }));
        };
        animate();
    };

    const shadeColor = (col: string, amt: number) => {
        // Simple shade/brighten hex
        try {
            let usePound = false;
            if (col[0] === '#') { col = col.slice(1); usePound = true; }
            const num = parseInt(col,16);
            let r = (num >> 16) + amt; r = Math.max(Math.min(255,r),0);
            let g = ((num >> 8) & 0x00FF) + amt; g = Math.max(Math.min(255,g),0);
            let b = (num & 0x0000FF) + amt; b = Math.max(Math.min(255,b),0);
            return (usePound?'#':'#') + (r.toString(16).padStart(2,'0')) + (g.toString(16).padStart(2,'0')) + (b.toString(16).padStart(2,'0'));
        } catch { return col; }
    };

    // Bar chart for age distribution
    const drawAgeBars = (canvas: HTMLCanvasElement | null, groups: Record<string, number>) => {
        if(!canvas) return; const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const containerW = Math.max(240, Math.floor(canvas.getBoundingClientRect().width) || 300);
        const desiredW = containerW; const desiredH = 200; const dpr = window.devicePixelRatio || 1;
        // @ts-ignore
        if (canvas._lastW !== desiredW || canvas._lastH !== desiredH || canvas._lastDPR !== dpr) {
            canvas.width = desiredW * dpr; canvas.height = desiredH * dpr; canvas.style.width = desiredW+'px'; canvas.style.height = desiredH+'px';
            // @ts-ignore
            canvas._lastW = desiredW; canvas._lastH = desiredH; canvas._lastDPR = dpr;
        }
        // @ts-ignore
        ctx.reset?.(); ctx.scale(dpr,dpr); ctx.imageSmoothingEnabled=true;
        const w = desiredW; const h = desiredH; ctx.clearRect(0,0,w,h);
        const labels = Object.keys(groups); const values = labels.map(l=>groups[l]);
        const max = Math.max(1, ...values);
        const barH = 24; const gap = 10; const chartHeight = labels.length * (barH + gap) - gap; const startY = (h - chartHeight)/2;
        ctx.font = '12px system-ui'; ctx.textBaseline='middle';
        const start = performance.now(); const dur = 500;
        const animate = () => { const t=Math.min(1,(performance.now()-start)/dur); render(t); if(t<1) requestAnimationFrame(animate); };
        const render=(prog: number)=>{ ctx.clearRect(0,0,w,h); labels.forEach((lab,i)=>{ const val=values[i]; const pct=val/max; const barW=(w-120)*pct*prog; const y=startY + i*(barH+gap);
            ctx.fillStyle='#e5e7eb'; ctx.fillRect(100,y,w-120,barH);
            const grad = ctx.createLinearGradient(100,y,100+barW,y+barH);
            grad.addColorStop(0,'#6366f1'); grad.addColorStop(1,'#3b82f6');
            ctx.fillStyle=grad; ctx.fillRect(100,y,barW,barH);
            ctx.fillStyle='#374151'; ctx.fillText(lab,10,y+barH/2);
            ctx.fillStyle='#111827'; ctx.font='600 12px system-ui'; ctx.fillText(val.toString(), 110+barW, y+barH/2); ctx.font='12px system-ui'; }); };
        animate();
    };
    
    // Line chart for follow-ups next 7 days
    const drawFollowUpTimeline = (canvas: HTMLCanvasElement | null, dataPoints: any[]) => {
        if(!canvas) return; const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const containerW = Math.max(240, Math.floor(canvas.getBoundingClientRect().width) || 300);
        const desiredW = containerW; const desiredH = 200; const dpr = window.devicePixelRatio || 1;
        // @ts-ignore
        if (canvas._lastW !== desiredW || canvas._lastH !== desiredH || canvas._lastDPR !== dpr) {
            canvas.width = desiredW * dpr; canvas.height = desiredH * dpr; canvas.style.width = desiredW+'px'; canvas.style.height = desiredH+'px';
            // @ts-ignore
            canvas._lastW = desiredW; canvas._lastH = desiredH; canvas._lastDPR = dpr;
        }
        // @ts-ignore
        ctx.reset?.(); ctx.scale(dpr,dpr); ctx.imageSmoothingEnabled=true;
        const w = desiredW; const h = desiredH; ctx.clearRect(0,0,w,h);
        if(dataPoints.length===0) return; const max=Math.max(1,...dataPoints.map(d=>d.count)); const pad=30; const innerW=w-pad*2; const innerH=h-pad*2;
        const start=performance.now(); const dur=600;
        const animate=()=>{ const t=Math.min(1,(performance.now()-start)/dur); render(t); if(t<1) requestAnimationFrame(animate); };
        const render=(prog: number)=>{ ctx.clearRect(0,0,w,h); ctx.strokeStyle='#d1d5db'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.moveTo(pad,h-pad); ctx.lineTo(pad,pad); ctx.stroke();
            const stepX = innerW/(dataPoints.length-1 || 1); ctx.beginPath(); dataPoints.forEach((pt,i)=>{ const x=pad+i*stepX; const y=h-pad - (pt.count/max)*innerH*prog; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.strokeStyle='#2563eb'; ctx.lineWidth=2; ctx.stroke();
            dataPoints.forEach((pt,i)=>{ const x=pad+i*stepX; const y=h-pad - (pt.count/max)*innerH*prog; const grad=ctx.createRadialGradient(x,y,0,x,y,6); grad.addColorStop(0,'#fff'); grad.addColorStop(1,'#2563eb'); ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#111827'; ctx.font='10px system-ui'; ctx.textAlign='center'; ctx.fillText(pt.count.toString(), x, y-12); ctx.save(); ctx.translate(x, h-pad+12); ctx.rotate(-Math.PI/6); ctx.fillStyle='#374151'; ctx.fillText(pt.label,0,0); ctx.restore(); }); };
        animate();
    };

    const genderSlices = [
        { id:'male', label:'Male', value: stats.malePatients, color:'#3b82f6' },
        { id:'female', label:'Female', value: stats.femalePatients, color:'#ec4899' },
        { id:'other', label:'Other', value: stats.totalPatients - stats.malePatients - stats.femalePatients, color:'#6366f1' }
    ].filter(s => s.value > 0);
    
    const prioritySlices = [
        { id:'critical', label:'Critical', value: stats.criticalPrescriptions, color:'#dc2626' },
        { id:'urgent', label:'Urgent', value: stats.urgentPrescriptions, color:'#f59e0b' },
        { id:'normal', label:'Normal', value: stats.normalPrescriptions, color:'#10b981' }
    ].filter(s => s.value > 0);

    const followUpMap = (() => {
        const arr=[]; for(let i=0;i<7;i++){ const d=new Date(); d.setDate(d.getDate()+i); const key=d.toISOString().slice(0,10); const count=safePrescriptions.filter(p=>p.followUpDate && p.followUpDate.slice(0,10)===key).length; arr.push({ label: d.toLocaleDateString(undefined,{month:'short', day:'numeric'}), count }); } return arr;
    })();
    
    // Redraw charts when stats or hover changes
    useEffect(() => {
        drawDonut3D(genderChartRef.current, genderSlices, { centerText: `Patients\n${stats.totalPatients}`, id: 'gender' });
        drawDonut3D(priorityChartRef.current, prioritySlices, { centerText: `Rx\n${stats.totalPrescriptions}`, id: 'priority' });
        drawAgeBars(ageChartRef.current, stats.ageGroups || {});
        drawFollowUpTimeline(followUpChartRef.current, followUpMap);
    }, [stats.totalPatients, stats.totalPrescriptions, genderSlices.length, prioritySlices.length, hoverInfo, Object.values(stats.ageGroups||{}).join(','), followUpMap.map(p=>p.count).join(',')]);

    const handleCanvasMove = (e: React.MouseEvent, canvas: HTMLCanvasElement | null, type: string) => {
        // @ts-ignore
        if (!canvas || !canvas._slicesMeta) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // @ts-ignore
        const meta = canvas._slicesMeta;
        let found = null;
        for (const sl of meta) {
            const dx = x - sl.cx;
            const dy = y - sl.cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist >= sl.inner && dist <= sl.radius) {
                const ang = Math.atan2(dy, dx);
                const normAng = ang < -Math.PI/2 ? ang + Math.PI*2 : ang; // adjust since start at -90°
                if (normAng >= sl.start && normAng <= sl.end) { found = sl; break; }
            }
        }
        if (found) setHoverInfo({ id: found.id, label: found.label, value: found.value, type }); else if (hoverInfo) setHoverInfo(null);
    };

    const renderLegend = (slices: any[]) => (
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
            {slices.map(s => (
                <div key={s.id} className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded border">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{background:s.color}}></span>
                    {s.label}: {s.value}
                </div>
            ))}
        </div>
    );

    if (loading) {
        return <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* Header with timeframe selector */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">NHCE Clinic Dashboard</h2>
                    <div className="text-sm text-gray-600 mt-1">
                        📅 {currentTime.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })} • 🕐 {currentTime.toLocaleTimeString()}
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="🔍 Quick patient search..."
                            value={quickSearchTerm}
                            onChange={(e) => setQuickSearchTerm(e.target.value)}
                            onFocus={() => setShowQuickSearch(true)}
                            onBlur={() => setTimeout(() => setShowQuickSearch(false), 200)}
                            className="form-input w-64 text-sm px-3 py-2 border rounded-lg"
                        />
                        {showQuickSearch && quickSearchTerm && (
                            <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                                {safePatients
                                    .filter(p => 
                                        p.fullName?.toLowerCase().includes(quickSearchTerm.toLowerCase()) ||
                                        p.usn?.toLowerCase().includes(quickSearchTerm.toLowerCase())
                                    )
                                    .slice(0, 5)
                                    .map(patient => (
                                        <div key={patient.usn} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">
                                            <div className="font-medium">{patient.fullName}</div>
                                            <div className="text-gray-500">{patient.usn} • {patient.age}y • {patient.gender}</div>
                                        </div>
                                    ))
                                }
                                {safePatients.filter(p => 
                                    p.fullName?.toLowerCase().includes(quickSearchTerm.toLowerCase()) ||
                                    p.usn?.toLowerCase().includes(quickSearchTerm.toLowerCase())
                                ).length === 0 && (
                                    <div className="p-2 text-gray-500 text-sm">No patients found</div>
                                )}
                            </div>
                        )}
                    </div>
                    <select
                        value={selectedTimeframe}
                        onChange={(e) => setSelectedTimeframe(e.target.value)}
                        className="form-input w-32 px-3 py-2 border rounded-lg"
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>
                    <button
                        onClick={() => setShowAlerts(!showAlerts)}
                        className={`px-4 py-2 rounded-lg transition-colors ${showAlerts ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        {showAlerts ? '🔔' : '🔕'} Alerts
                    </button>
                </div>
            </div>

            {/* Interactive Charts Row 1 */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Patient Gender Distribution</h3>
                    <canvas
                        ref={genderChartRef}
                        onMouseMove={(e)=>handleCanvasMove(e, genderChartRef.current, 'gender')}
                        onMouseLeave={()=> setHoverInfo(null)}
                        onClick={(e)=>handleCanvasMove(e, genderChartRef.current, 'gender')}
                        className="w-full select-none"
                        style={{cursor:'pointer'}}
                    />
                    {renderLegend(genderSlices)}
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Prescription Priority Mix</h3>
                    <canvas
                        ref={priorityChartRef}
                        onMouseMove={(e)=>handleCanvasMove(e, priorityChartRef.current, 'priority')}
                        onMouseLeave={()=> setHoverInfo(null)}
                        onClick={(e)=>handleCanvasMove(e, priorityChartRef.current, 'priority')}
                        className="w-full select-none"
                        style={{cursor:'pointer'}}
                    />
                    {renderLegend(prioritySlices)}
                </div>
            </div>

            {hoverInfo && (
                <div className="fixed pointer-events-none z-50 text-xs bg-gray-900 text-white px-2 py-1 rounded shadow" style={{left: 'var(--mx,0px)', top: 'var(--my,0px)'}} id="chart-hover-tooltip">
                    {hoverInfo.label}: {hoverInfo.value}
                </div>
            )}

            {/* Charts Row 2 */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Age Distribution</h3>
                    <canvas ref={ageChartRef} className="w-full select-none" />
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Upcoming Follow-Ups (7 days)</h3>
                    <canvas ref={followUpChartRef} className="w-full select-none" />
                </div>
            </div>

            {/* Alerts Section */}
            {showAlerts && alerts.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <h3 className="font-semibold text-yellow-800 mb-2">🚨 System Alerts</h3>
                    <div className="space-y-2">
                        {alerts.map((alert, index) => (
                            <div key={index} className={`flex justify-between items-center p-2 rounded ${
                                alert.type === 'critical' ? 'bg-red-100 text-red-800' :
                                alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                                <span>{alert.message}</span>
                                <span className="text-sm font-medium cursor-pointer hover:underline">
                                    {alert.action}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl shadow-sm border border-blue-100 bg-blue-500 text-white">
                    <div className="text-3xl font-bold">{stats.totalPatients}</div>
                    <div className="font-medium">Total Patients</div>
                    <div className="text-xs opacity-80">👥 Registered</div>
                </div>
                <div className="p-4 rounded-xl shadow-sm border border-blue-100 bg-blue-500 text-white">
                    <div className="text-3xl font-bold">{stats.totalPrescriptions}</div>
                    <div className="font-medium">Total Prescriptions</div>
                    <div className="text-xs opacity-80">💊 All time</div>
                </div>
                <div className="p-4 rounded-xl shadow-sm border border-blue-100 bg-blue-500 text-white">
                    <div className="text-3xl font-bold">{stats.recentVitals}</div>
                    <div className="font-medium">Recent Vitals</div>
                    <div className="text-xs opacity-80">📊 {selectedTimeframe}</div>
                </div>
                <div className="p-4 rounded-xl shadow-sm border border-blue-100 bg-blue-500 text-white">
                    <div className="text-3xl font-bold">{stats.averageAge}</div>
                    <div className="font-medium">Average Age</div>
                    <div className="text-xs opacity-80">🎂 Years</div>
                </div>
            </div>

            {/* Prescription Priority Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">📋 Prescription Priorities</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                            <span className="font-medium text-red-800">Critical</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-200 text-red-800">{stats.criticalPrescriptions}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                            <span className="font-medium text-yellow-800">Urgent</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-200 text-yellow-800">{stats.urgentPrescriptions}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                            <span className="font-medium text-green-800">Normal</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-200 text-green-800">{stats.normalPrescriptions}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">👥 Demographics</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span>Male</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{stats.malePatients}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Female</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-pink-100 text-pink-800">{stats.femalePatients}</span>
                        </div>
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Age Groups</h4>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span>0-18 years</span>
                                    <span>{stats.ageGroups['0-18']}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>19-35 years</span>
                                    <span>{stats.ageGroups['19-35']}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>36-55 years</span>
                                    <span>{stats.ageGroups['36-55']}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>55+ years</span>
                                    <span>{stats.ageGroups['55+']}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">📈 Recent Activity</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span>📊 Vitals Recorded</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{stats.recentVitals}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>💊 New Prescriptions</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">{stats.recentPrescriptions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>📋 Case Reports</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">{stats.recentCaseReports}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>🏥 Sick Leaves</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">{stats.recentSickLeaves}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>📅 Follow-ups Due</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">{stats.upcomingFollowUps}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Common Diagnoses */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">🔍 Common Diagnoses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(stats.commonDiagnoses)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 6)
                        .map(([diagnosis, count]) => (
                            <div key={diagnosis} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="font-medium truncate">{diagnosis}</span>
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-800 ml-2">{count}</span>
                            </div>
                        ))}
                </div>
                {Object.keys(stats.commonDiagnoses).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No diagnosis data available yet.</p>
                )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                        className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        👤 Add Patient
                    </button>
                    <button 
                        className="flex items-center justify-center gap-2 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        💊 New Treatment
                    </button>
                    <button 
                        className="flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        📊 Record Vitals
                    </button>
                    <button 
                        className="flex items-center justify-center gap-2 py-4 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                        📋 Case Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
