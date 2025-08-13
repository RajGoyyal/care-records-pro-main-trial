from __future__ import annotations
import csv
import io
import os
import sys
import sqlite3
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, redirect, render_template, request, Response, url_for, jsonify, send_from_directory

# Allow overriding data directory (useful for frozen/EXE builds)
APP_DIR = os.environ.get("HMIS_DATA_DIR") or os.path.dirname(os.path.abspath(__file__))
# Project root (one level up from this file's folder)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public")
# Ensure directory exists when using an external path
os.makedirs(APP_DIR, exist_ok=True)
DB_PATH = os.path.join(APP_DIR, "hmis.db")

app = Flask(__name__)

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Handle preflight requests
@app.route('/<path:path>', methods=['OPTIONS'])
@app.route('/', methods=['OPTIONS'])
def handle_options(path=None):
    response = Response()
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# --- Frontend (serve SPA) ---

@app.route("/")
def serve_spa_root():
    """Serve the standalone SPA (hmis-standalone.html) from project root."""
    spa_path = os.path.join(PROJECT_ROOT, "hmis-standalone.html")
    if os.path.exists(spa_path):
        return send_from_directory(PROJECT_ROOT, "hmis-standalone.html")
    # Fallback to simple template if standalone file missing
    return render_template("index.html")


@app.route("/hmis-standalone.html")
def serve_spa_explicit():
    return send_from_directory(PROJECT_ROOT, "hmis-standalone.html")


@app.route("/public/<path:filename>")
def serve_public(filename: str):
    if os.path.exists(os.path.join(PUBLIC_DIR, filename)):
        return send_from_directory(PUBLIC_DIR, filename)
    return ("Not Found", 404)


@app.route("/favicon.ico")
def serve_favicon():
    # Try public first, then project root
    fav_public = os.path.join(PUBLIC_DIR, "favicon.ico")
    if os.path.exists(fav_public):
        return send_from_directory(PUBLIC_DIR, "favicon.ico")
    fav_root = os.path.join(PROJECT_ROOT, "favicon.ico")
    if os.path.exists(fav_root):
        return send_from_directory(PROJECT_ROOT, "favicon.ico")
    return ("", 204)


# A few known root-level assets referenced by the SPA
@app.route("/nhce_25-scaled-1-2048x683.png")
def serve_root_banner():
    return send_from_directory(PROJECT_ROOT, "nhce_25-scaled-1-2048x683.png")

@app.route("/nhce_logo.png")
def serve_root_logo():
    return send_from_directory(PROJECT_ROOT, "nhce_logo.png")

