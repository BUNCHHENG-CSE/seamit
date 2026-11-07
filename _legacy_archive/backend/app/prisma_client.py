import os
import asyncio
from typing import Optional
from prisma import Prisma

_prisma_client: Optional[Prisma] = None

def get_prisma() -> Prisma:
    """Returns the singleton Prisma client instance."""
    global _prisma_client
    if _prisma_client is None:
        _prisma_client = Prisma(auto_register=True)
    return _prisma_client

async def connect_prisma() -> bool:
    """Connects the Prisma Query Engine to PostgreSQL."""
    from app.database import is_postgres
    if not is_postgres():
        print("[INFO] SQLite database configured for local mode (Prisma PostgreSQL engine skipped).")
        return False

    client = get_prisma()
    if not client.is_connected():
        try:
            await client.connect()
            print("[INFO] Prisma ORM connected successfully to PostgreSQL Query Engine.")
            return True
        except Exception as e:
            print(f"[WARNING] Prisma ORM connection deferred: {e}")
            return False
    return True

async def disconnect_prisma():
    """Cleanly disconnects the Prisma Query Engine on shutdown."""
    global _prisma_client
    if _prisma_client is not None and _prisma_client.is_connected():
        try:
            await _prisma_client.disconnect()
            print("[INFO] Prisma ORM disconnected.")
        except Exception:
            pass
