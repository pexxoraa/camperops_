import ResourcePage from './ResourcePage'
import api from '../utils/services/api'

export default function Inventory() {
  return <ResourcePage
    title="Inventory"
    description="Stock levels, minimum safety thresholds, low-stock warnings and adjustments."
    endpoint="/api/inventory"
    columns={[
      {key:'sku',label:'SKU'}, {key:'name',label:'Item'}, {key:'quantity',label:'Stock'},
      {key:'min_quantity',label:'Minimum'}, {key:'unit',label:'Unit'}, {key:'location_name',label:'Location'},
    ]}
    createFields={[
      {name:'sku',label:'SKU',required:true}, {name:'name',label:'Name',required:true},
      {name:'quantity',label:'Quantity',type:'number'}, {name:'min_quantity',label:'Minimum safety level',type:'number'},
      {name:'unit',label:'Unit'},
    ]}
    actions={(row, refresh) => <button className="button small" onClick={async () => {
      const delta = window.prompt('Adjustment (+/-)', '1')
      if (delta === null) return
      const reason = window.prompt('Reason', 'Operational adjustment')
      if (!reason) return
      await api.post('/api/inventory/' + row.id + '/adjust', { delta: Number(delta), reason })
      refresh()
    }}>Adjust</button>}
  />
}
