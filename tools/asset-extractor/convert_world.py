#!/usr/bin/env python3
from __future__ import annotations

import argparse
import binascii
import hashlib
import json
import math
import struct
import zlib
from pathlib import Path

from convert import (
    KNOWN_ROMS,
    DIAGNOSTIC_PALETTE,
    decode_4bpp_tiles,
    decode_palette,
    extract_pokemon_assets,
    gba_offset,
    load_block_index,
    png_chunk,
    read_block,
    read_u16,
    read_u32,
    render_raw_previews,
    sha1_bytes,
    write_rgba_png,
)

WORLD_CONFIG = {
    "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc": {
        "id": "firered",
        "trainer_front_table": 0x0023957C,
        "trainer_palette_table": 0x00239A1C,
        "trainer_count": 148,
        "object_info_table": 0x0039FDB0,
        "object_palette_table": 0x003A5158,
        "object_count": 152,
        "tileset_table": 0x002D4A94,
        "tileset_count": 68,
        "primary_tile_count": 640,
        "primary_metatile_count": 640,
        "tileset_struct": "frlg",
    },
    "f3ae088181bf583e55daf962a92bb46f4f1d07b7": {
        "id": "emerald",
        "trainer_front_table": 0x00305654,
        "trainer_palette_table": 0x0030593C,
        "trainer_count": 93,
        "object_info_table": 0x00505620,
        "object_palette_table": 0x0050BBC8,
        "object_count": 239,
        "tileset_table": 0x003DF704,
        "tileset_count": 75,
        "primary_tile_count": 512,
        "primary_metatile_count": 512,
        "tileset_struct": "emerald",
    },
}


def slug(value: str) -> str:
    return (
        value.lower()
        .replace(" ", "_")
        .replace("-", "_")
        .replace("/", "_")
    )


def bgr555_to_rgba(value: int, transparent: bool = False):
    red = (value & 0x1F) * 255 // 31
    green = ((value >> 5) & 0x1F) * 255 // 31
    blue = ((value >> 10) & 0x1F) * 255 // 31
    return (red, green, blue, 0 if transparent else 255)


def decode_palette_set(
    rom: bytes,
    offset: int,
    count: int = 16,
    transparent_zero: bool = True,
):
    palettes = []
    for palette_index in range(count):
        start = offset + palette_index * 32
        raw = rom[start : start + 32]
        palette = []
        for color_index in range(16):
            value = read_u16(raw, color_index * 2)
            palette.append(
                bgr555_to_rgba(
                    value,
                    transparent=(transparent_zero and color_index == 0),
                )
            )
        palettes.append(palette)
    return palettes


def write_rgba_direct(path: Path, width: int, height: int, rgba):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = bytearray()
    for y in range(height):
        rows.append(0)
        for x in range(width):
            rows.extend(rgba[y * width + x])

    ihdr = struct.pack(
        ">IIBBBBB",
        width,
        height,
        8,
        6,
        0,
        0,
        0,
    )
    payload = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + png_chunk(b"IEND", b"")
    )
    path.write_bytes(payload)


def write_palette_preview(path: Path, palettes):
    cell = 8
    width = 16 * cell
    height = len(palettes) * cell
    rgba = [(0, 0, 0, 255)] * (width * height)

    for py, palette in enumerate(palettes):
        for px, color in enumerate(palette):
            opaque = (*color[:3], 255)
            for y in range(cell):
                for x in range(cell):
                    rgba[(py * cell + y) * width + px * cell + x] = opaque

    write_rgba_direct(path, width, height, rgba)


def load_metadata(path: Path):
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw


