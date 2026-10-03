from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import struct
from pathlib import Path
from typing import Any

KNOWN_SHA1 = "5fa96ca8d8dd6405d6cd2bad73ed68bc73a9d152"
GAME_CODE = "C2SE"
EXPECTED_EFFECT_COUNT = 293
OVERLAY10_ID = 10
OVERLAY10_MOVE_TABLE_RAM = 0x022C9064
OVERLAY10_EFFECT_TABLE_RAM = 0x022CC52C
MOVE_RECORD_SIZE = 24
EFFECT_RECORD_SIZE = 28

MOVE_IDS = {
    "tail-whip": 122,
    "tackle": 154,
    "growl": 217,
    "scratch": 260,
}

TACTIMON_MOVE_EFFECTS = {
    "scratch": {
        "effect_animation_id": 138,
        "mapping": "canonical",
        "note": "Scratch WAN used by EoS.",
    },
    "growl": {
        "effect_animation_id": 274,
        "mapping": "canonical",
        "note": "Growl/Howl-style EoS effect referenced by the move animation table.",
    },
    "tackle": {
        "effect_animation_id": 275,
        "mapping": "proxy",
        "note": "Visible physical impact proxy; EoS Tackle's own effect entry is effectively sound/no visual.",
    },
    "tail-whip": {
        "effect_animation_id": 287,
        "mapping": "proxy",
        "note": "Defense-lowering visual proxy from EoS.",
    },
}

EFFECT_FILE_TYPES = {
    0: "invalid",
    1: "wan-file-0",
    2: "wan-file-1",
    3: "wan",
    4: "wat",
    5: "screen",
    6: "wba",
}


