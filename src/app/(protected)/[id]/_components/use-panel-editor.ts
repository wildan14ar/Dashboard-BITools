"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import type { Layout } from "react-grid-layout"
import { useDashboard, useCreatePanel, useUpdatePanel, useDeletePanel, useReorderPanels } from "@/hooks/use-dashboards"
import { useDatasets } from "@/hooks/use-datasets"

export type PreviewData = { columns: string[]; rows: { values: string[] }[] }
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
  const [columns, setColumns] = useState<string[]>([])
  const [tableColumns, setTableColumns] = useState<Set<number>>(new Set())
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set())
  const [datasetColumns, setDatasetColumns] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (chartType === "table" && columns.length > 0 && tableColumns.size === 0) {
      setTableColumns(new Set(columns.map((_: string, i: number) => i)))
    }
  }, [chartType, columns, tableColumns])

  useEffect(() => {
    if (!datasetId && datasets.length > 0) {
      setDatasetId(datasets[0].id)
    }
  }, [datasets, datasetId])

  useEffect(() => {
    if (!datasetId) { setColumns([]); setPreviewData(null); return }
    let cancelled = false
    setColumnsLoading(true)
    axios
      .post(`/api/datasets/${datasetId}/run`, { pageSize: 10 })
      .then(({ data }) => {
        if (!cancelled && data?.columns) {
          setColumns(data.columns)
          setPreviewData(data)
          if (chartType === "table") setTableColumns(new Set(data.columns.map((_: string, i: number) => i)))
        }
      })
      .finally(() => { if (!cancelled) setColumnsLoading(false) })
    return () => { cancelled = true }
  }, [datasetId])

  function toggleDatasetExpand(dsId: string) {
    setExpandedDatasets((prev) => {
      const next = new Set(prev)
      if (next.has(dsId)) { next.delete(dsId); return next }
      next.add(dsId)
      if (!datasetColumns[dsId]) {
        axios.post(`/api/datasets/${dsId}/run`, { pageSize: 1 }).then(({ data }) => {
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

  const handleSave = () => {
    if (!dashboard) return
    const currentLayout = layout ?? dashboard.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h }))
    const payload = dashboard.panels!.map((p) => {
      const item = currentLayout.find((l) => l.i === p.id)
      return item ? { id: p.id, x: item.x, y: item.y, w: item.w, h: item.h } : { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h }
    })
    reorder.mutate(payload, { onSuccess: () => { setDirty(false); router.push(`/${id}`) } })
  }

  const handleAdd = () => {
    if (!datasetId && chartType !== "text") return
    const config = chartType === "text"
      ? { content: panelText, level: panelTextLevel, color: panelTextColor, align: panelTextAlign, valign: panelTextVAlign, padding: panelPadding }
      : chartType === "kpi" ? { column: yColumn, agg: yAgg, padding: panelPadding }
      : chartType === "table" ? { columns: [...tableColumns].sort((a, b) => a - b), padding: panelPadding }
      : chartType === "pie" ? { xColumn, yColumn, yAgg, pieMode, donutThickness, padding: panelPadding }
      : chartType !== "pivot" ? { xColumn, yColumn, yAgg, padding: panelPadding } : { padding: panelPadding }
    const title = panelTitle || selectedDataset?.name || "Panel"

    if (editingPanelId) {
      const layoutItem = (layout ?? dashboard!.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h })))
        .find((l) => l.i === editingPanelId)
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
  }

  function handleEditPanel(panel: { id: string; title: string; chartType: string; dataSetId: string | null; config: Record<string, unknown> | null }) {
    const cfg = panel.config ?? {}
    setEditingPanelId(panel.id)
    setPanelTitle(panel.title)
    setChartType(panel.chartType)
    setPanelPadding(Number(cfg.padding) || 8)
    setPieMode((cfg.pieMode as string) || "donut")
    setDonutThickness(Number(cfg.donutThickness) || 45)
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
        setTableColumns(new Set(cols.length ? cols : columns.map((_: string, i: number) => i)))
      }
    }
  }

  function handleCancelEdit() {
    setEditingPanelId(null)
    setDatasetId("")
    setPanelTitle("")
    setPanelText("")
    setPanelTextLevel("p")
    setPanelTextColor("")
    setPanelTextAlign("left")
    setPanelTextVAlign("top")
    setPanelPadding(8)
    setPieMode("donut")
    setDonutThickness(45)
    setColumns([])
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
    columns,
    tableColumns,
    setTableColumns,
    previewData,
    columnsLoading,
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
