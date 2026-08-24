# Grandma Fecher's Games

A small, free, offline-capable web game made for one person: a 79-year-old
crossword and trivia lover, recovering from a stroke with left-side neglect,
playing on an 11" Samsung Galaxy tablet.

Three games, all played by tapping one of a few very large buttons:

| Game | What it is |
| --- | --- |
| **Trivia Time** | Multiple-choice pop culture from the 1940s–1970s |
| **Finish the Line** | Fill in the missing word in a saying, slogan, or title |
| **Remember When?** | Two choices only — "which came first?" and easy true/false |

Every correct answer earns a star for one of the grandkids (Allison, Richie,
and Will) in rotation, with a celebration screen every 10 stars.

## Design rules

These are deliberate, and worth preserving if you edit anything:

- **Nothing lives in the left third of the screen.** Left hemispatial neglect
  means content over there may simply not be perceived. The content column is
  pushed right (`--gutter-left` in `css/style.css`), and controls sit in the
  top *right*.
- **A thick purple stripe runs down the left edge of every card and button** as
  a "your eyes start here" anchor — a standard neglect cue.
- **No typing, no dragging, no timers, no scores that go down, no game over.**
  A wrong answer gets a kind word, the right answer, and a fun fact.
- **Everything is huge**: 40px questions, 34px buttons, ~100px tap targets.
- **Read-aloud** is one tap; once turned on it stays on for every question.
- Progress, stars, and read-aloud preference persist in `localStorage`, so it
  always picks up where she left off.

## Structure

```
index.html            all three screens (home / game / stars)
css/style.css         the whole look
js/config.js          grandkids' names and all the friendly wording  ← edit here
js/app.js             screens, saved progress, stars, speech
js/games.js           the shared game engine
data/*.json           the question banks
sw.js, manifest.json  offline support + "add to home screen"
```

To add or change questions, edit the JSON files. Each entry looks like:

```json
{
  "q": "Who starred as the lovable redhead in 'I Love Lucy'?",
  "choices": ["Lucille Ball", "Doris Day", "Betty White"],
  "answer": 0,
  "fact": "The grape-stomping scene is still one of TV's most beloved moments.",
  "cat": "TV"
}
```

`answer` is the 0-based index of the correct choice. Trivia and Finish the Line
shuffle the buttons at runtime, so the order in the file doesn't matter.
Remember When? does **not** shuffle, because its questions name the choices in
order ("Which came first, A or B?").

## Running it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (It needs a server — opening `index.html`
straight from the file system won't load the JSON.)

## Deploying to GitHub Pages

```bash
git init && git add -A && git commit -m "Grandma's games"
git branch -M main
git remote add origin https://github.com/rfecher/grandma-games.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch →
`main` / `/ (root)`**. A minute later it's live at
<https://rfecher.github.io/grandma-games/>.

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
