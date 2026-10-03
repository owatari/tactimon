#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path

KNOWN_ROMS = {
    "f3ae088181bf583e55daf962a92bb46f4f1d07b7": {
        "id": "emerald",
        "title": "Pokemon Emerald",
        "game_code": "BPEE",
        "size": 16_777_216,
    },
    "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc": {
        "id": "firered",
        "title": "Pokemon FireRed",
        "game_code": "BPRE",
        "size": 16_777_216,
    },
}


@dataclass
class Lz77Block:
    offset: int
    compressed_size: int
    decompressed_size: int
    sha1: str
    file: str


def sha1_bytes(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def read_header(data: bytes) -> dict:
    if len(data) < 0xC0:
        raise ValueError("File is too small to be a GBA ROM")

    title = data[0xA0:0xAC].decode("ascii", errors="replace").rstrip("\0 ")
    game_code = data[0xAC:0xB0].decode("ascii", errors="replace")
    maker_code = data[0xB0:0xB2].decode("ascii", errors="replace")

    return {
        "title": title,
        "game_code": game_code,
        "maker_code": maker_code,
    }


def decompress_gba_lz77(
    data: bytes,
    offset: int,
    max_output: int,
) -> tuple[bytes, int] | None:
    """Decode BIOS/GBA LZ77 type 0x10.

    Returns (decompressed_payload, compressed_bytes_consumed) or None when the
    candidate stream is invalid.
    """
    if offset + 4 > len(data) or data[offset] != 0x10:
        return None

    expected = data[offset + 1] | (data[offset + 2] << 8) | (data[offset + 3] << 16)
    if expected <= 0 or expected > max_output:
        return None

    src = offset + 4
    out = bytearray()

    try:
        while len(out) < expected:
            flags = data[src]
            src += 1

            for bit in range(8):
                if len(out) >= expected:
                    break

                is_compressed = bool(flags & (0x80 >> bit))

                if not is_compressed:
                    out.append(data[src])
                    src += 1
                    continue

                a = data[src]
                b = data[src + 1]
                src += 2

                length = (a >> 4) + 3
                displacement = ((a & 0x0F) << 8) | b
                distance = displacement + 1

                if distance > len(out):
                    return None

                for _ in range(length):
                    out.append(out[-distance])
                    if len(out) >= expected:
                        break

    except IndexError:
        return None

    if len(out) != expected:
        return None

    return bytes(out), src - offset


def scan_lz77(
    data: bytes,
    output_dir: Path,
    min_output: int,
    max_output: int,
) -> list[Lz77Block]:
    blocks_dir = output_dir / "lz77"
    blocks_dir.mkdir(parents=True, exist_ok=True)

    blocks: list[Lz77Block] = []
    pos = 0

    while True:
        pos = data.find(b"\x10", pos)
        if pos < 0:
            break

        decoded = decompress_gba_lz77(data, pos, max_output=max_output)

        if decoded is not None:
            payload, consumed = decoded

            if len(payload) >= min_output:
                digest = sha1_bytes(payload)
                relative = Path("lz77") / (
                    f"{pos:08X}_{len(payload):07d}_{digest[:10]}.bin"
                )
                (output_dir / relative).write_bytes(payload)

                blocks.append(
                    Lz77Block(
                        offset=pos,
                        compressed_size=consumed,
                        decompressed_size=len(payload),
                        sha1=digest,
                        file=relative.as_posix(),
                    )
                )

                # Do not discover false candidates inside a validated stream.
                pos += max(consumed, 1)
                continue

        pos += 1

    return blocks


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Local ROM asset extractor for Tactimon"
    )
    parser.add_argument("rom", type=Path, help="Path to a locally-owned .gba ROM")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("local-assets/extracted"),
        help="Output root (default: local-assets/extracted)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete this game's previous extraction before running",
    )
    parser.add_argument(
        "--min-lz-size",
        type=int,
        default=32,
        help="Ignore decoded LZ77 blocks smaller than this",
    )
    parser.add_argument(
        "--max-lz-size",
        type=int,
        default=4 * 1024 * 1024,
        help="Reject implausibly large decoded blocks",
    )
    parser.add_argument(
        "--allow-unknown",
        action="store_true",
        help="Allow an unrecognized GBA ROM hash",
    )
    args = parser.parse_args()

    data = args.rom.read_bytes()
    digest = sha1_bytes(data)
    header = read_header(data)
    known = KNOWN_ROMS.get(digest)

    if known is None and not args.allow_unknown:
        raise SystemExit(
            "Unsupported ROM. SHA-1: "
            + digest
            + "\nExpected the supported Emerald or FireRed reference ROM."
        )

    game_id = known["id"] if known else (header["game_code"].lower() or digest[:8])
    game_dir = args.output / game_id

    if args.clean and game_dir.exists():
        shutil.rmtree(game_dir)

    game_dir.mkdir(parents=True, exist_ok=True)

    print(f"ROM: {args.rom}")
    print(f"SHA-1: {digest}")
    print(f"Header: {header['title']} / {header['game_code']}")
    print(f"Output: {game_dir}")
    print("Scanning GBA LZ77 blocks...")

    blocks = scan_lz77(
        data,
        game_dir,
        min_output=args.min_lz_size,
        max_output=args.max_lz_size,
    )

    manifest = {
        "format": 1,
        "source": {
            "file_name": args.rom.name,
            "size": len(data),
            "sha1": digest,
            "header": header,
            "recognized": known is not None,
            "game": known,
        },
        "extraction": {
            "lz77_blocks": len(blocks),
            "min_lz_size": args.min_lz_size,
            "max_lz_size": args.max_lz_size,
        },
        "blocks": [
            asdict(block) | {"offset_hex": f"0x{block.offset:08X}"}
            for block in blocks
        ],
    }

    manifest_path = game_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Extracted {len(blocks)} validated LZ77 blocks")
    print(f"Manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
