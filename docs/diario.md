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

Cuatro cosas: el furigana en la frase de ejemplo, el significado arriba de la tarjeta, los títulos
del índice de los libros en original con su traducción, y un pie de página en toda la web.

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
- **Comprobado con node** sobre los 1655 ejemplos: en todos se encuentra la palabra y el texto sin
  etiquetas coincide exactamente con la frase original, así que la conversión no se come ni cambia
  nada.
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

## 2026-10-06 - Marcar tarjetas como aprendidas

Desde el modo estudio se puede marcar una tarjeta como aprendida, y el índice de estudio enseña el
progreso y deja elegir si se estudian todas, solo las aprendidas o solo las que faltan. Se hizo
antes que los kanji porque es pequeño, se usa ya con las 1940 palabras y no depende del tipo de
tarjeta: cuando lleguen los kanji tendrán la marca sin tocar nada.

- **La marca va por usuario, no en la tarjeta.** Las tarjetas de los libros son comunes a todos,
  así que cada marca es un documento aparte en un modelo nuevo, `Learned` (usuario + tarjeta, con
  un índice único para que no se repita). Desmarcar borra el documento.
- **Un solo botón "Aprendida"** entre "Anterior" y "Siguiente", que pone y quita la marca. Cuando
  la tarjeta ya está aprendida se pone en verde y dice "OK Aprendida". Se descartó "La sé / No la
  sé", que es más tipo test pero solo guardaría la última respuesta.
- **Se guarda al momento** con `fetch` (`POST /japobulario/study/learned/:id`). El servidor solo
  deja marcar tarjetas que el usuario puede ver (las de los libros y las suyas), y si algo falla la
  página lo avisa en rojo en vez de dar la marca por buena.
- **Índice de estudio:** al lado de cada nivel, sección y categoría sale "x / n aprendidas", y
  arriba un selector "Todas / Sin aprender / Aprendidas". El filtro elegido se aplica a la lista
  (solo salen las secciones que tienen alguna tarjeta que abrir, y si en un nivel no queda ninguna
  lo dice), a los enlaces del modo estudio y al enlace de volver, y se conserva al cambiar de
  pestaña. En el modo estudio aparece en la línea de lo que se está estudiando.
- **Dos fallos encontrados al probarlo en el navegador.** El primero: la marca no se guardaba nunca,
  porque `json_encode` de Twig escribe el `_id` de Mongo como un objeto con sus bytes y el botón
  acababa llamando a `/learned/[object Object]`; ahora el id se pasa como texto a la vista. Las
  pruebas con node no lo habían visto porque mandaban el id desde el servidor, no desde la página.
  El segundo: el selector solo cambiaba a dónde llevaban los enlaces y la lista seguía igual, así
  que parecía que no filtraba.
- **Comprobado** con una app de prueba que monta las rutas de estudio con una sesión falsa:
  marcar dos veces no duplica, desmarcar borra, un id mal escrito da error 400 y una tarjeta que no
  existe da 404, y en la sección 1 del capítulo 1 del N5 salen 13 tarjetas en total, 2 aprendidas
  y 11 sin aprender tras marcar dos. Después, a mano en el navegador.

## 2026-10-10 - Orden aleatorio en el modo estudio

Hasta ahora las tarjetas salían siempre en el orden del libro, y al repasar una sección se acaba
recordando qué palabra viene después en vez de la palabra misma.

- **Un botón "Barajar"** arriba, al lado de la línea de lo que se está estudiando, y no en la
  barra de abajo, que en el móvil ya va justa con "Anterior", "Aprendida" y "Siguiente". Al
  pulsarlo mezcla las tarjetas y vuelve a la primera; pasa a decir "Orden original" (en oscuro) y,
  pulsándolo otra vez, se vuelve al orden del libro, o al de creación en las propias. Cada vez que
  se baraja sale un orden distinto. Con una sola tarjeta no aparece.
