import { FileText, Notebook, Upload, FileEdit } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { telemetry } from "@/lib/telemetry"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect } from "react"

export function GettingStarted() {
  const { t } = useTranslation()
  const router = useRouter()

  useEffect(() => {
    telemetry.track(telemetry.events.HOME_SEGMENT_CARD_VIEWED, { card: "analyze" })
    telemetry.track(telemetry.events.HOME_SEGMENT_CARD_VIEWED, { card: "brief" })
  }, [])

  const handlePDFClick = () => {
    telemetry.track(telemetry.events.HOME_CTA_UPLOAD_CLICKED)
    router.push("/assistant?openUpload=true")
  }

  const handleBriefClick = () => {
    telemetry.track(telemetry.events.HOME_CTA_BRIEF_CLICKED)
    router.push("/assistant")
  }

  const handleDemoClick = () => {
    telemetry.track(telemetry.events.HOME_CTA_DEMO_CLICKED)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Analyze Policy Card */}
      <Card className="rounded-xl">
        <CardContent className="p-5 space-y-3">
          {/* Eyebrow label */}
          <p className="text-xs text-muted-foreground">
            {t('home.actions.cards.analyze.eyebrow')}
          </p>
          
          {/* Title */}
          <h3 className="text-lg font-semibold">
            {t('home.actions.cards.analyze.question')}
          </h3>
          
          {/* Helper text */}
          <p className="text-sm text-muted-foreground">
            {t('home.actions.cards.analyze.helper')}
          </p>
          
          {/* CTA Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePDFClick}
            aria-label="Analyze policy PDF - Upload and extract coverage details from insurance policy documents"
            tabIndex={3}
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('home.actions.upload_pdf')}
          </Button>
          
          {/* Secondary links */}
          <div className="space-y-1">
            <button
              type="button"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={handlePDFClick}
              aria-label="Drag and drop a PDF - Alternative way to upload policy documents"
            >
              {t('home.actions.cards.analyze.secondary.drop')}
            </button>
            <button
              type="button"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleDemoClick}
              aria-label="Explore demo - See how policy analysis works"
            >
              {t('home.actions.cards.analyze.secondary.demo')}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Start Brief Card */}
      <Card className="rounded-xl">
        <CardContent className="p-5 space-y-3">
          {/* Eyebrow label */}
          <p className="text-xs text-muted-foreground">
            {t('home.actions.cards.brief.eyebrow')}
          </p>
          
          {/* Title */}
          <h3 className="text-lg font-semibold">
            {t('home.actions.cards.brief.question')}
          </h3>
          
          {/* Helper text */}
          <p className="text-sm text-muted-foreground">
            {t('home.actions.cards.brief.helper')}
          </p>
          
          {/* CTA Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleBriefClick}
            aria-label="Start a new brief - Create a new insurance project from scratch"
            tabIndex={4}
          >
            <FileEdit className="w-4 h-4 mr-2" />
            {t('home.actions.new_brief')}
          </Button>
          
          {/* Secondary links */}
          <div className="space-y-1">
            <button
              type="button"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleBriefClick}
              aria-label="Start with a template - Begin with a pre-filled brief template"
            >
              {t('home.actions.cards.brief.secondary.template')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
