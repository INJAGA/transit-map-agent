# AGENTS.md

## ルール

- ユーザーへの返答は日本語で書く。

## 構成

- `backend/` — FastAPI（uv, Python 3.14）。起動: `cd backend && uv run fastapi dev main.py`
- `frontend/` — SvelteKit（TypeScript, pnpm）。起動: `cd frontend && pnpm dev`
- 両方まとめて起動: ルートで `pnpm dev`（片方だけなら `pnpm dev:backend` / `pnpm dev:frontend`）。片方が落ちるともう片方も止まる（`concurrently -k`）。ログは `[backend]` `[frontend]` の接頭辞で見分ける
- コードを変えたら完了前にチェックを通す（コミット時にも lefthook で同じものが走る）:
  - backend: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run ty check && uv run pytest`
  - frontend: `cd frontend && pnpm check && pnpm test && pnpm lint`（整形は `pnpm format`）
  - frontend/scripts の Python: `cd backend && uv run ruff check ../frontend/scripts && uv run ruff format --check ../frontend/scripts`
  - ルート直下の設定ファイル: `frontend/node_modules/.bin/prettier --check package.json lefthook.yml AGENTS.md README.md transit-map-agent.code-workspace .claude/settings.json pnpm-workspace.yaml`
  - ruff / ty は `uvx` ではなく `uv run` で、固定したバージョンを使う。
- 初回セットアップ: ルートで `pnpm install`（pnpm workspace なので frontend の依存も入る。lefthook のフックも `prepare` で登録される）
- LLM の API キー: `cp backend/.env.example backend/.env` して `DEEPSEEK_API_KEY` を書く（無くても起動はするが、質問すると認証エラーになる）。
- VSCode では `transit-map-agent.code-workspace` を開く。
- git リポジトリはルートの1つだけ。`backend/` や `frontend/` の中で `git init` しない。
