import { NavLink } from 'react-router-dom'

const items = [
  ['Dashboard','/dashboard'], ['Personnel','/personnel'], ['Cargo','/cargo'], ['Inventory','/inventory'],
  ['Assets','/assets'], ['Vehicles','/vehicles'], ['Routes & Zones','/routes'], ['Incidents','/incidents'],
  ['Operations','/operations'], ['Science','/science'], ['Communications','/communications'],
  ['Readiness','/readiness'], ['Environment','/environment'], ['Polar Network','/network'],
  ['Activity','/activity'], ['Settings','/settings'],
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">P</span><div><strong>PolarOps</strong><small>EXPEDITION COMMAND</small></div></div>
      <nav>{items.map(([label,path]) => (
        <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>
      ))}</nav>
      <div className="sidebar-foot">LOCAL REFACTOR<br /><span>Node + React</span></div>
    </aside>
  )
}
