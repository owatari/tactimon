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

KNOWN_ROMS = {
    "f3ae088181bf583e55daf962a92bb46f4f1d07b7": {
        "id": "emerald",
        "title": "Pokemon Emerald",
        "species_count": 440,
        "tables": {
            "front": 0x00301418,
            "back": 0x003028B8,
            "normal_palette": 0x00303678,
            "shiny_palette": 0x00304438,
        },
    },
    "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc": {
        "id": "firered",
        "title": "Pokemon FireRed",
        "species_count": 440,
        "tables": {
            "front": 0x002350AC,
            "back": 0x0023654C,
            "normal_palette": 0x0023730C,
            "shiny_palette": 0x002380CC,
        },
    },
}

DIAGNOSTIC_PALETTE = [
    (0, 0, 0, 0),
    (32, 32, 32, 255),
    (64, 64, 64, 255),
    (96, 96, 96, 255),
    (128, 128, 128, 255),
    (160, 160, 160, 255),
    (192, 192, 192, 255),
    (224, 224, 224, 255),
    (255, 0, 0, 255),
    (0, 255, 0, 255),
    (0, 0, 255, 255),
    (255, 255, 0, 255),
    (255, 0, 255, 255),
    (0, 255, 255, 255),
    (255, 128, 0, 255),
    (255, 255, 255, 255),
]


