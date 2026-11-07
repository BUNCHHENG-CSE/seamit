import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from prisma import Prisma
from app.config import settings

async def main():
    print("=" * 60)
    print("   SeamIT Prisma ORM & PostgreSQL Connectivity Test")
    print("=" * 60)
    print(f"Target DB URL: {settings.database_url}")
    
    os.environ["DATABASE_URL"] = settings.database_url
    prisma = Prisma()
    print("\n[1/4] Connecting Prisma Client to PostgreSQL...")
    await prisma.connect()
    print("[PASS] Successfully connected to PostgreSQL via Prisma Query Engine!")

    print("\n[2/4] Querying Asset inventory via Prisma ORM...")
    assets = await prisma.asset.find_many(take=5)
    print(f"[PASS] Retrieved {len(assets)} assets:")
    for a in assets:
        print(f"  - [{a.asset_tag}] {a.model} (Status: {a.status}, Assignee: {a.assigned_to_email or 'None'})")

    print("\n[3/4] Querying active Automation Rules via Prisma ORM...")
    rules = await prisma.rule.find_many(where={"is_enabled": True})
    print(f"[PASS] Retrieved {len(rules)} active automation rules:")
    for r in rules:
        print(f"  - [{r.source}] {r.name} (Executions: {r.execution_count})")

    print("\n[4/4] Querying Audit Trail / Sync Logs with JSONB parsing...")
    logs = await prisma.synclog.find_many(take=3, order={"timestamp": "desc"})
    print(f"[PASS] Retrieved {len(logs)} recent audit logs:")
    for l in logs:
        print(f"  - [{l.timestamp}] {l.action_summary} ({l.status})")

    await prisma.disconnect()
    print("\nPrisma client cleanly disconnected.")
    print("=" * 60)
    print("   ALL PRISMA ORM CHECKS PASSED WITH ZERO ERRORS!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
