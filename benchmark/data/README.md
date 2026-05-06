# Benchmark data

These items are committed (with minor JS-sandbox adaptations for HumanEval) so anyone can clone-and-rerun and verify the cost/accuracy numbers. MMLU items are unchanged from upstream. HumanEval-JS `prompt` fields have the trailing `{` removed and `assert.deepEqual(A, B)` calls converted to `console.assert(JSON.stringify(A) === JSON.stringify(B))` so the data runs cleanly in the score harness's `vm.runInNewContext` sandbox. Typos and quirks in upstream questions/docstrings are preserved verbatim.

## Sources

### `mmlu-50.jsonl` — 50 items from MMLU

Sampled from [cais/mmlu](https://huggingface.co/datasets/cais/mmlu) (MIT license). Stratified: 10 items each from 5 subjects:

- `high_school_world_history`
- `college_biology`
- `miscellaneous`
- `formal_logic`
- `professional_psychology`

Each line is a JSON object with `subject`, `question`, `choices` (4-element array), `answer` (0-3 index of correct choice).

### `humaneval-25.jsonl` — 25 items from HumanEval-JS

Sampled from [nuprl/MultiPL-E HumanEval-JS variant](https://huggingface.co/datasets/nuprl/MultiPL-E) (MIT license).

Each line is a JSON object with `task_id`, `prompt` (function signature + docstring), `tests` (JS test code), `entry_point` (function name).

## Reproducing

The benchmark harness reads these files directly. To recreate from source datasets, see [reproduce.md](reproduce.md) (not committed; left as exercise — these committed snapshots are the canonical test set).
