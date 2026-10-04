# Para Claude: contexto del proyecto de la cafetería

Este archivo resume todo lo que se hizo en la primera sesión, para que la siguiente sesión de
Claude Code no empiece de cero.

**Cómo usarlo:** abre una sesión nueva de Claude Code en este repositorio (rama `main`) y pega el
mensaje de abajo. Antes, llena la sección **"Mi investigación"** al final de este archivo con lo
que hayas investigado (o pégalo directamente en el chat).

---

## Mensaje para pegar en la nueva sesión

```text
Antes de preguntarme nada, lee completo PARA-CLAUDE.md.

1. Ahí ya están mis respuestas al cuestionario. Pregúntame solo lo marcado como [POR CONFIRMAR]
   y lo que haya quedado en blanco.
2. Usa la sección "Mi investigación" como fuente principal para modificar todo: textos, menú,
   precios, colores, fotos y secciones. Si algo de mi investigación contradice el borrador
   (index.html), gana mi investigación.
3. Respeta la sección "Limitaciones del entorno": hay sitios bloqueados y playwright-cli
   hay que reinstalarlo en cada sesión nueva.
4. Primero resuélveme la "Decisión pendiente" (index.html o Next.js) y después sigue el flujo
   normal de CLAUDE.md.
```

---

## Decisión pendiente: ¿index.html o Next.js?

El borrador que ya existe es **`index.html`**: un solo archivo con HTML, Tailwind por CDN y
JavaScript sin librerías, que es lo que se pidió al principio. Claude Web Builder (este
repositorio) construye en cambio un proyecto **Next.js** dentro de `site/`.

| Opción | A favor | En contra |
|---|---|---|
| **A. Seguir con `index.html`** | Ya está hecho y probado. Un solo archivo, fácil de reutilizar para otros negocios cambiando el bloque de configuración. Se sube a cualquier hosting. | Tailwind por CDN es para prototipos (genera los estilos en el navegador). No usa el flujo de Next.js de claude-webkit. |
| **B. Reconstruir en Next.js con claude-webkit** | Flujo completo de claude-webkit: 21 skills, revisión de animaciones, SEO, despliegue a Vercel. Más rápido al cargar. | Más pesado de mantener (Node, dependencias). En este entorno `ui.shadcn.com` y Vercel están bloqueados (ver limitaciones). |

Si se elige **B**, conservar la idea de reutilización: todos los datos del negocio en **un solo
archivo de configuración** (por ejemplo `site/src/config/negocio.ts`), igual que el bloque
`CONFIG` de `index.html`.

---

## Respuestas al cuestionario (docs/questionnaire-es.md)

### Ronda 1: Lo básico
1. **Nombre del negocio:** [POR CONFIRMAR]. En el borrador se usó "Café Canela" solo como ejemplo.
2. **A qué se dedica:** cafetería. Productos estrella: café de olla, crepas y frappés.
3. **Público:** [POR CONFIRMAR]. Lo seguro: gente de la zona que busca dónde tomar un café.
   **La mayoría verá la página en el celular**, así que el diseño es mobile-first.

### Ronda 2: Dirección visual
4. **Página de referencia:** ninguna. El borrador `index.html` sirve de punto de partida.
5. **Colores:** tonos café y crema. Ver paletas en "Hallazgos verificados".
6. **Tema:** claro (fondo crema), con portada y pie en café oscuro.
7. **Sensación:** cálida y acogedora, tipografía moderna, animaciones suaves al hacer scroll.

### Ronda 3: Contenido
8. **Acción principal:** **pedir por WhatsApp**. Botón en la portada y botón flotante, ambos con
   mensaje prellenado.
9. **Qué destacar:**
   - Productos estrella (café de olla, crepas, frappés).
   - **Menú digital por categorías:** bebidas calientes, bebidas frías, comida y postres, con
     precios. Debe ser fácil de editar (una lista de datos, no HTML a mano).
   - **Horario y ubicación** con mapa de Google embebido.
10. **Formulario de contacto:** no. El contacto es por WhatsApp.
11. **Eslogan:** [POR CONFIRMAR]. En el borrador: "Café de olla, crepas y frappés hechos al momento."
12. **Testimonios:** **no inventar reseñas.** Solo si el negocio tiene reseñas reales.
13. **Redes sociales:** [POR CONFIRMAR] (Instagram, Facebook, TikTok). Si no hay, no mostrar íconos.

