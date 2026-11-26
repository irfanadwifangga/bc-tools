from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from .modules.api_explorer.router import router as explorer_router
from .modules.permission_analyzer.router import router as permission_analyzer_router

app = FastAPI()
app.include_router(explorer_router)
app.include_router(permission_analyzer_router)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/api/v1/health")
def health() -> HealthResponse:
    return HealthResponse()
