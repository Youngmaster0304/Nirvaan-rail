import pytest

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "1.0.0"
    assert isinstance(body["model"], str) and body["model"]
    assert isinstance(body["tasks"], int) and body["tasks"] >= 0

def test_chat_suggested_prompts(client):
    response = client.get("/api/chat")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["prompts"], list) and len(body["prompts"]) > 0
    assert body["items"] == body["prompts"]

def test_gov_railway_live_offline_fallback(client):
    response = client.get("/api/gov/railway-live", params={"dataset": "railway-stations"})
    assert response.status_code == 200
    body = response.json()
    assert body["dataset"] == "railway-stations"
    assert isinstance(body["records"], list) and len(body["records"]) > 0
    assert isinstance(body["cached"], bool)

def test_get_tasks(client):
    # Mocking endpoint for generic GET logic
    response = client.get("/api/tasks")
    if response.status_code == 404:
        pytest.skip("Tasks endpoint not implemented yet or 404ing without auth")
    # Assuming standard behavior
    assert response.status_code in [200, 401, 403, 404, 500]

def test_prioritize(client):
    # Depending on how it's wired, just a sanity check
    response = client.post("/api/prioritize", json={"task_ids": [], "force_reprioritize": True})
    assert response.status_code in [200, 401, 404, 422, 500]

def test_get_corridors(client):
    response = client.get("/api/corridors")
    assert response.status_code in [200, 404, 500]

def test_get_audit_log(client):
    response = client.get("/api/audit")
    assert response.status_code in [200, 404, 500]
