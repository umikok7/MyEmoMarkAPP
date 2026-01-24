"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Lightbulb, TrendingUp } from "lucide-react"
import Link from "next/link"
import ReactECharts from 'echarts-for-react';
import { Button } from "@/components/ui/button"

export default function InsightsPage() {
  const [loading, setLoading] = React.useState(true)
  const [pieData, setPieData] = React.useState<any[]>([])
  const [trendData, setTrendData] = React.useState<{dates: string[], values: number[]}>({ dates: [], values: [] })
  const [insightText, setInsightText] = React.useState("")
  const [overviewHtml, setOverviewHtml] = React.useState("")

  React.useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('http://localhost/api/moods/analytics')
        if (!res.ok) throw new Error("Failed to fetch")
        const json = await res.json()
        /* 
          Expected Backend Response:
          {
            "pie_chart": [
              { "name": "Calm", "value": 14, "color": "#a8c3b4" },
              ...
            ],
            "line_chart": {
               "dates": ["Mon", "Tue", ...],
               "values": [40, 55, ...]
            },
            "insight_text": "You seem to feel more anxious mid-week...",
            "overview_html": "Your week has been mostly..."
          }
        */
        const data = json.data || {}
        setPieData(data.pie_chart || [])
        setTrendData(data.line_chart || { dates: [], values: [] })
        setInsightText(data.insight_text || "")
        setOverviewHtml(data.overview_html || "")

      } catch (err) {
         console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])
  
  // Chart 1: Emotion Distribution (Pie)
  const pieOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {d}%'
    },
    series: [
      {
        name: 'Emotions',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            color: '#5c5c5c'
          }
        },
        labelLine: {
          show: false
        },
        data: pieData
      }
    ]
  };

  // Chart 2: Intensity Trend (Line)
  const lineOption = {
    grid: {
      top: '15%',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#a3a3a3' }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#f0ebe6'
        }
      },
      axisLabel: { color: '#a3a3a3' }
    },
    series: [
      {
        name: 'Intensity',
        type: 'line',
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#d4b5b0'
        },
        areaStyle: {
          opacity: 0.3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
                offset: 0, color: '#d4b5b0' // 0% 
            }, {
                offset: 1, color: 'rgba(212, 181, 176, 0.1)' // 100% 
            }]
          }
        },
        showSymbol: false,
        data: trendData.values
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 pb-32 flex justify-center">
      <main className="w-full max-w-md">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-10 pt-4">
          <Link href="/">
             <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2">
               <ArrowLeft className="w-5 h-5 text-muted-foreground" />
             </Button>
          </Link>
          <h1 className="text-2xl font-normal text-foreground tracking-wide">
            Weekly Insights
          </h1>
        </header>

        <div className="space-y-8">
          
          {/* Summary Text */}
          <section className="space-y-2 mb-8">
             <div className="flex items-center gap-2 mb-1">
               <TrendingUp className="w-4 h-4 text-primary" />
               <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Overview</h2>
             </div>
            {loading ? (
              <div className="text-sm text-muted-foreground/40 animate-pulse">Loading...</div>
            ) : (
              overviewHtml && (
                <div className="text-xl font-light leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: overviewHtml }} />
              )
            )}
          </section>

          {/* Emotion Distribution */}
          <Card className="border-none shadow-sm bg-white p-6 rounded-[2rem]">
            <h3 className="text-sm font-medium text-center mb-2 text-muted-foreground">Emotion Balance</h3>
            <div className="h-[250px] w-full">
               <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} showLoading={loading} />
            </div>
          </Card>

          {/* Mood Trend */}
          <Card className="border-none shadow-sm bg-white p-6 rounded-[2rem]">
            <h3 className="text-sm font-medium text-center mb-4 text-muted-foreground">Energy Flow</h3>
            <div className="h-[200px] w-full">
               <ReactECharts option={lineOption} style={{ height: '100%', width: '100%' }} showLoading={loading} />
            </div>
          </Card>

          {/* Insight Card */}
          <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-[2rem] border border-primary/10">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-primary">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Suggestion</h4>
                {loading ? (
                  <div className="text-sm text-muted-foreground/40 animate-pulse">Loading...</div>
                ) : (
                  insightText && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {insightText}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
