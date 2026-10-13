---
'@mobile-reality/mdma-cli': minor
---

Bring the prompt builder's master prompts up to date with the current spec and author prompt.

- `MASTER_PROMPT` and the Anthropic/Google variants document `{ source, params }` for table `data`, chart `data` and form select `options`, table `sortable` / `filterable` / `pageSize`, quoted numeric option values, and the standalone `custom` envelope.
- New "External Data Sources" section: catalog entries are definitions without data, `rows` feeds `table.data`, `series` feeds `chart.data`, `options` feeds select `options`, and data needed as both a table and a chart uses two sources (`rows` and `series`). Generated prompts reference sources and never inline their data.
- New rule that a generated prompt never shows two interactive components together; the KYC example now shows the approval gate and the tasklist in separate steps.
- New `anthropic/sonnet-5.5` master prompt variant (`MASTER_PROMPT_SONNET_5_5`, selected for `claude-sonnet-5-5`) that describes `thinking` as a plan summary, because Sonnet 5.5 refuses system prompts that ask it to write out its reasoning. Other variants keep their wording.
- `mdma prompt --data-sources` and `mdma validate --data-sources` describe the definitions file (`name`, `kind`, `columns`, `params`) in `--help`, and `createProgram()` now builds the commander program.
