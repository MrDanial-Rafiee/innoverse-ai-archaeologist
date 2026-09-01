# INNOVERSE — AI Archaeologist
## Evidence-Based Reconstruction of Ancient Languages

> **Reading the unreadable — with evidence, not guesswork.**
>
> INNOVERSE is an explainable AI platform for reconstructing and translating incomplete ancient-language texts. It combines an ensemble of ByT5 models, retrieval from attested historical sources, lexical and translation-memory support, semantic analysis, archaeological knowledge graphs, calibrated confidence, and evidence-based explanations.

---

## 1. Project Overview

Ancient inscriptions and clay tablets are often incomplete because of damage, erosion, missing fragments, human activity, or the passage of time. Reconstructing these fragments is difficult, slow, and highly dependent on specialist knowledge.

INNOVERSE was designed to assist researchers and learners by turning incomplete textual fragments into **proposed reconstructions and translations while exposing the evidence behind each prediction**.

The system does not treat reconstruction as a simple missing-word prediction problem. Instead, it combines multiple layers of linguistic and historical information:

- Deep-learning reconstruction
- Lexical matching
- Translation memory
- Retrieval from published attested tablet lines
- Semantic analysis
- Archaeological knowledge graphs
- Candidate generation and reranking
- Confidence estimation and calibration
- Explainability reports
- Hallucination filtering
- Quality evaluation and automated tests

The first proof of concept focuses on **Akkadian**, while the architecture is intended to extend to other low-resource, endangered, and ancient languages.

---

# 2. What Makes INNOVERSE Different?

Most reconstruction systems can produce a plausible answer. The harder question is:

> **Why should we trust this answer?**

INNOVERSE is designed around that question.

For every reconstruction, the system attempts to distinguish between evidence-backed recovery and model inference.

### Evidence Levels

| Label | Meaning |
|---|---|
| **Attested Match** | The fragment matches a real, published tablet line. |
| **Cited Parallel** | The system finds a closely related published tablet line and uses it as supporting evidence. |
| **Model Estimate** | No sufficiently close attested parallel is available, so the model makes a contextual inference. |

This distinction is central to the project: a model estimate is not presented as historical certainty.

The engine also provides confidence information and supporting evidence so users can inspect the reasoning behind a reconstruction.

---

# 3. Core Features

### AI Reconstruction
- Ensemble of three fine-tuned ByT5-base checkpoints
- Gap-aware reconstruction workflow
- Candidate generation through sampling
- Multiple possible reconstructions
- Candidate reranking

### Evidence & Retrieval
- Retrieval index over historical material
- Curated attested-parallel corpus
- Similarity-based evidence matching
- Published tablet-line citations when available
- Translation-memory support

### Linguistic Analysis
- Lexical matching
- Semantic analysis
- Dictionary lookup
- Transliteration and cuneiform support
- Grammar-aware interpretation

### Explainable AI
- Per-gap confidence
- Overall confidence
- Evidence labels
- Supporting historical examples
- Explanation of why a candidate was selected
- Explicit distinction between evidence and inference

### Archaeological Knowledge Graph
The system represents relationships among:

- Historical periods
- Historical entities
- Semantic concepts
- Linguistic relationships
- Words
- Characters
- Archaeological concepts

These relationships can be visualized through interactive graph layers.

### Quality & Reliability
- chrF evaluation
- Confidence calibration
- Ablation analysis
- Automated tests
- Hallucination filtering
- Back-translation fluency checking

---

# 4. System Architecture

INNOVERSE combines the reconstruction architecture described in the AI Archaeologist system with the evidence-grounded pipeline of the INNOVERSE engine.

```text
                 Fragmented Ancient Text
                           │
                           ▼
                    ┌─────────────┐
                    │ Preprocess  │
                    └──────┬──────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   ByT5 Model Ensemble  │
              │   Model 1 + 2 + 3      │
              └───────────┬────────────┘
                          │
                          ▼
                Candidate Generation
                          │
                          ▼
             ┌─────────────────────────┐
             │ Lexicon / Translation   │
             │ Memory / Dictionary     │
             └────────────┬────────────┘
                          │
                          ▼
                Historical Retrieval
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       Attested Match          Cited Parallel
              │                       │
              └───────────┬───────────┘
                          ▼
                  Semantic Analysis
                          │
                          ▼
                Knowledge Graph
                          │
                          ▼
                  Candidate Reranking
                          │
                          ▼
              Confidence Calibration
                          │
                          ▼
               Explainability Layer
                          │
                          ▼
                 Final Reconstruction
```

---

# 5. How the AI Model Works

## 5.1 ByT5 Ensemble

The system uses three fine-tuned **ByT5-base** checkpoints for Akkadian-to-English translation with gap handling.

