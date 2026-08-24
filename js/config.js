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
    'Almost had it!'
  ],

  /* Cheers after a correct answer. */
  cheers: [
    'That\'s right!',
    'Correct!',
    'You got it!',
    'Exactly right!',
    'Well done!',
    'Sharp as ever!'
  ],

  games: {
    trivia:   { title: 'Trivia Time',     shuffleChoices: true,
                files: ['data/trivia-4050.json', 'data/trivia-6070.json'] },
    lines:    { title: 'Finish the Line', shuffleChoices: true,
                files: ['data/lines.json'] },
    /* "Which came first, A or B?" — the buttons must stay in the order the
       question names them, so these are never shuffled. */
    remember: { title: 'Remember When?',  shuffleChoices: false,
                files: ['data/remember.json'] }
  },

  CELEBRATE_EVERY: 10,   /* stars between celebration screens */
  SPEECH_RATE: 0.85
};
