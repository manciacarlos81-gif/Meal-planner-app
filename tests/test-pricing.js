/* test-pricing.js — cheapest-store rules, shopping list aggregation, planner.
 *
 * The rule under test above all others: a store that does not stock an item
 * must never be recommended for it. Null is "unknown", not "free".
 */
var U = Units, C = CATALOGUE, R = RECIPES, P = Pricing;
var pass = 0, fail = 0, failures = [];

function ok(name, actual, expected, tol) {
  tol = tol === undefined ? 1e-9 : tol;
  var good = (typeof expected === 'number' && typeof actual === 'number')
    ? Math.abs(actual - expected) <= tol : actual === expected;
  if (good) pass++;
  else { fail++; failures.push(name + '\n    expected: ' + expected + '\n    actual:   ' + actual); }
}
function truthy(name, cond, detail) {
  if (cond) pass++; else { fail++; failures.push(name + (detail ? '\n    ' + detail : '')); }
}

var ALL = ['coles', 'aldi', 'bigw', 'costco'];

/* ── the null-store rule ─────────────────────────────────────────────── */
var chicken = C.get('chicken-thigh');
truthy('Big W stocks no chicken', chicken.prices.bigw === null);
ok('Big W never wins chicken', P.cheapestStore(chicken, ALL).storeId !== 'bigw', true);
ok('cheapest chicken by unit price is Costco bulk',
   P.cheapestStore(chicken, ALL).storeId, 'costco');
ok('no store enabled -> no price', P.cheapestStore(chicken, ['bigw']), null);
ok('restricting to Coles gives Coles', P.cheapestStore(chicken, ['coles']).storeId, 'coles');

// Every fresh item must be unbuyable at Big W.
var freshLeak = C.items.filter(function (it) {
  return ['meat', 'produce', 'dairy', 'bakery'].indexOf(it.aisle) !== -1 && it.prices.bigw;
});
ok('no fresh food leaks into Big W', freshLeak.length, 0);

/* ── unit price vs actual outlay: the bulk-pack trap ─────────────────── */
// Costco chicken is cheaper per kg, but only sold in a 2.5 kg pack. Buying
// 300 g for one recipe should send you to ALDI, not to a $20.50 bulk pack.
var byUnit = P.cheapestStore(chicken, ALL);
var byOutlay = P.cheapestForQuantity(chicken, 300, 'g', ALL);
ok('unit-price winner is Costco', byUnit.storeId, 'costco');
ok('but for 300g the cheapest OUTLAY is ALDI', byOutlay.storeId, 'aldi');
ok('...costing $9.50 for a 1kg pack', byOutlay.cost, 9.50, 1e-9);
truthy('Costco pack would have cost far more',
       U.packsFor(300, 'g', chicken.prices.costco, chicken).cost > byOutlay.cost);

// For a big enough quantity, bulk should win on outlay too.
var bulkQty = P.cheapestForQuantity(chicken, 5000, 'g', ALL);
ok('5kg of chicken is cheapest at Costco', bulkQty.storeId, 'costco');

// The bulk tip should exist for the small quantity and name Costco.
var tip = P.bulkTip(chicken, byOutlay, ALL);
truthy('a bulk tip is offered for the small buy', tip && tip.storeId === 'costco',
       tip ? 'got ' + tip.storeId : 'no tip produced');

/* ── user corrections override seeded prices ─────────────────────────── */
var ov = { 'chicken-thigh': { coles: { price: 4.00, size: 1, unit: 'kg',
                                       updated: '2026-08-13', source: 'user' } } };
ok('a user price wins', P.cheapestStore(chicken, ALL, ov).storeId, 'coles');
ok('...and is used for costing', P.effectiveEntry(chicken, 'coles', ov).price, 4.00);
ok('seed still applies to untouched stores',
   P.effectiveEntry(chicken, 'aldi', ov).source, 'seed');

