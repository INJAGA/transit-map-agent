# AGENTS.md (frontend)

## UI のルール

- CSS は直接書かず、Tailwind のユーティリティクラスだけを使う（`src/routes/layout.css` のプラグイン設定は除く）。
- UI コンポーネントは daisyUI にあるものを積極的に使う。
- アイコンは UI に積極的に使い、Tabler Icons から直感的なものを選ぶ。書き方は `<span class="icon-[tabler--home]"></span>`。

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
