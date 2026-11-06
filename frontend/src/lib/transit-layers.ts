// static/data/ のデータは scripts/build-transit-data.py で作る（国土数値情報, 静岡県分）
// color はアイコンの Tailwind 色（*-600）と同じ RGB. shape と一緒に capture_map の凡例にも使う
export const transitLayers = [
	{
		id: 'railways',
		label: '鉄道',
		icon: 'icon-[tabler--train] text-red-600',
		color: [220, 38, 38],
		shape: '線'
	},
	{
		id: 'bus-routes',
		label: 'バスルート',
		icon: 'icon-[tabler--route] text-blue-600',
		color: [37, 99, 235],
		shape: '線'
	},
	{
		id: 'bus-stops',
		label: 'バス停',
		icon: 'icon-[tabler--bus-stop] text-orange-600',
		color: [234, 88, 12],
		shape: '点'
	}
] as const;
