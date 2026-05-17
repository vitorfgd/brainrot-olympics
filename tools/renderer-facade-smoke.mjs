import assert from 'node:assert/strict'

import { createCanvasGameRenderer } from '../src/game/canvasRenderer.js'

const calls = []
const ctx = fakeContext(calls)
const images = {
  iconBack: { complete: true, naturalWidth: 64, naturalHeight: 64 },
}
const renderer = createCanvasGameRenderer(ctx, 540, 960, images)

renderer.clear()
renderer.push()
renderer.translate(12, 18)
renderer.scale(1.2, 1.2)
renderer.rotate(15)
renderer.setAlpha(0.5)
renderer.drawRect('#000', 0, 0, 540, 960)
renderer.drawCircle('#111', '#fff', 2, 24, 24, 12)
renderer.drawEllipse('#222', '#333', 3, 42, 44, 20, 10)
renderer.drawRoundedRect('#444', '#555', 4, 10, 20, 100, 40, 12)
renderer.drawLine('#666', 2, 0, 0, 10, 10)
renderer.drawImage('iconBack', 4, 6, 20, 20)
renderer.drawText('HELLO', 0, 0, 120, 40, {
  color: '#fff',
  strokeColor: '#000',
  strokeWidth: 2,
  fontSize: 24,
  fontWeight: 900,
  align: 'center',
})
renderer.pop()

assert.equal(calls.includes('clearRect'), true)
assert.equal(calls.includes('arc'), true)
assert.equal(calls.includes('ellipse'), true)
assert.equal(calls.includes('arcTo'), true)
assert.equal(calls.includes('drawImage'), true)
assert.equal(calls.includes('strokeText'), true)
assert.equal(calls.includes('fillText'), true)

console.log('Renderer facade smoke passed')

function fakeContext(calls) {
  return {
    globalAlpha: 1,
    clearRect: record('clearRect'),
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    scale: record('scale'),
    rotate: record('rotate'),
    fillRect: record('fillRect'),
    beginPath: record('beginPath'),
    arc: record('arc'),
    ellipse: record('ellipse'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    arcTo: record('arcTo'),
    closePath: record('closePath'),
    fill: record('fill'),
    stroke: record('stroke'),
    drawImage: record('drawImage'),
    fillText: record('fillText'),
    strokeText: record('strokeText'),
  }

  function record(name) {
    return () => {
      calls.push(name)
    }
  }
}
