# DealHub Skills Index

Skills from `dealhub-playbook-automation` and `dealhub-cs-knowledge` repos.
These define HOW to build common DealHub configurations.

## `dealhub-build-preflight`
Mandatory BSDM design checklist before any custom build. 60-second review before first API call.
Blocks on: wrong picker-vs-guided model, single-question groups, unspaced rules, mandatory defaults, building before reading spec.
Run this mentally before starting any new playbook build.

## `cpq-baseline-architect`
Design layer for new-client onboarding. Applies BSDM. Produces group/question plan before execution.
Outputs: Deal_Information + Product_Selection + optional Subscriptions + Terms_and_Conditions.
See `references/playbook-design-principles.md` for full spec.

## `dealhub-formula-author`
One-stop checklist for every expression. Prevents: whitespace errors, wrong-context quoting, `[Item.X]` scope, missing `dateAttributeValueType`.
See `references/formula-rules-guide.md` for full rules.

## `default-product-selection`
Builds `Product_Selection` repeatable group + optional `Product_Filters` filter framework.
Key constraint: TWO-PASS save pattern mandatory (first save regenerates filters[], second wires preFilter).

## `approval-workflow-builder`
Rule-Based approval workflows only. Endpoint: `POST /workflowSpecialRule/save`.
Rule polarity: expression = scenario that NEEDS approval.
If hard-block needed → use `submit-validation-builder` instead.

## `submit-validation-builder`
Block-on-submit validations. Endpoint: `POST /submitValidationSettings`.
Rule polarity: `activeWhen` = the BAD scenario (TRUE = block).
Prefer question-level guardrails (min/max) when constraint is single-field.

## `external-query-builder`
Saved CRM queries (Salesforce SOQL, HubSpot JSON filter, Dynamics FetchXML).
Critical: use `id` from POST response for `customObjectQueryId`, NOT `guid`.

## `subscriptions-builder`
Full Subscriptions group: 14 questions + button config + assignment template + pricing rule.
11 steps in order. Auto-invokes `external-query-builder` if query doesn't exist.

## `default-bundle-builder`
Creates/updates DealHub bundles via public Product Catalog API (Bearer token auth).
Two types: `FIXED_PRICE` (parent owns price) | `PRODUCT_SUMMARY` (parent = markup × sum of children).

## `dealhub-importer`
Imports volume-discount tier tables from Google Sheet or CSV.
API path: `POST /volumeDiscount/save`. Playwright fallback available.

## `multi-year-builder`
Multi-year deal structures. FIRST: probe `enableSystems` on playbook.
Path A: enable Multi-System (clean). Path B: extend existing. Path C: fallback per-year assignment rules (not HAR-verified — confirm before building).
Multi-System is ONE-WAY per use case — cannot run Multi-Year AND Multi-Offer simultaneously.

## `default-saas-playbook`
End-to-end SaaS playbook build (10 ordered steps). Includes: version, 4 groups, catalog, assignment rules, filter wiring, external query, subscriptions, proposal attributes, preflight.
Non-negotiable: assignment-rule template `[Product_Selection.SKU] = [Item.sku]` on every build.

## `playbook-automation`
Catch-all orchestrator. Full list of MCP tools including:
- `rewrite_references` — bulk rewrite `[OldGroup.X]` → `[NewGroup.X]` across all rule strings
- `question_move` — move question between groups
- `clone_group_from_version` — cross-version group copy
- `group_set_table_form`, `group_set_select_add_button`, `group_set_common_presentation_rule`
- `group_link_query` — link external query to group
- `product_list/get/upsert/product_set_attribute` — catalog management
- `discount_table_list/get/upsert/delete`

## Knowledge repos
- `dealhub-internal-tips`: 121 Confluence pages — use cases, calculations, KEDB (93 error articles)
- `dealhub-academy`: 114 slides from Essential Admin Certification — approval workflows, DealRoom, output docs, products, repeatable groups
- `dealhub-knowledge-center`: index of 248 support.dealhub.io articles
- `dealhub-developer-api`: `developers.dealhub.io` map — quote lifecycle, webhooks, external queries
