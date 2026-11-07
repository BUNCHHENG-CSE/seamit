import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from app.database import get_db
from app.engine.discrepancy_radar import DiscrepancyRadar

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/soc2-summary")
def get_soc2_compliance_summary():
    now = datetime.now(timezone.utc)
    radar_data = DiscrepancyRadar.scan_discrepancies()

    with get_db() as conn:
        cursor = conn.cursor()

        # Inventory breakdown
        cursor.execute("SELECT status, COUNT(*) as count FROM assets GROUP BY status")
        status_counts = {r["status"]: r["count"] for r in cursor.fetchall()}
        total_assets = sum(status_counts.values())

        # Ghost assets count
        cursor.execute("""
            SELECT COUNT(*) as count FROM assets
            WHERE status = 'in_use'
            AND (assigned_to_email IS NULL OR assigned_to_email = '')
            AND (assigned_to_name IS NULL OR assigned_to_name = '')
        """)
        ghost_assets_count = cursor.fetchone()["count"]

        # Recent 30-day custody turnover logs
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        cursor.execute("""
            SELECT * FROM sync_logs
            WHERE timestamp >= ?
            ORDER BY id DESC LIMIT 50
        """, (thirty_days_ago,))
        recent_logs = [dict(r) for r in cursor.fetchall()]

        # Connected ITSM platforms
        cursor.execute("SELECT id, name, is_enabled, mock_mode, status FROM connectors")
        connectors = [dict(r) for r in cursor.fetchall()]

    return {
        "report_id": f"SOC2-AUDIT-{now.strftime('%Y%m%d')}-01",
        "generated_at": now.isoformat(),
        "standards": ["SOC 2 Type II (Trust Services Criteria CC6.1, CC6.8)", "ISO/IEC 27001:2022 Control A.8.1 (Asset Inventory)"],
        "organization": "Acme Corp (50-300 Employee SMB Tier)",
        "audit_readiness_score": radar_data["summary"]["audit_readiness_score"],
        "total_discrepancies": radar_data["summary"]["total_discrepancies"],
        "ghost_assets_count": ghost_assets_count,
        "dollar_risk_exposure": radar_data["summary"]["total_dollar_risk"],
        "inventory_summary": {
            "total_assets": total_assets,
            "in_use": status_counts.get("in_use", 0),
            "available": status_counts.get("available", 0),
            "in_repair": status_counts.get("in_repair", 0),
            "pending_return": status_counts.get("pending_return", 0),
            "retired": status_counts.get("retired", 0),
            "lost_stolen": status_counts.get("lost_stolen", 0)
        },
        "connectors_audited": connectors,
        "recent_custody_events_count": len(recent_logs),
        "recent_custody_events": recent_logs[:20],
        "attestation_statement": "All corporate endpoint devices are tracked via automated bidirectional sync layer bridging ITSM ticketing webhooks with the central asset inventory. Audit trails and diff payloads are immutably logged with microsecond precision."
    }

