import type { TurnContext } from './turn-context.js'

export type NextTurn = () => Promise<void>

export type TurnMiddleware = (context: TurnContext, next: NextTurn) => Promise<void>

/**
 * Legacy alias for TurnMiddleware.
 */
export interface ITurnMiddleware {
  onTurnAsync(context: TurnContext, next: NextTurn): Promise<void>
}
