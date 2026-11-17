# Co-op AI Assistant
## Website chatbot research and pilot plan
17 November 2026

### Executive decision

The first release should help a shopper find a specific product, turn a recipe into a shopping list, or understand a label. An on-page assistant can demonstrate those journeys inside a recreation of the Al Makhazen storefront. The case for rollout is measurable: fewer searches that end without a useful product, more recipe ingredients reaching a shopping list, and fewer questions about facts the catalog already contains.

The pilot needs one approved Beirut inventory snapshot. The storefront prototype contains 15 products observed in public listings, 30 illustrative rows and five built-in recipes. It distinguishes public listings from examples. Public records carry source links and leave current price and availability unconfirmed. The prototype opens from the lower-right corner and has a local, key-free mode for the meeting. An OpenAI connection adds flexible conversation, generated recipes, and optional research after the model and key are configured.

The launch use case needs read access to the inventory the shopper is eligible to browse. Start with a read-only product feed and a local shopping list. Adding products to Al Makhazen's actual cart is a potential follow-up once the retailer supplies a supported cart interface.

### What the public website exposes

The homepage exposes departments, an ordering location, delivery and pickup flows, shopping, rewards, account access, and order history. The supplied screenshot shows Beirut as the ordering location and the department tiles that anchor the demo. Some public product URLs are separately indexed. For example, the cached Bonlait Labneh 900 g page includes the pack size, product code, a price, and a sold-out message. That combination is evidence that the page can include commercial attributes at crawl time. It cannot establish current stock, the applicable branch, completeness, or whether the price still applies. The homepage and produce category often resolve to a client-rendered template in text retrieval. [Storefront](https://almakhazen.me/) · [Produce page](https://almakhazen.me/categories/3581/produce) · [Example listing](https://almakhazen.me/products/5651087/bonlait-labneh-900gr)

UCCM identifies Almakhazen.me as its ecommerce platform. Weevi lists Almakhazen among its retail customers and describes inventory management features. A read-only feed should start with a conversation with Co-op's ecommerce team and Weevi to verify the current integration, supported exports or endpoints, branch IDs, authorization, field availability, update frequency, and any vendor charges. An advertised vendor capability does not establish that a particular merchant account has enabled it. [UCCM FAQ](https://uccm.com.lb/faq/) · [Weevi](https://get.weevi.com/)

| Data route | What it can support | Decision |
| --- | --- | --- |
| Read-only Weevi or POS API | Full catalog, branch-specific sellability, regular updates when these fields are available | Preferred for production |
| Co-op CSV or Excel export | Reliable initial inventory scope, validation, and reproducible demos | Fastest way to move beyond the public sample |
| Public product pages and search-index results | Product examples, published descriptions, images, and links where present | Useful for sampling and storefront research |
| Product photos and label screenshots | Ingredients, allergens, pack details, or nutrition missing from the approved export | Use for targeted backfill and verify against the SKU |

A website export can help with catalog discovery; a source maintained by the retailer can also answer stock freshness, branch-specific assortment, and online availability. Avoid bulk extraction until Co-op confirms permission and the source supports a stable, complete read. When an API is available, reconcile its active SKU count against the storefront branch count by department, compare a sample of records with the UI, and check whether pagination, variants and hidden or discontinued items are represented correctly.

### The inventory contract

Ask for a UTF-8 CSV or an Excel file convertible to CSV with a row per **branch and SKU**. Request stable branch and product IDs, barcode where available, English and Arabic names, brand, pack size and unit, category hierarchy, optional aliases and ingredient tags, description, price and currency, stock or sellability, canonical product and image URLs, and an update timestamp. Ask for ingredients and allergens as declared on the label, nutrition basis in grams or milliliters, kcal, protein, carbohydrate, fat, and a label or supplier reference. Distinguish catalog publication from stock and quantify the feed's update delay. Empty values mean unknown. An explicit zero on a label remains zero.

The current importer accepts one selected branch and validates duplicate SKUs, price currency, nutrition basis and HTTPS links before replacing the demo snapshot. It uses USD and gram-based label entries. A multi-branch launch needs units and currency handled explicitly, retailer-provided timestamps and stable IDs, and the branch context passed from the storefront. On scheduled refresh, stage the new file, compare row count and coverage, apply a known-good snapshot in one transaction, and keep the prior version available for rollback. If a feed exceeds its agreed freshness threshold, label stock and price as unconfirmed.

### How the assistant should answer

| Question | Source of truth | What the shopper sees |
| --- | --- | --- |
| “Do you have Bonlait labneh?” | Inventory for the selected ordering branch | Exact pack match, source link, and confirmed or unknown availability |
| “How many calories in 150 g?” | Exact SKU nutrition label and its declared basis | Calculation with serving weight and source. Ask which SKU if several match |
| “Make tabbouleh for six” | Recipe knowledge or a cited reference, plus current inventory results | Scaled ingredients and steps, matched items, and missing ingredients |
| “Can you suggest another brand?” | Same-branch inventory and explicit ingredient or product classification | Available candidates in comparable units, with relevant differences |
| “Is this safe for a severe sesame allergy?” | Exact product and label, including the allergen declaration | Display the declaration and direct the shopper to verify the current packaging if the data is missing or uncertain |
| “What can I cook without a stove?” | General cooking knowledge and candidate ingredients in the branch | Appropriate recipe ideas with a useful shortlist |

Use server-side function calling to find product facts. A first pass should normalize Arabic accents, digits and Lebanese product spellings, then search exact SKU and barcode, name, alias, category and ingredient. Rank a valid, available branch result ahead of equivalent unknown or unavailable results. Compare keyword and trigram retrieval first. Add semantic search only if an evaluation set shows meaningful misses, keeping the relational inventory record as the source of truth. Restrict the AI output schema and validate every card's ID against the products retrieved on that turn.

Use OpenAI web search as an optional source for general recipe and food composition questions. The tool can restrict searches to named domains and return citations. Generic reference research stays scoped to the request. There is one persistent catalog. The demo uses a few clearly labeled, built-in recipe examples to remain usable without credentials. Keep brand-specific nutrition, ingredients, product descriptions, prices, and availability tied to the inventory. [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling) · [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)

### Nutrition and serving calculations

Separate the package size, the label's serving size, and the portion the shopper plans to eat. Calculate energy as **weight eaten × label kcal ÷ label basis weight**. A label with 120 kcal per 100 g gives 180 kcal for 150 g. For a recipe, add the energy of the edible ingredients and divide by the requested servings. Preserve whether the weight refers to raw, dry, cooked, drained, or edible product. If a recipe is scaled from four to six, multiply the ingredient amounts by 1.5. Cooking time and seasoning may need separate adjustments.

USDA FoodData Central is a useful reference for generic foods. Use comparable records and retain the source in the answer. A generic value should be labeled an estimate, and it should never populate a branded product's nutrition label. Where a recipe uses uncertain weights or has ingredient data missing, avoid giving a precise total unless there is a credible sourced estimate. The demo calculator shows estimates for built-in recipes and uses exact imported label values for product calculations when present. [USDA FoodData Central](https://fdc.nal.usda.gov/)

### Model and deployment choices

| Model | API status and use | Input / output per million text tokens |
| --- | --- | ---: |
| GPT-4.5 mini | No published OpenAI API model with this name. GPT-4.5 Preview shut down on 14 July 2025 | — |
| GPT-5 mini | Earlier mini model. OpenAI now marks it deprecated | $0.25 / $2.00 |
| GPT-5.4 mini | Proposed demo model. Supports reasoning, structured outputs, inventory function calls and web search | $0.75 / $4.50 |
| GPT-6.1 Terra | Current comparison candidate if the pilot needs higher quality on the same evaluations | $1.00 / $5.00 |

The application requires explicit model configuration and keeps the provider key on the server. Use a dedicated OpenAI project and restrict key access. The API sends only the recent chat and matching inventory details needed for the answer. Responses use store=false. Apply request limits at hosting level before exposing a model-enabled URL and keep usage alerts and daily spend under review during the pilot. For the initial deployment, keep the example catalog in Git and import the real feed privately after Co-op authorizes access. [OpenAI model catalog](https://developers.openai.com/api/docs/models) · [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations) · [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini) · [GPT-6.1 Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra) · [OpenAI conversation state](https://developers.openai.com/api/docs/guides/conversation-state)

The repository includes a Vercel configuration. Vercel assigns a `.vercel.app` address after deployment. Vercel's Hobby terms limit use to personal or non-commercial projects, which matters for a sales demonstration. Vercel Pro is listed at $20/month and documents an eligible 14-day trial. Deploying the commercial demo requires an eligible Vercel account and an authorized plan. For a zero-cost meeting option, open the standalone HTML in Chrome or Edge and run the demo journeys there. [Vercel domains](https://vercel.com/docs/domains/working-with-domains) · [Vercel terms](https://vercel.com/legal/terms) · [Vercel pricing and trial](https://vercel.com/docs/plans/pro-plan/trials) · [Sensitive environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

### Operating-cost model

This example uses GPT-5.4 mini and assumes each answered turn consumes **3,000 billed input tokens and 450 billed output tokens** in total across model calls. It assumes one web search on 15% of turns. These are planning assumptions. Log billed tokens, the number of lookups, and actual search count during the pilot. Reasoning can contribute to billed output and a tool round can involve a second model call.

| Monthly chat turns | Model token estimate | Web tool calls | Combined model and tool fees |
| ---: | ---: | ---: | ---: |
| 1,000 | $4.28 | $1.50 | $5.78 |
| 5,000 | $21.38 | $7.50 | $28.88 |
| 20,000 | $85.50 | $30.00 | $115.50 |

The model calculation is 3,000 × $0.75 ÷ 1,000,000 plus 450 × $4.50 ÷ 1,000,000 per turn. Search fees use $10 per 1,000 calls. Any search result tokens above the assumed input budget add token cost. Hosting, retailer integration, testing, training, maintenance and taxes are outside these figures. [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)

### CEO walkthrough and pilot acceptance

1. Open the storefront and click **Ask Co-op** in the lower-right corner. Ask for Bonlait Labneh 900 g and open the public listing.
2. Ask for tabbouleh for four, then “Make it for six.” Compare the amounts and add the ingredients to the shopping list.
3. Ask for the calories per serving in hummus. Show the serving basis and the reference link. Ask about a branded label the catalog is missing to show how the assistant handles uncertainty.
4. Switch to Arabic and ask about a product or try “عندكن لبنة؟”. Open the basket to show the shared list. Once the live model is enabled, repeat in Lebanese Arabic and Arabizi.
5. Show what changes with an approved Beirut export. Product names, exact labels, prices and branch stock then come from that export with its date.

Before launch, agree on a test set with the retailer. Use at least 30 known-SKU queries and 20 recipe or nutrition cases across English, Arabic and Arabizi. Include similarly named variants, ambiguous sizes, stale data, out-of-stock items, missing labels, allergies and hostile text inside catalog descriptions. Require no invented price, stock or allergen claims in the acceptance set, at least 90% top-three matching on known products, and correct arithmetic in every reference scenario. Record response time and cost per answered turn, then compare task completion and shopping-list adds against the storefront baseline. Traffic assumptions and acceptable latency should be agreed with Co-op before setting a contractual target. Save a small anonymized regression set for feed or model changes.