def extract_trainers(
    rom: bytes,
    blocks,
    config,
    metadata,
    output: Path,
):
    result = []
    claimed = set()

    names = metadata.get("trainer_names", {})
    gfx_table = config["trainer_front_table"]
    palette_table = config["trainer_palette_table"]

    for trainer_id in range(config["trainer_count"]):
        gfx_record = gfx_table + trainer_id * 8
        palette_record = palette_table + trainer_id * 8

        gfx_offset = gba_offset(
            read_u32(rom, gfx_record),
            len(rom),
        )
        palette_offset = gba_offset(
            read_u32(rom, palette_record),
            len(rom),
        )

        gfx = read_block(blocks, gfx_offset)
        palette_raw = read_block(blocks, palette_offset)

        if gfx is None or palette_raw is None:
            result.append(
                {
                    "id": trainer_id,
                    "name": names.get(str(trainer_id)),
                    "status": "missing-block",
                }
            )
            continue

        try:
            pixels = decode_4bpp_tiles(gfx, 64, 64)
            palette = decode_palette(palette_raw)
        except ValueError:
            result.append(
                {
                    "id": trainer_id,
                    "name": names.get(str(trainer_id)),
                    "status": "decode-error",
                }
            )
            continue

        name = names.get(str(trainer_id), f"trainer_{trainer_id}")
        relative = (
            Path("trainers/front")
            / f"{trainer_id:03d}_{slug(name)}.png"
        )
        write_rgba_png(
            output / relative,
            64,
            64,
            pixels,
            palette,
        )

        if gfx_offset is not None:
            claimed.add(gfx_offset)
        if palette_offset is not None:
            claimed.add(palette_offset)

        result.append(
            {
                "id": trainer_id,
                "name": name,
                "status": "ok",
                "gfx_offset": gfx_offset,
                "palette_offset": palette_offset,
                "file": relative.as_posix(),
            }
        )

    return {
        "rendered": sum(1 for x in result if x["status"] == "ok"),
        "total": config["trainer_count"],
        "entries": result,
        "claimed_offsets": claimed,
    }


def read_object_palette_map(rom: bytes, table_offset: int):
    palettes = {}

    for index in range(64):
        record = table_offset + index * 8
        pointer = read_u32(rom, record)
        tag = read_u16(rom, record + 4)

        if pointer == 0 and tag == 0:
            break

        offset = gba_offset(pointer, len(rom))
        if offset is None or offset + 32 > len(rom):
            break

        palettes[tag] = {
            "offset": offset,
            "raw": rom[offset : offset + 32],
        }

    return palettes


def object_info(rom: bytes, table_offset: int, object_id: int):
    pointer = read_u32(
        rom,
        table_offset + object_id * 4,
    )
    offset = gba_offset(pointer, len(rom))
    if offset is None:
        return None

    tile_tag = read_u16(rom, offset)
    palette_tag = read_u16(rom, offset + 2)
    reflection_palette_tag = read_u16(rom, offset + 4)
    size = read_u16(rom, offset + 6)
    width = struct.unpack_from("<h", rom, offset + 8)[0]
    height = struct.unpack_from("<h", rom, offset + 10)[0]
    images = gba_offset(read_u32(rom, offset + 0x1C), len(rom))

    return {
        "offset": offset,
        "tile_tag": tile_tag,
        "palette_tag": palette_tag,
        "reflection_palette_tag": reflection_palette_tag,
        "size": size,
        "width": width,
        "height": height,
        "images": images,
    }


