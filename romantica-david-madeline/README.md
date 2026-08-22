# ❤️ David & Madeline — Nuestra historia

Página romántica estática, responsive y lista para publicar con **GitHub Pages**. Incluye propuesta interactiva, carta animada, línea del tiempo, contador, música original, frasquito de mensajes, “Abrir cuando…”, galería local/online, recuerdos pendientes, tema claro/oscuro y pequeños secretos.

## Lo que ya viene funcionando

- Propuesta con botones **Sí ❤️ / No 😢** y botón “No” juguetón.
- Carta romántica animada al elegir “Sí”.
- Fechas personalizadas:
  - **12 de julio de 2026:** empezaron a hablar.
  - **16 de agosto de 2026:** se conocieron.
- Contador en tiempo real desde el 12 de julio.
- Sección “Razones por las que me alegra haberte encontrado”.
- Frasquito de mensajes aleatorios.
- Cuatro cartas “Abrir cuando…”.
- Álbum con placeholders reemplazables.
- Integración opcional con **Supabase Storage + Auth** para subir fotos desde la página publicada.
- Lista de recuerdos pendientes que se conserva en el navegador.
- Tema claro/oscuro.
- Música instrumental original incluida (`assets/audio/our-song.wav`).
- Diseño adaptable a móvil, tablet y escritorio.
- Respeto a `prefers-reduced-motion` para accesibilidad.

---

# 1. Probar la página en tu PC

Como el proyecto usa módulos JavaScript, lo ideal es abrirlo con un servidor local y no haciendo doble clic sobre `index.html`.

### VS Code

1. Abre esta carpeta en VS Code.
2. Instala la extensión **Live Server** si no la tienes.
3. Clic derecho sobre `index.html` → **Open with Live Server**.

### Python

Si tienes Python instalado, abre una terminal dentro de esta carpeta:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

---

# 2. Subir a GitHub

1. En GitHub crea un repositorio, por ejemplo: `david-madeline`.
2. Descomprime este ZIP.
3. Sube **todo el contenido de esta carpeta** a la raíz del repositorio.
4. Haz commit en la rama `main`.

Con Git instalado también puedes usar:

```bash
git init
git add .
git commit -m "Nuestra pagina romantica"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/david-madeline.git
git push -u origin main
```

---

# 3. Activar GitHub Pages

En el repositorio:

1. **Settings**.
2. **Pages**.
3. En **Build and deployment / Source**, elige **Deploy from a branch**.
4. Selecciona `main` y la carpeta `/ (root)`.
5. Guarda.

GitHub publicará el sitio con una dirección parecida a:

`https://TU_USUARIO.github.io/david-madeline/`

El proyecto usa rutas relativas, por lo que funciona correctamente dentro de un repositorio de proyecto de GitHub Pages.

---

# 4. Conectar la galería online con Supabase

GitHub Pages hospeda archivos estáticos; no puede guardar por sí solo las nuevas fotos que alguien sube desde el navegador. Por eso este proyecto puede usar **Supabase** como nube externa.

La arquitectura queda así:

```text
GitHub Pages
    │
    ├── HTML / CSS / JavaScript
    │
    └── Supabase
          ├── Auth: controla quién puede subir
          ├── Storage: guarda las imágenes
          └── Database: guarda título, frase y URL
```

## Paso A — Crear el proyecto

1. Crea un proyecto en Supabase.
2. Espera a que termine la configuración inicial.
3. Abre **SQL Editor**.
4. Copia y ejecuta completo el archivo:

```text
supabase/setup.sql
```

Este SQL crea:

- bucket `couple-photos`;
- tabla `couple_photos`;
- restricciones de formato/tamaño;
- políticas RLS;
- lectura pública del álbum;
- subida solamente para usuarios autenticados.

## Paso B — Crear las cuentas de David y Madeline

En **Authentication → Users**, crea manualmente las cuentas que quieras permitir para subir fotos.

Por seguridad, si solo ustedes dos usarán la subida, deja desactivado el registro público de cuentas. La página **no incluye formulario de registro**, solamente inicio de sesión.

## Paso C — Copiar la URL y la clave pública

Busca en la configuración/API de tu proyecto:

- **Project URL**
- **Publishable key / anon key**