// "Not stocked here" writes a null override — this must be honoured as
// "don't buy this here", not confused with "no correction recorded" and
// quietly ignored. This was the actual bug: effectiveEntry() used to
// truthy-check the override value, so a null override fell straight through
// to the old seed price, forever, with the UI showing no sign anything was
// wrong.
var notStocked = { 'chicken-thigh': { aldi: null } };
ok('a null override marks the item not-stocked here, not a fallback to seed',
   P.effectiveEntry(chicken, 'aldi', notStocked), null);
ok('cheapestStore correctly skips the not-stocked store',
   P.cheapestStore(chicken, ['aldi', 'coles'], notStocked).storeId, 'coles');
ok('a store with no override key at all still falls through to its seed price',
   P.effectiveEntry(chicken, 'costco', notStocked).source, 'seed');

/* ── value metrics ───────────────────────────────────────────────────── */
// $/30g protein for chicken thigh at $8.20/kg (Costco unit price):
// 19g protein per 100g -> 3000/19 = 157.9g of chicken holds 30g protein
// 157.9g * $0.0082/g = $1.29
ok('chicken $/30g protein', P.costPer30gProtein(chicken, ALL), 1.295, 0.01);
ok('an item with no protein has no protein cost',
   P.costPer30gProtein(C.get('veg-oil'), ALL), null);
truthy('rice is cheaper calories than almonds',
       P.costPer1000kcal(C.get('rice-white'), ALL) < P.costPer1000kcal(C.get('almonds'), ALL));
truthy('drumsticks beat rump steak on protein value',
       P.costPer30gProtein(C.get('chicken-drumstick'), ALL) <
       P.costPer30gProtein(C.get('beef-rump'), ALL));

/* ── recipe costing ──────────────────────────────────────────────────────
 * chicken-sis-rice: chicken-thigh 350g + rice 180g + garlic 2 cloves, serves 2.
 * A good all-rounder for the costing and shopping-list checks below. */
var bowl = R.get('chicken-sis-rice');
truthy('test recipe exists', !!bowl, 'chicken-sis-rice missing from library');
var rc = P.recipeCost(bowl, ALL);
truthy('recipe is fully priced', rc.complete, 'missing: ' + rc.missing.join(','));
truthy('recipe cost is plausible', rc.perServe > 1 && rc.perServe < 8,
       '$' + rc.perServe.toFixed(2));
ok('per-serve macros are total/servings',
   rc.macrosPerServe.protein * bowl.baseServings, rc.macros.protein, 1e-9);

/* ── shopping list ───────────────────────────────────────────────────── */
var list = P.buildShoppingList([{ recipeId: 'chicken-sis-rice', servings: 2 }], {}, ALL);
truthy('list has lines', list.lines.length > 0);
truthy('list total > 0', list.total > 0);

function lineFor(l, id) {
  return l.lines.filter(function (x) { return x.item.id === id; })[0];
}
var chickenLine = lineFor(list, 'chicken-thigh');
truthy('chicken is on the list', !!chickenLine);
ok('chicken sourced from ALDI for a small buy', chickenLine.storeId, 'aldi');
ok('one 1kg pack', chickenLine.packs, 1);

// 2 cloves of garlic must buy ONE bulb, not two.
var garlicLine = lineFor(list, 'garlic');
ok('2 cloves buys 1 bulb', garlicLine.packs, 1);

/* loose produce is bought by weight, so a small need costs a small amount.
   kofte-bulgur uses 150g of onion. */
var onionList = P.buildShoppingList([{ recipeId: 'kofte-bulgur', servings: 4 }], {}, ALL);
var onionLine = lineFor(onionList, 'onion');
truthy('onion is on the list', !!onionLine);
truthy('onion is flagged loose', onionLine.loose);
truthy('a small onion need costs cents, not a whole bag',
       onionLine.cost < 1.00, '$' + onionLine.cost.toFixed(2));
