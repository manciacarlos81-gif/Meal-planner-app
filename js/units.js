/* units.js — unit conversion, unit pricing and macro maths.
 *
 * This is the load-bearing module. Recipes speak grams / millilitres / slices /
 * cloves; the grocery catalogue speaks kilograms / litres / loaves / bulbs.
 * Every dollar figure and every macro figure in the app flows through here, so
 * a mistake in this file is a mistake everywhere.
 *
 * ── THE CENTRAL PROBLEM ───────────────────────────────────────────────────
 * Dimensional analysis alone is not enough. "2 slices" and "2 loaves" are both
 * counts, but they are wildly different amounts of bread — treating them as
 * interchangeable made a round of toast cost two whole loaves and read as 3700
 * calories. Likewise "3 cloves" is not "3 bulbs" of garlic, and a recipe asking
 * for 80 g of corn from a tin sold "each" needs to know how much is in a tin.
 *
 * So conversion is ITEM-AWARE. Grams are the universal pivot, and each catalogue
 * item carries whatever metadata is needed to reach grams:
 *   gramsEach — what one sold unit weighs (one loaf = 700 g)
 *   gPerMl    — density, to bridge volume and mass (oil, milk)
 *   subUnits  — item-specific portions in grams ({ slice: 40, clove: 5 })
 *
 * Units listed in SUB_UNIT_ONLY ('slice', 'clove') can ONLY be resolved through
 * an item's subUnits map. If an item does not define one, conversion returns
 * null rather than silently falling back to a 1:1 count — a loud failure beats
 * a plausible-looking wrong number.
 *
 * NOTE ON AUSTRALIAN MEASURES: an Australian tablespoon is 20 ml, not the 15 ml
 * used in the US, UK and NZ. A metric cup is 250 ml. These recipes are Australian.
 */
