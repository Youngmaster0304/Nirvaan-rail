import pytest

def test_graph_construction(corridor_graph):
    assert len(corridor_graph.graph.nodes) > 0
    assert len(corridor_graph.graph.edges) > 0

def test_adjacent_sections(corridor_graph):
    adj = corridor_graph.get_adjacent_sections("SEC_1")
    assert isinstance(adj, list)

def test_conflict_detection(corridor_graph):
    # This might depend on your dummy data in corridor_graph
    # Assuming SEC_1 and SEC_2 both connect to NDLS
    conflicts = corridor_graph.are_conflicting("SEC_1", "SEC_2")
    assert isinstance(conflicts, bool)

def test_corridor_path(corridor_graph):
    path = corridor_graph.get_corridor_path("DELHI_HOWRAH")
    assert isinstance(path, list)
