# Japobulario - Tecnologías

Breve explicación de cada tecnología o herramienta del proyecto y para qué se usa aquí.
Aplicación web para estudiar vocabulario japonés (JLPT N5 y N4) con flashcards.

## Base del proyecto

| Tecnología | Qué es | Para qué se usa aquí |
|---|---|---|
| **Node.js** (22) | Entorno para ejecutar JavaScript fuera del navegador, en el servidor. | Ejecuta toda la aplicación y los scripts de `seeds/`. |
| **npm** | Gestor de paquetes de Node. | Instala las librerías (`npm install`) y define los comandos de `package.json` (`npm start`, `npm run import`...). |
| **Express** (4) | Framework web para Node: recibe peticiones (rutas) y devuelve respuestas. | Todas las rutas de `routes/` y la configuración de `app.js`. |
| **express-generator** | Herramienta que crea el esqueleto de un proyecto Express. | Creó la estructura inicial (`bin/www`, `app.js`, `routes/`, `views/`). Ya no se usa. |
| **Twig** (twig.js) | Motor de plantillas: HTML con huecos (`{{ variable }}`) y lógica (`{% if %}`, `{% for %}`). | Todas las vistas de `views/`. `layout.twig` es la base de la que heredan las demás (`{% extends %}`). |

### Middlewares de Express

Un *middleware* es una función por la que pasa cada petición antes de llegar a la ruta
(para leer cookies, registrar la petición, comprobar la sesión...). Se añaden con `app.use()`.

| Librería | Para qué |
|---|---|
| **morgan** | Escribe en la consola cada petición (`GET /japobulario 200 5 ms`). |
| **cookie-parser** | Lee las cookies de la petición (la del idioma, por ejemplo). |
| **express.json / express.urlencoded** | Leen el cuerpo de las peticiones POST: JSON (login) y formularios (crear tarjeta). |
| **express.static** | Sirve tal cual los archivos de `public/` (CSS, JavaScript del navegador, icono). |
| **http-errors** | Crea los errores HTTP (por ejemplo el 404 de página no encontrada). |

## Base de datos

| Tecnología | Qué es | Para qué se usa aquí |
|---|---|---|
| **MongoDB** (7.0) | Base de datos NoSQL: guarda *documentos* (parecidos a objetos JSON) agrupados en *colecciones*, sin tablas ni columnas fijas. | Guarda las tarjetas (`flashcards`), los usuarios (`users`) y las sesiones (`sessions`). |
| **Mongoose** (8) | Librería para usar MongoDB desde Node con *esquemas*: define qué campos tiene cada documento, sus tipos y validaciones. | Modelos `models/Flashcard.js` y `models/User.js`. |
| **MongoDB Atlas** | MongoDB en la nube, gestionado por MongoDB. Plan gratuito M0 (512 MB). | Base de datos para cuando se publique la app. |
| **mongosh** | Consola de MongoDB para hacer consultas a mano. | Revisar datos y borrar bases de datos de prueba. |

Conceptos de MongoDB usados en el proyecto:

- **ObjectId:** identificador único que MongoDB pone a cada documento (`_id`). El campo `owner` de
  una tarjeta guarda el ObjectId de su usuario.
- **Índice único:** impide que dos documentos repitan un valor. `(level, bookId)` en las tarjetas
  (cada palabra del libro una sola vez) y `firebaseUid` en los usuarios.
- **Upsert:** "actualiza si existe, inserta si no". Permite repetir la importación de los libros sin duplicar.
- **aggregate:** consultas que agrupan y cuentan (por ejemplo, cuántas tarjetas hay por sección).
- **timestamps:** Mongoose añade solo `createdAt` y `updatedAt` a cada documento.

### MongoDB local y MongoDB Atlas

- **Local** (`npm start`): instalado en el ordenador como servicio `mongod`. Sin usuario ni
  contraseña, porque solo acepta conexiones del propio ordenador (`bindIp: 127.0.0.1`).
- **Atlas** (`npm run start:atlas`): pide usuario y contraseña, y solo acepta las IP de su lista
  (Network Access).
- La dirección se elige con la variable de entorno **`MONGO_URL`** (ver `config/database.js`).

## Variables de entorno y secretos

| Cosa | Qué es | Para qué se usa aquí |
|---|---|---|
| **Variables de entorno** | Valores que se pasan al programa desde fuera, sin escribirlos en el código (`process.env.NOMBRE`). | `MONGO_URL` (qué base de datos), `SESSION_SECRET` y `NODE_ENV` (al publicar). |
| **Archivo `.env.atlas`** | Archivo con variables de entorno. Node 22 lo lee con `--env-file`, sin librerías. | Guarda la dirección de Atlas con la contraseña. Está en `.gitignore`: nunca se sube. |
| **`.env.example`** | Plantilla sin datos reales. | Explica qué variables hacen falta. Sí se sube. |
| **`.gitignore`** | Lista de archivos que git no debe guardar. | `node_modules`, los `.env`, archivos del IDE... |

## Usuarios e inicio de sesión

