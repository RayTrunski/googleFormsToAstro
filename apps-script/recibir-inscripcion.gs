// Los IDs corresponden a preguntas de Apps Script, no a parámetros entry.*.
const CAMPOS_INSCRIPCION = [
  ["apellidoPaterno", 93731934, "TEXT", true],
  ["apellidoMaterno", 1095444030, "TEXT", true],
  ["nombres", 1546505808, "TEXT", true],
  ["calleNumero", 723568625, "TEXT", true],
  ["colonia", 729666314, "TEXT", true],
  ["codigoPostal", 2083931233, "TEXT", true],
  ["municipio", 850160784, "TEXT", true],
  ["estado", 60807460, "TEXT", true],
  ["pais", 264053788, "TEXT", true],
  ["telefono", 125653479, "TEXT", true],
  ["celular", 345860602, "TEXT", true],
  ["correo", 1996820764, "TEXT", true],
  ["fechaNacimiento", 590824040, "DATE", true],
  ["edad", 541670431, "TEXT", true],
  ["sexo", 1062879543, "MULTIPLE_CHOICE", true],
  ["estadoCivil", 932193341, "MULTIPLE_CHOICE", true],
  ["curp", 858434393, "TEXT", false],
  ["rfc", 1448312076, "TEXT", true],
  ["tipoSangre", 1644404935, "MULTIPLE_CHOICE", true],
  ["plantel", 1554038161, "MULTIPLE_CHOICE", true],
  ["turno", 1130731536, "MULTIPLE_CHOICE", true],
  ["escuelaProcedencia", 38768426, "TEXT", false],
  ["nombrePadreTutor", 455805741, "TEXT", true],
  ["ocupacionPadre", 632088036, "TEXT", true],
  ["domicilioPadre", 1985149918, "TEXT", true],
  ["telefonoPadre", 1527399361, "TEXT", true],
  ["celularPadre", 78208332, "TEXT", false],
  ["mediosSeleccionados", 229652429, "CHECKBOX", false],
  ["razonesSeleccionadas", 1505396307, "CHECKBOX", false],
];

function respuestaJson_(contenido) {
  return ContentService.createTextOutput(JSON.stringify(contenido)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function objeto_(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function fechaInscripcion_(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia, 12);
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia ||
    fecha > new Date()
  )
    return null;
  return fecha;
}

function validarDatosInscripcion_(datos) {
  const valores = {};
  const errores = {};
  CAMPOS_INSCRIPCION.forEach(([campo, , tipo, obligatorio]) => {
    const original = datos[campo];
    if (tipo === "CHECKBOX") {
      const lista = original === undefined ? [] : original;
      const limite = campo === "razonesSeleccionadas" ? 5 : 8;
      if (
        !Array.isArray(lista) ||
        lista.length > limite ||
        lista.some((v) => typeof v !== "string" || !v.trim() || v.length > 500)
      ) {
        errores[campo] = "INVALID_SELECTIONS";
        return;
      }
      valores[campo] = lista.map((v) => v.trim());
      if (new Set(valores[campo]).size !== valores[campo].length) {
        errores[campo] = "DUPLICATE_SELECTION";
      }
      return;
    }
    if (original !== undefined && typeof original !== "string") {
      errores[campo] = "EXPECTED_STRING";
      return;
    }
    const valor = (original || "").trim();
    valores[campo] = valor;
    if (obligatorio && !valor) errores[campo] = "REQUIRED";
    else if (valor.length > 500) errores[campo] = "TOO_LONG";
    else if (tipo === "DATE" && valor) {
      const fecha = fechaInscripcion_(valor);
      if (!fecha) errores[campo] = "INVALID_DATE";
      else valores[campo] = fecha;
    }
  });
  if (valores.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.correo)) {
    errores.correo = "INVALID_EMAIL";
  }
  if (
    valores.edad &&
    (!/^\d{1,3}$/.test(valores.edad) || Number(valores.edad) > 120)
  ) {
    errores.edad = "INVALID_AGE";
  }
  return { valores, errores };
}

