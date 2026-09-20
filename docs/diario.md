# Japobulario - Diario de desarrollo

Diario de los cambios hechos en la app, con el **motivo** de cada uno (no solo el qué).
Lo más reciente arriba.

---

## 2026-09-19 - Vocabulario de los libros, orden del proyecto, traducción y usuarios

Día largo: la app pasó de ser una prueba con unas pocas tarjetas escritas a mano a tener todo el
vocabulario de los libros N5 y N4, una estructura más ordenada, dos idiomas e inicio de sesión
con Google para poder compartirla con compañeros de estudio.

### Punto de partida

Estado del proyecto en el último commit anterior (`fbcd95a`, agosto de 2025):

- **Stack:** Node.js + Express 4 (esqueleto de express-generator), vistas Twig, MongoDB con Mongoose.
- **Un solo modelo, `Flashcard`:** `type` (kanji o vocabulario), `kanji`, `word`, lecturas kun/on,
  `meaning`, `category` y `level` (N5 o N4).
- **Formulario** para crear tarjetas, con los campos de cada tipo cargados por AJAX.
- **Modo estudio** de kanji y de vocabulario con tarjetas que se giran. Acababa de resolverse que
  los campos salieran en blanco: a Twig hay que pasarle objetos planos (`doc.toObject()`), no
  documentos de Mongoose.
- **Datos de prueba** en `seeds/`: 35 kanji y 10 palabras escritos a mano en `.txt`, con los
  significados en español.

Y cosas que se habían ido acumulando: el router de flashcards montado dos veces, rutas y vistas
duplicadas o que nunca se usaban, `console.log` de depuración y un título provisional en el
listado.

### Trabajo previo: el vocabulario de los libros en JSON

Los libros de vocabulario (`vocabulary_N5.pdf` y `vocabulary_N4.pdf`) eran PDF escaneados: solo
imagen, sin texto. Un OCR normal (tesseract) no servía, porque mezcla el furigana con el texto y el
N4 es un escaneo gris con fondo punteado, así que se transcribieron página a página a JSON:
**1046 palabras del N5 y 894 del N4**.

Decisiones sobre el formato, pensando en usarlo en la app:

- **Todo menos el vietnamita** (los libros son inglés + vietnamita).
- **Furigana en notación `{漢字|かな}`**, fácil de convertir a `<ruby>` en HTML.
- **Palabras relacionadas** (sinónimos, antónimos, relacionadas) y **notas** del libro, en campos propios.
- **Se quitó el campo `target`** (la palabra subrayada dentro del ejemplo) por parecer innecesario.
  Más tarde hizo falta y se resolvió de otra forma (ver "La palabra en negrita").
- **Las palabras incompletas van aparte** (`incomplete_entries`, con un campo `missing`): son las
  de las páginas ilustradas, sin frase de ejemplo, y 14 de ellas sin significado. Así no se
  mezclan con las completas.
- **Las tablas sin número** del libro (contadores, meses, prefecturas, 敬語...) van en `extras`.
- **Las erratas del libro se copian tal cual**: es una transcripción, no una corrección.

### Importar los libros a MongoDB

- **El contenido de los libros pasa a ser la base de la app**, y en inglés. Las tarjetas de los
  `.txt` eran una primera prueba.
- **Se amplió `Flashcard`** en vez de crear otro modelo: así el modo estudio que ya existía las
  mostraba sin cambios. Campos nuevos: `source` (`book` o `manual`), `bookId` (número en el libro),
  `reading`, `wordFurigana`, `pos`, capítulo y sección, `examples`, `related`, `notes`, `page`,
  `complete` y `missing`. `meaning` solo es obligatorio en las tarjetas completas.
- **`timestamps: true`**: el listado ordenaba por `createdAt`, pero ese campo no existía, así que el
  orden no hacía nada.
- **Índice único `(level, bookId)`** y **`seeds/import-book-vocabulary.js`** con *upsert*: se puede
  ejecutar las veces que haga falta sin duplicar. Tiene `--dry-run` para validar sin conectarse.
- **MongoDB 7.0, no 8.x.** Este equipo no tenía MongoDB. Se instaló la 8.3, pero no arranca con
  kernels de Linux 6.19 o posteriores (este usa el 7.0): *"Linux kernel versions 6.19 and newer has
  a known incompatibility"* (SERVER-121912). La 7.0 no tiene ese fallo; se probó antes de
  instalarla y se instaló desde el repositorio de Ubuntu 22.04 (`jammy`).

