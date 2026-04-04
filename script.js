const filasIniciales = [
  { proyecto: 'Ecommerce', persona: 'Alejandro', tiempo: '00:43', dias: 7 },
  { proyecto: 'Ecommerce', persona: 'Marcos', tiempo: '00:50', dias: 6 },
  { proyecto: 'Purificadora', persona: 'Alejandro', tiempo: '02:00', dias: 7 },
  { proyecto: 'Purificadora', persona: 'Jorkaet', tiempo: '03:00', dias: 7 },
  { proyecto: 'CECYTH', persona: 'Alejandro', tiempo: '00:26', dias: 7 },
  { proyecto: 'CECYTH', persona: 'Jorkaet', tiempo: '04:00', dias: 7 },
  { proyecto: 'CECYTH', persona: 'Marcos', tiempo: '00:20', dias: 6 },
  { proyecto: 'CECYTH', persona: 'Julio', tiempo: '00:20', dias: 6 },
  { proyecto: 'CECYTH Figma', persona: 'Alejandro', tiempo: '00:17', dias: 7 },
  { proyecto: 'CECYTH Figma', persona: 'Marcos', tiempo: '00:40', dias: 6 },
  { proyecto: 'CECYTH Figma', persona: 'Julio', tiempo: '00:40', dias: 6 }
];

const STORAGE_KEY = 'gestor-horas-sprint:v1';

const tablaBody = document.getElementById('tablaBody');
const proyectosResumen = document.getElementById('proyectosResumen');
const personasResumen = document.getElementById('personasResumen');
const capacidadInput = document.getElementById('capacidad');
const diasBaseInput = document.getElementById('diasBase');
const usadoEl = document.getElementById('usado');
const usadoDetalleEl = document.getElementById('usadoDetalle');
const disponibleEl = document.getElementById('disponible');
const estadoEl = document.getElementById('estado');
const agregarFilaBtn = document.getElementById('agregarFilaBtn');
const exportarMarkdownBtn = document.getElementById('exportarMarkdownBtn');
const exportarPdfBtn = document.getElementById('exportarPdfBtn');
const capacidadPrintEl = document.getElementById('capacidadPrint');
const diasBasePrintEl = document.getElementById('diasBasePrint');

function pad(n) {
  return String(n).padStart(2, '0');
}

