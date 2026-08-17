/* test-data.js — integrity checks on the catalogue and recipe library.
 *
 * These exist because both data files are hand-written and reference each other
 * by string id. A typo'd itemId would otherwise cost $0.00 and 0 g protein and
 * be completely invisible in the UI. Here it fails loudly instead.
 */
var U = Units, C = CATALOGUE, R = RECIPES, P = Pricing;
var pass = 0, fail = 0, failures = [];

function ok(name, cond, detail) {
  if (cond) pass++;
  else { fail++; failures.push(name + (detail ? '\n    ' + detail : '')); }
}

/* ---- catalogue shape ---- */
var seenIds = {};
C.items.forEach(function (it) {
  ok('unique id: ' + it.id, !seenIds[it.id], 'duplicate item id');
  seenIds[it.id] = true;

  ok('known baseUnit: ' + it.id, U.isKnownUnit(it.baseUnit), 'baseUnit=' + it.baseUnit);
  ok('has aisle: ' + it.id, !!C.aisle(it.aisle) && C.aisle(it.aisle).order < 99,
     'unknown aisle "' + it.aisle + '"');
  ok('has macros: ' + it.id, it.per100g && typeof it.per100g.kcal === 'number');

  // At least one store must stock it, or it can never be bought.
  var stocked = ['coles', 'aldi', 'bigw', 'costco'].filter(function (s) { return it.prices[s]; });
  ok('stocked somewhere: ' + it.id, stocked.length > 0, 'no store stocks this item');

  stocked.forEach(function (s) {
    var e = it.prices[s];
    ok('price > 0: ' + it.id + '/' + s, e.price > 0, 'price=' + e.price);
    ok('size > 0: ' + it.id + '/' + s, e.size > 0, 'size=' + e.size);
    ok('known price unit: ' + it.id + '/' + s, U.isKnownUnit(e.unit), 'unit=' + e.unit);
    ok('price unit matches dimension: ' + it.id + '/' + s,
       U.dimensionOf(e.unit) === U.dimensionOf(it.baseUnit),
       e.unit + ' is not the same dimension as baseUnit ' + it.baseUnit);
    ok('unit price computable: ' + it.id + '/' + s, U.unitPrice(e) !== null);
  });

  // A count-unit item needs gramsEach or its macros silently read as zero.
  if (U.dimensionOf(it.baseUnit) === U.COUNT && it.per100g.kcal > 0) {
    ok('count item has gramsEach: ' + it.id, !!it.gramsEach,
       'macros would compute as zero without it');
  }
  // A volume item needs a density to convert to grams for macros.
  if (U.dimensionOf(it.baseUnit) === U.VOLUME && it.per100g.kcal > 0) {
    ok('volume item has gPerMl: ' + it.id, !!it.gPerMl,
       'macros would compute as zero without it');
  }
});

/* ---- Big W must not stock fresh food ---- */
C.items.forEach(function (it) {
  if (['meat', 'produce', 'dairy', 'bakery'].indexOf(it.aisle) !== -1) {
    ok('Big W does not stock fresh: ' + it.id, !it.prices.bigw,
       'Big W has no fresh food section');
  }
});

/* ---- recipe integrity ---- */
var seenRecipes = {};
R.all.forEach(function (r) {
  ok('unique recipe id: ' + r.id, !seenRecipes[r.id], 'duplicate recipe id');
  seenRecipes[r.id] = true;

  ok('recipe has servings: ' + r.id, r.baseServings > 0);
  ok('recipe has steps: ' + r.id, r.steps && r.steps.length > 0);
  ok('recipe has meals: ' + r.id, r.meals && r.meals.length > 0);
  ok('recipe has ingredients: ' + r.id, r.ingredients.length > 0);

  r.meals.forEach(function (m) {
    ok('valid meal slot: ' + r.id + '/' + m,
       ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(m) !== -1, m);
  });

  r.ingredients.forEach(function (ing) {
    var item = C.get(ing.itemId);
    ok('ingredient exists: ' + r.id + ' -> ' + ing.itemId, !!item, 'no such item in catalogue');
    ok('ingredient qty > 0: ' + r.id + '/' + ing.itemId, ing.qty > 0);
    ok('ingredient unit known: ' + r.id + '/' + ing.itemId, U.isKnownUnit(ing.unit), ing.unit);

    if (item) {
      // The unit used in the recipe must actually be convertible to the unit
      // the item is sold in, otherwise it can never be costed. This is
      // item-aware: it accounts for gramsEach, gPerMl and subUnits.
      var conv = U.convertItem(ing.qty, ing.unit, item.baseUnit, item);
      ok('ingredient convertible to sale unit: ' + r.id + '/' + ing.itemId,
         conv !== null,
         ing.unit + ' -> ' + item.baseUnit + '; item needs gramsEach, gPerMl or a ' +
         'subUnits entry for "' + ing.unit + '"');
    }
  });
});

/* ---- every recipe must be fully costable and carry real macros ---- */
R.all.forEach(function (r) {
  var c = P.recipeCost(r);
  ok('recipe fully priced: ' + r.id, c.complete, 'unpriced: ' + c.missing.join(', '));
  ok('recipe cost > 0: ' + r.id, c.total > 0);
  ok('recipe has calories: ' + r.id, c.macros.kcal > 0);
  ok('recipe has protein: ' + r.id, c.macros.protein > 0);

  // Sanity band: a home-cooked serve costing over $25 or under 20c is a data bug.
  ok('plausible cost/serve: ' + r.id, c.perServe > 0.2 && c.perServe < 25,
     '$' + c.perServe.toFixed(2) + ' per serve');
  // Same for calories per serve.
  ok('plausible kcal/serve: ' + r.id,
     c.macrosPerServe.kcal > 100 && c.macrosPerServe.kcal < 2000,
     Math.round(c.macrosPerServe.kcal) + ' kcal per serve');
});

/* ---- coverage: enough recipes per meal slot for the auto-planner to work ---- */
['breakfast', 'lunch', 'dinner', 'snack'].forEach(function (m) {
  ok('>=4 recipes for ' + m, R.forMeal(m).length >= 4, R.forMeal(m).length + ' found');
});

print('data      ' + pass + ' passed, ' + fail + ' failed');
if (fail) {
  var shown = failures.slice(0, 40);
  shown.forEach(function (f) { print('  FAIL ' + f); });
  if (failures.length > shown.length) print('  ... and ' + (failures.length - shown.length) + ' more');
}
