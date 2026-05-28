# styles.css

```css
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
  font-family:Arial, Helvetica, sans-serif;
}

body{
  background:
  linear-gradient(
    135deg,
    #3b220f,
    #120b08
  );

  min-height:100vh;
  color:white;
}

/* LOGIN */

.login-container{
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
}

.login-card{
  width:420px;
  background:#f5f5f5;
  color:#222;
  padding:40px;
  border-radius:25px;
  border:3px solid #d4a017;
}

.logo{
  width:220px;
  display:block;
  margin:auto;
  margin-bottom:30px;
}

.login-card h2{
  margin-bottom:20px;
  color:#6a4a1d;
}

.login-card select,
.login-card button{
  width:100%;
  padding:14px;
  border-radius:12px;
  border:none;
  margin-top:15px;
  font-size:16px;
}

.login-card button{
  background:#d4a017;
  color:#111;
  font-weight:bold;
  cursor:pointer;
}

/* NAVBAR */

nav{
  height:80px;
  background:#111;
  border-bottom:1px solid #2d2d2d;

  display:flex;
  justify-content:space-between;
  align-items:center;

  padding:0 30px;
}

.nav-left{
  display:flex;
  align-items:center;
  gap:15px;
}

.nav-logo{
  width:120px;
}

.nav-center{
  display:flex;
  gap:15px;
}

.nav-center button{
  background:transparent;
  border:none;
  color:white;
  font-size:16px;
  cursor:pointer;
  padding:10px 18px;
  border-radius:12px;
  transition:0.3s;
}

.nav-center button:hover{
  background:#d4a017;
  color:#111;
}

.nav-right{
  display:flex;
  align-items:center;
  gap:20px;
}

.logout{
  background:#ef4444;
  border:none;
  color:white;
  padding:10px 18px;
  border-radius:10px;
  cursor:pointer;
}

/* MAIN */

main{
  padding:30px;
}

.hidden{
  display:none;
}

.card,
.calendar-card{
  background:#1a1a1a;
  border:1px solid #2d2d2d;
  border-radius:20px;
  padding:25px;
}

.card{
  max-width:600px;
  margin:auto;
}

.card h2{
  margin-bottom:20px;
}

.card input,
.card textarea,
.card select{
  width:100%;
  padding:14px;
  margin-bottom:15px;
  border:none;
  border-radius:12px;
  background:#2b2b2b;
  color:white;
}

.card button{
  width:100%;
  padding:14px;
  border:none;
  border-radius:12px;
  background:#d4a017;
  color:#111;
  font-weight:bold;
  cursor:pointer;
}

/* ESTADOS */

.estado-container{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
  gap:20px;
}

.estado-card{
  background:#1a1a1a;
  border-radius:20px;
  padding:20px;
  border:1px solid #2d2d2d;
}

.estado-card h3{
  margin-bottom:20px;
}

.tarea{
  background:#2b2b2b;
  padding:15px;
  border-radius:12px;
  margin-bottom:12px;
}

.tarea h4{
  margin-bottom:8px;
}

.tarea button{
  margin-top:10px;
  padding:8px 12px;
  border:none;
  border-radius:8px;
  cursor:pointer;
}

.editar{
  background:#3b82f6;
  color:white;
}

.eliminar{
  background:#ef4444;
  color:white;
}

/* CALENDARIO */

.calendar-card{
  height:calc(100vh - 140px);
}

/* FULLCALENDAR */

.fc{
  height:100%;
}

.fc-theme-standard td,
.fc-theme-standard th{
  border-color:#333;
}

.fc-theme-standard{
  color:white;
}

.fc-toolbar-title{
  color:white;
}

/* RESPONSIVE */

@media(max-width:768px){

  nav{
    flex-direction:column;
    height:auto;
    padding:20px;
    gap:20px;
  }

  .nav-center{
    flex-wrap:wrap;
    justify-content:center;
  }

}
```
