import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')
const tailwindConfig = readFileSync(
  resolve(process.cwd(), 'tailwind.config.ts'),
  'utf8'
)
const hslTokens = [...tailwindConfig.matchAll(/hsl\(var\(--([\w-]+)\)\)/g)].map(
  (match) => match[1]
)
const rootTokens = new Map<string, string>()

postcss.parse(css).walkRules(':root', (rule) => {
  rule.walkDecls(/^--/, (declaration) => {
    rootTokens.set(declaration.prop.slice(2), declaration.value)
  })
})

describe('Tailwind color tokens', () => {
  it('defines every HSL token as valid HSL channels in the root stylesheet', () => {
    expect(hslTokens.length).toBeGreaterThan(0)

    for (const token of hslTokens) {
      const value = rootTokens.get(token)
      expect(value, `Missing CSS variable --${token}`).toBeDefined()
      expect(value, `--${token} must use HSL channels`).toMatch(
        /^-?\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/
      )
    }
  })
})
