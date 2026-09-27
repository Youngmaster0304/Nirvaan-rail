import json
import networkx as nx
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class CorridorGraph:
    """NetworkX graph of the corridors in app/data/corridors.json + stations.json."""
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(CorridorGraph, cls).__new__(cls)
        return cls._instance

    def __init__(self, json_path: Optional[str] = None, stations_path: Optional[str] = None):
        if getattr(self, "graph", None) is not None:
            return
        self.json_path = Path(json_path) if json_path else DATA_DIR / "corridors.json"
        self.stations_path = Path(stations_path) if stations_path else DATA_DIR / "stations.json"
        self.graph = self.build_graph()

    @staticmethod
    def _load(path: Path, default: Any) -> Any:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as fh:
                    return json.load(fh)
        except (OSError, json.JSONDecodeError):
            pass
        return default

    def _corridors(self) -> List[Dict[str, Any]]:
        data = self._load(self.json_path, [])
        if isinstance(data, dict):
            data = [data]
        return data

    def build_graph(self) -> nx.Graph:
        graph = nx.Graph()

        for station in self._load(self.stations_path, []):
            graph.add_node(
                station["code"],
                code=station["code"],
                name=station.get("name", station["code"]),
                zone=station.get("zone", ""),
                state=station.get("state", ""),
                lat=station.get("latitude"),
                lon=station.get("longitude"),
            )

        for corridor in self._corridors():
            corridor_id = corridor.get("corridor_id", "")
            corridor_name = corridor.get("corridor_name", "")
            for section in corridor.get("sections", []):
                start = section.get("from_code") or section.get("start")
                end = section.get("to_code") or section.get("end")
                if not start or not end:
                    continue
                for code, name in ((start, section.get("from_name")), (end, section.get("to_name"))):
                    if code not in graph:
                        graph.add_node(code, code=code, name=name or code, zone="", state="", lat=None, lon=None)
                graph.add_edge(
                    start, end,
                    section_id=section.get("section_id", f"{start}-{end}"),
                    corridor_id=corridor_id,
                    corridor_name=corridor_name,
                    distance_km=section.get("distance_km"),
                    max_speed=section.get("max_speed") or section.get("max_speed_kmph"),
                    num_tracks=section.get("num_tracks"),
                    section_type=section.get("section_type", "TRUNK"),
                    from_code=start,
                    to_code=end,
                    from_name=section.get("from_name", start),
                    to_name=section.get("to_name", end),
                )
        return graph

    def corridor_sections(self, corridor_id: str) -> List[Dict[str, Any]]:
        """Section attributes for one corridor, in file order."""
        for corridor in self._corridors():
            if corridor.get("corridor_id") == corridor_id:
                return [
                    dict(section, corridor_id=corridor.get("corridor_id", ""), corridor_name=corridor.get("corridor_name", ""))
                    for section in corridor.get("sections", [])
                ]
        return []

    def get_adjacent_sections(self, section_id: str) -> List[str]:
        """Sections sharing a station with the given section."""
        target_edge = None
        for u, v, data in self.graph.edges(data=True):
            if data.get("section_id") == section_id:
                target_edge = (u, v)
                break
        if not target_edge:
            return []

        u, v = target_edge
        adjacent = []
        for neighbor in self.graph.neighbors(u):
            if neighbor != v:
                edge_data = self.graph.get_edge_data(u, neighbor)
                if edge_data and edge_data.get("section_id"):
                    adjacent.append(edge_data["section_id"])
        for neighbor in self.graph.neighbors(v):
            if neighbor != u:
                edge_data = self.graph.get_edge_data(v, neighbor)
                if edge_data and edge_data.get("section_id"):
                    adjacent.append(edge_data["section_id"])
        return sorted(set(adjacent))

    def are_conflicting(self, section_a: str, section_b: str) -> bool:
        """Two sections conflict when they share infrastructure."""
        if section_a == section_b:
            return True
        return section_b in self.get_adjacent_sections(section_a)

    def get_corridor_path(self, corridor_id: str) -> List[str]:
        """Ordered station codes along a corridor."""
        sections = self.corridor_sections(corridor_id)
        if not sections:
            if corridor_id in ("DELHI_HOWRAH", "delhi_howrah"):
                sections = self.corridor_sections("CORR-1")
            else:
                return sorted(self.graph.nodes())
        if not sections:
            return sorted(self.graph.nodes())

        starts = {s.get("from_code") for s in sections}
        ends = {s.get("to_code") for s in sections}
        ordered = sorted(sections, key=lambda s: s.get("from_code") not in (starts - ends))
        path = [ordered[0].get("from_code")]
        for section in ordered:
            path.append(section.get("to_code"))
        return path

    def get_sections_between(self, station_a: str, station_b: str) -> List[str]:
        """Section ids on the shortest path between two stations."""
        try:
            path = nx.shortest_path(self.graph, source=station_a, target=station_b)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []
        sections = []
        for i in range(len(path) - 1):
            edge_data = self.graph.get_edge_data(path[i], path[i + 1]) or {}
            if edge_data.get("section_id"):
                sections.append(edge_data["section_id"])
        return sections

    def find_alternative_routes(self, blocked_section_id: str) -> List[List[str]]:
        """Alternative station paths bypassing a blocked section."""
        target_edge = None
        for u, v, data in self.graph.edges(data=True):
            if data.get("section_id") == blocked_section_id:
                target_edge = (u, v)
                break
        if not target_edge:
            return []

        temp_graph = self.graph.copy()
        temp_graph.remove_edge(*target_edge)
        try:
            paths = list(nx.all_simple_paths(temp_graph, target_edge[0], target_edge[1]))
        except nx.NetworkXNoPath:
            return []
        return paths[:5]

    def calculate_delay_propagation(self, blocked_section_id: str, block_duration_min: int) -> Dict[str, float]:
        """BFS decay of delay from a blocked section onto neighbouring sections."""
        target_edge = None
        for u, v, data in self.graph.edges(data=True):
            if data.get("section_id") == blocked_section_id:
                target_edge = (u, v)
                break
        if not target_edge:
            return {}

        delays: Dict[str, float] = {}
        queue = [(target_edge[0], 0), (target_edge[1], 0)]
        visited = {target_edge[0], target_edge[1]}
        while queue:
            node, dist = queue.pop(0)
            for neighbor in self.graph.neighbors(node):
                if neighbor not in visited:
                    visited.add(neighbor)
                    edge_data = self.graph.get_edge_data(node, neighbor)
                    if edge_data and edge_data.get("section_id"):
                        delays[edge_data["section_id"]] = block_duration_min / (dist + 2)
                    queue.append((neighbor, dist + 1))
        return delays

    def get_corridor_topology_json(self) -> Dict[str, Any]:
        """Exportable node-link graph for frontend visualisation."""
        return nx.node_link_data(self.graph)

    def get_section_info(self, section_id: str) -> Dict[str, Any]:
        """Attributes of one section."""
        for _, _, data in self.graph.edges(data=True):
            if data.get("section_id") == section_id:
                return dict(data)
        return {}
