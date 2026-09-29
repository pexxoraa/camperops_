import ResourcePage from './ResourcePage'

export default function Vehicles() {
  return <ResourcePage
    title="Vehicles"
    description="Operational state, fuel, range and current expedition location."
    endpoint="/api/vehicles"
    columns={[
      {key:'code',label:'Code'}, {key:'name',label:'Vehicle'}, {key:'type',label:'Type'},
      {key:'status',label:'Status',badge:true}, {key:'fuel_percent',label:'Fuel %'}, {key:'location_name',label:'Location'},
    ]}
    createFields={[
      {name:'code',label:'Code',required:true}, {name:'name',label:'Name',required:true},
      {name:'type',label:'Type',type:'select',options:['Ground','Aircraft','Marine']},
      {name:'status',label:'Status',type:'select',options:['Operational','Maintenance','Unavailable']},
      {name:'fuel_percent',label:'Fuel %',type:'number'}, {name:'range_km',label:'Range km',type:'number'},
    ]}
  />
}