@router.get("/soc2-summary/html", response_class=HTMLResponse)
def get_soc2_compliance_html():
    data = get_soc2_compliance_summary()
    inv = data["inventory_summary"]

    rows_html = ""
    for log in data["recent_custody_events"]:
        rows_html += f"""
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">{log.get('timestamp', '')[:19]}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">{log.get('ticket_id') or 'N/A'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{log.get('asset_tag') or '—'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{log.get('action_summary', '')}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                <span style="background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold;">{log.get('status', 'success').upper()}</span>
            </td>
        </tr>
        """

    score_color = "#10b981" if data["audit_readiness_score"] >= 80 else "#f59e0b" if data["audit_readiness_score"] >= 60 else "#ef4444"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SOC 2 & ISO 27001 ITAM-ITSM Audit Attestation Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }}
        h1, h2, h3 {{ margin: 0 0 8px 0; }}
        .header {{ border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }}
        .badge {{ background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; }}
        .metric-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }}
        .metric-card {{ background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }}
        .metric-val {{ font-size: 26px; font-weight: 800; margin-top: 4px; }}
        .metric-lbl {{ font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }}
        table {{ width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 30px; font-size: 13px; }}
        th {{ background: #f1f5f9; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }}
        .attestation-box {{ background: #f8fafc; border-left: 4px solid #0f172a; padding: 18px 24px; margin-bottom: 30px; border-radius: 0 8px 8px 0; }}
        .sig-block {{ display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #cbd5e1; }}
        .sig-line {{ width: 250px; border-top: 1px solid #475569; margin-top: 50px; font-size: 12px; color: #64748b; padding-top: 6px; }}
        @media print {{
            body {{ margin: 20px; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #0f172a; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
    </div>

    <div class="header">
        <div>
            <div style="font-size: 12px; font-weight: bold; color: #0284c7; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;">SeamIT Automated Compliance Attestation</div>
            <h1 style="font-size: 24px; font-weight: 800;">SOC 2 Type II & ISO 27001 Device Custody Audit Report</h1>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;">
                Organization: <strong>{data['organization']}</strong> | Report ID: <strong>{data['report_id']}</strong>
            </div>
        </div>
        <div style="text-align: right;">
            <span class="badge">Official ITAM Audit</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Generated: {data['generated_at'][:19].replace('T', ' ')} UTC</div>
        </div>
    </div>

    <div class="metric-grid">
        <div class="metric-card">
            <div class="metric-lbl">Audit Readiness Score</div>
            <div class="metric-val" style="color: {score_color};">{data['audit_readiness_score']}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-lbl">Total Managed Assets</div>
            <div class="metric-val">{inv['total_assets']}</div>
        </div>
        <div class="metric-card">
            <div class="metric-lbl">Ghost Assets (Unassigned)</div>
            <div class="metric-val" style="color: {'#ef4444' if data['ghost_assets_count'] > 0 else '#10b981'};">{data['ghost_assets_count']}</div>
        </div>
        <div class="metric-card">
            <div class="metric-lbl">Total Dollar Risk Exposure</div>
            <div class="metric-val" style="color: {'#ef4444' if data['dollar_risk_exposure'] > 0 else '#10b981'};">${data['dollar_risk_exposure']:,}</div>
        </div>
    </div>

    <div class="attestation-box">
        <h3 style="font-size: 15px; margin-bottom: 8px;">Compliance Scope & Attestation Statement</h3>
        <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0;">
            {data['attestation_statement']}
        </p>
        <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
            Audited Standards: {", ".join(data['standards'])}
        </div>
    </div>

    <h3>Inventory State Distribution</h3>
    <table style="margin-top: 12px;">
        <thead>
            <tr>
                <th>Deployed (In Use)</th>
                <th>Available (Stock)</th>
                <th>In Repair</th>
                <th>Pending Return</th>
                <th>Retired / EOL</th>
                <th>Reported Lost/Stolen</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">{inv['in_use']}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">{inv['available']}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">{inv['in_repair']}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">{inv['pending_return']}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">{inv['retired']}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #ef4444;">{inv['lost_stolen']}</td>
            </tr>
        </tbody>
    </table>

    <h3>Device Custody Turnover & Synchronization Trail (Recent 30 Days)</h3>
    <table style="margin-top: 12px;">
        <thead>
            <tr>
                <th>Timestamp (UTC)</th>
                <th>Ticket ID</th>
                <th>Asset Tag</th>
                <th>Action & Custody Transition Summary</th>
                <th style="text-align: center;">Verification</th>
            </tr>
        </thead>
        <tbody>
            {rows_html if rows_html else "<tr><td colspan='5' style='text-align:center; padding: 20px;'>No custody turnover events in the past 30 days.</td></tr>"}
        </tbody>
    </table>

    <div class="sig-block">
        <div>
            <div style="font-weight: 600; font-size: 13px;">Lead IT Systems Administrator</div>
            <div class="sig-line">Signature / Timestamp Attestation</div>
        </div>
        <div>
            <div style="font-weight: 600; font-size: 13px;">External Compliance / SOC 2 Auditor</div>
            <div class="sig-line">Auditor Verification & Review</div>
        </div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html)