(function (global) {
  'use strict';

  var MASS = 'mass', VOLUME = 'volume', COUNT = 'count';

  // unit -> [dimension, how many canonical units one of these is worth]
  var UNITS = {
    // mass, canonical = gram
    g: [MASS, 1], gram: [MASS, 1], grams: [MASS, 1],
    kg: [MASS, 1000], mg: [MASS, 0.001],

    // volume, canonical = millilitre
    ml: [VOLUME, 1], l: [VOLUME, 1000], litre: [VOLUME, 1000],
    tsp: [VOLUME, 5],
    tbsp: [VOLUME, 20],   // Australian tablespoon
    cup: [VOLUME, 250],   // Australian metric cup

    // count, canonical = each
    each: [COUNT, 1], ea: [COUNT, 1], pack: [COUNT, 1],
    tin: [COUNT, 1], can: [COUNT, 1],
    slice: [COUNT, 1], clove: [COUNT, 1]
  };

  // Units that are meaningless without item context. See the header note.
  var SUB_UNIT_ONLY = { slice: true, clove: true };

  var CANONICAL = {};
  CANONICAL[MASS] = 'g';
  CANONICAL[VOLUME] = 'ml';
  CANONICAL[COUNT] = 'each';

  function norm(unit) {
    return String(unit == null ? '' : unit).trim().toLowerCase();
  }

  function dimensionOf(unit) {
    var u = UNITS[norm(unit)];
    return u ? u[0] : null;
  }

  function isKnownUnit(unit) {
    return Object.prototype.hasOwnProperty.call(UNITS, norm(unit));
  }

  function isSubUnitOnly(unit) {
    return SUB_UNIT_ONLY[norm(unit)] === true;
  }

  /**
   * Convert `qty` of `unit` into that unit's canonical measure (g / ml / each).
   * Throws on an unknown unit rather than silently returning a wrong number —
   * a typo'd unit in a recipe must be loud, not quietly mispriced.
   */
  function toCanonical(qty, unit) {
    var u = UNITS[norm(unit)];
    if (!u) throw new Error('units: unknown unit "' + unit + '"');
    return qty * u[1];
  }

  function fromCanonical(qty, unit) {
    var u = UNITS[norm(unit)];
    if (!u) throw new Error('units: unknown unit "' + unit + '"');
    return qty / u[1];
  }

  /**
   * Purely dimensional conversion — same dimension, or mass<->volume when a
   * density is supplied. Returns null when impossible. Most callers should use
   * convertItem() instead, which also understands per-item portions.
   */
  function convert(qty, fromUnit, toUnit, gPerMl) {
    if (isSubUnitOnly(fromUnit) || isSubUnitOnly(toUnit)) return null;

    var fd = dimensionOf(fromUnit), td = dimensionOf(toUnit);
    if (!fd || !td) return null;

    var canon = toCanonical(qty, fromUnit);
    if (fd === td) return fromCanonical(canon, toUnit);

    if (!gPerMl) return null;
    if (fd === MASS && td === VOLUME) return fromCanonical(canon / gPerMl, toUnit);
    if (fd === VOLUME && td === MASS) return fromCanonical(canon * gPerMl, toUnit);
    return null;
  }

  /** Grams of actual food in `qty unit` of `item`, or null if unknowable. */
  function toGrams(qty, unit, item) {
    var u = norm(unit);

    if (item && item.subUnits && item.subUnits[u] != null) return qty * item.subUnits[u];
    if (isSubUnitOnly(u)) return null;   // needs a subUnits entry and hasn't got one

    var d = dimensionOf(u);
    if (d === MASS) return toCanonical(qty, u);
    if (d === VOLUME) return item && item.gPerMl ? toCanonical(qty, u) * item.gPerMl : null;
    if (d === COUNT) return item && item.gramsEach ? toCanonical(qty, u) * item.gramsEach : null;
    return null;
  }

  /** Inverse of toGrams: express `grams` of `item` in `unit`. */
  function fromGrams(grams, unit, item) {
    var u = norm(unit);

    if (item && item.subUnits && item.subUnits[u] != null) return grams / item.subUnits[u];
    if (isSubUnitOnly(u)) return null;

    var d = dimensionOf(u);
    if (d === MASS) return fromCanonical(grams, u);
    if (d === VOLUME) return item && item.gPerMl ? fromCanonical(grams / item.gPerMl, u) : null;
    if (d === COUNT) return item && item.gramsEach ? fromCanonical(grams / item.gramsEach, u) : null;
    return null;
  }

  /**
   * The conversion the app actually uses: item-aware, routing through grams
   * whenever a per-item portion is involved. Returns null when the item lacks
   * the metadata to answer honestly.
   */
  function convertItem(qty, fromUnit, toUnit, item) {
    var fu = norm(fromUnit), tu = norm(toUnit);

    var needsItem = isSubUnitOnly(fu) || isSubUnitOnly(tu) ||
      (item && item.subUnits && (item.subUnits[fu] != null || item.subUnits[tu] != null));

    if (!needsItem) {
      var direct = convert(qty, fu, tu, item && item.gPerMl);
      if (direct !== null) return direct;
    }

    var g = toGrams(qty, fu, item);
    if (g === null) return null;
    return fromGrams(g, tu, item);
  }

  /* ---------------------------------------------------------------- pricing */

  /**
   * Price per canonical unit ($/g, $/ml, or $/each) for one store's entry.
   * A null entry means the store does not stock the item — callers must treat
   * that as "no price", never as zero, or a store that doesn't stock something
   * would win every cheapest-store comparison.
   */
  function unitPrice(entry) {
    if (!entry || typeof entry.price !== 'number' || !entry.size) return null;
    if (!isKnownUnit(entry.unit)) return null;
    var canonSize = toCanonical(entry.size, entry.unit);
    if (!canonSize) return null;
    return entry.price / canonSize;
  }

  /**
   * Pro-rata cost of using `qty unit` of an item priced by `entry`.
   * Used for "what did this recipe cost": you use a third of the bag, you're
   * charged a third. Distinct from packsFor(), which is what you hand over
   * at the till.
   */
  function costOf(qty, unit, entry, item) {
    var up = unitPrice(entry);                        // $ per canonical unit
    if (up === null) return null;
    var canonUnit = CANONICAL[dimensionOf(entry.unit)];
    var qtyCanon = convertItem(qty, unit, canonUnit, item);
    if (qtyCanon === null) return null;
    return qtyCanon * up;
  }

  /**
   * What you actually buy: whole packs. Returns { packs, cost, surplus }, with
   * surplus in the entry's own units (2 kg bought, 1.4 kg used => 0.6 kg over).
   */
  function packsFor(qty, unit, entry, item) {
    if (!entry || !entry.size) return null;
    var needed = convertItem(qty, unit, entry.unit, item);
    if (needed === null) return null;

    // Loose goods — produce weighed out at the scales — are not sold in fixed
    // packets. You take 125 g of onion and pay for 125 g. Rounding these up to
    // a whole kilo overstated the shop badly: $2.90 of onions to cover 12c
    // worth. There is no surplus because you never bought any.
    if (item && item.loose) {
      var fraction = needed / entry.size;
      return {
        packs: fraction,
        cost: fraction * entry.price,
        surplus: 0,
        loose: true
      };
    }

    var packs = Math.ceil((needed / entry.size) - 1e-9); // tolerate float dust
    if (packs < 1) packs = 1;
    return {
      packs: packs,
      cost: packs * entry.price,
      surplus: (packs * entry.size) - needed,
      loose: false
    };
  }

  /* ----------------------------------------------------------------- macros */

  /**
   * Macros contributed by `qty unit` of an item whose per100g is known.
   * Returns zeros rather than guessing when the item lacks the metadata to
   * reach grams — an understated macro is safer here than an invented one.
   */
  function macrosFor(qty, unit, item) {
    var zero = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    if (!item || !item.per100g) return zero;

    var grams = toGrams(qty, unit, item);
    if (grams === null) return zero;

    var f = grams / 100, m = item.per100g;
    return {
      kcal: (m.kcal || 0) * f,
      protein: (m.protein || 0) * f,
      carbs: (m.carbs || 0) * f,
      fat: (m.fat || 0) * f
    };
  }

  function addMacros(a, b) {
    return {
      kcal: (a.kcal || 0) + (b.kcal || 0),
      protein: (a.protein || 0) + (b.protein || 0),
      carbs: (a.carbs || 0) + (b.carbs || 0),
      fat: (a.fat || 0) + (b.fat || 0)
    };
  }

  function scaleMacros(m, f) {
    return { kcal: m.kcal * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f };
  }

  function emptyMacros() {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  }

  /* --------------------------------------------------------------- display */

  function money(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return '$' + n.toFixed(2);
  }

  function trim(n) {
    return String(Math.round(n * 100) / 100);
  }

  /** Human-friendly amount: 1500 g reads better as 1.5 kg. */
  function prettyQty(qty, unit) {
    var u = norm(unit);
    var d = isSubUnitOnly(u) ? COUNT : dimensionOf(u);
    if (!d) return trim(qty) + (u ? ' ' + u : '');

    if (d === MASS) {
      var g = toCanonical(qty, u);
      return g >= 1000 ? trim(g / 1000) + ' kg' : trim(g) + ' g';
    }
    if (d === VOLUME) {
      var ml = toCanonical(qty, u);
      return ml >= 1000 ? trim(ml / 1000) + ' L' : trim(ml) + ' ml';
    }
    // Count: "2 cloves", "3 slices", but a bare "3" for a plain each.
    if (!u || u === 'each' || u === 'ea') return trim(qty);
    return trim(qty) + ' ' + (qty === 1 ? u : u + 's');
  }

  /**
   * Like prettyQty, but reaches for an item's sub-unit when a bare count would
   * read as nonsense. Half a bulb of garlic is "5.5 cloves" to a cook; "0.55"
   * is meaningless standing in a supermarket.
   */
  function prettyNeed(qty, unit, item) {
    if (item && item.subUnits && dimensionOf(unit) === COUNT && qty < 1) {
      var key = Object.keys(item.subUnits)[0];
      var grams = toGrams(qty, unit, item);
      var inSub = grams === null ? null : fromGrams(grams, key, item);
      if (inSub !== null) return prettyQty(Math.round(inSub * 2) / 2, key);
    }
    return prettyQty(qty, unit);
  }

  global.Units = {
    MASS: MASS, VOLUME: VOLUME, COUNT: COUNT,
    CANONICAL: CANONICAL,
    dimensionOf: dimensionOf,
    isKnownUnit: isKnownUnit,
    isSubUnitOnly: isSubUnitOnly,
    toCanonical: toCanonical,
    fromCanonical: fromCanonical,
    convert: convert,
    convertItem: convertItem,
    toGrams: toGrams,
    fromGrams: fromGrams,
    unitPrice: unitPrice,
    costOf: costOf,
    packsFor: packsFor,
    macrosFor: macrosFor,
    addMacros: addMacros,
    scaleMacros: scaleMacros,
    emptyMacros: emptyMacros,
    money: money,
    prettyQty: prettyQty,
    prettyNeed: prettyNeed
  };
})(typeof window !== 'undefined' ? window : globalThis);
