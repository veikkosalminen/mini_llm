// State variables
let lossChart = null;
let trainingActive = false;
let pollInterval = null;
let currentDiagnostics = null;
let activeTab = "attention";
let lastEpoch = -1;
let currentModelName = "";
window.modelValidators = window.modelValidators || {};

async function loadModelValidator(modelName) {
    if (window.modelValidators[modelName]) {
        return;
    }
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.id = `model-validator-script-${modelName}`;
        script.src = `/models/${modelName}/validator.js`;
        script.onload = () => {
            console.log(`Loaded validator for ${modelName}`);
            resolve();
        };
        script.onerror = () => {
            console.warn(`Could not load validator for ${modelName}`);
            resolve();
        };
        document.head.appendChild(script);
    });
}

// Sanastosivun tilat ja elementit
let tokenizerTestInput, tokenizerTestOutput, vocabTableBody, selectedWordBadge, embeddingVisualizerContainer;
let compareWordA, compareWordB, similarityValue, compareVectorsWrapper, embeddingTooltip;

// Koulutusdatan tilat ja elementit
let datasetTotalSentences, datasetUniqueSentences, datasetFrequencies, datasetSearchInput, datasetSentencesList;
let alignmentSelectedSentence, alignmentGridContainer;

// Erägeneroinnin elementit
let btnRunBatch, batchModeSelect, batchResultsBody, batchStatTotal, batchStatCorrect, batchStatPct;

let datasetData = null; // List of 1000 sentences
let selectedVocabWord = null;
let currentNLayers = null;
let currentNHeads = null;
let VECTOR_STAGES_METADATA = [];
let WEIGHTS_METADATA = [];

function initMetadata(nLayers, nHeads) {
    if (currentNLayers === nLayers && currentNHeads === nHeads) return;
    currentNLayers = nLayers;
    currentNHeads = nHeads;
    
    // 1. VECTOR_STAGES_METADATA
    VECTOR_STAGES_METADATA = [
        { key: "token_embeddings", name: "1. Token Embeddings (Sana-embeddingit)" },
        { key: "positional_embeddings", name: "2. Positional Embeddings (Paikkatieto-embeddingit)" },
        { key: "after_embedding", name: "3. Yhdistetyt Embeddingit (Input to Block 1)" }
    ];
    
    let stageCounter = 4;
    for (let i = 0; i < nLayers; i++) {
        VECTOR_STAGES_METADATA.push(
            { key: `after_layer_${i}_attention`, name: `${stageCounter++}. Lohko ${i + 1} Attention jälkeen` }
        );
        if (i < nLayers - 1) {
            VECTOR_STAGES_METADATA.push(
                { key: `after_layer_${i}_ffn`, name: `${stageCounter++}. Lohko ${i + 1} jälkeen (Input to Block ${i + 2})` }
            );
        } else {
            VECTOR_STAGES_METADATA.push(
                { key: `after_layer_${i}_ffn`, name: `${stageCounter++}. Lohko ${i + 1} jälkeen (Lohkojen lopputulos)` }
            );
        }
    }
    VECTOR_STAGES_METADATA.push(
        { key: "final_norm", name: `${stageCounter++}. Lopullinen RMSNorm (Input to LM Head)` }
    );

    // 2. WEIGHTS_METADATA
    WEIGHTS_METADATA = [
        { key: "token_embeddings", name: "1. Sanojen Embeddingit (token_emb.weight)", type: "embeddings" },
        { key: "positional_embeddings", name: "2. Paikkatieto-Embeddingit (pos_emb.pos_emb.weight)", type: "positions" }
    ];
    
    let weightCounter = 3;
    for (let i = 0; i < nLayers; i++) {
        WEIGHTS_METADATA.push(
            { key: `layer_${i}_attn_norm`, name: `${weightCounter++}. Lohko ${i + 1} Attention RMSNorm (attn_norm.weight)`, type: "vector" },
            { key: `layer_${i}_qkv`, name: `${weightCounter++}. Lohko ${i + 1} Attention QKV-projektiot (qkv_proj.weight)`, type: "matrix" },
            { key: `layer_${i}_out`, name: `${weightCounter++}. Lohko ${i + 1} Attention Output (out_proj.weight)`, type: "matrix" },
            { key: `layer_${i}_ffn_norm`, name: `${weightCounter++}. Lohko ${i + 1} FFN RMSNorm (ffn_norm.weight)`, type: "vector" },
            { key: `layer_${i}_ffn1`, name: `${weightCounter++}. Lohko ${i + 1} FFN Kerros 1 (ffn.net[0].weight)`, type: "matrix" },
            { key: `layer_${i}_ffn2`, name: `${weightCounter++}. Lohko ${i + 1} FFN Kerros 2 (ffn.net[2].weight)`, type: "matrix" }
        );
    }
    
    WEIGHTS_METADATA.push(
        { key: "final_norm", name: `${weightCounter++}. Lopullinen RMSNorm (final_norm.weight)`, type: "vector" },
        { key: "lm_head", name: `${weightCounter++}. LM Head Ennustusprojektio (lm_head.weight)`, type: "embeddings" }
    );
    
    // 3. Dropdown options for weights-layer-select
    if (weightsLayerSelect) {
        const prevVal = weightsSelectedLayer;
        weightsLayerSelect.innerHTML = "";
        for (let i = 0; i < nLayers; i++) {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = `Kerros ${i}`;
            weightsLayerSelect.appendChild(opt);
        }
        if (prevVal < nLayers) {
            weightsLayerSelect.value = prevVal;
            weightsSelectedLayer = prevVal;
        } else {
            weightsLayerSelect.value = 0;
            weightsSelectedLayer = 0;
        }
    }
}

// DOM Elements
const statEpoch = document.getElementById("stat-epoch");
const statLoss = document.getElementById("stat-loss");
const deviceName = document.getElementById("device-name");
const trainPulse = document.getElementById("train-pulse");
const btnTrain1 = document.getElementById("btn-train-1");
const btnTrain10 = document.getElementById("btn-train-10");
const btnTrainToggle = document.getElementById("btn-train-toggle");
const btnReset = document.getElementById("btn-reset");

const promptInput = document.getElementById("prompt-input");
const tempSlider = document.getElementById("temp-slider");
const tempVal = document.getElementById("temp-val");
const btnGenStep = document.getElementById("btn-gen-step");
const btnGenAuto = document.getElementById("btn-gen-auto");
const btnClearPrompt = document.getElementById("btn-clear-prompt");
const promptOutput = document.getElementById("prompt-output");
const probsList = document.getElementById("probs-list");

const vectorStageSelect = document.getElementById("vector-stage-select");
const attentionHeatmap = document.getElementById("attention-heatmap");
const vectorsGrid = document.getElementById("vectors-grid");

// Painotarkastelun elementit
const weightsGrid = document.getElementById("weights-grid");
const btnRefreshWeights = document.getElementById("btn-refresh-weights");
const weightMatrixTooltip = document.getElementById("weight-matrix-tooltip");
const weightsLayerSelect = document.getElementById("weights-layer-select");

const attentionTooltip = document.getElementById("attention-tooltip");
const vectorTooltip = document.getElementById("vector-tooltip");

let modelWeights = null;
let vocabularyList = [];
let weightsSelectedLayer = 0;

