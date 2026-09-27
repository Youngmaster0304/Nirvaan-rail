from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import os
from pathlib import Path

import httpx

from app.config import settings
from app.schemas import GovDatasetInfo, GovDatasetListResponse, GovLiveResponse

router = APIRouter(prefix="/api/gov", tags=["Government Data"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
LIVE_TIMEOUT_SECONDS = 6.0


def _fallback() -> Dict[str, Any]:
    path = DATA_DIR / "gov_fallback.json"
    if not path.exists():
        return {"_note": "", "datasets": {}}
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _api_key() -> str:
    return (settings.DATA_GOV_IN_API_KEY or os.getenv("DATA_GOV_IN_API_KEY", "")).strip()


def _resource_ids(dataset: str) -> List[str]:
    raw = settings.DATA_GOV_IN_RESOURCE_IDS or os.getenv("DATA_GOV_IN_RESOURCE_IDS", "")
    ids: List[str] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        if ":" in entry:
            key, resource_id = entry.split(":", 1)
            if key.strip() == dataset:
                ids.append(resource_id.strip())
        else:
            ids.append(entry)
    return ids


async def _fetch_live(dataset: str) -> Optional[List[Dict[str, Any]]]:
    api_key = _api_key()
    resource_ids = _resource_ids(dataset)
    if not api_key or not resource_ids:
        return None
    try:
        async with httpx.AsyncClient(timeout=LIVE_TIMEOUT_SECONDS) as client:
            for resource_id in resource_ids:
                response = await client.get(
                    f"https://api.data.gov.in/resource/{resource_id}",
                    params={"api-key": api_key, "format": "json", "limit": 50},
                )
                if response.status_code != 200:
                    continue
                payload = response.json()
                records = payload.get("records") or payload.get("result") or []
                if isinstance(records, list) and records:
                    return records
    except Exception:
        return None
    return None


@router.get("/datasets", response_model=GovDatasetListResponse)
async def list_datasets():
    """Lists the datasets available to /api/gov/railway-live."""
    datasets = _fallback().get("datasets", {})
    items = [
        GovDatasetInfo(key=key, title=value.get("title", key), description=value.get("description", ""),
                       source=value.get("source", ""))
        for key, value in datasets.items()
    ]
    return GovDatasetListResponse(items=items, keys=[item.key for item in items], total=len(items))


@router.get("/railway-live", response_model=GovLiveResponse)
async def railway_live(
    dataset: str = Query("railway-stations", description="Dataset key from /api/gov/datasets"),
):
    """Returns government open-data records (live data.gov.in when configured, bundled fallback otherwise)."""
    fallback = _fallback()
    bundled = (fallback.get("datasets") or {}).get(dataset)
    if bundled is None and not _resource_ids(dataset):
        raise HTTPException(status_code=404, detail=f"Unknown dataset '{dataset}'")

    records = await _fetch_live(dataset)
    if records is not None:
        return GovLiveResponse(
            source="data.gov.in",
            dataset=dataset,
            fetched_at=datetime.utcnow(),
            records=records,
            cached=False,
            note="Live records fetched from data.gov.in.",
        )

    records = list((bundled or {}).get("records", []))
    if _api_key() and _resource_ids(dataset):
        note = "Live data.gov.in fetch failed or returned no records; serving bundled fallback. " + fallback.get("_note", "")
    else:
        note = "Bundled offline fallback. " + fallback.get("_note", "")
    return GovLiveResponse(
        source=(bundled or {}).get("source", "bundled fallback"),
        dataset=dataset,
        fetched_at=datetime.utcnow(),
        records=records,
        cached=True,
        note=note,
    )