function toPositiveInteger(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeTimeValue(value) {
  if (!value || typeof value !== 'string' || !value.includes(':')) return '00:00';
  const parts = value.split(':').map(Number);
  const hh = Number.isFinite(parts[0]) && parts[0] > 0 ? parts[0] : 0;
  const mm = Number.isFinite(parts[1]) && parts[1] > 0 ? parts[1] : 0;
  return minutesToTimeValue((hh * 60) + mm);
}

function minutesToTimeValue(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return pad(hours) + ':' + pad(minutes);
}

function timeToMinutes(value) {
  const normalized = normalizeTimeValue(value).split(':');
  return toPositiveInteger(normalized[0]) * 60 + toPositiveInteger(normalized[1]);
}

function formatMinutes(totalMinutes) {
  const rounded = Math.round(totalMinutes || 0);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return sign + h + ' h ' + pad(m) + ' min';
}

function formatTimeValue(value) {
  return formatMinutes(timeToMinutes(value));
}

function averagePerDay(totalMinutes, days) {
  if (!days) return '0 h 00 min';
  return formatMinutes(totalMinutes / days);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setDurationValue(tr, value) {
  const normalized = normalizeTimeValue(value);
  const hiddenInput = tr.querySelector('.tiempo-input');
  const displayBtn = tr.querySelector('.duration-display');
  const hoursInput = tr.querySelector('.duration-hours-input');
  const minutesInput = tr.querySelector('.duration-minutes-input');
  const exportado = tr.querySelector('.tiempo-exportado');
  const totalMinutes = timeToMinutes(normalized);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const formatted = formatMinutes(totalMinutes);

  hiddenInput.value = normalized;
  displayBtn.textContent = formatted;
  displayBtn.setAttribute('aria-label', 'Editar carga diaria. Valor actual ' + formatted);
  hoursInput.value = String(hours);
  minutesInput.value = pad(minutes);
  exportado.textContent = formatted;
}

function closeDurationEditor(control) {
  control.classList.remove('is-editing');
}

function closeOpenDurationEditors(exceptControl) {
  Array.from(document.querySelectorAll('.duration-control.is-editing')).forEach(function(control) {
    if (control !== exceptControl) {
      applyDurationEditor(control);
    }
  });
}

function openDurationEditor(control) {
  closeOpenDurationEditors(control);
  const tr = control.closest('tr');
  const currentValue = tr.querySelector('.tiempo-input').value || '00:00';
  const totalMinutes = timeToMinutes(currentValue);
  control.dataset.previousValue = currentValue;
  control.classList.add('is-editing');
  control.querySelector('.duration-hours-input').value = String(Math.floor(totalMinutes / 60));
  control.querySelector('.duration-minutes-input').value = pad(totalMinutes % 60);
  control.querySelector('.duration-hours-input').focus();
  control.querySelector('.duration-hours-input').select();
}

function cancelDurationEditor(control) {
  const tr = control.closest('tr');
  setDurationValue(tr, control.dataset.previousValue || tr.querySelector('.tiempo-input').value || '00:00');
  closeDurationEditor(control);
}

function applyDurationEditor(control) {
  if (!control.classList.contains('is-editing')) return;
  const tr = control.closest('tr');
  const hours = Math.max(0, toPositiveInteger(control.querySelector('.duration-hours-input').value));
  const minutes = Math.max(0, toPositiveInteger(control.querySelector('.duration-minutes-input').value));
  setDurationValue(tr, minutesToTimeValue((hours * 60) + minutes));
  closeDurationEditor(control);
  calcular();
}

function bindDurationControl(tr) {
  const control = tr.querySelector('.duration-control');
  const displayBtn = tr.querySelector('.duration-display');
  const editorInputs = control.querySelectorAll('.duration-hours-input, .duration-minutes-input');

  displayBtn.addEventListener('click', function() {
    openDurationEditor(control);
  });

  editorInputs.forEach(function(input) {
    input.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyDurationEditor(control);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        cancelDurationEditor(control);
        displayBtn.focus();
      }
    });
  });
}

function sanitizeFila(row) {
  return {
    proyecto: typeof row.proyecto === 'string' ? row.proyecto : '',
    persona: typeof row.persona === 'string' ? row.persona : '',
    tiempo: normalizeTimeValue(row.tiempo || '00:00'),
    dias: Math.max(0, parseInt(row.dias, 10) || 0)
  };
}

function getDefaultState() {
  return {
    capacidad: parseInt(capacidadInput.value, 10) || 0,
    diasBase: parseInt(diasBaseInput.value, 10) || 7,
    filas: filasIniciales.map(sanitizeFila)
  };
}

function readStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return {
      capacidad: Math.max(0, parseInt(parsed.capacidad, 10) || 0),
      diasBase: Math.max(1, parseInt(parsed.diasBase, 10) || 7),
      filas: Array.isArray(parsed.filas) ? parsed.filas.map(sanitizeFila) : getDefaultState().filas
    };
  } catch (error) {
    console.warn('No se pudo restaurar el estado guardado.', error);
    return getDefaultState();
  }
}

function saveState(filas) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      capacidad: Math.max(0, parseInt(capacidadInput.value, 10) || 0),
      diasBase: Math.max(1, parseInt(diasBaseInput.value, 10) || 7),
      filas: filas.map(function(fila) {
        return {
          proyecto: fila.proyecto,
          persona: fila.persona,
          tiempo: normalizeTimeValue(fila.tiempo),
          dias: fila.dias
        };
      })
    }));
  } catch (error) {
    console.warn('No se pudo guardar el estado.', error);
  }
}

