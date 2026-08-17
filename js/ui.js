/* ui.js — tiny DOM helpers shared by every view.
 *
 * Elements are built with a hyperscript helper rather than innerHTML. That is
 * not ceremony: recipe names, item names and notes are user-editable, and
 * assigning them through innerHTML would execute any markup typed into them.
 * Building nodes and setting textContent makes that impossible by construction.
 */
(function (global) {
  'use strict';

  var U = global.Units;

  /**
   * h('div.card', { onclick: fn }, 'text', childNode, [more, nodes])
   * The tag accepts CSS-ish shorthand: 'button.btn.primary', 'span#total'.
   */
  function h(tag, props) {
    var parts = String(tag).split(/(?=[.#])/);
    var el = document.createElement(parts[0] || 'div');

    parts.slice(1).forEach(function (p) {
      if (p[0] === '.') el.classList.add(p.slice(1));
      else if (p[0] === '#') el.id = p.slice(1);
    });

    var start = 2;
    if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
      start = 1; props = null;
    }
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'html') el.innerHTML = v;      // only ever used with literals
        else if (k in el && k !== 'list') el[k] = v;
        else el.setAttribute(k, v);
      });
    }

    for (var i = start; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /* ─────────────────────────────── modal ─────────────────────────────── */

  var modalRoot = null;

  function modal(title, buildBody, opts) {
    opts = opts || {};
    if (!modalRoot) modalRoot = document.getElementById('modal-root');
    closeModal();

    var body = h('div');
    var box = h('div.modal',
      h('header',
        h('h2.grow', title),
        h('button.btn.ghost', { onclick: closeModal, title: 'Close', ariaLabel: 'Close' }, '✕')),
      body);

    var bg = h('div.modal-bg', {
      onclick: function (e) { if (e.target === bg) closeModal(); }
    }, box);

    modalRoot.appendChild(bg);
    document.body.style.overflow = 'hidden';

    // Escape closes, and focus moves into the dialog for keyboard users.
    bg._onkey = function (e) { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', bg._onkey);

    buildBody(body, closeModal);
    var focusable = box.querySelector('input, select, textarea, button.primary');
    if (focusable && !opts.noAutofocus) focusable.focus();
    return closeModal;
  }

  function closeModal() {
    if (!modalRoot) modalRoot = document.getElementById('modal-root');
    var open = modalRoot.firstChild;
    if (open) {
      if (open._onkey) document.removeEventListener('keydown', open._onkey);
      modalRoot.removeChild(open);
    }
    document.body.style.overflow = '';
  }

  /* ─────────────────────────────── format ─────────────────────────────── */

  function money(n) { return U.money(n); }

  function macroLine(m) {
    return Math.round(m.kcal) + ' kcal · ' + Math.round(m.protein) + 'g P · ' +
           Math.round(m.carbs) + 'g C';
  }

  /** Progress bar that turns amber past 100%. */
  function bar(value, target, cls) {
    var pct = target > 0 ? (value / target) * 100 : 0;
    var fill = h('i', { style: { width: Math.min(pct, 100) + '%' } });
    if (pct > 105) fill.classList.add('over');
    return h('div.bar' + (cls ? '.' + cls : ''), fill);
  }

  function storeDot(storeId) { return h('span.store-dot.s-' + storeId); }

  function storeName(storeId) {
    var s = global.CATALOGUE.store(storeId);
    return h('span.store-name.s-' + storeId, s ? s.name : storeId);
  }

  /**
   * Renders a price so its provenance is always visible: a seeded estimate is
   * amber with a "?", a price you confirmed is plain. Clicking either opens the
   * editor. This is the app being honest about what it does and doesn't know.
   */
  function priceTag(entry, onEdit) {
    var needs = global.Pricing.needsCheck(entry);
    var title;

    if (needs && entry.source === 'seed') {
      title = 'Estimated price, never checked — tap to set what it actually costs';
    } else if (needs) {
      title = 'Last checked ' + entry.updated + ' and now stale — tap to update';
    } else if (entry.source === 'verified') {
      title = 'Real price read from ' + (entry.from || 'the retailer') +
              ' on ' + entry.updated + ' — tap if it differs at your store';
    } else {
      title = 'You set this on ' + entry.updated + ' — tap to update';
    }

    return h('span', {
      class: needs ? 'seeded' : (entry.source === 'verified' ? 'verified' : 'confirmed'),
      title: title,
      onclick: onEdit
    }, money(entry.price));
  }

  function toast(msg) {
    var t = h('div', {
      style: {
        position: 'fixed', left: '50%', bottom: '5rem', transform: 'translateX(-50%)',
        background: 'var(--text)', color: 'var(--bg)', padding: '.6rem 1rem',
        borderRadius: '999px', fontSize: '.85rem', fontWeight: '600',
        zIndex: '200', boxShadow: 'var(--shadow)', maxWidth: '90vw', textAlign: 'center'
      }
    }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  function confirmDialog(title, message, confirmLabel, onConfirm) {
    modal(title, function (body, close) {
      body.appendChild(h('p', message));
      body.appendChild(h('div.row', { style: { justifyContent: 'flex-end' } },
        h('button.btn', { onclick: close }, 'Cancel'),
        h('button.btn.danger', {
          onclick: function () { close(); onConfirm(); }
        }, confirmLabel)));
    });
  }

  global.UI = {
    h: h, clear: clear, append: append,
    modal: modal, closeModal: closeModal, confirmDialog: confirmDialog,
    money: money, macroLine: macroLine, bar: bar,
    storeDot: storeDot, storeName: storeName, priceTag: priceTag, toast: toast
  };
})(window);
