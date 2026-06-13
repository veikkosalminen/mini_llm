import random
import torch
from torch.utils.data import Dataset

def generoi_lauseen_puolikas(s):
    # s on 'kissa', 'koira' tai 'hiiri'
    if s == 'hiiri':
        # Hiiri ei jahtaa ketään
        v = random.choice(['syö', 'katsoo'])
    else:
        v = random.choice(['syö', 'katsoo', 'jahtaa'])
        
    if v == 'syö':
        o = 'juusto' if s == 'hiiri' else 'kala'
    elif v == 'jahtaa':
        o = 'hiiri' if s == 'kissa' else 'kissa'
    else: # katsoo
        o = random.choice([x for x in ['kissa', 'koira', 'hiiri'] if x != s])
        
    return f"{s} {v} {o}"

def luo_satunnainen_lause():
    substantiivit = ['kissa', 'koira', 'hiiri']
    
    s1 = random.choice(substantiivit)
    clause1 = generoi_lauseen_puolikas(s1)
    
    tyyppi = random.choice(['A', 'B'])
    
    if tyyppi == 'A':
        s2 = random.choice(substantiivit)
        lause = f"<bos> {clause1} ja {s2} nukkuu hyvin <eos>"
    else:
        s2 = random.choice(substantiivit)
        clause2 = generoi_lauseen_puolikas(s2)
        lause = f"<bos> {clause1} ja {clause2} <eos>"
        
    return lause

def luo_koulutusaineisto(koko=1000):
    # Generoidaan 1000 lausetta (saattaa sisältää toistoa)
    return [luo_satunnainen_lause() for _ in range(koko)]

def lataa_tai_luo_koulutusaineisto(dataset_path=None, koko=1000):
    import os
    import json
    
    if dataset_path is None:
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    dataset_path = config.get("dataset_path", "lumi_llm_visualizer/dataset.txt")
            except Exception:
                dataset_path = "lumi_llm_visualizer/dataset.txt"
        else:
            dataset_path = "lumi_llm_visualizer/dataset.txt"
            
    # Jos polku on suhteellinen, muutetaan absoluuttiseksi suhteessa projekti-kansioon
    if dataset_path and not os.path.isabs(dataset_path):
        project_dir = os.path.dirname(os.path.dirname(__file__))
        dataset_path = os.path.join(project_dir, os.path.basename(dataset_path))
        
    if dataset_path and os.path.exists(dataset_path):
        try:
            with open(dataset_path, "r", encoding="utf-8") as f:
                lauseet = [line.strip() for line in f if line.strip()]
            return lauseet
        except Exception:
            pass
            
    # Generoidaan ja tallennetaan
    lauseet = luo_koulutusaineisto(koko)
    if dataset_path:
        try:
            os.makedirs(os.path.dirname(dataset_path), exist_ok=True)
            with open(dataset_path, "w", encoding="utf-8") as f:
                for l in lauseet:
                    f.write(l + "\n")
        except Exception as e:
            print(f"Virhe tallennettaessa koulutusdataa: {e}")
    return lauseet

class LumiDataset(Dataset):
    def __init__(self, lauseet, tokenizer, max_len=11):
        self.tokenizer = tokenizer
        self.max_len = max_len
        self.data = []
        
        for lause in lauseet:
            encoded = tokenizer.encode(lause)
            # Täytetään pad-tokenilla
            if len(encoded) < max_len:
                encoded = encoded + [tokenizer.pad_token_id] * (max_len - len(encoded))
            else:
                encoded = encoded[:max_len]
            self.data.append(torch.tensor(encoded))
            
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        # Ennustetaan seuraavaa tokenia: X on 0...len-1, Y on 1...len
        x = self.data[idx][:-1]
        y = self.data[idx][1:]
        return x, y
