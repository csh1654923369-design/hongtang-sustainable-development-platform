from __future__ import annotations

import gzip
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


SOURCE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = SOURCE_ROOT.parent
DSM_PATH = (
    WORKSPACE_ROOT
    / "平台素材"
    / "Production_1-tif"
    / "Production_1-tif_DSM_merge.tif"
)
WORLD_FILE = DSM_PATH.with_suffix(".tfw")
OUTPUT_DIRECTORY = SOURCE_ROOT / "public" / "data"
OUTPUT_GRID = OUTPUT_DIRECTORY / "hongtang-terrain-513.f32"
OUTPUT_REGIONAL_GRID = OUTPUT_DIRECTORY / "hongtang-terrain-context.f32"
OUTPUT_REGIONAL_RELIEF = OUTPUT_DIRECTORY / "hongtang-terrain-context.webp"
OUTPUT_METADATA = OUTPUT_DIRECTORY / "hongtang-terrain.json"
GRID_SIZE = 513
NO_DATA = -9999.0
SRTM_PATH = (
    WORKSPACE_ROOT
    / "平台素材"
    / "地形数据"
    / "SRTM_N24E099"
    / "N24E099.hgt.gz"
)
SRTM_SIZE = 3601
SRTM_WEST = 99.0
SRTM_NORTH = 25.0
REGIONAL_REQUESTED_BOUNDS = {
    "west": 99.82,
    "south": 24.55,
    "east": 99.99,
    "north": 24.73,
}


def utm_to_wgs84(easting: float, northing: float, zone: int = 47) -> dict[str, float]:
    semi_major_axis = 6_378_137.0
    eccentricity_squared = 0.00669438
    scale_factor = 0.9996
    x = easting - 500_000.0
    y = northing
    eccentricity_prime_squared = eccentricity_squared / (1.0 - eccentricity_squared)
    meridional_arc = y / scale_factor
    mu = meridional_arc / (
        semi_major_axis
        * (
            1.0
            - eccentricity_squared / 4.0
            - 3.0 * eccentricity_squared**2 / 64.0
            - 5.0 * eccentricity_squared**3 / 256.0
        )
    )
    e1 = (1.0 - math.sqrt(1.0 - eccentricity_squared)) / (
        1.0 + math.sqrt(1.0 - eccentricity_squared)
    )
    footprint_latitude = (
        mu
        + (3.0 * e1 / 2.0 - 27.0 * e1**3 / 32.0) * math.sin(2.0 * mu)
        + (21.0 * e1**2 / 16.0 - 55.0 * e1**4 / 32.0) * math.sin(4.0 * mu)
        + (151.0 * e1**3 / 96.0) * math.sin(6.0 * mu)
        + (1097.0 * e1**4 / 512.0) * math.sin(8.0 * mu)
    )
    c1 = eccentricity_prime_squared * math.cos(footprint_latitude) ** 2
    t1 = math.tan(footprint_latitude) ** 2
    n1 = semi_major_axis / math.sqrt(
        1.0 - eccentricity_squared * math.sin(footprint_latitude) ** 2
    )
    r1 = (
        semi_major_axis
        * (1.0 - eccentricity_squared)
        / (1.0 - eccentricity_squared * math.sin(footprint_latitude) ** 2) ** 1.5
    )
    d = x / (n1 * scale_factor)
    latitude = footprint_latitude - (
        n1
        * math.tan(footprint_latitude)
        / r1
        * (
            d**2 / 2.0
            - (
                5.0
                + 3.0 * t1
                + 10.0 * c1
                - 4.0 * c1**2
                - 9.0 * eccentricity_prime_squared
            )
            * d**4
            / 24.0
            + (
                61.0
                + 90.0 * t1
                + 298.0 * c1
                + 45.0 * t1**2
                - 252.0 * eccentricity_prime_squared
                - 3.0 * c1**2
            )
            * d**6
            / 720.0
        )
    )
    longitude = (
        d
        - (1.0 + 2.0 * t1 + c1) * d**3 / 6.0
        + (
            5.0
            - 2.0 * c1
            + 28.0 * t1
            - 3.0 * c1**2
            + 8.0 * eccentricity_prime_squared
            + 24.0 * t1**2
        )
        * d**5
        / 120.0
    ) / math.cos(footprint_latitude)
    central_meridian = math.radians((zone - 1) * 6 - 180 + 3)
    return {
        "longitude": math.degrees(central_meridian + longitude),
        "latitude": math.degrees(latitude),
    }


