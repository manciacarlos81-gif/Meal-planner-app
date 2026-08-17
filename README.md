# Mealwise

A local, budget-first meal planner for Australian shopping — Coles, ALDI, Big W and Costco.

Built for a specific situation: **cooking for one, trying to gain weight on good protein
and carbs, on a tight budget.** So it doesn't just plan meals — it ranks food by
**cost per gram of protein** and **cost per 1000 calories**, and splits your shopping
list across stores by what each item actually costs to buy.

No account, no subscription, no server. Everything stays on your computer.

---

## Running it

**Option 1 — just open it.** Double-click `index.html`. That's it. No install, no build
step, no Node required.

**Option 2 — run a local server** (recommended). Some browsers refuse to save data on
`file://` URLs; if the app warns that saving isn't working, use this instead:

```bash
cd meal-planner && python3 serve.py
```

Then open <http://localhost:8765>. Python 3 already ships with macOS — nothing to install.

`serve.py` is just `http.server` with caching turned off, because the stock one lets the
browser hold onto stale JS and you end up debugging a copy of the app you already fixed.

> **Always use the same URL.** `localhost:8765` and `127.0.0.1:8765` are different origins
> to the browser, and localStorage is per-origin — open the other one and your plan will
> look like it vanished. It hasn't; you're just looking at a different box.

---

## ⚠️ About the prices — read this

Prices come in three states, and the app always shows you which is which:

| | meaning |
|---|---|
| green **✓** | read from the retailer's own site — real |
| amber **?** | an estimate I seeded — a guess |
| plain | you set it yourself — always wins |

**Coles is verified.** 31 prices were read directly from coles.com.au on 13 August 2026
for delivery to **Melbourne 3000**. Coles sets prices by delivery area, so if you shop
outside inner Melbourne a few will be slightly off — fresh meat and produce move most.

**ALDI, Big W and Costco are still estimates.** None of them publishes a price API, and
only `coles.com.au` was granted to the browser extension, so they couldn't be checked.

### Why that matters more than it sounds

It isn't only the totals that are uncertain — **the store split is too.** If ALDI's price
is a guess and Coles' is real, then "buy this at ALDI" is itself a guess, and an
optimistic guess sends you to the wrong shop. The seeded ALDI prices lean cheap, so ALDI
currently wins more lines than it probably deserves. The Shop view states how many
assignments are affected.

Fixing this is easy and worth doing:

- Tap any price to correct it. One number, saved instantly, stamped with the date.
- **Settings → Price check** ranks unconfirmed prices by how much money each is actually
  deciding this week — fix the ten that matter, not the hundred that don't.

After two or three shops the catalogue is genuinely accurate to your local stores.

### What the real Coles prices changed

My estimates were systematically high on pantry staples and low on fresh meat:

| | seeded | actual | |
|---|---|---|---|
| Rolled oats | $3.50/kg | **$1.94/kg** | 1.8 kg bag |
| Pasta | $4.00/kg | **$2.00/kg** | |
| White rice | $3.00/kg | **$1.80/kg** | 2 kg bag |
| Greek yoghurt | $7.00/kg | **$4.20/kg** | |
| Butter | $24.00/kg | **$14.00/kg** | 500 g |
| Red lentils | $9.00/kg | **$4.00/kg** | |
| Chicken drumsticks | $5.50/kg | **$4.00/kg** | 2 kg pack |
| Chicken thigh | $11.00/kg | **$14.50/kg** | 32% under |
| Beef mince | $12.00/kg | **$14.50/kg** | |

Net effect on a week: **$118.61 → $111.01**, and Coles went from winning nothing to
winning five lines — my seeded Coles prices had been inflating it out of contention.

---

## What it does

**Plan** — a 7-day × 4-meal grid. Each day shows how close it lands to your calorie and
protein targets; the header shows projected spend against budget.

*Auto-fill week* builds a full seven days offline using a deterministic greedy algorithm —
no AI, no API key. It scores recipes on protein-per-dollar and calories-per-dollar, and
strongly favours reusing ingredients already in the week, because buying one 2 kg bag of
rice across four meals is far cheaper than four separate small buys.

**Cook once, eat twice.** Most recipes make 2+ servings. Assign one to dinner and the
spare serving is automatically parked as tomorrow's lunch, linked to its source so it's
never shopped for twice. This is the single most useful habit when cooking for one.

**Shop** — consolidates the week's ingredients, subtracts your pantry, and splits the list
by store and aisle.

It picks the store with the **lowest actual cost for the quantity you need**, which is not
the same as lowest unit price. Costco chicken is cheaper per kilo, but if the week needs
300 g, sending you to buy a 2.5 kg pack costs $20.50 instead of $9.50 at ALDI. Where the
bigger pack genuinely is better value, it's shown as a *bulk tip* so you can decide.

