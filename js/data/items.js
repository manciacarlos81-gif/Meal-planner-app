/* items.js — the grocery catalogue.
 *
 * ── READ THIS BEFORE TRUSTING A DOLLAR FIGURE ──────────────────────────────
 * Every price below is a SEEDED ESTIMATE. Coles, Aldi, Big W and Costco do not
 * publish price APIs, so these came from general knowledge of Australian
 * supermarket pricing and they are already going stale. They exist so the
 * budget maths works on day one — they are not real prices.
 *
 * Correct them as you shop. Tap any price in the Shop view to fix it; that
 * stamps it as yours (source 'user') and the app stops flagging it. Until then
 * the UI shows seeded prices muted with a "?" and lists them in Settings →
 * Price check. After a few shops this catalogue becomes accurate to YOUR stores.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Store keys: c = Coles, a = Aldi, w = Big W, x = Costco.
 * A store key that is ABSENT means that store does not stock the item. That is
 * modelled deliberately: Big W has no fresh meat, produce or dairy, and it must
 * never win a "cheapest store" comparison for a chicken thigh.
 *
 * Price entry format: [price, packSize] or [price, packSize, unit].
 * `unit` defaults to the item's baseUnit. So ['5.50', 12] on an 'each' item
 * means $5.50 for a dozen.
 *
 * Macros are [kcal, protein, carbs, fat] per 100 g, raw/as-sold.
 */
