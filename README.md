# PreventivoTech — integración inicial con Supabase

Proyecto académico para Laredo (Trujillo, Perú), desarrollado con React 19, TypeScript y Vite.

## Requisitos

- Node.js 22.12 o superior, npm
- Proyecto Supabase con las tablas ya creadas (`perfiles`, `fuentes`, `mediciones`, `reportes`, `incidencias_fuente`) y sus políticas RLS

## Ejecutar localmente

1. Instalar dependencias: `npm install`
2. Copiar `.env.example` como `.env.local` y reemplazar los valores por **Project URL** y **publishable key** de tu proyecto Supabase.
3. Ejecutar `npm run dev` y abrir la dirección que aparezca en la terminal.
4. Comprobar compilación: `npm run build`.

**No subir `.env.local` al repositorio.** El archivo `.gitignore` lo excluye.

### Ajuste de seguridad adicional (ejecutar en SQL Editor)

Antes de aplicar `supabase_actualizacion_seguridad.sql`, revisa las políticas existentes con `supabase_diagnostico_solo_lectura.sql`. El ajuste requiere `public.es_autoridad()` y solo reemplaza la política `reportes_leer`; otras políticas permisivas pueden ampliar el acceso. Este ajuste no repara el registro.

## Autenticación y roles

- Los usuarios pueden registrarse únicamente como `familia`. Supabase Auth gestiona la contraseña y la sesión.
- El trigger `crear_perfil` incluido en la base de datos inicial crea automáticamente su perfil.
- Un administrador cambia el rol desde Supabase **SQL Editor**, no desde la aplicación:

```sql
-- Sustituye por el correo real de una cuenta ya registrada:
update public.perfiles p
set rol = 'especialista'
from auth.users u
where p.id = u.id and u.email = 'CORREO_DEL_ESPECIALISTA';

update public.perfiles p
set rol = 'autoridad'
from auth.users u
where p.id = u.id and u.email = 'CORREO_DE_LA_AUTORIDAD';
```

Después de cambiar el rol, cerrar sesión e iniciar sesión otra vez.

Si la confirmación por correo está habilitada en Supabase, confirmar el email para entrar. Al publicar: configurar la URL real en **Authentication → URL Configuration** (Site URL / Redirect URLs) de Supabase.

## Qué persiste realmente en Supabase

- Registro, acceso, perfiles con autorización por RLS.
- La familia puede **enviar reportes reales a la tabla `reportes`** y consultar sus propios reportes.
- La autoridad puede consultar todos los reportes y cambiar su estado a **En revisión** o **Revisión culminada**.
- Las tablas `fuentes`, `mediciones` e `incidencias_fuente` existen pero aún **no se alimentan automáticamente**.
- Las incidencias técnicas del recorrido de especialista/autoridad, las tarjetas de lecturas y las comunicaciones siguen siendo **simulaciones guardadas localmente** para la demostración. No son datos meteorológicos reales.
- El plan familiar se guarda localmente por cuenta en este navegador, **no en la base de datos**.
- No se emiten alertas oficiales ni se debe usar para decisiones de evacuación.

## Publicar en GitHub + Vercel

1. Crear un repositorio vacío en GitHub.
2. Desde la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "feat: integra autenticacion y reportes con Supabase"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```
3. En Vercel seleccionar **New Project**, importar el repositorio.
4. Framework: **Vite**, comando de build `npm run build`, Output Directory: `dist`.
5. Configurar variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con valores del mismo Supabase (son públicas, pero no revelar claves secretas).
6. Desplegar y configurar el dominio de Vercel en Supabase Authentication → URL Configuration para confirmación por email.

**Antes de presentar**: probar registro, acceso con los tres roles, envío de un reporte y cambio de estado, y recargar la página para confirmar que el reporte persiste.

## Revisión del registro — 17 de noviembre de 2026

### Causa y configuración

La aplicación usa **React 19 + Vite 8 + TypeScript**, no Next.js. Lee `import.meta.env.VITE_SUPABASE_URL` y `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`. No usa variables `NEXT_PUBLIC_*`.

En la primera inspección, `.env.local` contenía una URL con `TU-PROYECTO` y una clave de ejemplo. El cliente comprobaba únicamente si ambos campos tenían texto, y creaba una conexión al destino equivocado. Después, el usuario guardó la URL real y la clave completa en el archivo local. No se copiaron las claves a esta documentación.

La URL correcta es `https://ylsfknmzgeiptznapish.supabase.co`, sin `/auth/v1`. La clave debe ser la publicable completa del mismo proyecto. `.gitignore` excluye `.env.local`; `.env.example` solo contiene la URL pública y un campo de clave vacío. Esta carpeta no era un repositorio Git durante la inspección; no se hizo ningún commit ni publicación.

### Cambios de código

