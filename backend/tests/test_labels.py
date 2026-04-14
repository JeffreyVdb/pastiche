import pytest

from app.core.security import create_access_token
from app.core.short_code import int_to_base36
from app.models.snippet import Snippet
from app.models.user import User

_snippet_counter = 10_000


async def _create_user(
    session, *, github_id: int = 100, username: str = "label-user"
) -> User:
    user = User(
        github_id=github_id,
        username=username,
        display_name="Label User",
        avatar_url="https://example.com/avatar.png",
        email=f"{username}@example.com",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _create_snippet(
    session, *, user_id, title: str = "Snippet", content: str = "hello"
) -> Snippet:
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


def _auth(client, user: User) -> None:
    client.cookies.set("access_token", create_access_token(str(user.id)))


async def test_label_crud_attach_and_detach_flow(client, test_session):
    user = await _create_user(test_session)
    _auth(client, user)
    snippet = await _create_snippet(test_session, user_id=user.id, title="Alpha")

    created = client.post("/api/labels", json={"name": "Urgent"})
    assert created.status_code == 201
    label = created.json()
    assert label["name"] == "Urgent"
    assert label["color"].startswith("#")
    assert len(label["color"]) == 7

    listed = client.get("/api/labels")
    assert listed.status_code == 200
    assert listed.json() == [label]

    attached = client.put(f"/api/labels/{label['id']}/snippets/{snippet.id}")
    assert attached.status_code == 204

    snippet_response = client.get(f"/api/snippets/{snippet.id}")
    assert snippet_response.status_code == 200
    assert snippet_response.json()["labels"] == [label]

    detached = client.delete(f"/api/labels/{label['id']}/snippets/{snippet.id}")
    assert detached.status_code == 204

    snippet_response = client.get(f"/api/snippets/{snippet.id}")
    assert snippet_response.status_code == 200
    assert snippet_response.json()["labels"] == []


async def test_label_name_is_unique_per_user_case_insensitive(client, test_session):
    user = await _create_user(test_session, github_id=101, username="case-user")
    _auth(client, user)

    first = client.post("/api/labels", json={"name": "Bug"})
    assert first.status_code == 201

    duplicate = client.post("/api/labels", json={"name": "bug"})
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Label already exists"


async def test_updating_label_validates_case_insensitive_uniqueness(client, test_session):
    user = await _create_user(test_session, github_id=102, username="rename-user")
    _auth(client, user)

    first = client.post("/api/labels", json={"name": "Backend"}).json()
    second = client.post("/api/labels", json={"name": "Frontend"}).json()

    response = client.patch(f"/api/labels/{second['id']}", json={"name": "backend"})
    assert response.status_code == 409
    assert response.json()["detail"] == "Label already exists"

    ok = client.patch(f"/api/labels/{second['id']}", json={"name": "UI", "color": "#123abc"})
    assert ok.status_code == 200
    assert ok.json()["name"] == "UI"
    assert ok.json()["color"] == "#123abc"
    assert ok.json()["id"] == second["id"]
    assert first["id"] != second["id"]


async def test_list_snippets_includes_labels_and_supports_label_filters(client, test_session):
    user = await _create_user(test_session, github_id=103, username="filter-user")
    _auth(client, user)
    alpha = await _create_snippet(test_session, user_id=user.id, title="Alpha")
    beta = await _create_snippet(test_session, user_id=user.id, title="Beta")
    gamma = await _create_snippet(test_session, user_id=user.id, title="Gamma")

    urgent = client.post("/api/labels", json={"name": "Urgent"}).json()
    frontend = client.post("/api/labels", json={"name": "Frontend"}).json()

    assert client.put(f"/api/labels/{urgent['id']}/snippets/{alpha.id}").status_code == 204
    assert client.put(f"/api/labels/{frontend['id']}/snippets/{alpha.id}").status_code == 204
    assert client.put(f"/api/labels/{frontend['id']}/snippets/{beta.id}").status_code == 204
    assert client.put(f"/api/labels/{urgent['id']}/snippets/{gamma.id}").status_code == 204

    listed = client.get("/api/snippets")
    assert listed.status_code == 200
    by_id = {item["id"]: item for item in listed.json()["items"]}
    assert [label["name"] for label in by_id[str(alpha.id)]["labels"]] == ["Frontend", "Urgent"]
    assert [label["name"] for label in by_id[str(beta.id)]["labels"]] == ["Frontend"]
    assert [label["name"] for label in by_id[str(gamma.id)]["labels"]] == ["Urgent"]

    include_only = client.get("/api/snippets?labels=frontend")
    assert include_only.status_code == 200
    assert {item["id"] for item in include_only.json()["items"]} == {str(alpha.id), str(beta.id)}

    include_both = client.get("/api/snippets?labels=urgent&labels=frontend")
    assert include_both.status_code == 200
    assert [item["id"] for item in include_both.json()["items"]] == [str(alpha.id)]

    exclude = client.get("/api/snippets?exclude_labels=urgent")
    assert exclude.status_code == 200
    assert [item["id"] for item in exclude.json()["items"]] == [str(beta.id)]


async def test_deleting_label_removes_it_from_snippets(client, test_session):
    user = await _create_user(test_session, github_id=104, username="delete-user")
    _auth(client, user)
    snippet = await _create_snippet(test_session, user_id=user.id, title="Delete label")
    label = client.post("/api/labels", json={"name": "Cleanup"}).json()

    assert client.put(f"/api/labels/{label['id']}/snippets/{snippet.id}").status_code == 204

    deleted = client.delete(f"/api/labels/{label['id']}")
    assert deleted.status_code == 204

    labels = client.get("/api/labels")
    assert labels.status_code == 200
    assert labels.json() == []

    snippet_response = client.get(f"/api/snippets/{snippet.id}")
    assert snippet_response.status_code == 200
    assert snippet_response.json()["labels"] == []
