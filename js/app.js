/* =====================================================================
   CÁPSULA AMAE · NÚMEROS RACIONALES
   Lógica de navegación, códigos, progreso, actividad y bitácora.

   CÓDIGOS DOCENTES (cambiarlos aquí):
   Etapa 1: PREGUNTA
   Etapa 2: SENTIDOS
   Etapa 3: ESCALAS
   Etapa 4: ESTUDIO

   Importante: al ser una página estática, los códigos son un control
   pedagógico de ritmo y no un sistema de seguridad informática.
   ===================================================================== */

(() => {
  'use strict';

  const CLAVE_ESTADO = 'amae-racionales-estado-v1';
  const CODIGOS = Object.freeze({
    1: 'PREGUNTA',
    2: 'SENTIDOS',
    3: 'ESCALAS',
    4: 'ESTUDIO'
  });
  const ORDEN_OBLIGATORIO = true;
  const idsPantallas = ['inicio', 'proposito', 'mapa', 'nodo-1', 'nodo-2', 'nodo-3', 'nodo-4', 'actividad', 'bitacora', 'bibliografia'];

  const estadoInicial = () => ({
    desbloqueadas: { 1: false, 2: false, 3: false, 4: false },
    completas: { 1: false, 2: false, 3: false, 4: false },
    notas: { n1: '', n2: '', n3: '', n4: '', final: '' },
    significadosVisitados: [],
    laboratorioIARealizado: false,
    actividad: { caso: 0, aciertos: 0, respondidos: [] }
  });

  let estado = cargarEstado();
  let temporizadorAnuncio = null;

  function cargarEstado() {
    try {
      const guardado = localStorage.getItem(CLAVE_ESTADO);
      if (!guardado) return estadoInicial();
      const parcial = JSON.parse(guardado);
      const base = estadoInicial();
      return {
        ...base,
        ...parcial,
        desbloqueadas: { ...base.desbloqueadas, ...(parcial.desbloqueadas || {}) },
        completas: { ...base.completas, ...(parcial.completas || {}) },
        notas: { ...base.notas, ...(parcial.notas || {}) },
        actividad: { ...base.actividad, ...(parcial.actividad || {}) },
        significadosVisitados: Array.isArray(parcial.significadosVisitados) ? parcial.significadosVisitados : []
      };
    } catch (error) {
      console.warn('No se pudo leer el progreso guardado:', error);
      return estadoInicial();
    }
  }

  function guardarEstado() {
    try {
      localStorage.setItem(CLAVE_ESTADO, JSON.stringify(estado));
      return true;
    } catch (error) {
      console.warn('No se pudo guardar el progreso:', error);
      return false;
    }
  }

  function textoPlano(valor) {
    return String(valor ?? '').replace(/[<>]/g, '').trim();
  }

  function normalizarCodigo(valor) {
    return String(valor || '').trim().toLocaleUpperCase('es-AR');
  }

  function anunciar(mensaje) {
    const caja = document.getElementById('anuncio');
    if (!caja) return;
    caja.textContent = mensaje;
    caja.classList.add('visible');
    window.clearTimeout(temporizadorAnuncio);
    temporizadorAnuncio = window.setTimeout(() => caja.classList.remove('visible'), 2600);
  }

  /* -------------------------------------------------------------------
     Navegación entre pantallas con data-ir
     ------------------------------------------------------------------- */
  function mostrarPantalla(id, moverFoco = true) {
    if (!idsPantallas.includes(id)) return;

    if (id === 'actividad' && !todasCompletas()) {
      anunciar('La síntesis se habilita al completar las cuatro etapas.');
      id = 'mapa';
    }

    if (/^nodo-[1-4]$/.test(id)) {
      const numero = Number(id.split('-')[1]);
      if (!estado.desbloqueadas[numero]) {
        anunciar('Esa etapa todavía está bloqueada.');
        id = 'mapa';
      }
    }

    document.querySelectorAll('.pantalla').forEach((pantalla) => {
      const activa = pantalla.id === id;
      pantalla.classList.toggle('activa', activa);
      pantalla.setAttribute('aria-hidden', activa ? 'false' : 'true');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'mapa') actualizarMapa();
    if (id === 'bitacora') actualizarResumenBitacora();
    if (id === 'actividad') prepararActividad();

    if (moverFoco) {
      window.setTimeout(() => {
        const destino = document.getElementById(id);
        const titulo = destino?.querySelector('h1, h2');
        if (titulo) {
          titulo.setAttribute('tabindex', '-1');
          titulo.focus({ preventScroll: true });
        }
      }, 30);
    }
  }

  document.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-ir]');
    if (boton) mostrarPantalla(boton.dataset.ir);
  });

  /* -------------------------------------------------------------------
     Mapa, códigos y progreso
     ------------------------------------------------------------------- */
  function puedeDesbloquear(numero) {
    return !ORDEN_OBLIGATORIO || numero === 1 || estado.completas[numero - 1];
  }

  function validarCodigo(numero) {
    const input = document.getElementById(`codigo-${numero}`);
    const mensaje = document.getElementById(`mensaje-codigo-${numero}`);
    if (!input || !mensaje) return;

    mensaje.className = 'mensaje-codigo';
    if (!puedeDesbloquear(numero)) {
      mensaje.textContent = `Primero completá la etapa ${numero - 1}.`;
      mensaje.classList.add('error');
      return;
    }

    if (normalizarCodigo(input.value) === CODIGOS[numero]) {
      estado.desbloqueadas[numero] = true;
      guardarEstado();
      input.value = '';
      mensaje.textContent = 'Etapa habilitada.';
      mensaje.classList.add('exito');
      actualizarMapa();
      anunciar(`Etapa ${numero} habilitada.`);
    } else {
      mensaje.textContent = 'El código no coincide. Revisalo con el profesor.';
      mensaje.classList.add('error');
      input.select();
    }
  }

  document.querySelectorAll('[data-validar-codigo]').forEach((boton) => {
    boton.addEventListener('click', () => validarCodigo(Number(boton.dataset.validarCodigo)));
  });
  document.querySelectorAll('.fila-codigo input').forEach((input) => {
    input.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        validarCodigo(Number(input.id.split('-')[1]));
      }
    });
  });
  document.querySelectorAll('[data-entrar-nodo]').forEach((boton) => {
    boton.addEventListener('click', () => mostrarPantalla(`nodo-${boton.dataset.entrarNodo}`));
  });

  function cantidadCompletas() {
    return Object.values(estado.completas).filter(Boolean).length;
  }
  function todasCompletas() {
    return cantidadCompletas() === 4;
  }

  function actualizarMapa() {
    for (let numero = 1; numero <= 4; numero += 1) {
      const tarjeta = document.querySelector(`[data-nodo-card="${numero}"]`);
      const etiqueta = document.querySelector(`[data-estado-nodo="${numero}"]`);
      const desbloqueo = document.querySelector(`[data-desbloqueo="${numero}"]`);
      const entrar = document.querySelector(`[data-entrar-nodo="${numero}"]`);
      if (!tarjeta || !etiqueta || !desbloqueo || !entrar) continue;

      tarjeta.classList.toggle('bloqueado', !estado.desbloqueadas[numero]);
      tarjeta.classList.toggle('desbloqueado', estado.desbloqueadas[numero] && !estado.completas[numero]);
      tarjeta.classList.toggle('completo', estado.completas[numero]);
      desbloqueo.hidden = estado.desbloqueadas[numero];
      entrar.hidden = !estado.desbloqueadas[numero];
      entrar.textContent = estado.completas[numero] ? 'Revisar la etapa' : 'Entrar a la etapa';

      if (estado.completas[numero]) etiqueta.textContent = 'Completa';
      else if (estado.desbloqueadas[numero]) etiqueta.textContent = 'Habilitada';
      else if (!puedeDesbloquear(numero)) etiqueta.textContent = `Requiere etapa ${numero - 1}`;
      else etiqueta.textContent = 'Esperando código';
    }

    const total = cantidadCompletas();
    const contador = document.getElementById('contador-etapas');
    const mensaje = document.getElementById('mensaje-progreso');
    const barra = document.getElementById('progreso-global-barra');
    if (contador) contador.textContent = `${total} de 4 etapas completadas`;
    if (mensaje) {
      if (total === 0) mensaje.textContent = 'Ingresá el primer código para comenzar.';
      else if (total < 4) mensaje.textContent = `Continuá con la etapa ${total + 1} cuando el profesor entregue el código.`;
      else mensaje.textContent = 'El recorrido está completo. Ya podés resolver la síntesis.';
    }
    if (barra) barra.style.width = `${total * 25}%`;

    const bloque = document.getElementById('acceso-sintesis');
    const boton = document.getElementById('boton-sintesis');
    if (bloque && boton) {
      bloque.classList.toggle('bloqueada', !todasCompletas());
      boton.disabled = !todasCompletas();
      bloque.querySelector('p').textContent = todasCompletas()
        ? 'Las cuatro etapas están completas. Usá los casos para integrar el recorrido.'
        : 'Se habilita cuando las cuatro etapas están completas.';
    }
  }

  function completarNodo(numero) {
    const requisitos = {
      1: () => textoPlano(estado.notas.n1).length >= 20,
      2: () => estado.significadosVisitados.length >= 4 && estado.laboratorioIARealizado && textoPlano(estado.notas.n2).length >= 20,
      3: () => textoPlano(estado.notas.n3).length >= 20,
      4: () => textoPlano(estado.notas.n4).length >= 30
    };
    const mensajes = {
      1: 'Escribí al menos dos criterios en la bitácora antes de completar.',
      2: 'Explorá al menos cuatro significados, realizá el laboratorio de IA y escribí la bitácora.',
      3: 'Registrá un error esperado y una posible intervención antes de completar.',
      4: 'Desarrollá la reflexión final de la etapa antes de completar.'
    };
    const salida = document.getElementById(`requisito-n${numero}`);
    if (!requisitos[numero]()) {
      if (salida) salida.textContent = mensajes[numero];
      return;
    }
    estado.completas[numero] = true;
    guardarEstado();
    if (salida) {
      salida.textContent = 'Etapa completada. Volvé al mapa para continuar.';
      salida.style.color = 'var(--verde)';
    }
    actualizarMapa();
    anunciar(`Etapa ${numero} completada.`);
  }

  document.querySelectorAll('[data-completar-nodo]').forEach((boton) => {
    boton.addEventListener('click', () => completarNodo(Number(boton.dataset.completarNodo)));
  });

  document.getElementById('reiniciar-recorrido')?.addEventListener('click', () => {
    const confirmar = window.confirm('Se borrarán códigos habilitados, etapas completas, actividad y bitácora. ¿Continuar?');
    if (!confirmar) return;
    estado = estadoInicial();
    guardarEstado();
    restaurarCampos();
    actualizarMapa();
    anunciar('El recorrido se reinició.');
  });

  /* -------------------------------------------------------------------
     Constructor de prompt
     ------------------------------------------------------------------- */
  function generarPrompt() {
    const seleccion = [...document.querySelectorAll('#opciones-prompt input:checked')].map((item) => item.value);
    const aspectos = seleccion.length ? seleccion.join('; ') : 'definición y ejemplo';
    const prompt = `Elaborá un cuadro comparativo sobre los siguientes significados de la fracción: parte-todo, cociente, medida, razón y operador. Para cada uno incluí: ${aspectos}. No presentes los significados como sinónimos: explicitá qué tipo de situación pone en primer plano cada uno, cuál es la unidad o relación involucrada y qué límites tiene la clasificación. Indicá con claridad cuando una afirmación sea una simplificación y proponé preguntas que permitan analizar la respuesta desde la Didáctica de la Matemática.`;
    const campo = document.getElementById('prompt-generado');
    if (campo) campo.value = prompt;
  }
  document.getElementById('generar-prompt')?.addEventListener('click', generarPrompt);
  document.getElementById('copiar-prompt')?.addEventListener('click', async () => {
    const campo = document.getElementById('prompt-generado');
    const salida = document.getElementById('estado-copia');
    if (!campo || !salida) return;
    if (!campo.value) generarPrompt();
    try {
      await navigator.clipboard.writeText(campo.value);
      salida.textContent = 'Prompt copiado.';
      salida.className = 'mensaje-codigo exito';
    } catch {
      campo.focus();
      campo.select();
      salida.textContent = 'Seleccionado: usá Ctrl+C o Copiar.';
      salida.className = 'mensaje-codigo';
    }
  });

  /* -------------------------------------------------------------------
     Cinco significados y laboratorio de IA
     ------------------------------------------------------------------- */
  function mostrarSignificado(nombre) {
    document.querySelectorAll('[data-detalle-significado]').forEach((detalle) => {
      detalle.hidden = detalle.dataset.detalleSignificado !== nombre;
    });
    document.querySelectorAll('[data-significado]').forEach((boton) => {
      const activo = boton.dataset.significado === nombre;
      boton.setAttribute('aria-expanded', activo ? 'true' : 'false');
    });
    if (!estado.significadosVisitados.includes(nombre)) {
      estado.significadosVisitados.push(nombre);
      guardarEstado();
    }
    actualizarSignificados();
    const detalle = document.querySelector(`[data-detalle-significado="${nombre}"]`);
    detalle?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function actualizarSignificados() {
    document.querySelectorAll('[data-significado]').forEach((boton) => {
      boton.classList.toggle('visitado', estado.significadosVisitados.includes(boton.dataset.significado));
    });
  }

  document.querySelectorAll('[data-significado]').forEach((boton) => {
    boton.addEventListener('click', () => mostrarSignificado(boton.dataset.significado));
  });

  document.getElementById('form-lab-ia')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const elegidas = new Set([...evento.currentTarget.querySelectorAll('input:checked')].map((item) => item.value));
    const correctas = ['a', 'b', 'c'];
    const marcoCorrectas = correctas.filter((valor) => elegidas.has(valor)).length;
    const marcoD = elegidas.has('d');
    const salida = document.getElementById('devolucion-lab-ia');
    if (!salida) return;

    estado.laboratorioIARealizado = true;
    guardarEstado();
    salida.hidden = false;
    salida.className = 'devolucion';

    if (marcoCorrectas === 3 && !marcoD) {
      salida.classList.add('correcta');
      salida.innerHTML = '<strong>Lectura consistente.</strong><p>A, B y C requieren revisión. A reduce toda fracción a parte-todo; B convierte el operador en una receta sin estado inicial ni transformación; C confunde la escritura común con el papel que cumple en la situación. D es un criterio productivo para analizar problemas.</p>';
    } else if (marcoCorrectas >= 2) {
      salida.classList.add('incompleta');
      salida.innerHTML = '<strong>Vas en una dirección productiva.</strong><p>Las afirmaciones A, B y C deben ser revisadas. La D no es una reducción: recuerda que un problema puede articular significados y que el análisis debe explicitar cuál se privilegia.</p>';
    } else {
      salida.classList.add('incorrecta');
      salida.innerHTML = '<strong>Conviene volver sobre las cinco tarjetas.</strong><p>Las tres primeras afirmaciones parecen plausibles, pero simplifican relaciones diferentes. La D ayuda a evitar una clasificación rígida.</p>';
    }
  });

  /* -------------------------------------------------------------------
     Simulador de escalas y pausa reflexiva
     ------------------------------------------------------------------- */
  function formatoNumero(numero) {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(numero);
  }
  function actualizarSimulador() {
    const control = document.getElementById('factor-escala');
    if (!control) return;
    const k = Number(control.value);
    document.getElementById('salida-factor').textContent = formatoNumero(k);
    document.getElementById('factor-longitud').textContent = `× ${formatoNumero(k)}`;
    document.getElementById('factor-area').textContent = `× ${formatoNumero(k ** 2)}`;
    document.getElementById('factor-volumen').textContent = `× ${formatoNumero(k ** 3)}`;
  }
  document.getElementById('factor-escala')?.addEventListener('input', actualizarSimulador);

  const preguntasPausa = [
    '¿Qué parte de tu enseñanza habitual privilegia la ejecución por encima de la explicación?',
    '¿Qué error de un estudiante podría transformarse en una pregunta para toda la clase?',
    '¿Cuándo una representación ayuda a pensar y cuándo se vuelve una plantilla que limita?',
    '¿Qué responsabilidad matemática conserva el docente y cuál puede transferir a los estudiantes?',
    '¿Qué relación entre dos actividades hace visible un conocimiento que una actividad aislada oculta?'
  ];
  let indicePregunta = 0;
  document.getElementById('cambiar-pregunta')?.addEventListener('click', () => {
    indicePregunta = (indicePregunta + 1) % preguntasPausa.length;
    document.getElementById('pregunta-pausa').textContent = preguntasPausa[indicePregunta];
  });

  /* -------------------------------------------------------------------
     Bitácora y guardado local
     ------------------------------------------------------------------- */
  function restaurarCampos() {
    document.querySelectorAll('[data-bitacora]').forEach((campo) => {
      campo.value = estado.notas[campo.dataset.bitacora] || '';
    });
    actualizarResumenBitacora();
    actualizarSignificados();
    actualizarSimulador();
  }

  document.querySelectorAll('[data-bitacora]').forEach((campo) => {
    let temporizador;
    campo.addEventListener('input', () => {
      estado.notas[campo.dataset.bitacora] = campo.value;
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        guardarEstado();
        const aviso = document.querySelector(`[data-guardado="${campo.dataset.bitacora}"]`);
        if (aviso) {
          aviso.textContent = 'Guardado en este dispositivo.';
          aviso.classList.add('activo');
          window.setTimeout(() => aviso.classList.remove('activo'), 1400);
        }
        actualizarResumenBitacora();
      }, 350);
    });
  });

  function actualizarResumenBitacora() {
    document.querySelectorAll('[data-resumen-nota]').forEach((elemento) => {
      const contenido = textoPlano(estado.notas[elemento.dataset.resumenNota]);
      elemento.textContent = contenido || 'Todavía no escribiste esta nota.';
    });
  }

  document.getElementById('exportar-bitacora')?.addEventListener('click', () => {
    const secciones = [
      ['Etapa 1 · Criterios para analizar IA', estado.notas.n1],
      ['Etapa 2 · Diferencias entre significados', estado.notas.n2],
      ['Etapa 3 · Error esperado e intervención', estado.notas.n3],
      ['Etapa 4 · Técnicas y proceso de estudio', estado.notas.n4],
      ['Cierre individual', estado.notas.final]
    ];
    const contenido = [
      'UNA MISMA ESCRITURA, MUCHOS SENTIDOS',
      'Bitácora personal · AMAE · Universidad Nacional del Comahue',
      '',
      ...secciones.flatMap(([titulo, nota]) => [titulo, '-'.repeat(titulo.length), textoPlano(nota) || '[Sin registro]', ''])
    ].join('\n');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'bitacora-racionales-amae.txt';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(enlace.href), 500);
  });

  document.getElementById('borrar-bitacora')?.addEventListener('click', () => {
    if (!window.confirm('¿Borrar todas las notas de la bitácora? El progreso de etapas se conservará.')) return;
    estado.notas = { n1: '', n2: '', n3: '', n4: '', final: '' };
    guardarEstado();
    restaurarCampos();
    anunciar('Se borraron las notas.');
  });

  /* -------------------------------------------------------------------
     Actividad interactiva final
     ------------------------------------------------------------------- */
  const casos = [
    {
      etiqueta: 'COCIENTE Y UNIDAD',
      pregunta: 'Se reparten 3 chocolates entre 4 estudiantes, en partes iguales y sin que sobre nada. ¿Cuánto recibe cada estudiante?',
      contexto: 'Elegí la respuesta que conserva la unidad y expresa el resultado del reparto.',
      opciones: [
        { valor: 'a', texto: '3/12 de chocolate, porque hay doce partes dibujadas.' },
        { valor: 'b', texto: '3/4 de chocolate.' },
        { valor: 'c', texto: '4/3 de chocolate.' },
        { valor: 'd', texto: 'No se puede repartir exactamente.' }
      ],
      correcta: 'b',
      devoluciones: {
        a: 'Contar las doce partes de los tres chocolates cambia la unidad de referencia: cada parte es 1/4 de un chocolate, no 1/12. Cada estudiante recibe tres porciones de 1/4, es decir 3/4.',
        b: 'La respuesta expresa el cociente 3 ÷ 4 y también puede medirse como tres unidades de 1/4. La unidad sigue siendo un chocolate.',
        c: '4/3 invierte la relación: sería el resultado de repartir cuatro unidades entre tres personas.',
        d: 'El reparto exacto es posible cuando se admiten cantidades fraccionarias: cada estudiante recibe 3/4.'
      }
    },
    {
      etiqueta: 'RAZÓN Y OPERADOR',
      pregunta: 'Una foto mide 6 × 8 cm y debe ampliarse, sin deformarla, en una hoja de 10 × 16 cm. ¿Cuál es el mayor factor posible?',
      contexto: 'El mismo factor debe aplicarse a las dos dimensiones y la imagen debe entrar completa.',
      opciones: [
        { valor: 'a', texto: '2, porque 8 · 2 = 16.' },
        { valor: 'b', texto: '5/3, porque es el menor entre 10/6 y 16/8.' },
        { valor: 'c', texto: '4/3, porque 8/6 = 4/3.' },
        { valor: 'd', texto: '10/8, porque se comparan los lados mayores.' }
      ],
      correcta: 'b',
      devoluciones: {
        a: 'El factor 2 completa el lado de 16 cm, pero transforma 6 cm en 12 cm y supera el ancho de 10 cm.',
        b: 'El factor máximo es 5/3. Lleva 6 a 10 y lleva 8 a 40/3, aproximadamente 13,33, que cabe en 16. El límite más restrictivo decide.',
        c: '4/3 mantiene la forma y cabe, pero no aprovecha al máximo la hoja: todavía se puede ampliar más.',
        d: 'Comparar lados mayores no basta. El factor debe respetar simultáneamente 6 → 10 y 8 → 16.'
      }
    },
    {
      etiqueta: 'ESCALA Y VOLUMEN',
      pregunta: '¿Qué escala lineal aproxima mejor un cubo con exactamente el doble de volumen?',
      contexto: 'Recordá que el volumen cambia con el cubo del factor lineal.',
      opciones: [
        { valor: 'a', texto: '200 %' },
        { valor: 'b', texto: '150 %' },
        { valor: 'c', texto: '126 % aproximadamente' },
        { valor: 'd', texto: '112 % aproximadamente' }
      ],
      correcta: 'c',
      devoluciones: {
        a: 'Una escala del 200 % duplica cada longitud y multiplica el volumen por 2³ = 8.',
        b: 'Una escala del 150 % multiplica el volumen por 1,5³ = 3,375, más del triple.',
        c: 'Para duplicar el volumen se resuelve k³ = 2. La raíz cúbica de 2 es aproximadamente 1,26, es decir, 126 %.',
        d: '1,12³ es aproximadamente 1,40. Aumenta el volumen, pero no lo duplica.'
      }
    }
  ];

  let casoActual = 0;
  let aciertosSesion = 0;

  function prepararActividad() {
    casoActual = 0;
    aciertosSesion = 0;
    renderizarCaso();
    document.getElementById('tarjeta-caso').hidden = false;
    document.getElementById('resultado-actividad').hidden = true;
  }

  function renderizarCaso() {
    const caso = casos[casoActual];
    if (!caso) return;
    document.getElementById('caso-indicador').textContent = `Caso ${casoActual + 1} de ${casos.length}`;
    document.getElementById('caso-barra').style.width = `${((casoActual + 1) / casos.length) * 100}%`;
    document.getElementById('caso-etiqueta').textContent = caso.etiqueta;
    document.getElementById('caso-pregunta').textContent = caso.pregunta;
    document.getElementById('caso-contexto').textContent = caso.contexto;
    const contenedor = document.getElementById('caso-opciones');
    contenedor.innerHTML = '';
    caso.opciones.forEach((opcion, indice) => {
      const label = document.createElement('label');
      label.className = 'opcion-caso';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'respuesta-caso';
      input.value = opcion.valor;
      input.id = `opcion-${casoActual}-${indice}`;
      const span = document.createElement('span');
      span.textContent = opcion.texto;
      label.append(input, span);
      contenedor.appendChild(label);
    });
    const devolucion = document.getElementById('caso-devolucion');
    devolucion.hidden = true;
    devolucion.className = 'devolucion';
    document.getElementById('siguiente-caso').hidden = true;
    document.querySelector('#form-caso button[type="submit"]').disabled = false;
  }

  document.getElementById('form-caso')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const seleccion = evento.currentTarget.querySelector('input[name="respuesta-caso"]:checked');
    const salida = document.getElementById('caso-devolucion');
    if (!seleccion) {
      salida.hidden = false;
      salida.className = 'devolucion incompleta';
      salida.textContent = 'Elegí una opción antes de confirmar.';
      return;
    }
    const caso = casos[casoActual];
    const correcta = seleccion.value === caso.correcta;
    if (correcta) aciertosSesion += 1;
    salida.hidden = false;
    salida.className = `devolucion ${correcta ? 'correcta' : 'incorrecta'}`;
    salida.innerHTML = `<strong>${correcta ? 'La relación es consistente.' : 'La opción permite revisar una idea.'}</strong><p>${caso.devoluciones[seleccion.value]}</p>`;
    evento.currentTarget.querySelectorAll('input').forEach((input) => { input.disabled = true; });
    evento.currentTarget.querySelector('button[type="submit"]').disabled = true;
    const siguiente = document.getElementById('siguiente-caso');
    siguiente.hidden = false;
    siguiente.textContent = casoActual === casos.length - 1 ? 'Ver síntesis' : 'Siguiente caso';
  });

  document.getElementById('siguiente-caso')?.addEventListener('click', () => {
    if (casoActual < casos.length - 1) {
      casoActual += 1;
      renderizarCaso();
      document.getElementById('tarjeta-caso').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      document.getElementById('tarjeta-caso').hidden = true;
      const resultado = document.getElementById('resultado-actividad');
      resultado.hidden = false;
      document.getElementById('resultado-texto').textContent = `Respondiste los tres casos y elegiste ${aciertosSesion} opciones consistentes en el primer intento.`;
      estado.actividad = { caso: 3, aciertos: aciertosSesion, respondidos: true };
      guardarEstado();
    }
  });

  document.getElementById('reiniciar-actividad')?.addEventListener('click', prepararActividad);

  /* -------------------------------------------------------------------
     Inicio
     ------------------------------------------------------------------- */
  generarPrompt();
  restaurarCampos();
  actualizarMapa();
  mostrarPantalla('inicio', false);
})();