### Ronda 4: Técnico
14. **Logo:** no hay. Logo de texto con el nombre.
15. **Imágenes:** **placeholders de Unsplash de café, NO fotos del negocio** (petición explícita;
    tiene prioridad sobre la regla de claude-webkit de no usar fotos de stock). Mostrar el aviso
    "Imágenes ilustrativas." hasta que haya fotos reales.
16. **Favicon:** generarlo con los colores de la marca.
17. **Idioma:** español de México. Precios en pesos (MXN).
18. **Publicar:** [POR CONFIRMAR]. Ojo: Vercel está bloqueado en este entorno (ver limitaciones).

### Requisitos fijos del pedido original
- **Secciones:**
  1. Portada con nombre, frase corta y botón "Pedir por WhatsApp".
  2. Menú por categorías.
  3. Horario y ubicación con mapa.
  4. Botón flotante de WhatsApp.
  5. Pie de página pequeño.
- **Pie de página:** "Hecho por Taller Digital" (en lugar del crédito de Tododeia que pone
  claude-webkit por defecto).
- **Reutilizable:** todos los datos del negocio deben cambiarse en un solo lugar.

---

## Lo que ya existe en el repositorio

- **`index.html`:** landing v1 terminada y probada.
  - **Datos:** todo lo del negocio está en el bloque `CONFIG`, líneas 7-153 (nombre, WhatsApp,
    dirección, horario, productos estrella, menú, imágenes).
  - **Aviso "Abierto ahora / Cerrado · abre mañana a las 8:00 am":** calculado en la zona horaria
    del negocio. Probado con 22 casos, incluidos turnos que cruzan la medianoche y turnos partidos.
  - **Menú:** pestañas con precio único o por tamaño (`{ Chico: 38, Grande: 48 }`).
  - **Probado en navegador a 320, 360, 390 y 1440 px:** sin scroll horizontal y sin errores de
    consola. El texto cumple el contraste WCAG AA.
