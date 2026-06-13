const fs = require('fs');
const path = require('path');

// Mock window object to load validator.js
global.window = {};
const validatorPath = path.join(__dirname, 'validator.js');
const validatorCode = fs.readFileSync(validatorPath, 'utf8');
eval(validatorCode);

const orionValidator = global.window.modelValidators.orion;

const seedSentences = [
    "<bos> an astronaut carefully scans the unknown anomaly and repairs the engine <eos>",
    "<bos> the scientist explores the planet carefully because the commander transmits the data <eos>",
    "<bos> a cyborg attacks the commander with a laser although the drone protects the pilot <eos>",
    "<bos> the alien escapes from the spaceship while the robot activates the shield <eos>",
    "<bos> the commander lands on the moon safely but a creature enters the void <eos>",
    "<bos> a probe analyzes the star near the galaxy quietly if the engineer needs data <eos>",
    "<bos> an engineer repairs the engine with a crystal while the pilot flies the spaceship <eos>",
    "<bos> the robot transmits the signal to the pilot quietly and the pilot reaches the station <eos>",
    "<bos> the pilot flies to the planet because a creature attacks the robot <eos>",
    "<bos> the scientist studies the radiation near the moon safely while the probe scans the void <eos>",
    "<bos> the alien fears the void into the anomaly but a robot repairs the shield <eos>",
    "<bos> a robot activates the shield with a crystal quickly although the alien attacks the drone <eos>",
    "<bos> the commander scans the bright star near the planet and transmits the data <eos>",
    "<bos> a pilot flies the spaceship near the asteroid silently and lands on the planet <eos>",
    "<bos> the engineer repairs the engine with a laser safely because the drone controls the engine <eos>",
    "<bos> the alien attacks the commander with a shield although the pilot escapes from the planet <eos>",
    "<bos> an astronaut enters the spaceship into the nebula because the pilot flies the spaceship <eos>",
    "<bos> the scientist studies the toxic radiation safely and ignores the danger <eos>",
    "<bos> the drone protects the pilot with a shield while the engineer repairs the shield <eos>",
    "<bos> the rover lands the probe on the planet quickly and scans the crystal <eos>",
    "<bos> the pilot reaches the distant station safely but the commander escapes from the alien <eos>",
    "<bos> the commander observes the empty void near the star and detects the signal <eos>",
    "<bos> the scientist studies the data with a robot carefully and discovers the crystal <eos>",
    "<bos> a robot controls the spaceship with data because the engineer needs the engine <eos>",
    "<bos> the alien harvests the crystal with a drone silently while the cyborg fears the radiation <eos>",
    "<bos> the commander protects the robot with a shield bravely and enters the station <eos>",
    "<bos> the pilot orbits the frozen moon near the planet quietly and lands on the moon <eos>",
    "<bos> the probe transmits the signal to the station safely because the scientist studies the signal <eos>",
    "<bos> the engineer activates the engine with a crystal instantly but the cyborg destroys the shield <eos>",
    "<bos> the commander scans the anomaly near the galaxy and discovers the void <eos>",
    "<bos> the pilot flies the spaceship into the void safely but the commander needs the engine <eos>",
    "<bos> the robot protects the engineer with a shield and transmits the data <eos>",
    "<bos> the drone scans the crystal near the asteroid quickly and harvests the crystal <eos>",
    "<bos> the commander repairs the shield with a laser safely while the drone activates the laser <eos>",
    "<bos> the scientist studies the mysterious anomaly near the moon and analyzes the data <eos>",
    "<bos> the cyborg attacks the robot with a laser but the pilot escapes from the cyborg <eos>",
    "<bos> the engineer controls the robot near the spaceship and repairs the shield <eos>",
    "<bos> the pilot flies the spaceship to the station quickly while the commander observes the drone <eos>",
    "<bos> the scientist discovers the crystal near the moon safely and transmits the signal <eos>",
    "<bos> the robot repairs the spaceship with a laser because the engineer needs the engine <eos>",
    "<bos> the commander protects the robot from the alien bravely and escapes from the spaceship <eos>",
    "<bos> the astronaut observes the galaxy near the star and lands on the planet <eos>",
    "<bos> the scientist studies the data with a robot carefully and reaches the station <eos>",
    "<bos> the pilot flies the spaceship to the planet safely because the commander needs gravity <eos>",
    "<bos> the scientist studies the crystal near the planet safely and harvests the crystal <eos>",
    "<bos> the commander protects the cyborg with a shield and protects the astronaut <eos>",
    "<bos> the pilot orbits the star near the galaxy quietly while the probe scans the star <eos>",
    "<bos> the engineer activates the shield with a laser instantly but the alien destroys the shield <eos>",
    "<bos> the scientist studies the radiation near the asteroid safely and scans the crystal <eos>",
    "<bos> the pilot flies the spaceship into the nebula safely but the commander needs the engine <eos>"
];

