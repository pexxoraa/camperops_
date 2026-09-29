import ResourcePage from './ResourcePage'
import api from '../utils/services/api'

export default function Incidents() {
  return <ResourcePage
    title="Incidents"
    description="SOS, incident command, timeline events, response actions, assignment and completion."
    endpoint="/api/incidents"
    columns={[
      {key:'code',label:'Code'}, {key:'title',label:'Incident'}, {key:'type',label:'Type'},
      {key:'severity',label:'Severity',badge:true}, {key:'status',label:'Status',badge:true}, {key:'location_name',label:'Location'},
      {key:'vehicle_code',label:'Vehicle'},
    ]}
    createFields={[
      {name:'title',label:'Title',required:true}, {name:'type',label:'Type'},
      {name:'severity',label:'Severity',type:'select',options:['Critical','High','Medium','Low']},
      {name:'description',label:'Description',type:'textarea',wide:true},
    ]}
    actions={(row, refresh) => <div className="button-row">
      <button className="button small" onClick={async () => {
        const note = window.prompt('Timeline update')
        if (!note) return
        await api.post('/api/incidents/' + row.id + '/events', { note })
        refresh()
      }}>Update</button>
      {row.status !== 'Resolved' ? <button className="button small danger" onClick={async () => {
        const note = window.prompt('Resolution note', 'Incident resolved') || 'Incident resolved'
        await api.post('/api/incidents/' + row.id + '/resolve', { note })
        refresh()
      }}>Resolve</button> : null}
    </div>}
  />
}
