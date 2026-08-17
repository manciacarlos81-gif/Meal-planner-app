/* Unit tests for units.js — run with:
 *   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc \
 *     js/units.js tests/test-units.js
 * or via ./tests/run.sh
 *
 * These check the conversions and cost maths by hand-calculated expected values.
 * Unit conversion is where this class of app silently goes wrong, so it gets tests.
 */
var U = Units;
var pass = 0, fail = 0, failures = [];

function ok(name, actual, expected, tol) {
  tol = tol === undefined ? 1e-9 : tol;
  var good = (typeof expected === 'number' && typeof actual === 'number')
    ? Math.abs(actual - expected) <= tol
    : actual === expected;
  if (good) { pass++; }
  else { fail++; failures.push(name + '\n    expected: ' + expected + '\n    actual:   ' + actual); }
}

function throws(name, fn) {
  try { fn(); fail++; failures.push(name + '\n    expected a throw, got none'); }
  catch (e) { pass++; }
}

/* ---- conversions ---- */
ok('g -> kg',            U.convert(1500, 'g', 'kg'), 1.5);
ok('kg -> g',            U.convert(1.5, 'kg', 'g'), 1500);
ok('ml -> L',            U.convert(2500, 'ml', 'l'), 2.5);
ok('AU tbsp is 20ml',    U.convert(1, 'tbsp', 'ml'), 20);
ok('AU tsp is 5ml',      U.convert(1, 'tsp', 'ml'), 5);
ok('AU cup is 250ml',    U.convert(1, 'cup', 'ml'), 250);
ok('3 tsp = 1 AU tbsp?', U.convert(4, 'tsp', 'tbsp'), 1); // 4 tsp per AU tbsp, not 3
ok('mass<->volume blocked without density', U.convert(100, 'g', 'ml'), null);
ok('mass->volume with density', U.convert(92, 'g', 'ml', 0.92), 100);
ok('volume->mass with density', U.convert(100, 'ml', 'g', 0.92), 92);
ok('count cannot convert to mass', U.convert(2, 'each', 'g'), null);
ok('unknown unit -> null',  U.convert(1, 'furlong', 'g'), null);
throws('toCanonical throws on unknown unit', function () { U.toCanonical(1, 'furlong'); });

/* ---- unit pricing ---- */
var chickenAldi = { price: 9.50, size: 1, unit: 'kg' };
ok('$/g for $9.50/kg', U.unitPrice(chickenAldi), 0.0095, 1e-12);
ok('null entry has no unit price', U.unitPrice(null), null);
ok('zero-size entry has no unit price', U.unitPrice({ price: 5, size: 0, unit: 'kg' }), null);
ok('bad unit has no unit price', U.unitPrice({ price: 5, size: 1, unit: 'furlong' }), null);

/* ---- the headline hand-check from the plan ----
 * 300 g chicken thigh at $9.50/kg must cost $2.85 and carry 57 g protein. */
ok('300g chicken @ $9.50/kg = $2.85', U.costOf(300, 'g', chickenAldi), 2.85, 1e-9);

var chickenItem = { per100g: { kcal: 145, protein: 19, carbs: 0, fat: 8 } };
var m = U.macrosFor(300, 'g', chickenItem);
ok('300g chicken protein = 57g', m.protein, 57, 1e-9);
ok('300g chicken kcal = 435',    m.kcal, 435, 1e-9);

/* cost via a bulk pack should be cheaper per gram */
var chickenCostco = { price: 20.50, size: 2.5, unit: 'kg' };
ok('costco $/g cheaper', U.unitPrice(chickenCostco) < U.unitPrice(chickenAldi), true);
ok('300g from costco pack pro-rata', U.costOf(300, 'g', chickenCostco), 2.46, 1e-9);

