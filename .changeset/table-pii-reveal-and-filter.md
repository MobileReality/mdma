---
'@mobile-reality/mdma-renderer-react': patch
'@mobile-reality/mdma-renderer-vue': patch
'@mobile-reality/mdma-renderer-vanilla': patch
---

Masked table cells on a data source mask again when the rows change (page, sort, filter, reload) instead of carrying a reveal over to another record, and `filterable` source-backed tables render a filter input wired to `setDataFilter`.
