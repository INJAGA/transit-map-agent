# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@1.3.0 create --template minimal --types ts --install npm frontend
```

## Adding features

Add features to your project with `sv add`:

```sh
npx sv add
```

For example, to add Tailwind CSS:

```sh
npx sv add tailwindcss
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Backend SDK / BFF

`npm run dev`・`npm run build`・`npm run check` の前に FastAPI の OpenAPI から Hey API SDK を生成します。生成には uv と backend の Python 環境が必要です（backend サーバーの起動は不要）。CI のビルドにも backend/ を含めてください。

生成先 `src/lib/server/api/` は Git 管理対象外です。API を変更したら `npm run generate:api` を実行するか開発サーバーを再起動してください。

SDK はサーバー専用です。`+page.server.ts` の例のように SDK に `backend(fetch)` を渡し、load の戻り値をページで使います。ブラウザーからは SvelteKit にアクセスし、FastAPI の URL を知る必要はありません。更新処理は form actions などに実装します。

表示中に何度も取り直すデータは、`src/routes/api/h3-counts/+server.ts` の例のように `+server.ts` のエンドポイントで SDK を呼び、ブラウザーから fetch します（地図の H3 セルはズームで解像度が変わるたびに取り直します）。backend の 4xx/5xx はそのステータスのまま返し、backend に繋がらないときは 502 を返します。

接続先は `.env.example` を参考に `BACKEND_URL` で設定します。既定値は `http://127.0.0.1:8000`。実行時は backend を別途起動するか、リポジトリのルートで `npm run dev` を実行して両方まとめて起動してください。トップページに接続状態を表示し、接続失敗時もカウンターは利用できます。ヘルスチェックは3秒でタイムアウトします。

`npm test` で SDK 経由の取得成功・接続失敗・HTTP エラー・タイムアウトと、`/api/h3-counts` の入力チェック・ステータスの中継を確認します。

Vitest は `sv add vitest="usages:unit"` で導入しています。`npm test` で一括実行、`npm run test:unit` で watch 実行します。どちらも実行前に SDK を生成します。
