#!/usr/bin/env node
// يحوّل public/apple-icon.png إلى public/app-icon.ico لاستخدامه كأيقونة اختصار سطح المكتب.
// PNG الحديثة (Vista+) مدعومة مباشرة داخل حاوية ICO دون الحاجة لإعادة ترميز البكسلات.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const srcPath = path.join(root, "public", "apple-icon.png")
const destPath = path.join(root, "public", "app-icon.ico")

const png = fs.readFileSync(srcPath)

// أبعاد الصورة من IHDR: التوقيع (8 بايت) + طول (4) + "IHDR" (4) + width(4) + height(4)
const width = png.readUInt32BE(16)
const height = png.readUInt32BE(20)

const iconDir = Buffer.alloc(6)
iconDir.writeUInt16LE(0, 0) // reserved
iconDir.writeUInt16LE(1, 2) // type: 1 = icon
iconDir.writeUInt16LE(1, 4) // count: صورة واحدة

const entry = Buffer.alloc(16)
entry.writeUInt8(width >= 256 ? 0 : width, 0)
entry.writeUInt8(height >= 256 ? 0 : height, 1)
entry.writeUInt8(0, 2) // colorCount
entry.writeUInt8(0, 3) // reserved
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bitCount
entry.writeUInt32LE(png.byteLength, 8) // bytesInRes
entry.writeUInt32LE(22, 12) // imageOffset (6 + 16)

fs.writeFileSync(destPath, Buffer.concat([iconDir, entry, png]))
console.log(`[icon] تم إنشاء ${destPath} (${width}x${height})`)
