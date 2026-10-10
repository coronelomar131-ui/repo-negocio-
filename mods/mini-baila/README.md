# mini-baila

Un mini Claude naranja baila sobre el prompt mientras Claude trabaja.

- **Cuándo baila:** durante todo el turno de Claude, escriba código o cualquier otra cosa.
- **El letrero:** dice "programando…" si en los últimos 5 segundos Claude escribió en un archivo (`Edit`, `Write`, `NotebookEdit`, `MultiEdit`) y "trabajando…" el resto del tiempo.
- **Cuándo se detiene:** al terminar el turno. Un subagente que termina no lo apaga.
- **Lo que no hace:** no bloquea ni cambia ninguna llamada de herramienta, no usa red, archivos ni procesos.

## Dónde se dibuja

- **Terminal y app de escritorio:** una banda sobre el prompt, con la figura hecha de caracteres de bloque.
- **App del celular:** el motor no levanta esa banda ahí, así que el mod usa un **panel** con el mismo baile dibujado como imagen vectorial (`Svg`). Se abre al empezar el turno de Claude, solo si hay un celular conectado en ese momento, y se cierra al terminar. Si el celular conecta a mitad de un turno, el panel aparece en el siguiente.
- **Si el celular no coloca el panel** (el motor decide según el ancho de la pantalla), el mod avisa una vez con un aviso corto que dice el motivo y deja una línea de estado con un muñequito de texto (`\o/`) que baila mientras Claude trabaja.
- Si hay terminal o escritorio y celular conectados a la vez, el panel también se dibuja ahí (en la terminal con la figura de bloques, en el escritorio con el dibujo vectorial), además de la banda. Es así a propósito: un panel que una pantalla deja vacío se cierra.

## Instalarlo

Requiere Claude Code 2.1.287 o más nuevo. Desde una sesión de terminal:

```text
/plugin install mini-baila --marketplace coronelomar131-ui/repo-negocio-
```

Para probarlo sin instalar, desde una copia del repositorio:

```bash
claude --plugin-dir ./mods/mini-baila
```

## Comprobarlo

```bash
claude plugin validate mods/mini-baila
claude plugin test mods/mini-baila
```

Las pruebas simulan una sesión: que baile al empezar el turno, que cambie de cuadro, que el letrero cambie al editar, que se detenga al terminar, que un subagente no lo apague, que ceda ante un cuestionario, que funcione en terminal y escritorio, que el panel del celular dibuje el baile vectorial y lo cambie de cuadro, y que la terminal nunca deje el panel vacío.

## Lo que no está verificado

Se probó el contenido y el comportamiento de la banda y del panel, no cómo se ven en una pantalla real. **No se probó la parte que detecta el celular y abre el panel** (el kit de pruebas no puede simular qué pantallas están conectadas), ni si la app del celular coloca el panel: la figura usa caracteres de bloque de Unicode y puede verse distinta según la tipografía del terminal. La instalación con `/plugin install` tampoco se ha probado desde otra computadora.

## Cambiar algo

Todo está en `hooks/register.tsx`: el color (`ORANGE`), la velocidad (`FRAME_MS`), qué herramientas cuentan como programar (`CODE_TOOLS`) y los textos.