function crearFila(data) {
  const row = sanitizeFila(data || { proyecto: '', persona: '', tiempo: '01:00', dias: 7 });
  const tr = document.createElement('tr');
  tr.innerHTML = '' +
    '<td><input type="text" class="proyecto-input" value="' + escapeHtml(row.proyecto) + '" placeholder="Proyecto" /><span class="print-only table-print-value proyecto-exportado"></span></td>' +
    '<td><input type="text" class="persona-input" value="' + escapeHtml(row.persona) + '" placeholder="Persona" /><span class="print-only table-print-value persona-exportado"></span></td>' +
    '<td><div class="duration-control"><input type="hidden" class="tiempo-input" value="' + escapeHtml(row.tiempo) + '" /><button type="button" class="duration-display hours-cell"></button><div class="duration-editor"><label class="duration-part"><input type="number" class="duration-hours-input" min="0" step="1" inputmode="numeric" /><span>h</span></label><label class="duration-part"><input type="number" class="duration-minutes-input" min="0" step="1" inputmode="numeric" /><span>min</span></label></div><span class="tiempo-exportado hours-cell"></span></div></td>' +
    '<td><input type="number" class="dias-input" min="0" step="1" value="' + escapeHtml(String(row.dias)) + '" /><span class="print-only table-print-value dias-exportado"></span></td>' +
    '<td class="hours-cell total-semanal">0 h 00 min</td>' +
    '<td><div class="actions"><button class="remove-btn" type="button">Eliminar</button></div></td>';

  tr.querySelectorAll('.proyecto-input, .persona-input, .dias-input').forEach(function(input) {
    input.addEventListener('input', calcular);
    input.addEventListener('change', calcular);
  });

  bindDurationControl(tr);
  setDurationValue(tr, row.tiempo);

  tr.querySelector('.remove-btn').addEventListener('click', function() {
    tr.remove();
    calcular();
  });

  tablaBody.appendChild(tr);
}

function leerFilas() {
  return Array.from(tablaBody.querySelectorAll('tr')).map(function(tr) {
    const proyecto = (tr.querySelector('.proyecto-input').value || '').trim() || 'Sin proyecto';
    const persona = (tr.querySelector('.persona-input').value || '').trim() || 'Sin persona';
    const tiempo = normalizeTimeValue(tr.querySelector('.tiempo-input').value || '00:00');
    const dias = parseInt(tr.querySelector('.dias-input').value, 10) || 0;
    const minutosDia = timeToMinutes(tiempo);
    const totalSemanal = minutosDia * dias;
    setDurationValue(tr, tiempo);
    tr.querySelector('.total-semanal').textContent = formatMinutes(totalSemanal);
    tr.querySelector('.proyecto-exportado').textContent = proyecto;
    tr.querySelector('.persona-exportado').textContent = persona;
    tr.querySelector('.tiempo-exportado').textContent = formatTimeValue(tiempo);
    tr.querySelector('.dias-exportado').textContent = String(dias);
    return { proyecto, persona, tiempo, dias, minutosDia, totalSemanal };
  });
}

function renderResumenProyectos(filas) {
  proyectosResumen.innerHTML = '';
  const mapa = new Map();

  filas.forEach(function(f) {
    if (!mapa.has(f.proyecto)) {
      mapa.set(f.proyecto, { total: 0, personas: new Set() });
    }
    const item = mapa.get(f.proyecto);
    item.total += f.totalSemanal;
    item.personas.add(f.persona);
  });

  Array.from(mapa.entries())
    .sort(function(a, b) { return a[0].localeCompare(b[0]); })
    .forEach(function(entry) {
      const proyecto = entry[0];
      const data = entry[1];
      const tr = document.createElement('tr');
      tr.className = 'group-row';
      tr.innerHTML = '' +
        '<td><span class="project-pill">' + escapeHtml(proyecto) + '</span></td>' +
        '<td class="hours-cell">' + formatMinutes(data.total) + '</td>' +
        '<td class="muted">' + escapeHtml(Array.from(data.personas).join(', ')) + '</td>';
      proyectosResumen.appendChild(tr);
    });
}

