#!/bin/sh
# Runs the logic tests under JavaScriptCore (ships with macOS — no Node needed).
set -e
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

[ -x "$JSC" ] || { echo "JavaScriptCore not found at $JSC"; exit 1; }

"$JSC" js/units.js tests/test-units.js
"$JSC" js/units.js js/data/items.js js/data/recipes.js js/proteins.js js/pricing.js tests/test-data.js
"$JSC" js/units.js js/data/items.js js/data/recipes.js js/proteins.js js/pricing.js js/planner.js tests/test-pricing.js
"$JSC" js/units.js js/data/items.js js/data/recipes.js js/proteins.js js/pricing.js js/store.js tests/test-store.js
"$JSC" js/units.js js/data/items.js js/data/recipes.js js/proteins.js tests/test-proteins.js
