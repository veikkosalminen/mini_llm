import os
import json
import random

def alusta_orion_malli():
    # Tämä tiedosto sijaitsee models/orion/ -kansiossa
    orion_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. config.json
    config = {
        "d_model": 64,
        "n_heads": 4,
        "d_ff": 256,
        "n_layers": 3,
        "max_seq_len": 20,
        "dropout": 0.05,
        "vocab_path": "vocab.txt",
        "dataset_path": "dataset.txt",
        "word_types": {
            "verbs": ["scans", "explores", "analyzes", "observes", "detects", "discovers", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "attacks", "destroys", "harvests", "fears", "studies", "controls", "needs", "escapes", "ignores", "reaches"],
            "adjectives": ["large", "small", "distant", "unknown", "strange", "ancient", "broken", "active", "silent", "bright", "dark", "dangerous", "mysterious", "frozen", "toxic", "magnetic", "empty", "hidden"],
            "adverbs": ["quickly", "slowly", "quietly", "carefully", "secretly", "instantly", "safely", "constantly", "bravely", "silently"],
            "conjunctions": ["and", "but", "because", "although", "if", "while"],
            "prepositions": ["on", "near", "to", "with", "from", "into"],
            "articles": ["the", "a", "an"],
            "subjects": ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "robot", "drone", "creature", "cyborg", "rover", "probe"],
            "objects": ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "crystal", "signal", "engine", "shield", "laser", "data", "anomaly", "void", "nebula", "gravity", "radiation"]
        }
    }
    with open(os.path.join(orion_dir, 'config.json'), 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)

    # 2. vocab.txt (tarkalleen 100 sanaa)
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

    def generoi_clause(s, include_subject=True, is_simple=False):
        if is_simple:
            # Lyhyt intransitiivinen lause pituuden rajoittamiseksi
            v = "escapes" if s in ["astronaut", "commander", "pilot", "engineer", "scientist", "alien", "cyborg", "creature"] else "lands"
            
            adv = ""
            if random.random() < 0.4:
                adv = random.choice(adverbs)
            
            # Adverbi voi olla ennen verbiä tai verbin jälkeen
            if include_subject:
                sub_phrase = generoi_np(s)
                if adv:
                    if random.random() < 0.5:
                        return f"{sub_phrase} {adv} {v}"
                    else:
                        return f"{sub_phrase} {v} {adv}"
                return f"{sub_phrase} {v}"
            else:
                if adv:
                    if random.random() < 0.5:
                        return f"{adv} {v}"
                    else:
                        return f"{v} {adv}"
                return v

        # Valitaan sopivat verbit toimijalle
        if s in ["astronaut", "commander", "pilot", "engineer", "scientist"]:
            v = random.choice(["scans", "explores", "analyzes", "observes", "detects", "discovers", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "studies", "controls", "needs", "escapes", "ignores", "reaches"])
        elif s in ["robot", "drone", "rover", "probe"]:
            v = random.choice(["scans", "analyzes", "observes", "detects", "flies", "orbits", "lands", "enters", "repairs", "activates", "transmits", "protects", "controls"])
        else: # alien, creature, cyborg
            v = random.choice(["observes", "detects", "orbits", "enters", "attacks", "destroys", "harvests", "fears", "ignores", "reaches"])

        # Intransitiivinen käyttömahdollisuus tietyille verbeille (40% todennäköisyys)
        intransitive_capable = ["lands", "flies", "escapes", "enters", "orbits", "reaches"]
        is_intransitive = (v in intransitive_capable) and (random.random() < 0.4)

        o = None
        if not is_intransitive:
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

        # Valinnainen prepositio-fraasi (25% mahdollisuus, tai 100% jos intransitiivinen)
        prep_phrase = ""
        if is_intransitive or (random.random() < 0.25):
            # Valitaan prepositio ja siihen sopiva sijainti verbin perusteella
            if v in ["repairs", "activates", "attacks", "protects", "controls", "harvests", "scans", "studies"]:
                # with (työkalu tai kumppani)
                prep = "with"
                loc_pool = subjects + ["laser", "shield", "crystal", "data", "signal"]
                loc_pool = [x for x in loc_pool if x != s]
            elif v in ["transmits", "flies", "escapes", "reaches", "lands"]:
                # to / from (suunta)
                prep = random.choice(["to", "from"])
                loc_pool = ["spaceship", "station", "planet", "moon", "star", "galaxy", "asteroid", "void", "nebula"] + subjects
                loc_pool = [x for x in loc_pool if x != s]
            elif v in ["enters", "flies", "escapes", "reaches", "scans", "observes", "detects"]:
                # into (sisäänmeno)
                prep = "into"
                loc_pool = ["spaceship", "station", "void", "nebula", "anomaly"]
            elif v in ["lands", "observes", "detects", "scans", "explores"]:
                # on (pinnalla olo)
                prep = "on"
                loc_pool = ["planet", "moon", "asteroid", "spaceship", "station"]
            else:
                # near (yleinen läheisyys)
                prep = "near"
                loc_pool = ["spaceship", "station", "planet", "moon", "star", "asteroid", "crystal"] + subjects
                loc_pool = [x for x in loc_pool if x != s]
            
            loc = random.choice(loc_pool)
            prep_phrase = f" {prep} {generoi_np(loc)}"

        # Adverbi 40% todennäköisyydellä
        adv = ""
        adv_pos = "none" # "before" tai "end"
        if random.random() < 0.4:
            adv = random.choice(adverbs)
            adv_pos = "before" if random.random() < 0.5 else "end"

        # Lausekkeen kokoaminen
        sub_part = generoi_np(s) if include_subject else ""
        obj_part = generoi_np(o) if o else ""
        
        parts = []
        if include_subject:
            parts.append(sub_part)
            
        if adv and adv_pos == "before":
            parts.append(adv)
            
        parts.append(v)
        
        if obj_part:
            parts.append(obj_part)
        
        if prep_phrase:
            parts.append(prep_phrase.strip())
            
        if adv and adv_pos == "end":
            parts.append(adv)
            
        return " ".join(parts)

    sentences = []
    for _ in range(1000):
        tyyppi = random.choice(["and", "but", "because", "although", "while", "if"])
        s1 = random.choice(subjects)
        s2 = random.choice(subjects)
        
        # Päätetään subject ellipsis jos s1 == s2 ja konjunktio on and/but
        use_ellipsis = (s1 == s2) and (tyyppi in ["and", "but"]) and (random.random() < 0.7)
        
        c1 = generoi_clause(s1, include_subject=True)
        c2 = generoi_clause(s2, include_subject=(not use_ellipsis))
        
        sent = f"<bos> {c1} {tyyppi} {c2} <eos>"
        words = sent.split()
        
        # Pidetään lauseet alle 18 sanassa (ennen erikoistokeneita)
        if len(words) > 18:
            c2_simple = generoi_clause(s2, include_subject=(not use_ellipsis), is_simple=True)
            sent = f"<bos> {c1} {tyyppi} {c2_simple} <eos>"
            
        sentences.append(sent)

    with open(os.path.join(orion_dir, 'dataset.txt'), 'w', encoding='utf-8') as f:
        f.write("\n".join(sentences) + "\n")

    print("Orion model files generated successfully inside models/orion/ with natural language grammar!")

if __name__ == '__main__':
    alusta_orion_malli()
