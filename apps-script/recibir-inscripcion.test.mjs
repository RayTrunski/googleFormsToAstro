import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./recibir-inscripcion.gs', import.meta.url), 'utf8');
function fixture() {
  let submissions = 0;
  const context = {
    console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => key === 'FORM_ID' ? 'form-test' : 's'.repeat(32) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }) },
  };
  runInNewContext(source + '\nthis.schema = CAMPOS_INSCRIPCION;', context);
  const data = {};
  const types = new Map();
  for (const [field, id, type, required] of context.schema) {
    types.set(id, type);
    if (required) data[field] = type === 'MULTIPLE_CHOICE' ? 'Opcion' : 'Prueba';
  }
  Object.assign(data, { correo: 'test@example.com', fechaNacimiento: '2000-01-15', edad: '26' });
  context.FormApp = { openById: () => ({
    isAcceptingResponses: () => true,
    getItemById: (id) => {
      const question = { isRequired: () => false, getChoices: () => [{ getValue: () => 'Opcion' }], hasOtherOption: () => id === 1505396307, createResponse: (value) => ({ id, value }) };
      return { getType: () => types.get(id), asTextItem: () => question, asDateItem: () => question, asMultipleChoiceItem: () => question, asCheckboxItem: () => question };
    },
    createResponse: () => ({ withItemResponse() {}, submit() { submissions++; return { getId: () => 'response-test' }; } }),
  }) };
  return {
    data,
    send: (secret = 's'.repeat(32)) => context.doPost({ postData: { contents: JSON.stringify({ secret, data }) } }),
    raw: (contents) => context.doPost({ postData: { contents } }),
    count: () => submissions,
  };
}

test('valid data with zero reasons submits once', () => {
  const f = fixture();
  assert.equal(f.send().success, true);
  assert.equal(f.count(), 1);
});
test('one reason and one Other are accepted', () => {
  const f = fixture();
  f.data.razonesSeleccionadas = ['Opcion', 'Motivo personalizado'];
  assert.equal(f.send().success, true);
});
test('six reasons, duplicates, invalid choices, required and date errors do not submit', () => {
  for (const patch of [
    { razonesSeleccionadas: ['1', '2', '3', '4', '5', '6'] },
    { razonesSeleccionadas: ['Opcion', 'Opcion'] },
    { sexo: 'Unknown' }, { nombres: '' }, { correo: 'invalid' },
    { fechaNacimiento: '2000-02-30' }, { fechaNacimiento: '2999-01-01' },
    { mediosSeleccionados: 'Opcion' },
  ]) {
    const f = fixture(); Object.assign(f.data, patch);
    assert.equal(f.send().error, 'INVALID_DATA');
    assert.equal(f.count(), 0);
  }
});
test('unauthorized and malformed requests never submit', () => {
  const f = fixture();
  assert.equal(f.send('bad').error, 'UNAUTHORIZED');
  assert.equal(f.raw('{').error, 'INVALID_JSON');
  assert.equal(f.count(), 0);
});
