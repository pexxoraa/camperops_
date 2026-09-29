import { useEffect, useState } from 'react'
import api from '../utils/services/api'
import { useExpedition } from '../context/ExpeditionContext'
import { useRealtime } from '../context/RealtimeContext'
import DataTable from './DataTable'
import Loading from './Loading'
import StatusBadge from './StatusBadge'

const Metric = ({ label, value, detail }) => <div className="metric-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>

export default function Dashboard() {
  const { selectedId, selectedExpedition } = useExpedition()
  const { revision } = useRealtime()
  const [data, setData] = useState(null)
  const [sitrep, setSitrep] = useState(null)

  useEffect(() => {
    if (!selectedId) return
    Promise.all([
      api.get('/api/dashboard?expedition_id=' + selectedId),
      api.get('/api/ops/sitrep?expedition_id=' + selectedId),
    ]).then(([dashboard, report]) => { setData(dashboard); setSitrep(report) }).catch(() => {})
  }, [selectedId, revision])

  if (!data) return <Loading />

  return <section>
    <div className="page-heading"><div><span className="eyebrow">COMMAND OVERVIEW</span><h1>{selectedExpedition?.name || 'Dashboard'}</h1><p>Personnel, logistics, fuel, incidents, readiness and operational risk in one view.</p></div><StatusBadge value={selectedExpedition?.status} /></div>
    <div className="metric-grid">
      <Metric label="Personnel" value={data.personnel.total} detail={data.personnel.safe + ' safe · ' + data.personnel.attention + ' attention'} />
      <Metric label="Cargo" value={data.cargo.total} detail={data.cargo.in_transit + ' in transit'} />
      <Metric label="Inventory warnings" value={data.inventory_warnings} detail="Below minimum safety level" />
      <Metric label="Vehicles" value={data.vehicles.operational + '/' + data.vehicles.total} detail={data.vehicles.average_fuel + '% average fuel'} />
      <Metric label="Active incidents" value={data.active_incidents} detail="Open operational incidents" />
      <Metric label="Readiness" value={(sitrep?.readiness?.complete || 0) + '/' + (sitrep?.readiness?.total || 0)} detail="Checklist complete" />
    </div>
    <div className="dashboard-grid">
      <div className="panel"><div className="panel-title"><h2>Operational risks</h2><span>{data.operational_risks.length} active</span></div><DataTable rows={data.operational_risks} columns={[{key:'severity',label:'Severity',badge:true},{key:'title',label:'Alert'},{key:'source',label:'Source'},{key:'status',label:'Status',badge:true}]} /></div>
      <div className="panel"><div className="panel-title"><h2>Commander SITREP</h2><span>{sitrep?.generated_at ? new Date(sitrep.generated_at).toLocaleString() : ''}</span></div>
        <div className="sitrep-grid"><div><strong>{sitrep?.personnel?.deployed || 0}</strong><span>Deployed</span></div><div><strong>{sitrep?.personnel?.overdue || 0}</strong><span>Overdue</span></div><div><strong>{sitrep?.cargo_in_transit || 0}</strong><span>Cargo moving</span></div><div><strong>{sitrep?.active_incidents || 0}</strong><span>Incidents</span></div></div>
      </div>
    </div>
    <div className="panel"><div className="panel-title"><h2>Recent activity</h2></div><DataTable rows={data.recent_activity} columns={[{key:'created_at',label:'Time'},{key:'category',label:'Category'},{key:'message',label:'Activity'},{key:'user_name',label:'User'}]} /></div>
  </section>
}
