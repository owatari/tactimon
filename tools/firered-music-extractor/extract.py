#!/usr/bin/env python3
"""Extract the FireRed music used by Tactimon directly from a local ROM.

The supported FireRed ROM uses Nintendo's MP2K/Sappy sound driver.  This
module reads its song table, interprets the sequence commands and renders the
ROM's own PCM/PSG instruments to browser-playable WAV files using only the
Python standard library.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import wave
from array import array
from dataclasses import dataclass, field
from pathlib import Path

FIRERED_SHA1 = "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc"
ROM_BASE = 0x08000000
SONG_TABLE_OFFSET = 0x4A32CC
OUTPUT_RATE = 32_768
FIXED_PCM_RATE = 13_379
GBA_FPS = 16_777_216 / 280_896
ENGINE_FRAME_SAMPLES = OUTPUT_RATE / GBA_FPS
MAX_RELEASE_ENGINE_FRAMES = 240
DEFAULT_SECONDS = 60.0
MAX_TRACKS = 16

REQUIRED_TRACKS = {
    291: "route-1",
    297: "trainer-battle",
    298: "wild-battle",
    300: "pallet-town",
    301: "oak-lab",
    314: "viridian-pewter",
}

# MP2K's gClockTable.  Wait commands use 0x80..0xB0 and note commands use
# 0xCF..0xFF against this same table.
CLOCK_TABLE = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24, 28, 30, 32, 36, 40, 42, 44,
    48, 52, 54, 56, 60, 64, 66, 68, 72, 76, 78, 80, 84, 88, 90,
    92, 96,
]
DELTA_TABLE = [0, 1, 4, 9, 16, 25, 36, 49, -64, -49, -36, -25, -16, -9, -4, -1]

# Sequence commands.
FINE = 0xB1
GOTO = 0xB2
PATT = 0xB3
PEND = 0xB4
REPT = 0xB5
MEMACC = 0xB9
PRIO = 0xBA
TEMPO = 0xBB
KEYSH = 0xBC
VOICE = 0xBD
VOL = 0xBE
PAN = 0xBF
BEND = 0xC0
BENDR = 0xC1
LFOS = 0xC2
LFODL = 0xC3
MOD = 0xC4
MODT = 0xC5
TUNE = 0xC8
PORT = 0xCC
XCMD = 0xCD
EOT = 0xCE
TIE = 0xCF

# Tone flags / types.
TONE_CGB_MASK = 0x07
TONE_FIX = 0x08
TONE_REVERSE = 0x10
TONE_COMPRESSED = 0x20
TONE_SPLIT = 0x40
TONE_RHYTHM = 0x80


class ExtractError(RuntimeError):
    pass


def sha1(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class Rom:
    def __init__(self, data: bytes):
        self.data = data

    def check(self, offset: int, size: int = 1) -> None:
        if offset < 0 or size < 0 or offset + size > len(self.data):
            raise ExtractError(
                f"ROM read out of range: offset=0x{offset:X}, size={size}"
            )

    def u8(self, offset: int) -> int:
        self.check(offset)
        return self.data[offset]

    def s8(self, offset: int) -> int:
        value = self.u8(offset)
        return value - 256 if value >= 128 else value

    def u16(self, offset: int) -> int:
        self.check(offset, 2)
        return struct.unpack_from("<H", self.data, offset)[0]

    def u32(self, offset: int) -> int:
        self.check(offset, 4)
        return struct.unpack_from("<I", self.data, offset)[0]

    def ptr(self, value: int) -> int:
        offset = value - ROM_BASE
        self.check(offset)
        return offset

    def ptr_at(self, offset: int) -> int:
        return self.ptr(self.u32(offset))


@dataclass
class Tone:
    type: int
    key: int
    length: int
    pan_sweep: int
    wav_ptr: int
    attack: int
    decay: int
    sustain: int
    release: int
    rhythm_pan: int = 0
    rhythm: bool = False


@dataclass
class NoteEvent:
    start_tick: int
    duration_ticks: int
    key: int
    velocity: int
    voice: int
    volume: int
    pan: int
    bend: int
    bend_range: int
    key_shift: int
    tune: int
    tie: bool = False


@dataclass
class TrackState:
    pc: int
    wait: int = 0
    ended: bool = False
    running_status: int = 0
    pattern_stack: list[int] = field(default_factory=list)
    repeat_count: int = 0
    voice: int = 0
    volume: int = 0
    pan: int = 0
    bend: int = 0
    bend_range: int = 2
    key_shift: int = 0
    tune: int = 0
    last_key: int = 60
    last_velocity: int = 127
    active_ties: dict[int, NoteEvent] = field(default_factory=dict)


@dataclass
class Song:
    track_count: int
    voicegroup: int
    tracks: list[int]


def read_song(rom: Rom, music_id: int) -> Song:
    entry = SONG_TABLE_OFFSET + music_id * 8
    rom.check(entry, 8)
    header_ptr = rom.u32(entry)
    if not (ROM_BASE <= header_ptr < ROM_BASE + len(rom.data)):
        raise ExtractError(
            f"song {music_id}: invalid header pointer 0x{header_ptr:08X}"
        )
    header = rom.ptr(header_ptr)
    track_count = rom.u8(header)
    if not 1 <= track_count <= MAX_TRACKS:
        raise ExtractError(
            f"song {music_id}: invalid MP2K track count {track_count}"
        )
    voicegroup = rom.ptr_at(header + 4)
    tracks = [rom.ptr_at(header + 8 + i * 4) for i in range(track_count)]
    return Song(track_count=track_count, voicegroup=voicegroup, tracks=tracks)


def read_tone(rom: Rom, voicegroup: int, voice: int, key: int) -> Tone:
    base = voicegroup + voice * 12
    rom.check(base, 12)
    parent_type = rom.u8(base)
    rhythm_pan = 0

    if parent_type & TONE_SPLIT:
        table = rom.ptr_at(base + 4)
        keymap = rom.ptr_at(base + 8)
        mapped = rom.u8(keymap + max(0, min(127, key)))
        base = table + mapped * 12
        rom.check(base, 12)
    elif parent_type & TONE_RHYTHM:
        table = rom.ptr_at(base + 4)
        base = table + max(0, min(127, key)) * 12
        rom.check(base, 12)
        pan_sweep = rom.u8(base + 3)
        if pan_sweep & 0x80:
            rhythm_pan = (pan_sweep - 0xC0) * 2

    tone_type = rom.u8(base)
    wav_raw = rom.u32(base + 4)
    wav_ptr = 0
    if wav_raw:
        # CGB square/noise tones store a tiny integer/duty value here rather
        # than a ROM pointer; only turn pointer-looking values into offsets.
        if ROM_BASE <= wav_raw < ROM_BASE + len(rom.data):
            wav_ptr = wav_raw - ROM_BASE
        else:
            wav_ptr = wav_raw

    return Tone(
        type=tone_type,
        key=rom.u8(base + 1),
        length=rom.u8(base + 2),
        pan_sweep=rom.u8(base + 3),
        wav_ptr=wav_ptr,
        attack=rom.u8(base + 8),
        decay=rom.u8(base + 9),
        sustain=rom.u8(base + 10),
        release=rom.u8(base + 11),
        rhythm_pan=rhythm_pan,
        rhythm=(parent_type == TONE_RHYTHM),
    )


def _signed_center(value: int) -> int:
    return value - 0x40


def _close_tie(state: TrackState, key: int, tick: int) -> None:
    event = state.active_ties.pop(key, None)
    if event is not None:
        event.duration_ticks = max(1, tick - event.start_tick)


def _read_ptr_operand(rom: Rom, state: TrackState) -> int:
    target = rom.ptr_at(state.pc)
    state.pc += 4
    return target


def _skip_memacc(rom: Rom, state: TrackState) -> None:
    # MEMACC has a 3-byte operand in MKS4AGB. It is used for conditional
    # sequence logic, not by the FireRed BGM slice Tactimon renders. Consume
    # it deterministically so a stray command cannot desynchronise parsing.
    rom.check(state.pc, 3)
    state.pc += 3


def _handle_xcmd(rom: Rom, state: TrackState) -> None:
    sub = rom.u8(state.pc)
    state.pc += 1
    if sub in {0x01, 0x0D}:
        rom.check(state.pc, 4)
        state.pc += 4
    elif sub == 0x0C:  # xWAIT: u16 frame count
        rom.check(state.pc, 2)
        state.wait = max(state.wait, rom.u16(state.pc))
        state.pc += 2
    elif sub in {0x02, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B}:
        rom.check(state.pc)
        state.pc += 1
    # 0x00/0x03 are no-op extension slots.


def run_track_tick(
    rom: Rom,
    state: TrackState,
    tick: int,
    events: list[NoteEvent],
    tempo_box: list[int],
) -> None:
    if state.ended:
        return
    if state.wait > 0:
        state.wait -= 1
        return

    safety = 0
    while not state.ended and state.wait == 0:
        safety += 1
        if safety > 4096:
            raise ExtractError("MP2K sequence command loop without a wait")

        byte = rom.u8(state.pc)
        if byte < 0x80:
            command = state.running_status
            if command == 0:
                raise ExtractError(
                    f"MP2K data byte 0x{byte:02X} without running status"
                )
        else:
            command = byte
            state.pc += 1
            if command >= VOICE:
                state.running_status = command

        if 0x80 <= command <= 0xB0:
            state.wait = CLOCK_TABLE[command - 0x80]
            # The real engine decrements a newly loaded wait at the end of the
            # current tick. Representing that as N-1 here keeps event timing
            # aligned to the logical tick counter used by this renderer.
            state.wait = max(0, state.wait - 1)
            return

        if command >= TIE:
            length = CLOCK_TABLE[command - TIE]
            if rom.u8(state.pc) < 0x80:
                state.last_key = rom.u8(state.pc)
                state.pc += 1
                if rom.u8(state.pc) < 0x80:
                    state.last_velocity = rom.u8(state.pc)
                    state.pc += 1
                    if rom.u8(state.pc) < 0x80:
                        length += rom.u8(state.pc)
                        state.pc += 1
            event = NoteEvent(
                start_tick=tick,
                duration_ticks=max(1, length),
                key=state.last_key,
                velocity=state.last_velocity,
                voice=state.voice,
                volume=state.volume,
                pan=state.pan,
                bend=state.bend,
                bend_range=state.bend_range,
                key_shift=state.key_shift,
                tune=state.tune,
                tie=(command == TIE),
            )
            events.append(event)
            if command == TIE:
                old = state.active_ties.get(state.last_key)
                if old is not None:
                    old.duration_ticks = max(1, tick - old.start_tick)
                state.active_ties[state.last_key] = event
            continue

        if command == FINE or command in {0xB6, 0xB7, 0xB8, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB}:
            for key in list(state.active_ties):
                _close_tie(state, key, tick)
            state.ended = True
            return
        if command == GOTO:
            state.pc = _read_ptr_operand(rom, state)
            continue
        if command == PATT:
            if len(state.pattern_stack) >= 3:
                state.ended = True
                return
            return_pc = state.pc + 4
            target = _read_ptr_operand(rom, state)
            state.pattern_stack.append(return_pc)
            state.pc = target
            continue
        if command == PEND:
            if state.pattern_stack:
                state.pc = state.pattern_stack.pop()
            continue
        if command == REPT:
            count = rom.u8(state.pc)
            if count == 0:
                state.pc += 1
                state.pc = _read_ptr_operand(rom, state)
                continue
            state.repeat_count += 1
            if state.repeat_count < count:
                state.pc += 1
                state.pc = _read_ptr_operand(rom, state)
            else:
                state.repeat_count = 0
                state.pc += 5
            continue
        if command == MEMACC:
            _skip_memacc(rom, state)
            continue
        if command == PRIO:
            state.pc += 1
            continue
        if command == TEMPO:
            tempo_box[0] = max(1, rom.u8(state.pc) * 2)
            state.pc += 1
            continue
        if command == KEYSH:
            state.key_shift = rom.s8(state.pc)
            state.pc += 1
            continue
        if command == VOICE:
            state.voice = rom.u8(state.pc)
            state.pc += 1
            continue
        if command == VOL:
            state.volume = rom.u8(state.pc)
            state.pc += 1
            continue
        if command == PAN:
            state.pan = _signed_center(rom.u8(state.pc))
            state.pc += 1
            continue
        if command == BEND:
            state.bend = _signed_center(rom.u8(state.pc))
            state.pc += 1
            continue
        if command == BENDR:
            state.bend_range = rom.u8(state.pc)
            state.pc += 1
            continue
        if command in {LFOS, LFODL, MOD, MODT}:
            state.pc += 1
            continue
        if command == TUNE:
            state.tune = _signed_center(rom.u8(state.pc))
            state.pc += 1
            continue
        if command == PORT:
            state.pc += 2
            continue
        if command == XCMD:
            _handle_xcmd(rom, state)
            continue
        if command == EOT:
            key = state.last_key
            if rom.u8(state.pc) < 0x80:
                key = rom.u8(state.pc)
                state.last_key = key
                state.pc += 1
            _close_tie(state, key, tick)
            continue

        raise ExtractError(
            f"unsupported MP2K command 0x{command:02X} at ROM 0x{state.pc:X}"
        )


def sequence_song(
    rom: Rom,
    song: Song,
    max_seconds: float,
) -> tuple[list[NoteEvent], list[float], float]:
    states = [TrackState(pc=pc) for pc in song.tracks]
    per_track_events: list[list[NoteEvent]] = [[] for _ in states]
    tempo_box = [150]
    tick_seconds: list[float] = []
    elapsed = 0.0
    tick = 0
    max_ticks = 24 * 300 * 3  # hard safety cap even with pathological tempo.

    while elapsed < max_seconds and tick < max_ticks:
        if all(state.ended for state in states):
            break
        for state, events in zip(states, per_track_events, strict=True):
            run_track_tick(rom, state, tick, events, tempo_box)
        dt = 60.0 / (max(1, tempo_box[0]) * 24.0)
        tick_seconds.append(dt)
        elapsed += dt
        tick += 1

    for state in states:
        for key in list(state.active_ties):
            _close_tie(state, key, tick)

    events = [event for track in per_track_events for event in track]
    if not events:
        raise ExtractError("song produced no notes")
    return events, tick_seconds, elapsed


def make_tick_positions(tick_seconds: list[float]) -> list[float]:
    out = [0.0]
    total = 0.0
    for dt in tick_seconds:
        total += dt
        out.append(total)
    return out


def _decode_compressed_sample(rom: Rom, data_offset: int, sample_count: int) -> array:
    result = array("b")
    blocks = (sample_count + 63) // 64
    for block in range(blocks):
        start = data_offset + block * 33
        rom.check(start, 33)
        value = rom.s8(start)
        result.append(value)
        encoded = rom.data[start + 1 : start + 33]
        # The first encoded byte contributes only its low nibble. This mirrors
        # FireRed's SoundMainRAM_Unk2 decoder.
        value = ((value + DELTA_TABLE[encoded[0] & 0x0F] + 128) % 256) - 128
        result.append(value)
        for packed in encoded[1:]:
            value = ((value + DELTA_TABLE[(packed >> 4) & 0x0F] + 128) % 256) - 128
            result.append(value)
            value = ((value + DELTA_TABLE[packed & 0x0F] + 128) % 256) - 128
            result.append(value)
    del result[sample_count:]
    return result


@dataclass
class Sample:
    values: array
    source_rate: float
    loop_start: int
    looped: bool


class SampleCache:
    def __init__(self, rom: Rom):
        self.rom = rom
        self.cache: dict[tuple[int, bool, bool], Sample] = {}

    def load(self, tone: Tone) -> Sample:
        if not isinstance(tone.wav_ptr, int) or tone.wav_ptr < 0 or tone.wav_ptr >= len(self.rom.data):
            raise ExtractError(f"invalid sample pointer 0x{tone.wav_ptr:X}")
        compressed = bool(tone.type & TONE_COMPRESSED)
        reverse = bool(tone.type & TONE_REVERSE)
        key = (tone.wav_ptr, compressed, reverse)
        cached = self.cache.get(key)
        if cached is not None:
            return cached

        offset = tone.wav_ptr
        self.rom.check(offset, 16)
        flags = self.rom.u8(offset + 3)
        freq = self.rom.u32(offset + 4)
        loop_start = self.rom.u32(offset + 8)
        size = self.rom.u32(offset + 12)
        if size <= 0 or size > 8_000_000:
            raise ExtractError(f"invalid sample size {size} at ROM 0x{offset:X}")
        data_offset = offset + 16
        if compressed:
            values = _decode_compressed_sample(self.rom, data_offset, size)
        else:
            self.rom.check(data_offset, size)
            values = array("b", self.rom.data[data_offset : data_offset + size])
        if reverse:
            values = array("b", reversed(values))
            loop_start = 0

        source_rate = freq / 1024.0 if freq else OUTPUT_RATE
        source_rate = max(100.0, min(192_000.0, source_rate))
        sample = Sample(
            values=values,
            source_rate=source_rate,
            loop_start=max(0, min(len(values) - 1, loop_start)),
            looped=bool(flags & 0xC0) and loop_start < len(values),
        )
        self.cache[key] = sample
        return sample


def _clamp(value: int, low: int, high: int) -> int:
    return low if value < low else high if value > high else value


def _pcm_envelope_levels(tone: Tone, gate_samples: int) -> list[float]:
    hold_frames = max(1, math.ceil(gate_samples / ENGINE_FRAME_SAMPLES))
    levels: list[float] = []
    env = 0
    state = "attack"

    for frame in range(hold_frames + MAX_RELEASE_ENGINE_FRAMES):
        released = frame >= hold_frames

        if released:
            env = (env * tone.release) >> 8
            if env <= 0:
                break
        elif state == "attack":
            env += tone.attack
            if env >= 255:
                env = 255
                state = "decay"
        elif state == "decay":
            env = (env * tone.decay) >> 8
            if env <= tone.sustain:
                env = tone.sustain
                state = "sustain"
                if env == 0:
                    break

        levels.append(env / 255.0)

    return levels or [0.0]


def _psg_mix_parameters(event: NoteEvent, tone: Tone) -> tuple[int, int, int]:
    vol = _clamp(event.volume * 2, 0, 254)
    pan = _clamp(event.pan * 2, -128, 127)
    rhythm_pan = _clamp(tone.rhythm_pan, -128, 127)

    ml = ((127 - pan) * vol) >> 8
    mr = ((pan + 128) * vol) >> 8
    left = (((127 - rhythm_pan) * event.velocity) * ml) >> 14
    right = (((rhythm_pan + 128) * event.velocity) * mr) >> 14

    if right // 2 >= left:
        pan_class = 1
    elif left // 2 >= right:
        pan_class = -1
    else:
        pan_class = 0

    peak = _clamp((left + right) >> 4, 0, 15)
    sustain = _clamp((peak * (tone.sustain & 0x0F) + 15) >> 4, 0, 15)
    return peak, sustain, pan_class


def _psg_envelope_levels(
    event: NoteEvent,
    tone: Tone,
    gate_samples: int,
) -> tuple[list[float], int]:
    hold_frames = max(1, math.ceil(gate_samples / ENGINE_FRAME_SAMPLES))
    attack = tone.attack & 0x07
    decay = tone.decay & 0x07
    release = tone.release & 0x07
    peak, sustain, pan_class = _psg_mix_parameters(event, tone)

    if peak <= 0:
        return [0.0], pan_class

    level = 0
    state = "attack"
    counter = attack
    releasing = False
    levels: list[float] = []

    for frame in range(hold_frames + MAX_RELEASE_ENGINE_FRAMES):
        if frame >= hold_frames and not releasing:
            releasing = True
            state = "release"
            counter = release

        if state == "release":
            if release == 0:
                break
            counter -= 1
            if counter <= 0:
                level -= 1
                counter = release
                if level <= 0:
                    break
        elif state == "attack":
            if attack == 0:
                level = peak
                state = "decay"
                counter = decay
            else:
                counter -= 1
                if counter <= 0:
                    level += 1
                    counter = attack
                    if level >= peak:
                        level = peak
                        state = "decay"
                        counter = decay
        elif state == "decay":
            if level <= sustain:
                level = sustain
                state = "sustain"
            elif decay == 0:
                level = sustain
                state = "sustain"
            else:
                counter -= 1
                if counter <= 0:
                    level -= 1
                    counter = decay
                    if level <= sustain:
                        level = sustain
                        state = "sustain"

        levels.append(_clamp(level, 0, 15) / 15.0)

    return (levels or [0.0]), pan_class


def _mix_pcm_note(
    left: array,
    right: array,
    start: int,
    gate_end: int,
    limit_end: int,
    event: NoteEvent,
    tone: Tone,
    sample: Sample,
) -> None:
    pitch_semitones = (
        event.key_shift
        + event.tune / 64.0
        + (event.bend / 64.0) * event.bend_range
    )
    pitch_key = tone.key if tone.rhythm else event.key
    if tone.type & TONE_FIX:
        step = FIXED_PCM_RATE / OUTPUT_RATE
    else:
        step = (
            sample.source_rate
            / OUTPUT_RATE
            * (2.0 ** ((pitch_key + pitch_semitones - 60.0) / 12.0))
        )

    track_vol = _clamp(event.volume * 2, 0, 254)
    cpan = _clamp(event.pan * 2 + tone.rhythm_pan, -128, 128)
    lvol = _clamp(
        (event.velocity * track_vol * (-cpan + 128)) >> 15,
        0,
        255,
    ) / 255.0
    rvol = _clamp(
        (event.velocity * track_vol * (cpan + 128)) >> 15,
        0,
        255,
    ) / 255.0

    gate_samples = max(1, gate_end - start)
    envelope = _pcm_envelope_levels(tone, gate_samples)
    render_end = min(
        limit_end,
        start + math.ceil(len(envelope) * ENGINE_FRAME_SAMPLES),
    )

    values = sample.values
    source_len = len(values)
    if source_len < 2:
        return

    pos = 0.0
    master = (13.0 / 16.0) * 0.70

    for frame in range(start, render_end):
        idx = int(pos)
        if idx >= source_len:
            if not sample.looped:
                break
            loop_len = source_len - sample.loop_start
            if loop_len <= 0:
                break
            pos = sample.loop_start + ((pos - sample.loop_start) % loop_len)
            idx = int(pos)

        next_idx = idx + 1
        if next_idx >= source_len:
            next_idx = sample.loop_start if sample.looped else idx

        frac = pos - idx
        value = (
            values[idx] * (1.0 - frac) + values[next_idx] * frac
        ) / 128.0
        local = frame - start
        env_idx = min(
            len(envelope) - 1,
            int(local / ENGINE_FRAME_SAMPLES),
        )
        env = envelope[env_idx]
        left[frame] += value * env * lvol * master
        right[frame] += value * env * rvol * master
        pos += step


def _noise_clock_rate(key: float) -> float:
    if key < 76.0:
        rate = 4096.0 * (8.0 ** ((key - 60.0) / 12.0))
    elif key < 78.0:
        rate = 65536.0 * (2.0 ** ((key - 76.0) / 2.0))
    elif key < 80.0:
        rate = 131072.0 * (2.0 ** (key - 78.0))
    else:
        rate = 524288.0
    return max(4.5714, rate)


def _mix_psg_note(
    rom: Rom,
    left: array,
    right: array,
    start: int,
    gate_end: int,
    limit_end: int,
    event: NoteEvent,
    tone: Tone,
) -> None:
    channel = tone.type & TONE_CGB_MASK
    pitch_key = tone.key if tone.rhythm else event.key
    pitch_units = (
        event.tune
        + event.bend * event.bend_range
        + event.key_shift * 64
    )
    semitone = pitch_key + pitch_units / 64.0

    gate_samples = max(1, gate_end - start)
    envelope, pan_class = _psg_envelope_levels(event, tone, gate_samples)
    render_end = min(
        limit_end,
        start + math.ceil(len(envelope) * ENGINE_FRAME_SAMPLES),
    )

    duty_steps = [1, 2, 4, 6]
    duty = duty_steps[tone.wav_ptr & 3]
    square_step = (
        3520.0
        * (2.0 ** ((semitone - 69.0) / 12.0))
        / OUTPUT_RATE
    )
    wave_step = (
        (440.0 * 16.0)
        * (2.0 ** ((semitone - 69.0) / 12.0))
        / OUTPUT_RATE
    )
    noise_step = _noise_clock_rate(semitone) / OUTPUT_RATE

    square_pos = 0.0
    wave_pos = 0.0
    noise_pos = 0.0
    short_noise = bool(tone.wav_ptr & 1)
    lfsr = 0x40 if short_noise else 0x4000
    lfsr_mask = 0x60 if short_noise else 0x6000
    noise_value = -0.5

    wave_values: list[int] | None = None
    wave_mean = 0.0
    if (
        channel == 3
        and isinstance(tone.wav_ptr, int)
        and 0 <= tone.wav_ptr <= len(rom.data) - 16
    ):
        raw = rom.data[tone.wav_ptr : tone.wav_ptr + 16]
        wave_values = []
        for packed in raw:
            wave_values.append(packed >> 4)
            wave_values.append(packed & 0x0F)
        wave_mean = sum(wave_values) / len(wave_values)

    for frame in range(start, render_end):
        local = frame - start
        env_idx = min(
            len(envelope) - 1,
            int(local / ENGINE_FRAME_SAMPLES),
        )
        env = envelope[env_idx]
        if env <= 0:
            continue

        if channel in {1, 2}:
            idx = int(square_pos) & 7
            value = (8 - duty) / 8.0 if idx < duty else -duty / 8.0
            square_pos = (square_pos + square_step) % 8.0
        elif channel == 3 and wave_values:
            idx = int(wave_pos) & 31
            next_idx = (idx + 1) & 31
            frac = wave_pos - int(wave_pos)
            nibble = (
                wave_values[idx] * (1.0 - frac)
                + wave_values[next_idx] * frac
            )
            value = (nibble - wave_mean) / 8.0
            wave_pos = (wave_pos + wave_step) % 32.0
        elif channel == 4:
            noise_pos += noise_step
            clocks = int(noise_pos)
            noise_pos -= clocks
            for _ in range(clocks):
                if lfsr & 1:
                    noise_value = 0.5
                    lfsr = (lfsr >> 1) ^ lfsr_mask
                else:
                    noise_value = -0.5
                    lfsr >>= 1
            value = noise_value
        else:
            continue

        amplitude = value * env * 0.48
        if pan_class != 1:
            left[frame] += amplitude
        if pan_class != -1:
            right[frame] += amplitude


def render_song(
    rom: Rom,
    song: Song,
    events: list[NoteEvent],
    tick_seconds: list[float],
    duration: float,
    target: Path,
) -> dict[str, int | float]:
    tick_positions = make_tick_positions(tick_seconds)
    frames = max(1, int(min(duration, tick_positions[-1]) * OUTPUT_RATE))
    left = array("f", [0.0]) * frames
    right = array("f", [0.0]) * frames
    cache = SampleCache(rom)
    skipped = 0

    for event in events:
        if event.start_tick >= len(tick_positions) - 1:
            continue
        end_tick = min(
            len(tick_positions) - 1,
            event.start_tick + max(1, event.duration_ticks),
        )
        start = int(tick_positions[event.start_tick] * OUTPUT_RATE)
        gate_end = min(
            frames,
            max(start + 1, int(tick_positions[end_tick] * OUTPUT_RATE)),
        )
        if start >= frames or gate_end <= start:
            continue

        try:
            tone = read_tone(
                rom,
                song.voicegroup,
                event.voice,
                event.key,
            )
        except ExtractError:
            skipped += 1
            continue

        try:
            if tone.type & TONE_CGB_MASK:
                _mix_psg_note(
                    rom,
                    left,
                    right,
                    start,
                    gate_end,
                    frames,
                    event,
                    tone,
                )
            else:
                sample = cache.load(tone)
                _mix_pcm_note(
                    left,
                    right,
                    start,
                    gate_end,
                    frames,
                    event,
                    tone,
                    sample,
                )
        except ExtractError:
            skipped += 1

    peak = 0.0
    for value in left:
        peak = max(peak, abs(value))
    for value in right:
        peak = max(peak, abs(value))
    scale = 0.92 / peak if peak > 0.92 else 1.0

    pcm = array("h")
    for l_value, r_value in zip(left, right, strict=True):
        pcm.append(
            int(max(-1.0, min(1.0, l_value * scale)) * 32767)
        )
        pcm.append(
            int(max(-1.0, min(1.0, r_value * scale)) * 32767)
        )

    target.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(target), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(OUTPUT_RATE)
        if sys.byteorder != "little":
            pcm.byteswap()
        handle.writeframes(pcm.tobytes())

    return {
        "notes": len(events),
        "skippedNotes": skipped,
        "seconds": round(frames / OUTPUT_RATE, 3),
        "sampleRate": OUTPUT_RATE,
    }

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract FireRed MP2K/Sappy music directly to WAV."
    )
    parser.add_argument("rom", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("local-assets/extracted/firered/music"),
    )
    parser.add_argument(
        "--seconds",
        type=float,
        default=DEFAULT_SECONDS,
        help=f"maximum rendered length per song (default {DEFAULT_SECONDS:g}s)",
    )
    parser.add_argument(
        "--tracks",
        help="comma-separated music IDs; defaults to the tracks Tactimon uses",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rom_path = args.rom.resolve()
    if not rom_path.exists():
        raise SystemExit(f"ROM not found: {rom_path}")
    actual_sha1 = sha1(rom_path)
    if actual_sha1 != FIRERED_SHA1:
        raise SystemExit(
            "Unsupported FireRed ROM SHA-1. "
            f"Expected {FIRERED_SHA1}, got {actual_sha1}."
        )
    if args.seconds <= 1:
        raise SystemExit("--seconds must be greater than 1")

    rom = Rom(rom_path.read_bytes())
    if args.tracks:
        try:
            selected = [int(value.strip()) for value in args.tracks.split(",") if value.strip()]
        except ValueError as error:
            raise SystemExit("--tracks must contain numeric music IDs") from error
    else:
        selected = list(REQUIRED_TRACKS)

    runtime = args.output.resolve() / "runtime"
    runtime.mkdir(parents=True, exist_ok=True)
    rendered = []
    for music_id in selected:
        name = REQUIRED_TRACKS.get(music_id, f"song-{music_id}")
        print(f"Extracting {music_id} ({name}) from FireRed ROM...")
        song = read_song(rom, music_id)
        events, tick_seconds, duration = sequence_song(rom, song, args.seconds)
        target = runtime / f"{music_id}.wav"
        stats = render_song(
            rom,
            song,
            events,
            tick_seconds,
            min(args.seconds, duration),
            target,
        )
        print(
            f"  -> {target.name}: {stats['seconds']}s, "
            f"{stats['notes']} notes, {stats['skippedNotes']} skipped"
        )
        rendered.append(
            {
                "musicId": music_id,
                "name": name,
                "file": target.name,
                **stats,
            }
        )

    manifest = {
        "source": "Pokemon FireRed local ROM / MP2K-Sappy",
        "extractor": "tactimon-pure-python-mp2k-v2",
        "romSha1": actual_sha1,
        "tracks": rendered,
    }
    (runtime / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Extracted {len(rendered)} tracks to {runtime}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
