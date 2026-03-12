const Confrontation = (() => {

  function open(survivor) {
    const first = survivor.name.split(' ')[0];
    const witnesses = Survivors.getLiving().filter(s => s.id !== survivor.id).length;
    const timeInShelter = survivor.cluesGiven || 0; // proxy for how long they've been inside

    UI.showEvent({
      title: `// confront: ${survivor.name.toUpperCase()}`,
      text: buildConfrontText(survivor, first, witnesses),
      choices: [
        {
          label: `kick ${first} out`,
          onChoose: () => doKick(survivor, first, witnesses, timeInShelter),
        },
        {
          label: `kill ${first}`,
          onChoose: () => doKill(survivor, first, witnesses),
        },
        {
          label: `back off — watch and wait`,
          onChoose: () => doBackOff(survivor, first),
        },
      ]
    });
  }

  function buildConfrontText(survivor, first, witnesses) {
    const pipLevel = survivor.suspicion;
    const tension  = pipLevel >= 4
      ? `the evidence is hard to ignore. ${first} has been flagged too many times.`
      : `something doesn't add up about ${first}. the signs are there.`;

    const witnessLine = witnesses === 0
      ? `there's no one else to verify what happens here.`
      : witnesses === 1
      ? `one other person is watching how you handle this.`
      : `${witnesses} others are watching. how you do this matters.`;

    return `${tension}

${witnessLine}

kicking them out means they survive — but they know where you are. killing them is permanent. backing off keeps the peace but the risk stays.`;
  }

  function doKick(survivor, first, witnesses, timeInShelter) {
    Survivors.expose(survivor);

    if (survivor.isSynth) {
      // Synth walks — escalation scales with how long they were inside
      const escalation = 0.05 + (timeInShelter * 0.02);
      Engine.set('synthRisk', Math.min(0.6, Engine.get('synthRisk') + escalation));
      UI.log('', '');
      UI.log(`${first} is gone. walked out without a word.`, 'warning');
      setTimeout(() => UI.log(`it knew the layout. it'll send others.`, 'dim'), 700);
      setTimeout(() => UI.log(`synth activity in the area is increasing.`, 'danger'), 1400);
      Events.adjustTrust(-5); // small hit — exile isn't clean
    } else {
      // Innocent exiled — witnesses make it worse
      const trustLoss = -15 - (witnesses * 5);
      Events.adjustTrust(trustLoss);
      UI.log('', '');
      UI.log(`${first} leaves. they weren't what you thought.`, 'danger');
      setTimeout(() => {
        if (witnesses > 0) {
          UI.log(`the others watched it happen. nobody says anything.`, 'dim');
        } else {
          UI.log(`no one saw. but you know what you did.`, 'dim');
        }
      }, 700);
    }
  }

  function doKill(survivor, first, witnesses) {
    Survivors.expose(survivor);

    if (survivor.isSynth) {
      // Good call — but killing still costs trust
      const trustLoss = witnesses === 0 ? -5 : -(8 + witnesses * 4);
      Events.adjustTrust(trustLoss);
      UI.log('', '');
      UI.log(`${first} is gone. permanently.`, 'accent');
      setTimeout(() => UI.log(`it was a synth. you were right.`, 'dim'), 600);
      if (witnesses > 0) {
        setTimeout(() => UI.log(`the others are quieter now. they know you'll do it.`, 'warning'), 1200);
      }
    } else {
      // Catastrophic — murdered an innocent
      const trustLoss = witnesses === 0 ? -25 : -(35 + witnesses * 8);
      Events.adjustTrust(trustLoss);
      UI.log('', '');
      UI.log(`${first} is gone.`, 'danger');
      setTimeout(() => UI.log(`they weren't a synth.`, 'danger'), 700);
      setTimeout(() => {
        if (witnesses > 0) {
          UI.log(`${witnesses === 1 ? 'someone' : 'people'} saw what you did. trust is shattered.`, 'danger');
        } else {
          UI.log(`no witnesses. but ${first} is still gone.`, 'dim');
        }
      }, 1400);
      // If trust craters below 20, trigger a mass departure event
      if (Engine.get('trust') <= 20 && Survivors.getLiving().length > 0) {
        setTimeout(massDesertion, 3000);
      }
    }
  }

  function doBackOff(survivor, first) {
    // No action — small trust bump from restraint, suspicion stays
    Events.adjustTrust(+2);
    UI.log('', '');
    UI.log(`you let it go. for now.`, 'dim');
    UI.log(`${first} knows something happened. the moment passes.`, 'dim');
    // Hide confront button temporarily — reappears if suspicion climbs again
    UI.hideConfrontButton(survivor.id);
    // Re-show after 60 seconds if still alive
    setTimeout(() => {
      const still = Survivors.getLiving().find(s => s.id === survivor.id);
      if (still && still.suspicion >= 3) {
        UI.showConfrontButton(still, open);
      }
    }, 60000);
  }

  function massDesertion() {
    const living = Survivors.getLiving();
    if (living.length === 0) return;
    // Half the shelter walks out
    const leaving = living.slice(0, Math.ceil(living.length / 2));
    UI.log('', '');
    UI.log(`people are leaving. can't blame them.`, 'danger');
    leaving.forEach((s, i) => {
      setTimeout(() => {
        Survivors.expose(s);
        UI.log(`${s.name.split(' ')[0]} is gone.`, 'danger');
      }, i * 800);
    });
  }

  return { open };
})();