# Video de Taller Digital

`taller-digital.mp4` (en la raíz del repositorio): video vertical de 50 s, 1080×1920, sin audio.
Explica qué hace Taller Digital y muestra dos demos con datos de ejemplo.

## Cómo regenerarlo

Desde esta carpeta, con Node, Playwright y ffmpeg instalados:

```bash
mkdir -p frames-demo cuadros
ffmpeg -i ../demo-cotizador.mp4 -vf fps=30 -q:v 3 frames-demo/f%04d.jpg   # cuadros del demo 1
node captura.js "$PWD" "$(cd .. && pwd)"                                  # capturas de la libreta (demo 2)
node render.js "$PWD" prueba                                              # 8 cuadros sueltos para revisar
node render.js "$PWD" completo                                            # los 1500 cuadros
ffmpeg -framerate 30 -i cuadros/c%05d.jpg -c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart ../taller-digital.mp4
```

Textos y tiempos de cada escena: `escena.html` (arreglo `ESCENAS`).
Los negocios de la libreta en el video son inventados (`captura.js`).
