"""FrontendToolsMiddleware のテスト. 偽モデルで AG-UI の往復を通す."""

import asyncio
import json
from typing import TYPE_CHECKING, Any

from ag_ui.core import (
    AssistantMessage,
    BaseEvent,
    EventType,
    FunctionCall,
    RunAgentInput,
    Tool,
    ToolCall,
    ToolMessage,
    UserMessage,
)
from ag_ui_langgraph import LangGraphAgent
from langchain.agents import create_agent
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.messages import ToolMessage as LCToolMessage
from langchain_core.outputs import ChatGenerationChunk
from langgraph.checkpoint.memory import InMemorySaver

from agent import FrontendToolsMiddleware, _images_to_user, get_current_time

if TYPE_CHECKING:
    from collections.abc import Iterator


class FakeModel(GenericFakeChatModel):
    """決めた応答を順に返し、渡されたツール名と system prompt を記録する."""

    bound: list[str] = []  # noqa: RUF012 テスト用の記録
    system: list[str] = []  # noqa: RUF012 同上

    def bind_tools(self, tools: Any, **_: Any) -> FakeModel:
        """ツール名を記録するだけ."""
        self.bound[:] = [
            t["function"]["name"] if isinstance(t, dict) else t.name for t in tools
        ]
        return self

    def _stream(
        self, messages: list[BaseMessage], *_: Any, **__: Any
    ) -> Iterator[ChatGenerationChunk]:
        self.system.append(str(messages[0].content))
        m = next(self.messages)
        assert isinstance(m, AIMessage)
        chunks = [
            {
                "id": c["id"],
                "name": c["name"],
                "args": json.dumps(c["args"]),
                "index": 0,
            }
            for c in m.tool_calls
        ]
        yield ChatGenerationChunk(
            message=AIMessageChunk(content=m.content, tool_call_chunks=chunks)
        )


TITLE_TOOL = Tool(
    name="set_page_title",
    description="ページのタイトルを変更する",
    parameters={"type": "object", "properties": {"title": {"type": "string"}}},
)


def _run(agent: LangGraphAgent, messages: list[Any]) -> list[BaseEvent]:
    async def collect() -> list[BaseEvent]:
        inp = RunAgentInput(
            thread_id="t",
            run_id="r",
            state={"ui_state": {"pageTitle": "Home"}},
            messages=messages,
            tools=[TITLE_TOOL],
            context=[],
            forwarded_props={},
        )
        return [e async for e in agent.clone().run(inp)]

    return asyncio.run(collect())


def test_frontend_tool_stops_then_resumes() -> None:
    """Frontend tool が呼ばれたら止まり、ツール結果を渡すと再開して答える."""
    call = {"id": "c1", "name": "set_page_title", "args": {"title": "猫"}}
    model = FakeModel(
        messages=iter([AIMessage(content="", tool_calls=[call]), AIMessage("変えた")])
    )
    graph = create_agent(
        model=model,
        tools=[get_current_time],
        middleware=[FrontendToolsMiddleware()],
        checkpointer=InMemorySaver(),
    )
    agent = LangGraphAgent(name="a", graph=graph)
    user = UserMessage(id="u1", role="user", content="タイトル変えて")

    first = _run(agent, [user])
    assert EventType.TOOL_CALL_START in [e.type for e in first]
    assert model.bound == ["get_current_time", "set_page_title"]
    assert '"pageTitle": "Home"' in model.system[0]
    # 止まっていなければ backend の tools ノードが動いて ToolMessage ができている
    assert EventType.TEXT_MESSAGE_CONTENT not in [e.type for e in first]

    assistant = AssistantMessage(
        id="a1",
        role="assistant",
        tool_calls=[
            ToolCall(
                id="c1",
                type="function",
                function=FunctionCall(
                    name="set_page_title", arguments='{"title":"猫"}'
                ),
            )
        ],
    )
    result = ToolMessage(id="m1", role="tool", tool_call_id="c1", content="ok")
    second = _run(agent, [user, assistant, result])
    text = "".join(
        getattr(e, "delta", "")
        for e in second
        if e.type == EventType.TEXT_MESSAGE_CONTENT
    )
    assert text == "変えた"


def test_images_to_user() -> None:
    """Tool 結果の画像は tool 結果の並びの後ろに user メッセージとして移す."""
    url = "data:image/jpeg;base64,AAAA"
    ai = AIMessage(
        content="",
        tool_calls=[
            {"id": "1", "name": "capture_map", "args": {}},
            {"id": "2", "name": "set_page_title", "args": {}},
        ],
    )
    out = _images_to_user(
        [
            ai,
            LCToolMessage(content=url, tool_call_id="1"),
            LCToolMessage(content="ok", tool_call_id="2"),
        ]
    )
    assert [m.type for m in out] == ["ai", "tool", "tool", "human"]
    assert url not in str(out[1].content)
    assert out[3].content[1] == {"type": "image_url", "image_url": {"url": url}}


def test_images_to_user_ignores_invalid_data_url() -> None:
    """形式が不正な data URL は画像にせず、そのまま tool 結果として残す."""
    bad = "data:image/jpeg;base64,!!invalid"
    out = _images_to_user([LCToolMessage(content=bad, tool_call_id="1")])
    assert [m.type for m in out] == ["tool"]
    assert out[0].content == bad


def test_images_to_user_sends_only_latest_image() -> None:
    """画像は最後の1枚だけ送り、古い画像は文字に置き換える."""
    old, new = "data:image/jpeg;base64,AAAA", "data:image/png;base64,BBBB"
    out = _images_to_user(
        [
            LCToolMessage(content=old, tool_call_id="1"),
            AIMessage(content="見ました"),
            LCToolMessage(content=new, tool_call_id="2"),
        ]
    )
    assert [m.type for m in out] == ["tool", "ai", "tool", "human"]
    assert old not in str(out)
    assert out[3].content[1] == {"type": "image_url", "image_url": {"url": new}}
