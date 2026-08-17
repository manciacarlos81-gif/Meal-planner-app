/* app.js — boot and hash router.
 *
 * Hash routing (not the History API) is deliberate: it works identically over
 * http:// and when the page is opened straight off disk as file://, which is
 * the whole point of this build.
 */
(function (global) {
  'use strict';

  var h = global.UI.h, S = global.Store;

  var ROUTES = [
    { path: 'plan',     label: 'Plan',    icon: '📅', view: function (r, p) { global.PlanView.render(r, p); } },
    { path: 'shop',     label: 'Shop',    icon: '🛒', view: function (r, p) { global.ShopView.render(r, p); } },
    { path: 'recipes',  label: 'Recipes', icon: '🍳', view: function (r, p) { global.RecipesView.render(r, p); } },
    { path: 'pantry',   label: 'Pantry',  icon: '🥫', view: function (r, p) { global.PantryView.render(r, p); } },
    { path: 'value',    label: 'Value',   icon: '📊', view: function (r, p) { global.ValueView.render(r, p); } },
    { path: 'settings', label: 'Settings', icon: '⚙️', view: function (r, p) { global.SettingsView.render(r, p); } }
  ];

  // Cook mode is reachable but not a tab — you get there from a meal or recipe.
  var COOK = { path: 'cook', view: function (r, p) { global.CookView.render(r, p); } };

  var viewEl, navEl;

  /** '#/cook/chicken-rice-bowl?servings=2' -> { path, id, servings } */
  function parseHash() {
    var raw = (global.location.hash || '').replace(/^#\/?/, '');
    var qIndex = raw.indexOf('?');
    var query = {};

    if (qIndex !== -1) {
      raw.slice(qIndex + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      raw = raw.slice(0, qIndex);
    }

    var segments = raw.split('/').filter(Boolean).map(decodeURIComponent);
    return Object.assign({ path: segments[0] || 'plan', id: segments[1] || null }, query);
  }

  function currentRoute() {
    var p = parseHash();
    if (p.path === COOK.path) return { route: COOK, params: p };
    for (var i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].path === p.path) return { route: ROUTES[i], params: p };
    }
    return { route: ROUTES[0], params: p };
  }

  function renderNav(activePath) {
    global.UI.clear(navEl);
    ROUTES.forEach(function (r) {
      navEl.appendChild(h('a' + (r.path === activePath ? '.on' : ''),
        { href: '#/' + r.path },
        h('span.ic', r.icon), h('span', r.label)));
    });
  }

  var lastPath = null;

  function rerender() {
    var current = currentRoute();
    var isCook = current.route === COOK;

    renderNav(isCook ? null : current.route.path);
    global.UI.clear(viewEl);

    // Leaving cook mode should let the screen sleep again.
    if (lastPath === COOK.path && !isCook) global.CookView.releaseWakeLock();
    lastPath = current.route.path;

    try {
      current.route.view(viewEl, current.params);
    } catch (err) {
      console.error('mealwise: view failed to render', err);
      viewEl.appendChild(h('div.card',
        h('h2', 'Something broke rendering this page'),
        h('p.small.muted', 'The error is in the browser console. Your saved data is ' +
          'untouched — try another tab, or reset from Settings if it persists.'),
        h('pre.small', { style: { whiteSpace: 'pre-wrap', overflowX: 'auto' } },
          String(err && err.stack || err))));
    }

    // Coming from a hash change, start at the top of the new page.
    if (!isCook) global.scrollTo(0, 0);
  }

  function boot() {
    viewEl = document.getElementById('view');
    navEl = document.getElementById('nav');

    // Take scroll into our own hands. The browser restores the previous scroll
    // position asynchronously after a reload, which lands you in blank space
    // below a shorter page and looks exactly like a render failure.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    S.load();
    S.syncPricing();

    global.addEventListener('hashchange', rerender);

    if (!global.location.hash) global.location.hash = '#/plan';
    rerender();

    if (!S.hasLocalStorage) {
      console.warn('mealwise: localStorage unavailable — changes will not persist.');
    }
  }

  global.App = { rerender: rerender, boot: boot, parseHash: parseHash };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