const adjectives = ["large", "small", "distant", "unknown", "strange", "ancient", "broken", "active", "silent", "bright", "dark", "dangerous", "mysterious", "frozen", "toxic", "magnetic", "empty", "hidden"];
const adverbs = ["quickly", "slowly", "quietly", "carefully", "secretly", "instantly", "safely", "constantly", "bravely", "silently"];
const articles = ["the", "a", "an"];

function fixArticles(tokens) {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    for (let i = 0; i < tokens.length - 1; i++) {
        if (tokens[i] === 'a' || tokens[i] === 'an') {
            const nextWord = tokens[i + 1];
            const startsWithVowel = vowels.includes(nextWord[0].toLowerCase());
            tokens[i] = startsWithVowel ? 'an' : 'a';
        }
    }
    return tokens;
}

function mutateSentence(sentence) {
    const tokens = sentence.trim().split(/\s+/);
    
    const objectsList = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "crystal", "signal", "engine", "shield", "laser", "data", "anomaly", "void", "nebula", "gravity", "radiation"];
    const humans = ["astronaut", "commander", "pilot", "engineer", "scientist"];
    const machines = ["robot", "drone", "rover", "probe"];
    const others = ["alien", "creature", "cyborg"];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Mutate articles
        if (articles.includes(token)) {
            if (Math.random() < 0.3) {
                tokens[i] = articles[Math.floor(Math.random() * articles.length)];
            }
        }
        // Mutate adjectives
        else if (adjectives.includes(token)) {
            if (Math.random() < 0.6) {
                tokens[i] = adjectives[Math.floor(Math.random() * adjectives.length)];
            }
        }
        // Mutate adverbs
        else if (adverbs.includes(token)) {
            if (Math.random() < 0.6) {
                tokens[i] = adverbs[Math.floor(Math.random() * adverbs.length)];
            }
        }
        // Mutate human subjects
        else if (humans.includes(token)) {
            if (Math.random() < 0.4) {
                tokens[i] = humans[Math.floor(Math.random() * humans.length)];
            }
        }
        // Mutate machine subjects
        else if (machines.includes(token)) {
            if (Math.random() < 0.4) {
                tokens[i] = machines[Math.floor(Math.random() * machines.length)];
            }
        }
        // Mutate alien/cyborg subjects
        else if (others.includes(token)) {
            if (Math.random() < 0.4) {
                tokens[i] = others[Math.floor(Math.random() * others.length)];
            }
        }
        // Mutate objects/locations
        else if (objectsList.includes(token)) {
            if (Math.random() < 0.4) {
                tokens[i] = objectsList[Math.floor(Math.random() * objectsList.length)];
            }
        }
    }
    
    const fixedTokens = fixArticles(tokens);
    return fixedTokens.join(" ");
}

function generateDataset(targetCount) {
    const dataset = new Set();
    const seedArray = [];
    
    console.log("Validating seed sentences...");
    for (let seed of seedSentences) {
        const res = orionValidator(seed);
        if (res.valid) {
            dataset.add(seed);
            seedArray.push(seed);
        }
    }
    
    console.log(`Initialized dataset with ${dataset.size} valid seed sentences.`);
    
    let attempts = 0;
    console.log(`Generating mutations to reach ${targetCount} lines...`);
    
    while (dataset.size < targetCount && attempts < 5000000) {
        attempts++;
        const randomSeed = seedArray[Math.floor(Math.random() * seedArray.length)];
        const mutated = mutateSentence(randomSeed);
        
        if (dataset.has(mutated)) continue;
        
        const res = orionValidator(mutated);
        if (res.valid) {
            dataset.add(mutated);
            seedArray.push(mutated); // Add mutated valid sentence back to seedArray!
            
            if (dataset.size % 2000 === 0) {
                console.log(`Generated ${dataset.size} valid sentences...`);
            }
        }
    }
    
    console.log(`Dataset generation finished. Total valid sentences: ${dataset.size} (Attempts: ${attempts})`);
    return Array.from(dataset);
}

// Generate 20,000 sentences
const targetCount = 20000;
const finalDataset = generateDataset(targetCount);

// Write to dataset.txt
const datasetFilePath = path.join(__dirname, 'dataset.txt');
fs.writeFileSync(datasetFilePath, finalDataset.join("\n") + "\n", 'utf8');
console.log(`Wrote ${finalDataset.length} sentences to ${datasetFilePath} successfully!`);
