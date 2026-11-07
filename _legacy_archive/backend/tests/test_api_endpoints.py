import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.seed_data import seed_database

def test_full_system_api():
    init_db()
    seed_database(force=True)

    with TestClient(app) as client:
        # 1. Health check
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        print("[PASS] Health check endpoint passed")

        # 2. Assets list
        res = client.get("/api/assets")
        assert res.status_code == 200
        assets = res.json()
        assert len(assets) >= 10
        print(f"[PASS] Assets list returned {len(assets)} items")

        # 3. Discrepancy Radar
        res = client.get("/api/discrepancies/radar")
        assert res.status_code == 200
        radar = res.json()
        assert "discrepancies" in radar
        assert radar["summary"]["total_discrepancies"] > 0
        print(f"[PASS] Discrepancy Radar found {radar['summary']['total_discrepancies']} discrepancies, ${radar['summary']['total_dollar_risk']} risk")

        # 4. Rules & Recipes
        res = client.get("/api/rules")
        assert res.status_code == 200
        rules = res.json()
        assert len(rules) >= 6
        print(f"[PASS] Rules endpoint returned {len(rules)} active automation rules")

        res = client.get("/api/rules/recipes")
        assert res.status_code == 200
        recipes = res.json()
        assert len(recipes) >= 5
        print(f"[PASS] Recipe library returned {len(recipes)} pre-configured SMB recipes")

        # 5. Connectors
        res = client.get("/api/connectors")
        assert res.status_code == 200
        connectors = res.json()
        assert len(connectors) >= 2
        print(f"[PASS] Connectors returned {len(connectors)} connectors: {[c['name'] for c in connectors]}")

        # Test Zendesk connector mock ping
        res = client.post("/api/connectors/zendesk/test")
        assert res.status_code == 200
        assert res.json()["success"] is True
        print("[PASS] Zendesk Support connector test passed")

        # 6. Simulator templates & execution
        res = client.get("/api/simulator/templates")
        assert res.status_code == 200
        templates = res.json()
        assert len(templates) >= 5
        print(f"[PASS] Simulator templates loaded: {len(templates)} scenarios")

        # Trigger simulation: Offboarding Sarah Connor
        offboarding_tmpl = templates[0]
        sim_res = client.post("/api/simulator/trigger", json={
            "source": offboarding_tmpl["source"],
            "payload": offboarding_tmpl["payload"]
        })
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert sim_data["status"] == "success"
        print(f"[PASS] Simulation triggered successfully: {sim_data['message']}")

        # 7. Check that Sarah's asset was changed to pending_return
        res = client.get("/api/assets?query=ASSET-1001")
        asset_check = res.json()[0]
        assert asset_check["status"] == "pending_return"
        assert asset_check["assigned_to_email"] is None
        print("[PASS] Verified asset ASSET-1001 transitioned to pending_return with cleared assignee")

        # 8. Trigger 2-way lifecycle sync
        lifecycle_res = client.post("/api/assets/check-lifecycle")
        assert lifecycle_res.status_code == 200
        lifecycle_data = lifecycle_res.json()
        assert lifecycle_data["success"] is True
        print(f"[PASS] 2-Way lifecycle sync executed: {lifecycle_data['tickets_created_count']} draft ticket(s) created")

        # 9. Sync Logs
        res = client.get("/api/logs")
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) > 0
        print(f"[PASS] Audit logs verified: {len(logs)} audit trail entries recorded")

        # 10. Compliance export
        res = client.get("/api/logs/export-compliance")
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        print("[PASS] Compliance export CSV generated successfully")

        # 11. Discrepancy Radar One-Click Remediation
        rem_res = client.post("/api/discrepancies/remediate", json={
            "action": "remediate_all_low_hanging"
        })
        assert rem_res.status_code == 200
        rem_data = rem_res.json()
        assert rem_data["success"] is True
        print(f"[PASS] One-Click Discrepancy Remediation: {rem_data['message']}")

        # 12. Asset Bulk Operations
        all_assets = client.get("/api/assets").json()
        target_ids = [a["id"] for a in all_assets[:2]]
        bulk_res = client.post("/api/assets/bulk-update", json={
            "asset_ids": target_ids,
            "status": "available",
            "location": "IT Storage Closet - Shelf B"
        })
        assert bulk_res.status_code == 200
        bulk_data = bulk_res.json()
        assert bulk_data["success"] is True
        assert bulk_data["affected_count"] == len(target_ids)
        print(f"[PASS] Asset Bulk Operations: {bulk_data['message']}")

        # 13. Notifications Center & Outbound Alerts
        notif_res = client.get("/api/notifications")
        assert notif_res.status_code == 200
        notifs = notif_res.json()
        assert "notifications" in notifs
        assert notifs["unread_count"] >= 0
        print(f"[PASS] Notification Center verified: {len(notifs['notifications'])} alerts, {notifs['unread_count']} unread")

        test_alert_res = client.post("/api/notifications/test-alert", json={
            "title": "Automated Unit Test Alert",
            "message": "Testing webhook dispatcher.",
            "severity": "INFO"
        })
        assert test_alert_res.status_code == 200
        print("[PASS] Outbound Alert Dispatcher test passed")

        # 14. Executive SOC 2 Compliance Report
        report_res = client.get("/api/reports/soc2-summary")
        assert report_res.status_code == 200
        report_data = report_res.json()
        assert "audit_readiness_score" in report_data
        assert "inventory_summary" in report_data
        print(f"[PASS] Executive SOC 2 Compliance Report generated: Report ID {report_data['report_id']}")

        html_report_res = client.get("/api/reports/soc2-summary/html")
        assert html_report_res.status_code == 200
        assert "SOC 2 Type II" in html_report_res.text
        print("[PASS] Printable SOC 2 Compliance HTML Report rendered successfully")

        print("\n=== ALL API & WORKFLOW INTEGRATION TESTS PASSED 100%! ===")

if __name__ == "__main__":
    test_full_system_api()
