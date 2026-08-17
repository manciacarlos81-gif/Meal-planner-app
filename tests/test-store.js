/* test-store.js — state merge/import type-safety, and the fields other
 * modules depend on (entriesForDates' batchServings passthrough, getRecipe
 * resolving custom recipes).
 *
 * Runs under jsc, where localStorage is undefined, so Store operates in its
 * "no persistence" branch — exactly what's needed to exercise merge() and
 * importJson()'s pure logic without touching disk.
 */
var S = Store;
var pass = 0, fail = 0, failures = [];

function ok(name, actual, expected) {
  var same = JSON.stringify(actual) === JSON.stringify(expected);
  if (same) pass++;
  else { fail++; failures.push(name + '\n    expected: ' + JSON.stringify(expected) + '\n    actual:   ' + JSON.stringify(actual)); }
}
function truthy(name, cond, detail) {
  if (cond) pass++; else { fail++; failures.push(name + (detail ? '\n    ' + detail : '')); }
}

/* ---- jsc has no localStorage; Store must degrade gracefully, not throw ---- */
truthy('no localStorage under jsc', !S.hasLocalStorage);

/* ---- a well-formed backup round-trips exactly ---- */
S.reset();
S.update(function (st) {
  st.pantry['rice-white'] = 500;
  st.settings.weeklyBudget = 77;
});
var goodBackup = S.exportJson();
S.reset();
var res1 = S.importJson(goodBackup);
truthy('valid backup imports ok', res1.ok);
ok('pantry round-trips', S.state.pantry['rice-white'], 500);
ok('settings round-trip', S.settings.weeklyBudget, 77);

/* ---- malformed sub-fields must not corrupt state or crash downstream code.
   This is the exact shape a hand-edited or corrupted backup could take —
   valid top-level settings/plan (so importJson's own check passes) but
   wrong-typed sub-fields. Before the fix, "overrides": null would overwrite
   the default {} outright, and the next price lookup anywhere in the app
   (effectiveEntry does `overrides[item.id]`) would throw. ---- */
S.reset();
var bad = {
  settings: { dailyKcal: 2500, dailyProtein: 130, weeklyBudget: 90,
              enabledStores: ['coles', 'aldi'], defaultServings: 1, autoLeftovers: true,
              body: { sex: '', age: null, heightCm: null, weightKg: null, activity: 1.55, surplus: 400 } },
  plan: {},
  overrides: null,              // was: silently overwrote the default {}
  customRecipes: 'not an array',
  pantry: 42,
  checked: []                   // wrong type too: checked should be an object
};
var res2 = S.importJson(JSON.stringify(bad));
truthy('import with bad sub-fields still succeeds (the valid fields are kept)', res2.ok);
ok('settings from the import are kept — they were valid', S.settings.weeklyBudget, 90);

truthy('overrides falls back to the default object, not null',
       S.state.overrides && typeof S.state.overrides === 'object');
ok('overrides default is empty', S.state.overrides, {});

truthy('customRecipes falls back to an array, not the string',
       Array.isArray(S.state.customRecipes));
ok('customRecipes default is empty', S.state.customRecipes, []);

truthy('pantry falls back to an object, not the number',
       S.state.pantry && typeof S.state.pantry === 'object' && !Array.isArray(S.state.pantry));
ok('pantry default is empty', S.state.pantry, {});

truthy('checked falls back to an object, not the array',
       S.state.checked && typeof S.state.checked === 'object' && !Array.isArray(S.state.checked));
ok('checked default is empty', S.state.checked, {});

/* ---- and the whole point: pricing must not crash on the recovered state ---- */
var chickenItem = CATALOGUE.get('chicken-thigh');
var threw = null;
try { Pricing.cheapestStore(chickenItem, S.settings.enabledStores, S.state.overrides); }
catch (e) { threw = e; }
truthy('cheapestStore does not throw after a malformed import', !threw,
       threw ? threw.message : '');

S.reset();

/* ---- entriesForDates passes batchServings through, and only for the
   non-leftover entry — leftovers stay excluded, as before ---- */
S.update(function (st) {
  st.plan['2026-08-17'] = {
    dinner: { recipeId: 'kofte-bulgur', servings: 1, batchServings: 4, cooked: false },
    lunch: { recipeId: 'kofte-bulgur', servings: 1, leftoverOf: '2026-08-16:dinner', cooked: false }
  };
});
var entries = S.entriesForDates(['2026-08-17']);
ok('leftover entry excluded, only the dinner entry is present', entries.length, 1);
ok('batchServings is passed through for the dinner entry', entries[0].batchServings, 4);
ok('servings is still present alongside batchServings', entries[0].servings, 1);

S.reset();

/* ---- getRecipe resolves custom recipes — what pricing.js's
   buildShoppingList now relies on so homemade recipes aren't dropped ---- */
S.update(function (st) {
  st.customRecipes.push({
    id: 'my-test-recipe', name: 'Test Recipe', meals: ['dinner'], baseServings: 2,
    timeMins: 10, ingredients: [{ itemId: 'rice-white', qty: 200, unit: 'g' }],
    steps: ['Cook it.']
  });
});
truthy('getRecipe finds a custom recipe', !!S.getRecipe('my-test-recipe'));
truthy('allRecipes includes custom recipes',
       S.allRecipes().some(function (r) { return r.id === 'my-test-recipe'; }));

/* the actual bug: a planned custom recipe must appear on the shopping list,
   priced — not silently vanish because buildShoppingList only knew about
   the seeded RECIPES registry. */
S.update(function (st) {
  st.plan['2026-08-18'] = { dinner: { recipeId: 'my-test-recipe', servings: 2, cooked: false } };
});
var customList = Pricing.buildShoppingList(
  S.entriesForDates(['2026-08-18']), {}, S.settings.enabledStores);
var riceLine = customList.lines.filter(function (l) { return l.item.id === 'rice-white'; })[0];
truthy('a custom recipe\'s ingredients appear on the shopping list', !!riceLine,
       'buildShoppingList silently dropped a custom recipe');
truthy('the custom recipe contributes to the list total', customList.total > 0);

S.reset();

print('store     ' + pass + ' passed, ' + fail + ' failed');
if (fail) failures.slice(0, 30).forEach(function (f) { print('  FAIL ' + f); });
