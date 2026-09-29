import ResourcePage from './ResourcePage'
import api from '../utils/services/api'

export default function Cargo() {
  return <ResourcePage
    title="Cargo"
    description="Track cargo identity, priority, movement state, location and event history."
    endpoint="/api/cargo"
    columns={[
      {key:'code',label:'Code'}, {key:'name',label:'Cargo'}, {key:'priority',label:'Priority',badge:true},
      {key:'status',label:'Status',badge:true}, {key:'current_location_name',label:'Location'}, {key:'quantity',label:'Qty'},
    ]}
    createFields={[
      {name:'code',label:'Cargo code',required:true}, {name:'name',label:'Name',required:true},
      {name:'priority',label:'Priority',type:'select',options:['Critical','High','Medium','Low']},
      {name:'status',label:'Status',type:'select',options:['Registered','In Transit','Delivered','Held']},
      {name:'quantity',label:'Quantity',type:'number'}, {name:'unit',label:'Unit'},
    ]}
    actions={(row, refresh) => <button className="button small" onClick={async () => {
      const location = window.prompt('Destination location ID')
      if (!location) return
      const status = window.prompt('New status', row.status || 'In Transit') || row.status
      await api.post('/api/cargo/' + row.id + '/move', { location_id: Number(location), status, note: 'Moved from React console' })
      refresh()
    }}>Move</button>}
  />
}