### Modo estudio

- **Elegir qué estudiar.** Con 1600 tarjetas en un solo mazo no se podía estudiar y la página
  pesaba más de 1 MB. `/japobulario/study` pasó a ser una pantalla para elegir un nivel completo o
  una sección del libro (nivel, capítulo, sección, con el número de tarjetas de cada una). Las
  secciones no son una lista fija: salen de agrupar las tarjetas que hay en la base de datos.
- **También las palabras sin ejemplo.** Al principio solo salían las completas, y algunas
  secciones del N5 quedaban casi vacías o no salían ("おはよう。" tenía 0 de 15). Ahora se estudian
  todas las que tienen significado; solo quedan fuera 14 sin significado.
- **La tarjeta se ajusta al contenido.** Medía siempre 300x200 px con las caras en posición
  absoluta, y en el N4 la lectura se salía del recuadro. Ahora las dos caras comparten una celda de
  `grid`: la tarjeta mide lo que la cara más alta, crece con el texto (mínimo 200 px) y no cambia de
  tamaño al girarla.
- **Sin la categoría por detrás**: ya aparece en el título de la página.
- **La palabra en negrita en el ejemplo.** Es lo que hacía el campo `target` quitado al principio.
  En vez de volver a transcribirlo, `public/javascripts/highlight-word.js` busca la palabra en la
  frase probando formas conjugadas (答える -> 答えます), la lectura y las partes opcionales
  ([お]ゆ). Encuentra las 1610 palabras que tienen ejemplo. Con un solo kana solo vale al principio
  de una palabra, para no marcar partículas sueltas.
- **Botones fijos abajo.** Anterior y Siguiente se movían al cambiar a una tarjeta de otro tamaño;
  ahora van en una barra fija en la parte inferior de la ventana.

### Libros y tarjetas propias, separados

Para poder crear tarjetas propias sin que se mezclen con las de los libros, hay pestañas
**Libros / Mis tarjetas** en la pantalla de estudio y en el listado de flashcards. Las propias se
agrupan por nivel y por la categoría que se escribe en el formulario. De paso, en el listado cada
tarjeta se muestra según su tipo: antes todas se pintaban como kanji y las de vocabulario salían
sin la palabra.

### Orden y limpieza del proyecto

Como el proyecto venía de una primera versión sin mucha organización, se revisó entero:

- **Duplicados fuera:** el router de flashcards se monta solo en `app.js`, se eliminaron
  `/flashcards/flashcards` (copia exacta de `/flashcards`), una ruta `/` que nunca se ejecutaba, las
  vistas sin uso `index.twig` y `new-flashcard.twig`, el `express.urlencoded` repetido y los
  `console.log` de depuración.
- **Una sola vista de estudio.** Las de kanji y vocabulario eran casi idénticas; solo cambiaba qué
  se pinta en cada cara. Ahora hay una (`views/study/study.twig`), la navegación está una sola vez
  en `public/javascripts/study.js` (`startStudy`) y cada modo solo define su función de "qué va
  delante y detrás". Añadir otro modo de estudio es escribir solo esa función.
- **Nombres internos en inglés** (`/study/vocabulary`, `?source=book|own`, `mode: 'vocabulary'`).
  Había mezcla: `vocabulary` en la base de datos y `vocabulario` en las rutas, `book` en los datos y
  `libros` en las URLs, con una tabla para traducir entre ellos. Se eligió inglés porque es lo que
  ya usaba la base de datos y porque, con la app en varios idiomas, los nombres internos no se
  traducen.
- **Los títulos de pestaña del navegador no se veían**: las vistas definían un bloque `title` pero
  el layout usaba `{{ title }}`.
- **La dirección de MongoDB en un solo sitio**, `config/database.js`: estaba escrita en tres
  archivos.
- **Sin iconos ni flechas que no se escriban con el teclado**, en el código ni en la web
  (`OK`/`ERROR` en vez de iconos, `->` en vez de flechas).
- **Título del listado:** "Mis flashcards".
- **Sin errores 404**: se quitó el enlace a `style.css` (resto del generador de Express) y la
  pestaña tiene icono propio (`public/favicon.svg`, un 語).
- **Se borraron los `.txt` de prueba y su script.** Siguen en el historial de git.

