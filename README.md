# Co-op AI Assistant

A recreation of the Al Makhazen storefront for a private sales demonstration. Click **Ask Co-op** at the bottom right. The launcher, chat, recipe cards, and shopping list are responsive.

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

## Import Co-op inventory

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

For a self-contained preview, run npm run build and then npm run preview:html. The HTML embeds the current catalog. Use the preview catalog when sharing an example outside Co-op.
