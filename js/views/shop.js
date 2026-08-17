/* views/shop.js — the shopping list.
 *
 * Consolidates the week's ingredients, subtracts the pantry, rounds up to whole
 * packets, and splits the result across stores by what it actually costs to buy
 * — not by lowest unit price, which would send you to Costco for a 2.5 kg pack
 * to cover a 300 g recipe. Where a bigger pack really is better value, that's
 * surfaced as a tip rather than silently chosen for you.
 */
(function (global) {
  'use strict';

  var h = global.UI.h, UI = global.UI, S = global.Store,
      P = global.Pricing, U = global.Units, C = global.CATALOGUE;

  function render(root) {
    var dates = global.PlanView.currentDates();
    var entries = S.entriesForDates(dates);
    var settings = S.settings;

    root.appendChild(h('div.spread', { style: { marginBottom: '.75rem' } },
      h('div',
        h('h1', 'Shopping list'),
        h('div.small.faint', S.dateLabel(dates[0]) + ' – ' + S.dateLabel(dates[6]))),
      h('button.btn.sm.no-print', { onclick: function () { global.print(); } }, 'Print')));

    if (!entries.length) {
      root.appendChild(h('div.empty',
        h('p', 'Nothing planned for this week yet.'),
        h('button.btn.primary', {
          onclick: function () { global.location.hash = '#/plan'; }
        }, 'Go to the planner')));
      return;
    }

    var list = P.buildShoppingList(entries, S.state.pantry, settings.enabledStores);
    var savings = P.storeSavings(list, settings.enabledStores);

    root.appendChild(summary(list, settings));

    // Order stores by spend, biggest shop first — that's the trip you'll do.
    var storeIds = Object.keys(list.byStore).sort(function (a, b) {
      return list.byStore[b].subtotal - list.byStore[a].subtotal;
    });

    storeIds.forEach(function (storeId) {
      root.appendChild(storeBlock(storeId, list.byStore[storeId], savings[storeId]));
    });

    if (list.unpriced.length) {
      root.appendChild(h('div.card',
        h('h3', 'No price available'),
        h('p.small.muted',
          'None of your enabled stores has a price for these. Turn more stores on ' +
          'in Settings, or add a price when you next see them.'),
        h('div.stack', list.unpriced.map(function (u) {
          return h('div.small', u.item.name + ' — ' + U.prettyQty(u.qty, u.unit));
        }))));
    }

    root.appendChild(pantryActions(list));

    var seeded = list.lines.filter(function (l) { return P.needsCheck(l.entry); }).length;
    if (seeded) {
      root.appendChild(h('div.banner.warn.no-print',
        h('strong', seeded + ' of these prices are estimates I seeded, not real prices. '),
        'Tap any amber price to correct it while you shop — it will stop asking once you do.'));
    }
  }

  /**
   * How many store assignments were decided using at least one estimated price.
   *
   * This is a subtler problem than a wrong total. If ALDI's price is a guess and
   * Coles' is real, then "buy it at ALDI" is itself a guess — and an optimistic
   * guess sends you to the wrong shop. Worth stating plainly rather than letting
   * a confident-looking store split imply more certainty than exists.
   */
  function uncertainAssignments(list, stores) {
    return list.lines.filter(function (l) {
      return stores.some(function (sid) {
        var e = P.effectiveEntry(l.item, sid);
        return e && e.source === 'seed';
      });
    }).length;
  }

  function summary(list, settings) {
    var budget = settings.weeklyBudget || 0;
    var over = budget && list.total > budget;
    var uncertain = uncertainAssignments(list, settings.enabledStores);

    return h('div.card',
      h('div.spread',
        h('div',
          h('div.small.muted', 'Estimated total'),
          h('div', h('strong.num', { style: { fontSize: '1.6rem' } }, UI.money(list.total)),
            budget ? h('span.small.faint', ' of ' + UI.money(budget)) : null)),
        h('div.right',
          h('div.small.muted', list.lines.length + ' items'),
          over ? h('span.pill.warn', UI.money(list.total - budget) + ' over')
               : budget ? h('span.pill.accent', UI.money(budget - list.total) + ' left') : null)),
      budget ? h('div', { style: { marginTop: '.5rem' } }, UI.bar(list.total, budget)) : null,

      uncertain > 0
        ? h('p.tiny.warn.no-print', { style: { marginTop: '.6rem' } },
            uncertain + ' of ' + list.lines.length + ' items are assigned to a store ' +
            'using at least one estimated price, so the store split for those is a ' +
            'best guess too — not just the amount. Coles prices are real; ALDI, Big W ' +
            'and Costco are still estimates.')
        : null);
  }

  function storeBlock(storeId, block, saving) {
    var store = C.store(storeId);

    var header = h('header',
      UI.storeDot(storeId),
      h('span.grow', store ? store.name : storeId),
      h('span.num', UI.money(block.subtotal)));

    var lines = h('div.lines');

    // Group by aisle so the list follows the shape of the shop.
    var lastAisle = null;
    block.lines.forEach(function (l) {
      if (l.item.aisle !== lastAisle) {
        lastAisle = l.item.aisle;
        lines.appendChild(h('div.aisle-head', C.aisle(lastAisle).name));
      }
      lines.appendChild(lineRow(l, storeId));
    });

    var note = null;
    if (saving && saving.saving > 0.5) {
      note = h('div.small', { style: { padding: '.5rem .85rem', color: 'var(--accent-text)' } },
        'Worth the stop: these items cost ' + UI.money(saving.saving) +
        ' more at your other stores.');
    } else if (saving && saving.exclusive) {
      note = h('div.small', { style: { padding: '.5rem .85rem', color: 'var(--text-dim)' } },
        'Only this store stocks some of these items.');
    } else if (saving && saving.saving <= 0.5) {
      note = h('div.small', { style: { padding: '.5rem .85rem', color: 'var(--text-dim)' } },
        'Barely cheaper than elsewhere — you could skip this stop and save only ' +
        UI.money(Math.max(saving.saving, 0)) + '.');
    }
    if (note) lines.appendChild(note);

    if (store && store.membership) {
      lines.appendChild(h('div.tiny.faint', { style: { padding: '.15rem .85rem .6rem' } },
        'Membership required.'));
    }

    return h('div.store-block', header, lines);
  }

  function lineRow(l, storeId) {
    var key = storeId + ':' + l.item.id;
    var checked = !!S.state.checked[key];

    // Loose goods are weighed out, so there is one honest number: the amount.
    // Packaged goods need both what you buy and what the week actually calls for.
    var qtyText = l.loose
      ? 'weigh out ' + U.prettyNeed(l.needQty, l.needUnit, l.item)
      : (l.packs > 1 ? l.packs + ' × ' + packLabel(l.entry) : packLabel(l.entry)) +
        ' · need ' + U.prettyNeed(l.needQty, l.needUnit, l.item);

    var needText = l.haveQty > 0
      ? 'already have ' + U.prettyNeed(l.haveQty, l.needUnit, l.item)
      : null;

    var row = h('div.line' + (checked ? '.done' : ''),
      h('button.tick' + (checked ? '.on' : ''), {
        onclick: function () {
          S.update(function (st) {
            if (st.checked[key]) delete st.checked[key];
            else st.checked[key] = true;
          });
          global.App.rerender();
        },
        ariaLabel: checked ? 'Untick ' + l.item.name : 'Tick off ' + l.item.name
      }, '✓'),

      h('div.grow',
        h('div.nm', l.item.name),
        h('div.sub', qtyText),
        needText ? h('div.sub', needText) : null,
        l.surplus > 0.001
          ? h('div.sub', 'leaves ' + U.prettyQty(l.surplus, l.entry.unit) + ' spare')
          : null,
        l.bulkTip ? bulkTipRow(l) : null,
        h('a.tiny.no-print', {
          href: C.searchUrl(storeId, l.item.name),
          target: '_blank', rel: 'noopener noreferrer'
        }, 'check price at ' + (C.store(storeId) || {}).name + ' ↗')),

      h('div.right',
        h('div.cost.num', UI.money(l.cost)),
        h('div.tiny', UI.priceTag(l.entry, function () { editPrice(l.item, storeId); }))));

    return row;
  }

  function bulkTipRow(l) {
    var t = l.bulkTip;
    var store = C.store(t.storeId);
    return h('div.tip',
      'Bulk tip: ' + (store ? store.name : t.storeId) + ' is ' +
      Math.round(t.betterBy * 100) + '% cheaper per ' + t.packUnit + ', but the pack is ' +
      U.prettyQty(t.packSize, t.packUnit) + ' for ' + UI.money(t.packPrice) +
      ' — only worth it if you\'ll use it.');
  }

  function packLabel(entry) {
    return U.prettyQty(entry.size, entry.unit) + ' pack';
  }

  /* ─────────────────────────── price editing ─────────────────────────── */

  /**
   * Correcting a price is the core maintenance loop of this app, so it has to
   * be quick: one tap from the list, one number, done. Saving stamps it as
   * yours with today's date, and it stops being flagged as an estimate.
   */
  function editPrice(item, storeId) {
    UI.modal(item.name, function (body, close) {
      body.appendChild(h('p.small.muted',
        'Set what it actually costs. Enter the shelf price and the pack size ' +
        'exactly as sold, and everything else recalculates.'));

      var stores = S.settings.enabledStores;

      stores.forEach(function (sid) {
        var entry = P.effectiveEntry(item, sid);
        var stocked = !!entry;
        var store = C.store(sid);

        var priceInput = h('input', {
          type: 'number', step: '0.01', min: '0',
          value: entry ? String(entry.price) : '',
          placeholder: stocked ? '' : 'not stocked'
        });
        var sizeInput = h('input', {
          type: 'number', step: 'any', min: '0',
          value: entry ? String(entry.size) : ''
        });
        var unitSelect = h('select',
          unitOptions(item.baseUnit).map(function (u) {
            return h('option', { value: u, selected: entry && entry.unit === u }, u);
          }));

        var wrap = h('div.card.tight',
          h('div.row', { style: { marginBottom: '.5rem' } },
            UI.storeDot(sid),
            h('strong.grow', store ? store.name : sid),
            entry && P.needsCheck(entry) ? h('span.pill.warn', 'estimate') :
            entry ? h('span.pill.accent', 'yours · ' + entry.updated) : null),

          h('div.row',
            h('label.field.grow', h('span', 'Price $'), priceInput),
            h('label.field.grow', h('span', 'Pack size'), sizeInput),
            h('label.field', h('span', 'Unit'), unitSelect)),

          h('div.row',
            h('button.btn.sm.primary', {
              onclick: function () {
                var price = parseFloat(priceInput.value);
                var size = parseFloat(sizeInput.value);
                if (!(price > 0) || !(size > 0)) {
                  UI.toast('Enter a price and a pack size greater than zero');
                  return;
                }
                S.update(function (st) {
                  if (!st.overrides[item.id]) st.overrides[item.id] = {};
                  st.overrides[item.id][sid] = {
                    price: price, size: size, unit: unitSelect.value,
                    updated: S.iso(new Date()), source: 'user'
                  };
                });
                UI.toast('Saved ' + item.name + ' at ' + (store ? store.name : sid));
                close(); global.App.rerender();
              }
            }, 'Save'),

            entry ? h('button.btn.sm.ghost', {
              onclick: function () {
                S.update(function (st) {
                  if (!st.overrides[item.id]) st.overrides[item.id] = {};
                  st.overrides[item.id][sid] = null;   // explicitly "not stocked"
                });
                UI.toast('Marked as not stocked here');
                close(); global.App.rerender();
              }
            }, 'Not stocked here') : null,

            S.state.overrides[item.id] && S.state.overrides[item.id][sid] !== undefined
              ? h('button.btn.sm.ghost', {
                  onclick: function () {
                    S.update(function (st) { delete st.overrides[item.id][sid]; });
                    UI.toast('Reset to the seeded estimate');
                    close(); global.App.rerender();
                  }
                }, 'Reset')
              : null),

          h('a.tiny', {
            href: C.searchUrl(sid, item.name), target: '_blank', rel: 'noopener noreferrer'
          }, 'look it up at ' + (store ? store.name : sid) + ' ↗'));

        body.appendChild(wrap);
      });
    });
  }

  /** Offer only units in the same dimension as how the item is sold. */
  function unitOptions(baseUnit) {
    var dim = U.dimensionOf(baseUnit);
    if (dim === U.MASS) return ['g', 'kg'];
    if (dim === U.VOLUME) return ['ml', 'l'];
    return ['each', 'pack'];
  }

  /* ─────────────────────────── pantry handoff ─────────────────────────── */

  function pantryActions(list) {
    var ticked = list.lines.filter(function (l) {
      return S.state.checked[l.storeId + ':' + l.item.id];
    });

    return h('div.card.no-print',
      h('div.spread',
        h('div',
          h('strong', ticked.length + ' of ' + list.lines.length + ' ticked off'),
          h('div.small.muted',
            'When you get home, add what you bought to the pantry so next week\'s ' +
            'list knows you already have it.')),
        h('div.row',
          h('button.btn', {
            disabled: !ticked.length,
            onclick: function () {
              S.update(function (st) {
                ticked.forEach(function (l) {
                  // Add the whole packet, not just what the recipes need — the
                  // surplus is real food sitting in your cupboard.
                  var bought = U.convertItem(l.packs * l.entry.size, l.entry.unit,
                                             l.needUnit, l.item);
                  if (bought === null) return;
                  st.pantry[l.item.id] = (st.pantry[l.item.id] || 0) + bought;
                  delete st.checked[l.storeId + ':' + l.item.id];
                });
              });
              UI.toast('Added ' + ticked.length + ' items to your pantry');
              global.App.rerender();
            }
          }, 'Add ticked to pantry'),
          h('button.btn.ghost', {
            disabled: !ticked.length,
            onclick: function () {
              S.update(function (st) { st.checked = {}; });
              global.App.rerender();
            }
          }, 'Untick all'))));
  }

  global.ShopView = { render: render, editPrice: editPrice };
})(window);
