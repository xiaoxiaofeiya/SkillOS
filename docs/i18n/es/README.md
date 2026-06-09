# SkillOS Español

**Un centro de mando para que tu agente de programación use las skills correctas en el momento correcto.**

Los agentes modernos ya no solo escriben código. Pueden mejorar interfaces, abrir un navegador, probar flujos, desplegar aplicaciones, revisar seguridad, leer documentación, crear CLIs, trabajar con notebooks y llamar herramientas MCP.

El problema es que, cuando instalas muchas capacidades, el agente puede no saber cuál usar.

SkillOS ayuda a resolver eso.

## Qué hace SkillOS

SkillOS ayuda al agente a responder preguntas prácticas:

- Qué skills y herramientas están instaladas en esta máquina.
- Para qué sirve cada capacidad.
- Qué significa realmente una petición informal del usuario.
- Qué skill conviene usar ahora.
- Qué skill conviene usar más tarde.
- Qué pasos tienen riesgo y necesitan aprobación.
- Qué pruebas o verificaciones hacen falta antes de terminar.

## Ejemplo

El usuario dice:

```text
No sé diseñar UI. Haz que este panel se vea profesional y revísalo.
```

SkillOS ayuda al agente a convertir esa frase en un flujo real:

```text
Entender el producto
  -> planear la interfaz
  -> implementar cambios
  -> abrir en navegador
  -> capturar screenshots
  -> corregir desbordes y estados rotos
  -> explicar el resultado
```

El usuario no necesita saber si la herramienta correcta se llama `playwright`, `screenshot` o de otra forma.

## Para quién es

- Personas que quieren pedir resultados sin memorizar nombres de skills.
- Desarrolladores que instalan muchas skills y quieren mejor enrutamiento.
- Equipos que usan Codex, Claude Code, Cursor, Windsurf, OpenHands u OpenClaw.
- Autores de skills que quieren que sus capacidades sean más fáciles de descubrir.
- Desarrolladores de agentes que necesitan MCP, logs locales, perfiles de seguridad y evals.

## Empezar

Instala la skill para agentes:

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

Instala el runtime local:

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.sh | bash
```

En Windows:

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

Luego ejecuta:

```bash
skillos doctor
skillos setup --safety approve
skillos recommend "Make this UI professional and verify it"
skillos explain --last
```

Lee más en [Product Overview](../../product-overview.md) e [Installation](../../installation.md).