def u16(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def s16(data: bytes, offset: int) -> int:
    return struct.unpack_from("<h", data, offset)[0]


def parse_nitrofs(rom: bytes) -> dict[str, dict[str, int]]:
    fnt_off, fnt_size = struct.unpack_from("<II", rom, 0x40)
    fat_off, fat_size = struct.unpack_from("<II", rom, 0x48)
    fnt = rom[fnt_off : fnt_off + fnt_size]
    if len(fnt) < 8:
        raise ValueError("Invalid NDS FNT")

    _, _, directory_count = struct.unpack_from("<IHH", fnt, 0)
    if directory_count <= 0:
        raise ValueError("Invalid NDS directory count")

    directories = [
        struct.unpack_from("<IHH", fnt, index * 8)
        for index in range(directory_count)
    ]
    files: dict[str, dict[str, int]] = {}

    def walk(directory_id: int, parts: list[str]) -> None:
        index = directory_id - 0xF000
        if index < 0 or index >= len(directories):
            raise ValueError(
                f"Invalid NitroFS directory id: {directory_id:#x}"
            )

        subtable_offset, first_file_id, _ = directories[index]
        position = subtable_offset
        file_id = first_file_id

        while True:
            if position >= len(fnt):
                raise ValueError(
                    "NitroFS directory entry runs past FNT"
                )
            length = fnt[position]
            position += 1
            if length == 0:
                break

            is_directory = bool(length & 0x80)
            name_length = length & 0x7F
            name = fnt[
                position : position + name_length
            ].decode("ascii", errors="replace")
            position += name_length

            if is_directory:
                child_id = u16(fnt, position)
                position += 2
                walk(child_id, parts + [name])
            else:
                fat_entry = fat_off + file_id * 8
                if fat_entry + 8 > fat_off + fat_size:
                    raise ValueError(
                        f"NitroFS file id {file_id} runs past FAT"
                    )
                start, end = struct.unpack_from(
                    "<II",
                    rom,
                    fat_entry,
                )
                files["/".join(parts + [name])] = {
                    "file_id": file_id,
                    "offset": start,
                    "size": end - start,
                }
                file_id += 1

    walk(0xF000, [])
    return files


def parse_overlay_table(
    rom: bytes,
) -> dict[int, dict[str, int]]:
    table_offset, table_size = struct.unpack_from(
        "<II",
        rom,
        0x50,
    )
    overlays: dict[int, dict[str, int]] = {}
    if table_size % 32 != 0:
        raise ValueError(
            "Unexpected ARM9 overlay table size"
        )

    for index in range(table_size // 32):
        values = struct.unpack_from(
            "<8I",
            rom,
            table_offset + index * 32,
        )
        (
            overlay_id,
            ram_address,
            ram_size,
            bss_size,
            init_start,
            init_end,
            file_id,
            flags,
        ) = values
        overlays[overlay_id] = {
            "id": overlay_id,
            "ram_address": ram_address,
            "ram_size": ram_size,
            "bss_size": bss_size,
            "init_start": init_start,
            "init_end": init_end,
            "file_id": file_id,
            "flags": flags,
        }
    return overlays


def fat_file(
    rom: bytes,
    file_id: int,
) -> tuple[int, int, bytes]:
    fat_off, fat_size = struct.unpack_from(
        "<II",
        rom,
        0x48,
    )
    entry = fat_off + file_id * 8
    if entry + 8 > fat_off + fat_size:
        raise ValueError(
            f"FAT file id {file_id} out of range"
        )
    start, end = struct.unpack_from(
        "<II",
        rom,
        entry,
    )
    return start, end, rom[start:end]


def effect_category(index: int) -> str:
    if index == 0:
        return "shared-animation-only"
    if index == 1:
        return "generic-runtime"
    if 2 <= index <= 259:
        return "move-or-ground-vfx"
    if 260 <= index <= 267:
        return "ground-vfx"
    if 268 <= index <= 289:
        return "screen-effect"
    if 290 <= index <= 291:
        return "non-sir0"
    if index == 292:
        return "shared-image-base"
    return "unknown"


def parse_move_record(
    data: bytes,
    move_id: int,
) -> dict[str, Any]:
    offset = move_id * MOVE_RECORD_SIZE
    record = data[
        offset : offset + MOVE_RECORD_SIZE
    ]
    if len(record) != MOVE_RECORD_SIZE:
        raise ValueError(
            f"Move animation record {move_id} out of range"
        )
    fields = [
        s16(record, position)
        for position in (0, 2, 4, 6)
    ]
    return {
        "move_id": move_id,
        "effect_fields": fields,
        "field_0x8": record[8],
        "field_0x11": struct.unpack_from(
            "<b",
            record,
            17,
        )[0],
        "field_0x12": u16(record, 18),
        "field_0x14": s16(record, 20),
        "field_0x16": u16(record, 22),
    }


def parse_effect_record(
    data: bytes,
    effect_animation_id: int,
) -> dict[str, Any]:
    offset = (
        effect_animation_id * EFFECT_RECORD_SIZE
    )
    record = data[
        offset : offset + EFFECT_RECORD_SIZE
    ]
    if len(record) != EFFECT_RECORD_SIZE:
        raise ValueError(
            "Effect animation record "
            f"{effect_animation_id} out of range"
        )

    file_type = u32(record, 0)
    return {
        "effect_animation_id": effect_animation_id,
        "file_type_id": file_type,
        "file_type": EFFECT_FILE_TYPES.get(
            file_type,
            f"unknown-{file_type}",
        ),
        "file_index": u32(record, 4),
        "palette_num": u32(record, 8),
        "animation_index": u32(record, 12),
        "sound_effect_id": struct.unpack_from(
            "<i",
            record,
            16,
        )[0],
        "field_0x14": u32(record, 20),
        "is_screen_effect": bool(record[24]),
        "wan_offset": record[25],
        "is_non_blocking": bool(record[26]),
        "repeat": record[27],
    }


def png_dimensions(
    path: Path,
) -> tuple[int, int] | None:
    data = path.read_bytes()[:24]
    if (
        len(data) >= 24
        and data[:8] == b"\x89PNG\r\n\x1a\n"
        and data[12:16] == b"IHDR"
    ):
        return struct.unpack(
            ">II",
            data[16:24],
        )
    return None


def choose_rendered_sheet(
    effect_dir: Path,
    animation_index: int,
) -> Path | None:
    candidates = sorted(
        effect_dir.glob(
            f"A-{animation_index:02d}-*.png"
        )
    )
    if not candidates:
        return None

    preferred = [
        path
        for path in candidates
        if path.name.endswith("-N.png")
        and not path.name.endswith("-B.png")
        and not path.name.endswith("-F.png")
    ]
    return (
        preferred[0]
        if preferred
        else candidates[0]
    )


def render_with_skytemple(
    entries_dir: Path,
    rendered_dir: Path,
    runtime_dir: Path,
    move_vfx: dict[str, Any],
    render_all: bool,
) -> dict[str, Any]:
    try:
        from skytemple_files.graphics.effect_screen.handler import (
            ScreenEffectHandler,
        )
        from skytemple_files.graphics.effect_wan.handler import (
            EffectWanHandler,
        )
    except ImportError as exc:
        raise RuntimeError(
            "Rendering requires skytemple-files and Pillow. "
            "Install them with: "
            "python -m pip install skytemple-files pillow"
        ) from exc

    rendered_dir.mkdir(
        parents=True,
        exist_ok=True,
    )
    runtime_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    selected_indices = {
        info["archive_entry"]
        for info in move_vfx.values()
    }
    if render_all:
        selected_indices.update(range(1, 290))

    render_results: dict[str, Any] = {}
    for index in sorted(selected_indices):
        source = (
            entries_dir / f"effect{index:04d}.sir0"
        )
        if not source.exists():
            render_results[str(index)] = {
                "status": "missing-source"
            }
            continue

        destination = (
            rendered_dir
            / f"effect{index:04d}"
        )
        if destination.exists():
            shutil.rmtree(destination)
        destination.mkdir(
            parents=True,
            exist_ok=True,
        )

        try:
            raw = source.read_bytes()
            if 268 <= index <= 289:
                model = (
                    ScreenEffectHandler.deserialize(
                        raw
                    )
                )
                ScreenEffectHandler.export_sheets(
                    str(destination),
                    model,
                    True,
                )
            else:
                model = EffectWanHandler.deserialize(
                    raw
                )
                EffectWanHandler.export_sheets(
                    str(destination),
                    model,
                )

            pngs = sorted(
                str(path.relative_to(rendered_dir))
                for path in destination.rglob(
                    "*.png"
                )
            )
            render_results[str(index)] = {
                "status": "ok",
                "pngs": pngs,
            }
        except Exception as exc:
            render_results[str(index)] = {
                "status": "error",
                "error": (
                    f"{type(exc).__name__}: {exc}"
                ),
            }

    runtime_moves: dict[str, Any] = {}
    for move_id, info in move_vfx.items():
        archive_entry = info["archive_entry"]
        effect_dir = (
            rendered_dir
            / f"effect{archive_entry:04d}"
        )
        sheet = choose_rendered_sheet(
            effect_dir,
            info["animation_index"],
        )
        if sheet is None:
            continue

        dimensions = png_dimensions(sheet)
        if not dimensions:
            continue

        width, height = dimensions
        frame_height = height
        frame_width = (
            height
            if height > 0 and width % height == 0
            else width
        )
        frames = max(
            1,
            width // frame_width,
        )

        output_name = f"{move_id}.png"
        shutil.copyfile(
            sheet,
            runtime_dir / output_name,
        )
        runtime_moves[move_id] = {
            "file": output_name,
            "frame_width": frame_width,
            "frame_height": frame_height,
            "frames": frames,
            "frame_duration_ms": 80,
            "placement": "target",
            "effect_animation_id": (
                info["effect_animation_id"]
            ),
            "archive_entry": archive_entry,
            "animation_index": (
                info["animation_index"]
            ),
            "mapping": info["mapping"],
            "note": info["note"],
        }

    runtime_manifest = {
        "source": (
            "Pokemon Mystery Dungeon: "
            "Explorers of Sky (USA)"
        ),
        "moves": runtime_moves,
    }
    (
        runtime_dir / "manifest.json"
    ).write_text(
        json.dumps(
            runtime_manifest,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    return {
        "render_results": render_results,
        "runtime_manifest": runtime_manifest,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Extract Explorers of Sky battle VFX "
            "from EFFECT/effect.bin"
        )
    )
    parser.add_argument(
        "rom",
        help=(
            "Path to a local Pokemon Mystery "
            "Dungeon: Explorers of Sky (USA) .nds"
        ),
    )
    parser.add_argument(
        "--output",
        default=(
            "local-assets/extracted/"
            "pmd-eos/vfx"
        ),
    )
    parser.add_argument(
        "--render",
        action="store_true",
        help=(
            "Render Tactimon move VFX using the "
            "optional skytemple-files dependency"
        ),
    )
    parser.add_argument(
        "--render-all",
        action="store_true",
        help=(
            "Render all supported WAN/screen "
            "effect entries (implies --render)"
        ),
    )
    args = parser.parse_args()

    rom_path = Path(args.rom)
    output = Path(args.output)
    entries_dir = output / "entries"
    rendered_dir = output / "rendered"
    runtime_dir = output / "runtime"

    rom = rom_path.read_bytes()
    sha1 = hashlib.sha1(rom).hexdigest()
    title = (
        rom[:12]
        .rstrip(b"\0")
        .decode(
            "ascii",
            errors="replace",
        )
    )
    code = rom[12:16].decode(
        "ascii",
        errors="replace",
    )

    if (
        sha1 != KNOWN_SHA1
        or code != GAME_CODE
    ):
        raise SystemExit(
            "Unsupported ROM: "
            f"title={title!r} "
            f"code={code!r} "
            f"sha1={sha1}. "
            "Expected C2SE / "
            f"{KNOWN_SHA1}."
        )

    files = parse_nitrofs(rom)
    effect_info = files.get(
        "EFFECT/effect.bin"
    )
    if not effect_info:
        raise SystemExit(
            "EFFECT/effect.bin not found "
            "in NitroFS"
        )

    effect_bin = rom[
        effect_info["offset"] :
        effect_info["offset"]
        + effect_info["size"]
    ]
    zero, count = struct.unpack_from(
        "<II",
        effect_bin,
        0,
    )
    if (
        zero != 0
        or count != EXPECTED_EFFECT_COUNT
    ):
        raise SystemExit(
            "Unexpected effect.bin header: "
            f"zero={zero} count={count}"
        )

    output.mkdir(
        parents=True,
        exist_ok=True,
    )
    entries_dir.mkdir(
        parents=True,
        exist_ok=True,
    )
    (output / "effect.bin").write_bytes(
        effect_bin
    )

    entries: list[dict[str, Any]] = []
    for index in range(count):
        offset, size = struct.unpack_from(
            "<II",
            effect_bin,
            8 + index * 8,
        )
        blob = effect_bin[
            offset : offset + size
        ]
        extension = (
            "sir0"
            if blob[:4] == b"SIR0"
            else "bin"
        )
        filename = (
            f"effect{index:04d}."
            f"{extension}"
        )
        (
            entries_dir / filename
        ).write_bytes(blob)
        entries.append(
            {
                "id": index,
                "offset": offset,
                "size": size,
                "format": (
                    "SIR0"
                    if extension == "sir0"
                    else "raw"
                ),
                "category": (
                    effect_category(index)
                ),
                "file": (
                    f"entries/{filename}"
                ),
                "sha1": hashlib.sha1(
                    blob
                ).hexdigest(),
            }
        )

    overlays = parse_overlay_table(rom)
    overlay10 = overlays.get(
        OVERLAY10_ID
    )
    if overlay10 is None:
        raise SystemExit(
            "ARM9 overlay 10 not found"
        )

    (
        overlay_start,
        overlay_end,
        overlay_data,
    ) = fat_file(
        rom,
        overlay10["file_id"],
    )
    if (
        len(overlay_data)
        != overlay10["ram_size"]
    ):
        raise SystemExit(
            "Overlay 10 appears compressed "
            "or has an unexpected size"
        )

    move_table_offset = (
        OVERLAY10_MOVE_TABLE_RAM
        - overlay10["ram_address"]
    )
    effect_table_offset = (
        OVERLAY10_EFFECT_TABLE_RAM
        - overlay10["ram_address"]
    )
    move_table = overlay_data[
        move_table_offset :
        move_table_offset
        + 563 * MOVE_RECORD_SIZE
    ]
    effect_table = overlay_data[
        effect_table_offset :
        effect_table_offset
        + 700 * EFFECT_RECORD_SIZE
    ]

    move_records = {
        move: parse_move_record(
            move_table,
            move_id,
        )
        for move, move_id
        in MOVE_IDS.items()
    }

    move_vfx: dict[str, Any] = {}
    for (
        move,
        choice,
    ) in TACTIMON_MOVE_EFFECTS.items():
        effect = parse_effect_record(
            effect_table,
            choice["effect_animation_id"],
        )
        archive_entry = effect["file_index"]
        if archive_entry >= count:
            raise SystemExit(
                "Effect animation "
                f"{effect['effect_animation_id']} "
                "points outside effect.bin: "
                f"{archive_entry}"
            )

        move_vfx[move] = {
            **choice,
            **effect,
            "archive_entry": archive_entry,
            "archive_file": (
                entries[
                    archive_entry
                ]["file"]
            ),
            "source_move_record": (
                move_records[move]
            ),
        }

    manifest: dict[str, Any] = {
        "source": {
            "rom": rom_path.name,
            "title": title,
            "game_code": code,
            "sha1": sha1,
        },
        "nitrofs": {
            "effect_bin": effect_info,
        },
        "overlay10": {
            **overlay10,
            "rom_offset": overlay_start,
            "rom_end": overlay_end,
            "move_animation_table_ram": (
                OVERLAY10_MOVE_TABLE_RAM
            ),
            "effect_animation_table_ram": (
                OVERLAY10_EFFECT_TABLE_RAM
            ),
        },
        "effect_archive": {
            "count": count,
            "entries": entries,
        },
        "move_animation_records": (
            move_records
        ),
        "tactimon_move_vfx": move_vfx,
        "notes": {
            "move_vfx_range": [2, 259],
            "screen_effect_range": [
                268,
                289,
            ],
            "shared_base_effect": 292,
            "mapping_policy": (
                "canonical when the EoS move "
                "table exposes a useful visible "
                "effect; otherwise an explicitly-"
                "marked EoS visual proxy"
            ),
        },
    }

    if args.render or args.render_all:
        try:
            manifest["render"] = (
                render_with_skytemple(
                    entries_dir,
                    rendered_dir,
                    runtime_dir,
                    move_vfx,
                    args.render_all,
                )
            )
        except RuntimeError as exc:
            manifest["render"] = {
                "status": "dependency-missing",
                "error": str(exc),
            }
            print(str(exc))

    (
        output / "manifest.json"
    ).write_text(
        json.dumps(
            manifest,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        f"ROM: {title} / "
        f"{code} / {sha1}"
    )
    print(
        f"Extracted {count} "
        f"effect entries -> {output}"
    )
    for move, info in move_vfx.items():
        print(
            f"{move}: effect animation "
            f"{info['effect_animation_id']} "
            f"-> effect"
            f"{info['archive_entry']:04d}, "
            f"animation "
            f"{info['animation_index']} "
            f"({info['mapping']})"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