At startup, their weights are averaged into a single **model soup**. This allows the system to combine the three checkpoints while keeping memory usage closer to that of one model.

ByT5 operates on bytes rather than traditional word pieces, which is useful for irregular transliterated Akkadian spelling.

The model soup is cached after its first construction so later launches can load it much faster.

---

## 5.2 Candidate Generation

Instead of always selecting one deterministic output, the engine uses sampling to generate multiple candidate reconstructions.

The candidates are evaluated for characteristics such as:

- Remaining gap markers
- Sensible output length
- Repetition
- Overall coherence

The strongest candidate is then selected.

This also allows the user to reconstruct the same fragment again and receive a different plausible reading.

---

# 6. Gap Reconstruction

The reconstruction endpoint accepts transliterated fragments containing missing spans such as:

```text
<gap>
```

or

```text
<big_gap>
```

The system returns:

- Reconstructed English
- Per-token information
- Missing-token information
- Alternative fills
- Per-gap confidence
- Overall confidence
- Evidence source

### Important Design Principle

The system does **not** claim that every reconstructed Akkadian token is the original historical sign.

The ByT5 models were trained for Akkadian-to-English translation. Therefore, when an Akkadian word is derived for a gap, it can represent a contextual inference mapped through available lexical resources rather than guaranteed recovery of the original damaged sign.

This limitation is intentionally exposed to the user.

---

# 7. Evidence-Based Reconstruction

This is one of the most important parts of INNOVERSE.

When possible, the system compares the input fragment with a curated corpus of real, published tablet lines.

Ancient texts can be highly formulaic, meaning that a damaged fragment may have a close historical parallel elsewhere.

The engine therefore attempts to ground a reconstruction in actual evidence before relying solely on model inference.

### Decision Logic

```text
                    Input Fragment
                          │
                          ▼
                 Search Attested Corpus
                          │
                 ┌────────┴────────┐
                 │                 │
             Strong Match       No Strong Match
                 │                 │
                 ▼                 ▼
          Attested/Cited       Model Inference
             Evidence               │
                 │                   │
                 └─────────┬─────────┘
                           ▼
                   Confidence + Label
```

If no sufficiently reliable parallel is found, the system can leave a gap unresolved rather than inventing unsupported historical content.

---

# 8. Explainable AI

INNOVERSE is designed not merely to output a reconstruction, but to explain the evidence supporting it.

For a selected candidate, the system can consider:

### Grammar
Does the proposed word fit the grammatical role required by the sentence?

### Semantic Context
Does the candidate make sense with nearby concepts and actions?

### Lexical Evidence
Does it correspond to known historical vocabulary?

### Translation Memory
Do similar historical examples contain comparable constructions?

### Historical Evidence
Does a real published tablet line support the proposed reading?

### Knowledge Graph
Is the candidate connected to relevant rulers, places, temples, religious concepts, periods, or linguistic relationships?

The final output can therefore communicate both:

**What the system thinks**

and

**Why the system thinks it.**

---

# 9. Archaeological Knowledge Graph

The knowledge graph extends reconstruction beyond isolated words.

Instead of treating language as a sequence of independent tokens, the system models relationships among historical and linguistic entities.

Example:

```text
                 Historical Period
                        │
                        │
                      belongs
                        │
                        ▼
                      King
                    /     \
                   /       \
              associated   ruled
                 /           \
                ▼             ▼
             Temple        Kingdom
                │
             associated
                │
                ▼
             Religion
```

The graph can represent semantic, historical, temporal, and linguistic relationships.

This provides another layer of context for interpretation and visualization.

---

# 10. Example

### Input

```text
The k__g built the temple for god.
```

### Candidate Reconstructions

```text
king   — 94%
kong   — 3%
keng   — 3%
```

### Selected

```text
The king built the temple for god.
```

### Supporting Reasoning

- **Grammar:** “king” functions naturally as the subject.
- **Semantic context:** building a temple is strongly compatible with a ruler/person.
- **Lexical matching:** “king” is consistent with historical vocabulary.
- **Historical parallels:** similar constructions can support the reading when an attested parallel is available.
- **Knowledge graph:** a king can connect to rulers, temples, religious contexts, and historical periods.

### Confidence

```text
94%
```

The confidence score is intended as an estimate of reliability, not proof that the reconstruction is historically certain.

---

# 11. User Experience

INNOVERSE is designed as an interactive platform rather than a command-line-only research tool.

### Gap Reconstruction

Users can:

1. Open the Translation section.
2. Select a broken-tablet example.
3. Press **Reconstruct**.
4. Inspect the reconstructed text.
5. View confidence.
6. Inspect the evidence line.
7. Switch between reconstructed language and English where supported.
8. Copy results.
9. Listen to reconstructed text through the interface where available.
10. Re-run reconstruction to explore another candidate.

