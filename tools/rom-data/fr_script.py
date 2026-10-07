"""Small FireRed event-script walker (enough to find NPC moves; not a full disassembler).

Command lengths (bytes after the opcode) follow pokefirered's `event.inc`. A walk stops on `end`,
`return`, `endram`, `gotonative`/`gotostd`, an unconditional `goto` it already followed, or an opcode
whose length is unknown (counted in `Walk.unknown` so the quality of a sweep can be judged).
"""
import struct

ROM_BASE = 0x08000000

# opcode -> argument bytes
LEN = {
    0x00: 0, 0x01: 0, 0x02: 0, 0x03: 0, 0x04: 4, 0x05: 4, 0x06: 5, 0x07: 5, 0x08: 1, 0x09: 1, 0x0A: 2, 0x0B: 2,
    0x0C: 0, 0x0D: 0, 0x0E: 1, 0x0F: 5, 0x10: 2, 0x11: 5, 0x12: 5, 0x13: 5, 0x14: 2, 0x15: 8, 0x16: 4, 0x17: 4,
    0x18: 4, 0x19: 4, 0x1A: 4, 0x1B: 2, 0x1C: 2, 0x1D: 5, 0x1E: 5, 0x1F: 5, 0x20: 8, 0x21: 4, 0x22: 4, 0x23: 4,
    0x24: 4, 0x25: 2, 0x26: 4, 0x27: 0, 0x28: 2, 0x29: 2, 0x2A: 2, 0x2B: 2, 0x2C: 4, 0x2D: 0, 0x2E: 0, 0x2F: 2,
    0x30: 0, 0x31: 2, 0x32: 0, 0x33: 3, 0x34: 2, 0x35: 0, 0x36: 2, 0x37: 1, 0x38: 1, 0x39: 6, 0x3A: 6, 0x3B: 6,
    0x3C: 2, 0x3D: 6, 0x3E: 6, 0x3F: 6, 0x40: 6, 0x41: 6, 0x42: 4, 0x43: 0, 0x44: 3, 0x45: 3, 0x46: 4, 0x47: 4,
    0x48: 2, 0x49: 4, 0x4A: 4, 0x4B: 2, 0x4C: 2, 0x4D: 2, 0x4E: 2, 0x4F: 6, 0x50: 8, 0x51: 2, 0x52: 4, 0x53: 2,
    0x54: 4, 0x55: 2, 0x56: 4, 0x57: 6, 0x58: 4, 0x59: 4, 0x5A: 0, 0x5B: 3, 0x5D: 0, 0x5E: 0, 0x5F: 0, 0x60: 2,
    0x61: 2, 0x62: 2, 0x63: 6, 0x64: 2, 0x65: 3, 0x66: 0, 0x67: 4, 0x68: 0, 0x69: 0, 0x6A: 0, 0x6B: 0, 0x6C: 0,
    0x6D: 0, 0x6E: 2, 0x6F: 4, 0x70: 5, 0x71: 5, 0x73: 4, 0x75: 4, 0x76: 0, 0x78: 4, 0x79: 14, 0x7A: 2, 0x7B: 4,
    0x7C: 2, 0x7D: 3, 0x7E: 1, 0x7F: 3, 0x80: 3, 0x81: 3, 0x82: 3, 0x83: 3, 0x84: 3, 0x85: 5, 0x86: 4, 0x87: 4,
    0x88: 4, 0x89: 2, 0x8A: 3, 0x8F: 2, 0x90: 5, 0x91: 5, 0x92: 5, 0x93: 3, 0x94: 2, 0x95: 3, 0x96: 2, 0x97: 1,
    0x98: 2, 0x99: 1, 0x9A: 1, 0x9B: 4, 0x9C: 2, 0x9D: 3, 0x9E: 2, 0x9F: 2, 0xA0: 0, 0xA1: 4, 0xA2: 8, 0xA3: 0,
    0xA4: 2, 0xA5: 0, 0xA6: 1, 0xA7: 2, 0xA8: 5, 0xA9: 4, 0xAC: 4, 0xAD: 4, 0xAE: 0, 0xAF: 4, 0xB0: 4,
    0xB3: 2, 0xB4: 2, 0xB5: 2, 0xB6: 5, 0xB7: 0, 0xB8: 4, 0xB9: 4, 0xBA: 4, 0xBB: 5, 0xBC: 5, 0xBD: 4, 0xBE: 4,
    0xBF: 5, 0xC0: 2, 0xC1: 2, 0xC2: 2, 0xC3: 1, 0xC4: 6, 0xC5: 0, 0xC6: 3, 0xC7: 1, 0xC8: 4, 0xC9: 0, 0xCA: 0,
    0xCB: 0, 0xCC: 5, 0xCF: 3,
}
NAMES = {
    0x02: "end", 0x03: "return", 0x04: "call", 0x05: "goto", 0x06: "goto_if", 0x07: "call_if", 0x09: "callstd",
    0x0D: "endram", 0x0F: "loadword", 0x16: "setvar", 0x29: "setflag", 0x2A: "clearflag", 0x4F: "applymovement",
    0x50: "applymovementat", 0x51: "waitmovement", 0x53: "removeobject", 0x54: "removeobjectat", 0x55: "addobject",
    0x56: "addobjectat", 0x57: "setobjectxy", 0x58: "showobjectat", 0x59: "hideobjectat", 0x5A: "faceplayer",
    0x5B: "turnobject", 0x63: "setobjectxyperm", 0x64: "copyobjectxytoperm", 0x65: "setobjectmovementtype",
}


