const Engine = (() => {

  const SAVE_KEY = 'static_save_v1';

  let _state = {
    started: false,
    day: 1,
    generatorOn: false,
    trust: 100,
    resources: {},
    survivors: [],
    flags: {},
    unlockedActions: [],
    tickCount: 0,
  };

  let _listeners = {};

  function getState() { return _state; }

  function get(key) { return _state[key]; }

  function set(key, val) {
    _state[key] = val;
    emit('stateChange', { key, val });
  }

  function getRes(name) { return _state.resources[name] || 0; }

  function setRes(name, val) {
    _state.resources[name] = Math.max(0, val);
    emit('resourceChange', { name, val: _state.resources[name] });
    UI.updateResources();
  }

  function addRes(name, amt) {
    setRes(name, getRes(name) + amt);
  }

  function hasRes(costs) {
    for (const [name, amt] of Object.entries(costs)) {
      if (getRes(name) < amt) return false;
    }
    return true;
  }

  function spendRes(costs) {
    if (!hasRes(costs)) return false;
    for (const [name, amt] of Object.entries(costs)) {
      setRes(name, getRes(name) - amt);
    }
    return true;
  }

  function setFlag(flag, val = true) { _state.flags[flag] = val; }
  function getFlag(flag) { return !!_state.flags[flag]; }

  function on(event, cb) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(cb);
  }

  function emit(event, data) {
    (_listeners[event] || []).forEach(cb => cb(data));
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(_state));
    } catch(e) {}
  }

  function load() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        _state = { ..._state, ...JSON.parse(saved) };
        return true;
      }
    } catch(e) {}
    return false;
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  // Main tick — fires every second
  let _tickInterval = null;
  function startTick() {
    if (_tickInterval) return;
    _tickInterval = setInterval(() => {
      _state.tickCount++;
      emit('tick', _state.tickCount);
      // Autosave every 30 ticks
      if (_state.tickCount % 30 === 0) save();
    }, 1000);
  }

  return { get, set, getRes, setRes, addRes, hasRes, spendRes,
           setFlag, getFlag, getState, on, emit, save, load,
           clearSave, startTick };
})();
