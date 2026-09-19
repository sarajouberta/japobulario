/*
Configuración de Firebase (solo se usa Firebase Authentication para iniciar sesión con Google;
los datos siguen en MongoDB).
Se copia de la consola de Firebase: Configuración del proyecto -> Tus apps -> japobulario-web.
Estos valores NO son secretos: viajan al navegador en cualquier web que use Firebase.
Los usan:
  - el navegador (views/auth/login.twig) para mostrar el login de Google
  - el servidor (routes/auth.js) para comprobar el token que envía el navegador (solo necesita projectId)
 */
module.exports = {
    apiKey: 'AIzaSyDM4_gH-deT0YatLWDFHoDlGW4l1dRhFAA',
    authDomain: 'japobulario.firebaseapp.com',
    projectId: 'japobulario',
    storageBucket: 'japobulario.firebasestorage.app',
    messagingSenderId: '181492604214',
    appId: '1:181492604214:web:ad27663766e9eb69026797',
};
