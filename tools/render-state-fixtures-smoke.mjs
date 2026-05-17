import assert from 'node:assert/strict'

import { buildRenderStateFixtures } from './render-state-fixtures.mjs'

const fixtures = buildRenderStateFixtures()
const expected = [
  'home',
  'levels',
  'leaderboard',
  'shop',
  'settings',
  'boostSelect',
  'runCountdown',
  'runPlaying',
  'runContinueOffer',
  'resultsComplete',
  'resultsFailed',
]

assert.deepEqual(Object.keys(fixtures), expected)

for (const [name, fixture] of Object.entries(fixtures)) {
  assert.equal(fixture.logicalWidth, 540, `${name} logical width`)
  assert.equal(fixture.logicalHeight, 960, `${name} logical height`)
  assert.equal(typeof fixture.screen, 'string', `${name} screen`)
  assert.doesNotThrow(() => JSON.stringify(fixture), `${name} is serializable`)
}

assert.equal(fixtures.levels.levels.stages.length, 5)
assert.equal(fixtures.leaderboard.leaderboard.rows.length, 10)
assert.equal(fixtures.shop.shop.cosmetics.length, 4)
assert.equal(fixtures.boostSelect.boostSelect.boosts.length, 2)
assert.equal(fixtures.runPlaying.runHud.targets.length, 3)
assert.equal(fixtures.runContinueOffer.runHud.continueOffer.remaining, 4)
assert.equal(fixtures.resultsComplete.results.medal.grade, 'A')
assert.equal(fixtures.resultsFailed.results.medal, null)

console.log('Render-state fixtures smoke passed')
