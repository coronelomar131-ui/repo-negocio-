import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// Estado que dibuja la banda: en qué cuadro va el baile y si hay que mostrarlo.
const frame = atom({ plugin: 'mini-baila', key: 'frame' } as const, 0)
const isDancing = atom({ plugin: 'mini-baila', key: 'isDancing' } as const, false)

// Baila durante todo el turno de Claude. Si en los últimos segundos escribió en
// un archivo, el letrero dice "programando"; si no, "trabajando".
const CODE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit'])
const CODE_LABEL_MS = 5000
const FRAME_MS = 160
const ORANGE = '#D97757'
const WIDTH = 13

// Espacio duro: la terminal no recorta los renglones y la figura conserva su ancho.
const space = (n: number) => ' '.repeat(Math.max(0, n))
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

function lines(pose: Pose): [string, string, string, string] {
  const top = row(TOP, 1, pose.shift)
  const middle = row(MIDDLE, 0, pose.shift)
  const legs = row(LEGS[pose.legs], 2, pose.shift)
  const blank = space(WIDTH)

  return pose.isUp ? [top, middle, legs, blank] : [blank, top, middle, legs]
}

export const register: Register = on => {
  let isOn = false
  let lastCodeAt = Number.NEGATIVE_INFINITY

  // Un reinicio del módulo vuelve a disparar session.start: aquí se apaga lo que
  // haya quedado encendido y arranca el reloj que mueve los cuadros.
  on('session.start', async ($, e, next) => {
    isOn = false
    await update($, isDancing, () => false)

    $.clock.every(FRAME_MS, async () => {
      if (!isOn) return

      await update($, frame, n => ((n ?? 0) + 1) % POSES.length)
    })

    return next(e)
  })

  // Empieza a bailar cuando Claude empieza su turno, escriba lo que escriba.
  on('turn.start', async ($, e, next) => {
    isOn = true
    await update($, isDancing, () => true)

    return next(e)
  })

  // Se detiene al terminar el turno. Los turnos de los subagentes traen su
  // agentId y no cuentan: mientras ellos trabajan, el turno principal sigue.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      isOn = false
      await update($, isDancing, () => false)
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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // isWorking también protege de un baile atorado si un turno acabara sin avisar.
    if (e.props.hasSurvey || !e.props.isWorking || !(await read($, isDancing))) {
      return next(e)
    }

    const pose = POSES[(await read($, frame)) % POSES.length] ?? REST
    const [a, b, c, d] = lines(pose)
    const isCoding = (await $.clock.now()) - lastCodeAt < CODE_LABEL_MS
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box alignItems="center">
        <Box flexDirection="column">
          <Text color={ORANGE}>{a}</Text>
          <Text color={ORANGE}>{b}</Text>
          <Text color={ORANGE}>{c}</Text>
          <Text color={ORANGE}>{d}</Text>
        </Box>
        <Text dimColor> {pose.note} {isCoding ? 'programando…' : 'trabajando…'}</Text>
      </Box>
    )
  })
}
