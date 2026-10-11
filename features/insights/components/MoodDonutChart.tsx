"use client"

import ReactECharts from "echarts-for-react"
import type { DonutSlice } from "../api"

interface MoodDonutChartProps {
  data: DonutSlice[]
  isLoading: boolean
}

export function MoodDonutChart({ data, isLoading }: MoodDonutChartProps) {
  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#f0ebe6",
      borderWidth: 1,
      textStyle: { color: "#5c5c5c", fontSize: 12 },
    },
    legend: { show: false },
    series: [
      {
        name: "Moods",
        type: "pie",
        radius: ["55%", "85%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: "#fffdfa", borderWidth: 3 },
        label: { show: false },
        emphasis: {
          scale: false,
          label: { show: true, fontSize: 14, fontWeight: "normal", color: "#5c5c5c" },
        },
        labelLine: { show: false },
        data,
      },
    ],
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0 w-28 h-28">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground/40">...</span>
          </div>
        ) : (
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
        )}
      </div>

      <div className="flex-1 space-y-1.5">
        {data.slice(0, 4).map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-foreground/70 font-light flex-1">{item.name}</span>
            <span className="text-xs text-muted-foreground font-light">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
