import os
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .modules.api_explorer.router import router as explorer_router
from .modules.change_analyzer.router import router as change_analyzer_router
from .modules.permission_analyzer.router import router as permission_analyzer_router

_DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def _cors_origins() -> list[str]:
    raw = os.getenv("FRONTEND_ORIGIN", "")
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    return origins or _DEFAULT_ORIGINS


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


def create_app() -> FastAPI:
    application = FastAPI()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count"],
    )
    application.include_router(explorer_router)
    application.include_router(change_analyzer_router)
    application.include_router(permission_analyzer_router)

    @application.get("/api/v1/health")
    def health() -> HealthResponse:
        return HealthResponse()

    return application


app = create_app()