// DOM Elements
const modelSelector = document.getElementById("model-selector");

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    initChart();
    initModelSelector();
    fetchStatus();
    
    // Set up polling (every 1000ms)
    pollInterval = setInterval(fetchStatus, 1000);

    // Event listeners
    if (modelSelector) {
        modelSelector.addEventListener("change", (e) => {
            selectModel(e.target.value);
        });
    }
    btnTrainToggle.addEventListener("click", toggleTraining);
    btnTrain1.addEventListener("click", () => trainStep(1));
    btnTrain10.addEventListener("click", () => trainStep(10));
    btnReset.addEventListener("click", resetModel);

    tempSlider.addEventListener("input", (e) => {
        tempVal.textContent = e.target.value;
    });

    btnGenStep.addEventListener("click", () => generateToken(false));
    btnGenAuto.addEventListener("click", () => generateToken(true));
    
    btnClearPrompt.addEventListener("click", () => {
        promptInput.value = "<bos>";
        promptOutput.textContent = "<bos>";
        probsList.innerHTML = "";
        attentionHeatmap.innerHTML = '<div class="placeholder-text">Aja tekstin generointi nähdäksesi huomiokartan!</div>';
        vectorsGrid.innerHTML = '<div class="placeholder-text">Aja tekstin generointi nähdäksesi piilovektorit!</div>';
        currentDiagnostics = null;
    });

    // Tab buttons
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            
            btn.classList.add("active");
            activeTab = btn.dataset.tab;
            document.getElementById(`tab-${activeTab}`).classList.add("active");
            
            if (activeTab === "attention") {
                if (currentDiagnostics) renderAttention();
            } else if (activeTab === "vectors") {
                if (currentDiagnostics) renderVectors();
            } else if (activeTab === "weights") {
                fetchWeights(true);
            } else if (activeTab === "vocab") {
                initVocabTab();
            } else if (activeTab === "data") {
                initDataTab();
            } else if (activeTab === "batch") {
                initBatchTab();
            }
        });
    });

    // Sanaston elementtien alustus
    tokenizerTestInput = document.getElementById("tokenizer-test-input");
    tokenizerTestOutput = document.getElementById("tokenizer-test-output");
    vocabTableBody = document.getElementById("vocab-table-body");
    selectedWordBadge = document.getElementById("selected-word-badge");
    embeddingVisualizerContainer = document.getElementById("embedding-visualizer-container");
    compareWordA = document.getElementById("compare-word-a");
    compareWordB = document.getElementById("compare-word-b");
    similarityValue = document.getElementById("similarity-value");
    compareVectorsWrapper = document.getElementById("compare-vectors-wrapper");
    embeddingTooltip = document.getElementById("embedding-tooltip");

    // Koulutusdatan elementtien alustus
    datasetTotalSentences = document.getElementById("dataset-total-sentences");
    datasetUniqueSentences = document.getElementById("dataset-unique-sentences");
    datasetFrequencies = document.getElementById("dataset-frequencies");
    datasetSearchInput = document.getElementById("dataset-search-input");
    datasetSentencesList = document.getElementById("dataset-sentences-list");
    alignmentSelectedSentence = document.getElementById("alignment-selected-sentence");
    alignmentGridContainer = document.getElementById("alignment-grid-container");

    // Tapahtumankuuntelijat
    if (tokenizerTestInput) {
        tokenizerTestInput.addEventListener("input", runTokenizerTest);
    }
    if (compareWordA && compareWordB) {
        compareWordA.addEventListener("change", runWordComparison);
        compareWordB.addEventListener("change", runWordComparison);
    }
    if (datasetSearchInput) {
        datasetSearchInput.addEventListener("input", filterDataset);
    }

    // Visualisation triggers on dropdown changes
    vectorStageSelect.addEventListener("change", renderVectors);
    btnRefreshWeights.addEventListener("click", () => fetchWeights(false));
    if (weightsLayerSelect) {
        weightsLayerSelect.addEventListener("change", (e) => {
            weightsSelectedLayer = parseInt(e.target.value);
            renderWeights();
        });
    }

    // Erägeneroinnin elementtien alustus
    btnRunBatch = document.getElementById("btn-run-batch");
    batchModeSelect = document.getElementById("batch-mode-select");
    batchResultsBody = document.getElementById("batch-results-body");
    batchStatTotal = document.getElementById("batch-stat-total");
    batchStatCorrect = document.getElementById("batch-stat-correct");
    batchStatPct = document.getElementById("batch-stat-pct");

    if (btnRunBatch) {
        btnRunBatch.addEventListener("click", runBatchGeneration);
    }
});

// --- CHART MANAGEMENT ---
function initChart() {
    const ctx = document.getElementById('lossChart').getContext('2d');
    lossChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Häviö (Loss)',
                data: [],
                borderColor: '#a29bfe',
                backgroundColor: 'rgba(162, 155, 254, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.15,
                pointRadius: 1,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#a4b0be', maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a4b0be' },
                    suggestedMin: 0
                }
            }
        }
    });
}

function updateChartData(history) {
    if (!lossChart) return;
    
    // Check if the history has actually changed length to avoid redraw lags
    if (lossChart.data.labels.length === history.length) return;
    
    lossChart.data.labels = history.map((_, i) => i + 1);
    lossChart.data.datasets[0].data = history;
    lossChart.update('none'); // Update without animation for performance
}

// --- API CLIENT CALLS ---

async function fetchStatus() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        
        initMetadata(data.n_layers || 2, data.n_heads || 2);
        
        statEpoch.textContent = data.epoch;
        statLoss.textContent = data.loss.toFixed(4);
        deviceName.textContent = data.device.toUpperCase();
        
        vocabularyList = data.vocab; // Tallennetaan sanasto globaalisti
        
        if (data.current_model && data.current_model !== currentModelName) {
            currentModelName = data.current_model;
            await loadModelValidator(currentModelName);
        }
        
        trainingActive = data.training_active;
        if (trainingActive) {
            btnTrainToggle.textContent = "Pysäytä koulutus";
            btnTrainToggle.classList.replace("btn-primary", "btn-danger");
            trainPulse.classList.add("active");
        } else {
            btnTrainToggle.textContent = "Aloita automaattinen koulutus";
            btnTrainToggle.classList.replace("btn-danger", "btn-primary");
            trainPulse.classList.remove("active");
        }
        
        updateChartData(data.loss_history);
        
        // Automaattinen päivittyminen koulutuksen edetessä
        if (lastEpoch === -1) {
            lastEpoch = data.epoch;
        } else if (data.epoch !== lastEpoch) {
            lastEpoch = data.epoch;
            
            // Painot-näkymä päivittyy jokaisella epochilla livenä!
            if (activeTab === "weights") {
                fetchWeights(true);
            }
            
            // Erägenerointi päivitetään vain 5 epochin välein (UX-luettavuus).
            // Jos koulutus ei ole päällä (esim. manuaalinen askelkoulutus), päivitetään heti.
            const shouldUpdateBatch = !trainingActive || (data.epoch % 5 === 0);
            if (activeTab === "batch" && btnRunBatch && !btnRunBatch.disabled && shouldUpdateBatch) {
                runBatchGeneration();
            }
        }
    } catch (err) {
        console.error("Virhe ladattaessa palvelimen tilaa:", err);
    }
}

async function toggleTraining() {
    const action = trainingActive ? "stop" : "start";
    try {
        const res = await fetch("/api/train", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        fetchStatus();
    } catch (err) {
        console.error("Koulutuksen ohjaus epäonnistui:", err);
    }
}

async function trainStep(epochs) {
    // Disable buttons temporarily
    btnTrain1.disabled = true;
    btnTrain10.disabled = true;
    try {
        const res = await fetch("/api/train", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "step", epochs })
        });
        const data = await res.json();
        fetchStatus();
    } catch (err) {
        console.error("Askelkoulutus epäonnistui:", err);
    } finally {
        btnTrain1.disabled = false;
        btnTrain10.disabled = false;
    }
}

async function resetModel() {
    if (!confirm("Haluatko varmasti nollata mallin painot ja koulutushistorian?")) return;
    try {
        const res = await fetch("/api/reset", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
            alert("Nollaus epäonnistui: " + (data.error || "Tuntematon virhe"));
            return;
        }
        alert("Malli nollattu onnistuneesti!");
        fetchStatus();
        
        // Clear visualization states
        btnClearPrompt.click();
    } catch (err) {
        alert("Yhteysvirhe nollattaessa mallia.");
        console.error("Mallin nollaus epäonnistui:", err);
    }
}

async function generateToken(auto = false) {
    const prompt = promptInput.value;
    const temp = parseFloat(tempSlider.value);
    
    btnGenStep.disabled = true;
    btnGenAuto.disabled = true;
    
    try {
        const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, temperature: temp })
        });
        
        const data = await res.json();
        
        // Update prompt inputs and outputs
        promptInput.value = data.new_prompt;
        promptOutput.textContent = data.new_prompt;
        
        currentDiagnostics = data.diagnostics;
        
        // Render graphics
        renderProbsList(currentDiagnostics.next_token_probs);
        if (activeTab === "attention") renderAttention();
        else renderVectors();
        
        // If auto-generation and not reached <eos>, generate next token
        if (auto && data.next_word !== "<eos>" && currentDiagnostics.tokens.length < 15) {
            // Add a slight delay for cool visual step effect
            setTimeout(() => generateToken(true), 250);
        }
    } catch (err) {
        console.error("Generointi epäonnistui:", err);
    } finally {
        btnGenStep.disabled = false;
        btnGenAuto.disabled = false;
    }
}

