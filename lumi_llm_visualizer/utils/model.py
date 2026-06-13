import torch
import torch.nn as nn

class RMSNorm(nn.Module):
    def __init__(self, d_model, eps=1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(d_model))
        
    def forward(self, x):
        variance = x.pow(2).mean(dim=-1, keepdim=True)
        x_normed = x * torch.rsqrt(variance + self.eps)
        return x_normed * self.weight

class PositionalEmbedding(nn.Module):
    def __init__(self, max_seq_len, d_model):
        super().__init__()
        self.pos_emb = nn.Embedding(max_seq_len, d_model)
        
    def forward(self, x):
        seq_len = x.size(1)
        positions = torch.arange(seq_len, device=x.device).unsqueeze(0)
        return self.pos_emb(positions)

class CausalMultiHeadAttention(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        assert d_model % n_heads == 0
        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        
        self.qkv_proj = nn.Linear(d_model, 3 * d_model, bias=False)
        self.out_proj = nn.Linear(d_model, d_model, bias=False)
        self.attention_weights = None
        
    def forward(self, x):
        batch_size, seq_len, _ = x.shape
        qkv = self.qkv_proj(x)
        q, k, v = torch.chunk(qkv, 3, dim=-1)
        
        q = q.view(batch_size, seq_len, self.n_heads, self.head_dim).transpose(1, 2)
        k = k.view(batch_size, seq_len, self.n_heads, self.head_dim).transpose(1, 2)
        v = v.view(batch_size, seq_len, self.n_heads, self.head_dim).transpose(1, 2)
        
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        
        mask = torch.triu(torch.full((seq_len, seq_len), float('-inf'), device=x.device), diagonal=1)
        scores = scores + mask.unsqueeze(0).unsqueeze(1)
        
        attn_weights = torch.softmax(scores, dim=-1)
        self.attention_weights = attn_weights.detach()
        
        out = torch.matmul(attn_weights, v)
        out = out.transpose(1, 2).contiguous().view(batch_size, seq_len, self.d_model)
        return self.out_proj(out)

class FeedForward(nn.Module):
    def __init__(self, d_model, d_ff, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout)
        )
        
    def forward(self, x):
        return self.net(x)

class TransformerBlock(nn.Module):
    def __init__(self, d_model, n_heads, d_ff, dropout=0.1):
        super().__init__()
        self.attn_norm = RMSNorm(d_model)
        self.attn = CausalMultiHeadAttention(d_model, n_heads)
        self.ffn_norm = RMSNorm(d_model)
        self.ffn = FeedForward(d_model, d_ff, dropout)
        
    def forward(self, x):
        x = x + self.attn(self.attn_norm(x))
        x = x + self.ffn(self.ffn_norm(x))
        return x

class MiniLLM(nn.Module):
    def __init__(self, vocab_size, d_model=32, n_heads=2, d_ff=64, n_layers=2, max_seq_len=20, dropout=0.1):
        super().__init__()
        self.token_emb = nn.Embedding(vocab_size, d_model)
        self.pos_emb = PositionalEmbedding(max_seq_len, d_model)
        self.blocks = nn.ModuleList([
            TransformerBlock(d_model, n_heads, d_ff, dropout)
            for _ in range(n_layers)
        ])
        self.final_norm = RMSNorm(d_model)
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)
        self.lm_head.weight = self.token_emb.weight
        
    def forward(self, tokens):
        x = self.token_emb(tokens) + self.pos_emb(tokens)
        for block in self.blocks:
            x = block(x)
        x = self.final_norm(x)
        logits = self.lm_head(x)
        return logits

    def forward_with_diagnostics(self, tokens, tokenizer):
        """
        Suorittaa eteenpäinvaiheen ja kerää kaikki mallin sisäiset tilat visualisointia varten.
        Sopii käytettäväksi batch-koolle 1 (inferenssi/diagnostiikka).
        """
        diagnostics = {}
        
        # 1. Sanat ja koodatut tokenit
        token_ids = tokens[0].tolist()
        words = [tokenizer.id2word[tid] for tid in token_ids]
        diagnostics['tokens'] = words
        diagnostics['token_ids'] = token_ids
        
        # 2. Embedding ja Positional Embedding
        tok_emb = self.token_emb(tokens) # (1, seq_len, d_model)
        pos_emb = self.pos_emb(tokens)   # (1, seq_len, d_model)
        x = tok_emb + pos_emb
        
        diagnostics['token_embeddings'] = tok_emb[0].cpu().tolist()
        diagnostics['positional_embeddings'] = pos_emb[0].cpu().tolist()
        diagnostics['after_embedding'] = x[0].cpu().tolist()
        
        # 3. Transformer-kerrokset
        attention_maps = []
        for i, block in enumerate(self.blocks):
            # Attention osa
            x_norm_attn = block.attn_norm(x)
            attn_out = block.attn(x_norm_attn)
            x = x + attn_out
            
            # Tallenna huomiopainot: (n_heads, seq_len, seq_len)
            attn_weights = block.attn.attention_weights[0].cpu().tolist()
            attention_maps.append(attn_weights)
            
            diagnostics[f'after_layer_{i}_attention'] = x[0].cpu().tolist()
            
            # FFN osa
            x_norm_ffn = block.ffn_norm(x)
            ffn_out = block.ffn(x_norm_ffn)
            x = x + ffn_out
            
            diagnostics[f'after_layer_{i}_ffn'] = x[0].cpu().tolist()
            
        diagnostics['attention_maps'] = attention_maps # shape: (n_layers, n_heads, seq_len, seq_len)
        
        # 4. Loppunormalisointi ja projektio
        x_final = self.final_norm(x)
        diagnostics['final_norm'] = x_final[0].cpu().tolist()
        
        logits = self.lm_head(x_final) # (1, seq_len, vocab_size)
        diagnostics['logits'] = logits[0].cpu().tolist()
        
        # 5. Seuraavan sanan todennäköisyydet viimeisen sanan perusteella
        last_logits = logits[0, -1, :]
        probs = torch.softmax(last_logits, dim=-1).cpu().tolist()
        
        # Tehdään lista sanaston sanoista todennäköisyyksineen
        vocab_probs = []
        for idx, prob in enumerate(probs):
            vocab_probs.append({
                "word": tokenizer.id2word[idx],
                "id": idx,
                "prob": prob
            })
        # Lajitellaan todennäköisyyden mukaan laskevasti
        vocab_probs.sort(key=lambda item: item["prob"], reverse=True)
        diagnostics['next_token_probs'] = vocab_probs
        
        return logits, diagnostics