class Walk:
    def __init__(self, rom):
        self.rom = rom
        self.seen = set()
        self.events = []  # (offset, name, args)
        self.unknown = 0
        self.unknown_ops = {}
        self.scripts = 0

    def ptr(self, value):
        return value - ROM_BASE if ROM_BASE <= value < ROM_BASE + len(self.rom) else None

    def run(self, start):
        """Walks the script at `start` (a ROM offset) and everything it calls or jumps to."""
        stack = [start]
        while stack:
            pos = stack.pop()
            if pos is None or pos in self.seen or not (0 <= pos < len(self.rom)):
                continue
            self.scripts += 1
            while 0 <= pos < len(self.rom):
                if pos in self.seen:
                    break
                self.seen.add(pos)
                op = self.rom[pos]
                if op == 0x5C:  # trainerbattle: variable length, stop (the NPC walks via the engine)
                    break
                n = LEN.get(op)
                if n is None:
                    self.unknown += 1
                    self.unknown_ops[op] = self.unknown_ops.get(op, 0) + 1
                    break
                args = self.rom[pos + 1 : pos + 1 + n]
                name = NAMES.get(op)
                if name in ("setobjectxy", "setobjectxyperm", "applymovement", "applymovementat", "removeobject",
                            "removeobjectat", "addobject", "addobjectat", "showobjectat", "hideobjectat", "turnobject",
                            "setobjectmovementtype", "copyobjectxytoperm", "setflag", "clearflag"):
                    self.events.append((pos, name, args))
                if op in (0x04, 0x05):
                    target = self.ptr(struct.unpack("<I", args)[0])
                    stack.append(target)
                    if op == 0x05:
                        break
                elif op in (0x06, 0x07):
                    stack.append(self.ptr(struct.unpack("<I", args[1:])[0]))
                elif op in (0x02, 0x03, 0x0D, 0x08, 0x22, 0x24):
                    break
                pos += 1 + n


# FireRed MOVEMENT_ACTION_* walking codes (0x08-0x13 slow/normal, 0x1d-0x24 fast): value % 4 = down, up, left, right.
_WALK_RANGES = ((0x08, 0x13), (0x1D, 0x24))
_DELTA = ((0, 1), (0, -1), (-1, 0), (1, 0))


def movement_steps(rom, offset, limit=64):
    """Net walk of an `applymovement` list (ends with 0xFE): ((dx, dy), number of steps)."""
    dx = dy = steps = 0
    for i in range(limit):
        code = rom[offset + i]
        if code == 0xFE:
            break
        for lo, hi in _WALK_RANGES:
            if lo <= code <= hi:
                step = _DELTA[(code - lo) % 4]
                dx += step[0]
                dy += step[1]
                steps += 1
    return (dx, dy), steps
