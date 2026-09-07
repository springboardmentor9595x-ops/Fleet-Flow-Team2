import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

/**
 * ExportDateModal
 * 
 * High-contrast, pixel-perfect modal for both Light and Dark modes:
 * - Light Mode: Clean white card, crisp slate borders, dark typography, vibrant emerald CTA.
 * - Dark Mode: Sleek obsidian card, cyber border accents, bright typography, glowing emerald CTA.
 */
export default function ExportDateModal({
  isOpen,
  onClose,
  onExport,
  reportName = 'Operations Report',
  format = 'pdf', // 'pdf' | 'excel'
  isExporting = false
}) {
  const { isDark } = useTheme()
  const [selectedRange, setSelectedRange] = useState('all') // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  if (!isOpen) return null

  const handleConfirmExport = () => {
    let startDate = ''
    let endDate = ''

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (selectedRange === 'today') {
      startDate = todayStr
      endDate = todayStr
    } else if (selectedRange === 'week') {
      const past = new Date()
      past.setDate(today.getDate() - 7)
      startDate = past.toISOString().split('T')[0]
      endDate = todayStr
    } else if (selectedRange === 'month') {
      const past = new Date()
      past.setDate(today.getDate() - 30)
      startDate = past.toISOString().split('T')[0]
      endDate = todayStr
    } else if (selectedRange === 'custom') {
      startDate = customStartDate
      endDate = customEndDate
    }

    onExport({
      rangeType: selectedRange,
      startDate,
      endDate,
      format
    })
  }

  const options = [
    { id: 'all', label: 'All records' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week (Last 7 Days)' },
    { id: 'month', label: 'This Month (Last 30 Days)' },
    { id: 'custom', label: 'Custom date range' }
  ]

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5 transition-all ${
          isDark 
            ? 'bg-[#0f1422] border border-white/15 text-white' 
            : 'bg-white border-2 border-slate-300 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-black tracking-tight m-0 ${isDark ? 'text-white' : 'text-slate-950'}`}>
              Export {format.toUpperCase()}
            </h3>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border shadow-sm ${
              isDark 
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' 
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}>
              {format === 'pdf' ? '📄 PDF Report' : '📊 Excel Workbook'}
            </span>
          </div>
          <p className={`text-xs mt-1 font-sans font-semibold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
            {reportName}
          </p>
        </div>

        {/* Date Range Section */}
        <div>
          <label className={`text-[11px] font-mono font-black uppercase tracking-wider block mb-3 ${
            isDark ? 'text-white/60' : 'text-slate-700'
          }`}>
            DATE RANGE
          </label>

          {/* Radio Options List */}
          <div className="space-y-2.5">
            {options.map((opt) => {
              const isSelected = selectedRange === opt.id
              return (
                <div key={opt.id} className="space-y-2">
                  <label 
                    onClick={() => setSelectedRange(opt.id)}
                    className={`flex items-center space-x-3 cursor-pointer select-none p-3 rounded-2xl border transition-all ${
                      isDark 
                        ? (isSelected 
                            ? 'bg-slate-900/90 border-emerald-500/50 shadow-sm' 
                            : 'bg-slate-950/40 border-white/5 hover:bg-white/5')
                        : (isSelected 
                            ? 'bg-emerald-50/80 border-emerald-500 text-slate-900 shadow-sm' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-800')
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isDark 
                        ? (isSelected ? 'border-emerald-400 bg-transparent' : 'border-white/30')
                        : (isSelected ? 'border-emerald-600 bg-white' : 'border-slate-400 bg-white')
                    }`}>
                      {isSelected && (
                        <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`}></div>
                      )}
                    </div>
                    <span className={`text-sm ${
                      isSelected 
                        ? (isDark ? 'text-white font-bold' : 'text-slate-950 font-black') 
                        : (isDark ? 'text-white/80 font-medium' : 'text-slate-700 font-semibold')
                    }`}>
                      {opt.label}
                    </span>
                  </label>

                  {/* Inline Custom Date Range Pickers */}
                  {opt.id === 'custom' && isSelected && (
                    <div className={`pt-1 pb-1 pl-4 pr-3 rounded-xl border flex flex-wrap items-center gap-2 font-mono text-xs animate-fade-in ${
                      isDark 
                        ? 'bg-slate-950/60 border-white/10' 
                        : 'bg-slate-100/90 border-slate-300'
                    }`}>
                      <span className={`text-xs font-sans font-bold ${isDark ? 'text-white/60' : 'text-slate-700'}`}>From</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors cursor-pointer font-bold shadow-sm ${
                          isDark 
                            ? 'bg-slate-900 border-white/20 text-emerald-300 focus:border-emerald-400' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                        }`}
                      />
                      <span className={`text-xs font-sans font-bold ${isDark ? 'text-white/60' : 'text-slate-700'}`}>To</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors cursor-pointer font-bold shadow-sm ${
                          isDark 
                            ? 'bg-slate-900 border-white/20 text-emerald-300 focus:border-emerald-400' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`pt-4 flex items-center justify-end space-x-3 border-t ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className={`px-4 py-2 text-xs font-black transition-colors cursor-pointer disabled:opacity-50 ${
              isDark 
                ? 'text-emerald-400 hover:text-emerald-300' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmExport}
            disabled={isExporting || (selectedRange === 'custom' && (!customStartDate || !customEndDate))}
            className={`px-6 py-2.5 rounded-full font-black text-xs shadow-md transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
            }`}
          >
            {isExporting ? (
              <>
                <span className={`w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin ${
                  isDark ? 'border-slate-950' : 'border-white'
                }`}></span>
                <span>Exporting...</span>
              </>
            ) : (
              <span>Export</span>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
