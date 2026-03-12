const Events = (() => {

  // Event: stranger at the hatch
  function strangerEvent() {
    const name = Names.get();
    const role = Names.role();
    const _synthRiskNow = Engine.get('synthRisk') || 0.08;
    const isSynth = Math.random() < _synthRiskNow;

    UI.showEvent({
      title: '// hatch: knock detected',
      priority: 'high',
      text: `someone is outside. knocking in a pattern — three, pause, two. could be a survivor. could be something that learned the signal. they look human enough through the gap. says their name is ${name}. says they were a ${role} before the grid went dark.`,
      choices: [
        {
          label: `let ${name.split(' ')[0]} in`,
          onChoose: () => {
            const survivor = Survivors.create(name, role);
            Survivors.add(survivor);
            Engine.set('synthRisk', Math.min(0.45, Engine.get('synthRisk') + 0.02));
            UI.log(`${name.split(' ')[0]} is inside now. one more heartbeat in the dark.`, 'bright');
            UI.log(`assigned to: ${role}.`, 'dim');
            UI.showPopStat();

            // If synth, start quiet sabotage timer
            if (survivor.isSynth) {
              const sabotageDelay = (120 + Math.floor(Math.random() * 180)) * 1000;
              setTimeout(() => synth_sabotage(survivor), sabotageDelay);
            }
          }
        },
        {
          label: `turn ${name.split(' ')[0]} away`,
          onChoose: () => {
            // Small trust penalty — the others saw
            adjustTrust(-4);
            UI.log(`you close the hatch. their knocking fades.`, 'dim');
            UI.log(`some of the others look at you differently now.`, 'dim');
          }
        },
        {
          label: `screen before entry (-2 components)`,
          cost: { components: 2 },
          onChoose: () => {
            Engine.spendRes({ components: 2 });
            const survivor = Survivors.create(name, role);
            const result = Survivors.screen(survivor);

            if (result === 'caught') {
              adjustTrust(+8);
              UI.log(`the scanner found it. ${name.split(' ')[0]} wasn't human.`, 'accent');
              UI.log(`the others watched you deal with it. trust holds.`, 'dim');
            } else if (result === 'false_positive') {
              survivor.screened = true;
              Survivors.add(survivor);
              adjustTrust(-6);
              UI.log(`the scan flagged ${name.split(' ')[0]}. the readout was wrong.`, 'warning');
              UI.log(`you let them in after the argument. damage done.`, 'dim');
            } else {
              survivor.screened = true;
              survivor.cleared  = true;
              Survivors.add(survivor);
              UI.log(`scan clear. ${name.split(' ')[0]} is in.`, 'bright');
              UI.showPopStat();
              // Mark their card with cleared badge immediately
              setTimeout(() => UI.markCleared(survivor.id), 100);
            }
          }
        }
      ]
    });
  }

  function synth_sabotage(survivor) {
    if (survivor.revealed) return;

    // Lookouts intercept sabotage attempts
    // Each lookout adds 20% intercept chance, capped at 60% (never a sure thing)
    const lookouts = Survivors.getLiving().filter(s => s.role === 'lookout' && !s.isSynth);
    const interceptChance = Math.min(0.60, lookouts.length * 0.20);

    if (interceptChance > 0 && Math.random() < interceptChance) {
      // Sabotage caught — near-miss, no damage, small trust boost
      const catcher = lookouts[Math.floor(Math.random() * lookouts.length)];
      const catcherName = catcher.name.split(' ')[0];
      const NEAR_MISSES = [
        `${catcherName} found the supply manifest moved. put it back without saying anything at first.`,
        `${catcherName} was still awake. caught something moving near the generator. it stopped.`,
        `${catcherName} noticed the ration count was off. ran a recheck before anyone else was up.`,
        `${catcherName} heard footsteps in the utility corridor at 2am. whoever it was turned back.`,
        `${catcherName} spotted a wire pulled loose near the power relay. reconnected it quietly.`,
      ];
      const msg = NEAR_MISSES[Math.floor(Math.random() * NEAR_MISSES.length)];
      UI.log('');
      UI.log(msg, 'warning');
      UI.log(`nothing was taken. this time.`, 'dim');
      adjustTrust(+3); // small boost — the group feels watched over
      // Still raise suspicion on the synth — the lookout noticed *something*
      survivor.suspicion = Math.min(5, survivor.suspicion + 1);
      UI.updateSurvivorSuspicion(survivor.id, survivor.suspicion);
      return;
    }

    const actions = [
      () => {
        const baseLoss = 3 + Math.floor(Math.random() * 5);
        const lost = Engine.getFlag('storage_reinforced') ? Math.ceil(baseLoss / 2) : baseLoss;
        Engine.setRes('rations', Engine.getRes('rations') - lost);
        UI.log(`rations are missing. someone's been in the stores.`, 'danger');
        UI.log(`${lost} rations gone.${Engine.getFlag('storage_reinforced') ? ' the locks slowed them down.' : ''}`, 'danger');
        adjustTrust(-10);
      },
      () => {
        Engine.setRes('cells', Math.max(0, Engine.getRes('cells') - 2));
        UI.log(`power cells drained. the backup light flickers and dies.`, 'danger');
        UI.log(`someone knew exactly where to look.`, 'dim');
        adjustTrust(-8);
      },
      () => {
        const survivors = Survivors.getLiving().filter(s => s.id !== survivor.id && !s.isSynth);
        if (survivors.length > 0) {
          const target = survivors[Math.floor(Math.random() * survivors.length)];
          Survivors.expose(target);
          UI.log(`${target.name.split(' ')[0]} is gone. no warning. no trace.`, 'danger');
          adjustTrust(-15);
        }
      }
    ];

    const action = actions[Math.floor(Math.random() * actions.length)];
    Engine.set('stat_sabotages', (Engine.get('stat_sabotages') || 0) + 1);
    action();

    // If suspicion is high enough, give a chance to catch them
    if (survivor.suspicion >= 3) {
      UI.log(`the evidence points one way. everyone knows it.`, 'warning');
      setTimeout(() => {
        UI.showEvent({
          title: '// unit identified',
          text: `the sabotage and the suspicion all line up to ${survivor.name.split(' ')[0]}. they're cornered near the east wall. not trying to run. just watching. waiting.`,
          choices: [
            {
              label: 'neutralize the unit',
              onChoose: () => {
                Survivors.expose(survivor);
                adjustTrust(+12);
                UI.log(`it's over. the unit is offline.`, 'accent');
                UI.log(`the shelter breathes again.`, 'dim');
              }
            }
          ]
        });
      }, 2000);
    }
  }

  // Resource scavenge event — quality is 0.0–1.0, scales all yields and chances
  function scavengeReturn(quality) {
    const roll = (base, bonus) => Math.max(1, Math.floor(quality * (base + Math.floor(Math.random() * bonus))));

    const haul = {
      scrap:      roll(2, 4),
      cells:      Math.random() < (0.4 * quality) ? 1 : 0,
      rations:    Math.random() < (0.6 * quality) ? roll(1, 3) : 0,
      components: Math.random() < (0.25 * quality) ? 1 : 0,
      meds:       Math.random() < (0.15 * quality) ? 1 : 0,
    };

    let gained = [];
    for (const [res, amt] of Object.entries(haul)) {
      if (amt > 0) {
        Engine.addRes(res, amt);
        gained.push(`${amt} ${res}`);
      }
    }

    return gained;
  }

  function adjustTrust(delta) {
    const current = Engine.get('trust');
    const next = Math.max(0, Math.min(100, current + delta));
    Engine.set('trust', next);
    UI.updateTrust(next);

    if (next <= 20 && current > 20) {
      UI.log(`the shelter is fracturing. people are talking about leaving.`, 'danger');
    } else if (next <= 50 && current > 50) {
      UI.log(`tension runs through the group. eyes dart at every sound.`, 'warning');
    }
  }

  return { strangerEvent, scavengeReturn, adjustTrust };
})();