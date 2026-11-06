import { setBasemap } from './set-basemap';
import { setMapLayers } from './set-map-layers';
import { setMapView } from './set-map-view';
import { setPageTitle } from './set-page-title';
import type { FrontendTool } from './types';

export type { FrontendTool } from './types';

/** ツールを足すときはファイルを作ってここに追加する. */
export const frontendTools: FrontendTool[] = [setPageTitle, setMapView, setBasemap, setMapLayers];
