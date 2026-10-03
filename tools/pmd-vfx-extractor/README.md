# Pokémon Mystery Dungeon: Explorers of Sky VFX extractor

This tool reads a **local, user-owned** USA copy of Pokémon Mystery Dungeon: Explorers of Sky and extracts the battle/effect archive used by Tactimon.

Supported ROM:

- internal title: `POKEDUN SORA`
- game code: `C2SE`
- SHA-1: `5fa96ca8d8dd6405d6cd2bad73ed68bc73a9d152`

ROM binaries remain local and are ignored by Git.

## Raw extraction

Put the ROM somewhere under `local-assets/roms/`, for example:

```text
local-assets/roms/explorers-of-sky.nds
```

Then run:

```bash
python tools/pmd-vfx-extractor/extract.py local-assets/roms/explorers-of-sky.nds
```

Default output:

```text
local-assets/extracted/pmd-eos/vfx/
├── effect.bin
├── manifest.json
└── entries/
    ├── effect0000.sir0
    ├── effect0001.sir0
    ├── ...
    ├── effect0290.bin
    ├── effect0291.bin
    └── effect0292.sir0
```

The extractor validates the ROM, parses NitroFS, finds `EFFECT/effect.bin`, validates its 293-entry archive table, and exports each entry with hashes and semantic category metadata.

It also reads ARM9 overlay 10 directly from the ROM and decodes:

- `MOVE_ANIMATION_INFO[563]`;
- `EFFECT_ANIMATION_INFO[700]`;
- effect file type;
- `file_index` into `effect.bin`;
- palette number;
- animation index;
- sound-effect id;
- WAN attachment offset.

That gives Tactimon a deterministic mapping from move animation data to the actual VFX archive entries.

## Tactimon starter move VFX

The initial mapping is written into `manifest.json`:

| Tactimon move | EoS effect animation | effect.bin entry | Mapping |
| --- | ---: | ---: | --- |
| Scratch | 138 | 54 | canonical |
| Growl | 274 | 121 | canonical |
| Tackle | 275 | 120 | visual proxy |
| Tail Whip | 287 | 113 | visual proxy |

Scratch and Growl use useful visual effects referenced by the EoS move-animation data. Tackle and Tail Whip use explicitly-marked EoS visual proxies because their direct EoS move animation records do not expose a useful standalone visible WAN for Tactimon's presentation.

## Render PNG runtime effects

Raw extraction has no third-party Python dependency.

To turn selected WAN effects into PNG sprite sheets, use **CPython 3.12 or 3.13**. The pinned SkyTemple Rust package publishes Windows wheels for those versions; Python 3.14 currently falls back to a local Rust build and may fail.

On Windows, first check:

```powershell
py -0p
```

If Python 3.12 is installed, create a dedicated environment:

```powershell
py -3.12 -m venv .venv-pmd
.\.venv-pmd\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install --only-binary=:all: -r tools/pmd-vfx-extractor/requirements-render.txt
```

`--only-binary=:all:` is intentional: it prevents `pip` from attempting to compile `skytemple-rust` with Cargo. If no compatible wheel exists, installation fails immediately with a clear message instead of entering a Rust build.

Then:

```bash
python tools/pmd-vfx-extractor/extract.py \
  local-assets/roms/explorers-of-sky.nds \
  --render
```

This renders the effects needed by the current battle prototype and creates:

```text
local-assets/extracted/pmd-eos/vfx/
├── rendered/
└── runtime/
    ├── manifest.json
    ├── scratch.png
    ├── growl.png
    ├── tackle.png
    └── tail-whip.png
```

The client `predev` / `prebuild` sync automatically copies `runtime/` to:

```text
apps/client/public/game-assets/battle-vfx/
```

If rendered PMD VFX are missing, the client falls back to lightweight CSS placeholders so battle logic remains testable.

To inspect/render every supported effect entry instead of only the current move set:

```bash
python tools/pmd-vfx-extractor/extract.py \
  local-assets/roms/explorers-of-sky.nds \
  --render-all
```

The extractor calls the installed SkyTemple Files package as an optional renderer; its parser implementation is not vendored into Tactimon.
