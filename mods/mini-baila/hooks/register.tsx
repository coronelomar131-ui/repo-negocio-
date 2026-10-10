import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// Estado que dibuja la banda y el panel: en qué cuadro va el baile y si hay que mostrarlo.
const frame = atom({ plugin: 'mini-baila', key: 'frame' } as const, 0)
const isDancing = atom({ plugin: 'mini-baila', key: 'isDancing' } as const, false)

// Baila durante todo el turno de Claude. Si en los últimos segundos escribió en
// un archivo, el letrero dice "programando"; si no, "trabajando".
const CODE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit'])
const CODE_LABEL_MS = 5000
const FRAME_MS = 160
const ORANGE = '#D97757'
const EYES = '#2B1F1A'
const WIDTH = 13
const PANE = 'baila'

// Espacio duro: la terminal no recorta los renglones y la figura conserva su ancho.
const space = (n: number) => '\u00a0'.repeat(Math.max(0, n))
const row = (text: string, margin: number, shift: number) =>
  space(shift + margin) + text + space(WIDTH - shift - margin - text.length)

const TOP = '▐▛███▜▌'
const MIDDLE = '▝▜█████▛▘'
const LEGS = ['▘▘ ▝▝', '▝▝ ▘▘'] as const

type Pose = { shift: number; isUp: boolean; legs: 0 | 1; note: string }

// Cuatro tiempos: se balancea de lado a lado, salta y cambia de pie.
const POSES: readonly Pose[] = [
  { shift: 1, isUp: false, legs: 0, note: '♪' },
  { shift: 2, isUp: true, legs: 1, note: '♫' },
  { shift: 1, isUp: false, legs: 1, note: '♪' },
  { shift: 0, isUp: true, legs: 0, note: '♫' },
]
const REST: Pose = { shift: 1, isUp: false, legs: 0, note: '♪' }
const poseAt = (n: number): Pose => POSES[n % POSES.length] ?? REST

function lines(pose: Pose): [string, string, string, string] {
  const top = row(TOP, 1, pose.shift)
  const middle = row(MIDDLE, 0, pose.shift)
  const legs = row(LEGS[pose.legs], 2, pose.shift)
  const blank = space(WIDTH)

  return pose.isUp ? [top, middle, legs, blank] : [blank, top, middle, legs]
}

// El mismo baile hecho con rectángulos: en el celular no hay tipografía de ancho
// fijo con la que contar, y un dibujo vectorial se ve igual en cualquier pantalla.
function drawing(pose: Pose): string {
  const lean = pose.shift - 1
  const lift = pose.isUp ? -1 : 0
  const armY = pose.isUp ? 1.6 : 4.2
  const legHeight = (i: number) => ((i % 2 === pose.legs) ? 1.3 : 2.4)
  const legs = [4, 6.2, 8.6, 10.8]
    .map((x, i) => `<rect x="${x}" y="7" width="1.2" height="${legHeight(i)}" fill="${ORANGE}"/>`)
    .join('')

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 12" shape-rendering="crispEdges">',
    '<ellipse cx="8" cy="11.3" rx="4.6" ry="0.5" fill="#000" opacity="0.28"/>',
    `<g transform="translate(${lean * 0.8} ${lift}) rotate(${lean * 5} 8 8)">`,
    `<rect x="3" y="2" width="10" height="5" rx="0.6" fill="${ORANGE}"/>`,
    `<rect x="1" y="${armY}" width="2" height="1.4" fill="${ORANGE}"/>`,
    `<rect x="13" y="${armY}" width="2" height="1.4" fill="${ORANGE}"/>`,
    `<rect x="5" y="3.2" width="1" height="1.6" fill="${EYES}"/>`,
    `<rect x="10" y="3.2" width="1" height="1.6" fill="${EYES}"/>`,
    legs,
    '</g></svg>',
  ].join('')
}

// Último recurso si el celular no coloca el panel: una línea de estado.
const STATUS_FIGURES = ['\\o/', '_o/', '\\o_', '/o\\'] as const

