# COOP AI Assistant

A recreation of the Al Makhazen storefront for a private sales demonstration. Click **Ask COOP** at the bottom right. The launcher, chat, recipe cards, and shopping list are responsive.

## Responsive shopping interface

The custom COOP launcher opens a focused chat on phones and tablets. On larger screens, opening the shopping list expands the widget into a chat/list split view. Phone landscape and short viewports use the full screen. Language follows the conversation automatically; there is no manual language switch. New Chat clears conversation context while retaining the shopping list.

The storefront basket and chat share the same saved list. Product photos use the original inventory export, with a neutral fallback if an image cannot load. List controls include purchase quantities, integer-cent estimated totals, checked items, shared ingredients, clearing, and Undo. All items appear in one view; there is no recipe-grouping switch or Copy List button. Recipe requirements remain separate from purchase pack quantities. Measurable compatible units are rounded up to the package size; no volume/weight conversion is invented. Purchase quantities are editable, and unavailable items cannot be added. Totals exclude unavailable products and flag missing prices. This is a shopping list; no order is submitted.

The page's My List button keeps its existing design and opens a separate list dialog, without opening the assistant. Both views synchronize quantities and items through the same saved list. The assistant close control remains available in phone landscape and uses an immediate same-origin close event with postMessage support for external embeds. Welcome actions prepare editable requests; the meal action never sends a preset recipe. The three fixed suggestion chips have been removed.

The build generates `public/shopping-list.html` in list-only mode before it is delivered, so slow module loading cannot show the assistant first. Interface labels, buttons, headers and icons block normal selection and copying. User/assistant messages, recipe and product text, preparation steps and shopping-list item descriptions remain selectable and copyable, including normal text context menus. The message box retains typing, selection and paste. Ctrl/Cmd+A within selected conversation content selects that text region rather than the interface. Run `node tests/presentation.browser.mjs` for first-paint/control checks and `node tests/copy.browser.mjs` for native text selection, clipboard copy, message paste and protected controls at phone, tablet and desktop sizes.

Run `npm run build` followed by `npm test` for the inventory, recipe, language and shopping arithmetic checks. With the local server running on port 4173 and Playwright available, run `node tests/ui.browser.mjs` and `node tests/languages.browser.mjs`. Set `BROWSER_EXE` to an installed Chromium browser if needed; `TASK_MODULES` optionally points to an existing node_modules directory. Browser checks cover 320×568, 390×844, 768×1024, 1024×768, 1440×900, and 667×375; list changes and persistence; four languages; partial reply rendering; history; and cancellation. Network images are blocked in the deterministic tests to exercise image fallbacks. Live provider behavior is mocked in automated model tests; the existing provider configuration is retained.

## Try the demo

Open Al_Makhazen_Storefront_Demo.html in Chrome or Edge. The self-contained preview uses the example catalog and gives built-in answers without an API key. Some category photos load from the web and have offline fallbacks.

- “Show me Bonlait labneh.”
- “Give me tabbouleh for four,” then “Make it for six.”
- “How many calories per serving in hummus?”
- “قديش في سعرات بالحمص لكل حصّة؟”
- Click **Add ingredients to list**, then open the list icon in the chat or the basket in the storefront.

The storefront preview includes product listings transcribed from Co-op screenshots. Prices, promotions, and sold-out flags reflect what the screenshots show. The preview also includes earlier public records and illustrative products where the screenshots have no replacement. Generic recipe calorie estimates depend on ingredient weights and use reference values for generic foods.

## Start the project with OpenAI

Requires Node.js 22.9 or later. From the project directory:

    Copy-Item .env.example .env
    npm run dev

Enter your API key in .env as OPENAI_API_KEY. The server uses GPT-6 Luna (gpt-6-luna) by default. Restart the server and open http://127.0.0.1:4173. The key stays on the server and .env is ignored by Git. The demo uses built-in replies until a key is configured.

## Deploy the demo

Import this repository at https://vercel.com/new. The Vercel configuration serves the storefront from public and runs chat and catalog lookups as Node.js functions. Vercel assigns the deployment a vercel.app address. Deploy once without credentials to try the example journeys. To activate live responses, add OPENAI_API_KEY as a **Secret** environment variable in the Vercel project's settings and redeploy. Use a restricted OpenAI project key and limit access to the demo when that key is enabled.

Vercel Hobby is for personal or non-commercial use. Vercel Pro supports commercial projects and offers an eligible 14-day trial. Use vercel.com/pricing to verify the plan before hosting a sales demo.

The model searches the selected catalog through a server-side tool. It creates recipes with servings and amounts, retrieves named products, and can show product descriptions or nutrition values when the inventory includes them. The app calculates recipe energy when all ingredients have usable weights and calorie values. The chat uses plain-text replies and recipe cards, with the inventory as its only lookup tool. Brand-specific prices, availability and labels come from the inventory.

Ask Co-op answers grocery shopping, food, recipes and Co-op store questions. It redirects unrelated requests, including requests to generate code with shopping examples.

