const Names = {
  first: [
    'Mara','Joel','Ellis','Soren','Yael','Deckard','Nix','Cass','Riven','Dex',
    'Thalia','Orion','Sage','Kael','Voss','Prim','Locke','Zara','Reef','Bex',
    'Halen','Tova','Cinder','Wren','Idris','Miro','Sable','Coen','Petra','Jude',
    'Rayne','Orin','Vesper','Lux','Caius','Fen','Saya','Draven','Lyric','Taran',
    'Indra','Zeph','Calla','Moss','Evren','Kira','Slate','Onyx','Briar','Rowan',
    'Asha','Crest','Mael','Dove','Seren','Pike','Alix','Cade','Fenn','Tyne',
    'Koel','Veer','Lorne','Sable','Ciro','Haze','Noor','Rylan','Dusk','Calder',
    'Rime','Flint','Sera','Colt','Wynn','Lev','Opal','Trace','Blaine','Holt',
  ],
  last:  [
    'Vanek','Osei','Thorne','Marsh','Calder','Vey','Dunn','Holt','Farr','Lund',
    'Crane','Solis','Wei','Birch','Nash','Koda','Penn','Sloane','Mace','Adler',
    'Cross','Vane','Dray','Wolfe','Cain','Falk','Rowe','Steele','Hunt','Pryce',
    'Morrow','Byrd','Lake','Stone','Ash','Burne','Cole','Drake','Frost','Gale',
    'Harrow','Isles','Jett','Knox','Lane','Mercer','Nord','Oren','Quill','Reid',
    'Strand','Tull','Ursa','Vale','Ward','Yuen','Zane','Abbot','Blane','Cord',
  ],
  // Roles with passive resource generation (per 30-tick cycle)
  roles: ['scavenger','lookout','medic','engineer','forager','mechanic','scout','cook'],

  // What each role passively generates every 30 ticks (~30 seconds)
  roleYields: {
    forager:   { rations: 2 },
    scavenger: { scrap: 1 },
    mechanic:  { cells: 1 },
    engineer:  { components: 1 },
    medic:     { meds: 1 },
    cook:      { rations: 1 },
    lookout:   null,
    scout:     null,
  },

  get() {
    // Track used first names per run — stored on Engine state
    const used = Engine.get('usedFirstNames') || [];
    const available = this.first.filter(n => !used.includes(n));
    // If somehow exhausted (very long run), reset the pool
    const pool = available.length > 0 ? available : this.first;
    const f = pool[Math.floor(Math.random() * pool.length)];
    used.push(f);
    Engine.set('usedFirstNames', used);
    const l = this.last[Math.floor(Math.random() * this.last.length)];
    return f + ' ' + l;
  },

  role() {
    return this.roles[Math.floor(Math.random() * this.roles.length)];
  }
};