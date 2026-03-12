const ForagingMilestones = (() => {

  // Global yield multiplier bonus — starts at 1.0, climbs with milestones
  // Stored on Engine state so it persists
  function getYieldBonus() {
    return Engine.get('foragingBonus') || 1.0;
  }

  // Threat roll improvement — reduces effective encounter severity at milestones
  // 0 = no improvement, 1 = one step down (high→medium), 2 = two steps down
  function getThreatReduction() {
    return Engine.get('foragingThreatReduction') || 0;
  }

  // Each milestone: threshold (total runs), narrative log lines, effect fn
  const MILESTONES = [
    {
      at: 5,
      lines: [
        'the runs are getting faster.',
        'people know which containers to check first. less time wasted.',
      ],
      effect: () => {
        Engine.set('foragingBonus', (Engine.get('foragingBonus') || 1.0) + 0.15);
      }
    },
    {
      at: 10,
      lines: [
        'someone drew up a rough inventory of what each district tends to hold.',
        'the parties are more deliberate now. they know what they are looking for.',
      ],
      effect: () => {
        Engine.set('foragingBonus', (Engine.get('foragingBonus') || 1.0) + 0.15);
        // Unlock a log note about patrol patterns
        setTimeout(() => {
          UI.log('the parties have started noting patrol timing. it helps.', 'dim');
        }, 3000);
      }
    },
    {
      at: 15,
      lines: [
        'ten runs. fifteen. the city is becoming readable.',
        'they move like they belong out there now.',
      ],
      effect: () => {
        Engine.set('foragingBonus', (Engine.get('foragingBonus') || 1.0) + 0.2);
        Engine.set('foragingThreatReduction', 1);
        setTimeout(() => {
          UI.log('patrol routes are predictable enough to route around. threat is lower.', 'accent');
        }, 2000);
      }
    },
    {
      at: 25,
      lines: [
        'they have ghost routes now. ways through the city that no synth patrol ever crosses.',
        'it took a long time to find them. cost something to learn.',
      ],
      effect: () => {
        Engine.set('foragingBonus', (Engine.get('foragingBonus') || 1.0) + 0.2);
        Engine.set('foragingThreatReduction', 2);
        setTimeout(() => {
          UI.log('experienced crews move almost unseen. encounters are rarer.', 'accent');
        }, 2000);
      }
    },
  ];

  function check(totalRuns) {
    for (const m of MILESTONES) {
      if (totalRuns === m.at) {
        // Fire the milestone
        setTimeout(() => {
          UI.log('');
          m.lines.forEach((l, i) => {
            setTimeout(() => UI.log(l, i === m.lines.length - 1 ? 'bright' : 'dim'), i * 900);
          });
          setTimeout(() => m.effect(), m.lines.length * 900 + 400);
        }, 1500);
        break;
      }
    }
  }

  // Downgrade threat level by n steps for encounter rolling
  function reducedThreat(threat) {
    const order = ['low', 'medium', 'high', 'extreme'];
    const reduction = getThreatReduction();
    if (reduction === 0) return threat;
    const idx = order.indexOf(threat);
    if (idx < 0) return threat;
    return order[Math.max(0, idx - reduction)];
  }

  return { getYieldBonus, reducedThreat, check };
})();