# --- Database helpers ---

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = get_db()
    cur = conn.cursor()
    # Create tables if not existing (idempotent)
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS patients (
            usn TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            contact TEXT NOT NULL,
            address TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            weight REAL NOT NULL,
            height REAL NOT NULL,
            bmi REAL GENERATED ALWAYS AS (weight / ((height/100.0) * (height/100.0))) STORED,
            blood_pressure_systolic INTEGER NOT NULL,
            blood_pressure_diastolic INTEGER NOT NULL,
            heart_rate INTEGER NOT NULL,
            temperature REAL NOT NULL,
            respiratory_rate INTEGER NULL,
            oxygen_saturation INTEGER NULL,
            notes TEXT NULL,
            recorded_at TEXT NOT NULL,
            recorded_by TEXT NOT NULL DEFAULT 'System User',
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            diagnosis TEXT NOT NULL,
            medications TEXT NOT NULL, -- JSON string of medications array
            notes TEXT NULL,
            follow_up_date TEXT NULL,
            prescribed_at TEXT NOT NULL,
            prescribed_by TEXT DEFAULT 'NHCE Clinic',
            status TEXT DEFAULT 'Active',
            patient_name TEXT NULL,
            patient_age INTEGER NULL,
            patient_gender TEXT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: encounters (visits)
        CREATE TABLE IF NOT EXISTS encounters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            encounter_dt TEXT NOT NULL,
            encounter_type TEXT NOT NULL DEFAULT 'OPD',
            clinician TEXT NULL,
            reason TEXT NULL,
            notes TEXT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: problems (conditions)
        CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            code TEXT NULL,
            description TEXT NOT NULL,
            onset_date TEXT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            recorded_at TEXT NOT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: allergies
        CREATE TABLE IF NOT EXISTS allergies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            substance TEXT NOT NULL,
            reaction TEXT NULL,
            severity TEXT NULL,
            recorded_at TEXT NOT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: medications master
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            generic_name TEXT NULL,
            form TEXT NULL,
            strength TEXT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            UNIQUE(name, strength, form)
        );

        -- New: itemized prescription lines
        CREATE TABLE IF NOT EXISTS prescription_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prescription_id INTEGER NOT NULL,
            medication_id INTEGER NOT NULL,
            dose TEXT NULL,
            route TEXT NULL,
            frequency TEXT NULL,
            duration_days INTEGER NULL,
            instructions TEXT NULL,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (medication_id) REFERENCES medications(id)
        );

        -- New: lab tests and orders
        CREATE TABLE IF NOT EXISTS lab_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            specimen TEXT NULL,
            unit TEXT NULL,
            ref_range TEXT NULL,
            is_active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS lab_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            encounter_id INTEGER NULL,
            ordered_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Ordered',
            notes TEXT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE,
            FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS lab_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lab_order_id INTEGER NOT NULL,
            lab_test_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Ordered',
            result_value TEXT NULL,
            result_notes TEXT NULL,
            result_at TEXT NULL,
            FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
        );

        -- New: appointments (calendar)
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            starts_at TEXT NOT NULL,
            ends_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Scheduled',
            title TEXT NULL,
            clinician TEXT NULL,
            notes TEXT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: inventory (basic)
        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medication_id INTEGER NULL,
            sku TEXT UNIQUE,
            name TEXT NOT NULL,
            unit TEXT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (medication_id) REFERENCES medications(id)
        );

        CREATE TABLE IF NOT EXISTS inventory_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            quantity_on_hand INTEGER NOT NULL DEFAULT 0,
            reorder_level INTEGER NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(item_id),
            FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            movement_dt TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            reason TEXT NULL,
            ref_type TEXT NULL,
            ref_id INTEGER NULL,
            FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
        );

        -- New: audit logs
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            occurred_at TEXT NOT NULL,
            entity TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NULL
        );

        -- New: case reports
        CREATE TABLE IF NOT EXISTS case_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_number TEXT NOT NULL UNIQUE,
            usn TEXT NOT NULL,
            patient_name TEXT NULL,
            patient_age INTEGER NULL,
            patient_gender TEXT NULL,
            report_type TEXT NOT NULL DEFAULT 'medical',
            chief_complaint TEXT NULL,
            history_of_present_illness TEXT NULL,
            past_medical_history TEXT NULL,
            family_history TEXT NULL,
            social_history TEXT NULL,
            physical_examination TEXT NULL,
            investigations TEXT NULL,
            diagnosis TEXT NULL,
            treatment TEXT NULL,
            prognosis TEXT NULL,
            recommendations TEXT NULL,
            follow_up TEXT NULL,
            doctor_name TEXT NULL,
            report_date TEXT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: sick intimations
        CREATE TABLE IF NOT EXISTS sick_intimations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intimation_number TEXT NOT NULL UNIQUE,
            usn TEXT NOT NULL,
            patient_name TEXT NULL,
            patient_age INTEGER NULL,
            patient_gender TEXT NULL,
            case_report_id TEXT NULL, -- report_number
            sick_leave_from TEXT NOT NULL,
            sick_leave_to TEXT NOT NULL,
            total_days INTEGER NULL,
            reason TEXT NOT NULL,
            symptoms TEXT NULL,
            rest_recommended INTEGER NOT NULL DEFAULT 1,
            doctor_name TEXT NULL,
            issue_date TEXT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );
        """
    )

    # Seed some lab tests if empty
    if cur.execute("SELECT COUNT(1) FROM lab_tests").fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO lab_tests(code, name, specimen, unit, ref_range) VALUES(?,?,?,?,?)",
            [
                ("CBC", "Complete Blood Count", "Blood", None, None),
                ("GLU", "Blood Glucose (Fasting)", "Blood", "mg/dL", "70-100"),
                ("LFT", "Liver Function Test", "Blood", None, None),
            ],
        )

    conn.commit()
    conn.close()


@app.before_request
def ensure_db() -> None:
    # Auto-create DB and tables
    if not os.path.exists(DB_PATH):
        init_db()
    else:
        # Ensure new tables exist on older DBs
        init_db()


# --- Routes ---

@app.get("/")
def index() -> str:
    q = (request.args.get("q") or "").strip()
    conn = get_db()

    patients: List[sqlite3.Row] = conn.execute(
        "SELECT * FROM patients ORDER BY full_name COLLATE NOCASE"
    ).fetchall()

    match_patient: Optional[sqlite3.Row] = None
    patient_vitals: List[sqlite3.Row] = []
    patient_rx: List[sqlite3.Row] = []

    if q:
        match_patient = conn.execute(
            "SELECT * FROM patients WHERE usn = ? OR contact = ?",
            (q, q),
        ).fetchone()
        if match_patient:
            patient_vitals = conn.execute(
                "SELECT * FROM vitals WHERE usn = ? ORDER BY recorded_at DESC",
                (match_patient["usn"],),
            ).fetchall()
            patient_rx = conn.execute(
                "SELECT * FROM prescriptions WHERE usn = ? ORDER BY prescribed_at DESC",
                (match_patient["usn"],),
            ).fetchall()

    return render_template(
        "index.html",
        patients=patients,
        q=q,
        match_patient=match_patient,
        patient_vitals=patient_vitals,
        patient_rx=patient_rx,
        message=request.args.get("m"),
        error=request.args.get("e"),
    )


# Patient create/update/delete
@app.post("/patient/create")
def patient_create() -> Response:
    data = {k: (request.form.get(k) or "").strip() for k in [
        "usn", "full_name", "age", "gender", "contact", "address"
    ]}
    if not all(data.values()):
        return redirect(url_for("index", e="All patient fields are required"))

    try:
        age = int(data["age"]) if data["age"] else 0
    except ValueError:
        return redirect(url_for("index", e="Age must be a number"))

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
            (data["usn"], data["full_name"], age, data["gender"], data["contact"], data["address"]),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return redirect(url_for("index", e="USN must be unique"))
    finally:
        conn.close()

    return redirect(url_for("index", m="Patient created"))


@app.post("/patient/update")
def patient_update() -> Response:
    usn = (request.form.get("usn") or "").strip()
    full_name = (request.form.get("full_name") or "").strip()
    contact = (request.form.get("contact") or "").strip()
    address = (request.form.get("address") or "").strip()
    gender = (request.form.get("gender") or "").strip()
    age_raw = (request.form.get("age") or "").strip()

    if not (usn and full_name and contact and address and gender and age_raw):
        return redirect(url_for("index", e="All fields required for update"))

    try:
        age = int(age_raw)
    except ValueError:
        return redirect(url_for("index", e="Age must be a number"))

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE patients SET full_name=?, age=?, gender=?, contact=?, address=? WHERE usn=?",
        (full_name, age, gender, contact, address, usn),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Patient updated", q=usn))


@app.post("/patient/delete/<usn>")
def patient_delete(usn: str) -> Response:
    conn = get_db()
    conn.execute("DELETE FROM patients WHERE usn=?", (usn,))
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Patient deleted"))


# Vitals
@app.post("/vitals/create")
def vitals_create() -> Response:
    usn = (request.form.get("usn") or "").strip()
    weight = (request.form.get("weight") or "0").strip()
    height = (request.form.get("height") or "0").strip()
    bp_systolic = (request.form.get("blood_pressure_systolic") or "0").strip()
    bp_diastolic = (request.form.get("blood_pressure_diastolic") or "0").strip()
    heart_rate = (request.form.get("heart_rate") or "0").strip()
    temperature = (request.form.get("temperature") or "0").strip()
    respiratory_rate = (request.form.get("respiratory_rate") or "").strip()
    oxygen_saturation = (request.form.get("oxygen_saturation") or "").strip()
    notes = (request.form.get("notes") or "").strip()

    if not (usn and weight and height and bp_systolic and bp_diastolic and heart_rate and temperature):
        return redirect(url_for("index", e="Required vitals fields missing", q=usn))

    try:
        weight_f = float(weight)
        height_f = float(height)
        bp_sys_i = int(bp_systolic)
        bp_dia_i = int(bp_diastolic)
        hr_i = int(heart_rate)
        temp_f = float(temperature)
        resp_rate_i = int(respiratory_rate) if respiratory_rate else None
        o2_sat_i = int(oxygen_saturation) if oxygen_saturation else None
    except ValueError:
        return redirect(url_for("index", e="Vitals must be numeric", q=usn))

    conn = get_db()
    # Ensure patient exists
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return redirect(url_for("index", e="Patient not found", q=usn))

    conn.execute(
        """INSERT INTO vitals(usn, weight, height, blood_pressure_systolic, blood_pressure_diastolic, 
           heart_rate, temperature, respiratory_rate, oxygen_saturation, notes, recorded_at) 
           VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        (usn, weight_f, height_f, bp_sys_i, bp_dia_i, hr_i, temp_f, resp_rate_i, o2_sat_i, notes, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Vitals saved", q=usn))


# API endpoints for frontend integration
@app.route("/api/patients", methods=["GET", "POST"])
def api_patients():
    if request.method == "GET":
        conn = get_db()
        patients = conn.execute("SELECT * FROM patients ORDER BY full_name").fetchall()
        conn.close()
        
        # Convert to frontend format
        result = []
        for row in patients:
            result.append({
                "id": hash(row["usn"]) % (10**8),  # Generate consistent ID
                "usn": row["usn"],
                "fullName": row["full_name"],
                "age": row["age"],
                "gender": row["gender"],
                "contact": row["contact"],
                "phone": row["contact"],  # Alias for compatibility
                "address": row["address"]
            })
        return jsonify(result)
    
    elif request.method == "POST":
        data = request.get_json()
        usn = data.get("usn", "").strip()
        full_name = data.get("fullName", "").strip()
        age = data.get("age")
        gender = data.get("gender", "").strip()
        contact = data.get("contact", data.get("phone", "")).strip()
        address = data.get("address", "").strip()

        if not all([usn, full_name, age, gender]):
            return jsonify({"error": "Required fields missing"}), 400

        try:
            age = int(age)
        except (ValueError, TypeError):
            return jsonify({"error": "Age must be a number"}), 400

        conn = get_db()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
                (usn, full_name, age, gender, contact or "", address or ""),
            )
            conn.commit()
            
            # Return the created patient in frontend format
            result = {
                "id": hash(usn) % (10**8),
                "usn": usn,
                "fullName": full_name,
                "age": age,
                "gender": gender,
                "contact": contact,
                "phone": contact,
                "address": address
            }
            return jsonify(result), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "USN already exists"}), 409
        finally:
            conn.close()


