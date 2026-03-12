const Crafting = (() => {

  // Each recipe: { id, label, cost, unlocked, oneTime, onCraft }
  const RECIPES = [
    {
      id: 'scrap_to_cells',
      label: 'convert scrap to fuel',
      desc: 'melt down scrap metal into crude power cells.',
      cost: { scrap: 6 },
      unlocked: false,
      oneTime: false,
      onCraft: () => {
        Engine.addRes('cells', 2);
        UI.log('crude but functional. two cells from the scrap pile.', 'dim');
        UI.setStat('power', `${Engine.getRes('cells')} cells`,
          Engine.getRes('cells') <= 1, Engine.getRes('cells') === 0);
      }
    },
    {
      id: 'reinforce_store',
      label: 'reinforce supply storage',
      desc: 'locked storage reduces theft from synth sabotage.',
      cost: { scrap: 8, components: 1 },
      unlocked: false,
      oneTime: true,
      onCraft: () => {
        Engine.setFlag('storage_reinforced');
        UI.log('the supply cache is sealed. harder to get to now.', 'bright');
        UI.log('sabotage will hurt less.', 'dim');
      }
    },
    {
      id: 'upgrade_generator',
      label: 'upgrade the generator',
      desc: 'burns half as much fuel. mechanic required to unlock.',
      cost: { scrap: 12, components: 3 },
      unlocked: false,
      oneTime: true,
      onCraft: () => {
        Engine.setFlag('generator_upgraded');
        UI.log('the upgraded generator hums differently. cleaner.', 'bright');
        UI.log('fuel consumption halved.', 'accent');
        // Halve drain rate by doubling the tick interval via flag — handled in drain tick
      }
    },
    {
      id: 'screening_kit',
      label: 'build a screening kit',
      desc: 'improves scan accuracy from 75% to 90%.',
      cost: { scrap: 5, components: 4 },
      unlocked: false,
      oneTime: true,
      onCraft: () => {
        Engine.setFlag('screening_upgraded');
        UI.log('the scanner is more precise now.', 'bright');
        UI.log('false positives should be rarer.', 'dim');
      }
    },
    {
      id: 'ration_store',
      label: 'build a ration cache',
      desc: 'increases effective ration storage. reduces spoilage drain.',
      cost: { scrap: 7 },
      unlocked: false,
      oneTime: true,
      onCraft: () => {
        Engine.setFlag('ration_cache');
        Engine.addRes('rations', 5); // immediate bonus
        UI.log('sealed containers. rations will last longer now.', 'bright');
      }
    },
    {
      id: 'field_medkit',
      label: 'craft field med kits',
      desc: 'consumable. load into expedition loadout to treat wounds in the field instead of burning shelter meds on return.',
      cost: { meds: 2, scrap: 2 },
      unlocked: false,
      oneTime: false,
      onCraft: () => {
        Loadout.registerEquipment('field_medkit', 'field med kit');
        UI.log('field med kit ready. pack it before the next run.', 'bright');
      }
    },
    {
      id: 'signal_jammer',
      label: 'build a signal jammer',
      desc: 'one-use. blocks synth relay during an expedition — prevents synthRisk bonus while your party is out. consumed on launch.',
      cost: { components: 3, cells: 2 },
      unlocked: false,
      oneTime: false,
      onCraft: () => {
        Loadout.registerEquipment('signal_jammer', 'signal jammer');
        UI.log('jammer assembled. pack it before a high-risk run.', 'bright');
        UI.log('one use. blocks synth relay while the party is out.', 'dim');
      }
    },
    {
      id: 'silencer_kit',
      label: 'build a silencer kit',
      desc: 'one-use. reduces injury chance on loud approach choices during an expedition.',
      cost: { scrap: 6, components: 2 },
      unlocked: false,
      oneTime: false,
      onCraft: () => {
        Loadout.registerEquipment('silencer_kit', 'silencer kit');
        UI.log('suppressor kit packed. loud choices will cost less.', 'bright');
      }
    },
    {
      id: 'binoculars',
      label: 'build binoculars',
      desc: 'passive. district threat level shown before you commit to launching. durability: 8 expeditions.',
      cost: { scrap: 4, components: 2 },
      unlocked: false,
      oneTime: true,
      onCraft: () => {
        Engine.setFlag('has_binoculars');
        Engine.set('binocular_uses', 8);
        UI.log('binoculars assembled. district intel improves.', 'bright');
        UI.log('threat level will be confirmed before you launch.', 'dim');
      }
    },
  ];

  function unlock(id) {
    const recipe = RECIPES.find(r => r.id === id);
    if (!recipe || recipe.unlocked) return;
    recipe.unlocked = true;
    // Hide the empty state hint on first unlock
    const empty = document.getElementById('craft-empty');
    if (empty) empty.remove();
    _renderButton(recipe);
    UI.log(`new crafting option available: ${recipe.label}.`, 'accent');
  }

  function unlockAll() {
    // Base recipes available after generator starts
    ['scrap_to_cells', 'reinforce_store', 'ration_store'].forEach(unlock);
  }

  function unlockExpeditionGear() {
    // Unlocked once map is active — these only matter once you're running expeditions
    ['field_medkit', 'binoculars'].forEach(unlock);
  }

  function unlockAdvancedGear() {
    // Unlocked via engineer/mechanic job events
    ['signal_jammer', 'silencer_kit'].forEach(unlock);
  }

  function _renderButton(recipe) {
    const btnId = 'craft_' + recipe.id;
    if (document.getElementById('btn-' + btnId)) return;
    _addCraftButton(btnId, recipe);
  }

  function _addCraftButton(btnId, recipe) {
    const container = document.getElementById('craft-actions');
    if (!container) return;
    if (document.getElementById('btn-' + btnId)) return;

    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.id = 'btn-' + btnId;

    // Progress bar
    const progress = document.createElement('div');
    progress.className = 'btn-progress';
    btn.appendChild(progress);

    // Label
    const labelEl = document.createElement('span');
    labelEl.className = 'btn-label';
    labelEl.textContent = recipe.label;
    btn.appendChild(labelEl);

    // Cost on its own line
    if (recipe.cost) {
      const costEl = document.createElement('span');
      costEl.className = 'cost';
      costEl.textContent = Object.entries(recipe.cost).map(([k,v]) => `${v} ${k}`).join(' · ');
      btn.appendChild(costEl);
    }

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const result = _doCraft(recipe);
      if (result === false) return;
      if (!recipe.oneTime) {
        // Cooldown
        btn.disabled = true;
        btn.classList.add('cooling');
        progress.style.transition = 'none';
        progress.style.width = '0%';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          progress.style.transition = 'width 12000ms linear';
          progress.style.width = '100%';
        }));
        setTimeout(() => {
          btn.disabled = false;
          btn.classList.remove('cooling');
          progress.style.transition = 'none';
          progress.style.width = '0%';
        }, 12000);
      }
    });

    container.appendChild(btn);
  }

  function _doCraft(recipe) {
    if (!Engine.hasRes(recipe.cost)) {
      UI.notify('not enough resources');
      return false;
    }
    Engine.spendRes(recipe.cost);
    recipe.onCraft();
    if (recipe.oneTime) {
      const el = document.getElementById('btn-craft_' + recipe.id);
      if (el) el.remove();
    }
  }

  return { unlock, unlockAll, unlockExpeditionGear, unlockAdvancedGear };
})();
