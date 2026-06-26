# SETUP — inicialización del proyecto (para Javi, una sola vez)

Pasos para pasar del scaffolding a un proyecto ejecutable y con el repo listo.
Hacé esto UNA vez, al arrancar.

## 1. Crear el proyecto Next.js base
El scaffolding NO trae el esqueleto de Next (app/, tsconfig, next.config). Lo generás:

```bash
pnpm create next-app@latest wehunter --typescript --tailwind --eslint --app --src-dir
cd wehunter
```

(Elegí: App Router sí, src/ dir sí, import alias `@/*`.)

## 2. Copiar encima los archivos del scaffolding
Copiá el contenido del kit dentro de la carpeta del proyecto, dejando que pise/sume:
`CLAUDE.md`, `.claude/`, `docs/`, `.github/`, `src/db/`, `src/lib/`, `package.json`
(fusioná dependencias), `drizzle.config.ts`, `.env.example`.

> Ojo: NO copies ningún `.git`. Y revisá que `.gitignore` excluya `.env*`, `node_modules`,
> `.next`.

## 3. Instalar dependencias
```bash
pnpm install
```
Verificá que Next, React y Drizzle quedaron en versiones compatibles. Si algo choca, ajustá.

## 4. Conectar Supabase
1. Creá un proyecto en supabase.com.
2. Settings > API y Settings > Database: copiá las connection strings.
3. `cp .env.example .env` y completá los valores (ver comentarios del .env.example:
   pooler :6543 para la app, conexión directa :5432 para migraciones).
4. Creá los buckets **privados** en Storage: `cvs` (CVs de candidatos), `avatars`
   (foto del recruiter) y `org-logos` (logo del workspace).

   Para los tres, cargá políticas RLS de Storage que repliquen el aislamiento por org,
   reutilizando el helper `public.is_org_member(...)` de la migración `0001`. El path de
   cada archivo empieza con `{organizationId}/...`, así que la política valida la org con
   `public.is_org_member((storage.foldername(name))[1]::uuid)` para `select`/`insert`/
   `update`/`delete` al rol `authenticated`. (Estas políticas se cargan a mano en el panel;
   no se versionan en el repo, igual que las del bucket `cvs`.)

## 5. Primera migración
```bash
pnpm db:generate    # genera la migración a partir del schema
pnpm db:migrate     # la aplica en Supabase
```

## 6. Crear el repo privado y subirlo
```bash
git init
git add .
git commit -m "chore: scaffolding inicial WeHunter"
# creás el repo PRIVADO en tu cuenta de GitHub y:
git remote add origin <url-de-tu-repo-privado>
git branch -M main
git push -u origin main
git checkout -b dev && git push -u origin dev
```

## 7. Configurar el merge gate (ver docs/MERGE_GATE.md)
- Editá `.github/CODEOWNERS`: reemplazá `@javi` por tu usuario real.
- En GitHub > Settings > Branches: branch protection en `main` y `dev`
  (require PR, require status check `CI`, require Code Owner review).
- `pnpm prepare` para activar el hook de pre-commit.

## 8. Invitar a Ale
GitHub > Settings > Collaborators > Add people > usuario de Ale > permiso **Write**.
Pasale los valores del `.env` por canal seguro (no por el repo).
Decile que arranque por `docs/ONBOARDING.md`.

## 9. Repartir features
- Vos: `src/features/candidate/` + portal.
- Ale: `src/features/recruiter/`.

Listo. A partir de acá, cada feature se crea con el skill `add-feature-slice`.
