const Shelter = (() => {

  let _strangersAllowed = false;
  let _strangerTimer = null;

  function init() {
    Engine.set('synthRisk', 0.08);
    Engine.set('usedFirstNames', []); // reset name pool for fresh run

    // Opening sequence
    setTimeout(() => UI.log('...'), 200);
    setTimeout(() => UI.log('signal lost.', 'dim'), 900);
    setTimeout(() => UI.log('backup power: 4%.', 'dim'), 1800);
    setTimeout(() => UI.log(''), 2600);
    setTimeout(() => UI.log('awake. head heavy. air tastes like burnt metal.', 'bright'), 3200);
    setTimeout(() => UI.log('the generator is cold.', ''), 4400);
    setTimeout(() => UI.log('somewhere above: the city.'), 5400);
    setTimeout(() => UI.log('the machines.', 'warning'), 6200);
    setTimeout(() => {
      UI.log('');
      UI.addButton('gen', 'check the generator', onCheckGenerator, { cooldown: 2000 });
    }, 7200);
  }

  function onCheckGenerator() {
    UI.log('');
    UI.log('the generator is old. military surplus. pre-uprising.', 'dim');
    UI.log('fuel line is intact. just needs a spark.', 'dim');
    setTimeout(() => {
      UI.removeButton('gen');
      UI.addButton('start_gen', 'start the generator', onStartGenerator, { cooldown: 3000 });
    }, 1500);
  }

  function onStartGenerator() {
    UI.log('');
    UI.log('the engine turns over. once. twice.', 'dim');
    setTimeout(() => UI.log('a cough of black smoke.'), 800);
    setTimeout(() => UI.log('then —', 'dim'), 1600);
    setTimeout(() => {
      UI.log('the generator catches.', 'bright');
      UI.setGenerator(true);
      Engine.set('generatorOn', true);
      Engine.setFlag('generator_started');
      // Remove restart button if it exists
      UI.removeButton('restart_gen');
      Engine.setRes('cells', 6);
      UI.showResource('cells');
      // Base crafting recipes available once powered
      setTimeout(Crafting.unlockAll, 3000);
      UI.showStatRow();
      UI.setStat('power', '3 cells');
      UI.setStat('food', '0');
      Engine.startTick();

      setTimeout(phase1_setup, 1000);
    }, 2400);
  }

  function phase1_setup() {
    UI.log('');
    UI.log('dim light fills the basement. a start.', 'bright');
    Loadout.init();
    setTimeout(() => {
      UI.log("there\'s debris everywhere. might be useful.", 'dim');
      UI.removeButton('start_gen');
      UI.addButton('scavenge_local', 'scavenge the basement', onScavengeLocal, { cooldown: 8000 });
    }, 1500);

    // Day counter starts
    UI.showDayCounter();

    // Tick events
    Engine.on('tick', (t) => {
      // Day counter
      if (t % 120 === 0) {
        const day = Engine.get('day') + 1;
        Engine.set('day', day);
        document.getElementById('day-num').textContent = day;
        UI.log('');
        UI.log(`— day ${day} —`, 'separator');

        // Map unlock — day 3+, hatch reinforced, at least 2 survivors
        if (!Engine.getFlag('map_unlocked') && day >= 3 &&
            Engine.getFlag('hatch_reinforced') && Survivors.getLiving().length >= 2) {
          Engine.setFlag('map_unlocked');
          setTimeout(() => {
            UI.log('');
            UI.log('someone has been sketching the surrounding blocks.', 'dim');
            UI.log('scraps of city maps, stitched together on the wall.', 'dim');
            UI.log('enough to work with.', 'bright');
            Map.unlock();
            Crafting.unlockExpeditionGear();
          }, 3000);
        }

        // Generator upgrade fallback — day 5+, no mechanic in roster, upgrade not yet unlocked
        if (!Engine.getFlag('upgrade_generator_unlocked') && day >= 5 &&
            Engine.getFlag('generator_started')) {
          const hasMechanic = Survivors.getLiving().some(s => s.role === 'mechanic');
          if (!hasMechanic) {
            Engine.setFlag('upgrade_generator_unlocked');
            Crafting.unlock('upgrade_generator');
            const candidates = Survivors.getLiving().filter(s => !s.isSynth);
            const s = candidates[Math.floor(Math.random() * candidates.length)];
            const first = s ? s.name.split(' ')[0] : 'someone';
            setTimeout(() => {
              UI.showEvent({
                title: `// ${first.toLowerCase()}: generator observation`,
                text: `${first} corners you near the generator. "i've been watching how it runs. it's burning through cells faster than it needs to — the fuel timing is off. i'm not a mechanic but i've read the manual three times now. give me the parts and i think i can fix it."`,
                choices: [
                  {
                    label: "worth trying. what do you need?",
                    onChoose: () => UI.log(`${first} pulls the generator manual from the shelf and gets to work.`, 'dim')
                  },
                  {
                    label: "too risky. leave it alone.",
                    onChoose: () => {
                      // Graceful decline — re-fires next day
                      Engine.setFlag('upgrade_generator_unlocked', false);
                      UI.log(`${first} sets the manual down. "your call."`, 'dim');
                    }
                  }
                ]
              });
            }, 4000);
          }
        }
      }

      // Power drain — every 60 ticks normally, 120 if upgraded
      const drainInterval = Engine.getFlag('generator_upgraded') ? 120 : 60;
      if (t % drainInterval === 0 && Engine.get('generatorOn')) {
        const cells = Engine.getRes('cells');
        if (cells > 0) {
          Engine.setRes('cells', cells - 1);
          UI.setStat('power', `${cells - 1} cells`, cells - 1 <= 1, cells - 1 === 0);
          // Low fuel warnings
          if (cells - 1 === 1) {
            UI.log('');
            UI.log('one power cell left. generator won\'t last long.', 'warning');
          }
        } else {
          onGeneratorFail();
        }
      }

      // Ongoing darkness penalties — every 30 ticks while generator is off
      if (t % 30 === 0 && !Engine.get('generatorOn') && Engine.getFlag('generator_started')) {
        onDarknessTick();
      }

      // Clue drops
      if (t > 30) Survivors.tickClues();

      // Passive role yields — every 30 ticks
      if (t % 30 === 0 && t > 0) {
        Survivors.tickRoles();
      }

      // Regular ration drain — 1 per survivor every 90 ticks (~90s)
      // Separate from darkness drain which is an accelerant on top
      if (t % 90 === 0 && t > 0 && Engine.get('generatorOn')) {
        const pop = Survivors.getLiving().length;
        if (pop > 0) {
          const drain = pop; // 1 ration per person
          const current = Engine.getRes('rations');
          const next = Math.max(0, current - drain);
          Engine.setRes('rations', next);
          UI.setStat('food', next, next <= 3, next === 0);
          if (next <= 3 && current > 3) {
            UI.log('rations are running low.', 'warning');
          }
          if (next === 0 && current > 0) {
            UI.log('the rations are gone. people will notice.', 'danger');
            Events.adjustTrust(-8);
          }
        }
      }

      // Job-based random events — every 45 ticks, low chance
      if (t % 45 === 0 && t > 60) {
        JobEvents.tick();
      }

      // Stranger arrival (once allowed)
      if (_strangersAllowed && !_strangerTimer) {
        scheduleStranger();
      }
    });
  }

  const DARKNESS_COLD_MESSAGES = [
    'the cold is setting in. people are huddling together for warmth.',
    'without light, the shelter feels smaller. tighter.',
    'someone keeps checking the generator. hoping.',
    'the dark plays tricks. every sound is louder.',
    'people are rationing body heat now. it\'s that cold.',
    'morale is slipping. hard to keep people focused in the dark.',
    'the darkness reminds everyone what\'s outside. what won.',
  ];

  let _darknessMsgIdx = 0;

  function onGeneratorFail() {
    Engine.set('generatorOn', false);
    UI.setGenerator(false);

    UI.log('');
    UI.log('the generator sputters and dies.', 'danger');
    UI.log('the basement goes dark.', 'danger');

    // Immediate consequences
    adjustTrust(-8);

    // Strangers stop coming — no light signal
    _strangersAllowed = false;
    if (_strangerTimer) {
      clearTimeout(_strangerTimer);
      _strangerTimer = null;
    }

    setTimeout(() => {
      UI.log('no light. no heat. the cold comes fast.', 'dim');

      // Mechanics can jury-rig a faster restart
      const mechanics = Survivors.getLiving().filter(s => s.role === 'mechanic' && !s.isSynth);
      const restartCost = mechanics.length > 0 ? { cells: 1 } : { cells: 2 };
      const restartLabel = mechanics.length > 0
        ? `jury-rig generator  [mechanic assist]`
        : `restart generator`;

      UI.addButton('restart_gen', restartLabel, () => onRestartGenerator(restartCost), {
        cost: restartCost,
      });

      if (mechanics.length > 0) {
        setTimeout(() => UI.log(`${mechanics[0].name.split(' ')[0]} thinks they can get it running on one cell instead of two.`, 'dim'), 800);
      }
    }, 1500);
  }

  function onRestartGenerator(cost) {
    if (!Engine.spendRes(cost)) {
      UI.notify('not enough power cells');
      return false;
    }
    UI.log('');
    UI.log('coaxing the engine back to life...', 'dim');
    setTimeout(() => {
      UI.log('the generator catches. light returns.', 'bright');
      UI.setGenerator(true);
      Engine.set('generatorOn', true);
      Engine.setRes('cells', Engine.getRes('cells')); // trigger UI update
      UI.setStat('power', `${Engine.getRes('cells')} cells`,
        Engine.getRes('cells') <= 1, Engine.getRes('cells') === 0);
      UI.removeButton('restart_gen');
      adjustTrust(+5);
      // Re-allow strangers if hatch was reinforced
      if (Engine.getFlag('hatch_reinforced')) {
        _strangersAllowed = true;
      }
    }, 2000);
  }

  function onDarknessTick() {
    const survivors = Survivors.getLiving();
    if (survivors.length === 0) return;

    // Accelerated food burn — cold people eat more
    const food = Engine.getRes('rations');
    if (food > 0) {
      Engine.setRes('rations', food - 1);
      UI.setStat('food', food - 1, food - 1 <= 3, food - 1 === 0);
    }

    // Trust bleeds slowly in the dark
    adjustTrust(-2);

    // Ambient darkness messages, cycling through
    if (Math.random() < 0.5) {
      const msg = DARKNESS_COLD_MESSAGES[_darknessMsgIdx % DARKNESS_COLD_MESSAGES.length];
      _darknessMsgIdx++;
      UI.log(msg, 'dim');
    }

    // If food hits zero, people start leaving
    if (Engine.getRes('rations') === 0 && survivors.length > 0) {
      UI.log("people can\'t stay somewhere cold and starving.", 'danger');
      const leaver = survivors[Math.floor(Math.random() * survivors.length)];
      Survivors.expose(leaver);
      setTimeout(() => UI.log(`${leaver.name.split(' ')[0]} is gone. took what they could carry.`, 'danger'), 500);
    }
  }

  const SCAVENGE_MAX = 5;

  const SCAVENGE_FLAVOUR = [
    ['old ration packs behind a false wall. still sealed.',
     'a junction box with three cells still in it.',
     'useful debris. enough to work with.'],
    ['the far corner had more than expected.',
     'some scrap hidden under a collapsed shelf.',
     'not much left in this section.'],
    ['scraping the walls now. yields are dropping.',
     'half a ration pack. crumbs, mostly.',
     'less each time.'],
    ['dust and bent metal. almost nothing.',
     'found a single cell tucked in a crack.',
     'the room is mostly picked clean.'],
    ['that\'s the last of it. the basement is stripped.',
     'nothing left worth taking.',
     'empty. every corner checked twice.'],
  ];

  const SCAVENGE_QUALITY = [1, 0.7, 0.4, 0.2, 0.1];

  function onScavengeLocal() {
    const runs = Engine.get('scavengeRuns') || 0;

    const flavourSet = SCAVENGE_FLAVOUR[Math.min(runs, SCAVENGE_FLAVOUR.length - 1)];
    const flavour = flavourSet[Math.floor(Math.random() * flavourSet.length)];
    UI.log('');
    UI.log(flavour, 'dim');

    const quality = SCAVENGE_QUALITY[Math.min(runs, SCAVENGE_QUALITY.length - 1)];
    const gained = Events.scavengeReturn(quality);

    if (gained.length > 0) {
      gained.forEach(g => UI.log(`  + ${g}`, 'accent'));
    } else {
      UI.log('  nothing recoverable.', 'dim');
    }

    UI.setStat('food', Engine.getRes('rations'), Engine.getRes('rations') <= 2, Engine.getRes('rations') === 0);

    const newRuns = runs + 1;
    Engine.set('scavengeRuns', newRuns);

    // First scavenge unlocks reinforce
    if (runs === 0) {
      setTimeout(unlock_reinforce, 2000);
    }

    // Warn on penultimate run
    if (newRuns === SCAVENGE_MAX - 1) {
      setTimeout(() => UI.log('the basement is almost stripped. one pass left in it.', 'warning'), 600);
    }

    // Hard cap — remove button after final run
    if (newRuns >= SCAVENGE_MAX) {
      UI.removeButton('scavenge_local');
      setTimeout(() => {
        UI.log("there\'s nothing left down here worth taking.", 'dim');
        UI.log('whatever comes next has to come from outside.', 'bright');
      }, 800);
    }
  }

  function unlock_reinforce() {
    UI.log('');
    UI.log('the hatch is weak. anyone could find it.', 'dim');
    UI.log('could reinforce it. might attract attention either way.', 'dim');
    UI.addButton('reinforce', 'reinforce the hatch  [one time]', onReinforce, {
      cost: { scrap: 3 }
    });
  }

  function onReinforce() {
    if (!Engine.spendRes({ scrap: 3 })) {
      UI.notify('need 3 scrap');
      return false;
    }
    // One-time action — remove immediately, no cooldown loop
    UI.removeButton('reinforce');
    UI.log('');
    UI.log('scrap welded across the frame. pipes braced against the door.', 'dim');
    UI.log("it won't stop them forever. but it buys time.", 'bright');
    Engine.setFlag('hatch_reinforced');
    setTimeout(unlock_strangers, 3000);
  }

  function unlock_strangers() {
    UI.log('');
    UI.log('a knock from outside.', 'bright');
    UI.log('three. pause. two.', 'dim');
    setTimeout(() => {
      UI.log('someone out there knows the old signal.', 'warning');
      _strangersAllowed = true;
      Engine.set('synthRisk', 0.1);

      // Show trust meter
      UI.showTrust();
      UI.updateTrust(100);

      // Unlock the permanent forage button
      unlock_forage();

      // Allow screening button once components available
      Engine.on('resourceChange', ({ name }) => {
        if (name === 'components' && Engine.getRes('components') >= 2) {
          if (!Engine.getFlag('screen_unlocked')) {
            Engine.setFlag('screen_unlocked');
            UI.log('enough components to run a diagnostic scan.', 'dim');
          }
        }
      });

      // Trigger first stranger
      setTimeout(Events.strangerEvent, 2000);
    }, 1500);
  }

  function getForageLabel() {
    const count = Survivors.getLiving().length;
    if (count === 0) return 'head out and scavenge';
    if (count === 1) return 'send them out to scavenge';
    return 'send out a foraging party';
  }

  function unlock_forage() {
    UI.log('');
    UI.log('the streets aren\'t completely dead. things can still be found out there.', 'dim');
    UI.addButton('forage', getForageLabel(), onForage, { cooldown: 20000 });

    // Keep label in sync as population changes
    Engine.on('stateChange', ({ key }) => {
      if (key === 'survivors') {
        UI.setButtonLabel('forage', getForageLabel());
      }
    });
  }

  function onForage() {
    // Can't send people out if a map expedition is already running
    if (Engine.getFlag('expedition_in_progress')) {
      UI.notify('party is already out on an expedition.');
      return false;
    }

    const living = Survivors.getLiving();
    const genOn  = Engine.get('generatorOn');

    // Role bonuses — each relevant survivor bumps quality
    const scouts    = living.filter(s => s.role === 'scout'    && !s.isSynth).length;
    const foragers  = living.filter(s => s.role === 'forager'  && !s.isSynth).length;
    const scavengers= living.filter(s => s.role === 'scavenger'&& !s.isSynth).length;

    // Base quality — solo player is viable but modest
    let quality = 0.4 + (scouts * 0.15) + (foragers * 0.10) + (scavengers * 0.10);
    quality = Math.min(quality, 1.0);

    // Build a weighted haul based on current needs
    const needsCells = Engine.getRes('cells') <= 1 || !genOn;
    const needsFood  = Engine.getRes('rations') <= 3;

    const haul = {};

    // Scrap — always available outside
    const scrapAmt = Math.max(1, Math.floor(quality * (2 + Math.floor(Math.random() * 4))));
    haul.scrap = scrapAmt;

    // Cells — weighted up if generator is out or critically low
    const cellChance = needsCells ? 0.75 : 0.35;
    if (Math.random() < cellChance * quality + (needsCells ? 0.2 : 0)) {
      haul.cells = needsCells ? (Math.random() < 0.5 ? 2 : 1) : 1;
    }

    // Food — weighted up if starving
    const foodChance = needsFood ? 0.80 : 0.55;
    if (Math.random() < foodChance) {
      haul.rations = Math.max(1, Math.floor(quality * (needsFood ? 3 : 2) + Math.random() * 2));
    }

    // Rarer finds
    if (Math.random() < 0.20 * quality) haul.components = 1;
    if (Math.random() < 0.12 * quality) haul.meds = 1;

    // Apply haul
    const gained = [];
    for (const [res, amt] of Object.entries(haul)) {
      if (amt > 0) {
        Engine.addRes(res, amt);
        gained.push(`${amt} ${res}`);
      }
    }

    // Flavour — varies by context
    const FORAGE_DARK = [
      'moving without light is slow. but the city gives up what it has.',
      'hard to see out there. harder to carry anything back. managed anyway.',
      'the machines don\'t move much at night. small mercy.',
      'stayed close to the walls. found what they could.',
    ];
    const FORAGE_LIT = [
      'quick sweep of the nearest blocks. in and out.',
      'the streets were quiet. got lucky.',
      'found a cache behind a collapsed storefront.',
      'someone\'s old stash. half-picked over already. took the rest.',
    ];
    const FORAGE_SOLO = [
      'went alone. faster that way. riskier too.',
      'no one to watch your back out there.',
      'stayed low. moved fast. came back with what fit in the bag.',
    ];

    UI.log('');
    let flavourPool;
    if (living.length === 0)  flavourPool = FORAGE_SOLO;
    else if (!genOn)          flavourPool = FORAGE_DARK;
    else                      flavourPool = FORAGE_LIT;
    UI.log(flavourPool[Math.floor(Math.random() * flavourPool.length)], 'dim');

    if (gained.length > 0) {
      gained.forEach(g => UI.log(`  + ${g}`, 'accent'));
    } else {
      UI.log('  nothing out there today.', 'dim');
    }

    // Update stats
    UI.setStat('food',  Engine.getRes('rations'), Engine.getRes('rations') <= 3, Engine.getRes('rations') === 0);
    UI.setStat('power', `${Engine.getRes('cells')} cells`,
      Engine.getRes('cells') <= 1, Engine.getRes('cells') === 0);

    // If cells found while dark, prompt to restart
    if (!genOn && Engine.getRes('cells') >= (living.some(s => s.role === 'mechanic') ? 1 : 2)) {
      setTimeout(() => UI.log('enough fuel to try the generator again.', 'warning'), 600);
    }

    // Small risk — synths in the party may have relayed your position
    const synthsPresent = living.filter(s => s.isSynth && !s.revealed).length;
    if (synthsPresent > 0 && Math.random() < 0.15 * synthsPresent && !Engine.getFlag('jammer_active')) {
      Engine.set('synthRisk', Math.min(0.5, Engine.get('synthRisk') + 0.05));
      setTimeout(() => UI.log("something felt wrong about that run. can\'t place it.", 'warning'), 1200);
    }
  }

  function scheduleStranger() {
    const delay = (60 + Math.floor(Math.random() * 90)) * 1000;
    _strangerTimer = setTimeout(() => {
      _strangerTimer = null;
      if (Survivors.getLiving().length < 8) {
        Events.strangerEvent();
      }
    }, delay);
  }

  function adjustTrust(delta) {
    Events.adjustTrust(delta);
  }

  return { init };
})();
