# AGENTS.md

## ルール

- ユーザーへの返答は日本語で書く。

## 構成

- `backend/` — FastAPI（uv, Python 3.14）。起動: `cd backend && uv run fastapi dev main.py`
- `frontend/` — SvelteKit（TypeScript, npm）。起動: `cd frontend && npm run dev`
- 両方まとめて起動: ルートで `npm run dev`（片方だけなら `npm run dev:backend` / `npm run dev:frontend`）。片方が落ちてももう片方は動き続けるので、API が失敗したらログを遡って確認する
- コードを変えたら完了前にチェックを通す（コミット時にも lefthook で同じものが走る）:
  - backend: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run ty check && uv run pytest`
  - frontend: `cd frontend && npm run check && npm test && npm run lint`（整形は `npm run format`）
  - frontend/scripts の Python: `cd backend && uv run ruff check ../frontend/scripts && uv run ruff format --check ../frontend/scripts`
  - ルート直下の設定ファイル: `frontend/node_modules/.bin/prettier --check package.json lefthook.yml AGENTS.md fastapi-sveltekit.code-workspace .claude/settings.json`
  - ruff / ty は `uvx` ではなく `uv run` で、固定したバージョンを使う。
- 初回セットアップ: ルートで `npm install`（lefthook が入り、`prepare` でフックも登録される）
- LLM の API キー: `cp backend/.env.example backend/.env` して `DEEPSEEK_API_KEY` を書く（無くても起動はするが、質問すると認証エラーになる）。
- VSCode では `fastapi-sveltekit.code-workspace` を開く。
- git リポジトリはルートの1つだけ。`backend/` や `frontend/` の中で `git init` しない。
