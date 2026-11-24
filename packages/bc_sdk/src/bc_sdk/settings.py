from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr


class BCSettings(BaseModel):
    """Settings for an app-only Sandbox client."""

    model_config = ConfigDict(hide_input_in_errors=True)

    tenant_id: UUID
    client_id: UUID
    client_secret: SecretStr = Field(repr=False, min_length=1)
    environment: str = "Sandbox"
    company_id: UUID | None = None