function doPost(e) {
  const inicio = Date.now();
  try {
    const propiedades = PropertiesService.getScriptProperties();
    const formId = propiedades.getProperty("FORM_ID");
    const secreto = propiedades.getProperty("SHARED_SECRET");
    if (!formId || !secreto || secreto.length < 32) {
      return respuestaJson_({ success: false, error: "SERVER_NOT_CONFIGURED" });
    }
    const contenido = e && e.postData && e.postData.contents;
    if (typeof contenido !== "string" || contenido.length > 32768) {
      return respuestaJson_({ success: false, error: "INVALID_REQUEST" });
    }
    let body;
    try {
      body = JSON.parse(contenido);
    } catch (_) {
      return respuestaJson_({ success: false, error: "INVALID_JSON" });
    }
    if (
      !objeto_(body) ||
      typeof body.secret !== "string" ||
      body.secret !== secreto
    ) {
      return respuestaJson_({ success: false, error: "UNAUTHORIZED" });
    }
    if (!objeto_(body.data)) {
      return respuestaJson_({ success: false, error: "INVALID_DATA" });
    }
    const { valores, errores } = validarDatosInscripcion_(body.data);
    if (Object.keys(errores).length) {
      return respuestaJson_({
        success: false,
        error: "INVALID_DATA",
        fields: errores,
      });
    }

    // En una aplicación web se abre por ID: no depender de getActiveForm().
    const form = FormApp.openById(formId);
    if (!form.isAcceptingResponses()) {
      return respuestaJson_({ success: false, error: "FORM_CLOSED" });
    }
    const respuestas = [];
    for (const [campo, id, tipo, obligatorio] of CAMPOS_INSCRIPCION) {
      const item = form.getItemById(id);
      if (!item || String(item.getType()) !== tipo) {
        return respuestaJson_({ success: false, error: "FORM_SCHEMA_CHANGED" });
      }
      const pregunta =
        tipo === "TEXT"
          ? item.asTextItem()
          : tipo === "DATE"
            ? item.asDateItem()
            : tipo === "CHECKBOX"
              ? item.asCheckboxItem()
              : item.asMultipleChoiceItem();
      const valor = valores[campo];
      if (valor === "" || (Array.isArray(valor) && valor.length === 0)) {
        if (obligatorio || pregunta.isRequired()) errores[campo] = "REQUIRED";
        continue;
      }
      if (tipo === "CHECKBOX" || tipo === "MULTIPLE_CHOICE") {
        const opciones = pregunta
          .getChoices()
          .map((opcion) => opcion.getValue());
        const seleccionadas = Array.isArray(valor) ? valor : [valor];
        const otras = seleccionadas.filter(
          (opcion) => !opciones.includes(opcion),
        );
        if (otras.length && (!pregunta.hasOtherOption() || otras.length > 1)) {
          errores[campo] = "INVALID_OPTION";
          continue;
        }
      }
      respuestas.push(pregunta.createResponse(valor));
    }
    if (Object.keys(errores).length) {
      return respuestaJson_({
        success: false,
        error: "INVALID_DATA",
        fields: errores,
      });
    }
    const respuesta = form.createResponse();
    respuestas.forEach((itemResponse) =>
      respuesta.withItemResponse(itemResponse),
    );
    const enviada = respuesta.submit();
    console.log(
      JSON.stringify({
        form: "inscripcion",
        status: "success",
        duration: Date.now() - inicio,
      }),
    );
    return respuestaJson_({ success: true, responseId: enviada.getId() });
  } catch (_) {
    // No registrar el payload, el secreto ni excepciones con datos personales.
    console.error(
      JSON.stringify({
        form: "inscripcion",
        status: "error",
        duration: Date.now() - inicio,
      }),
    );
    return respuestaJson_({ success: false, error: "FORM_SUBMISSION_FAILED" });
  }
}
