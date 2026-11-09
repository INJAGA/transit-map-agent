"""FastAPI アプリのエントリポイント."""

import random
from collections import Counter
from typing import Annotated, Literal

import h3
from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint
from fastapi import FastAPI, Query
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


class H3Count(BaseModel):
    """H3 セル1つ分の件数."""

    h3: str
    count: int


class H3CountsResponse(BaseModel):
    """H3 セルごとの件数. max_count はフロントエンドの色の正規化に使う."""

    cells: list[H3Count]
    max_count: int


H3_RESOLUTION = 10
# 静岡市・浜松市・沼津市の中心の緯度経度. ダミーデータをこの周りに散らす
CITY_CENTERS = [(34.9756, 138.3828), (34.7108, 137.7261), (35.0956, 138.8636)]
# shortcut: 起動時に作る乱数のダミーデータ, 実データができたらそちらを集計する.
# 解像度を変えても同じデータを集計し直すよう、リクエストごとには作らない
DUMMY_COUNTS = {
    h3.latlng_to_cell(
        lat + random.gauss(0, 0.02), lng + random.gauss(0, 0.02), H3_RESOLUTION
    ): random.randint(1, 100)  # noqa: S311 ダミーデータ
    for lat, lng in CITY_CENTERS
    for _ in range(1000)
}


@app.get("/api/h3-counts")
def h3_counts(
    resolution: Annotated[int, Query(ge=0, le=H3_RESOLUTION)] = H3_RESOLUTION,
) -> H3CountsResponse:
    """静岡県内のダミー件数を、指定した解像度の H3 セルごとに合計して返す."""
    totals = Counter[str]()
    for cell, count in DUMMY_COUNTS.items():
        totals[h3.cell_to_parent(cell, resolution)] += count
    return H3CountsResponse(
        cells=[H3Count(h3=c, count=n) for c, n in totals.items()],
        max_count=max(totals.values()),
    )


add_langgraph_fastapi_endpoint(
    app, LangGraphAgent(name="assistant", graph=graph), "/api/agent"
)