(function (global) {
  'use strict';

  var SEED_DATE = '2026-08-13';

  var STORE_KEY = { c: 'coles', a: 'aldi', w: 'bigw', x: 'costco' };

  // Stores whose prices have been checked against the real retailer site.
  // See the VERIFIED block near the bottom of this file.
  var VERIFIED_STORES = ['coles'];

  var STORES = [
    { id: 'coles',  name: 'Coles',  short: 'Coles',  search: 'https://www.coles.com.au/search?q=' },
    { id: 'aldi',   name: 'ALDI',   short: 'ALDI',   search: 'https://www.aldi.com.au/results?q=' },
    { id: 'bigw',   name: 'Big W',  short: 'Big W',  search: 'https://www.bigw.com.au/search?text=' },
    { id: 'costco', name: 'Costco', short: 'Costco', search: 'https://www.costco.com.au/search?text=',
      membership: true }
  ];

  var AISLES = [
    { id: 'produce',   name: 'Fruit & Veg',     order: 1 },
    { id: 'meat',      name: 'Meat & Seafood',  order: 2 },
    { id: 'dairy',     name: 'Dairy & Eggs',    order: 3 },
    { id: 'bakery',    name: 'Bakery',          order: 4 },
    { id: 'pantry',    name: 'Pantry',          order: 5 },
    { id: 'frozen',    name: 'Frozen',          order: 6 },
    { id: 'health',    name: 'Health & Protein', order: 7 },
    { id: 'household', name: 'Household',       order: 8 }
  ];

  var items = [];

  /**
   * @param extra optional { gramsEach, gPerMl, subUnits, loose, tags, note }
   *   gramsEach — weight of one unit, required for macros on 'each' items
   *   gPerMl    — density, required to bridge mass and volume (oils, milk)
   *   subUnits  — item-specific portions in grams, e.g. { slice: 40 }
   *   loose     — sold by weight at the scales, not in fixed packets, so you
   *               buy exactly what you need and there is no leftover surplus
   */
  function I(id, name, aisle, baseUnit, macros, prices, extra) {
    extra = extra || {};
    var out = {
      id: id,
      name: name,
      aisle: aisle,
      baseUnit: baseUnit,
      per100g: { kcal: macros[0], protein: macros[1], carbs: macros[2], fat: macros[3] },
      prices: { coles: null, aldi: null, bigw: null, costco: null }
    };
    if (extra.gramsEach) out.gramsEach = extra.gramsEach;
    if (extra.gPerMl) out.gPerMl = extra.gPerMl;
    if (extra.subUnits) out.subUnits = extra.subUnits;
    if (extra.loose) out.loose = true;
    if (extra.tags) out.tags = extra.tags;
    if (extra.note) out.note = extra.note;

    Object.keys(prices).forEach(function (k) {
      var p = prices[k];
      if (!p) return;
      out.prices[STORE_KEY[k]] = {
        price: p[0],
        size: p[1],
        unit: p[2] || baseUnit,
        updated: SEED_DATE,
        source: 'seed'
      };
    });
    items.push(out);
    return out;
  }

  /* ══════════════════════════ MEAT & SEAFOOD ══════════════════════════
   * The protein engine. Note Big W is absent from every one of these. */

  I('chicken-thigh', 'Chicken thigh fillets', 'meat', 'kg', [145, 19, 0, 8],
    { c: [11.00, 1], a: [9.50, 1], x: [20.50, 2.5] }, { tags: ['protein-cheap'] });
  I('chicken-breast', 'Chicken breast fillets', 'meat', 'kg', [110, 23, 0, 2],
    { c: [12.50, 1], a: [11.00, 1], x: [26.00, 2.5] }, { tags: ['protein-cheap', 'lean'] });
  I('chicken-drumstick', 'Chicken drumsticks', 'meat', 'kg', [160, 18, 0, 10],
    { c: [5.50, 1], a: [4.80, 1] }, { tags: ['protein-cheap', 'budget'] });
  I('chicken-whole', 'Whole chicken', 'meat', 'kg', [160, 19, 0, 9],
    { c: [6.50, 1.6], a: [5.90, 1.6], x: [12.00, 2.2] }, { tags: ['budget'] });
  I('beef-mince', 'Beef mince (regular)', 'meat', 'kg', [250, 18, 0, 20],
    { c: [12.00, 1], a: [10.50, 1], x: [24.00, 2.5] }, { tags: ['protein-cheap'] });
  I('beef-mince-lean', 'Beef mince (lean 5%)', 'meat', 'kg', [137, 21, 0, 5],
    { c: [16.00, 1], a: [14.50, 1] }, { tags: ['lean'] });
  I('beef-chuck', 'Beef chuck steak (casserole)', 'meat', 'kg', [200, 20, 0, 13],
    { c: [14.00, 1], a: [12.50, 1] }, { tags: ['slow-cook'] });
  I('beef-rump', 'Beef rump steak', 'meat', 'kg', [190, 22, 0, 11],
    { c: [24.00, 1], a: [21.00, 1] });
  I('lamb-mince', 'Lamb mince', 'meat', 'kg', [230, 19, 0, 17],
    { c: [16.00, 1], a: [14.00, 1] });
  I('turkey-mince', 'Turkey mince', 'meat', 'kg', [150, 22, 0, 7],
    { c: [15.00, 1] }, { tags: ['lean'] });
  I('tuna-tin', 'Tuna in springwater (tin)', 'meat', 'each', [116, 26, 0, 1],
    { c: [1.60, 1], a: [1.25, 1], x: [14.00, 12] },
    { gramsEach: 95, tags: ['protein-cheap', 'shelf-stable'] });
  I('salmon-tin', 'Pink salmon (tin)', 'meat', 'each', [140, 21, 0, 6],
    { c: [4.00, 1], a: [3.30, 1] }, { gramsEach: 210, tags: ['shelf-stable'] });
  I('salmon-fillet', 'Salmon fillets', 'meat', 'kg', [208, 20, 0, 13],
    { c: [34.00, 1], a: [29.00, 1], x: [26.00, 1.2] });
  I('white-fish', 'White fish fillets (basa, frozen)', 'meat', 'kg', [90, 18, 0, 2],
    { c: [13.00, 1], a: [11.00, 1] }, { tags: ['lean', 'freezer'] });
  I('prawns-frozen', 'Raw prawns (frozen)', 'meat', 'kg', [85, 18, 1, 1],
    { c: [26.00, 1], a: [22.00, 1] });

  /* ══════════════════════════ DAIRY & EGGS ══════════════════════════ */

  I('eggs', 'Eggs (free range)', 'dairy', 'each', [143, 13, 1, 10],
    { c: [5.50, 12], a: [4.80, 12], x: [9.50, 24] },
    { gramsEach: 50, tags: ['protein-cheap'] });
  I('milk', 'Full cream milk', 'dairy', 'l', [64, 3.3, 4.8, 3.4],
    { c: [3.10, 2], a: [3.00, 2], x: [5.90, 4] },
    { gPerMl: 1.03, tags: ['protein-cheap', 'bulk-kcal'] });
  I('milk-powder', 'Skim milk powder', 'dairy', 'kg', [360, 36, 52, 1],
    { c: [12.00, 1], a: [9.50, 1] }, { tags: ['protein-cheap', 'shelf-stable'] });
  I('yoghurt-greek', 'Greek yoghurt (natural)', 'dairy', 'kg', [97, 9, 4, 5],
    { c: [7.00, 1], a: [5.50, 1], x: [9.00, 2] }, { tags: ['protein-cheap'] });
  I('cottage-cheese', 'Cottage cheese', 'dairy', 'kg', [98, 11, 3, 4],
    { c: [6.00, 0.5], a: [4.80, 0.5] }, { tags: ['lean', 'protein-cheap'] });
  I('cheese-tasty', 'Tasty cheese block', 'dairy', 'kg', [400, 25, 1, 33],
    { c: [7.00, 0.5], a: [5.90, 0.5], x: [16.00, 1.5] }, { tags: ['bulk-kcal'] });
  I('butter', 'Butter', 'dairy', 'kg', [717, 1, 0, 81],
    { c: [6.00, 0.25], a: [5.20, 0.25] }, { tags: ['bulk-kcal'] });
  I('cream', 'Thickened cream', 'dairy', 'l', [345, 2, 3, 35],
    { c: [3.20, 0.3], a: [2.80, 0.3] }, { gPerMl: 1.0, tags: ['bulk-kcal'] });

  /* ══════════════════════════ FRUIT & VEG ══════════════════════════ */

  I('onion', 'Brown onions', 'produce', 'kg', [40, 1.1, 9, 0.1],
    { c: [3.50, 1], a: [2.90, 1] }, { gramsEach: 150, loose: true });
  I('garlic', 'Garlic', 'produce', 'each', [149, 6.4, 33, 0.5],
    { c: [1.20, 1], a: [0.90, 1] },
    { gramsEach: 50, subUnits: { clove: 5 }, note: 'sold per bulb; a bulb is ~10 cloves' });
  I('celery', 'Celery', 'produce', 'kg', [16, 0.7, 3, 0.2],
    { c: [4.00, 1], a: [3.20, 1] }, { tags: ['budget'], loose: true });
  I('ginger', 'Ginger root', 'produce', 'kg', [80, 1.8, 18, 0.8],
    { c: [16.00, 1], a: [14.00, 1] }, { loose: true });
  I('potato', 'Potatoes (washed)', 'produce', 'kg', [77, 2, 17, 0.1],
    { c: [3.50, 1], a: [2.50, 1] }, { gramsEach: 180, tags: ['bulk-carb', 'budget'], loose: true });
  I('sweet-potato', 'Sweet potato', 'produce', 'kg', [86, 1.6, 20, 0.1],
    { c: [4.50, 1], a: [3.90, 1] }, { tags: ['bulk-carb'], loose: true });
  I('carrot', 'Carrots', 'produce', 'kg', [41, 0.9, 10, 0.2],
    { c: [2.00, 1], a: [1.60, 1] }, { gramsEach: 90, tags: ['budget'], loose: true });
  I('broccoli', 'Broccoli', 'produce', 'kg', [34, 2.8, 7, 0.4],
    { c: [6.00, 1], a: [4.90, 1] }, { gramsEach: 350, loose: true });
  I('capsicum', 'Capsicum (red)', 'produce', 'each', [31, 1, 6, 0.3],
    { c: [2.00, 1], a: [1.60, 1] }, { gramsEach: 160 });
  I('zucchini', 'Zucchini', 'produce', 'kg', [17, 1.2, 3, 0.3],
    { c: [6.00, 1], a: [4.90, 1] }, { gramsEach: 200, loose: true });
  I('mushroom', 'Button mushrooms', 'produce', 'kg', [22, 3.1, 3, 0.3],
    { c: [10.00, 1], a: [8.50, 1] }, { loose: true });
  I('tomato', 'Tomatoes', 'produce', 'kg', [18, 0.9, 4, 0.2],
    { c: [6.00, 1], a: [4.90, 1] }, { gramsEach: 120, loose: true });
  I('cucumber', 'Cucumber', 'produce', 'each', [15, 0.7, 3.6, 0.1],
    { c: [2.00, 1], a: [1.50, 1] }, { gramsEach: 300 });
  I('spinach-baby', 'Baby spinach', 'produce', 'kg', [23, 2.9, 3.6, 0.4],
    { c: [12.50, 0.12], a: [10.00, 0.12] });
  I('cabbage', 'Cabbage', 'produce', 'kg', [25, 1.3, 6, 0.1],
    { c: [3.50, 1], a: [2.80, 1] }, { tags: ['budget'], loose: true });
  I('lettuce', 'Iceberg lettuce', 'produce', 'each', [14, 0.9, 3, 0.1],
    { c: [3.50, 1], a: [2.90, 1] }, { gramsEach: 500 });
  I('banana', 'Bananas', 'produce', 'kg', [89, 1.1, 23, 0.3],
    { c: [4.50, 1], a: [3.90, 1] }, { gramsEach: 118, tags: ['bulk-carb'], loose: true });
  I('apple', 'Apples', 'produce', 'kg', [52, 0.3, 14, 0.2],
    { c: [4.90, 1], a: [3.90, 1] }, { gramsEach: 150, loose: true });
  I('avocado', 'Avocado', 'produce', 'each', [160, 2, 9, 15],
    { c: [2.50, 1], a: [1.90, 1] }, { gramsEach: 200, tags: ['bulk-kcal'] });
  I('lemon', 'Lemons', 'produce', 'each', [29, 1.1, 9, 0.3],
    { c: [1.20, 1], a: [0.90, 1] }, { gramsEach: 100 });
  I('lime', 'Limes', 'produce', 'each', [30, 0.7, 11, 0.2],
    { c: [1.00, 1], a: [0.80, 1] }, { gramsEach: 70 });
  I('chilli-fresh', 'Fresh chilli', 'produce', 'kg', [40, 1.9, 9, 0.4],
    { c: [16.00, 1], a: [14.00, 1] }, { gramsEach: 15, loose: true });
  I('coriander', 'Coriander bunch', 'produce', 'each', [23, 2.1, 4, 0.5],
    { c: [3.00, 1], a: [2.50, 1] }, { gramsEach: 60 });
  I('spring-onion', 'Spring onions', 'produce', 'each', [32, 1.8, 7, 0.2],
    { c: [3.00, 1], a: [2.40, 1] }, { gramsEach: 100 });

  /* ══════════════════════════ PANTRY: CARBS ══════════════════════════
   * The calorie engine for a weight-gain plan, and the cheapest part of it. */

  I('rice-white', 'White long grain rice', 'pantry', 'kg', [355, 7, 78, 1],
    { c: [3.00, 1], a: [2.40, 1], w: [4.00, 1], x: [18.00, 10] },
    { tags: ['bulk-carb', 'budget', 'shelf-stable'] });
  I('rice-brown', 'Brown rice', 'pantry', 'kg', [360, 8, 76, 3],
    { c: [4.00, 1], a: [3.20, 1] }, { tags: ['bulk-carb'] });
  I('pasta', 'Pasta (penne/spiral)', 'pantry', 'kg', [355, 12, 71, 1.5],
    { c: [2.00, 0.5], a: [1.20, 0.5], w: [2.50, 0.5], x: [9.00, 5] },
    { tags: ['bulk-carb', 'budget', 'shelf-stable'] });
  I('spaghetti', 'Spaghetti', 'pantry', 'kg', [355, 12, 71, 1.5],
    { c: [2.00, 0.5], a: [1.20, 0.5] }, { tags: ['bulk-carb', 'budget'] });
  I('oats', 'Rolled oats', 'pantry', 'kg', [380, 13, 60, 8],
    { c: [3.50, 1], a: [2.30, 1], w: [4.50, 1], x: [12.00, 3] },
    { tags: ['bulk-carb', 'budget', 'protein-cheap'] });
  I('noodles-egg', 'Egg noodles (dried)', 'pantry', 'kg', [360, 12, 71, 2],
    { c: [3.00, 0.375], a: [2.40, 0.375] }, { tags: ['bulk-carb'] });
  I('couscous', 'Couscous', 'pantry', 'kg', [376, 13, 77, 0.6],
    { c: [3.50, 0.5], a: [2.80, 0.5] }, { tags: ['bulk-carb'] });
  I('flour-plain', 'Plain flour', 'pantry', 'kg', [364, 10, 76, 1],
    { c: [2.00, 1], a: [1.50, 1] }, { tags: ['budget'] });
  I('bread-wholemeal', 'Wholemeal bread loaf', 'bakery', 'each', [240, 10, 40, 3],
    { c: [3.50, 1], a: [2.20, 1] },
    { gramsEach: 700, subUnits: { slice: 40 }, tags: ['bulk-carb'],
      note: 'sold per loaf; ~17 slices at 40 g each' });
  I('wraps', 'Wholemeal wraps', 'bakery', 'each', [280, 9, 48, 5],
    { c: [4.00, 8], a: [2.90, 8] }, { gramsEach: 60, tags: ['bulk-carb'] });
  I('tortilla-corn', 'Corn tortillas', 'bakery', 'each', [220, 6, 45, 3],
    { c: [4.50, 10], a: [3.50, 10] }, { gramsEach: 30 });

  /* ══════════════════════════ PANTRY: TINS & LEGUMES ══════════════════════════ */

  I('tomatoes-tin', 'Diced tomatoes (tin)', 'pantry', 'each', [20, 1, 3.5, 0.2],
    { c: [1.30, 1], a: [0.85, 1], x: [9.00, 12] },
    { gramsEach: 400, tags: ['budget', 'shelf-stable'] });
  I('tomato-paste', 'Tomato paste', 'pantry', 'kg', [82, 4.3, 19, 0.5],
    { c: [2.00, 0.14], a: [1.40, 0.14] });
  I('chickpeas-tin', 'Chickpeas (tin)', 'pantry', 'each', [120, 7, 18, 2],
    { c: [1.20, 1], a: [0.85, 1] },
    { gramsEach: 240, tags: ['protein-cheap', 'budget', 'shelf-stable'] });
  I('kidney-beans-tin', 'Red kidney beans (tin)', 'pantry', 'each', [120, 8, 19, 0.5],
    { c: [1.30, 1], a: [0.90, 1] }, { gramsEach: 240, tags: ['protein-cheap', 'budget'] });
  I('black-beans-tin', 'Black beans (tin)', 'pantry', 'each', [130, 8, 21, 0.5],
    { c: [1.60, 1], a: [1.10, 1] }, { gramsEach: 240, tags: ['protein-cheap'] });
  I('lentils-dry', 'Dried red lentils', 'pantry', 'kg', [350, 25, 60, 1],
    { c: [4.50, 0.5], a: [3.20, 0.5] },
    { tags: ['protein-cheap', 'budget', 'shelf-stable'] });
  I('lentils-tin', 'Brown lentils (tin)', 'pantry', 'each', [116, 9, 20, 0.4],
    { c: [1.40, 1], a: [1.00, 1] }, { gramsEach: 240, tags: ['protein-cheap'] });
  I('corn-tin', 'Corn kernels (tin)', 'pantry', 'each', [86, 3, 19, 1],
    { c: [1.50, 1], a: [1.00, 1] }, { gramsEach: 300 });
  I('coconut-milk', 'Coconut milk (tin)', 'pantry', 'each', [197, 2, 3, 20],
    { c: [1.80, 1], a: [1.20, 1] }, { gramsEach: 400, tags: ['bulk-kcal'] });
  I('baked-beans', 'Baked beans', 'pantry', 'each', [94, 5, 15, 0.5],
    { c: [1.60, 1], a: [1.10, 1] }, { gramsEach: 420, tags: ['budget'] });

  /* ══════════════════════════ PANTRY: FATS, SAUCES, SPICES ══════════════════════════ */

  I('olive-oil', 'Olive oil', 'pantry', 'l', [884, 0, 0, 100],
    { c: [11.00, 1], a: [8.50, 1], w: [12.00, 1], x: [22.00, 3] },
    { gPerMl: 0.92, tags: ['bulk-kcal', 'shelf-stable'] });
  I('veg-oil', 'Vegetable oil', 'pantry', 'l', [884, 0, 0, 100],
    { c: [5.00, 1], a: [3.80, 1] }, { gPerMl: 0.92, tags: ['bulk-kcal', 'budget'] });
  I('peanut-butter', 'Peanut butter (smooth)', 'pantry', 'kg', [600, 25, 12, 50],
    { c: [5.00, 0.5], a: [3.50, 0.5], w: [5.50, 0.5], x: [11.00, 1.5] },
    { tags: ['bulk-kcal', 'protein-cheap', 'shelf-stable'] });
  I('honey', 'Honey', 'pantry', 'kg', [304, 0.3, 82, 0],
    { c: [9.00, 0.5], a: [6.50, 0.5], w: [9.50, 0.5] }, { tags: ['bulk-kcal'] });
  I('soy-sauce', 'Soy sauce', 'pantry', 'l', [53, 8, 5, 0],
    { c: [3.50, 0.5], a: [2.50, 0.5] }, { gPerMl: 1.1 });
  I('sweet-chilli', 'Sweet chilli sauce', 'pantry', 'l', [200, 0.5, 48, 0.2],
    { c: [3.00, 0.5], a: [2.20, 0.5] }, { gPerMl: 1.2 });
  I('sriracha', 'Sriracha / hot sauce', 'pantry', 'l', [93, 2, 19, 1],
    { c: [4.50, 0.5], a: [3.20, 0.5] }, { gPerMl: 1.1 });
  I('bbq-sauce', 'BBQ sauce', 'pantry', 'l', [170, 1, 40, 0.5],
    { c: [3.50, 0.5], a: [2.40, 0.5] }, { gPerMl: 1.2 });
  I('mayonnaise', 'Whole egg mayonnaise', 'pantry', 'kg', [680, 1, 2, 75],
    { c: [4.50, 0.5], a: [3.20, 0.5] }, { tags: ['bulk-kcal'] });
  I('stock-cubes', 'Stock cubes (chicken/veg)', 'pantry', 'each', [200, 8, 20, 10],
    { c: [2.50, 12], a: [1.60, 12] }, { gramsEach: 10 });
  I('curry-paste', 'Curry paste', 'pantry', 'kg', [150, 3, 15, 8],
    { c: [4.00, 0.24], a: [3.00, 0.24] });
  I('salt', 'Salt', 'pantry', 'kg', [0, 0, 0, 0],
    { c: [1.50, 1], a: [1.00, 1] }, { tags: ['staple'] });
  I('pepper', 'Ground black pepper', 'pantry', 'kg', [251, 10, 64, 3],
    { c: [3.50, 0.05], a: [2.50, 0.05] }, { tags: ['staple'] });
  I('paprika', 'Smoked paprika', 'pantry', 'kg', [282, 14, 54, 13],
    { c: [3.00, 0.04], a: [2.00, 0.04] }, { tags: ['staple'] });
  I('cumin', 'Ground cumin', 'pantry', 'kg', [375, 18, 44, 22],
    { c: [3.00, 0.04], a: [2.00, 0.04] }, { tags: ['staple'] });
  I('curry-powder', 'Curry powder', 'pantry', 'kg', [325, 14, 56, 14],
    { c: [3.00, 0.05], a: [2.00, 0.05] }, { tags: ['staple'] });
  I('chilli-flakes', 'Chilli flakes', 'pantry', 'kg', [282, 12, 50, 14],
    { c: [3.00, 0.03], a: [2.00, 0.03] }, { tags: ['staple'] });
  I('mixed-herbs', 'Mixed dried herbs', 'pantry', 'kg', [265, 9, 60, 7],
    { c: [2.50, 0.02], a: [1.80, 0.02] }, { tags: ['staple'] });
  I('cinnamon', 'Ground cinnamon', 'pantry', 'kg', [247, 4, 81, 1],
    { c: [3.00, 0.03], a: [2.00, 0.03] }, { tags: ['staple'] });
  I('vinegar', 'White vinegar', 'pantry', 'l', [18, 0, 0.4, 0],
    { c: [2.00, 1], a: [1.40, 1] }, { gPerMl: 1.0 });
  I('cornflour', 'Cornflour', 'pantry', 'kg', [381, 0.3, 91, 0.1],
    { c: [2.50, 0.5], a: [1.80, 0.5] });
  I('sugar', 'White sugar', 'pantry', 'kg', [387, 0, 100, 0],
    { c: [2.50, 1], a: [1.90, 1] }, { tags: ['bulk-kcal'] });

  /* ══════════════════════════ PANTRY: SNACKS & NUTS ══════════════════════════
   * Weight-gain snacking: dense calories that don't need cooking. */

  I('almonds', 'Almonds', 'pantry', 'kg', [579, 21, 22, 50],
    { c: [16.00, 0.4], a: [12.00, 0.4], x: [22.00, 1.2] }, { tags: ['bulk-kcal'] });
  I('peanuts', 'Salted peanuts', 'pantry', 'kg', [567, 26, 16, 49],
    { c: [7.00, 0.5], a: [5.00, 0.5], w: [7.50, 0.5] },
    { tags: ['bulk-kcal', 'protein-cheap', 'budget'] });
  I('cashews', 'Cashews', 'pantry', 'kg', [553, 18, 30, 44],
    { c: [18.00, 0.4], a: [14.00, 0.4], x: [24.00, 1.1] }, { tags: ['bulk-kcal'] });
  I('mixed-nuts', 'Mixed nuts', 'pantry', 'kg', [600, 20, 20, 52],
    { c: [17.00, 0.5], a: [13.00, 0.5], w: [16.00, 0.5], x: [23.00, 1.1] },
    { tags: ['bulk-kcal'] });
  I('sultanas', 'Sultanas', 'pantry', 'kg', [299, 3, 79, 0.5],
    { c: [5.00, 0.5], a: [3.60, 0.5] }, { tags: ['bulk-carb'] });
  I('museli-bars', 'Muesli bars', 'pantry', 'each', [420, 7, 62, 15],
    { c: [4.50, 6], a: [3.00, 6], w: [4.00, 6] }, { gramsEach: 31 });
  I('rice-cakes', 'Rice cakes', 'pantry', 'each', [387, 8, 81, 3],
    { c: [2.50, 14], a: [1.60, 14] }, { gramsEach: 9 });
  I('weetbix', 'Wheat biscuits cereal', 'pantry', 'kg', [350, 12, 67, 1.5],
    { c: [6.00, 1.2], a: [4.20, 1.2], w: [6.50, 1.2] }, { tags: ['bulk-carb', 'budget'] });

  /* ══════════════════════════ FROZEN ══════════════════════════ */

  I('peas-frozen', 'Frozen peas', 'frozen', 'kg', [81, 5, 14, 0.4],
    { c: [3.00, 1], a: [2.20, 1], x: [8.00, 2.5] }, { tags: ['budget', 'freezer'] });
  I('mixed-veg-frozen', 'Frozen mixed vegetables', 'frozen', 'kg', [70, 3, 13, 0.5],
    { c: [3.50, 1], a: [2.50, 1], x: [9.00, 2.5] }, { tags: ['budget', 'freezer'] });
  I('corn-frozen', 'Frozen corn kernels', 'frozen', 'kg', [96, 3.4, 21, 1.2],
    { c: [3.50, 1], a: [2.50, 1] }, { tags: ['freezer'] });
  I('spinach-frozen', 'Frozen spinach', 'frozen', 'kg', [23, 3, 3, 0.4],
    { c: [3.50, 0.5], a: [2.50, 0.5] }, { tags: ['freezer'] });
  I('berries-frozen', 'Frozen mixed berries', 'frozen', 'kg', [50, 1, 11, 0.3],
    { c: [9.00, 0.5], a: [6.50, 0.5], x: [14.00, 1.5] }, { tags: ['freezer'] });
  I('chips-frozen', 'Frozen oven chips', 'frozen', 'kg', [160, 2.5, 27, 5],
    { c: [4.50, 1], a: [3.20, 1] }, { tags: ['bulk-carb', 'freezer'] });

  /* ══════════════════════════ HEALTH & PROTEIN ══════════════════════════
   * Big W genuinely competes here — it stocks supplements but not groceries. */

  I('whey-protein', 'Whey protein powder', 'health', 'kg', [380, 78, 8, 5],
    { c: [45.00, 1], w: [38.00, 1], x: [60.00, 2] },
    { tags: ['protein-cheap', 'supplement'] });
  I('protein-bar', 'Protein bars', 'health', 'each', [350, 30, 35, 10],
    { c: [4.00, 1], w: [3.20, 1], x: [30.00, 12] }, { gramsEach: 60 });
  I('creatine', 'Creatine monohydrate', 'health', 'kg', [0, 0, 0, 0],
    { w: [40.00, 0.5], x: [55.00, 1] }, { tags: ['supplement'] });

  /* ══════════════════════════ HOUSEHOLD ══════════════════════════
   * Here Big W and Costco routinely beat the supermarkets. */

  I('dish-soap', 'Dishwashing liquid', 'household', 'l', [0, 0, 0, 0],
    { c: [4.00, 0.5], a: [2.50, 0.5], w: [3.50, 0.5], x: [12.00, 3] });
  I('laundry-powder', 'Laundry powder', 'household', 'kg', [0, 0, 0, 0],
    { c: [12.00, 2], a: [7.00, 2], w: [10.00, 2], x: [25.00, 8] });
  I('paper-towel', 'Paper towel', 'household', 'each', [0, 0, 0, 0],
    { c: [5.00, 4], a: [3.50, 4], w: [4.50, 4], x: [16.00, 12] });
  I('toilet-paper', 'Toilet paper', 'household', 'each', [0, 0, 0, 0],
    { c: [9.00, 12], a: [6.00, 12], w: [8.00, 12], x: [22.00, 36] });
  I('foil', 'Aluminium foil', 'household', 'each', [0, 0, 0, 0],
    { c: [4.00, 1], a: [2.80, 1], w: [3.50, 1] });
  I('bin-bags', 'Bin bags', 'household', 'each', [0, 0, 0, 0],
    { c: [5.00, 30], a: [3.20, 30], w: [4.50, 30] });

  /* ══════════════════════ TURKISH PANTRY ══════════════════════
   * Everything the Turkish recipes lean on. Bulgur, yoghurt and legumes are the
   * backbone — cheap, high protein, and they do the heavy lifting in this
   * cuisine anyway, which suits a tight budget well. */

  I('bulgur', 'Bulgur (coarse)', 'pantry', 'kg', [342, 12, 76, 1.3],
    { c: [4.50, 0.5], a: [3.50, 0.5] },
    { tags: ['bulk-carb', 'protein-cheap', 'shelf-stable'] });
  I('orzo', 'Orzo / şehriye', 'pantry', 'kg', [355, 12, 71, 1.5],
    { c: [2.50, 0.5], a: [1.80, 0.5] }, { tags: ['bulk-carb'] });
  I('tahini', 'Tahini', 'pantry', 'kg', [595, 17, 21, 54],
    { c: [7.50, 0.385], a: [5.50, 0.385] }, { tags: ['bulk-kcal'] });
  I('pomegranate-molasses', 'Pomegranate molasses', 'pantry', 'l', [300, 0.4, 74, 0],
    { c: [6.00, 0.35] }, { gPerMl: 1.3 });
  I('sumac', 'Sumac', 'pantry', 'kg', [300, 5, 60, 5],
    { c: [4.00, 0.04] }, { tags: ['staple'] });
  I('mint-dried', 'Dried mint', 'pantry', 'kg', [285, 20, 52, 6],
    { c: [3.00, 0.02], a: [2.20, 0.02] }, { tags: ['staple'] });
  I('feta', 'Feta / beyaz peynir', 'dairy', 'kg', [264, 14, 4, 21],
    { c: [9.00, 0.2], a: [6.50, 0.2] }, { tags: ['protein-cheap'] });
  I('halloumi', 'Halloumi', 'dairy', 'kg', [321, 22, 2.6, 25],
    { c: [12.00, 0.18], a: [9.00, 0.18] });
  I('sucuk', 'Sucuk (Turkish beef sausage)', 'meat', 'kg', [400, 20, 2, 35],
    { c: [22.00, 0.25] }, { tags: ['bulk-kcal'] });
  I('eggplant', 'Eggplant', 'produce', 'kg', [25, 1, 6, 0.2],
    { c: [7.00, 1], a: [5.90, 1] }, { gramsEach: 300, loose: true });
  I('green-beans', 'Green beans', 'produce', 'kg', [31, 1.8, 7, 0.1],
    { c: [9.00, 1], a: [7.50, 1] }, { loose: true });
  I('parsley', 'Flat-leaf parsley', 'produce', 'each', [36, 3, 6, 0.8],
    { c: [3.00, 1], a: [2.50, 1] }, { gramsEach: 60 });
  I('olives', 'Olives (in brine)', 'pantry', 'kg', [145, 1, 4, 15],
    { c: [5.00, 0.35], a: [3.60, 0.35] });
  I('flatbread', 'Turkish flatbread / pide', 'bakery', 'each', [270, 9, 50, 3],
    { c: [4.00, 1], a: [3.00, 1] }, { gramsEach: 400, tags: ['bulk-carb'] });
  I('walnuts', 'Walnuts', 'pantry', 'kg', [654, 15, 14, 65],
    { c: [16.00, 0.4], a: [12.00, 0.4], x: [22.00, 1] }, { tags: ['bulk-kcal'] });
  I('white-beans-tin', 'Cannellini beans (tin)', 'pantry', 'each', [110, 7, 17, 0.5],
    { c: [1.30, 1], a: [0.90, 1] }, { gramsEach: 240, tags: ['protein-cheap', 'budget'] });

  /* ══════════════════════ LATIN AMERICAN PANTRY ══════════════════════
   * Rice and beans together make a complete protein for about a dollar a serve.
   * That combination is the single best value in this whole catalogue. */

  I('black-beans-dry', 'Dried black beans', 'pantry', 'kg', [341, 21, 62, 1.4],
    { c: [5.00, 0.5], a: [3.80, 0.5] },
    { tags: ['protein-cheap', 'budget', 'shelf-stable'] });
  I('masa-harina', 'Masa harina (for arepas)', 'pantry', 'kg', [365, 9, 76, 4],
    { c: [6.50, 1] }, { tags: ['bulk-carb'] });
  I('plantain', 'Plantain', 'produce', 'kg', [122, 1.3, 32, 0.4],
    { c: [7.00, 1] }, { gramsEach: 200, loose: true, tags: ['bulk-carb'] });
  I('oregano', 'Dried oregano', 'pantry', 'kg', [265, 9, 69, 4],
    { c: [3.00, 0.02], a: [2.20, 0.02] }, { tags: ['staple'] });
  I('sour-cream', 'Sour cream', 'dairy', 'kg', [198, 2.4, 4.6, 19],
    { c: [3.00, 0.3], a: [2.40, 0.3] }, { tags: ['bulk-kcal'] });
  I('jalapenos', 'Pickled jalapeños', 'pantry', 'kg', [27, 0.9, 5, 0.5],
    { c: [3.50, 0.24], a: [2.60, 0.24] });
  I('pumpkin', 'Pumpkin', 'produce', 'kg', [26, 1, 6.5, 0.1],
    { c: [3.50, 1], a: [2.90, 1] }, { loose: true, tags: ['budget'] });
  I('chipotle-paste', 'Chipotle / smoky chilli paste', 'pantry', 'kg', [120, 3, 20, 3],
    { c: [4.50, 0.15] });

  /* ══════════════════════ VERIFIED PRICES ══════════════════════
   * Unlike everything above, these are REAL prices, read directly from
   * coles.com.au on 2026-08-13 for delivery to Melbourne 3000.
   *
   * Coles sets prices by delivery area, so if you shop somewhere other than
   * inner Melbourne a few of these will be slightly off — but they are vastly
   * closer than the estimates they replace. Fresh meat and produce move most.
   *
   * Format: itemId -> [price, packSize, unit]. Applied after the seed data, so
   * they overwrite it and are stamped source 'verified'.
   *
   * ALDI, Big W and Costco could not be checked — only coles.com.au was
   * granted to the browser extension. Their prices remain estimates.
   */
  var VERIFIED = {
    coles: {
      date: '2026-08-13',
      source: 'coles.com.au, delivery to Melbourne 3000',
      prices: {
        // Meat — the biggest corrections. Chicken thigh was 32% under-estimated.
        'chicken-thigh':     [17.40, 1.2, 'kg'],   // Coles RSPCA large pack, $14.50/kg
        'chicken-breast':    [15.40, 1.4, 'kg'],   // $11.00/kg
        'chicken-drumstick': [8.00,  2,   'kg'],   // $4.00/kg — cheapest protein in the shop
        'chicken-whole':     [9.08,  1.65,'kg'],   // $5.50/kg
        'beef-mince':        [14.50, 1,   'kg'],
        'tuna-tin':          [1.00,  1,   'each'], // 95g tin

        // Dairy
        'eggs':              [6.40,  12,  'each'], // Coles Cage Free 12pk 800g
        'milk':              [5.15,  3,   'l'],    // 3L, $1.72/L
        'yoghurt-greek':     [4.20,  1,   'kg'],
        'cheese-tasty':      [9.30,  1,   'kg'],   // 1kg block is far better value than 500g
        'butter':            [7.00,  0.5, 'kg'],

        // Pantry staples — these were the most over-estimated
        'oats':              [3.50,  1.8, 'kg'],   // $1.94/kg, was seeded at $3.50/kg
        'rice-white':        [3.60,  2,   'kg'],   // $1.80/kg
        'pasta':             [1.00,  0.5, 'kg'],   // $2.00/kg
        'flour-plain':       [1.30,  1,   'kg'],
        'bread-wholemeal':   [3.50,  1,   'each'], // 700g loaf
        'peanut-butter':     [6.50,  1,   'kg'],
        'honey':             [7.90,  1,   'kg'],
        'olive-oil':         [10.00, 1,   'l'],    // Coles Simply 1L
        'veg-oil':           [6.00,  2,   'l'],
        'mayonnaise':        [3.00,  0.445,'kg'],
        'tomatoes-tin':      [0.95,  1,   'each'], // 400g
        'chickpeas-tin':     [0.95,  1,   'each'], // 420g
        'lentils-dry':       [4.00,  1,   'kg'],

        // Produce (loose, per kg)
        'potato':            [12.00, 4,   'kg'],   // $3.00/kg in the 4kg bag
        'onion':             [4.20,  1,   'kg'],
        'carrot':            [2.60,  1,   'kg'],
        'banana':            [4.90,  1,   'kg'],

        // Frozen & supplements
        'peas-frozen':       [2.50,  1,   'kg'],
        'mixed-veg-frozen':  [2.80,  1,   'kg'],
        'whey-protein':      [32.00, 0.9, 'kg']    // Max's 100% Whey 900g
      }
    }
  };

  Object.keys(VERIFIED).forEach(function (storeId) {
    var v = VERIFIED[storeId];
    Object.keys(v.prices).forEach(function (itemId) {
      var item = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === itemId) { item = items[i]; break; }
      }
      if (!item) {
        console.warn('items.js: verified price for unknown item "' + itemId + '"');
        return;
      }
      var p = v.prices[itemId];
      item.prices[storeId] = {
        price: p[0], size: p[1], unit: p[2],
        updated: v.date, source: 'verified', from: v.source
      };
    });
  });

  /* ─────────────────────────────────────────────────────────────── */

  var byId = {};
  items.forEach(function (it) { byId[it.id] = it; });

  global.CATALOGUE = {
    SEED_DATE: SEED_DATE,
    VERIFIED_STORES: VERIFIED_STORES,
    VERIFIED: VERIFIED,
    STORES: STORES,
    AISLES: AISLES,
    items: items,
    byId: byId,
    get: function (id) { return byId[id] || null; },
    aisle: function (id) {
      for (var i = 0; i < AISLES.length; i++) if (AISLES[i].id === id) return AISLES[i];
      return { id: id, name: id, order: 99 };
    },
    store: function (id) {
      for (var i = 0; i < STORES.length; i++) if (STORES[i].id === id) return STORES[i];
      return null;
    },
    searchUrl: function (storeId, itemName) {
      var s = this.store(storeId);
      return s ? s.search + encodeURIComponent(itemName) : null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
