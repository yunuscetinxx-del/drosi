/** تصدير عنصر SVG إلى ملف PNG */
export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  viewBox?: { x: number; y: number; w: number; h: number }
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const vb = viewBox ?? { x: 0, y: 0, w: 1400, h: 808 }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(Math.round(vb.w)))
  clone.setAttribute("height", String(Math.round(vb.h)))
  clone.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`)

  const svgData = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("svg load failed"))
      image.src = url
    })

    const canvas = document.createElement("canvas")
    const scale = 2
    canvas.width = Math.round(vb.w * scale)
    canvas.height = Math.round(vb.h * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    )
    if (!pngBlob) return

    const a = document.createElement("a")
    a.href = URL.createObjectURL(pngBlob)
    a.download = filename.endsWith(".png") ? filename : `${filename}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  } finally {
    URL.revokeObjectURL(url)
  }
}
