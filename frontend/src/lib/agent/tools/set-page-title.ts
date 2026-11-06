import { z } from 'zod';
import { uiState } from '../ui-state.svelte';
import { defineTool } from './types';

export const setPageTitle = defineTool({
	name: 'set_page_title',
	description: 'ページのタイトルを変更する',
	schema: z.object({ title: z.string().min(1).describe('新しいタイトル') }),
	handler: ({ title }) => {
		uiState.pageTitle = title;
		return `タイトルを「${title}」に変更しました`;
	}
});
