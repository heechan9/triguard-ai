"""Create a lightweight web GeoJSON while preserving the canonical source file."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "korea_provinces.json"
OUTPUT = ROOT / "web" / "data" / "korea_provinces.json"
TOLERANCE = 0.006


def distance_sq(point, start, end):
    x, y = point
    x1, y1 = start
    x2, y2 = end
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return (x - x1) ** 2 + (y - y1) ** 2
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    px, py = x1 + t * dx, y1 + t * dy
    return (x - px) ** 2 + (y - py) ** 2


def simplify_line(points, tolerance=TOLERANCE):
    if len(points) <= 4:
        return points
    closed = points[0] == points[-1]
    core = points[:-1] if closed else points
    if len(core) <= 3:
        return points

    keep = {0, len(core) - 1}
    stack = [(0, len(core) - 1)]
    limit = tolerance * tolerance
    while stack:
        start, end = stack.pop()
        farthest, index = 0.0, None
        for candidate in range(start + 1, end):
            distance = distance_sq(core[candidate], core[start], core[end])
            if distance > farthest:
                farthest, index = distance, candidate
        if index is not None and farthest > limit:
            keep.add(index)
            stack.extend(((start, index), (index, end)))

    simplified = [core[index] for index in sorted(keep)]
    if len(simplified) < 3:
        simplified = core[:3]
    if closed:
        simplified.append(simplified[0])
    return simplified


def simplify_geometry(geometry):
    coordinates = geometry["coordinates"]
    if geometry["type"] == "Polygon":
        simplified = [[simplify_line(ring) for ring in coordinates][index] for index in range(len(coordinates))]
    elif geometry["type"] == "MultiPolygon":
        simplified = [[simplify_line(ring) for ring in polygon] for polygon in coordinates]
    else:
        raise ValueError(f"unsupported geometry: {geometry['type']}")
    return {"type": geometry["type"], "coordinates": simplified}


def main():
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    output = {"type": "FeatureCollection", "features": []}
    for feature in source["features"]:
        output["features"].append({
            "type": "Feature",
            "properties": {
                "name": feature["properties"]["name"],
                "code": feature["properties"].get("code"),
            },
            "geometry": simplify_geometry(feature["geometry"]),
        })
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
