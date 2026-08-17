/* test-proteins.js — protein-type classification and the include/exclude
 * filter, checked directly against the real recipe library so a future
 * recipe edit that breaks classification fails here, not silently in the UI.
 */
var R = RECIPES, PR = Proteins;
var pass = 0, fail = 0, failures = [];

function ok(name, actual, expected) {
  var same = JSON.stringify(actual) === JSON.stringify(expected);
  if (same) pass++;
  else { fail++; failures.push(name + '\n    expected: ' + JSON.stringify(expected) + '\n    actual:   ' + JSON.stringify(actual)); }
}
function truthy(name, cond, detail) {
  if (cond) pass++; else { fail++; failures.push(name + (detail ? '\n    ' + detail : '')); }
}

/* ---- classification matches specific real recipes ---- */
ok('chicken-sis-rice is chicken', PR.recipeProteinTypes(R.get('chicken-sis-rice')), ['chicken']);
ok('kofte-bulgur is beef', PR.recipeProteinTypes(R.get('kofte-bulgur')), ['beef']);
ok('lamb-kofte-bulgur is lamb', PR.recipeProteinTypes(R.get('lamb-kofte-bulgur')), ['lamb']);
ok('lamb-sis-rice is lamb', PR.recipeProteinTypes(R.get('lamb-sis-rice')), ['lamb']);
ok('fish-tacos is seafood', PR.recipeProteinTypes(R.get('fish-tacos')), ['seafood']);
ok('sucuklu-yumurta (Turkish beef sausage) is beef', PR.recipeProteinTypes(R.get('sucuklu-yumurta')), ['beef']);
ok('mercimek-corbasi (lentil soup, no meat) is vegetarian',
   PR.recipeProteinTypes(R.get('mercimek-corbasi')), ['vegetarian']);

// A recipe with no meat/fish ingredient and no explicit 'vegetarian' tag must
// still classify correctly — this is exactly the gap deriving from
// ingredients (rather than trusting a hand-applied tag) closes.
var burrito = R.get('breakfast-burrito');
truthy('breakfast-burrito exists and carries no vegetarian tag',
       !!burrito && (burrito.tags || []).indexOf('vegetarian') === -1);
ok('...but is still correctly classified vegetarian from its ingredients',
   PR.recipeProteinTypes(burrito), ['vegetarian']);

/* ---- every recipe in the real library classifies to exactly one tracked
   type — if a future recipe mixes two meats this starts failing, which is
   the point: recipeAllowed's multi-type handling should be a conscious
   choice, not something that happens by accident. ---- */
R.all.forEach(function (r) {
  var types = PR.recipeProteinTypes(r);
  truthy('recipe classifies to exactly one type: ' + r.id, types.length === 1,
         'got ' + JSON.stringify(types));
});

/* ---- recipeAllowed: the actual filter the planner and picker call ---- */
var chicken = R.get('chicken-sis-rice');
truthy('allowed when its type is on', PR.recipeAllowed(chicken, { chicken: true }));
truthy('blocked when its type is off', !PR.recipeAllowed(chicken, { chicken: false }));
truthy('allowed by default when the type has no entry at all — a missing switch ' +
       'must never silently hide a recipe',
       PR.recipeAllowed(chicken, {}));
truthy('a type not in TOGGLEABLE (turkey) is still allowed with no entry',
       PR.recipeAllowed({ ingredients: [{ itemId: 'turkey-mince', qty: 1, unit: 'g' }] }, {}));
truthy('turning off chicken does not block a beef recipe',
       PR.recipeAllowed(R.get('kofte-bulgur'), { chicken: false, beef: true }));

// exclusion semantics: a recipe touching >1 tracked type needs ALL of them on.
var mixed = { ingredients: [
  { itemId: 'chicken-thigh', qty: 100, unit: 'g' },
  { itemId: 'lamb-mince', qty: 100, unit: 'g' }
] };
ok('a mixed recipe reports both types', PR.recipeProteinTypes(mixed).sort(), ['chicken', 'lamb']);
truthy('a mixed recipe is blocked if EITHER type is off',
       !PR.recipeAllowed(mixed, { chicken: true, lamb: false }));
truthy('a mixed recipe is allowed only when every type it touches is on',
       PR.recipeAllowed(mixed, { chicken: true, lamb: true }));

/* ---- category coverage in the real library — this is what Settings shows,
   and it's the reason lamb recipes were added: a toggle with zero matching
   recipes would be dead UI. ---- */
function countOf(type) {
  return R.all.filter(function (r) { return PR.recipeProteinTypes(r).indexOf(type) !== -1; }).length;
}
truthy('chicken recipes exist', countOf('chicken') >= 1);
truthy('beef recipes exist', countOf('beef') >= 1);
truthy('lamb recipes exist — the toggle has real content to control', countOf('lamb') >= 1);
truthy('seafood recipes exist', countOf('seafood') >= 1);
truthy('vegetarian recipes exist', countOf('vegetarian') >= 1);

var total = countOf('chicken') + countOf('beef') + countOf('lamb') +
            countOf('seafood') + countOf('vegetarian');
ok('every recipe falls into exactly one toggleable category, so counts sum to the library size',
   total, R.all.length);

print('proteins  ' + pass + ' passed, ' + fail + ' failed');
if (fail) failures.slice(0, 30).forEach(function (f) { print('  FAIL ' + f); });
