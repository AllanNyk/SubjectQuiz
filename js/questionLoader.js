export class QuestionLoader {
    constructor() {
        this.data = null;        // loaded JSON
        this.usedIndices = {};   // track used questions per level: { 1: Set, 2: Set, ... }
        this.availableSubjects = [];
    }

    // Discover available question files
    async loadSubjectList() {
        // Hardcoded list — extend this when adding new subjects
        this.availableSubjects = [
            { id: 'civilprocesret', name: '🇩🇰 Civilprocesret', file: 'data/questions/civilprocesret.json' },
            { id: 'ip-law',         name: '🇬🇧 IP Law',         file: 'data/questions/ip-law.json' },
        ];
        return this.availableSubjects;
    }

    async loadSubject(subjectId) {
        const subject = this.availableSubjects.find(s => s.id === subjectId);
        if (!subject) throw new Error(`Unknown subject: ${subjectId}`);

        const resp = await fetch(subject.file);
        if (!resp.ok) throw new Error(`Failed to load ${subject.file}`);
        this.data = await resp.json();
        this.usedIndices = {};
        return this.data;
    }

    // Get a random unused question for the given difficulty level (1-indexed)
    getQuestion(level) {
        if (!this.data) return null;

        const levelData = this.data.levels.find(l => l.level === level);
        if (!levelData || !levelData.questions.length) return null;

        if (!this.usedIndices[level]) {
            this.usedIndices[level] = new Set();
        }

        const used = this.usedIndices[level];
        const total = levelData.questions.length;

        // If all questions used, reset
        if (used.size >= total) {
            used.clear();
        }

        // Pick a random unused index
        let idx;
        do {
            idx = Math.floor(Math.random() * total);
        } while (used.has(idx));

        used.add(idx);
        return this._shuffleChoices({ ...levelData.questions[idx] });
    }

    getSubjectName() {
        return this.data ? this.data.subject : '';
    }

    getLanguage() {
        return this.data ? this.data.language : 'en';
    }

    hasLevel(level) {
        if (!this.data) return false;
        return this.data.levels.some(l => l.level === level);
    }

    maxLevel() {
        if (!this.data) return 0;
        return Math.max(...this.data.levels.map(l => l.level));
    }

    getBossCase(level) {
        if (!this.data?.cases) return null;
        const c = this.data.cases.find(c => c.level === level);
        return c ? { title: c.title, context: c.context, questions: c.questions.map(q => this._shuffleChoices({...q})) } : null;
    }

    // Shuffle choices and update correct index to match
    _shuffleChoices(q) {
        const correctText = q.choices[q.correct];
        const shuffled = [...q.choices];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        q.choices = shuffled;
        q.correct = shuffled.indexOf(correctText);
        return q;
    }
}
