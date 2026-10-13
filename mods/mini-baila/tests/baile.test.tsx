import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const band = (props: { hasSurvey?: boolean; isWorking?: boolean } = {}) =>
  ({
    plugin: 'mini-baila',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey: props.hasSurvey ?? false,
      isWorking: props.isWorking ?? true,
      maxRows: 12,
      bodyColumns: 80,
      scroll: { offset: 0, bodyRows: 12 },
      view: {},
    },
  }) as const

const DANCING = /programando|trabajando/

// El motor, bajo el mod: contesta cada evento sin hacer nada de verdad.
function engine(on: On) {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ deny: 'solo prueba' }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>motor</Text>
  })
}

const start = { cwd: '/tmp', surface: 'terminal', isInteractive: true } as const
const turn = { text: 'hola', turnId: 't1' }
const done = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

test('baila durante todo el turno, escriba código o texto, y para al terminar', async ($, on) => {
  const clock = mock.clock(on)
  engine(on)
  await $.session.start(start)

  // Sin turno en marcha no hay baile.
  const idle = await $.ui.mount(band())
  expect(await idle.find({ type: 'Text', text: DANCING })).toBeUndefined()
  await idle.unmount()

  // Empieza el turno, aunque todavía no escriba nada en archivos: baila.
  await $.turn.start(turn)
  const first = await $.ui.mount(band())
  expect(await first.find({ type: 'Text', text: /trabajando/ })).toBeDefined()
  const before = (await first.findAll({ type: 'Text' })).map(t => t.text).join('|')
  await first.unmount()

  // El reloj corre y la figura cambia de cuadro.
  await clock.advance(200)
  const second = await $.ui.mount(band())
  const after = (await second.findAll({ type: 'Text' })).map(t => t.text).join('|')
  expect(after).not.toBe(before)
  await second.unmount()

  // Al editar un archivo, el letrero pasa a "programando".
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.ts', old_string: 'a', new_string: 'b' })
  const coding = await $.ui.mount(band())
  expect(await coding.find({ type: 'Text', text: /programando/ })).toBeDefined()
  await coding.unmount()

  // Pasados unos segundos sin editar, vuelve a "trabajando".
  await clock.advance(6000)
  const calm = await $.ui.mount(band())
  expect(await calm.find({ type: 'Text', text: /trabajando/ })).toBeDefined()
  await calm.unmount()

  // Termina el turno: se queda quieto.
  await $.turn.complete(done)
  const over = await $.ui.mount(band())
  expect(await over.find({ type: 'Text', text: DANCING })).toBeUndefined()
  await over.unmount()
})

test('leer un archivo no cambia el letrero a "programando"', async ($, on) => {
  mock.clock(on)
  engine(on)
  await $.session.start(start)
  await $.turn.start(turn)
  await $.tool.call({ tool: 'Read', file_path: '/tmp/a.ts' })

  const ui = await $.ui.mount(band())
  expect(await ui.find({ type: 'Text', text: /trabajando/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /programando/ })).toBeUndefined()
  await ui.unmount()
})

test('un subagente que termina no apaga el baile del turno principal', async ($, on) => {
  mock.clock(on)
  engine(on)
  await $.session.start(start)
  await $.turn.start(turn)
  await $.turn.complete({ ...done, agentId: 'sub-1' })

  const ui = await $.ui.mount(band())
  expect(await ui.find({ type: 'Text', text: DANCING })).toBeDefined()
  await ui.unmount()
})

test('un cuestionario abierto o un turno inactivo tienen prioridad sobre el baile', async ($, on) => {
  mock.clock(on)
  engine(on)
  await $.session.start(start)
  await $.turn.start(turn)

  const survey = await $.ui.mount(band({ hasSurvey: true }))
  expect(await survey.find({ type: 'Text', text: DANCING })).toBeUndefined()
  await survey.unmount()

  const notWorking = await $.ui.mount(band({ isWorking: false }))
  expect(await notWorking.find({ type: 'Text', text: DANCING })).toBeUndefined()
  await notWorking.unmount()
})

test('también baila en la app de escritorio', async ($, on) => {
  mock.clock(on)
  engine(on)
  await $.session.start({ ...start, surface: 'desktop' })
  await $.turn.start(turn)

  const ui = await $.ui.mount({ ...band(), surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: DANCING })).toBeDefined()
  await ui.unmount()
})

const pane = (surface: 'mobile' | 'desktop' | 'terminal') =>
  ({
    plugin: 'mini-baila',
    surface,
    component: 'Pane',
    requestId: 'baila',
    props: { title: 'Mini Claude', isFocused: false, bodyColumns: 40, placement: 'inline', scroll: { offset: 0, bodyRows: 8 }, view: {} },
  }) as const

test('en el celular el baile es un dibujo vectorial dentro del panel', async ($, on) => {
  mock.clock(on)
  engine(on)
  await $.session.start({ ...start, surface: 'mobile' })
  await $.turn.start(turn)

  const ui = await $.ui.mount(pane('mobile'))
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: DANCING })).toBeDefined()
  await ui.unmount()
})

test('el dibujo del celular cambia de cuadro con el reloj', async ($, on) => {
  const clock = mock.clock(on)
  engine(on)
  await $.session.start({ ...start, surface: 'mobile' })
  await $.turn.start(turn)

  const first = await $.ui.mount(pane('mobile'))
  const before = JSON.stringify(await first.find({ type: 'Svg' }))
  await first.unmount()

  await clock.advance(200)
  const second = await $.ui.mount(pane('mobile'))
  const after = JSON.stringify(await second.find({ type: 'Svg' }))
  await second.unmount()

  expect(after).not.toBe(before)
})

test('sin turno en marcha el panel del celular no dibuja nada', async ($, on) => {
  mock.clock(on)
  engine(on)
  await $.session.start({ ...start, surface: 'mobile' })

  const ui = await $.ui.mount(pane('mobile'))
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})

test('la terminal nunca deja el panel vacío: dibuja la figura de bloques', async ($, on) => {
  mock.clock(on)
  engine(on)
  await $.session.start(start)
  await $.turn.start(turn)

  const ui = await $.ui.mount(pane('terminal'))
  expect(await ui.find({ type: 'Text', text: DANCING })).toBeDefined()
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})
