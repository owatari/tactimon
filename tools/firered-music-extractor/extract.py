#!/usr/bin/env python3
"""Extract and render FireRed music from a developer-local ROM."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

FIRERED_SHA1 = "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc"
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


def executable(value: str, label: str) -> Path:
    found = shutil.which(value)
    if found:
        return Path(found).resolve()
    candidate = Path(value)
    if candidate.exists():
        return candidate.resolve()
    raise SystemExit(f"{label} not found: {value}")


def companion(root: Path, name: str) -> Path:
    for folder in (root, root.parent):
        for suffix in ("", ".exe"):
            candidate = folder / f"{name}{suffix}"
            if candidate.exists():
                return candidate.resolve()
    raise SystemExit(
        f"Missing {name} next to the GBA Mus Ripper build at {root}"
    )


def data_file(root: Path, name: str) -> Path:
    for folder in (root, root.parent):
        candidate = folder / name
        if candidate.exists():
            return candidate.resolve()
    raise SystemExit(f"Missing {name} near the GBA Mus Ripper build")


def run(args: list[str]) -> None:
    print("+", " ".join(args))
    subprocess.run(args, check=True)


def make_ripper_shim(main_ripper: Path, target: Path) -> Path:
    source_dir = main_ripper.parent
    copies = {
        "gba_mus_ripper.exe": main_ripper,
        "sappy_detector": companion(source_dir, "sappy_detector"),
        "sappy_detector.exe": companion(source_dir, "sappy_detector"),
        "song_ripper.exe": companion(source_dir, "song_ripper"),
        "sound_font_ripper.exe": companion(
            source_dir,
            "sound_font_ripper",
        ),
        "psg_data.raw": data_file(source_dir, "psg_data.raw"),
        "goldensun_synth.raw": data_file(
            source_dir,
            "goldensun_synth.raw",
        ),
    }

    for name, source in copies.items():
        destination = target / name
        shutil.copy2(source, destination)
        if name.endswith(".exe") or name == "sappy_detector":
            destination.chmod(destination.stat().st_mode | 0o111)

    return target / "gba_mus_ripper.exe"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Rip FireRed Sappy music and render browser-ready OGG files."
        )
    )
    parser.add_argument("rom", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("local-assets/extracted/firered/music"),
    )
    parser.add_argument("--ripper", default="gba_mus_ripper")
    parser.add_argument("--fluidsynth", default="fluidsynth")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument(
        "--skip-rip",
        action="store_true",
        help="Reuse an existing output/ripped directory.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Render every songNNNN.mid produced by the ripper.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rom = args.rom.resolve()
    if not rom.exists():
        raise SystemExit(f"ROM not found: {rom}")

    actual_sha1 = sha1(rom)
    if actual_sha1 != FIRERED_SHA1:
        raise SystemExit(
            "Unsupported FireRed ROM SHA-1. "
            f"Expected {FIRERED_SHA1}, got {actual_sha1}."
        )

    output = args.output.resolve()
    ripped = output / "ripped"
    runtime = output / "runtime"
    ripped.mkdir(parents=True, exist_ok=True)
    runtime.mkdir(parents=True, exist_ok=True)

    fluidsynth = executable(args.fluidsynth, "FluidSynth")
    ffmpeg = executable(args.ffmpeg, "FFmpeg")

    if not args.skip_rip:
        main_ripper = executable(args.ripper, "GBA Mus Ripper")
        with tempfile.TemporaryDirectory(
            prefix="tactimon-gba-mus-ripper-"
        ) as shim_dir:
            shim = make_ripper_shim(
                main_ripper,
                Path(shim_dir),
            )
            run(
                [
                    str(shim),
                    str(rom),
                    "-o",
                    str(ripped),
                ]
            )

    midis = sorted(ripped.glob("song[0-9][0-9][0-9][0-9].mid"))
    if not midis:
        raise SystemExit(
            f"No songNNNN.mid files found in {ripped}. "
            "Run without --skip-rip first."
        )

    soundfonts = sorted(ripped.glob("*.sf2"))
    if not soundfonts:
        raise SystemExit(f"No .sf2 soundfont found in {ripped}.")
    soundfont = soundfonts[0]

    selected = (
        midis
        if args.all
        else [
            ripped / f"song{track_id:04d}.mid"
            for track_id in REQUIRED_TRACKS
        ]
    )
    missing = [path.name for path in selected if not path.exists()]
    if missing:
        raise SystemExit(
            "Required ripped tracks are missing: " + ", ".join(missing)
        )

    rendered = []
    for midi in selected:
        track_id = int(midi.stem.removeprefix("song"))
        target = runtime / f"{track_id}.ogg"

        with tempfile.TemporaryDirectory(
            prefix="tactimon-music-render-"
        ) as temp_dir:
            wav = Path(temp_dir) / f"{track_id}.wav"
            run(
                [
                    str(fluidsynth),
                    "-ni",
                    "-F",
                    str(wav),
                    "-r",
                    "44100",
                    str(soundfont),
                    str(midi),
                ]
            )
            run(
                [
                    str(ffmpeg),
                    "-y",
                    "-loglevel",
                    "warning",
                    "-i",
                    str(wav),
                    "-c:a",
                    "libvorbis",
                    "-q:a",
                    "5",
                    str(target),
                ]
            )

        rendered.append(
            {
                "musicId": track_id,
                "name": REQUIRED_TRACKS.get(
                    track_id,
                    f"song-{track_id}",
                ),
                "file": target.name,
                "sourceMidi": midi.name,
            }
        )

    manifest = {
        "source": "Pokemon FireRed local ROM / Sappy",
        "romSha1": actual_sha1,
        "tracks": rendered,
    }
    (runtime / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Rendered {len(rendered)} tracks to {runtime}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