def sha1_bytes(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def gba_offset(pointer: int, rom_size: int) -> int | None:
    if 0x08000000 <= pointer < 0x0A000000:
        offset = pointer - 0x08000000
        if 0 <= offset < rom_size:
            return offset
    return None


def read_u32(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def read_u16(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def load_block_index(extracted: Path) -> dict[int, Path]:
    manifest = json.loads(
        (extracted / "manifest.json").read_text(encoding="utf-8")
    )
    index: dict[int, Path] = {}

    for block in manifest.get("blocks", []):
        index[int(block["offset"])] = extracted / block["file"]

    return index


def read_block(blocks: dict[int, Path], offset: int | None) -> bytes | None:
    if offset is None:
        return None

    path = blocks.get(offset)
    if path is None or not path.exists():
        return None

    return path.read_bytes()


def bgr555_to_rgba(value: int) -> tuple[int, int, int, int]:
    red = (value & 0x1F) * 255 // 31
    green = ((value >> 5) & 0x1F) * 255 // 31
    blue = ((value >> 10) & 0x1F) * 255 // 31
    return (red, green, blue, 255)


def decode_palette(
    raw: bytes,
    colors: int = 16,
) -> list[tuple[int, int, int, int]]:
    count = min(colors, len(raw) // 2)
    palette = [
        bgr555_to_rgba(read_u16(raw, index * 2))
        for index in range(count)
    ]

    while len(palette) < colors:
        palette.append((255, 0, 255, 255))

    palette[0] = (*palette[0][:3], 0)
    return palette


def decode_4bpp_tiles(raw: bytes, width: int, height: int) -> list[int]:
    if width % 8 or height % 8:
        raise ValueError("4bpp tiled dimensions must be multiples of 8")

    tiles_x = width // 8
    tiles_y = height // 8
    needed = tiles_x * tiles_y * 32

    if len(raw) < needed:
        raise ValueError(
            f"not enough tile data: need {needed}, have {len(raw)}"
        )

    pixels = [0] * (width * height)

    for tile_y in range(tiles_y):
        for tile_x in range(tiles_x):
            tile_base = (tile_y * tiles_x + tile_x) * 32

            for y in range(8):
                row_base = tile_base + y * 4

                for pair in range(4):
                    value = raw[row_base + pair]
                    x = pair * 2
                    destination = (
                        (tile_y * 8 + y) * width
                        + tile_x * 8
                        + x
                    )

                    pixels[destination] = value & 0x0F
                    pixels[destination + 1] = value >> 4

    return pixels


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    checksum = binascii.crc32(kind + payload) & 0xFFFFFFFF
    return (
        struct.pack(">I", len(payload))
        + kind
        + payload
        + struct.pack(">I", checksum)
    )


def write_rgba_png(
    path: Path,
    width: int,
    height: int,
    pixels: list[int],
    palette: list[tuple[int, int, int, int]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    rows = bytearray()

    for y in range(height):
        rows.append(0)

        for x in range(width):
            palette_index = pixels[y * width + x]
            rgba = (
                palette[palette_index]
                if palette_index < len(palette)
                else (255, 0, 255, 255)
            )
            rows.extend(rgba)

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

    png = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + png_chunk(b"IEND", b"")
    )

    path.write_bytes(png)


def slug_from_species(
    species_id: int,
    names: dict[int, str],
) -> str:
    name = names.get(species_id)

    if not name:
        return f"{species_id:04d}"

    return f"{species_id:04d}_{name.lower()}"


def load_species_names(path: Path | None) -> dict[int, str]:
    if path is None or not path.exists():
        return {}

    raw = json.loads(path.read_text(encoding="utf-8"))
    return {int(key): str(value) for key, value in raw.items()}


def extract_pokemon_assets(
    rom: bytes,
    game: dict,
    blocks: dict[int, Path],
    output: Path,
    names: dict[int, str],
) -> dict:
    tables = game["tables"]
    species_count = int(game["species_count"])
    entries = []
    rendered = 0

    for species_id in range(species_count):
        front_record = tables["front"] + species_id * 8
        back_record = tables["back"] + species_id * 8
        normal_record = tables["normal_palette"] + species_id * 8
        shiny_record = tables["shiny_palette"] + species_id * 8

        front_offset = gba_offset(
            read_u32(rom, front_record),
            len(rom),
        )
        back_offset = gba_offset(
            read_u32(rom, back_record),
            len(rom),
        )
        normal_palette_offset = gba_offset(
            read_u32(rom, normal_record),
            len(rom),
        )
        shiny_palette_offset = gba_offset(
            read_u32(rom, shiny_record),
            len(rom),
        )

        front = read_block(blocks, front_offset)
        back = read_block(blocks, back_offset)
        normal_raw = read_block(blocks, normal_palette_offset)
        shiny_raw = read_block(blocks, shiny_palette_offset)

        if (
            front is None
            or back is None
            or normal_raw is None
            or shiny_raw is None
        ):
            entries.append(
                {
                    "species_id": species_id,
                    "status": "missing-block",
                    "front_offset": front_offset,
                    "back_offset": back_offset,
                    "normal_palette_offset": normal_palette_offset,
                    "shiny_palette_offset": shiny_palette_offset,
                }
            )
            continue

        try:
            front_pixels = decode_4bpp_tiles(front, 64, 64)
            back_pixels = decode_4bpp_tiles(back, 64, 64)
            normal_palette = decode_palette(normal_raw)
            shiny_palette = decode_palette(shiny_raw)
        except ValueError:
            entries.append(
                {
                    "species_id": species_id,
                    "status": "decode-error",
                }
            )
            continue

        slug = slug_from_species(species_id, names)

        paths = {
            "front_normal": (
                Path("pokemon/front/normal")
                / f"{slug}.png"
            ),
            "front_shiny": (
                Path("pokemon/front/shiny")
                / f"{slug}.png"
            ),
            "back_normal": (
                Path("pokemon/back/normal")
                / f"{slug}.png"
            ),
            "back_shiny": (
                Path("pokemon/back/shiny")
                / f"{slug}.png"
            ),
        }

        write_rgba_png(
            output / paths["front_normal"],
            64,
            64,
            front_pixels,
            normal_palette,
        )
        write_rgba_png(
            output / paths["front_shiny"],
            64,
            64,
            front_pixels,
            shiny_palette,
        )
        write_rgba_png(
            output / paths["back_normal"],
            64,
            64,
            back_pixels,
            normal_palette,
        )
        write_rgba_png(
            output / paths["back_shiny"],
            64,
            64,
            back_pixels,
            shiny_palette,
        )

        entries.append(
            {
                "species_id": species_id,
                "name": names.get(species_id),
                "status": "ok",
                "front_offset": front_offset,
                "back_offset": back_offset,
                "normal_palette_offset": normal_palette_offset,
                "shiny_palette_offset": shiny_palette_offset,
                "files": {
                    key: value.as_posix()
                    for key, value in paths.items()
                },
            }
        )

        rendered += 1

    return {
        "species_total": species_count,
        "rendered": rendered,
        "entries": entries,
    }


def choose_preview_dimensions(
    byte_length: int,
) -> tuple[int, int] | None:
    if byte_length < 32 or byte_length % 32:
        return None

    tile_count = byte_length // 32
    side = int(math.isqrt(tile_count))

    if side * side == tile_count:
        tiles_x = min(side, 16)
    else:
        tiles_x = min(16, tile_count)

    while tile_count % tiles_x and tiles_x > 1:
        tiles_x -= 1

    tiles_y = math.ceil(tile_count / tiles_x)
    return tiles_x * 8, tiles_y * 8


def render_raw_previews(
    blocks: dict[int, Path],
    output: Path,
    max_files: int | None,
) -> dict:
    entries = []
    count = 0

    for offset, path in sorted(blocks.items()):
        raw = path.read_bytes()
        dimensions = choose_preview_dimensions(len(raw))

        if dimensions is None or len(raw) == 32:
            continue

        width, height = dimensions

        try:
            pixels = decode_4bpp_tiles(
                raw,
                width,
                height,
            )
        except ValueError:
            continue

        relative = (
            Path("raw-previews/4bpp")
            / f"{offset:08X}_{len(raw):07d}.png"
        )

        write_rgba_png(
            output / relative,
            width,
            height,
            pixels,
            DIAGNOSTIC_PALETTE,
        )

        entries.append(
            {
                "offset": offset,
                "offset_hex": f"0x{offset:08X}",
                "bytes": len(raw),
                "width": width,
                "height": height,
                "file": relative.as_posix(),
            }
        )

        count += 1

        if max_files is not None and count >= max_files:
            break

    return {
        "rendered": len(entries),
        "entries": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Convert locally extracted GBA blocks "
            "into Tactimon assets"
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
        help="Raw extraction root",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help=(
            "Asset output root; defaults to "
            "<extracted>/<game>/assets"
        ),
    )
    parser.add_argument(
        "--species-names",
        type=Path,
        default=Path(
            "tools/asset-extractor/species-gen3.json"
        ),
    )
    parser.add_argument(
        "--raw-previews",
        action="store_true",
        help=(
            "Also render diagnostic 4bpp previews "
            "for raw blocks"
        ),
    )
    parser.add_argument(
        "--max-previews",
        type=int,
        default=None,
    )

    args = parser.parse_args()

    rom = args.rom.read_bytes()
    digest = sha1_bytes(rom)
    game = KNOWN_ROMS.get(digest)

    if game is None:
        raise SystemExit(
            f"Unsupported ROM SHA-1: {digest}"
        )

    extracted = args.extracted / game["id"]

    if not (extracted / "manifest.json").exists():
        raise SystemExit(
            f"Missing {extracted / 'manifest.json'}; "
            "run extract.py first."
        )

    blocks = load_block_index(extracted)
    output = args.output or (extracted / "assets")
    output.mkdir(parents=True, exist_ok=True)

    names = load_species_names(args.species_names)

    print(
        f"Converting {game['title']} -> {output}"
    )

    pokemon = extract_pokemon_assets(
        rom,
        game,
        blocks,
        output,
        names,
    )

    result = {
        "format": 1,
        "game": game["id"],
        "rom_sha1": digest,
        "pokemon": pokemon,
    }

    if args.raw_previews:
        result["raw_previews"] = render_raw_previews(
            blocks,
            output,
            args.max_previews,
        )

    manifest_path = output / "asset-manifest.json"
    manifest_path.write_text(
        json.dumps(result, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "Pokemon assets rendered: "
        f"{pokemon['rendered']}/"
        f"{pokemon['species_total']}"
    )

    if "raw_previews" in result:
        print(
            "Raw previews rendered: "
            f"{result['raw_previews']['rendered']}"
        )

    print(f"Manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
