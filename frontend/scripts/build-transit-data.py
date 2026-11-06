"""国土数値情報の GeoJSON を静岡県分だけ・属性名を読める名前にして static/data/ に書き出す（手で1回走らせる）.

入力（https://nlftp.mlit.go.jp/ksj/ から落として展開したもの）:
  N07-22_22_SHP.zip の N07-22_22.geojson (バスルート 静岡県)
  P11-22_22_SHP.zip の P11-22_22.geojson (バス停留所 静岡県)
  N02-25_GML.zip の UTF-8/N02-25_RailroadSection.geojson (鉄道 全国)
使い方: python3 scripts/build-transit-data.py <N07.geojson> <P11.geojson> <N02.geojson>
配布のままだと座標が15桁でバス停は空欄の系統が35枠ずつあり重いので、丸めて詰める.
"""

import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "static" / "data"
# shortcut: 鉄道は県境ではなく静岡県の外接矩形で切るので、隣県の端が少し入る. 厳密にしたくなったら行政区域(N03)で切る
BBOX = (137.47, 34.57, 139.18, 35.65)
BUS_TYPE = {"1": "民間", "2": "公営", "3": "コミュニティバス"}
RAIL_TYPE = {"1": "新幹線", "2": "JR在来線", "3": "公営鉄道", "4": "民営鉄道", "5": "第三セクター"}


def features(path: str) -> list[dict]:
    return json.loads(Path(path).read_text("utf-8"))["features"]


def round_coords(c):
    return round(c, 5) if isinstance(c, (int, float)) else [round_coords(x) for x in c]


def feature(f: dict, properties: dict) -> dict:
    geometry = {"type": f["geometry"]["type"], "coordinates": round_coords(f["geometry"]["coordinates"])}
    return {"type": "Feature", "geometry": geometry, "properties": properties}


def bus_routes(path: str) -> list[dict]:
    return [feature(f, {"operator": f["properties"]["N07_001"]}) for f in features(path)]


def bus_stops(path: str) -> list[dict]:
    out = []
    for f in features(path):
        p = f["properties"]

        # 系統は「名前,名前,...」で _01 に入り、DBF の文字数上限を超えた分が _02 以降に続く
        def split(key: str) -> list[str]:
            return ",".join(v for i in range(1, 36) if (v := p[f"{key}_{i:02}"])).split(",")

        names, types = split("P11_003"), split("P11_004")
        assert len(names) == len(types), p
        routes = [{"name": n, "type": BUS_TYPE.get(t, "")} for n, t in zip(names, types)]
        out.append(feature(f, {"name": p["P11_001"], "operator": p["P11_002"], "routes": routes}))
    return out


def railways(path: str) -> list[dict]:
    x0, y0, x1, y1 = BBOX
    return [
        feature(f, {"name": p["N02_003"], "operator": p["N02_004"], "type": RAIL_TYPE.get(p["N02_002"], "")})
        for f in features(path)
        if any(x0 <= x <= x1 and y0 <= y <= y1 for x, y in f["geometry"]["coordinates"])
        for p in [f["properties"]]
    ]


def write(name: str, data: list[dict]) -> None:
    assert data, name
    OUT.mkdir(parents=True, exist_ok=True)
    fc = {"type": "FeatureCollection", "features": data}
    (OUT / name).write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"{name}: {len(data)} features")


if __name__ == "__main__":
    n07, p11, n02 = sys.argv[1:4]
    write("bus-routes.geojson", bus_routes(n07))
    write("bus-stops.geojson", bus_stops(p11))
    write("railways.geojson", railways(n02))