// --- RENDER VISUALIZATIONS ---

function renderProbsList(probs) {
    probsList.innerHTML = "";
    
    // Probs contains sorted list: [{word: "kissa", id: 3, prob: 0.82}, ...]
    // Limit to top 5 for neat layout
    const displayProbs = probs.slice(0, 5);
    
    displayProbs.forEach((item, index) => {
        const isTop = index === 0;
        const pct = (item.prob * 100).toFixed(1);
        
        const row = document.createElement("div");
        row.className = `prob-row ${isTop ? 'top-prediction' : ''}`;
        
        row.innerHTML = `
            <span class="prob-word">${item.word}</span>
            <div class="prob-bar-bg">
                <div class="prob-bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="prob-pct">${pct}%</span>
        `;
        
        probsList.appendChild(row);
    });
}

function renderAttention() {
    if (!currentDiagnostics || !currentDiagnostics.attention_maps) return;
    
    const tokens = currentDiagnostics.tokens;
    const seqLen = tokens.length;
    
    attentionHeatmap.innerHTML = "";
    
    // Grid container for maps
    const gridContainer = document.createElement("div");
    
    const nLayers = currentDiagnostics.attention_maps.length;
    const nHeads = currentDiagnostics.attention_maps[0].length;
    const cols = nHeads >= 2 ? 2 : 1;
    gridContainer.style.cssText = `display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 20px; width: 100%; max-width: 660px; justify-items: center; margin: 0 auto;`;
    
    for (let layer = 0; layer < nLayers; layer++) {
        for (let head = 0; head < nHeads; head++) {
            const map = currentDiagnostics.attention_maps[layer][head];
            
            const card = document.createElement("div");
            card.className = "attention-map-box";
            card.style.cssText = "display: flex; flex-direction: column; align-items: center; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; padding: 12px; width: 100%; max-width: 320px;";
            
            // Map title
            const title = document.createElement("div");
            title.style.cssText = "font-size: 0.8rem; font-weight: bold; color: var(--neon-purple); margin-bottom: 8px; font-family: var(--font-sans);";
            title.textContent = `Lohko ${layer + 1}, Pää ${head + 1}`;
            card.appendChild(title);
            
            // Grid
            const grid = document.createElement("div");
            grid.className = "attention-grid";
            const cellSize = seqLen > 8 ? 20 : 26; // Dynamic cell size
            grid.style.display = "grid";
            grid.style.gridTemplateColumns = `repeat(${seqLen}, ${cellSize}px)`;
            grid.style.gridTemplateRows = `repeat(${seqLen}, ${cellSize}px)`;
            grid.style.gap = "2px";
            
            for (let r = 0; r < seqLen; r++) {
                for (let c = 0; c < seqLen; c++) {
                    const w = map[r][c];
                    const cell = document.createElement("div");
                    cell.className = "attn-cell";
                    cell.style.width = `${cellSize}px`;
                    cell.style.height = `${cellSize}px`;
                    cell.style.backgroundColor = `rgba(0, 210, 255, ${w})`;
                    cell.style.border = "1px solid rgba(255, 255, 255, 0.03)";
                    
                    cell.addEventListener("mouseenter", (e) => {
                        showAttentionTooltip(e, tokens[r], tokens[c], w, layer, head);
                    });
                    cell.addEventListener("mouseleave", hideTooltip);
                    
                    grid.appendChild(cell);
                }
            }
            card.appendChild(grid);
            
            // X Axis
            const xLabels = document.createElement("div");
            xLabels.className = "axis-labels-x";
            xLabels.style.width = `${seqLen * (cellSize + 2)}px`;
            xLabels.style.marginTop = "6px";
            xLabels.style.height = "45px";
            
            tokens.forEach(tok => {
                const label = document.createElement("span");
                label.className = "axis-label-x-val";
                label.textContent = tok;
                label.style.width = `${cellSize}px`;
                label.style.fontSize = "0.68rem";
                xLabels.appendChild(label);
            });
            card.appendChild(xLabels);
            
            gridContainer.appendChild(card);
        }
    }
    
    attentionHeatmap.appendChild(gridContainer);
}

function showAttentionTooltip(e, fromWord, toWord, weight, layer, head) {
    const parentPos = attentionHeatmap.getBoundingClientRect();
    const cursorX = e.clientX - parentPos.left;
    const cursorY = e.clientY - parentPos.top;
    
    attentionTooltip.style.display = "block";
    attentionTooltip.innerHTML = `
        <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px; margin-bottom:5px; font-weight:700;">Lohko ${layer + 1}, Pää ${head + 1}</div>
        <div><strong>Mistä (Query):</strong> "${fromWord}"</div>
        <div><strong>Mihin (Key):</strong> "${toWord}"</div>
        <div><strong>Paino (Attention):</strong> <span class="neon-text-blue">${(weight * 100).toFixed(2)}%</span></div>
    `;
    
    attentionTooltip.style.left = `${cursorX + 15}px`;
    attentionTooltip.style.top = `${cursorY + 15}px`;
}


function renderVectors() {
    if (!currentDiagnostics) return;
    
    const tokens = currentDiagnostics.tokens;
    const seqLen = tokens.length;
    
    vectorsGrid.innerHTML = "";
    
    VECTOR_STAGES_METADATA.forEach((stageMeta) => {
        const vectors = currentDiagnostics[stageMeta.key];
        if (!vectors) return;
        
        const dModel = vectors[0].length; // should be 32
        
        // Stage card
        const stageCard = document.createElement("div");
        stageCard.className = "vector-stage-card";
        stageCard.style.cssText = "margin-bottom: 24px; width: 100%; background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.03); border-radius: 10px; padding: 16px;";
        
        // Stage Title
        const title = document.createElement("div");
        title.style.cssText = "font-size: 0.85rem; font-weight: bold; color: var(--neon-blue); margin-bottom: 12px; font-family: var(--font-sans); display: flex; justify-content: space-between; align-items: center;";
        title.innerHTML = `
            <span>${stageMeta.name}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); font-weight: normal; background: rgba(255, 255, 255, 0.03); padding: 2px 6px; border-radius: 4px;">d = ${dModel}</span>
        `;
        stageCard.appendChild(title);
        
        // Table container for scrolling
        const tableWrapper = document.createElement("div");
        tableWrapper.style.cssText = "width: 100%; overflow-x: auto;";
        
        const table = document.createElement("table");
        table.className = "vector-table";
        
        // Header row
        const headerRow = document.createElement("tr");
        headerRow.appendChild(document.createElement("th")); // Top-left blank
        
        for (let j = 0; j < dModel; j++) {
            const th = document.createElement("th");
            th.textContent = j;
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);
        
        // Rows
        for (let i = 0; i < seqLen; i++) {
            const row = document.createElement("tr");
            
            // Token label
            const tdLabel = document.createElement("td");
            tdLabel.className = "vector-token-label";
            tdLabel.textContent = tokens[i];
            row.appendChild(tdLabel);
            
            // Dimensions
            for (let j = 0; j < dModel; j++) {
                const val = vectors[i][j];
                const tdCell = document.createElement("td");
                
                const cellColor = getVectorColor(val);
                
                const span = document.createElement("span");
                span.className = "vector-cell";
                span.style.backgroundColor = cellColor;
                
                // Hover logic
                span.addEventListener("mouseenter", (e) => {
                    showVectorTooltip(e, tokens[i], j, val, stageMeta.name);
                });
                span.addEventListener("mouseleave", hideTooltip);
                
                tdCell.appendChild(span);
                row.appendChild(tdCell);
            }
            
            table.appendChild(row);
        }
        
        tableWrapper.appendChild(table);
        stageCard.appendChild(tableWrapper);
        vectorsGrid.appendChild(stageCard);
    });
}

function getVectorColor(val) {
    // Tanh-like scale clipped between -1.5 and 1.5
    // Represents negative as blue, positive as red
    const maxVal = 1.2;
    let norm = Math.max(-maxVal, Math.min(maxVal, val)) / maxVal; // -1 to 1
    
    if (norm >= 0) {
        // Red hue (0)
        return `hsla(0, 80%, 55%, ${norm})`;
    } else {
        // Blue/Purple hue (240)
        return `hsla(240, 80%, 55%, ${-norm})`;
    }
}

