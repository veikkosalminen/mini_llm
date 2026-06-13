import os
import json
import random

def alusta_orion_malli():
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(project_dir, 'models')
    orion_dir = os.path.join(models_dir, 'orion')
    os.makedirs(orion_dir, exist_ok=True)
    
    # 1. config.json
    config = {
        "d_model": 64,
        "n_heads": 4,
        "d_ff": 128,
        "n_layers": 3,
        "max_seq_len": 20,
        "dropout": 0.1,
        "vocab_path": "vocab.txt",
        "dataset_path": "dataset.txt"
    }
    with open(os.path.join(orion_dir, 'config.json'), 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)

    # 2. vocab.txt (tarkalleen 100 sanaa)
    # Korvattu 'inspects' sanalla 'an'
    vocab = [
        "<pad>", "<bos>", "<eos>",
        "the", "a", "an", "astronaut", "commander", "pilot", "engineer", "scientist", "alien", "robot", "drone", "creature", "cyborg",
        "spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "crystal", "signal", "engine", "shield", "laser", "data", "anomaly", "void", "nebula", "gravity", "radiation", "rover", "probe",
        "scans", "explores", "analyzes", "observes", "detects", "discovers", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "attacks", "destroys", "harvests", "fears", "studies", "controls", "needs", "escapes", "ignores", "reaches",
        "large", "small", "distant", "unknown", "strange", "ancient", "broken", "active", "silent", "bright", "dark", "dangerous", "mysterious", "frozen", "toxic", "magnetic", "empty", "hidden",
        "quickly", "slowly", "quietly", "carefully", "secretly", "instantly", "safely", "constantly", "bravely", "silently",
        "and", "but", "because", "although", "if", "while",
        "on", "near", "to", "with", "from", "into"
    ]
    with open(os.path.join(orion_dir, 'vocab.txt'), 'w', encoding='utf-8') as f:
        f.write("\n".join(vocab) + "\n")

    # 3. Generoidaan dataset.txt (1000 lausetta)
    subjects = ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "robot", "drone", "creature", "cyborg", "rover", "probe"]
    objects = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "crystal", "signal", "engine", "shield", "laser", "data", "anomaly", "void", "nebula", "gravity", "radiation"]
    adjectives = ["large", "small", "distant", "unknown", "strange", "ancient", "broken", "active", "silent", "bright", "dark", "dangerous", "mysterious", "frozen", "toxic", "magnetic", "empty", "hidden"]
    adverbs = ["quickly", "slowly", "quietly", "carefully", "secretly", "instantly", "safely", "constantly", "bravely", "silently"]
    prepositions = ["on", "near", "to", "with", "from", "into"]

    def get_article(next_word):
        vowels = ('a', 'e', 'i', 'o', 'u')
        if next_word[0].lower() in vowels:
            return "an"
        return "a"

    def generoi_np(noun, random_adj_chance=0.5):
        adj = ""
        if random.random() < random_adj_chance:
            adj = random.choice(adjectives) + " "
        
        det = random.choice(['the', 'a'])
        if det == 'a':
            first_word = adj.strip() if adj else noun
            det = get_article(first_word)
            
        return f"{det} {adj}{noun}".strip()

    def generoi_clause(s):
        # Valitaan sopivat verbit toimijalle
        if s in ["astronaut", "commander", "pilot", "engineer", "scientist"]:
            v = random.choice(["scans", "explores", "analyzes", "observes", "detects", "discovers", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "studies", "controls", "needs", "escapes", "ignores", "reaches"])
        elif s in ["robot", "drone", "rover", "probe"]:
            v = random.choice(["scans", "analyzes", "observes", "detects", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "controls"])
        else: # alien, creature, cyborg
            v = random.choice(["observes", "detects", "orbits", "enters", "attacks", "destroys", "harvests", "fears", "ignores", "reaches"])

        # Valitaan kohde verbin perusteella
        if v in ["scans", "analyzes", "observes", "detects", "studies"]:
            o = random.choice(["planet", "moon", "star", "galaxy", "asteroid", "crystal", "signal", "anomaly", "void", "nebula", "radiation", "gravity"])
        elif v in ["flies", "orbits", "lands", "enters", "reaches", "escapes"]:
            o = random.choice(["planet", "moon", "star", "galaxy", "asteroid", "void", "nebula", "spaceship", "station", "gravity"])
        elif v in ["repairs", "activates"]:
            o = random.choice(["spaceship", "station", "engine", "shield", "laser"])
        elif v == "transmits":
            o = random.choice(["signal", "data"])
        elif v in ["protects", "attacks", "destroys"]:
            o = random.choice([x for x in subjects if x != s])
        elif v == "harvests":
            o = random.choice(["crystal", "data", "star"])
        elif v == "controls":
            o = random.choice(["spaceship", "station", "robot", "drone", "rover", "probe", "engine"])
        elif v == "needs":
            o = random.choice(["data", "signal", "shield", "laser", "engine", "gravity"])
        elif v == "fears":
            o = random.choice(["anomaly", "void", "radiation", "alien", "creature"])
        else:
            o = random.choice(objects)

        # Rakennetaan lauseke
        sub_phrase = generoi_np(s)

        verb_phrase = ""
        if random.random() < 0.4:
            verb_phrase += f"{random.choice(adverbs)} "
        verb_phrase += v

        obj_phrase = generoi_np(o)

        # Valinnainen prepositio-fraasi (25% mahdollisuus)
        prep_phrase = ""
        if random.random() < 0.25:
            prep = random.choice(prepositions)
            if prep == "into":
                loc_pool = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "void", "nebula", "anomaly"]
            elif prep == "on":
                loc_pool = ["spaceship", "station", "planet", "moon", "asteroid"]
            elif prep in ["to", "from"]:
                loc_pool = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "void", "nebula"] + subjects
            elif prep == "with":
                loc_pool = subjects + ["crystal", "data", "signal", "laser", "shield"]
            else: # near
                loc_pool = ["spaceship", "station", "planet", "moon", "star", "asteroid", "crystal", "engine", "shield", "laser"] + subjects
            
            loc = random.choice(loc_pool)
            prep_phrase = f" {prep} {generoi_np(loc)}"

        return f"{sub_phrase} {verb_phrase} {obj_phrase}{prep_phrase}"

    sentences = []
    for _ in range(1000):
        tyyppi = random.choice(["and", "but", "because", "although", "while", "if"])
        s1 = random.choice(subjects)
        c1 = generoi_clause(s1)
        s2 = random.choice(subjects)
        c2 = generoi_clause(s2)
        
        # Pidetään lauseet alle 18 sanassa
        sent = f"<bos> {c1} {tyyppi} {c2} <eos>"
        words = sent.split()
        if len(words) > 18:
            c2_simple = f"the {s2} escapes" if s2 in ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "cyborg", "creature"] else f"the {s2} lands"
            sent = f"<bos> {c1} {tyyppi} {c2_simple} <eos>"
            
        sentences.append(sent)

    with open(os.path.join(orion_dir, 'dataset.txt'), 'w', encoding='utf-8') as f:
        f.write("\n".join(sentences) + "\n")

    print("Orion model files generated successfully with English indefinite articles and preposition logic!")

if __name__ == '__main__':
    alusta_orion_malli()