/* ---- pack rounding: you buy whole packets ---- */
var rice = { price: 4.00, size: 1, unit: 'kg' };
var p = U.packsFor(1400, 'g', rice);
ok('1.4kg rice needs 2 x 1kg packs', p.packs, 2);
ok('...costing $8.00', p.cost, 8.00, 1e-9);
ok('...leaving 0.6kg surplus', p.surplus, 0.6, 1e-9);

var exact = U.packsFor(1000, 'g', rice);
ok('exactly 1kg needs 1 pack (no float overshoot)', exact.packs, 1);
ok('...no surplus', exact.surplus, 0, 1e-9);

var tiny = U.packsFor(50, 'g', rice);
ok('tiny amount still needs 1 whole pack', tiny.packs, 1);

/* the float-dust case: 0.1+0.2 style accumulation must not force an extra pack */
var dust = U.packsFor(1000.0000000001, 'g', rice);
ok('float dust does not trigger an extra pack', dust.packs, 1);

/* ---- sub-units: the bug that made toast cost two loaves ----
 * "2 slices" and "2 loaves" are both counts but are not the same amount of
 * bread. Without item context these silently converted 1:1. */
var bread = {
  per100g: { kcal: 240, protein: 10, carbs: 40, fat: 3 },
  gramsEach: 700, subUnits: { slice: 40 }
};
var breadEntry = { price: 3.50, size: 1, unit: 'each' }; // $3.50 a loaf

ok('2 slices = 80g',            U.toGrams(2, 'slice', bread), 80);
ok('2 slices is a fraction of a loaf', U.convertItem(2, 'slice', 'each', bread), 80 / 700, 1e-12);
ok('2 slices of toast cost ~40c', U.costOf(2, 'slice', breadEntry, bread), 0.40, 0.005);
ok('2 slices = 192 kcal, not 3360', U.macrosFor(2, 'slice', bread).kcal, 192, 1e-9);
ok('buying 2 slices still buys 1 loaf', U.packsFor(2, 'slice', breadEntry, bread).packs, 1);
ok('a whole loaf is NOT 1 slice',  U.macrosFor(1, 'each', bread).kcal, 1680, 1e-9);

// Without a subUnits entry, a sub-unit must fail loudly rather than assume 1:1.
var plainLoaf = { per100g: { kcal: 240 }, gramsEach: 700 };
ok('slice with no subUnits -> null', U.convertItem(2, 'slice', 'each', plainLoaf), null);
ok('slice with no subUnits -> no macros', U.macrosFor(2, 'slice', plainLoaf).kcal, 0);
ok('slice unit is sub-unit-only', U.isSubUnitOnly('slice'), true);
ok('g is not sub-unit-only',      U.isSubUnitOnly('g'), false);

var garlic = { per100g: { kcal: 149, protein: 6.4, carbs: 33, fat: 0.5 },
               gramsEach: 50, subUnits: { clove: 5 } };
var garlicEntry = { price: 0.90, size: 1, unit: 'each' };
ok('3 cloves = 15g',              U.toGrams(3, 'clove', garlic), 15);
ok('3 cloves is 0.3 of a bulb',   U.convertItem(3, 'clove', 'each', garlic), 0.3, 1e-12);
ok('3 cloves still buys 1 bulb',  U.packsFor(3, 'clove', garlicEntry, garlic).packs, 1);
ok('3 cloves cost 27c not 2.70',  U.costOf(3, 'clove', garlicEntry, garlic), 0.27, 1e-9);

/* grams drawn from an item sold by the tin */
var cornTin = { per100g: { kcal: 86, protein: 3, carbs: 19, fat: 1 }, gramsEach: 300 };
var cornEntry = { price: 1.00, size: 1, unit: 'each' };
ok('80g of a 300g tin', U.convertItem(80, 'g', 'each', cornTin), 80 / 300, 1e-12);
ok('80g still buys one whole tin', U.packsFor(80, 'g', cornEntry, cornTin).packs, 1);

