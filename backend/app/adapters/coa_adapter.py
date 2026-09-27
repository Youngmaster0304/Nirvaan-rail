import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class COAAdapter:
    """
    Mock COA (Control Office Application) client.
    """
    def __init__(self):
        self.system_name = "COA"

    def fetch_timetable(self, corridor_id: str) -> List[Dict[str, Any]]:
        """Mock fetching train schedule for corridor."""
        logger.info(f"[{self.system_name}] Fetching timetable for {corridor_id}...")
        return [
            {"train_no": "12001", "type": "PASSENGER", "start": "06:00", "end": "10:00"},
            {"train_no": "12002", "type": "PASSENGER", "start": "11:00", "end": "15:00"},
        ]

    def fetch_freight_forecast(self, corridor_id: str) -> List[Dict[str, Any]]:
        """Mock fetching expected freight trains for next 7 days."""
        logger.info(f"[{self.system_name}] Fetching freight forecast for {corridor_id}...")
        return [{"date": "2024-10-01", "freight_count": 15}]

    def get_block_availability(self, section_id: str, date_range: tuple) -> List[Dict[str, Any]]:
        """Returns realistic data: which hours are free of train traffic."""
        logger.info(f"[{self.system_name}] Checking block availability for {section_id}...")
        return [
            {"date": date_range[0], "start_time": "02:00", "end_time": "05:00", "duration_min": 180},
            {"date": date_range[0], "start_time": "14:00", "end_time": "16:00", "duration_min": 120}
        ]
