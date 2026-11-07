import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db
from app.seed_data import seed_database
from app.prisma_client import connect_prisma, disconnect_prisma
from app.engine.scheduler import background_scheduler_loop

from app.routers import (
    assets,
    rules,
    webhooks,
    simulator,
    connectors,
    audit_logs,
    discrepancies,
    notifications,
    reports
)

scheduler_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    seed_database(force=False)
    await connect_prisma()
    
    global scheduler_task
    if settings.scheduler_enabled:
        scheduler_task = asyncio.create_task(
            background_scheduler_loop(settings.scheduler_interval_seconds)
        )
    
    yield
    
    # Shutdown
    if scheduler_task and not scheduler_task.done():
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
    await disconnect_prisma()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=settings.app_description,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(assets.router)
app.include_router(rules.router)
app.include_router(webhooks.router)
app.include_router(simulator.router)
app.include_router(connectors.router)
app.include_router(audit_logs.router)
app.include_router(discrepancies.router)
app.include_router(notifications.router)
app.include_router(reports.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "scheduler_active": bool(scheduler_task and not scheduler_task.done())
    }

# Serve frontend build if dist folder exists
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets_static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api"):
            return None
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": "Frontend build not found. Run npm run build in frontend directory."}
