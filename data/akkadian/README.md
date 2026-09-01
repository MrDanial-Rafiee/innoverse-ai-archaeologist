# Akkadian "Translate" — dictionary data

> Data behind the site's **Translate** tool: a bidirectional Akkadian to English
> dictionary, comparable in spirit to a desktop Akkadian dictionary but built
> entirely from **openly licensed** sources. This folder holds the data and its
> documentation.

---

## Files in this folder

| File | What it is | License |
|---|---|---|
| **`akkadian_dictionary.json`** | The main Akkadian to English dictionary — **11,154 unique entries** | **CC BY-SA 3.0** (Oracc + OGSL) |
| **`akkadian_dictionary.csv`** | The same data as CSV, for quick review in a spreadsheet | CC BY-SA 3.0 |
| `akkadian_english_corpus.txt` | 9,720 lines of published English translations of Akkadian texts (used for example sentences) | **MIT** |
| `attested_parallels.tsv` | Curated attested formulae (transliteration + gloss) used by the gap-reconstruction retriever | CC BY-SA 3.0 |
| `LICENSE_veezbo_MIT.txt` | License for the corpus above | MIT |
| `cuneiform_keys.js` / `cuneiform_signs.js` | Cuneiform keyboard and sign tables | CC BY-SA (OGSL) |
| `README.md` | This note | — |

---

## Structure of `akkadian_dictionary.json`

```json
{
  "meta": {
    "title": "Akkadian–English dictionary (consolidated from Oracc glossaries)",
    "license": "CC BY-SA 3.0",
    "attribution": "© respective Oracc projects, reused under CC BY-SA 3.0",
    "projects": ["rinap/rinap1", "saao/saa01", "dcclt", "cams/gkab", "ogsl", ...],
    "entry_count": 11154,
    "fields": { ... }
  },
  "entries": [
    {
      "translit":  "šarru",        // Latin transliteration (head word)
      "pos":       "N",            // part of speech: N noun, V verb, AJ adjective, AV adverb, PRP preposition, NU numeral, ...
      "en":        ["king"],       // English meanings (guide word and senses)
      "logograms": ["LUGAL","MAN"],// logographic (Sumerogram) spellings
      "cuneiform": "𒈗",           // Unicode cuneiform for the logogram, where one exists
      "freq":      21601,          // usage frequency (number of real attestations)
      "sources":   ["rinap",...],  // Oracc projects the word was drawn from
      "id":        "šarru[king]N"  // Oracc identifier
    }
  ]
}
```

- Entries are **sorted by frequency** (most common first), which is ideal for a translator.
- **Bidirectional lookup**, on both `translit` and the `en` array.
- **635 entries** carry a Unicode cuneiform sign; the rest are written syllabically and have no single-sign logogram (this is expected).
- Editable: `entries` is a plain array, so adding or removing words is straightforward.

---

## Where the data came from

1. **Primary source:** the **Oracc** (Open Richly Annotated Cuneiform Corpus) glossaries
   from 23 substantial Akkadian projects — Neo-Assyrian and Babylonian royal inscriptions
   (rinap, riao, ribo), state letters and archives (saao/saa01…saa19), literary, magical
   and medical texts (cams, cmawro, blms, akklove, asbp/ninmed), technical texts (glass,
   oimea, suhu), and the ancient **lexical lists (dcclt)**, which are the richest source of
   vocabulary. License: **CC BY-SA 3.0**.
2. **Cuneiform:** logogram names were mapped to Unicode cuneiform characters with **OGSL**
   (the Oracc Global Sign List), e.g. LUGAL → 𒈗. License: CC BY-SA.
3. **Example corpus:** `akkadian_english_corpus.txt` (MIT) for translated sample sentences.
4. To add more Oracc projects later, fetch `http://oracc.museum.upenn.edu/json/<project>.zip`
   (sub-projects use `parent-sub.zip`), then read the `gloss-akk*.json` files inside.

---

## Copyright

- **Used, with attribution:** Oracc and OGSL (**CC BY-SA** — credit required, and if
  redistributed it must stay under the same license) and the veezbo corpus (**MIT**).
  Attribution is recorded in the file's `meta` block.
- **Not used (copyrighted):** the CAD, CDA and AHw dictionaries and the assyrianlanguages
  site were consulted for human cross-checking only; none of their content was copied.
