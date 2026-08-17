/* views/pantry.js — what you already have at home.
 *
 * The shopping list subtracts everything in here before it decides what to buy,
 * so keeping it roughly right is what stops you owning four bags of rice.
 * Quantities are stored in each item's canonical unit (g / ml / each).
 */
(function (global) {
  'use strict';

  var h = global.UI.h, UI = global.UI, S = global.Store,
      U = global.Units, C = global.CATALOGUE;

  function render(root) {
    var pantry = S.state.pantry;
    var ids = Object.keys(pantry).filter(function (id) { return pantry[id] > 0; });

    root.appendChild(h('div.spread', { style: { marginBottom: '.75rem' } },
      h('h1', 'Pantry'),
      ids.length ? h('button.btn.sm.ghost', { onclick: clearAll }, 'Clear all') : null));

    root.appendChild(h('div.card.tight', addRow()));

    if (!ids.length) {
      root.appendChild(h('div.empty',
        h('p', 'Your pantry is empty.'),
        h('p.small', 'Add the staples you already own — rice, pasta, oil, spices — and ' +
          'they will stop appearing on your shopping list.')));
      return;
    }

    // Group by aisle so it reads like a cupboard, not a database.
    var byAisle = {};
    ids.forEach(function (id) {
      var item = C.get(id);
      if (!item) return;
      (byAisle[item.aisle] = byAisle[item.aisle] || []).push(item);
    });

    Object.keys(byAisle)
      .sort(function (a, b) { return C.aisle(a).order - C.aisle(b).order; })
      .forEach(function (aisle) {
        var block = h('div.store-block',
          h('header', h('span.grow', C.aisle(aisle).name)));
        var lines = h('div.lines');

        byAisle[aisle].sort(function (a, b) { return a.name.localeCompare(b.name); })
          .forEach(function (item) { lines.appendChild(pantryLine(item)); });

        block.appendChild(lines);
        root.appendChild(block);
      });

    root.appendChild(h('p.tiny.faint',
      'Quantities are rough on purpose — the point is to stop re-buying things, ' +
      'not to run a stocktake.'));
  }

  function pantryLine(item) {
    var qty = S.state.pantry[item.id] || 0;
    var canonUnit = U.CANONICAL[U.dimensionOf(item.baseUnit)];

    return h('div.line',
      h('div.grow',
        h('div.nm', item.name),
        h('div.sub', U.prettyQty(qty, canonUnit) + ' on hand')),
      h('div.row',
        h('button.btn.sm', { onclick: function () { editQty(item); } }, 'Edit'),
        h('button.btn.sm.ghost', {
          onclick: function () {
            S.update(function (st) { delete st.pantry[item.id]; });
            global.App.rerender();
          },
          ariaLabel: 'Remove ' + item.name
        }, '✕')));
  }

  function addRow() {
    var itemSelect = h('select',
      [h('option', { value: '' }, 'Add something you already have…')].concat(
        C.items.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
          .map(function (it) { return h('option', { value: it.id }, it.name); })));

    return h('div.row',
      h('div.grow', itemSelect),
      h('button.btn.sm.primary', {
        onclick: function () {
          var item = C.get(itemSelect.value);
          if (!item) { UI.toast('Pick an item first'); return; }
          editQty(item);
          itemSelect.value = '';
        }
      }, 'Add'));
  }

  /**
   * Quantity entry accepts whatever unit makes sense for the item and converts
   * to the canonical unit for storage — so "2 kg" and "2000 g" are the same
   * thing, and "1 pack" works for tins.
   */
  function editQty(item) {
    var canonUnit = U.CANONICAL[U.dimensionOf(item.baseUnit)];
    var current = S.state.pantry[item.id] || 0;

    UI.modal(item.name, function (body, close) {
      var units = unitOptions(item);
      var defaultUnit = units.indexOf(item.baseUnit) !== -1 ? item.baseUnit : units[0];

      var qtyInput = h('input', {
        type: 'number', min: '0', step: 'any',
        value: current ? String(round(U.convertItem(current, canonUnit, defaultUnit, item))) : ''
      });
      var unitSelect = h('select', units.map(function (u) {
        return h('option', { value: u, selected: u === defaultUnit }, u);
      }));

      body.appendChild(h('p.small.muted', 'How much do you have at home?'));
      body.appendChild(h('div.row',
        h('label.field.grow', h('span', 'Amount'), qtyInput),
        h('label.field', h('span', 'Unit'), unitSelect)));

      // Quick buttons for the sizes this item is actually sold in.
      var quick = h('div.row.wrap', { style: { marginBottom: '.75rem' } });
      S.settings.enabledStores.forEach(function (sid) {
        var entry = global.Pricing.effectiveEntry(item, sid);
        if (!entry) return;
        quick.appendChild(h('button.btn.sm', {
          onclick: function () {
            qtyInput.value = String(entry.size);
            unitSelect.value = entry.unit;
          }
        }, '1 × ' + U.prettyQty(entry.size, entry.unit)));
      });
      if (quick.childNodes.length) {
        body.appendChild(h('div', h('div.tiny.faint', 'Common pack sizes'), quick));
      }

      body.appendChild(h('div.row',
        h('button.btn.primary.grow', {
          onclick: function () {
            var v = parseFloat(qtyInput.value);
            if (!(v >= 0)) { UI.toast('Enter an amount'); return; }
            var canon = U.convertItem(v, unitSelect.value, canonUnit, item);
            if (canon === null) {
              UI.toast('Can\'t measure ' + item.name + ' in ' + unitSelect.value);
              return;
            }
            S.update(function (st) {
              if (canon > 0) st.pantry[item.id] = canon;
              else delete st.pantry[item.id];
            });
            close(); global.App.rerender();
          }
        }, 'Save'),
        h('button.btn', { onclick: close }, 'Cancel')));
    });
  }

  function unitOptions(item) {
    var dim = U.dimensionOf(item.baseUnit);
    var out = dim === U.MASS ? ['g', 'kg']
            : dim === U.VOLUME ? ['ml', 'l']
            : ['each'];
    if (item.subUnits) out = out.concat(Object.keys(item.subUnits));
    return out;
  }

  function round(n) { return Math.round(n * 100) / 100; }

  function clearAll() {
    UI.confirmDialog('Clear the pantry?',
      'Everything will be removed and your shopping list will start assuming you ' +
      'have nothing at home.', 'Clear all', function () {
        S.update(function (st) { st.pantry = {}; });
        global.App.rerender();
      });
  }

  global.PantryView = { render: render };
})(window);
