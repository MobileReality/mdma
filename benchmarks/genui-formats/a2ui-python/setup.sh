#!/usr/bin/env bash
# Rebuild the Python environment the A2UI arm needs.
#
# The A2UI adapter shells out to a2ui_tool.py, which imports the A2UI project's
# own SDK. That SDK is not on PyPI, so it is installed from a pinned commit of
# a2ui-project/a2ui. Both the checkout and the venv live under /tmp by default,
# which means they disappear whenever the OS cleans temporary files. Re-run this
# script when `pnpm verify` reports a spawn failure for the A2UI adapter.
#
#   ./a2ui-python/setup.sh
#
# Override locations with A2UI_SRC / A2UI_VENV if you want them somewhere
# durable, and set A2UI_PYTHON to the resulting interpreter so the adapter
# finds it:
#
#   A2UI_SRC=~/.cache/a2ui-src A2UI_VENV=~/.cache/a2ui-venv ./a2ui-python/setup.sh
#   export A2UI_PYTHON=~/.cache/a2ui-venv/bin/python

set -euo pipefail

# The commit the published results were generated against. Later commits added
# an ANTLR build dependency that this arm does not need, so the pin is
# deliberate rather than incidental.
A2UI_COMMIT="${A2UI_COMMIT:-349c97909572c85111b6201c4e46169ae0277d9b}"
A2UI_SRC="${A2UI_SRC:-/tmp/a2ui-src}"
A2UI_VENV="${A2UI_VENV:-/tmp/a2ui-venv}"

echo "A2UI commit : $A2UI_COMMIT"
echo "checkout    : $A2UI_SRC"
echo "venv        : $A2UI_VENV"

rm -rf "$A2UI_SRC" "$A2UI_VENV"
mkdir -p "$A2UI_SRC"

# Shallow single-commit fetch: the full history is large and unnecessary.
git -C "$A2UI_SRC" init -q
git -C "$A2UI_SRC" remote add origin https://github.com/a2ui-project/a2ui.git
git -C "$A2UI_SRC" fetch -q --depth 1 origin "$A2UI_COMMIT"
git -C "$A2UI_SRC" checkout -q FETCH_HEAD

# a2ui_agent's build reads ../../specification, so both packages install from
# the repo layout rather than in isolation.
python3 -m venv "$A2UI_VENV"
"$A2UI_VENV/bin/pip" install -q \
  "$A2UI_SRC/agent_sdks/python/a2ui_core" \
  "$A2UI_SRC/agent_sdks/python/a2ui_agent"

"$A2UI_VENV/bin/python" -c "import a2ui" && echo "OK: A2UI SDK installed"

# The adapter also reads the standard v0.9 catalog straight from the checkout.
test -f "$A2UI_SRC/specification/v0_9/catalogs/basic/catalog.json" \
  && echo "OK: v0.9 basic catalog present"