Users can also enter their own transliterated Akkadian and mark damaged sections using gap controls.

---

# 12. Dictionary & Cuneiform Tools

The platform includes an Akkadian dictionary containing approximately **11,154 entries**.

The dictionary supports:

- Two-way lookup
- Cuneiform keyboard
- Syllable pronunciation
- Transliteration support
- Grammar-related interpretation

The platform also provides cuneiform-related API functionality for transliteration conversion.

---

# 13. API Architecture

The Python engine serves both the website and its API from the same local address.

```text
Browser
   │
   ▼
innoverse_pipeline_final.py
   │
   ├── /
   │     Website
   │
   ├── /api/health
   │     Engine status
   │
   ├── /api/reconstruct
   │     Translation + gap reconstruction
   │
   ├── /api/cuneiform
   │     Transliteration ↔ cuneiform
   │
   └── /api/graph
         Entity + timeline graph
```

This local architecture avoids the need for a separate cross-origin frontend/backend configuration.

---

# 14. Advanced Reliability Pipeline

Beyond the core model, the engine includes additional mechanisms intended to improve reliability:

- MBR decoding
- Candidate reranking
- N-gram language modeling
- Back-translation checks
- Retrieval indexing
- Hallucination filtering
- Proper-name normalization
- Confidence calibration
- Evidence classification

These components work as supporting layers around the main translation/reconstruction model.

---

# 15. Measuring Quality

INNOVERSE does not rely only on subjective demonstrations.

The project includes several evaluation mechanisms.

## chrF

The system uses **chrF**, a character n-gram overlap metric commonly used for machine translation evaluation.

## Confidence Calibration

Confidence is checked against measured quality so that a high confidence value is intended to correspond to genuinely stronger outputs.

## Ablation

Individual components can be disabled to investigate how much each contributes to system performance.

## Automated Testing

The pipeline includes **54 self-running tests**.

Run:

```bash
python innoverse_pipeline_final.py --test
```

The exact evaluation figures depend on the held-out dataset used for evaluation.

---

# 16. Quick Start

## Requirements

| Requirement | Detail |
|---|---|
| OS | Windows |
| Python | 3.10+ |
| GPU | Not required |
| RAM | Approximately 7–9 GB during first model build |
| Internet | Required for initial package/model setup; operation can then be local/offline |
| Packages | numpy, pandas, torch, transformers, tokenizers, safetensors, plotly |

---

## Step 1 — Download the Models

The three fine-tuned models are several gigabytes in total, too large to ship with the project, so they are hosted on Google Drive as a single archive:

**https://drive.google.com/file/d/126gJDxXO2XYFLlok8JBMDueTiD9rFuNV/view?usp=drive_link**

Download it and extract the three model folders into the project's `models/` folder, so the structure is exactly:

```text
models/
├── model_1/
├── model_2/
└── model_3/
```

If you launch before the models are in place, the launcher stops and shows you this same link, so nothing breaks silently.

---

## Step 2 — Launch

Run:

```text
RUN_INNOVERSE.bat
```

The launcher:

1. Finds Python.
2. Checks required packages.
3. Creates/uses the local environment.
4. Starts the engine.
5. Loads the models.
6. Opens the website.

The site runs locally at:

```text
http://127.0.0.1:3000
```

### Important

Do not open `index.html` directly.

Always start the application through:

```text
RUN_INNOVERSE.bat
```

---

# 17. Manual Launch

If required, the engine can also be started manually:

```bash
python innoverse_pipeline_final.py --serve --ui-dir . --model-path models/model_1 --model-path models/model_2 --model-path models/model_3
```

---

# 18. First Launch

The first launch can take a few minutes because the three checkpoints are combined into the model soup and cached.

After caching, subsequent starts should be significantly faster.

Keep the **INNOVERSE Engine** window open while using the website.

Closing that engine window stops the local service.

---

# 19. Project Structure

```text
ui2innovers/
│
├── RUN_INNOVERSE.bat
├── index.html
│
├── css/
├── js/
│
├── data/
│   └── akkadian/
│       ├── dictionary
│       ├── sign lists
│       ├── corpus
│       └── attested_parallels.tsv
│
├── images/
│
├── innoverse_pipeline_final.py
├── requirements.txt
│
├── models/
│   ├── model_1/
│   ├── model_2/
│   ├── model_3/
│   └── _cache/
│
└── LICENSE
```

---

# 20. Data & Sources

The project uses open or appropriately licensed resources described by the original project documentation.

| Resource | Purpose | License |
|---|---|---|
| Oracc + OGSL | Dictionary and cuneiform sign families | CC BY-SA 3.0 |
| veezbo corpus | English reference corpus | MIT |
| Open Oracc editions | Curated attested-parallel corpus | CC BY-SA 3.0 |
| Google ByT5-base | Base model | Apache-2.0 |

