# Receptor de inscripción

Astro envía a `POST /api/forms/inscripcion`, que valida y llama a Apps Script desde el servidor. La interfaz ya no envía a la intranet.

## Ejecutar Astro

Configura `GOOGLE_FORMS_SCRIPT_URL` y `GOOGLE_FORMS_SHARED_SECRET` en `.env`. Reinicia el servidor después de cambiar estas variables. La clave debe coincidir con `SHARED_SECRET` de Apps Script.

Desarrollo: `npm run dev -- --background`. Compilación: `npm run build`. Producción local: `node --env-file=.env dist/server/entry.mjs`. El despliegue necesita Node; no basta con subir archivos estáticos. En hosting configura ambas variables en el entorno del servidor.

Se omiten carrera, asesor, firma y otros campos sin pregunta de destino. Las razones viajan en `razonesSeleccionadas` como lista, de cero a cinco valores. Las equivalencias de sexo, estado civil, plantel y turno se aplican en el servidor. El valor femenino se mapea a `Feminino` según el catálogo proporcionado; si corriges esa opción en Google, actualiza también `src/server/inscripcion.js`.

La verificación real de una respuesta y su fila en Sheets sigue pendiente; las pruebas locales usan servicios simulados.

## Configurar

1. En el proyecto Apps Script del formulario, crea `recibir-inscripcion.gs` y copia el archivo de esta carpeta. Conserva tus funciones de consulta. Debe existir un solo `doPost` en el proyecto.
2. En Configuración del proyecto de Apps Script → Propiedades de la secuencia de comandos agrega:
   - `FORM_ID`: ID de la URL del **editor** que se encuentra en la barra superior del navegador, entre `/forms/d/` y `/edit`. No uses el ID público `1FAIp...` de `/d/e/.../viewform`.
   - `SHARED_SECRET`: una clave aleatoria de al menos 32 caracteres. Para generar una, ejecuta localmente `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Guarda la misma clave posteriormente en el servidor Astro; La clave es secreta y no se sube.
3. Desde Apps Script → Implementar → Nueva implementación → Aplicación web. Ejecutar como: tu cuenta con acceso al formulario. Acceso: Cualquier persona
4. Ejecuta el proyecto y conserva la URL terminada en `/exec`. No ejecutes `doPost` con el botón Ejecutar: necesita el evento de una petición HTTP.
5. Al cambiar el código, actualiza la implementación a una versión nueva.

## Contrato para el futuro endpoint Astro

Enviar JSON por POST con esta estructura:

```json
{
  "secret": "CLAVE_SOLO_DEL_SERVIDOR",
  "data": {
    "apellidoPaterno": "Prueba",
    "apellidoMaterno": "Prueba",
    "nombres": "Registro de prueba",
    "calleNumero": "Calle de prueba 123",
    "colonia": "Centro",
    "codigoPostal": "44100",
    "municipio": "Guadalajara",
    "estado": "Jalisco",
    "pais": "México",
    "telefono": "3300000000",
    "celular": "3300000000",
    "correo": "prueba@example.com",
    "fechaNacimiento": "2000-01-15",
    "edad": "26",
    "sexo": "Masculino",
    "estadoCivil": "Soltero",
    "rfc": "DATO-DE-PRUEBA",
    "tipoSangre": "O+",
    "plantel": "CENTRO",
    "turno": "MATUTINO",
    "nombrePadreTutor": "Tutor de prueba",
    "ocupacionPadre": "Empleado",
    "domicilioPadre": "Domicilio de prueba",
    "telefonoPadre": "3300000000",
    "mediosSeleccionados": [],
    "razonesSeleccionadas": []
  }
}
```

Los datos del ejemplo son ficticios; una petición válida a `/exec` sí crea una respuesta real.

- Los campos de texto deben ser strings, incluidos teléfonos, código postal y edad.
- Opcionales: `curp`, `escuelaProcedencia`, `celularPadre`, `mediosSeleccionados`, `razonesSeleccionadas`.
- Fecha: `YYYY-MM-DD`, válida y no futura.
- Razones: entre 0 y 5 valores sin duplicados. El texto de “Otro” se envía como un valor adicional y cuenta para el límite. Solo se admite uno fuera del catálogo cuando Forms permite Otro.
- Las opciones deben coincidir exactamente con Forms. La adaptación de nombres de planteles y del valor “Feminino” se resolverá al conectar Astro; este script no adivina equivalencias.
- Carrera, asesor y otros campos sin mapeo no se guardan. La firma y el PDF permanecen fuera de este receptor.
- El límite de texto es de 500 caracteres por campo. No se valida la autenticidad de RFC, CURP ni teléfonos.

## Respuesta y errores

Éxito: `{ "success": true, "responseId": "..." }` tras `submit()`.

Error: `{ "success": false, "error": "INVALID_DATA", "fields": { "correo": "INVALID_EMAIL" } }`.

También puede devolver `INVALID_JSON`, `INVALID_REQUEST`, `UNAUTHORIZED`, `SERVER_NOT_CONFIGURED`, `FORM_CLOSED`, `FORM_SCHEMA_CHANGED` o `FORM_SUBMISSION_FAILED`.

ContentService no permite fijar códigos HTTP personalizados: Astro deberá interpretar `success` y `error` del JSON y producir sus propios códigos HTTP. No basta con comprobar `response.ok`. El cliente del servidor debe seguir las redirecciones de Apps Script.

No hay reintentos automáticos ni garantía de deduplicación: ante un timeout, comprobar si se registró antes de repetir. Verificar la fila en Sheets forma parte de la prueba de integración pendiente. No se escribe directamente en Sheets.

## Verificación local

`node --test apps-script/recibir-inscripcion.test.mjs`

Prueba el receptor con servicios simulados; no valida permisos, despliegue, restricciones adicionales de las preguntas ni el vínculo real con Sheets.

Referencias: [Aplicaciones web](https://developers.google.com/apps-script/guides/web), [FormResponse](https://developers.google.com/apps-script/reference/forms/form-response).