ok('loose goods leave no surplus', onionLine.surplus, 0);
truthy('every loose item in the catalogue is produce sold by weight',
       CATALOGUE.items.filter(function (i) { return i.loose; })
         .every(function (i) { return i.aisle === 'produce'; }));

/* batchServings: a dinner that spawns a leftover has to be shopped for as a
   full batch, not just the portion eaten at that meal. This is the actual
   bug — under default settings (defaultServings=1), a 4-serving recipe's
   dinner-only entry was scaling every ingredient by just 1/4, buying only a
   quarter of what the recipe as written actually needs. kofte-bulgur:
   baseServings=4, 500g beef mince. */
var withoutBatch = P.buildShoppingList(
  [{ recipeId: 'kofte-bulgur', servings: 1 }], {}, ALL);          // pre-fix shape
var withBatch = P.buildShoppingList(
  [{ recipeId: 'kofte-bulgur', servings: 1, batchServings: 4 }], {}, ALL);

var minceWithout = lineFor(withoutBatch, 'beef-mince');
var minceWith = lineFor(withBatch, 'beef-mince');
truthy('mince appears on the list both ways', !!minceWithout && !!minceWith);
ok('servings=1 with no batchServings buys a quarter (125g) — the old, buggy amount',
   minceWithout.needQty, 125, 1e-6);
ok('batchServings=4 buys the full 500g the recipe actually needs',
   minceWith.needQty, 500, 1e-6);

/* aggregation across recipes: two recipes using rice share the buy.
   chicken-sis-rice uses 180g rice, latin-chicken-bowl uses 180g. */
var twoRice = P.buildShoppingList([
  { recipeId: 'chicken-sis-rice', servings: 2 },
  { recipeId: 'latin-chicken-bowl', servings: 2 }
], {}, ALL);
var riceLine = lineFor(twoRice, 'rice-white');
truthy('rice from two recipes is one line', !!riceLine);
ok('...totalling 360g of need', riceLine.needQty, 360, 1e-6);
ok('...still just one pack', riceLine.packs, 1);

/* pantry subtraction */
var withPantry = P.buildShoppingList(
  [{ recipeId: 'chicken-sis-rice', servings: 2 }],
  { 'rice-white': 5000 },  // 5kg of rice already at home
  ALL);
ok('rice already in the pantry is not bought', lineFor(withPantry, 'rice-white'), undefined);
truthy('but chicken still is', !!lineFor(withPantry, 'chicken-thigh'));

/* partial pantry cover still buys the shortfall */
var partial = P.buildShoppingList(
  [{ recipeId: 'chicken-sis-rice', servings: 2 }],
  { 'chicken-thigh': 100 }, ALL);
ok('pantry reduces the need', lineFor(partial, 'chicken-thigh').needQty, 250, 1e-6);

/* leftovers must not be shopped for twice — entriesForDates excludes them,
   so a leftover entry simply never reaches the list. picadillo uses beef mince. */
var noDouble = P.buildShoppingList([{ recipeId: 'picadillo', servings: 1 }], {}, ALL);
var mince1 = lineFor(noDouble, 'beef-mince');
truthy('mince is on the picadillo list', !!mince1);
var doubled = P.buildShoppingList([
  { recipeId: 'picadillo', servings: 1 }, { recipeId: 'picadillo', servings: 1 }
], {}, ALL);
truthy('two servings need at least as much mince',
       lineFor(doubled, 'beef-mince').needQty >= mince1.needQty);

/* grouping */
truthy('lines are grouped by store', Object.keys(list.byStore).length > 0);
Object.keys(list.byStore).forEach(function (s) {
  var sum = list.byStore[s].lines.reduce(function (a, l) { return a + l.cost; }, 0);
  ok('store subtotal matches its lines: ' + s, list.byStore[s].subtotal, sum, 1e-9);
});
var sumStores = Object.keys(list.byStore)
  .reduce(function (a, s) { return a + list.byStore[s].subtotal; }, 0);
