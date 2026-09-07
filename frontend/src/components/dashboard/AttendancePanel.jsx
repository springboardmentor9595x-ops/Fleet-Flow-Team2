import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import TruckLoader from '../ui/TruckLoader'

export default function AttendancePanel() {
  const { user, token } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const role = user?.role?.toUpperCase?.() || ''
  const isDriver = role === 'DRIVER'
  const isManagement = ['ADMIN', 'FLEETMANAGER', 'FLEET MANAGER'].includes(role)
  const isDispatcher = role === 'DISPATCHER'

  // View Switcher for Management: 'daily' | 'history' | 'leaves'
  const [activeView, setActiveView] = useState('daily')

  // Driver View Switcher: 'checkin' | 'request_leave'
  const [driverActiveTab, setDriverActiveTab] = useState('checkin')

  // Selected date for Daily Roster (Defaults to today: YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Search and status filters for Daily Roster
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterStatusFilter, setRosterStatusFilter] = useState('ALL') // 'ALL' | 'PRESENT' | 'LEAVE' | 'ABSENT'

  // Date filters for History Log
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [historyDriverFilter, setHistoryDriverFilter] = useState('ALL')

  // Data states
  const [fleetData, setFleetData] = useState(null)
  const [historyRecords, setHistoryRecords] = useState([])
  const [driverSummary, setDriverSummary] = useState(null)
  const [inspectingDriver, setInspectingDriver] = useState(null)
  const [inspectingSummary, setInspectingSummary] = useState(null)

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState([])
  const [myLeaveRequests, setMyLeaveRequests] = useState([])
  const [leaveFilter, setLeaveFilter] = useState('ALL') // 'ALL' | 'Pending' | 'Approved' | 'Rejected'

  // Driver Leave Request Form State
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  })

  // Loading & Action states
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(null)
  const [reviewingLeaveId, setReviewingLeaveId] = useState(null)
  const [rejectionModal, setRejectionModal] = useState(null) // leave object to reject
  const [rejectionNote, setRejectionNote] = useState('')

  // Step Date by Offset (-1 or +1 day)
  const stepDate = (offsetDays) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offsetDays)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }

  // Fetch Fleet Daily Attendance
  const fetchFleetAttendance = useCallback(async (dateStr) => {
    try {
      setLoading(true)
      const res = await api.get(`/attendance/fleet?target_date=${dateStr}`)
      setFleetData(res.data)
    } catch (err) {
      console.error('Failed to load fleet attendance:', err)
      addToast('Failed to load fleet attendance records', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  // Fetch Historical Attendance Across Fleet
  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      let url = '/attendance/history?'
      if (historyStartDate) url += `start_date=${historyStartDate}&`
      if (historyEndDate) url += `end_date=${historyEndDate}&`
      if (historyDriverFilter !== 'ALL') url += `driver_id=${historyDriverFilter}&`

      const res = await api.get(url)
      setHistoryRecords(res.data)
    } catch (err) {
      console.error('Failed to load attendance history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyStartDate, historyEndDate, historyDriverFilter])

  // Fetch Driver's own attendance (Driver role)
  const fetchDriverAttendance = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/attendance/me')
      setDriverSummary(res.data)
    } catch (err) {
      console.error('Failed to load driver personal attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch Management Leave Requests
  const fetchLeaveRequests = useCallback(async (filterStatus = 'ALL') => {
    try {
      setLeavesLoading(true)
      let url = '/attendance/leave/all'
      if (filterStatus && filterStatus !== 'ALL') {
        url += `?status_filter=${filterStatus}`
      }
      const res = await api.get(url)
      setLeaveRequests(res.data)
    } catch (err) {
      console.error('Failed to load leave requests:', err)
    } finally {
      setLeavesLoading(false)
    }
  }, [])

  // Fetch Driver's own submitted leave requests
  const fetchMyLeaveRequests = useCallback(async () => {
    try {
      const res = await api.get('/attendance/leave/my-requests')
      setMyLeaveRequests(res.data)
    } catch (err) {
      console.error('Failed to load personal leave requests:', err)
    }
  }, [])

  // Inspect individual driver's history
  const openDriverInspector = async (driver) => {
    setInspectingDriver(driver)
    setInspectingSummary(null)
    try {
      const res = await api.get(`/attendance/driver/${driver.driver_id}`)
      setInspectingSummary(res.data)
    } catch (err) {
      console.error('Failed to load driver summary:', err)
    }
  }

  useEffect(() => {
    if (isDriver) {
      fetchDriverAttendance()
      fetchMyLeaveRequests()
    } else {
      if (activeView === 'daily') {
        fetchFleetAttendance(selectedDate)
      } else if (activeView === 'history') {
        fetchAttendanceHistory()
      } else if (activeView === 'leaves') {
        fetchLeaveRequests(leaveFilter)
      }
      // Always fetch leave requests count in background for tab badge
      fetchLeaveRequests('ALL')
    }

    const handleDataChanged = () => {
      if (isDriver) {
        fetchDriverAttendance()
      } else {
        fetchFleetAttendance(selectedDate)
      }
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)
    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
    }
  }, [isDriver, activeView, selectedDate, leaveFilter, fetchFleetAttendance, fetchAttendanceHistory, fetchLeaveRequests, fetchDriverAttendance, fetchMyLeaveRequests])

  // Count pending leaves for badge
  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter(r => r.status === 'Pending').length
  }, [leaveRequests])

  // Handle Mark Attendance by Admin/FleetManager
  const handleMarkAttendance = async (driverId, status, remarks = '') => {
    if (!isManagement) {
      addToast('Only Management can mark attendance records', 'warning')
      return
    }

    try {
      setSubmitting(driverId)
      await api.post('/attendance/mark', {
        driver_id: driverId,
        date: selectedDate,
        status,
        remarks
      })
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'attendance', action: 'mark' } }))
      addToast(`Attendance updated to ${status} for driver`, 'success')
      fetchFleetAttendance(selectedDate)
    } catch (err) {
      console.error('Failed to mark attendance:', err)
      addToast('Failed to record attendance', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  // Handle Driver Self Check-In
  const handleDriverCheckIn = async () => {
    try {
      setSubmitting('checkin')
      await api.post('/attendance/check-in', {})
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'attendance', action: 'checkin' } }))
      addToast('⚡ Checked in successfully for today!', 'success')
      fetchDriverAttendance()
    } catch (err) {
      console.error('Check-in failed:', err)
      addToast('Check-in failed. Please retry.', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  // Handle Driver Self Check-Out / Clock-Out
  const handleDriverCheckOut = async () => {
    try {
      setSubmitting('checkout')
      await api.post('/attendance/check-out', {})
      addToast('🏁 Shift completed! Clocked out successfully for today.', 'success')
      fetchDriverAttendance()
    } catch (err) {
      console.error('Clock-out failed:', err)
      addToast('Clock-out failed. Please retry.', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  // Handle Driver Submit Leave Request
  const handleDriverSubmitLeave = async (e) => {
    e.preventDefault()
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      addToast('Please fill in start date, end date, and reason', 'warning')
      return
    }

    if (leaveForm.endDate < leaveForm.startDate) {
      addToast('End date cannot be earlier than start date', 'warning')
      return
    }

    try {
      setSubmitting('leave_request')
      await api.post('/attendance/leave/request', {
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        reason: leaveForm.reason.trim()
      })
      addToast('Leave request submitted to management successfully!', 'success')
      setLeaveForm({ startDate: '', endDate: '', reason: '' })
      fetchMyLeaveRequests()
    } catch (err) {
      console.error('Failed to submit leave request:', err)
      addToast(err.response?.data?.detail || 'Failed to submit leave request', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  // Handle Management Review Leave Request (Approve / Reject)
  const handleReviewLeave = async (leaveId, status, reviewNotes = '') => {
    if (!isManagement) {
      addToast('Only Management can approve or reject leaves', 'warning')
      return
    }

    try {
      setReviewingLeaveId(leaveId)
      await api.put(`/attendance/leave/${leaveId}/review`, {
        status,
        review_notes: reviewNotes
      })
      addToast(
        status === 'Approved' 
          ? 'Leave approved! Attendance records auto-updated to Leave.' 
          : 'Leave request rejected.',
        status === 'Approved' ? 'success' : 'info'
      )
      setRejectionModal(null)
      setRejectionNote('')
      fetchLeaveRequests(leaveFilter)
      fetchFleetAttendance(selectedDate)
    } catch (err) {
      console.error('Failed to review leave request:', err)
      addToast('Failed to review leave request', 'error')
    } finally {
      setReviewingLeaveId(null)
    }
  }

  // CSV Export for daily attendance roster
  const exportRosterToCsv = () => {
    if (!fleetData || !fleetData.drivers || fleetData.drivers.length === 0) {
      addToast('No roster data to export', 'warning')
      return
    }

    const headers = ['Driver Name', 'License Number', 'Status', 'Date', 'Remarks']
    const rows = fleetData.drivers.map(d => {
      return [
        `"${d.driver_name}"`,
        `"${d.license_number || 'N/A'}"`,
        `"${d.status || 'Unmarked'}"`,
        `"${selectedDate}"`,
        `"${(d.remarks || '').replace(/"/g, '""')}"`
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Attendance_Roster_${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('📥 Attendance Roster CSV exported successfully!', 'success')
  }

  // Filtered daily roster list
  const filteredRosterDrivers = useMemo(() => {
    if (!fleetData || !fleetData.drivers) return []
    return fleetData.drivers.filter(d => {
      // Search filter
      const q = rosterSearch.toLowerCase()
      const matchesSearch = !q || 
        d.driver_name?.toLowerCase().includes(q) ||
        d.license_number?.toLowerCase().includes(q) ||
        d.remarks?.toLowerCase().includes(q) ||
        d.status?.toLowerCase().includes(q)

      // Status filter
      if (!matchesSearch) return false
      if (rosterStatusFilter === 'ALL') return true
      if (rosterStatusFilter === 'PRESENT') return d.status === 'Present'
      if (rosterStatusFilter === 'LEAVE') return d.status === 'Leave'
      if (rosterStatusFilter === 'ABSENT') return d.status === 'Absent'
      return true
    })
  }, [fleetData, rosterSearch, rosterStatusFilter])

  // Counts for status filter pills
  const filterCounts = useMemo(() => {
    if (!fleetData || !fleetData.drivers) return { all: 0, present: 0, leave: 0, absent: 0 }
    const all = fleetData.drivers.length
    const present = fleetData.drivers.filter(d => d.status === 'Present').length
    const leave = fleetData.drivers.filter(d => d.status === 'Leave').length
    const absent = fleetData.drivers.filter(d => d.status === 'Absent').length
    return { all, present, leave, absent }
  }, [fleetData])

  if (loading && !fleetData && !driverSummary) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-xs font-bold uppercase tracking-widest mt-6 animate-pulse ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
          Loading Attendance Registry...
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full space-y-6 font-sans transition-all pb-16 ${
      isDark ? 'text-slate-100' : 'text-slate-900'
    }`}>
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER CARD (DRIVER ATTENDANCE & SHIFT HUB)        */}
      {/* ========================================================= */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
        isDark 
          ? 'bg-[#0b101b] border-slate-800/90 text-white shadow-2xl' 
          : 'bg-white border-slate-200 text-slate-900 shadow-md'
      }`}>
        
        {/* Left: Icon Badge & Title Info */}
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${
            isDark 
              ? 'bg-gradient-to-br from-cyan-950/80 to-blue-900/40 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
              : 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm'
          }`}>
            {activeView === 'leaves' ? '🏖️' : isDriver ? '📋' : '🗓️'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                {activeView === 'leaves' ? '// LEAVE MANAGEMENT' : '// ROSTER & TELEMETRY'}
              </span>
              <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-cyan-400' : 'bg-cyan-600'}`}></span>
            </div>
            <h2 className={`text-base sm:text-lg font-black tracking-wide m-0 uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeView === 'leaves' ? 'DRIVER LEAVE APPROVALS' : isDriver ? 'MY DUTY & ATTENDANCE LOG' : 'DRIVER ATTENDANCE & SHIFT HUB'}
            </h2>
            <p className={`text-xs m-0 mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeView === 'leaves' 
                ? 'Review and approve driver leave requests with detailed information and status tracking.' 
                : isDriver 
                  ? 'Check in for shifts, submit advance leave requests, and view monthly attendance profile.'
                  : 'Record daily presence, review & approve driver leave requests, and browse telemetry logs.'}
            </p>
          </div>
        </div>

        {/* Right: Modern Segmented Switcher Tabs */}
        {!isDriver ? (
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-end">
            <div className={`flex items-center space-x-1 p-1.5 rounded-2xl border shadow-inner ${
              isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setActiveView('daily')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'daily'
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <span>📅</span>
                <span>Daily Roster</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'history'
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <span>📜</span>
                <span>Historical Logs</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('leaves')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer relative flex items-center gap-1.5 ${
                  activeView === 'leaves'
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <span>🏖️</span>
                <span>Leave Approvals</span>
                {pendingLeavesCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    activeView === 'leaves' ? 'bg-slate-950 text-cyan-300' : 'bg-rose-500 text-white animate-pulse'
                  }`}>
                    {pendingLeavesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={() => {
                if (activeView === 'daily') fetchFleetAttendance(selectedDate)
                else if (activeView === 'history') fetchAttendanceHistory()
                else if (activeView === 'leaves') fetchLeaveRequests(leaveFilter)
                addToast('🔄 Attendance updated.', 'info', 'top-right')
              }}
              disabled={loading || historyLoading || leavesLoading}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-center cursor-pointer transition-all shadow-sm ${
                isDark 
                  ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title="Refresh Roster Data"
            >
              <span className={`inline-block ${loading || historyLoading || leavesLoading ? 'animate-spin' : ''}`}>🔄</span>
            </button>
          </div>
        ) : (
          /* Driver Sub-tab Switcher */
          <div className={`flex items-center space-x-1.5 p-1.5 rounded-2xl border shadow-inner shrink-0 ${
            isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setDriverActiveTab('checkin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                driverActiveTab === 'checkin'
                  ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <span>⚡</span>
              <span>Shift Check-In & Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setDriverActiveTab('request_leave')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                driverActiveTab === 'request_leave'
                  ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <span>🏖️</span>
              <span>Apply Leave</span>
              {myLeaveRequests.some(r => r.status === 'Pending') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. MANAGEMENT VIEW: 1. DAILY ROSTER                       */}
      {/* ========================================================= */}
      {!isDriver && activeView === 'daily' && fleetData && (
        <div className="space-y-6">

          {/* Date Control Ribbon */}
          <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
            isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            
            {/* Left: Shift Date Title & Status */}
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-lg shrink-0 ${
                isDark ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
              }`}>
                🗓️
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold font-mono tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {selectedDate === new Date().toISOString().split('T')[0] ? (
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border flex items-center gap-1 ${
                      isDark ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      ● LIVE TODAY
                    </span>
                  ) : (
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                      isDark ? 'bg-cyan-950/70 text-cyan-400 border-cyan-500/40' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    }`}>
                      HISTORICAL DATE
                    </span>
                  )}
                </div>
                <span className={`text-xs font-sans block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {fleetData.drivers?.length || 0} Registered Drivers • {fleetData.summary.present} On Active Duty
                </span>
              </div>
            </div>

            {/* Right: Date Navigation Controls */}
            <div className={`flex items-center space-x-1.5 p-1 rounded-2xl border shadow-inner self-start md:self-auto ${
              isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => stepDate(-1)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                }`}
                title="Previous Day"
              >
                <span>‹</span>
                <span className="hidden sm:inline text-[11px]">Prev Day</span>
              </button>

              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold outline-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 text-cyan-400 border-slate-700/80 focus:border-cyan-400' 
                      : 'bg-white text-cyan-700 border-slate-200 focus:border-cyan-500 shadow-sm'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => stepDate(1)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                }`}
                title="Next Day"
              >
                <span className="hidden sm:inline text-[11px]">Next Day</span>
                <span>›</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedDate === new Date().toISOString().split('T')[0]
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                    : isDark 
                      ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-700/80' 
                      : 'bg-white hover:bg-slate-50 text-cyan-700 border-slate-200 shadow-sm'
                }`}
              >
                ⚡ Today
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* FIVE KPI CARDS WITH MINI SPARKLINE SVGS                  */}
          {/* ========================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: Total Drivers */}
            <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
              isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Drivers</span>
                <span className={`text-base ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>👥</span>
              </div>
              <div className="my-2 flex items-baseline justify-between z-10">
                <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {fleetData.summary.total_drivers}
                </span>
                {/* Blue Mini Wave Sparkline */}
                <svg className="w-16 h-8 text-blue-500 shrink-0" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M0 24 Q 16 28 32 16 T 64 8" strokeLinecap="round" />
                </svg>
              </div>
              <div className={`text-[11px] font-sans ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Registered Fleet</div>
            </div>

            {/* Card 2: Present On Duty */}
            <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
              isDark ? 'bg-[#0f172a]/90 border-emerald-500/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Present On Duty</span>
                <span className={`text-base ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>👤</span>
              </div>
              <div className="my-2 flex items-baseline justify-between z-10">
                <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {fleetData.summary.present}
                </span>
                {/* Emerald Mini Wave Sparkline */}
                <svg className="w-16 h-8 text-emerald-500 shrink-0" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M0 26 Q 16 18 32 22 T 64 6" strokeLinecap="round" />
                </svg>
              </div>
              <div className={`text-[11px] font-sans ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>Active In Fleet</div>
            </div>

            {/* Card 3: On Leave */}
            <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
              isDark ? 'bg-[#0f172a]/90 border-amber-500/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase font-mono ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>On Leave</span>
                <span className={`text-base ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>📅</span>
              </div>
              <div className="my-2 flex items-baseline justify-between z-10">
                <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {fleetData.summary.leave}
                </span>
                {/* Amber Mini Wave Sparkline */}
                <svg className="w-16 h-8 text-amber-500 shrink-0" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M0 20 Q 20 28 40 18 T 64 12" strokeLinecap="round" />
                </svg>
              </div>
              <div className={`text-[11px] font-sans ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>Approved Absence</div>
            </div>

            {/* Card 4: Absent */}
            <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
              isDark ? 'bg-[#0f172a]/90 border-rose-500/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase font-mono ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Absent</span>
                <span className={`text-base ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>🚫</span>
              </div>
              <div className="my-2 flex items-baseline justify-between z-10">
                <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                  {fleetData.summary.absent}
                </span>
                {/* Rose Mini Wave Sparkline */}
                <svg className="w-16 h-8 text-rose-500 shrink-0" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M0 28 Q 20 22 40 26 T 64 16" strokeLinecap="round" />
                </svg>
              </div>
              <div className={`text-[11px] font-sans ${isDark ? 'text-rose-400/80' : 'text-rose-600'}`}>Unexcused Today</div>
            </div>

            {/* Card 5: Presence Rate */}
            <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1 transition-all ${
              isDark ? 'bg-[#0f172a]/90 border-cyan-500/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>Presence Rate</span>
                <span className={`text-base ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>📊</span>
              </div>
              <div className="my-2 flex items-baseline justify-between z-10">
                <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  {fleetData.summary.presence_rate}%
                </span>
                {/* Cyan Mini Wave Sparkline */}
                <svg className="w-16 h-8 text-cyan-500 shrink-0" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M0 24 Q 16 16 32 20 T 64 6" strokeLinecap="round" />
                </svg>
              </div>
              <div className={`text-[11px] font-sans ${isDark ? 'text-cyan-400/80' : 'text-cyan-700'}`}>Daily Shift SLA</div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* DAILY DRIVERS ROSTER CONTAINER                            */}
          {/* ========================================================= */}
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-5 transition-all ${
            isDark ? 'bg-[#0b101b] border-slate-800/90 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}>
            
            {/* Table Header Ribbon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-800/80 dark:border-slate-800/80">
              <div className="flex items-center space-x-2.5">
                <h3 className={`text-xs font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>ROSTER FOR {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                  isDark ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                }`}>
                  {fleetData.drivers.length} DRIVERS
                </span>
              </div>
              {isManagement && (
                <span className={`text-[11px] font-sans font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  💡 Click status to update instantly. Click driver name for 60-day calendar history.
                </span>
              )}
            </div>

            {/* Roster Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              
              {/* Left: Search input */}
              <div className="relative w-full md:w-72 shrink-0">
                <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>🔍</span>
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search driver, license, remarks..."
                  className={`w-full pl-9 pr-8 py-2 border rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans shadow-sm ${
                    isDark ? 'bg-[#0f172a] border-slate-700/80 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                {rosterSearch && (
                  <button
                    onClick={() => setRosterSearch('')}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs cursor-pointer p-0.5 ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Middle: Status Filter Pills */}
              <div className={`flex items-center space-x-1 p-1 rounded-xl border text-[11px] font-mono shrink-0 overflow-x-auto ${
                isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {[
                  { id: 'ALL', label: `All (${filterCounts.all})` },
                  { id: 'PRESENT', label: `Present (${filterCounts.present})` },
                  { id: 'LEAVE', label: `On Leave (${filterCounts.leave})` },
                  { id: 'ABSENT', label: `Absent (${filterCounts.absent})` }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setRosterStatusFilter(s.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap font-bold text-xs ${
                      rosterStatusFilter === s.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Right: Export & Refresh Buttons */}
              <div className="flex items-center space-x-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={exportRosterToCsv}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                    isDark 
                      ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title="Export Roster to CSV"
                >
                  <span>📥</span>
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fetchFleetAttendance(selectedDate)
                    addToast('🔄 Daily roster refreshed.', 'info', 'top-right')
                  }}
                  disabled={loading}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                    isDark 
                      ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  <span className={`text-xs ${loading ? 'animate-spin' : ''}`}>🔄</span>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Daily Roster Data Table */}
            <div className="overflow-x-auto min-h-[380px] flex flex-col justify-between">
              <table className="w-full text-left text-xs table-fixed min-w-[950px]">
                <thead>
                  <tr className={`text-[11px] font-mono font-semibold uppercase tracking-wider border-b pb-3 h-[44px] ${
                    isDark ? 'text-slate-400 border-slate-800/90' : 'text-slate-500 border-slate-200'
                  }`}>
                    <th className="py-3 pl-4 pr-3 font-semibold w-[220px]">DRIVER NAME</th>
                    <th className="py-3 px-3 font-semibold w-[150px]">LICENSE NUMBER</th>
                    <th className="py-3 px-3 font-semibold w-[160px]">STATUS FOR {selectedDate}</th>
                    <th className="py-3 px-3 font-semibold w-[240px]">REMARKS / VERIFICATION</th>
                    {isManagement && <th className="py-3 pr-4 pl-3 font-semibold text-right w-[250px]">QUICK MARK ACTION</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredRosterDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={isManagement ? 5 : 4} className={`py-24 text-center font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        No driver attendance records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRosterDrivers.map((d) => (
                      <tr key={d.driver_id} className={`transition-colors h-[60px] ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
                        
                        {/* Driver Name & Avatar */}
                        <td className="py-2.5 pl-4 pr-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openDriverInspector(d)}
                            className="flex items-center gap-2.5 text-left cursor-pointer transition-colors group bg-transparent border-none outline-none p-0"
                            title="Click to view 60-day calendar history"
                          >
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                              {d.driver_name.charAt(0)}
                            </div>
                            <span className={`font-semibold text-xs group-hover:underline transition-colors ${
                              isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-700'
                            }`}>
                              {d.driver_name}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              🔍
                            </span>
                          </button>
                        </td>

                        {/* License Number */}
                        <td className={`py-2.5 px-3 whitespace-nowrap font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-700 font-semibold'}`}>
                          {d.license_number ? (
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
                              isDark ? 'bg-slate-900 border-slate-700/80 text-cyan-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                            }`}>
                              {d.license_number}
                            </span>
                          ) : (
                            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>--</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border ${
                            d.status === 'Present'
                              ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                              : d.status === 'Leave'
                              ? (isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                              : d.status === 'Absent'
                              ? (isDark ? 'bg-rose-950/70 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
                              : (isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600')
                          }`}>
                            {d.status === 'Present' && '✓ PRESENT'}
                            {d.status === 'Leave' && '🏖️ ON LEAVE'}
                            {d.status === 'Absent' && '✕ ABSENT'}
                            {!['Present', 'Leave', 'Absent'].includes(d.status) && 'UNMARKED'}
                          </span>
                        </td>

                        {/* Remarks */}
                        <td className={`py-2.5 px-3 text-xs truncate max-w-[240px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`} title={d.remarks || ''}>
                          {d.remarks || <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>--</span>}
                        </td>

                        {/* Quick Actions */}
                        {isManagement && (
                          <td className="py-2.5 pr-4 pl-3 whitespace-nowrap text-right">
                            <div className={`inline-flex items-center space-x-1.5 p-1 rounded-xl border ${
                              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
                            }`}>
                              <button
                                type="button"
                                disabled={submitting === d.driver_id}
                                onClick={() => handleMarkAttendance(d.driver_id, 'Present')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 border ${
                                  d.status === 'Present'
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                    : isDark
                                      ? 'bg-slate-900 text-emerald-400 border-slate-700 hover:bg-emerald-950/40 hover:border-emerald-500/50'
                                      : 'bg-white text-emerald-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 shadow-2xs'
                                }`}
                                title="Mark Present"
                              >
                                <span>✓</span>
                                <span>Present</span>
                              </button>
                              <button
                                type="button"
                                disabled={submitting === d.driver_id}
                                onClick={() => handleMarkAttendance(d.driver_id, 'Leave')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 border ${
                                  d.status === 'Leave'
                                    ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                                    : isDark
                                      ? 'bg-slate-900 text-amber-400 border-slate-700 hover:bg-amber-950/40 hover:border-amber-500/50'
                                      : 'bg-white text-amber-700 border-slate-300 hover:bg-amber-50 hover:border-amber-300 shadow-2xs'
                                }`}
                                title="Mark On Leave"
                              >
                                <span>🏖️</span>
                                <span>Leave</span>
                              </button>
                              <button
                                type="button"
                                disabled={submitting === d.driver_id}
                                onClick={() => handleMarkAttendance(d.driver_id, 'Absent')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 border ${
                                  d.status === 'Absent'
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                                    : isDark
                                      ? 'bg-slate-900 text-rose-400 border-slate-700 hover:bg-rose-950/40 hover:border-rose-500/50'
                                      : 'bg-white text-rose-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300 shadow-2xs'
                                }`}
                                title="Mark Absent"
                              >
                                <span>✕</span>
                                <span>Absent</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MANAGEMENT VIEW: 2. COMPLETE HISTORICAL LOGS           */}
      {/* ========================================================= */}
      {!isDriver && activeView === 'history' && (
        <div className="space-y-6">
          
          {/* History Search & Filter Bar */}
          <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
            isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className={`text-[11px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date Range:</span>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1 text-xs outline-none cursor-pointer ${
                    isDark ? 'bg-slate-900 text-cyan-400 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300'
                  }`}
                  placeholder="Start Date"
                />
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>➔</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1 text-xs outline-none cursor-pointer ${
                    isDark ? 'bg-slate-900 text-cyan-400 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300'
                  }`}
                  placeholder="End Date"
                />
              </div>

              {/* Driver Filter Dropdown */}
              {fleetData && (
                <div className="flex items-center space-x-1.5">
                  <span className={`text-[11px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Driver:</span>
                  <select
                    value={historyDriverFilter}
                    onChange={(e) => setHistoryDriverFilter(e.target.value)}
                    className={`border rounded-xl px-2.5 py-1 text-xs outline-none cursor-pointer ${
                      isDark ? 'bg-slate-900 text-cyan-400 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300'
                    }`}
                  >
                    <option value="ALL">All Drivers</option>
                    {fleetData.drivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.driver_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setHistoryStartDate('')
                  setHistoryEndDate('')
                  setHistoryDriverFilter('ALL')
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={fetchAttendanceHistory}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-sm cursor-pointer transition-all"
              >
                🔄 Refresh Logs
              </button>
            </div>
          </div>

          {/* Historical Logs Table */}
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-all ${
            isDark ? 'bg-[#0b101b] border-slate-800/90 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-800/80">
              <h3 className={`text-xs font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>HISTORICAL ATTENDANCE REGISTRY</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isDark ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  {historyRecords.length} Records
                </span>
              </h3>
            </div>

            {historyLoading ? (
              <div className="min-h-[250px] flex flex-col justify-center items-center font-mono">
                <TruckLoader />
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-4 animate-pulse">
                  Querying Attendance Registry...
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-xs table-fixed min-w-[850px]">
                  <thead>
                    <tr className={`text-[11px] font-mono font-semibold uppercase tracking-wider border-b pb-3 h-[44px] ${
                      isDark ? 'text-slate-400 border-slate-800/90' : 'text-slate-500 border-slate-200'
                    }`}>
                      <th className="py-3 px-3 font-semibold w-[120px]">DATE</th>
                      <th className="py-3 px-3 font-semibold w-[180px]">DRIVER NAME</th>
                      <th className="py-3 px-3 font-semibold w-[140px]">ATTENDANCE STATUS</th>
                      <th className="py-3 px-3 font-semibold w-[240px]">REMARKS / VERIFICATION</th>
                      <th className="py-3 px-3 font-semibold w-[170px]">RECORDED AT</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {historyRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`py-16 text-center font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          No historical attendance records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      historyRecords.map((rec) => (
                        <tr key={rec.attendance_id} className={`transition-colors h-[54px] ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
                          <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{rec.date}</td>
                          <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>{rec.driver_name}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              rec.status === 'Present'
                                ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                                : rec.status === 'Leave'
                                ? (isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                                : (isDark ? 'bg-rose-950/70 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
                            }`}>
                              {rec.status === 'Present' && '✓ '}
                              {rec.status}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 truncate max-w-[240px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{rec.remarks || '--'}</td>
                          <td className={`py-2.5 px-3 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {new Date(rec.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MANAGEMENT VIEW: 3. LEAVE APPROVALS & REQUESTS (IMAGE 2)*/}
      {/* ========================================================= */}
      {!isDriver && activeView === 'leaves' && (
        <div className="space-y-6">
          
          {/* Leaves Sub-tab Filter Bar */}
          <div className={`p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
            isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center space-x-1 p-1 rounded-xl border text-[11px] font-mono shrink-0 overflow-x-auto ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {[
                { id: 'ALL', label: 'All', icon: '👥' },
                { id: 'Pending', label: `Pending (${pendingLeavesCount})`, icon: '🧰' },
                { id: 'Approved', label: 'Approved', icon: '👤' },
                { id: 'Rejected', label: 'Rejected', icon: '🚫' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setLeaveFilter(st.id)
                    fetchLeaveRequests(st.id)
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    leaveFilter === st.id
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                fetchLeaveRequests(leaveFilter)
                addToast('🔄 Leave requests updated.', 'info', 'top-right')
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700/80' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <span>🔄</span>
              <span>Refresh Requests</span>
            </button>
          </div>

          {/* Leaves Table */}
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-all ${
            isDark ? 'bg-[#0b101b] border-slate-800/90 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-800/80">
              <div className="flex items-center space-x-2.5">
                <h3 className={`text-xs font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>{leaveFilter.toUpperCase()} LEAVE REQUESTS</span>
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                  isDark ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                }`}>
                  {leaveRequests.length} REQUESTS
                </span>
              </div>
              <span className={`text-[11px] font-sans ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                💡 Approving a leave automatically populates the driver's attendance roster with <strong>Leave</strong> status.
              </span>
            </div>

            {leavesLoading ? (
              <div className="min-h-[200px] flex flex-col justify-center items-center font-mono">
                <TruckLoader />
                <div className="text-[10px] text-cyan-400 font-bold uppercase mt-4 animate-pulse">
                  Loading Leave Applications...
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-xs table-fixed min-w-[850px]">
                  <thead>
                    <tr className={`text-[11px] font-mono font-semibold uppercase tracking-wider border-b pb-3 h-[44px] ${
                      isDark ? 'text-slate-400 border-slate-800/90' : 'text-slate-500 border-slate-200'
                    }`}>
                      <th className="py-3 px-3 font-semibold w-[180px]">DRIVER NAME</th>
                      <th className="py-3 px-3 font-semibold w-[180px]">REQUESTED PERIOD</th>
                      <th className="py-3 px-3 font-semibold w-[220px]">REASON</th>
                      <th className="py-3 px-3 font-semibold w-[130px]">STATUS</th>
                      <th className="py-3 px-3 font-semibold w-[130px]">SUBMITTED AT</th>
                      <th className="py-3 px-3 font-semibold text-right w-[160px]">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {leaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <span className="text-3xl">🗳️</span>
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              No leave applications found for status "{leaveFilter}".
                            </span>
                            <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              New leave requests will appear here.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      leaveRequests.map((req) => (
                        <tr key={req.leave_id} className={`transition-colors h-[58px] ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {req.driver_name?.charAt(0) || 'D'}
                              </div>
                              <div className="truncate">
                                <span className={`font-semibold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{req.driver_name}</span>
                                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{req.license_number || 'Driver'}</span>
                              </div>
                            </div>
                          </td>
                          <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                            {req.start_date} <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>➔</span> {req.end_date}
                          </td>
                          <td className={`py-2.5 px-3 truncate max-w-[220px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`} title={req.reason}>
                            {req.reason}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              req.status === 'Approved'
                                ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                                : req.status === 'Pending'
                                ? (isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-400 animate-pulse' : 'bg-amber-50 border-amber-200 text-amber-700')
                                : (isDark ? 'bg-rose-950/70 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
                            }`}>
                              {req.status === 'Approved' && '✓ Approved'}
                              {req.status === 'Pending' && '⏳ Pending'}
                              {req.status === 'Rejected' && '✕ Rejected'}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {req.status === 'Pending' ? (
                              <div className="inline-flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  disabled={reviewingLeaveId === req.leave_id}
                                  onClick={() => handleReviewLeave(req.leave_id, 'Approved')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shadow-sm cursor-pointer transition-all disabled:opacity-50"
                                  title="Approve Leave and update roster"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewingLeaveId === req.leave_id}
                                  onClick={() => setRejectionModal(req)}
                                  className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] cursor-pointer transition-all disabled:opacity-50 ${
                                    isDark ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-900/50' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  }`}
                                  title="Reject Leave"
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            ) : (
                              <span className={`text-[11px] font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Reviewed by {req.reviewer_name || 'Management'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 5. DRIVER PERSONAL VIEW (CHECK-IN / LEAVE APPLICATION)    */}
      {/* ========================================================= */}
      {isDriver && driverActiveTab === 'checkin' && driverSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Quick Check-in & Clock-out Hero */}
            {(() => {
              const now = new Date()
              const year = now.getFullYear()
              const month = String(now.getMonth() + 1).padStart(2, '0')
              const day = String(now.getDate()).padStart(2, '0')
              const todayIso = `${year}-${month}-${day}`

              const todayEntry = driverSummary.history?.find(h => h.date === todayIso)
              const isClockedInToday = Boolean(todayEntry && todayEntry.status === 'Present')
              const isClockedOutToday = Boolean(
                todayEntry?.remarks?.includes('Clocked Out') || 
                todayEntry?.remarks?.includes('Clock-Out')
              )
              const isActivelyOnDuty = isClockedInToday && !isClockedOutToday

              return (
                <div className={`md:col-span-2 p-5 sm:p-6 rounded-3xl border shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                  isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isActivelyOnDuty 
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 animate-pulse'
                          : isClockedOutToday 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}>
                        {isActivelyOnDuty ? '🟢 Active On Duty' : isClockedOutToday ? '🏁 Shift Completed' : '⚪ Off Duty'}
                      </span>
                      <span className={`text-[11px] font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className={`text-base font-bold mt-2.5 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Daily Shift Attendance &amp; Duty Status
                    </h3>
                    <p className={`text-xs m-0 mt-1 font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isActivelyOnDuty
                        ? 'You are currently clocked in and active on duty. Click below when ending your shift to clock out.'
                        : isClockedOutToday
                          ? 'Shift completed for today. Click below if you need to re-clock in.'
                          : 'Click below to clock in and confirm your shift presence for today.'}
                    </p>
                    {todayEntry?.remarks && (
                      <div className={`mt-2 px-3 py-1.5 rounded-xl border text-xs font-mono truncate ${
                        isDark ? 'bg-slate-950 border-slate-800 text-cyan-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        ℹ️ {todayEntry.remarks}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {isActivelyOnDuty ? (
                      <button
                        type="button"
                        onClick={handleDriverCheckOut}
                        disabled={submitting === 'checkout'}
                        className="w-full py-3.5 px-5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <span className="text-sm">🛑</span>
                        <span>{submitting === 'checkout' ? 'Ending Duty Shift...' : 'Clock-Out (End Shift)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDriverCheckIn}
                        disabled={submitting === 'checkin'}
                        className="w-full py-3.5 px-5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <span className="text-sm">⚡</span>
                        <span>{submitting === 'checkin' ? 'Recording Presence...' : isClockedOutToday ? 'Re-Clock In for Today' : 'Clock-In for Today (Start Shift)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Attendance Rate Scorecard */}
            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${
              isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <span className={`text-xs uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Attendance Rate</span>
              <div className="text-3xl font-bold text-emerald-500 my-2">
                {driverSummary.attendance_rate}%
              </div>
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {driverSummary.present_days} / {driverSummary.total_days} Days Logged
              </span>
            </div>

            {/* Monthly Counts */}
            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${
              isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <span className={`text-xs uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Duty Breakdown</span>
              <div className="space-y-1.5 my-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-emerald-500 font-semibold">Present:</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{driverSummary.present_days}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-500 font-semibold">Leave:</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{driverSummary.leave_days}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-500 font-semibold">Absent:</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{driverSummary.absent_days}d</span>
                </div>
              </div>
              <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Last 60 Days History</span>
            </div>
          </div>

          {/* Personal History Table */}
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-all ${
            isDark ? 'bg-[#0b101b] border-slate-800/90 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span>ATTENDANCE HISTORY</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isDark ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-700'}`}>
                {driverSummary.history.length} Entries
              </span>
            </h3>

            <div className="overflow-x-auto min-h-[250px]">
              <table className="w-full text-left text-xs table-fixed min-w-[700px]">
                <thead>
                  <tr className={`text-[11px] font-mono font-semibold uppercase tracking-wider border-b pb-3 h-[44px] ${
                    isDark ? 'text-slate-400 border-slate-800/90' : 'text-slate-500 border-slate-200'
                  }`}>
                    <th className="py-3 px-3 font-semibold w-[120px]">DATE</th>
                    <th className="py-3 px-3 font-semibold w-[120px]">STATUS</th>
                    <th className="py-3 px-3 font-semibold w-[260px]">REMARKS / VERIFICATION</th>
                    <th className="py-3 px-3 font-semibold w-[140px]">LOGGED AT</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {driverSummary.history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`py-12 text-center font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        No attendance logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    driverSummary.history.map((h) => (
                      <tr key={h.attendance_id} className={`transition-colors h-[50px] ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
                        <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{h.date}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                            h.status === 'Present'
                              ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                              : h.status === 'Leave'
                              ? (isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                              : (isDark ? 'bg-rose-950/70 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
                          }`}>
                            {h.status === 'Present' && '✓ '}
                            {h.status}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 truncate max-w-[260px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{h.remarks || '--'}</td>
                        <td className={`py-2.5 px-3 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(h.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Driver: Leave Request Tab */}
      {isDriver && driverActiveTab === 'request_leave' && (
        <div className="space-y-6">
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-all ${
            isDark ? 'bg-[#0b101b] border-slate-800/90 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-base">🏖️</span>
              <h3 className={`text-sm font-bold uppercase tracking-wider m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Apply for Advance Leave
              </h3>
            </div>
            <p className={`text-xs m-0 font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Submit your upcoming leave dates in advance. When approved by management, your attendance for those days will automatically be recorded as <strong className="text-amber-500 font-bold">Approved Leave</strong>.
            </p>

            <form onSubmit={handleDriverSubmitLeave} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Start Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer ${
                      isDark ? 'bg-slate-900 text-cyan-300 border-slate-700 focus:border-cyan-400' : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-cyan-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    End Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer ${
                      isDark ? 'bg-slate-900 text-cyan-300 border-slate-700 focus:border-cyan-400' : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-cyan-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Reason for Leave:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Family wedding, medical appointment, emergency travel..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none placeholder:text-slate-400 ${
                    isDark ? 'bg-slate-900 text-white border-slate-700 focus:border-cyan-400' : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-cyan-500'
                  }`}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting === 'leave_request'}
                  className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>📨</span>
                  <span>{submitting === 'leave_request' ? 'Submitting Request...' : 'Submit Leave Request'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* My Submitted Leave Requests */}
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-all ${
            isDark ? 'bg-[#0b101b] border-slate-800/90 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span>MY LEAVE REQUESTS</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isDark ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-700'}`}>
                {myLeaveRequests.length} Requests
              </span>
            </h3>

            <div className="overflow-x-auto min-h-[200px]">
              <table className="w-full text-left text-xs table-fixed min-w-[700px]">
                <thead>
                  <tr className={`text-[11px] font-mono font-semibold uppercase tracking-wider border-b pb-3 h-[44px] ${
                    isDark ? 'text-slate-400 border-slate-800/90' : 'text-slate-500 border-slate-200'
                  }`}>
                    <th className="py-3 px-3 font-semibold w-[160px]">REQUESTED PERIOD</th>
                    <th className="py-3 px-3 font-semibold w-[220px]">REASON</th>
                    <th className="py-3 px-3 font-semibold w-[120px]">STATUS</th>
                    <th className="py-3 px-3 font-semibold w-[160px]">SUBMITTED ON</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {myLeaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`py-12 text-center font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    myLeaveRequests.map((req) => (
                      <tr key={req.leave_id} className={`transition-colors h-[50px] ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
                        <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {req.start_date} <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>➔</span> {req.end_date}
                        </td>
                        <td className={`py-2.5 px-3 truncate max-w-[220px] ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{req.reason}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                            req.status === 'Approved'
                              ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                              : req.status === 'Pending'
                              ? (isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-400 animate-pulse' : 'bg-amber-50 border-amber-200 text-amber-700')
                              : (isDark ? 'bg-rose-950/70 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODALS                                                 */}
      {/* ========================================================= */}

      {/* REJECTION MODAL POPUP */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-rose-500/40 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-sm font-bold text-rose-500 uppercase tracking-wide m-0">
                Reject Leave Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectionModal(null)}
                className={`text-sm font-bold cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
              >
                ✕
              </button>
            </div>

            <p className={`text-xs font-sans ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Provide an optional explanation for rejecting <strong>{rejectionModal.driver_name}</strong>'s leave request ({rejectionModal.start_date} to {rejectionModal.end_date}):
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Critical delivery surge on scheduled dates, please reschedule..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className={`w-full border rounded-xl p-3 text-xs outline-none placeholder:text-slate-400 ${
                isDark ? 'bg-slate-950 text-white border-slate-700 focus:border-rose-400' : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-rose-500'
              }`}
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModal(null)}
                className={`px-4 py-2 rounded-xl border font-bold text-xs cursor-pointer ${
                  isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewingLeaveId === rejectionModal.leave_id}
                onClick={() => handleReviewLeave(rejectionModal.leave_id, 'Rejected', rejectionNote)}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase cursor-pointer transition-all shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER 60-DAY CALENDAR & INSPECTOR MODAL */}
      {inspectingDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-3xl border p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-cyan-500/40 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex justify-between items-start border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-bold text-lg shadow-sm">
                  {inspectingDriver.driver_name.charAt(0)}
                </div>
                <div>
                  <h3 className={`text-base font-bold m-0 uppercase tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {inspectingDriver.driver_name}
                  </h3>
                  <p className={`text-xs m-0 font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    License: {inspectingDriver.license_number || 'N/A'} • 60-Day Duty Profile
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingDriver(null)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer transition-all ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Metrics & Gauges */}
            {inspectingSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-xl border text-center ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Attendance Rate</div>
                    <div className={`text-xl font-bold mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                      {inspectingSummary.attendance_rate}%
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="text-[10px] text-emerald-500 uppercase font-bold">Present</div>
                    <div className="text-xl font-bold text-emerald-500 mt-0.5">
                      {inspectingSummary.present_days}d
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    isDark ? 'bg-amber-950/30 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="text-[10px] text-amber-500 uppercase font-bold">Leave</div>
                    <div className="text-xl font-bold text-amber-500 mt-0.5">
                      {inspectingSummary.leave_days}d
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    isDark ? 'bg-rose-950/30 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="text-[10px] text-rose-500 uppercase font-bold">Absent</div>
                    <div className="text-xl font-bold text-rose-500 mt-0.5">
                      {inspectingSummary.absent_days}d
                    </div>
                  </div>
                </div>

                {/* Driver's Attendance Log */}
                <div className={`max-h-60 overflow-y-auto rounded-xl border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead className={`sticky top-0 text-[10px] uppercase border-b ${
                      isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      <tr>
                        <th className="p-2.5 font-mono">Date</th>
                        <th className="p-2.5 font-mono">Status</th>
                        <th className="p-2.5 font-mono">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {inspectingSummary.history.length === 0 ? (
                        <tr>
                          <td colSpan={3} className={`p-4 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No logs recorded for this driver.
                          </td>
                        </tr>
                      ) : (
                        inspectingSummary.history.map((h) => (
                          <tr key={h.attendance_id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className={`p-2.5 font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{h.date}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                                h.status === 'Present'
                                  ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                                  : h.status === 'Leave'
                                  ? (isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                                  : (isDark ? 'bg-rose-950/70 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
                              }`}>
                                {h.status}
                              </span>
                            </td>
                            <td className={`p-2.5 text-xs truncate max-w-[200px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{h.remarks || '--'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col justify-center items-center">
                <TruckLoader />
                <div className={`text-xs font-bold uppercase mt-3 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  Loading Driver Records...
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className={`flex justify-end pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setInspectingDriver(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
