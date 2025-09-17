## Plans v2 - Catálogo (RW)

Pasos exactos:

1) Configurar variables en Vercel (Production):
   - `CATALOG_DB_URL` (RW obligatorio)
   - `CATALOG_DB_RO_URL` (opcional)
   - Redeploy de la app

2) Ejecutar migración:
   ```bash
   npm run db:catalog:migrate
   ```

3) Verificar esquema/tabla:
   ```bash
   npm run db:catalog:check
   ```

4) Self-test de API (espera `plans_v2_exists: true`):
   - Abrir `/api/plans_v2/selftest?__schema=1`

5) Probar búsqueda:
   ```bash
   curl -s -X POST /api/plans_v2/search \
     -H "content-type: application/json" \
     -d '{"country":"CO","limit":3}'
   ```


