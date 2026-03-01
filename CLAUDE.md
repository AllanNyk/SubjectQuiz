# Subject Quiz - A Dungeon of Knowledge

## Project Overview
A web-based first-person dungeon crawler where students learn by fighting enemies through multiple-choice quiz questions on any subject. Built with vanilla HTML5/CSS/JavaScript (ES modules, Canvas 2D). No frameworks, no build step — open index.html and play.

## Tech Stack
- **Rendering:** HTML5 Canvas 2D (pseudo-3D depth-based dungeon view)
- **Logic:** Vanilla JavaScript (ES modules)
- **Styling:** CSS3
- **Data:** JSON question files (hot-swappable per subject)
- **Hosting:** Static files — any web server, GitHub Pages, Netlify, etc.

## Project Structure
```
subjectquiz/
├── index.html              # Entry point
├── css/style.css           # All styling (UI, layout, ad slots)
├── js/
│   ├── main.js             # Game class, loop, state machine
│   ├── config.js           # All constants and tunable values
│   ├── map.js              # Level layouts (grid data + map logic)
│   ├── player.js           # Player state (position, facing, health)
│   ├── enemy.js            # Enemy placement and state
│   ├── renderer.js         # Canvas dungeon rendering (walls, floor, ceiling, enemies)
│   ├── combat.js           # Quiz overlay (question display, answer handling)
│   ├── questionLoader.js   # Load & manage JSON question banks
│   ├── input.js            # Keyboard + on-screen button input
│   ├── ui.js               # Menu screens, HUD, log, leaderboard, victory/game-over
│   └── stats.js            # Score, streak, wrong-answer log, leaderboard (localStorage)
├── data/questions/
│   ├── civilprocesret.json # Danish civil procedure (Danish)
│   └── ip-law.json         # Intellectual property law (English)
├── assets/                 # Future: textures, sprites, audio
├── CLAUDE.md               # This file
└── roadmap.md              # Development roadmap
```

## Architecture

### Game States
```
MENU → EXPLORING → COMBAT → EXPLORING → VICTORY
  ↕                   ↓                     ↓
LOG / LEADERBOARD  GAME_OVER             MENU (next level or restart)
```

### Core Loop
1. Player navigates grid-based dungeon (WASD / arrow keys)
2. Moving into an enemy cell triggers COMBAT
3. COMBAT: question displayed, player picks answer (click or 1-4 keys)
   - Correct → enemy dies, +1 progress, score += 100 * level * streak bonus
   - Wrong → player takes 1 damage (from 3 HP), enemy stays, streak resets, answer logged
4. 10 correct answers → level complete → next level with harder questions
5. 0 HP → game over → restart
6. From menu: view wrong-answer Log (L) or Leaderboard/Stats (B) per subject

### Rendering
Depth-based pseudo-3D: precomputed perspective frames define corridor rectangles at each depth level. Walls drawn as trapezoids between frames. Enemies drawn as canvas-drawn sprites at their depth. Minimap overlay in corner with fog-of-war.

## Coding Guidelines
- **Modularity first:** Each JS file is one ES module with a single responsibility
- **No magic numbers:** All constants in config.js
- **Clean interfaces:** Modules communicate through clear function calls, not global state
- **Separation of data and logic:** Quiz content lives in JSON, game logic in JS
- **Keep it simple:** No premature optimization, no over-abstraction
- **Comments where non-obvious:** Don't comment what the code does, comment why
- **Consistent naming:** camelCase for variables/functions, PascalCase for classes, UPPER_SNAKE for constants

## Quiz File Format
```json
{
  "subject": "Subject Name",
  "language": "en",
  "levels": [
    {
      "level": 1,
      "name": "Level Name",
      "questions": [
        {
          "question": "Question text?",
          "choices": ["A", "B", "C", "D"],
          "correct": 0,
          "explanation": "Why A is correct..."
        }
      ]
    }
  ]
}
```
- `correct` is the 0-based index of the right answer in `choices`
- `explanation` is shown after answering (learning reinforcement)
- `language` tells the UI what language the questions are in
- Each level should have 15+ questions to avoid repetition

## Adding a New Level (Chapter) to a Question File

When adding a new chapter (e.g. from `civilretspleje_book/KapitelX.txt`):

### 1. Generate content
Read the source chapter text and generate questions + cases in parallel batches:
- **Questions**: Split into 2 batches (e.g. 15+15 for 30 total). Each question needs `question`, `choices` (4 strings), `correct` (0-based index), `explanation`. All in the subject's language.
- **Cases**: 10 boss cases, each with `title`, `level` (the new level number), `context` (fictional scenario, 100-200 words), and `questions` (exactly 4 per case, same format as regular questions).

### 2. Merge into the JSON file
Write batch outputs to temp files, then merge into the question JSON (e.g. `data/questions/civilprocesret.json`):
- Add a new entry to the `levels` array: `{ "level": N, "name": "Chapter Name", "questions": [...] }`
- Append cases to the `cases` array (each case already has `"level": N`)
- Use `JSON.stringify(data, null, 4)` for consistent formatting
- Verify counts after merge (e.g. `node -e "const d=require('./data/questions/file.json'); ..."`)

### 3. Update config.js
Add the new level to `LEVEL_DISPLAY_NAMES`:
```js
N: 'Kapitel X - Chapter Title',
```

### 4. Clean up
Delete temp batch files and merge scripts.

### Notes
- The level selector automatically picks up new levels via `questionLoader.maxLevel()`
- Dungeon mode reuses the last map layout (level 7) for levels beyond 7 — no map changes needed
- The `questionLoader.js` fetch uses cache-busting (`?v=Date.now()`), so updated JSON is picked up immediately
- Long level names auto-shrink in the settings UI (down to 11px font)

## Ad Integration (Future)
The HTML layout has placeholder slots for Google AdSense:
- `#ad-top`: Banner above game
- `#ad-left` / `#ad-right`: Skyscraper ads flanking the game
- `#ad-bottom`: Banner below game
Activate by replacing placeholder divs with AdSense script tags. The game canvas is centered and independent of ad layout.

## Technical Debt
- **Touch/mobile support:** Implemented (swipe navigation, tap answers, touch-friendly buttons) but untested on real mobile devices. Needs verification on iOS Safari, Android Chrome, and various screen sizes once deployed to a live web server. May need adjustments to swipe thresholds, touch target sizes, or gesture conflicts.

## Key Design Principles
1. **Easily adjustable:** Change difficulty, map size, enemy count, colors — all in config.js
2. **Easily fixable:** Small, focused modules. A bug in rendering won't affect combat logic
3. **Content-agnostic:** The game engine doesn't know or care about law — it loads any JSON quiz file
4. **Progressive difficulty:** Questions get harder each level; maps get more complex
5. **Learning-oriented:** Wrong answers show explanations; The Log tracks mistakes for review; scores and streaks provide motivation
