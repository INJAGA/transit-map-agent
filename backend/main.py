"""FastAPI アプリのエントリポイント."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    """ヘルスチェックのレスポンス."""

    status: Literal["ok"]


app = FastAPI()


@app.get("/api/health")
def health() -> HealthResponse:
    """ヘルスチェック用. 起動していれば ok を返す."""
    return HealthResponse(status="ok")
