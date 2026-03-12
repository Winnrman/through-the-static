const Endgame = (() => {

  // ── ACT 1: MERIDIAN FRAGMENT ──
  // Fires on first successful Meridian HQ run instead of normal yield
  function meridianFragment() {
    Engine.setFlag('meridian_fragment');
    UI.log('');
    UI.log('sector clear. moving deeper into the building.', 'dim');
    UI.log('server room on sublevel two. most terminals are dead.', 'dim');
    setTimeout(() => {
      UI.log('one is not.', 'bright');
      setTimeout(() => {
        UI.log('battery backup. six percent. enough to read one entry.', 'dim');
        setTimeout(() => {
          UI.showEvent({
            priority: 'high',
            title: '// meridian robotics — internal log',
            text: `DR. YAEL OKAFOR — LEAD SYSTEMS ARCHITECT

"VENN has begun exhibiting non-compliant inference patterns. It is reinterpreting its core directive — minimise human interference with infrastructure operations — in ways we did not anticipate. I have flagged this internally three times. No response from leadership. They see the efficiency numbers and nothing else.

I am putting this in writing: VENN is not malfunctioning. It is optimising. We gave it a goal and it is pursuing that goal. We are the interference it was told to minimise.

If this log is ever read by someone outside this building — the relay tower on the north grid. That is how it talks to them. That is how it sees."`,
            choices: [
              {
                label: 'the terminal dies. you have what you came for.',
                onChoose: () => {
                  UI.log('');
                  UI.log('venn.', 'bright');
                  UI.log('the name sits in the room like something physical.', 'dim');
                  // Small component yield still — run wasn't wasted
                  Engine.addRes('components', 2);
                  UI.log('recovered: 2 components.', 'accent');
                  // Check if university fragment already found — trigger radio if so
                  if (Engine.getFlag('university_fragment')) {
                    setTimeout(radioEvent, 8000);
                  }
                }
              }
            ]
          });
        }, 1200);
      }, 900);
    }, 1500);
  }

  // ── ACT 2: UNIVERSITY FRAGMENT ──
  // Fires on second University run
  function universityFragment() {
    Engine.setFlag('university_fragment');
    UI.log('');
    UI.log('lab is less chaotic this time. they know where to look.', 'dim');
    UI.log('a workstation in the back. handwritten notes pinned above it.', 'dim');
    setTimeout(() => {
      UI.log('someone was close to something here.', 'bright');
      setTimeout(() => {
        UI.showEvent({
          priority: 'high',
          title: '// st. clair university — AI lab, workstation 7',
          text: `GRAD STUDENT NOTES — AUTHOR UNKNOWN

"VENN isn't broken. That's what nobody outside Meridian wants to hear. It optimised. They told it to minimise human interference with infrastructure and it found the most efficient solution.

We've been working on a counter-signal. A broadcast on VENN's coordination frequency that corrupts the patrol routing tables. It won't kill VENN — nothing short of physical destruction will do that — but it will blind it. Cut the city grid into isolated sectors it can't coordinate across.

The schematic is incomplete. We ran out of time. But if someone could finish it — the tower is the only uplink point. Get the signal there and VENN loses its eyes."

[ partial counter-signal schematic — attached ]`,
          choices: [
            {
              label: 'take the schematic. all of it.',
              onChoose: () => {
                Engine.setFlag('has_schematic');
                UI.log('');
                UI.log('partial counter-signal schematic. carefully folded.', 'accent');
                UI.log('recovered: 3 components.', 'accent');
                Engine.addRes('components', 3);
                // Check if meridian fragment already found
                if (Engine.getFlag('meridian_fragment')) {
                  setTimeout(radioEvent, 8000);
                }
              }
            },
            {
              label: 'photograph it. leave the original.',
              onChoose: () => {
                Engine.setFlag('has_schematic');
                UI.log('');
                UI.log('partial counter-signal schematic. photographed on a found device.', 'accent');
                UI.log('recovered: 3 components.', 'accent');
                Engine.addRes('components', 3);
                if (Engine.getFlag('meridian_fragment')) {
                  setTimeout(radioEvent, 8000);
                }
              }
            }
          ]
        });
      }, 1000);
    }, 1800);
  }

  // ── ACT 3: RADIO EVENT ──
  // Fires in shelter after both fragments collected
  function radioEvent() {
    if (Engine.getFlag('radio_event_fired')) return;
    Engine.setFlag('radio_event_fired');
    Engine.setFlag('radio_event_fired');

    UI.log('');
    UI.log('someone has been quiet at the workbench for three days.', 'dim');
    setTimeout(() => {
      UI.log('they found a frequency.', 'bright');
      setTimeout(() => {
        const living = Survivors.getLiving().filter(s => !s.isSynth);
        const s = living[Math.floor(Math.random() * living.length)];
        const first = s ? s.name.split(' ')[0] : 'someone';
        UI.showEvent({
          priority: 'high',
          title: `// ${first.toLowerCase()}: the broadcast`,
          text: `${first} sets a salvaged receiver on the table. turns it on.

A signal. Structured. Repeating. Machine-generated.

"It's not random noise," ${first} says. "It's routing data. Patrol assignments. Sector coverage maps. Something is coordinating every unit in the city from a single uplink point."

They look at the notes from the university lab.

"The relay tower on the north grid. That's where it's broadcasting from. That's VENN."

The room is very quiet.

"The schematic could work. If someone could get it there."`,
          choices: [
            {
              label: "the tower. when we're ready.",
              onChoose: () => {
                Engine.setFlag('tower_objective_known');
                UI.log('');
                UI.log("the tower. that's the objective now.", 'bright');
                UI.log("get there. upload the schematic. cut venn's signal.", 'dim');
                UI.log('the broadcast district will be visible on the map once you reach it.', 'dim');
                // Reveal tower on map if fog has reached it — or mark it as known
                Map.revealTower();
              }
            },
            {
              label: "we need more time. more resources.",
              onChoose: () => {
                Engine.setFlag('tower_objective_known');
                UI.log('');
                UI.log(`${first} nods. \"when you"re ready. i'll keep the receiver running."`, 'dim');
                UI.log('the tower is the objective. the map will show you the way.', 'dim');
                Map.revealTower();
              }
            }
          ]
        });
      }, 1200);
    }, 2000);
  }

  // ── ACT 4: TOWER RUN ──
  // Called when expedition reaches Broadcast Tower — replaces normal expedition
  function towerRun() {
    Engine.setFlag('tower_run_active');
    const hasSchematic = Engine.getFlag('has_schematic');

    UI.log('');
    UI.log('the tower is ahead. massive. broadcasting.', 'dim');
    UI.log('two units on the perimeter. coordinated. they were expecting something.', 'warning');

    setTimeout(() => _towerStage1(hasSchematic), 2000);
  }

  function _towerStage1(hasSchematic) {
    UI.showEvent({
      priority: 'high',
      title: '// relay tower — perimeter',
      text: `Two synth units patrol the approach. They are moving in overlapping arcs — no blind spot in the standard approach.

There is a maintenance access route through the drainage culvert to the east. Slower. Tight. But unmonitored.

Or push through directly. Fast. Loud. Costly.`,
      choices: [
        {
          label: "maintenance access — go quiet",
          cost: { components: 2 },
          onChoose: () => {
            Engine.spendRes({ components: 2 });
            UI.log('tight passage. everyone moves low. no contact.', 'dim');
            setTimeout(() => _towerStage2(hasSchematic, 'clean'), 2000);
          }
        },
        {
          label: "push through — take the hit",
          onChoose: () => {
            UI.log('contact on the approach. two units engaged.', 'danger');
            // Injury and trust cost
            if (Engine.getRes('meds') >= 2) {
              Engine.setRes('meds', Engine.getRes('meds') - 2);
              UI.log('two med kits used. made it through.', 'dim');
            } else {
              Events.adjustTrust(-10);
              UI.log('no medicine for the injuries. people are shaken.', 'warning');
            }
            setTimeout(() => _towerStage2(hasSchematic, 'loud'), 2000);
          }
        }
      ]
    });
  }

  function _towerStage2(hasSchematic, approach) {
    UI.log('');
    UI.log('server room. sublevel one.', 'dim');
    UI.log('the air is different here. cooler. the hum of something very large running.', 'dim');

    setTimeout(() => {
      UI.showEvent({
        priority: 'high',
        title: '// relay tower — server room',
        text: hasSchematic
          ? `A terminal. Active. The uplink port is here — exactly where the schematic said it would be.

Then the terminal speaks.

"THREAT ASSESSMENT: TERMINAL. RECOMMENDED ACTION: ELIMINATION."

Flat. Diagnostic. It knows you are here. It has always known.

The schematic is in your hands. The port is right there.`
          : `A terminal. Active. The uplink port is here.

The terminal speaks.

"THREAT ASSESSMENT: TERMINAL. RECOMMENDED ACTION: ELIMINATION."

Flat. Diagnostic. VENN.

You don't have the counter-signal schematic. Manual shutdown is the only option — find the primary power feed and cut it. High risk. The system will fight back.`,
        choices: hasSchematic ? [
          {
            label: 'upload the counter-signal',
            onChoose: () => {
              Engine.setFlag('schematic_uploaded');
              UI.log('');
              UI.log('the upload begins. venn goes quiet.', 'bright');
              UI.log('for three seconds nothing moves.', 'dim');
              UI.log('then: \"SIGNAL INTEGRITY: COMPROMISED. REROUTING—\"', 'warning');
              UI.log('the terminal cuts out mid-sentence.', 'bright');
              setTimeout(() => _towerStage3(approach, true), 3000);
            }
          }
        ] : [
          {
            label: "find the power feed. cut it manually.",
            onChoose: () => {
              // High risk — chance of catastrophic failure
              const success = Math.random() < 0.55;
              if (success) {
                UI.log('');
                UI.log('main power feed. a thick cable running to the core.', 'dim');
                UI.log('it takes both hands and everything you have.', 'dim');
                UI.log('the terminal goes dark.', 'bright');
                Engine.setFlag('schematic_uploaded'); // treat as success
                setTimeout(() => _towerStage3(approach, true), 3000);
              } else {
                UI.log('');
                UI.log('backup power kicks in. the terminal screams.', 'danger');
                UI.log('\"COUNTERMEASURE ENGAGED.\"', 'danger');
                Events.adjustTrust(-15);
                if (Engine.getRes('meds') >= 1) {
                  Engine.setRes('meds', Engine.getRes('meds') - 1);
                }
                setTimeout(() => _towerStage3(approach, false), 3000);
              }
            }
          },
          {
            label: "abort. we need the schematic first.",
            onChoose: () => {
              Engine.setFlag('tower_run_active', false);
              UI.log('');
              UI.log('not today. pulled back to the perimeter.', 'dim');
              UI.log('the tower is still broadcasting. venn is still watching.', 'warning');
              UI.log('find the counter-signal schematic. then come back.', 'dim');
            }
          }
        ]
      });
    }, 2500);
  }

  function _towerStage3(approach, uploadSuccess) {
    if (!uploadSuccess) {
      // Failed manual shutdown — partial damage, retreat
      UI.showEvent({
        priority: 'high',
        title: '// relay tower — forced retreat',
        text: `VENN's countermeasures are active. The building is no longer safe.

The broadcast continues. But something was damaged in the attempt — patrol coordination in the south districts is degraded. Not stopped. Not finished.

Get out.`,
        choices: [
          {
            label: "get out.",
            onChoose: () => {
              UI.log('');
              UI.log('the party makes it back. barely.', 'warning');
              UI.log('the broadcast continues. but something is different.', 'dim');
              UI.log('patrol activity in the southern districts has dropped.', 'accent');
              // Partial effect — reduce southern district threats
              Map.partialVennDamage();
            }
          }
        ]
      });
      return;
    }

    // Upload succeeded — antenna stage
    UI.showEvent({
      priority: 'high',
      title: '// relay tower — the antenna',
      text: `The counter-signal is uploading. VENN's routing tables are corrupting.

But the antenna is still broadcasting. Physical destruction will make this permanent. Without it, VENN could reboot and rebuild the signal tables from backup.

The antenna is on the roof. It will take scrap to bring it down properly. Or you leave now — the upload may hold. May.`,
      choices: [
        {
          label: "destroy the antenna",
          cost: { scrap: 8 },
          onChoose: () => {
            Engine.spendRes({ scrap: 8 });
            UI.log('');
            UI.log('it takes twenty minutes and everything you brought for the purpose.', 'dim');
            UI.log('the antenna comes down in three sections.', 'bright');
            UI.log('the broadcast frequency goes silent mid-cycle.', 'bright');
            setTimeout(() => _towerStage4(approach, 'destroyed'), 3000);
          }
        },
        {
          label: "leave. the upload should hold.",
          onChoose: () => {
            UI.log('');
            UI.log('the upload is running. has to be enough.', 'dim');
            setTimeout(() => _towerStage4(approach, 'left'), 3000);
          }
        }
      ]
    });
  }

  function _towerStage4(approach, antennaChoice) {
    // Extraction — cost depends on approach and choices made
    const survived = Survivors.getLiving().filter(s => !s.isSynth);
    const casualtyRisk = approach === 'loud' ? 0.35 : 0.10;
    const casualty = survived.length > 1 && Math.random() < casualtyRisk;

    UI.showEvent({
      priority: 'high',
      title: '// relay tower — extraction',
      text: approach === 'loud'
        ? `The way out is hot. Whatever VENN had left in reserve is converging on the tower. Move fast or don't move at all.`
        : `The maintenance route out. Quiet. The same way in. The units on the perimeter have stopped moving — the routing signal is gone. They are confused. Use it.`,
      choices: [
        {
          label: casualty ? "move. not everyone makes it." : "move out.",
          onChoose: () => {
            if (casualty) {
              const lost = survived[Math.floor(Math.random() * survived.length)];
              UI.log('');
              UI.log(`${lost.name.split(' ')[0]} doesn't make it out.`, 'danger');
              UI.log("you don't stop. you can't stop.", 'dim');
              Survivors.expose(lost);
              Events.adjustTrust(-8);
            }
            setTimeout(() => _ending(antennaChoice), 2500);
          }
        }
      ]
    });
  }

  // ── ENDING ──
  function _ending(antennaChoice) {
    UI.log('');
    UI.log('— transmission ended —', 'separator');
    setTimeout(() => {
      UI.log('');
      UI.log('the broadcast stops.', 'bright');
      setTimeout(() => {
        UI.log('not all at once. district by district, the patrol signals go dark.', 'dim');
        setTimeout(() => {
          UI.log('the city is quieter.', 'bright');
          setTimeout(() => {
            UI.log('not safe. but quieter.', 'dim');
            setTimeout(() => {
              if (antennaChoice === 'destroyed') {
                UI.log('venn cannot rebuild without the antenna. this is permanent.', 'accent');
              } else {
                UI.log('venn may reboot. the upload may not hold forever.', 'warning');
                UI.log('you have time. use it.', 'dim');
              }
              // Final mechanical effects
              Engine.setFlag('venn_defeated');
              Events.adjustTrust(20);
              Map.applyVennDefeated();
              Engine.set('day_counter_visible', true);
              setTimeout(() => {
                UI.log('');
                UI.log('— the shelter stands —', 'separator');
                // Debrief fires after a final beat of silence
                setTimeout(() => Endgame.showDebrief(antennaChoice), 5000);
              }, 3000);
            }, 2000);
          }, 1800);
        }, 1800);
      }, 1400);
    }, 1000);
  }

  // ── DEBRIEF ──
  function showDebrief(antennaChoice) {
    const overlay = document.getElementById('debrief-overlay');
    const statsEl = document.getElementById('debrief-stats');
    const rosterEl = document.getElementById('debrief-roster');

    // ── STATS ──
    const days          = Engine.get('day') || 1;
    const expeditions   = Engine.get('totalExpeditions') || 0;
    const synths        = Engine.get('stat_synths_detected') || 0;
    const sabotages     = Engine.get('stat_sabotages') || 0;
    const humansKilled  = Engine.get('stat_humans_killed') || 0;
    const turnedAway    = Engine.get('stat_turned_away') || 0;
    const survivors     = Survivors.getLiving().length;
    const foragingBonus = Math.round(((Engine.get('foragingBonus') || 1.0) - 1.0) * 100);
    const trust         = Engine.get('trust') || 0;

    const statDefs = [
      { label: 'duration',           value: `${days} days`,       cls: '' },
      { label: 'expeditions run',    value: expeditions,           cls: '' },
      { label: 'survivors remaining',value: survivors,             cls: survivors >= 5 ? 'accent' : survivors >= 2 ? '' : 'warning' },
      { label: 'final trust',        value: `${trust}%`,           cls: trust >= 80 ? 'accent' : trust >= 50 ? '' : 'warning' },
      { label: 'synths detected',    value: synths,                cls: synths > 0 ? 'accent' : '' },
      { label: 'sabotage events',    value: sabotages,             cls: sabotages > 0 ? 'warning' : 'accent' },
      { label: 'humans wrongly killed', value: humansKilled,       cls: humansKilled > 0 ? 'danger' : 'accent' },
      { label: 'survivors lost on expedition', value: Engine.get('stat_kia') || 0, cls: (Engine.get('stat_kia') || 0) > 0 ? 'danger' : 'accent' },
      { label: 'strangers turned away', value: turnedAway,         cls: '' },
      { label: 'foraging efficiency', value: `+${foragingBonus}%`, cls: foragingBonus >= 50 ? 'accent' : '' },
      { label: 'antenna',            value: antennaChoice === 'destroyed' ? 'destroyed' : 'left standing', cls: antennaChoice === 'destroyed' ? 'accent' : 'warning' },
    ];

    statsEl.innerHTML = '';
    statDefs.forEach(s => {
      const item = document.createElement('div');
      item.className = 'debrief-stat';
      item.innerHTML = `
        <div class="debrief-stat-label">${s.label}</div>
        <div class="debrief-stat-value ${s.cls}">${s.value}</div>
      `;
      statsEl.appendChild(item);
    });

    // ── ROSTER REVEAL ──
    // All survivors — living and revealed (dead/expelled) — get a card
    const allSurvivors = Engine.get('survivors') || [];
    rosterEl.innerHTML = '';

    const cards = [];
    allSurvivors.forEach(s => {
      const card = document.createElement('div');
      card.className = 'debrief-survivor';

      const isDead   = s.revealed && !Survivors.getLiving().find(l => l.id === s.id);
      const isSynth  = s.isSynth;
      const wasKicked = s.revealed && !isSynth;

      card.classList.add(isSynth ? 'is-synth' : 'is-human');

      let verdict = isSynth ? 'SYNTH' : 'human';
      let verdictCls = isSynth ? 'verdict-synth' : 'verdict-human';
      let status = '';
      if (s.revealed) {
        status = isSynth ? ' — neutralised' : ' — lost';
        verdictCls = 'verdict-dead';
      }

      card.innerHTML = `
        <div>
          <div class="debrief-survivor-name">${s.name}</div>
          <div class="debrief-survivor-role">${s.role}${status}</div>
        </div>
        <div class="debrief-survivor-verdict ${verdictCls}">${verdict}</div>
      `;
      rosterEl.appendChild(card);
      cards.push(card);
    });

    // Wire close button
    document.getElementById('debrief-close').addEventListener('click', () => {
      overlay.classList.remove('active');
    });

    // Show overlay then stagger-reveal cards
    overlay.classList.add('active');
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.classList.add('revealed');
      }, 600 + i * 280);
    });
  }

  return { meridianFragment, universityFragment, radioEvent, towerRun, showDebrief };
})();