def fill_missing(grid: np.ndarray) -> np.ndarray:
    filled = grid.copy()
    x_coordinates = np.arange(filled.shape[1])
    for row_index in range(filled.shape[0]):
        row = filled[row_index]
        valid = np.isfinite(row)
        if valid.any():
            row[~valid] = np.interp(
                x_coordinates[~valid],
                x_coordinates[valid],
                row[valid],
            )

    y_coordinates = np.arange(filled.shape[0])
    for column_index in range(filled.shape[1]):
        column = filled[:, column_index]
        valid = np.isfinite(column)
        if valid.any():
            column[~valid] = np.interp(
                y_coordinates[~valid],
                y_coordinates[valid],
                column[valid],
            )

    remaining = ~np.isfinite(filled)
    if remaining.any():
        filled[remaining] = float(np.nanmedian(filled))
    return filled


def smooth_grid(grid: np.ndarray, passes: int = 2) -> np.ndarray:
    smoothed = grid.astype(np.float64, copy=True)
    for _ in range(passes):
        horizontal = np.pad(smoothed, ((0, 0), (1, 1)), mode="edge")
        smoothed = (
            horizontal[:, :-2]
            + 2.0 * horizontal[:, 1:-1]
            + horizontal[:, 2:]
        ) / 4.0
        vertical = np.pad(smoothed, ((1, 1), (0, 0)), mode="edge")
        smoothed = (
            vertical[:-2, :]
            + 2.0 * vertical[1:-1, :]
            + vertical[2:, :]
        ) / 4.0
    return smoothed.astype(np.float32)


def read_dsm_as_web_grid() -> tuple[np.ndarray, dict[str, int | float]]:
    Image.MAX_IMAGE_PIXELS = None
    with Image.open(DSM_PATH) as image:
        width, height = image.size
        if image.mode != "F" or image.info.get("compression") != "raw":
            raise RuntimeError("DSM must be an uncompressed 32-bit floating-point TIFF.")
        if len(image.tile) != height:
            raise RuntimeError("DSM TIFF scanline layout was not recognized.")
        first_offset = int(image.tile[0].offset)
        row_stride = int(image.tile[1].offset - image.tile[0].offset)
        if row_stride != width * 4:
            raise RuntimeError("DSM TIFF scanlines are not contiguous.")

    source = np.memmap(
        DSM_PATH,
        dtype="<f4",
        mode="r",
        offset=first_offset,
        shape=(height, width),
    )
    x_centers = np.linspace(0.0, width - 1.0, GRID_SIZE)
    y_centers = np.linspace(0.0, height - 1.0, GRID_SIZE)
    x_step = (width - 1.0) / (GRID_SIZE - 1)
    y_step = (height - 1.0) / (GRID_SIZE - 1)
    sample_offsets = np.array([-0.4, -0.2, 0.0, 0.2, 0.4])
    sample_x = np.clip(
        np.rint(x_centers[:, None] + sample_offsets[None, :] * x_step),
        0,
        width - 1,
    ).astype(np.int64)
    flat_x = sample_x.reshape(-1)
    web_grid = np.empty((GRID_SIZE, GRID_SIZE), dtype=np.float32)

    for output_row, y_center in enumerate(y_centers):
        sample_y = np.clip(
            np.rint(y_center + sample_offsets * y_step),
            0,
            height - 1,
        ).astype(np.int64)
        samples = np.empty((len(sample_y), GRID_SIZE, len(sample_offsets)))
        for sample_row, source_y in enumerate(sample_y):
            samples[sample_row] = source[source_y, flat_x].reshape(
                GRID_SIZE,
                len(sample_offsets),
            )
        samples[samples <= NO_DATA + 1.0] = np.nan
        with np.errstate(all="ignore"):
            web_grid[output_row] = np.nanpercentile(
                samples,
                25.0,
                axis=(0, 2),
            )

    web_grid = fill_missing(web_grid)
    web_grid = smooth_grid(web_grid)
    return web_grid, {
        "sourceWidth": width,
        "sourceHeight": height,
        "sourceDataOffset": first_offset,
        "sourceRowStride": row_stride,
    }



