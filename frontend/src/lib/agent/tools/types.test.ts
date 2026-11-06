import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineTool } from './types';

describe('defineTool', () => {
	const tool = defineTool({
		name: 'echo',
		description: 'd',
		schema: z.object({ text: z.string() }),
		handler: ({ text }) => `got ${text}`
	});

	it('Zod スキーマから $schema 抜きの JSON Schema を作る', () => {
		expect(tool.parameters).toEqual({
			type: 'object',
			properties: { text: { type: 'string' } },
			required: ['text'],
			additionalProperties: false
		});
	});

	it('正しい引数なら handler を呼ぶ', () => {
		expect(tool.handler({ text: 'hi' })).toBe('got hi');
	});

	it('不正な引数ならエラー文を返す', () => {
		expect(tool.handler({ text: 1 })).toMatch(/^引数が不正です/);
	});
});
