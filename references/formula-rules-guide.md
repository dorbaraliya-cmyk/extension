# DealHub Formula & Rules Guide

## Four expression contexts — different syntax in each

| Context | Where stored | Quoting | Whitespace | Helper |
|---------|-------------|---------|------------|--------|
| **Formula** | `defaultValue` with `dateAttributeValueType:'FORMULA'`; calculated `value[0].id` | bare refs `[G.Q]`, no string literals | strip ALL whitespace | use `formula()` |
| **Rule expression** | `hiddenRule`, `readOnlyRule`, assignment rule, pricing rule, `activeWhen` | double-quoted string literals `"Renew"` | spaces REQUIRED around `=` `!=` `AND` `OR` | use `rule()` |
| **Proposal-attribute value** | proposal attribute formula | bare literals `New Business`, bare refs `[G.Q]` — NO quotes | no extra whitespace | — |
| **text_list option** | `value[].id` and `value[].text` | quoted: `"Renew"` | n/a | — |

## Formula rules
- `=` not `==`; `!=` not `<>`
- References: `[GroupName.QuestionName]` — no spaces, no `Question.` prefix
- Functions: `ADD_MONTHS(date,n)` `ADD_DAYS(date,n)` `ADD_YEARS(date,n)` `MONTHS_DIFF(d1,d2)` `DAYS_DIFF(d1,d2)` `YEARS_DIFF(d1,d2)`
- Math: `Math.ceil(x)` `Math.floor(x)` `Math.round(x)` (JS-style, these DO wrap other calls)
- **No nested `ADD_*` calls** — decompose into hidden helper questions
- Decimal literals: `.11` not `0.11`
- `dateAttributeValueType: 'FORMULA'` MUST be set on every date question with a formula default — without it the field renders blank
- `ADD_YEARS` and `ADD_DAYS` result is always ONE DAY EARLIER than expected (known DealHub behavior)

## Rule expression rules
- Spaces required around all operators: `[G.Q] == "Yes"` not `[G.Q]=="Yes"`
- `!=` not `<>` (`<>` is silently broken)
- String literals double-quoted: `"New Business"`
- Boolean: `&&` `||` `!`
- `<` followed by letter/`[` is treated as HTML tag — write reversed: use `>` instead
- NEVER use `formula()` on a rule string

## Text list functions (boolean)
- `IncludesANY([G.Q], "a","b")` — true if ANY selected (OR logic)
- `IncludesALL([G.Q], "a","b")` — true if ALL selected
- `IncludesEXACT([G.Q], "a","b")` — true only if exactly those values, no more

## Math functions
- `MAX(a,b)` `MIN(a,b)` — max/min of two values
- `MAX_IN_GROUP(QG.Q)` `MIN_IN_GROUP(QG.Q)` — across repeatable group rows
- `Math.ceil(x/1000)*1000` — round up to nearest 1000
- `CALCULATE_DISCOUNT_TABLE(tableID, value)` — tier/progressive pricing lookup

## Date functions
- `DAY(date)` `MONTH(date)` `YEAR(date)` — extract parts
- `FIRST_DAY_OF_MONTH(date)` `LAST_DAY_OF_MONTH(date)`
- `DATE_PRORATION(d1,d2)` — billing-accurate proration (months + fraction)

## NO IF/CASE/ternary in DealHub
Use conditional answers (presentation rules + multiple calculated questions) instead.

## `[Item.X]` scope rules
Valid ONLY in:
- Assignment rule comparisons
- Proposal-attribute formulas
NOT valid in: playbook calculated answers, hiddenRule/readOnlyRule, same-row refs in repeatable groups.

## Hide rule vs presentation rule
- `hiddenRule`: "true" = HIDDEN. Simpler, binary show/hide.
- `presentationRule` (`showMode: RULE_BASED`): more control, can show/hide per context.
- Polarity: both are "when should it be HIDDEN/SHOWN" — get the polarity right.

## Output document parameter syntax
- `%%Question%%` — substitution (display value)
- `[GroupName.QuestionName]` — rule/condition reference (NOT for display substitution)
