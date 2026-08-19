# Our Journey

Our Journey es una aplicación web privada para dos personas, pensada para guardar y explorar recuerdos geolocalizados. Esta etapa establece una base segura y mantenible: autenticación, mapa, servicios, rutas, esquema de datos y Storage privado.

## Stack

- Angular 21 con componentes standalone, Router, Reactive Forms, Signals y RxJS.
- TypeScript y SCSS, con diseño mobile-first.
- MapLibre GL JS.
- Supabase Auth, PostgreSQL, Row Level Security y Storage.
- Sin backend propio, SSR, frameworks visuales ni registro público.
- Preparado para un despliegue futuro en Cloudflare Pages.

## Requisitos e instalación

- Node.js 24.x.
- npm compatible con Node 24.
- Un proyecto remoto de Supabase.
- Una URL de estilo compatible con MapLibre.

```bash
node --version
npm --version
npm install
npm start
```

Angular sirve la aplicación normalmente en `http://localhost:4200`.

```bash
npm run build
npm test -- --watch=false
```

El build se genera en `dist/our-journey/browser`. No se necesita PostgreSQL local ni un servidor Node propio.

## Configuración de entornos

Edita `src/environments/environment.development.ts` para desarrollo y `src/environments/environment.ts` para producción:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  mapStyleUrl: 'YOUR_MAP_STYLE_URL',
};
```

- `supabaseUrl`: Project URL.
- `supabasePublishableKey`: Publishable Key; en proyectos antiguos puede aparecer como clave pública `anon`.
- `mapStyleUrl`: URL de un estilo compatible con MapLibre GL JS.

Nunca coloques aquí una Service Role Key, Secret Key, contraseña de PostgreSQL o connection string. El navegador solo utiliza Project URL y Publishable Key; la seguridad real reside en RLS. La aplicación detecta los placeholders y no intenta conectarse con credenciales inventadas.

## Preparación de Supabase

La guía para principiantes está en [docs/SETUP_SUPABASE.md](docs/SETUP_SUPABASE.md).

Ejecuta desde SQL Editor, en este orden:

1. `supabase/sql/001_schema.sql`
2. `supabase/sql/002_security.sql`
3. `supabase/sql/003_storage.sql`
4. `supabase/sql/004_seed_categories.sql`

Después:

1. Mantén deshabilitado el registro público.
2. Crea manualmente los dos usuarios desde Authentication > Users.
3. Verifica una fila en `public.profiles` por usuario.
4. Confirma que `journey-media` sea privado.
5. Copia Project URL y Publishable Key a los environments.
6. Configura un estilo para MapLibre.
7. Inicia Angular y prueba el login.

## Seguridad

- RLS está activo para perfiles, categorías, viajes, recuerdos, media y lugares futuros.
- `anon` no recibe privilegios ni policies sobre datos privados.
- Los usuarios autenticados comparten los datos de esta aplicación privada.
- El registro público no existe en Angular y debe seguir deshabilitado en Supabase.
- `created_by` se asigna en PostgreSQL con `auth.uid()`.
- El rol de perfil no puede modificarse desde el cliente.
- `journey-media` es privado.
- PostgreSQL guarda `storage_path`, nunca una URL pública.
- Los archivos se leen con sesión autenticada o Signed URLs temporales.

Este modelo presupone que solo los dos usuarios creados manualmente pueden autenticarse. Antes de habilitar más cuentas, las policies deben evolucionar a un modelo de parejas o espacios.

## Arquitectura

```text
src/app/
├── core/
│   ├── constants/
│   ├── guards/
│   ├── models/
│   └── services/
├── features/
│   ├── admin/
│   ├── auth/
│   ├── journey/
│   ├── memories/
│   ├── timeline/
│   └── trips/
├── shared/
│   ├── components/
│   └── utils/
├── app.config.ts
├── app.routes.ts
└── app.ts
```

`core` contiene acceso a Supabase, sesión, modelos y guards. `features` agrupa las páginas por función. `shared` contiene piezas reutilizables y el mapper GeoJSON. Los componentes no llaman `supabase.from(...)` y las páginas cargan de forma lazy.

## Base de datos

- `profiles`: perfil asociado uno a uno con `auth.users`.
- `categories`: catálogo autenticado.
- `trips`: viajes con portada guardada por ruta.
- `memories`: recuerdos con coordenadas validadas e importancia 1–5.
- `media`: archivos relacionados por `storage_path`.
- `future_places`: ideas, planes y lugares visitados.

Las coordenadas usan `double precision` con checks. La capa de servicios y el mapper aíslan esta decisión para facilitar una futura migración a PostGIS.

## MapLibre

`JourneyMapComponent` crea el mapa después de disponer del contenedor DOM, mantiene la lógica aislada y destruye la instancia al salir. Deja preparados `addMemories`, `focusMemory`, `fitTrip` y `clearMemories`.

Antes de producción selecciona un proveedor/estilo con licencia, atribución y límites adecuados. No se fija una URL de demostración.

## Usuarios y roles

El trigger de `001_schema.sql` crea el perfil de cada usuario. Todos empiezan como `member`. Para designar manualmente un administrador usa el UUID real:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_REAL_DEL_USUARIO';
```

No ejecutes el ejemplo sin reemplazar el UUID.

## Despliegue futuro

No se despliega en esta etapa. Para Cloudflare Pages usa `npm run build`, configura el directorio de salida de Angular, prepara los valores de environment durante el build y establece el fallback SPA hacia `index.html`.

## Flujo funcional de recuerdos

La aplicación ya permite completar el primer flujo vertical:

1. Iniciar sesión y abrir /admin.
2. Pulsar Nuevo recuerdo.
3. Cargar las categorías y los viajes reales desde Supabase.
4. Completar el formulario y elegir la ubicación con un clic en MapLibre.
5. Guardar mediante MemoryService; PostgreSQL asigna created_by usando auth.uid().
6. Regresar a /journey con confirmación.
7. Ver el punto GeoJSON, seleccionarlo y abrir su detalle en Angular.

En desarrollo, MapLibre utiliza el estilo público Liberty de OpenFreeMap configurado en environment.development.ts. No requiere una API key. La configuración de producción continúa centralizada en environment.ts.

No se añadieron fotografías, geocoding, edición, eliminación ni cambios de esquema en esta etapa.