def read_srtm_context() -> tuple[np.ndarray, dict[str, float]]:
    if not SRTM_PATH.is_file():
        raise FileNotFoundError(
            "Regional SRTM source is missing. Expected "
            f"{SRTM_PATH}"
        )
    with gzip.open(SRTM_PATH, "rb") as source_file:
        source_bytes = source_file.read()
    expected_bytes = SRTM_SIZE * SRTM_SIZE * 2
    if len(source_bytes) != expected_bytes:
        raise RuntimeError(
            f"Unexpected SRTM size: {len(source_bytes)} != {expected_bytes}"
        )
    source = np.frombuffer(source_bytes, dtype=">i2").reshape(
        SRTM_SIZE,
        SRTM_SIZE,
    )
    west = REGIONAL_REQUESTED_BOUNDS["west"]
    south = REGIONAL_REQUESTED_BOUNDS["south"]
    east = REGIONAL_REQUESTED_BOUNDS["east"]
    north = REGIONAL_REQUESTED_BOUNDS["north"]
    x0 = int(round((west - SRTM_WEST) * (SRTM_SIZE - 1)))
    x1 = int(round((east - SRTM_WEST) * (SRTM_SIZE - 1)))
    y0 = int(round((SRTM_NORTH - north) * (SRTM_SIZE - 1)))
    y1 = int(round((SRTM_NORTH - south) * (SRTM_SIZE - 1)))
    regional_grid = source[y0 : y1 + 1, x0 : x1 + 1].astype(np.float32)
    regional_grid[regional_grid <= -32768] = np.nan
    regional_grid = fill_missing(regional_grid)
    actual_bounds = {
        "west": SRTM_WEST + x0 / (SRTM_SIZE - 1),
        "south": SRTM_NORTH - y1 / (SRTM_SIZE - 1),
        "east": SRTM_WEST + x1 / (SRTM_SIZE - 1),
        "north": SRTM_NORTH - y0 / (SRTM_SIZE - 1),
    }
    return regional_grid, actual_bounds


def sample_axis_aligned_grid(
    grid: np.ndarray,
    bounds: dict[str, float],
    longitudes: np.ndarray,
    latitudes: np.ndarray,
) -> np.ndarray:
    grid_x = (
        (longitudes - bounds["west"])
        / (bounds["east"] - bounds["west"])
        * (grid.shape[1] - 1)
    )
    grid_y = (
        (bounds["north"] - latitudes)
        / (bounds["north"] - bounds["south"])
        * (grid.shape[0] - 1)
    )
    grid_x = np.clip(grid_x, 0, grid.shape[1] - 1)
    grid_y = np.clip(grid_y, 0, grid.shape[0] - 1)
    x0 = np.floor(grid_x).astype(np.int64)
    y0 = np.floor(grid_y).astype(np.int64)
    x1 = np.minimum(grid.shape[1] - 1, x0 + 1)
    y1 = np.minimum(grid.shape[0] - 1, y0 + 1)
    amount_x = grid_x - x0
    amount_y = grid_y - y0
    top = grid[y0, x0] * (1.0 - amount_x) + grid[y0, x1] * amount_x
    bottom = grid[y1, x0] * (1.0 - amount_x) + grid[y1, x1] * amount_x
    return top * (1.0 - amount_y) + bottom * amount_y


def align_regional_grid_to_dsm(
    regional_grid: np.ndarray,
    regional_bounds: dict[str, float],
    dsm_grid: np.ndarray,
    dsm_corners: dict[str, dict[str, float]],
) -> tuple[np.ndarray, float]:
    u = np.linspace(0.0, 1.0, dsm_grid.shape[1])[None, :]
    v = np.linspace(0.0, 1.0, dsm_grid.shape[0])[:, None]
    north_west = dsm_corners["northWest"]
    north_east = dsm_corners["northEast"]
    south_west = dsm_corners["southWest"]
    longitude_grid = (
        north_west["longitude"]
        + u * (north_east["longitude"] - north_west["longitude"])
        + v * (south_west["longitude"] - north_west["longitude"])
    )
    latitude_grid = (
        north_west["latitude"]
        + u * (north_east["latitude"] - north_west["latitude"])
        + v * (south_west["latitude"] - north_west["latitude"])
    )
    regional_at_dsm = sample_axis_aligned_grid(
        regional_grid,
        regional_bounds,
        longitude_grid,
        latitude_grid,
    )
    offset = float(np.median(dsm_grid - regional_at_dsm))
    return (regional_grid + offset).astype(np.float32), offset