function renderResumenPersonas(filas) {
  personasResumen.innerHTML = '';
  const mapa = new Map();

  filas.forEach(function(f) {
    if (!mapa.has(f.persona)) {
      mapa.set(f.persona, { total: 0, dias: 0 });
    }
    const item = mapa.get(f.persona);
    item.total += f.totalSemanal;
    item.dias = Math.max(item.dias, f.dias);
  });

  Array.from(mapa.entries())
    .sort(function(a, b) { return b[1].total - a[1].total; })
    .forEach(function(entry) {
      const persona = entry[0];
      const data = entry[1];
      const tr = document.createElement('tr');
      tr.innerHTML = '' +
        '<td>' + escapeHtml(persona) + '</td>' +
        '<td class="hours-cell">' + formatMinutes(data.total) + '</td>' +
        '<td class="hours-cell">' + averagePerDay(data.total, data.dias) + '</td>';
      personasResumen.appendChild(tr);
    });
}

function construirMarkdown(filas) {
  const capacidadHoras = parseInt(capacidadInput.value, 10) || 0;
  const totalMinutos = filas.reduce(function(acc, f) { return acc + f.totalSemanal; }, 0);
  const capacidadMinutos = capacidadHoras * 60;
  const restante = capacidadMinutos - totalMinutos;

  const proyectosMap = new Map();
  filas.forEach(function(f) {
    if (!proyectosMap.has(f.proyecto)) {
      proyectosMap.set(f.proyecto, { total: 0, personas: new Set() });
    }
    const item = proyectosMap.get(f.proyecto);
    item.total += f.totalSemanal;
    item.personas.add(f.persona);
  });

  const personasMap = new Map();
  filas.forEach(function(f) {
    if (!personasMap.has(f.persona)) {
      personasMap.set(f.persona, { total: 0, dias: 0 });
    }
    const item = personasMap.get(f.persona);
    item.total += f.totalSemanal;
    item.dias = Math.max(item.dias, f.dias);
  });

  const lines = [];
  lines.push('# Gestor de Horas Sprint');
  lines.push('');
  lines.push('## Resumen general');
  lines.push('');
  lines.push('- Capacidad semanal: ' + capacidadHoras + ' h');
  lines.push('- Horas usadas: ' + formatMinutes(totalMinutos));
  lines.push('- Horas disponibles: ' + formatMinutes(restante));
  lines.push('');
  lines.push('## Distribución por fila');
  lines.push('');
  lines.push('| Proyecto | Persona | Carga diaria | Días | Total semanal |');
  lines.push('|---|---|---:|---:|---:|');
  filas.forEach(function(f) {
    lines.push('| ' + f.proyecto + ' | ' + f.persona + ' | ' + formatTimeValue(f.tiempo) + ' | ' + f.dias + ' | ' + formatMinutes(f.totalSemanal) + ' |');
  });
  lines.push('');
  lines.push('## Carga por proyecto');
  lines.push('');
  lines.push('| Proyecto | Total semanal | Personas |');
  lines.push('|---|---:|---|');
  Array.from(proyectosMap.entries())
    .sort(function(a, b) { return a[0].localeCompare(b[0]); })
    .forEach(function(entry) {
      const proyecto = entry[0];
      const data = entry[1];
      lines.push('| ' + proyecto + ' | ' + formatMinutes(data.total) + ' | ' + Array.from(data.personas).join(', ') + ' |');
    });
  lines.push('');
  lines.push('## Carga por persona');
  lines.push('');
  lines.push('| Persona | Total semanal | Promedio diario |');
  lines.push('|---|---:|---:|');
  Array.from(personasMap.entries())
    .sort(function(a, b) { return b[1].total - a[1].total; })
    .forEach(function(entry) {
      const persona = entry[0];
      const data = entry[1];
      lines.push('| ' + persona + ' | ' + formatMinutes(data.total) + ' | ' + averagePerDay(data.total, data.dias) + ' |');
    });

  return lines.join('\n');
}

