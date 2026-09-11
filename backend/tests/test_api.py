import os
import tempfile
from pathlib import Path

workspace = Path(tempfile.mkdtemp())
os.environ["DATABASE_PATH"] = str(workspace / "test.db")
os.environ["SESSION_SECRET"] = "test-secret"

from fastapi.testclient import TestClient
import app.main as main
from app.main import app


def login(client: TestClient, email: str = "staff@mingalarbank.com") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": "ChangeMe123!"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_health_and_authenticated_conversation_flow():
    with TestClient(app) as client:
        assert client.get("/api/v1/health").json()["status"] == "ok"
        headers = login(client)
        conversation = client.post("/api/v1/conversations", headers=headers, json={"title": "Card support", "category": "Cards"})
        assert conversation.status_code == 201
        message = client.post(f"/api/v1/conversations/{conversation.json()['id']}/messages", headers=headers, json={"role": "user", "content": "I need help", "is_voice": True})
        assert message.status_code == 201
        details = client.get(f"/api/v1/conversations/{conversation.json()['id']}", headers=headers)
        assert len(details.json()["messages"]) == 1


def test_chat_proxy_is_explicitly_unavailable_without_service_url():
    with TestClient(app) as client:
        headers = login(client)
        response = client.post("/api/v1/integrations/chat/respond", headers=headers, json={"message": "Hello"})
        assert response.status_code == 503
        assert response.json()["detail"]["code"] == "external_service_unavailable"


def test_chat_gateway_only_forwards_rag_contract(monkeypatch):
    captured: dict = {}

    async def fake_proxy(service_name, service_url, request, payload):
        captured.update({"service_name": service_name, "payload": payload})
        return {"session_id": "123e4567-e89b-42d3-a456-426614174000", "answer": "Grounded answer", "tts_text": "Grounded answer", "sources": [], "grounded": True}

    monkeypatch.setattr(main, "proxy", fake_proxy)
    with TestClient(app) as client:
        headers = login(client)
        conversation = client.post("/api/v1/conversations", headers=headers, json={"title": "Card support", "category": "Cards"}).json()
        response = client.post(
            "/api/v1/integrations/chat/respond",
            headers=headers,
            json={
                "message": "Follow up question",
                "conversation_id": conversation["id"],
                "rag_session_id": "123e4567-e89b-42d3-a456-426614174000",
                "is_voice": True,
            },
        )
    assert response.status_code == 200
    assert captured == {
        "service_name": "chat",
        "payload": {"message": "Follow up question", "session_id": "123e4567-e89b-42d3-a456-426614174000"},
    }