def create_relief_image(
    grid: np.ndarray,
    bounds: dict[str, float],
    output_path: Path,
) -> None:
    center_latitude = (bounds["north"] + bounds["south"]) / 2.0
    meters_x = (
        (bounds["east"] - bounds["west"])
        * 111_320.0
        * math.cos(math.radians(center_latitude))
        / (grid.shape[1] - 1)
    )
    meters_y = (
        (bounds["north"] - bounds["south"])
        * 110_540.0
        / (grid.shape[0] - 1)
    )
    gradient_y, gradient_x = np.gradient(
        grid.astype(np.float64),
        meters_y,
        meters_x,
    )
    slope = np.arctan(np.hypot(gradient_x, gradient_y))
    aspect = np.arctan2(-gradient_x, gradient_y)
    altitude = math.radians(42.0)
    azimuth = math.radians(315.0)
    hillshade = (
        math.sin(altitude) * np.cos(slope)
        + math.cos(altitude) * np.sin(slope) * np.cos(azimuth - aspect)
    )
    hillshade = np.clip((hillshade + 0.15) / 1.15, 0.0, 1.0)

    low, _, high = np.percentile(grid, [4.0, 56.0, 97.0])
    normalized = np.clip((grid - low) / max(1.0, high - low), 0.0, 1.0)
    color_stops = np.array([0.0, 0.38, 0.7, 1.0])
    colors = np.array(
        [
            [75, 112, 72],
            [124, 147, 90],
            [157, 139, 102],
            [211, 205, 186],
        ],
        dtype=np.float64,
    )
    rgb = np.stack(
        [
            np.interp(normalized, color_stops, colors[:, channel])
            for channel in range(3)
        ],
        axis=-1,
    )
    brightness = 0.48 + hillshade[..., None] * 0.72
    rgb = np.clip(rgb * brightness, 0, 255).astype(np.uint8)
    Image.fromarray(rgb, mode="RGB").save(
        output_path,
        "WEBP",
        quality=88,
        method=6,
    )


