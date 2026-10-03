#!/usr/bin/env python3
"""Extract FireRed MP2K music with the validated gba-audio-tools renderer.

Tactimon intentionally does not implement MP2K synthesis here. This wrapper
validates the supported ROM, asks gba-audio-tools to extract the original
MP2K songs into a self-contained .pak, then renders that .pak with its C
MP2K engine.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import gba_audio
from gba_audio.native import FMT_MP2K, extract_songs, pak_index, pak_songs
from gba_audio.scanner import find_songtable
from gba_audio.wav import render_pak_song

FIRERED_SHA1 = "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc"
RENDERER_REVISION = "45e84ba8a5a47b22e56dac7e4e87b1ac605bcb19"
SAMPLE_RATE = 32_768
DEFAULT_LOOPS = 2
DEFAULT_MAX_SECONDS = 180

REQUIRED_TRACKS = {
    291: "route-1",
    297: "trainer-battle",
    298: "wild-battle",
    300: "pallet-town",
    301: "oak-lab",
    314: "viridian-pewter",
}


def sha1(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_tracks(raw: str | None) -> list[int]:
    if raw is None:
        return list(REQUIRED_TRACKS)

    try:
        tracks = [int(value.strip()) for value in raw.split(",") if value.strip()]
    except ValueError as error:
        raise SystemExit("--tracks must contain comma-separated numeric music IDs") from error

    if not tracks:
        raise SystemExit("--tracks did not contain any music IDs")
    return tracks


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract FireRed MP2K music with gba-audio-tools."
    )
    parser.add_argument("rom", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("local-assets/extracted/firered/music"),
    )
    parser.add_argument(
        "--tracks",
        help="comma-separated FireRed song-table IDs",
    )
    parser.add_argument(
        "--loops",
        type=int,
        default=DEFAULT_LOOPS,
        help=f"MP2K loop passes to render (default {DEFAULT_LOOPS})",
    )
    parser.add_argument(
        "--seconds",
        type=int,
        default=DEFAULT_MAX_SECONDS,
        help=f"hard safety cap per track (default {DEFAULT_MAX_SECONDS}s)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rom_path = args.rom.resolve()
    if not rom_path.is_file():
        raise SystemExit(f"ROM not found: {rom_path}")

    actual_sha1 = sha1(rom_path)
    if actual_sha1 != FIRERED_SHA1:
        raise SystemExit(
            "Unsupported FireRed ROM SHA-1. "
            f"Expected {FIRERED_SHA1}, got {actual_sha1}."
        )

    if args.loops < 1:
        raise SystemExit("--loops must be at least 1")
    if args.seconds < 1:
        raise SystemExit("--seconds must be at least 1")

    selected = parse_tracks(args.tracks)
    rom = rom_path.read_bytes()
    table = find_songtable(rom)
    if table is None:
        raise SystemExit("gba-audio-tools could not find an MP2K song table in the ROM")

    for music_id in selected:
        if not 0 <= music_id < len(table.songs):
            raise SystemExit(f"FireRed music ID {music_id} is outside the song table")
        if table.songs[music_id].n_tracks == 0:
            raise SystemExit(f"FireRed music ID {music_id} is an empty song-table slot")

    pak, fmt = extract_songs(rom, selected, table.pos)
    if fmt != FMT_MP2K:
        raise SystemExit("Expected MP2K extraction, but gba-audio-tools returned another format")

    output_root = args.output.resolve()
    runtime = output_root / "runtime"
    runtime.mkdir(parents=True, exist_ok=True)

    pak_path = output_root / "firered-music.pak"
    pak_path.write_bytes(pak)

    count = pak_songs(pak)
    if count != len(selected):
        raise SystemExit(
            f"Expected {len(selected)} extracted songs, but the .pak contains {count}"
        )

    rendered: list[dict[str, object]] = []
    for entry in range(count):
        music_id = pak_index(pak, entry)
        if music_id < 0:
            raise SystemExit(f"Extracted .pak entry {entry} lost its FireRed song-table index")

        name = REQUIRED_TRACKS.get(music_id, f"song-{music_id}")
        target = runtime / f"{music_id}.wav"
        print(f"Rendering {music_id} ({name}) with gba-audio-tools MP2K core...")
        seconds = render_pak_song(
            pak,
            entry,
            str(target),
            loop_count=args.loops,
            fade_ms=0,
            max_seconds=args.seconds,
        )
        rendered.append(
            {
                "musicId": music_id,
                "name": name,
                "file": target.name,
                "seconds": round(seconds, 3),
                "sampleRate": SAMPLE_RATE,
            }
        )

    manifest = {
        "source": "Pokemon FireRed local ROM / MP2K-Sappy",
        "extractor": "gba-audio-tools-mp2k",
        "rendererRevision": RENDERER_REVISION,
        "rendererVersion": getattr(gba_audio, "__version__", "unknown"),
        "romSha1": actual_sha1,
        "pak": str(pak_path.name),
        "loops": args.loops,
        "tracks": rendered,
    }
    (runtime / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Extracted MP2K package: {pak_path}")
    print(f"Rendered {len(rendered)} tracks to {runtime}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