@app.route("/api/patients/<usn>", methods=["DELETE"])
def api_patient_delete(usn: str):
    """Delete a patient and cascade related records."""
    if not usn:
        return jsonify({"error": "USN required"}), 400
    conn = get_db()
    cur = conn.cursor()
    # Ensure patient exists
    exists = cur.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not exists:
        conn.close()
        return jsonify({"ok": True, "deleted": False})
    cur.execute("DELETE FROM patients WHERE usn=?", (usn,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "deleted": True})

@app.route("/api/vitals", methods=["GET", "POST"])
def api_vitals():
    if request.method == "GET":
        usn = request.args.get("usn")
        conn = get_db()
        if usn:
            vitals = conn.execute(
                "SELECT * FROM vitals WHERE usn=? ORDER BY recorded_at DESC", 
                (usn,)
            ).fetchall()
        else:
            vitals = conn.execute("SELECT * FROM vitals ORDER BY recorded_at DESC").fetchall()
        conn.close()
        
        # Convert to frontend format
        result = []
        for row in vitals:
            result.append({
                "id": row["id"],
                "usn": row["usn"],
                "weight": row["weight"],
                "height": row["height"],
                "bmi": row["bmi"],
                "bloodPressureSystolic": row["blood_pressure_systolic"],
                "bloodPressureDiastolic": row["blood_pressure_diastolic"],
                "heartRate": row["heart_rate"],
                "temperature": row["temperature"],
                "respiratoryRate": row["respiratory_rate"],
                "oxygenSaturation": row["oxygen_saturation"],
                "notes": row["notes"],
                "recordedAt": row["recorded_at"],
                "recordedBy": row["recorded_by"]
            })
        return jsonify(result)
    
    elif request.method == "POST":
        data = request.get_json()
        usn = data.get("usn", "").strip()
        
        required_fields = ["weight", "height", "bloodPressureSystolic", "bloodPressureDiastolic", "heartRate", "temperature"]
        if not usn or not all(data.get(field) for field in required_fields):
            return jsonify({"error": "Required vitals fields missing"}), 400

        try:
            weight = float(data["weight"])
            height = float(data["height"])
            bp_sys = int(data["bloodPressureSystolic"])
            bp_dia = int(data["bloodPressureDiastolic"])
            heart_rate = int(data["heartRate"])
            temperature = float(data["temperature"])
            resp_rate = int(data["respiratoryRate"]) if data.get("respiratoryRate") else None
            o2_sat = int(data["oxygenSaturation"]) if data.get("oxygenSaturation") else None
            notes = data.get("notes", "").strip()
            recorded_at = data.get("recordedAt", datetime.utcnow().isoformat())
            recorded_by = data.get("recordedBy", "System User")
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid numeric values"}), 400

        conn = get_db()
        # Check if patient exists
        patient = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
        if not patient:
            conn.close()
            return jsonify({"error": "Patient not found"}), 404

        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT OR REPLACE INTO vitals(id, usn, weight, height, blood_pressure_systolic, blood_pressure_diastolic, 
                   heart_rate, temperature, respiratory_rate, oxygen_saturation, notes, recorded_at, recorded_by) 
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (data.get("id"), usn, weight, height, bp_sys, bp_dia, heart_rate, temperature, resp_rate, o2_sat, notes, recorded_at, recorded_by),
            )
            conn.commit()
            
            # Get the inserted record with calculated BMI
            record_id = data.get("id") or cur.lastrowid
            vital_record = conn.execute("SELECT * FROM vitals WHERE id=?", (record_id,)).fetchone()
            
            result = {
                "id": vital_record["id"],
                "usn": vital_record["usn"],
                "weight": vital_record["weight"],
                "height": vital_record["height"],
                "bmi": vital_record["bmi"],
                "bloodPressureSystolic": vital_record["blood_pressure_systolic"],
                "bloodPressureDiastolic": vital_record["blood_pressure_diastolic"],
                "heartRate": vital_record["heart_rate"],
                "temperature": vital_record["temperature"],
                "respiratoryRate": vital_record["respiratory_rate"],
                "oxygenSaturation": vital_record["oxygen_saturation"],
                "notes": vital_record["notes"],
                "recordedAt": vital_record["recorded_at"],
                "recordedBy": vital_record["recorded_by"]
            }
            return jsonify(result), 201
        finally:
            conn.close()


