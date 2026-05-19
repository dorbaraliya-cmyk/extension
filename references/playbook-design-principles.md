# Playbook Design Principles (BSDM)

## BSDM framework
Every design decision runs through four lenses:
- **B**uyer experience — what does the rep/buyer see?
- **S**eller guardrails — what prevents bad deals?
- **D**ata integrity — what keeps CRM/ERP clean?
- **M**aintainability — what makes future changes safe?

## Default baseline structure (4 groups)
```
Deal_Information (regular) — always present
Product_Filters  (regular) — only if catalog filtering needed
Product_Selection (repeatable, table) — always present
Subscriptions    (repeatable, table) — optional, CRM-pulled renewals
Terms_and_Conditions (regular) — always present, 3+ questions minimum
```

### Deal_Information questions
- `Deal_Type`: text_list `['New Business', 'Renewal']` — NEVER include `Add-On` (that's a product category)
- `Start_Date`: date
- `End_Date`: date formula = derived from Start + Term (locked, read-only)
- `Term_in_Months`: numeric
- `Term_in_Years`: hidden helper

### Hard rules — never break
- **No 1- or 2-question groups** — merge into an adjacent group (BSDM-S)
- **No "Select" placeholder** as text_list default — use the first real value (BSDM-D)
- **`[General.Currency]` is OOTB** — NEVER add a Currency question to the playbook
- Multi-currency → use List Price Factors, not a playbook question
- CRM-synced fields (Account, Currency, Close Date) must NOT be re-asked as playbook questions
- `manual_item` type for SKU columns — plain `text` breaks catalog picker binding

### Before designing — 7 triage questions
1. Sales motion (new, renewal, add-on)?
2. CRM (Salesforce / HubSpot / Dynamics)?
3. Multi-currency?
4. Catalog size?
5. Renewals via CRM External Query?
6. Approval complexity?
7. Industry-specific requirements?

## Guided Selling vs Product_Selection
- If ≥1 product dependency → **Guided Selling** model, NOT `Product_Selection`
- This is enforced at preflight — wrong model = hard fail

## Approvals are NOT a question group
- Submit validations (block) → `submit-validation-builder`
- Sign-off routing → `approval-workflow-builder`
- If only manual rep flags needed → add one `Approval_Notes` text field to existing group

## Brownfield discipline (4 steps — mandatory for existing playbooks)
1. **Probe** — load and read everything that exists
2. **Reuse/extend** — keep what matches, don't recreate
3. **Rewire** — only change what needs changing
4. **Audit** — check downstream consumers: catalog rules, output docs, external query placeholders, CRM field mappings

## Deletions
Must include `deletedItems: [{ deletedType, parentGUID, entityGUID }]` in the POST body.
Removing from the array alone is silently ignored by the server.
- `deletedType: 'SOLUTION'` for groups
- `deletedType: 'SOLUTION_ATTRIBUTE'` for questions

## Moving questions across groups
Three things required:
1. Set `solutionGUID` to new group GUID + update `ordinalValue`
2. Move in the solutions array
3. Rewrite ALL `[OldGroup.X]` references in both playbook rules AND catalog assignment/pricing rules

## Cross-version group copy
Walk all nested objects → null out `guid`/`solutionGUID` → point `versionGUID`/`playbookGUID`/`accountGUID` at destination → save.

## Product_Selection group pattern
- `productSelectionType: 'FILTER'`
- Filter design rules:
  1. Exactly ONE preFilter driver question — multiple preFilters combine AND → zero results
  2. Driver attribute must be populated on EVERY product
  3. NEVER "All" as a text_list value
  4. Always set a real default value — never `defaultValue: ''`
- **Two-pass save**: Pass 1 sets type + saves (server regenerates filters[]). Pass 2 reloads + modifies preFilter in place + saves again.

## Pricing rules
- Volume discount binding uses display `name` NOT internal `id`
- No double-discount: never stack multi-rule conditional pricing AND volume discount table on same product
- Rule strings go through `rule()` helper (spaces normalized, `<>` → `!=`)
