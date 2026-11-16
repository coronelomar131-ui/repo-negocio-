# Taller Torque

Juego de taller mecánico en 3D estilo pixel. Abre `index.html` (no necesita instalar nada). En celular o PC se puede instalar como app desde el navegador cuando está publicado con https.

## Qué simula

Motores de 4, 6 y 8 cilindros, turbo y atmosféricos, modelados con física:

- **Aire:** flujo compresible por la mariposa, fugas y válvula de alivio; presión del múltiple y del boost.
- **Turbo:** la turbina recibe la energía del escape y mueve el compresor. Wastegate controlada por la ECU, BOV, intercooler, turbo grande opcional.
- **Combustión por cilindro**, con su orden de encendido real (1-3-4-2, V6 y V8).
- **Transmisión:** embrague o convertidor, caja con relaciones reales, agarre de llantas con transferencia de peso, resistencia del aire.
- **Aceite, refrigerante, batería y computadora:** ajustes de combustible, códigos OBD-II reales y mapa editable.

## Cómo se juega

- **Clientes:** cada uno trae una falla real. Diagnostica, repara con la herramienta y el apriete correctos, y entrega.
- **Autos:** compra proyectos en el mercado, motores y cajas en el deshuesadero, y véndelos ya arreglados.
- **Cambio de motor y caja:** procedimiento paso a paso con pluma; revisa si cabe en el cofre, si la caja es de la misma familia (o pon placa adaptadora) y reprograma la ECU.
- **ECU:** boost, mezcla, avance, corte de revoluciones, ralentí, escala de inyectores, launch control, petardeo, sensor O2 y foco de check engine.
- **Pista:** cuarto de milla contra 7 rivales con apuesta.
- **Negocio:** empleados que atienden clientes o reparan tus autos, mejoras del taller y cierre de día.

## Simplificaciones

- El calor del motor va ×10 y la batería ×15 para no esperar minutos reales.
- La vista "en corte" es un diagrama 2D a propósito; el cofre, abajo y la pista son 3D.
- Autos de marcas inventadas.

## Archivos

| Archivo | Qué hace |
|---|---|
| `datos.js` | Herramientas, refacciones, motores, cajas, modelos, fallas y negocio |
| `motor.js` | Simulador físico y transmisión (también corre en Node para pruebas) |
| `render3d.js` | Taller y auto en 3D (Three.js r128, en `lib/`) |
| `dibujo.js` | Vista en corte 2D y respaldo 2D si no hay WebGL |
| `negocio.js` | Garaje, mercado, cambio de motor y caja, ECU, empleados y guardado |
| `carrera.js` | Pista de arrancones |
| `audio.js` | Sonido sintetizado por cilindro |
| `juego.js` | Reglas del taller e interfaz |
| `manifest.webmanifest`, `sw.js`, `icons/` | App instalable y sin internet |
