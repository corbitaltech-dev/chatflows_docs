---
name: docs-fact-check
description: How to verify a documentation claim against the real ChatFlows.io product before publishing it — locating the feature in the Laravel/Vue reseller source at /home/corbital/laravel/whatsmarkio_reseller, confirming exact UI button and status labels, checking plan gating and limits, and telling sub-tenant behaviour apart from reseller-admin and platform behaviour. Activate when writing any factual claim about how the product behaves, when a page mentions a button/screen/limit, when auditing an existing page for accuracy, or when the user asks whether a documented behaviour is real.
---

# Fact-checking a docs claim

Every behavioural claim in the docs must be traceable to the product. A page that describes a button that doesn't exist is worse than a missing page — it burns the trust the docs are there to build.

**Product source:** `/home/corbital/laravel/whatsmarkio_reseller` — Laravel + Vue/Inertia (`resources/js/pages`, no `app/Livewire`). This is the reseller/white-label build: the same codebase serves a plain B2C tenant, a reseller's own admin workspace, and a reseller's end customer (a "sub-tenant"), so confirm which of the three a claim is about before grepping.

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
- **Every plan gate** — is this feature really available on Free Forever?
- **Every limit or price** — and remember these belong only in `getting-started/free-vs-paid.mdx` (see the `chatflows-docs` skill).

## How to check

**UI labels** — grep the Vue pages for the visible string:

```bash
cd /home/corbital/laravel/whatsmarkio_reseller
grep -rn "Sync Templates" resources/js --include="*.vue" | head
```

If the string only appears in a translation file, check the current value there — that is what users see.

**Plan gating and limits** — for a plain tenant or a reseller's own workspace, these live in the feature/plan seeders and are read through `FeatureService`. For a sub-tenant, the same `FeatureService` resolves against `SubTenantFeatureLimit`/`SubTenantPlan` instead (via `SubTenantContext::id()`) — same feature-key vocabulary, values sourced from the reseller's own plan rather than ChatFlows.io's. Grep for the feature key, then cross-check against `getting-started/free-vs-paid.mdx`. If the docs and the seeder disagree, the **seeder is right** and the docs page needs fixing — say so rather than quietly matching the stale page.

**Behaviour** — trace the controller or job rather than inferring from the UI. There is no specialist-agent roster in this repo (no `.claude/agents/`) — read the relevant controller/route file directly instead of routing to a named subagent.

## When you can't verify

State it rather than guessing. `<Note>` a caveat, or leave the claim out and flag it to the user. Never soften an unverified claim into vague language to make it feel safe — vague and wrong is still wrong.

## Known traps

- **The docs can be stale.** Existing pages are not evidence. Verify against source, not against a neighbouring page.
- **Feature availability moves.** Coexistence and AI plan gating have both changed. Re-check rather than trusting a claim written months ago.
- **`free-vs-paid.mdx` is the single source of truth for numbers** — but only because someone keeps it current. If you find it contradicts the seeders, fixing that page is the priority.