function descargarArchivo(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarMarkdown() {
  const filas = leerFilas();
  const markdown = construirMarkdown(filas);
  descargarArchivo('gestor-horas-sprint.md', markdown, 'text/markdown;charset=utf-8');
}

function sincronizarVistaImprimible() {
  leerFilas();
  capacidadPrintEl.textContent = (parseInt(capacidadInput.value, 10) || 0) + ' horas';
  diasBasePrintEl.textContent = (parseInt(diasBaseInput.value, 10) || 0) + ' dias';
}

function exportarPdf() {
  sincronizarVistaImprimible();
  requestAnimationFrame(function() {
    window.print();
  });
}

function calcular() {
  const filas = leerFilas();
  const totalMinutos = filas.reduce(function(acc, f) { return acc + f.totalSemanal; }, 0);
  const capacidadHoras = parseInt(capacidadInput.value, 10) || 0;
  const capacidadMinutos = capacidadHoras * 60;
  const restante = capacidadMinutos - totalMinutos;

  usadoEl.textContent = formatMinutes(totalMinutos);
  usadoDetalleEl.textContent = Math.round(totalMinutos) + ' min en total';
  disponibleEl.textContent = formatMinutes(restante);
  sincronizarVistaImprimible();

  if (totalMinutos > capacidadMinutos) {
    estadoEl.className = 'status warn';
    estadoEl.textContent = 'Capacidad excedida por ' + formatMinutes(totalMinutos - capacidadMinutos) + '.';
  } else {
    estadoEl.className = 'status ok';
    estadoEl.textContent = 'Dentro de capacidad. Quedan ' + formatMinutes(restante) + ' disponibles.';
  }

  renderResumenProyectos(filas);
  renderResumenPersonas(filas);
  saveState(filas);
}

function runTests() {
  console.assert(timeToMinutes('00:00') === 0, 'Test 1 falló');
  console.assert(timeToMinutes('01:30') === 90, 'Test 2 falló');
  console.assert(formatMinutes(90) === '1 h 30 min', 'Test 3 falló');
  console.assert(formatTimeValue('02:05') === '2 h 05 min', 'Test 4 falló');
  console.assert(averagePerDay(420, 7) === '1 h 00 min', 'Test 5 falló');
  console.assert(construirMarkdown([{ proyecto: 'Demo', persona: 'Ana', tiempo: '01:00', dias: 5, minutosDia: 60, totalSemanal: 300 }]).includes('Demo'), 'Test 6 falló');
  console.assert(construirMarkdown([{ proyecto: 'Demo', persona: 'Ana', tiempo: '01:00', dias: 5, minutosDia: 60, totalSemanal: 300 }]).includes('1 h 00 min'), 'Test 7 falló');
  console.assert(minutesToTimeValue(150) === '02:30', 'Test 8 falló');
  console.assert(normalizeTimeValue('01:90') === '02:30', 'Test 9 falló');
}

agregarFilaBtn.addEventListener('click', function() {
  crearFila({ proyecto: '', persona: '', tiempo: '01:00', dias: Number(diasBaseInput.value) || 7 });
  calcular();
});

exportarMarkdownBtn.addEventListener('click', exportarMarkdown);
exportarPdfBtn.addEventListener('click', exportarPdf);
capacidadInput.addEventListener('input', calcular);
diasBaseInput.addEventListener('input', calcular);
document.addEventListener('click', function(event) {
  const activeControl = event.target.closest('.duration-control');
  if (activeControl) return;
  closeOpenDurationEditors();
});

const initialState = readStoredState();
capacidadInput.value = String(initialState.capacidad);
diasBaseInput.value = String(initialState.diasBase);
initialState.filas.forEach(function(fila) { crearFila(fila); });
runTests();
calcular();

