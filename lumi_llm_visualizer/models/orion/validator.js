window.modelValidators = window.modelValidators || {};

function parseNounPhrase(tokens, idx, allowedNouns, articles, adjectives) {
    if (idx >= tokens.length) {
        return { valid: false, reason: "Missing noun phrase", idx };
    }

    let article = null;
    if (articles.includes(tokens[idx])) {
        article = tokens[idx];
        idx++;
    }

    let adj = null;
    if (idx < tokens.length && adjectives.includes(tokens[idx])) {
        adj = tokens[idx];
        idx++;
    }

    if (idx >= tokens.length) {
        return { valid: false, reason: "Missing noun in phrase", idx };
    }

    const noun = tokens[idx];
    if (!allowedNouns.includes(noun)) {
        return { valid: false, reason: `Invalid noun: "${noun}"`, idx };
    }
    idx++;

    if (article) {
        const nextWord = adj || noun;
        const startsWithVowel = /^[aeiou]/i.test(nextWord);
        if (article === "a" && startsWithVowel) {
            return { valid: false, reason: `Grammar error: Use 'an' before "${nextWord}"`, idx };
        }
        if (article === "an" && !startsWithVowel) {
            return { valid: false, reason: `Grammar error: Use 'a' before "${nextWord}"`, idx };
        }
    }

    return { valid: true, noun, idx };
}

function getLocPool(prep, verb, obj, subjects) {
    if (prep === "with") {
        const allowedVerbs = ["repairs", "activates", "attacks", "protects", "controls", "harvests", "scans", "studies"];
        if (!allowedVerbs.includes(verb)) return [];
        return subjects.concat(["laser", "shield", "crystal", "data", "signal"]);
    }
    
    if (prep === "to" || prep === "from") {
        const allowedVerbs = ["transmits", "flies", "escapes", "reaches", "lands"];
        if (!allowedVerbs.includes(verb)) return [];
        return ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "void", "nebula"].concat(subjects);
    }
    
    if (prep === "into") {
        const allowedVerbs = ["enters", "flies", "escapes", "reaches", "scans", "observes", "detects"];
        if (!allowedVerbs.includes(verb)) return [];
        return ["spaceship", "station", "void", "nebula", "anomaly"];
    }
    
    if (prep === "on") {
        const allowedVerbs = ["lands", "observes", "detects", "scans", "explores"];
        if (!allowedVerbs.includes(verb)) return [];
        return ["planet", "moon", "asteroid", "spaceship", "station"];
    }
    
    if (prep === "near") {
        return ["spaceship", "station", "planet", "moon", "star", "asteroid", "crystal"].concat(subjects);
    }
    
    return [];
}