- **Se baraja en el navegador**, sin volver a pedir las tarjetas al servidor: ya están todas en la
  página. Se mezcla una copia con el algoritmo de Fisher-Yates (todos los órdenes igual de
  probables), y el orden original se queda guardado para poder volver.
- **Las marcas de aprendida no se pierden**: las dos listas tienen los mismos objetos, solo cambia
  el orden, así que marcar una tarjeta barajada es marcar la misma tarjeta.
- **Comprobado con node** sobre una página simulada de 50 tarjetas: al barajar están las mismas 50
  en otro orden, al volver el orden es el original y empieza en 1 / 50, y una tarjeta aprendida
  sigue marcada después de barajar. Después, a mano en el navegador.

## 2026-10-10 - Kanji del Basic Kanji Book (lecciones 1 a 3)

La parte de kanji estaba vacía desde que se borraron los `.txt` de prueba. Ahora tiene datos de un
libro, igual que el vocabulario: el **Basic Kanji Book Vol. 1** (基本漢字500), que estaba en PDF en
la carpeta `japo`.

- **El PDF es un escaneo sin texto** (221 páginas, lecciones 1 a 22, kanji del 1 al 251), así que
  hay que transcribirlo, como los libros de vocabulario. Cada kanji tiene en el libro una ficha
  siempre igual: número, significado en inglés, kun (hiragana), on (katakana), nº de trazos, orden
  de trazos y de 2 a 4 palabras de ejemplo con su lectura. El resto de cada lección (explicaciones,
  ejercicios, lecturas, juegos) no sirve para tarjetas.
- **Primero las lecciones 1 a 3** (35 kanji, 119 palabras de ejemplo), para probar el formato en la
  app antes de transcribir el resto. Están en `seeds/data/kanji_BKB1.json`, con la misma forma que
  el vocabulario y el furigana en notación `{漢字|かな}`. Las lecturas se guardan como en el libro:
  `-` antes del okurigana (`い-きる`) y entre paréntesis las poco usadas (`(かど)`).
- **Las notas a mano del escaneo no se transcriben.** En 七 y 年, la caja de ejemplos del libro
  está tapada por notas en español: las palabras japonesas salen de esas notas, y los significados
  en inglés se escribieron al transcribir (la ficha lo indica en `notes`). Una de esas notas tenía
  un error: 来年 es "next year", no "año pasado".
- **El nivel JLPT no viene en el libro**, que va por lecciones. Se ha puesto el de jisho.org, que
  usa las listas anteriores a 2010 (desde entonces no hay lista oficial). Comprobado allí uno a uno,
  y no todo era como se esperaba: de estas tres lecciones, 田, 口 y 私 son N4 y 門 es N2, aunque
  estén entre los primeros del libro. El libro ordena por forma (empieza por los que salen de un
  dibujo) y el JLPT por uso. Por eso los kanji se estudian por lección, y el nivel solo sirve
  para filtrar. El modelo admite ahora de N5 a N1.
- **Un fallo que se habría colado:** el importador del vocabulario identificaba cada palabra por
  nivel y número del libro, y los kanji también tienen los números 1, 2, 3... y nivel N5. Al
  reimportar el vocabulario se habrían machacado los kanji, y el índice único no dejaba ni
  guardarlos. Ahora el tipo forma parte de la identidad (índice `(type, level, bookId)`), y cada
  importador solo toca lo suyo. Comprobado repitiendo los dos: siguen 35 kanji y 1940 palabras.
- **Importador nuevo**, `npm run import:kanji` (y `import:kanji:atlas`), que también cambia el
  índice antiguo por el nuevo en la bdd.
- **Estudio de kanji por lecciones:** "Estudiar kanji" abre la misma pantalla de elegir que el
  vocabulario, con pestañas, filtro de aprendidas y progreso, pero en Libros salen las lecciones
  ("Lección 1 · えからできた漢字 -1-", con la traducción al lado). Las dos pantallas y los dos modos
  de estudio son la misma vista y la misma ruta, que cambian según el tipo. Por detrás de la
  tarjeta: significado, kun, on, trazos y las palabras de ejemplo con furigana y el kanji en
  negrita (女の**子**).
