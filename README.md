# fabio

SaaS base institucional da Automania AI (Nx monorepo em construção).

## Status
- Fase atual: `Implement + Validate (contracts foundation)`
- Feature ativa: `saas-standard-v1`
- Foundation `STD-001..STD-007`: concluída

## Estrutura principal
- `apps/`: aplicações do workspace
- `libs/`: módulos e core compartilhado
- `.specs/`: governança, specs, design e tasks
- `skills/(project)/`: skills de operação do projeto
- `tools/`: scripts operacionais (`start-day`, `end-day`, etc.)

## Fluxo diário
```powershell
cd C:\projetos\fabio
.\tools\start-day.ps1 -Agent codex -ForceSkills
```

## Bootstrap runtime skeleton
```powershell
npm install
.\nx show projects
.\nx run contract-tests:contract-checks
```

## Runtime dual concierge slice
```powershell
.\nx run app-platform-api:test
.\nx run app-platform-api:serve
```

## Encerramento diário
```powershell
.\tools\end-day.ps1 -ShowPending
```
