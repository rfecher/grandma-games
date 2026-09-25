# Grandma Fecher's Games

A small, free, offline-capable web game made for one person: a 79-year-old
crossword and trivia lover, recovering from a stroke with left-side neglect,
playing on an 11" Samsung Galaxy tablet.

Five games, all played by tapping very large buttons — no typing anywhere:

| Game | What it is |
| --- | --- |
| **Crossword Clues** | One crossword clue at a time, spelled by tapping big letter tiles |
| **Trivia Time** | Multiple-choice pop culture from the 1940s–1970s |
| **Finish the Line** | Fill in the missing word in a saying, slogan, or title |
| **Which Decade?** | Place a song, show, toy, or fad in the 40s, 50s, 60s, or 70s |
| **Remember When?** | Two choices only — "which came first?" and easy true/false |

Every correct answer earns a star for one of the grandkids (Allison, Richie,
and Will) in rotation, with a celebration screen every 10 stars.

## Difficulty

Every question carries a difficulty `d` of 1 (easy), 2 (medium), or 3 (hard).
The **How hard?** picker on the home screen chooses a level, and each level
draws from the tiers in fixed proportions (see `CONFIG.levels` in
`js/config.js`) — Hard never shows an easy question, Easy never shows a hard
one. After eight correct in a row the game offers, once, to step up a level;
after four misses in a row it offers, once, to step down. She can always say no.

Repetition is kept down three ways: each game and level keeps its own shuffled
running order so nothing repeats until every eligible question has been shown;
questions she has seen at *any* level go to the back of the line when a new
order is built; and if she closes the app with a question on screen, it moves
on rather than showing her the same one again.

## Crossword Clues

Her favorite pastime, rebuilt around what the stroke changed. A keyboard is too
small for her hand and its left third may be invisible to her; a grid needs
exactly the screen-wide scanning that left neglect breaks. So she gets one
clue at a time, a row of answer squares, and 6–13 big letter tiles holding the
answer's letters plus a few decoys. Tapping a tile drops it into the next empty
square; tapping a filled square sends it back.

When the last square fills, the answer checks itself: right letters lock green,
wrong ones glow amber and return to the tiles. **Give me a letter** locks in the
next right letter, and after two tries **Show me the answer** appears so she is
never stuck. The level decides how many letters start filled in and how many
decoy tiles are mixed in (`word` in `CONFIG.levels`).

## Design rules

These are deliberate, and worth preserving if you edit anything:

- **Nothing lives in the left third of the screen.** Left hemispatial neglect
  means content over there may simply not be perceived. The content column is
  pushed right (`--gutter-left` in `css/style.css`), and every control sits
  at the top *right*.
- **A thick purple stripe runs down the left edge of every card and button** as
  a "your eyes start here" anchor — a standard neglect cue.
- **The game she played last wears a "Keep playing" badge** on its own button
  rather than taking up a separate one, so all five games fit on one screen.
- **No typing, no dragging, no timers, no scores that go down, no game over.**
  A wrong answer gets a kind word, the right answer, and a fun fact.
- **Everything is huge**: 40px questions, 34px buttons, ~100px tap targets,
  and every screen fits without scrolling.
- **Read-aloud** is one tap; once turned on it stays on for every question.
- Progress, stars, level, and the read-aloud preference persist in
  `localStorage`, so it always picks up where she left off.

## Structure

```
index.html            the screens (home / game / stars) and the shared modal
css/style.css         the whole look
js/config.js          grandkids' names, all the friendly wording, levels  ← edit here
js/app.js             screens, saved progress, question ordering, stars, speech
js/games.js           the multiple-choice engine (four games)
js/wordgame.js        the Crossword Clues engine
data/trivia.json      question banks — one per game
data/lines.json
data/remember.json
data/decades.json
data/crossword.json
sw.js, manifest.json  offline support + "add to home screen"
```

To add or change questions, edit the JSON files. Each entry looks like:

```json
{
  "q": "On 'The Honeymooners', what was Ed Norton's job?",
  "choices": ["Bus driver", "Sewer worker", "Mailman"],
  "answer": 1,
  "fact": "Art Carney's Norton worked underground and was proud of it.",
  "cat": "TV",
  "d": 2
}
```

`answer` is the 0-based index of the correct choice and `d` is the difficulty.
Trivia and Finish the Line shuffle the buttons at runtime, so the order in the
file doesn't matter. Remember When? does **not** shuffle, because its questions
name the choices in order ("Which came first, A or B?"). Which Decade? has no
`choices` key at all — the four decades are fixed, and `answer` is 0–3 for
1940s–1970s.

Crossword items are `{ "q": clue, "a": "ANSWER", "fact", "cat", "d" }`. Answers
are 3–9 capital letters with no spaces or punctuation, and no answer appears
twice in the file.

After changing any file, bump `CACHE` in `sw.js` so tablets pick up the new
version cleanly.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (It needs a server — opening `index.html`
straight from the file system won't load the JSON.)

## Deploying to GitHub Pages

The site deploys from the `main` branch root — push and it's live a minute
later at <https://rfecher.github.io/grandma-games/>.

A GitHub Pages site is public to anyone who has the link. The page carries a
`noindex` tag so the family's names don't turn up in search results, but treat
the URL itself as the only thing keeping it private.

## Setting up her tablet (do this once, for her)

1. Open **Chrome** on the tablet and go to the URL above. (Samsung Internet
   works too — its menu item is **Add page to → Home screen**.)
2. Let it finish loading once (that's what caches it for offline play).
3. Tap the **⋮** menu → **Add to Home screen** → **Install**.
4. A purple star icon appears on her home screen. Put it somewhere obvious,
   ideally alone on the first screen or in the dock.
5. Tap it once together and play a few questions with her.

After that she just taps the star. It opens full screen, works without
internet, and remembers her stars.
