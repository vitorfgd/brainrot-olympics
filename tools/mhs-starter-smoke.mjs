import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), 'mhs-starter')

const requiredPaths = [
  'README.md',
  'scripts/Constants.ts',
  'scripts/Types.ts',
  'scripts/Assets.ts',
  'scripts/GameEvents.ts',
  'scripts/Rendering.ts',
  'scripts/CanvasViewModel.ts',
  'scripts/AudioComponent.ts',
  'scripts/GameComponent.ts',
  'sprites/.gitkeep',
  'sprites/ui/.gitkeep',
  'sprites/icons/.gitkeep',
  'sprites/characters/.gitkeep',
  'assets/sounds/.gitkeep',
  'xaml/game.xaml',
]

for (const path of requiredPaths) {
  assert.equal(existsSync(join(root, path)), true, `Missing mhs-starter/${path}`)
}

const combined = [
  'README.md',
  'scripts/Constants.ts',
  'scripts/Types.ts',
  'scripts/Assets.ts',
  'scripts/GameEvents.ts',
  'scripts/Rendering.ts',
  'scripts/CanvasViewModel.ts',
  'scripts/AudioComponent.ts',
  'scripts/GameComponent.ts',
  'xaml/game.xaml',
].map((path) => readFileSync(join(root, path), 'utf8')).join('\n')

const requiredTerms = [
  'RenderState',
  'GameInputCommand',
  'GameEvent',
  'DrawingSurface',
  '540',
  '960',
  'uiAction',
  'AssetId',
  'SaveState',
  'rect',
  'roundedRect',
  'circle',
  'ellipse',
  'line',
  'image',
  'text',
  'push',
  'pop',
]

for (const term of requiredTerms) {
  assert.equal(combined.includes(term), true, `Missing starter contract term: ${term}`)
}

console.log('MHS starter smoke passed')
