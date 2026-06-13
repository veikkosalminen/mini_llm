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

function validateOrionClause(tokens) {
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

    // 1. Subject Phrase
    const subRes = parseNounPhrase(tokens, idx, subjects, articles, adjectives);
    if (!subRes.valid) return subRes;
    const sub = subRes.noun;
    idx = subRes.idx;

    // 2. Verb Phrase
    let advVerb = null;
    if (idx < tokens.length && adverbs.includes(tokens[idx])) {
        advVerb = tokens[idx];
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

    // Handle the simplified intransitive clauses generated in generate_orion.py line 118
    if (idx >= tokens.length) {
        if (verb === "escapes" || verb === "lands") {
            if (verb === "escapes" && !["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "cyborg", "creature"].includes(sub)) {
                return { valid: false, reason: `Subject "${sub}" cannot escape` };
            }
            if (verb === "lands" && ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "cyborg", "creature"].includes(sub)) {
                return { valid: false, reason: `Subject "${sub}" should escape, not land` };
            }
            return { valid: true };
        } else {
            return { valid: false, reason: `Verb "${verb}" requires an object` };
        }
    }

    // 3. Object Phrase
    const allowedObjects = subjects.concat(objects);
    const objRes = parseNounPhrase(tokens, idx, allowedObjects, articles, adjectives);
    if (!objRes.valid) return objRes;
    const obj = objRes.noun;
    idx = objRes.idx;

    // 4. Optional Preposition Phrase
    if (idx < tokens.length) {
        const prep = tokens[idx];
        if (!prepositions.includes(prep)) {
            return { valid: false, reason: `Invalid preposition: "${prep}" or extra words` };
        }
        idx++;

        let locPool = [];
        if (prep === "into") {
            locPool = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "void", "nebula", "anomaly"];
        } else if (prep === "on") {
            locPool = ["spaceship", "station", "planet", "moon", "asteroid"];
        } else if (prep === "to" || prep === "from") {
            locPool = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "void", "nebula"].concat(subjects);
        } else if (prep === "with") {
            locPool = subjects.concat(["crystal", "data", "signal", "laser", "shield"]);
        } else { // near
            locPool = ["spaceship", "station", "planet", "moon", "star", "asteroid", "crystal", "engine", "shield", "laser"].concat(subjects);
        }

        const locRes = parseNounPhrase(tokens, idx, locPool, articles, adjectives);
        if (!locRes.valid) return locRes;
        idx = locRes.idx;
    }

    if (idx < tokens.length) {
        return { valid: false, reason: `Extra words at end of clause: "${tokens.slice(idx).join(" ")}"` };
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

    // 6. Verb-Object Semantic Compatibility Checks
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

    return { valid: true };
}

window.modelValidators["orion"] = function(sentence) {
    const tokens = sentence.trim().split(/\s+/);
    const cleanTokens = tokens.filter(t => t !== "<bos>" && t !== "<eos>" && t !== "<pad>");

    const conjunctions = ["and", "but", "because", "although", "if", "while"];
    let conjIndex = -1;
    for (let conj of conjunctions) {
        const foundIdx = cleanTokens.indexOf(conj);
        if (foundIdx !== -1) {
            conjIndex = foundIdx;
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

    for (let part of parts) {
        const res = validateOrionClause(part);
        if (!res.valid) {
            return res;
        }
    }

    return { valid: true, reason: "Logical sentence ✅" };
};
