import { setPageTitle } from './set-page-title';
import type { FrontendTool } from './types';

export type { FrontendTool } from './types';

/** ツールを足すときはファイルを作ってここに追加する. */
export const frontendTools: FrontendTool[] = [setPageTitle];
