# Vercel Python Serverless Functions for basic patient ops
# Note: This is a minimal mock to make the deployed UI work.
# For full functionality (SQLite, cascade deletes, etc.), deploy the Flask backend separately
# or progressively port endpoints into Vercel functions with a hosted DB.

import json
from datetime import datetime, timezone
from typing import Any, Dict

# Simple in-memory store (ephemeral on serverless!)
_store: Dict[str, Dict[str, Any]] = {}


def _json_response(status: int, payload: dict):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(payload),
    }


def handler(request):
    method = request.get("method", "GET")
    path = request.get("path", "/api/patients")

    # /api/patients
    if path.endswith("/api/patients"):
        if method == "GET":
            return _json_response(200, [
                {
                    "id": hash(usn) % (10**8),
                    "usn": usn,
                    "fullName": data.get("fullName"),
                    "age": data.get("age"),
                    "gender": data.get("gender"),
                    "contact": data.get("contact"),
                    "address": data.get("address"),
                }
                for usn, data in _store.items()
            ])
        elif method == "POST":
            try:
                data = json.loads(request.get("body") or "{}")
            except Exception:
                return _json_response(400, {"error": "Invalid JSON"})

            usn = (data.get("usn") or "").strip()
            if not usn:
                return _json_response(400, {"error": "USN required"})

            # Minimal normalization
            data["fullName"] = (data.get("fullName") or "").strip()
            data["age"] = int(data.get("age") or 0)
            data["gender"] = (data.get("gender") or "Unknown").strip() or "Unknown"
            data["contact"] = (data.get("contact") or data.get("phone") or "").strip()
            data["address"] = (data.get("address") or "").strip()
            data["updatedAt"] = datetime.now(timezone.utc).isoformat()

            _store[usn] = data
            result = {
                "id": hash(usn) % (10**8),
                "usn": usn,
                "fullName": data["fullName"],
                "age": data["age"],
                "gender": data["gender"],
                "contact": data["contact"],
                "address": data["address"],
            }
            return _json_response(201, result)

    # /api/patients/{usn}
    if "/api/patients/" in path:
        usn = path.rsplit("/", 1)[-1]
        if method == "DELETE":
            if usn in _store:
                del _store[usn]
                return _json_response(200, {"ok": True, "deleted": True})
            return _json_response(200, {"ok": True, "deleted": False})

    return _json_response(404, {"error": "Not found"})
