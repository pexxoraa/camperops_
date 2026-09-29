import ResourcePage from './ResourcePage'
import api from '../utils/services/api'

export default function Personnel() {
  return <ResourcePage
    title="Personnel"
    description="Roster, team roles, status, check-ins and last known operational position."
    endpoint="/api/personnel"
    columns={[
      {key:'name',label:'Name'}, {key:'role',label:'Role'}, {key:'team',label:'Team'},
      {key:'status',label:'Status',badge:true}, {key:'location_name',label:'Location'}, {key:'last_checkin',label:'Last check-in'},
    ]}
    createFields={[
      {name:'name',label:'Name',required:true}, {name:'role',label:'Role',required:true},
      {name:'team',label:'Team'}, {name:'status',label:'Status',type:'select',options:['Safe','Moving','Deployed','Check-in due','Overdue']},
    ]}
    actions={(row, refresh) => <button className="button small" onClick={async () => {
      const status = window.prompt('Check-in status', row.status || 'Safe')
      if (!status) return
      await api.post('/api/personnel/' + row.id + '/checkin', { status })
      refresh()
    }}>Check in</button>}
  />
}
