from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
import datetime
import json
from pathlib import Path
from functools import lru_cache

from app.database import get_db
from app.models import Corridor, Section, CorridorKPI
from app.schemas import (
    CorridorResponse,
    CorridorListResponse,
    CorridorTopology,
    CorridorKPIResponse,
    CorridorKPIListResponse,
    SectionResponse,
)

router = APIRouter(prefix="/api/corridors", tags=["Corridors"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@lru_cache(maxsize=1)
def _stations() -> Dict[str, Dict[str, Any]]:
    path = DATA_DIR / "stations.json"
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as fh:
        return {s["code"]: s for s in json.load(fh)}


@router.get("", response_model=CorridorListResponse)
async def get_corridors(db: AsyncSession = Depends(get_db)):
    """Returns all corridors with their sections."""
    corridors = list((await db.execute(select(Corridor).order_by(Corridor.corridor_id))).scalars().all())
    sections = list((await db.execute(select(Section).order_by(Section.section_id))).scalars().all())

    by_corridor: Dict[str, List[Section]] = {}
    for section in sections:
        by_corridor.setdefault(section.corridor_id, []).append(section)

    items = [
        CorridorResponse(
            corridor_id=corridor.corridor_id,
            name=corridor.name,
            zone=corridor.zone,
            from_station_name=corridor.from_station_name,
            to_station_name=corridor.to_station_name,
            total_sections=corridor.total_sections,
            sections=[
                SectionResponse(
                    section_id=section.section_id,
                    name=f"{section.from_station_name} – {section.to_station_name}",
                    length_km=section.distance_km,
                    from_station_code=section.from_station_code,
                    to_station_code=section.to_station_code,
                )
                for section in by_corridor.get(corridor.corridor_id, [])
            ],
        )
        for corridor in corridors
    ]
    return CorridorListResponse(items=items, total=len(items))


@router.get("/kpis", response_model=CorridorKPIListResponse)
async def get_corridor_kpis(
    days: Optional[int] = Query(None, ge=1, le=180, description="Return a per-day history instead of the latest snapshot"),
    db: AsyncSession = Depends(get_db)
):
    """Returns corridor KPIs (latest snapshot per corridor, or daily history)."""
    corridors = {c.corridor_id: c.name for c in (await db.execute(select(Corridor))).scalars().all()}
    query = select(CorridorKPI)
    if days:
        cutoff = datetime.date.today() - datetime.timedelta(days=days)
        query = query.where(CorridorKPI.date >= cutoff)
    kpis = list((await db.execute(query.order_by(CorridorKPI.date.desc()))).scalars().all())

    if not days:
        latest: Dict[str, CorridorKPI] = {}
        for kpi in kpis:
            latest.setdefault(kpi.corridor_id, kpi)
        kpis = list(latest.values())

    items = [
        CorridorKPIResponse(
            corridor_id=kpi.corridor_id,
            name=corridors.get(kpi.corridor_id, kpi.corridor_id),
            punctuality=kpi.punctuality_pct,
            block_reliability=kpi.block_reliability_pct,
            block_productivity=kpi.block_productivity_pct,
            asset_failure_rate=kpi.asset_failure_rate,
            composite_score=kpi.composite_score,
            date=kpi.date,
        )
        for kpi in kpis
    ]
    return CorridorKPIListResponse(items=items, total=len(items))


@router.get("/{corridor_id}/topology", response_model=CorridorTopology)
async def get_corridor_topology(corridor_id: str, db: AsyncSession = Depends(get_db)):
    """Returns stations and sections of one corridor as a graph for the frontend map."""
    sections = list((await db.execute(
        select(Section).where(Section.corridor_id == corridor_id).order_by(Section.section_id)
    )).scalars().all())
    if not sections:
        raise HTTPException(status_code=404, detail="Corridor not found")

    stations = _stations()
    codes = set()
    for section in sections:
        codes.add(section.from_station_code)
        codes.add(section.to_station_code)

    nodes = []
    for code in sorted(codes):
        station = stations.get(code, {})
        nodes.append({
            "id": code,
            "code": code,
            "name": station.get("name", code),
            "zone": station.get("zone", ""),
            "state": station.get("state", ""),
            "lat": station.get("latitude", station.get("lat")),
            "lon": station.get("longitude", station.get("lon")),
        })

    edges = [
        {
            "id": section.section_id,
            "section_id": section.section_id,
            "source": section.from_station_code,
            "target": section.to_station_code,
            "from_code": section.from_station_code,
            "to_code": section.to_station_code,
            "name": f"{section.from_station_name} – {section.to_station_name}",
            "distance_km": section.distance_km,
            "max_speed_kmph": section.max_speed_kmph,
            "num_tracks": section.num_tracks,
            "section_type": section.section_type,
        }
        for section in sections
    ]
    return CorridorTopology(nodes=nodes, edges=edges)
