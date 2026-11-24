from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class _NamedRecord(BaseModel):
    model_config = ConfigDict(hide_input_in_errors=True)

    id: UUID
    display_name: str = Field(validation_alias="displayName")


class Company(_NamedRecord):
    """A standard Business Central company."""

    name: str


class Customer(_NamedRecord):
    """A standard Business Central customer."""

    number: str


class Item(_NamedRecord):
    """A standard Business Central item."""

    number: str
