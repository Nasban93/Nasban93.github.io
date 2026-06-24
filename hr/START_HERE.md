# HotelPulse — Hand-off pack for Claude Code

This folder contains everything Claude Code needs to build the demo. **You don't write any code** — Claude Code does. You just set up an empty project and give it these files.

## What's in this folder
- **PROMPT.md** — the exact message to paste into Claude Code to kick off the build.
- **BUILD_BRIEF.md** — the full spec. Claude Code reads **Part A** to build the app; Parts B/C/D are for you (rollout, IT/security, fallbacks).
- **reference/streamlit_app.py** — your original HotelPulse v5.1. It's the source of truth for the scoring formulas; Claude Code cross-checks against it.
- **DESIGN_PLAN.md** — background/architecture (the "why"). Optional reading for Claude Code if it needs context on a decision.

**Final URL:** the app will live at **`binnasban.com/hr`** (path-based GitHub Pages — no subdomain needed).

## Do this (about 10 minutes)
1. **Create an empty GitHub repo named `hr`** and clone it to your computer (the repo name `hr` is what puts the app at `binnasban.com/hr`).
2. **Copy this whole `hotelpulse-handoff` folder into the repo** (or its files into a `docs/` folder). The key thing is that Claude Code can read `BUILD_BRIEF.md` and `reference/streamlit_app.py`.
3. **Open the repo folder in Claude Code** (with Sonnet).
4. **Paste the contents of `PROMPT.md`** as your first message.
5. Let it build. It should: scaffold a Vite + React + TypeScript app (with `base: "/hr/"`), write the config-driven scoring engine **with tests first**, generate synthetic demo data for *Najd Crown Hotel & Residences*, build the dashboards, and set up GitHub Pages deploy to `binnasban.com/hr`.

## One-time apex domain setup (so binnasban.com points at GitHub Pages)
Do this once, separately from the `hr` repo:
1. Create a repo named **`<your-github-username>.github.io`** (this is your root site at `binnasban.com`).
2. In that repo: Settings → Pages → set **Custom domain = `binnasban.com`** (this writes the apex `CNAME`).
3. At your domain registrar, add the DNS records GitHub shows you (apex `A`/`ALIAS` records → GitHub Pages IPs; plus a `www` CNAME if you want).
Once the apex is live, your `hr