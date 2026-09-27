from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class GovDatasetInfo(BaseModel):
    key: str
    title: str
    description: str
    source: str

class GovDatasetListResponse(BaseModel):
    items: List[GovDatasetInfo]
    keys: List[str]
    total: int

class GovLiveResponse(BaseModel):
    source: str
    dataset: str
    fetched_at: datetime
    records: List[Dict[str, Any]]
    cached: bool
    note: str = ""
