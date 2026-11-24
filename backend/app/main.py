from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/api/v1/health")
def health() -> HealthResponse:
    return HealthResponse()
