import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy import func, select

from app.database import async_session
from app.models import Corridor, CorridorKPI, MaintenanceTask, Section, User
from app.services.scoring_service import score_and_persist

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent


def _load_json(filename: str) -> Any:
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


async def _count(session, model) -> int:
    result = await session.execute(select(func.count()).select_from(model))
    return int(result.scalar_one())


def _corridor_rows(corridors: List[Dict[str, Any]], stations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    station_by_code = {s["code"]: s for s in stations}
    rows = []
    for corr in corridors:
        sections = corr["sections"]
        if not sections:
            continue
        first, last = sections[0], sections[-1]
        from_station = station_by_code.get(first["from_code"], {})
        rows.append({
            "corridor_id": corr["corridor_id"],
            "name": corr.get("corridor_name", corr["corridor_id"]),
            "from_station_code": first["from_code"],
            "from_station_name": first.get("from_name", first["from_code"]),
            "to_station_code": last["to_code"],
            "to_station_name": last.get("to_name", last["to_code"]),
            "total_sections": len(sections),
            "zone": from_station.get("zone", "IR"),
            "track_type": first.get("section_type", "TRUNK"),
        })
    return rows


def _section_rows(corridors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows = []
    for corr in corridors:
        for sec in corr["sections"]:
            rows.append({
                "section_id": sec["section_id"],
                "corridor_id": corr["corridor_id"],
                "from_station_code": sec["from_code"],
                "from_station_name": sec.get("from_name", sec["from_code"]),
                "to_station_code": sec["to_code"],
                "to_station_name": sec.get("to_name", sec["to_code"]),
                "distance_km": float(sec.get("distance_km", 0.0)),
                "section_type": sec.get("section_type", "TRUNK"),
                "max_speed_kmph": int(sec.get("max_speed", 100)),
                "num_tracks": int(sec.get("num_tracks", 2)),
            })
    return rows


async def seed_database(session) -> Dict[str, int]:
    """Fills empty tables only. Safe to call on every startup."""
    from app.data.synthetic_generator import SyntheticDataGenerator

    stats = {"users": 0, "corridors": 0, "sections": 0, "kpis": 0, "tasks": 0}
    generator = SyntheticDataGenerator()

    if await _count(session, User) == 0:
        for row in generator.generate_users():
            session.add(User(**row))
        await session.commit()
        stats["users"] = await _count(session, User)
        logger.info("Seeded %s demo users", stats["users"])

    corridors = _load_json("corridors.json")
    stations = _load_json("stations.json")

    if await _count(session, Corridor) == 0:
        for row in _corridor_rows(corridors, stations):
            session.add(Corridor(**row))
        for row in _section_rows(corridors):
            session.add(Section(**row))
        for row in generator.generate_kpis(corridors):
            row["date"] = datetime.date.fromisoformat(row["date"])
            session.add(CorridorKPI(**row))
        await session.commit()
        stats["corridors"] = await _count(session, Corridor)
        stats["sections"] = await _count(session, Section)
        stats["kpis"] = await _count(session, CorridorKPI)
        logger.info(
            "Seeded %s corridors, %s sections, %s KPI rows",
            stats["corridors"], stats["sections"], stats["kpis"],
        )

    if await _count(session, MaintenanceTask) == 0:
        rows = generator.generate_tasks(corridors)
        tasks = [MaintenanceTask(**row) for row in rows]
        session.add_all(tasks)
        await session.commit()
        stats["tasks"] = await _count(session, MaintenanceTask)
        logger.info("Seeded %s maintenance tasks", stats["tasks"])
        try:
            await score_and_persist(session, tasks, force=True)
        except Exception:
            logger.exception("Initial task scoring failed; scores will be computed on first prioritisation")
            await session.rollback()

    return stats


async def seed_if_empty() -> Dict[str, int]:
    async with async_session() as session:
        return await seed_database(session)
