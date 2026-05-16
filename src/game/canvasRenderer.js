export function createCanvasGameRenderer(ctx, width, height, images = {}) {
  return {
    clear() {
      ctx.clearRect(0, 0, width, height)
    },
    pushTranslate(x, y) {
      ctx.save()
      ctx.translate(x, y)
    },
    pushScale(scaleX, scaleY, originX = 0, originY = 0) {
      ctx.save()
      ctx.translate(originX, originY)
      ctx.scale(scaleX, scaleY)
      ctx.translate(-originX, -originY)
    },
    pushRotate(degrees, originX = 0, originY = 0) {
      ctx.save()
      ctx.translate(originX, originY)
      ctx.rotate((degrees * Math.PI) / 180)
      ctx.translate(-originX, -originY)
    },
    pop() {
      ctx.restore()
    },
    drawRect(color, x, y, widthValue, heightValue) {
      ctx.fillStyle = color
      ctx.fillRect(x, y, widthValue, heightValue)
    },
    drawEllipse(color, centerX, centerY, radiusX, radiusY) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
      ctx.fill()
    },
    drawRoundedRect(fillColor, strokeColor, lineWidth, x, y, widthValue, heightValue, radius) {
      roundedRectPath(ctx, x, y, widthValue, heightValue, radius)
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      if (strokeColor && lineWidth > 0) {
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = lineWidth
        ctx.stroke()
      }
    },
    drawLine(color, lineWidth, x1, y1, x2, y2) {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    },
    drawImage(imageId, x, y, widthValue, heightValue) {
      const image = images[imageId]
      if (!image) return
      ctx.drawImage(image, x, y, widthValue, heightValue)
    },
    drawText(text, x, y, widthValue, heightValue, style = {}) {
      ctx.fillStyle = style.color || '#ffffff'
      ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || 16}px ${style.fontFamily || 'Arial'}`
      ctx.textAlign = style.align || 'left'
      ctx.textBaseline = 'middle'
      const tx = style.align === 'center' ? x + widthValue / 2 : style.align === 'right' ? x + widthValue : x
      ctx.fillText(text, tx, y + heightValue / 2, widthValue)
    },
  }
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}
