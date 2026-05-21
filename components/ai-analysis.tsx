"use client"

import { useState } from "react"
import { Lesson, MindMapNode } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  Brain,
  Target,
  Lightbulb,
  Clock,
  TrendingUp,
  BookMarked,
  Network,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react"

const MODELS = {
  "x-ai/grok-3-mini": { name: "Grok 3 Mini", description: "سريع وقوي للتحليل التعليمي" },
  "nvidia/llama-nemotron-embed-vl-1b-v2:free": { name: "Llama Nemotron", description: "نموذج متقدم للفهم العميق" },
} as const

interface AIAnalysis {
  difficulty: string
  difficultyScore: number
  completeness: number
  strengths: string[]
  improvements: string[]
  studyTips: string[]
  relatedTopics: string[]
  estimatedStudyTime: string
  mindMapSuggestions: string[]
  summary: string
}

interface AIAnalysisProps {
  lesson: Lesson
  onAddMindMapNodes?: (nodes: Omit<MindMapNode, "id">[]) => void
}

const NODE_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
]

function ScoreRing({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function DifficultyBar({ score }: { score: number }) {
  const color = score <= 3 ? "#10b981" : score <= 6 ? "#f59e0b" : "#ef4444"
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>مستوى الصعوبة</span>
        <span style={{ color }}>{score}/10</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score * 10}%`, background: color }}
        />
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  color,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType
  title: string
  color: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="bg-card border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "22" }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 px-4 pb-4">{children}</CardContent>}
    </Card>
  )
}

export function AIAnalysis({ lesson, onAddMindMapNodes }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedToMap, setAddedToMap] = useState(false)
  const [selectedModel, setSelectedModel] = useState<keyof typeof MODELS>("x-ai/grok-3-mini")

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setAddedToMap(false)
    try {
      const res = await fetch("/api/analyze-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson, model: selectedModel }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? "حدث خطأ غير متوقع")
        return
      }
      setAnalysis(data.analysis)
    } catch {
      setError("تعذّر الاتصال بالخادم")
    } finally {
      setLoading(false)
    }
  }

  const handleAddToMindMap = () => {
    if (!analysis || !onAddMindMapNodes) return
    const centerX = 400 + (Math.random() - 0.5) * 100
    const centerY = 260 + (Math.random() - 0.5) * 60
    const nodes = analysis.mindMapSuggestions.map((text, i) => {
      const angle = (i / analysis.mindMapSuggestions.length) * Math.PI * 2
      return {
        text,
        x: centerX + Math.cos(angle) * 180,
        y: centerY + Math.sin(angle) * 120,
        parentId: null,
        color: NODE_COLORS[i % NODE_COLORS.length],
      }
    })
    onAddMindMapNodes(nodes)
    setAddedToMap(true)
  }

  const difficultyColor =
    analysis?.difficultyScore != null
      ? analysis.difficultyScore <= 3 ? "#10b981"
      : analysis.difficultyScore <= 6 ? "#f59e0b"
      : "#ef4444"
      : "#3b82f6"

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="border-border overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)/0.4) 100%)" }}>
        <CardContent className="p-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold">تحليل الذكاء الاصطناعي</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اختر النموذج وقم بتحليل شامل للدرس
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className="gap-2 shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {analysis ? "إعادة التحليل" : "تحليل الدرس"}
                  </>
                )}
              </Button>
            </div>
            
            {/* Model selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">اختر النموذج</label>
              <div className="flex gap-2 flex-col sm:flex-row sm:items-end">
                <Select value={selectedModel} onValueChange={(val) => setSelectedModel(val as keyof typeof MODELS)}>
                  <SelectTrigger className="w-full sm:flex-1 bg-background/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODELS).map(([key, model]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="w-fit text-xs">
                  {MODELS[selectedModel].name}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">خطأ في التحليل</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                تأكد من إضافة متغير البيئة <code className="bg-secondary px-1 rounded">OPENROUTER_API_KEY</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-3">
          {/* Scores row */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-around flex-wrap gap-4">
                <ScoreRing value={analysis.completeness} color="#3b82f6" label="اكتمال الدرس" />
                <ScoreRing value={analysis.difficultyScore * 10} color={difficultyColor} label="مستوى الصعوبة" />
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#f59e0b22", border: "3px solid #f59e0b" }}>
                    <Clock className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="text-xs text-muted-foreground text-center max-w-[80px]">{analysis.estimatedStudyTime}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge
                    className="px-3 py-1.5 text-sm font-bold"
                    style={{ background: difficultyColor + "22", color: difficultyColor, border: `1px solid ${difficultyColor}55` }}
                  >
                    {analysis.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">مستوى الدرس</span>
                </div>
              </div>
              <div className="mt-4">
                <DifficultyBar score={analysis.difficultyScore} />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-violet-400" />
                <span className="font-semibold text-sm">ملخص تحليلي</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Section icon={CheckCircle2} title="نقاط القوة" color="#10b981">
            <ul className="space-y-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 text-xs mt-0.5">{i + 1}</span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Improvements */}
          <Section icon={ArrowUpRight} title="اقتراحات التحسين" color="#f59e0b">
            <ul className="space-y-2">
              {analysis.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 text-xs mt-0.5">{i + 1}</span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Study tips */}
          <Section icon={Lightbulb} title="نصائح الدراسة" color="#3b82f6">
            <ul className="space-y-2">
              {analysis.studyTips.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 text-xs mt-0.5">{i + 1}</span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Related topics */}
          <Section icon={BookMarked} title="مواضيع مرتبطة" color="#8b5cf6" defaultOpen={false}>
            <div className="flex flex-wrap gap-2">
              {analysis.relatedTopics.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </Section>

          {/* Mind map suggestions */}
          <Section icon={Network} title="اقتراحات للخريطة الذهنية" color="#06b6d4" defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {analysis.mindMapSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: NODE_COLORS[i % NODE_COLORS.length] + "55", background: NODE_COLORS[i % NODE_COLORS.length] + "11", color: NODE_COLORS[i % NODE_COLORS.length] }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: NODE_COLORS[i % NODE_COLORS.length] }} />
                    {s}
                  </div>
                ))}
              </div>
              {onAddMindMapNodes && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 mt-2"
                  onClick={handleAddToMindMap}
                  disabled={addedToMap}
                >
                  {addedToMap ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      تمت الإضافة إلى الخريطة
                    </>
                  ) : (
                    <>
                      <Network className="w-4 h-4" />
                      إضافة إلى الخريطة الذهنية
                    </>
                  )}
                </Button>
              )}
            </div>
          </Section>
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-violet-400" />
          </div>
          <p className="text-muted-foreground text-sm">اضغط على "تحليل الدرس" للحصول على تحليل شامل بالذكاء الاصطناعي</p>
          <p className="text-xs text-muted-foreground/60">يتضمن: مستوى الصعوبة، نقاط القوة، اقتراحات التحسين، ونصائح الدراسة</p>
        </div>
      )}
    </div>
  )
}
