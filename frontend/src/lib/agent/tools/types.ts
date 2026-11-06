import type { Tool } from '@ag-ui/client';
import { z } from 'zod';

/**
 * 定義は backend に渡し、handler はブラウザで実行する. 戻り値がツール結果としてモデルに返る.
 * handler は async でもよく、文字列以外 (オブジェクトなど) を返すと JSON にして返す.
 */
export type FrontendTool = Tool & {
	handler: (args: unknown) => unknown;
};

/** Zod のスキーマ1つから、JSON Schema・引数の型・実行時の検証をまとめて作る. */
export function defineTool<S extends z.ZodObject>(tool: {
	name: string;
	description: string;
	schema: S;
	handler: (args: z.infer<S>) => unknown;
}): FrontendTool {
	// $schema は付けるとエラーにする LLM プロバイダがあるので外す
	const parameters = z.toJSONSchema(tool.schema);
	delete parameters.$schema;
	return {
		name: tool.name,
		description: tool.description,
		parameters,
		handler: (args) => {
			// 引数はモデルの出力なので信用しない. 不正ならエラー内容を返してモデルに直させる
			const parsed = tool.schema.safeParse(args);
			return parsed.success
				? tool.handler(parsed.data)
				: `引数が不正です: ${z.prettifyError(parsed.error)}`;
		}
	};
}