Shopping scope covers every catalog department, including electronics and car chargers, seasonal clothing and socks, stationery and school supplies, backpacks, toys, household goods, personal care, baby care and pet supplies. Product availability inquiries remain valid even when a requested product has no catalog match. Shopping kits can combine actual catalog items; missing items must be identified without inventing products, stock or school requirements. Ordinary writing pens must not be confused with correction pens or markers. Unrelated work and mixed shopping/code-generation requests remain out of scope.

Replies follow each shopper message: English (`en`), Arabic script (`ar`), or Lebanese Arabizi (`arz`, Arabic written with Latin letters and optional numerals). Language changes take effect within the same conversation while preserving shopping context. Arabizi is supported in streamed replies, recipe titles and steps, ingredient names and quantities, card labels, errors, scope redirects and price follow-ups. Original brand names can remain unchanged. Numeric-only follow-ups preserve the recent conversational language. Model responses with the wrong script are corrected once before falling back to a matching-language response.

## Import Co-op inventory

Inventory retrieval now uses a shared department/aisle/product-family index with separate brand, form, qualifiers and size metadata. A scope-approved request is interpreted and searched before recipe generation, including colloquial Arabic and Arabizi, without new dish-specific routes. `find_alternatives` retrieves verified other brands or pack sizes from the same compatible family. Incomplete provider outputs and malformed replies can recover within the same request. Run `node scripts/audit-inventory.mjs` for coverage; see `docs/inventory-search-research.md` and `docs/inventory-analysis.json` for the research and audit. Source stock and prices remain unchanged.

Before presenting a recipe, the server now resolves complete ingredient phrases inside branded product names and reviews every remaining unmatched or sold-out ingredient in a separate bounded matching pass. Candidate generation searches short terms, relaxed preparation wording, department metadata and multilingual synonyms across the full product set. The matching model may retry up to three translated or alternative queries and may select only real IDs offered for that ingredient. It cannot edit recipe quantities or steps, invent stock, or silently change ingredient types or dietary requirements. If matching still fails or the service is unavailable, the recipe retains the verified records and missing/out-of-stock states, with an offer to adapt it to available ingredients. The extra review runs only when needed and is limited to two matching rounds within an eight-second budget, including any bounded provider retries.

Customer replies speak as COOP and use direct product facts rather than narrating internal searches. Product headings and stock labels use customer language such as Products, Available and Out of stock. Response validation rejects internal catalog/snapshot/database wording before displaying it. Clear availability requests are supplied with server product matches before model generation, and short ingredient spelling mistakes such as `fettuccinin pasta` are corrected conservatively. Recipe matching retains genuine missing and sold-out states without inventing stock.

Recipe ingredient matching uses the complete catalog on the server as well as the model's inventory lookups. Each recipe ingredient includes a short English `catalogQuery` so localized names can resolve to the same real product ID. Common spelling variants and ingredient types are matched with category checks; for example, Fettucine/Fettucini pasta and 35% cream can be found without selecting unrelated snacks, cream cheese, milk powder or personal-care products. Suitable available records are preferred for generic ingredients. Genuine sold-out status remains unchanged, and missing ingredients are labeled as having no matching catalog product. Recipe quantities and shopping-list product IDs remain connected to these resolved records.

French (`fr`) is also supported automatically from each shopper message, alongside English, Arabic and Arabizi. This includes streamed answers, product and recipe cards, ingredient quantities, nutrition labels, price follow-ups, school-kit suggestions and service errors. French queries can search the complete catalog using translated product terms, synonyms and abbreviations. Switching language preserves the conversation and product context; numeric follow-ups retain the recent language. Product brand names stay as listed.

### Complete website catalog

The assistant now uses all **7,666 products** from `Al_Makhazen_Product_Catalog.xlsx` as its default inventory. The catalog contains **5,075 available** and **2,591 sold-out** entries as recorded on **19 November 2026**, for Beirut. These are recorded website values, not a live stock feed.

Names, descriptions when supplied, USD prices, brands, departments, category labels, SKUs, product IDs and product URLs are preserved. Empty descriptions, nutrition labels and allergens remain unknown; the assistant must not invent them. The previous illustrative and screenshot records are excluded from active product results.

The server indexes the complete catalog and sends only relevant search results to the model. Product ID, SKU, name, brand, size and category searches are supported, with common English, Arabic, French and Arabizi ingredient terms. Recipe cards and shopping lists resolve against these same product IDs.

To refresh from an Excel export with the same Products worksheet columns:

    python scripts/import-excel-catalog.py "C:\path\Al_Makhazen_Product_Catalog.xlsx"
    npm run build
    npm test

`src/inventory-catalog.json.gz` is the versioned catalog used during deployment. The importer verifies the row count, unique product IDs, numeric prices and stock flags before writing it. Pass `--expected-count` for a future export with a different product count. An optional local `approved-inventory.json` still takes precedence when deliberately provided.

The catalog endpoint reports `catalogTotal`, `snapshotDate`, and supports `offset` and `limit` for paging through every record. No OpenAI key is required to validate catalog coverage. API credentials remain on the server.

### Optional CSV feed