function showVectorTooltip(e, word, dim, val, stageName) {
    const container = document.querySelector("#tab-vectors .visualization-container");
    const containerPos = container.getBoundingClientRect();
    const cellPos = e.target.getBoundingClientRect();
    
    vectorTooltip.style.display = "block";
    vectorTooltip.innerHTML = `
        <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 3px; margin-bottom: 5px; font-weight: 700; font-size: 0.78rem; color: var(--neon-purple);">${stageName}</div>
        <div><strong>Sana:</strong> "${word}"</div>
        <div><strong>Ulottuvuus:</strong> d_${dim}</div>
        <div><strong>Aktivaatioarvo:</strong> <span class="neon-text-purple">${val.toFixed(5)}</span></div>
    `;
    
    const left = cellPos.left - containerPos.left + cellPos.width / 2 - vectorTooltip.offsetWidth / 2;
    const top = cellPos.top - containerPos.top - vectorTooltip.offsetHeight - 10;
    
    vectorTooltip.style.left = `${left}px`;
    vectorTooltip.style.top = `${top}px`;
}

function hideTooltip() {
    attentionTooltip.style.display = "none";
    vectorTooltip.style.display = "none";
    weightMatrixTooltip.style.display = "none";
}


async function fetchWeights(silent = false) {
    try {
        const res = await fetch("/api/weights");
        modelWeights = await res.json();
        renderWeights();
    } catch (err) {
        if (!silent) console.error("Virhe ladattaessa painoja:", err);
    }
}

function renderWeights() {
    if (!modelWeights) {
        weightsGrid.innerHTML = '<div class="placeholder-text">Painoja ei ole ladattu. Klikkaa "Päivitä mallin painot"!</div>';
        return;
    }
    
    weightsGrid.innerHTML = "";
    weightsGrid.className = "";
    weightsGrid.style.cssText = "width: 100%; display: block;";
    
    const flowContainer = document.createElement("div");
    flowContainer.className = "weights-flow-container";
    
    // --- VAIHE 1: PROMPTIN TOKENIT (Dynaaminen) ---
    const promptNode = document.createElement("div");
    promptNode.className = "flow-node";
    
    const promptTitle = document.createElement("div");
    promptTitle.className = "flow-node-title";
    promptTitle.textContent = "Promptin tokenit";
    promptNode.appendChild(promptTitle);
    
    const promptSub = document.createElement("div");
    promptSub.className = "flow-node-subtitle";
    promptSub.textContent = "Syötettävät sanat / teksti";
    promptNode.appendChild(promptSub);
    
    const badgeContainer = document.createElement("div");
    badgeContainer.className = "flow-badge-container";
    
    if (currentDiagnostics && currentDiagnostics.tokens) {
        currentDiagnostics.tokens.forEach(tok => {
            const badge = document.createElement("span");
            badge.className = "flow-badge";
            if (tok === "<bos>" || tok === "<eos>") {
                badge.classList.add("special");
            } else {
                badge.classList.add("active-token");
            }
            badge.textContent = tok;
            badgeContainer.appendChild(badge);
        });
    } else {
        const defaultTokens = ["<bos>", "kissa", "jahtaa"];
        defaultTokens.forEach(tok => {
            const badge = document.createElement("span");
            badge.className = "flow-badge";
            if (tok === "<bos>") badge.classList.add("special");
            badge.textContent = tok;
            badgeContainer.appendChild(badge);
        });
    }
    promptNode.appendChild(badgeContainer);
    flowContainer.appendChild(promptNode);
    
    flowContainer.appendChild(createArrow("→", "", true));
    
    // --- VAIHE 2: EMBEDDING-VAIHE (Kasa pystysuunnassa) ---
    const embeddingsGroup = document.createElement("div");
    embeddingsGroup.className = "flow-group-column";
    
    const tokenCard = createWeightCard("token_embeddings", "Token Embedding", "token_embd.weight", "active");
    const posCard = createWeightCard("positional_embeddings", "Positional Embedding", "pos_emb.pos_emb.weight");
    
    if (tokenCard) embeddingsGroup.appendChild(tokenCard);
    if (posCard) embeddingsGroup.appendChild(posCard);
    flowContainer.appendChild(embeddingsGroup);
    
    flowContainer.appendChild(createArrow("→", "", true));
    
    // --- VAIHE 3: TRANSFORMERI-KERROS (Valittu kerros - pystysuunnassa laatikossa) ---
    const blockContainer = document.createElement("div");
    blockContainer.className = "transformer-block-outline";
    
    const blockHeader = document.createElement("div");
    blockHeader.className = "transformer-block-header";
    blockHeader.textContent = `TRANSFORMERI-KERROS (Täysin muokattava) - Kerros ${weightsSelectedLayer}`;
    blockContainer.appendChild(blockHeader);
    
    // Attention RMSNorm
    const attnNormKey = `layer_${weightsSelectedLayer}_attn_norm`;
    const attnNormCard = createWeightCard(attnNormKey, "Attention RMSNorm", "input_norm tai attn_norm");
    if (attnNormCard) {
        blockContainer.appendChild(attnNormCard);
    }
    
    blockContainer.appendChild(createArrow("↓"));
    
    // Split to Attention and FFN
    const layerSplit = document.createElement("div");
    layerSplit.className = "flow-split-row";
    
    // Vasen sarake: Attention
    const attnCol = document.createElement("div");
    attnCol.className = "flow-column";
    
    const attnHeader = document.createElement("div");
    attnHeader.className = "flow-column-header blue";
    attnHeader.textContent = "ITSEHUOMIO (ATTENTION)";
    attnCol.appendChild(attnHeader);
    
    const qkvKey = `layer_${weightsSelectedLayer}_qkv`;
    const qkvCard = createWeightCard(qkvKey, "Q, K, V Heijastukset", "attn_q, attn_k, attn_v", "active");
    if (qkvCard) attnCol.appendChild(qkvCard);
    
    attnCol.appendChild(createArrow("↓"));
    
    // Flash Attention box
    const flashNode = document.createElement("div");
    flashNode.className = "flow-node";
    
    const flashTitle = document.createElement("div");
    flashTitle.className = "flow-node-title";
    flashTitle.textContent = "Flash Attention (GQA)";
    flashNode.appendChild(flashTitle);
    
    const flashSub = document.createElement("div");
    flashSub.className = "flow-node-subtitle";
    flashSub.textContent = "Laskee tokenien suhteet";
    flashNode.appendChild(flashSub);
    
    if (currentDiagnostics && currentDiagnostics.attention_maps && currentDiagnostics.attention_maps[weightsSelectedLayer]) {
        const map = currentDiagnostics.attention_maps[weightsSelectedLayer][0]; // Head 0
        const seqLen = map.length;
        
        const microWrapper = document.createElement("div");
        microWrapper.style.cssText = "margin-top: 6px; background: #05070a; padding: 2px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.04); display: inline-flex; justify-content: center; align-items: center;";
        
        const microCanvas = document.createElement("canvas");
        microCanvas.width = seqLen;
        microCanvas.height = seqLen;
        
        const microScale = Math.max(3, Math.floor(60 / seqLen));
        microCanvas.style.width = `${seqLen * microScale}px`;
        microCanvas.style.height = `${seqLen * microScale}px`;
        microCanvas.style.cssText += "image-rendering: pixelated; image-rendering: crisp-edges; display: block; border: 1px solid rgba(255, 255, 255, 0.08);";
        
        const microCtx = microCanvas.getContext("2d");
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < seqLen; j++) {
                const w = map[i][j];
                microCtx.fillStyle = `rgba(0, 210, 255, ${w})`;
                microCtx.fillRect(j, i, 1, 1);
            }
        }
        microWrapper.appendChild(microCanvas);
        flashNode.appendChild(microWrapper);
    }
    
    attnCol.appendChild(flashNode);
    attnCol.appendChild(createArrow("↓"));
    
    const outKey = `layer_${weightsSelectedLayer}_out`;
    const outCard = createWeightCard(outKey, "Attention Out Proj", "attn_output.weight");
    if (outCard) attnCol.appendChild(outCard);
    
    layerSplit.appendChild(attnCol);
    
    // Oikea sarake: Feedforward (FFN)
    const ffnCol = document.createElement("div");
    ffnCol.className = "flow-column";
    
    const ffnHeader = document.createElement("div");
    ffnHeader.className = "flow-column-header purple";
    ffnHeader.textContent = "LISÄVERKKO (FEEDFORWARD)";
    ffnCol.appendChild(ffnHeader);
    
    const ffn1Key = `layer_${weightsSelectedLayer}_ffn1`;
    const ffn1Card = createWeightCard(ffn1Key, "Gate & Up Heijastukset", "ffn_gate, ffn_up", "active-purple");
    if (ffn1Card) ffnCol.appendChild(ffn1Card);
    
    ffnCol.appendChild(createArrow("↓"));
    
    // GELU Node
    const geluNode = document.createElement("div");
    geluNode.className = "flow-node";
    
    const geluTitle = document.createElement("div");
    geluTitle.className = "flow-node-title";
    geluTitle.textContent = "GELU-aktivaatio";
    geluNode.appendChild(geluTitle);
    
    const geluSub = document.createElement("div");
    geluSub.className = "flow-node-subtitle";
    geluSub.textContent = "Aktivaatiofunktio";
    geluNode.appendChild(geluSub);
    
    ffnCol.appendChild(geluNode);
    ffnCol.appendChild(createArrow("↓"));
    
    const ffn2Key = `layer_${weightsSelectedLayer}_ffn2`;
    const ffn2Card = createWeightCard(ffn2Key, "FFN Down Proj", "ffn_down.weight");
    if (ffn2Card) ffnCol.appendChild(ffn2Card);
    
    layerSplit.appendChild(ffnCol);
    
    blockContainer.appendChild(layerSplit);
    
    blockContainer.appendChild(createArrow("↓"));
    
    // Residual Addition node
    const resNode = document.createElement("div");
    resNode.className = "flow-node";
    
    const resTitle = document.createElement("div");
    resTitle.className = "flow-node-title";
    resTitle.textContent = "Residual Addition";
    resNode.appendChild(resTitle);
    
    const resSub = document.createElement("div");
    resSub.className = "flow-node-subtitle";
    resSub.textContent = "Yhdistetään kerroksen syöte";
    resNode.appendChild(resSub);
    
    blockContainer.appendChild(resNode);
    
    flowContainer.appendChild(blockContainer);
    
    flowContainer.appendChild(createArrow("→", "", true));
    
    // --- VAIHE 4: OUTPUT-VAIHE (Kasa pystysuunnassa) ---
    const outputGroup = document.createElement("div");
    outputGroup.className = "flow-group-column";
    outputGroup.style.gap = "8px";
    
    const finalNormCard = createWeightCard("final_norm", "Output RMSNorm", "output_norm.weight");
    if (finalNormCard) {
        outputGroup.appendChild(finalNormCard);
        outputGroup.appendChild(createArrow("↓"));
    }
    
    const lmHeadCard = createWeightCard("lm_head", "LM Head Projection", "output.weight (logits)", "active");
    if (lmHeadCard) {
        outputGroup.appendChild(lmHeadCard);
        outputGroup.appendChild(createArrow("↓"));
    }
    
    // Seuraavan tokenin todennäköisyydet box
    const probsNode = document.createElement("div");
    probsNode.className = "flow-node";
    probsNode.style.minWidth = "250px";
    
    const probsTitle = document.createElement("div");
    probsTitle.className = "flow-node-title";
    probsTitle.style.color = "var(--neon-green)";
    probsTitle.textContent = "Seuraavan tokenin todennäköisyydet";
    probsNode.appendChild(probsTitle);
    
    const probsSub = document.createElement("div");
    probsSub.className = "flow-node-subtitle";
    probsSub.textContent = "Valitaan sana lämpötilalla";
    probsNode.appendChild(probsSub);
    
    if (currentDiagnostics && currentDiagnostics.next_token_probs) {
        const miniProbsList = document.createElement("div");
        miniProbsList.className = "flow-mini-probs";
        
        currentDiagnostics.next_token_probs.slice(0, 3).forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "flow-mini-prob-row";
            if (index === 0) row.style.fontWeight = "bold";
            
            const pct = (item.prob * 100).toFixed(1);
            row.innerHTML = `
                <span class="flow-mini-prob-word">${item.word}</span>
                <span class="flow-mini-prob-pct">${pct}%</span>
            `;
            miniProbsList.appendChild(row);
        });
        probsNode.appendChild(miniProbsList);
    } else {
        const placeholderText = document.createElement("div");
        placeholderText.style.cssText = "font-size:0.75rem; color:var(--text-muted); font-style:italic; margin-top:6px; text-align:center;";
        placeholderText.textContent = "Aja tekstin generointi nähdäksesi ennusteet!";
        probsNode.appendChild(placeholderText);
    }
    outputGroup.appendChild(probsNode);
    flowContainer.appendChild(outputGroup);
    
    weightsGrid.appendChild(flowContainer);
}

