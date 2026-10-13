/** Un cuadro del baile: del 0 al 3. */
export type BaileFrame = number

declare module 'claude-code' {
  interface PluginState {
    // frame: en qué cuadro del baile va. isDancing: si la banda debe mostrarse.
    'mini-baila': { frame: BaileFrame; isDancing: boolean }
  }
}