ok('store subtotals sum to the list total', sumStores, list.total, 1e-9);

/* savings */
var sav = P.storeSavings(list, ALL);
Object.keys(sav).forEach(function (s) {
  truthy('saving is defined for ' + s, typeof sav[s].saving === 'number');
});

/* ── price freshness ─────────────────────────────────────────────────── */
var now = new Date('2026-08-13T00:00:00').getTime();
truthy('seeded prices always need checking',
       P.needsCheck({ source: 'seed', updated: '2026-08-13' }, now));
truthy('a fresh user price does not',
       !P.needsCheck({ source: 'user', updated: '2026-08-01' }, now));
truthy('a stale user price does',
       P.needsCheck({ source: 'user', updated: '2026-01-01' }, now));
truthy('a null entry needs nothing', !P.needsCheck(null, now));

/* ── planner ─────────────────────────────────────────────────────────── */
var settings = {
  dailyKcal: 2800, dailyProtein: 140, weeklyBudget: 110,
  defaultServings: 1, autoLeftovers: true
};
var dates = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20',
             '2026-08-21', '2026-08-22', '2026-08-23'];
var filled = Planner.fillWeek(dates, R.all, settings, 42);

ok('planner fills all 7 days', Object.keys(filled.plan).length, 7);
dates.forEach(function (d) {
  truthy('day has a dinner: ' + d, !!filled.plan[d].dinner);
  truthy('day has a breakfast: ' + d, !!filled.plan[d].breakfast);
  truthy('day has a lunch: ' + d, !!filled.plan[d].lunch);
});

var profiles = Planner.profile(R.all);
var short = 0;
dates.forEach(function (d) {
  var t = Planner.dayTotals(filled.plan[d], profiles);
  if (t.kcal < settings.dailyKcal * 0.7) short++;
  if (t.protein < settings.dailyProtein * 0.6) short++;
});
truthy('most days land near the calorie and protein targets', short <= 3,
       short + ' target misses across the week');

/* determinism: same seed, same plan */
var again = Planner.fillWeek(dates, R.all, settings, 42);
ok('same seed reproduces the plan',
   JSON.stringify(again.plan), JSON.stringify(filled.plan));
var different = Planner.fillWeek(dates, R.all, settings, 99);
truthy('a different seed gives a different plan',
       JSON.stringify(different.plan) !== JSON.stringify(filled.plan));

/* ── protein-type filtering reaches the actual planner output ─────────── */
var noChickenSettings = Object.assign({}, settings,
  { enabledProteins: { chicken: false, beef: true, lamb: true, seafood: true, vegetarian: true } });
var noChickenWeek = Planner.fillWeek(dates, R.all, noChickenSettings, 55);
var anyChicken = false;
dates.forEach(function (d) {
  Object.keys(noChickenWeek.plan[d]).forEach(function (slot) {
    var r = R.get(noChickenWeek.plan[d][slot].recipeId);
    if (Proteins.recipeProteinTypes(r).indexOf('chicken') !== -1) anyChicken = true;
  });
});
truthy('with chicken switched off in settings, auto-fill never places a chicken recipe',
       !anyChicken);

var vegOnlySettings = Object.assign({}, settings, { enabledProteins:
  { chicken: false, beef: false, lamb: false, seafood: false, vegetarian: true } });
var vegWeek = Planner.fillWeek(dates, R.all, vegOnlySettings, 55);
var allVeg = true, vegMealCount = 0;
dates.forEach(function (d) {
  Object.keys(vegWeek.plan[d]).forEach(function (slot) {
    var r = R.get(vegWeek.plan[d][slot].recipeId);
    vegMealCount++;
    if (Proteins.recipeProteinTypes(r).indexOf('vegetarian') === -1) allVeg = false;
  });
});
truthy('with only vegetarian switched on, every meal in the filled week is vegetarian',
       allVeg && vegMealCount > 0, vegMealCount + ' meals checked');