function validateOrionClause(tokens, sharedSubject = null) {
    if (tokens.length === 0) {
        return { valid: false, reason: "Empty clause" };
    }

    const subjects = ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "robot", "drone", "creature", "cyborg", "rover", "probe"];
    const objects = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "crystal", "signal", "engine", "shield", "laser", "data", "anomaly", "void", "nebula", "gravity", "radiation"];
    const adjectives = ["large", "small", "distant", "unknown", "strange", "ancient", "broken", "active", "silent", "bright", "dark", "dangerous", "mysterious", "frozen", "toxic", "magnetic", "empty", "hidden"];
    const adverbs = ["quickly", "slowly", "quietly", "carefully", "secretly", "instantly", "safely", "constantly", "bravely", "silently"];
    const prepositions = ["on", "near", "to", "with", "from", "into"];
    const articles = ["the", "a", "an"];

    let idx = 0;
    let sub = null;

    // 1. Subject Phrase (or ellipsis check)
    if (idx < tokens.length && (subjects.includes(tokens[idx]) || articles.includes(tokens[idx]) || adjectives.includes(tokens[idx]))) {
        const subRes = parseNounPhrase(tokens, idx, subjects, articles, adjectives);
        if (!subRes.valid) return subRes;
        sub = subRes.noun;
        idx = subRes.idx;
    } else {
        if (!sharedSubject) {
            return { valid: false, reason: "Missing subject in clause", idx };
        }
        sub = sharedSubject;
    }

    // 2. Verb Phrase (with optional adverb before verb)
    let advBefore = null;
    if (idx < tokens.length && adverbs.includes(tokens[idx])) {
        advBefore = tokens[idx];
        idx++;
    }
    
    if (idx >= tokens.length) {
        return { valid: false, reason: "Missing verb in clause" };
    }
    
    const verb = tokens[idx];
    const allVerbs = [
        "scans", "explores", "analyzes", "observes", "detects", "discovers", "flies", 
        "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", 
        "attacks", "destroys", "harvests", "fears", "studies", "controls", "needs", 
        "escapes", "ignores", "reaches"
    ];
    if (!allVerbs.includes(verb)) {
        return { valid: false, reason: `Invalid verb: "${verb}"` };
    }
    idx++;

    // Handle simplified intransitive clause
    if (idx >= tokens.length || (idx === tokens.length - 1 && adverbs.includes(tokens[idx]))) {
        let advAtEnd = null;
        if (idx < tokens.length && adverbs.includes(tokens[idx])) {
            advAtEnd = tokens[idx];
            idx++;
        }
        
        if (verb === "escapes" || verb === "lands") {
            if (verb === "escapes" && !["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "cyborg", "creature"].includes(sub)) {
                return { valid: false, reason: `Subject "${sub}" cannot escape` };
            }
            if (verb === "lands" && ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "cyborg", "creature"].includes(sub)) {
                return { valid: false, reason: `Subject "${sub}" should escape, not land` };
            }
            
            if (advBefore && advAtEnd) {
                return { valid: false, reason: "Too many adverbs in a single clause" };
            }
            return { valid: true };
        } else {
            return { valid: false, reason: `Verb "${verb}" requires an object` };
        }
    }

    // 3. Optional Object Phrase (transitive vs intransitive verbs)
    const intransitiveVerbs = ["lands", "flies", "escapes", "enters", "orbits", "reaches"];
    let obj = null;
    let hasObject = false;

    // Check if next token looks like preposition or adverb, indicating omitted object
    const nextToken = tokens[idx];
    const isPrepOrAdv = nextToken && (prepositions.includes(nextToken) || adverbs.includes(nextToken));

    if (isPrepOrAdv && intransitiveVerbs.includes(verb)) {
        obj = null;
        hasObject = false;
    } else {
        const allowedObjects = subjects.concat(objects);
        const objRes = parseNounPhrase(tokens, idx, allowedObjects, articles, adjectives);
        if (!objRes.valid) return objRes;
        obj = objRes.noun;
        idx = objRes.idx;
        hasObject = true;
    }

    // Check for optional adverb after object
    let advAfterObj = null;
    if (idx < tokens.length && adverbs.includes(tokens[idx])) {
        advAfterObj = tokens[idx];
        idx++;
    }

    // 4. Optional Preposition Phrase
    let prep = null;
    let prepLoc = null;
    if (idx < tokens.length && prepositions.includes(tokens[idx])) {
        prep = tokens[idx];
        idx++;

        const locPool = getLocPool(prep, verb, obj, subjects);
        if (locPool.length === 0) {
            return { valid: false, reason: `Preposition "${prep}" is not compatible with verb "${verb}"` };
        }

        const locRes = parseNounPhrase(tokens, idx, locPool, articles, adjectives);
        if (!locRes.valid) return locRes;
        prepLoc = locRes.noun;
        idx = locRes.idx;
    }

    // Check for optional adverb at the very end of clause
    let advAtEnd = null;
    if (idx < tokens.length && adverbs.includes(tokens[idx])) {
        advAtEnd = tokens[idx];
        idx++;
    }

    if (idx < tokens.length) {
        return { valid: false, reason: `Extra words at end of clause: "${tokens.slice(idx).join(" ")}"` };
    }

    // Validate we didn't use more than 1 adverb
    const adverbCount = (advBefore ? 1 : 0) + (advAfterObj ? 1 : 0) + (advAtEnd ? 1 : 0);
    if (adverbCount > 1) {
        return { valid: false, reason: "Too many adverbs in a single clause" };
    }

    // 5. Subject-Verb Semantic Compatibility Checks
    const humans = ["astronaut", "commander", "pilot", "engineer", "scientist"];
    const machines = ["robot", "drone", "rover", "probe"];
    const others = ["alien", "creature", "cyborg"];

    if (humans.includes(sub)) {
        const humanVerbs = ["scans", "explores", "analyzes", "observes", "detects", "discovers", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "studies", "controls", "needs", "escapes", "ignores", "reaches"];
        if (!humanVerbs.includes(verb)) {
            return { valid: false, reason: `Human "${sub}" cannot perform verb "${verb}"` };
        }
    } else if (machines.includes(sub)) {
        const machineVerbs = ["scans", "analyzes", "observes", "detects", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "controls"];
        if (!machineVerbs.includes(verb)) {
            return { valid: false, reason: `Machine "${sub}" cannot perform verb "${verb}"` };
        }
    } else if (others.includes(sub)) {
        const otherVerbs = ["observes", "detects", "orbits", "enters", "attacks", "destroys", "harvests", "fears", "ignores", "reaches"];
        if (!otherVerbs.includes(verb)) {
            return { valid: false, reason: `Alien/Creature/Cyborg "${sub}" cannot perform verb "${verb}"` };
        }
    }

    // 6. Verb-Object Semantic Compatibility Checks (Only check if object exists)
    if (hasObject && obj) {
        if (["scans", "analyzes", "observes", "detects", "studies"].includes(verb)) {
            const allowed = ["planet", "moon", "star", "galaxy", "asteroid", "crystal", "signal", "anomaly", "void", "nebula", "radiation", "gravity"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "${verb}" cannot target "${obj}"` };
            }
        } else if (["flies", "orbits", "lands", "enters", "reaches", "escapes"].includes(verb)) {
            const allowed = ["planet", "moon", "star", "galaxy", "asteroid", "void", "nebula", "spaceship", "station", "gravity"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "${verb}" cannot target "${obj}"` };
            }
        } else if (["repairs", "activates"].includes(verb)) {
            const allowed = ["spaceship", "station", "engine", "shield", "laser"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "${verb}" cannot target "${obj}"` };
            }
        } else if (verb === "transmits") {
            const allowed = ["signal", "data"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "transmits" cannot target "${obj}"` };
            }
        } else if (["protects", "attacks", "destroys"].includes(verb)) {
            if (!subjects.includes(obj)) {
                return { valid: false, reason: `Verb "${verb}" must target a subject, not "${obj}"` };
            }
            if (obj === sub) {
                return { valid: false, reason: `Subject "${sub}" cannot "${verb}" itself` };
            }
        } else if (verb === "harvests") {
            const allowed = ["crystal", "data", "star"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "harvests" cannot target "${obj}"` };
            }
        } else if (verb === "controls") {
            const allowed = ["spaceship", "station", "robot", "drone", "rover", "probe", "engine"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "controls" cannot target "${obj}"` };
            }
        } else if (verb === "needs") {
            const allowed = ["data", "signal", "shield", "laser", "engine", "gravity"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "needs" cannot target "${obj}"` };
            }
        } else if (verb === "fears") {
            const allowed = ["anomaly", "void", "radiation", "alien", "creature"];
            if (!allowed.includes(obj)) {
                return { valid: false, reason: `Verb "fears" cannot target "${obj}"` };
            }
        }
    }

    return { valid: true };
}

window.modelValidators["orion"] = function(sentence) {
    const tokens = sentence.trim().split(/\s+/);
    const cleanTokens = tokens.filter(t => t !== "<bos>" && t !== "<eos>" && t !== "<pad>");

    const conjunctions = ["and", "but", "because", "although", "if", "while"];
    let conjIndex = -1;
    let conj = null;
    for (let c of conjunctions) {
        const foundIdx = cleanTokens.indexOf(c);
        if (foundIdx !== -1) {
            conjIndex = foundIdx;
            conj = c;
            break;
        }
    }

    let parts = [];
    if (conjIndex === -1) {
        parts = [cleanTokens];
    } else {
        parts = [
            cleanTokens.slice(0, conjIndex),
            cleanTokens.slice(conjIndex + 1)
        ];
    }

    let firstSubj = null;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const sharedSubject = (i === 1 && (conj === "and" || conj === "but")) ? firstSubj : null;
        
        const res = validateOrionClause(part, sharedSubject);
        if (!res.valid) {
            return res;
        }

        if (i === 0) {
            const subjects = ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "robot", "drone", "creature", "cyborg", "rover", "probe"];
            const subWord = part.find(t => subjects.includes(t));
            if (subWord) {
                firstSubj = subWord;
            }
        }
    }

    return { valid: true, reason: "Logical sentence ✅" };
};
