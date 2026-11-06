/**
 * エージェントに渡す UI ステート. 項目を足すと、そのまま backend の system prompt に届く.
 * 書き換えはブラウザ側（イベントやツール）だけで行う. SSR 中に書くとリクエスト間で共有されてしまう.
 */
export const uiState = $state({
	pageTitle: 'Welcome to SvelteKit',
	count: 0
});
