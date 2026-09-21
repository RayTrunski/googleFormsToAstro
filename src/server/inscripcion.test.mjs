import { test } from "node:test";
import assert from "node:assert/strict";
import { validarInscripcion } from "./inscripcion.js";

const valid = () => Object.fromEntries([
  ..."apellidoPaterno apellidoMaterno nombres calleNumero colonia codigoPostal municipio estado pais telefono celular rfc nombrePadreTutor ocupacionPadre domicilioPadre telefonoPadre".split(" ").map(k => [k, "Prueba"]),
  ["correo", "prueba@example.com"], ["fechaNacimiento", "2000-02-29"],
  ["edad", "26"], ["sexo", "FEMENINO"], ["estadoCivil", "UNION_LIBRE"],
  ["plantel", "CENTRO MÉDICO"], ["turno", "EN_LINEA"], ["tipoSangre", "O+"],
]);

test("mapea opciones, conserva fecha y descarta campos ajenos", () => {
  const { data, errors } = validarInscripcion({ ...valid(), carrera: "omitida", secret: "no reenviar" });
  assert.deepEqual(errors, {});
  assert.equal(data.sexo, "Feminino");
  assert.equal(data.estadoCivil, "Union Libre");
  assert.equal(data.plantel, "CENTRO MEDICO");
  assert.equal(data.turno, "EN LINEA");
  assert.equal(data.fechaNacimiento, "2000-02-29");
  assert.equal(data.carrera, undefined);
  assert.equal(data.secret, undefined);
});
test("admite 0 a 5 razones y rechaza seis", () => {
  for (const n of [0, 1, 4, 5]) {
    assert.deepEqual(validarInscripcion({ ...valid(), razonesSeleccionadas: Array.from({length:n}, (_,i) => `Razon ${i}`) }).errors, {});
  }
  assert.equal(validarInscripcion({ ...valid(), razonesSeleccionadas: ["1","2","3","4","5","6"] }).errors.razonesSeleccionadas, "INVALID_SELECTIONS");
});
test("rechaza JSON escalar, requeridos vacíos y fecha imposible", () => {
  assert.ok(validarInscripcion(null).errors.formulario);
  assert.equal(validarInscripcion({ ...valid(), nombres: " " }).errors.nombres, "REQUIRED");
  assert.equal(validarInscripcion({ ...valid(), fechaNacimiento: "2001-02-29" }).errors.fechaNacimiento, "INVALID_DATE");
});
