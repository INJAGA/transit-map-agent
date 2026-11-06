"""FastAPI アプリのエントリポイント."""

from typing import Literal

from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint
from fastapi import FastAPI
from pydantic import BaseModel

from agent import graph


class HealthResponse(BaseModel):
    """ヘルスチェックのレスポンス."""

    status: Literal["ok"]


app = FastAPI()


@app.get("/api/health")
def health() -> HealthResponse:
    """ヘルスチェック用. 起動していれば ok を返す."""
    return HealthResponse(status="ok")


add_langgraph_fastapi_endpoint(
    app, LangGraphAgent(name="assistant", graph=graph), "/api/agent"
)
