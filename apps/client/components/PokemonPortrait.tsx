"use client";

import { useEffect, useState } from "react";
import type { DuelSpeciesId } from "@tactimon/battle-engine";

type Props = {
  species: DuelSpeciesId;
  name: string;
};

type FireRedManifest = {
  pokemon?: {
    entries?: Array<{
      name: string;
      files?: {
        front_normal?: string;
      };
    }>;
  };
};

let fireRedManifestPromise:
  | Promise<FireRedManifest>
  | null = null;

function loadFireRedManifest(): Promise<FireRedManifest> {
  if (!fireRedManifestPromise) {
    fireRedManifestPromise = fetch(
      "/game-assets/firered/asset-manifest.json",
    ).then((response) => {
      if (!response.ok) {
        throw new Error(
          `FireRed asset manifest unavailable: ${response.status}`,
        );
      }
      return response.json() as Promise<FireRedManifest>;
    });
  }

  return fireRedManifestPromise;
}

function manifestSpeciesName(
  species: DuelSpeciesId,
): string {
  return species
    .replaceAll("-", "_")
    .toUpperCase();
}

export function PokemonPortrait({
  species,
  name,
}: Props) {
  const [src, setSrc] = useState<string | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setSrc(null);

    loadFireRedManifest()
      .then((manifest) => {
        if (!active) return;
        const entry =
          manifest.pokemon?.entries?.find(
            (candidate) =>
              candidate.name ===
              manifestSpeciesName(species),
          );
        const file = entry?.files?.front_normal;
        setSrc(
          file
            ? `/game-assets/firered/${file}`
            : `/game-assets/pokemon-sprites/${species}/portrait.png`,
        );
      })
      .catch(() => {
        if (active) {
          setSrc(
            `/game-assets/pokemon-sprites/${species}/portrait.png`,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [species]);

  return (
    <div
      className="battle-portrait-frame"
      aria-hidden="true"
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="battle-portrait-image firered-rom-sprite"
          onError={() => setFailed(true)}
        />
      ) : failed ? (
        <div className="battle-portrait-fallback">
          {name.slice(0, 1)}
        </div>
      ) : (
        <div className="battle-portrait-loading" />
      )}
    </div>
  );
}
