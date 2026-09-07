import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import TruckLoader from '../ui/TruckLoader'
import ExportDateModal from './ExportDateModal'

const API_BASE_URL = 'http://127.0.0.1:8000'

const ALL_REPORTS = [
  {
    id: 'fleet-utilization',
    name: 'Fleet Utilization Report',
    icon: '🚚',
    desc: 'Fleet capacity, active vehicles, in-transit ratio, and downtime analysis.',
    roles: ['ADMIN', 'FLEETMANAGER', 'FLEET MANAGER']
  },
  {
    id: 'fuel-consumption',
    name: 'Fuel Consumption & Expense',
    icon: '⛽',
    desc: 'Volumetric diesel consumption, expenditure breakdown, and vehicle fuel efficiency.',
    roles: ['ADMIN', 'FLEETMANAGER', 'FLEET MANAGER']
  },
  {
    id: 'driver-performance',
    name: 'Driver Performance & Attendance',
    icon: '👤',
    desc: 'Trip fulfillment rates, on-time execution score, and integrated presence roster.',
    roles: ['ADMIN', 'FLEETMANAGER', 'FLEET MANAGER', 'DRIVER']
  },
  {
    id: 'delivery-performance',
    name: 'Delivery Performance Report',
    icon: '📦',
    desc: 'On-time vs delayed shipment fulfillments, transit durations, and cargo logs.',
    roles: ['ADMIN', 'FLEETMANAGER', 'FLEET MANAGER', 'DISPATCHER']
  },
  {
    id: 'maintenance',
    name: 'Fleet Maintenance & Cost',
    icon: '🔧',
    desc: 'Servicing expenditure, maintenance category frequency, and upcoming service schedules.',
    roles: ['ADMIN', 'FLEETMANAGER', 'FLEET MANAGER']
  }
]

