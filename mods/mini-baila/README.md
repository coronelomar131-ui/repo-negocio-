# mini-baila

Un mini Claude naranja baila sobre el prompt mientras Claude trabaja.

- **Cuándo baila:** durante todo el turno de Claude, escriba código o cualquier otra cosa.
- **El letrero:** dice "programando…" si en los últimos 5 segundos Claude escribió en un archivo (`Edit`, `Write`, `NotebookEdit`, `MultiEdit`) y "trabajando…" el resto del tiempo.
- **Cuándo se detiene:** al terminar el turno. Un subagente que termina no lo apaga.
- **Lo que no hace:** no bloquea ni cambia ninguna llamada de herramienta, no usa red, archivos ni procesos.

## Dónde se dibuja

La banda solo aparece en la **terminal** y en la **app de escritorio**. En la app del celular y en la web no se dibuja.

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

Las pruebas simulan una sesión: que baile al empezar el turno, que cambie de cuadro, que el letrero cambie al editar, que se detenga al terminar, que un subagente no lo apague, que ceda ante un cuestionario y que funcione en terminal y escritorio.

## Lo que no está verificado

Se probó el contenido y el comportamiento de la banda, no cómo se ve en una pantalla real: la figura usa caracteres de bloque de Unicode y puede verse distinta según la tipografía del terminal. La instalación con `/plugin install` tampoco se ha probado desde otra computadora.

## Cambiar algo

Todo está en `hooks/register.tsx`: el color (`ORANGE`), la velocidad (`FRAME_MS`), qué herramientas cuentan como programar (`CODE_TOOLS`) y los textos.
