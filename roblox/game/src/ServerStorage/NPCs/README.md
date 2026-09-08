# NPCs

Drop enemy/boss/NPC Models here, named exactly as the `enemyType` / `bossType`
/ `npcType` value used in your Rule actions or manual command tests (e.g. a
Model named `basic` for the default `SPAWN_ENEMY` enemyType).

`ServerScriptService/Services/SpawnService.lua` looks for a Model/Part with
that name here first, and only falls back to a placeholder colored block if
nothing is found — so the whole pipeline works with zero art assets, and
adding real ones is a drop-in replacement.
