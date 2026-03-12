const Raids = (() => {

  // ── CONSTANTS ──────────────────────────────────────────────────────────────

  // Minimum ticks between any two raids (180 = 3 minutes)
  const RAID_COOLDOWN_TICKS = 180;

  // Tick interval to check if a raid should be scheduled (every 30s)
  const CHECK_INTERVAL = 30;

  // Base probability per check — scales with synthRisk and active synths
  const BASE_RAID_CHANCE = 0.04;

  // ── STATE ──────────────────────────────────────────────────────────────────

  let _lastRaidTick   = 0;   // when the last raid landed
  let _raidScheduled  = false;
  let _raidWarned     = false; // has the pre-raid warning log fired?
  let _warnTimeout    = null;
  let _raidTimeout    = null;

  // ── SEVERITY TIERS ─────────────────────────────────────────────────────────

  // Each tier: { id, label, weight, execute }
  // Weight is relative — higher tiers become more likely at high synthRisk
  // execute() carries out the raid and returns a result string for the debrief log
  const TIERS = {

    probe: {
      label: 'probe',
      execute() {
        // No material damage — just fear and rising risk
        const tells = [
          'a unit circled the block twice. didn\'t stop. knows something is here.',
          'thermal traces on the east wall. it swept and moved on.',
          'a drone passed low overhead. passive scan. logged your heat signature.',
          'the hatch rattled once. tested. didn\'t push.',
          'scratching sounds at the ventilation grate. then nothing.',
        ];
        UI.log('');
        UI.log(tells[Math.floor(Math.random() * tells.length)], 'warning');
        setTimeout(() => UI.log('it didn\'t breach. this time.', 'dim'), 900);

        // Raise synthRisk — they now have better fix on your location
        Engine.set('synthRisk', Math.min(0.55, Engine.get('synthRisk') + 0.04));
        Events.adjustTrust(-3);
        return 'probe';
      }
    },

    strike: {
      label: 'strike',
      execute() {
        // One targeted resource hit — generator degraded OR supplies stolen
        const genOn = Engine.get('generatorOn');
        const outcomes = [];

        // Always a viable option — supply theft
        outcomes.push(() => {
          const baseLoss = 4 + Math.floor(Math.random() * 6);
          const protected_ = Engine.getFlag('storage_reinforced');
          const lost = protected_ ? Math.ceil(baseLoss * 0.4) : baseLoss;
          Engine.setRes('rations', Engine.getRes('rations') - lost);
          UI.log(`${lost} rations gone.${protected_ ? ' the reinforced storage absorbed most of the damage.' : ' the stores were hit hard.'}`, 'danger');
          const scrapLost = Math.floor(Math.random() * 4) + 1;
          Engine.setRes('scrap', Engine.getRes('scrap') - scrapLost);
          UI.log(`${scrapLost} scrap stripped from the upper shelves.`, 'danger');
          Events.adjustTrust(-10);
        });

        // Generator degradation — only if it's running
        if (genOn) {
          outcomes.push(() => {
            const drained = 2 + Math.floor(Math.random() * 2);
            const newCells = Math.max(0, Engine.getRes('cells') - drained);
            Engine.setRes('cells', newCells);
            UI.setStat('power', `${newCells} cells`, newCells <= 1, newCells === 0);
            UI.log(`${drained} power cells pulled from the generator housing.`, 'danger');
            if (newCells <= 1) {
              setTimeout(() => UI.log('the generator is running on fumes.', 'warning'), 700);
            }
            Events.adjustTrust(-8);
          });
        }

        // Components — rare but painful
        if (Engine.getRes('components') >= 2) {
          outcomes.push(() => {
            const lost = Math.min(Engine.getRes('components'), 2);
            Engine.setRes('components', Engine.getRes('components') - lost);
            UI.log(`${lost} components taken. precision sabotage — they knew what to look for.`, 'danger');
            Events.adjustTrust(-7);
          });
        }

        UI.log('');
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        outcome();
        setTimeout(() => UI.log('they came in fast and left faster. barely a sound.', 'dim'), 1200);
        return 'strike';
      }
    },

    assault: {
      label: 'assault',
      execute() {
        UI.log('');
        UI.log('multiple units. coordinated entry through the ventilation stack.', 'danger');
        setTimeout(() => UI.log('they knew the layout.', 'danger'), 600);

        const genOn = Engine.get('generatorOn');

        // Always hits two things
        // 1. Generator damage / disable
        if (genOn) {
          const killGen = Math.random() < 0.55;
          if (killGen) {
            // Flag as raid-damaged — two-step: first disable, restart still works
            Engine.setFlag('generator_raid_damaged');
            Engine.set('generatorOn', false);
            UI.setGenerator(false);
            setTimeout(() => {
              UI.log('the generator is down. sabotaged at the fuel relay.', 'danger');
              UI.log('it can be restarted but the damage will need to be cleared first.', 'dim');
            }, 1000);
            Events.adjustTrust(-10);
          } else {
            const drained = 3 + Math.floor(Math.random() * 3);
            Engine.setRes('cells', Math.max(0, Engine.getRes('cells') - drained));
            UI.setStat('power', `${Engine.getRes('cells')} cells`,
              Engine.getRes('cells') <= 1, Engine.getRes('cells') === 0);
            setTimeout(() => UI.log(`generator breached. ${drained} cells stripped.`, 'danger'), 900);
            Events.adjustTrust(-8);
          }
        }

        // 2. Supplies
        setTimeout(() => {
          const baseLoss = 6 + Math.floor(Math.random() * 8);
          const protected_ = Engine.getFlag('storage_reinforced');
          const rationLost = protected_ ? Math.ceil(baseLoss * 0.5) : baseLoss;
          Engine.setRes('rations', Engine.getRes('rations') - rationLost);
          UI.log(`${rationLost} rations taken.${protected_ ? ' the sealed storage held some of it.' : ''}`, 'danger');
          Events.adjustTrust(-8);
        }, 1600);

        // 3. Possible survivor casualty (30% chance)
        setTimeout(() => {
          const living = Survivors.getLiving();
          if (living.length > 0 && Math.random() < 0.30) {
            // Prefer to injure/lose a human — synths wouldn't be harmed
            const targets = living.filter(s => !s.isSynth);
            if (targets.length > 0) {
              const victim = targets[Math.floor(Math.random() * targets.length)];
              const firstName = victim.name.split(' ')[0];
              Survivors.expose(victim);
              UI.log(`${firstName} didn't make it out of the way in time.`, 'danger');
              Events.adjustTrust(-12);
            }
          }
        }, 2400);

        setTimeout(() => UI.log('the shelter is quiet again. damaged but standing.', 'dim'), 3500);
        return 'assault';
      }
    },

    coordinated: {
      label: 'coordinated assault',
      execute() {
        // Worst tier — only fires if a synth is active inside
        // The synth unlocked the hatch / fed them the full layout
        UI.log('');
        UI.log('the hatch opens from inside.', 'danger');
        setTimeout(() => UI.log('someone let them in.', 'danger'), 800);
        setTimeout(() => UI.log('they move like they\'ve been here before. because they have.', 'danger'), 1600);

        // Reveal the synth that caused it
        const synths = Survivors.getLiving().filter(s => s.isSynth && !s.revealed);
        let betrayerName = null;
        if (synths.length > 0) {
          const betrayer = synths[0];
          betrayerName = betrayer.name.split(' ')[0];
          setTimeout(() => {
            Survivors.expose(betrayer);
            UI.log(`${betrayerName}. it was ${betrayerName}.`, 'accent');
          }, 2500);
        }

        // Guaranteed generator kill
        if (Engine.get('generatorOn')) {
          Engine.setFlag('generator_raid_damaged');
          Engine.set('generatorOn', false);
          UI.setGenerator(false);
          setTimeout(() => UI.log('generator: offline. fuel line cut.', 'danger'), 3000);
        }

        // Heavy supply loss
        setTimeout(() => {
          const rationLost = 8 + Math.floor(Math.random() * 10);
          const protected_ = Engine.getFlag('storage_reinforced');
          const actual = protected_ ? Math.ceil(rationLost * 0.6) : rationLost;
          Engine.setRes('rations', Engine.getRes('rations') - actual);
          Engine.setRes('scrap', Math.max(0, Engine.getRes('scrap') - 5));
          Engine.setRes('cells', Math.max(0, Engine.getRes('cells') - 3));
          UI.log(`${actual} rations taken. scrap and cells raided.`, 'danger');
        }, 3600);

        // Trust crater
        setTimeout(() => Events.adjustTrust(-20), 4000);

        // Survivor casualty — higher odds
        setTimeout(() => {
          const living = Survivors.getLiving();
          if (living.length > 0 && Math.random() < 0.50) {
            const targets = living.filter(s => !s.isSynth);
            if (targets.length > 0) {
              const victim = targets[Math.floor(Math.random() * targets.length)];
              Survivors.expose(victim);
              UI.log(`${victim.name.split(' ')[0]} is gone. couldn't reach them in time.`, 'danger');
              Events.adjustTrust(-10);
            }
          }
        }, 4800);

        // SynthRisk drops — the synth is gone, they got what they came for
        setTimeout(() => {
          Engine.set('synthRisk', Math.max(0.08, Engine.get('synthRisk') - 0.08));
          UI.log('');
          UI.log('the units withdraw. they got what they needed.', 'dim');
        }, 5600);

        return 'coordinated';
      }
    },
  };

  // ── RAID ELIGIBILITY ────────────────────────────────────────────────────────

  function _currentRaidChance(tickCount) {
    if (!Engine.get('generatorOn')) return 0;                // raids don't happen in darkness
    if (!Engine.getFlag('hatch_reinforced')) return 0;       // pre-hatch: no one knows you're here
    if (Engine.getFlag('tower_run_active')) return 0;        // final run — handled separately
    if (_raidScheduled) return 0;
    if (tickCount - _lastRaidTick < RAID_COOLDOWN_TICKS) return 0;

    const synthRisk = Engine.get('synthRisk') || 0.08;
    const activeSynths = Survivors.getLiving().filter(s => s.isSynth && !s.revealed).length;
    const expeditionBonus = Engine.getFlag('expedition_in_progress') ? 0.04 : 0;

    // Active synths dramatically raise raid chance
    return Math.min(
      0.35,
      BASE_RAID_CHANCE + (synthRisk * 0.15) + (activeSynths * 0.08) + expeditionBonus
    );
  }

  function _pickTier() {
    const synthRisk    = Engine.get('synthRisk') || 0.08;
    const activeSynths = Survivors.getLiving().filter(s => s.isSynth && !s.revealed).length;

    // Coordinated assault only fires if a synth is actively inside
    if (activeSynths > 0 && synthRisk >= 0.30 && Math.random() < 0.35) {
      return TIERS.coordinated;
    }

    // Weight remaining tiers by risk level
    // Low risk → mostly probes; high risk → more assaults
    const roll = Math.random();

    if (synthRisk < 0.15) {
      // Early game — mostly probes, occasional strike
      if (roll < 0.65) return TIERS.probe;
      return TIERS.strike;
    }

    if (synthRisk < 0.30) {
      if (roll < 0.35) return TIERS.probe;
      if (roll < 0.80) return TIERS.strike;
      return TIERS.assault;
    }

    // High risk
    if (roll < 0.15) return TIERS.probe;
    if (roll < 0.55) return TIERS.strike;
    return TIERS.assault;
  }

  // ── WARNING SYSTEM ──────────────────────────────────────────────────────────

  const RAID_WARNINGS = [
    'something is moving on the street above. more than one unit.',
    'the ventilation feeds are cutting out. one by one.',
    'a patrol has looped the block three times in the last hour.',
    'distant scraping — metal on concrete. getting closer.',
    'the lights on the upper floor have gone dark. power interference.',
    'lookout reports two units holding position near the east wall.',
  ];

  const LOOKOUT_INTERCEPTS = [
    (name) => `${name} caught it early. spotted the approach from the roof access.`,
    (name) => `${name} was watching. flagged the patrol formation before it closed in.`,
    (name) => `${name} had eyes on the east wall. gave everyone time to prepare.`,
  ];

  // ── SCHEDULE & FIRE ─────────────────────────────────────────────────────────

  function _scheduleRaid(delayMs, tier) {
    _raidScheduled  = true;
    _raidWarned     = false;

    // Warning fires halfway through the delay (minimum 15s before raid)
    const warnDelay = Math.max(delayMs - 15000, delayMs * 0.5);
    _warnTimeout = setTimeout(() => {
      if (!_raidWarned) {
        _raidWarned = true;
        UI.log('');
        UI.log(RAID_WARNINGS[Math.floor(Math.random() * RAID_WARNINGS.length)], 'warning');
      }
    }, warnDelay);

    _raidTimeout = setTimeout(() => {
      _execute(tier);
    }, delayMs);
  }

  function _execute(tier) {
    _raidScheduled = false;
    _raidWarned    = false;
    _warnTimeout   = null;
    _raidTimeout   = null;

    // Check if lookouts intercept — each lookout gives 20% intercept chance, capped at 60%
    const lookouts = Survivors.getLiving().filter(s => s.role === 'lookout' && !s.isSynth);
    const interceptChance = Math.min(0.60, lookouts.length * 0.20);

    if (lookouts.length > 0 && Math.random() < interceptChance) {
      const interceptor = lookouts[Math.floor(Math.random() * lookouts.length)];
      const line = LOOKOUT_INTERCEPTS[Math.floor(Math.random() * LOOKOUT_INTERCEPTS.length)];
      UI.log('');
      UI.log(line(interceptor.name.split(' ')[0]), 'accent');

      // Downgrade the tier on intercept
      const downgrade = {
        coordinated: TIERS.assault,
        assault:     TIERS.strike,
        strike:      TIERS.probe,
        probe:       null, // probe intercepted = fully repelled
      };

      const degraded = downgrade[tier.label];
      if (!degraded) {
        // Fully repelled
        setTimeout(() => UI.log('the units pulled back. threat neutralised.', 'dim'), 700);
        Events.adjustTrust(+5);
        _recordRaid(tier.label, true);
        return;
      }

      // Partially repelled — downgraded tier still fires
      setTimeout(() => UI.log(`the approach was slowed. they still got through — but barely.`, 'dim'), 700);
      setTimeout(() => degraded.execute(), 1400);
      _recordRaid(tier.label, true, degraded.label);
      return;
    }

    // No intercept — full raid
    tier.execute();
    _recordRaid(tier.label, false);
  }

  function _recordRaid(tier, intercepted, degradedTo) {
    const count = (Engine.get('stat_raids') || 0) + 1;
    Engine.set('stat_raids', count);
    _lastRaidTick = Engine.get('tickCount') || 0;

    // Store last raid info for debrief
    Engine.set('last_raid', {
      tier,
      intercepted,
      degradedTo: degradedTo || null,
      day: Engine.get('day'),
    });
  }

  // ── TICK HOOK ───────────────────────────────────────────────────────────────

  function tick(t) {
    // Only check on interval and when game is running
    if (t % CHECK_INTERVAL !== 0 || t < 90) return; // no raids in first 90s
    if (!Engine.get('started')) return;

    const chance = _currentRaidChance(t);
    if (chance <= 0) return;

    if (Math.random() < chance) {
      const tier = _pickTier();
      // Delay scales with tier severity — probes arrive fast, assaults build tension
      const delayMap = {
        probe:        12000 + Math.random() * 8000,
        strike:       20000 + Math.random() * 15000,
        assault:      30000 + Math.random() * 20000,
        coordinated:  35000 + Math.random() * 15000,
      };
      _scheduleRaid(delayMap[tier.label], tier);
    }
  }

  // ── DEV / DEBUG ─────────────────────────────────────────────────────────────

  function forceRaid(tierName) {
    const tier = TIERS[tierName] || TIERS.strike;
    _scheduleRaid(3000, tier);
  }

  // ── REPAIR HOOK ─────────────────────────────────────────────────────────────
  // Called when generator restart is attempted after a raid-damaged state
  // Returns true if the damage has been cleared (costs extra scrap)
  function clearGeneratorDamage() {
    if (!Engine.getFlag('generator_raid_damaged')) return true;
    if (!Engine.spendRes({ scrap: 3 })) {
      UI.notify('need 3 scrap to clear raid damage first');
      return false;
    }
    Engine.setFlag('generator_raid_damaged', false);
    UI.log('raid damage cleared from the fuel relay.', 'dim');
    return true;
  }

  return { tick, forceRaid, clearGeneratorDamage };
})();