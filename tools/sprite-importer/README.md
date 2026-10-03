# SpriteCollab importer

Upstream: https://github.com/PMDCollab/SpriteCollab

The tool works from a developer-local checkout instead of vendoring the upstream repository. The upstream submission policy describes community submissions under CC BY-NC 4.0 with attribution and separately identifies official Chunsoft-made material, so provenance must be tracked per imported asset.

Pipeline: scan `AnimData.xml`, retain cardinal gameplay directions, build animation metadata for Walk/Idle/Attack/Hurt/Sleep/etc., collect upstream credits, generate atlases outside source control, and ship attribution with distributable builds.

This commit scans metadata only and copies no PNG assets.
