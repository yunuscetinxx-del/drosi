#!/usr/bin/env node
// يشغّل خادم Drosi محلياً، وينتظر جاهزيته، ثم يفتح الموقع تلقائياً في المتصفح.
// يُستدعى من اختصار سطح المكتب (scripts/Start-Drosi.bat).

import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const PORT = process.env.PORT || "3000"
const SERVER_URL = `http://localhost:${PORT}`
const isWindows = process.platform === "win32"
const OLLAMA_URL = "http://127.0.0.1:11434/api/tags"

function openBrowser(url) {
  if (isWindows) {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref()
  } else if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref()
  } else {
    spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref()
  }
}

async function waitForServer(url, maxAttempts = 90) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(url)
      return true
    } catch {
      /* الخادم لم يجهز بعد */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

async function ensureOllama() {
  try {
    const response = await fetch(OLLAMA_URL, { signal: AbortSignal.timeout(700) })
    if (response.ok) {
      console.log("[drosi] Ollama المحلي جاهز.")
      return
    }
  } catch {
    /* Start the local service below. */
  }

  const localOllama = isWindows
    ? path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe")
    : "ollama"
  console.log("[drosi] جارٍ تشغيل Ollama المحلي...")
  try {
    const ollama = spawn(localOllama, ["serve"], {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    })
    ollama.unref()
  } catch {
    console.log("[drosi] لم يُعثر على Ollama. ستعمل ميزات الذكاء عند تشغيله لاحقاً.")
  }
}

console.log("========================================")
console.log("  Drosi — تشغيل الموقع محلياً")
console.log("========================================")
console.log(`[drosi] جارٍ تشغيل الخادم على ${SERVER_URL} ...`)

void ensureOllama()

// على ويندوز: npm هو ملف npm.cmd، ويحتاج shell:true لتفادي خطأ "spawn EINVAL"
// عند التشغيل من اختصار سطح المكتب. نمرّر الأمر كسلسلة نصية واحدة مع shell:true
// لتفادي أيضاً تحذير Node بخصوص خلط args[] مع shell:true.
const child = isWindows
  ? spawn("npm.cmd run dev", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: true,
    })
  : spawn("npm", ["run", "dev"], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    })

child.on("exit", (code) => {
  process.exit(code ?? 0)
})

void (async () => {
  const ready = await waitForServer(SERVER_URL)
  if (ready) {
    console.log(`[drosi] الخادم جاهز — يتم فتح ${SERVER_URL} في المتصفح...`)
    openBrowser(SERVER_URL)
  } else {
    console.log(`[drosi] لم يستجب الخادم بعد. افتح الموقع يدوياً: ${SERVER_URL}`)
  }
})()
