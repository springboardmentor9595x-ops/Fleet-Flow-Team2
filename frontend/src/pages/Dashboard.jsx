import { useState, useEffect } from 'react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard'
import MapTracker from '../components/dashboard/MapTracker'
import FleetPanel from '../components/dashboard/FleetPanel'
import TripsPanel from '../components/dashboard/TripsPanel'
import MaintenancePanel from '../components/dashboard/MaintenancePanel'
import ShipmentPanel from '../components/dashboard/ShipmentPanel'
import DriversPanel from '../components/dashboard/DriversPanel'
import ProfilePanel from '../components/dashboard/ProfilePanel'
import NotificationsPanel from '../components/dashboard/NotificationsPanel'
import ActiveTripPanel from '../components/dashboard/ActiveTripPanel'
import UsersPanel from '../components/dashboard/UsersPanel'
import FuelPanel from '../components/dashboard/FuelPanel'
import AttendancePanel from '../components/dashboard/AttendancePanel'
import ReportsPanel from '../components/dashboard/ReportsPanel'
import api from '../api/axios'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mapTarget, setMapTarget] = useState(null)

  const handleTrackShipment = (shipment) => {
    setMapTarget({
      shipmentId: shipment.shipment_id,
      vehicleId: shipment.vehicle_id,
      trackingNumber: shipment.tracking_number,
      timestamp: Date.now()
    })
    setActiveTab('map')
  }

  // Render correct panel based on active sidebar tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AnalyticsDashboard setActiveTab={setActiveTab} />
      case 'map':
        return <MapTracker target={mapTarget} />
      case 'fleet':
        return <FleetPanel />
      case 'shipments':
        return <ShipmentPanel onTrackShipment={handleTrackShipment} />
      case 'trips':
        return <TripsPanel />
      case 'maintenance':
        return <MaintenancePanel />
      case 'drivers':
        return <DriversPanel />
      case 'attendance':
        return <AttendancePanel />
      case 'reports':
        return <ReportsPanel />
      case 'users':
        return <UsersPanel />
      case 'fuel':
        return <FuelPanel />
      case 'profile':
        return <ProfilePanel />
      case 'notifications':
        return <NotificationsPanel />
      case 'active-trip':
        return <ActiveTripPanel setActiveTab={setActiveTab} />
      default:
        return <AnalyticsDashboard setActiveTab={setActiveTab} />
    }
  }

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="w-full">
        {renderContent()}
      </div>
    </DashboardLayout>
  )
}

export default Dashboard
