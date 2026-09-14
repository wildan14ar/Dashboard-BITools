"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { Layout } from "react-grid-layout"
import {
  useCreatePanel,
  useDashboard,
  useDeletePanel,
  useReorderPanels,
  useUpdatePanel,
} from "@/hooks/use-dashboards"
import { useDatasets } from "@/hooks/use-datasets"
import api from "@/lib/api"

export type PreviewData = { columns: string[]; rows: { values: string[] }[] }
export type PanelFilter = {
  column: string
  type: "date_range" | "enum"
  from?: string
  to?: string
  value?: string
}
export type PanelEditor = ReturnType<typeof usePanelEditor>

export function usePanelEditor(id: string) {
  const router = useRouter()
  const { data: dashboard, isLoading } = useDashboard(id)
  const { data: datasets = [] } = useDatasets()
  const createPanel = useCreatePanel(id)
  const updatePanel = useUpdatePanel(id)
  const deletePanel = useDeletePanel(id)
  const reorder = useReorderPanels(id)
  const [layout, setLayout] = useState<Layout | undefined>(undefined)
  const [dirty, setDirty] = useState(false)

  const [datasetId, setDatasetId] = useState("")
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
  const [chartType, setChartType] = useState("text")
  const [panelTitle, setPanelTitle] = useState("")
  const [xColumn, setXColumn] = useState(0)
  const [yColumn, setYColumn] = useState(0)
  const [yAgg, setYAgg] = useState("sum")
  const [panelText, setPanelText] = useState("")
  const [panelTextLevel, setPanelTextLevel] = useState("p")
  const [panelTextColor, setPanelTextColor] = useState("")
  const [panelTextAlign, setPanelTextAlign] = useState("left")
  const [panelTextVAlign, setPanelTextVAlign] = useState("top")
  const [panelPadding, setPanelPadding] = useState(8)
  const [pieMode, setPieMode] = useState("donut")
  const [donutThickness, setDonutThickness] = useState(45)
  const [lineFill, setLineFill] = useState(false)
  const [barOrientation, setBarOrientation] = useState<"vertical" | "horizontal">("vertical")
  const [titlePosition, setTitlePosition] = useState<"none" | "top" | "bottom">("top")
  const [titleAlign, setTitleAlign] = useState<"left" | "center" | "right">("left")
  const [titleBold, setTitleBold] = useState(false)
  const [titleItalic, setTitleItalic] = useState(false)
  const [titleStrikethrough, setTitleStrikethrough] = useState(false)
  const [titleColor, setTitleColor] = useState("")
  const [titleSize, setTitleSize] = useState(12)
  const [columns, setColumns] = useState<string[]>([])
  const [tableColumns, setTableColumns] = useState<number[]>([])
  const [tableScroll, setTableScroll] = useState<"vertical" | "horizontal">("vertical")
  const [tableMode, setTableMode] = useState<"plain" | "pivot">("pivot")
  const [pivotRowCol, setPivotRowCol] = useState(0)
  const [pivotColCol, setPivotColCol] = useState(1)
  const [pivotValueCol, setPivotValueCol] = useState(2)
  const [pivotAgg, setPivotAgg] = useState("sum")
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [filters, setFilters] = useState<PanelFilter[]>([])
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set())
  const [datasetColumns, setDatasetColumns] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (chartType === "table" && columns.length > 0 && tableColumns.length === 0) {
      setTableColumns(columns.map((_: string, i: number) => i))
    }
  }, [chartType, columns, tableColumns])

  useEffect(() => {
    if (!datasetId) {
      setColumns([])
      setPreviewData(null)
      return
    }
    let cancelled = false
    setColumnsLoading(true)
    api
      .post<PreviewData>(`/datasets/${datasetId}/run`, {})
      .then((res) => {
        const data = res.data
        if (!cancelled && data?.columns) {
          setColumns(data.columns)
          setPreviewData(data)
          if (chartType === "table") setTableColumns(data.columns.map((_: string, i: number) => i))
        }
      })
      .finally(() => {
        if (!cancelled) setColumnsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [datasetId])

  function toggleDatasetExpand(dsId: string) {
    setExpandedDatasets((prev) => {
      const next = new Set(prev)
      if (next.has(dsId)) {
        next.delete(dsId)
        return next
      }
      next.add(dsId)
      if (!datasetColumns[dsId]) {
        api.post<{ columns: string[] }>(`/datasets/${dsId}/run`, {}).then((res) => {
          const data = res.data
          if (data?.columns) setDatasetColumns((p) => ({ ...p, [dsId]: data.columns }))
        })
      }
      return next
    })
  }

  const selectedDataset = datasets.find((d) => d.id === datasetId)

  useEffect(() => {
    if (selectedDataset && !panelTitle) setPanelTitle(selectedDataset.name)
  }, [selectedDataset, panelTitle])

  function resetEditor() {
    setEditingPanelId(null)
    setDatasetId("")
    setPanelTitle("")
    setPanelText("")
    setPanelTextLevel("p")
    setPanelTextColor("")
    setPanelTextAlign("left")
    setPanelTextVAlign("top")
    setColumns([])
    setPanelPadding(8)
    setPieMode("donut")
    setDonutThickness(45)
    setLineFill(false)
    setBarOrientation("vertical")
    setTitlePosition("top")
    setTitleAlign("left")
    setTitleBold(false)
    setTitleItalic(false)
    setTitleStrikethrough(false)
    setTitleColor("")
    setTitleSize(12)
    setTableScroll("vertical")
    setTableMode("pivot")
    setPivotRowCol(0)
    setPivotColCol(1)
    setPivotValueCol(2)
    setPivotAgg("sum")
    setFilters([])
  }

  const handleSave = () => {
    if (!dashboard) return
    const currentLayout =
      layout ?? dashboard.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h }))
    const payload = dashboard.panels!.map((p) => {
      const item = currentLayout.find((l) => l.i === p.id)
      return item
        ? { id: p.id, x: item.x, y: item.y, w: item.w, h: item.h }
        : { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h }
    })
    reorder.mutate(payload, {
      onSuccess: () => {
        setDirty(false)
        router.push(`/${id}`)
      },
    })
  }

  const handleAdd = () => {
    if (!datasetId && chartType !== "text" && chartType !== "filter") return
    const titleConfig = {
      titlePosition: chartType === "text" ? "none" : titlePosition,
      titleAlign,
      titleBold,
      titleItalic,
      titleStrikethrough,
      titleColor,
      titleSize,
    }
    const config: Record<string, unknown> =
      chartType === "text"
        ? {
            content: panelText,
            level: panelTextLevel,
            color: panelTextColor,
            align: panelTextAlign,
            valign: panelTextVAlign,
            padding: panelPadding,
            ...titleConfig,
          }
        : chartType === "kpi"
          ? { column: yColumn, agg: yAgg, padding: panelPadding, ...titleConfig }
          : chartType === "table"
            ? {
                columns: tableColumns,
                tableScroll,
                tableMode,
                pivotRowCol,
                pivotColCol,
                pivotValueCol,
                pivotAgg,
                padding: panelPadding,
                ...titleConfig,
              }
            : chartType === "pie"
              ? {
                  xColumn,
                  yColumn,
                  yAgg,
                  pieMode,
                  donutThickness,
                  padding: panelPadding,
                  ...titleConfig,
                }
              : chartType === "filter"
                ? { filters, padding: panelPadding }
                : {
                    xColumn,
                    yColumn,
                    yAgg,
                    lineFill,
                    barOrientation,
                    padding: panelPadding,
                    ...titleConfig,
                  }
    if (filters.length > 0 && chartType !== "filter") config.filters = filters
    const title = panelTitle || selectedDataset?.name || "Panel"

    if (editingPanelId) {
      const layoutItem = (
        layout ?? dashboard!.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h }))
      ).find((l) => l.i === editingPanelId)
      updatePanel.mutate({
        panelId: editingPanelId,
        dataSetId: datasetId || undefined,
        title,
        chartType,
        config,
        x: layoutItem?.x ?? 0,
        y: layoutItem?.y ?? 0,
        w: layoutItem?.w ?? 6,
        h: layoutItem?.h ?? 4,
      })
      setEditingPanelId(null)
    } else {
      createPanel.mutate({
        dataSetId: datasetId || undefined,
        title,
        chartType,
        config,
      })
    }
    resetEditor()
  }

  function handleEditPanel(panel: {
    id: string
    title: string
    chartType: string
    dataSetId: string | null
    config: Record<string, unknown> | null
  }) {
    const cfg = panel.config ?? {}
    setEditingPanelId(panel.id)
    setPanelTitle(panel.title)
    setChartType(panel.chartType)
    setPanelPadding(Number(cfg.padding) || 8)
    setPieMode((cfg.pieMode as string) || "donut")
    setDonutThickness(Number(cfg.donutThickness) || 45)
    setFilters((cfg.filters as PanelFilter[]) ?? [])
    if (panel.chartType === "text") {
      setPanelText((cfg.content as string) ?? "")
      setPanelTextLevel((cfg.level as string) ?? "p")
      setPanelTextColor((cfg.color as string) ?? "")
      setPanelTextAlign((cfg.align as string) ?? "left")
      setPanelTextVAlign((cfg.valign as string) ?? "top")
      setDatasetId("")
    } else {
      setDatasetId(panel.dataSetId ?? "")
      setXColumn(Number(cfg.xColumn) || 0)
      setYColumn(Number(cfg.yColumn) || 0)
      setYAgg((cfg.yAgg as string) || "sum")
      if (panel.chartType === "kpi") {
        setYColumn(Number(cfg.column) || 0)
        setYAgg((cfg.agg as string) || "sum")
      }
      if (panel.chartType === "table") {
        const cols = (cfg.columns as number[]) ?? []
        setTableColumns(cols.length ? cols : columns.map((_: string, i: number) => i))
        setTableScroll((cfg.tableScroll as "vertical" | "horizontal") || "vertical")
        setTableMode((cfg.tableMode as "plain" | "pivot") || "plain")
        setPivotRowCol(Number(cfg.pivotRowCol) || 0)
        setPivotColCol(Number(cfg.pivotColCol) || 1)
        setPivotValueCol(Number(cfg.pivotValueCol) || 2)
        setPivotAgg((cfg.pivotAgg as string) || "sum")
      }
      if (panel.chartType === "line" || panel.chartType === "area") {
        setLineFill(Boolean(cfg.lineFill))
      }
      if (panel.chartType === "bar") {
        setBarOrientation((cfg.barOrientation as "vertical" | "horizontal") || "vertical")
      }
    }
    setTitlePosition((cfg.titlePosition as "none" | "top" | "bottom") || "top")
    setTitleAlign((cfg.titleAlign as "left" | "center" | "right") || "left")
    setTitleBold(Boolean(cfg.titleBold))
    setTitleItalic(Boolean(cfg.titleItalic))
    setTitleStrikethrough(Boolean(cfg.titleStrikethrough))
    setTitleColor((cfg.titleColor as string) || "")
    setTitleSize(Number(cfg.titleSize) || 12)
  }

  function handleCancelEdit() {
    resetEditor()
  }

  function selectDataset(dsId: string) {
    setDatasetId(dsId)
    setXColumn(0)
    setYColumn(0)
    setYAgg("sum")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dsId = e.dataTransfer.getData("dataset-id")
    const dsName = e.dataTransfer.getData("dataset-name")
    if (!dsId) return
    createPanel.mutate({
      dataSetId: dsId,
      title: dsName || "Panel",
      chartType: "table",
      config: {},
    })
  }

  return {
    id,
    router,
    dashboard,
    isLoading,
    datasets,
    createPanel,
    updatePanel,
    deletePanel,
    reorder,
    layout,
    setLayout,
    dirty,
    setDirty,
    datasetId,
    editingPanelId,
    chartType,
    setChartType,
    panelTitle,
    setPanelTitle,
    xColumn,
    setXColumn,
    yColumn,
    setYColumn,
    yAgg,
    setYAgg,
    panelText,
    setPanelText,
    panelTextLevel,
    setPanelTextLevel,
    panelTextColor,
    setPanelTextColor,
    panelTextAlign,
    setPanelTextAlign,
    panelTextVAlign,
    setPanelTextVAlign,
    panelPadding,
    setPanelPadding,
    pieMode,
    setPieMode,
    donutThickness,
    setDonutThickness,
    lineFill,
    setLineFill,
    barOrientation,
    setBarOrientation,
    titlePosition,
    setTitlePosition,
    titleAlign,
    setTitleAlign,
    titleBold,
    setTitleBold,
    titleItalic,
    setTitleItalic,
    titleStrikethrough,
    setTitleStrikethrough,
    titleColor,
    setTitleColor,
    titleSize,
    setTitleSize,
    columns,
    tableColumns,
    setTableColumns,
    tableScroll,
    setTableScroll,
    tableMode,
    setTableMode,
    pivotRowCol,
    setPivotRowCol,
    pivotColCol,
    setPivotColCol,
    pivotValueCol,
    setPivotValueCol,
    pivotAgg,
    setPivotAgg,
    previewData,
    columnsLoading,
    filters,
    setFilters,
    expandedDatasets,
    datasetColumns,
    selectedDataset,
    toggleDatasetExpand,
    handleSave,
    handleAdd,
    handleEditPanel,
    handleCancelEdit,
    selectDataset,
    handleDrop,
  }
}
