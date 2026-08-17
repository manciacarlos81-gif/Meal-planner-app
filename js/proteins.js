/* proteins.js — classifies each recipe by the meat/fish it actually contains.
 *
 * Derived from ingredients, not a hand-applied tag, so it can never drift out
 * of sync with what a recipe was edited to include — and so a recipe its
 * author forgot to tag 'vegetarian' still gets classified correctly (this
 * caught one: breakfast-burrito had no meat and no vegetarian tag either).
 */
(function (global) {
  'use strict';

  // itemId -> protein type. Anything not listed here isn't "a meat" for
  // filtering purposes — eggs, dairy and legumes stay outside this system;
  // they aren't what someone means by "I don't eat X" here.
  var ITEM_PROTEIN_TYPE = {
    'chicken-thigh': 'chicken', 'chicken-breast': 'chicken',
    'chicken-drumstick': 'chicken', 'chicken-whole': 'chicken',
    'beef-mince': 'beef', 'beef-mince-lean': 'beef', 'beef-chuck': 'beef',
    'beef-rump': 'beef', 'sucuk': 'beef',           // sucuk is a beef sausage
    'lamb-mince': 'lamb',
    'turkey-mince': 'turkey',
    'tuna-tin': 'seafood', 'salmon-tin': 'seafood', 'salmon-fillet': 'seafood',
    'white-fish': 'seafood', 'prawns-frozen': 'seafood'
  };

  // The set surfaced as a toggle in Settings. A type can be classified
  // correctly (e.g. 'turkey') without appearing here — it just stays
  // untoggleable until a recipe actually uses it, so there's never a switch
  // in the UI that provably does nothing.
  var TOGGLEABLE = ['chicken', 'beef', 'lamb', 'seafood', 'vegetarian'];

  /**
   * Every protein type a recipe's ingredients touch, e.g. ['chicken'].
   * A recipe with none of the tracked meat/fish items is ['vegetarian'].
   */
  function recipeProteinTypes(recipe) {
    var types = {};
    (recipe.ingredients || []).forEach(function (ing) {
      var t = ITEM_PROTEIN_TYPE[ing.itemId];
      if (t) types[t] = true;
    });
    var keys = Object.keys(types);
    return keys.length ? keys : ['vegetarian'];
  }

  /**
   * Whether a recipe is allowed under the enabled-proteins setting.
   *
   * A type missing from `enabled` (not yet toggleable, or a future addition
   * like 'turkey') is treated as allowed — this must never silently hide a
   * recipe just because there's no switch for its protein yet.
   *
   * This is an EXCLUSION filter ("don't feed me X"), so a recipe touching
   * multiple types (rare) needs every one of them enabled: any disqualifying
   * ingredient disqualifies the whole recipe, not just that ingredient.
   */
  function recipeAllowed(recipe, enabled) {
    enabled = enabled || {};
    return recipeProteinTypes(recipe).every(function (t) {
      return enabled[t] !== false;
    });
  }

  global.Proteins = {
    ITEM_PROTEIN_TYPE: ITEM_PROTEIN_TYPE,
    TOGGLEABLE: TOGGLEABLE,
    recipeProteinTypes: recipeProteinTypes,
    recipeAllowed: recipeAllowed
  };
})(typeof window !== 'undefined' ? window : globalThis);
