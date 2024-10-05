# Avanto Fastmapper

This userscript adds a simple text input box to Avanto Tripwire
to facilitate quickly adding new wormhole connections without
using the mouse.

# Building

Run `npm run build`. The userscript will be generated into the root of the repo as avanto_fastmap.user.js.

# Editing

Make your edits to the userscript in src/avanto_fastmap.js and to the grammar in src/avanto.pegjs.

The build process combines the userscript template file with the generated grammar to produce the final userscript.

# Updating

Bumping the version number in src/avanto_fastmap.js, rebuilding and committing the built userscript will
cause Violentmonkey (or whatever addon you use) to auto-update the userscript.
