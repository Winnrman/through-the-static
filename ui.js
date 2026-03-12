const UI = (() => {

  const log = document.getElementById('log');
  const actions = document.getElementById('actions');
  const notifyEl = document.getElementById('notify');

  let _logQueue = [];
  let _logBusy = false;

  function queueLog(text, type = '', delay = 0) {
    _logQueue.push({ text, type, delay });
    if (!_logBusy) drainLog();
  }

  function drainLog() {
    if (_logQueue.length === 0) { _logBusy = false; return; }
    _logBusy = true;
    const item = _logQueue.shift();
    setTimeout(() => {
      _appendLog(item.text, item.type);
      // small gap between lines for dramatic drip
      setTimeout(drainLog, item.delay || 80);
    }, item.delay || 0);
  }

  function _appendLog(text, type) {
    const line = document.createElement('div');
    line.className = 'log-line' + (type ? ' ' + type : '');
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function logSeparator() {
    queueLog('────────────────────────', 'separator', 300);
  }

  function addButton(id, label, onClick, opts = {}) {
    if (document.getElementById('btn-' + id)) return;
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.id = 'btn-' + id;

    const progress = document.createElement('div');
    progress.className = 'btn-progress';
    btn.appendChild(progress);

    const labelEl = document.createElement('span');
    labelEl.className = 'btn-label';
    labelEl.textContent = label;
    btn.appendChild(labelEl);

    if (opts.cost) {
      const costEl = document.createElement('span');
      costEl.className = 'cost';
      costEl.textContent = formatCost(opts.cost);
      btn.appendChild(costEl);
    }

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const result = onClick();
      if (result === false) return;
      if (opts.cooldown) startCooldown(btn, progress, opts.cooldown);
    });

    actions.appendChild(btn);
    return btn;
  }

  function startCooldown(btn, progress, ms) {
    btn.disabled = true;
    btn.classList.add('cooling');
    progress.style.transition = 'none';
    progress.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        progress.style.transition = `width ${ms}ms linear`;
        progress.style.width = '100%';
      });
    });
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove('cooling');
      progress.style.transition = 'none';
      progress.style.width = '0%';
    }, ms);
  }

  function removeButton(id) {
    const el = document.getElementById('btn-' + id);
    if (el) el.remove();
  }

  function removeCraftButton(id) {
    const el = document.getElementById('btn-craft_' + id);
    if (el) el.remove();
  }

  function setButtonLabel(id, label) {
    const el = document.getElementById('btn-' + id);
    if (el) el.querySelector('.btn-label').textContent = label;
  }

  function formatCost(costs) {
    return Object.entries(costs).map(([k,v]) => `${v} ${k}`).join(' · ');
  }

  // Resources panel
  const resourcesSection = document.getElementById('resources-section');
  const resourcesList = document.getElementById('resources-list');

  const RESOURCE_NAMES = {
    scrap:      'scrap metal',
    cells:      'power cells',
    rations:    'rations',
    components: 'components',
    meds:       'medicine',
  };

  const RESOURCE_TIPS = {
    scrap:      'used to build and reinforce structures. essential for any construction.',
    cells:      'fuel for the generator. without them, the lights go out.',
    rations:    'keeps survivors alive. they stop working if they go hungry.',
    components: 'rare parts. needed to screen arrivals and craft advanced gear.',
    meds:       'treats injuries and illness. low supply means people die from small wounds.',
  };

  let _shownResources = new Set();

  function showResource(name) {
    if (_shownResources.has(name)) return;
    _shownResources.add(name);
    resourcesSection.style.display = '';
    const row = document.createElement('div');
    row.className = 'resource-row';
    row.id = 'res-row-' + name;

    const nameEl = document.createElement('span');
    nameEl.className = 'resource-name resource-tip';
    nameEl.textContent = RESOURCE_NAMES[name] || name;
    if (RESOURCE_TIPS[name]) {
      nameEl.setAttribute('data-tip', RESOURCE_TIPS[name]);
    }

    const valEl = document.createElement('span');
    valEl.className = 'resource-val';
    valEl.id = 'res-val-' + name;
    valEl.textContent = '0';

    row.appendChild(nameEl);
    row.appendChild(valEl);
    resourcesList.appendChild(row);
  }

  function updateResources() {
    const res = Engine.getState().resources;
    for (const [name, val] of Object.entries(res)) {
      if (val > 0 || _shownResources.has(name)) showResource(name);
      const el = document.getElementById('res-val-' + name);
      if (el) {
        el.textContent = val;
        el.className = 'resource-val' + (val <= 2 ? ' critical' : val <= 5 ? ' low' : '');
      }
    }
  }

  // Survivors panel
  const survivorsSection = document.getElementById('survivors-section');
  const survivorsList = document.getElementById('survivors-list');

  function addSurvivorToPanel(survivor) {
    survivorsSection.style.display = '';
    const entry = document.createElement('div');
    entry.className = 'survivor-entry';
    entry.id = 'survivor-' + survivor.id;

    const nameEl = document.createElement('div');
    nameEl.className = 'survivor-name';
    nameEl.textContent = survivor.name;

    const roleEl = document.createElement('div');
    roleEl.className = 'survivor-role';
    const yields = Names.roleYields[survivor.role];
    let yieldStr;
    if (yields === null) {
      // Special roles with non-resource effects
      if (survivor.role === 'lookout') yieldStr = '20% sabotage intercept';
      else if (survivor.role === 'scout')  yieldStr = 'faster arrivals';
      else yieldStr = 'special';
    } else if (yields && Object.keys(yields).length > 0) {
      yieldStr = Object.entries(yields).map(([r,a]) => `+${a} ${r}/30s`).join(', ');
    } else {
      yieldStr = 'no passive yield';
    }
    roleEl.textContent = `${survivor.role} — ${yieldStr}`;

    const pips = document.createElement('div');
    pips.className = 'suspicion-pips';
    pips.id = 'pips-' + survivor.id;
    for (let i = 0; i < 5; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip';
      pips.appendChild(pip);
    }

    entry.appendChild(nameEl);
    entry.appendChild(roleEl);
    entry.appendChild(pips);
    survivorsList.appendChild(entry);
  }

  function updateSurvivorSuspicion(survivorId, level) {
    const pips = document.getElementById('pips-' + survivorId);
    if (!pips) return;
    const pipEls = pips.querySelectorAll('.pip');
    pipEls.forEach((p, i) => {
      p.className = 'pip' + (i < level ? (level >= 4 ? ' high' : ' filled') : '');
    });
    const all = Engine.get('survivors');
    const s = all.find(s => String(s.id) === String(survivorId) || s.id === survivorId);
    if (!s || s.revealed || s.cleared) return;

    // At 2+ pips, surface interrogate button
    if (level >= 2) {
      UI.showInterrogateButton(s);
    }

    // At 3+ pips, surface confront + scan buttons
    if (level >= 3) {
      UI.showConfrontButton(s, Confrontation.open);
    }
  }

  function updateSurvivorRole(survivorId, role) {
    const entry = document.getElementById('survivor-' + survivorId);
    if (entry) entry.querySelector('.survivor-role').textContent = role;
  }

  // Trust
  function updateTrust(val) {
    const bar = document.getElementById('trust-bar-inner');
    const valEl = document.getElementById('trust-value');
    const pct = Math.max(0, Math.min(100, val));
    bar.style.width = pct + '%';
    const color = pct > 60 ? 'var(--trust-hi)' : pct > 30 ? 'var(--warning)' : 'var(--trust-lo)';
    bar.style.background = color;
    valEl.textContent = pct;
  }

  // Generator
  function setGenerator(on) {
    const light = document.getElementById('gen-light');
    const label = document.getElementById('gen-label');
    if (on) {
      light.classList.add('on');
      label.textContent = 'generator: online';
    } else {
      light.classList.remove('on');
      label.textContent = 'generator: offline';
    }
  }

  // Notify toast
  let _notifyTimer = null;
  function notify(text) {
    notifyEl.textContent = text;
    notifyEl.classList.add('show');
    clearTimeout(_notifyTimer);
    _notifyTimer = setTimeout(() => notifyEl.classList.remove('show'), 2800);
  }

  // ── EVENT MODAL QUEUE ──
  // Events are queued; high-priority events jump the line.
  // priority: 'high' (stranger knocks, synth sabotage) | 'normal' (job events, etc.)
  const _eventQueue = [];
  let _eventOpen = false;

  function showEvent(evt) {
    const priority = evt.priority || 'normal';
    if (priority === 'high') {
      _eventQueue.unshift(evt); // jump to front
    } else {
      _eventQueue.push(evt);
    }
    if (!_eventOpen) _openNextEvent();
  }

  function _openNextEvent() {
    if (_eventQueue.length === 0) { _eventOpen = false; return; }
    _eventOpen = true;
    const evt = _eventQueue.shift();
    _renderEvent(evt);
  }

  function _renderEvent(evt) {
    document.getElementById('event-title').textContent = evt.title;
    document.getElementById('event-text').textContent = evt.text;
    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';
    evt.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'event-choice';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = choice.label;
      btn.appendChild(labelSpan);

      if (choice.cost) {
        const costSpan = document.createElement('span');
        costSpan.className = 'choice-cost';
        costSpan.textContent = Object.entries(choice.cost).map(([k,v]) => `${v} ${k}`).join(' · ');
        btn.appendChild(costSpan);
        if (!Engine.hasRes(choice.cost)) {
          btn.disabled = true;
          btn.title = 'not enough resources';
        }
      }

      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (choice.cost && !Engine.hasRes(choice.cost)) {
          UI.notify('not enough resources');
          return;
        }
        _closeCurrentEvent();
        if (choice.onChoose) choice.onChoose();
      });
      choicesEl.appendChild(btn);
    });

    // Queue indicator
    const overlay = document.getElementById('event-overlay');
    let queueBadge = overlay.querySelector('.queue-badge');
    if (_eventQueue.length > 0) {
      if (!queueBadge) {
        queueBadge = document.createElement('div');
        queueBadge.className = 'queue-badge';
        document.getElementById('event-modal').appendChild(queueBadge);
      }
      queueBadge.textContent = `+${_eventQueue.length} pending`;
    } else {
      if (queueBadge) queueBadge.remove();
    }

    overlay.classList.add('active');
  }

  function _closeCurrentEvent() {
    document.getElementById('event-overlay').classList.remove('active');
    _eventOpen = false;
    if (_eventQueue.length > 0) {
      setTimeout(_openNextEvent, 1200); // brief breath between events
    }
  }

  function closeEvent() { _closeCurrentEvent(); }

  // Stat display
  function setStat(id, val, warn = false, crit = false) {
    const el = document.getElementById('stat-' + id);
    if (!el) return;
    el.textContent = val;
    el.className = 'status-value' + (crit ? ' crit' : warn ? ' warn' : '');
  }

  function showStatRow() {
    document.getElementById('status-row').classList.remove('hidden');
  }

  function showTrust() {
    document.getElementById('trust-container').classList.remove('hidden');
  }

  function showDayCounter() {
    document.getElementById('day-counter').style.display = '';
  }

  function showPopStat() {
    document.getElementById('stat-pop-item').classList.remove('hidden');
  }

  function removeSurvivor(survivorId) {
    const entry = document.getElementById('survivor-' + survivorId);
    if (!entry) return;
    entry.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    entry.style.opacity = '0';
    entry.style.transform = 'translateX(-8px)';
    setTimeout(() => entry.remove(), 800);
  }

  // Show interrogate button at 2+ pips — no resource cost, trust-scaled outcome
  function showInterrogateButton(survivor) {
    const entry = document.getElementById('survivor-' + survivor.id);
    if (!entry) return;
    if (entry.querySelector('.interrogate-btn')) return;
    if (entry.querySelector('.interrogated-badge')) return; // already used
    if (survivor.interrogated) return;

    const first = survivor.name.split(' ')[0];
    const btn = document.createElement('button');
    btn.className = 'interrogate-btn';
    btn.textContent = `interrogate ${first}`;
    btn.title = 'no resources needed · outcome scales with shelter trust';
    btn.addEventListener('click', () => {
      btn.disabled = true;
      _doInterrogation(survivor, entry, btn);
    });
    entry.appendChild(btn);
  }

  function _doInterrogation(survivor, entry, btn) {
    const trust = Engine.get('trust') || 0;
    const first = survivor.name.split(' ')[0];

    // Trust cost — always, regardless of outcome
    const trustCost = trust >= 70 ? 8 : trust >= 40 ? 12 : 16;
    Events.adjustTrust(-trustCost);

    // Break chance scales with trust
    const breakChance = trust >= 70 ? 0.60 : trust >= 40 ? 0.35 : 0.15;
    const breaks = survivor.isSynth && Math.random() < breakChance;
    const falseBreak = !survivor.isSynth && Math.random() < 0.08; // rare — human cracks under pressure

    btn.remove();

    // Mark as interrogated — one per survivor
    const all = Engine.get('survivors');
    const idx = all.findIndex(s => s.id === survivor.id);
    if (idx !== -1) { all[idx].interrogated = true; Engine.set('survivors', all); }

    setTimeout(() => {
      if (breaks) {
        // ── SYNTH CONFESSION ──
        UI.log('');
        UI.log(`${first} goes very still.`, 'dim');
        setTimeout(() => {
          UI.log(`then: "you already know."`, 'warning');
          setTimeout(() => {
            UI.showEvent({
              priority: 'high',
              title: `// ${first.toLowerCase()}: unit identified`,
              text: `The shelter goes quiet. ${first} doesn't deny it. Doesn't run.

"I've been operational since day two. I had orders to observe and report. VENN needed data on how your group operated."

A pause.

"I haven't transmitted since the tower went down. I don't know what I'm supposed to do now."

The room is waiting for you.`,
              choices: [
                {
                  label: 'neutralise the unit.',
                  onChoose: () => {
                    UI.log('');
                    UI.log(`${first} doesn't resist.`, 'dim');
                    UI.log(`"acknowledged."`, 'warning');
                    setTimeout(() => {
                      Survivors.expose(survivor);
                      Events.adjustTrust(+10);
                      UI.log(`the unit is offline. the shelter breathes.`, 'accent');
                    }, 1200);
                  }
                },
                {
                  label: 'what do you know about the other units.',
                  onChoose: () => {
                    UI.log('');
                    UI.log(`${first} considers this.`, 'dim');
                    // If there are other synths, give a partial clue
                    const otherSynths = Survivors.getLiving().filter(s =>
                      s.isSynth && !s.revealed && s.id !== survivor.id
                    );
                    if (otherSynths.length > 0) {
                      // Don't name them — give a behavioural clue
                      const clues = [
                        `"there's at least one other. quieter than me. more patient. watches the generator."`,
                        `"one more. arrived after me. i don't know their role assignment but they've been watching the supply runs."`,
                        `"one other unit. they've been here longer than you think. always near the hatch when strangers arrive."`,
                      ];
                      const clue = clues[Math.floor(Math.random() * clues.length)];
                      UI.log(clue, 'warning');
                      UI.log(`${first} says nothing else.`, 'dim');
                      // Bump a random other synth's suspicion by 2
                      const target = otherSynths[Math.floor(Math.random() * otherSynths.length)];
                      target.suspicion = Math.min(5, target.suspicion + 2);
                      const allS = Engine.get('survivors');
                      const tIdx = allS.findIndex(s => s.id === target.id);
                      if (tIdx !== -1) { allS[tIdx] = target; Engine.set('survivors', allS); }
                      UI.updateSurvivorSuspicion(target.id, target.suspicion);
                    } else {
                      UI.log(`"no others. just me."`, 'dim');
                      UI.log(`you're not sure you believe that.`, 'dim');
                    }
                    setTimeout(() => {
                      Survivors.expose(survivor);
                      UI.log(`${first} is removed from the shelter.`, 'dim');
                    }, 4000);
                  }
                },
                {
                  label: 'let them stay. for now.',
                  onChoose: () => {
                    UI.log('');
                    UI.log(`${first} stays. the shelter knows what they are now.`, 'warning');
                    UI.log(`trust is complicated.`, 'dim');
                    // Survivor stays but is flagged — cleared badge variant
                    survivor.confessed = true;
                    const confBadge = document.createElement('div');
                    confBadge.className = 'interrogated-badge';
                    confBadge.textContent = 'unit — confessed';
                    confBadge.style.color = 'var(--warning)';
                    entry.appendChild(confBadge);
                  }
                }
              ]
            });
          }, 1000);
        }, 800);

      } else if (falseBreak) {
        // ── HUMAN CRACKS UNDER PRESSURE — rare, uncomfortable ──
        UI.log('');
        UI.log(`${first} breaks. not because they're a synth.`, 'danger');
        UI.log(`because the shelter has been watching them for days and they can't take it.`, 'dim');
        setTimeout(() => {
          UI.showEvent({
            priority: 'high',
            title: `// ${first.toLowerCase()}: not a synth`,
            text: `${first} is crying. Or something close to it.

"I know what you think. I know what everyone thinks. I haven't done anything. I swear to you I haven't done anything."

They're telling the truth. You can tell.

The shelter is watching you.`,
            choices: [
              {
                label: 'stand down. i believe you.',
                onChoose: () => {
                  survivor.cleared = true;
                  Events.adjustTrust(-5);
                  UI.markCleared(survivor.id);
                  UI.log(`${first} is cleared. the damage to the room takes longer to heal.`, 'dim');
                }
              }
            ]
          });
        }, 1000);

      } else {
        // ── NO BREAK — human stays composed or synth holds ──
        UI.log('');
        const responses = survivor.isSynth ? [
          `${first} meets your eyes. says nothing. doesn't flinch.`,
          `${first} answers every question. clearly. calmly. too calmly.`,
          `${first} looks almost sorry for you.`,
        ] : [
          `${first} is angry. genuinely angry.`,
          `${first} answers everything. the shelter watches. nothing breaks.`,
          `${first} doesn't understand why it's them. neither do you, really.`,
        ];
        UI.log(responses[Math.floor(Math.random() * responses.length)], 'dim');
        setTimeout(() => {
          UI.log(`nothing confirmed. trust spent.`, 'muted');
          // Add interrogated badge
          const badge = document.createElement('div');
          badge.className = 'interrogated-badge';
          badge.textContent = 'interrogated — inconclusive';
          entry.appendChild(badge);
        }, 1200);
      }
    }, 1500);
  }

  // Show confront + scan buttons on a survivor card once suspicion hits threshold
  function showConfrontButton(survivor, onConfront) {
    const entry = document.getElementById('survivor-' + survivor.id);
    if (!entry) return;
    if (entry.querySelector('.confront-btn')) return; // already shown

    const first = survivor.name.split(' ')[0];

    // Confront button
    const confrontBtn = document.createElement('button');
    confrontBtn.className = 'confront-btn';
    confrontBtn.textContent = `confront ${first}`;
    confrontBtn.addEventListener('click', () => onConfront(survivor));
    entry.appendChild(confrontBtn);

    // Scan button — costs 2 components
    const scanBtn = document.createElement('button');
    scanBtn.className = 'scan-btn';
    scanBtn.textContent = `run diagnostic scan  [2 components]`;
    scanBtn.title = 'costs 2 components · 75% accurate (90% if kit upgraded)';
    if (!Engine.hasRes({ components: 2 })) {
      scanBtn.disabled = true;
      scanBtn.title = 'need 2 components';
    }
    scanBtn.addEventListener('click', () => {
      if (!Engine.hasRes({ components: 2 })) {
        UI.notify('need 2 components');
        return;
      }
      Engine.spendRes({ components: 2 });
      _doCardScan(survivor, entry, confrontBtn, scanBtn);
    });
    entry.appendChild(scanBtn);

    // Keep scan button affordability live
    Engine.on('resourceChange', ({ name }) => {
      if (name === 'components') {
        scanBtn.disabled = !Engine.hasRes({ components: 2 });
      }
    });
  }

  function _doCardScan(survivor, entry, confrontBtn, scanBtn) {
    scanBtn.disabled = true;
    scanBtn.textContent = 'scanning...';

    setTimeout(() => {
      const result = Survivors.screen(survivor);

      if (result === 'caught') {
        // Synth detected — expose
        UI.log('');
        UI.log(`the scanner flags ${survivor.name.split(' ')[0]}. signal patterns don't match human baseline.`, 'danger');
        UI.log('you were right to be suspicious.', 'dim');
        confrontBtn.remove();
        scanBtn.remove();
        setTimeout(() => Survivors.expose(survivor), 1200);

      } else if (result === 'clear') {
        // Genuine human — clear them
        UI.log('');
        UI.log(`diagnostic clear. ${survivor.name.split(' ')[0]}'s patterns read as human.`, 'accent');
        UI.log('you feel the tension leave the room.', 'dim');
        survivor.cleared = true;
        Events.adjustTrust(2);
        UI.markCleared(survivor.id); // removes buttons, adds badge, dims pips

      } else {
        // False positive — human but scanner says synth
        UI.log('');
        UI.log(`the scanner flags ${survivor.name.split(' ')[0]}. but they're not — a false read.`, 'warning');
        UI.log('they noticed. the trust in the room drops.', 'dim');
        Events.adjustTrust(-5);
        scanBtn.remove();
        // Confront button stays — player still has that option
        // But survivor's suspicion pips dim slightly (they're on edge, not confirmed)
        if (survivor.suspicion > 1) survivor.suspicion -= 1;
        UI.updateSurvivorSuspicion(survivor.id, survivor.suspicion);
      }
    }, 1800); // scan "takes time"
  }

  function hideConfrontButton(survivorId) {
    const entry = document.getElementById('survivor-' + survivorId);
    if (!entry) return;
    const btn = entry.querySelector('.confront-btn');
    if (btn) btn.remove();
  }

  function markCleared(survivorId) {
    const entry = document.getElementById('survivor-' + survivorId);
    if (!entry) return;
    // Remove confront button if present
    const btn = entry.querySelector('.confront-btn');
    if (btn) btn.remove();
    // Add cleared badge
    if (!entry.querySelector('.cleared-badge')) {
      const badge = document.createElement('div');
      badge.className = 'cleared-badge';
      badge.textContent = 'screened clear';
      entry.appendChild(badge);
    }
    // Reset pip colour to dim
    const pips = entry.querySelectorAll('.pip');
    pips.forEach(p => { p.className = 'pip'; });
  }

  return {
    log: queueLog, logSeparator, addButton, removeButton,
    setButtonLabel, updateResources, showResource, addSurvivorToPanel,
    removeSurvivor, showConfrontButton, hideConfrontButton, markCleared,
    showInterrogateButton,
    updateSurvivorSuspicion, updateSurvivorRole, updateTrust,
    setGenerator, notify, showEvent, setStat, showStatRow, showTrust,
    showDayCounter, showPopStat
  };
})();