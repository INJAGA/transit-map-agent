# AGENTS.md (frontend)

## UI のルール

- CSS は直接書かず、Tailwind のユーティリティクラスだけを使う（`src/routes/layout.css` のプラグイン設定は除く）。
- UI コンポーネントは daisyUI にあるものを積極的に使う。
- アイコンは UI に積極的に使い、Tabler Icons から直感的なものを選ぶ。書き方は `<span class="icon-[tabler--home]"></span>`。

## エージェント（AG-UI）

画面から `/api/agent`（BFF）経由で backend の LangChain エージェントに質問する。コードは `src/lib/agent/` にまとめてある。

- frontend tool（ブラウザで実行するツール）を足す: `src/lib/agent/tools/` に1ツール1ファイルで作り、`defineTool` で書いて `tools/index.ts` の `frontendTools` に追加する。
  - スキーマは Zod で書く。モデルへの JSON Schema 化と引数の検証は `defineTool` が行う。
  - handler は async でもよく、オブジェクトを返すと JSON にしてモデルに返る。例外もツール結果としてモデルに返る。
  - 画像を見せたいときは base64 の data URL（jpeg/png/gif/webp）の文字列だけを返す。backend が画像としてモデルに渡す（送るのは最新の1枚だけ）。例: `tools/capture-map.ts`
- UI ステートを足す: `src/lib/agent/ui-state.svelte.ts` の `uiState` に項目を足すと、毎回 backend の system prompt に載る。
  - 全部プロンプトに入るので、GeoJSON などの大きなデータは入れず、ID や属性だけにする。詳細は backend tool で取らせる。
  - モジュール共有の状態なので、SSR 中（load やサーバー処理）に書き換えない。
- backend tool（Python で実行するツール）は `backend/agent.py` の `tools=[...]` に足す。

## Svelte MCP

出典: https://svelte.dev/docs/ai/instructions を日本語化したもの。

Svelte MCP サーバーを使うことができ、Svelte 5 と SvelteKit の網羅的なドキュメントにアクセスできる。各ツールは次のように使う。

### 利用できる Svelte MCP ツール

#### 1. list-sections

最初にこれを使って、利用できるドキュメントのセクションを洗い出す。タイトル・use_cases・パスを含む一覧が返る。
Svelte や SvelteKit について聞かれたら、会話の最初に必ずこのツールで関連するセクションを探す。

#### 2. get-documentation

指定したセクションのドキュメント全文を取得する。1つでも複数でも指定できる。
list-sections を呼んだあとは、返ってきたセクション（特に use_cases）を必ず読み、ユーザーのタスクに関係するセクションをすべてこのツールで取得する。

#### 3. svelte-autofixer

Svelte のコードを解析し、問題点と改善案を返す。
Svelte のコードを書いたら、ユーザーに渡す前に必ずこのツールを使う。問題点も改善案も返ってこなくなるまで繰り返し呼ぶ。

#### 4. playground-link

渡したコードで Svelte Playground のリンクを作る。
コードを書き終えたら、Playground のリンクが要るかユーザーに聞く。ユーザーが希望したときだけ呼ぶ。プロジェクト内のファイルにコードを書いた場合は絶対に呼ばない。
