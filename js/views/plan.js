/* views/plan.js — the weekly meal grid.
 *
 * Seven days by four slots. Each day shows how close it lands to your calorie
 * and protein targets, and the week header shows projected spend against budget.
 */
(function (global) {
  'use strict';

  var h = global.UI.h, UI = global.UI, S = global.Store, P = global.Pricing, U = global.Units;

  var SLOT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
  var currentStart = null;

  function start() {
    if (!currentStart) currentStart = S.weekStart(new Date());
    return currentStart;
  }

  function render(root) {
    var dates = S.weekDates(start());
    var profiles = global.Planner.profile(S.allRecipes());
    var settings = S.settings;

    root.appendChild(weekHeader(dates, profiles, settings));

    // Nothing planned yet: make the first action obvious rather than showing
    // an empty grid and hoping the user works it out.
    var anyPlanned = dates.some(function (d) { return S.state.plan[d]; });
    if (!anyPlanned) {
      root.appendChild(h('div.banner.info',
        h('strong', 'Nothing planned this week. '),
        'Hit ', h('strong', 'Auto-fill week'), ' to get a full 7 days built around your ',
        'calorie and protein targets at the lowest cost, then swap anything you don\'t fancy.'));
    }

    var grid = h('div.days');
    dates.forEach(function (d) { grid.appendChild(dayCard(d, profiles, settings)); });
    root.appendChild(grid);

    root.appendChild(h('p.tiny.faint', { style: { marginTop: '1rem' } },
      'Costs here are pro-rata — the share of each packet a meal actually uses. ' +
      'The Shop tab shows what you really pay at the till, which is usually less ' +
      'per meal because packets get shared across the week.'));
  }

  function weekHeader(dates, profiles, settings) {
    var entries = S.entriesForDates(dates);
    var list = P.buildShoppingList(entries, S.state.pantry, settings.enabledStores);
    var spend = list.total;
    var budget = settings.weeklyBudget || 0;

    var label = S.dateLabel(dates[0]) + ' – ' + S.dateLabel(dates[6]);

    var head = h('div.card.tight',
      h('div.week-head',
        h('button.btn.sm', { onclick: function () { shift(-7); } }, '‹'),
        h('div.grow', h('strong', label),
          h('div.tiny.faint', isThisWeek() ? 'This week' : '')),
        h('button.btn.sm', { onclick: function () { shift(7); } }, '›'),
        h('button.btn.sm', { onclick: goToday }, 'Today')),

      h('div.spread', { style: { marginBottom: '.4rem' } },
        h('div',
          h('div.small.muted', 'Projected shop'),
          h('div', h('strong.num', { style: { fontSize: '1.25rem' } }, UI.money(spend)),
            budget ? h('span.small.faint', ' of ' + UI.money(budget)) : null)),
        h('div.right',
          budget && spend > budget
            ? h('span.pill.warn', UI.money(spend - budget) + ' over')
            : budget ? h('span.pill.accent', UI.money(budget - spend) + ' left') : null)),

      budget ? UI.bar(spend, budget) : null,

      h('div.row.wrap', { style: { marginTop: '.75rem' } },
        h('button.btn.primary', { onclick: autoFill }, 'Auto-fill week'),
        h('button.btn', { onclick: copyLastWeek }, 'Copy last week'),
        h('button.btn.ghost', { onclick: clearWeek }, 'Clear')));

    return head;
  }

  function isThisWeek() {
    return S.iso(S.weekStart(new Date())) === S.iso(start());
  }

  function shift(days) {
    currentStart = S.addDays(start(), days);
    global.App.rerender();
  }

  function goToday() {
    currentStart = S.weekStart(new Date());
    global.App.rerender();
  }

  function dayCard(date, profiles, settings) {
    var today = S.iso(new Date()) === date;
    var totals = global.Planner.dayTotals(S.state.plan[date], profiles);

    var slots = h('div.slots');
    S.SLOTS.forEach(function (slot) {
      slots.appendChild(slotButton(date, slot, profiles));
    });

    var kcalTarget = settings.dailyKcal || 0;
    var proteinTarget = settings.dailyProtein || 0;

    return h('div.day' + (today ? '.today' : ''),
      h('header', h('span.dn', S.dayLabel(date)), h('span.dd', S.dateLabel(date))),
      slots,
      h('footer',
        h('div.spread',
          h('span', Math.round(totals.kcal) + ' kcal'),
          h('span.faint', kcalTarget ? 'of ' + kcalTarget : '')),
        kcalTarget ? UI.bar(totals.kcal, kcalTarget, 'thin') : null,
        h('div.spread',
          h('span', Math.round(totals.protein) + 'g protein'),
          h('span.faint', proteinTarget ? 'of ' + proteinTarget + 'g' : '')),
        proteinTarget ? UI.bar(totals.protein, proteinTarget, 'thin') : null));
  }

  function slotButton(date, slot, profiles) {
    var meal = S.getMeal(date, slot);

    if (!meal) {
      return h('button.slot.empty-slot', { onclick: function () { openPicker(date, slot); } },
        h('span.lbl', SLOT_LABELS[slot]),
        h('span.nm', '+ add'));
    }

    var recipe = S.getRecipe(meal.recipeId);
    if (!recipe) {
      return h('button.slot', { onclick: function () { openPicker(date, slot); } },
        h('span.lbl', SLOT_LABELS[slot]),
        h('span.nm.faint', 'Missing recipe'));
    }

    var prof = profiles[recipe.id];
    var m = prof ? U.scaleMacros(prof.macros, meal.servings || 1) : U.emptyMacros();

    return h('button.slot.filled' + (meal.leftoverOf ? '.leftover' : ''),
      { onclick: function () { openMealMenu(date, slot); } },
      h('span.lbl', SLOT_LABELS[slot], meal.leftoverOf ? ' · leftover' : ''),
      h('span.nm', recipe.name),
      h('span.meta', Math.round(m.kcal) + ' kcal · ' + Math.round(m.protein) + 'g P' +
        (prof && !meal.leftoverOf ? ' · ' + UI.money(prof.perServe * (meal.servings || 1)) : '')));
  }

  /* ─────────────────────────── meal actions ─────────────────────────── */

  function openMealMenu(date, slot) {
    var meal = S.getMeal(date, slot);
    // Defensive: the slot could have been cleared elsewhere between this
    // button rendering and being clicked (e.g. removeLinkedLeftovers firing
    // from another tap in the same render pass). Treat a vanished meal as an
    // empty slot rather than crashing on meal.recipeId below.
    if (!meal) { openPicker(date, slot); return; }
    var recipe = S.getRecipe(meal.recipeId);

    UI.modal(recipe ? recipe.name : 'Meal', function (body, close) {
      if (meal.leftoverOf) {
        body.appendChild(h('div.banner.info',
          'This is a leftover portion from ' +
          S.dayLabel(meal.leftoverOf.split(':')[0]) + '\'s dinner. It is already ' +
          'paid for and shopped for, so it adds nothing to your list.'));
      }

      body.appendChild(h('label.field',
        h('span', 'Servings'),
        h('input', {
          type: 'number', min: '0.5', step: '0.5', value: String(meal.servings || 1),
          onchange: function (e) {
            var v = parseFloat(e.target.value);
            if (v > 0) {
              S.setMeal(date, slot, Object.assign({}, meal, { servings: v }));
              close(); global.App.rerender();
            }
          }
        })));

      body.appendChild(h('div.stack',
        recipe ? h('button.btn.primary', {
          onclick: function () { close(); global.location.hash = '#/cook/' + encodeURIComponent(recipe.id) +
            '?servings=' + (meal.servings || 1); }
        }, 'Cook this') : null,
        recipe ? h('button.btn', {
          onclick: function () { close(); global.RecipesView.openDetail(recipe.id); }
        }, 'View recipe') : null,
        h('button.btn', {
          onclick: function () { close(); openPicker(date, slot); }
        }, 'Swap for something else'),
        h('button.btn.danger', {
          onclick: function () {
            S.setMeal(date, slot, null);
            removeLinkedLeftovers(date, slot);
            close(); global.App.rerender();
          }
        }, 'Remove from plan')));
    });
  }

  /** Removing a cooked meal must also remove the leftover it was feeding. */
  function removeLinkedLeftovers(date, slot) {
    var key = date + ':' + slot;
    Object.keys(S.state.plan).forEach(function (d) {
      S.SLOTS.forEach(function (sl) {
        var m = S.state.plan[d] && S.state.plan[d][sl];
        if (m && m.leftoverOf === key) S.setMeal(d, sl, null);
      });
    });
  }

  /* ─────────────────────────── recipe picker ─────────────────────────── */

  function openPicker(date, slot) {
    var all = S.allRecipes();
    var profiles = global.Planner.profile(all);

    UI.modal('Choose ' + SLOT_LABELS[slot].toLowerCase() + ' · ' + S.dayLabel(date) +
             ' ' + S.dateLabel(date), function (body, close) {

      var results = h('div.rgrid');
      var query = '';
      var onlyThisMeal = true;

      function refresh() {
        UI.clear(results);
        var q = query.trim().toLowerCase();

        var enabledProteins = S.settings.enabledProteins || {};
        var matches = all.filter(function (r) {
          if (!global.Proteins.recipeAllowed(r, enabledProteins)) return false;
          if (onlyThisMeal && r.meals.indexOf(slot) === -1) return false;
          if (!q) return true;
          return r.name.toLowerCase().indexOf(q) !== -1 ||
                 (r.tags || []).some(function (t) { return t.indexOf(q) !== -1; });
        });

        // Best protein-per-dollar first — the ranking that suits the goal.
        matches.sort(function (a, b) {
          var pa = profiles[a.id], pb = profiles[b.id];
          return (pb ? pb.proteinPerDollar : 0) - (pa ? pa.proteinPerDollar : 0);
        });

        if (!matches.length) {
          results.appendChild(h('div.empty', 'Nothing matches “' + query + '”.'));
          return;
        }

        matches.forEach(function (r) {
          results.appendChild(recipeCard(r, profiles[r.id], function () {
            assign(date, slot, r);
            close();
          }));
        });
      }

      body.appendChild(h('input', {
        type: 'text', placeholder: 'Search recipes…',
        oninput: function (e) { query = e.target.value; refresh(); }
      }));

      body.appendChild(h('label.row.small.muted', { style: { margin: '.6rem 0' } },
        h('input', {
          type: 'checkbox', checked: true, style: { width: 'auto' },
          onchange: function (e) { onlyThisMeal = e.target.checked; refresh(); }
        }),
        'Only show ' + SLOT_LABELS[slot].toLowerCase() + ' recipes'));

      body.appendChild(results);
      refresh();
    });
  }

  function recipeCard(r, prof, onClick) {
    return h('button.rcard', { onclick: onClick },
      h('div.nm', r.name),
      h('div.stats',
        h('span', h('b', prof ? UI.money(prof.perServe) : '—'), '/serve'),
        h('span', h('b', prof ? Math.round(prof.macros.kcal) : '—'), ' kcal'),
        h('span', h('b', prof ? Math.round(prof.macros.protein) : '—'), 'g P')),
      h('div.row.wrap', { style: { gap: '.25rem' } },
        h('span.pill', r.timeMins + ' min'),
        (r.tags || []).slice(0, 2).map(function (t) { return h('span.pill', t); })));
  }

  /**
   * Assigning a dinner offers to place the spare serving as tomorrow's lunch —
   * the single most useful habit when you're cooking for one.
   */
  function assign(date, slot, recipe) {
    var servings = S.settings.defaultServings || 1;
    var baseServings = recipe.baseServings || 1;
    var spare = baseServings - servings;
    var next = S.iso(S.addDays(S.parseIso(date), 1));
    var spawnsLeftover = S.settings.autoLeftovers && slot === 'dinner' &&
                          spare > 0 && !S.getMeal(next, 'lunch');

    // A dinner that spawns a leftover has to be shopped for as a full batch
    // — see planner.js's fillWeek Pass 1 for why: there is no way to buy a
    // fraction of a recipe's ingredients and still end up with the leftover
    // portion this plan is about to promise for tomorrow's lunch.
    var dinnerEntry = { recipeId: recipe.id, servings: servings, cooked: false };
    if (spawnsLeftover) dinnerEntry.batchServings = baseServings;
    S.setMeal(date, slot, dinnerEntry);

    if (spawnsLeftover) {
      S.setMeal(next, 'lunch', {
        recipeId: recipe.id,
        servings: Math.min(spare, servings),
        leftoverOf: date + ':dinner',
        cooked: false
      });
      UI.toast('Spare serving saved as ' + S.dayLabel(next) + ' lunch');
    }
    global.App.rerender();
  }

  /* ─────────────────────────── bulk actions ─────────────────────────── */

  var seed = 1;

  function autoFill() {
    var dates = S.weekDates(start());
    var planned = dates.filter(function (d) { return S.state.plan[d]; }).length;

    function go() {
      seed = (seed + Math.floor(Math.random() * 10000)) | 0;
      var res = global.Planner.fillWeek(dates, S.allRecipes(), S.settings, seed);
      S.update(function (st) {
        dates.forEach(function (d) {
          if (res.plan[d] && Object.keys(res.plan[d]).length) st.plan[d] = res.plan[d];
        });
      });
      if (res.notes.length) UI.toast(res.notes[0]);
      global.App.rerender();
    }

    if (planned) {
      UI.confirmDialog('Replace this week?',
        'This will overwrite the ' + planned + ' day' + (planned > 1 ? 's' : '') +
        ' you have already planned.', 'Replace', go);
    } else {
      go();
    }
  }

  function copyLastWeek() {
    var dates = S.weekDates(start());
    var prev = S.weekDates(S.addDays(start(), -7));
    var found = prev.filter(function (d) { return S.state.plan[d]; }).length;

    if (!found) { UI.toast('Nothing planned last week to copy'); return; }

    S.update(function (st) {
      prev.forEach(function (src, i) {
        if (!st.plan[src]) return;
        var copy = {};
        Object.keys(st.plan[src]).forEach(function (slot) {
          var m = st.plan[src][slot];
          copy[slot] = Object.assign({}, m, { cooked: false });
          // Re-point leftover links at the new week, or they'd reference last week.
          if (m.leftoverOf) {
            var srcDate = m.leftoverOf.split(':')[0];
            var offset = prev.indexOf(srcDate);
            copy[slot].leftoverOf = offset >= 0
              ? dates[offset] + ':' + m.leftoverOf.split(':')[1]
              : undefined;
            if (!copy[slot].leftoverOf) delete copy[slot].leftoverOf;
          }
        });
        st.plan[dates[i]] = copy;
      });
    });
    UI.toast('Copied last week');
    global.App.rerender();
  }

  function clearWeek() {
    var dates = S.weekDates(start());
    if (!dates.some(function (d) { return S.state.plan[d]; })) return;
    UI.confirmDialog('Clear this week?', 'Every meal planned this week will be removed.',
      'Clear week', function () {
        S.update(function (st) { dates.forEach(function (d) { delete st.plan[d]; }); });
        global.App.rerender();
      });
  }

  global.PlanView = {
    render: render,
    openPicker: openPicker,
    recipeCard: recipeCard,
    currentDates: function () { return S.weekDates(start()); }
  };
})(window);
