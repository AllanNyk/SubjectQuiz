# Subject Quiz Development Roadmap

## Phase 1: Core Prototype (Complete)
- [x] Project structure and documentation
- [x] Depth-based dungeon renderer (Canvas 2D)
- [x] Grid-based player movement (WASD + arrows)
- [x] Map system with handcrafted levels (7 levels)
- [x] Enemy placement and visibility in dungeon view
- [x] Quiz combat system (multiple choice overlay)
- [x] JSON question loading with subject selection
- [x] Health system (3 HP, damage on wrong answers)
- [x] Level progression (10 correct answers per level)
- [x] Minimap with fog of war
- [x] HUD (health, progress, level indicator)
- [x] Menu screen with subject picker
- [x] Victory and game over screens
- [x] Two question sets: Civilprocesret (DA), IP Law (EN)
- [~] Touch/mobile support (implemented, needs real-device testing)

## Phase 1.5: Stats & Progression (Complete)
- [x] The Log: wrong answer review (paginated, per subject)
- [x] Score system with streak bonus multiplier
- [x] Leaderboard (top 10 per subject, localStorage)
- [x] Player stats tracking (accuracy, streaks, games played, best score)
- [x] Redesigned menu: select subject → choose action (Start / Log / Scores)
- [x] HUD shows live score and streak
- [x] Victory/game-over screens show final score
- [x] New key bindings: L (log), B (scores), Backspace (back)

## Phase 2: Visual Polish (Complete)
- [x] Textured walls (pre-rendered brick textures with running bond pattern and per-brick shade variation)
- [x] Torch/lighting effects (dual sine wave flicker on walls, floor, and ceiling)
- [x] Enemy idle animation (vertical sway + pulsing eye glow, depth-phased)
- [x] Victory particle effects (40 golden shimmer particles with drift and wrap)
- [x] Floor/ceiling detail (perspective-correct grid lines + depth fog overlay)
- [x] Screen shake on damage (200ms decay, triggered on wrong answers)
- [x] Time-based game loop (rAF timestamp with 50ms dt cap)

## Phase 3: Boss System (Complete)
- [x] Boss rooms with sealed boss door (TILE_BOSS_DOOR) per level
- [x] 10 keys (correct answers) required to unlock boss door
- [x] Boss enemy: golden question mark sprite (larger than regular enemies)
- [x] Boss combat: case intro screen → 4 sequential questions per legal case
- [x] Wrong answer ejects from boss fight + 1 damage; all correct → stairs revealed
- [x] Boss cases in JSON question files (3 per subject)
- [x] Bonus score for defeating boss (SCORE_BASE × level × 3)

## Phase 4: PNG Textures (Complete)
- [x] SBS composite texture system (5-piece wall assembly per depth)
- [x] 3 brick packs: warm sandstone (L1), mossy stone (L2), dark dungeon (L3)
- [x] Two detail layers per pack (L1 high-res, L2 low-res)
- [x] Decoration textures: doors, windows (A/B/C variants)
- [x] Procedural fallback when textures not loaded
- [x] Depth dimming + torch flicker overlay on textures

## Phase 5: Timed Mode & Settings (Complete)
- [x] Menu toggle: [T] key or click "Timer: OFF/ON" button
- [x] Configurable timer duration (5/10/15/20/30 seconds)
- [x] Countdown bar per question (green → yellow → red)
- [x] Timer expiry auto-submits as wrong answer
- [x] Timer resets per boss question; does not tick during case intro
- [x] Level selector in settings screen
- [x] Localized settings UI (EN/DA)
- [x] Dynamic font sizing for combat answer buttons

## Phase 6: Hard Mode (Complete)
- [x] Difficulty toggle in settings: Normal / Hard — More Cases ([G] key or click)
- [x] Hard mode: 6 regular enemies + 6 case enemies + 1 boss
- [x] Case enemies: cyan question marks, multi-question case combat (same flow as boss)
- [x] Case enemy score bonus (×2), distinct from boss bonus (×3)
- [x] Cyan minimap dots for case enemies (distinct from red regular and magenta boss)
- [x] Cyan portrait in combat UI for case enemies
- [x] Localized difficulty labels (EN/DA)

## Phase 7: Deployment (Complete)
- [x] Hosted on one.com (allansjoelin.com/subjectquiz)
- [x] GitHub Actions auto-deploy via SFTP on push to main
- [x] Manual deploy trigger (workflow_dispatch)
- [x] Subdomain alias (subjectquiz.allansjoelin.com)

## Future Ideas
- [ ] More question sets (contract law, criminal law, constitutional law, etc.)
- [ ] Question set editor (web-based tool for professors)
- [ ] Community-submitted question packs
- [ ] Procedural dungeon generation (infinite replayability)
- [ ] Lore/flavor text for dungeon areas
- [ ] Achievement system
- [ ] Health potions hidden in dungeon
- [ ] Treasure chests with bonus questions
- [ ] Multiple enemy types with different behaviors
- [ ] Canvas-drawn environmental details (cracks, cobwebs, runes)
- [ ] Google AdSense integration (banner + sidebar ads)
- [ ] PWA support (offline play)
- [ ] Mobile testing on real devices
- [ ] Analytics (track popular subjects, drop-off points)
- [ ] Social sharing (share scores)
- [ ] Landing page with instructions
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Accessibility (keyboard-only, screen reader hints)
- [ ] Feedback mechanism for question quality
- [ ] Beta testing with law students
