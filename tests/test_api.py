"""API tests for the WorkRobo.ai backend (no external services needed)."""
STREAM = {"name": "Lead sync", "description": "Scrape and email", "nodes": [{"id": "n1"}], "edges": []}


# ---------- public endpoints ----------

def test_root_and_health(anonymous):
    assert anonymous.get("/api/").json()["message"] == "WorkRobo.ai API"
    health = anonymous.get("/api/health").json()
    assert health["status"] == "healthy"
    assert health["websocket_connections"] == 0


def test_protected_endpoints_reject_missing_token(anonymous):
    for method, url in [("get", "/api/streams"), ("post", "/api/streams"), ("get", "/api/stats"),
                        ("get", "/api/hive"), ("get", "/api/sentry"), ("get", "/api/pulse/lists")]:
        response = anonymous.post(url, json=STREAM) if method == "post" else anonymous.get(url)
        assert response.status_code == 401, (method, url, response.status_code)


# ---------- Robo-Streams ----------

def test_stream_lifecycle(alice):
    created = alice.post("/api/streams", json=STREAM).json()
    assert created["name"] == "Lead sync" and created["is_active"] is False
    sid = created["id"]

    assert [s["id"] for s in alice.get("/api/streams").json()] == [sid]
    assert alice.get(f"/api/streams/{sid}").json()["description"] == "Scrape and email"

    updated = alice.put(f"/api/streams/{sid}", json={**STREAM, "name": "Lead sync v2"}).json()
    assert updated["name"] == "Lead sync v2"

    assert alice.post(f"/api/streams/{sid}/toggle").json() == {"is_active": True}
    assert alice.post(f"/api/streams/{sid}/toggle").json() == {"is_active": False}

    assert alice.delete(f"/api/streams/{sid}").status_code == 200
    assert alice.get(f"/api/streams/{sid}").status_code == 404


def test_missing_stream_returns_404(alice):
    assert alice.get("/api/streams/nope").status_code == 404
    assert alice.delete("/api/streams/nope").status_code == 404
    assert alice.post("/api/streams/nope/toggle").status_code == 404


def test_users_cannot_see_each_others_streams(alice, switch_user, bob):
    sid = alice.post("/api/streams", json=STREAM).json()["id"]
    switch_user(bob)
    assert alice.get("/api/streams").json() == []
    assert alice.get(f"/api/streams/{sid}").status_code == 404
    assert alice.delete(f"/api/streams/{sid}").status_code == 404


def test_stream_validation(alice):
    assert alice.post("/api/streams", json={"description": "no name"}).status_code == 422


# ---------- WorkRobos ----------

def test_workrobo_activation(alice):
    robo = alice.post("/api/hive", json={"name": "Inbox bot", "trigger_type": "schedule"}).json()
    rid = robo["id"]
    assert alice.post(f"/api/hive/{rid}/activate").json() == {"state": "active"}
    assert alice.post(f"/api/hive/{rid}/deactivate").json() == {"state": "idle"}
    assert alice.post("/api/hive/nope/activate").status_code == 404


# ---------- Sentry ----------

def test_sentry_target_create_list_delete(alice):
    target = alice.post("/api/sentry", json={"name": "Pricing page", "url": "https://example.com/pricing"}).json()
    assert [t["id"] for t in alice.get("/api/sentry").json()] == [target["id"]]
    assert alice.delete(f"/api/sentry/{target['id']}").status_code == 200
    assert alice.get("/api/sentry").json() == []


# ---------- Pulse ----------

def test_pulse_list_and_contacts(alice):
    lst = alice.post("/api/pulse/lists", json={"name": "Newsletter"}).json()
    ok = alice.post(f"/api/pulse/lists/{lst['id']}/contacts", json={"email": "lead@example.com", "name": "Lead"})
    assert ok.status_code == 200
    contacts = alice.get(f"/api/pulse/lists/{lst['id']}/contacts").json()
    assert [c["email"] for c in contacts] == ["lead@example.com"]


def test_pulse_rejects_invalid_email(alice):
    lst = alice.post("/api/pulse/lists", json={"name": "Newsletter"}).json()
    bad = alice.post(f"/api/pulse/lists/{lst['id']}/contacts", json={"email": "not-an-email"})
    assert bad.status_code == 422


# ---------- Stats ----------

def test_stats_count_only_the_users_data(alice, switch_user, bob):
    s1 = alice.post("/api/streams", json=STREAM).json()["id"]
    alice.post("/api/streams", json=STREAM)
    alice.post(f"/api/streams/{s1}/toggle")
    alice.post("/api/hive", json={"name": "Bot", "trigger_type": "webhook"})

    stats = alice.get("/api/stats").json()
    assert stats["streams"] == {"total": 2, "active": 1}
    assert stats["robos"] == {"total": 1, "active": 0}

    switch_user(bob)
    assert alice.get("/api/stats").json()["streams"] == {"total": 0, "active": 0}
