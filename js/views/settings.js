/* views/settings.js — targets, stores, price maintenance, backup.
 *
 * The price-check queue is the important part. Seeded prices are estimates, and
 * this ranks them by how much they actually move your weekly total, so you fix
 * the ten that matter instead of grinding through a hundred that don't.
 */
(function (global) {
  'use strict';

  var h = global.UI.h, UI = global.UI, S = global.Store,
      P = global.Pricing, U = global.Units, C = global.CATALOGUE;

  function render(root) {
    root.appendChild(h('h1', 'Settings'));

    root.appendChild(targetsCard());
    root.appendChild(tdeeCard());
    root.appendChild(budgetCard());
    root.appendChild(storesCard());
    root.appendChild(proteinsCard());
    root.appendChild(priceCheckCard());
    root.appendChild(dataCard());
    root.appendChild(aboutCard());
  }

  function num(value, onChange, attrs) {
    return h('input', Object.assign({
      type: 'number', value: value === null || value === undefined ? '' : String(value),
      onchange: function (e) { onChange(e.target.value === '' ? null : parseFloat(e.target.value)); }
    }, attrs || {}));
  }

  /* ─────────────────────────────── targets ─────────────────────────────── */

  function targetsCard() {
    var s = S.settings;
    return h('div.card',
      h('h2', 'Daily targets'),
      h('p.small.muted', 'The planner builds days that land near these numbers.'),
      h('div.row',
        h('label.field.grow', h('span', 'Calories (kcal)'),
          num(s.dailyKcal, function (v) { set('dailyKcal', v || 0); }, { min: '0', step: '50' })),
        h('label.field.grow', h('span', 'Protein (g)'),
          num(s.dailyProtein, function (v) { set('dailyProtein', v || 0); },
              { min: '0', step: '5' }))),
      h('div.row',
        h('label.field.grow', h('span', 'Default servings per meal'),
          num(s.defaultServings, function (v) { set('defaultServings', v || 1); },
              { min: '0.5', step: '0.5' }))),
      h('label.row.small',
        h('input', {
          type: 'checkbox', checked: s.autoLeftovers, style: { width: 'auto' },
          onchange: function (e) { set('autoLeftovers', e.target.checked); }
        }),
        h('span', 'Turn spare servings into the next day\'s lunch automatically')),
      h('p.tiny.faint', { style: { marginTop: '.4rem' } },
        'Recommended when cooking for one: you cook once and eat twice, which is ' +
        'both cheaper and far less work than cooking every lunch separately.'));
  }

  function set(key, value) {
    S.update(function (st) { st.settings[key] = value; });
    global.App.rerender();
  }

  function setBody(key, value) {
    S.update(function (st) { st.settings.body[key] = value; });
  }

  /* ─────────────────────────────── TDEE ─────────────────────────────── */

  /**
   * Mifflin-St Jeor. This is the standard estimate used by essentially every
   * fitness calculator; it is a starting point to adjust from, not a
   * prescription. Deliberately framed that way in the UI.
   */
  function tdeeCard() {
    var b = S.settings.body;
    var out = h('div');

    function recalc() {
      UI.clear(out);
      if (!b.sex || !b.age || !b.heightCm || !b.weightKg) {
        out.appendChild(h('p.small.faint', 'Fill in all four fields to get an estimate.'));
        return;
      }
      var bmr = 10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age + (b.sex === 'male' ? 5 : -161);
      var tdee = bmr * (b.activity || 1.55);
      var target = Math.round((tdee + (b.surplus || 0)) / 10) * 10;
      var protein = Math.round(b.weightKg * 1.8);

      out.appendChild(h('div.card.tight',
        h('div.spread',
          h('div', h('div.tiny.faint', 'Maintenance'), h('strong.num', Math.round(tdee) + ' kcal')),
          h('div', h('div.tiny.faint', 'With surplus'), h('strong.num', target + ' kcal')),
          h('div', h('div.tiny.faint', 'Protein 1.8g/kg'), h('strong.num', protein + 'g'))),
        h('button.btn.sm.primary', {
          style: { marginTop: '.6rem' },
          onclick: function () {
            S.update(function (st) {
              st.settings.dailyKcal = target;
              st.settings.dailyProtein = protein;
            });
            UI.toast('Targets updated');
            global.App.rerender();
          }
        }, 'Use these as my targets')));
    }

    var card = h('div.card',
      h('h2', 'Work out my targets'),
      h('p.small.muted',
        'A standard estimate of how much you burn, plus a surplus for gaining weight. ' +
        'Treat it as a starting point and adjust after a few weeks based on what the ' +
        'scale actually does — and check with a doctor or dietitian if you have any ' +
        'health conditions that bear on it.'),

      h('div.row',
        h('label.field.grow', h('span', 'Sex'),
          h('select', {
            onchange: function (e) { b.sex = e.target.value; setBody('sex', b.sex); recalc(); }
          },
            h('option', { value: '', selected: !b.sex }, '—'),
            h('option', { value: 'male', selected: b.sex === 'male' }, 'Male'),
            h('option', { value: 'female', selected: b.sex === 'female' }, 'Female'))),
        h('label.field.grow', h('span', 'Age'),
          num(b.age, function (v) { b.age = v; setBody('age', v); recalc(); },
              { min: '14', max: '100' }))),

      h('div.row',
        h('label.field.grow', h('span', 'Height (cm)'),
          num(b.heightCm, function (v) { b.heightCm = v; setBody('heightCm', v); recalc(); },
              { min: '100', max: '250' })),
        h('label.field.grow', h('span', 'Weight (kg)'),
          num(b.weightKg, function (v) { b.weightKg = v; setBody('weightKg', v); recalc(); },
              { min: '30', max: '250' }))),

      h('label.field', h('span', 'Activity level'),
        h('select', {
          onchange: function (e) {
            b.activity = parseFloat(e.target.value); setBody('activity', b.activity); recalc();
          }
        },
          opt(1.2, 'Sedentary — desk job, little exercise', b.activity),
          opt(1.375, 'Light — exercise 1–3 days a week', b.activity),
          opt(1.55, 'Moderate — exercise 3–5 days a week', b.activity),
          opt(1.725, 'Active — hard exercise 6–7 days a week', b.activity),
          opt(1.9, 'Very active — physical job or twice-daily training', b.activity))),

      h('label.field', h('span', 'Surplus for gaining'),
        h('select', {
          onchange: function (e) {
            b.surplus = parseFloat(e.target.value); setBody('surplus', b.surplus); recalc();
          }
        },
          opt(250, '+250 kcal — slow, lean gain', b.surplus),
          opt(400, '+400 kcal — steady gain', b.surplus),
          opt(600, '+600 kcal — faster gain', b.surplus))),

      out);

    recalc();
    return card;
  }

  function opt(value, label, current) {
    return h('option', { value: String(value), selected: current === value }, label);
  }

  /* ─────────────────────────────── budget ─────────────────────────────── */

  function budgetCard() {
    return h('div.card',
      h('h2', 'Weekly budget'),
      h('label.field', h('span', 'Grocery budget ($ per week)'),
        num(S.settings.weeklyBudget, function (v) { set('weeklyBudget', v || 0); },
            { min: '0', step: '5' })),
      h('p.tiny.faint',
        'Used to flag when a plan runs over. The planner leans towards cheaper meals ' +
        'once a week is projected past this.'));
  }

  /* ─────────────────────────────── stores ─────────────────────────────── */

  function storesCard() {
    var enabled = S.settings.enabledStores;

    var card = h('div.card',
      h('h2', 'Where you shop'),
      h('p.small.muted', 'Only these stores are considered when splitting your list.'));

    C.STORES.forEach(function (store) {
      var on = enabled.indexOf(store.id) !== -1;
      card.appendChild(h('label.row', { style: { padding: '.35rem 0' } },
        h('input', {
          type: 'checkbox', checked: on, style: { width: 'auto' },
          onchange: function (e) {
            var next = e.target.checked
              ? enabled.concat([store.id])
              : enabled.filter(function (s) { return s !== store.id; });
            if (!next.length) {
              UI.toast('Keep at least one store switched on');
              e.target.checked = true;
              return;
            }
            set('enabledStores', next);
          }
        }),
        UI.storeDot(store.id),
        h('span.grow', store.name),
        store.membership ? h('span.pill', 'membership') : null));
    });

    card.appendChild(h('p.tiny.faint', { style: { marginTop: '.5rem' } },
      'Big W has no fresh food, so it only ever appears for pantry, household and ' +
      'protein-supplement items. Costco needs a membership and sells in bulk — great ' +
      'value per kilo, but the packs are large.'));

    return card;
  }

  /* ─────────────────────────── protein choices ─────────────────────────── */

  var PROTEIN_LABELS = {
    chicken: 'Chicken', beef: 'Beef', lamb: 'Lamb', seafood: 'Seafood',
    vegetarian: 'Vegetarian (no meat or fish)'
  };

  /**
   * Turning a protein off filters it out of auto-fill and the "choose a
   * meal" picker — not the Recipes tab, which stays a full browsing library
   * so you can still look up, duplicate or edit a recipe you've turned off
   * suggestions for.
   */
  function proteinsCard() {
    var enabled = S.settings.enabledProteins || {};
    var recipes = S.allRecipes();

    var card = h('div.card',
      h('h2', 'Meat & protein choices'),
      h('p.small.muted',
        'Turn off anything you don\'t eat. Auto-fill and the meal picker stop suggesting ' +
        'it — recipes stay visible on the Recipes tab so you can still look them up. ' +
        'There is no pork anywhere in this catalogue at all; that was the brief from the start.'));

    global.Proteins.TOGGLEABLE.forEach(function (type) {
      var on = enabled[type] !== false;
      var count = recipes.filter(function (r) {
        return global.Proteins.recipeProteinTypes(r).indexOf(type) !== -1;
      }).length;

      card.appendChild(h('label.row', { style: { padding: '.35rem 0' } },
        h('input', {
          type: 'checkbox', checked: on, style: { width: 'auto' },
          onchange: function (e) {
            var next = Object.assign({}, enabled);
            next[type] = e.target.checked;
            var anyOn = global.Proteins.TOGGLEABLE.some(function (t) { return next[t] !== false; });
            if (!anyOn) {
              UI.toast('Keep at least one protein switched on');
              e.target.checked = true;
              return;
            }
            set('enabledProteins', next);
          }
        }),
        h('span.grow', PROTEIN_LABELS[type] || type),
        h('span.tiny.faint', count + ' recipe' + (count === 1 ? '' : 's'))));
    });

    return card;
  }

  /* ─────────────────────── price check queue ─────────────────────── */

  /**
   * Ranks unconfirmed prices by how much money they're actually deciding in the
   * current week's list. Correcting the chicken price matters; correcting the
   * cinnamon does not.
   */
  function priceCheckCard() {
    var dates = global.PlanView.currentDates();
    var entries = S.entriesForDates(dates);
    var list = P.buildShoppingList(entries, S.state.pantry, S.settings.enabledStores);

    var pending = list.lines
      .filter(function (l) { return P.needsCheck(l.entry); })
      .sort(function (a, b) { return b.cost - a.cost; });

    var confirmed = 0, totalPrices = 0;
    C.items.forEach(function (it) {
      S.settings.enabledStores.forEach(function (sid) {
        var e = P.effectiveEntry(it, sid);
        if (!e) return;
        totalPrices++;
        if (!P.needsCheck(e)) confirmed++;
      });
    });

    var card = h('div.card',
      h('h2', 'Price check'),
      h('p.small.muted',
        'Coles prices were read from coles.com.au on ' + C.VERIFIED.coles.date +
        ' and are real. ALDI, Big W and Costco are still estimates I seeded. ' +
        'The list below is what\'s deciding the most money in this week\'s shop.'),
      h('div.spread', { style: { margin: '.5rem 0' } },
        h('span.small', confirmed + ' of ' + totalPrices + ' prices verified or confirmed'),
        h('span.small.num', Math.round((confirmed / Math.max(totalPrices, 1)) * 100) + '%')),
      UI.bar(confirmed, Math.max(totalPrices, 1), 'thin'));

    if (!pending.length) {
      card.appendChild(h('p.small', { style: { marginTop: '.75rem' } },
        entries.length
          ? 'Every price in this week\'s list is one you have confirmed. Nice.'
          : 'Plan a week and the prices worth checking will show up here.'));
      return card;
    }

    pending.slice(0, 12).forEach(function (l) {
      card.appendChild(h('div.line',
        h('div.grow',
          h('div.nm', l.item.name),
          h('div.sub.row', { style: { gap: '.3rem' } },
            UI.storeDot(l.storeId), UI.storeName(l.storeId),
            h('span', ' · ' + U.prettyQty(l.entry.size, l.entry.unit) + ' pack'))),
        h('div.right',
          h('div.cost.num.seeded', { style: { borderBottom: 'none' } }, UI.money(l.entry.price)),
          h('button.btn.sm', {
            onclick: function () { global.ShopView.editPrice(l.item, l.storeId); }
          }, 'Fix'))));
    });

    if (pending.length > 12) {
      card.appendChild(h('p.tiny.faint', { style: { marginTop: '.5rem' } },
        'and ' + (pending.length - 12) + ' more, worth less each.'));
    }
    return card;
  }

  /* ─────────────────────────── data / backup ─────────────────────────── */

  function dataCard() {
    var card = h('div.card',
      h('h2', 'Your data'),
      h('p.small.muted',
        'Everything lives in this browser on this computer. There is no account and ' +
        'nothing is uploaded anywhere. That also means clearing your browser data ' +
        'would wipe it — so export a backup now and then.'));

    if (!S.hasLocalStorage) {
      card.appendChild(h('div.banner.warn',
        h('strong', 'Saving is not working in this browser. '),
        'Your changes will be lost when you close the tab. This usually means private ' +
        'browsing, or opening the file directly in a browser that blocks storage on ' +
        'file:// URLs — try running it with the local server command in the README.'));
    }

    card.appendChild(h('div.row.wrap',
      h('button.btn', { onclick: exportBackup }, 'Export backup'),
      h('button.btn', { onclick: importBackup }, 'Import backup'),
      h('button.btn.danger', { onclick: resetAll }, 'Reset everything')));

    return card;
  }

  function exportBackup() {
    var json = S.exportJson();
    var name = 'mealwise-backup-' + S.iso(new Date()) + '.json';

    try {
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = h('a', { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      UI.toast('Backup downloaded');
    } catch (e) {
      // Downloads can be blocked on file:// — fall back to showing the JSON.
      UI.modal('Backup', function (body) {
        body.appendChild(h('p.small.muted', 'Copy this and save it somewhere safe.'));
        body.appendChild(h('textarea', { rows: '16', value: json, readonly: true }));
      });
    }
  }

  function importBackup() {
    UI.modal('Import backup', function (body, close) {
      body.appendChild(h('div.banner.warn',
        'Importing replaces everything currently saved — plan, pantry, prices and ' +
        'your own recipes.'));

      var fileInput = h('input', { type: 'file', accept: '.json,application/json' });
      var textArea = h('textarea', { rows: '8', placeholder: '…or paste the backup JSON here' });

      function apply(text) {
        var res = S.importJson(text);
        if (!res.ok) { UI.toast(res.error); return; }
        UI.toast('Backup restored');
        close();
        global.App.rerender();
      }

      fileInput.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () { apply(String(reader.result)); };
        reader.onerror = function () { UI.toast('Could not read that file'); };
        reader.readAsText(f);
      });

      body.appendChild(h('label.field', h('span', 'Choose a backup file'), fileInput));
      body.appendChild(h('label.field', h('span', 'Or paste it'), textArea));
      body.appendChild(h('button.btn.primary', {
        onclick: function () {
          if (!textArea.value.trim()) { UI.toast('Choose a file or paste the JSON'); return; }
          apply(textArea.value);
        }
      }, 'Import'));
    });
  }

  function resetAll() {
    UI.confirmDialog('Reset everything?',
      'Your plan, pantry, corrected prices and custom recipes will all be deleted. ' +
      'This cannot be undone — export a backup first if you might want any of it.',
      'Delete everything', function () {
        S.reset();
        UI.toast('Reset');
        global.location.hash = '#/plan';
        global.App.rerender();
      });
  }

  /* ─────────────────────────────── about ─────────────────────────────── */

  function aboutCard() {
    return h('div.card',
      h('h2', 'About the prices'),
      h('p.small.muted',
        h('strong', 'Coles ✓ '),
        Object.keys(C.VERIFIED.coles.prices).length + ' prices were read from ' +
        C.VERIFIED.coles.source + ' on ' + C.VERIFIED.coles.date + '. These are real. ' +
        'Coles prices vary by delivery area, so if you shop outside inner Melbourne a ' +
        'few will be slightly off — fresh meat and produce move the most.'),
      h('p.small.muted',
        h('strong', 'ALDI, Big W and Costco ? '),
        'still estimates. None of them publishes a price API, and only coles.com.au was ' +
        'granted to the browser extension, so I could not check them.'),
      h('p.small.muted',
        'Amber “?” means an estimate. Green “✓” means read from the retailer. Plain means ' +
        'you set it yourself, which always wins.'),
      h('p.tiny.faint',
        C.items.length + ' items · ' + global.RECIPES.all.length + ' recipes · ' +
        'estimates seeded ' + C.SEED_DATE));
  }

  global.SettingsView = { render: render };
})(window);