function createArrow(text, subLabel = "", isHorizontal = false) {
    const arrow = document.createElement("div");
    arrow.className = isHorizontal ? "flow-arrow-horizontal" : "flow-arrow";
    arrow.textContent = text;
    if (subLabel && !isHorizontal) {
        const lbl = document.createElement("span");
        lbl.className = "flow-arrow-label";
        lbl.textContent = subLabel;
        arrow.appendChild(lbl);
    }
    return arrow;
}

function createWeightCard(key, titleOverride = null, subtitleOverride = null, activeClass = "") {
    const meta = WEIGHTS_METADATA.find(m => m.key === key);
    if (!meta) return null;
    
    const matrix = modelWeights[meta.key];
    if (!matrix) return null;
    
    const numRows = Array.isArray(matrix[0]) ? matrix.length : 1;
    const numCols = Array.isArray(matrix[0]) ? matrix[0].length : matrix.length;
    
    const node = document.createElement("div");
    node.className = `flow-node ${activeClass}`;
    
    const titleEl = document.createElement("div");
    titleEl.className = "flow-node-title";
    titleEl.textContent = titleOverride || meta.name;
    node.appendChild(titleEl);
    
    const subEl = document.createElement("div");
    subEl.className = "flow-node-subtitle";
    const subText = subtitleOverride || (numRows === 1 ? "norm-kerroin" : `painomatriisi`);
    subEl.innerHTML = `${subText} <span class="matrix-shape" style="font-size:0.6rem; padding: 1px 4px;">${numRows} × ${numCols}</span>`;
    node.appendChild(subEl);
    
    const canvasWrapper = document.createElement("div");
    canvasWrapper.className = "matrix-canvas-wrapper";
    canvasWrapper.style.cssText = "margin-top: 6px; background: #05070a; padding: 2px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.04); display: inline-flex; justify-content: center; align-items: center;";
    
    const canvas = document.createElement("canvas");
    canvas.width = numCols;
    canvas.height = numRows;
    
    let scaleX = 3;
    let scaleY = 3;
    if (numRows === 1) {
        scaleX = 4;
        scaleY = 12;
    } else if (numCols === 96) {
        scaleX = 1.5;
        scaleY = 1.5;
    } else if (numCols === 64 || numRows === 64) {
        scaleX = 2;
        scaleY = 2;
    } else if (numCols === 32 && numRows === 32) {
        scaleX = 2.5;
        scaleY = 2.5;
    } else {
        scaleX = 3.5;
        scaleY = 3.5;
    }
    
    canvas.style.width = `${numCols * scaleX}px`;
    canvas.style.height = `${numRows * scaleY}px`;
    canvas.style.cssText += "image-rendering: pixelated; image-rendering: crisp-edges; display: block; cursor: crosshair; border: 1px solid rgba(255, 255, 255, 0.08);";
    
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const val = numRows === 1 ? matrix[j] : (Array.isArray(matrix[i]) ? matrix[i][j] : matrix[i]);
            ctx.fillStyle = getVectorColor(val);
            ctx.fillRect(j, i, 1, 1);
        }
    }
    
    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.floor((x / rect.width) * numCols);
        const row = Math.floor((y / rect.height) * numRows);
        
        if (col >= 0 && col < numCols && row >= 0 && row < numRows) {
            const val = numRows === 1 ? matrix[col] : (Array.isArray(matrix[row]) ? matrix[row][col] : matrix[row]);
            
            let rowLabel = `Rivi ${row}`;
            if (key === "token_embeddings" && vocabularyList && vocabularyList[row]) {
                rowLabel = `[Sana: ${vocabularyList[row]}]`;
            } else if (key === "positional_embeddings") {
                rowLabel = `Positio ${row}`;
            } else if (key.endsWith("_norm") || key === "final_norm") {
                rowLabel = `RMSNorm-kerroin`;
            }
            
            showWeightTooltip(e, titleOverride || meta.name, rowLabel, col, val);
        }
    });
    
    canvas.addEventListener("mouseleave", hideTooltip);
    
    canvasWrapper.appendChild(canvas);
    node.appendChild(canvasWrapper);
    
    return node;
}

