import random
import threading
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from flask import Flask, request, jsonify, send_file

import json
import os
import shutil
from utils.tokenizer import LumiTokenizer
from utils.dataset import LumiDataset, lataa_tai_luo_koulutusaineisto
from utils.model import MiniLLM

# Laitteen valinta (GPU / MPS / CPU)
device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))

# Alustetaan kansiorakenne
def alusta_mallikansiot():
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(project_dir, 'models')
    lumi_dir = os.path.join(models_dir, 'lumi')
    os.makedirs(lumi_dir, exist_ok=True)
    
    # 1. config.json siirto
    dst_config = os.path.join(lumi_dir, 'config.json')
    if not os.path.exists(dst_config):
        src_config = os.path.join(project_dir, 'config.json')
        if os.path.exists(src_config):
            try:
                shutil.copy(src_config, dst_config)
                with open(dst_config, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                cfg["vocab_path"] = "vocab.txt"
                cfg["dataset_path"] = "dataset.txt"
                with open(dst_config, 'w', encoding='utf-8') as f:
                    json.dump(cfg, f, indent=2)
            except Exception:
                pass
        else:
            default_cfg = {
                "d_model": 32,
                "n_heads": 2,
                "d_ff": 64,
                "n_layers": 2,
                "max_seq_len": 20,
                "dropout": 0.1,
                "vocab_path": "vocab.txt",
                "dataset_path": "dataset.txt"
            }
            with open(dst_config, 'w', encoding='utf-8') as f:
                json.dump(default_cfg, f, indent=2)

    # 2. vocab.txt siirto
    dst_vocab = os.path.join(lumi_dir, 'vocab.txt')
    if not os.path.exists(dst_vocab):
        src_vocab = os.path.join(project_dir, 'vocab.txt')
        if os.path.exists(src_vocab):
            try:
                shutil.copy(src_vocab, dst_vocab)
            except Exception:
                pass
        else:
            default_vocab = ["<pad>", "<bos>", "<eos>", "kissa", "koira", "hiiri", "kala", "juusto", "katsoo", "jahtaa", "syö", "nukkuu", "ja", "hyvin"]
            with open(dst_vocab, 'w', encoding='utf-8') as f:
                f.write("\n".join(default_vocab) + "\n")

    # 3. dataset.txt siirto
    dst_dataset = os.path.join(lumi_dir, 'dataset.txt')
    if not os.path.exists(dst_dataset):
        src_dataset = os.path.join(project_dir, 'dataset.txt')
        if os.path.exists(src_dataset):
            try:
                shutil.copy(src_dataset, dst_dataset)
            except Exception:
                pass

alusta_mallikansiot()

# Ladataan konfiguraatio aktiiviselle mallille
current_model_name = "lumi"
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_dir = os.path.join(project_dir, 'models', current_model_name)
config_path = os.path.join(model_dir, 'config.json')

if os.path.exists(config_path):
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except Exception:
        config = {}
else:
    config = {}

d_model = config.get("d_model", 32)
n_heads = config.get("n_heads", 2)
d_ff = config.get("d_ff", 64)
n_layers = config.get("n_layers", 2)
max_seq_len = config.get("max_seq_len", 20)
dropout = config.get("dropout", 0.1)
vocab_path = config.get("vocab_path", "vocab.txt")
dataset_path = config.get("dataset_path", "dataset.txt")

if vocab_path and not os.path.isabs(vocab_path):
    vocab_path = os.path.join(model_dir, vocab_path)
if dataset_path and not os.path.isabs(dataset_path):
    dataset_path = os.path.join(model_dir, dataset_path)

# Tarkastetaan d_model % n_heads == 0. Jos ei, palataan turvallisiin oletusarvoihin.
if d_model % n_heads != 0:
    print(f"VAROITUS: Virheelliset parametrit d_model={d_model} ja n_heads={n_heads} mallissa '{current_model_name}' (ei jaollinen). Palataan oletusarvoihin d_model=32, n_heads=2.")
    d_model = 32
    n_heads = 2
    d_ff = 64

# Alustetaan globaalit oliot
tokenizer = LumiTokenizer(vocab_path=vocab_path)
raakadata = lataa_tai_luo_koulutusaineisto(dataset_path=dataset_path, koko=1000)
dataset = LumiDataset(raakadata, tokenizer, max_len=max_seq_len)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

try:
    model = MiniLLM(
        vocab_size=tokenizer.vocab_size,
        d_model=d_model,
        n_heads=n_heads,
        d_ff=d_ff,
        n_layers=n_layers,
        max_seq_len=max_seq_len,
        dropout=dropout
    ).to(device)
except Exception as e:
    print(f"Virhe alustettaessa mallia konfiguraatiolla, palataan oletuksiin: {e}")
    d_model = 32
    n_heads = 2
    d_ff = 64
    n_layers = 2
    model = MiniLLM(
        vocab_size=tokenizer.vocab_size,
        d_model=d_model,
        n_heads=n_heads,
        d_ff=d_ff,
        n_layers=n_layers,
        max_seq_len=max_seq_len,
        dropout=dropout
    ).to(device)

optimizer = optim.Adam(model.parameters(), lr=0.005)
criterion = nn.CrossEntropyLoss(ignore_index=tokenizer.pad_token_id)

# Koulutuksen tilan seuranta
training_lock = threading.Lock()
training_active = False
training_thread = None

state = {
    "epoch": 0,
    "loss": 0.0,
    "loss_history": [],
    "device": str(device)
}

app = Flask(__name__, static_folder='../static', static_url_path='/static')

# Palvellaan index.html juuresta
@app.route('/')
def index():
    return app.send_static_file('index.html')

# Reitti mallin omalle validaattorifilulle
@app.route('/models/<model_name>/validator.js')
def get_validator(model_name):
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    validator_path = os.path.join(project_dir, 'models', model_name, 'validator.js')
    if os.path.exists(validator_path):
        return send_file(validator_path, mimetype='application/javascript')
    else:
        # Palautetaan tyhjä perusvalidaattori, jos omaa ei ole
        return "window.modelValidators = window.modelValidators || {};", 200, {'Content-Type': 'application/javascript'}

# Palvellaan sanasto.html
@app.route('/sanasto')
def sanasto():
    return app.send_static_file('sanasto.html')

# Palvellaan data.html
@app.route('/data')
def data_page():
    return app.send_static_file('data.html')

# API-reitti koulutusdatalle
@app.route('/api/dataset', methods=['GET'])
def get_dataset():
    global raakadata
    return jsonify({
        "dataset": raakadata,
        "vocab": tokenizer.vocab
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    global training_active
    return jsonify({
        "epoch": state["epoch"],
        "loss": state["loss"],
        "loss_history": state["loss_history"],
        "training_active": training_active,
        "device": state["device"],
        "vocab": tokenizer.vocab,
        "n_layers": n_layers,
        "n_heads": n_heads,
        "d_model": d_model,
        "d_ff": d_ff,
        "max_seq_len": max_seq_len,
        "current_model": current_model_name
    })

def background_train():
    global training_active
    while True:
        with training_lock:
            if not training_active:
                break
                
            model.train()
            epoch_loss = 0
            for x, y in dataloader:
                x, y = x.to(device), y.to(device)
                optimizer.zero_grad()
                logits = model(x)
                loss = criterion(logits.view(-1, logits.size(-1)), y.view(-1))
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
                
            state["epoch"] += 1
            state["loss"] = epoch_loss / len(dataloader)
            state["loss_history"].append(state["loss"])
            
        time.sleep(0.05) # Lyhyt tauko antaa Flask-säikeille aikaa käyttää mallia

@app.route('/api/train', methods=['POST'])
def control_train():
    global training_active, training_thread
    data = request.json or {}
    action = data.get("action")
    
    if action == "start":
        with training_lock:
            if not training_active:
                training_active = True
                training_thread = threading.Thread(target=background_train, daemon=True)
                training_thread.start()
        return jsonify({"status": "Training started", "training_active": training_active})
        
    elif action == "stop":
        with training_lock:
            training_active = False
        return jsonify({"status": "Training stopped", "training_active": training_active})
        
    elif action == "step":
        # Suoritetaan yksi epoch synkronisesti (lukon sisällä)
        epochs_to_run = data.get("epochs", 1)
        with training_lock:
            model.train()
            for _ in range(epochs_to_run):
                epoch_loss = 0
                for x, y in dataloader:
                    x, y = x.to(device), y.to(device)
                    optimizer.zero_grad()
                    logits = model(x)
                    loss = criterion(logits.view(-1, logits.size(-1)), y.view(-1))
                    loss.backward()
                    optimizer.step()
                    epoch_loss += loss.item()
                    
                state["epoch"] += 1
                state["loss"] = epoch_loss / len(dataloader)
                state["loss_history"].append(state["loss"])
                
        return jsonify({
            "status": f"Trained {epochs_to_run} epoch(s)",
            "epoch": state["epoch"],
            "loss": state["loss"],
            "loss_history": state["loss_history"]
        })
        
    return jsonify({"error": "Invalid action"}), 400

@app.route('/api/reset', methods=['POST'])
def reset_model():
    global model, optimizer, training_active, config, current_model_name
    global d_model, n_heads, d_ff, n_layers, max_seq_len, dropout, vocab_path, dataset_path
    global tokenizer, raakadata, dataset, dataloader, criterion
    with training_lock:
        training_active = False # Pysäytetään koulutus
        
        # 1. Luetaan uusi konfiguraatio väliaikaisesti aktiivisesta mallikansiosta
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_dir = os.path.join(project_dir, 'models', current_model_name)
        config_path = os.path.join(model_dir, 'config.json')
        temp_config = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    temp_config = json.load(f)
            except Exception as e:
                return jsonify({"error": f"Virhe luettaessa config.json tiedostoa mallissa '{current_model_name}': {str(e)}"}), 400
        else:
            return jsonify({"error": f"config.json tiedostoa ei löydy mallille '{current_model_name}'!"}), 400

        t_d_model = temp_config.get("d_model", 32)
        t_n_heads = temp_config.get("n_heads", 2)
        t_d_ff = temp_config.get("d_ff", 64)
        t_n_layers = temp_config.get("n_layers", 2)
        t_max_seq_len = temp_config.get("max_seq_len", 20)
        t_dropout = temp_config.get("dropout", 0.1)
        
        t_vocab_path = temp_config.get("vocab_path", "vocab.txt")
        t_dataset_path = temp_config.get("dataset_path", "dataset.txt")

        if t_vocab_path and not os.path.isabs(t_vocab_path):
            t_vocab_path = os.path.join(model_dir, t_vocab_path)
        if t_dataset_path and not os.path.isabs(t_dataset_path):
            t_dataset_path = os.path.join(model_dir, t_dataset_path)

        # Tarkastetaan d_model % n_heads == 0
        if t_d_model % t_n_heads != 0:
            return jsonify({
                "error": f"Konfiguraatiovirhe: 'd_model' ({t_d_model}) täytyy olla tasan jaettavissa 'n_heads' ({t_n_heads}) arvolla! Valitse lukuja siten, että jako menee tasan (esim. d_model=64 ja n_heads=4 tai 2. Jos haluat n_heads=3, d_model voi olla esim. 60)."
            }), 400

        try:
            # Alustetaan uudet oliot väliaikaisiin muuttujiin
            t_tokenizer = LumiTokenizer(vocab_path=t_vocab_path)
            t_raakadata = lataa_tai_luo_koulutusaineisto(dataset_path=t_dataset_path, koko=1000)
            t_dataset = LumiDataset(t_raakadata, t_tokenizer, max_len=t_max_seq_len)
            t_dataloader = DataLoader(t_dataset, batch_size=32, shuffle=True)

            t_model = MiniLLM(
                vocab_size=t_tokenizer.vocab_size,
                d_model=t_d_model,
                n_heads=t_n_heads,
                d_ff=t_d_ff,
                n_layers=t_n_layers,
                max_seq_len=t_max_seq_len,
                dropout=t_dropout
            ).to(device)
            
            t_optimizer = optim.Adam(t_model.parameters(), lr=0.005)
            t_criterion = nn.CrossEntropyLoss(ignore_index=t_tokenizer.pad_token_id)
        except Exception as e:
            return jsonify({"error": f"Virhe alustettaessa mallia: {str(e)}"}), 400

        # Päivitetään globaalit muuttujat onnistuneen alustuksen jälkeen
        config = temp_config
        d_model = t_d_model
        n_heads = t_n_heads
        d_ff = t_d_ff
        n_layers = t_n_layers
        max_seq_len = t_max_seq_len
        dropout = t_dropout
        vocab_path = t_vocab_path
        dataset_path = t_dataset_path

        tokenizer = t_tokenizer
        raakadata = t_raakadata
        dataset = t_dataset
        dataloader = t_dataloader
        model = t_model
        optimizer = t_optimizer
        criterion = t_criterion

        state["epoch"] = 0
        state["loss"] = 0.0
        state["loss_history"] = []
        
    return jsonify({"status": "Model reset successfully", "epoch": 0, "loss_history": []})

@app.route('/api/models', methods=['GET'])
def get_models():
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(project_dir, 'models')
    models_list = []
    if os.path.exists(models_dir):
        for name in os.listdir(models_dir):
            full_path = os.path.join(models_dir, name)
            if os.path.isdir(full_path):
                # Varmistetaan, että kansiossa on config.json
                if os.path.exists(os.path.join(full_path, 'config.json')):
                    models_list.append(name)
    # Lajitellaan aakkosjärjestykseen, mutta lumi ensimmäisenä jos se löytyy
    models_list.sort()
    if "lumi" in models_list:
        models_list.remove("lumi")
        models_list.insert(0, "lumi")
    return jsonify({"models": models_list})

@app.route('/api/select_model', methods=['POST'])
def select_model():
    global current_model_name, model, optimizer, training_active, config
    global d_model, n_heads, d_ff, n_layers, max_seq_len, dropout, vocab_path, dataset_path
    global tokenizer, raakadata, dataset, dataloader, criterion
    
    data = request.json or {}
    model_name = data.get("model_name")
    
    if not model_name:
        return jsonify({"error": "Malli puuttuu pyynnöstä"}), 400
        
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_model_dir = os.path.join(project_dir, 'models', model_name)
    
    if not os.path.exists(target_model_dir) or not os.path.isdir(target_model_dir):
        return jsonify({"error": f"Mallikansiota '{model_name}' ei löydy!"}), 404
        
    with training_lock:
        training_active = False # Pysäytetään aiempi koulutus
        
        # Luetaan uuden mallin konfiguraatio
        config_path = os.path.join(target_model_dir, 'config.json')
        temp_config = {}
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                temp_config = json.load(f)
        except Exception as e:
            return jsonify({"error": f"Virhe luettaessa config.json tiedostoa mallissa '{model_name}': {str(e)}"}), 400
            
        t_d_model = temp_config.get("d_model", 32)
        t_n_heads = temp_config.get("n_heads", 2)
        t_d_ff = temp_config.get("d_ff", 64)
        t_n_layers = temp_config.get("n_layers", 2)
        t_max_seq_len = temp_config.get("max_seq_len", 20)
        t_dropout = temp_config.get("dropout", 0.1)
        
        t_vocab_path = temp_config.get("vocab_path", "vocab.txt")
        t_dataset_path = temp_config.get("dataset_path", "dataset.txt")

        if t_vocab_path and not os.path.isabs(t_vocab_path):
            t_vocab_path = os.path.join(target_model_dir, t_vocab_path)
        if t_dataset_path and not os.path.isabs(t_dataset_path):
            t_dataset_path = os.path.join(target_model_dir, t_dataset_path)

        # Tarkastetaan d_model % n_heads == 0
        if t_d_model % t_n_heads != 0:
            return jsonify({
                "error": f"Konfiguraatiovirhe mallissa '{model_name}': 'd_model' ({t_d_model}) täytyy olla tasan jaettavissa 'n_heads' ({t_n_heads}) arvolla! Valitse lukuja siten, että jako menee tasan."
            }), 400

        try:
            t_tokenizer = LumiTokenizer(vocab_path=t_vocab_path)
            t_raakadata = lataa_tai_luo_koulutusaineisto(dataset_path=t_dataset_path, koko=1000)
            t_dataset = LumiDataset(t_raakadata, t_tokenizer, max_len=t_max_seq_len)
            t_dataloader = DataLoader(t_dataset, batch_size=32, shuffle=True)

            t_model = MiniLLM(
                vocab_size=t_tokenizer.vocab_size,
                d_model=t_d_model,
                n_heads=t_n_heads,
                d_ff=t_d_ff,
                n_layers=t_n_layers,
                max_seq_len=t_max_seq_len,
                dropout=t_dropout
            ).to(device)
            
            t_optimizer = optim.Adam(t_model.parameters(), lr=0.005)
            t_criterion = nn.CrossEntropyLoss(ignore_index=t_tokenizer.pad_token_id)
        except Exception as e:
            return jsonify({"error": f"Virhe alustettaessa mallia '{model_name}': {str(e)}"}), 400

        # Päivitetään globaalit muuttujat
        current_model_name = model_name
        config = temp_config
        d_model = t_d_model
        n_heads = t_n_heads
        d_ff = t_d_ff
        n_layers = t_n_layers
        max_seq_len = t_max_seq_len
        dropout = t_dropout
        vocab_path = t_vocab_path
        dataset_path = t_dataset_path

        tokenizer = t_tokenizer
        raakadata = t_raakadata
        dataset = t_dataset
        dataloader = t_dataloader
        model = t_model
        optimizer = t_optimizer
        criterion = t_criterion

        state["epoch"] = 0
        state["loss"] = 0.0
        state["loss_history"] = []

    return jsonify({"status": f"Model '{model_name}' loaded successfully", "current_model": current_model_name, "epoch": 0, "loss_history": []})


@app.route('/api/generate', methods=['POST'])
def generate():
    global model
    data = request.json or {}
    prompt = data.get("prompt", "<bos>")
    temperature = float(data.get("temperature", 1.0))
    
    # Koodataan syöte
    input_ids = tokenizer.encode(prompt)
    if not input_ids:
        # Tyhjä syöte tai tuntemattomia sanoja, aloitetaan alusta
        input_ids = [tokenizer.bos_token_id]
        
    # Otetaan maksimissaan mallin tuetun kontekstin pituus
    input_ids = input_ids[-max_seq_len:]
    
    input_tensor = torch.tensor([input_ids]).to(device)
    
    # Suoritetaan mallia ja kerätään diagnostiikat lukon alaisena
    with training_lock:
        model.eval()
        with torch.no_grad():
            logits, diagnostics = model.forward_with_diagnostics(input_tensor, tokenizer)
            
    # Valitaan seuraava sana lämpötilan mukaan
    last_logits = logits[0, -1, :] / (temperature + 1e-8)
    probs = torch.softmax(last_logits, dim=-1)
    next_token_id = torch.multinomial(probs, num_samples=1).item()
    next_word = tokenizer.id2word[next_token_id]
    
    # Luodaan uusi täydellinen lause
    new_prompt = prompt + " " + next_word
    
    return jsonify({
        "next_token_id": next_token_id,
        "next_word": next_word,
        "new_prompt": new_prompt,
        "diagnostics": diagnostics
    })

@app.route('/api/generate_batch', methods=['POST'])
def generate_batch():
    global model
    data = request.json or {}
    mode = data.get("mode", "random") # "random", "all_starts", "empty"
    temperature = float(data.get("temperature", 0.7))
    
    if current_model_name == "orion":
        logical_starts = [
            "<bos> astronaut", "<bos> commander", "<bos> pilot",
            "<bos> alien", "<bos> robot", "<bos> drone",
            "<bos> spaceship", "<bos> the astronaut scans",
            "<bos> the scientist observes", "<bos> a robot repairs"
        ]
    elif current_model_name == "frost":
        logical_starts = [
            "<bos> coder", "<bos> robot", "<bos> cat",
            "<bos> dog", "<bos> mouse", "<bos> coder writes",
            "<bos> the robot builds", "<bos> a cat chases"
        ]
    else:
        logical_starts = [
            "<bos> kissa", "<bos> koira", "<bos> hiiri",
            "<bos> kissa jahtaa", "<bos> koira jahtaa",
            "<bos> hiiri syö", "<bos> kissa syö", "<bos> koira syö"
        ]
    
    prompts = []
    if mode == "all_starts":
        prompts = logical_starts
    elif mode == "empty":
        prompts = ["<bos>"] * 10
    else: # random
        prompts = [random.choice(logical_starts) for _ in range(10)]
        
    results = []
    for prompt in prompts:
        input_ids = tokenizer.encode(prompt)
        if not input_ids:
            input_ids = [tokenizer.bos_token_id]
            
        generated_tokens = []
        # Generoidaan kunnes <eos> tai maksimipituus saavutetaan
        for _ in range(max_seq_len - len(input_ids)):
            input_tensor = torch.tensor([input_ids[-max_seq_len:]]).to(device)
            with training_lock:
                model.eval()
                with torch.no_grad():
                    logits = model(input_tensor)
            
            last_logits = logits[0, -1, :] / (temperature + 1e-8)
            probs = torch.softmax(last_logits, dim=-1)
            next_token_id = torch.multinomial(probs, num_samples=1).item()
            next_word = tokenizer.id2word[next_token_id]
            input_ids.append(next_token_id)
            generated_tokens.append(next_word)
            if next_word == "<eos>":
                break
                
        full_sentence = tokenizer.decode(input_ids)
        results.append({
            "prompt": prompt,
            "continuation": " ".join(generated_tokens),
            "sentence": full_sentence
        })
        
    return jsonify({"results": results})


@app.route('/api/weights', methods=['GET'])
def get_weights():
    global model
    with training_lock:
        weights = {
            "token_embeddings": model.token_emb.weight.cpu().tolist(),
            "positional_embeddings": model.pos_emb.pos_emb.weight.cpu().tolist(),
        }
        for i, block in enumerate(model.blocks):
            weights[f"layer_{i}_attn_norm"] = block.attn_norm.weight.cpu().tolist()
            weights[f"layer_{i}_qkv"] = block.attn.qkv_proj.weight.cpu().tolist()
            weights[f"layer_{i}_out"] = block.attn.out_proj.weight.cpu().tolist()
            weights[f"layer_{i}_ffn_norm"] = block.ffn_norm.weight.cpu().tolist()
            weights[f"layer_{i}_ffn1"] = block.ffn.net[0].weight.cpu().tolist()
            weights[f"layer_{i}_ffn2"] = block.ffn.net[2].weight.cpu().tolist()
            
        weights["final_norm"] = model.final_norm.weight.cpu().tolist()
        weights["lm_head"] = model.lm_head.weight.cpu().tolist()
    return jsonify(weights)
