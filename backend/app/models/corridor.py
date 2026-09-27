from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Float, Date, ForeignKey
from datetime import date
from .base import BaseModel

class Corridor(BaseModel):
    __tablename__ = "corridors"

    corridor_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    from_station_code: Mapped[str] = mapped_column(String)
    from_station_name: Mapped[str] = mapped_column(String)
    to_station_code: Mapped[str] = mapped_column(String)
    to_station_name: Mapped[str] = mapped_column(String)
    total_sections: Mapped[int] = mapped_column(Integer)
    zone: Mapped[str] = mapped_column(String)
    track_type: Mapped[str] = mapped_column(String)

class Section(BaseModel):
    __tablename__ = "sections"

    section_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    corridor_id: Mapped[str] = mapped_column(String, ForeignKey("corridors.corridor_id"))
    from_station_code: Mapped[str] = mapped_column(String)
    from_station_name: Mapped[str] = mapped_column(String)
    to_station_code: Mapped[str] = mapped_column(String)
    to_station_name: Mapped[str] = mapped_column(String)
    distance_km: Mapped[float] = mapped_column(Float)
    section_type: Mapped[str] = mapped_column(String)
    max_speed_kmph: Mapped[int] = mapped_column(Integer)
    num_tracks: Mapped[int] = mapped_column(Integer)

class CorridorKPI(BaseModel):
    __tablename__ = "corridor_kpis"

    corridor_id: Mapped[str] = mapped_column(String, ForeignKey("corridors.corridor_id"))
    date: Mapped[date] = mapped_column(Date)
    punctuality_pct: Mapped[float] = mapped_column(Float)
    block_reliability_pct: Mapped[float] = mapped_column(Float)
    block_productivity_pct: Mapped[float] = mapped_column(Float)
    asset_failure_rate: Mapped[float] = mapped_column(Float)
    composite_score: Mapped[float] = mapped_column(Float)
