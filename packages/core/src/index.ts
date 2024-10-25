import { v4 } from 'uuid'

export function getRandomGuid (): string {
  return v4()
}
