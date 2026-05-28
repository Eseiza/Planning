import {
  auth,
  db
} from './firebase-config.js';

import {
  signInWithEmailAndPassword,
  signOut
}
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  doc,
  getDoc
}
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let rolUsuario = '';

/* LOGIN */

window.login = async function(){

  const email =
    document.getElementById('email').value;

  const password =
    document.getElementById('password').value;

  try{

    const credenciales =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const uid = credenciales.user.uid;

    const usuarioRef =
      doc(db,'usuarios',uid);

    const usuarioSnap =
      await getDoc(usuarioRef);

    const usuario =
      usuarioSnap.data();

    rolUsuario = usuario.rol;

    iniciarSistema(usuario);

  }
  catch(error){

    Swal.fire({
      icon:'error',
      title:'Error',
      text:'Usuario o contraseña incorrectos'
    });

  }

}

/* INICIAR SISTEMA */

function iniciarSistema(usuario){

  document
    .getElementById('loginContainer')
    .classList.add('hidden');

  document
    .getElementById('app')
    .classList.remove('hidden');

  document
    .getElementById('usuarioRol')
    .innerText =
      usuario.nombre + ' - ' + usuario.rol;

  /* SI ES VISOR */

  if(usuario.rol === 'visor'){

    document
      .getElementById('btnCarga')
      .style.display = 'none';

  }

  mostrarVista('calendario');

  cargarTareas();

}

/* LOGOUT */

window.logout = async function(){

  await signOut(auth);

  location.reload();

}
```
