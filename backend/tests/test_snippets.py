import pytest

from app.core.security import create_access_token
from app.core.short_code import int_to_base36
from app.models.snippet import Snippet
from app.models.user import User

_snippet_counter = 0


async def _create_user(session, *, github_id: int = 1, username: str = "testuser") -> User:
    user = User(
        github_id=github_id,
        username=username,
        display_name="Test User",
        avatar_url="https://example.com/avatar.png",
        email=f"{username}@example.com",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _create_snippet(session, *, user_id, title: str = "My snippet", content: str = "hello") -> Snippet:
    global _snippet_counter
    _snippet_counter += 1
    snippet = Snippet(
        user_id=user_id,
        title=title,
        language="python",
        content=content,
        short_code=int_to_base36(_snippet_counter),
    )
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet


def _auth(client, user: User):
    token = create_access_token(str(user.id))
    client.cookies.set("access_token", token)


# ---------------------------------------------------------------------------
# List endpoint: response shape
# ---------------------------------------------------------------------------


async def test_list_omits_content_includes_content_size(client, test_session):
    user = await _create_user(test_session)
    _auth(client, user)
    await _create_snippet(test_session, user_id=user.id, content="hello world")

    response = client.get("/api/snippets")
    assert response.status_code == 200
    items = response.json()["items"]
    assert response.json()["total"] == 1
    assert len(items) == 1
    assert "content" not in items[0]
    assert "content_size" in items[0]
    assert isinstance(items[0]["content_size"], int)


async def test_list_content_size_accuracy(client, test_session):
    user = await _create_user(test_session)
    _auth(client, user)
    # ASCII: 5 bytes
    await _create_snippet(test_session, user_id=user.id, title="ascii", content="hello")
    # 2-byte UTF-8 char: é = 0xC3 0xA9
    await _create_snippet(test_session, user_id=user.id, title="utf8", content="\u00e9")

    response = client.get("/api/snippets")
    assert response.status_code == 200
    by_title = {s["title"]: s for s in response.json()["items"]}
    assert by_title["ascii"]["content_size"] == 5
    assert by_title["utf8"]["content_size"] == 2


# ---------------------------------------------------------------------------
# List endpoint: default sort (created_at desc)
# ---------------------------------------------------------------------------


async def test_list_default_sort_is_created_at_desc(client, test_session):
    user = await _create_user(test_session)
    _auth(client, user)
    s1 = await _create_snippet(test_session, user_id=user.id, title="first")
    s2 = await _create_snippet(test_session, user_id=user.id, title="second")
    s3 = await _create_snippet(test_session, user_id=user.id, title="third")

    response = client.get("/api/snippets")
    assert response.status_code == 200
    ids = [s["id"] for s in response.json()["items"]]
    assert ids == [str(s3.id), str(s2.id), str(s1.id)]


# ---------------------------------------------------------------------------
# List endpoint: sort_by parameter
# ---------------------------------------------------------------------------


async def test_list_sort_by_updated_at(client, test_session):
    from datetime import UTC, datetime, timedelta

    user = await _create_user(test_session)
    _auth(client, user)
    s1 = await _create_snippet(test_session, user_id=user.id, title="oldest updated")
    s2 = await _create_snippet(test_session, user_id=user.id, title="newest updated")

    # Manually push s2's updated_at further ahead
    s2.updated_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=10)
    test_session.add(s2)
    await test_session.commit()

    response = client.get("/api/snippets?sort_by=updated_at&order=desc")
    assert response.status_code == 200
    ids = [s["id"] for s in response.json()["items"]]
    assert ids[0] == str(s2.id)


# ---------------------------------------------------------------------------
# List endpoint: order parameter
# ---------------------------------------------------------------------------


async def test_list_order_asc(client, test_session):
    user = await _create_user(test_session)
    _auth(client, user)
    s1 = await _create_snippet(test_session, user_id=user.id, title="first")
    s2 = await _create_snippet(test_session, user_id=user.id, title="second")

    response = client.get("/api/snippets?order=asc")
    assert response.status_code == 200
    ids = [s["id"] for s in response.json()["items"]]
    assert ids == [str(s1.id), str(s2.id)]


# ---------------------------------------------------------------------------
# List endpoint: validation errors
# ---------------------------------------------------------------------------


async def test_list_invalid_sort_by_returns_422(client, test_session):
    user = await _create_user(test_session, github_id=90, username="u_sortby")
    _auth(client, user)
    response = client.get("/api/snippets?sort_by=invalid")
    assert response.status_code == 422


async def test_list_invalid_order_returns_422(client, test_session):
    user = await _create_user(test_session, github_id=91, username="u_order")
    _auth(client, user)
    response = client.get("/api/snippets?order=invalid")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Detail endpoint: still returns full content
# ---------------------------------------------------------------------------


