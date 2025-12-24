/**
 * Utility Functions
 * text normalization, number formatting, etc.
 */

const Utils = {
    normalizeKey: (str) => {
        if (!str) return "";
        return String(str).trim().toLowerCase();
    },

    getLastValue: (yearObj) => {
        if (!yearObj) return 0;
        const vals = Object.values(yearObj);
        return parseInt(vals[vals.length - 1]) || 0;
    },

    // Fuzzy search algorithm - Approximate string matching
    fuzzyMatch: (text, pattern) => {
        if (!text || !pattern) return { match: false, score: 0 };

        text = text.toLowerCase();
        pattern = pattern.toLowerCase();

        // Exact match - highest score
        if (text.includes(pattern)) {
            return { match: true, score: 100 };
        }

        // Character-by-character matching
        let patternIdx = 0;
        let score = 0;
        let consecutiveMatches = 0;

        for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
            if (text[i] === pattern[patternIdx]) {
                score += 10 + consecutiveMatches * 5; // Bonus for consecutive matches
                consecutiveMatches++;
                patternIdx++;
            } else {
                consecutiveMatches = 0;
            }
        }

        // All characters matched
        if (patternIdx === pattern.length) {
            return { match: true, score };
        }

        // Levenshtein distance fallback
        const distance = Utils.levenshteinDistance(text, pattern);
        if (distance <= Math.floor(pattern.length / 2)) {
            return { match: true, score: Math.max(0, 50 - distance * 10) };
        }

        return { match: false, score: 0 };
    },

    levenshteinDistance: (str1, str2) => {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[j][i] = matrix[j - 1][i - 1];
                } else {
                    matrix[j][i] = Math.min(
                        matrix[j - 1][i] + 1,     // deletion
                        matrix[j][i - 1] + 1,     // insertion
                        matrix[j - 1][i - 1] + 1  // substitution
                    );
                }
            }
        }
        return matrix[len2][len1];
    }
};

console.log('🛠️ Utils loaded');
