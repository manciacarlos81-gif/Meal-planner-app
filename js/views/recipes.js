/* views/recipes.js — recipe library, detail view, and the custom recipe editor.
 *
 * Cards are ranked by protein per dollar by default, because that is the metric
 * that actually serves the goal here: gaining weight on a limited budget.
 */
(function (global) {
  'use strict';

  var h = global.UI.h, UI = global.UI, S = global.Store,
      P = global.Pricing, U = global.Units, C = global.CATALOGUE;

  var filter = { q: '', meal: 'all', sort: 'protein-value', tag: 'all' };

  var SORTS = {
    'protein-value': { label: 'Best protein per $', fn: function (a, b, p) {
      return p[b.id].proteinPerDollar - p[a.id].proteinPerDollar; } },
    'cheapest': { label: 'Cheapest per serve', fn: function (a, b, p) {
      return p[a.id].perServe - p[b.id].perServe; } },
    'kcal': { label: 'Most calories', fn: function (a, b, p) {
      return p[b.id].macros.kcal - p[a.id].macros.kcal; } },
    'protein': { label: 'Most protein', fn: function (a, b, p) {
      return p[b.id].macros.protein - p[a.id].macros.protein; } },
    'quick': { label: 'Quickest', fn: function (a, b) { return a.timeMins - b.timeMins; } },
    'name': { label: 'A–Z', fn: function (a, b) { return a.name.localeCompare(b.name); } }
  };

  function render(root) {
    var all = S.allRecipes();
    var profiles = global.Planner.profile(all);

    root.appendChild(h('div.spread', { style: { marginBottom: '.75rem' } },
      h('h1', 'Recipes'),
      h('button.btn.sm.primary', { onclick: function () { editRecipe(null); } }, '+ New recipe')));

    /* filter bar */
    var tags = {};
    all.forEach(function (r) { (r.tags || []).forEach(function (t) { tags[t] = true; }); });

    root.appendChild(h('div.card.tight',
      h('input', {
        type: 'text', placeholder: 'Search recipes…', value: filter.q,
        oninput: function (e) { filter.q = e.target.value; refresh(); }
      }),
      h('div.row.wrap', { style: { marginTop: '.5rem' } },
        select(['all', 'breakfast', 'lunch', 'dinner', 'snack'], filter.meal, function (v) {
          filter.meal = v; refresh();
        }, function (v) { return v === 'all' ? 'All meals' : cap(v); }),
        select(Object.keys(SORTS), filter.sort, function (v) {
          filter.sort = v; refresh();
        }, function (v) { return SORTS[v].label; }),
        select(['all'].concat(Object.keys(tags).sort()), filter.tag, function (v) {
          filter.tag = v; refresh();
        }, function (v) { return v === 'all' ? 'All tags' : v; }))));

    var grid = h('div.rgrid');
    root.appendChild(grid);

    function refresh() {
      UI.clear(grid);
      var q = filter.q.trim().toLowerCase();

      var matches = all.filter(function (r) {
        if (filter.meal !== 'all' && r.meals.indexOf(filter.meal) === -1) return false;
        if (filter.tag !== 'all' && (r.tags || []).indexOf(filter.tag) === -1) return false;
        if (!q) return true;
        return r.name.toLowerCase().indexOf(q) !== -1 ||
               (r.tags || []).some(function (t) { return t.indexOf(q) !== -1; });
      });

      matches.sort(function (a, b) { return SORTS[filter.sort].fn(a, b, profiles); });

      if (!matches.length) {
        grid.appendChild(h('div.empty', 'No recipes match those filters.'));
        return;
      }
      matches.forEach(function (r) {
        grid.appendChild(global.PlanView.recipeCard(r, profiles[r.id], function () {
          openDetail(r.id);
        }));
      });
    }

    refresh();
  }

  function select(values, current, onChange, labelFn) {
    return h('select', {
      style: { width: 'auto' },
      onchange: function (e) { onChange(e.target.value); }
    }, values.map(function (v) {
      return h('option', { value: v, selected: v === current }, labelFn ? labelFn(v) : v);
    }));
  }

  function cap(s) { return s[0].toUpperCase() + s.slice(1); }

  /* ─────────────────────────────── detail ─────────────────────────────── */

  function openDetail(recipeId) {
    var r = S.getRecipe(recipeId);
    if (!r) return;
    var cost = P.recipeCost(r);

    UI.modal(r.name, function (body, close) {
      body.appendChild(h('div.row.wrap', { style: { marginBottom: '.75rem' } },
        h('span.pill.accent', UI.money(cost.perServe) + ' per serve'),
        h('span.pill', r.timeMins + ' min'),
        h('span.pill', 'makes ' + r.baseServings),
        (r.tags || []).map(function (t) { return h('span.pill', t); })));

      /* macros per serve */
      var m = cost.macrosPerServe;
      body.appendChild(h('div.card.tight',
        h('div.spread',
          macroCell('Calories', Math.round(m.kcal), 'kcal'),
          macroCell('Protein', Math.round(m.protein), 'g'),
          macroCell('Carbs', Math.round(m.carbs), 'g'),
          macroCell('Fat', Math.round(m.fat), 'g')),
        h('div.tiny.faint', { style: { marginTop: '.5rem' } },
          'Per serve, calculated from the ingredients below.')));

      /* ingredients with per-item cost and where to buy */
      var ingWrap = h('div.card.tight', h('h3', 'Ingredients'),
        h('div.tiny.faint', { style: { marginBottom: '.4rem' } },
          'for ' + r.baseServings + ' serving' + (r.baseServings > 1 ? 's' : '')));

      r.ingredients.forEach(function (ing) {
        var item = C.get(ing.itemId);
        if (!item) {
          ingWrap.appendChild(h('div.line', h('div.grow.nm', ing.itemId),
            h('div.tiny.faint', 'unknown item')));
          return;
        }
        var best = P.cheapestStore(item);
        var c = best ? U.costOf(ing.qty, ing.unit, best.entry, item) : null;

        ingWrap.appendChild(h('div.line',
          h('div.grow',
            h('div.nm', U.prettyQty(ing.qty, ing.unit) + ' ' + item.name.toLowerCase()),
            best ? h('div.sub', 'cheapest at ' + (C.store(best.storeId) || {}).name) : null),
          h('div.right', h('div.small.num', c === null ? '—' : UI.money(c)))));
      });
      body.appendChild(ingWrap);

      /* method */
      var steps = h('div.card.tight', h('h3', 'Method'));
      r.steps.forEach(function (s, i) {
        steps.appendChild(h('div.row', { style: { alignItems: 'flex-start', padding: '.35rem 0' } },
          h('span.pill', String(i + 1)),
          h('div.grow.small', s)));
      });
      body.appendChild(steps);

      body.appendChild(h('div.stack',
        h('button.btn.primary', {
          onclick: function () { close(); addToPlan(r); }
        }, 'Add to plan'),
        h('button.btn', {
          onclick: function () {
            close();
            global.location.hash = '#/cook/' + encodeURIComponent(r.id);
          }
        }, 'Cook this now'),
        h('button.btn.ghost', {
          onclick: function () { close(); editRecipe(r); }
        }, isCustom(r) ? 'Edit recipe' : 'Duplicate & edit'),
        isCustom(r) ? h('button.btn.danger', {
          onclick: function () {
            close();
            UI.confirmDialog('Delete recipe?', '“' + r.name + '” will be removed.', 'Delete',
              function () {
                S.update(function (st) {
                  st.customRecipes = st.customRecipes.filter(function (x) { return x.id !== r.id; });
                });
                global.App.rerender();
              });
          }
        }, 'Delete recipe') : null));
    });
  }

  function macroCell(label, value, unit) {
    return h('div',
      h('div.tiny.faint', label),
      h('div', h('strong.num', String(value)), h('span.tiny.faint', ' ' + unit)));
  }

  function isCustom(r) {
    return (S.state.customRecipes || []).some(function (x) { return x.id === r.id; });
  }

  /* ─────────────────────────── add to plan ─────────────────────────── */

  function addToPlan(r) {
    var dates = global.PlanView.currentDates();

    UI.modal('Add “' + r.name + '” to the plan', function (body, close) {
      var dateSel = h('select', dates.map(function (d) {
        return h('option', { value: d }, S.dayLabel(d) + ' ' + S.dateLabel(d));
      }));
      var slotSel = h('select', S.SLOTS.map(function (s) {
        return h('option', { value: s, selected: r.meals.indexOf(s) !== -1 }, cap(s));
      }));
      var servingsInput = h('input', {
        type: 'number', min: '0.5', step: '0.5',
        value: String(S.settings.defaultServings || 1)
      });

      body.appendChild(h('label.field', h('span', 'Day'), dateSel));
      body.appendChild(h('label.field', h('span', 'Meal'), slotSel));
      body.appendChild(h('label.field', h('span', 'Servings'), servingsInput));

      body.appendChild(h('button.btn.primary', {
        onclick: function () {
          var servings = parseFloat(servingsInput.value) || 1;
          S.setMeal(dateSel.value, slotSel.value, {
            recipeId: r.id, servings: servings, cooked: false
          });
          UI.toast('Added to ' + S.dayLabel(dateSel.value));
          close();
          global.App.rerender();
        }
      }, 'Add to plan'));
    });
  }

  /* ─────────────────────────── recipe editor ─────────────────────────── */

  /**
   * Writing your own recipe. Ingredients are chosen from the catalogue rather
   * than typed free-hand, which is what makes cost and macros computable at all
   * — a free-text "1 onion" can't be priced or counted.
   */
  function editRecipe(existing) {
    var isEdit = existing && isCustom(existing);
    var draft = existing
      ? JSON.parse(JSON.stringify(existing))
      : { id: '', name: '', meals: ['dinner'], baseServings: 2, timeMins: 30,
          tags: [], ingredients: [], steps: [''] };

    if (existing && !isEdit) {
      draft.name = existing.name + ' (my version)';
      draft.id = '';
    }

    UI.modal(isEdit ? 'Edit recipe' : 'New recipe', function (body, close) {
      var nameInput = h('input', { type: 'text', value: draft.name, placeholder: 'Recipe name' });
      var servingsInput = h('input', { type: 'number', min: '1', step: '1',
        value: String(draft.baseServings) });
      var timeInput = h('input', { type: 'number', min: '1', step: '5',
        value: String(draft.timeMins) });

      body.appendChild(h('label.field', h('span', 'Name'), nameInput));
      body.appendChild(h('div.row',
        h('label.field.grow', h('span', 'Serves'), servingsInput),
        h('label.field.grow', h('span', 'Minutes'), timeInput)));

      /* meal slots */
      var mealsWrap = h('div.row.wrap');
      S.SLOTS.forEach(function (slot) {
        var cb = h('input', {
          type: 'checkbox', style: { width: 'auto' },
          checked: draft.meals.indexOf(slot) !== -1,
          onchange: function (e) {
            if (e.target.checked) { if (draft.meals.indexOf(slot) === -1) draft.meals.push(slot); }
            else draft.meals = draft.meals.filter(function (m) { return m !== slot; });
          }
        });
        mealsWrap.appendChild(h('label.row.small', { style: { marginRight: '.75rem' } },
          cb, cap(slot)));
      });
      body.appendChild(h('label.field', h('span', 'Suitable for'), mealsWrap));

      /* ingredients */
      var ingList = h('div.stack');
      var costLine = h('div.small.muted');

      function refreshCost() {
        var temp = { ingredients: draft.ingredients, baseServings: +servingsInput.value || 1 };
        var c = P.recipeCost(temp);
        costLine.textContent = draft.ingredients.length
          ? UI.money(c.perServe) + ' per serve · ' + Math.round(c.macrosPerServe.kcal) +
            ' kcal · ' + Math.round(c.macrosPerServe.protein) + 'g protein'
          : 'Add ingredients to see cost and macros.';
      }

      function drawIngredients() {
        UI.clear(ingList);
        draft.ingredients.forEach(function (ing, idx) {
          var item = C.get(ing.itemId);
          ingList.appendChild(h('div.row',
            h('div.grow.small', item ? item.name : ing.itemId,
              h('span.faint', ' — ' + U.prettyQty(ing.qty, ing.unit))),
            h('button.btn.sm.ghost', {
              onclick: function () {
                draft.ingredients.splice(idx, 1);
                drawIngredients(); refreshCost();
              }
            }, '✕')));
        });
        if (!draft.ingredients.length) {
          ingList.appendChild(h('div.tiny.faint', 'No ingredients yet.'));
        }
      }

      var itemSelect = h('select',
        [h('option', { value: '' }, 'Choose an ingredient…')].concat(
          C.items.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
            .map(function (it) { return h('option', { value: it.id }, it.name); })));
      var qtyInput = h('input', { type: 'number', min: '0', step: 'any', placeholder: 'Qty' });
      var unitSelect = h('select',
        ['g', 'kg', 'ml', 'l', 'each', 'tbsp', 'tsp', 'cup', 'slice', 'clove']
          .map(function (u) { return h('option', { value: u }, u); }));

      body.appendChild(h('label.field', h('span', 'Ingredients'), ingList));
      body.appendChild(h('div.row',
        h('div.grow', itemSelect),
        h('div', { style: { width: '5rem' } }, qtyInput),
        h('div', { style: { width: '5.5rem' } }, unitSelect),
        h('button.btn.sm', {
          onclick: function () {
            var id = itemSelect.value, qty = parseFloat(qtyInput.value);
            if (!id || !(qty > 0)) { UI.toast('Pick an ingredient and a quantity'); return; }
            var item = C.get(id);
            // Reject a unit this item can't be measured in, rather than
            // silently adding an ingredient that costs nothing.
            if (U.convertItem(qty, unitSelect.value, item.baseUnit, item) === null) {
              UI.toast('Can\'t measure ' + item.name + ' in ' + unitSelect.value +
                       ' — try ' + item.baseUnit);
              return;
            }
            draft.ingredients.push({ itemId: id, qty: qty, unit: unitSelect.value });
            qtyInput.value = '';
            drawIngredients(); refreshCost();
          }
        }, 'Add')));
      body.appendChild(h('div', { style: { margin: '.5rem 0 1rem' } }, costLine));

      /* steps */
      var stepsWrap = h('div.stack');
      function drawSteps() {
        UI.clear(stepsWrap);
        draft.steps.forEach(function (s, i) {
          var ta = h('textarea', { rows: '2', value: s,
            oninput: function (e) { draft.steps[i] = e.target.value; } });
          stepsWrap.appendChild(h('div.row', { style: { alignItems: 'flex-start' } },
            h('span.pill', String(i + 1)),
            h('div.grow', ta),
            h('button.btn.sm.ghost', {
              onclick: function () { draft.steps.splice(i, 1); drawSteps(); }
            }, '✕')));
        });
      }
      body.appendChild(h('label.field', h('span', 'Method'), stepsWrap));
      body.appendChild(h('button.btn.sm', {
        onclick: function () { draft.steps.push(''); drawSteps(); }
      }, '+ Add step'));

      drawIngredients(); drawSteps(); refreshCost();
      servingsInput.addEventListener('input', refreshCost);

      /* save */
      body.appendChild(h('div.row', { style: { marginTop: '1rem' } },
        h('button.btn.primary.grow', {
          onclick: function () {
            var name = nameInput.value.trim();
            if (!name) { UI.toast('Give the recipe a name'); return; }
            if (!draft.ingredients.length) { UI.toast('Add at least one ingredient'); return; }
            if (!draft.meals.length) { UI.toast('Pick at least one meal slot'); return; }

            draft.name = name;
            draft.baseServings = Math.max(1, parseInt(servingsInput.value, 10) || 1);
            draft.timeMins = Math.max(1, parseInt(timeInput.value, 10) || 30);
            draft.steps = draft.steps.filter(function (s) { return s.trim(); });
            if (!draft.steps.length) draft.steps = ['Cook and serve.'];

            S.update(function (st) {
              if (isEdit) {
                st.customRecipes = st.customRecipes.map(function (x) {
                  return x.id === draft.id ? draft : x;
                });
              } else {
                draft.id = 'custom-' + Date.now().toString(36);
                st.customRecipes.push(draft);
              }
            });
            UI.toast(isEdit ? 'Recipe updated' : 'Recipe saved');
            close(); global.App.rerender();
          }
        }, isEdit ? 'Save changes' : 'Save recipe'),
        h('button.btn', { onclick: close }, 'Cancel')));
    });
  }

  global.RecipesView = { render: render, openDetail: openDetail, editRecipe: editRecipe };
})(window);
