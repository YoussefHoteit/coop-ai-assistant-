# Inventory understanding and recipe retrieval

This implementation searches the complete 7,666-product Al Makhazen export dated 2026-11-19. It changes retrieval metadata, not source stock, prices, descriptions or labels. The reproducible audit is `node scripts/audit-inventory.mjs`; its output is `docs/inventory-analysis.json`.

## Findings

The original product records already had 23 primary departments, but subcategory strings mixed department names, aisles and promotional placements in different orders. Names contain English, French and Lebanese transliterations, abbreviations and inconsistent spellings. Ingredient queries previously required too much literal overlap. Preparation words, alternatives joined by “or”, and translated commodity names could hide valid products. Fuzzy profile correction could also confuse different ingredients. These failures were reproducible locally. The first-turn service-error screenshots alone do not identify the provider's exact failure; production provider logs were not available in this environment.

The audit now extracts 108 clean aisle labels and retains all products in a department → aisle → product-family index. Commodity rules and precise source aisle labels provide known types; a conservative vocabulary learned from raw-ingredient names handles spelling variants. Unknown types retain a normalized source-name family rather than a guessed semantic label. Brand, storage form, explicit attributes, dietary qualifiers and pack size remain separate. The JSON audit records recognized-type coverage and missing brand coverage explicitly.

## General request flow

1. Review scope and interpret the complete latest request with chat history. Normalize colloquial Arabic, Arabizi and French into an internal English request and short ingredient/product searches. The response language stays the shopper's language. There are no new dish-name branches or stored recipes in this flow.
2. Search the full local index before generation. Supply verified ingredient choices and their product-family/form metadata. Only relevant records are sent to the provider, and image URLs stay out of model inputs.
3. Resolve ingredients against type and form, then perform a bounded semantic matching review when something remains unresolved. Check the localized ingredient name as well as its English lookup. Exact IDs must exist; prices and availability come from the source records. Known sold-out items stay sold out. Missing form or allergen evidence is not invented.
4. Offer other brands through `find_alternatives`. Retain product type, required form, variety and explicit dietary qualifiers. A size change retains the known brand. Category membership alone is not permission to substitute arbitrary products.
5. Give the provider more output room and retry a truncated/transient response once. Repair malformed structured replies within the same user request. Partial preview parsing cannot abort a valid response. Tool rounds, repairs, request duration and cancellation remain bounded.

The index is built once per server instance and query interpretation is cached with a bounded cache. No additional external search service, embedding subscription or product source was added. This implements the classification/search principles locally; it does not claim GS1 certification or assign unverified GS1 codes.

## Research basis

- [GS1: GPC schema principles](https://support.gs1.org/support/solutions/articles/43000734220-what-are-the-gpc-schema-principles-) explains classification levels with separate attributes.
- [GS1: GPC uses](https://support.gs1.org/support/solutions/articles/43000734312-what-can-gpc-be-used-for-) describes grouping similar products and supporting search and replacements.
- [Elastic: search with synonyms](https://www.elastic.co/docs/solutions/search/full-text/search-with-synonyms) describes equivalent terms, domain vocabulary and misspellings.
- [Elastic: multi-field matching](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query) explains combining and weighting evidence from multiple fields. This project uses its own in-memory index; Elasticsearch is not a dependency.
- [OpenAI: reasoning models](https://developers.openai.com/api/docs/guides/reasoning) explains that the output ceiling includes reasoning and visible output, and that insufficient room can produce incomplete responses. This informed the larger bounded budgets and incomplete-response recovery; it does not establish the exact cause of the customer's earlier errors.

## Validation and remaining data work

Tests cover complete inventory preservation, actual ingredient matches, cross-ingredient false positives, alternative brands/sizes, dietary restrictions, scope, all four reply languages, first-turn interpretation, malformed and incomplete output recovery, streaming, chat context and cancellation. Model responses in automated tests are mocked; they verify orchestration and validation rather than a live provider's understanding of every dish. The browser tests exercise the actual frontend and local API. Unknown brands and conservatively grouped source-name records remain visible audit items for later catalog enrichment.