Abre:

```text
js/config.js
```

Y cambia:

```js
url: 'PEGA_AQUI_TU_SUPABASE_URL',
anonKey: 'PEGA_AQUI_TU_SUPABASE_ANON_KEY',
```

por tus valores reales.

### MUY IMPORTANTE

En una web estática **nunca pongas una `service_role` key** ni ningún secreto administrativo. Solamente usa la clave pública/publishable/anon del proyecto. La seguridad de las subidas está en las políticas RLS de `supabase/setup.sql`.

Después de modificar `js/config.js`, haz commit y push a GitHub. Desde ese momento el botón **“Subir una foto ☁️”** detectará automáticamente la conexión.

---

# 5. ¿Qué pasa después de conectarlo?

Cuando la página ya está en GitHub Pages:

1. David o Madeline abre la página.
2. Pulsa **Subir una foto ☁️**.
3. Inicia sesión.
4. Selecciona una imagen.
5. Escribe título y frase.
6. Pulsa **Guardar en nuestro álbum**.
7. La imagen se guarda en Supabase y aparece en el álbum.

**No es necesario hacer un nuevo commit a GitHub por cada foto.** Las fotografías se cargan desde Supabase cada vez que alguien visita la página.

---

# 6. Privacidad de las fotografías

La configuración incluida usa un **bucket público para lectura**, porque la página es pública y necesita mostrar las imágenes sin pedir inicio de sesión a cada visitante.

Eso significa:

- solo usuarios autenticados pueden **subir**;
- los visitantes pueden **ver** las fotos de la galería;
- las URLs de las imágenes son públicas.

Si quieres que **también la visualización sea privada**, habría que cambiar el bucket a privado, autenticar antes de mostrar el álbum y generar URLs firmadas. Para una página romántica pública en GitHub Pages, el modo incluido suele ser el más sencillo.

---

# 7. Cambiar textos, nombres y fechas

Los datos principales están en:

```text
js/config.js
```

Las frases largas y el contenido visual están en:

```text
index.html
```

Busca los textos y cámbialos directamente.

La fecha usada por el contador es:

```js
startedTalking: '2026-07-12T00:00:00-05:00'
```

El `-05:00` corresponde a la zona horaria de Panamá.

---

# 8. Poner fotos directamente dentro del repositorio

Si quieres que algunas imágenes siempre vengan incluidas en GitHub, reemplaza:

```text
assets/images/gallery/photo-1.svg
assets/images/gallery/photo-2.svg
assets/images/gallery/photo-3.svg
```

por tus fotos y luego cambia las rutas en `index.html`. Puedes usar JPG, PNG o WEBP.

Las fotos subidas desde el botón de nube **no necesitan estar en esta carpeta**: se guardarán en Supabase.

---

# 9. Cambiar la música

El proyecto incluye una pista instrumental original y sencilla:

```text
assets/audio/our-song.wav
```

Si tienen una canción propia o un audio que tengas derecho a publicar, puedes reemplazar el archivo. Si usas otro nombre o formato, cambia esta línea al final de `index.html`:

```html
<audio id="loveAudio" src="assets/audio/our-song.wav" loop preload="none"></audio>
```

Evita subir música comercial al repositorio sin permiso de uso.

---

# 10. Estructura del proyecto

```text
romantica-david-madeline/
├── index.html
├── README.md
├── manifest.webmanifest
├── .nojekyll
├── .gitignore
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── config.js
│   └── supabase-gallery.js
├── assets/
│   ├── audio/
│   │   └── our-song.wav
│   └── images/
│       ├── favicon.svg
│       └── gallery/
│           ├── photo-1.svg
│           ├── photo-2.svg
│           └── photo-3.svg
└── supabase/
    └── setup.sql
```

---

## Seguridad

La clave pública de Supabase puede estar en el frontend cuando las políticas RLS están correctamente configuradas. Lo que **jamás** debe publicarse en GitHub es una clave administrativa `service_role`.

El archivo SQL está diseñado para que las fotografías solo puedan subirse después de iniciar sesión. Para un álbum de pareja, la opción más segura y sencilla es crear manualmente las dos cuentas permitidas y mantener el registro público desactivado.

---

Hecho para **David & Madeline** ❤️