async def test_get_snippet_returns_content(client, test_session):
    user = await _create_user(test_session)
    _auth(client, user)
    snippet = await _create_snippet(test_session, user_id=user.id, content="full content here")

    response = client.get(f"/api/snippets/{snippet.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "full content here"
    assert "content_size" not in data


# ---------------------------------------------------------------------------
# List endpoint: pagination
# ---------------------------------------------------------------------------


async def test_list_pagination_defaults(client, test_session):
    user = await _create_user(test_session)
    _auth(client, user)
    for i in range(3):
        await _create_snippet(test_session, user_id=user.id, title=f"s{i}")

    response = client.get("/api/snippets")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["limit"] == 50
    assert body["offset"] == 0
    assert len(body["items"]) == 3


async def test_list_pagination_limit(client, test_session):
    user = await _create_user(test_session, github_id=10, username="u_limit")
    _auth(client, user)
    for i in range(5):
        await _create_snippet(test_session, user_id=user.id, title=f"s{i}")

    response = client.get("/api/snippets?limit=2")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 2
    assert body["total"] == 5
    assert body["limit"] == 2
    assert body["offset"] == 0


async def test_list_pagination_offset(client, test_session):
    user = await _create_user(test_session, github_id=11, username="u_offset")
    _auth(client, user)
    for i in range(5):
        await _create_snippet(test_session, user_id=user.id, title=f"s{i}")

    page1 = client.get("/api/snippets?limit=2&offset=0").json()["items"]
    page2 = client.get("/api/snippets?limit=2&offset=2").json()["items"]
    ids1 = {s["id"] for s in page1}
    ids2 = {s["id"] for s in page2}
    assert len(ids1) == 2
    assert len(ids2) == 2
    assert ids1.isdisjoint(ids2)


async def test_list_pagination_beyond_total(client, test_session):
    user = await _create_user(test_session, github_id=12, username="u_beyond")
    _auth(client, user)
    await _create_snippet(test_session, user_id=user.id)
    await _create_snippet(test_session, user_id=user.id)

    response = client.get("/api/snippets?offset=100")
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 2


async def test_list_pagination_limit_validation(client, test_session):
    user = await _create_user(test_session, github_id=13, username="u_limitval")
    _auth(client, user)

    assert client.get("/api/snippets?limit=0").status_code == 422
    assert client.get("/api/snippets?limit=101").status_code == 422


async def test_list_pagination_offset_validation(client, test_session):
    user = await _create_user(test_session, github_id=14, username="u_offsetval")
    _auth(client, user)

    assert client.get("/api/snippets?offset=-1").status_code == 422


async def test_list_pagination_with_sort(client, test_session):
    user = await _create_user(test_session, github_id=15, username="u_sortp")
    _auth(client, user)
    s1 = await _create_snippet(test_session, user_id=user.id, title="oldest")
    s2 = await _create_snippet(test_session, user_id=user.id, title="middle")
    s3 = await _create_snippet(test_session, user_id=user.id, title="newest")

    page1 = client.get("/api/snippets?limit=1&sort_by=created_at&order=asc").json()
    assert page1["items"][0]["id"] == str(s1.id)
    assert page1["total"] == 3

    page2 = client.get("/api/snippets?limit=1&offset=1&sort_by=created_at&order=asc").json()
    assert page2["items"][0]["id"] == str(s2.id)


# ---------------------------------------------------------------------------
# Short code tests
# ---------------------------------------------------------------------------


async def test_create_snippet_has_short_code(client, test_session):
    user = await _create_user(test_session, github_id=20, username="u_sc_create")
    _auth(client, user)
    response = client.post("/api/snippets", json={"title": "sc test", "content": "hello"})
    assert response.status_code == 201
    data = response.json()
    assert "short_code" in data
    assert isinstance(data["short_code"], str)
    assert len(data["short_code"]) > 0


async def test_short_codes_are_unique(client, test_session):
    user = await _create_user(test_session, github_id=21, username="u_sc_unique")
    _auth(client, user)
    codes = set()
    for i in range(5):
        response = client.post("/api/snippets", json={"title": f"sc{i}", "content": f"content{i}"})
        assert response.status_code == 201
        codes.add(response.json()["short_code"])
    assert len(codes) == 5


async def test_short_code_not_in_update(client, test_session):
    user = await _create_user(test_session, github_id=22, username="u_sc_update")
    _auth(client, user)
    create_resp = client.post("/api/snippets", json={"title": "original", "content": "body"})
    assert create_resp.status_code == 201
    snippet_id = create_resp.json()["id"]
    original_code = create_resp.json()["short_code"]

    patch_resp = client.patch(f"/api/snippets/{snippet_id}", json={"title": "updated"})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["short_code"] == original_code


async def test_resolve_short_code_authenticated(client, test_session):
    user = await _create_user(test_session, github_id=23, username="u_sc_resolve")
    _auth(client, user)
    create_resp = client.post("/api/snippets", json={"title": "resolve me", "content": "data"})
    assert create_resp.status_code == 201
    snippet_id = create_resp.json()["id"]
    short_code = create_resp.json()["short_code"]

    resolve_resp = client.get(f"/api/snippets/resolve/{short_code}")
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["snippet_id"] == snippet_id


async def test_resolve_short_code_unauthenticated(client, test_session):
    user = await _create_user(test_session, github_id=24, username="u_sc_noauth")
    _auth(client, user)
    create_resp = client.post("/api/snippets", json={"title": "public resolve", "content": "data"})
    assert create_resp.status_code == 201
    snippet_id = create_resp.json()["id"]
    short_code = create_resp.json()["short_code"]

    # Clear auth cookies to simulate unauthenticated request
    client.cookies.clear()
    resolve_resp = client.get(f"/api/snippets/resolve/{short_code}")
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["snippet_id"] == snippet_id


async def test_resolve_short_code_not_found(client, test_session):
    resolve_resp = client.get("/api/snippets/resolve/nonexistent")
    assert resolve_resp.status_code == 404


async def test_list_includes_short_code(client, test_session):
    user = await _create_user(test_session, github_id=25, username="u_sc_list")
    _auth(client, user)
    await _create_snippet(test_session, user_id=user.id, title="listed")

    response = client.get("/api/snippets")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0
    for item in items:
        assert "short_code" in item
        assert isinstance(item["short_code"], str)
        assert len(item["short_code"]) > 0
