"use client";

import { useEffect } from "react";
import { installInputBridge } from "@/lib/input/bridge";

/** Mounts the keyboard / mouse / gamepad bridge once for the whole game. */
export function InputBridge() {
  useEffect(() => installInputBridge(window), []);
  return null;
}
