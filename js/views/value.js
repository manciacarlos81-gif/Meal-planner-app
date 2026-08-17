/* views/value.js — where the money actually goes furthest.
 *
 * This is the screen that answers the real question behind this whole app:
 * "what is the cheapest way to hit my calories and protein this week?"
 *
 * ── A NOTE ON THE PROTEIN FILTER ──────────────────────────────────────────
 * Ranked purely on dollars per 30 g of protein, the top of the list is pasta,
 * flour and rice. That is arithmetically true and practically useless: pasta is
 * 12 g protein per 100 g, so hitting 140 g of protein from pasta means eating
 * well over a kilo of it. So the list defaults to items with a real protein
 * density (>= 15 g per 100 g). Turn the filter off to see the raw ranking.
 */
(function (global) {
  'use strict';

  var h = global.UI.h, UI = global.UI, S = global.Store,
      P = global.Pricing, C = global.CATALOGUE;

  var DENSE_PROTEIN = 15;   // g per 100 g to count as a protein source
  var proteinDenseOnly = true;
  var tab = 'protein';

  function render(root) {
    root.appendChild(h('h1', 'Value'));
    root.appendChild(h('p.small.muted',
      'Ranked across the stores you have switched on, using unit price — so bulk ' +
      'packs are judged on what they cost per kilo, not per pack.'));

    root.appendChild(h('div.row.wrap', { style: { marginBottom: '1rem' } },
      tabBtn('protein', 'Cheapest protein'),
      tabBtn('kcal', 'Cheapest calories'),
      tabBtn('week', 'This week\'s spend')));

    if (tab === 'protein') renderProtein(root);
    else if (tab === 'kcal') renderCalories(root);
    else renderWeek(root);
  }

  function tabBtn(id, label) {
    return h('button.btn.sm' + (tab === id ? '.primary' : ''), {
      onclick: function () { tab = id; global.App.rerender(); }
    }, label);
  }

  /* ───────────────────────── cheapest protein ───────────────────────── */

  function renderProtein(root) {
    var rows = C.items.map(function (it) {
      var v = P.costPer30gProtein(it);
      if (v === null) return null;
      var best = P.cheapestStore(it);
      return {
        item: it, value: v, store: best.storeId,
        density: it.per100g.protein, entry: best.entry
      };
    }).filter(Boolean);

    if (proteinDenseOnly) {
      rows = rows.filter(function (r) { return r.density >= DENSE_PROTEIN; });
    }
    rows.sort(function (a, b) { return a.value - b.value; });

    root.appendChild(h('div.card',
      h('label.row.small', { style: { marginBottom: '.75rem' } },
        h('input', {
          type: 'checkbox', checked: proteinDenseOnly, style: { width: 'auto' },
          onchange: function (e) { proteinDenseOnly = e.target.checked; global.App.rerender(); }
        }),
        h('span', 'Only real protein sources (≥ ' + DENSE_PROTEIN + 'g per 100g)')),

      proteinDenseOnly
        ? h('p.tiny.faint',
            'Filter off shows pasta, flour and rice at the top. They are cheap per ' +
            'gram of protein but only 10–13% protein, so you would have to eat over a ' +
            'kilo a day to hit your target on them alone.')
        : h('p.tiny.warn',
            'Showing everything. The leaders here are mostly carbohydrates with ' +
            'incidental protein — cheap, but you cannot practically eat enough.'),

      h('div.scroll-x', table(rows, '$ / 30g protein', function (r) {
        return Math.round(r.density) + 'g/100g';
      }, 'protein density'))));

    root.appendChild(h('p.small.muted',
      'Aim to build most meals on the top of this list. Your daily protein target is ' +
      (S.settings.dailyProtein || 0) + 'g — that is about ' +
      Math.round((S.settings.dailyProtein || 0) / 30) + ' portions of 30g.'));
  }

  /* ───────────────────────── cheapest calories ───────────────────────── */

  function renderCalories(root) {
    var rows = C.items.map(function (it) {
      var v = P.costPer1000kcal(it);
      if (v === null) return null;
      var best = P.cheapestStore(it);
      return { item: it, value: v, store: best.storeId, density: it.per100g.kcal };
    }).filter(Boolean).sort(function (a, b) { return a.value - b.value; });

    root.appendChild(h('div.card',
      h('p.small.muted',
        'Gaining weight means eating more calories than you burn, and these are the ' +
        'cheapest calories in the shop. Oils and sugar top the list because they are ' +
        'almost pure energy — useful for cooking, but build the bulk of your intake ' +
        'from the grains, dairy and nuts further down.'),
      h('div.scroll-x', table(rows.slice(0, 30), '$ / 1000 kcal', function (r) {
        return Math.round(r.density) + ' kcal/100g';
      }, 'energy density'))));

    var target = S.settings.dailyKcal || 0;
    if (target) {
      var cheapest = rows[0];
      root.appendChild(h('p.small.muted',
        'Your target is ' + target + ' kcal a day. At the cheapest end of this list ' +
        'that is theoretically ' + UI.money(cheapest.value * (target / 1000)) +
        ' a day of raw energy — real meals cost more, but it shows how much headroom ' +
        'there is in your ' + UI.money(S.settings.weeklyBudget || 0) + ' weekly budget.'));
    }
  }

  function table(rows, valueHeader, densityFn, densityHeader) {
    var t = h('table.vtable',
      h('thead', h('tr',
        h('th', ''), h('th', 'Item'), h('th', 'Cheapest at'),
        h('th', { style: { textAlign: 'right' } }, densityHeader),
        h('th', { style: { textAlign: 'right' } }, valueHeader))));

    var tb = h('tbody');
    rows.forEach(function (r, i) {
      tb.appendChild(h('tr',
        h('td.rank', String(i + 1)),
        h('td', r.item.name),
        h('td', h('span.row', { style: { gap: '.3rem' } },
          UI.storeDot(r.store), UI.storeName(r.store))),
        h('td.n.faint', densityFn(r)),
        h('td.n', UI.money(r.value))));
    });
    t.appendChild(tb);
    return t;
  }

  /* ───────────────────────── this week's spend ───────────────────────── */

  function renderWeek(root) {
    var dates = global.PlanView.currentDates();
    var entries = S.entriesForDates(dates);

    if (!entries.length) {
      root.appendChild(h('div.empty', 'Plan some meals first and this will break down ' +
        'where the week\'s money goes.'));
      return;
    }

    var list = P.buildShoppingList(entries, S.state.pantry, S.settings.enabledStores);

    /* by aisle */
    var byAisle = {};
    list.lines.forEach(function (l) {
      byAisle[l.item.aisle] = (byAisle[l.item.aisle] || 0) + l.cost;
    });
    var aisles = Object.keys(byAisle).map(function (a) {
      return { name: C.aisle(a).name, cost: byAisle[a] };
    }).sort(function (a, b) { return b.cost - a.cost; });

    var card = h('div.card', h('h3', 'Where the money goes'),
      h('p.tiny.faint', 'Total ' + UI.money(list.total) + ' across ' +
        list.lines.length + ' items'));

    aisles.forEach(function (a) {
      card.appendChild(h('div', { style: { margin: '.5rem 0' } },
        h('div.spread.small',
          h('span', a.name),
          h('span.num', UI.money(a.cost) + '  ' +
            Math.round((a.cost / list.total) * 100) + '%')),
        UI.bar(a.cost, list.total, 'thin')));
    });
    root.appendChild(card);

    /* most expensive lines */
    var top = list.lines.slice().sort(function (a, b) { return b.cost - a.cost; }).slice(0, 10);
    var expensive = h('div.card', h('h3', 'Biggest single costs'),
      h('p.tiny.faint', 'If the week is over budget, these are the lines to change first.'));

    top.forEach(function (l) {
      expensive.appendChild(h('div.line',
        h('div.grow',
          h('div.nm', l.item.name),
          h('div.sub.row', { style: { gap: '.3rem' } },
            UI.storeDot(l.storeId), UI.storeName(l.storeId))),
        h('div.right.cost.num', UI.money(l.cost))));
    });
    root.appendChild(expensive);

    /* protein value of the plan as a whole */
    var macros = global.Units.emptyMacros();
    entries.forEach(function (e) {
      var r = S.getRecipe(e.recipeId);
      if (!r) return;
      var c = P.recipeCost(r);
      var scale = (e.servings || r.baseServings) / (r.baseServings || 1);
      macros = global.Units.addMacros(macros, global.Units.scaleMacros(c.macros, scale));
    });

    root.appendChild(h('div.card',
      h('h3', 'What this week buys you'),
      h('div.spread', { style: { marginTop: '.5rem' } },
        cell('Total calories', Math.round(macros.kcal).toLocaleString()),
        cell('Total protein', Math.round(macros.protein) + 'g'),
        cell('Per 1000 kcal', UI.money(list.total / (macros.kcal / 1000))),
        cell('Per 30g protein', UI.money(list.total / (macros.protein / 30))))));
  }

  function cell(label, value) {
    return h('div', h('div.tiny.faint', label), h('div', h('strong.num', value)));
  }

  global.ValueView = { render: render };
})(window);