def main() -> None:
    if not DSM_PATH.is_file() or not WORLD_FILE.is_file():
        raise FileNotFoundError("DSM source or world file is missing.")
    world_values = [float(value) for value in WORLD_FILE.read_text().split()]
    if len(world_values) != 6:
        raise RuntimeError("DSM world file must contain six numeric values.")
    pixel_width, rotation_y, rotation_x, pixel_height, center_x, center_y = world_values
    if rotation_x != 0.0 or rotation_y != 0.0:
        raise RuntimeError("Rotated DSM world files are not supported.")

    grid, source_layout = read_dsm_as_web_grid()
    source_width = int(source_layout["sourceWidth"])
    source_height = int(source_layout["sourceHeight"])
    west = center_x - pixel_width / 2.0
    north = center_y - pixel_height / 2.0
    east = west + pixel_width * source_width
    south = north + pixel_height * source_height
    corners = {
        "northWest": utm_to_wgs84(west, north),
        "northEast": utm_to_wgs84(east, north),
        "southWest": utm_to_wgs84(west, south),
        "southEast": utm_to_wgs84(east, south),
    }
    longitudes = [corner["longitude"] for corner in corners.values()]
    latitudes = [corner["latitude"] for corner in corners.values()]
    regional_grid, regional_bounds = read_srtm_context()
    regional_grid, regional_vertical_offset = align_regional_grid_to_dsm(
        regional_grid,
        regional_bounds,
        grid,
        corners,
    )
    regional_edge = np.concatenate(
        [
            regional_grid[0, :],
            regional_grid[-1, :],
            regional_grid[:, 0],
            regional_grid[:, -1],
        ],
    )
    fallback_height = float(np.median(regional_edge))

    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    grid.astype("<f4").tofile(OUTPUT_GRID)
    regional_grid.astype("<f4").tofile(OUTPUT_REGIONAL_GRID)
    create_relief_image(
        regional_grid,
        regional_bounds,
        OUTPUT_REGIONAL_RELIEF,
    )
    metadata = {
        "title": "红塘村核心DSM与周边SRTM两层本地地形",
        "heightAsset": f"/data/{OUTPUT_GRID.name}",
        "sourceAsset": (
            "../平台素材/Production_1-tif/Production_1-tif_DSM_merge.tif"
        ),
        "sourceKeptOutsideRepository": True,
        "coordinateReferenceSystem": "EPSG:32647",
        "gridWidth": GRID_SIZE,
        "gridHeight": GRID_SIZE,
        "tileSampleWidth": 32,
        "tileSampleHeight": 32,
        "byteOrder": "little-endian-float32",
        "gridOrder": "north-to-south rows, west-to-east columns",
        "sourceNoData": NO_DATA,
        "sourcePixelSizeMeters": abs(pixel_width),
        "effectiveGridSpacingMeters": {
            "x": abs(pixel_width) * (source_width - 1) / (GRID_SIZE - 1),
            "y": abs(pixel_height) * (source_height - 1) / (GRID_SIZE - 1),
        },
        "surfaceMethod": "25th-percentile neighborhood sampling plus two smoothing passes",
        "utmBounds": {
            "west": west,
            "south": south,
            "east": east,
            "north": north,
        },
        "wgs84Corners": corners,
        "wgs84Bounds": {
            "west": min(longitudes),
            "south": min(latitudes),
            "east": max(longitudes),
            "north": max(latitudes),
        },
        "fallbackHeight": fallback_height,
        "statistics": {
            "minimum": float(grid.min()),
            "maximum": float(grid.max()),
            "mean": float(grid.mean()),
        },
        "sourceLayout": source_layout,
        "outputBytes": OUTPUT_GRID.stat().st_size,
        "regionalContext": {
            "heightAsset": f"/data/{OUTPUT_REGIONAL_GRID.name}",
            "reliefAsset": f"/data/{OUTPUT_REGIONAL_RELIEF.name}",
            "sourceAsset": (
                "../平台素材/地形数据/SRTM_N24E099/N24E099.hgt.gz"
            ),
            "sourceUrl": (
                "https://s3.amazonaws.com/elevation-tiles-prod/"
                "skadi/N24/N24E099.hgt.gz"
            ),
            "sourceDataset": "Mapzen Terrain Tiles on AWS",
            "sourceAccess": "public, no account or API key required",
            "gridWidth": int(regional_grid.shape[1]),
            "gridHeight": int(regional_grid.shape[0]),
            "wgs84Bounds": regional_bounds,
            "verticalOffsetToLocalDsmMeters": regional_vertical_offset,
            "statistics": {
                "minimum": float(regional_grid.min()),
                "maximum": float(regional_grid.max()),
                "mean": float(regional_grid.mean()),
            },
            "heightOutputBytes": OUTPUT_REGIONAL_GRID.stat().st_size,
            "reliefOutputBytes": OUTPUT_REGIONAL_RELIEF.stat().st_size,
        },
    }
    OUTPUT_METADATA.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {OUTPUT_GRID}")
    print(f"Generated {OUTPUT_REGIONAL_GRID}")
    print(f"Generated {OUTPUT_REGIONAL_RELIEF}")
    print(f"Generated {OUTPUT_METADATA}")
    print(
        "Grid "
        f"{GRID_SIZE}x{GRID_SIZE}, "
        f"{OUTPUT_GRID.stat().st_size / 1024 / 1024:.2f} MB, "
        f"heights {grid.min():.2f}-{grid.max():.2f} m"
    )
    print(
        "Regional context "
        f"{regional_grid.shape[1]}x{regional_grid.shape[0]}, "
        f"{OUTPUT_REGIONAL_GRID.stat().st_size / 1024 / 1024:.2f} MB, "
        f"heights {regional_grid.min():.2f}-{regional_grid.max():.2f} m, "
        f"vertical offset {regional_vertical_offset:.2f} m"
    )


if __name__ == "__main__":
    main()
