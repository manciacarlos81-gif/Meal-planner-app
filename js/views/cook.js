/* views/cook.js — hands-free cooking.
 *
 * Big type, one step at a time, and the screen held awake. You are standing at
 * a stove with wet hands; this view assumes you can barely look at it.
 */
(function (global) {
  'use strict';

  var h = global.UI.h, UI = global.UI, S = global.Store,
      P = global.Pricing, U = global.Units, C = global.CATALOGUE;

  var stepIndex = 0;
  var currentId = null;
  var wakeLock = null;
  var checkedIngredients = {};

  function render(root, params) {
    var recipeId = params.id;
    var recipe = S.getRecipe(recipeId);

    if (!recipe) {
      root.appendChild(h('div.empty',
        h('p', 'That recipe no longer exists.'),
        h('button.btn', { onclick: function () { global.location.hash = '#/recipes'; } },
          'Back to recipes')));
      return;
    }

    // Reset progress when switching to a different recipe.
    if (currentId !== recipeId) {
      currentId = recipeId; stepIndex = 0; checkedIngredients = {};
    }

    var servings = parseFloat(params.servings) || recipe.baseServings || 1;
    var scale = servings / (recipe.baseServings || 1);

    var wrap = h('div.cook');

    wrap.appendChild(h('div.spread', { style: { marginBottom: '.5rem' } },
      h('button.btn.sm.ghost', { onclick: exit }, '‹ Done'),
      h('span.small.faint', recipe.timeMins + ' min')));

    wrap.appendChild(h('h1', recipe.name));

    /* servings control — rescales every quantity live */
    wrap.appendChild(h('div.row', { style: { margin: '.75rem 0' } },
      h('span.small.muted', 'Making'),
      h('button.btn.sm', {
        onclick: function () { setServings(recipe, Math.max(0.5, servings - 0.5)); }
      }, '−'),
      h('strong.num', String(servings) + (servings === 1 ? ' serve' : ' serves')),
      h('button.btn.sm', {
        onclick: function () { setServings(recipe, servings + 0.5); }
      }, '+'),
      scale !== 1 ? h('span.pill.warn', 'scaled from ' + recipe.baseServings) : null));

    /* ingredients checklist */
    var ingCard = h('div.card', h('h3', 'Ingredients'));
    recipe.ingredients.forEach(function (ing, i) {
      var item = C.get(ing.itemId);
      var name = item ? item.name.toLowerCase() : ing.itemId;
      var done = !!checkedIngredients[i];

      ingCard.appendChild(h('label.ing', { style: { opacity: done ? '.45' : '1' } },
        h('input', {
          type: 'checkbox', checked: done, style: { width: 'auto' },
          onchange: function (e) {
            checkedIngredients[i] = e.target.checked;
            global.App.rerender();
          }
        }),
        h('span.grow', { style: { textDecoration: done ? 'line-through' : 'none' } },
          h('strong', U.prettyQty(ing.qty * scale, ing.unit)), ' ', name)));
    });
    wrap.appendChild(ingCard);

    /* the step itself */
    var total = recipe.steps.length;
    var current = recipe.steps[Math.min(stepIndex, total - 1)];

    wrap.appendChild(h('div.card',
      h('div.stepnum', 'Step ' + (stepIndex + 1) + ' of ' + total),
      h('div.step', current),
      h('div.bar', h('i', { style: { width: (((stepIndex + 1) / total) * 100) + '%' } })),
      h('div.row', { style: { marginTop: '1rem' } },
        h('button.btn.grow', {
          disabled: stepIndex === 0,
          onclick: function () { stepIndex = Math.max(0, stepIndex - 1); global.App.rerender(); }
        }, '‹ Back'),
        stepIndex < total - 1
          ? h('button.btn.primary.grow', {
              onclick: function () { stepIndex++; global.App.rerender(); }
            }, 'Next ›')
          : h('button.btn.primary.grow', { onclick: finish }, 'Finished'))));

    /* all steps, for glancing ahead */
    var allSteps = h('div.card', h('h3', 'All steps'));
    recipe.steps.forEach(function (s, i) {
      allSteps.appendChild(h('div.row', {
        style: { alignItems: 'flex-start', padding: '.3rem 0',
                 opacity: i === stepIndex ? '1' : '.55' },
        onclick: function () { stepIndex = i; global.App.rerender(); }
      }, h('span.pill', String(i + 1)), h('div.grow.small', s)));
    });
    wrap.appendChild(allSteps);

    /* nutrition for what's actually being made */
    var cost = P.recipeCost(recipe);
    var m = U.scaleMacros(cost.macrosPerServe, servings);
    wrap.appendChild(h('div.card',
      h('h3', 'Per serve'),
      h('div.spread', { style: { marginTop: '.5rem' } },
        cell(Math.round(cost.macrosPerServe.kcal), 'kcal'),
        cell(Math.round(cost.macrosPerServe.protein) + 'g', 'protein'),
        cell(Math.round(cost.macrosPerServe.carbs) + 'g', 'carbs'),
        cell(UI.money(cost.perServe), 'cost'))));

    root.appendChild(wrap);
    requestWakeLock();
  }

  function cell(value, label) {
    return h('div', h('div', h('strong.num', String(value))), h('div.tiny.faint', label));
  }

  function setServings(recipe, n) {
    global.location.hash = '#/cook/' + encodeURIComponent(recipe.id) + '?servings=' + n;
  }

  function finish() {
    UI.toast('Nice one. Enjoy it.');
    exit();
  }

  function exit() {
    releaseWakeLock();
    global.location.hash = '#/plan';
  }

  /* ─────────────────────────── screen wake lock ───────────────────────────
   * Best-effort: unsupported on some browsers and over file://, in which case
   * the screen just dims as normal. Nothing else depends on it. */

  function requestWakeLock() {
    if (wakeLock || !global.navigator || !navigator.wakeLock) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      lock.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () { /* denied or unsupported — not worth surfacing */ });
  }

  function releaseWakeLock() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  }

  global.CookView = { render: render, releaseWakeLock: releaseWakeLock };
})(window);