A read-only export or a supported POS or ecommerce API is the best source. Ask for a UTF-8 CSV with one row per SKU per branch. The header must include sku, name and category. Use category keys such as produce, dairy, meat, bakery, pantry, fish, ready, school or offers. The optional columns cover the following fields.

- branch, name_ar, size, size_ar, aliases (pipe separated), recipe_ingredient
- description, description_ar, price_usd, currency, availability, product_url
- ingredients, allergens, basis_grams, kcal, protein_g, carbs_g, fat_g, nutrition_url

Leave unknown fields blank. Use in stock, out of stock, or unknown for availability. Use the nutrition label's basis_grams, for example 100 or the weight of one labeled serving. Optionally set recipe_ingredient to a generic recipe key such as parsley, tomatoes, olive-oil, chickpeas or tahini to map the built-in recipes to approved products. Keep allergens and nutrition fields tied to the exact SKU.

    npm run import -- "C:\path\inventory.csv" Beirut
    npm run dev

The import is validated before replacing the existing local snapshot. A multi-branch export requires choosing a branch. The approved snapshot replaces the preview inventory. It is ignored by Git. Live inventory and price updates require an approved feed and a refresh mechanism. Public listings help seed the demo. Screenshots can fill gaps in product labels.

### Recipe reliability and showcase checks

When a recipe draft proposes an unmatched ingredient form, one optional revision can use verified available choices of the same food family and update preparation steps. Draft choices are not shopper requirements. Explicit forms, brands, dietary/allergy constraints and serving counts remain protected; a failed optional revision retains the original valid recipe and genuine missing/out-of-stock states. These mechanisms apply to every recipe, with no dish-specific response branches.

For an explicit USD spending budget, the final estimate uses the same whole-pack arithmetic as the shopping list. If necessary, suitable lower-cost brands or sizes are compared without changing ingredient type, recipe quantities or explicit constraints. Conditional free offers are not treated as unconditional items. The assistant does not assume pantry items are free and does not replace the checkout estimate with a portion cost.

Recipe generation uses ingredient candidates retrieved in advance and resolves every returned ingredient against the complete inventory. Planned recipes skip redundant model tool rounds. Groups containing other varieties are marked as alternatives, without relaxing explicit dietary, brand or variety constraints. Seasoning names cannot override the commodity type of an actual food. Raw meat ingredient matching excludes unsolicited prepared forms and cold cuts.

Language and wording repairs run on a separate text-only schema. IDs, prices, stock, servings, grams, preparation order and recipe references are retained, and repairs that change numeric amounts are rejected. The server has a 52-second total deadline under the platform's 60-second function limit; the browser waits 57.5 seconds. Temporary provider errors and incomplete responses have bounded recovery. Complete terminal streaming frames are accepted even without a final separator. Failures include a request ID and coarse error code; logs contain stage and duration without shopper messages, provider output or credentials.

Run `npm test` for deterministic backend regressions, then the browser suites for responsive controls, copy/paste, streaming/context/cancellation, viewport changes and image gestures. For an explicitly authorized real-provider check, set `LIVE_TEST_URL=https://coop-ai-assistant.vercel.app` and run `node tests/showcase.live.mjs`. This opt-in suite tests fresh multilingual recipes, context, price follow-ups, brands, non-food goods, school kits, budgets, label uncertainty and scope. It incurs normal provider usage and writes its detailed results under ignored `tmp/`.

### Product image previews

Product replies, recipe ingredients and both shopping-list views share an image viewer. Hover with a mouse or focus a thumbnail with the keyboard for a floating enlargement. Click or tap opens a modal image with a close button, backdrop dismissal and Escape support. Touch and hold for 350 ms shows a temporary preview; release or cancel dismisses it without opening a modal. Swiping before the hold threshold preserves normal scrolling. Broken thumbnails keep the original fallback and cannot open an empty viewer. Product names and accessible controls follow the current language.

`node tests/product-preview.browser.mjs` exercises mouse, keyboard, real browser touch events, swipe cancellation, hold release, recipe cards, both lists and missing images across portrait, landscape, tablet and desktop layouts. Set `TEST_BASE_URL` for a different local port, and `PREVIEW_PATH` to test the generated standalone HTML as well.

### Mobile viewport and scrolling

On phones, chat floats in a rounded panel with 12px side margins and a shorter height so the storefront remains visible. The panel follows the visual viewport through toolbar changes, keyboard panning and rotation, using the available space above the keyboard. Chat and the standalone shopping list lock the storefront at its current scroll position and restore it when closed. The standalone page list retains its existing full-screen layout. Only the conversation, list and dialog content panes scroll; touch boundary handling prevents scrolling from escaping into the page. Conversation selection and input paste remain enabled.

`node tests/viewport.browser.mjs` checks simulated visual-viewport changes, keyboard geometry, touch boundaries, scroll restoration and desktop/mobile transitions. The responsive UI, copy and presentation browser suites also cover these layouts. These are automated Chromium checks; physical iOS Safari testing remains a separate device check.

For a self-contained preview, run npm run build and then npm run preview:html. The HTML embeds the current catalog. Use the preview catalog when sharing an example outside COOP.
