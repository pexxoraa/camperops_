import { useCallback, useEffect, useState } from 'react'
import api from '../utils/services/api'
import { useExpedition } from '../context/ExpeditionContext'
import { useRealtime } from '../context/RealtimeContext'
import DataTable from './DataTable'

export default function Operations() {
  const { selectedId } = useExpedition()
  const { revision } = useRealtime()
  const [tasks, setTasks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [handovers, setHandovers] = useState([])

  const refresh = useCallback(async () => {
    if (!selectedId) return
    const [taskData, alertData, handoverData] = await Promise.all([
      api.get('/api/ops/tasks?expedition_id=' + selectedId),
      api.get('/api/ops/alerts?expedition_id=' + selectedId),
      api.get('/api/ops/handovers?expedition_id=' + selectedId),
    ])
    setTasks(taskData.items || [])
    setAlerts(alertData.items || [])
    setHandovers(handoverData.items || [])
  }, [selectedId])

  useEffect(() => { refresh() }, [refresh, revision])

  const addTask = async () => {
    const title = window.prompt('Mission task')
    if (!title) return
    const priority = window.prompt('Priority', 'Medium') || 'Medium'
    await api.post('/api/ops/tasks', { expedition_id:selectedId, title, priority })
    refresh()
  }
  const addAlert = async () => {
    const title = window.prompt('Manual alert')
    if (!title) return
    const severity = window.prompt('Severity', 'Advisory') || 'Advisory'
    await api.post('/api/ops/alerts', { expedition_id:selectedId, title, severity, source:'Manual' })
    refresh()
  }
  const addHandover = async () => {
    const shift_name = window.prompt('Shift name')
    if (!shift_name) return
    const summary = window.prompt('Handover summary')
    if (!summary) return
    await api.post('/api/ops/handovers', { expedition_id:selectedId, shift_name, summary })
    refresh()
  }

  return <section>
    <div className="page-heading"><div><span className="eyebrow">DAILY OPERATIONS BOARD</span><h1>Operations</h1><p>Mission tasks, priorities, unified alerts and shift handovers.</p></div><div className="button-row"><button className="button" onClick={addTask}>+ Task</button><button className="button" onClick={addAlert}>+ Alert</button><button className="button primary" onClick={addHandover}>Shift handover</button></div></div>
    <div className="panel"><div className="panel-title"><h2>Mission tasks</h2><span>{tasks.length} tasks</span></div><DataTable rows={tasks} columns={[{key:'title',label:'Task'},{key:'priority',label:'Priority',badge:true},{key:'status',label:'Status',badge:true},{key:'assigned_to',label:'Assignment'},{key:'due_at',label:'Deadline'},{key:'location_name',label:'Location'}]} actions={(row)=><button className="button small" onClick={async()=>{await api.patch('/api/ops/tasks/'+row.id,{status:row.status==='Complete'?'Open':'Complete'});refresh()}}>{row.status==='Complete'?'Reopen':'Complete'}</button>} /></div>
    <div className="panel"><div className="panel-title"><h2>Unified Alert Center</h2><span>{alerts.filter((item)=>item.status!=='Resolved').length} unresolved</span></div><DataTable rows={alerts} columns={[{key:'severity',label:'Severity',badge:true},{key:'title',label:'Alert'},{key:'source',label:'Source'},{key:'status',label:'Status',badge:true},{key:'detail',label:'Detail'}]} actions={(row)=>row.status!=='Resolved'?<button className="button small" onClick={async()=>{await api.patch('/api/ops/alerts/'+row.id,{status:'Resolved'});refresh()}}>Resolve</button>:null} /></div>
    <div className="panel"><div className="panel-title"><h2>Shift handovers</h2></div><DataTable rows={handovers} columns={[{key:'shift_name',label:'Shift'},{key:'author_name',label:'Author'},{key:'summary',label:'Summary'},{key:'created_at',label:'Created'}]} /></div>
  </section>
}
