# Configurar Supabase para Our Journey

Esta guía parte desde cero. No necesitas PostgreSQL local: todo se ejecuta en el proyecto remoto de Supabase.

No copies en Angular la contraseña de la base de datos, una connection string, una Secret Key ni la Service Role Key.

## 1. Crear el proyecto

1. Entra al Dashboard de Supabase.
2. Crea una organización si aún no tienes una.
3. Selecciona **New project**.
4. Escribe un nombre, por ejemplo **Our Journey**.
5. Genera y guarda la contraseña de base de datos en un gestor de contraseñas. Angular no la usa.
6. Elige una región cercana a los usuarios.
7. Crea el proyecto y espera a que termine de aprovisionarse.

## 2. Abrir SQL Editor

1. En el menú lateral, abre **SQL Editor**.
2. Pulsa **New query**.
3. Para cada script, copia todo su contenido, pégalo y pulsa **Run**.
4. Confirma que termine sin errores antes del siguiente script.

Conviene guardar cada consulta con el nombre del archivo.

## 3. Ejecutar 001_schema.sql

Copia y ejecuta `supabase/sql/001_schema.sql`.

Crea las tablas `profiles`, `categories`, `trips`, `memories`, `media` y `future_places`, además de claves foráneas, índices, validaciones de coordenadas/fechas/estados, triggers de `updated_at` y el trigger que crea un perfil al aparecer un usuario en Auth.

También crea perfiles faltantes si los usuarios ya existían.

## 4. Ejecutar 002_security.sql

Copia y ejecuta `supabase/sql/002_security.sql`.

Este script:

- activa Row Level Security;
- revoca privilegios de `anon`;
- concede solo lo necesario a `authenticated`;
- permite a los dos usuarios trabajar con datos compartidos;
- impide cambiar `created_by` desde el cliente;
- solo permite modificar el propio `display_name`;
- impide elevar el rol desde Angular.

La seguridad no depende de botones ocultos.

## 5. Ejecutar 003_storage.sql

Copia y ejecuta `supabase/sql/003_storage.sql`.

Crea o actualiza `journey-media` con acceso privado, límite de 50 MB, tipos comunes de imagen/audio/video y policies solo para autenticados.

En **Storage**, confirma que `journey-media` no aparezca como público. No uses ninguna opción para convertirlo en public.

## 6. Ejecutar 004_seed_categories.sql

Copia y ejecuta `supabase/sql/004_seed_categories.sql`.

Inserta Cita, Viaje, Comida, Aventura, Cumpleaños, Gracioso y Especial. Es idempotente: puede volver a ejecutarse sin duplicados.

## 7. Configurar Auth

1. Abre **Authentication**.
2. Entra a la configuración de proveedores.
3. Mantén habilitado **Email**.
4. Deshabilita **Allow new users to sign up**.
5. Confirma que **Allow anonymous sign-ins** también esté deshabilitado.
6. Decide si exigirás confirmación de correo para los usuarios creados manualmente.
7. No configures OAuth ni enlaces de registro en esta etapa.

Los nombres exactos pueden variar. El resultado debe ser que un visitante no pueda crear una cuenta. Angular solo usa `signInWithPassword`.

## 8. Crear los dos usuarios

1. Abre **Authentication > Users**.
2. Pulsa **Add user**.
3. Escribe el correo de la primera persona.
4. Define una contraseña segura y compártela por un canal privado.
5. Marca el correo como confirmado si tu configuración lo requiere.
6. Repite con la segunda persona.
7. No crees usuarios de prueba en producción.

Después abre **Table Editor > profiles**. Debe existir una fila por usuario y su UUID debe coincidir con Authentication. Ambos empiezan como `member`.

## 9. Obtener Project URL

1. Abre la configuración del proyecto.
2. Entra en **API** o **Data API**.
3. Busca **Project URL**.
4. Copia la URL HTTPS.
5. No copies la connection string de PostgreSQL.

## 10. Obtener Publishable Key

En la misma zona:

1. Busca **Publishable Key**.
2. Cópiala.
3. En proyectos antiguos puede aparecer como clave pública `anon`.
4. No copies una clave **Secret** ni **service_role**.

La Publishable Key puede estar en el navegador; RLS es lo que protege los datos.

## 11. Colocar los valores en Angular

Edita `src/environments/environment.development.ts`:

```typescript
supabaseUrl: 'YOUR_SUPABASE_URL',
supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
mapStyleUrl: 'YOUR_MAP_STYLE_URL',
```

Repite la configuración de producción en `src/environments/environment.ts`.

No cambies los nombres ni agregues claves administrativas. Para `mapStyleUrl`, elige un estilo compatible con MapLibre y respeta la licencia, atribución y límites del proveedor.

## 12. Iniciar la aplicación

En la raíz:

```bash
npm install
npm start
```

Abre `http://localhost:4200`.

Si aparece el aviso de configuración, confirma que editaste `environment.development.ts`, que no quedan valores `YOUR_...` y reinicia el servidor.

## 13. Probar login y seguridad

1. Ingresa con el primer usuario.
2. Confirma que aparece el layout privado.
3. Cierra sesión y repite con el segundo.
4. Sin sesión, abre `/memories`; debe redirigir a `/login`.
5. Confirma que no existe enlace de registro.
6. Verifica en Supabase que sign-ups sigan deshabilitados.
7. Confirma que `journey-media` permanezca privado.

Prueba anónima recomendada:

1. Cierra sesión.
2. Con únicamente la Publishable Key y sin token de usuario, intenta leer `memories`.
3. No deben devolverse datos privados.
4. Intenta listar `journey-media`; no debe haber acceso.

Cuando se implemente carga de archivos, PostgreSQL debe guardar solo rutas como `memories/uuid/photo.webp`, nunca URLs públicas.

## Solución de problemas

### “Invalid login credentials”

Comprueba correo, contraseña, existencia del usuario y confirmación del correo. La interfaz muestra un mensaje genérico deliberadamente.

### El mapa no aparece

Confirma `mapStyleUrl`, accesibilidad del estilo y requisitos de token/dominio del proveedor. MapLibre necesita un documento de estilo, no una imagen.

### Falta la fila de profile

Vuelve a ejecutar `001_schema.sql`. El bloque final crea perfiles para usuarios existentes sin duplicarlos.

### El bucket aparece público

Vuelve a ejecutar `003_storage.sql` y confirma `public = false`. No uses `getPublicUrl`.

### Un script falla

Verifica el orden 001, 002, 003 y 004; ejecuta el archivo completo y conserva el error exacto antes de cambiar SQL manualmente.

## Checklist final

- [ ] Los cuatro scripts terminaron sin errores.
- [ ] Existen solo los usuarios privados esperados.
- [ ] Cada usuario tiene perfil.
- [ ] El registro público está deshabilitado.
- [ ] `journey-media` es privado.
- [ ] Project URL configurada.
- [ ] Publishable Key configurada.
- [ ] No hay Service Role Key en el repositorio.
- [ ] `mapStyleUrl` configurada.
- [ ] Login probado con ambos usuarios.
- [ ] Las rutas privadas redirigen sin sesión.
