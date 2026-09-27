from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import date as _date

class SectionResponse(BaseModel):
    section_id: str
    name: str
    length_km: float
    from_station_code: str = ""
    to_station_code: str = ""

class CorridorResponse(BaseModel):
    corridor_id: str
    name: str
    sections: List[SectionResponse]
    zone: str = ""
    from_station_name: str = ""
    to_station_name: str = ""
    total_sections: int = 0

class CorridorListResponse(BaseModel):
    items: List[CorridorResponse]
    total: int

class CorridorKPIResponse(BaseModel):
    corridor_id: str
    name: str
    punctuality: float
    block_reliability: float
    block_productivity: float
    asset_failure_rate: float
    composite_score: float
    date: Optional[_date] = None

class CorridorKPIListResponse(BaseModel):
    items: List[CorridorKPIResponse]
    total: int

class CorridorTopology(BaseModel):
    nodes: List[Dict[str, Any]] = Field(description="List of station dicts")
    edges: List[Dict[str, Any]] = Field(description="List of section dicts")