### Traducción de la interfaz (español / inglés)

Se preparó ya, porque con la app aún pequeña costaba poco. Con la librería `i18n`:

- **Los textos** están en `locales/es.json` y `locales/en.json` (unos 70), agrupados por pantalla.
  En las vistas, `{{ __('study.next') }}`; en las rutas, `req.__('...')`.
- **Selector ES | EN en el menú**: guarda el idioma en una cookie un año y vuelve a la misma página.
- **Solo se traduce la interfaz, no el contenido**: los significados de los libros siguen en
  inglés y las tarjetas propias en el idioma en que se escriban.

### Base de datos local y MongoDB Atlas

- **Local para desarrollar** (`npm start`), **Atlas para publicar** (`npm run start:atlas`). La
  app ya se prepara para compartirla con compañeros.
- **La dirección de Atlas lleva usuario y contraseña**, así que va en `.env.atlas`, que git ignora.
  En el repositorio solo está la plantilla `.env.example`. Node 22 lee ese archivo con
  `--env-file`, sin librerías extra.
- **Por qué la local no pide credenciales:** MongoDB viene sin autenticación, pero solo escucha en
  el propio ordenador (`bindIp: 127.0.0.1`). Para desarrollar es suficiente.
- **Atlas solo acepta las IP de su lista**, y la IP de casa cambia de vez en cuando: si la conexión
  falla con *timeout*, hay que añadir la IP nueva en Network Access.
- **`npm run import:atlas`** cargó en Atlas las mismas 1940 tarjetas.

### Usuarios: inicio de sesión con Google

Sin usuarios, al compartir la app todos habrían visto y editado las mismas tarjetas propias, y
cualquiera con el enlace podría entrar.

- **Firebase Authentication con Google**, en un proyecto de Firebase propio (distinto del de la app
  del taller, para no mezclar usuarios ni límites). Se eligió frente a usuario y contraseña propios
  porque la app no guarda ninguna contraseña y "he olvidado mi contraseña" lo resuelve Google; y
  frente a configurar Google directamente, porque la consola de Firebase ya era conocida y activar
  Google es un clic.
- **Firebase solo se usa para el login**; los datos siguen en MongoDB. A diferencia del taller
  (todo en el navegador, con Firestore), aquí las páginas las genera el servidor, que necesita saber
  quién es cada uno. El flujo es: login con Google en el navegador (popup, con redirección si el
  popup está bloqueado, como en el taller) -> el navegador envía el token a `/auth/session` -> el
  servidor lo comprueba con `firebase-admin` (solo necesita el `projectId`, ninguna clave secreta)
  -> crea el usuario si es nuevo y la sesión.
- **Sesiones con `express-session`**, guardadas en MongoDB para que no se pierdan al reiniciar.
  Cookie `httpOnly`, `sameSite: lax`, `secure` al publicar, y duración de 30 días.
- **Todo `/japobulario` exige sesión** (`lib/auth.js`). Así tampoco quedan públicas las tarjetas de
  los libros.
- **Tarjetas privadas**: las propias guardan su dueño (`owner`). La regla de quién ve qué está en
  un solo sitio, `lib/visibility.js`: las de los libros las ven todos, las propias solo su dueño.
- **Comprobado con dos usuarias de prueba** en una base de datos aparte (18 comprobaciones): cada
  una solo ve, cuenta y estudia sus tarjetas, sin sesión no se entra y los tokens falsos se
  rechazan.
- **La configuración web de Firebase** (`config/firebase.js`) no es secreta: viaja al navegador en
  cualquier web que use Firebase.
- **Coste:** plan gratuito de Firebase (Spark) y cluster gratuito de Atlas (M0), sin tarjeta de
  crédito, así que no puede llegar ninguna factura.

## 2026-09-20 - Furigana, significado arriba, títulos del índice y pie de página

En la parte de atrás de la tarjeta, la frase de ejemplo ya muestra la lectura encima de los kanji,
con la etiqueta `<ruby>` de HTML. Los datos transcritos de los libros ya la traían: las 1940
palabras y los 1655 ejemplos tienen su versión con furigana en notación `{漢字|かな}`.

- **La lectura va solo encima de los kanji.** De los 3573 grupos `{..|..}` del dataset, 106 no
  llevan ninguno (números como `{1998|...}` y siglas como `{CD|シーディー}`): esos se escriben tal
  cual, sin nada encima.
