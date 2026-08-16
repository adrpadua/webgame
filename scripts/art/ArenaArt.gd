class_name ArenaArt
extends RefCounted

## Shared arena art references.
##
## The backdrop is drawn twice at different strengths — full-window by Main.gd
## and over the board by HexGrid.gd — so the asset path lives here rather than
## being preloaded independently in each. Swapping the backdrop is one edit.
##
## This is placeholder art. See docs/content/art-prompts/ for the prompt set
## that produces its replacement.

const BACKDROP := preload("res://assets/art/open-duelyst/magaari_ember_highlands_background.jpg")
