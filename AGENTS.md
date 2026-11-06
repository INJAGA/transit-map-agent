# AGENTS.md

## ルール

- ユーザーへの返答は日本語で書く。

## 構成

- `backend/` — FastAPI（uv, Python 3.14）。起動: `cd backend && uv run fastapi dev main.py`
- `frontend/` — SvelteKit（TypeScript, npm）。起動: `cd frontend && npm run dev`
- コードを変えたら完了前にチェックを通す（コミット時にも lefthook で同じものが走る）:
  - backend: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run ty check && uv run pytest`
  - frontend: `cd frontend && npm run check && npm run lint`（整形は `npm run format`）
  - ruff / ty は `uvx` ではなく `uv run` で、固定したバージョンを使う。
- 初回セットアップ: `brew install lefthook && lefthook install`
- LLM の API キー: `cp backend/.env.example backend/.env` して `DEEPSEEK_API_KEY` を書く（無くても起動はするが、質問すると認証エラーになる）。
- VSCode では `fastapi-sveltekit.code-workspace` を開く。
- git リポジトリはルートの1つだけ。`backend/` や `frontend/` の中で `git init` しない。