function showWeightTooltip(e, matrixName, rowLabel, colIndex, val) {
    const parentPos = weightsGrid.getBoundingClientRect();
    const cursorX = e.clientX - parentPos.left;
    const cursorY = e.clientY - parentPos.top;
    
    weightMatrixTooltip.style.display = "block";
    weightMatrixTooltip.innerHTML = `
        <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px; margin-bottom:5px; font-weight:700;">${matrixName}</div>
        <div><strong>Rivi:</strong> ${rowLabel}</div>
        <div><strong>Sarake (Ulotus.):</strong> d_${colIndex}</div>
        <div><strong>Painoarvo:</strong> <span class="neon-text-purple">${val.toFixed(5)}</span></div>
    `;
    
    weightMatrixTooltip.style.left = `${cursorX + 15}px`;
    weightMatrixTooltip.style.top = `${cursorY + 15}px`;
}

// --- NEW TABS IMPLEMENTATION (VOCABULARY & DATASET) ---

// 1. Vocabulary Tab Logic
async function initVocabTab() {
    if (!vocabularyList || vocabularyList.length === 0) {
        await fetchStatus();
    }
    if (!modelWeights) {
        await fetchWeights(true);
    }
    
    // Piirretään sanastotaulukko
    vocabTableBody.innerHTML = "";
    vocabularyList.forEach((word, idx) => {
        let typeBadge = getWordBadgeMarkup(word);
        
        const row = document.createElement("tr");
        row.style.borderBottom = "1px solid rgba(255, 255, 255, 0.03)";
        row.style.cursor = "pointer";
        row.className = "vocab-row";
        if (selectedVocabWord === word) {
            row.style.background = "rgba(0, 210, 255, 0.05)";
        }
        
        row.innerHTML = `
            <td style="padding: 6px; font-family: var(--font-mono); font-weight: 700;">${idx}</td>
            <td style="padding: 6px; font-family: var(--font-mono); font-weight: 700; color: #fff;">${word}</td>
            <td style="padding: 6px;">${typeBadge}</td>
        `;
        
        row.addEventListener("click", () => {
            document.querySelectorAll(".vocab-row").forEach(r => r.style.background = "none");
            row.style.background = "rgba(0, 210, 255, 0.05)";
            selectVocabWord(word);
        });
        
        vocabTableBody.appendChild(row);
    });

    // Täytetään vertailuvalikot
    if (compareWordA.options.length === 0) {
        compareWordA.innerHTML = "";
        compareWordB.innerHTML = "";
        vocabularyList.forEach(word => {
            const optA = document.createElement("option");
            optA.value = word;
            optA.textContent = word;
            compareWordA.appendChild(optA);
            
            const optB = document.createElement("option");
            optB.value = word;
            optB.textContent = word;
            compareWordB.appendChild(optB);
        });
        
        // Asetetaan alkusanoiksi kissa ja koira
        compareWordA.value = "kissa";
        compareWordB.value = "koira";
    }

    if (!selectedVocabWord) {
        selectVocabWord("kissa");
    } else {
        selectVocabWord(selectedVocabWord);
    }
    
    runWordComparison();
}

function getWordBadgeMarkup(word) {
    if (word.startsWith("<") && word.endsWith(">")) {
        return `<span class="badge" style="background: rgba(0, 210, 255, 0.08); color: var(--neon-blue); border-color: rgba(0, 210, 255, 0.15);">Erikoissana</span>`;
    } else if (word === "katsoo" || word === "jahtaa" || word === "syö" || word === "nukkuu") {
        return `<span class="badge" style="background: rgba(0, 184, 148, 0.08); color: var(--neon-green); border-color: rgba(0, 184, 148, 0.15);">Verbi</span>`;
    } else if (word === "ja" || word === "hyvin") {
        return `<span class="badge" style="background: rgba(253, 203, 110, 0.08); color: #ffeaa7; border-color: rgba(253, 203, 110, 0.15);">Muu</span>`;
    } else {
        return `<span class="badge" style="background: rgba(162, 155, 254, 0.08); color: var(--neon-purple); border-color: rgba(162, 155, 254, 0.15);">Substantiivi</span>`;
    }
}

function selectVocabWord(word) {
    selectedVocabWord = word;
    selectedWordBadge.textContent = `"${word}" (ID: ${vocabularyList.indexOf(word)})`;
    
    if (!modelWeights || !modelWeights.token_embeddings) {
        embeddingVisualizerContainer.innerHTML = `<div class="placeholder-text">Ladataan painoja...</div>`;
        return;
    }
    
    const wordIdx = vocabularyList.indexOf(word);
    if (wordIdx === -1) return;
    
    const vector = modelWeights.token_embeddings[wordIdx];
    renderEmbeddingVector(embeddingVisualizerContainer, word, vector);
}

function renderEmbeddingVector(container, word, vector) {
    container.innerHTML = "";
    
    const strip = document.createElement("div");
    strip.className = "embedding-strip";
    
    vector.forEach((val, idx) => {
        const cell = document.createElement("div");
        cell.className = "embedding-cell";
        cell.style.backgroundColor = getVectorColor(val);
        
        cell.addEventListener("mouseenter", (e) => {
            showEmbeddingTooltip(e, word, idx, val);
        });
        cell.addEventListener("mouseleave", hideEmbeddingTooltip);
        
        strip.appendChild(cell);
    });
    
    container.appendChild(strip);
    
    // Näytetään numeerinen yhteenveto alta
    const stats = document.createElement("div");
    stats.style.cssText = "display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 6px;";
    
    const minVal = Math.min(...vector).toFixed(4);
    const maxVal = Math.max(...vector).toFixed(4);
    const meanVal = (vector.reduce((a,b)=>a+b, 0) / vector.length).toFixed(4);
    
    stats.innerHTML = `
        <span>Min: ${minVal}</span>
        <span>K.arvo: ${meanVal}</span>
        <span>Max: ${maxVal}</span>
    `;
    container.appendChild(stats);
}

function showEmbeddingTooltip(e, word, dim, val) {
    const parentPos = document.getElementById("tab-vocab").getBoundingClientRect();
    const cellPos = e.target.getBoundingClientRect();
    
    embeddingTooltip.style.display = "block";
    embeddingTooltip.innerHTML = `
        <div><strong>Sana:</strong> "${word}"</div>
        <div><strong>Ulottuvuus:</strong> d_${dim}</div>
        <div><strong>Arvo:</strong> <span class="neon-text-purple">${val.toFixed(5)}</span></div>
    `;
    
    const left = cellPos.left - parentPos.left + cellPos.width / 2 - embeddingTooltip.offsetWidth / 2;
    const top = cellPos.top - parentPos.top - embeddingTooltip.offsetHeight - 10;
    
    embeddingTooltip.style.left = `${left}px`;
    embeddingTooltip.style.top = `${top}px`;
}

function hideEmbeddingTooltip() {
    if (embeddingTooltip) {
        embeddingTooltip.style.display = "none";
    }
}

