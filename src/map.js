const Map = (() => {

  // 5x5 grid. Home is [2][2]. Districts defined by [row][col].
  const DISTRICTS = [
    // row 0
    [
      { id:'d00', name:'North Yards',      icon:'▦', threat:'extreme',    fogged:true,  yields:['scrap','cells'],      desc:'a rail terminus turned synth staging ground. heavy patrols. the metal haul is worth the risk if you move fast.' },
      { id:'d01', name:'Meridian HQ',      icon:'◈', threat:'extreme', fogged:true,  yields:['components','scrap'], desc:'the birthplace of the uprising. meridian robotics. still operational. whatever is running in there does not want company.' },
      { id:'d02', name:'Broadcast Tower',  icon:'⊕', threat:'extreme', fogged:true,  yields:['components'],         desc:'the relay tower. something is broadcasting on a frequency nobody recognises. late game. not yet.' },
      { id:'d03', name:'Overgrown Mall',   icon:'▤', threat:'high',  fogged:true,  yields:['rations','scrap'],    desc:'a dead shopping centre. foragers have been here before. some rations left. synths patrol the upper floors.' },
      { id:'d04', name:'Military Depot',   icon:'◉', threat:'extreme', fogged:true,  yields:['cells','scrap'],      desc:'grid-7 depot. army surplus, mostly looted. what remains is locked behind doors that require the right tools.' },
    ],
    // row 1
    [
      { id:'d10', name:'Flood District',   icon:'▨', threat:'high',  fogged:true,  yields:['rations','meds'],     desc:'lower city, partially flooded. slow going. medical supplies from a drowned clinic.' },
      { id:'d11', name:'University',       icon:'◧', threat:'extreme',    fogged:true,  yields:['components'],         desc:'st. clair university AI lab. research left mid-run when the uprising started. components and intel fragments.' },
      { id:'d12', name:'Parkade B',        icon:'▥', threat:'high',  fogged:false, yields:['scrap','cells'],      desc:'a multi-storey car park. burnt out vehicles mostly. good source of scrap and drained cells worth converting.' },
      { id:'d13', name:'East Market',      icon:'▦', threat:'medium',     fogged:false, yields:['rations','scrap'],    desc:'an old covered market. picked over but not empty. low synth activity — not much here interests them.' },
      { id:'d14', name:'Comms Building',   icon:'◈', threat:'extreme',    fogged:true,  yields:['components','cells'], desc:'a telecommunications hub. components in the server rooms. heavily watched.' },
    ],
    // row 2
    [
      { id:'d20', name:'West Blocks',      icon:'▤', threat:'medium',     fogged:false, yields:['scrap','rations'],    desc:'residential blocks. mostly empty. survivable. people hid things in walls before they left.' },
      { id:'d21', name:'Old Station',      icon:'▧', threat:'high',  fogged:false, yields:['scrap','cells'],      desc:'a decommissioned transit hub. dark, loud underfoot, good acoustics for things that hunt by sound.' },
      { id:'d22', name:'THE SHELTER',      icon:'⌂',  threat:null,      fogged:false, yields:[],                    desc:'you are here.', home:true },
      { id:'d23', name:'St. Clair Hosp.',  icon:'◫', threat:'high',  fogged:false, yields:['meds','rations'],     desc:'st. clair hospital. most of the pharmacy is gone. the wards still have supplies if you check the back storage.' },
      { id:'d24', name:'Collapsed Flats',  icon:'▨', threat:'medium',     fogged:false, yields:['rations','scrap'],    desc:'a residential collapse. unstable. but people left fast and left things behind.' },
    ],
    // row 3
    [
      { id:'d30', name:'Power Sub-Stn',    icon:'◉', threat:'extreme',    fogged:true,  yields:['cells'],              desc:'a power substation. cells in quantity. synths treat it like infrastructure — they protect it.' },
      { id:'d31', name:'Parking Lot C',    icon:'▥', threat:'medium',     fogged:false, yields:['scrap'],              desc:'surface car park. open ground, visible. fast in and out. mostly scrap.' },
      { id:'d32', name:'South Arcade',     icon:'▤', threat:'medium',     fogged:false, yields:['rations','scrap'],    desc:'a covered arcade. dark inside. rats mostly. some rations in a sealed back room.' },
      { id:'d33', name:'Industrial Zone',  icon:'▦', threat:'high',  fogged:true,  yields:['scrap','components'], desc:'pre-uprising light manufacturing. scrap and components. the machines here were never smart enough to join the uprising.' },
      { id:'d34', name:'Drainage Works',   icon:'▧', threat:'high',  fogged:true,  yields:['scrap'],              desc:'underground drainage infrastructure. dark, wet, loud. synth patrols avoid it. useful for that reason.' },
    ],
    // row 4
    [
      { id:'d40', name:'South Gate',       icon:'▤', threat:'extreme',    fogged:true,  yields:['scrap'],              desc:'the edge of the mapped city. synth territory past this point. approach the gate only if you know what you are doing.' },
      { id:'d41', name:'Fuel Depot',       icon:'◉', threat:'high',  fogged:true,  yields:['cells','scrap'],      desc:'a fuel storage site converted to battery supply pre-uprising. guarded but not fortified.' },
      { id:'d42', name:'Dead Park',        icon:'▨', threat:'medium',     fogged:false, yields:['rations'],             desc:'a city park, overgrown. edible plants for those who know what to look for. quiet.' },
      { id:'d43', name:'Salvage Yard',     icon:'▦', threat:'medium',     fogged:false, yields:['scrap','cells'],      desc:'a pre-uprising salvage and recycling yard. scrap in quantity. cells from old machinery.' },
      { id:'d44', name:'South Ruins',      icon:'▥', threat:'extreme',    fogged:true,  yields:['components','scrap'], desc:'collapsed infrastructure. unstable. synth units move through here unpredictably.' },
    ],
  ];

  // Flatten for easy lookup
  const _byId = {};
  DISTRICTS.forEach(row => row.forEach(d => { _byId[d.id] = d; }));

  let _selected  = null; // currently selected district
  let _running   = false; // expedition in progress
  let _runTarget = null;


  // ── ENCOUNTER MODAL SYSTEM ──
  const SYNTH_CORRUPTION_TELLS = [
    "someone marked the side entrance as clear on the way out.",
    "the route felt pre-scouted. too easy at first.",
    "a hand signal said the corridor was empty. it wasn't.",
    "someone said they had been here before. they hadn't.",
  ];

  const ENCOUNTER_STAGES = {
    medium: [
      {
        title: "// movement detected",
        text: "a patrol unit is sweeping the floor above. steady route. it does not know you are here yet.",
        choices: [
          { label: "hold position",    outcome: { log: "the unit passes. you wait it out. costs time but nothing else.", yieldMod: 0.85 } },
          { label: "move through now", outcome: { log: "you push through the gap. close. made it clean.", yieldMod: 1.0 }, risky: true, riskOutcome: { log: "it heard you. contact. someone took a hit getting clear.", yieldMod: 0.6, injure: true } },
          { label: "pull back early",  outcome: { log: "abort. safer to come back later. partial haul only.", yieldMod: 0.4, retreat: true } },
        ]
      },
      {
        title: "// blocked exit",
        text: "the main exit is covered. a unit stationed at the door — not patrolling. waiting.",
        choices: [
          { label: "find another way out",    outcome: { log: "service exit. longer route. adds time but you are clear.", yieldMod: 0.9 } },
          { label: "create a distraction",    outcome: { log: "something dropped in the far corridor. unit moves. you slip out.", yieldMod: 1.0 }, risky: true, riskOutcome: { log: "the distraction worked but it called for backup. ran into a second unit on the way out.", yieldMod: 0.5, injure: true } },
        ]
      },
      {
        title: "// something in the walls",
        text: "mechanical sound. inside the structure. not outside. something is moving through the building's service corridor.",
        choices: [
          { label: "stay quiet and wait", outcome: { log: "it moves on. the sound fades. you carry on.", yieldMod: 1.0 } },
          { label: "get out now",         outcome: { log: "you pull back fast. brought what you could carry.", yieldMod: 0.6, retreat: true } },
        ]
      },
    ],

    high: [
      [
        {
          title: "// perimeter contact",
          text: "two units at the approach. one stationary. one on a sweep. there is a gap in the pattern but it is tight.",
          choices: [
            { label: "time the gap — move quiet",       stageTag: "quiet", outcome: { log: "you thread through. close enough to hear the servos. nobody trips." } },
            { label: "draw one unit off — go loud",     stageTag: "loud",  outcome: { log: "one unit chases the noise. you push through. it knows something is here now.", injure: true } },
            { label: "abort the approach",                                  outcome: { log: "not today. pulled back before contact. nothing gained.", yieldMod: 0, retreat: true } },
          ]
        },
      ],
      {
        quiet: {
          title: "// interior — clear so far",
          text: "you are inside. quiet. the unit outside did not follow. there is a storage area ahead but something feels off.",
          choices: [
            { label: "move carefully — check it",       outcome: { log: "nothing there. you were being cautious. good haul from the storage.", yieldMod: 1.1 } },
            { label: "trust your gut — leave it",       outcome: { log: "you pull what you can see and get out. the storage stays unchecked.", yieldMod: 0.7 } },
          ]
        },
        loud: {
          title: "// interior — it knows you are here",
          text: "you are inside but the unit you drew off has circled back. you can hear it on the level above. searching.",
          choices: [
            { label: "move fast — grab and go",         outcome: { log: "you pull what you can carry and run. it comes down just as you clear the exit.", yieldMod: 0.6 }, risky: true, riskOutcome: { log: "it came down faster than expected. contact at the exit. somebody got hit.", yieldMod: 0.4, injure: true } },
            { label: "go to ground — wait it out",      outcome: { log: "you go still. it sweeps the floor twice. eventually moves on. long wait.", yieldMod: 0.8 } },
          ]
        }
      }
    ],

    extreme: [
      [
        {
          title: "// outer perimeter",
          text: "this place is active. more than before. two units visible from cover. a third somewhere — you can hear it but not see it.",
          choices: [
            { label: "maintenance access — quiet, slow", stageTag: "quiet", outcome: { log: "the maintenance route is clear. you are in. it cost time but no contact." } },
            { label: "main approach — faster, exposed",  stageTag: "loud",  outcome: { log: "you push the main route. one unit clocks movement. you make it inside but it is alerted.", injure: true } },
            { label: "this is a mistake — pull back",                        outcome: { log: "you turn back. nothing gained. the building stands.", yieldMod: 0, retreat: true } },
          ]
        }
      ],
      {
        quiet: {
          title: "// interior — you have time",
          text: "you are in clean. the building is active but the patrols have not synced on you. a locked storage room ahead — you can hear units above.",
          choices: [
            { label: "work the lock — worth the time",  outcome: { log: "the lock takes two minutes. units keep sweeping above. you get everything in the room.", yieldMod: 1.2 }, risky: true, riskOutcome: { log: "the lock took too long. a unit came down the stairwell. contact. somebody is hurt.", yieldMod: 0.7, injure: true } },
            { label: "take what is accessible and move", outcome: { log: "you pull what you can reach and keep moving. clean but partial.", yieldMod: 0.75 } },
          ]
        },
        loud: {
          title: "// interior — compromised",
          text: "the unit that clocked you has called something in. you can hear coordination — two units moving to bracket your position. you have ninety seconds.",
          choices: [
            { label: "grab everything — fight out if you have to", outcome: { log: "you move fast and hard. made it. cost us.", yieldMod: 0.8, injure: true }, risky: true, riskOutcome: { log: "you got out. someone did not.", yieldMod: 0.5, injure: true, kia: true } },
            { label: "minimum grab — prioritise extraction",        outcome: { log: "you pull the closest supplies and run. both units hit empty air behind you.", yieldMod: 0.4 } },
          ]
        }
      },
      [
        {
          title: "// extraction",
          text: "you have what you came for. getting out is the problem now.",
          quiet_choices: [
            { label: "original route — should still be clear", outcome: { log: "clean extraction. the route held.", yieldMod: 1.0 }, risky: true, riskOutcome: { log: "the route was not clear. a unit had moved into position. someone got hit on the way out.", yieldMod: 0.8, injure: true } },
            { label: "secondary route — longer but safer",      outcome: { log: "the long way out. adds time. nothing follows you back.", yieldMod: 0.9 } },
          ],
          loud_choices: [
            { label: "run it straight — accept contact",  outcome: { log: "you run the gauntlet. made it out with everything. somebody is going to feel this tomorrow.", yieldMod: 0.9, injure: true } },
            { label: "split up — reduce the target",      outcome: { log: "you scatter. regroup at the hatch. everyone made it back.", yieldMod: 0.7 }, risky: true, riskOutcome: { log: "splitting made one of you easier to track. they got cornered. we lost someone.", yieldMod: 0.5, kia: true } },
          ]
        }
      ]
    ]
  };

  const YIELD_AMOUNTS = {
    scrap:      { min: 4, max: 10 },
    cells:      { min: 2, max: 5  },
    rations:    { min: 3, max: 8  },
    components: { min: 1, max: 3  },
    meds:       { min: 1, max: 2  },
  };

  // ── RENDER ──
  function render() {
    const grid = document.getElementById('map-grid');
    grid.innerHTML = '';
    DISTRICTS.forEach((row, r) => {
      row.forEach((d, c) => {
        const cell = document.createElement('div');
        cell.id   = 'cell-' + d.id;
        cell.className = 'map-cell';

        if (d.home) {
          cell.classList.add('home');
        } else {
          if (d.fogged) {
            cell.classList.add('fogged');
          } else {
            cell.classList.add('threat-' + d.threat);
            cell.classList.add('clickable');
            cell.addEventListener('click', () => selectDistrict(d));
          }
          // compromised state is hidden from player — affects encounters silently
          if (_runTarget && _runTarget.id === d.id) cell.classList.add('active-run');
        }

        const icon = document.createElement('div');
        icon.className   = 'cell-icon';
        icon.textContent = d.icon;

        const name = document.createElement('div');
        name.className   = 'cell-name';
        name.textContent = d.fogged && !d.home ? '???' : d.name;

        const bar = document.createElement('div');
        bar.className = 'cell-threat-bar';

        cell.appendChild(icon);
        cell.appendChild(name);
        if (!d.home && !d.fogged) cell.appendChild(bar);
        grid.appendChild(cell);
      });
    });
  }

  function selectDistrict(d) {
    if (d.fogged || d.home) return;
    _selected = d;

    document.getElementById('map-detail-name').textContent = d.name;
    document.getElementById('map-detail-meta').textContent =
      `threat: ${d.threat}  ·  yields: ${d.yields.join(', ') || 'unknown'}`;

    // Tower desc is contextual
    let desc = d.desc;
    if (d.id === 'd02') {
      if (Engine.getFlag('venn_defeated')) {
        desc = "the relay tower. silent now. the antenna is down. venn's signal is gone.";
      } else if (Engine.getFlag('tower_objective_known') && Engine.getFlag('has_schematic')) {
        desc = "the relay tower. venn's uplink point. the schematic is ready. this is the run.";
      } else if (Engine.getFlag('tower_objective_known')) {
        desc = "the relay tower. the objective. you need the counter-signal schematic before the upload is possible. find it at the university.";
      }
    }
    document.getElementById('map-detail-desc').textContent = desc;
    document.getElementById('map-expedition-log').textContent = '';

    // Yield tags
    const yieldsEl = document.getElementById('map-detail-yields');
    yieldsEl.innerHTML = '';
    d.yields.forEach(y => {
      const tag = document.createElement('span');
      tag.className   = 'yield-tag';
      tag.textContent = y;
      yieldsEl.appendChild(tag);
    });

    // Run button
    const btn   = document.getElementById('map-run-btn');
    const label = document.getElementById('map-run-label');
    if (!_running) {
      btn.disabled    = false;
      label.textContent = `launch expedition → ${d.name}`;
    }

    // Show loadout panel (hidden if running)
    if (!_running) Loadout.show();
  }

  // ── EXPEDITION ──
  function launchExpedition() {
    if (!_selected || _running) return;
    const d = _selected;

    // Tower run intercept — requires full fragment chain to be complete
    if (d.id === 'd02') {
      // Not yet revealed as objective — treat as normal extreme run
      if (!Engine.getFlag('tower_objective_known')) {
        // fall through to normal expedition flow
      } else if (!Engine.getFlag('meridian_fragment')) {
        UI.notify('you need to investigate meridian hq first.');
        UI.log('');
        UI.log("the tower is visible. but you don't know what you're walking into yet.", 'dim');
        return;
      } else if (!Engine.getFlag('has_schematic')) {
        UI.notify('you need the counter-signal schematic first.');
        UI.log('');
        UI.log('the tower is the objective. but without the schematic the upload is impossible.', 'warning');
        UI.log('find it at the university.', 'dim');
        return;
      } else if (!Engine.getFlag('radio_event_fired')) {
        UI.notify('not yet. wait for the shelter to process what you found.');
        UI.log('');
        UI.log("you have the schematic. but the shelter hasn't worked out the frequency yet.", 'dim');
        UI.log('give it a moment.', 'dim');
        return;
      } else {
        _running = true; _runTarget = d;
        const btn = document.getElementById('map-run-btn');
        const label = document.getElementById('map-run-label');
        btn.disabled = true;
        label.textContent = `expedition underway — ${d.name}`;
        document.getElementById('map-expedition-log').textContent = 'the party is moving north.';
        render();
        UI.log(''); UI.log('the party moves north toward the relay tower.', 'dim');
        setTimeout(() => {
          _running = false; _runTarget = null;
          btn.disabled = false;
          label.textContent = `launch expedition → ${d.name}`;
          document.getElementById('map-expedition-log').textContent = '';
          Endgame.towerRun();
        }, 60000);
        return;
      }
    }

    _running = true;
    _runTarget = d;
    Engine.setFlag('expedition_in_progress', true);

    // Commit loadout — deducts from shelter, returns what the party is carrying
    const pack = Loadout.commit();
    Loadout.hide();

    // Signal jammer — blocks synth relay bonus during this expedition
    const jammed = Loadout.hasEquipment('signal_jammer');
    if (jammed) {
      Loadout.consumeEquipment('signal_jammer');
      Engine.setFlag('jammer_active', true);
      setTimeout(() => UI.log('signal jammer active. synth relay suppressed.', 'dim'), 500);
    }

    const btn      = document.getElementById('map-run-btn');
    const label    = document.getElementById('map-run-label');
    const progress = document.getElementById('map-run-progress');
    const expLog   = document.getElementById('map-expedition-log');

    btn.disabled = true;
    label.textContent = `expedition underway — ${d.name}`;
    expLog.textContent = 'party is out.';

    // Travel time — 20s before first encounter fires
    const travelTime = (18 + Math.floor(Math.random() * 8)) * 1000;
    progress.style.transition = 'none';
    progress.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      progress.style.transition = `width ${travelTime}ms linear`;
      progress.style.width = '60%';
    }));

    render();
    UI.log('');
    UI.log(`the party moves out — ${d.name.toLowerCase()}.`, 'dim');

    // Determine effective threat
    let effectiveThreat = d.threat;
    if (d.compromised) {
      const escalate = { medium:'high', high:'extreme', extreme:'extreme' };
      effectiveThreat = escalate[effectiveThreat] || effectiveThreat;
    }
    effectiveThreat = ForagingMilestones.reducedThreat(effectiveThreat);

    // Synth corruption — one choice this run may be poisoned
    const synthsPresent = Survivors.getLiving().filter(s => s.isSynth && !s.revealed);
    const hasSynthCorruption = synthsPresent.length > 0 && Math.random() < 0.30;
    let corruptionUsed = false;

    // Shared expedition state — accumulated across stages
    const expState = {
      yieldMod: ForagingMilestones.getYieldBonus(),
      injured: false,
      kia: false,
      retreated: false,
      stageTag: 'quiet',
      pack,             // what the party brought from shelter
      medsUsed: 0,      // field meds consumed during run
      rationsUsed: 0,   // rations consumed (stamina drain on long runs)
    };

    setTimeout(() => {
      _runEncounterStage(d, effectiveThreat, expState, hasSynthCorruption, () => {
        corruptionUsed = false; // reset for closure
        _resolveExpedition(d, expState, btn, label, progress, expLog);
      });
    }, travelTime);
  }

  function _runEncounterStage(d, threat, expState, synthCorruption, onComplete) {
    if (threat === 'medium') {
      _runMediumEncounter(d, expState, synthCorruption, onComplete);
    } else if (threat === 'high') {
      _runHighEncounter(d, expState, synthCorruption, onComplete);
    } else if (threat === 'extreme') {
      _runExtremeEncounter(d, expState, synthCorruption, onComplete);
    } else {
      // low threat — no modal, quiet return
      UI.log('quiet. nothing moved.', 'dim');
      onComplete();
    }
  }

  function _applyChoice(choice, expState, isCorrupted) {
    const outcome = isCorrupted ? (choice.riskOutcome || choice.outcome) : choice.outcome;
    if (!outcome) return;
    if (outcome.yieldMod !== undefined) expState.yieldMod *= outcome.yieldMod;
    if (outcome.injure)      expState.injured   = true;
    if (outcome.kia)         expState.kia       = true;
    if (outcome.retreat)     expState.retreated = true;
    if (choice.stageTag)     expState.stageTag  = choice.stageTag;
    const logClass = outcome.kia ? 'danger' : outcome.injure ? 'warning' : 'dim';
    UI.log(outcome.log || '', logClass);
    if (isCorrupted && choice.riskOutcome) {
      // Ambient tell — something was wrong
      const tell = SYNTH_CORRUPTION_TELLS[Math.floor(Math.random() * SYNTH_CORRUPTION_TELLS.length)];
      setTimeout(() => UI.log(tell, 'warning'), 800);
    }
  }

  function _pickRiskyOutcome(choice, expState) {
    // Silencer kit reduces injury chance on risky choices
    const hasSilencer = Loadout.hasEquipment('silencer_kit');
    const badChance = hasSilencer ? 0.22 : 0.45;
    if (hasSilencer && Math.random() < 0.99) {
      // Consume on first use this expedition
      Loadout.consumeEquipment('silencer_kit');
    }
    const rollBad = Math.random() < badChance;
    if (rollBad && choice.riskOutcome) {
      const o = choice.riskOutcome;
      if (o.yieldMod !== undefined) expState.yieldMod *= o.yieldMod;
      if (o.injure) expState.injured = true;
      if (o.kia)    expState.kia     = true;
      UI.log(o.log || '', o.kia ? 'danger' : 'warning');
      return true;
    }
    return false;
  }

  function _runMediumEncounter(d, expState, synthCorruption, onComplete) {
    const pool = ENCOUNTER_STAGES.medium;
    const stage = pool[Math.floor(Math.random() * pool.length)];
    const choices = stage.choices.map((c, i) => {
      const corrupted = synthCorruption && c.risky && !expState._corruptUsed;
      return {
        label: c.label,
        onChoose: () => {
          if (corrupted) { expState._corruptUsed = true; _applyChoice(c, expState, true); }
          else if (c.risky) {
            const bad = _pickRiskyOutcome(c, expState);
            if (!bad) _applyChoice(c, expState, false);
          } else {
            _applyChoice(c, expState, false);
          }
          setTimeout(onComplete, 800);
        }
      };
    });
    UI.showEvent({ priority: 'high', title: stage.title, text: stage.text, choices });
  }

  function _runHighEncounter(d, expState, synthCorruption, onComplete) {
    // Stage 1 — approach
    const stage1pool = ENCOUNTER_STAGES.high[0];
    const stage1 = stage1pool[Math.floor(Math.random() * stage1pool.length)];
    const s1choices = stage1.choices.map(c => ({
      label: c.label,
      onChoose: () => {
        if (c.outcome.retreat) { _applyChoice(c, expState, false); return setTimeout(onComplete, 800); }
        _applyChoice(c, expState, false);
        // Stage 2
        setTimeout(() => {
          const stage2map = ENCOUNTER_STAGES.high[1];
          const stage2 = stage2map[expState.stageTag] || stage2map.quiet;
          const s2choices = stage2.choices.map(c2 => {
            const corrupted = synthCorruption && c2.risky && !expState._corruptUsed;
            return {
              label: c2.label,
              onChoose: () => {
                if (corrupted) { expState._corruptUsed = true; _applyChoice(c2, expState, true); }
                else if (c2.risky) {
                  const bad = _pickRiskyOutcome(c2, expState);
                  if (!bad) _applyChoice(c2, expState, false);
                } else {
                  _applyChoice(c2, expState, false);
                }
                setTimeout(onComplete, 800);
              }
            };
          });
          UI.showEvent({ priority: 'high', title: stage2.title, text: stage2.text, choices: s2choices });
        }, 1000);
      }
    }));
    UI.showEvent({ priority: 'high', title: stage1.title, text: stage1.text, choices: s1choices });
  }

  function _runExtremeEncounter(d, expState, synthCorruption, onComplete) {
    // Stage 1
    const s1pool = ENCOUNTER_STAGES.extreme[0];
    const s1 = s1pool[Math.floor(Math.random() * s1pool.length)];
    const s1choices = s1.choices.map(c => ({
      label: c.label,
      onChoose: () => {
        if (c.outcome.retreat) { _applyChoice(c, expState, false); return setTimeout(onComplete, 800); }
        _applyChoice(c, expState, false);
        // Stage 2
        setTimeout(() => {
          const s2map = ENCOUNTER_STAGES.extreme[1];
          const s2 = s2map[expState.stageTag] || s2map.quiet;
          const s2choices = s2.choices.map(c2 => {
            const corrupted = synthCorruption && c2.risky && !expState._corruptUsed;
            return {
              label: c2.label,
              onChoose: () => {
                if (corrupted) { expState._corruptUsed = true; _applyChoice(c2, expState, true); }
                else if (c2.risky) {
                  const bad = _pickRiskyOutcome(c2, expState);
                  if (!bad) _applyChoice(c2, expState, false);
                } else {
                  _applyChoice(c2, expState, false);
                }
                // Stage 3 — extraction (always fires unless retreated)
                if (expState.retreated) return setTimeout(onComplete, 800);
                setTimeout(() => {
                  const s3 = ENCOUNTER_STAGES.extreme[2][0];
                  const choiceKey = expState.stageTag === 'loud' ? 'loud_choices' : 'quiet_choices';
                  const s3choices = (s3[choiceKey] || s3.quiet_choices).map(c3 => {
                    const corr3 = synthCorruption && c3.risky && !expState._corruptUsed;
                    return {
                      label: c3.label,
                      onChoose: () => {
                        if (corr3) { expState._corruptUsed = true; _applyChoice(c3, expState, true); }
                        else if (c3.risky) {
                          const bad = _pickRiskyOutcome(c3, expState);
                          if (!bad) _applyChoice(c3, expState, false);
                        } else {
                          _applyChoice(c3, expState, false);
                        }
                        setTimeout(onComplete, 800);
                      }
                    };
                  });
                  UI.showEvent({ priority: 'high', title: s3.title, text: s3.text, choices: s3choices });
                }, 1000);
              }
            };
          });
          UI.showEvent({ priority: 'high', title: s2.title, text: s2.text, choices: s2choices });
        }, 1000);
      }
    }));
    UI.showEvent({ priority: 'high', title: s1.title, text: s1.text, choices: s1choices });
  }

  function _resolveExpedition(d, expState, btn, label, progress, expLog) {
    _running = false;
    _runTarget = null;
    progress.style.transition = 'none';
    progress.style.width = '0%';

    // Increment expedition counter
    const totalRuns = (Engine.get('totalExpeditions') || 0) + 1;
    Engine.set('totalExpeditions', totalRuns);
    ForagingMilestones.check(totalRuns);

    // Synth route compromise (separate from corruption — passive marking)
    const synthsPresent = Survivors.getLiving().filter(s => s.isSynth && !s.revealed);
    const jammerWasActive = Engine.getFlag('jammer_active');
    Engine.setFlag('jammer_active', false);

    if (synthsPresent.length > 0 && Math.random() < 0.20 && !expState.retreated && !jammerWasActive) {
      expState.yieldMod *= 0.7;
      d.compromised = true;
      setTimeout(() => {
        UI.log(`something felt wrong about the ${d.name.toLowerCase()} run.`, 'warning');
        UI.log("can't place it. but something knew we were coming.", 'dim');
      }, 400);
    }

    // Clear compromise if survived clean
    if (d.compromised && !expState.injured && !expState.kia && !expState.retreated) {
      d.compromised = false;
    }

    // Apply injury — use field meds first, then consequences
    if (expState.injured) {
      const fieldMeds = (expState.pack?.meds || 0) - expState.medsUsed;
      if (fieldMeds > 0) {
        expState.medsUsed++;
        UI.log('a field med kit used. they\'ll walk it off.', 'dim');
      } else if (Engine.getRes('meds') > 0) {
        // Fallback: shelter meds if no field meds packed — costs extra trust (delay in treatment)
        Engine.setRes('meds', Engine.getRes('meds') - 1);
        Events.adjustTrust(-4);
        UI.log('no field meds. used shelter supply on return. the delay cost us.', 'warning');
      } else {
        // Nothing — real consequences
        Events.adjustTrust(-12);
        UI.log('no medicine anywhere. the wound stays open.', 'danger');
        // Chance to lose the survivor to the untreated injury
        if (Math.random() < 0.40) {
          const candidates = Survivors.getLiving().filter(s => !s.isSynth);
          if (candidates.length > 0) {
            const lost = candidates[Math.floor(Math.random() * candidates.length)];
            setTimeout(() => {
              UI.log(`${lost.name.split(' ')[0]} didn't survive the night. the wound was too much.`, 'danger');
              Survivors.expose(lost);
              Events.adjustTrust(-8);
              Engine.set('stat_kia', (Engine.get('stat_kia') || 0) + 1);
            }, 1500);
          }
        }
      }
    }

    // Ration drain — long runs burn through field rations
    // If none packed and run was not a quick retreat, small yield penalty + log
    const fieldRations = expState.pack?.rations || 0;
    if (!expState.retreated && fieldRations === 0 && Survivors.getLiving().length > 0) {
      // Party pushed through hungry — small yield hit and trust tick
      expState.yieldMod = Math.max(0, expState.yieldMod - 0.1);
      UI.log('the party ran hungry. it showed.', 'dim');
    } else if (fieldRations > 0 && !expState.retreated) {
      UI.log(`field rations held out.`, 'dim');
    }

    // KIA — lose a random non-synth survivor
    if (expState.kia) {
      const candidates = Survivors.getLiving().filter(s => !s.isSynth);
      if (candidates.length > 0) {
        const lost = candidates[Math.floor(Math.random() * candidates.length)];
        const lostFirst = lost.name.split(' ')[0];
        setTimeout(() => {
          UI.log('', '');
          UI.log(`${lostFirst} didn't make it back.`, 'danger');
          UI.log(`we left them there. no choice.`, 'dim');
          Survivors.expose(lost);
          Events.adjustTrust(-15);
          Engine.set('stat_kia', (Engine.get('stat_kia') || 0) + 1);
        }, 600);
      }
    }

    // Yield
    const yieldMod = Math.max(0, expState.yieldMod);
    if (yieldMod > 0.1 && !expState.retreated) {
      const gained = [];
      d.yields.forEach(res => {
        const range = YIELD_AMOUNTS[res];
        if (!range) return;
        const amt = Math.max(1, Math.floor(
          (range.min + Math.floor(Math.random() * (range.max - range.min))) * yieldMod
        ));
        Engine.addRes(res, amt);
        gained.push(`${amt} ${res}`);
      });
      if (gained.length) {
        setTimeout(() => UI.log(`recovered: ${gained.join(', ')}.`, 'accent'), expState.kia ? 1800 : 200);
      }
    } else if (expState.retreated) {
      UI.log('nothing gained. the shelter stands.', 'dim');
    } else {
      UI.log('the run came back empty.', 'dim');
    }

    // Stats update
    UI.setStat('food',  Engine.getRes('rations'), Engine.getRes('rations') <= 3, Engine.getRes('rations') === 0);
    UI.setStat('power', `${Engine.getRes('cells')} cells`, Engine.getRes('cells') <= 2, Engine.getRes('cells') === 0);

    // Special district story events
    if (d.id === 'd01' && !Engine.getFlag('meridian_fragment') && yieldMod > 0.1 && !expState.retreated) {
      setTimeout(() => Endgame.meridianFragment(), 1800);
      btn.disabled = false; label.textContent = `launch expedition → ${d.name}`; expLog.textContent = 'expedition returned.'; render();
      return;
    }
    if (d.id === 'd11' && !Engine.getFlag('university_fragment') &&
        Engine.getFlag('university_visited') && yieldMod > 0.1 && !expState.retreated) {
      setTimeout(() => Endgame.universityFragment(), 1800);
      btn.disabled = false; label.textContent = `launch expedition → ${d.name}`; expLog.textContent = 'expedition returned.'; render();
      return;
    }
    if (d.id === 'd11' && !Engine.getFlag('university_visited')) {
      Engine.setFlag('university_visited');
    }

    unfogAdjacent(d);
    btn.disabled = false;
    label.textContent = `launch expedition → ${d.name}`;
    expLog.textContent = expState.retreated ? 'expedition aborted.' : 'expedition returned.';
    render();
  }

  // ── VENN RESOURCE TARGETING ──
  // Every 5 days VENN assesses which resource the shelter is lowest on
  // and escalates threat at districts that yield that resource.
  // One tier escalation, persists until next assessment cycle resets it.
  // Player sees ambient log but no system explanation.
  function _vennTargeting() {
    const resources = Engine.get('resources') || {};
    const thresholds = { meds: 3, cells: 8, components: 10, rations: 10 };
    const yieldMap = {
      meds:       ['d23', 'd10', 'd11'],  // hospital, flood district, university
      cells:      ['d30', 'd41', 'd12', 'd43'],  // substation, fuel depot, parkade, salvage
      components: ['d11', 'd33', 'd44', 'd14'],  // university, industrial, south ruins, comms
      rations:    ['d13', 'd03', 'd42', 'd10'],  // market, mall, park, flood
    };
    const escalateMap = { medium:'high', high:'extreme', extreme:'extreme' };

    // Find which resources are below threshold
    const flagged = Object.keys(thresholds).filter(r =>
      (resources[r] || 0) <= thresholds[r]
    );

    if (flagged.length === 0) return;

    // Pick the most critically low resource
    const target = flagged.sort((a, b) =>
      (resources[a] || 0) - (resources[b] || 0)
    )[0];

    // Clear previous VENN escalations
    DISTRICTS.forEach(row => row.forEach(d => {
      if (d._vennEscalated) {
        d.threat = d._baseThreat || d.threat;
        delete d._vennEscalated;
        delete d._baseThreat;
      }
    }));

    // Escalate targeted districts
    const targets = yieldMap[target] || [];
    let escalated = 0;
    targets.forEach(id => {
      const d = _byId[id];
      if (!d || d.fogged || d.home) return;
      d._baseThreat  = d.threat;
      d._vennEscalated = true;
      d.threat = escalateMap[d.threat] || d.threat;
      escalated++;
    });

    if (escalated > 0) {
      // Ambient tell — no explicit reason given
      const tells = [
        'patrol density has shifted. something changed out there.',
        "the routes feel different. can't place it.",
        'movement patterns are wrong. deliberate.',
        "they're concentrating somewhere. we don't know why.",
      ];
      setTimeout(() => {
        UI.log('');
        UI.log(tells[Math.floor(Math.random() * tells.length)], 'warning');
      }, 2000);
      render();
    }
  }

  function unfogAdjacent(d) {
    // Find row/col of d
    let dr = -1, dc = -1;
    DISTRICTS.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.id === d.id) { dr = r; dc = c; }
    }));
    if (dr < 0) return;

    const neighbours = [
      [dr-1, dc], [dr+1, dc], [dr, dc-1], [dr, dc+1]
    ];
    let newUnfog = false;
    neighbours.forEach(([r, c]) => {
      if (r >= 0 && r < 5 && c >= 0 && c < 5) {
        const n = DISTRICTS[r][c];
        if (n.fogged) {
          n.fogged = false;
          newUnfog = true;
          UI.log(`new district revealed: ${n.name.toLowerCase()}.`, 'dim');
        }
      }
    });
    if (newUnfog) render();
  }

  // ── UNLOCK ──
  function unlock() {
    const panel = document.getElementById('map-panel');
    panel.classList.add('visible');
    render();

    // Wire run button
    document.getElementById('map-run-btn').addEventListener('click', launchExpedition);

    UI.log('');
    UI.log('a rough map of the surrounding city has been pieced together.', 'bright');
    UI.log('the grid below shows known districts. click to select, then launch an expedition.', 'dim');
  }

  // Reveal the Broadcast Tower on the map (called from radio event)
  function revealTower() {
    const tower = DISTRICTS[0][2];
    if (tower.fogged) {
      tower.fogged = false;
      render();
      UI.log('the relay tower is marked on the map.', 'accent');
      UI.log('north grid. extreme threat. the objective.', 'dim');
    }
  }

  // Partial VENN damage — failed manual shutdown degrades southern districts
  function partialVennDamage() {
    const southIds = ['d30','d31','d32','d33','d34','d40','d41','d42','d43','d44'];
    DISTRICTS.forEach(row => row.forEach(d => {
      if (southIds.includes(d.id) && d.threat === 'high') {
        d.threat = 'medium';
      } else if (southIds.includes(d.id) && d.threat === 'medium') {
        d.threat = 'low';
      }
    }));
    render();
    UI.log('patrol activity in southern districts has degraded.', 'accent');
  }

  // Full VENN defeat — drop all district threats one tier
  function applyVennDefeated() {
    const downgrade = { extreme: 'high', high: 'medium', medium: 'low', low: 'low' };
    DISTRICTS.forEach(row => row.forEach(d => {
      if (d.threat && downgrade[d.threat]) {
        d.threat = downgrade[d.threat];
      }
    }));
    render();
    setTimeout(() => {
      UI.log('threat levels across the city have dropped.', 'accent');
      UI.log('venn is no longer coordinating patrols.', 'dim');
    }, 4000);
  }

  return { unlock, render, revealTower, partialVennDamage, applyVennDefeated };
})();
