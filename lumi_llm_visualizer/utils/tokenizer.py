import os
import json
import torch

class LumiTokenizer:
    def __init__(self, vocab_path=None):
        if vocab_path is None:
            # Etsitään config.json tiedostoa
            config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')
            if os.path.exists(config_path):
                try:
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        vocab_path = config.get("vocab_path", "lumi_llm_visualizer/vocab.txt")
                except Exception:
                    vocab_path = "lumi_llm_visualizer/vocab.txt"
            else:
                vocab_path = "lumi_llm_visualizer/vocab.txt"
                
        # Jos polku on suhteellinen, muutetaan absoluuttiseksi suhteessa projekti-kansioon
        if vocab_path and not os.path.isabs(vocab_path):
            project_dir = os.path.dirname(os.path.dirname(__file__))
            vocab_path = os.path.join(project_dir, os.path.basename(vocab_path))
            
        if vocab_path and os.path.exists(vocab_path):
            try:
                with open(vocab_path, "r", encoding="utf-8") as f:
                    self.vocab = [line.strip() for line in f if line.strip()]
            except Exception:
                self.vocab = self.get_default_vocab()
        else:
            self.vocab = self.get_default_vocab()
            
        self.word2id = {word: idx for idx, word in enumerate(self.vocab)}
        self.id2word = {idx: word for idx, word in enumerate(self.vocab)}
        self.pad_token_id = self.word2id.get('<pad>', 0)
        self.bos_token_id = self.word2id.get('<bos>', 1)
        self.eos_token_id = self.word2id.get('<eos>', 2)

    def get_default_vocab(self):
        return [
            '<pad>', '<bos>', '<eos>',
            'kissa', 'koira', 'hiiri', 'kala', 'juusto',
            'katsoo', 'jahtaa', 'syö', 'nukkuu',
            'ja', 'hyvin'
        ]
        
    @property
    def vocab_size(self):
        return len(self.vocab)
        
    def encode(self, text):
        """Muuttaa tekstimerkkijonon lista-muotoiseksi ID-sarjaksi."""
        words = text.strip().split()
        return [self.word2id[w] for w in words if w in self.word2id]
        
    def decode(self, ids):
        """Muuttaa ID-sarjan takaisin tekstiksi."""
        words = []
        for idx in ids:
            if isinstance(idx, torch.Tensor):
                idx = idx.item()
            words.append(self.id2word[idx])
        return " ".join(words)
