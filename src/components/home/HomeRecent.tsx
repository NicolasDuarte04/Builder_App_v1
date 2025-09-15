'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'

export default function HomeRecent() {
  const { t } = useTranslation()

  const handleDemoClick = () => {
    // Fire HOME_SAMPLE_POLICY_CLICKED event
    const event = new CustomEvent('HOME_SAMPLE_POLICY_CLICKED', {
      detail: { sampleId: 'demo-policy-001' }
    })
    window.dispatchEvent(event)
  }

  return (
    <Card className="rounded-xl border shadow-sm dark:bg-neutral-950 dark:border-neutral-800">
      <CardHeader className="p-5 md:p-6 pb-3 md:pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>{t('home.recent.title')}</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleDemoClick}
            className="text-sm text-briki-600 hover:text-briki-700"
          >
            {t('home.recent.explore_demo')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 md:p-6 pt-0 text-center">
        <div className="flex justify-center mb-4">
          <Activity className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <h3 className="font-semibold mb-2 text-foreground">{t('home.recent.empty_title')}</h3>
        <p className="text-muted-foreground mb-6">{t('home.recent.empty_body')}</p>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={handleDemoClick}
        >
          {t('home.recent.explore_demo')}
        </Button>
      </CardContent>
    </Card>
  )
}
