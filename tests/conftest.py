"""Shared fixtures: the real FastAPI app on its in-memory Mongo mock, with auth stubbed per test."""
import asyncio
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import server  # noqa: E402  (needs the path above)

ALICE = {"id": "user-alice", "email": "alice@example.com"}
BOB = {"id": "user-bob", "email": "bob@example.com"}


@pytest.fixture(autouse=True)
def clean_db():
    """Each test starts with empty collections."""
    async def _wipe():
        for name in ("streams", "scheduler", "sentry_targets", "pulse_lists", "pulse_contacts",
                     "pulse_campaigns", "workrobos"):
            await server.db[name].delete_many({})  # the Mongo mock is async

    asyncio.run(_wipe())
    yield
    server.app.dependency_overrides.clear()


def _client_as(user):
    server.app.dependency_overrides[server.get_current_user] = lambda: user
    # Not used as a context manager, so startup hooks (browser scraper, scheduler) never run.
    return TestClient(server.app)


@pytest.fixture
def alice():
    return _client_as(ALICE)


@pytest.fixture
def bob():
    return BOB


@pytest.fixture
def anonymous():
    server.app.dependency_overrides.clear()
    return TestClient(server.app)


@pytest.fixture
def switch_user():
    """Return a function that re-points the auth override to another user."""
    def _switch(user):
        server.app.dependency_overrides[server.get_current_user] = lambda: user
    return _switch
