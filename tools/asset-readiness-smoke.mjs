import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { AssetIds } from '../src/game/assetIds.js'
import {
  IMAGE_ASSET_PATHS,
  JUDGE_IMAGE_PATHS_BY_ID,
  MENU_MUSIC_ASSET_PATHS,
  MUSIC_ASSET_PATHS_BY_ID,
  SFX_ASSET_PATHS,
  STAGE_PORTRAIT_PATHS_BY_ID,
} from '../src/game/assetPaths.js'

const publicRoot = join(process.cwd(), 'public')

assertCoversIds('image', Object.values(AssetIds.images), IMAGE_ASSET_PATHS)
assertCoversIds('sfx', Object.values(AssetIds.sfx), SFX_ASSET_PATHS)
assertCoversIds('music', Object.values(AssetIds.music), MUSIC_ASSET_PATHS_BY_ID)
assertCoversIds('judge image', Object.values(AssetIds.judges), JUDGE_IMAGE_PATHS_BY_ID)
assertCoversIds('stage portrait', Object.values(AssetIds.stagePortraits), STAGE_PORTRAIT_PATHS_BY_ID)

assertFilesExist('image', IMAGE_ASSET_PATHS)
assertFilesExist('sfx', SFX_ASSET_PATHS)
assertFilesExist('music', MUSIC_ASSET_PATHS_BY_ID)
assertFilesExist('judge image', JUDGE_IMAGE_PATHS_BY_ID)
assertFilesExist('stage portrait', STAGE_PORTRAIT_PATHS_BY_ID)

for (const path of MENU_MUSIC_ASSET_PATHS) {
  assert.equal(existsSync(join(publicRoot, path)), true, `Missing menu music file: public/${path}`)
}

console.log('Asset-readiness smoke passed')

function assertCoversIds(label, ids, paths) {
  for (const id of ids) {
    assert.equal(typeof paths[id], 'string', `Missing ${label} asset path for id: ${id}`)
  }
}

function assertFilesExist(label, paths) {
  for (const [id, path] of Object.entries(paths)) {
    assert.equal(existsSync(join(publicRoot, path)), true, `Missing ${label} asset file for ${id}: public/${path}`)
  }
}
