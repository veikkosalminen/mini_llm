window.modelValidators = window.modelValidators || {};
window.modelValidators["lumi"] = function(sentence) {
    const tokens = sentence.trim().split(/\s+/);
    const cleanTokens = tokens.filter(t => t !== "<bos>" && t !== "<eos>" && t !== "<pad>");
    
    const jaIndex = cleanTokens.indexOf("ja");
    
    let parts = [];
    if (jaIndex === -1) {
        parts = [cleanTokens];
    } else {
        parts = [
            cleanTokens.slice(0, jaIndex),
            cleanTokens.slice(jaIndex + 1)
        ];
    }
    
    for (let part of parts) {
        if (part.length === 0) {
            return { valid: false, reason: "Tyhjä lauseenosa" };
        }
        
        const sub = part[0];
        const validSubjects = ["kissa", "koira", "hiiri"];
        if (!validSubjects.includes(sub)) {
            return { valid: false, reason: `Virheellinen subjekti: "${sub}"` };
        }
        
        if (part.length < 2) {
            return { valid: false, reason: `Puuttuva verbi lauseessa` };
        }
        
        const verb = part[1];
        if (verb === "nukkuu") {
            if (part.length < 3 || part[2] !== "hyvin") {
                return { valid: false, reason: `Verbi "nukkuu" vaatii sanan "hyvin" peräänsä` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Ylimääräisiä sanoja nukkumislausumassa` };
            }
        } else if (verb === "syö") {
            if (part.length < 3) {
                return { valid: false, reason: `Verbi "syö" vaatii kohteen` };
            }
            const obj = part[2];
            if (sub === "hiiri" && obj !== "juusto") {
                return { valid: false, reason: `Hiiri ei syö kohdetta "${obj}" (odotettiin "juusto")` };
            }
            if ((sub === "kissa" || sub === "koira") && obj !== "kala") {
                return { valid: false, reason: `"${sub}" ei syö kohdetta "${obj}" (odotettiin "kala")` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Ylimääräisiä sanoja syömislausumassa` };
            }
        } else if (verb === "jahtaa") {
            if (sub === "hiiri") {
                return { valid: false, reason: `Hiiri ei voi jahdata ketään` };
            }
            if (part.length < 3) {
                return { valid: false, reason: `Verbi "jahtaa" vaatii kohteen` };
            }
            const obj = part[2];
            if (sub === "kissa" && obj !== "hiiri") {
                return { valid: false, reason: `Kissa ei jahtaa kohdetta "${obj}" (odotettiin "hiiri")` };
            }
            if (sub === "koira" && obj !== "kissa") {
                return { valid: false, reason: `Koira ei jahtaa kohdetta "${obj}" (odotettiin "kissa")` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Ylimääräisiä sanoja jahtauslausumassa` };
            }
        } else if (verb === "katsoo") {
            if (part.length < 3) {
                return { valid: false, reason: `Verbi "katsoo" vaatii kohteen` };
            }
            const obj = part[2];
            if (!validSubjects.includes(obj)) {
                return { valid: false, reason: `Virheellinen katseen kohde: "${obj}"` };
            }
            if (sub === obj) {
                return { valid: false, reason: `Subjekti "${sub}" ei voi katsoa itseään` };
            }
            if (part.length > 3) {
                return { valid: false, reason: `Ylimääräisiä sanoja katselulausumassa` };
            }
        } else {
            return { valid: false, reason: `Tuntematon verbi tai rakenne: "${verb}"` };
        }
    }
    
    return { valid: true, reason: "Looginen lause ✅" };
};
