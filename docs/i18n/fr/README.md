# SkillOS Français

**Un centre de commande pour aider votre agent de code à choisir la bonne skill au bon moment.**

Les agents de développement modernes ne font plus seulement du code. Ils peuvent améliorer une interface, tester dans un navigateur, déployer une application, relire la sécurité, lire de la documentation, créer un CLI, utiliser des notebooks et appeler des outils MCP.

Le problème est simple : plus vous installez de capacités, plus il devient difficile pour l'agent de savoir laquelle utiliser.

SkillOS est conçu pour résoudre ce problème.

## Ce que fait SkillOS

SkillOS aide l'agent à comprendre :

- Quelles skills et quels outils sont installes sur cette machine.
- À quoi sert chaque capacité.
- Ce que la demande de l'utilisateur veut vraiment dire.
- Quelles skills utiliser maintenant.
- Quelles skills garder pour une étape suivante.
- Quels gestes sont risqués et demandent une approbation.
- Quelles preuves collecter avant de dire que le travail est terminé.

## Exemple

L'utilisateur dit :

```text
Je ne sais pas faire de design UI. Rends ce tableau de bord professionnel et vérifie-le.
```

SkillOS aide l'agent à transformer cette demande en vrai workflow :

```text
Comprendre le produit
  -> préparer la mise en page
  -> modifier l'interface
  -> ouvrir dans le navigateur
  -> capturer des screenshots
  -> corriger les débordements et états cassés
  -> expliquer le résultat
```

L'utilisateur n'a pas besoin de connaître les noms `playwright`, `screenshot` ou `security-threat-model`.

## Pour qui

- Les utilisateurs qui veulent demander un résultat sans connaître les noms des skills.
- Les développeurs qui installent beaucoup de skills et veulent un meilleur routage.
- Les équipes qui utilisent Codex, Claude Code, Cursor, Windsurf, OpenHands ou OpenClaw.
- Les auteurs de skills qui veulent rendre leurs capacités plus faciles à découvrir.
- Les développeurs d'agents qui ont besoin de MCP, logs locaux, profils de sécurité et evals.

## Démarrer

Installer la skill côté agent :

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

Installer le runtime local :

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.sh | bash
```

Sur Windows :

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

Puis :

```bash
skillos doctor
skillos setup --safety approve
skillos recommend "Make this UI professional and verify it"
skillos explain --last
```

Lire ensuite [Product Overview](../../product-overview.md) et [Installation](../../installation.md).

## Où installer

- Agent Skills / skills.sh : `npx skills add xiaoxiaofeiya/SkillOS -g`
- Claude Code : `/plugin marketplace add xiaoxiaofeiya/SkillOS`, puis `/plugin install skillos`
- GitHub Release : telecharger `skillos.zip` depuis `v0.1.0-preview.1`
- npm preview : `npm install -g @skillos/cli@preview` apres publication npm
- MCP server : `npx @skillos/mcp-server@preview` apres publication npm
- OpenClaw / ClawHub : voir `docs/publishing-platforms.md`
