import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"

};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
};
```

```js
// script.js

import {
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from './firebase-config.js';

let rolUsuario = '';

let calendar;

window.ingresar = function(){

  const rol = document.getElementById('rolSelect').value;

  if(!rol){
    alert('Seleccioná un rol');
    return;
  }

  rolUsuario = rol;

  document.getElementById('loginContainer').classList.add('hidden');

  document.getElementById('app').classList.remove('hidden');

  document.getElementById('usuarioRol').innerText =
    rol.toUpperCase();

  if(rol === 'visor'){
    document.getElementById('btnCarga').style.display = 'none';
  }

  mostrarVista('calendario');

  cargarTareas();

}

window.logout = function(){

  location.reload();

}

window.mostrarVista = function(vista){

  document
    .querySelectorAll('.vista')
    .forEach(v => v.classList.add('hidden'));

  document
    .getElementById(`vista-${vista}`)
    .classList.remove('hidden');

}

window.guardarTarea = async function(){

  const tarea = {

    sector:
      document.getElementById('sector').value,

    equipo:
      document.getElementById('equipo').value,

    descripcion:
      document.getElementById('descripcion').value,

    fechaInicioEstimada:
      document.getElementById('inicioEst').value,

    fechaFinEstimada:
      document.getElementById('finEst').value,

    fechaInicioReal:
      document.getElementById('inicioReal').value,

    fechaFinReal:
      document.getElementById('finReal').value,

    estado:
      document.getElementById('estado').value,

    editado:false

  };

  await addDoc(collection(db,'tareas'), tarea);

  Toastify({
    text:'Tarea guardada',
    duration:3000,
    gravity:'top',
    position:'right',
    backgroundColor:'#22c55e'
  }).showToast();

  cargarTareas();

}

async function cargarTareas(){

  const snapshot =
    await getDocs(collection(db,'tareas'));

  const tareas = [];

  snapshot.forEach(docu => {

    tareas.push({
      id:docu.id,
      ...docu.data()
    });

  });

  renderEstados(tareas);

  renderCalendar(tareas);

}

function renderEstados(tareas){

  document.getElementById('pendientes').innerHTML='';
  document.getElementById('enProgreso').innerHTML='';
  document.getElementById('finalizadas').innerHTML='';
  document.getElementById('demoradas').innerHTML='';

  tareas.forEach(t => {

    const div = document.createElement('div');

    div.className='tarea';

    div.innerHTML = `
      <h4>${t.sector}</h4>
      <p>${t.equipo}</p>
      <small>${t.descripcion}</small>
      ${
        rolUsuario === 'admin'
        ?
        `
        <br>
        <button class="eliminar"
          onclick="eliminarTarea('${t.id}')">
          Eliminar
        </button>
        `
        :
        ''
      }
    `;

    if(t.estado === 'Pendiente'){
      document.getElementById('pendientes')
      .appendChild(div);
    }

    if(t.estado === 'En progreso'){
      document.getElementById('enProgreso')
      .appendChild(div);
    }

    if(t.estado === 'Finalizada'){
      document.getElementById('finalizadas')
      .appendChild(div);
    }

    if(t.estado === 'Demorada'){
      document.getElementById('demoradas')
      .appendChild(div);
    }

  });

}

window.eliminarTarea = async function(id){

  const confirmar = await Swal.fire({
    title:'Eliminar tarea?',
    icon:'warning',
    showCancelButton:true
  });

  if(confirmar.isConfirmed){

    await deleteDoc(doc(db,'tareas',id));

    cargarTareas();

  }

}

function renderCalendar(tareas){

  const calendarEl =
    document.getElementById('calendar');

  if(calendar){
    calendar.destroy();
  }

  calendar = new FullCalendar.Calendar(calendarEl, {

    initialView:'dayGridMonth',

    height:'100%',

    events:tareas.map(t => ({

      title:`${t.sector} - ${t.equipo}`,

      start:t.fechaInicioEstimada,

      end:t.fechaFinEstimada,

      color:
        t.estado === 'Pendiente'
        ? '#eab308'
        :
        t.estado === 'En progreso'
        ? '#3b82f6'
        :
        t.estado === 'Finalizada'
        ? '#22c55e'
        :
        '#ef4444'

    }))

  });

  calendar.render();

}
```
