"""AG-UI で公開する LangChain の ReAct エージェント."""

import json
import os
from collections.abc import Awaitable, Callable  # noqa: TC003 langsmith が実行時に注釈を評価する
from datetime import datetime
from typing import Any, NotRequired
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from langchain.agents import AgentState, create_agent
from langchain.agents.middleware import (
    AgentMiddleware,
    ModelRequest,
    ModelResponse,
    hook_config,
)
from langchain.tools import tool
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.runtime import Runtime  # noqa: TC002 同上

load_dotenv()  # backend/.env を読む. 既にある環境変数は上書きしない


class FrontendState(AgentState):
    """AG-UI 経由でフロントエンドから渡される値."""

    tools: NotRequired[list[dict[str, Any]]]  # frontend tools. ag-ui-langgraph が詰める
    ui_state: NotRequired[dict[str, Any]]  # 画面の現在の状態


def _with_frontend(request: ModelRequest) -> ModelRequest:
    """Frontend tools をバインドし、UI ステートを system prompt に足す."""
    frontend_tools = [
        {"type": "function", "function": t} for t in request.state.get("tools", [])
    ]
    ui_state = json.dumps(request.state.get("ui_state", {}), ensure_ascii=False)
    return request.override(
        tools=[*request.tools, *frontend_tools],
        system_prompt=(
            f"{request.system_prompt}\n\n"
            f"現在のUIステート (ツール実行後の最新の状態): {ui_state}"
        ),
    )


class FrontendToolsMiddleware(AgentMiddleware[FrontendState]):
    """Frontend tools と UI ステートをモデルに渡し、frontend tool の呼び出しで止める."""

    state_schema = FrontendState

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        """モデル呼び出しに frontend の情報を足す."""
        return handler(_with_frontend(request))

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[ModelResponse]],
    ) -> ModelResponse:
        """非同期版."""
        return await handler(_with_frontend(request))

    @hook_config(can_jump_to=["end"])
    def after_model(
        self, state: FrontendState, runtime: Runtime[None]
    ) -> dict[str, Any] | None:
        """Frontend tool が呼ばれたら実行をフロントエンドに任せて終了する."""
        del runtime
        names = {t["name"] for t in state.get("tools", [])}
        last = state["messages"][-1]
        # shortcut: backend tool と同時呼び出しでも止める. 困るなら backend 分を先に実行
        if isinstance(last, AIMessage) and any(
            c["name"] in names for c in last.tool_calls
        ):
            return {"jump_to": "end"}
        return None


@tool
def get_current_time() -> str:
    """現在時刻 (日本時間 JST, ISO 8601) を返す."""
    return datetime.now(ZoneInfo("Asia/Tokyo")).isoformat()


graph = create_agent(
    # DeepSeek は OpenAI 互換 API なので ChatOpenAI の base_url を差し替えて使う
    model=ChatOpenAI(
        model="deepseek-chat",
        base_url="https://api.deepseek.com",
        # キーがなくても import は通す (frontend の型生成が main.py を読み込むため).
        # 未設定なら質問したときに認証エラーになる
        api_key=os.environ.get("DEEPSEEK_API_KEY", "not-set"),
    ),
    tools=[get_current_time],
    system_prompt="あなたは Web アプリのアシスタントです。必要ならツールを使って。",
    middleware=[FrontendToolsMiddleware()],
    # shortcut: メモリ上なので再起動で会話が消える. 永続化するなら DB の checkpointer へ
    checkpointer=InMemorySaver(),
)
