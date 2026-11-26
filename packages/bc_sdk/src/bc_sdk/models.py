from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Company(BaseModel):
    """A standard Business Central company."""

    model_config = ConfigDict(hide_input_in_errors=True)

    id: UUID
    name: str
    display_name: str = Field(validation_alias="displayName")


class _PreviewRecord(BaseModel):
    model_config = ConfigDict(hide_input_in_errors=True)

    id: UUID | None = None
    number: str | None = None
    display_name: str | None = Field(default=None, validation_alias="displayName")


class Customer(_PreviewRecord):
    """A standard Business Central customer."""


class Item(_PreviewRecord):
    """A standard Business Central item."""
