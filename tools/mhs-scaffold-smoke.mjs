import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const docsRoot = join(process.cwd(), 'docs')
const scaffold = readFileSync(join(docsRoot, 'mhs-port-scaffold.md'), 'utf8')
const readiness = readFileSync(join(docsRoot, 'mhs-port-readiness.md'), 'utf8')

const requiredScaffoldTerms = [
  'scripts/',
  'Assets.ts',
  'Constants.ts',
  'Types.ts',
  'GameEvents.ts',
  'Rendering.ts',
  'AudioComponent.ts',
  'CanvasViewModel.ts',
  'GameComponent.ts',
  'xaml/',
  'game.xaml',
  '540 x 960',
  'DrawingSurface',
  'uiAction',
  'render-state-fixtures.json',
  'soundRequested',
  'musicRequested',
  'SaveState',
  'npm run smoke:port',
  'npm run smoke:assets',
  'npm run smoke:render-state',
  'npm run smoke:renderer',
  'npm run build',
]

for (const term of requiredScaffoldTerms) {
  assert.equal(scaffold.includes(term), true, `Missing scaffold term: ${term}`)
}

assert.equal(readiness.includes('mhs-port-scaffold.md'), true, 'Readiness notes should link to the scaffold')

console.log('MHS scaffold smoke passed')