function runWordComparison() {
    const wordA = compareWordA.value;
    const wordB = compareWordB.value;
    
    if (!wordA || !wordB || !modelWeights || !modelWeights.token_embeddings) return;
    
    const idxA = vocabularyList.indexOf(wordA);
    const idxB = vocabularyList.indexOf(wordB);
    
    if (idxA === -1 || idxB === -1) return;
    
    const vecA = modelWeights.token_embeddings[idxA];
    const vecB = modelWeights.token_embeddings[idxB];
    
    // Lasketaan kosinisimilaarisuus
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    const cosineSim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    const percentage = (cosineSim * 100).toFixed(1);
    
    similarityValue.textContent = `${percentage}%`;
    
    compareVectorsWrapper.innerHTML = "";
    
    // Sana A
    const labelA = document.createElement("div");
    labelA.style.cssText = "font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted); margin-bottom: 4px; display: flex; justify-content: space-between;";
    labelA.innerHTML = `<span>Sana A: <strong>${wordA}</strong></span> <span>Normi: ${Math.sqrt(normA).toFixed(3)}</span>`;
    compareVectorsWrapper.appendChild(labelA);
    
    const rowA = document.createElement("div");
    renderEmbeddingVector(rowA, wordA, vecA);
    compareVectorsWrapper.appendChild(rowA);
    
    // Sana B
    const labelB = document.createElement("div");
    labelB.style.cssText = "font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted); margin-top: 10px; margin-bottom: 4px; display: flex; justify-content: space-between;";
    labelB.innerHTML = `<span>Sana B: <strong>${wordB}</strong></span> <span>Normi: ${Math.sqrt(normB).toFixed(3)}</span>`;
    compareVectorsWrapper.appendChild(labelB);
    
    const rowB = document.createElement("div");
    renderEmbeddingVector(rowB, wordB, vecB);
    compareVectorsWrapper.appendChild(rowB);
}

function runTokenizerTest() {
    if (!tokenizerTestInput || !tokenizerTestOutput) return;
    
    const text = tokenizerTestInput.value.trim();
    
    if (text === "") {
        tokenizerTestOutput.innerHTML = `<span style="color: var(--text-muted); font-style: italic; font-size: 0.8rem;">Kirjoita testataksesi...</span>`;
        return;
    }
    
    const vocabMap = {};
    vocabularyList.forEach((word, idx) => {
        vocabMap[word] = idx;
    });
    
    const words = text.split(/\s+/);
    tokenizerTestOutput.innerHTML = "";
    
    words.forEach(word => {
        const cleanWord = word.toLowerCase();
        const checkWord = (word === "<bos>" || word === "<eos>" || word === "<pad>") ? word : cleanWord;
        
        const tokenCard = document.createElement("div");
        
        if (vocabMap[checkWord] !== undefined) {
            const id = vocabMap[checkWord];
            
            let badgeBg = "rgba(162, 155, 254, 0.12)";
            let badgeBorder = "rgba(162, 155, 254, 0.25)";
            let badgeTextColor = "#fff";
            let idColor = "var(--neon-blue)";
            
            if (checkWord.startsWith("<") && checkWord.endsWith(">")) {
                badgeBg = "rgba(0, 210, 255, 0.08)";
                badgeBorder = "rgba(0, 210, 255, 0.25)";
                idColor = "var(--neon-blue)";
            } else if (checkWord === "katsoo" || checkWord === "jahtaa" || checkWord === "syö" || checkWord === "nukkuu") {
                badgeBg = "rgba(0, 184, 148, 0.08)";
                badgeBorder = "rgba(0, 184, 148, 0.25)";
                badgeTextColor = "var(--neon-green)";
            } else if (checkWord === "ja" || checkWord === "hyvin") {
                badgeBg = "rgba(253, 203, 110, 0.08)";
                badgeBorder = "rgba(253, 203, 110, 0.25)";
                badgeTextColor = "#ffeaa7";
            }
            
            tokenCard.style.cssText = `
                background: ${badgeBg};
                border: 1px solid ${badgeBorder};
                border-radius: 6px;
                padding: 4px 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 50px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                cursor: pointer;
                transition: var(--transition-fast);
            `;
            
            tokenCard.innerHTML = `
                <span style="font-family: var(--font-mono); font-weight: 700; color: ${badgeTextColor}; font-size: 0.82rem;">${word}</span>
                <span style="font-size: 0.65rem; font-family: var(--font-mono); color: ${idColor}; margin-top: 1px; font-weight:bold;">ID: ${id}</span>
            `;
            
            tokenCard.addEventListener("click", () => {
                selectVocabWord(checkWord);
            });
            
            tokenCard.addEventListener("mouseenter", () => {
                tokenCard.style.transform = "translateY(-2px)";
                tokenCard.style.borderColor = "var(--neon-blue)";
            });
            tokenCard.addEventListener("mouseleave", () => {
                tokenCard.style.transform = "none";
                tokenCard.style.borderColor = badgeBorder;
            });
        } else {
            tokenCard.style.cssText = `
                background: rgba(214, 48, 49, 0.1);
                border: 1px solid rgba(214, 48, 49, 0.3);
                border-radius: 6px;
                padding: 4px 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 50px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            `;
            tokenCard.innerHTML = `
                <span style="font-family: var(--font-mono); font-weight: 700; color: var(--neon-red); font-size: 0.82rem;">${word}</span>
                <span style="font-size: 0.62rem; font-weight: bold; color: var(--neon-red); margin-top: 1px;">Tuntematon</span>
            `;
        }
        
        tokenizerTestOutput.appendChild(tokenCard);
    });
}

// 2. Training Data Tab Logic
async function initDataTab() {
    if (!datasetData) {
        datasetSentencesList.innerHTML = `<div class="placeholder-text">Ladataan koulutusdataa...</div>`;
        try {
            const res = await fetch("/api/dataset");
            const data = await res.json();
            datasetData = data.dataset;
            datasetVocab = data.vocab;
        } catch (err) {
            console.error("Virhe ladattaessa koulutusdataa:", err);
            datasetSentencesList.innerHTML = `<div class="placeholder-text">Virhe ladattaessa dataa!</div>`;
            return;
        }
    }
    
    // Lasketaan tilastot
    const total = datasetData.length;
    datasetTotalSentences.textContent = total;
    
    const unique = new Set(datasetData).size;
    datasetUniqueSentences.textContent = unique;
    
    // Lasketaan frekvenssit
    const freqs = {};
    datasetData.forEach(sentence => {
        const words = sentence.split(/\s+/);
        words.forEach(w => {
            const clean = (w === "<bos>" || w === "<eos>" || w === "<pad>") ? w : w.toLowerCase();
            freqs[clean] = (freqs[clean] || 0) + 1;
        });
    });
    
    datasetFrequencies.innerHTML = "";
    const sortedFreqs = Object.entries(freqs).sort((a,b) => b[1] - a[1]);
    sortedFreqs.forEach(([word, count]) => {
        const badge = document.createElement("div");
        badge.className = "freq-badge";
        badge.innerHTML = `
            <span>${word}</span>
            <span class="freq-count">${count}</span>
        `;
        datasetFrequencies.appendChild(badge);
    });

    filterDataset();
}

