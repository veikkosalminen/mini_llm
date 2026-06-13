import os
import json
import random

def alusta_frost_malli():
    # Nykyinen tiedosto on utils-kansiossa
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(project_dir, 'models')
    frost_dir = os.path.join(models_dir, 'frost')
    os.makedirs(frost_dir, exist_ok=True)
    
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
    with open(os.path.join(frost_dir, 'config.json'), 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)

    # 2. vocab.txt
    vocab = [
        "<pad>", "<bos>", "<eos>",
        "coder", "robot", "cat", "dog", "mouse",
        "code", "game", "fish", "cheese", "screen", "bug",
        "writes", "builds", "chases", "watches", "debugs", "eats",
        "and", "but", "because", "sleeps", "quietly"
    ]
    with open(os.path.join(frost_dir, 'vocab.txt'), 'w', encoding='utf-8') as f:
        f.write("\n".join(vocab) + "\n")

    # 3. Generoidaan dataset.txt (1000 lausetta)
    subjects = ["coder", "robot", "cat", "dog", "mouse"]
    
    def generoi_clause(s):
        if s == "coder" or s == "robot":
            v = random.choice(["writes", "builds", "debugs", "watches"])
            if v == "writes":
                o = "code"
            elif v == "builds":
                o = "game"
            elif v == "debugs":
                o = "bug"
            else: # watches
                o = "screen"
        elif s == "cat":
            v = random.choice(["chases", "eats", "watches"])
            if v == "chases":
                o = "mouse"
            elif v == "eats":
                o = "fish"
            else: # watches
                o = random.choice([x for x in ["coder", "robot", "dog", "mouse", "screen"] if x != s])
        elif s == "dog":
            v = random.choice(["chases", "eats", "watches"])
            if v == "chases":
                o = "cat"
            elif v == "eats":
                o = "fish"
            else: # watches
                o = random.choice([x for x in ["coder", "robot", "cat", "mouse", "screen"] if x != s])
        elif s == "mouse":
            v = random.choice(["eats", "watches"])
            if v == "eats":
                o = "cheese"
            else: # watches
                o = random.choice([x for x in ["coder", "robot", "cat", "dog", "screen"] if x != s])
        return f"{s} {v} {o}"

    sentences = []
    for _ in range(1000):
        tyyppi = random.choice(["A", "B", "C"])
        s1 = random.choice(subjects)
        c1 = generoi_clause(s1)
        
        if tyyppi == "A":
            s2 = random.choice(subjects)
            sent = f"<bos> {c1} and {s2} sleeps quietly <eos>"
        elif tyyppi == "B":
            s2 = random.choice(subjects)
            c2 = generoi_clause(s2)
            sent = f"<bos> {c1} but {c2} <eos>"
        else: # C
            s2 = random.choice(subjects)
            c2 = generoi_clause(s2)
            sent = f"<bos> {c1} because {c2} <eos>"
        sentences.append(sent)

    with open(os.path.join(frost_dir, 'dataset.txt'), 'w', encoding='utf-8') as f:
        f.write("\n".join(sentences) + "\n")

    print("Frost model files generated successfully!")

if __name__ == '__main__':
    alusta_frost_malli()