- **`public/javascripts/furigana.js`** hace la conversión. Parte el texto en trozos (los que tienen
  lectura y los que no) y los va pintando; `exampleHtml(card, example)` es lo que llama la vista.
- **Lo más delicado fue juntarlo con la negrita** de `highlight-word.js`, que marca la palabra de la
  tarjeta dentro de la frase: las posiciones que devuelve son del texto sin furigana, así que al
  pintar hay que ir contando cuánto ocupa cada trozo. Un ruby no se puede partir por la mitad, así
  que si la negrita lo toca entra entero.
- **Las tarjetas propias no tienen furigana** (no se pide en el formulario): para ellas se sigue
  usando la frase tal cual, con la palabra en negrita.
- **La cara delantera no lleva furigana** a propósito: si no, la lectura se vería antes de girar la
  tarjeta y no habría nada que recordar.
- **El significado pasa a la parte de arriba de la tarjeta**, centrado y algo más grande que el
  resto del reverso. Es lo primero que se busca al girarla, así que sale siempre en el mismo sitio,
  tenga la tarjeta lectura o no, y en los dos modos (kanji y vocabulario). Se pinta con una sola
  función (`meaningTop`) para que no se pueda desajustar entre modos, y ya sin la etiqueta
  "Significado:", que ahí sobra.
- **En el índice de los libros, los títulos van en original y la traducción al lado**, en gris y
  más pequeña (clase `.translation`). Las secciones ya salían en japonés, pero su traducción
  compartía hueco con el número de tarjetas y parecía lo mismo; ahora van separadas. Los capítulos
  no tenían traducción: el JSON trae `chapter_title_en`, así que se ha añadido `chapterTitleEn` al
  modelo y al importador, y se ha vuelto a importar (1046 + 894 fichas actualizadas, ninguna
  duplicada, porque el importador hace upsert por nivel y número del libro).
- **Pie de página en todas las pantallas**, con el aviso de que la web está en desarrollo
  ("Japobulario is being developed by Saritastar", en `locales/*.json` como `menu.developedBy`) y
  una llave inglesa dibujada en SVG dentro del layout, no un emoji ni un icono de fuente. Es una
  tira como la del menú pero más estrecha y en un gris algo más claro.
- **El pie va fijo al borde de abajo de la ventana**, así se ve siempre sin bajar la página. El
  primer intento fue dejarlo al final del documento y empujarlo con una columna flex, pero en el
  modo estudio quedaba escondido justo encima de la barra de botones, que también es fija. Ahora
  la barra se apoya encima del pie (`bottom: 30px`) y la página reserva abajo el hueco de las dos
  tiras, así que ya no tapan nada. Medido con el navegador: el pie ocupa los últimos 28px de la
  ventana y la barra queda justo encima.
- **Comprobado con node** sobre los 1655 ejemplos: en todos se encuentra la palabra y el texto sin
  etiquetas coincide exactamente con la frase original, así que la conversión no se come ni cambia
  nada.

### Pendiente

- **Al publicar:** elegir hosting y definir allí `MONGO_URL`, `NODE_ENV=production` y
  `SESSION_SECRET` (ver `.env.example`); añadir el dominio en Firebase (Authorized domains) y la
  IP del hosting en Atlas.
- **Las 14 palabras sin significado** del N5 (la familia de la página 19 y algunos contadores).
- **Importar las tablas de los libros** (`extras`).
- **Sección de estudio para los contadores y otros grupos de palabras** que no son vocabulario
  general (contadores, meses y días, prefecturas, 敬語...): son tablas del libro y se estudian como
  conjunto, no palabra suelta, así que necesitan su propia pantalla dentro de estudio, aparte de
  las secciones de los capítulos. Depende de importar antes las `extras`.
- **Marcar una tarjeta como estudiada** desde el modo estudio, y que en otro sitio se puedan ver
  las tarjetas ya aprendidas. Como las tarjetas de los libros son comunes a todos, la marca tiene
  que guardarse por usuario, no en la tarjeta.
- **Orden aleatorio** en el modo estudio.
- **No hay kanji:** al borrar los `.txt` de prueba, la parte de kanji se ha quedado sin datos.
- **Más adelante:** opción de compartir tarjetas con otros usuarios (por ahora son siempre
  privadas).
