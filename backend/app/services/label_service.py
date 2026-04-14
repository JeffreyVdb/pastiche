import random
import uuid

from sqlalchemy import delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.label import Label, LabelRead
from app.models.snippet import Snippet
from app.models.snippet_label import SnippetLabel


def random_hex_color() -> str:
    return f"#{random.randint(0, 0xFFFFFF):06x}"


async def get_label_by_id(session: AsyncSession, label_id: uuid.UUID) -> Label | None:
    result = await session.execute(select(Label).where(Label.id == label_id))
    return result.scalar_one_or_none()


async def get_label_by_name(session: AsyncSession, user_id: uuid.UUID, name: str) -> Label | None:
    result = await session.execute(
        select(Label).where(Label.user_id == user_id, func.lower(Label.name) == name.strip().lower())
    )
    return result.scalar_one_or_none()


async def list_labels(session: AsyncSession, user_id: uuid.UUID) -> list[LabelRead]:
    result = await session.execute(
        select(Label)
        .where(Label.user_id == user_id)
        .order_by(func.lower(Label.name), Label.created_at)
    )
    return [LabelRead.model_validate(label) for label in result.scalars().all()]


async def create_label(session: AsyncSession, user_id: uuid.UUID, name: str) -> Label:
    normalized_name = name.strip()
    existing = await get_label_by_name(session, user_id, normalized_name)
    if existing:
        raise ValueError("Label already exists")

    label = Label(user_id=user_id, name=normalized_name, color=random_hex_color())
    session.add(label)
    await session.commit()
    await session.refresh(label)
    return label


async def update_label(
    session: AsyncSession,
    label: Label,
    *,
    name: str | None = None,
    color: str | None = None,
) -> Label:
    if name is not None:
        normalized_name = name.strip()
        existing = await get_label_by_name(session, label.user_id, normalized_name)
        if existing and existing.id != label.id:
            raise ValueError("Label already exists")
        label.name = normalized_name
    if color is not None:
        label.color = color

    session.add(label)
    await session.commit()
    await session.refresh(label)
    return label


async def delete_label(session: AsyncSession, label: Label) -> None:
    await session.delete(label)
    await session.commit()


async def attach_label(session: AsyncSession, snippet: Snippet, label: Label) -> None:
    existing = await session.execute(
        select(SnippetLabel).where(
            SnippetLabel.snippet_id == snippet.id,
            SnippetLabel.label_id == label.id,
        )
    )
    if existing.scalar_one_or_none() is None:
        session.add(SnippetLabel(snippet_id=snippet.id, label_id=label.id))
        await session.commit()


async def detach_label(session: AsyncSession, snippet: Snippet, label: Label) -> None:
    await session.execute(
        delete(SnippetLabel).where(
            SnippetLabel.snippet_id == snippet.id,
            SnippetLabel.label_id == label.id,
        )
    )
    await session.commit()


async def get_snippet_labels(session: AsyncSession, snippet_id: uuid.UUID) -> list[LabelRead]:
    result = await session.execute(
        select(Label)
        .join(SnippetLabel, SnippetLabel.label_id == Label.id)
        .where(SnippetLabel.snippet_id == snippet_id)
        .order_by(func.lower(Label.name), Label.created_at)
    )
    return [LabelRead.model_validate(label) for label in result.scalars().all()]
