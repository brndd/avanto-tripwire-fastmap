# Avanto Fastmapper

This userscript adds a simple text input box to Avanto Tripwire
to facilitate quickly adding new wormhole connections without
using the mouse.

# Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) or Tampermonkey or some other userscript manager.
2. Install the userscript from [this link](https://raw.githubusercontent.com/brndd/avanto-tripwire-fastmap/refs/heads/master/avanto_fastmap.user.js).
3. Refresh Tripwire.
4. Press **Alt-S** (**Ctrl-Cmd-S**) to open the input box.

# Usage

Install the userscript. The quick input box can be opened with the shortcut **Alt-S** (**Ctrl-Cmd-S** on Mac) (the S stands for "sig"). The shortcut currently cannot be changed.

The input box accepts extended Avanto bookmark syntax and always creates the connections in the **currently active system**. The main differences to the common lazy in-game bookmark are:

- Wormhole life/mass/size (E=EOL, C=Crit, D/H=Half-mass, F/S=frigate hole) must be included.
- The wormhole type (K162, H296, B274, etc.) must be appended to the input.
- Pound signs (#) and other special characters used for sorting the in-game bookmarks list should not be included.
- An optional comment in parenthesis, such as (sig) or (DO NOT WARP), can be added to the end. This will be included in the name of the wormhole connection created.

An example input is: `K5A ABC ECF K162 (bubbled)`. This input will create the following wormhole in the currently active system:

- Name: K5A ABC (bubbled)
- Life: End-of-life (the "E" in "ECF")
- Mass: Critical (the "C" in "ECF")
- Size: Small ships only (the "F" in "ECF")
- Sig type on this side: K162
- Sig type on other side: C008 (frig holes coming from C5 are always this type)

Had we instead input `K5A ABC EC K162`, the sig type on the other side would depend on the system we're currently in. If we're in a C5 ourselves, it will be H296, because non-frigate C5>C5 connections are always this type. If we were in a C3 instead, it would be M267.

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
