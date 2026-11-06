import type { AbstractAgent, Message } from '@ag-ui/client';
import type { FrontendTool } from './tools';
import { uiState } from './ui-state.svelte';

// モデルがツールを呼び続けても止まるようにする上限
const MAX_RUNS = 10;

/**
 * エージェントを実行し、frontend tool が呼ばれたら結果を返して再実行する（呼ばれなくなるまで）.
 * ユーザーのメッセージは呼び出し側で agent.addMessage してから呼ぶ.
 */
export async function run(
	agent: AbstractAgent,
	tools: FrontendTool[],
	onMessages: (messages: Message[]) => void
) {
	const definitions = tools.map(({ name, description, parameters }) => ({
		name,
		description,
		parameters
	}));
	for (let i = 0; i < MAX_RUNS; i++) {
		const calls: { id: string; tool: FrontendTool; args: Record<string, unknown> }[] = [];
		let runError: string | undefined;
		agent.setState({ ui_state: $state.snapshot(uiState) });
		await agent.runAgent(
			{ tools: definitions },
			{
				onMessagesChanged: () => onMessages([...agent.messages]),
				// runAgent は RUN_ERROR でも例外を投げずに終わるので、自分で拾う
				onRunErrorEvent: ({ event }) => {
					runError = event.message;
				},
				onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
					const tool = tools.find((t) => t.name === toolCallName);
					if (tool) calls.push({ id: event.toolCallId, tool, args: toolCallArgs });
				}
			}
		);
		if (runError !== undefined) throw new Error(runError);
		if (calls.length === 0) return;
		for (const call of calls) {
			// 例外でも結果を必ず返す. 結果のない tool call が残ると次の送信をモデル API が拒否する
			let content: string;
			try {
				// async の handler は終わるまで待つ. 待たないと次の実行に古い UI ステートが載る
				const result = await call.tool.handler(call.args);
				// tool 結果は文字列なので変換する. undefined (戻り値なし) は JSON にならない
				content = typeof result === 'string' ? result : (JSON.stringify(result) ?? '完了しました');
			} catch (e) {
				content = `ツールの実行に失敗しました: ${e instanceof Error ? e.message : String(e)}`;
			}
			agent.addMessage({ id: crypto.randomUUID(), role: 'tool', toolCallId: call.id, content });
		}
	}
	throw new Error(`ツール呼び出しが ${MAX_RUNS} 回を超えたので中断しました`);
}
