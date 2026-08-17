/* recipes.js — the seeded recipe library.
 *
 * Turkish and Latin American home cooking, tuned to the brief: no pork,
 * protein-forward, solid carbs, cheap, and cooked for one. Almost everything is
 * baseServings:2+ on purpose — you cook once, eat one serve now, and the app
 * drops the rest into the next day's lunch. That halves the cooking and stops a
 * solo cook throwing out half a packet of everything.
 *
 * These two cuisines suit the goal well. Turkish cooking leans on bulgur,
 * yoghurt and legumes; Latin American on rice and beans — all cheap, all high
 * protein. Rice and beans together even make a complete protein for about a
 * dollar a serve, which is the best value in the whole catalogue.
 *
 * Macros and costs are NOT stored here. They are computed from the ingredient
 * list against the catalogue (see pricing.js), so nutrition can never drift out
 * of sync with what a recipe actually contains.
 *
 * Ingredient rows are [itemId, qty, unit]. Every itemId must exist in
 * items.js and every unit must be known to units.js — tests/test-data.js
 * enforces both, so a typo fails the test run instead of silently costing $0.
 */
(function (global) {
  'use strict';

  var recipes = [];

  function R(id, name, tags, meals, servings, mins, ing, steps) {
    recipes.push({
      id: id,
      name: name,
      tags: tags,
      meals: meals,
      baseServings: servings,
      timeMins: mins,
      ingredients: ing.map(function (r) {
        return { itemId: r[0], qty: r[1], unit: r[2] };
      }),
      steps: steps
    });
  }

  /* ══════════════════════════ BREAKFAST ══════════════════════════ */

  R('menemen', 'Menemen (Turkish eggs with tomato & capsicum)',
    ['turkish', 'high-protein', 'quick', 'vegetarian'], ['breakfast', 'lunch'], 1, 15,
    [['eggs', 3, 'each'], ['tomato', 2, 'each'], ['capsicum', 1, 'each'],
     ['onion', 60, 'g'], ['olive-oil', 15, 'ml'], ['chilli-flakes', 1, 'g'],
     ['salt', 1, 'g'], ['flatbread', 0.5, 'each']],
    ['Dice the onion and capsicum and soften them in the olive oil for 5 minutes.',
     'Grate or finely chop the tomatoes and add them with the chilli flakes and salt.',
     'Simmer until the tomato breaks down into a thick sauce, about 6 minutes.',
     'Crack the eggs straight in and stir gently so they just set into the sauce — do not fully scramble.',
     'Pull it off the heat while still a little soft. Scoop up with warm flatbread.']);

  R('cilbir', 'Çılbır (poached eggs on garlic yoghurt)',
    ['turkish', 'high-protein', 'quick', 'vegetarian'], ['breakfast'], 1, 12,
    [['eggs', 2, 'each'], ['yoghurt-greek', 150, 'g'], ['garlic', 1, 'clove'],
     ['butter', 15, 'g'], ['paprika', 3, 'g'], ['mint-dried', 1, 'g'],
     ['flatbread', 0.5, 'each'], ['vinegar', 10, 'ml']],
    ['Stir the crushed garlic through the yoghurt with a pinch of salt and spread it on a plate.',
     'Bring a pot of water to a bare simmer with the vinegar.',
     'Crack each egg into a cup and slip it in; poach 3 minutes for runny yolks.',
     'Melt the butter in a small pan until it foams, then stir in the paprika and mint off the heat.',
     'Sit the drained eggs on the yoghurt and spoon the red butter over. Serve with flatbread.']);

  R('sucuklu-yumurta', 'Sucuklu yumurta (eggs with Turkish sausage)',
    ['turkish', 'high-protein', 'quick'], ['breakfast'], 1, 12,
    [['eggs', 3, 'each'], ['sucuk', 80, 'g'], ['tomato', 1, 'each'],
     ['flatbread', 0.5, 'each'], ['chilli-flakes', 1, 'g']],
    ['Slice the sucuk and fry it in a dry pan — it releases its own spiced fat.',
     'Once the edges crisp, crack the eggs straight into the pan among the slices.',
     'Cook to your liking, sunny side or lightly stirred.',
     'Serve with sliced tomato and warm flatbread.']);

  R('turkish-breakfast-plate', 'Turkish breakfast plate (kahvaltı)',
    ['turkish', 'no-cook', 'vegetarian', 'quick'], ['breakfast'], 1, 8,
    [['feta', 60, 'g'], ['olives', 40, 'g'], ['cucumber', 0.5, 'each'],
     ['tomato', 1, 'each'], ['flatbread', 0.5, 'each'], ['honey', 15, 'g'],
     ['walnuts', 20, 'g'], ['eggs', 2, 'each']],
    ['Boil the eggs for 8 minutes, then cool and peel.',
     'Arrange feta, olives, sliced cucumber and tomato on a plate.',
     'Add the eggs, a spoon of honey and a few walnuts.',
     'Serve with flatbread. No cooking beyond the eggs — this is the classic spread.']);

  R('huevos-rancheros', 'Huevos rancheros',
    ['latin', 'high-protein', 'quick', 'vegetarian'], ['breakfast', 'lunch'], 1, 15,
    [['eggs', 2, 'each'], ['tortilla-corn', 2, 'each'], ['black-beans-tin', 0.5, 'each'],
     ['tomato', 1, 'each'], ['onion', 40, 'g'], ['chilli-flakes', 1, 'g'],
     ['cheese-tasty', 30, 'g'], ['veg-oil', 10, 'ml'], ['coriander', 0.25, 'each']],
    ['Warm the drained beans in a pan with a splash of water and mash roughly.',
     'Make a quick salsa: dice the tomato and onion, add chilli flakes and salt.',
     'Warm the tortillas in a dry pan for 20 seconds a side.',
     'Fry the eggs in the oil.',
     'Stack: tortillas, beans, eggs, salsa, grated cheese and coriander.']);

  R('breakfast-burrito', 'Bean & egg breakfast burrito',
    ['latin', 'high-protein', 'quick'], ['breakfast', 'lunch'], 1, 12,
    [['wraps', 1, 'each'], ['eggs', 3, 'each'], ['black-beans-tin', 0.5, 'each'],
     ['cheese-tasty', 40, 'g'], ['capsicum', 0.5, 'each'], ['veg-oil', 10, 'ml'],
     ['sriracha', 10, 'ml']],
    ['Fry the diced capsicum for 3 minutes, then add the beaten eggs and scramble softly.',
     'Warm the drained beans and the wrap.',
     'Pile eggs, beans, cheese and hot sauce down the middle of the wrap.',
     'Fold the ends in and roll it tight. Sear seam-side down for 30 seconds to seal.']);

  R('arepas-egg-cheese', 'Arepas with egg & cheese',
    ['latin', 'high-protein', 'vegetarian'], ['breakfast', 'lunch'], 2, 25,
    [['masa-harina', 160, 'g'], ['cheese-tasty', 80, 'g'], ['eggs', 3, 'each'],
     ['butter', 20, 'g'], ['salt', 3, 'g'], ['veg-oil', 15, 'ml']],
    ['Mix the masa with a good pinch of salt and about 200 ml warm water into a soft dough.',
     'Rest 5 minutes, then shape into flat discs about 1 cm thick.',
     'Cook in a lightly oiled pan for 5 minutes a side until a crust forms.',
     'Scramble the eggs in butter.',
     'Split each arepa, stuff with egg and cheese, and let the cheese melt in the warm pocket.']);

  R('protein-oats-cinnamon', 'Cinnamon protein oats with walnuts',
    ['high-protein', 'bulk-kcal', 'quick', 'vegetarian'], ['breakfast'], 1, 8,
    [['oats', 80, 'g'], ['milk', 300, 'ml'], ['whey-protein', 30, 'g'],
     ['walnuts', 25, 'g'], ['honey', 15, 'g'], ['cinnamon', 2, 'g'], ['banana', 1, 'each']],
    ['Cook the oats in the milk with the cinnamon until thick, about 4 minutes.',
     'Let it cool for a minute, then stir in the protein powder so it does not go lumpy.',
     'Top with sliced banana, walnuts and a drizzle of honey.']);

  /* ══════════════════════════ TURKISH MAINS ══════════════════════════ */

  R('mercimek-corbasi', 'Mercimek çorbası (red lentil soup)',
    ['turkish', 'vegetarian', 'budget', 'batch', 'high-protein'], ['lunch', 'dinner'], 4, 35,
    [['lentils-dry', 300, 'g'], ['onion', 150, 'g'], ['carrot', 120, 'g'],
     ['potato', 150, 'g'], ['tomato-paste', 30, 'g'], ['cumin', 6, 'g'],
     ['mint-dried', 3, 'g'], ['olive-oil', 20, 'ml'], ['stock-cubes', 2, 'each'],
     ['lemon', 1, 'each'], ['chilli-flakes', 2, 'g'], ['salt', 3, 'g']],
    ['Soften the diced onion and carrot in the oil for 6 minutes.',
     'Stir in the tomato paste and cumin and cook for a minute.',
     'Add the rinsed lentils, diced potato, stock cubes and 1.5 litres of water.',
     'Simmer 25 minutes until everything is soft and collapsing.',
     'Blend smooth with a stick blender, or leave it rustic.',
     'Finish each bowl with a squeeze of lemon and a sprinkle of dried mint and chilli.',
     'One of the cheapest high-protein meals you can cook. Freezes well.']);

  R('kofte-bulgur', 'Köfte with bulgur pilaf',
    ['turkish', 'high-protein', 'batch'], ['dinner', 'lunch'], 4, 40,
    [['beef-mince', 500, 'g'], ['bulgur', 300, 'g'], ['onion', 150, 'g'],
     ['garlic', 3, 'clove'], ['cumin', 6, 'g'], ['paprika', 6, 'g'],
     ['parsley', 0.5, 'each'], ['tomato-paste', 20, 'g'], ['olive-oil', 20, 'ml'],
     ['stock-cubes', 1, 'each'], ['salt', 4, 'g']],
    ['Mix the mince with half the grated onion, the garlic, cumin, paprika, chopped parsley and salt.',
     'Knead it well for a minute — this is what gives köfte their bounce — then shape into small ovals.',
     'Fry in oil over medium-high heat for 4 minutes a side until well browned.',
     'For the pilaf, fry the rest of the onion, stir in the tomato paste, then the bulgur.',
     'Add the crumbled stock cube and 600 ml boiling water, cover, and cook 15 minutes.',
     'Rest the pilaf off the heat 5 minutes, then fluff. Serve the köfte on top.']);

  R('turkish-chicken-pilaf', 'Turkish chicken & bulgur pilaf',
    ['turkish', 'high-protein', 'one-pan', 'batch'], ['dinner', 'lunch'], 4, 40,
    [['chicken-thigh', 600, 'g'], ['bulgur', 320, 'g'], ['onion', 150, 'g'],
     ['tomato-paste', 40, 'g'], ['capsicum', 1, 'each'], ['butter', 30, 'g'],
     ['stock-cubes', 2, 'each'], ['paprika', 6, 'g'], ['chickpeas-tin', 1, 'each'],
     ['salt', 3, 'g']],
    ['Brown the diced chicken in the butter, then set it aside.',
     'Fry the onion and capsicum in the same pot, then stir in the tomato paste and paprika.',
     'Add the bulgur and drained chickpeas and coat them in the paste.',
     'Return the chicken, add the stock cubes and 650 ml boiling water.',
     'Cover and cook on low for 15 minutes, then rest off the heat for 5.',
     'Fluff with a fork before serving.']);

  R('kisir', 'Kısır (Turkish bulgur salad)',
    ['turkish', 'vegetarian', 'budget', 'no-cook', 'meal-prep'], ['lunch', 'snack'], 3, 20,
    [['bulgur', 200, 'g'], ['tomato-paste', 40, 'g'], ['spring-onion', 0.5, 'each'],
     ['parsley', 1, 'each'], ['cucumber', 0.5, 'each'], ['lemon', 1, 'each'],
     ['olive-oil', 30, 'ml'], ['pomegranate-molasses', 20, 'ml'], ['sumac', 3, 'g'],
     ['chilli-flakes', 2, 'g'], ['salt', 3, 'g']],
    ['Pour 250 ml boiling water over the bulgur, cover, and leave 15 minutes until soft.',
     'Fluff it, then mix in the tomato paste until every grain is coated red.',
     'Add finely chopped spring onion, parsley and cucumber.',
     'Dress with lemon juice, olive oil, pomegranate molasses, sumac, chilli and salt.',
     'Better after an hour in the fridge. Keeps 3 days — a deliberate batch.']);

  R('kuru-fasulye', 'Kuru fasulye (white bean stew) with rice',
    ['turkish', 'vegetarian', 'budget', 'batch', 'high-protein'], ['dinner', 'lunch'], 4, 35,
    [['white-beans-tin', 3, 'each'], ['rice-white', 300, 'g'], ['onion', 150, 'g'],
     ['tomato-paste', 50, 'g'], ['capsicum', 1, 'each'], ['paprika', 8, 'g'],
     ['olive-oil', 25, 'ml'], ['stock-cubes', 1, 'each'], ['chilli-flakes', 2, 'g'],
     ['salt', 3, 'g']],
    ['Fry the diced onion and capsicum in the oil for 6 minutes.',
     'Stir in the tomato paste, paprika and chilli, and cook for a minute.',
     'Add the drained beans, the crumbled stock cube and 400 ml water.',
     'Simmer 20 minutes, mashing a few beans against the pot to thicken the sauce.',
     'Serve over plain rice. This is Turkish comfort food and costs almost nothing.']);

  R('nohut-yemegi', 'Nohut (Turkish chickpea stew) with rice',
    ['turkish', 'vegetarian', 'budget', 'batch', 'high-protein'], ['dinner', 'lunch'], 4, 35,
    [['chickpeas-tin', 3, 'each'], ['rice-white', 300, 'g'], ['onion', 120, 'g'],
     ['tomato', 2, 'each'], ['tomato-paste', 40, 'g'], ['carrot', 100, 'g'],
     ['olive-oil', 25, 'ml'], ['cumin', 5, 'g'], ['paprika', 5, 'g'],
     ['stock-cubes', 1, 'each'], ['salt', 3, 'g']],
    ['Soften the diced onion and carrot in the oil.',
     'Add the grated tomato, tomato paste, cumin and paprika, and cook 5 minutes.',
     'Add the drained chickpeas, the stock cube and 400 ml water.',
     'Simmer 20 minutes until thick.',
     'Serve with rice.']);

  R('mercimek-koftesi', 'Mercimek köftesi (red lentil patties)',
    ['turkish', 'vegetarian', 'budget', 'no-cook-skill', 'high-protein'], ['lunch', 'snack'], 3, 30,
    [['lentils-dry', 200, 'g'], ['bulgur', 150, 'g'], ['onion', 100, 'g'],
     ['tomato-paste', 40, 'g'], ['spring-onion', 0.5, 'each'], ['parsley', 0.5, 'each'],
     ['cumin', 5, 'g'], ['olive-oil', 25, 'ml'], ['lemon', 1, 'each'], ['salt', 3, 'g']],
    ['Simmer the lentils in 500 ml water for 20 minutes until soft and the water is gone.',
     'Stir the bulgur straight in, cover, and leave 15 minutes to swell.',
     'Fry the diced onion in the oil with the tomato paste and cumin, then mix it through.',
     'Add chopped spring onion and parsley, lemon juice and salt.',
     'Wet your hands and squeeze into small patties.',
     'Eat cold, wrapped in lettuce or with flatbread. Keeps well for lunches.']);

  R('eggplant-chickpea-braise', 'Braised eggplant & chickpeas with yoghurt',
    ['turkish', 'vegetarian', 'batch'], ['dinner', 'lunch'], 3, 40,
    [['eggplant', 2, 'each'], ['chickpeas-tin', 2, 'each'], ['onion', 120, 'g'],
     ['garlic', 3, 'clove'], ['tomatoes-tin', 1, 'each'], ['tomato-paste', 30, 'g'],
     ['olive-oil', 35, 'ml'], ['cumin', 5, 'g'], ['yoghurt-greek', 200, 'g'],
     ['rice-white', 240, 'g'], ['salt', 3, 'g']],
    ['Cube the eggplant, salt it, and leave 10 minutes, then pat dry.',
     'Fry the eggplant in most of the oil until golden and soft, then set aside.',
     'Soften the onion and garlic, add tomato paste and cumin.',
     'Add the tinned tomatoes, drained chickpeas and eggplant, and simmer 15 minutes.',
     'Serve over rice with a big spoon of garlicky yoghurt on top.']);

  R('chicken-sis-rice', 'Chicken şiş with rice & yoghurt',
    ['turkish', 'high-protein', 'quick'], ['dinner', 'lunch'], 2, 30,
    [['chicken-thigh', 350, 'g'], ['rice-white', 180, 'g'], ['yoghurt-greek', 100, 'g'],
     ['garlic', 2, 'clove'], ['paprika', 5, 'g'], ['cumin', 4, 'g'],
     ['tomato-paste', 20, 'g'], ['olive-oil', 20, 'ml'], ['lemon', 0.5, 'each'],
     ['capsicum', 1, 'each'], ['salt', 3, 'g']],
    ['Marinate the diced chicken in half the yoghurt, the garlic, paprika, cumin, tomato paste and oil — 15 minutes if you can.',
     'Start the rice.',
     'Thread the chicken and chunks of capsicum onto skewers, or just spread on a hot pan.',
     'Cook over high heat for 8 minutes, turning, until charred at the edges and cooked through.',
     'Serve on the rice with the rest of the yoghurt and a squeeze of lemon.']);

  R('adana-wrap', 'Spiced beef köfte wraps (Adana style)',
    ['turkish', 'high-protein'], ['dinner', 'lunch'], 2, 30,
    [['beef-mince', 400, 'g'], ['flatbread', 1, 'each'], ['onion', 80, 'g'],
     ['garlic', 2, 'clove'], ['paprika', 6, 'g'], ['cumin', 4, 'g'],
     ['chilli-flakes', 3, 'g'], ['yoghurt-greek', 100, 'g'], ['tomato', 1, 'each'],
     ['parsley', 0.5, 'each'], ['sumac', 3, 'g'], ['salt', 4, 'g']],
    ['Mix the mince with grated onion, garlic, paprika, cumin, chilli and salt, and knead well.',
     'Shape into long flat kebabs and fry (or grill) for 4 minutes a side.',
     'Warm the flatbread and spread with yoghurt.',
     'Add the kebabs, sliced tomato, parsley and a dusting of sumac.',
     'Roll up tight and cut in half.']);

  R('lamb-kofte-bulgur', 'Lamb köfte with bulgur pilaf',
    ['turkish', 'high-protein', 'batch'], ['dinner', 'lunch'], 4, 40,
    [['lamb-mince', 500, 'g'], ['bulgur', 300, 'g'], ['onion', 150, 'g'],
     ['garlic', 3, 'clove'], ['cumin', 6, 'g'], ['paprika', 6, 'g'],
     ['mint-dried', 3, 'g'], ['tomato-paste', 20, 'g'], ['olive-oil', 20, 'ml'],
     ['stock-cubes', 1, 'each'], ['salt', 4, 'g']],
    ['Mix the mince with half the grated onion, the garlic, cumin, paprika, dried mint and salt.',
     'Knead it well for a minute — this is what gives köfte their bounce — then shape into small ovals.',
     'Fry over medium-high heat for 4 minutes a side until well browned. Lamb mince runs fattier ' +
     'than beef, so you likely will not need extra oil in the pan.',
     'For the pilaf, fry the rest of the onion, stir in the tomato paste, then the bulgur.',
     'Add the crumbled stock cube and 600 ml boiling water, cover, and cook 15 minutes.',
     'Rest the pilaf off the heat 5 minutes, then fluff. Serve the köfte on top.']);

  R('lamb-sis-rice', 'Lamb şiş with rice & yoghurt',
    ['turkish', 'high-protein', 'quick'], ['dinner', 'lunch'], 2, 30,
    [['lamb-mince', 350, 'g'], ['rice-white', 180, 'g'], ['yoghurt-greek', 100, 'g'],
     ['garlic', 2, 'clove'], ['paprika', 5, 'g'], ['cumin', 4, 'g'], ['sumac', 3, 'g'],
     ['olive-oil', 15, 'ml'], ['lemon', 0.5, 'each'], ['capsicum', 1, 'each'], ['salt', 3, 'g']],
    ['Mix the lamb mince with the crushed garlic, paprika, cumin, sumac and salt.',
     'Start the rice.',
     'Shape the mince around skewers or into flat patties, and chargrill or pan-fry with the ' +
     'capsicum for 8-10 minutes, turning, until well charred.',
     'Serve on the rice with a generous spoon of yoghurt and a squeeze of lemon.']);

  R('menemen-sucuk-beans', 'Turkish braised green beans (zeytinyağlı)',
    ['turkish', 'vegetarian', 'budget'], ['dinner', 'lunch'], 3, 35,
    [['green-beans', 400, 'g'], ['white-beans-tin', 1, 'each'], ['onion', 120, 'g'],
     ['tomato', 2, 'each'], ['tomato-paste', 20, 'g'], ['olive-oil', 30, 'ml'],
     ['rice-white', 240, 'g'], ['garlic', 2, 'clove'], ['salt', 3, 'g']],
    ['Soften the onion and garlic in the olive oil — use a generous amount, this is an olive-oil dish.',
     'Add grated tomato and tomato paste and cook 5 minutes.',
     'Add the trimmed green beans, drained white beans and 200 ml water.',
     'Cover and simmer gently for 20 minutes until the beans are very tender.',
     'Good hot or at room temperature, with rice.']);

  /* ══════════════════════════ LATIN AMERICAN MAINS ══════════════════════════ */

  R('rice-and-beans', 'Rice & black beans (gallo pinto style)',
    ['latin', 'vegetarian', 'budget', 'batch', 'high-protein', 'complete-protein'], ['dinner', 'lunch'], 4, 40,
    [['black-beans-dry', 300, 'g'], ['rice-white', 320, 'g'], ['onion', 150, 'g'],
     ['garlic', 3, 'clove'], ['capsicum', 1, 'each'], ['cumin', 6, 'g'],
     ['oregano', 3, 'g'], ['veg-oil', 25, 'ml'], ['stock-cubes', 1, 'each'],
     ['coriander', 0.5, 'each'], ['salt', 4, 'g']],
    ['Soak the black beans overnight, then simmer in fresh water for about an hour until tender (or use two tins to skip this).',
     'Fry the diced onion, garlic and capsicum in the oil.',
     'Add the cumin and oregano, then the cooked beans with a ladle of their liquid.',
     'Cook the rice separately with the crumbled stock cube.',
     'Fold the rice through the beans so it picks up the colour, and finish with coriander.',
     'Rice and beans together are a complete protein for about a dollar a serve — the best value here.']);

  R('arroz-con-pollo', 'Arroz con pollo',
    ['latin', 'high-protein', 'one-pan', 'batch'], ['dinner', 'lunch'], 4, 45,
    [['chicken-thigh', 600, 'g'], ['rice-white', 320, 'g'], ['onion', 150, 'g'],
     ['capsicum', 1, 'each'], ['garlic', 3, 'clove'], ['tomato-paste', 40, 'g'],
     ['peas-frozen', 150, 'g'], ['paprika', 6, 'g'], ['cumin', 5, 'g'],
     ['stock-cubes', 2, 'each'], ['veg-oil', 25, 'ml'], ['salt', 3, 'g']],
    ['Brown the chicken pieces in the oil, then set aside.',
     'Fry the onion, capsicum and garlic in the same pan.',
     'Stir in the tomato paste, paprika and cumin.',
     'Add the rice and coat it, then return the chicken with the stock cubes and 700 ml water.',
     'Cover and cook low for 18 minutes.',
     'Stir the peas through at the end and rest 5 minutes before serving.']);

  R('picadillo', 'Beef picadillo with rice',
    ['latin', 'high-protein', 'batch', 'freezer'], ['dinner', 'lunch'], 4, 35,
    [['beef-mince', 500, 'g'], ['rice-white', 320, 'g'], ['onion', 150, 'g'],
     ['garlic', 3, 'clove'], ['tomatoes-tin', 1, 'each'], ['tomato-paste', 30, 'g'],
     ['capsicum', 1, 'each'], ['sultanas', 40, 'g'], ['olives', 40, 'g'],
     ['cumin', 6, 'g'], ['oregano', 3, 'g'], ['veg-oil', 20, 'ml'], ['salt', 3, 'g']],
    ['Brown the mince hard, then set aside.',
     'Fry the onion, capsicum and garlic, then add cumin and oregano.',
     'Return the mince with the tinned tomatoes and tomato paste.',
     'Stir in the sultanas and chopped olives — the sweet-and-salty hit is what makes picadillo.',
     'Simmer 15 minutes until thick. Serve with rice. Freezes well.']);

  R('chicken-tinga-tacos', 'Chicken tinga tacos',
    ['latin', 'high-protein', 'batch'], ['dinner', 'lunch'], 3, 35,
    [['chicken-breast', 500, 'g'], ['tortilla-corn', 9, 'each'], ['onion', 120, 'g'],
     ['garlic', 3, 'clove'], ['tomatoes-tin', 1, 'each'], ['chipotle-paste', 30, 'g'],
     ['veg-oil', 20, 'ml'], ['sour-cream', 90, 'g'], ['coriander', 0.5, 'each'],
     ['lime', 1, 'each'], ['salt', 3, 'g']],
    ['Poach the chicken breasts in salted water for 15 minutes, then shred with two forks.',
     'Fry the sliced onion and garlic until soft.',
     'Add the tinned tomatoes and chipotle paste and simmer 5 minutes, then blend smooth.',
     'Stir the shredded chicken through the sauce and warm it through.',
     'Pile into warm tortillas with sour cream, coriander and a squeeze of lime.']);

  R('beef-bean-burrito', 'Beef & black bean burritos',
    ['latin', 'high-protein', 'batch', 'bulk-kcal'], ['dinner', 'lunch'], 3, 30,
    [['beef-mince', 400, 'g'], ['wraps', 6, 'each'], ['black-beans-tin', 2, 'each'],
     ['rice-white', 150, 'g'], ['cheese-tasty', 90, 'g'], ['onion', 100, 'g'],
     ['cumin', 6, 'g'], ['paprika', 5, 'g'], ['chipotle-paste', 20, 'g'],
     ['veg-oil', 15, 'ml'], ['salt', 3, 'g']],
    ['Cook the rice.',
     'Brown the mince with the onion, then add cumin, paprika and chipotle.',
     'Warm the drained beans and mash roughly.',
     'Lay out each wrap with rice, beans, beef and cheese down the middle.',
     'Fold the ends in, roll tight, and sear seam-side down to seal.',
     'These freeze brilliantly — wrap individually and reheat for fast lunches.']);

  R('chilli-con-carne', 'Chilli con carne with rice',
    ['latin', 'high-protein', 'batch', 'freezer', 'budget'], ['dinner', 'lunch'], 4, 40,
    [['beef-mince', 500, 'g'], ['rice-white', 300, 'g'], ['kidney-beans-tin', 2, 'each'],
     ['tomatoes-tin', 2, 'each'], ['onion', 150, 'g'], ['garlic', 3, 'clove'],
     ['cumin', 8, 'g'], ['paprika', 8, 'g'], ['chipotle-paste', 20, 'g'],
     ['tomato-paste', 50, 'g'], ['veg-oil', 20, 'ml'], ['stock-cubes', 1, 'each']],
    ['Brown the mince hard in a hot pan, then set aside.',
     'Fry the onion until soft, add garlic, cumin and paprika for a minute.',
     'Stir in the tomato paste and chipotle, then return the mince.',
     'Add tinned tomatoes, drained beans and the crumbled stock cube.',
     'Simmer 25 minutes. Taste and add salt — chilli always needs more than you think.',
     'Serve with rice. Makes four; freeze two.']);

  R('fish-tacos', 'Fish tacos with cabbage slaw',
    ['latin', 'high-protein', 'quick', 'lean'], ['dinner', 'lunch'], 2, 25,
    [['white-fish', 400, 'g'], ['tortilla-corn', 6, 'each'], ['cabbage', 200, 'g'],
     ['sour-cream', 60, 'g'], ['lime', 1, 'each'], ['cumin', 4, 'g'],
     ['paprika', 4, 'g'], ['mayonnaise', 20, 'g'], ['veg-oil', 20, 'ml'],
     ['coriander', 0.5, 'each'], ['salt', 3, 'g']],
    ['Shred the cabbage and toss with the mayo, half the lime juice and a pinch of salt.',
     'Pat the fish dry, season with cumin, paprika and salt.',
     'Fry in the oil for 3 minutes a side until it flakes.',
     'Warm the tortillas.',
     'Break the fish into pieces and build tacos with slaw, sour cream, coriander and lime.']);

  R('pabellon', 'Shredded beef with rice, beans & plantain',
    ['latin', 'high-protein', 'batch', 'bulk-kcal'], ['dinner', 'lunch'], 4, 120,
    [['beef-chuck', 600, 'g'], ['rice-white', 320, 'g'], ['black-beans-tin', 2, 'each'],
     ['plantain', 2, 'each'], ['onion', 150, 'g'], ['garlic', 3, 'clove'],
     ['capsicum', 1, 'each'], ['tomato-paste', 40, 'g'], ['cumin', 6, 'g'],
     ['veg-oil', 30, 'ml'], ['stock-cubes', 2, 'each'], ['salt', 4, 'g']],
    ['Simmer the beef whole in salted water with a stock cube for about 90 minutes until it shreds.',
     'Shred it with two forks and keep a cup of the broth.',
     'Fry onion, garlic and capsicum, add tomato paste and cumin, then the beef and a splash of broth.',
     'Warm the black beans with the second stock cube.',
     'Fry thick slices of plantain in the oil until golden and sweet.',
     'Plate the classic way: rice, shredded beef, black beans and fried plantain side by side.']);

  R('quesadillas', 'Bean & cheese quesadillas',
    ['latin', 'vegetarian', 'quick', 'budget'], ['dinner', 'lunch', 'snack'], 2, 20,
    [['wraps', 4, 'each'], ['black-beans-tin', 1, 'each'], ['cheese-tasty', 120, 'g'],
     ['capsicum', 1, 'each'], ['onion', 60, 'g'], ['cumin', 4, 'g'],
     ['veg-oil', 15, 'ml'], ['jalapenos', 30, 'g']],
    ['Fry the diced capsicum and onion until soft, add cumin.',
     'Mash the drained beans and spread over half of each wrap.',
     'Add the veg, cheese and a few jalapeños, then fold over.',
     'Dry-fry each quesadilla for 2 minutes a side until crisp and the cheese melts.',
     'Cut into wedges.']);

  R('latin-chicken-bowl', 'Chicken, rice & avocado bowl',
    ['latin', 'high-protein', 'quick', 'meal-prep'], ['dinner', 'lunch'], 2, 25,
    [['chicken-breast', 350, 'g'], ['rice-white', 180, 'g'], ['black-beans-tin', 1, 'each'],
     ['avocado', 1, 'each'], ['corn-tin', 150, 'g'], ['tomato', 1, 'each'],
     ['lime', 1, 'each'], ['cumin', 5, 'g'], ['paprika', 4, 'g'],
     ['veg-oil', 15, 'ml'], ['coriander', 0.5, 'each'], ['salt', 3, 'g']],
    ['Cook the rice with a squeeze of lime stirred through at the end.',
     'Season the chicken with cumin, paprika and salt and fry 6 minutes until cooked, then slice.',
     'Warm the beans and corn.',
     'Build bowls with rice, beans, corn, sliced chicken, avocado, diced tomato and coriander.']);

  R('pumpkin-lentil-stew', 'Pumpkin & lentil stew (guiso)',
    ['latin', 'vegetarian', 'budget', 'batch', 'high-protein'], ['dinner', 'lunch'], 4, 40,
    [['lentils-dry', 250, 'g'], ['pumpkin', 500, 'g'], ['rice-white', 240, 'g'],
     ['onion', 150, 'g'], ['garlic', 3, 'clove'], ['tomatoes-tin', 1, 'each'],
     ['capsicum', 1, 'each'], ['cumin', 6, 'g'], ['paprika', 5, 'g'],
     ['veg-oil', 25, 'ml'], ['stock-cubes', 2, 'each'], ['salt', 3, 'g']],
    ['Fry the diced onion, capsicum and garlic in the oil.',
     'Add cumin and paprika, then the tinned tomatoes.',
     'Add the rinsed lentils, cubed pumpkin, stock cubes and 1 litre of water.',
     'Simmer 25 minutes until the lentils are soft and the pumpkin collapses into the sauce.',
     'Serve over rice, or on its own as a thick stew.']);

  R('empanada-bake', 'Beef empanada tray bake',
    ['latin', 'high-protein', 'batch'], ['dinner', 'lunch'], 4, 55,
    [['beef-mince', 500, 'g'], ['potato', 400, 'g'], ['onion', 150, 'g'],
     ['eggs', 2, 'each'], ['flour-plain', 300, 'g'], ['butter', 80, 'g'],
     ['olives', 40, 'g'], ['cumin', 6, 'g'], ['paprika', 5, 'g'],
     ['veg-oil', 20, 'ml'], ['salt', 4, 'g']],
    ['Rub the butter into the flour with a big pinch of salt and enough water to make a dough; rest it.',
     'Brown the mince with the onion, cumin and paprika.',
     'Boil the diced potato until just tender and fold it through with chopped olives and one chopped boiled egg.',
     'Roll the dough out, cut discs, fill and crimp — or press it all into one tray as a pie.',
     'Brush with beaten egg and bake at 200°C for 25 minutes until golden.']);

  R('black-bean-soup', 'Latin black bean soup',
    ['latin', 'vegetarian', 'budget', 'batch', 'high-protein'], ['lunch', 'dinner'], 4, 35,
    [['black-beans-tin', 3, 'each'], ['onion', 150, 'g'], ['garlic', 4, 'clove'],
     ['carrot', 100, 'g'], ['capsicum', 1, 'each'], ['cumin', 8, 'g'],
     ['oregano', 3, 'g'], ['stock-cubes', 2, 'each'], ['veg-oil', 20, 'ml'],
     ['sour-cream', 80, 'g'], ['lime', 1, 'each'], ['salt', 3, 'g']],
    ['Soften the onion, carrot, capsicum and garlic in the oil for 8 minutes.',
     'Add cumin and oregano, then the drained beans, stock cubes and 1 litre of water.',
     'Simmer 20 minutes, then blend half of it smooth and leave the rest chunky.',
     'Season well, then serve each bowl with a spoon of sour cream and a squeeze of lime.']);

  /* ══════════════════════════ SNACKS ══════════════════════════ */

  R('yoghurt-walnut-honey', 'Yoghurt with walnuts & honey',
    ['turkish', 'high-protein', 'quick', 'no-cook', 'vegetarian'], ['snack', 'breakfast'], 1, 3,
    [['yoghurt-greek', 200, 'g'], ['walnuts', 30, 'g'], ['honey', 20, 'g'], ['cinnamon', 1, 'g']],
    ['Spoon the yoghurt into a bowl.',
     'Top with roughly chopped walnuts, honey and a dusting of cinnamon.']);

  R('hummus-flatbread', 'Chickpea hummus with flatbread',
    ['turkish', 'vegetarian', 'budget', 'no-cook', 'high-protein'], ['snack', 'lunch'], 2, 10,
    [['chickpeas-tin', 1, 'each'], ['tahini', 40, 'g'], ['garlic', 1, 'clove'],
     ['lemon', 1, 'each'], ['olive-oil', 25, 'ml'], ['cumin', 3, 'g'],
     ['flatbread', 1, 'each'], ['salt', 2, 'g']],
    ['Blend the drained chickpeas with the tahini, garlic, lemon juice, cumin and salt.',
     'Loosen with a little water until smooth and creamy.',
     'Swirl olive oil over the top and scoop up with warm flatbread.']);

  R('tahini-molasses-toast', 'Tahini & honey on bread (tahin-pekmez)',
    ['turkish', 'bulk-kcal', 'quick', 'no-cook', 'vegetarian'], ['snack', 'breakfast'], 1, 4,
    [['bread-wholemeal', 2, 'slice'], ['tahini', 30, 'g'], ['honey', 20, 'g'],
     ['banana', 0.5, 'each']],
    ['Toast the bread.',
     'Spread thickly with tahini, then drizzle honey over — stir them together on the bread.',
     'Top with sliced banana. A classic Turkish energy snack.']);

  R('guacamole-chips', 'Guacamole with corn chips',
    ['latin', 'vegetarian', 'no-cook', 'quick', 'bulk-kcal'], ['snack'], 2, 8,
    [['avocado', 2, 'each'], ['tortilla-corn', 6, 'each'], ['lime', 1, 'each'],
     ['onion', 40, 'g'], ['tomato', 1, 'each'], ['coriander', 0.5, 'each'],
     ['chilli-flakes', 1, 'g'], ['salt', 2, 'g']],
    ['Mash the avocado with lime juice and salt.',
     'Stir through finely diced onion, tomato, coriander and a pinch of chilli.',
     'Cut the tortillas into wedges and toast in a dry pan (or eat with warm flatbread).']);

  R('feta-olives-bread', 'Feta, olives & tomato plate',
    ['turkish', 'vegetarian', 'no-cook', 'quick', 'high-protein'], ['snack'], 1, 5,
    [['feta', 70, 'g'], ['olives', 40, 'g'], ['tomato', 1, 'each'],
     ['bread-wholemeal', 2, 'slice'], ['olive-oil', 10, 'ml'], ['oregano', 1, 'g']],
    ['Slice the feta and tomato onto a plate with the olives.',
     'Drizzle olive oil over and scatter oregano.',
     'Eat with bread.']);

  R('protein-shake', 'Protein shake',
    ['high-protein', 'quick', 'no-cook', 'vegetarian'], ['snack'], 1, 2,
    [['whey-protein', 35, 'g'], ['milk', 350, 'ml']],
    ['Shake or blend the protein powder into the milk.',
     'Milk rather than water adds roughly 230 kcal and 12 g of protein — worth it if you are gaining.']);

  R('gainer-smoothie', 'Weight-gain banana & walnut smoothie',
    ['high-protein', 'bulk-kcal', 'quick', 'no-cook', 'vegetarian'], ['snack', 'breakfast'], 1, 4,
    [['milk', 400, 'ml'], ['banana', 1, 'each'], ['oats', 50, 'g'],
     ['walnuts', 20, 'g'], ['whey-protein', 30, 'g'], ['honey', 15, 'g']],
    ['Put everything in a blender.',
     'Blend for a minute until the oats and walnuts are fully broken down.',
     'Drink alongside a meal rather than instead of one — this is extra calories, not a replacement.']);

  R('boiled-eggs', 'Boiled eggs',
    ['high-protein', 'budget', 'meal-prep', 'no-cook-skill', 'vegetarian'], ['snack'], 1, 12,
    [['eggs', 3, 'each'], ['salt', 1, 'g']],
    ['Lower the eggs into already-boiling water.',
     'Cook 9 minutes for firm yolks.',
     'Cool under cold running water, which also makes them far easier to peel.',
     'Boil six at once — they keep a week in the fridge.']);

  R('trail-mix', 'Walnut & sultana trail mix',
    ['bulk-kcal', 'no-cook', 'quick', 'vegetarian'], ['snack'], 2, 2,
    [['walnuts', 50, 'g'], ['almonds', 40, 'g'], ['sultanas', 40, 'g'], ['peanuts', 30, 'g']],
    ['Mix and portion into two containers.',
     'Very dense calories — an easy 400 kcal that does not fill you up before dinner.']);

  /* ─────────────────────────────────────────────────────────────── */

  var byId = {};
  recipes.forEach(function (r) { byId[r.id] = r; });

  global.RECIPES = {
    all: recipes,
    byId: byId,
    get: function (id) { return byId[id] || null; },
    forMeal: function (meal) {
      return recipes.filter(function (r) { return r.meals.indexOf(meal) !== -1; });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
