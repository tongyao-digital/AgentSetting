# @agentsetting/dev-skills

Team Dev Skills package for AgentSetting engineering workflow.

## 1. What This Package Provides
This package ships a CLI (`dev-skills`) that standardizes project operations:
1. `doctor`
2. `dev up|down`
3. `db migrate|seed|reset`
4. `test unit|integration|all`
5. `contract check`
6. `lint`
7. `typecheck`
8. `init` (generate project config template)

## 2. Install
```bash
npm i -D @agentsetting/dev-skills
```

## 3. Usage
```bash
dev-skills help
dev-skills doctor
dev-skills dev up
dev-skills test unit
dev-skills contract check
```

## 4. Config
The CLI reads project config from `dev-skills.config.json` in project root.

Generate a starter config:
```bash
dev-skills init
```

Template source is bundled at:
`templates/agentsetting.config.json`

## 5. Notes for Current Project
1. `db *` currently returns code `2` when server DB layer is still placeholder.
2. `lint` falls back to `contract check` when no lint script is defined.
3. `test integration` runs web integration tests plus server `*.spec.js` tests.
