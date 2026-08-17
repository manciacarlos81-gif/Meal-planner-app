/* store.js — application state, persistence and week/date helpers.
 *
 * Everything lives in one localStorage key so the whole app state can be
 * exported as a single JSON file and imported on another machine. There is no
 * server and no account; your data never leaves this computer.
 */
(function (global) {
  'use strict';

  var KEY = 'mealwise.v1';
  var SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

  var hasLocalStorage = (function () {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      return true;
    } catch (e) {
      return false; // Safari private mode, file:// restrictions, etc.
    }
  })();

  function defaults() {
    return {
      version: 1,
      plan: {},              // 'YYYY-MM-DD' -> slot -> { recipeId, servings, leftoverOf, cooked }
      pantry: {},            // itemId -> qty in the item's canonical unit
      overrides: {},         // itemId -> storeId -> price entry (your corrections)
      customRecipes: [],
      checked: {},           // shopping list tick state, keyed 'storeId:itemId'
      settings: {
        dailyKcal: 2800,
        dailyProtein: 140,
        weeklyBudget: 110,
        enabledStores: ['coles', 'aldi', 'bigw', 'costco'],
        enabledProteins: { chicken: true, beef: true, lamb: true, seafood: true, vegetarian: true },
        defaultServings: 1,
        autoLeftovers: true,
        // Personal figures for the TDEE calculator; blank until you fill them in.
        body: { sex: '', age: null, heightCm: null, weightKg: null, activity: 1.55, surplus: 400 }
      }
    };
  }

  var state = defaults();
  var listeners = [];

  function load() {
    if (!hasLocalStorage) return;
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      state = merge(defaults(), parsed);
    } catch (e) {
      console.warn('mealwise: could not read saved data, starting fresh.', e);
    }
  }

  /**
   * Shallow-ish merge that keeps new default keys when loading older saves.
   *
   * Type-guarded: an incoming value that doesn't match the shape of the
   * default it would replace is skipped, keeping the default instead. Without
   * this, a hand-edited or corrupted backup with e.g. "overrides": null
   * would overwrite state.overrides with null outright — and the very next
   * price lookup (effectiveEntry does `overrides[item.id]`) throws, which
   * app.js's route try/catch turns into a permanently broken page for every
   * pricing-touching view. Same risk for customRecipes becoming non-array:
   * the next recipe save calls .push()/.map() on it and silently fails.
   */
  function merge(base, incoming) {
    if (!incoming || typeof incoming !== 'object') return base;
    Object.keys(incoming).forEach(function (k) {
      var v = incoming[k];
      var baseIsArray = Array.isArray(base[k]);
      var baseIsObject = base[k] && typeof base[k] === 'object' && !baseIsArray;

      if (baseIsArray) {
        if (Array.isArray(v)) base[k] = v;          // else: keep the default array
        return;
      }
      if (baseIsObject) {
        if (v && typeof v === 'object' && !Array.isArray(v)) base[k] = merge(base[k], v);
        return;                                       // else: keep the default object
      }
      if (v !== undefined) base[k] = v;
    });
    return base;
  }

  function save() {
    if (!hasLocalStorage) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('mealwise: could not save.', e);
    }
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } });
  }

  /** Mutate state through here so persistence and re-render always happen. */
  function update(fn) {
    fn(state);
    syncPricing();
    save();
    notify();
  }

  function subscribe(fn) { listeners.push(fn); }

  /** Keep pricing.js in step with the user's corrections and store choices. */
  function syncPricing() {
    if (global.Pricing) {
      global.Pricing.configure({
        overrides: state.overrides,
        enabledStores: state.settings.enabledStores
      });
    }
  }

  /* ─────────────────────────────── dates ─────────────────────────────── */

  function iso(d) {
    var y = d.getFullYear(),
        m = String(d.getMonth() + 1).padStart(2, '0'),
        day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function parseIso(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  /** Monday of the week containing `d`. Australian weeks start Monday. */
  function weekStart(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = (x.getDay() + 6) % 7;  // Mon=0 … Sun=6
    x.setDate(x.getDate() - day);
    return x;
  }

  function addDays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }

  function weekDates(start) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(iso(addDays(start, i)));
    return out;
  }

  var DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function dayLabel(isoStr) {
    var d = parseIso(isoStr);
    return DAY_NAMES[(d.getDay() + 6) % 7];
  }

  function dateLabel(isoStr) {
    var d = parseIso(isoStr);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  /* ──────────────────────────── plan access ──────────────────────────── */

  function getMeal(date, slot) {
    return (state.plan[date] && state.plan[date][slot]) || null;
  }

  function setMeal(date, slot, entry) {
    update(function (s) {
      if (!s.plan[date]) s.plan[date] = {};
      if (entry) s.plan[date][slot] = entry;
      else delete s.plan[date][slot];
      if (Object.keys(s.plan[date]).length === 0) delete s.plan[date];
    });
  }

  /** Every planned meal in a date range, as flat entries for costing. */
  function entriesForDates(dates) {
    var out = [];
    dates.forEach(function (d) {
      var day = state.plan[d];
      if (!day) return;
      SLOTS.forEach(function (slot) {
        var m = day[slot];
        // Leftovers are portions of a meal already counted at its source, so
        // they must not be shopped for twice.
        if (m && m.recipeId && !m.leftoverOf) {
          out.push({
            recipeId: m.recipeId, servings: m.servings, batchServings: m.batchServings,
            date: d, slot: slot
          });
        }
      });
    });
    return out;
  }

  /** All recipes: seeded plus any the user wrote. */
  function allRecipes() {
    return global.RECIPES.all.concat(state.customRecipes || []);
  }

  function getRecipe(id) {
    var r = global.RECIPES.get(id);
    if (r) return r;
    var custom = state.customRecipes || [];
    for (var i = 0; i < custom.length; i++) if (custom[i].id === id) return custom[i];
    return null;
  }

  /* ──────────────────────────── export/import ──────────────────────────── */

  function exportJson() {
    return JSON.stringify(state, null, 2);
  }

  /** Returns { ok, error }. Refuses obviously wrong files rather than wiping data. */
  function importJson(text) {
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: 'That file is not valid JSON.' };
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.settings || !parsed.plan) {
      return { ok: false, error: 'That does not look like a Mealwise backup.' };
    }
    update(function () { state = merge(defaults(), parsed); });
    return { ok: true };
  }

  function reset() {
    update(function () { state = defaults(); });
  }

  global.Store = {
    SLOTS: SLOTS,
    hasLocalStorage: hasLocalStorage,
    get state() { return state; },
    get settings() { return state.settings; },
    load: load,
    save: save,
    update: update,
    subscribe: subscribe,
    syncPricing: syncPricing,
    iso: iso, parseIso: parseIso, weekStart: weekStart, addDays: addDays,
    weekDates: weekDates, dayLabel: dayLabel, dateLabel: dateLabel,
    getMeal: getMeal, setMeal: setMeal, entriesForDates: entriesForDates,
    allRecipes: allRecipes, getRecipe: getRecipe,
    exportJson: exportJson, importJson: importJson, reset: reset,
    defaults: defaults
  };
})(typeof window !== 'undefined' ? window : globalThis);