export const register: Register = on => {
  let isOn = false
  let lastCodeAt = Number.NEGATIVE_INFINITY
  let isPaneOpen = false
  let isStatusShown = false
  let hasWarned = false

  // Un reinicio del módulo vuelve a disparar session.start: aquí se apaga lo que
  // haya quedado encendido y arranca el reloj que mueve los cuadros.
  on('session.start', async ($, e, next) => {
    isOn = false
    isPaneOpen = false
    isStatusShown = false
    await update($, isDancing, () => false)

    $.clock.every(FRAME_MS, async () => {
      if (!isOn) return

      await update($, frame, f => ((f ?? 0) + 1) % POSES.length)

      if (isStatusShown) {
        const current = await read($, frame)

        $.ui.status(`${poseAt(current).note} ${STATUS_FIGURES[current % STATUS_FIGURES.length]} Claude trabaja`)
      }
    })

    return next(e)
  })

  // Empieza a bailar cuando Claude empieza su turno, escriba lo que escriba.
  on('turn.start', async ($, e, next) => {
    isOn = true
    await update($, isDancing, () => true)

    // La banda no se dibuja en el celular: si hay uno conectado, el baile va en un panel.
    if ((await $.session.surfaces()).includes('mobile')) {
      const opened = await $.ui.open({ id: PANE, title: 'Mini Claude' })
      isPaneOpen = opened.isPlaced

      if (!opened.isPlaced) {
        isStatusShown = true

        if (!hasWarned) {
          hasWarned = true
          $.ui.toast(`mini-baila: el panel no se pudo mostrar en el celular (${opened.reason})`)
        }
      }
    }

    return next(e)
  })

  // Se detiene al terminar el turno. Los turnos de los subagentes traen su
  // agentId y no cuentan: mientras ellos trabajan, el turno principal sigue.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      isOn = false
      await update($, isDancing, () => false)

      if (isPaneOpen) {
        isPaneOpen = false
        await $.ui.close({ id: PANE })
      }

      if (isStatusShown) {
        isStatusShown = false
        $.ui.status(undefined)
      }
    }

    return next(e)
  })

  // Nunca bloquea ni cambia la llamada: solo anota si se está escribiendo código.
  on('tool.call', async ($, e, next) => {
    if (CODE_TOOLS.has(String(e.tool))) {
      lastCodeAt = await $.clock.now()
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  const labelAt = (now: number) => (now - lastCodeAt < CODE_LABEL_MS ? 'programando…' : 'trabajando…')

  // Terminal y escritorio: la figura de bloques en la banda sobre el prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // isWorking también protege de un baile atorado si un turno acabara sin avisar.
    if (e.props.hasSurvey || !e.props.isWorking || !(await read($, isDancing))) {
      return next(e)
    }

    const pose = poseAt(await read($, frame))
    const [a, b, c, d] = lines(pose)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box alignItems="center">
        <Box flexDirection="column">
          <Text color={ORANGE}>{a}</Text>
          <Text color={ORANGE}>{b}</Text>
          <Text color={ORANGE}>{c}</Text>
          <Text color={ORANGE}>{d}</Text>
        </Box>
        <Text dimColor> {pose.note} {labelAt(await $.clock.now())}</Text>
      </Box>
    )
  })

  // Panel del celular: el dibujo vectorial. Una pantalla que lo dibuje vacío lo
  // cierra, así que la terminal (y solo ella, que no tiene Svg) recibe la figura de bloques.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (!(await read($, isDancing))) {
      return next(e)
    }

    const pose = poseAt(await read($, frame))
    const caption = ` ${pose.note} ${labelAt(await $.clock.now())}`

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      const [a, b, c, d] = lines(pose)

      return (
        <Box alignItems="center">
          <Box flexDirection="column">
            <Text color={ORANGE}>{a}</Text>
            <Text color={ORANGE}>{b}</Text>
            <Text color={ORANGE}>{c}</Text>
            <Text color={ORANGE}>{d}</Text>
          </Box>
          <Text dimColor>{caption}</Text>
        </Box>
      )
    }

    const { Box, Text, Svg } = $.ui.resolve(e)

    return (
      <Box alignItems="center">
        <Svg source={drawing(pose)} alt="Un mini Claude naranja bailando" width={96} height={72} />
        <Text dimColor>{caption}</Text>
      </Box>
    )
  })
}