| Tecnología | Qué es | Para qué se usa aquí |
|---|---|---|
| **Firebase Authentication** | Servicio de Google para el inicio de sesión: gestiona cuentas, contraseñas y proveedores como Google. | Login con cuenta de Google. La app no guarda ninguna contraseña. |
| **SDK web de Firebase** | Librería de Firebase para el navegador. Se carga desde el CDN de Google (`gstatic.com`). | En `views/auth/login.twig`: abre la ventana de Google (popup, o redirección si está bloqueado). |
| **firebase-admin** | Librería de Firebase para el servidor. | En `lib/firebase.js`: comprueba que el token que manda el navegador es auténtico. |
| **express-session** | Sesiones de usuario en Express: recuerda quién ha iniciado sesión entre una página y otra. | Guarda en `req.session.user` el usuario conectado. |
| **connect-mongo** | Almacén de sesiones en MongoDB. | Las sesiones sobreviven a los reinicios de la app (colección `sessions`). |

Conceptos:

- **Token (ID token):** "carné" firmado por Firebase que demuestra quién es el usuario. El
  navegador lo envía una vez al servidor al iniciar sesión, y el servidor comprueba la firma con
  las claves públicas de Google.
- **Cookie de sesión:** pequeño dato que el navegador guarda y envía en cada petición para que el
  servidor sepa a qué sesión pertenece. Opciones usadas:
  - `httpOnly`: el JavaScript de la página no puede leerla.
  - `sameSite: lax`: no se envía en envíos de formularios desde otras webs.
  - `secure`: al publicar, solo viaja por https.
- **`SESSION_SECRET`:** clave con la que se firma la cookie para que no se pueda falsificar.
  Obligatoria al publicar.
- **Middleware `requireLogin`** (`lib/auth.js`): sin sesión, cualquier página de la app lleva al login.
- **Regla de visibilidad** (`lib/visibility.js`): las tarjetas de los libros las ven todos, las
  propias solo su dueño.

## Traducción de la interfaz

| Tecnología | Qué es | Para qué se usa aquí |
|---|---|---|
| **i18n** | Librería de *internacionalización* ("i" + 18 letras + "n"). | Textos en `locales/es.json` y `locales/en.json`; `__('clave')` devuelve el texto en el idioma elegido. El idioma se guarda en la cookie `lang`. |

## En el navegador (frontend)

| Cosa | Qué es | Para qué se usa aquí |
|---|---|---|
| **JavaScript del navegador** | Código que se ejecuta en la página, no en el servidor. | `public/javascripts/study.js` (navegar y girar tarjetas) y `highlight-word.js` (palabra en negrita en el ejemplo). |
| **fetch / AJAX** | Pedir datos al servidor sin recargar la página. | Cargar los campos del formulario según el tipo de tarjeta y enviar el token al iniciar sesión. |
| **CSS grid** | Sistema de CSS para colocar elementos en filas y columnas. | Las dos caras de la tarjeta ocupan la misma celda, así la tarjeta crece con el contenido. |
| **CSS 3D (`transform`, `perspective`)** | Transformaciones en 3D. | El giro de la tarjeta. |
| **`position: fixed`** | Deja un elemento fijo respecto a la ventana. | La barra de botones Anterior / Siguiente. |
| **Flexbox** | Sistema de CSS para alinear elementos en una fila o columna. | El menú, las pestañas y la pantalla de elegir sección. |
| **SVG** | Imagen hecha con código (vectorial). | La llave inglesa del pie de página. |
| **Manifiesto web (PWA)** | Archivo JSON con el nombre, los colores y los iconos de la web. | Poder instalarla en el móvil como una app (`public/manifest.webmanifest`). |
| **Service worker** | JavaScript que el navegador guarda y que se pone entre la página y el servidor. | Enseñar "Despertando..." mientras el servidor de Render despierta (`public/sw.js`). |
| **Google Fonts** | Fuentes tipográficas servidas por Google. | Yuji Syuku, la fuente tipo pincel del nombre de la app. |

## Datos de los libros

| Cosa | Qué es | Para qué se usa aquí |
|---|---|---|
| **JSON** | Formato de texto para datos estructurados. | `seeds/data/vocabulary_N5.json` y `vocabulary_N4.json`, con el vocabulario transcrito de los libros. |
| **Notación `{漢字\|かな}`** | Forma de escribir el furigana dentro del texto. | Campos `wordFurigana` y `examples.jaFurigana`. Se puede convertir a `<ruby>` en HTML para mostrarlo encima de los kanji. |
| **Seed** | Script que carga datos iniciales en la base de datos. | `seeds/import-book-vocabulary.js` (`npm run import` / `npm run import:atlas`). |

## Herramientas de desarrollo

| Herramienta | Para qué |
|---|---|
| **git** | Control de versiones: guarda el historial de cambios del código (commits). |
| **IntelliJ IDEA** | Editor (IDE) del proyecto, con terminal integrada. |
| **Consola del navegador (F12)** | Ver errores de JavaScript y las peticiones de la página. |
