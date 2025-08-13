# Vercel Python Serverless Function for health check
# GET /api/health

import json
from datetime import datetime, timezone

def handler(request):
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    }