function filterDataset() {
    if (!datasetData) return;
    
    const query = datasetSearchInput.value.trim().toLowerCase();
    datasetSentencesList.innerHTML = "";
    
    const filtered = datasetData.filter(s => s.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
        datasetSentencesList.innerHTML = `<div class="placeholder-text" style="font-size: 0.85rem; padding: 12px;">Ei hakutuloksia.</div>`;
        return;
    }
    
    const limit = filtered.length;
    for (let i = 0; i < limit; i++) {
        const sentence = filtered[i];
        
        const item = document.createElement("div");
        item.className = "dataset-item";
        item.textContent = `${i + 1}. ${sentence}`;
        
        item.addEventListener("click", () => {
            document.querySelectorAll(".dataset-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            visualizeAlignment(sentence);
        });
        
        datasetSentencesList.appendChild(item);
    }
}

function visualizeAlignment(sentence) {
    alignmentSelectedSentence.textContent = sentence;
    alignmentSelectedSentence.style.color = "#fff";
    alignmentGridContainer.innerHTML = "";
    alignmentGridContainer.style.display = "flex";
    
    const words = sentence.split(/\s+/);
    
    const vocabMap = {};
    vocabularyList.forEach((word, idx) => {
        vocabMap[word] = idx;
    });
    
    const ids = words.map(w => {
        const clean = (w === "<bos>" || w === "<eos>" || w === "<pad>") ? w : w.toLowerCase();
        return vocabMap[clean] !== undefined ? vocabMap[clean] : 0;
    });
    
    const maxLen = 11;
    const paddedIds = [...ids];
    const paddedWords = [...words];
    
    while (paddedIds.length < maxLen) {
        paddedIds.push(0);
        paddedWords.push("<pad>");
    }
    
    const finalIds = paddedIds.slice(0, maxLen);
    const finalWords = paddedWords.slice(0, maxLen);
    
    for (let t = 0; t < maxLen - 1; t++) {
        const xWord = finalWords[t];
        const xId = finalIds[t];
        const yWord = finalWords[t + 1];
        const yId = finalIds[t + 1];
        
        const row = document.createElement("div");
        row.className = "alignment-row";
        
        const step = document.createElement("div");
        step.className = "alignment-step";
        step.textContent = `t = ${t}`;
        row.appendChild(step);
        
        const io = document.createElement("div");
        io.className = "alignment-io";
        
        // Input X
        const inputBox = document.createElement("div");
        inputBox.className = "alignment-box";
        inputBox.innerHTML = `<span class="alignment-box-title">Syöte X(t)</span>`;
        
        const badgeX = document.createElement("div");
        badgeX.className = "alignment-token-badge";
        badgeX.style.backgroundColor = getWordColorBg(xWord);
        badgeX.innerHTML = `<span style="color: ${getWordColorText(xWord)}">${xWord}</span> <span style="font-size:0.7rem; color:var(--text-muted);">[ID: ${xId}]</span>`;
        inputBox.appendChild(badgeX);
        io.appendChild(inputBox);
        
        // Arrow
        const arrow = document.createElement("div");
        arrow.style.cssText = "align-self: center; color: var(--neon-blue); font-weight: bold; font-size: 1.2rem;";
        arrow.innerHTML = "&rarr;";
        io.appendChild(arrow);
        
        // Target Y
        const targetBox = document.createElement("div");
        targetBox.className = "alignment-box";
        targetBox.innerHTML = `<span class="alignment-box-title">Ennuste Y(t)</span>`;
        
        const badgeY = document.createElement("div");
        badgeY.className = "alignment-token-badge";
        badgeY.style.backgroundColor = getWordColorBg(yWord);
        badgeY.innerHTML = `<span style="color: ${getWordColorText(yWord)}">${yWord}</span> <span style="font-size:0.7rem; color:var(--text-muted);">[ID: ${yId}]</span>`;
        targetBox.appendChild(badgeY);
        io.appendChild(targetBox);
        
        row.appendChild(io);
        alignmentGridContainer.appendChild(row);
    }
}

function getWordColorBg(word) {
    const clean = word.toLowerCase();
    if (clean.startsWith("<") && clean.endsWith(">")) {
        return "rgba(0, 210, 255, 0.08)";
    } else if (clean === "katsoo" || clean === "jahtaa" || clean === "syö" || clean === "nukkuu") {
        return "rgba(0, 184, 148, 0.08)";
    } else if (clean === "ja" || clean === "hyvin") {
        return "rgba(253, 203, 110, 0.08)";
    } else {
        return "rgba(162, 155, 254, 0.12)";
    }
}

function getWordColorText(word) {
    const clean = word.toLowerCase();
    if (clean.startsWith("<") && clean.endsWith(">")) {
        return "var(--neon-blue)";
    } else if (clean === "katsoo" || clean === "jahtaa" || clean === "syö" || clean === "nukkuu") {
        return "var(--neon-green)";
    } else if (clean === "ja" || clean === "hyvin") {
        return "#ffeaa7";
    } else {
        return "#fff";
    }
}

// --- BATCH GENERATION TAB LOGIC ---
function initBatchTab() {
    // Aja automaattisesti ensimmäisen kerran jos taulukko on tyhjä tai sisältää vain placeholderin
    if (batchResultsBody && (batchResultsBody.children.length <= 1 || batchResultsBody.querySelector("td[colspan]"))) {
        runBatchGeneration();
    }
}

async function runBatchGeneration() {
    if (!btnRunBatch) return;
    
    btnRunBatch.disabled = true;
    btnRunBatch.textContent = "Generoidaan...";
    
    batchResultsBody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div class="pulse-indicator active" style="margin: 0 auto 12px; display: block;"></div>
                Generoidaan erää palvelimella. Hetki pieni...
            </td>
        </tr>
    `;
    
    const mode = batchModeSelect.value;
    const temp = parseFloat(tempSlider.value); // Peritään lämpötila tekstigeneraattorista
    
    try {
        const res = await fetch("/api/generate_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, temperature: temp })
        });
        
        const data = await res.json();
        const results = data.results;
        
        batchResultsBody.innerHTML = "";
        
        let correctCount = 0;
        const totalCount = results.length;
        
        results.forEach(resItem => {
            const validation = validateSentence(resItem.sentence);
            if (validation.valid) {
                correctCount++;
            }
            
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid rgba(255, 255, 255, 0.03)";
            
            // Muotoillaan syöte ja generointi väreillä
            const promptMarkup = `<span style="font-family: var(--font-mono); color: var(--text-muted);">${resItem.prompt}</span>`;
            const continuationMarkup = `<span style="font-family: var(--font-mono); color: var(--neon-green); font-weight: bold;">${resItem.continuation}</span>`;
            
            // Validointibadgen tyylit
            let badgeStyle = "background: rgba(255, 76, 76, 0.08); color: #ff7675; border-color: rgba(255, 76, 76, 0.15);";
            if (validation.valid) {
                badgeStyle = "background: rgba(46, 204, 113, 0.08); color: var(--neon-green); border-color: rgba(46, 204, 113, 0.15);";
            }
            
            const validationMarkup = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span class="badge" style="${badgeStyle}">${validation.valid ? "✅ Logiikka OK" : "❌ Virhe"}</span>
                    ${!validation.valid ? `<span style="font-size: 0.75rem; color: #ff7675;">${validation.reason}</span>` : ""}
                </div>
            `;
            
            tr.innerHTML = `
                <td style="padding: 12px; vertical-align: top;">${promptMarkup}</td>
                <td style="padding: 12px; vertical-align: top;">${continuationMarkup}</td>
                <td style="padding: 12px; vertical-align: top;">${validationMarkup}</td>
            `;
            
            batchResultsBody.appendChild(tr);
        });
        
        // Päivitetään tilastot
        const pct = ((correctCount / totalCount) * 100).toFixed(1);
        batchStatTotal.textContent = totalCount;
        batchStatCorrect.textContent = correctCount;
        batchStatPct.textContent = `${pct}%`;
        
    } catch (err) {
        console.error("Erägenerointi epäonnistui:", err);
        batchResultsBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px; color: #ff7675;">
                    Erägenerointi epäonnistui. Varmista, että palvelin on päällä.
                </td>
            </tr>
        `;
    } finally {
        btnRunBatch.disabled = false;
        btnRunBatch.textContent = "Aja eräajo";
    }
}

function validateSentence(sentence) {
    if (window.modelValidators && window.modelValidators[currentModelName]) {
        return window.modelValidators[currentModelName](sentence);
    }
    return { valid: true, reason: "Validaattoria ei ole ladattu tai sitä ei löydy." };
}

async function initModelSelector() {
    if (!modelSelector) return;
    try {
        const res = await fetch("/api/models");
        const data = await res.json();
        
        modelSelector.innerHTML = "";
        data.models.forEach(modelName => {
            const opt = document.createElement("option");
            opt.value = modelName;
            opt.textContent = modelName;
            modelSelector.appendChild(opt);
        });
        
        // Haetaan status ja asetetaan valittu malli dropdownissa
        const statusRes = await fetch("/api/status");
        const statusData = await statusRes.json();
        if (statusData.current_model) {
            modelSelector.value = statusData.current_model;
        }
    } catch (err) {
        console.error("Virhe ladattaessa malleja:", err);
    }
}

async function selectModel(modelName) {
    try {
        const res = await fetch("/api/select_model", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model_name: modelName })
        });
        const data = await res.json();
        if (!res.ok) {
            alert("Mallin lataus epäonnistui: " + (data.error || "Tuntematon virhe"));
            // Palauta valinta dropdownissa
            initModelSelector();
            return;
        }
        alert(`Malli '${modelName}' ladattu onnistuneesti!`);
        fetchStatus();
        // Nollataan visualisoinnit
        btnClearPrompt.click();
        if (activeTab === "weights") {
            fetchWeights(true);
        }
    } catch (err) {
        alert("Yhteysvirhe vaihdettaessa mallia.");
        console.error("Mallin vaihto epäonnistui:", err);
    }
}


