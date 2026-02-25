// ── Localization ─────────────────────────────────────────────────────
// Language is driven by the question JSON's "language" field ("en" / "da").
// Menu always stays English; in-game UI switches per subject.

const STRINGS = {
    en: {
        // HUD
        'hud.keys':            'Keys:',
        'hud.level':           'Level',
        'hud.score':           'Score:',
        'hud.streak':          'Streak:',
        'hud.controls':        'WASD/Arrows to move & turn',

        // Combat
        'combat.foeChallenge':    'A foe challenges your knowledge!',
        'combat.bossQuestion':    'Question',
        'combat.bossQuestionOf':  'of',
        'combat.caseHeading':     '\u2014 CASE \u2014',
        'combat.pressToBegin':    'Press any key, click, or tap to begin...',
        'combat.correct':         'Correct! The foe is vanquished!',
        'combat.wrong':           'Wrong! You take damage!',
        'combat.correctAnswer':   'Correct answer:',
        'combat.pressToContinue': 'Press any key, click, or tap to continue...',
        'combat.timerSuffix':     's',

        // Log
        'log.title':       'The Log',
        'log.subtitle':    'Wrong answers \u2014',
        'log.empty1':      'No wrong answers recorded yet.',
        'log.empty2':      'Go forth and conquer!',
        'log.yourAnswer':  'Your answer:',
        'log.correct':     'Correct:',
        'log.page':        'Page',
        'log.pageOf':      '/',
        'log.prev':        '\u25C4 Prev',
        'log.clearLog':    'Clear Log',
        'log.next':        'Next \u25BA',
        'log.back':        'Back [Esc]',

        // Leaderboard
        'lb.title':         'Scores & Stats',
        'lb.yourStats':     'Your Stats',
        'lb.gamesPlayed':   'Games played:',
        'lb.totalAnswered': 'Total answered:',
        'lb.totalCorrect':  'Total correct:',
        'lb.accuracy':      'Accuracy:',
        'lb.bestStreak':    'Best streak:',
        'lb.bestScore':     'Best score:',
        'lb.top10':         'Top 10 Scores',
        'lb.noScores':      'No scores yet.',
        'lb.tableHeader':   '#   Score    Lvls   Date',
        'lb.back':          'Back [Esc]',

        // Victory
        'victory.title':      'Level Complete!',
        'victory.conquered':  'You conquered Level',
        'victory.score':      'Score:',
        'victory.mastered':   'You have mastered all levels!',
        'victory.returnMenu': 'Press ENTER to return to menu',
        'victory.continue':   'Press ENTER to continue to the next level',

        // Game Over
        'gameover.title':      'Defeated!',
        'gameover.subtitle':   'The dungeon has bested you... this time.',
        'gameover.answered':   'You answered',
        'gameover.correctly':  'questions correctly.',
        'gameover.finalScore': 'Final Score:',
        'gameover.returnMenu': 'Press ENTER to return to menu',
    },

    da: {
        // HUD
        'hud.keys':            'N\u00F8gler:',
        'hud.level':           'Niveau',
        'hud.score':           'Score:',
        'hud.streak':          'R\u00E6kke:',
        'hud.controls':        'WASD/pile for at bev\u00E6ge & dreje',

        // Combat
        'combat.foeChallenge':    'En fjende udfordrer din viden!',
        'combat.bossQuestion':    'Sp\u00F8rgsm\u00E5l',
        'combat.bossQuestionOf':  'af',
        'combat.caseHeading':     '\u2014 SAG \u2014',
        'combat.pressToBegin':    'Tryk p\u00E5 en tast, klik eller tap for at begynde...',
        'combat.correct':         'Korrekt! Fjenden er besejret!',
        'combat.wrong':           'Forkert! Du tager skade!',
        'combat.correctAnswer':   'Korrekt svar:',
        'combat.pressToContinue': 'Tryk p\u00E5 en tast, klik eller tap for at forts\u00E6tte...',
        'combat.timerSuffix':     's',

        // Log
        'log.title':       'Loggen',
        'log.subtitle':    'Forkerte svar \u2014',
        'log.empty1':      'Ingen forkerte svar registreret endnu.',
        'log.empty2':      'G\u00E5 ud og sejr!',
        'log.yourAnswer':  'Dit svar:',
        'log.correct':     'Korrekt:',
        'log.page':        'Side',
        'log.pageOf':      '/',
        'log.prev':        '\u25C4 Forrige',
        'log.clearLog':    'Ryd log',
        'log.next':        'N\u00E6ste \u25BA',
        'log.back':        'Tilbage [Esc]',

        // Leaderboard
        'lb.title':         'Scores & Statistik',
        'lb.yourStats':     'Din statistik',
        'lb.gamesPlayed':   'Spil spillet:',
        'lb.totalAnswered': 'Besvaret i alt:',
        'lb.totalCorrect':  'Korrekte i alt:',
        'lb.accuracy':      'Pr\u00E6cision:',
        'lb.bestStreak':    'Bedste r\u00E6kke:',
        'lb.bestScore':     'Bedste score:',
        'lb.top10':         'Top 10 scores',
        'lb.noScores':      'Ingen scores endnu.',
        'lb.tableHeader':   '#   Score    Niv.   Dato',
        'lb.back':          'Tilbage [Esc]',

        // Victory
        'victory.title':      'Niveau gennemf\u00F8rt!',
        'victory.conquered':  'Du besejrede niveau',
        'victory.score':      'Score:',
        'victory.mastered':   'Du har mestret alle niveauer!',
        'victory.returnMenu': 'Tryk ENTER for at vende tilbage til menuen',
        'victory.continue':   'Tryk ENTER for at forts\u00E6tte til n\u00E6ste niveau',

        // Game Over
        'gameover.title':      'Besejret!',
        'gameover.subtitle':   'Fangehullet har overvundet dig... denne gang.',
        'gameover.answered':   'Du svarede korrekt p\u00E5',
        'gameover.correctly':  'sp\u00F8rgsm\u00E5l.',
        'gameover.finalScore': 'Endelig score:',
        'gameover.returnMenu': 'Tryk ENTER for at vende tilbage til menuen',
    },
};

export function t(key, lang = 'en') {
    const table = STRINGS[lang] || STRINGS.en;
    return table[key] !== undefined ? table[key] : key;
}
