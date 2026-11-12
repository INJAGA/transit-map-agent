# transit-map-agent

AI エージェントと会話しながら、静岡県のバス・鉄道データを地図で見るアプリ。
FastAPI（backend）と SvelteKit（frontend）で作っている。起動方法などは [AGENTS.md](AGENTS.md) を参照。

## データの出典

`frontend/static/data/` の GeoJSON は、次のデータを `frontend/scripts/build-transit-data.py` で加工して作成した。

- 出典: [国土数値情報](https://nlftp.mlit.go.jp/ksj/)（国土交通省）
  - バスルートデータ（N07, 令和4年度, 静岡県）
  - バス停留所データ（P11, 令和4年度, 静岡県）
  - 鉄道データ（N02, 令和7年度）

利用条件は各データのダウンロードページを参照。

## 背景地図

- © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- [OpenFreeMap](https://openfreemap.org/)
