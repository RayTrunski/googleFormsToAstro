// Validaci?n equivalente al receptor Apps Script; mantener ambos contratos sincronizados.
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

export function validarInscripcion(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { data: {}, errors: { formulario: "INVALID_DATA" } };
  const mapped = { ...input };
  const clean = (v) =>
    typeof v === "string"
      ? v
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/_/g, " ")
          .trim()
      : v;
  mapped.plantel = clean(input.plantel);
  mapped.turno = clean(input.turno);
  const sexo = { FEMENINO: "Feminino", MASCULINO: "Masculino" };
  const civil = {
    SOLTERO: "Soltero",
    CASADO: "Casado",
    VIUDO: "Viudo",
    DIVORCIADO: "Divorciado",
    UNION_LIBRE: "Union Libre",
  };
  mapped.sexo = sexo[input.sexo] || input.sexo;
  mapped.estadoCivil = civil[input.estadoCivil] || input.estadoCivil;
  const { valores, errores } = validarDatosInscripcion_(mapped);
  // La fecha viaja como calendario, sin conversi?n a UTC.
  if (valores.fechaNacimiento instanceof Date)
    valores.fechaNacimiento = mapped.fechaNacimiento.trim();
  return { data: valores, errors: errores };
}
