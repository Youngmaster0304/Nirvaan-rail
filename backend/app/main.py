from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
import logging

from app.config import settings
from app.database import init_db, async_session
from app.data.seed import seed_if_empty
from app.ml.model_manager import ensure_model_exists
from app.models import MaintenanceTask
from app.optimization.corridor_graph import CorridorGraph
from app.routers import auth, tasks, prioritize, optimize, simulate, audit, corridors, reports, chat, gov

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SIH26027 AI Block Planning System",
    description="AI-Powered Automatic Block Planning for Indian Railways",
    version=settings.VERSION,
)

cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(prioritize.router)
app.include_router(optimize.router)
app.include_router(simulate.router)
app.include_router(audit.router)
app.include_router(corridors.router)
app.include_router(reports.router)
app.include_router(chat.router)
app.include_router(gov.router)


@app.on_event("startup")
async def startup_event():
    """Creates tables, seeds demo data, ensures the model exists and builds the corridor graph."""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized.")

    try:
        seeded = await seed_if_empty()
        if seeded:
            logger.info("Seeded demo data: %s", seeded)
    except Exception:
        logger.exception("Seeding failed; continuing with existing data")

    try:
        ensure_model_exists()
    except Exception:
        logger.exception("Model training failed; /api/prioritize will retrain on first use")

    graph = CorridorGraph()
    logger.info(
        "Corridor graph ready: %d stations, %d sections",
        graph.graph.number_of_nodes(),
        graph.graph.number_of_edges(),
    )
    logger.info("Startup complete.")


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    try:
        async with async_session() as session:
            task_count = int((await session.execute(select(func.count()).select_from(MaintenanceTask))).scalar_one())
    except Exception:
        task_count = 0

    return {
        "status": "ok",
        "model": "LightGBM",
        "tasks": task_count,
        "version": settings.VERSION,
    }


@app.get("/", include_in_schema=False)
async def root():
    """Root redirect to /docs."""
    return RedirectResponse(url="/docs")