/* leftovers are linked and not double-shopped */
var leftovers = 0;
dates.forEach(function (d) {
  Object.keys(filled.plan[d]).forEach(function (slot) {
    if (filled.plan[d][slot].leftoverOf) leftovers++;
  });
});
truthy('the week uses leftovers', leftovers > 0, leftovers + ' leftover meals placed');

/* batchServings is set on the dinner entry that actually spawns a leftover,
   and the leftover's own servings never exceed the batch's real spare
   capacity. This is the planner-level half of the leftover-shopping fix —
   the pricing-level half is tested above with kofte-bulgur directly. */
var withLeftover = null, withLeftoverDate = null;
dates.forEach(function (d) {
  var dinner = filled.plan[d].dinner;
  if (dinner && dinner.batchServings) { withLeftover = dinner; withLeftoverDate = d; }
});
truthy('at least one dinner in the filled week spawned a leftover with batchServings set',
       !!withLeftover, 'no dinner had batchServings — check autoLeftovers/spare logic');
if (withLeftover) {
  var lfRecipe = R.get(withLeftover.recipeId);
  ok('batchServings equals the recipe\'s baseServings (the whole batch, not a slice)',
     withLeftover.batchServings, lfRecipe.baseServings);
  var nextIdx = dates.indexOf(withLeftoverDate) + 1;
  if (nextIdx < dates.length) {
    var linkedLunch = filled.plan[dates[nextIdx]].lunch;
    truthy('the next day\'s lunch is linked as a leftover of this dinner',
           linkedLunch && linkedLunch.leftoverOf === withLeftoverDate + ':dinner');
    if (linkedLunch) {
      var spareAtDefault = lfRecipe.baseServings - settings.defaultServings;
      truthy('leftover servings never exceed the batch\'s real spare capacity',
             linkedLunch.servings <= spareAtDefault + 1e-9,
             'leftover=' + linkedLunch.servings + ' spare=' + spareAtDefault);
    }
  }
}

/* the over-crediting edge case: when defaultServings is set above half of a
   picked recipe's baseServings (a normal choice for someone deliberately
   eating more per meal), the leftover must be clamped to the real spare
   instead of claiming a second full serveDefault — otherwise the day's
   macros look "done" from food that was never actually cooked. */
var heavySettings = { dailyKcal: 3200, dailyProtein: 160, weeklyBudget: 999,
                       defaultServings: 1.5, autoLeftovers: true };
var heavyFilled = Planner.fillWeek(dates, R.all, heavySettings, 7);
var overcredited = false;
dates.forEach(function (d, i) {
  var dinner = heavyFilled.plan[d].dinner;
  if (!dinner || !dinner.batchServings) return;
  var recipe = R.get(dinner.recipeId);
  var spare = recipe.baseServings - heavySettings.defaultServings;
  var next = dates[i + 1];
  var lunch = next && heavyFilled.plan[next] && heavyFilled.plan[next].lunch;
  if (lunch && lunch.leftoverOf === d + ':dinner' && lunch.servings > spare + 1e-9) {
    overcredited = true;
  }
});
truthy('no leftover claims more servings than its batch actually has spare, ' +
       'even with defaultServings set above half of baseServings',
       !overcredited);

/* variety: no single recipe should dominate the week */
var counts = {};
dates.forEach(function (d) {
  Object.keys(filled.plan[d]).forEach(function (slot) {
    var id = filled.plan[d][slot].recipeId;
    counts[id] = (counts[id] || 0) + 1;
  });
});
var maxUse = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));
truthy('no recipe appears more than 4 times', maxUse <= 4, 'max use = ' + maxUse);

print('pricing   ' + pass + ' passed, ' + fail + ' failed');
if (fail) failures.slice(0, 30).forEach(function (f) { print('  FAIL ' + f); });
