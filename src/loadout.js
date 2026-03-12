const Loadout = (() => {

  // Current allocated amounts
  const _pack = {
    rations: 0,
    meds:    0,
  };

  // Equipment slots — consumable items crafted and slotted before launch
  // Each: { id, label, count }
  const _equipment = {};

  // ── INIT ────────────────────────────────────────────────────────────────────
  // Called when a district is selected — shows panel and syncs stock labels

  function show() {
    document.getElementById('loadout-panel').classList.remove('hidden');
    _syncAll();
  }

  function hide() {
    document.getElementById('loadout-panel').classList.add('hidden');
  }

  function reset() {
    _pack.rations = 0;
    _pack.meds    = 0;
    _syncAll();
  }

  // ── CONTROLS ─────────────────────────────────────────────────────────────

  function _syncAll() {
    _syncResource('rations');
    _syncResource('meds');
    _syncEquipment();
  }

  function _syncResource(res) {
    const stock  = Engine.getRes(res);
    const packed = _pack[res];

    document.getElementById(`loadout-${res}-val`).textContent   = packed;
    document.getElementById(`loadout-${res}-stock`).textContent = `${stock - packed} in shelter`;

    document.getElementById(`loadout-${res}-dec`).disabled = packed <= 0;
    document.getElementById(`loadout-${res}-inc`).disabled = packed >= stock;

    // Dim the row if nothing available
    const row = document.getElementById(`loadout-row-${res}`);
    row.classList.toggle('loadout-empty', stock === 0);
  }

  function _adjust(res, delta) {
    const stock = Engine.getRes(res);
    _pack[res] = Math.max(0, Math.min(stock, _pack[res] + delta));
    _syncResource(res);
  }

  // ── EQUIPMENT SLOTS ───────────────────────────────────────────────────────
  // Register a craftable consumable item for the loadout panel.
  // Called by Crafting when an equipment item is built.

  function registerEquipment(id, label) {
    if (!_equipment[id]) _equipment[id] = { id, label, count: 0 };
    else _equipment[id].count++;
    _syncEquipment();

    // Show the equipment row
    document.getElementById('loadout-row-equipment').classList.remove('hidden');
  }

  function _syncEquipment() {
    const container = document.getElementById('loadout-equipment-slots');
    if (!container) return;
    container.innerHTML = '';

    for (const item of Object.values(_equipment)) {
      if (item.count <= 0) continue;
      const row = document.createElement('div');
      row.className = 'loadout-equip-item';

      const lbl = document.createElement('span');
      lbl.className   = 'loadout-equip-label';
      lbl.textContent = item.label;

      const cnt = document.createElement('span');
      cnt.className   = 'loadout-equip-count';
      cnt.textContent = `×${item.count}`;

      row.appendChild(lbl);
      row.appendChild(cnt);
      container.appendChild(row);
    }
  }

  // ── GETTERS ───────────────────────────────────────────────────────────────

  function getPacked() {
    // Returns a copy of the current pack state
    return {
      rations: _pack.rations,
      meds:    _pack.meds,
      equipment: { ..._equipment },
    };
  }

  function hasEquipment(id) {
    return (_equipment[id]?.count || 0) > 0;
  }

  function consumeEquipment(id) {
    if (!_equipment[id] || _equipment[id].count <= 0) return false;
    _equipment[id].count--;
    _syncEquipment();
    return true;
  }

  // ── COMMIT ────────────────────────────────────────────────────────────────
  // Called on expedition launch — actually deducts from shelter stockpile

  function commit() {
    Engine.setRes('rations', Engine.getRes('rations') - _pack.rations);
    Engine.setRes('meds',    Engine.getRes('meds')    - _pack.meds);
    const committed = getPacked();
    reset();
    return committed;
  }

  // ── WIRE UP DOM ───────────────────────────────────────────────────────────

  function init() {
    document.getElementById('loadout-rations-inc').addEventListener('click', () => _adjust('rations', +1));
    document.getElementById('loadout-rations-dec').addEventListener('click', () => _adjust('rations', -1));
    document.getElementById('loadout-meds-inc').addEventListener('click',    () => _adjust('meds',    +1));
    document.getElementById('loadout-meds-dec').addEventListener('click',    () => _adjust('meds',    -1));

    // Keep stock labels live when resources change
    Engine.on('resourceChange', ({ name }) => {
      if (name === 'rations' || name === 'meds') {
        // Clamp pack if stockpile dropped below it (e.g. raid hit while loadout open)
        if (_pack[name] > Engine.getRes(name)) _pack[name] = Engine.getRes(name);
        _syncResource(name);
      }
    });
  }

  return { init, show, hide, reset, commit, getPacked, hasEquipment, consumeEquipment, registerEquipment };
})();