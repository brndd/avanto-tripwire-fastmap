# Avanto Fastmapper

This userscript adds a simple text input box to Avanto Tripwire
to facilitate quickly adding new wormhole connections without
using the mouse.

If you name your bookmarks using the syntax below,
you can also just paste your bookmarks list into the mapper (after sigs have been added)
and all valid WHs will be created.

# Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) or Tampermonkey or some other userscript manager.
2. Install the userscript from [this link](https://raw.githubusercontent.com/brndd/avanto-tripwire-fastmap/refs/heads/master/avanto_fastmap.user.js).
3. Refresh Tripwire.
4. Press `Alt-S` (`Ctrl-Cmd-S`) to open the input box.

# Usage

The quick input box can be opened with the shortcut `Alt-S` (`Ctrl-Cmd-S` on Mac) (the S stands for "sig"). The shortcut currently cannot be changed.

If you prefer, you can also paste the wormhole string into Tripwire like you would paste sigs. This can be useful if you use the exact same syntax for in-game bookmarks; while creating the bookmark, you can just ctrl-A ctrl-C and then ctrl-V into Tripwire.

***NEW!*** **You can now also paste in the contents of the bookmarks window and every valid WH in the current system will be added!**

The input box accepts extended Avanto bookmark syntax and always creates the connections in the *currently active system*. The main differences to the common lazy in-game bookmark are:

- The wormhole type (K162, H296, B274, etc.) must be included.
- Wormhole life/mass/size (E=EOL, C=Crit, D/H=Half-mass, F/S=frigate hole) must be included. The order of these between one another does not matter, but duplicate/conflicting identifiers are not allowed. This is optional; if omitted, the hole is assumed to be a fresh non-frigate hole.
- An optional comment in parenthesis, such as (sig) or (DO NOT WARP), can be added to the end. This will be included in the name of the wormhole connection created.

An example input is: `K5A ABC K162 4CF (bubbled)`. Assuming the currently active system is a C5 hole, this input will create the following wormhole in the currently active system:

- Name: K5A ABC (bubbled)
- Life: 4 hours left (the "4" in "4CF")
- Mass: Critical (the "C" in "4CF")
- Sig type on this side: K162
- Size: Small ships only (the "F" in "4CF")
- Sig type on other side: C008 (frig holes into C5 are always this type)

Had we instead input `K5A ABC K162 4C`, the sig type on the other side would be H296, because non-frigate C5>C5 connections are always this type. If we were in a C3 instead, it would be M267, the type for C5>C3 connections.

The box looks like this with the syntax help open. The syntax view is hidden by default though.

![screenshot](screenshot.png)

# Building

Run `npm run build`. The userscript will be generated into the root of the repo as avanto_fastmap.user.js.

# Editing

Make your edits to the userscript in src/avanto_fastmap.js and to the grammar in src/avanto.pegjs.

The build process combines the userscript template file with the generated grammar to produce the final userscript.

# Updating

Bumping the version number in src/avanto_fastmap.js, rebuilding and committing the built userscript will
cause Violentmonkey (or whatever addon you use) to auto-update the userscript.
