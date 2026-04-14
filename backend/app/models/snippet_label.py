import uuid

from sqlmodel import Field, SQLModel


class SnippetLabel(SQLModel, table=True):
    __tablename__ = "snippet_labels"

    snippet_id: uuid.UUID = Field(
        foreign_key="snippets.id",
        primary_key=True,
        nullable=False,
        ondelete="CASCADE",
    )
    label_id: uuid.UUID = Field(
        foreign_key="labels.id",
        primary_key=True,
        nullable=False,
        ondelete="CASCADE",
    )
