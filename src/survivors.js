const Survivors = (() => {

  // Clues observable by the player alone — fire regardless of population
  // Clues observable immediately — first impressions, single interactions
  const SYNTH_CLUES_EARLY_SOLO = [
    name => `${name} asked strange questions about the ventilation layout.`,
    name => `${name} doesn't flinch at loud noises. not once.`,
    name => `${name} was found re-arranging the supply manifest.`,
  ];

  const SYNTH_CLUES_EARLY_WITNESSED = [
    name => `${name}'s hands are always cold. someone noticed.`,
    name => `someone heard ${name} speaking quietly in the dark. no one was nearby.`,
    name => `${name} was seen near the power relay at 3am.`,
  ];

  // Clues that require time — patterns only visible after days of observation
  const SYNTH_CLUES_LATE_SOLO = [
    name => `${name} hasn't touched their food ration in three days.`,
    name => `${name} doesn't sleep. just sits and waits.`,
    name => `${name} has been mapping the shelter. small marks on the wall near their bunk.`,
  ];

  const SYNTH_CLUES_LATE_WITNESSED = [
    name => `two people report ${name} repeating the same phrase twice, word for word.`,
    name => `others say ${name} asked them the same question on separate days. exact same words.`,
    name => `${name} has been in the shelter for days. nobody has seen them eat.`,
  ];

  // Early human noise — immediate
  const HUMAN_NOISE_EARLY_SOLO = [
    name => `found ${name} crying quietly near the hatch. didn't ask why.`,
    name => `${name} fixed the water filter without being asked.`,
    name => `${name} has been staring at the hatch for hours. waiting for something.`,
  ];

  const HUMAN_NOISE_EARLY_WITNESSED = [
    name => `${name} shared their rations with someone new today.`,
    name => `${name} got into an argument with someone over the supply count. both calmed down.`,
  ];

  // Late human noise — patterns over time
  const HUMAN_NOISE_LATE_SOLO = [
    name => `${name} keeps a photograph face-down on their bunk. never explains it.`,
    name => `${name} has started keeping a journal. stops writing when anyone gets close.`,
  ];

  const HUMAN_NOISE_LATE_WITNESSED = [
    name => `${name} has been teaching the others morse code. just in case.`,
    name => `someone laughed today. think it was ${name}. almost forgot what that sounded like.`,
  ];

  // Returns appropriate clue pool based on days present and population
  // daysPresent < 3 — early clues only. 3+ — full pool
  function getSynthClues(population, daysPresent) {
    const early = population >= 2
      ? [...SYNTH_CLUES_EARLY_SOLO, ...SYNTH_CLUES_EARLY_WITNESSED]
      : SYNTH_CLUES_EARLY_SOLO;
    if (daysPresent < 3) return early;
    const late = population >= 2
      ? [...SYNTH_CLUES_LATE_SOLO, ...SYNTH_CLUES_LATE_WITNESSED]
      : SYNTH_CLUES_LATE_SOLO;
    return [...early, ...late];
  }

  function getHumanNoise(population, daysPresent) {
    const early = population >= 2
      ? [...HUMAN_NOISE_EARLY_SOLO, ...HUMAN_NOISE_EARLY_WITNESSED]
      : HUMAN_NOISE_EARLY_SOLO;
    if (daysPresent < 3) return early;
    const late = population >= 2
      ? [...HUMAN_NOISE_LATE_SOLO, ...HUMAN_NOISE_LATE_WITNESSED]
      : HUMAN_NOISE_LATE_SOLO;
    return [...early, ...late];
  }

  const HUMAN_NOISE = [
    name => `found ${name} crying quietly near the hatch. didn't ask why.`,
    name => `${name} fixed the water filter without being asked.`,
  ];

  function create(name, role) {
    const synthRiskAtCreation = Engine.get('synthRisk') || 0.08;
    const isSynth = Math.random() < synthRiskAtCreation;
    return {
      id: Date.now() + Math.random(),
      name, role,
      isSynth,
      synthProbability: synthRiskAtCreation,
      suspicion: 0,
      cluesGiven: 0,
      screened: false,
      revealed: false,
      arrivalDay: Engine.get('day') || 1,
    };
  }

  function add(survivor) {
    const survivors = Engine.get('survivors');
    survivors.push(survivor);
    Engine.set('survivors', survivors);
    UI.addSurvivorToPanel(survivor);
    updatePopStat();
  }

  function getAll() { return Engine.get('survivors'); }

  function getLiving() { return getAll().filter(s => !s.revealed); }

  function updatePopStat() {
    const count = getLiving().length;
    UI.setStat('pop', count);
  }

  // Called on tick to generate ambient clues
  function tickClues() {
    const survivors = getLiving();
    if (survivors.length === 0) return;

    const pop = survivors.length; // used to gate context-sensitive lines

    // Pick a random survivor, maybe drop a clue
    const s = survivors[Math.floor(Math.random() * survivors.length)];
    if (Math.random() < 0.015) {
      const firstName = s.name.split(' ')[0];

      const daysPresent = (Engine.get('day') || 1) - (s.arrivalDay || 1);

      if (s.isSynth && Math.random() < 0.6) {
        const pool = getSynthClues(pop, daysPresent);
        const clueIdx = s.cluesGiven % pool.length;
        const clue = pool[clueIdx](firstName);
        s.cluesGiven++;
        s.suspicion = Math.min(5, s.suspicion + 1);
        UI.updateSurvivorSuspicion(s.id, s.suspicion);
        UI.log(clue, 'warning');

      } else if (!s.isSynth) {
        if (Math.random() < 0.4) {
          // Red herring — time-gated same as synth clues
          const pool = getSynthClues(pop, daysPresent);
          const clue = pool[Math.floor(Math.random() * pool.length)](firstName);
          s.suspicion = Math.min(5, s.suspicion + 1);
          UI.updateSurvivorSuspicion(s.id, s.suspicion);
          UI.log(clue, 'warning');
        } else {
          // Human moment — use population-appropriate noise pool
          const pool = getHumanNoise(pop);
          const noise = pool[Math.floor(Math.random() * pool.length)];
          UI.log(noise(firstName), 'dim');
        }
      }
    }
  }

  function screen(survivor) {
    survivor.screened = true;
    const accuracy = Engine.getFlag('screening_upgraded') ? 0.90 : 0.75;
    const detected = survivor.isSynth ? Math.random() < accuracy : Math.random() > accuracy;

    if (survivor.isSynth && detected) {
      return 'caught';
    } else if (!survivor.isSynth && !detected) {
      return 'false_positive';
    } else {
      return 'clear';
    }
  }

  // Passive role ticks — called every 30s
  function tickRoles() {
    const living = getLiving();
    if (living.length === 0) return;

    const totals = {};
    let anyYield = false;

    living.forEach(s => {
      const yields = Names.roleYields[s.role];
      if (!yields || Object.keys(yields).length === 0) return;
      for (const [res, amt] of Object.entries(yields)) {
        totals[res] = (totals[res] || 0) + amt;
        anyYield = true;
      }
    });

    if (!anyYield) return;

    for (const [res, amt] of Object.entries(totals)) {
      Engine.addRes(res, amt);
    }

    // Update food stat display
    if (totals.rations) {
      const food = Engine.getRes('rations');
      UI.setStat('food', food, food <= 3, food === 0);
    }
  }

  function expose(survivor) {
    survivor.revealed = true;
    if (survivor.isSynth) {
      Engine.set('stat_synths_detected', (Engine.get('stat_synths_detected') || 0) + 1);
    }
    const survivors = Engine.get('survivors');
    const idx = survivors.findIndex(s => s.id === survivor.id);
    if (idx !== -1) survivors[idx] = survivor;
    Engine.set('survivors', survivors);
    UI.removeSurvivor(survivor.id);
    updatePopStat();
  }

  return { create, add, getAll, getLiving, tickClues, tickRoles, screen, expose, updatePopStat };
})();