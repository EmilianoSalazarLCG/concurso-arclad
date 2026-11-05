# Concurso ARclad

Aplicación para gestionar el concurso interno de naming y logo del proyecto ARclad.
Contexto completo y reglas del proyecto en [CLAUDE.md](CLAUDE.md).

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # llenar con las llaves reales
npm run dev                         # http://localhost:3000
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Vercel.

- Base de datos: migraciones SQL en `supabase/migrations`, aplicadas con la CLI de Supabase.
- Deploy: cada push a `main` publica en producción (https://concurso-arclad.vercel.app);
  las demás ramas generan un deploy de vista previa.
