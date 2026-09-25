/* Everything personal lives here, so it's easy to change later. */

const CONFIG = {
  playerName: 'Grandma',

  /* Stars are awarded to the grandkids in rotation. */
  kids: [
    { name: 'Allison', calls: 'Grandma',  emoji: '🌸' },
    { name: 'Richie',  calls: 'Grandma',  emoji: '⚾' },
    { name: 'Will',    calls: 'Mom-Mom',  emoji: '🧸', sub: 'the little one' }
  ],

  /* Shown on the big celebration screen every CELEBRATE_EVERY stars.
     {name} and {calls} get filled in for whichever grandkid is up. */
  celebrations: [
    '{name} says you are still the smartest one in the family!',
    'That is another gold star from {name}. Keep it up, {calls}!',
    '{name} is going to be so proud when we tell them about this one.',
    'Look at you go! {name} would never have gotten that one.',
    'A big high five from {name}! ⭐',
    '{name} always said you knew everything about the old shows.',
    'Wait until {name} hears how well you are doing!',
    'You have still got it, {calls}. {name} knows it too.'
  ],

  /* Little pick-me-ups after a wrong answer. Never scolding. */
  encouragements: [
    'Good try!',
    'Close one!',
    'That was a tricky one.',
    'Nice guess!',
    'Almost had it!',
    'Ooh, a tough one.',
    'Even the experts miss that one.'
  ],

  /* Cheers after a correct answer. */
  cheers: [
    'That\'s right!',
    'Correct!',
    'You got it!',
    'Exactly right!',
    'Well done!',
    'Sharp as ever!',
    'Nobody fools you!',
    'You know your stuff!'
  ],

  /* Every question bank is a JSON array of { q, choices, answer, fact, cat, d }
     where d is the difficulty 1–3. A game may supply fixedChoices instead of
     per-question choices. The word game's items are { q, a, fact, cat, d }. */
  games: {
    trivia:   { title: 'Trivia Time',     shuffleChoices: true,
                files: ['data/trivia.json'] },
    lines:    { title: 'Finish the Line', shuffleChoices: true,
                files: ['data/lines.json'] },
    /* "Which came first, A or B?" — the buttons must stay in the order the
       question names them, so these are never shuffled. */
    remember: { title: 'Remember When?',  shuffleChoices: false,
                files: ['data/remember.json'] },
    decades:  { title: 'Which Decade?',   shuffleChoices: false,
                fixedChoices: ['1940s', '1950s', '1960s', '1970s'],
                files: ['data/decades.json'] },
    crossword: { title: 'Crossword Clues', type: 'word',
                files: ['data/crossword.json'] }
  },

  /* Difficulty levels. Each level draws questions from the tiers in these
     proportions; a tier with weight 0 is never shown at that level.
     For the crossword: `given` is how many letters of an n-letter answer start
     filled in (the first letter is always among them), and `decoys` is how
     many extra letters are mixed into the tiles. */
  levels: [
    null,
    { name: 'Easy',   weights: { 1: 0.85, 2: 0.15, 3: 0    },
      word: { given: (n) => Math.max(1, Math.round(n / 3)), decoys: 0 } },
    { name: 'Medium', weights: { 1: 0.20, 2: 0.55, 3: 0.25 },
      word: { given: () => 1, decoys: 2 } },
    { name: 'Hard',   weights: { 1: 0,    2: 0.35, 3: 0.65 },
      word: { given: () => 0, decoys: 4 } }
  ],
  DEFAULT_LEVEL: 2,

  /* Offer to move up a level after this many correct in a row, and to ease
     off after this many misses in a row. Each offer is made once per sitting. */
  NUDGE_UP_STREAK: 8,
  NUDGE_DOWN_MISSES: 4,

  CELEBRATE_EVERY: 10,   /* stars between celebration screens */
  SPEECH_RATE: 0.85
};