def compose_frame_sheet(
    frames,
    frame_width: int,
    frame_height: int,
    columns: int = 6,
):
    if not frames:
        return 0, 0, []

    columns = max(1, min(columns, len(frames)))
    rows = math.ceil(len(frames) / columns)
    width = columns * frame_width
    height = rows * frame_height
    pixels = [0] * (width * height)

    for frame_index, frame in enumerate(frames):
        ox = (frame_index % columns) * frame_width
        oy = (frame_index // columns) * frame_height
        for y in range(frame_height):
            src = y * frame_width
            dst = (oy + y) * width + ox
            pixels[dst : dst + frame_width] = frame[
                src : src + frame_width
            ]

    return width, height, pixels


def extract_overworld(
    rom: bytes,
    config,
    metadata,
    output: Path,
):
    entries = []
    object_metadata = metadata.get("overworld", {})
    palette_map = read_object_palette_map(
        rom,
        config["object_palette_table"],
    )

    for object_id in range(config["object_count"]):
        meta = object_metadata.get(
            str(object_id),
            {},
        )
        name = meta.get("name", f"object_{object_id}")
        frame_count = int(meta.get("frame_count", 0) or 0)

        info = object_info(
            rom,
            config["object_info_table"],
            object_id,
        )
        if info is None or info["images"] is None:
            entries.append(
                {
                    "id": object_id,
                    "name": name,
                    "status": "missing-info",
                }
            )
            continue

        if (
            info["width"] <= 0
            or info["height"] <= 0
            or info["width"] % 8
            or info["height"] % 8
        ):
            entries.append(
                {
                    "id": object_id,
                    "name": name,
                    "status": "invalid-dimensions",
                }
            )
            continue

        if frame_count <= 0:
            frame_count = 1

        frame_count = min(frame_count, 64)
        frames = []
        frame_records = []

        for frame_index in range(frame_count):
            record = info["images"] + frame_index * 8
            pointer = read_u32(rom, record)
            frame_size = read_u16(rom, record + 4)
            frame_offset = gba_offset(pointer, len(rom))

            required = (
                info["width"] * info["height"] // 2
            )

            if (
                frame_offset is None
                or frame_size < required
                or frame_offset + frame_size > len(rom)
            ):
                break

            raw = rom[
                frame_offset : frame_offset + frame_size
            ]

            try:
                pixels = decode_4bpp_tiles(
                    raw,
                    info["width"],
                    info["height"],
                )
            except ValueError:
                break

            frames.append(pixels)
            frame_records.append(
                {
                    "index": frame_index,
                    "offset": frame_offset,
                    "size": frame_size,
                }
            )

        if not frames:
            entries.append(
                {
                    "id": object_id,
                    "name": name,
                    "status": "no-frames",
                }
            )
            continue

        palette_record = palette_map.get(
            info["palette_tag"]
        )

        if palette_record is None:
            palette = DIAGNOSTIC_PALETTE
            palette_offset = None
        else:
            palette = decode_palette(
                palette_record["raw"]
            )
            palette_offset = palette_record["offset"]

        sheet_width, sheet_height, pixels = compose_frame_sheet(
            frames,
            info["width"],
            info["height"],
        )

        relative = (
            Path("overworld")
            / f"{object_id:03d}_{slug(name)}.png"
        )
        write_rgba_png(
            output / relative,
            sheet_width,
            sheet_height,
            pixels,
            palette,
        )

        entries.append(
            {
                "id": object_id,
                "name": name,
                "status": "ok",
                "file": relative.as_posix(),
                "frame_width": info["width"],
                "frame_height": info["height"],
                "frame_count": len(frames),
                "columns": min(6, len(frames)),
                "palette_tag": info["palette_tag"],
                "palette_offset": palette_offset,
                "graphics_info_offset": info["offset"],
                "frames": frame_records,
            }
        )

    return {
        "rendered": sum(1 for x in entries if x["status"] == "ok"),
        "total": config["object_count"],
        "entries": entries,
    }


def parse_tilesets(rom: bytes, config, metadata):
    names = metadata.get("tileset_names", [])
    table = config["tileset_table"]
    count = config["tileset_count"]
    result = []

    for tileset_id in range(count):
        offset = table + tileset_id * 24
        is_compressed = rom[offset]
        is_secondary = rom[offset + 1] != 0

        tiles = gba_offset(
            read_u32(rom, offset + 4),
            len(rom),
        )
        palettes = gba_offset(
            read_u32(rom, offset + 8),
            len(rom),
        )
        metatiles = gba_offset(
            read_u32(rom, offset + 12),
            len(rom),
        )

        if config["tileset_struct"] == "frlg":
            callback = read_u32(rom, offset + 16)
            attributes = gba_offset(
                read_u32(rom, offset + 20),
                len(rom),
            )
        else:
            attributes = gba_offset(
                read_u32(rom, offset + 16),
                len(rom),
            )
            callback = read_u32(rom, offset + 20)

        result.append(
            {
                "id": tileset_id,
                "name": (
                    names[tileset_id]
                    if tileset_id < len(names)
                    else f"Tileset{tileset_id}"
                ),
                "struct_offset": offset,
                "is_compressed": bool(is_compressed),
                "is_secondary": is_secondary,
                "tiles_offset": tiles,
                "palettes_offset": palettes,
                "metatiles_offset": metatiles,
                "attributes_offset": attributes,
                "callback": callback,
            }
        )

    return result


def decode_tiles(raw: bytes):
    if len(raw) % 32:
        raw = raw[: len(raw) - (len(raw) % 32)]

    tiles = []
    for tile_index in range(len(raw) // 32):
        tile = raw[
            tile_index * 32 : (tile_index + 1) * 32
        ]
        tiles.append(
            decode_4bpp_tiles(tile, 8, 8)
        )
    return tiles


def render_metatile_atlas(
    rom: bytes,
    blocks,
    tileset,
    primary_tileset,
    primary_tile_count: int,
    output: Path,
):
    own_raw = read_block(
        blocks,
        tileset["tiles_offset"],
    )
    if own_raw is None:
        return None

    own_tiles = decode_tiles(own_raw)
    primary_tiles = []

    if primary_tileset is not None:
        primary_raw = read_block(
            blocks,
            primary_tileset["tiles_offset"],
        )
        if primary_raw is not None:
            primary_tiles = decode_tiles(primary_raw)

    palette_offset = tileset["palettes_offset"]
    if palette_offset is None:
        return None

    palettes = decode_palette_set(
        rom,
        palette_offset,
        16,
        transparent_zero=True,
    )

    metatile_offset = tileset["metatiles_offset"]
    attributes_offset = tileset["attributes_offset"]

    if (
        metatile_offset is None
        or attributes_offset is None
        or attributes_offset <= metatile_offset
    ):
        return None

    raw_metatiles = rom[
        metatile_offset : attributes_offset
    ]
    metatile_count = len(raw_metatiles) // 16

    if metatile_count <= 0:
        return None

    per_row = 16
    width = per_row * 16
    rows = math.ceil(metatile_count / per_row)
    height = rows * 16
    rgba = [(0, 0, 0, 0)] * (width * height)

    missing_primary_refs = 0
    missing_secondary_refs = 0

    def get_tile(tile_id: int):
        nonlocal missing_primary_refs
        nonlocal missing_secondary_refs

        if not tileset["is_secondary"]:
            if tile_id < len(own_tiles):
                return own_tiles[tile_id]
            missing_primary_refs += 1
            return None

        if tile_id < primary_tile_count:
            if tile_id < len(primary_tiles):
                return primary_tiles[tile_id]
            missing_primary_refs += 1
            return None

        local_id = tile_id - primary_tile_count
        if local_id < len(own_tiles):
            return own_tiles[local_id]

        missing_secondary_refs += 1
        return None

    for metatile_id in range(metatile_count):
        entries = struct.unpack_from(
            "<8H",
            raw_metatiles,
            metatile_id * 16,
        )
        base_x = (metatile_id % per_row) * 16
        base_y = (metatile_id // per_row) * 16

        for entry_index, value in enumerate(entries):
            tile_id = value & 0x03FF
            x_flip = bool(value & 0x0400)
            y_flip = bool(value & 0x0800)
            palette_id = (value >> 12) & 0x0F

            tile = get_tile(tile_id)
            if tile is None:
                continue

            quadrant = entry_index % 4
            tile_x = (quadrant % 2) * 8
            tile_y = (quadrant // 2) * 8

            for y in range(8):
                source_y = 7 - y if y_flip else y
                for x in range(8):
                    source_x = 7 - x if x_flip else x
                    color_index = tile[
                        source_y * 8 + source_x
                    ]

                    if color_index == 0:
                        continue

                    rgba[
                        (base_y + tile_y + y) * width
                        + base_x
                        + tile_x
                        + x
                    ] = palettes[palette_id][color_index]

    write_rgba_direct(
        output,
        width,
        height,
        rgba,
    )

    return {
        "metatile_count": metatile_count,
        "tile_count": len(own_tiles),
        "missing_primary_refs": missing_primary_refs,
        "missing_secondary_refs": missing_secondary_refs,
    }


def extract_tilesets(
    rom: bytes,
    blocks,
    config,
    metadata,
    output: Path,
):
    tilesets = parse_tilesets(
        rom,
        config,
        metadata,
    )
    by_name = {
        item["name"]: item
        for item in tilesets
    }
    associations = metadata.get(
        "tileset_primary_associations",
        {},
    )

    entries = []
    claimed = set()

    for tileset in tilesets:
        name = tileset["name"]
        directory = (
            Path("tilesets")
            / f"{tileset['id']:02d}_{slug(name)}"
        )
        root = output / directory
        root.mkdir(parents=True, exist_ok=True)

        tiles_raw = read_block(
            blocks,
            tileset["tiles_offset"],
        )

        if tiles_raw is None:
            entries.append(
                {
                    **tileset,
                    "status": "missing-tiles",
                }
            )
            continue

        claimed.add(tileset["tiles_offset"])

        (root / "tiles.4bpp").write_bytes(
            tiles_raw
        )

        palette_offset = tileset["palettes_offset"]
        if palette_offset is not None:
            palette_raw = rom[
                palette_offset : palette_offset + 16 * 32
            ]
            (root / "palettes.gbapal").write_bytes(
                palette_raw
            )
            palettes = decode_palette_set(
                rom,
                palette_offset,
                16,
                transparent_zero=False,
            )
            write_palette_preview(
                root / "palettes.png",
                palettes,
            )

        metatile_offset = tileset["metatiles_offset"]
        attributes_offset = tileset["attributes_offset"]

        if (
            metatile_offset is not None
            and attributes_offset is not None
            and attributes_offset > metatile_offset
        ):
            (root / "metatiles.bin").write_bytes(
                rom[
                    metatile_offset : attributes_offset
                ]
            )

            attribute_size = (
                4
                if config["tileset_struct"] == "frlg"
                else 2
            )
            metatile_count = (
                attributes_offset - metatile_offset
            ) // 16
            (root / "attributes.bin").write_bytes(
                rom[
                    attributes_offset :
                    attributes_offset
                    + metatile_count * attribute_size
                ]
            )

        variants = []
        primary_candidates = associations.get(name, [])

        if not tileset["is_secondary"]:
            primary_candidates = [name]

        if not primary_candidates:
            primary_candidates = [None]

        for primary_name in primary_candidates:
            if primary_name in (None, "NULL"):
                primary_tileset = None
                suffix = "standalone"
            else:
                primary_tileset = by_name.get(primary_name)
                suffix = f"with_{slug(primary_name)}"

            preview = root / f"metatiles_{suffix}.png"
            stats = render_metatile_atlas(
                rom,
                blocks,
                tileset,
                primary_tileset,
                config["primary_tile_count"],
                preview,
            )

            if stats is not None:
                variants.append(
                    {
                        "primary": primary_name,
                        "file": (
                            directory
                            / preview.name
                        ).as_posix(),
                        **stats,
                    }
                )

        entries.append(
            {
                **tileset,
                "status": "ok",
                "directory": directory.as_posix(),
                "variants": variants,
            }
        )

    return {
        "rendered": sum(1 for x in entries if x["status"] == "ok"),
        "total": len(tilesets),
        "entries": entries,
        "claimed_offsets": claimed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Convert FireRed/Emerald local ROM data into "
            "world assets for Tactimon"
        )
    )
    parser.add_argument(
        "rom",
        type=Path,
        help="Supported FireRed/Emerald .gba",
    )
    parser.add_argument(
        "--extracted",
        type=Path,
        default=Path("local-assets/extracted"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
    )
    parser.add_argument(
        "--metadata",
        type=Path,
        default=Path(
            "tools/asset-extractor/rom-assets-gen3.json"
        ),
    )
    parser.add_argument(
        "--species-names",
        type=Path,
        default=Path(
            "tools/asset-extractor/species-gen3.json"
        ),
    )

    parser.add_argument("--trainers", action="store_true")
    parser.add_argument("--overworld", action="store_true")
    parser.add_argument("--tilesets", action="store_true")
    parser.add_argument(
        "--pokemon",
        action="store_true",
        help="Optional legacy Pokemon battle sprite conversion",
    )
    parser.add_argument(
        "--raw-previews",
        action="store_true",
        help="Render miscellaneous LZ77 4bpp candidates",
    )
    parser.add_argument(
        "--max-previews",
        type=int,
        default=None,
    )

    args = parser.parse_args()

    rom = args.rom.read_bytes()
    digest = sha1_bytes(rom)

    config = WORLD_CONFIG.get(digest)
    pokemon_game = KNOWN_ROMS.get(digest)

    if config is None or pokemon_game is None:
        raise SystemExit(
            f"Unsupported ROM SHA-1: {digest}"
        )

    all_metadata = load_metadata(args.metadata)
    metadata = all_metadata[config["id"]]

    extracted = args.extracted / config["id"]
    if not (extracted / "manifest.json").exists():
        raise SystemExit(
            f"Missing {extracted / 'manifest.json'}; "
            "run extract.py first."
        )

    output = args.output or (
        extracted / "assets"
    )
    output.mkdir(parents=True, exist_ok=True)
    blocks = load_block_index(extracted)

    explicit = any(
        (
            args.trainers,
            args.overworld,
            args.tilesets,
            args.pokemon,
            args.raw_previews,
        )
    )

    do_trainers = args.trainers or not explicit
    do_overworld = args.overworld or not explicit
    do_tilesets = args.tilesets or not explicit

    result = {
        "format": 2,
        "game": config["id"],
        "rom_sha1": digest,
    }

    if do_trainers:
        trainers = extract_trainers(
            rom,
            blocks,
            config,
            metadata,
            output,
        )
        result["trainers"] = {
            k: v
            for k, v in trainers.items()
            if k != "claimed_offsets"
        }
        print(
            "Trainer sprites: "
            f"{trainers['rendered']}/{trainers['total']}"
        )

    if do_overworld:
        overworld = extract_overworld(
            rom,
            config,
            metadata,
            output,
        )
        result["overworld"] = overworld
        print(
            "Overworld sheets: "
            f"{overworld['rendered']}/{overworld['total']}"
        )

    if do_tilesets:
        tilesets = extract_tilesets(
            rom,
            blocks,
            config,
            metadata,
            output,
        )
        result["tilesets"] = {
            k: v
            for k, v in tilesets.items()
            if k != "claimed_offsets"
        }
        print(
            "Tilesets: "
            f"{tilesets['rendered']}/{tilesets['total']}"
        )

    if args.pokemon:
        species = json.loads(
            args.species_names.read_text(
                encoding="utf-8"
            )
        )
        species = {
            int(key): value
            for key, value in species.items()
        }
        pokemon = extract_pokemon_assets(
            rom,
            pokemon_game,
            blocks,
            output,
            species,
        )
        result["pokemon"] = pokemon
        print(
            "Pokemon battle sprites: "
            f"{pokemon['rendered']}/{pokemon['species_total']}"
        )

    if args.raw_previews:
        previews = render_raw_previews(
            extracted,
            blocks,
            output,
            args.max_previews,
        )
        result["raw_previews"] = previews
        print(
            "Misc 4bpp previews: "
            f"{previews['rendered']}"
        )

    manifest = output / "world-asset-manifest.json"
    manifest.write_text(
        json.dumps(result, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Manifest: {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
