from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="EasyMotion Python Service", version="0.1.0")


class HealthResponse(BaseModel):
    status: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="healthy", version="0.1.0")
