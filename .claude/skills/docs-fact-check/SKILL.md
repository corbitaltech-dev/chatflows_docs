---
name: docs-fact-check
description: How to verify a documentation claim against the real ChatFlows.io product before publishing it — locating the feature in the Laravel/Vue reseller source at /home/laravel/whatsmarkio_reseller (branch `chatflows`, Shopify-only mode), confirming exact UI button and status labels, checking which features Shopify-only mode hides, and telling sub-tenant behaviour apart from reseller-admin and platform behaviour. Activate when writing any factual claim about how the product behaves, when a page mentions a button/screen/limit, when auditing an existing page for accuracy, or when the user asks whether a documented behaviour is real.
---

# Fact-checking a docs claim

Every behavioural claim in the docs must be traceable to the product. A page that describes a button that doesn't exist is worse than a missing page — it burns the trust the docs are there to build.

**Product source:** `/home/laravel/whatsmarkio_reseller`, **branch `chatflows`** — Laravel + Vue/Inertia (`resources/js/pages`, no `app/Livewire`). This is the reseller/white-label build: the same codebase serves a plain B2C tenant, a reseller's own admin workspace, and a reseller's end customer (a "sub-tenant"), so confirm which of the three a claim is about before grepping.

**Shopify-only mode.** The ChatFlows.io deployment runs with `SHOPIFY_ONLY_MODE=true`. Before documenting any feature, check `config/shopify_only.php`: `hidden_features`, `hidden_modules`, `hidden_integrations`, `hidden_platforms` and `offered_gateways` say what merchants never see, and `sidebar_labels` / `settings_labels` give the menu names they do see. A feature that exists in the code but is hidden there must not be documented. The reseller guide `docs/integrations/shopify-integration-setup.md` §11a (App Store onboarding) and §11b (Shopify-only mode) describes the merchant experience.

⚠️ **The old path `/media/corbital/web_data/laravel.local/chatflows.io` (and the even older `chatflows-saas` Livewire v1 build) no longer exists on this machine.** Don't fact-check against it or assume it's still current — this reseller repo is the only verified source.

⚠️ **Check tenancy context before trusting a grep result.** The same feature can behave differently depending on who's using it:
- **Plain B2C tenant** — ordinary workspace, unrestricted.
- **Reseller's own workspace / admin panel** (`/pa/*` routes, `App\Http\Controllers\Reseller\*`, `App\Http\Controllers\Admin\*` gated by `EnsureResellerAdmin`) — the reseller managing their business and their customers.
- **Sub-tenant** (the reseller's end customer, `sub_tenant_id` scoped, routes/middleware referencing `SubTenant`/`ActivateSubTenantContext`) — day-to-day product use is verified to be the *same* controllers/routes as B2C for messaging, contacts, automation, campaigns, reporting, and most of Setup/Settings. The real differences are: sub-tenant billing is a separate controller suite (`App\Http\Controllers\SubTenant\Billing\*`), custom-domain doesn't apply to sub-tenants, `DenySubTenantTenantLevelWrite` blocks a small set of writes to reseller-shared settings, and WhatsApp/Meta embedded signup resolves credentials to the *reseller's own* Meta app (`EmbeddedSignupController::resolveCredentials`), not a shared platform app.

There is no `developer-docs/` internal reference folder in this repo — verify directly against routes/controllers/migrations rather than looking for a pre-digested feature doc.

## What must be verified before it ships

- **Every UI label** — button text, menu item, page name, tab, field label.
- **Every status value** — `Active`, `PENDING`, `APPROVED`, `Connected`. Case matters; the docs show what the screen shows.
- **Every navigation path** — "Templates → WhatsApp → Create Template" must match the real sidebar.
- **Every feature** — is it hidden in Shopify-only mode (`config/shopify_only.php`)? If so, it must not be documented.
- **Every menu name** — use the Shopify-mode label (`sidebar_labels`), not the default one.
- **Plans and prices** — never on feature pages. Only `billing/plan-and-billing.mdx` talks about plans (see the `chatflows-docs` skill).

## How to check

**UI labels** — grep the Vue pages for the visible string:

```bash
cd /home/laravel/whatsmarkio_reseller && git checkout chatflows
grep -rn "Sync Templates" resources/js --include="*.vue" | head
```

If the string only appears in a translation file, check the current value there — that is what users see.

**Plan gating and limits** — for a plain tenant or a reseller's own workspace, these live in the feature/plan seeders and are read through `FeatureService`. For a sub-tenant, the same `FeatureService` resolves against `SubTenantFeatureLimit`/`SubTenantPlan` instead (via `SubTenantContext::id()`) — same feature-key vocabulary, values sourced from the reseller's own plan rather than ChatFlows.io's. Feature pages do not mention plans, so you only need this when writing `billing/plan-and-billing.mdx`.

**Behaviour** — trace the controller or job rather than inferring from the UI. There is no specialist-agent roster in this repo (no `.claude/agents/`) — read the relevant controller/route file directly instead of routing to a named subagent.

## When you can't verify

State it rather than guessing. `<Note>` a caveat, or leave the claim out and flag it to the user. Never soften an unverified claim into vague language to make it feel safe — vague and wrong is still wrong.

## Known traps

- **The docs can be stale.** Existing pages are not evidence. Verify against source, not against a neighbouring page.
- **Feature availability moves.** Coexistence and AI plan gating have both changed. Re-check rather than trusting a claim written months ago.
- **The `chatflows` branch merges from `dev`.** A merge can bring a new feature that Shopify-only mode does not hide yet. If a feature looks unrelated to a Shopify merchant, check `config/shopify_only.php` and ask before documenting it.
