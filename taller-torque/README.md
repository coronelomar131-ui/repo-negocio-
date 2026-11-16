# Taller Torque

Juego de taller mecánico en pixel art. Abre `index.html` en el navegador (no necesita instalar nada).

## Qué simula

Un motor 1.6 L turbo de 4 cilindros, orden de encendido 1-3-4-2, modelado con física:

- **Aire:** flujo compresible por la mariposa, fugas y válvula de alivio; presión del múltiple y de la tubería de boost.
- **Turbo:** la turbina recibe la energía del escape y mueve el compresor por el mismo eje. Wastegate, BOV, intercooler y desgaste de baleros con aceite sucio o apagado en caliente.
- **Combustión por cilindro:** aire, gasolina (inyector, presión de riel) y chispa (bobina, bujía, voltaje). Mezcla, detonación y humo.
- **Cigüeñal:** inercia, fricción, bombeo, motor de arranque y carga del alternador.
- **Aceite, refrigerante, batería y computadora:** ajustes de combustible y códigos OBD-II reales (P0171, P0299, P030x…).

## Cómo se juega

Cada cliente trae una falla real. Reprodúcela, diagnostica (escáner, multímetro, lámpara, compresímetro…), desarma en el orden correcto con la herramienta correcta, aprieta a especificación (torquímetro de clic) y entrega.

## Simplificaciones

- El calor del motor va ×10 y la carga/descarga de batería ×15 para no esperar minutos reales.
- Un solo modelo de auto. No incluye transmisión, suspensión ni banda de distribución.

## Archivos

| Archivo | Qué hace |
|---|---|
| `datos.js` | Herramientas, refacciones (MXN), ubicaciones, aprietes, códigos y trabajos |
| `motor.js` | Simulador físico (también corre en Node para pruebas) |
| `audio.js` | Sonido sintetizado del motor, turbo, BOV, marcha y banda |
| `dibujo.js` | Pixel art de las vistas: cofre, abajo y motor en corte |
| `juego.js` | Reglas del taller e interfaz |
