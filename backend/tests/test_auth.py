import uuid

from app.core.security import create_access_token
from app.models.user import User


def test_me_unauthenticated(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


async def test_me_authenticated(client, test_session):
    user = User(
        github_id=12345,
        username="testuser",
        display_name="Test User",
        avatar_url="https://example.com/avatar.png",
        email="test@example.com",
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)

    token = create_access_token(str(user.id))
    client.cookies.set("access_token", token)

    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["github_id"] == 12345


def test_logout(client):
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out"}


def test_me_invalid_token(client):
    client.cookies.set("access_token", "invalid.token.here")
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_nonexistent_user(client):
    token = create_access_token(str(uuid.uuid4()))
    client.cookies.set("access_token", token)
    response = client.get("/api/auth/me")
    assert response.status_code == 401