- **Comprobado** con la app de prueba (solo lectura): lecciones de 10, 10 y 15 kanji, filtros de
  lección, nivel y aprendidas, enlace de volver y el vocabulario igual que antes; los 119 ejemplos
  salen con el kanji en negrita sin cambiar la palabra. Después, a mano en el navegador.

## 2026-10-10 - Kanji: tabla de lecturas, lecciones 4 a 7 y un solo nivel para el libro

- **Lecturas en una minitabla.** Por detrás de la tarjeta, kun y on van ahora en dos columnas,
  una al lado de la otra, cada lectura en su línea y todo centrado, como en la ficha del libro.
  Es una tabla sin bordes, solo para alinear.
- **Bandera de Japón al lado de "Lectura kun"**, para distinguir de un vistazo la lectura
  japonesa. Está dibujada con CSS, no es un emoji: un rectángulo blanco 2:3 con el círculo rojo de
  3/5 del alto, igual que la llave inglesa del pie, que está dibujada a mano en SVG.
- **Lecciones 4 a 7 transcritas** (kanji 36 a 75): kanji hechos con signos (上, 下, 中...), con
  combinaciones de significados (明 = sol + luna, 林 = dos árboles, 森 = tres) y otras dos tandas
  de pictogramas. En total 75 kanji y 249 palabras de ejemplo. Las lecturas irregulares que el
  libro marca con `*` (大人, 小人, 上手, 下手) llevan una nota, y 畑 también: es un kanji creado en
  Japón y no tiene lectura on.
- **El nivel JLPT, cambiado a uno solo para todo el libro: N4.** Al buscar el nivel de los
  nuevos salían cosas raras. 林, 森, 竹, 糸 y 貝 eran N2; 畑, N1, y jisho no daba nivel ni a 畑 ni
  a 分 (que es claramente N5), así que hubo que mirarlos en otra web, jlptsensei.com. Son kanji
  básicos, que se conocen de sobra con el N5 aprobado. Esas listas miden cuánto sale un kanji en el
  vocabulario de cada nivel, no lo básico que es, así que la etiqueta confundía más que
  ayudaba. Ahora todos los kanji del libro van con N4: los 250 del Vol. 1 son más o menos los de
  N5 + N4. El nivel va una sola vez arriba del JSON, y el JLPT de cada kanji se queda en el JSON
  como referencia, sin usarse.
- **Comprobado** reimportando (40 kanji nuevos y los 35 anteriores pasados a N4, sin
  duplicados): los 249 ejemplos salen con el kanji en negrita sin cambiar la palabra, el índice
  enseña las 7 lecciones y los filtros funcionan. Después, a mano en el navegador.

## 2026-10-10 - Kanji: lecciones 8 a 11, fondo rosa y caché de las plantillas

- **Lecciones 8 a 11 transcritas** (kanji 76 a 121): adjetivos (新, 古, 長...), verbos (行, 来,
  食...), el tiempo (朝, 昼, 夜, 週...) y la primera lección de radicales (作, 泳, 海, 語...). En
  total 121 kanji y 405 palabras de ejemplo. Llevan nota las lecturas irregulares que el libro
  marca con `*` (七夕, 時計, 言葉, 物語); las palabras con dos lecturas guardan la segunda aparte
  (毎月: まいげつ / まいつき), y en 飯 el libro explica que 飯 (めし) es la forma coloquial de ご飯,
  así que salen como dos ejemplos.
- **El JLPT de referencia ya no se busca.** Desde que todo el libro va con N4, el `jlpt` de cada
  kanji no se usa, así que solo lo tienen los kanji 1-75, que se comprobaron. Al principio el
  script que genera el JSON les ponía "N5" a los nuevos por defecto, sin comprobarlo: se quitó
  para que el JSON no tuviera un dato falso.
- **Hoja de estilos común**, `public/stylesheets/common.css`, que el layout carga en todas las
  páginas antes que las demás. Hasta ahora no había ninguna para toda la web (solo la del menú).
  Los colores generales van como variables en `:root`, para cambiarlos en un solo sitio.
