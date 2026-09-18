# POC Server-side: Astro + Google Forms

## Objetivo

Crear un formulario personalizado en Astro que envíe información a Google Forms mediante un endpoint interno Server-side.

Google Forms continuará funcionando como receptor de información y mantendrá su integración actual con Google Sheets.

## Arquitectura

```text
Usuario
   ↓
Formulario Astro
   ↓
POST /api/forms/demo
   ↓
Backend Astro / Node
   ├── Validación
   ├── Normalización
   ├── Mapeo de campos
   └── Manejo de errores
   ↓
Google Forms /formResponse
   ↓
Google Sheets
```

## Stack

- Astro
- TypeScript
- Node.js
- HTML Forms / Fetch
- Google Forms
- Google Sheets
- HTTPS

Opcional para despliegue:

- Nginx o Caddy
- PM2 o systemd
- SSH para administración

## Estructura propuesta

```text
src/
├── components/
│   └── forms/
│       └── DemoForm.astro
│
├── pages/
│   ├── demo.astro
│   └── api/
│       └── forms/
│           └── demo.ts
│
└── server/
    └── forms/
        ├── googleForm.ts
        ├── mappings.ts
        └── validation.ts
```

## Endpoint interno

```http
POST /api/forms/demo
Content-Type: application/json
```

Payload:

```json
{
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "plantel": "Milenio",
  "comentarios": "Texto opcional"
}
```

El frontend no utiliza directamente identificadores de Google Forms.

## Mapeo interno

```ts
export const fields = {
  nombre: "entry.123456789",
  correo: "entry.987654321",
  plantel: "entry.567891234",
  comentarios: "entry.192837465"
};
```

El backend transforma los campos de la aplicación a los identificadores de Google Forms.

## Endpoint Google Forms

```text
https://docs.google.com/forms/d/e/{FORM_ID}/formResponse
```

La solicitud hacia Google se realiza únicamente desde el servidor.

## Flujo del endpoint

```text
1. Recibir JSON.
2. Validar campos.
3. Normalizar valores.
4. Mapear campos a entry.xxxxx.
5. Crear payload para Google Forms.
6. Realizar POST a Google Forms.
7. Registrar resultado técnico.
8. Responder al frontend.
```

## Validación mínima

```text
nombre
- requerido
- string
- longitud máxima

correo
- requerido
- formato email

plantel
- requerido
- debe existir en catálogo

comentarios
- opcional
- longitud máxima
```

## Respuestas del endpoint

### Éxito

```http
200 OK
```

```json
{
  "success": true
}
```

### Datos inválidos

```http
400 Bad Request
```

```json
{
  "success": false,
  "error": "INVALID_DATA"
}
```

### Error de integración

```http
500 Internal Server Error
```

```json
{
  "success": false,
  "error": "FORM_SUBMISSION_FAILED"
}
```

## Logging

Registrar únicamente información técnica.

```text
form=demo
status=success
duration=320ms
```

Evitar almacenar datos personales completos en logs.

## Seguridad

```text
Browser
   ↓ HTTPS
Servidor
   ↓ HTTPS
Google Forms
```

Los identificadores `entry.xxxxx` permanecerán fuera del frontend, aunque no deben considerarse secretos.

La validación principal se realizará en el servidor.

## Pruebas del POC

### Caso válido

```text
Astro
→ API
→ Google Forms
→ Google Sheets
```

Debe registrar correctamente la respuesta.

### Campo obligatorio vacío

```text
→ 400
→ No enviar a Google
```

### Correo inválido

```text
→ 400
→ No enviar a Google
```

### Error con Google Forms

```text
→ Error controlado
→ Mostrar mensaje al usuario
```

## Criterios de aceptación

- El formulario mantiene la UI institucional.
- El usuario no es redirigido a Google Forms.
- El frontend envía datos únicamente al endpoint interno.
- El backend valida la información.
- El backend realiza correctamente el mapeo `entry.xxxxx`.
- Google Forms recibe la respuesta.
- Google Sheets continúa registrando la información.
- La interfaz puede mostrar éxito o error.

## Resultado esperado

```text
UI Astro
   ↓
API propia
   ↓
Google Forms
```

En el futuro:

```text
UI Astro
   ↓
misma API
   ↓
API institucional / Base de datos
```

Esto permite reemplazar Google Forms sin modificar la interfaz.
