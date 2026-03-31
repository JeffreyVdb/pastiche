from app.core.short_code import int_to_base36
from app.models.snippet import Snippet
from app.models.user import User

_snippet_counter = 0


async def _create_user(
    session, *, github_id: int = 1, username: str = "testuser"
) -> User:
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


async def _create_snippet(
    session,
    *,
    user_id,
    title: str = "My snippet",
    content: str = "hello",
    language: str = "python",
    is_public: bool = True,
) -> Snippet:
    global _snippet_counter
    _snippet_counter += 1
    snippet = Snippet(
        user_id=user_id,
        title=title,
        language=language,
        content=content,
        short_code=int_to_base36(_snippet_counter),
        is_public=is_public,
    )
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet


async def test_markdown_public_snippet(client, test_session):
    user = await _create_user(test_session)
    snippet = await _create_snippet(
        test_session,
        user_id=user.id,
        title="My Helper",
        content='print("hello")',
        language="python",
    )

    response = client.get(
        f"/s/{snippet.short_code}", headers={"Accept": "text/markdown"}
    )
    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]
    body = response.text
    assert 'title: "My Helper"' in body
    assert 'language: "python"' in body
    assert "```python" in body
    assert 'print("hello")' in body
    assert "```" in body


async def test_markdown_snippet_no_fencing(client, test_session):
    user = await _create_user(test_session)
    snippet = await _create_snippet(
        test_session,
        user_id=user.id,
        title="Notes",
        content="# Meeting\n\n- item 1\n- item 2",
        language="markdown",
    )

    response = client.get(
        f"/s/{snippet.short_code}", headers={"Accept": "text/markdown"}
    )
    assert response.status_code == 200
    body = response.text
    assert 'title: "Notes"' in body
    assert 'language: "markdown"' in body
    assert "```" not in body
    assert "# Meeting" in body
    assert "- item 1" in body


async def test_markdown_private_snippet_returns_404(client, test_session):
    user = await _create_user(test_session)
    snippet = await _create_snippet(
        test_session,
        user_id=user.id,
        is_public=False,
    )

    response = client.get(
        f"/s/{snippet.short_code}", headers={"Accept": "text/markdown"}
    )
    assert response.status_code == 404
    assert "text/markdown" in response.headers["content-type"]


async def test_markdown_nonexistent_short_code(client, test_session):
    response = client.get("/s/zzzzzzz", headers={"Accept": "text/markdown"})
    assert response.status_code == 404


async def test_no_markdown_accept_redirects(client, test_session):
    user = await _create_user(test_session)
    snippet = await _create_snippet(
        test_session,
        user_id=user.id,
    )

    response = client.get(f"/s/{snippet.short_code}", follow_redirects=False)
    assert response.status_code == 302
    assert f"/s/{snippet.short_code}" in response.headers["location"]


async def test_markdown_response_has_frontmatter(client, test_session):
    user = await _create_user(test_session)
    snippet = await _create_snippet(
        test_session,
        user_id=user.id,
        title="Test Title",
        content="x = 1",
        language="python",
    )

    response = client.get(
        f"/s/{snippet.short_code}", headers={"Accept": "text/markdown"}
    )
    assert response.status_code == 200
    body = response.text
    assert body.startswith("---")
    lines = body.split("\n")
    assert lines[0] == "---"
    assert 'title: "Test Title"' in lines[1]
    assert lines[1].startswith("title:")
    assert lines[2].startswith("date:")
    assert lines[3].startswith("updated:")
    assert lines[4].startswith("language:")
    assert lines[5] == "---"