- **Fondo rosa pálido** (`#fde8ee`) entre el menú y el pie, también en la barra de botones del modo
  estudio. El primer tono, `#fff5f7`, era tan pálido que no se distinguía del blanco.
- **Los cambios de las vistas no se veían sin reiniciar el servidor:** twig guarda siempre las
  plantillas en caché, salvo que se le diga lo contrario, así que el layout nuevo no se leía. Ahora,
  en desarrollo, la caché está desactivada (`app.js`) y basta con recargar la página; al publicar
  (`NODE_ENV=production`) se mantiene, porque va más rápido. Esto explica por qué antes algunos
  cambios no salían hasta reiniciar.

## 2026-10-10 - Kanji: el Basic Kanji Book entero (lecciones 12 a 22)

Con estas tres tandas está transcrito el libro completo: **22 lecciones, 251 kanji y 825 palabras
de ejemplo**, todo importado y estudiable por lecciones.

- **Lecciones 12 a 15:** radicales arriba y abajo (宅, 家, 薬...), arriba a la izquierda y los
  que rodean (広, 病, 国, 開...), abajo a la izquierda (近, 遠, 道...), y la familia (父, 母, 兄,
  姉...).
- **Lecciones 16 a 19:** adjetivos de な (元気, 有名, 親切...), verbos de movimiento (出, 入,
  乗, 降...), posición (右, 左, 東, 西...) y afijos de lugar (〜場, 〜館, 〜園, 〜所...).
- **Lecciones 20 a 22:** la división administrativa de Japón (市, 町, 村, 都, 府, 県...), los
  verbos con する (練習, 勉強, 研究, 質問...) y los nombres de dos kanji (政治, 経済, 歴史...).
- **Lo mismo que en las tandas anteriores:** llevan nota las lecturas irregulares que el libro
  marca con `*` (今日, お父さん, お母さん, お兄さん, お姉さん, 弟子, 部屋), y donde el libro
  iguala dos palabras salen como dos ejemplos (奥さん = 奥様). Las palabras con dos lecturas
  guardan la segunda aparte (市場: いちば / しじょう).
- **Solo va lo que pone la ficha.** La lección 5 dice que 働 es un kanji creado en Japón, y se le
  iba a poner esa nota, como a 畑. Pero 畑 no tiene lectura on y 働 sí (ドウ), así que la nota
  habría confundido: se quitó.
- **Comprobado** en cada tanda reimportando todo (sin duplicados): los 825 ejemplos salen con el
  kanji en negrita sin cambiar la palabra, y el índice enseña las 22 lecciones con sus títulos.
  Después, a mano en el navegador.

## 2026-10-11 - Las 14 palabras del N5 sin significado

Eran las únicas fichas de los libros que no se podían estudiar. Al buscarlas en el PDF se vio que
no era un fallo de la transcripción: **el libro no les da significado**, solo las enseña con un
dibujo o una tabla.

- **La familia de Yamada** (pág. 19): ごりょうしん, お父さん, お母さん, おねえさん, おにいさん,
  おとうとさん e いもうとさん salen solo sobre el árbol familiar. Se entienden por la página
  anterior, la de la familia propia (父 father, あね older sister...): son las formas para hablar
  de la familia de otro.
- **Seis contadores** (〜月, 〜こ, 〜だい, 〜つ, 〜日, 〜かい／がい): la cabecera no tiene
  traducción; debajo va la tabla con cada forma (1月 January, 2かい second floor...), que sí la
  tiene.
- **半**: solo un reloj con 00:30.