@app.route("/api/export/patients")
def api_export_patients():
    conn = get_db()
    patients = conn.execute("SELECT * FROM patients ORDER BY full_name").fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write comprehensive header matching frontend structure
    writer.writerow([
        "USN", "Full Name", "Age", "Gender", "Phone", "Address", 
        "Emergency Contact", "Emergency Phone", "Email", "Date Registered"
    ])
    
    # Write data
    for patient in patients:
        writer.writerow([
            patient["usn"], 
            patient["full_name"], 
            patient["age"], 
            patient["gender"], 
            patient["contact"] if "contact" in patient.keys() else "",
            patient["address"] if "address" in patient.keys() else "",
            "",  # Emergency contact not in current schema
            "",  # Emergency phone not in current schema  
            "",  # Email not in current schema
            ""   # Date registered not in current schema
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=patients.csv"
    return response


@app.route("/api/export/vitals")
def api_export_vitals():
    conn = get_db()
    vitals = conn.execute("""
        SELECT v.*, p.full_name 
        FROM vitals v 
        LEFT JOIN patients p ON v.usn = p.usn 
        ORDER BY v.recorded_at DESC
    """).fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write comprehensive header matching frontend structure
    writer.writerow([
        "USN", "Patient Name", "Weight (kg)", "Height (cm)", "BMI", 
        "Blood Pressure Systolic", "Blood Pressure Diastolic", "Blood Pressure Category",
        "Heart Rate (bpm)", "Temperature (°F)", "Respiratory Rate", "Oxygen Saturation (%)",
        "Notes", "Recorded At", "Recorded By"
    ])
    
    # Write data with proper null handling
    for vital in vitals:
        # Calculate blood pressure category
        systolic = vital["blood_pressure_systolic"] if "blood_pressure_systolic" in vital.keys() else 0
        diastolic = vital["blood_pressure_diastolic"] if "blood_pressure_diastolic" in vital.keys() else 0
        
        if systolic >= 140 or diastolic >= 90:
            bp_category = "High"
        elif systolic >= 120 or diastolic >= 80:
            bp_category = "Elevated"
        elif systolic >= 90 and diastolic >= 60:
            bp_category = "Normal"
        else:
            bp_category = "Low"
        
        writer.writerow([
            vital["usn"] if "usn" in vital.keys() else "",
            vital["full_name"] if "full_name" in vital.keys() else "",
            vital["weight"] if "weight" in vital.keys() else "",
            vital["height"] if "height" in vital.keys() else "",
            round(vital["bmi"], 1) if "bmi" in vital.keys() and vital["bmi"] else "",
            systolic,
            diastolic,
            bp_category,
            vital["heart_rate"] if "heart_rate" in vital.keys() else "",
            vital["temperature"] if "temperature" in vital.keys() else "",
            vital["respiratory_rate"] if "respiratory_rate" in vital.keys() else "",
            vital["oxygen_saturation"] if "oxygen_saturation" in vital.keys() else "",
            vital["notes"] if "notes" in vital.keys() else "",
            vital["recorded_at"] if "recorded_at" in vital.keys() else "",
            vital["recorded_by"] if "recorded_by" in vital.keys() else "System User"
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=vitals.csv"
    return response


@app.route("/api/export/complete")
def api_export_complete():
    conn = get_db()
    
    # Get comprehensive patient data with proper field mapping
    patients_data = conn.execute("""
        SELECT 
            p.*,
            v.weight as latest_weight,
            v.height as latest_height,
            v.bmi as latest_bmi,
            v.blood_pressure_systolic || '/' || v.blood_pressure_diastolic as latest_bp,
            v.heart_rate as latest_hr,
            v.temperature as latest_temp,
            v.oxygen_saturation as latest_spo2,
            v.respiratory_rate as latest_rr,
            (SELECT COUNT(*) FROM vitals WHERE usn = p.usn) as total_vitals,
            (SELECT COUNT(*) FROM prescriptions WHERE usn = p.usn) as total_prescriptions,
            (SELECT diagnosis FROM prescriptions WHERE usn = p.usn ORDER BY prescribed_at DESC LIMIT 1) as latest_diagnosis,
            (SELECT notes FROM prescriptions WHERE usn = p.usn ORDER BY prescribed_at DESC LIMIT 1) as latest_prescription_notes
        FROM patients p
        LEFT JOIN vitals v ON p.usn = v.usn AND v.id = (
            SELECT id FROM vitals WHERE usn = p.usn ORDER BY recorded_at DESC LIMIT 1
        )
        ORDER BY p.full_name
    """).fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write comprehensive header matching frontend data structure
    writer.writerow([
        "USN", "Full Name", "Age", "Gender", "Phone", "Address", "Email",
        "Emergency Contact Name", "Emergency Contact Phone", "Blood Group", "Allergies",
        "Latest Weight (kg)", "Latest Height (cm)", "Latest BMI", "Latest Blood Pressure",
        "Latest Heart Rate (bpm)", "Latest Temperature (°F)", "Latest SpO2 (%)", "Latest Respiratory Rate",
        "Total Vitals Records", "Total Prescriptions", "Latest Diagnosis", "Latest Prescription Notes",
        "Registration Date", "Last Updated"
    ])
    
    # Write data with proper field mapping and null handling
    for row in patients_data:
        writer.writerow([
            row["usn"] if "usn" in row.keys() else "",
            row["full_name"] if "full_name" in row.keys() else "",
            row["age"] if "age" in row.keys() else "",
            row["gender"] if "gender" in row.keys() else "",
            row["contact"] if "contact" in row.keys() else "",  # Map contact to phone
            row["address"] if "address" in row.keys() else "",
            row["email"] if "email" in row.keys() else "",
            row["emergency_contact_name"] if "emergency_contact_name" in row.keys() else "",
            row["emergency_contact_phone"] if "emergency_contact_phone" in row.keys() else "",
            row["blood_group"] if "blood_group" in row.keys() else "",
            row["allergies"] if "allergies" in row.keys() else "",
            row["latest_weight"] if "latest_weight" in row.keys() else "",
            row["latest_height"] if "latest_height" in row.keys() else "",
            round(row["latest_bmi"], 1) if "latest_bmi" in row.keys() and row["latest_bmi"] else "",
            row["latest_bp"] if "latest_bp" in row.keys() and row["latest_bp"] != "/" else "",
            row["latest_hr"] if "latest_hr" in row.keys() else "",
            row["latest_temp"] if "latest_temp" in row.keys() else "",
            row["latest_spo2"] if "latest_spo2" in row.keys() else "",
            row["latest_rr"] if "latest_rr" in row.keys() else "",
            row["total_vitals"] if "total_vitals" in row.keys() else 0,
            row["total_prescriptions"] if "total_prescriptions" in row.keys() else 0,
            row["latest_diagnosis"] if "latest_diagnosis" in row.keys() else "",
            row["latest_prescription_notes"] if "latest_prescription_notes" in row.keys() else "",
            row["created_at"] if "created_at" in row.keys() else "",
            row["updated_at"] if "updated_at" in row.keys() else ""
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=complete_patient_data.csv"
    return response


@app.route("/api/prescriptions", methods=["GET", "POST"])
def api_prescriptions():
    if request.method == "GET":
        usn = request.args.get("usn")
        conn = get_db()
        if usn:
            prescriptions = conn.execute(
                "SELECT * FROM prescriptions WHERE usn=? ORDER BY prescribed_at DESC", 
                (usn,)
            ).fetchall()
        else:
            prescriptions = conn.execute("SELECT * FROM prescriptions ORDER BY prescribed_at DESC").fetchall()
        conn.close()
        
        # Convert to frontend format
        result = []
        for row in prescriptions:
            try:
                import json
                medications = json.loads(row["medications"]) if row["medications"] else []
            except:
                medications = []
                
            result.append({
                "id": row["id"],
                "usn": row["usn"],
                "diagnosis": row["diagnosis"] if "diagnosis" in row.keys() else "",
                "medications": medications,
                "notes": row["notes"] if "notes" in row.keys() else "",
                "followUpDate": row["follow_up_date"] if "follow_up_date" in row.keys() else "",
                "prescribedAt": row["prescribed_at"],
                "prescribedBy": row["prescribed_by"] if "prescribed_by" in row.keys() else "NHCE Clinic",
                "status": row["status"] if "status" in row.keys() else "Active",
                "patientName": row["patient_name"] if "patient_name" in row.keys() else "",
                "patientAge": row["patient_age"] if "patient_age" in row.keys() else None,
                "patientGender": row["patient_gender"] if "patient_gender" in row.keys() else ""
            })
        return jsonify(result)
    
    elif request.method == "POST":
        data = request.get_json()
        usn = data.get("usn", "").strip()
        diagnosis = data.get("diagnosis", "").strip()
        medications = data.get("medications", [])
        notes = data.get("notes", "").strip()
        follow_up_date = data.get("followUpDate", "").strip()
        patient_name = data.get("patientName", "").strip()
        patient_age = data.get("patientAge")
        patient_gender = data.get("patientGender", "").strip()
        prescribed_by = data.get("prescribedBy", "NHCE Clinic")
        status = data.get("status", "Active")

        if not usn or not diagnosis:
            return jsonify({"error": "USN and diagnosis are required"}), 400

        conn = get_db()
        # Check if patient exists and get patient details if not provided
        patient = conn.execute("SELECT * FROM patients WHERE usn=?", (usn,)).fetchone()
        if not patient:
            conn.close()
            return jsonify({"error": "Patient not found"}), 404
        
        # Use patient data from database if not provided in request
        if not patient_name:
            patient_name = patient["full_name"]
        if not patient_age:
            patient_age = patient["age"]
        if not patient_gender:
            patient_gender = patient["gender"]

        try:
            import json
            medications_json = json.dumps(medications) if medications else "[]"
            
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO prescriptions(usn, diagnosis, medications, notes, follow_up_date, 
                   prescribed_at, prescribed_by, status, patient_name, patient_age, patient_gender) 
                   VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (usn, diagnosis, medications_json, notes, follow_up_date, 
                 datetime.utcnow().isoformat(), prescribed_by, status, 
                 patient_name, patient_age, patient_gender),
            )
            
            prescription_id = cur.lastrowid
            conn.commit()
            
            # Return the created prescription in frontend format
            result = {
                "id": prescription_id,
                "usn": usn,
                "diagnosis": diagnosis,
                "medications": medications,
                "notes": notes,
                "followUpDate": follow_up_date,
                "prescribedAt": datetime.utcnow().isoformat(),
                "prescribedBy": prescribed_by,
                "status": status,
                "patientName": patient_name,
                "patientAge": patient_age,
                "patientGender": patient_gender
            }
            
            return jsonify(result), 201
        finally:
            conn.close()


@app.route("/api/case-reports", methods=["GET", "POST"])
def api_case_reports():
    if request.method == "GET":
        usn = request.args.get("usn")
        conn = get_db()
        if usn:
            rows = conn.execute(
                "SELECT * FROM case_reports WHERE usn=? ORDER BY created_at DESC",
                (usn,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM case_reports ORDER BY created_at DESC").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])

    # POST create or upsert by unique report_number
    data = request.get_json(silent=True) or {}
    report_number = (data.get("reportNumber") or data.get("report_number") or "").strip()
    usn = (data.get("usn") or "").strip()
    if not (report_number and usn):
        return jsonify({"error": "reportNumber and usn are required"}), 400

    conn = get_db()
    # ensure patient exists (create minimal if needed)
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        # Create minimal placeholder patient if frontend didn't sync yet
        conn.execute(
            "INSERT OR IGNORE INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
            (usn, data.get("patientName", "Unknown"), data.get("patientAge") or 0, data.get("patientGender", "Unknown"), "", ""),
        )

    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO case_reports(
            report_number, usn, patient_name, patient_age, patient_gender, report_type,
            chief_complaint, history_of_present_illness, past_medical_history, family_history,
            social_history, physical_examination, investigations, diagnosis, treatment, prognosis,
            recommendations, follow_up, doctor_name, report_date, status, created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(report_number) DO UPDATE SET
            usn=excluded.usn,
            patient_name=excluded.patient_name,
            patient_age=excluded.patient_age,
            patient_gender=excluded.patient_gender,
            report_type=excluded.report_type,
            chief_complaint=excluded.chief_complaint,
            history_of_present_illness=excluded.history_of_present_illness,
            past_medical_history=excluded.past_medical_history,
            family_history=excluded.family_history,
            social_history=excluded.social_history,
            physical_examination=excluded.physical_examination,
            investigations=excluded.investigations,
            diagnosis=excluded.diagnosis,
            treatment=excluded.treatment,
            prognosis=excluded.prognosis,
            recommendations=excluded.recommendations,
            follow_up=excluded.follow_up,
            doctor_name=excluded.doctor_name,
            report_date=excluded.report_date,
            status=excluded.status
        """,
        (
            report_number,
            usn,
            data.get("patientName"),
            data.get("patientAge"),
            data.get("patientGender"),
            (data.get("reportType") or "medical"),
            data.get("chiefComplaint"),
            data.get("historyOfPresentIllness"),
            data.get("pastMedicalHistory"),
            data.get("familyHistory"),
            data.get("socialHistory"),
            data.get("physicalExamination"),
            data.get("investigations"),
            data.get("diagnosis"),
            data.get("treatment"),
            data.get("prognosis"),
            data.get("recommendations"),
            data.get("followUp"),
            data.get("doctorName"),
            data.get("reportDate"),
            data.get("status", "Active"),
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "reportNumber": report_number}), 201


@app.route("/api/sick-intimations", methods=["GET", "POST"])
def api_sick_intimations():
    if request.method == "GET":
        usn = request.args.get("usn")
        conn = get_db()
        if usn:
            rows = conn.execute(
                "SELECT * FROM sick_intimations WHERE usn=? ORDER BY created_at DESC",
                (usn,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM sick_intimations ORDER BY created_at DESC").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])

    data = request.get_json(silent=True) or {}
    intimation_number = (data.get("intimationNumber") or data.get("intimation_number") or "").strip()
    usn = (data.get("usn") or "").strip()
    if not (intimation_number and usn):
        return jsonify({"error": "intimationNumber and usn are required"}), 400

    conn = get_db()
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.execute(
            "INSERT OR IGNORE INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
            (usn, data.get("patientName", "Unknown"), data.get("patientAge") or 0, data.get("patientGender", "Unknown"), "", ""),
        )

    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO sick_intimations(
            intimation_number, usn, patient_name, patient_age, patient_gender, case_report_id,
            sick_leave_from, sick_leave_to, total_days, reason, symptoms, rest_recommended,
            doctor_name, issue_date, status, created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(intimation_number) DO UPDATE SET
            usn=excluded.usn,
            patient_name=excluded.patient_name,
            patient_age=excluded.patient_age,
            patient_gender=excluded.patient_gender,
            case_report_id=excluded.case_report_id,
            sick_leave_from=excluded.sick_leave_from,
            sick_leave_to=excluded.sick_leave_to,
            total_days=excluded.total_days,
            reason=excluded.reason,
            symptoms=excluded.symptoms,
            rest_recommended=excluded.rest_recommended,
            doctor_name=excluded.doctor_name,
            issue_date=excluded.issue_date,
            status=excluded.status
        """,
        (
            intimation_number,
            usn,
            data.get("patientName"),
            data.get("patientAge"),
            data.get("patientGender"),
            data.get("caseReportId"),
            data.get("sickLeaveFrom"),
            data.get("sickLeaveTo"),
            data.get("totalDays"),
            data.get("reason"),
            data.get("symptoms"),
            1 if data.get("restRecommended", True) else 0,
            data.get("doctorName"),
            data.get("issueDate"),
            data.get("status", "Active"),
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "intimationNumber": intimation_number}), 201


@app.route("/api/export/prescriptions")
def api_export_prescriptions():
    conn = get_db()
    prescriptions = conn.execute("""
        SELECT p.*, pa.full_name 
        FROM prescriptions p 
        LEFT JOIN patients pa ON p.usn = pa.usn 
        ORDER BY p.prescribed_at DESC
    """).fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write comprehensive header matching frontend structure
    writer.writerow([
        "USN", "Patient Name", "Age", "Gender", "Contact", "Address",
        "Diagnosis", "Medications (Detailed)", "Dosage Instructions", 
        "Notes", "Follow Up Date", "Prescribed At", "Prescribed By", 
        "Status", "Chief Complaint", "Physical Examination"
    ])
    
    # Write data with proper medication formatting
    for prescription in prescriptions:
        # Parse medications JSON safely
        medications_text = ""
        dosage_instructions = ""
        try:
            import json
            medications_data = prescription["medications"] if "medications" in prescription.keys() else "{}"
            if medications_data:
                medications_list = json.loads(medications_data) if medications_data != "{}" else []
                med_details = []
                dosage_details = []
                for med in medications_list:
                    med_name = med.get('name', 'Unknown')
                    med_dosage = med.get('dosage', '')
                    med_frequency = med.get('frequency', '')
                    med_duration = med.get('duration', '')
                    
                    med_details.append(f"{med_name}")
                    dosage_details.append(f"{med_name}: {med_dosage} {med_frequency} for {med_duration}")
                
                medications_text = "; ".join(med_details)
                dosage_instructions = "; ".join(dosage_details)
        except Exception:
            medications_text = prescription["medications"] if "medications" in prescription.keys() else ""
            dosage_instructions = ""
        
        # Get patient name with fallback
        patient_name = ""
        if "patient_name" in prescription.keys() and prescription["patient_name"]:
            patient_name = prescription["patient_name"]
        elif "full_name" in prescription.keys() and prescription["full_name"]:
            patient_name = prescription["full_name"]
            
        writer.writerow([
            prescription["usn"] if "usn" in prescription.keys() else "",
            patient_name,
            prescription["patient_age"] if "patient_age" in prescription.keys() else "",
            prescription["patient_gender"] if "patient_gender" in prescription.keys() else "",
            prescription["patient_contact"] if "patient_contact" in prescription.keys() else "",
            prescription["patient_address"] if "patient_address" in prescription.keys() else "",
            prescription["diagnosis"] if "diagnosis" in prescription.keys() else "",
            medications_text,
            dosage_instructions,
            prescription["notes"] if "notes" in prescription.keys() else "",
            prescription["follow_up_date"] if "follow_up_date" in prescription.keys() else "",
            prescription["prescribed_at"] if "prescribed_at" in prescription.keys() else "",
            prescription["prescribed_by"] if "prescribed_by" in prescription.keys() else "NHCE Clinic",
            prescription["status"] if "status" in prescription.keys() else "Active",
            prescription["chief_complaint"] if "chief_complaint" in prescription.keys() else "",
            prescription["physical_examination"] if "physical_examination" in prescription.keys() else ""
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=prescriptions.csv"
    return response


@app.route("/api/health")
def api_health():
    print("Health check endpoint called")  # Debug log
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})

@app.route("/health")
def health():
    print("Simple health endpoint called")  # Debug log
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})

@app.route("/test")
def test():
    print("Test endpoint called")  # Debug log
    return "Server is running!"

# Enhanced sync endpoints
@app.route("/api/sync/patients", methods=["POST"])
def sync_patients():
    """Bulk sync patients from offline data"""
    try:
        patients_data = request.get_json()
        if not isinstance(patients_data, list):
            return jsonify({"error": "Expected array of patients"}), 400
        
        conn = get_db()
        cur = conn.cursor()
        synced_count = 0
        skipped_count = 0
        errors: List[str] = []
        
        for patient in patients_data:
            try:
                # Normalize and validate minimal fields
                usn = (patient.get('usn') or '').strip()
                full_name = (patient.get('fullName') or '').strip()
                # Age: cast to int; if missing/invalid, default to 0
                age_val = patient.get('age')
                try:
                    age = int(age_val) if age_val is not None and str(age_val).strip() != '' else 0
                except Exception:
                    age = 0
                gender = (patient.get('gender') or '').strip() or 'Unknown'
                # Contact/address: coalesce to empty strings to satisfy NOT NULL constraint
                contact = (patient.get('contact') or patient.get('phone') or '').strip()
                address = (patient.get('address') or '').strip()

                # Require at least USN and full name; skip otherwise
                if not usn or not full_name:
                    skipped_count += 1
                    continue

                # Use INSERT OR REPLACE to handle duplicates safely
                cur.execute(
                    """INSERT OR REPLACE INTO patients (usn, full_name, age, gender, contact, address)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (usn, full_name, age, gender, contact or "", address or "")
                )
                synced_count += 1
            except Exception as e:
                # Log and continue; don't let a single bad record block the batch
                err_usn = patient.get('usn', 'unknown')
                msg = f"Error syncing patient {err_usn}: {e}"
                print(msg)
                errors.append(msg)
                skipped_count += 1
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "status": "success",
            "synced_count": synced_count,
            "total_received": len(patients_data),
            "skipped_count": skipped_count
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sync/vitals", methods=["POST"])
def sync_vitals():
    """Bulk sync vitals from offline data"""
    try:
        vitals_data = request.get_json()
        if not isinstance(vitals_data, list):
            return jsonify({"error": "Expected array of vitals"}), 400
        
        conn = get_db()
        cur = conn.cursor()
        synced_count = 0
        
        for vital in vitals_data:
            try:
                # Check if patient exists
                if not cur.execute("SELECT 1 FROM patients WHERE usn = ?", (vital.get('usn'),)).fetchone():
                    continue  # Skip if patient doesn't exist
                
                cur.execute(
                    """INSERT OR REPLACE INTO vitals 
                       (id, usn, weight, height, blood_pressure_systolic, blood_pressure_diastolic,
                        heart_rate, temperature, respiratory_rate, oxygen_saturation, notes, 
                        recorded_at, recorded_by)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (vital.get('id'), vital.get('usn'), vital.get('weight'), vital.get('height'),
                     vital.get('bloodPressureSystolic'), vital.get('bloodPressureDiastolic'),
                     vital.get('heartRate'), vital.get('temperature'), vital.get('respiratoryRate'),
                     vital.get('oxygenSaturation'), vital.get('notes'), vital.get('recordedAt'),
                     vital.get('recordedBy', 'System User'))
                )
                synced_count += 1
            except Exception as e:
                print(f"Error syncing vital {vital.get('id', 'unknown')}: {e}")
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "status": "success",
            "synced_count": synced_count,
            "total_received": len(vitals_data)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sync/prescriptions", methods=["POST"])
def sync_prescriptions():
    """Bulk sync prescriptions from offline data"""
    try:
        prescriptions_data = request.get_json()
        if not isinstance(prescriptions_data, list):
            return jsonify({"error": "Expected array of prescriptions"}), 400
        
        conn = get_db()
        cur = conn.cursor()
        synced_count = 0
        
        for prescription in prescriptions_data:
            try:
                # Check if patient exists
                if not cur.execute("SELECT 1 FROM patients WHERE usn = ?", (prescription.get('usn'),)).fetchone():
                    continue  # Skip if patient doesn't exist
                
                import json
                medications_json = json.dumps(prescription.get('medications', []))
                
                cur.execute(
                    """INSERT OR REPLACE INTO prescriptions 
                       (id, usn, diagnosis, medications, notes, follow_up_date, prescribed_at, 
                        prescribed_by, status, patient_name, patient_age, patient_gender)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (prescription.get('id'), prescription.get('usn'), 
                     prescription.get('diagnosis', ''), medications_json,
                     prescription.get('notes', ''), prescription.get('followUpDate'),
                     prescription.get('prescribedAt'), prescription.get('prescribedBy', 'NHCE Clinic'),
                     prescription.get('status', 'Active'), prescription.get('patientName'),
                     prescription.get('patientAge'), prescription.get('patientGender'))
                )
                synced_count += 1
            except Exception as e:
                print(f"Error syncing prescription {prescription.get('id', 'unknown')}: {e}")
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "status": "success",
            "synced_count": synced_count,
            "total_received": len(prescriptions_data)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sync/case-reports", methods=["POST"])
def sync_case_reports():
    """Bulk sync case reports from offline data"""
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Expected array of case reports"}), 400

        conn = get_db()
        cur = conn.cursor()
        synced_count = 0
        for cr in data:
            try:
                if not cr.get('reportNumber') or not cr.get('usn'):
                    continue
                # ensure patient exists
                cur.execute(
                    "INSERT OR IGNORE INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
                    (cr.get('usn'), cr.get('patientName') or 'Unknown', cr.get('patientAge') or 0, cr.get('patientGender') or 'Unknown', '', ''),
                )
                cur.execute(
                    """
                    INSERT OR REPLACE INTO case_reports(
                        id, report_number, usn, patient_name, patient_age, patient_gender, report_type,
                        chief_complaint, history_of_present_illness, past_medical_history, family_history,
                        social_history, physical_examination, investigations, diagnosis, treatment, prognosis,
                        recommendations, follow_up, doctor_name, report_date, status, created_at
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        cr.get('id'), cr.get('reportNumber'), cr.get('usn'), cr.get('patientName'), cr.get('patientAge'), cr.get('patientGender'),
                        cr.get('reportType', 'medical'), cr.get('chiefComplaint'), cr.get('historyOfPresentIllness'), cr.get('pastMedicalHistory'),
                        cr.get('familyHistory'), cr.get('socialHistory'), cr.get('physicalExamination'), cr.get('investigations'), cr.get('diagnosis'),
                        cr.get('treatment'), cr.get('prognosis'), cr.get('recommendations'), cr.get('followUp'), cr.get('doctorName'), cr.get('reportDate'),
                        cr.get('status', 'Active'), cr.get('createdAt') or datetime.utcnow().isoformat()
                    ),
                )
                synced_count += 1
            except Exception as e:
                print(f"Error syncing case report {cr.get('reportNumber', 'unknown')}: {e}")
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "synced_count": synced_count, "total_received": len(data)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sync/sick-intimations", methods=["POST"])
def sync_sick_intimations():
    """Bulk sync sick intimations from offline data"""
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Expected array of sick intimations"}), 400

        conn = get_db()
        cur = conn.cursor()
        synced_count = 0
        for si in data:
            try:
                if not si.get('intimationNumber') or not si.get('usn'):
                    continue
                cur.execute(
                    "INSERT OR IGNORE INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
                    (si.get('usn'), si.get('patientName') or 'Unknown', si.get('patientAge') or 0, si.get('patientGender') or 'Unknown', '', ''),
                )
                cur.execute(
                    """
                    INSERT OR REPLACE INTO sick_intimations(
                        id, intimation_number, usn, patient_name, patient_age, patient_gender, case_report_id,
                        sick_leave_from, sick_leave_to, total_days, reason, symptoms, rest_recommended,
                        doctor_name, issue_date, status, created_at
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        si.get('id'), si.get('intimationNumber'), si.get('usn'), si.get('patientName'), si.get('patientAge'), si.get('patientGender'),
                        si.get('caseReportId'), si.get('sickLeaveFrom'), si.get('sickLeaveTo'), si.get('totalDays'), si.get('reason'), si.get('symptoms'),
                        1 if si.get('restRecommended', True) else 0, si.get('doctorName'), si.get('issueDate'), si.get('status', 'Active'),
                        si.get('createdAt') or datetime.utcnow().isoformat()
                    ),
                )
                synced_count += 1
            except Exception as e:
                print(f"Error syncing sick intimation {si.get('intimationNumber', 'unknown')}: {e}")
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "synced_count": synced_count, "total_received": len(data)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sync/status")
def sync_status():
    """Get sync status and data counts"""
    try:
        conn = get_db()
        cur = conn.cursor()
        patients_count = cur.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
        vitals_count = cur.execute("SELECT COUNT(*) FROM vitals").fetchone()[0]
        prescriptions_count = cur.execute("SELECT COUNT(*) FROM prescriptions").fetchone()[0]
        case_reports_count = cur.execute("SELECT COUNT(*) FROM case_reports").fetchone()[0]
        sick_intimations_count = cur.execute("SELECT COUNT(*) FROM sick_intimations").fetchone()[0]
        conn.close()
        return jsonify({
            "status": "ok",
            "counts": {
                "patients": patients_count,
                "vitals": vitals_count,
                "prescriptions": prescriptions_count,
                "case_reports": case_reports_count,
                "sick_intimations": sick_intimations_count
            },
            "last_updated": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Original vitals creation for backward compatibility (keeping old endpoint)
@app.post("/vitals/create/legacy")
def vitals_create_legacy() -> Response:
    usn = (request.form.get("usn") or "").strip()
    bp = (request.form.get("blood_pressure") or "").strip()
    pulse = (request.form.get("pulse") or "0").strip()
    temp = (request.form.get("temperature") or "0").strip()
    weight = (request.form.get("weight") or "0").strip()
    height = (request.form.get("height") or "0").strip()

    if not (usn and bp and pulse and temp and weight and height):
        return redirect(url_for("index", e="All vitals are required", q=usn))

    try:
        pulse_i = int(pulse)
        temp_f = float(temp)
        weight_f = float(weight)
        height_f = float(height)
    except ValueError:
        return redirect(url_for("index", e="Vitals must be numeric", q=usn))

    conn = get_db()
    # Ensure patient exists
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return redirect(url_for("index", e="Patient not found", q=usn))

    conn.execute(
        "INSERT INTO vitals(usn, blood_pressure, pulse, temperature, weight, height, recorded_at) VALUES(?,?,?,?,?,?,?)",
        (usn, bp, pulse_i, temp_f, weight_f, height_f, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Vitals saved", q=usn))


# Prescription (free-text notes retained)
@app.post("/prescription/create")
def prescription_create() -> Response:
    usn = (request.form.get("usn") or "").strip()
    notes = (request.form.get("notes") or "").strip()
    if not (usn and notes):
        return redirect(url_for("index", e="USN and notes required", q=usn))

    conn = get_db()
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return redirect(url_for("index", e="Patient not found", q=usn))

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO prescriptions(usn, notes, prescribed_at) VALUES(?,?,?)",
        (usn, notes, datetime.utcnow().isoformat()),
    )
    rx_id = cur.lastrowid
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Prescription saved", q=usn))


# New: add itemized medications to a prescription
@app.post("/prescription/item/create")
def prescription_item_create() -> Response:
    prescription_id = (request.form.get("prescription_id") or "").strip()
    med_name = (request.form.get("med_name") or "").strip()
    dose = (request.form.get("dose") or "").strip()
    route = (request.form.get("route") or "").strip()
    frequency = (request.form.get("frequency") or "").strip()
    duration_days = (request.form.get("duration_days") or "").strip()
    instructions = (request.form.get("instructions") or "").strip()

    if not (prescription_id and med_name):
        return redirect(url_for("index", e="Prescription and medication required"))

    conn = get_db()
    cur = conn.cursor()
    # Upsert medication by name
    med = cur.execute("SELECT id FROM medications WHERE name=?", (med_name,)).fetchone()
    if med:
        med_id = med["id"]
    else:
        cur.execute("INSERT INTO medications(name) VALUES(?)", (med_name,))
        med_id = cur.lastrowid

    try:
        dur_i = int(duration_days) if duration_days else None
    except ValueError:
        dur_i = None

    cur.execute(
        """
        INSERT INTO prescription_items(prescription_id, medication_id, dose, route, frequency, duration_days, instructions)
        VALUES (?,?,?,?,?,?,?)
        """,
        (int(prescription_id), med_id, dose, route, frequency, dur_i, instructions or None),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Medication added to prescription"))


@app.get("/prescription/print/<int:pid>")
def prescription_print(pid: int) -> str:
    conn = get_db()
    rx = conn.execute("SELECT * FROM prescriptions WHERE id=?", (pid,)).fetchone()
    if not rx:
        conn.close()
        return "Not Found", 404
    patient = conn.execute("SELECT * FROM patients WHERE usn=?", (rx["usn"],)).fetchone()
    items = conn.execute(
        """
        SELECT pi.*, m.name AS medication_name
        FROM prescription_items pi
        JOIN medications m ON m.id = pi.medication_id
        WHERE pi.prescription_id = ?
        ORDER BY pi.id
        """,
        (pid,),
    ).fetchall()
    conn.close()
    return render_template("print_rx.html", rx=rx, patient=patient, items=items)


# New: Appointments CRUD (basic)
@app.get("/api/appointments")
def api_appointments_list() -> Response:
    usn = (request.args.get("usn") or "").strip()
    conn = get_db()
    if usn:
        rows = conn.execute(
            "SELECT * FROM appointments WHERE usn = ? ORDER BY starts_at DESC",
            (usn,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM appointments ORDER BY starts_at DESC LIMIT 200"
        ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.post("/api/appointments")
def api_appointments_create() -> Response:
    data = request.get_json(silent=True) or {}
    usn = (data.get("usn") or "").strip()
    starts_at = (data.get("starts_at") or "").strip()
    ends_at = (data.get("ends_at") or "").strip()
    title = (data.get("title") or "").strip() or None
    clinician = (data.get("clinician") or "").strip() or None
    notes = (data.get("notes") or "").strip() or None

    if not (usn and starts_at and ends_at):
        return jsonify({"error": "usn, starts_at, ends_at required"}), 400

    conn = get_db()
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO appointments(usn, starts_at, ends_at, status, title, clinician, notes)
        VALUES (?,?,?,?,?,?,?)
        """,
        (usn, starts_at, ends_at, "Scheduled", title, clinician, notes),
    )
    appt_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"id": appt_id}), 201


@app.post("/api/appointments/<int:aid>/update")
def api_appointments_update(aid: int) -> Response:
    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "").strip() or None
    title = (data.get("title") or "").strip() or None
    clinician = (data.get("clinician") or "").strip() or None
    notes = (data.get("notes") or "").strip() or None
    starts_at = (data.get("starts_at") or "").strip() or None
    ends_at = (data.get("ends_at") or "").strip() or None

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE appointments
        SET status = COALESCE(?, status),
            title = COALESCE(?, title),
            clinician = COALESCE(?, clinician),
            notes = COALESCE(?, notes),
            starts_at = COALESCE(?, starts_at),
            ends_at = COALESCE(?, ends_at)
        WHERE id = ?
        """,
        (status, title, clinician, notes, starts_at, ends_at, aid),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.post("/api/appointments/<int:aid>/delete")
def api_appointments_delete(aid: int) -> Response:
    conn = get_db()
    conn.execute("DELETE FROM appointments WHERE id=?", (aid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# New: Labs basic APIs
@app.get("/api/lab-tests")
def api_lab_tests() -> Response:
    conn = get_db()
    rows = conn.execute("SELECT * FROM lab_tests WHERE is_active = 1 ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.post("/api/lab-orders")
def api_create_lab_order() -> Response:
    data = request.get_json(silent=True) or {}
    usn = (data.get("usn") or "").strip()
    test_code = (data.get("test_code") or "").strip()
    notes = (data.get("notes") or "").strip() or None

    if not (usn and test_code):
        return jsonify({"error": "usn and test_code required"}), 400

    conn = get_db()
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    test = conn.execute("SELECT id FROM lab_tests WHERE code=? AND is_active=1", (test_code,)).fetchone()
    if not test:
        conn.close()
        return jsonify({"error": "Lab test not found"}), 404

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO lab_orders(usn, ordered_at, status, notes) VALUES(?,?,?,?)",
        (usn, datetime.utcnow().isoformat(), "Ordered", notes),
    )
    order_id = cur.lastrowid
    cur.execute(
        "INSERT INTO lab_order_items(lab_order_id, lab_test_id) VALUES(?,?)",
        (order_id, test["id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"id": order_id}), 201


@app.get("/api/lab-orders")
def api_list_lab_orders() -> Response:
    usn = (request.args.get("usn") or "").strip()
    conn = get_db()
    if usn:
        rows = conn.execute(
            """
            SELECT lo.*, loi.id AS item_id, lt.code, lt.name, loi.status, loi.result_value, loi.result_at
            FROM lab_orders lo
            JOIN lab_order_items loi ON loi.lab_order_id = lo.id
            JOIN lab_tests lt ON lt.id = loi.lab_test_id
            WHERE lo.usn = ?
            ORDER BY lo.ordered_at DESC
            """,
            (usn,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT lo.*, loi.id AS item_id, lt.code, lt.name, loi.status, loi.result_value, loi.result_at
            FROM lab_orders lo
            JOIN lab_order_items loi ON loi.lab_order_id = lo.id
            JOIN lab_tests lt ON lt.id = loi.lab_test_id
            ORDER BY lo.ordered_at DESC
            LIMIT 200
            """
        ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.post("/api/lab-results/<int:item_id>")
def api_set_lab_result(item_id: int) -> Response:
    data = request.get_json(silent=True) or {}
    value = (data.get("result_value") or "").strip()
    notes = (data.get("result_notes") or "").strip() or None

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE lab_order_items
        SET result_value = ?, result_notes = ?, result_at = ?, status = 'Completed'
        WHERE id = ?
        """,
        (value, notes, datetime.utcnow().isoformat(), item_id),
    )
    # If all items completed, mark order completed
    cur.execute(
        """
        UPDATE lab_orders
           SET status = CASE WHEN NOT EXISTS (
                SELECT 1 FROM lab_order_items WHERE lab_order_id = lab_orders.id AND status <> 'Completed'
           ) THEN 'Completed' ELSE status END
        WHERE id = (SELECT lab_order_id FROM lab_order_items WHERE id = ?)
        """,
        (item_id,),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# Dashboard metrics
@app.get("/api/metrics")
def api_metrics() -> Response:
    today = date.today().isoformat()
    conn = get_db()
    patients_count = conn.execute("SELECT COUNT(1) FROM patients").fetchone()[0]
    appts_today = conn.execute(
        "SELECT COUNT(1) FROM appointments WHERE substr(starts_at,1,10) = ?",
        (today,),
    ).fetchone()[0]
    labs_pending = conn.execute(
        "SELECT COUNT(1) FROM lab_order_items WHERE status <> 'Completed'"
    ).fetchone()[0]
    vitals_today = conn.execute(
        "SELECT COUNT(1) FROM vitals WHERE substr(recorded_at,1,10) = ?",
        (today,),
    ).fetchone()[0]
    conn.close()
    return jsonify({
        "patients": patients_count,
        "appointments_today": appts_today,
        "labs_pending": labs_pending,
        "vitals_today": vitals_today,
    })


# Export CSV (fix latest vitals selection)
@app.get("/export.csv")
def export_csv() -> Response:
    conn = get_db()
    patients = conn.execute("SELECT * FROM patients").fetchall()
    vitals_map: Dict[str, sqlite3.Row] = {}
    for v in conn.execute(
        """
        SELECT v.* FROM vitals v
        JOIN (
            SELECT usn, MAX(recorded_at) AS latest
            FROM vitals
            GROUP BY usn
        ) m ON m.usn = v.usn AND m.latest = v.recorded_at
        """
    ).fetchall():
        vitals_map[v["usn"]] = v

    rx = conn.execute("SELECT * FROM prescriptions").fetchall()
    conn.close()

    header = [
        "USN","Full Name","Age","Gender","Contact","Address",
        "BP","Pulse","Temp","Weight","Height","Vitals Time",
        "Prescription","Prescribed At"
    ]
    rows: List[List[str]] = []

    for p in patients:
        p_usn = p["usn"]
        v = vitals_map.get(p_usn)
        related = [r for r in rx if r["usn"] == p_usn]
        if not related:
            rows.append([
                p_usn, p["full_name"], str(p["age"]), p["gender"], p["contact"], p["address"],
                v["blood_pressure"] if v else "", str(v["pulse"]) if v else "", str(v["temperature"]) if v else "",
                str(v["weight"]) if v else "", str(v["height"]) if v else "", v["recorded_at"] if v else "",
                "", ""
            ])
        else:
            for r in related:
                rows.append([
                    p_usn, p["full_name"], str(p["age"]), p["gender"], p["contact"], p["address"],
                    v["blood_pressure"] if v else "", str(v["pulse"]) if v else "", str(v["temperature"]) if v else "",
                    str(v["weight"]) if v else "", str(v["height"]) if v else "", v["recorded_at"] if v else "",
                    r["notes"].replace("\n", " "), r["prescribed_at"]
                ])

    buf = io.StringIO()
    cw = csv.writer(buf)
    cw.writerow(header)
    cw.writerows(rows)
    data = buf.getvalue()
    return Response(
        data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hmis-export.csv"},
    )


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
