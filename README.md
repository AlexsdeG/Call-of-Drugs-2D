# Call of Drugs 2D

A top-down Drug Empire builder running in the browser using Phaser 3, React, and PeerJS.

## Sound System
The game uses a folder-based sound architecture. Place audio files in `public/sounds/`.

| Category | Filename | Path | Description |
|----------|----------|------|-------------|
| **UI** | `click.mp3` | `/sounds/ui/click.mp3` | Button clicks or dry fire |
| **Weapon** | `fire.mp3` | `/sounds/weapons/{weapon_name}/fire.mp3` | Gunshot |
| **Weapon** | `reload.mp3` | `/sounds/weapons/{weapon_name}/reload.mp3` | Reload sound |
| **Player** | `step.mp3` | `/sounds/player/step.mp3` | Footsteps |

*Note: The `SoundManager` handles missing files gracefully. If a specific weapon sound is missing, it attempts to play from `/sounds/weapons/DEFAULT/`.*

## Keybinds In-Game

| Key | Action |
|-----|--------|
| **W, A, S, D** | Move Character |
| **Shift** | Sprint |
| **Mouse** | Aim |
| **Left Click** | Fire Weapon |
| **R** | Reload |
| **F** | Interact (Buy, Open Door, Repair) |
| **V** | Melee Attack |
| **1, 2, 3** | Equip Weapon Slot |
| **Mouse Wheel** | Cycle Weapons |
| **ESC** | Pause |
| **TAB** | Inventory |


## Keybinds Editor

| Key | Action |
|-----|--------|
| **W, A, S, D** | Move Camera |
| **Mouse** | Select Tile |
| **Mouse Wheel** | Zoom Camera |
| **Q/E** | Zoom Camera |
| **Left Click** | Place Tile |
| **Ctrl + Left Click** | Place multiple Objects |
| **Ctrl + Z** | Undo |
| **Ctrl + Y** | Redo |