The project's original source code is released under the MIT license according to the project documentation.

Third-party data, models, fonts, and libraries retain their respective licenses.

---

# 21. Responsible Reconstruction

Ancient-language reconstruction contains inherent uncertainty.

INNOVERSE therefore follows several principles:

1. **Inference is not recovery.**
2. **Evidence should be visible.**
3. **Confidence should be calibrated.**
4. **Historical parallels should be cited when available.**
5. **Unsupported certainty should be avoided.**
6. **A missing value can remain unresolved when evidence is insufficient.**

This is especially important for low-resource languages where datasets are limited.

---

# 22. Limitations

The system is strongest when:

- The fragment resembles known historical formulas.
- A close attested parallel exists.
- The vocabulary is represented in available resources.
- The surrounding context provides strong semantic constraints.

It is weaker when:

- A fragment is artificially damaged.
- No close historical parallel exists.
- The required vocabulary is absent from available data.
- Historical context is highly ambiguous.

The system should therefore be treated as an **assistive research and exploration tool**, not as an unquestionable replacement for archaeological or linguistic scholarship.

---

# 23. Future Roadmap

## OCR for Damaged Inscriptions

Add OCR and image understanding so users can provide photographs or scans of damaged inscriptions directly instead of manually transcribing them.

## Graph Neural Networks

Explore GNN-based approaches to make deeper use of relationships contained in the archaeological knowledge graph.

## Larger Attested Corpus

Expand the historical retrieval corpus so more fragments can be grounded in published evidence.

## Multilingual Expansion

Extend the architecture beyond Akkadian to additional ancient, low-resource, and endangered languages.

## Better Evaluation

Publish broader held-out evaluation results, calibration measurements, and component-level ablation results.

## Richer Historical Reasoning

Combine linguistic evidence with temporal, geographical, cultural, and archaeological relationships.

---

# 24. Why This Matters Beyond Akkadian

Akkadian is the proof of concept.

The broader objective is to develop a reusable methodology for languages where:

- Data is scarce.
- Texts are fragmented.
- Standard NLP resources are limited.
- Expert knowledge is difficult to access.
- Uncertainty is unavoidable.

The combination of:

```text
AI Models
    +
Historical Retrieval
    +
Evidence
    +
Knowledge Graphs
    +
Confidence
    +
Explainability
```

can provide a foundation for future tools for ancient and endangered languages.

---

# 25. Troubleshooting

| Problem | Solution |
|---|---|
| Page looks unstyled | Start the project through `RUN_INNOVERSE.bat` instead of opening `index.html`. |
| Models not found | Download the model archive from the Google Drive link in Step 1 and extract `model_1`, `model_2`, `model_3` into `models/`. |
| Python not found | Install Python 3.10+ and add it to PATH. |
| First launch is slow | Normal. The model soup is being built and cached. |
| Port 3000 is in use | Close any previous engine process and launch again. |

---

# 26. Recommended Demo Flow for Judges

For the strongest demonstration:

### 1. Start the application

Run:

```text
RUN_INNOVERSE.bat
```

### 2. Open Gap Reconstruction

Use one of the prepared broken-tablet examples.

### 3. Reconstruct

Show the reconstructed result and confidence.

### 4. Show the Evidence

This is the key demonstration.

Show whether the result is:

```text
Attested Match
```

or:

```text
Cited Parallel
```

or:

```text
Model Estimate
```

### 5. Show the Knowledge Graph

Demonstrate how the reconstructed information connects to historical and semantic entities.

### 6. Show the AI Engine

Use the live engine graph to explain the actual backend pipeline.

### 7. Show Evaluation

Demonstrate:

- chrF
- calibration
- ablation
- automated tests

### 8. Finish With the Bigger Goal

Explain that Akkadian is the proof of concept for a broader evidence-based AI framework for low-resource and endangered languages.

---

# 27. Team

- **Amirhossein Jafarnezhad** — Team leader / supervisor and project direction
- **Sepehr Kakoli** — Integration, technical support, confidence-related work and performance analysis
- **Seyedeh Sara Davari** — Interactive graphs, visualizations, code organization and documentation
- **Danial Rafiee** — UI/UX design, front-end, coordination and interactive experience
- **Ali Akbar Khara** — Baseline implementation

---

# 28. Acknowledgements

This project was developed for the **Innoverse Expo AI Programming Challenge**.

The project gave the team an opportunity to explore how modern AI methods can be applied to ancient-language reconstruction and how explainable AI can make predictions more transparent and useful.

---

## Final Principle

> **INNOVERSE does not ask users to blindly trust an AI reconstruction.**
>
> It tries to show **what the system predicts, where the evidence comes from, how confident it is, and where uncertainty remains.**

**Evidence first. Reconstruction second.**
