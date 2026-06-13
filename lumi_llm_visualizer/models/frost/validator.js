window.modelValidators = window.modelValidators || {};
window.modelValidators["frost"] = function(sentence) {
    const tokens = sentence.trim().split(/\s+/);
    const cleanTokens = tokens.filter(t => t !== "<bos>" && t !== "<eos>" && t !== "<pad>");
    
    let conjIndex = cleanTokens.indexOf("and");
    if (conjIndex === -1) conjIndex = cleanTokens.indexOf("but");
    if (conjIndex === -1) conjIndex = cleanTokens.indexOf("because");
    
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
        if (part.length === 0) {
            return { valid: false, reason: "Empty clause in sentence" };
        }
        
        const sub = part[0];
        const validSubjects = ["coder", "robot", "cat", "dog", "mouse"];
        if (!validSubjects.includes(sub)) {
            return { valid: false, reason: `Invalid subject: "${sub}"` };
        }
        
        if (part.length < 2) {
            return { valid: false, reason: `Missing verb in clause` };
        }
        
        const verb = part[1];
        if (verb === "sleeps") {
            if (part.length < 3 || part[2] !== "quietly") {
                return { valid: false, reason: `Verb "sleeps" must be followed by "quietly"` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Extra words after "sleeps quietly"` };
            }
            if (conjIndex === -1 || cleanTokens[conjIndex] !== "and") {
                return { valid: false, reason: `"sleeps quietly" is only valid after "and"` };
            }
        } else if (verb === "writes") {
            if (sub !== "coder" && sub !== "robot") {
                return { valid: false, reason: `"${sub}" cannot write` };
            }
            if (part.length < 3) {
                return { valid: false, reason: `Verb "writes" requires an object` };
            }
            const obj = part[2];
            if (obj !== "code") {
                return { valid: false, reason: `"${sub}" writes only "code", not "${obj}"` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Extra words in writing clause` };
            }
        } else if (verb === "builds") {
            if (sub !== "coder" && sub !== "robot") {
                return { valid: false, reason: `"${sub}" cannot build` };
            }
            if (part.length < 3) {
                return { valid: false, reason: `Verb "builds" requires an object` };
            }
            const obj = part[2];
            if (obj !== "game") {
                return { valid: false, reason: `"${sub}" builds only "game", not "${obj}"` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Extra words in building clause` };
            }
        } else if (verb === "debugs") {
            if (sub !== "coder" && sub !== "robot") {
                return { valid: false, reason: `"${sub}" cannot debug` };
            }
            if (part.length < 3) {
                return { valid: false, reason: `Verb "debugs" requires an object` };
            }
            const obj = part[2];
            if (obj !== "bug") {
                return { valid: false, reason: `"${sub}" debugs only "bug", not "${obj}"` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Extra words in debugging clause` };
            }
        } else if (verb === "eats") {
            if (part.length < 3) {
                return { valid: false, reason: `Verb "eats" requires an object` };
            }
            const obj = part[2];
            if (sub === "mouse" && obj !== "cheese") {
                return { valid: false, reason: `Mouse eats only "cheese", not "${obj}"` };
            }
            if ((sub === "cat" || sub === "dog") && obj !== "fish") {
                return { valid: false, reason: `"${sub}" eats only "fish", not "${obj}"` };
            }
            if (sub !== "mouse" && sub !== "cat" && sub !== "dog") {
                return { valid: false, reason: `"${sub}" cannot eat` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Extra words in eating clause` };
            }
        } else if (verb === "chases") {
            if (part.length < 3) {
                return { valid: false, reason: `Verb "chases" requires an object` };
            }
            const obj = part[2];
            if (sub === "cat" && obj !== "mouse") {
                return { valid: false, reason: `Cat chases only "mouse", not "${obj}"` };
            }
            if (sub === "dog" && obj !== "cat") {
                return { valid: false, reason: `Dog chases only "cat", not "${obj}"` };
            }
            if (sub !== "cat" && sub !== "dog") {
                return { valid: false, reason: `"${sub}" cannot chase` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Extra words in chasing clause` };
            }
        } else if (verb === "watches") {
            if (part.length < 3) {
                return { valid: false, reason: `Verb "watches" requires an object` };
            }
            const obj = part[2];
            const validTargets = ["coder", "robot", "cat", "dog", "mouse", "screen"];
            if (!validTargets.includes(obj)) {
                return { valid: false, reason: `Invalid target of watch: "${obj}"` };
            }
            if (sub === obj) {
                return { valid: false, reason: `Subject "${sub}" cannot watch itself` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Extra words in watching clause` };
            }
        } else {
            return { valid: false, reason: `Unknown verb or structure: "${verb}"` };
        }
    }
    return { valid: true, reason: "Logical sentence ✅" };
};
