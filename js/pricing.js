/* pricing.js — cheapest-store resolution, value metrics, recipe costing and
 * shopping-list aggregation. Pure logic, no DOM, so it can be tested under jsc.
 *
 * The rule that matters most in this file: a store that does not stock an item
 * has a null price entry, and null must NEVER be treated as zero. A missing
 * price is "unknown", and an unknown price can never win a cheapest-store
 * comparison — otherwise Big W, which sells no fresh meat at all, would be
 * recommended for every chicken thigh in the plan.
 */
(function (global) {
  'use strict';

  var U = global.Units;
  var C = global.CATALOGUE;

  var config = {
    overrides: {},                                  // itemId -> storeId -> entry
    enabledStores: ['coles', 'aldi', 'bigw', 'costco']
  };

  function configure(opts) {
    if (opts.overrides) config.overrides = opts.overrides;
    if (opts.enabledStores) config.enabledStores = opts.enabledStores;
  }

  /**
   * The price entry actually in force: a user correction beats the seed.
   *
   * A correction can legitimately BE null — "Not stocked here" writes exactly
   * that, to override a seed price that was wrong about the item existing at
   * all. So this checks whether the override KEY is present, not whether its
   * VALUE is truthy: `ov[storeId]` being `null` must return null (not stocked),
   * not fall through to the seed price it was meant to replace.
   */
  function effectiveEntry(item, storeId, overrides) {
    overrides = overrides || config.overrides;
    var ov = overrides[item.id];
    if (ov && Object.prototype.hasOwnProperty.call(ov, storeId)) return ov[storeId];
    return item.prices[storeId] || null;
  }

  /**
   * Dollars per gram of the actual food, normalised across mass / volume /
   * count items so they can be compared on one axis. Returns null when we
   * lack the density or unit weight needed to get there honestly.
   */
  function dollarsPerGram(item, entry) {
    var up = U.unitPrice(entry); // $ per g, per ml, or per each
    if (up === null) return null;

    var dim = U.dimensionOf(entry.unit);
    if (dim === U.MASS) return up;
    if (dim === U.VOLUME) return item.gPerMl ? up / item.gPerMl : null;
    if (dim === U.COUNT) return item.gramsEach ? up / item.gramsEach : null;
    return null;
  }

  /**
   * Cheapest store stocking this item, among the enabled ones.
   * Returns { storeId, entry, unitPrice, dollarsPerGram } or null if nobody
   * enabled stocks it.
   */
  function cheapestStore(item, stores, overrides) {
    stores = stores || config.enabledStores;
    var best = null;

    stores.forEach(function (storeId) {
      var entry = effectiveEntry(item, storeId, overrides);
      if (!entry) return;                       // store does not stock it
      var up = U.unitPrice(entry);
      if (up === null) return;                  // malformed entry, skip
      if (!best || up < best.unitPrice) {
        best = {
          storeId: storeId,
          entry: entry,
          unitPrice: up,
          dollarsPerGram: dollarsPerGram(item, entry)
        };
      }
    });
    return best;
  }

  /**
   * Cheapest store for BUYING A SPECIFIC QUANTITY — which is not the same
   * question as cheapest unit price, and getting them confused is expensive.
   *
   * Costco chicken at $8.20/kg beats ALDI at $9.50/kg on unit price, but it
   * only comes in a 2.5 kg pack. If the week needs 300 g, "cheapest" by unit
   * price sends you to the till with $20.50 of chicken instead of $9.50. So the
   * shopping list minimises what you actually hand over, and ties are broken by
   * unit price. The better-value-but-bigger option is reported separately as a
   * bulk tip, so the trade-off is visible rather than silently decided for you.
   *
   * Returns { storeId, entry, packs, cost, surplus, unitPrice } or null.
   */
  function cheapestForQuantity(item, qty, unit, stores, overrides) {
    stores = stores || config.enabledStores;
    var best = null;

    stores.forEach(function (storeId) {
      var entry = effectiveEntry(item, storeId, overrides);
      if (!entry) return;
      var up = U.unitPrice(entry);
      if (up === null) return;
      var packs = U.packsFor(qty, unit, entry, item);
      if (!packs) return;

      var cand = {
        storeId: storeId, entry: entry, packs: packs.packs,
        cost: packs.cost, surplus: packs.surplus, loose: packs.loose, unitPrice: up
      };
      if (!best || cand.cost < best.cost - 1e-9 ||
          (Math.abs(cand.cost - best.cost) < 1e-9 && cand.unitPrice < best.unitPrice)) {
        best = cand;
      }
    });
    return best;
  }

  /**
   * If some other store offers materially better value per unit than the one
   * we're sending you to, say so — with what the bigger pack costs and how much
   * you'd be left holding. This is the honest way to present Costco.
   */
  function bulkTip(item, chosen, stores, overrides) {
    var byUnit = cheapestStore(item, stores, overrides);
    if (!byUnit || byUnit.storeId === chosen.storeId) return null;
    if (byUnit.unitPrice >= chosen.unitPrice * 0.95) return null;  // not worth mentioning

    return {
      storeId: byUnit.storeId,
      unitPrice: byUnit.unitPrice,
      packPrice: byUnit.entry.price,
      packSize: byUnit.entry.size,
      packUnit: byUnit.entry.unit,
      betterBy: 1 - (byUnit.unitPrice / chosen.unitPrice),
      extraOutlay: byUnit.entry.price - chosen.cost
    };
  }

  /** Every store's offer for an item, cheapest first — powers the compare UI. */
  function allOffers(item, stores, overrides) {
    stores = stores || config.enabledStores;
    return stores.map(function (storeId) {
      var entry = effectiveEntry(item, storeId, overrides);
      if (!entry) return null;
      var up = U.unitPrice(entry);
      if (up === null) return null;
      return { storeId: storeId, entry: entry, unitPrice: up };
    }).filter(Boolean).sort(function (a, b) { return a.unitPrice - b.unitPrice; });
  }

  /* ─────────────────────────── value metrics ───────────────────────────
   * The two numbers that actually answer "how do I gain weight on a budget". */

  /** $ to buy 30 g of protein from this item at its cheapest store. */
  function costPer30gProtein(item, stores, overrides) {
    var p = item.per100g && item.per100g.protein;
    if (!p) return null;                        // no protein => not a protein source
    var best = cheapestStore(item, stores, overrides);
    if (!best || best.dollarsPerGram === null) return null;
    return best.dollarsPerGram * (3000 / p);    // grams of food holding 30 g protein
  }

  /** $ to buy 1000 kcal from this item at its cheapest store. */
  function costPer1000kcal(item, stores, overrides) {
    var k = item.per100g && item.per100g.kcal;
    if (!k) return null;
    var best = cheapestStore(item, stores, overrides);
    if (!best || best.dollarsPerGram === null) return null;
    return best.dollarsPerGram * (100000 / k);
  }

  /* ─────────────────────────── recipe costing ─────────────────────────── */

  /**
   * Cost and macros for a whole recipe at its base serving count.
   * `missing` collects ingredients we could not price, so the UI can show an
   * honest "from $X" rather than pretending the total is complete.
   */
  function recipeCost(recipe, stores, overrides) {
    var total = 0, macros = U.emptyMacros(), missing = [];

    recipe.ingredients.forEach(function (ing) {
      var item = C.get(ing.itemId);
      if (!item) { missing.push(ing.itemId); return; }

      macros = U.addMacros(macros, U.macrosFor(ing.qty, ing.unit, item));

      var best = cheapestStore(item, stores, overrides);
      if (!best) { missing.push(ing.itemId); return; }

      var c = U.costOf(ing.qty, ing.unit, best.entry, item);
      if (c === null) { missing.push(ing.itemId); return; }
      total += c;
    });

    var serves = recipe.baseServings || 1;
    return {
      total: total,
      perServe: total / serves,
      macros: macros,
      macrosPerServe: U.scaleMacros(macros, 1 / serves),
      missing: missing,
      complete: missing.length === 0
    };
  }

  /** Protein bought per dollar spent on this recipe — the ranking metric. */
  function recipeProteinPerDollar(recipe, stores, overrides) {
    var r = recipeCost(recipe, stores, overrides);
    if (!r.total) return null;
    return r.macros.protein / r.total;
  }

  /* ────────────────────── shopping list aggregation ────────────────────── */

  /**
   * Turn planned meals into a real shopping list.
   *
   * @param entries [{ recipeId, servings, batchServings? }]
   * @param pantry  { itemId: qtyInCanonicalUnits }
   * @returns {
   *   lines: [...],            // one per item still needing purchase
   *   byStore: { storeId: { lines, subtotal } },
   *   total, unpriced
   * }
   *
   * Quantities are accumulated in each item's canonical unit (g / ml / each) so
   * that 300 g here and 0.5 kg there add up correctly, then converted into whole
   * packs — because shops sell packets, not grams.
   *
   * `servings` is how much of the recipe THIS slot eats, for macro/cost display.
   * `batchServings`, when present, is how much was actually COOKED — a dinner
   * that spawns a next-day leftover has to buy ingredients for the whole batch
   * (e.g. all 4 servings of a 4-serving recipe), not just the 1 serving eaten
   * at dinner, or there won't be enough food to make the leftover portion the
   * plan already promised. Shopping always scales by the larger of the two.
   */
  function buildShoppingList(entries, pantry, stores, overrides) {
    pantry = pantry || {};
    stores = stores || config.enabledStores;

    var need = {};   // itemId -> qty in canonical units
    var used = {};   // itemId -> [{recipeName, qty, unit}] for provenance

    // Custom recipes live in Store.state.customRecipes, not the seeded
    // RECIPES registry — resolve through Store when it's loaded (the real
    // app) so a homemade recipe's ingredients aren't silently skipped, and
    // fall back to the seeded-only lookup when Store isn't present (the
    // pricing test suite runs without store.js loaded).
    function resolveRecipe(id) {
      if (global.Store && global.Store.getRecipe) return global.Store.getRecipe(id);
      return global.RECIPES.get(id);
    }

    entries.forEach(function (e) {
      var recipe = resolveRecipe(e.recipeId);
      if (!recipe) return;
      var shopServings = e.batchServings || e.servings || recipe.baseServings;
      var scale = shopServings / (recipe.baseServings || 1);

      recipe.ingredients.forEach(function (ing) {
        var item = C.get(ing.itemId);
        if (!item) return;
        var canonUnit = U.CANONICAL[U.dimensionOf(item.baseUnit)];
        var qty = U.convertItem(ing.qty * scale, ing.unit, canonUnit, item);
        if (qty === null) return;

        need[ing.itemId] = (need[ing.itemId] || 0) + qty;
        (used[ing.itemId] = used[ing.itemId] || []).push({
          recipe: recipe.name,
          qty: ing.qty * scale,
          unit: ing.unit
        });
      });
    });

    var lines = [], unpriced = [];

    Object.keys(need).forEach(function (itemId) {
      var item = C.get(itemId);
      var canonUnit = U.CANONICAL[U.dimensionOf(item.baseUnit)];

      // Subtract what is already in the pantry.
      var have = pantry[itemId] || 0;
      var outstanding = need[itemId] - have;
      if (outstanding <= 1e-9) return; // fully covered by the pantry

      // Minimise actual outlay for the quantity needed, not unit price.
      var best = cheapestForQuantity(item, outstanding, canonUnit, stores, overrides);
      if (!best) {
        unpriced.push({ item: item, qty: outstanding, unit: canonUnit, used: used[itemId] });
        return;
      }

      lines.push({
        item: item,
        storeId: best.storeId,
        entry: best.entry,
        needQty: outstanding,
        needUnit: canonUnit,
        haveQty: have,
        packs: best.packs,
        cost: best.cost,
        surplus: best.surplus,
        loose: best.loose,
        bulkTip: item.loose ? null : bulkTip(item, best, stores, overrides),
        offers: allOffers(item, stores, overrides),
        used: used[itemId]
      });
    });

    // Group by store, then by aisle order within each store.
    var byStore = {};
    lines.forEach(function (l) {
      var b = byStore[l.storeId] || (byStore[l.storeId] = { lines: [], subtotal: 0 });
      b.lines.push(l);
      b.subtotal += l.cost;
    });
    Object.keys(byStore).forEach(function (s) {
      byStore[s].lines.sort(function (a, b) {
        var ao = C.aisle(a.item.aisle).order, bo = C.aisle(b.item.aisle).order;
        return ao !== bo ? ao - bo : a.item.name.localeCompare(b.item.name);
      });
    });

    var total = lines.reduce(function (s, l) { return s + l.cost; }, 0);
    return { lines: lines, byStore: byStore, total: total, unpriced: unpriced };
  }

  /**
   * What each extra stop is worth: for every store in the list, how much more
   * the same items would cost if bought at the best remaining alternative.
   * Answers "is driving to ALDI actually worth it this week?".
   */
  function storeSavings(list, stores, overrides) {
    stores = stores || config.enabledStores;
    var out = {};

    Object.keys(list.byStore).forEach(function (storeId) {
      var others = stores.filter(function (s) { return s !== storeId; });
      var alt = 0, allAvailable = true;

      list.byStore[storeId].lines.forEach(function (l) {
        var best = cheapestForQuantity(l.item, l.needQty, l.needUnit, others, overrides);
        if (!best) { allAvailable = false; return; }
        alt += best.cost;
      });

      out[storeId] = {
        subtotal: list.byStore[storeId].subtotal,
        alternative: alt,
        saving: alt - list.byStore[storeId].subtotal,
        exclusive: !allAvailable   // some items only this store carries
      };
    });
    return out;
  }

  /* ───────────────────────── price freshness ───────────────────────── */

  var STALE_DAYS = 60;

  function daysSince(dateStr, now) {
    if (!dateStr) return Infinity;
    var then = new Date(dateStr + 'T00:00:00').getTime();
    if (isNaN(then)) return Infinity;
    return Math.floor(((now || Date.now()) - then) / 86400000);
  }

  /** true when a price is still a seed, or a user price that has gone stale. */
  function needsCheck(entry, now) {
    if (!entry) return false;
    if (entry.source === 'seed') return true;
    return daysSince(entry.updated, now) > STALE_DAYS;
  }

  global.Pricing = {
    configure: configure,
    config: config,
    effectiveEntry: effectiveEntry,
    dollarsPerGram: dollarsPerGram,
    cheapestStore: cheapestStore,
    cheapestForQuantity: cheapestForQuantity,
    bulkTip: bulkTip,
    allOffers: allOffers,
    costPer30gProtein: costPer30gProtein,
    costPer1000kcal: costPer1000kcal,
    recipeCost: recipeCost,
    recipeProteinPerDollar: recipeProteinPerDollar,
    buildShoppingList: buildShoppingList,
    storeSavings: storeSavings,
    needsCheck: needsCheck,
    daysSince: daysSince,
    STALE_DAYS: STALE_DAYS
  };
})(typeof window !== 'undefined' ? window : globalThis);
