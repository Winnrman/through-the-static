window.game = (() => {

  // ── helpers ──
  function _findSurvivor(name) {
    const all = Engine.get('survivors') || [];
    const q = name.trim().toLowerCase();
    return all.find(s =>
      s.name.toLowerCase() === q ||
      s.name.toLowerCase().startsWith(q) ||
      s.name.split(' ')[0].toLowerCase() === q
    );
  }

  function _log(...args) {
    console.log('%c[STATIC DEV]', 'color:#c8ff00;font-weight:bold', ...args);
  }

  function _warn(...args) {
    console.warn('%c[STATIC DEV]', 'color:#c8ff00;font-weight:bold', ...args);
  }

  // ── give ──
  const give = {
    cells:      (n = 10) => { Engine.addRes('cells',      n); _log(`+${n} cells`);      return Engine.getRes('cells'); },
    scrap:      (n = 10) => { Engine.addRes('scrap',      n); _log(`+${n} scrap`);      return Engine.getRes('scrap'); },
    rations:    (n = 10) => { Engine.addRes('rations',    n); _log(`+${n} rations`);    return Engine.getRes('rations'); },
    components: (n = 10) => { Engine.addRes('components', n); _log(`+${n} components`); return Engine.getRes('components'); },
    meds:       (n = 10) => { Engine.addRes('meds',       n); _log(`+${n} meds`);       return Engine.getRes('meds'); },
    trust:      (n = 20) => {
      const t = Math.min(100, Engine.get('trust') + n);
      Engine.set('trust', t);
      UI.updateTrust(t);
      _log(`trust → ${t}`);
      return t;
    },
    all: (n = 50) => {
      ['cells','scrap','rations','components','meds'].forEach(r => Engine.addRes(r, n));
      _log(`+${n} of everything`);
      return Engine.get('resources');
    },
  };

  // ── survivors ──
  const survivors = {
    list: () => {
      const all = Engine.get('survivors') || [];
      const living = all.filter(s => !s.revealed);
      console.table(living.map(s => ({
        name:            s.name,
        role:            s.role,
        isSynth:         s.isSynth,
        synthProbability: s.synthProbability != null ? (s.synthProbability * 100).toFixed(1) + '%' : 'unknown',
        suspicion:       s.suspicion,
        screened:        s.screened,
        cleared:         s.cleared || false,
        daysPresent:     s.daysPresent || '—',
      })));
      return living;
    },

    isSynth: (name) => {
      const s = _findSurvivor(name);
      if (!s) { _warn(`survivor not found: "${name}"`); return null; }
      const verdict = s.isSynth ? 'SYNTH' : 'HUMAN';
      const prob = s.synthProbability != null ? (s.synthProbability * 100).toFixed(1) : '?';
      _log(`${s.name} (${s.role}) → ${verdict} [synthProbability: ${prob}%]`);
      console.log({
        name:            s.name,
        role:            s.role,
        isSynth:         s.isSynth,
        synthProbability: prob + '%',
        suspicion:       s.suspicion,
        screened:        s.screened,
        cleared:         s.cleared || false,
      });
      return verdict;
    },

    suspicion: (name, level) => {
      const all = Engine.get('survivors') || [];
      const s = _findSurvivor(name);
      if (!s) { _warn(`survivor not found: "${name}"`); return; }
      const clamped = Math.max(0, Math.min(5, level));
      s.suspicion = clamped;
      const idx = all.findIndex(x => x.id === s.id);
      if (idx !== -1) all[idx] = s;
      Engine.set('survivors', all);
      UI.updateSurvivorSuspicion(s.id, clamped);
      if (clamped >= 3 && !s.cleared) UI.showConfrontButton(s, Confrontation.open);
      _log(`${s.name} suspicion → ${clamped}`);
      return clamped;
    },

    expose: (name) => {
      const s = _findSurvivor(name);
      if (!s) { _warn(`survivor not found: "${name}"`); return; }
      _log(`exposing ${s.name} (${s.isSynth ? 'SYNTH' : 'HUMAN'})`);
      Survivors.expose(s);
    },

    add: (role) => {
      // Force-add a survivor with optional role
      const s = Survivors.create(Engine.get('synthRisk') || 0.1);
      if (role) s.role = role;
      Survivors.add(s);
      _log(`added ${s.name} (${s.role}) — ${s.isSynth ? 'SYNTH' : 'HUMAN'}`);
      return s;
    },
  };

  // ── event ──
  const event = {
    stranger: () => {
      _log('firing stranger event');
      Events.strangerEvent();
    },
    sabotage: () => {
      const synths = Survivors.getLiving().filter(s => s.isSynth && !s.revealed);
      if (synths.length === 0) {
        _warn('no undetected synths in shelter — picking random survivor for demo');
        const living = Survivors.getLiving();
        if (living.length === 0) { _warn('no survivors'); return; }
        Shelter.synth_sabotage(living[0]);
        return;
      }
      _log(`firing sabotage from ${synths[0].name}`);
      // Access sabotage via Shelter's exposed tick — trigger directly
      const s = synths[0];
      s.suspicion = Math.min(5, s.suspicion + 1);
      UI.updateSurvivorSuspicion(s.id, s.suspicion);
      UI.log('dev: sabotage event forced.', 'warning');
      UI.log("rations are missing. someone's been in the stores.", 'danger');
      Engine.addRes('rations', -5);
      Engine.set('stat_sabotages', (Engine.get('stat_sabotages') || 0) + 1);
      Events.adjustTrust(-10);
    },
    meridian: () => {
      _log('firing Meridian fragment');
      Engine.setFlag('meridian_fragment', false);
      Endgame.meridianFragment();
    },
    university: () => {
      _log('firing University fragment');
      Engine.setFlag('university_fragment', false);
      Engine.setFlag('university_visited', true);
      Endgame.universityFragment();
    },
    radio: () => {
      _log('firing radio event');
      Engine.setFlag('radio_event_fired', false);
      Engine.setFlag('meridian_fragment', true);
      Engine.setFlag('university_fragment', true);
      Endgame.radioEvent();
    },
    tower: () => {
      _log('launching tower run sequence');
      Engine.setFlag('has_schematic', true);
      Engine.setFlag('tower_objective_known', true);
      Endgame.towerRun();
    },
    debrief: () => {
      _log('showing debrief');
      Endgame.showDebrief('destroyed');
    },
    generatorFail: () => {
      _log('triggering generator failure');
      Engine.setRes('cells', 0);
      UI.setStat('power', '0 cells', true, true);
    },
    mapUnlock: () => {
      _log('unlocking map');
      Engine.setFlag('map_unlocked', false);
      Map.unlock();
    },
  };

  // ── map ──
  const map = {
    reveal: () => {
      _log('revealing all districts');
      // Access districts via Map render — unfog everything
      UI.log('dev: all districts revealed.', 'dim');
      // Trigger via engine flag + re-expose through console note
      _warn('use game.flags.set to set map_unlocked, then manually trigger Map.unlock() if needed');
      Map.render();
    },
    tower: () => {
      _log('revealing tower');
      Engine.setFlag('tower_objective_known', true);
      Map.revealTower();
    },
  };

  // ── state ──
  const state = {
    get: () => {
      const s = Engine.getState();
      console.log('%c── ENGINE STATE ──', 'color:#c8ff00;font-weight:bold');
      console.log('resources:',  s.resources);
      console.log('trust:',      s.trust);
      console.log('day:',        s.day);
      console.log('survivors:',  (s.survivors || []).length, 'total');
      console.log('flags:',      s.flags);
      return s;
    },
    trust: (n) => {
      Engine.set('trust', Math.max(0, Math.min(100, n)));
      UI.updateTrust(n);
      _log(`trust set to ${n}`);
    },
    day: (n) => {
      Engine.set('day', n);
      document.getElementById('day-num').textContent = n;
      _log(`day set to ${n}`);
    },
    resources: () => {
      console.table(Engine.get('resources'));
      return Engine.get('resources');
    },
  };

  // ── flags ──
  const flags = {
    list: () => {
      const f = Engine.get('flags') || {};
      console.table(Object.entries(f).map(([k,v]) => ({ flag: k, value: v })));
      return f;
    },
    set: (flag, val = true) => {
      Engine.setFlag(flag, val);
      _log(`flag "${flag}" → ${val}`);
    },
    clear: (flag) => {
      Engine.setFlag(flag, false);
      _log(`flag "${flag}" cleared`);
    },
  };

  // ── raid ──
  const raid = {
    probe:       () => { _log('forcing probe raid');       Raids.forceRaid('probe'); },
    strike:      () => { _log('forcing strike raid');      Raids.forceRaid('strike'); },
    assault:     () => { _log('forcing assault raid');     Raids.forceRaid('assault'); },
    coordinated: () => { _log('forcing coordinated raid'); Raids.forceRaid('coordinated'); },
  };

  function help() {
    console.log('%c── STATIC DEV CONSOLE ──', 'color:#c8ff00;font-size:14px;font-weight:bold');
    console.log('%cResources', 'color:#c8ff00;font-weight:bold');
    console.log('  game.give.cells(n)         — add n power cells');
    console.log('  game.give.scrap(n)         — add n scrap');
    console.log('  game.give.rations(n)       — add n rations');
    console.log('  game.give.components(n)    — add n components');
    console.log('  game.give.meds(n)          — add n medicine');
    console.log('  game.give.trust(n)         — add n trust');
    console.log('  game.give.all(n)           — add n of everything');
    console.log('%cSurvivors', 'color:#c8ff00;font-weight:bold');
    console.log('  game.survivors.list()               — table of all living survivors');
    console.log('  game.survivors.isSynth("name")      — HUMAN or SYNTH');
    console.log('  game.survivors.suspicion("name", n) — set suspicion 0–5');
    console.log('  game.survivors.expose("name")       — remove from shelter');
    console.log('  game.survivors.add("role")          — inject a survivor');
    console.log('%cEvents', 'color:#c8ff00;font-weight:bold');
    console.log('  game.event.stranger()      — trigger stranger knock');
    console.log('  game.event.sabotage()      — trigger sabotage');
    console.log('  game.event.meridian()      — fire Meridian fragment');
    console.log('  game.event.university()    — fire University fragment');
    console.log('  game.event.radio()         — fire radio event');
    console.log('  game.event.tower()         — launch tower run');
    console.log('  game.event.debrief()       — show end debrief');
    console.log('  game.event.generatorFail() — kill the generator');
    console.log('  game.event.mapUnlock()     — unlock the map');
    console.log('%cState', 'color:#c8ff00;font-weight:bold');
    console.log('  game.state.get()           — dump full engine state');
    console.log('  game.state.trust(n)        — set trust to n');
    console.log('  game.state.day(n)          — set day to n');
    console.log('  game.state.resources()     — table of resources');
    console.log('%cFlags', 'color:#c8ff00;font-weight:bold');
    console.log('  game.flags.list()          — table of all flags');
    console.log('  game.flags.set("flag")     — set a flag true');
    console.log('  game.flags.clear("flag")   — set a flag false');
    console.log('%cMap', 'color:#c8ff00;font-weight:bold');
    console.log('  game.map.tower()           — reveal relay tower');
    console.log('%cRaids', 'color:#c8ff00;font-weight:bold');
    console.log('  game.raid.probe()          — force a probe raid');
    console.log('  game.raid.strike()         — force a strike raid');
    console.log('  game.raid.assault()        — force an assault raid');
    console.log('  game.raid.coordinated()    — force a coordinated assault');
  }

  _log('dev console ready — type game.help() for commands');

  return { give, survivors, event, map, state, flags, raid, help };
})();