export default function ReportsPanel() {
  const { user, token } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const role = user?.role?.toUpperCase?.() || 'ADMIN'

  // Filter available reports based on role
  const availableReports = ALL_REPORTS.filter((r) =>
    r.roles.some((reqRole) => role.includes(reqRole))
  )

  const [activeReportId, setActiveReportId] = useState(() => availableReports[0]?.id || 'fleet-utilization')
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(null) // 'pdf' | 'excel' | null
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  
  // Smart Export Date Range Modal State
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    format: 'pdf' // 'pdf' | 'excel'
  })

  // Ensure active report is within allowed list
  useEffect(() => {
    if (!availableReports.some((r) => r.id === activeReportId)) {
      if (availableReports.length > 0) {
        setActiveReportId(availableReports[0].id)
      }
    }
    setCurrentPage(1)
  }, [availableReports, activeReportId])

  const fetchReportPreview = useCallback(async () => {
    const activeToken = token || localStorage.getItem('token')
    if (!activeToken || !activeReportId) return

    try {
      setLoading(true)
      const url = `${API_BASE_URL}/reports/${activeReportId}`

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
      setPreviewData(res.data)
    } catch (err) {
      console.error('Failed to load report preview:', err)
      addToast(err.response?.data?.detail || 'Failed to generate report preview', 'error')
    } finally {
      setLoading(false)
    }
  }, [token, activeReportId, addToast])

  useEffect(() => {
    fetchReportPreview()
  }, [fetchReportPreview])

  // Open Export Modal with chosen format
  const openExportModal = (format) => {
    setExportModal({
      isOpen: true,
      format
    })
  }

  // Execute Export from Modal Selection
  const handleModalExport = async ({ startDate: expStart, endDate: expEnd, format }) => {
    const activeToken = token || localStorage.getItem('token')
    if (!activeToken || !activeReportId) return

    try {
      setExporting(format)
      let url = `${API_BASE_URL}/reports/${activeReportId}/export/${format}?`
      if (expStart) url += `start_date=${expStart}&`
      if (expEnd) url += `end_date=${expEnd}&`

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${activeToken}` },
        responseType: 'blob'
      })

      // Trigger automatic browser file download
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const scopeTag = expStart && expEnd ? `${expStart}_to_${expEnd}` : (expStart ? `from_${expStart}` : 'all_time')
      const filename = `${activeReportId}_${scopeTag}.${ext}`
      
      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      addToast(`Downloaded ${filename} (${format.toUpperCase()}) successfully!`, 'success')
      setExportModal({ isOpen: false, format: 'pdf' })
    } catch (err) {
      console.error('Export download failed:', err)
      addToast('Failed to download report file', 'error')
    } finally {
      setExporting(null)
    }
  }

  const activeReport = availableReports.find((r) => r.id === activeReportId) || availableReports[0]
  const [selectedRowDetail, setSelectedRowDetail] = useState(null)

  // KPI metadata helper for classic & cyberpunk cards
  const getKpiMeta = (kpiName, idx) => {
    const k = kpiName.toLowerCase()
    if (k.includes('fleet') || k.includes('vehicle') || k.includes('truck')) {
      return {
        icon: '🚚',
        sub: 'Registered Vehicles',
        color: isDark ? 'text-white' : 'text-slate-900',
        cardBg: isDark ? 'bg-[#0b1120] border-slate-800/90' : 'bg-white border-slate-200/90 shadow-xs',
        iconBg: isDark ? 'bg-purple-950/60 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]' : 'bg-purple-50 border-purple-200 text-purple-700 shadow-xs'
      }
    }
    if (k.includes('active') || k.includes('available') || k.includes('delivered') || k.includes('present')) {
      return {
        icon: '🛡️',
        sub: 'Vehicles Ready',
        color: isDark ? 'text-white' : 'text-slate-900',
        cardBg: isDark ? 'bg-[#0b1120] border-slate-800/90' : 'bg-white border-slate-200/90 shadow-xs',
        iconBg: isDark ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]' : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
      }
    }
    if (k.includes('transit') || k.includes('move') || k.includes('dispatches')) {
      return {
        icon: '📍',
        sub: 'On The Move',
        color: isDark ? 'text-white' : 'text-slate-900',
        cardBg: isDark ? 'bg-[#0b1120] border-slate-800/90' : 'bg-white border-slate-200/90 shadow-xs',
        iconBg: isDark ? 'bg-sky-950/60 border-sky-500/40 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.25)]' : 'bg-sky-50 border-sky-200 text-sky-700 shadow-xs'
      }
    }
    if (k.includes('maintenance') || k.includes('delayed') || k.includes('overdue') || k.includes('service') || k.includes('repair') || k.includes('cost')) {
      return {
        icon: '🔧',
        sub: 'Under Maintenance',
        color: isDark ? 'text-white' : 'text-slate-900',
        cardBg: isDark ? 'bg-[#0b1120] border-slate-800/90' : 'bg-white border-slate-200/90 shadow-xs',
        iconBg: isDark ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]' : 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
      }
    }
    if (k.includes('rate') || k.includes('utilization') || k.includes('efficiency') || k.includes('score') || k.includes('%')) {
      return {
        icon: '📈',
        sub: 'Overall Performance',
        color: isDark ? 'text-cyan-400' : 'text-cyan-700',
        cardBg: isDark ? 'bg-[#0b1120] border-cyan-500/50 shadow-[0_0_18px_rgba(6,182,212,0.18)]' : 'bg-white border-cyan-300 shadow-sm',
        iconBg: isDark ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.35)]' : 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-xs'
      }
    }
    const icons = ['📊', '⚡', '📦', '🎯', '⏱️']
    return {
      icon: icons[idx % icons.length],
      sub: 'Summary Metric',
      color: isDark ? 'text-white' : 'text-slate-900',
      cardBg: isDark ? 'bg-[#0b1120] border-slate-800/90' : 'bg-white border-slate-200/90 shadow-xs',
      iconBg: isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
    }
  }

  // Calculate paginated rows
  const totalRows = previewData?.rows?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage))
  const displayedRows = useMemo(() => {
    if (!previewData?.rows) return []
    const start = (currentPage - 1) * rowsPerPage
    return previewData.rows.slice(start, start + rowsPerPage)
  }, [previewData, currentPage, rowsPerPage])

  return (
    <div className="w-full relative font-mono text-xs space-y-6">
      
      {/* Header Banner with Integrated Report Dropdown & Export Controls */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDark 
          ? 'bg-[#080d1a]/95 border-slate-800 text-white shadow-2xl' 
          : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}>
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-lg ${
            isDark 
              ? 'bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-indigo-600/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
              : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20'
          }`}>
            {activeReport?.icon || '📊'}
          </div>
          <div className="min-w-0">
            <h2 className={`text-sm sm:text-base font-black tracking-wider m-0 uppercase flex items-center gap-2 truncate ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <span>{activeReport?.name || 'Operations Reports & Analytics Engine'}</span>
            </h2>
            <p className={`text-[11px] m-0 mt-0.5 font-sans truncate ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {activeReport?.desc || 'Generate enterprise audit reports, inspect data summaries, and export formatted PDF & Excel workbooks.'}
            </p>
          </div>
        </div>

        {/* Report Dropdown Selector & Export Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap lg:flex-nowrap">
          {availableReports.length > 1 && (
            <div className="relative">
              <label htmlFor="report-select" className="sr-only">Select Report</label>
              <select
                id="report-select"
                value={activeReportId}
                onChange={(e) => setActiveReportId(e.target.value)}
                className={`rounded-xl px-4 py-2.5 text-xs font-mono font-bold outline-none shadow-md cursor-pointer transition-colors pr-9 appearance-none border ${
                  isDark
                    ? 'bg-[#0b1120] text-cyan-300 border-cyan-500/40 hover:bg-slate-900 focus:border-cyan-400'
                    : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100 focus:border-cyan-600'
                }`}
              >
                {availableReports.map((rep) => (
                  <option key={rep.id} value={rep.id} className={isDark ? 'bg-slate-950 text-white py-2' : 'bg-white text-slate-900 py-2'}>
                    {rep.icon} {rep.name}
                  </option>
                ))}
              </select>
              <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 ${isDark ? 'text-cyan-400' : 'text-slate-500'}`}>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          )}

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={() => openExportModal('pdf')}
            disabled={exporting === 'pdf' || loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-mono font-black transition-all cursor-pointer shadow-sm hover:shadow-md shrink-0 disabled:opacity-50 ${
              isDark
                ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
            }`}
            title="Export report dataset as formatted PDF document"
          >
            <span className="text-sm">📄</span>
            <span>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={() => openExportModal('excel')}
            disabled={exporting === 'excel' || loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-mono font-black transition-all cursor-pointer shadow-sm hover:shadow-md shrink-0 disabled:opacity-50 ${
              isDark
                ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
            title="Export report dataset as XLSX Excel spreadsheet"
          >
            <span className="text-sm">📊</span>
            <span>{exporting === 'excel' ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={fetchReportPreview}
            disabled={loading}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold cursor-pointer shadow-md shrink-0 transition-all disabled:opacity-50 ${
              isDark
                ? 'bg-[#0b1120] border-slate-800 hover:border-cyan-500/60 text-cyan-400 hover:text-white'
                : 'bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
            title="Refresh current report preview"
          >
            <span className={`inline-block ${loading ? 'animate-spin' : ''}`}>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* On-Screen Report Preview Area */}
      {loading ? (
        <div className="min-h-[300px] flex flex-col justify-center items-center font-mono">
          <TruckLoader />
          <div className={`text-[10px] uppercase tracking-widest mt-6 animate-pulse font-bold ${
            isDark ? 'text-cyan-400' : 'text-slate-500'
          }`}>
            Compiling Operational Analytics...
          </div>
        </div>
      ) : previewData ? (
        <div className="space-y-5">
          
          {/* Summary KPIs Scorecards (Reference: 5 Metric Cards in a row with icons on the right) */}
          {previewData.kpis && Object.keys(previewData.kpis).length > 0 && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-${Math.min(Object.keys(previewData.kpis).length, 5)} gap-3.5`}>
              {Object.entries(previewData.kpis).map(([kpiName, kpiVal], idx) => {
                const meta = getKpiMeta(kpiName, idx)

                return (
                  <div
                    key={kpiName}
                    className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between transition-all ${meta.cardBg}`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className={`text-[10px] uppercase tracking-wider font-bold block ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {kpiName}
                      </span>
                      <div className={`text-2xl font-black font-mono mt-1 truncate ${meta.color}`} title={String(kpiVal)}>
                        {kpiVal}
                      </div>
                      <span className={`text-[10px] font-sans font-medium block mt-0.5 truncate ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        {meta.sub}
                      </span>
                    </div>
                    
                    {/* Squircle Icon on Right */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg border flex-shrink-0 ${meta.iconBg}`}>
                      {meta.icon}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Interactive Report Data Table Card */}
          <div className={`p-5 sm:p-6 rounded-2xl border shadow-xl backdrop-blur-md space-y-4 ${
            isDark ? 'bg-[#080d1a]/95 border-slate-800 text-white' : 'bg-white border-slate-200/90 text-slate-900 shadow-md'
          }`}>
            
            {/* Table Card Header with Title & Records Badge */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
              isDark ? 'border-slate-800/90' : 'border-slate-100'
            }`}>
              <div>
                <h3 className={`text-xs sm:text-sm font-black tracking-wider m-0 uppercase flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  <span>{previewData.title || activeReport.name}</span>
                </h3>
                <p className={`text-[11px] m-0 mt-0.5 font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {previewData.subtitle || 'Fleet breakdown and operational capacity overview'} • <span className={isDark ? 'text-cyan-400 font-bold' : 'text-cyan-700 font-bold'}>💡 Period: All Time • Click any row to inspect complete record details</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3.5 py-1 rounded-xl text-xs font-mono font-black border shadow-xs ${
                  isDark 
                    ? 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                    : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                }`}>
                  {totalRows} Records
                </span>
              </div>
            </div>

            {/* Table Surface */}
            <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-800/80 bg-[#060913]' : 'border-slate-200/80 bg-white shadow-xs'}`}>
              <table className="w-full text-left border-collapse font-mono">
                <thead>
                  <tr className={`text-[10px] uppercase font-bold tracking-wider border-b ${
                    isDark ? 'bg-[#0b1120] text-cyan-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {previewData.headers?.map((h, idx) => (
                      <th key={idx} className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>{h}</span>
                          <span className="opacity-40 text-[9px]">⇅</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={previewData.headers?.length || 5} className="p-8 text-center text-slate-500">
                        No operational records found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row, rIdx) => (
                      <tr 
                        key={rIdx} 
                        onClick={() => setSelectedRowDetail({ row, headers: previewData.headers, title: previewData.title })}
                        className={`transition-colors cursor-pointer group ${
                          isDark ? 'hover:bg-cyan-500/10' : 'hover:bg-slate-50/90'
                        }`}
                        title="Click to view full record details in popup"
                      >
                        {row.map((cell, cIdx) => {
                          const cellStr = cell !== null && cell !== undefined ? String(cell) : '--'
                          const isFirstCol = cIdx === 0
                          const isStatusCol = ['Available', 'In Transit', 'Completed', 'Delivered', 'Cancelled', 'Delayed', 'Scheduled', 'Assigned', 'Active', 'Inactive', 'Resolved'].includes(cellStr)
                          const isTypeCol = ['Heavy Truck', 'Container', 'Van', 'Flatbed', 'Tanker', 'Box Truck', 'Refrigerated'].includes(cellStr)
                          const isDriverCol = previewData.headers?.[cIdx]?.toLowerCase().includes('driver')

                          return (
                            <td key={cIdx} className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {isFirstCol ? (
                                <span className={`font-black tracking-wide ${
                                  isDark ? 'text-white group-hover:text-cyan-300' : 'text-slate-900 group-hover:text-cyan-700'
                                }`}>
                                  {cell}
                                </span>
                              ) : isTypeCol ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isDark 
                                    ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300' 
                                    : 'bg-slate-100 border-slate-300 text-slate-700'
                                }`}>
                                  {cellStr}
                                </span>
                              ) : isStatusCol ? (
                                <span className="inline-flex items-center gap-1.5 font-bold text-xs">
                                  <span className={`w-2 h-2 rounded-full ${
                                    cellStr === 'Available' || cellStr === 'Delivered' || cellStr === 'Completed' || cellStr === 'Active' || cellStr === 'Resolved'
                                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                      : cellStr === 'In Transit' || cellStr === 'Assigned'
                                        ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]'
                                        : cellStr === 'Cancelled'
                                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                                          : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                                  }`}></span>
                                  <span className={
                                    cellStr === 'Available' || cellStr === 'Delivered' || cellStr === 'Completed' || cellStr === 'Active' || cellStr === 'Resolved'
                                      ? 'text-emerald-500 font-bold'
                                      : cellStr === 'In Transit' || cellStr === 'Assigned'
                                        ? 'text-sky-400 font-bold'
                                        : cellStr === 'Cancelled'
                                          ? 'text-rose-500 font-bold'
                                          : 'text-amber-500 font-bold'
                                  }>
                                    {cellStr}
                                  </span>
                                </span>
                              ) : isDriverCol && cellStr !== '--' && cellStr !== 'Unassigned' ? (
                                <span className="inline-flex items-center gap-1.5 font-medium">
                                  <span className="opacity-70">👤</span>
                                  <span>{cellStr}</span>
                                </span>
                              ) : typeof cell === 'string' && (cell.includes('KG') || cell.includes('km') || cell.includes('L') || cell.includes('Rs') || cell.includes('%')) ? (
                                <span className="inline-flex items-center gap-1.5 font-mono font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-60"></span>
                                  <span>{cell}</span>
                                </span>
                              ) : (
                                cellStr
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar (Matching Reference Layout) */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 font-mono text-xs ${
              isDark ? 'text-slate-400 border-t border-slate-800' : 'text-slate-600 border-t border-slate-100'
            }`}>
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none cursor-pointer ${
                    isDark 
                      ? 'bg-[#0b1120] border-slate-800 text-cyan-300 focus:border-cyan-400' 
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-cyan-600'
                  }`}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Numbered Page Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all disabled:opacity-30 cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="First Page"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all disabled:opacity-30 cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Previous Page"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                      currentPage === pg
                        ? isDark
                          ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.6)] font-black'
                          : 'bg-cyan-600 text-white shadow-xs font-black'
                        : isDark
                          ? 'hover:bg-slate-800 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all disabled:opacity-30 cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Next Page"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all disabled:opacity-30 cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Last Page"
                >
                  »
                </button>
              </div>

              {/* Showing X to Y of Z Records */}
              <div className="text-[11px] font-mono">
                Showing {totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} records
              </div>
            </div>

          </div>
        </div>
      ) : null}

      {/* Record Details Modal Popup */}
      {selectedRowDetail && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in font-sans"
          onClick={() => setSelectedRowDetail(null)}
        >
          <div 
            className={`w-full max-w-lg border rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5 max-h-[85vh] flex flex-col ${
              isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-start justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div>
                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  // RECORD DETAILS
                </span>
                <h3 className={`text-base font-black tracking-wide mt-0.5 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedRowDetail.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-sm border ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Field Key-Values */}
            <div className="overflow-y-auto space-y-2.5 pr-1 font-mono text-xs flex-1">
              {selectedRowDetail.headers.map((header, idx) => {
                const val = selectedRowDetail.row[idx]
                return (
                  <div key={idx} className={`p-3 rounded-xl border space-y-1 ${
                    isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider font-sans ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {header}
                    </div>
                    <div className={`text-xs font-bold break-words whitespace-pre-wrap leading-relaxed ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {val === '' || val === null || val === undefined || val === '--' ? (
                        <span className="text-slate-400 italic font-normal">--</span>
                      ) : (
                        val
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className={`pt-3 border-t flex justify-end ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className={`px-6 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Export Date Range Modal */}
      <ExportDateModal
        isOpen={exportModal.isOpen}
        onClose={() => setExportModal({ isOpen: false, format: 'pdf' })}
        onExport={handleModalExport}
        reportName={ALL_REPORTS.find((r) => r.id === activeReportId)?.name || 'Operations Report'}
        format={exportModal.format}
        isExporting={Boolean(exporting)}
      />
    </div>
  )
}
