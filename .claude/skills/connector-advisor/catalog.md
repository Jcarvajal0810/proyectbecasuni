# Catálogo de candidatos (punto de partida, VERIFICAR antes de proponer)

Estado de verificación: ✅ = comprobado en documentación/fuentes consultadas · ❔ = probable, comprobar antes.

| Capa | Candidatos | Cómo conectar en Claude Code | Estado |
|---|---|---|---|
| UI / app builder | Lovable | `claude mcp add --transport http lovable "https://mcp.lovable.dev"` o `/plugin install lovable@claude-plugins-official` (OAuth) | ✅ |
| UI / diseño | Figma, v0, otros | buscar MCP/plugin oficial | ❔ |
| Datos + auth + storage (BaaS) | Supabase | `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp"` (autenticar en `/mcp`; usar proyecto de desarrollo, lectura si alcanza) | ✅ |
| Base de datos | Neon, PlanetScale, Postgres propio | buscar MCP oficial | ❔ |
| Pagos | Stripe (Mercado Pago, PayPal, Paddle como alternativas según país) | Stripe: servidor MCP remoto `https://mcp.stripe.com` (probar en sandbox) | ✅ Stripe / ❔ resto |
| Errores / observabilidad | Sentry (PostHog, Better Stack, Grafana…) | Sentry: `npx @sentry/mcp-server@latest` con token, o su servidor remoto si existe | ✅ Sentry / ❔ resto |
| Repo / CI | GitHub | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/` y autenticar en `/mcp` | ✅ |
| Hosting / edge | Vercel, Netlify, Cloudflare, Railway, Render, Fly.io | buscar MCP/plugin oficial | ❔ |
| Auth | Clerk, Auth0, Firebase Auth, Supabase Auth | según servicio | ❔ |
| Storage/media | S3, R2, Cloudinary, UploadThing | según servicio | ❔ |
| Búsqueda | Algolia, Meilisearch, Typesense (¿basta la búsqueda de tu BD?) | según servicio | ❔ |
| Email / notificaciones | Resend, SendGrid, Postmark, Twilio | según servicio | ❔ |
| IA / LLM | Anthropic, OpenAI, Gemini, Ollama (local si importa la privacidad) | SDK/API, no siempre MCP | ❔ |
| Gestión | Linear, Notion, Jira, Slack | buscar MCP oficial | ❔ |

Reglas: un servidor MCP es un límite de permisos nuevo → conectar solo lo de confianza, con el alcance mínimo, y probar primero con acciones de bajo riesgo.