/* an item sold by weight, measured by piece */
var banana = { per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, gramsEach: 118 };
var bananaEntry = { price: 3.90, size: 1, unit: 'kg' };
ok('1 banana -> kg',        U.convertItem(1, 'each', 'kg', banana), 0.118, 1e-12);
ok('1 banana costs ~46c',   U.costOf(1, 'each', bananaEntry, banana), 0.4602, 1e-6);
ok('1 banana = 105 kcal',   U.macrosFor(1, 'each', banana).kcal, 105.02, 0.01);

/* ---- loose goods: weighed at the scales, not sold in packets ----
 * Rounding 125 g of onion up to a whole 1 kg bag overstated the shop badly. */
var onion = { per100g: { kcal: 40, protein: 1.1, carbs: 9, fat: 0.1 },
              gramsEach: 150, loose: true };
var onionEntry = { price: 2.90, size: 1, unit: 'kg' };
var loosePack = U.packsFor(125, 'g', onionEntry, onion);
ok('loose goods are not rounded up to a pack', loosePack.packs, 0.125, 1e-12);
ok('...and cost pro-rata',    loosePack.cost, 0.3625, 1e-9);
ok('...with no surplus',      loosePack.surplus, 0);
ok('...flagged as loose',     loosePack.loose, true);

// The same item without the flag must still round up to a whole bag.
var packed = { per100g: onion.per100g, gramsEach: 150 };
ok('packaged goods still round up', U.packsFor(125, 'g', onionEntry, packed).packs, 1);
ok('...and cost the whole pack',    U.packsFor(125, 'g', onionEntry, packed).cost, 2.90, 1e-9);

/* ---- prettyNeed: sub-unit display for fractional counts ---- */
ok('half a garlic bulb reads in cloves', U.prettyNeed(0.55, 'each', garlic), '5.5 cloves');
ok('a whole bulb stays a bulb',          U.prettyNeed(1, 'each', garlic), '1');
ok('prettyNeed falls back to prettyQty', U.prettyNeed(300, 'g', chickenItem), '300 g');

/* ---- macros by count ---- */
var egg = { per100g: { kcal: 143, protein: 13, carbs: 1, fat: 10 }, gramsEach: 50 };
var em = U.macrosFor(2, 'each', egg);
ok('2 eggs = 100g',        em.kcal, 143, 1e-9);
ok('2 eggs protein = 13g', em.protein, 13, 1e-9);

var noWeight = { per100g: { kcal: 100, protein: 5 } };
ok('count with no gramsEach yields zero, not a guess', U.macrosFor(2, 'each', noWeight).kcal, 0);

/* ---- macro helpers ---- */
var sum = U.addMacros({ kcal: 100, protein: 10, carbs: 5, fat: 2 },
                      { kcal: 50,  protein: 5,  carbs: 3, fat: 1 });
ok('addMacros kcal', sum.kcal, 150);
ok('addMacros protein', sum.protein, 15);
var scaled = U.scaleMacros({ kcal: 100, protein: 10, carbs: 5, fat: 2 }, 0.5);
ok('scaleMacros halves', scaled.kcal, 50);

/* ---- display ---- */
ok('money formats',      U.money(2.5), '$2.50');
ok('money handles null', U.money(null), '—');
ok('1500g pretty-prints as kg', U.prettyQty(1500, 'g'), '1.5 kg');
ok('200g stays g',              U.prettyQty(200, 'g'), '200 g');
ok('2500ml pretty-prints as L', U.prettyQty(2500, 'ml'), '2.5 L');
ok('bare each has no unit',     U.prettyQty(3, 'each'), '3');
ok('cloves pluralise',          U.prettyQty(2, 'clove'), '2 cloves');
ok('one clove stays singular',  U.prettyQty(1, 'clove'), '1 clove');

/* ---- report ---- */
print('units.js  ' + pass + ' passed, ' + fail + ' failed');
if (fail) { failures.forEach(function (f) { print('  FAIL ' + f); }); }
