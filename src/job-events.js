const JobEvents = (() => {

  // Track which events have fired so we don't repeat
  const _fired = new Set();

  // Each event: { id, role, condition, fire }
  const EVENTS = [
    {
      id: 'mechanic_generator',
      role: 'mechanic',
      condition: () => !Engine.getFlag('upgrade_generator_unlocked'),
      fire: (s) => {
        Engine.setFlag('upgrade_generator_unlocked');
        Crafting.unlock('upgrade_generator');
        const first = s.name.split(' ')[0];
        UI.showEvent({
          title: `// ${first.toLowerCase()}: generator proposal`,
          text: `${first} pulls you aside. "i've been looking at the generator. it's inefficient — military surplus always is. give me enough scrap and components and i can rebuild the fuel system. it'll burn half as much." it sounds expensive. probably worth it.`,
          choices: [
            {
              label: "noted. we'll see what we can spare.",
              onChoose: () => {
                UI.log(`${first} gets to work planning the upgrade.`, 'dim');
              }
            }
          ]
        });
      }
    },
    {
      id: 'engineer_screening',
      role: 'engineer',
      condition: () => !Engine.getFlag('screening_upgraded') && Engine.getFlag('screen_unlocked'),
      fire: (s) => {
        Crafting.unlock('screening_kit');
        const first = s.name.split(' ')[0];
        UI.showEvent({
          title: `// ${first.toLowerCase()}: scanner calibration`,
          text: `${first} has been running diagnostics on the scanner in their spare time. "the baseline calibration is off. i can rebuild the sensor array with the right parts — it'll catch synths more reliably. fewer false positives." they look tired. they've been at this a while.`,
          choices: [
            {
              label: 'do it.',
              onChoose: () => UI.log(`${first} starts working on the scanner array.`, 'dim')
            },
            {
              label: 'not now.',
              onChoose: () => UI.log(`${first} nods. doesn't push it.`, 'dim')
            }
          ]
        });
      }
    },
    {
      id: 'engineer_fieldgear',
      role: 'engineer',
      condition: () => !Engine.getFlag('advanced_gear_unlocked') && Engine.getFlag('map_unlocked'),
      fire: (s) => {
        Engine.setFlag('advanced_gear_unlocked');
        Crafting.unlockAdvancedGear();
        const first = s.name.split(' ')[0];
        UI.showEvent({
          title: `// ${first.toLowerCase()}: field equipment`,
          text: `${first} lays out a set of parts on the workbench. "we're sending people out with nothing. no suppressors. no way to block their signals while we're out there. i can build both — it'll take scrap and components but it's worth it." they look at the map. "next run that goes loud, someone's going to get hurt that didn't have to."`,
          choices: [
            {
              label: "start on it.",
              onChoose: () => UI.log(`${first} gets to work. new options in the crafting menu.`, 'dim')
            },
            {
              label: "not a priority right now.",
              onChoose: () => {
                Engine.setFlag('advanced_gear_unlocked', false);
                UI.log(`${first} packs the parts away. "whenever you're ready."`, 'dim');
              }
            }
          ]
        });
      }
    },
    {
      id: 'forager_cache',
      role: 'forager',
      condition: () => !Engine.getFlag('ration_cache'),
      fire: (s) => {
        Crafting.unlock('ration_store');
        const first = s.name.split(' ')[0];
        UI.log('');
        UI.log(`${first} found a stack of airtight containers on the last run.`, 'dim');
        UI.log(`could build a proper ration cache. keep things from spoiling.`, 'dim');
      }
    },
    {
      id: 'scavenger_storage',
      role: 'scavenger',
      condition: () => !Engine.getFlag('storage_reinforced'),
      fire: (s) => {
        Crafting.unlock('reinforce_store');
        const first = s.name.split(' ')[0];
        UI.log('');
        UI.log(`${first} noticed the supply shelves aren"t locked. anyone could get in.`, 'warning');
        UI.log(`with enough scrap we could seal it properly.`, 'dim');
      }
    },
    {
      id: 'lookout_patrol',
      role: 'lookout',
      condition: () => Survivors.getLiving().length >= 2,
      fire: (s) => {
        const first = s.name.split(' ')[0];
        // Small one-off trust boost — lookout spotted something and handled it
        Events.adjustTrust(+4);
        UI.log('');
        UI.log(`${first} caught movement near the east stairwell.`, 'warning');
        UI.log(`whatever it was, it didn't come closer. ${first} stayed at post until dawn.`, 'dim');
        UI.log(`the group feels a little safer.`, 'dim');
      }
    },
    {
      id: 'medic_supplies',
      role: 'medic',
      condition: () => Engine.getRes('meds') <= 1,
      fire: (s) => {
        const first = s.name.split(' ')[0];
        UI.showEvent({
          title: `// ${first.toLowerCase()}: medical shortage`,
          text: `${first} finds you between tasks. "we're almost out of medicine. if anyone gets sick or injured right now, i can't do much." they pause. "there's a hospital on the map. risky, but it would be worth the trip if you can spare people for a run."`,
          choices: [
            {
              label: 'add it to the list.',
              onChoose: () => {
                UI.log(`${first} marks the hospital on the rough map.`, 'dim');
                UI.log(`st. clair hospital. noted.`, 'dim');
              }
            },
            {
              label: 'we manage with what we have.',
              onChoose: () => {
                UI.log(`${first} doesn't argue. just nods.`, 'dim');
              }
            }
          ]
        });
      }
    },
    {
      id: 'cook_morale',
      role: 'cook',
      condition: () => Engine.getRes('rations') >= 5 && Engine.get('trust') < 70,
      fire: (s) => {
        const first = s.name.split(' ')[0];
        // Cook uses extra rations to boost morale
        Engine.setRes('rations', Engine.getRes('rations') - 3);
        Events.adjustTrust(+8);
        UI.log('');
        UI.log(`${first} used some of the rations to make something warm.`, 'dim');
        UI.log(`first real meal in days. people talked. actually talked.`, 'bright');
      }
    },
  ];

  function tick() {
    const living = Survivors.getLiving();
    if (living.length === 0) return;

    // Pick a random living survivor and check if their role has a pending event
    const shuffled = [...living].sort(() => Math.random() - 0.5);
    for (const s of shuffled) {
      const event = EVENTS.find(e =>
        e.role === s.role &&
        !_fired.has(e.id + '_' + s.id) &&
        (!e.condition || e.condition(s))
      );
      if (event && Math.random() < 0.08) { // 8% chance per eligible survivor per check
        _fired.add(event.id + '_' + s.id);
        event.fire(s);
        break; // one event per tick
      }
    }
  }

  return { tick };
})();