- **Claude Web Builder** ([Hainrixz/claude-webkit](https://github.com/Hainrixz/claude-webkit),
  commit `1bd88c3`, licencia MIT): `CLAUDE.md`, `docs/` y 21 skills en `.claude/skills/`. El README
  en inglés de claude-webkit quedó como `README.claude-webkit.md`; `README.md` es el original.
- **`.claude/settings.local.json`:** permite ejecutar sin preguntar `rm`, `curl`, `mv`, `chmod`,
  `npm install` y cualquier `git`, incluido `git push`.
- **`.playwright/cli.config.json`:** hace que playwright-cli use el Chromium del entorno en la nube.
  Si se trabaja en una computadora propia, hay que borrarlo.

---

## Hallazgos verificados en la primera sesión

### Fotos de Unsplash
Todas se verificaron en el dataset público oficial de Unsplash: existen, y su contenido sale de
las etiquetas del dataset. **Nadie las ha visto todavía**, porque `images.unsplash.com` está
bloqueado en este entorno. Revisarlas en el navegador antes de usarlas.

| Uso en el borrador | URL base | Qué muestra | Autor |
|---|---|---|---|
| Portada | `https://images.unsplash.com/photo-1461988366670-48e401bafb0a` | Cafetera de espresso con vapor | Crew |
| Foto del local | `https://images.unsplash.com/photo-1464979681340-bdd28a61699e` | Cafetería con barra y clientes | Robert Bye |
| Café de olla | `https://images.unsplash.com/photo-1526385159909-196a9ac0ef64` | Taza de café caliente con plato | Tim Foster |
| Frappés | `https://images.unsplash.com/photo-1445532529572-b970dbde1bcf` | Café helado en vaso, con cactus | Daryn Stumbaugh |
| Crepas | `https://images.unsplash.com/photo-1744638628542-12578d73179b` | **Café con pan dulce, NO son crepas**: reemplazar | Miraxh Tereziu |
| (alternativa) | `https://images.unsplash.com/photo-1569851379911-88fd7a408731` | Latte con granos de café | Sincerely Media |

No se encontró en el dataset ninguna foto verificable de crepas ni de café de olla en jarrito.

### WhatsApp (México)
- **Formato:** `https://wa.me/52XXXXXXXXXX?text=...` (52 y los 10 dígitos, sin "+" ni espacios).
- **Si el chat no abre:** probar con `521` y los 10 dígitos.

### Google Maps
- **Mapa por dirección:** `https://maps.google.com/maps?q=DIRECCION&z=16&output=embed` funciona
  sin clave, pero Google no lo documenta. Es más seguro el iframe oficial de Google Maps →
  Compartir → "Insertar un mapa".
- **Botón "Cómo llegar":** `https://www.google.com/maps/dir/?api=1&destination=DIRECCION`
  (formato oficial de Google Maps).

### Paletas
- **Borrador `index.html`** (pares de texto verificados en WCAG AA):
  - Crema: `#FBF7F2` (fondo), `#F4EBE0`, `#E9D9C6`, `#D9BFA0`.
  - Café: `#1A100A` (portada y pie), `#2A1B11` (texto, 15.6:1 sobre crema), `#3E2819`,
    `#553723`, `#6B472D` (texto secundario, 6.9:1).
  - Canela: `#A0582A` (acentos, 5.0:1), `#844622`, `#E3A877` (sobre fondo oscuro).
  - WhatsApp: `#25D366`.
- **ui-ux-pro-max, búsqueda "coffee shop cafe" → "Bakery/Cafe":** primario `#92400E`,
  secundario `#B45309`, fondo `#FEF3C7`, texto `#78350F`, borde `#FDE68A` ("café cálido y blanco
  crema").

### Fuentes del borrador
Fraunces (títulos) + DM Sans (texto), las dos de Google Fonts. Ninguna está en la lista de fuentes
prohibidas de claude-webkit.

### Horario
Zona horaria `America/Mexico_City`; la CDMX ya no cambia de horario en verano desde 2022. El
cálculo de abierto/cerrado de `index.html` se puede reutilizar tal cual.

---

## Limitaciones del entorno en la nube

Las sesiones de Claude Code en la web corren en un contenedor temporal. **Solo se conserva lo que
está en GitHub.**

### Sitios bloqueados por la red del entorno (verificado)
- **`ui.shadcn.com`:** `npx shadcn@latest init` y `npx shadcn@latest add` van a fallar (Fase 3 de
  claude-webkit).
- **`vercel.com`, `api.vercel.com`, `codex-deploy-skills.vercel.sh`:** el despliegue a Vercel va a
  fallar (Fase 6).
- **`images.unsplash.com`, `unsplash.com`:** no se pueden ver ni descargar las fotos.
- **`cdn.tailwindcss.com`, `cdn.jsdelivr.net`, `unpkg.com`, `maps.google.com`, `www.google.com`.**

### Sitios que sí funcionan
`registry.npmjs.org` (`npm install`, `create-next-app`) y `fonts.googleapis.com`.

### Cómo desbloquearlos
Menú del entorno (barra de título de la sesión) → **Edit** → **Network access** → agregar esos
dominios o elegir un acceso más amplio.
Guía: https://code.claude.com/docs/en/cloud-environments#network-access

### playwright-cli
- **No sobrevive al cambiar de sesión.** Reinstalarlo con `npm install -g @playwright/cli@latest`,
  o agregar ese comando en Menú del entorno → Edit → **Setup script** para que se instale solo.
- **No descargar navegadores** (`playwright-cli install-browser` o `npx playwright install`): la
  descarga está bloqueada y Chromium ya viene instalado. `.playwright/cli.config.json` ya apunta a él.
- **Recursos externos en las capturas:** el Chromium del entorno no confía en el certificado del
  proxy, así que fotos o fuentes externas pueden no cargar. Las páginas en `localhost` funcionan bien.
- **La skill es más vieja que la herramienta (0.1.22):** `open`, `screenshot`, `resize` y `close`
  sí funcionan.

---

## Pendientes antes de publicar

- [ ] Nombre real del negocio.
- [ ] Número de WhatsApp real (el borrador usa `+52 55 0000 0000`, que es falso).
- [ ] Dirección real (el borrador usa Jardín Centenario, Coyoacán, como ejemplo).
- [ ] Horario real.
- [ ] Precios reales (los del borrador son de ejemplo).
- [ ] Fotos: sobre todo la de crepas. Quitar "Imágenes ilustrativas." cuando sean fotos reales.
- [ ] Redes sociales (opcional).
- [ ] Textos de `<title>` y vista previa al compartir (en `index.html` están dentro del bloque de
      configuración).

---

## Mi investigación

> Claude: esta es la fuente principal para modificar la página. Si contradice al borrador, gana esto.

**Datos del negocio:**
- Nombre:
- Dirección:
- Horario:
- WhatsApp:
- Redes sociales:

**Menú y precios** (o competencia y precios de referencia):
-

**Textos, eslogan y tono:**
-

**Colores, fotos y referencias visuales:**
-

**Otros hallazgos:**
-
