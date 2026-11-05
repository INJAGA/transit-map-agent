"""FastAPI アプリのエントリポイント."""

from fastapi import FastAPI

app = FastAPI()


@app.get("/api/health")
def health() -> dict[str, str]:
    """ヘルスチェック用. 起動していれば ok を返す."""
    return {"status": "ok"}