Se les ha escrito el significado en inglés, como al resto ("(someone else's) father", "counter for
floors", "half past (the hour)"...), y una nota en cada ficha que dice que no viene del libro.
Siguen sin ejemplo, como otras fichas del N5. Con esto se estudian las 1940 palabras de los dos
libros. Las tablas de los contadores siguen pendientes: van con las `extras`, en la sección de
contadores.

## 2026-10-11 - Una portada con botones

La página principal era una lista de enlaces. Ahora:

- **Arriba**, "Japobulario" grande con la fuente de pincel del menú, una línea que dice para qué
  es la app, un saludo con el nombre de pila ("Hola, Sara": la cuenta de Google trae el nombre
  completo, y se coge solo la primera palabra) y cuántas tarjetas se llevan aprendidas.
- **Cuatro botones grandes** en forma de tarjeta: estudiar vocabulario, estudiar kanji, ver
  tarjetas y nueva tarjeta. Cada uno lleva un kanji grande (語, 字, 札, 新) en un círculo del rosa
  de la página, con la fuente de pincel: es texto, no un icono. Al pasar el ratón el botón sube
  un poco y al pulsarlo baja. En pantalla ancha van en fila y en el móvil, uno debajo de otro.
- **Los textos nuevos salían como claves** ("home.subtitle"): la librería de traducción lee los
  `.json` una sola vez, al arrancar el servidor. Igual que se hizo con la caché de twig, en
  desarrollo ahora los vuelve a leer cuando cambian (`autoReload`), así que basta con recargar la
  página.

## 2026-10-11 - Lista de tarjetas como fichas y más opciones para estudiar

- **La lista de tarjetas** (`/japobulario/flashcards`) era una lista sin estilo. Ahora cada tarjeta
  es una ficha blanca, como los botones de la portada: la palabra o el kanji grande, la lectura,
  el significado en negrita y abajo unas etiquetas en rosa (nivel, tipo y categoría). Van en
  cuadrícula, tantas por fila como quepan, y en el móvil una debajo de otra.
- **Todo el vocabulario de los libros de una vez:** arriba de la pestaña Libros hay un enlace para
  los dos niveles juntos (1940 tarjetas). Con el filtro "Aprendidas" o "Sin aprender" abre solo
  las que lo cumplen, y se siguen pudiendo elegir "Todo el N5" o "Todo el N4".
- **Capítulo entero:** el título de cada capítulo es ahora un enlace que lo abre completo, con su
  progreso al lado ("4 / 102 aprendidas"). Ese número cuenta todo el capítulo, también las
  secciones que el filtro esconde.
- Comprobado con la app de prueba: los enlaces llevan el filtro, el capítulo 1 del N5 abre sus 102
  tarjetas y "todo" con "Aprendidas" abre solo las marcadas.

## 2026-10-11 - Publicada en Render

La app ya se puede usar desde el móvil, con la base de datos en MongoDB Atlas y el login de Google.

- **Hosting: Render** (plan gratuito, sin tarjeta). Se miró también Vercel, donde ya hay otra app
  publicada, pero Vercel y Netlify están pensados para webs estáticas y funciones sueltas, y esta
  app es un servidor Express que se queda encendido (páginas con twig, sesiones, conexión a
  MongoDB): Render lo ejecuta tal cual, con `npm start`, sin cambiar nada. Publica solo desde el
  repositorio de GitHub: cada `git push` a `main` vuelve a desplegar.
- **La pega del plan gratis:** tras unos 15 minutos sin visitas, Render duerme el servidor, y la
  primera visita después tarda 30-50 segundos. Los datos no se pierden, están en Atlas. Para eso
  queda pendiente la versión instalable con pantalla de espera.
- **Pasos que se hicieron:**
  - Cargar los datos en Atlas con `npm run import:atlas` (vocabulario, ya estaba: se actualizó con
    los cambios recientes) y `npm run import:kanji:atlas` (los 251 kanji, por primera vez; el
    importador cambió allí el índice viejo por el nuevo).
  - En Atlas, Network Access: permitir `0.0.0.0/0`, porque Render gratis no tiene una IP fija. La
    bdd sigue protegida por el usuario y la contraseña de la dirección de conexión.
  - En Render: servicio web desde el repositorio, `npm install` / `npm start`, y las variables
    `MONGO_URL`, `NODE_ENV=production` y `SESSION_SECRET` (una cadena aleatoria generada con
    `crypto`). En `package.json` se indicó la versión de Node (`engines`).
  - En Firebase: añadir el dominio de Render a los dominios autorizados, para que funcione el
    login con Google.
- Probada en el móvil: login, portada, vocabulario y kanji.

## 2026-10-11 - Adaptada al móvil

Al abrirla en el móvil se veía todo muy pequeño.

- **Faltaba la etiqueta `viewport`** en el layout. Sin ella, el navegador del móvil pinta la página
  como si la pantalla fuera de ordenador (unos 980px de ancho) y luego la encoge entera. Con ella
  usa el ancho real (unos 360-412px). Vale para todas las páginas.
- **Dos anchos mínimos ajustados:** cada nivel de la pantalla de elegir pedía 400px, más que el
  móvil (ahora 300px), y en la lista de tarjetas caben dos por fila en el móvil en vez de una.
- **El menú se pliega en el móvil:** ocupaba cuatro líneas. Ahora es una sola, con el nombre, ES |
  EN y un botón "Menú" que despliega los enlaces (cada uno en su fila, fácil de pulsar) y el
  usuario con "Cerrar sesión". Está hecho sin JavaScript, con una casilla oculta. En el ordenador
  no cambia.
- Comprobado con capturas de Chrome a tamaño de móvil (390px): portada, elegir qué estudiar, modo
  estudio de vocabulario y de kanji, lista de tarjetas y el menú cerrado y abierto.
- **En el móvil no cambiaba nada al principio:** Render solo había hecho el primer despliegue y
  no se enteraba de los `git push`, aunque el Auto-Deploy estaba en "On Commit". La app de Render
  estaba autorizada en GitHub (para iniciar sesión con la cuenta) pero no instalada en el
  repositorio, que es lo que hace que GitHub le avise. Se desplegó a mano (Manual Deploy) y se
  instaló la app de Render en el repositorio.
- Queda una cosa vista en las capturas: la tarjeta de kanji es muy alta, porque la parte de atrás
  tiene muchos ejemplos y las dos caras miden lo mismo; en el móvil el kanji queda a media altura.

## 2026-10-15 - App instalable y pantalla de espera

En el plan gratuito, Render duerme el servidor tras un rato sin visitas y la primera carga tarda
30-50 s con la página en blanco.

- **Instalable en el móvil (PWA):** manifiesto (`public/manifest.webmanifest`) con nombre, colores
  e iconos, para "Añadir a pantalla de inicio". Se abre sin la barra del navegador, como una app.
  Los iconos (`public/icons/`) son el mismo diseño que el de la pestaña (語 blanco sobre gris), en
  PNG: 192 y 512 px, uno "maskable" con el kanji más pequeño (Android lo recorta en círculo u otras
  formas) y uno de 180 px para el iPhone. Se generaron con capturas de Chrome headless.
- **Pantalla de espera:** un service worker (`public/sw.js`) guarda la pantalla `/waking` (logo y
  "Despertando...") la primera vez que se visita la web. Desde la segunda, si al abrir una página
  el servidor no contesta en 4 s, enseña esa pantalla, que pregunta a `/ping` cada 2 s y recarga
  la página pedida en cuanto el servidor responde.
- Para saber que una respuesta es de la app (y no, por ejemplo, un aviso de Render mientras
  despierta), todas llevan la cabecera `X-Japobulario`.
- La pantalla de espera no puede depender del servidor, así que lleva los estilos dentro y los
  textos de los dos idiomas (claves `waking.*`); elige el de la cookie `lang` al enseñarse.
- Justo después de despertar, el service worker espera a la página sin límite de tiempo: si no,
  una página lenta (más de 4 s) volvería a la espera una y otra vez.
- Probado en Chrome headless con un proxy que retiene las peticiones unos segundos, como Render
  dormido: a los 4 s sale la pantalla de espera, en español o en inglés según la cookie, y la
  página entra sola cuando el servidor contesta.
- **Logo nuevo:** al 語 se le añadió "Japo" en rosa, con una fuente de pincel (Kaushan Script, de
  Google Fonts), girado y encima de su esquina de arriba a la izquierda. Las letras van dibujadas
  en los PNG, así que la web no carga la fuente. En el "maskable" el dibujo va más pequeño, para
  que Android no corte la "J" al recortarlo en círculo. El icono de la pestaña es solo una "J"
  rosa con la misma fuente, porque con 16 px "Japo" no se leería (`public/favicon.png`; el
  `favicon.svg` del 語 se borró). Se subió la versión de la caché del service worker
  (`japobulario-v2`) para que la pantalla de espera coja el logo nuevo.

## 2026-10-15 - Página "Acerca de"

- **`/japobulario/about`** (`views/about.twig`, estilos en `about.css`): qué es Japobulario, para
  quién es y qué tiene, la bibliografía y otras fuentes. Todos los textos van en los dos idiomas
  (claves `about.*`).
- **Bibliografía con las portadas** (`public/images/books/`): la del Basic Kanji Book se sacó del
  PDF escaneado (ya era a color) recortando los márgenes blancos; las del N5 y el N4 las buscó la
  usuaria, y a la del N5 se le recortaron también los márgenes. Los datos de los libros están en
  `BOOKS`, en `routes/japobulario.js`. Si falta el archivo de una portada, sale un recuadro con el
  título.
- Datos de los libros de vocabulario, del colofón de los libros en papel (edición 英語・ベトナム語版):
  autora アークアカデミー, editorial 株式会社アスク, 初版 第1刷 en 2017 (N5) y 2016 (N4), e ISBN.
  El PDF del N5 no trae colofón, y el del N4 dice 2015 pero sin "英語・ベトナム語版" en el título:
  debe de ser el de la edición japonesa original. Del de kanji: Chieko Kano, Yuri Shimizu, Hiroko
  Takenaka y Eriko Ishii, Bonjinsha, 3.ª edición. Sin año ni ISBN: la usuaria solo tiene el PDF
  (se lo pasaron en clase) y no los trae. El que se vende ahora en Amazon (2020, ISBN
  978-4-89358-973-6, 236 páginas) parece una edición posterior, así que no se usan sus datos.
- **Enlace en la portada**, debajo del título: "¿Qué es Japobulario?" / "What's Japobulario?".
- Comprobado con capturas de Chrome a 390 y 1000 px de ancho, con una sesión de prueba que se
  borró al terminar.

## 2026-10-15 - La pantalla de espera no entraba sola

- Probada en el móvil con Render dormido: salió "Despertando...", pero a los dos minutos seguía
  ahí, y al cerrarla y volver a abrir la app entró directamente (el servidor ya estaba despierto).
- Causa probable: la pantalla pregunta a `/ping` y esperaba la respuesta sin límite de tiempo.
  Mientras despierta, Render retiene las peticiones, y si una se queda colgada, la pantalla no
  vuelve a preguntar nunca.
- Arreglo: cada pregunta a `/ping` se abandona a los 8 s y se repite, y además la página se
  recarga sola cada minuto, por si acaso. Probado en local con un proxy que deja colgadas las
  peticiones a `/ping` mientras el servidor "duerme": entra sola en cuanto despierta.
- Caché del service worker en `japobulario-v3`, para que el móvil guarde la pantalla nueva.

### Pendiente

- **Importar las tablas de los libros** (`extras`).
- **Sección de estudio para los contadores y otros grupos de palabras** que no son vocabulario
  general (contadores, meses y días, prefecturas, 敬語...): son tablas del libro y se estudian como
  conjunto, no palabra suelta, así que necesitan su propia pantalla dentro de estudio, aparte de
  las secciones de los capítulos. Depende de importar antes las `extras`.
- **Más opciones al elegir qué estudiar:**
  - Quizá, poder **juntar secciones de capítulos distintos** y estudiarlas a la vez.
- **Más adelante:** opción de compartir tarjetas con otros usuarios (por ahora son siempre
  privadas).
