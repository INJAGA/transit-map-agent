import type { AbstractAgent, Message } from '@ag-ui/client';
import { describe, expect, it } from 'vitest';
import { run } from './run.svelte';
import type { FrontendTool } from './tools';

type Subscriber = {
	onToolCallEndEvent: (p: unknown) => void;
	onRunErrorEvent: (p: unknown) => void;
};

/** 毎回 `name` ツールを呼ぶ（times 回まで）偽エージェント. error を渡すと RUN_ERROR を送る. */
function fakeAgent(name: string, times: number, error?: string) {
	const messages: Message[] = [];
	let runs = 0;
	const agent = {
		messages,
		setState: () => {},
		addMessage: (m: Message) => messages.push(m),
		runAgent: async (_: unknown, subscriber: Subscriber) => {
			if (error) subscriber.onRunErrorEvent({ event: { message: error } });
			if (runs++ < times) {
				subscriber.onToolCallEndEvent({
					event: { toolCallId: `c${runs}` },
					toolCallName: name,
					toolCallArgs: {}
				});
			}
			return { result: null, newMessages: [] };
		}
	};
	return { agent: agent as unknown as AbstractAgent, messages, runs: () => runs };
}

const tool = (handler: () => unknown): FrontendTool => ({
	name: 't',
	description: 'd',
	parameters: {},
	handler
});

describe('run', () => {
	it('ツールが呼ばれなくなったら終わる', async () => {
		const f = fakeAgent('t', 2);
		await run(f.agent, [tool(() => 'ok')], () => {});
		expect(f.runs()).toBe(3);
		expect(f.messages.map((m) => m.content)).toEqual(['ok', 'ok']);
	});

	it('handler が例外を投げても tool 結果を返す', async () => {
		const f = fakeAgent('t', 1);
		const boom = () => {
			throw new Error('boom');
		};
		await run(f.agent, [tool(boom)], () => {});
		expect(f.messages[0].content).toBe('ツールの実行に失敗しました: boom');
	});

	it('async の handler を待ち、文字列以外は JSON にして返す', async () => {
		const f = fakeAgent('t', 3);
		const results: unknown[] = [{ zoom: 12 }, undefined, 'ok'];
		let i = 0;
		const slow = async () => {
			await new Promise((r) => setTimeout(r, 10));
			return results[i++];
		};
		await run(f.agent, [tool(slow)], () => {});
		expect(f.messages.map((m) => m.content)).toEqual(['{"zoom":12}', '完了しました', 'ok']);
	});

	it('async の handler の例外も tool 結果にする', async () => {
		const f = fakeAgent('t', 1);
		const boom = async () => {
			throw new Error('async boom');
		};
		await run(f.agent, [tool(boom)], () => {});
		expect(f.messages[0].content).toBe('ツールの実行に失敗しました: async boom');
	});

	it('RUN_ERROR が来たら例外にする', async () => {
		const f = fakeAgent('t', 0, 'rate limited');
		await expect(run(f.agent, [tool(() => 'ok')], () => {})).rejects.toThrow('rate limited');
	});

	it('呼ばれ続けたら上限で止める', async () => {
		const f = fakeAgent('t', Infinity);
		await expect(run(f.agent, [tool(() => 'ok')], () => {})).rejects.toThrow(/10 回/);
		expect(f.runs()).toBe(10);
	});
});