Loose produce (onions, carrots, potatoes) is priced by weight, not rounded up to a whole
bag — you weigh out 100 g of carrots and pay 16c, not $1.60.

Each store section tells you whether the extra stop is worth it: *"Worth the stop: these
items cost $12.40 more at your other stores."*

**Value** — the screen that answers the actual question. Ranks the whole catalogue by
$/30 g protein and $/1000 kcal.

By default it filters to real protein sources (≥15 g per 100 g). Without that filter the
top of the list is pasta, flour and rice — arithmetically the cheapest protein per dollar,
but you'd have to eat over a kilo a day to hit target on them. Turn the filter off to see
the raw ranking.

**Pantry** — what's already at home, so the list stops re-buying it.

**Cook** — big-type, one step at a time, scaled to your servings, screen held awake.

**Settings** — targets (with a Mifflin-St Jeor calculator), budget, which stores you shop,
which meats you eat, price-check queue, and JSON export/import for backup.

Turning off a protein (chicken/beef/lamb/seafood/vegetarian) in Settings stops auto-fill
and the meal picker from suggesting it — recipes stay visible on the Recipes tab so you
can still look one up or duplicate it. Classification is derived from each recipe's actual
ingredients, not a hand-applied tag, so it can't drift out of sync with an edited recipe.
There's no pork anywhere in the catalogue at all; that's the brief, not a filter setting.

---

## Your data

Everything is in this browser's localStorage under one key. Nothing is uploaded anywhere,
and there is no account.

The flip side: **clearing your browser data wipes it.** Export a backup from
Settings now and then.

---

## Tests

Unit conversion is where this class of app silently goes wrong, so the logic is tested.
Runs under JavaScriptCore, which ships with macOS — no npm, no test framework:

```bash
cd meal-planner && ./tests/run.sh
```

Four suites (the exact assertion count is easy to let go stale in a doc — run
the script above and read it off the summary line, rather than trusting a
number here):

- `test-units.js` — conversions, unit pricing, pack rounding, macro maths
- `test-data.js` — every recipe ingredient resolves to a real catalogue item in a
  convertible unit, every recipe is fully costable, no fresh food leaks into Big W
- `test-pricing.js` — cheapest-store rules, shopping list aggregation, pantry
  subtraction, planner output, batch/leftover shopping accounting
- `test-store.js` — state merge/import type-safety against malformed saved data

Two bugs these caught during the build, both invisible in the UI:

- `2 slice` of bread was being treated as **2 whole loaves** — a round of toast read as
  3,700 calories. Fixed by making conversion item-aware (`subUnits`), so a slice is 40 g
  and a clove is 5 g rather than a generic "count".
- The shopping list was choosing stores by unit price, sending you to Costco for a
  2.5 kg chicken pack to cover a 300 g recipe.

---

## Structure

```
index.html          all views, plain classic scripts in dependency order
serve.py            static server with caching disabled
css/app.css         mobile-first; the Shop view is used one-handed in an aisle
js/
  units.js          conversion, unit pricing, macro maths  ← the load-bearing module
  pricing.js        cheapest-store rules, value metrics, shopping list
  planner.js        deterministic greedy week filler
  store.js          state, localStorage, week/date helpers
  ui.js             DOM helpers (builds nodes, never innerHTML — recipe names are
                    user-editable and would otherwise execute)
  data/items.js     137-item catalogue; seeded estimates, then a VERIFIED block
                    near the bottom that overwrites Coles with real prices
  data/recipes.js   41 seeded recipes — Turkish & Latin American, no pork,
                    protein-forward
  views/*.js        one file per screen
  app.js            hash router (works over file:// as well as http://)
```

Deliberately no ES modules, no bundler and no `fetch()` for data — that's what keeps it
working when you open the file straight off disk on a machine with no Node installed.

### Adding items and recipes

Both data files use a compact helper. A catalogue item:

```js
I('chicken-thigh', 'Chicken thigh fillets', 'meat', 'kg', [145, 19, 0, 8],
  { c: [11.00, 1], a: [9.50, 1], x: [20.50, 2.5] }, { tags: ['protein-cheap'] });
//  ^ price, pack size    ^ Costco: $20.50 for 2.5kg
```

Store keys are `c` Coles, `a` ALDI, `w` Big W, `x` Costco. **An absent key means that store
doesn't stock it** — that's why Big W never wins a chicken comparison. Macros are
`[kcal, protein, carbs, fat]` per 100 g.

Useful extras: `gramsEach` (weight of one unit — required for macros on `each` items),
`gPerMl` (density, to bridge volume and mass), `subUnits` (item-specific portions in grams,
e.g. `{ slice: 40 }`), `loose: true` (sold by weight at the scales, so never rounded up
to a whole pack).

Run `./tests/run.sh` after editing — the data tests will catch a typo'd id, an
unconvertible unit, or a missing density before it silently costs $0.00.