- `src/supabaseConfig.ts`: valida valores ausentes, ejemplos, estructura de URL y formato de clave publicable antes de inicializar el cliente. Nunca acepta claves secretas. Esta validación local no comprueba la existencia de la clave; esa comprobación se hace contra Supabase. Esta app se configura para un proyecto alojado en `supabase.co`.
- `src/supabaseClient.ts`: conserva un único cliente con persistencia de sesión, renovación y detección del enlace de confirmación; expone el error de configuración sin revelar valores.
- `src/authErrors.ts` y `src/SupabaseFeatures.tsx`: muestran mensajes en español para red, clave rechazada, email sin confirmar, requisitos de contraseña, límites de intentos, CAPTCHA y fallo del servidor/trigger. No muestran respuestas arbitrarias del servidor. Se bloquea el cambio de modo mientras se procesa la solicitud.
- `src/App.tsx`: corrige referencias posiblemente nulas al cliente dentro de consultas asíncronas de sesión, perfil y reportes.
- `src/vite-env.d.ts`: declara las dos variables de entorno utilizadas.
- `scripts/check-supabase.mjs`: consulta salud y configuración sin imprimir la clave ni crear usuarios.
- `tests/auth.test.mjs`: verifica validación, errores y la solicitud real que construye el SDK con un transporte simulado. No envía emails ni crea usuarios.
- `supabase_diagnostico_solo_lectura.sql`: permite inspeccionar triggers, funciones, columnas, RLS y políticas sin modificar datos.

La llamada `signUp` ya tenía la estructura correcta: correo sin espacios exteriores, contraseña y `options.data.nombre`, con `emailRedirectTo: window.location.origin`. No se envía un rol desde el navegador. Si Supabase devuelve usuario sin sesión con la confirmación activada, el formulario pide confirmar el correo.

### Comprobaciones y pasos para usarlo

1. Ejecutar `npm run check:supabase`. Tras actualizar `.env.local`, health y settings devolvieron HTTP 200. Email está habilitado, el registro no está deshabilitado y la confirmación por correo está activa. Un HTTP 401 al abrir health sin clave no significa que el servidor esté caído: requiere la cabecera `apikey`.
2. Ejecutar `npm run typecheck`, `npm test` y `npm run build` para validar código y compilación.
3. Reiniciar `npm run dev` después de cambiar `.env.local`. Abrir el origen que muestre Vite (por defecto `http://localhost:8443`).
4. En Supabase → Authentication → URL Configuration, comprobar que Redirect URLs incluya el origen local exacto y el dominio real de Vercel. Site URL debe apuntar al sitio correcto. Estas URLs afectan al regreso desde el email; no reparan un dominio de Supabase equivocado.
5. Registrar una cuenta con un correo propio, confirmar el enlace recibido e iniciar sesión. La revisión no acredita una cuenta real confirmada ni la entrega del correo: no se dispone de un buzón de prueba del usuario.
6. En Vercel, elegir framework Vite, build `npm run build`, salida `dist`, configurar ambas variables para el entorno usado y volver a desplegar. Las variables Vite se incorporan durante la compilación; guardar el archivo local no cambia el sitio publicado.

### Base de datos y límites de verificación

El SQL inicial que crea las tablas y el trigger no está en esta carpeta. El README menciona `crear_perfil`, pero esto no demuestra que esté instalado o que funcione en la base remota. No se cambiaron tablas, triggers ni políticas remotas.

Si el registro devuelve un error al guardar el usuario, revisar Auth Logs y ejecutar el diagnóstico de solo lectura en SQL Editor. Revisar que el trigger sobre `auth.users` cree `public.perfiles` con `id = new.id` y rol fijo `familia`, sin confiar en un rol enviado por el usuario, con permisos adecuados y un `search_path` seguro. Un error en ese trigger puede abortar el registro.

Si Auth funciona pero la aplicación no puede leer el perfil, comprobar la fila y una política SELECT que permita al usuario leer su propio perfil (`id = auth.uid()`). Revisar que no pueda elevar su rol mediante UPDATE. No solucionar esto deshabilitando RLS.

La política local `reportes_leer` regula consultas a reportes, no `/auth/v1/signup`. Depende de `public.es_autoridad()`; deben revisarse su definición, permisos y posibles políticas permisivas adicionales. Revisar INSERT de reportes propios y UPDATE exclusivo de autoridad con `WITH CHECK` para proteger propietario y campos permitidos. La clave publicable no permite auditar todas las políticas o triggers administrativos: no se certificó su estado remoto.

Si se exige CAPTCHA o hay límites de correo/SMTP, integrar la verificación y revisar Auth Logs/configuración correspondiente. No se desactivaron protecciones ni se modificaron ajustes remotos.

Documentación oficial: [variables Vite](https://vite.dev/guide/env-and-mode), [signUp](https://supabase.com/docs/reference/javascript/auth-signup), [URL de redirección](https://supabase.com/docs/guides/auth/redirect-urls), [perfiles y triggers](https://supabase.com/docs/guides/auth/managing-user-data).
