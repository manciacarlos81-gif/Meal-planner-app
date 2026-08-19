/* planner.js — the automatic week filler.
 *
 * Deterministic and greedy. No AI, no API key, no network: it runs offline and
 * gives the same answer for the same seed, so "re-roll" is repeatable and a
 * plan you liked can be reproduced.
 *
 * What it optimises for, in the order that matters for this brief:
 *   1. hitting the daily calorie and protein targets (the point of the plan)
 *   2. protein and calories per dollar (the budget constraint)
 *   3. reusing ingredients already bought this week — buying one 2 kg bag of
 *      rice across four meals is dramatically cheaper than four small buys, and
 *      this is the single biggest lever on the weekly total
 *   4. variety, so the week isn't the same two dinners over and over
 *
 * A note on cost during planning: it scores using pro-rata ingredient cost.
 * The true weekly number comes from the Shop view, which rounds up to whole
 * packets and shares them across recipes — that figure is usually LOWER per
 * meal than the sum of the parts, because the surplus gets used elsewhere.
 */
(function (global) {
  'use strict';

  var U = global.Units, P = global.Pricing;

  /* A small seeded PRNG (mulberry32) so re-rolls vary but stay reproducible. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Cost and macros for every candidate, computed once per fill. */
  function profile(recipes) {
    var out = {};
    recipes.forEach(function (r) {
      var c = P.recipeCost(r);
      out[r.id] = {
        recipe: r,
        cost: c.total,
        perServe: c.perServe,
        macros: c.macrosPerServe,
        proteinPerDollar: c.total > 0 ? c.macros.protein / c.total : 0,
        kcalPerDollar: c.total > 0 ? c.macros.kcal / c.total : 0,
        items: r.ingredients.map(function (i) { return i.itemId; })
      };
    });
    return out;
  }

  function reuseFraction(prof, basket) {
    if (!prof.items.length) return 0;
    var hits = prof.items.filter(function (id) { return basket[id]; }).length;
    return hits / prof.items.length;
  }

  /**
   * Score a candidate for a slot. Higher is better.
   * `needKcal` / `needProtein` are what's still missing from the day, so a
   * recipe that fits the remaining gap scores better than one that overshoots.
   */
  function score(prof, ctx) {
    var s = 0;

    // Value for money — normalised so the two metrics are comparable.
    s += prof.proteinPerDollar * 1.6;
    s += (prof.kcalPerDollar / 100) * 1.0;

    // Reusing this week's ingredients is the biggest real saving.
    s += reuseFraction(prof, ctx.basket) * 3.0;

    // Prefer meals that fit the remaining gap rather than blowing past it.
    if (ctx.needKcal > 0) {
      var over = Math.max(0, prof.macros.kcal - ctx.needKcal);
      s -= (over / Math.max(ctx.needKcal, 1)) * 1.2;
    }
    if (ctx.needProtein > 0 && prof.macros.protein > 0) {
      s += Math.min(prof.macros.protein / ctx.needProtein, 1) * 1.5;
    }

    // Variety: discourage repeats, and do it superlinearly. A linear penalty
    // lets a recipe with standout value absorb the cost and colonise the week —
    // once real prices went in, one meal was landing five times in seven days.
    // Squaring the count makes the third and fourth appearance prohibitive.
    var used = ctx.usedCount[prof.recipe.id] || 0;
    if (used) s -= (2.5 * used) + (1.5 * used * used);
    if (ctx.recentIds.indexOf(prof.recipe.id) !== -1) s -= 4.0;

    // Budget pressure: once projected spend passes the cap, weight cheapness hard.
    if (ctx.overBudget) s -= prof.perServe * 0.8;

    return s;
  }

  var SHORTLIST = 5;
  var RANK_WEIGHTS = [5, 4, 3, 2, 1];   // favours the best, never picks a bad one

  /**
   * Choose from a shortlist of the best candidates rather than always taking
   * the single top score.
   *
   * A plain argmax makes every re-roll identical, since the scoring is
   * deterministic. Adding random jitter to the score was the obvious fix but a
   * bad one: the jitter has to be large enough to overcome the variety penalty
   * before it changes anything, and by then it is large enough to promote
   * genuinely worse meals. Ranking first and then sampling the top few keeps
   * quality bounded — the worst you can get is the fifth-best option — while
   * giving real variety between seeds.
   */
  function pick(candidates, profiles, ctx) {
    // Eating the SAME dish twice in one day is excluded, not penalised. It was
    // tried as a score penalty first and wasn't enough: a standout-value recipe
    // (cheap, calorie-dense oats) absorbed the penalty and still landed as both
    // breakfast and snack on the same day. This is a hard rule, not a
    // preference. If filtering empties the pool we fall back to the full pool —
    // repeating beats leaving a meal slot blank.
    var pool = candidates;
    if (ctx.sameDayIds && ctx.sameDayIds.length) {
      var filtered = candidates.filter(function (r) {
        return ctx.sameDayIds.indexOf(r.id) === -1;
      });
      if (filtered.length) pool = filtered;
    }

    var scored = [];
    pool.forEach(function (r) {
      var prof = profiles[r.id];
      if (!prof || !prof.cost) return;
      scored.push({ prof: prof, score: score(prof, ctx) });
    });
    if (!scored.length) return null;

    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored.slice(0, SHORTLIST);

    var total = 0;
    top.forEach(function (_, i) { total += RANK_WEIGHTS[i]; });

    var roll = ctx.rand() * total, acc = 0;
    for (var i = 0; i < top.length; i++) {
      acc += RANK_WEIGHTS[i];
      if (roll < acc) return top[i].prof;
    }
    return top[0].prof;
  }

  /**
   * Fill a week.
   * @param dates    array of 'YYYY-MM-DD', in order
   * @param recipes  candidate pool
   * @param settings { dailyKcal, dailyProtein, weeklyBudget, defaultServings, autoLeftovers }
   * @param seed     integer; change it to re-roll
   * @returns { plan: { date: { slot: entry } }, estimatedCost, notes }
   */
  function fillWeek(dates, recipes, settings, seed) {
    var profiles = profile(recipes);
    var rand = rng(seed || 1);

    var enabledProteins = settings.enabledProteins || {};
    var byMeal = {};
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach(function (m) {
      byMeal[m] = recipes.filter(function (r) {
        return r.meals.indexOf(m) !== -1 && global.Proteins.recipeAllowed(r, enabledProteins);
      });
    });

    var plan = {};
    var basket = {};                 // itemIds already committed this week
    var usedCount = {};
    var recentIds = [];
    var spend = 0;
    var serveDefault = settings.defaultServings || 1;
    var notes = [];

    dates.forEach(function (d) { plan[d] = {}; });

    function commit(date, slot, prof, servings, leftoverOf, batchServings) {
      plan[date][slot] = {
        recipeId: prof.recipe.id,
        servings: servings,
        cooked: false
      };
      if (leftoverOf) plan[date][slot].leftoverOf = leftoverOf;
      if (batchServings) plan[date][slot].batchServings = batchServings;

      if (!leftoverOf) {
        // Only a cooked meal adds to the basket and the bill; a leftover is a
        // portion of something already bought. Charge the full batch cost
        // when one was cooked (batchServings set) — that's what actually gets
        // bought, not just the slice eaten at this slot. Undercounting this
        // was quietly hiding roughly half the true cost of every dinner that
        // spawns a leftover, which is the common case under default settings.
        prof.items.forEach(function (id) { basket[id] = true; });
        spend += prof.perServe * (batchServings || servings);
      }
      usedCount[prof.recipe.id] = (usedCount[prof.recipe.id] || 0) + 1;
      recentIds.push(prof.recipe.id);
      if (recentIds.length > 3) recentIds.shift();
    }

    function ctxFor(needKcal, needProtein, date) {
      return {
        basket: basket, usedCount: usedCount, recentIds: recentIds,
        sameDayIds: date ? idsOn(date) : null,
        needKcal: needKcal, needProtein: needProtein,
        overBudget: spend > (settings.weeklyBudget || Infinity),
        rand: rand
      };
    }

    /** recipeIds already placed on that day, so a dish never repeats in a day. */
    function idsOn(date) {
      var day = plan[date] || {};
      return Object.keys(day).map(function (slot) { return day[slot].recipeId; });
    }

    /* ── Pass 1: dinners. They anchor the week and generate the leftovers. ── */
    dates.forEach(function (date, i) {
      var prof = pick(byMeal.dinner, profiles, ctxFor(settings.dailyKcal * 0.4,
                                                      settings.dailyProtein * 0.4));
      if (!prof) return;

      var serves = prof.recipe.baseServings || 1;
      var spare = serves - serveDefault;
      var next = dates[i + 1];
      var spawnsLeftover = settings.autoLeftovers && spare > 0 &&
                            i + 1 < dates.length && !plan[next].lunch;

      // A dinner that spawns a leftover has to be shopped for as a full
      // batch — there is no way to buy a quarter of a recipe's ingredients
      // and still end up with the leftover portion this plan is about to
      // promise for tomorrow's lunch.
      commit(date, 'dinner', prof, serveDefault, null, spawnsLeftover ? serves : null);

      // Cook once, eat twice: park the spare serve as tomorrow's lunch.
      if (spawnsLeftover) {
        // Clamp to the batch's real spare capacity. If serveDefault is set
        // above half of baseServings (e.g. someone eating 1.5 servings a
        // meal), the leftover can't also claim a full serveDefault or the
        // day ends up crediting more food than the batch actually contains.
        commit(next, 'lunch', prof, Math.min(spare, serveDefault), date + ':dinner');
      }
    });

    /* ── Pass 2: breakfasts. ── */
    dates.forEach(function (date) {
      var prof = pick(byMeal.breakfast, profiles, ctxFor(settings.dailyKcal * 0.28,
                                                         settings.dailyProtein * 0.28, date));
      if (prof) commit(date, 'breakfast', prof, serveDefault);
    });

    /* ── Pass 3: any lunch not already covered by leftovers. ── */
    dates.forEach(function (date) {
      if (plan[date].lunch) return;
      var prof = pick(byMeal.lunch, profiles, ctxFor(settings.dailyKcal * 0.3,
                                                     settings.dailyProtein * 0.3, date));
      if (prof) commit(date, 'lunch', prof, serveDefault);
    });

    /* ── Pass 4: snacks, only where the day is short of target. ── */
    dates.forEach(function (date) {
      var day = dayTotals(plan[date], profiles);
      var gapK = (settings.dailyKcal || 0) - day.kcal;
      var gapP = (settings.dailyProtein || 0) - day.protein;
      if (gapK < 150 && gapP < 15) return;   // close enough, don't force-feed

      var prof = pick(byMeal.snack, profiles, ctxFor(gapK, gapP, date));
      if (prof) commit(date, 'snack', prof, serveDefault);
    });

    if (spend > (settings.weeklyBudget || Infinity)) {
      notes.push('This plan is over your weekly budget. The Shop view will show ' +
                 'the real total, which is usually lower once packs are shared ' +
                 'between meals.');
    }

    return { plan: plan, estimatedCost: spend, notes: notes };
  }

  /** Macro totals for one day's slots. Leftovers still count as eaten. */
  function dayTotals(dayPlan, profiles) {
    var t = U.emptyMacros();
    if (!dayPlan) return t;
    Object.keys(dayPlan).forEach(function (slot) {
      var m = dayPlan[slot];
      if (!m || !m.recipeId) return;
      var prof = profiles[m.recipeId];
      if (!prof) return;
      t = U.addMacros(t, U.scaleMacros(prof.macros, m.servings || 1));
    });
    return t;
  }

  global.Planner = {
    fillWeek: fillWeek,
    profile: profile,
    dayTotals: dayTotals
  };
})(typeof window !== 'undefined' ? window : globalThis);
