import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { useExpedition } from '../context/ExpeditionContext'
import { useRealtime } from '../context/RealtimeContext'
import Alert from './Alert'
import DataTable from './DataTable'
import Loading from './Loading'
import Modal from './Modal'

export default function ResourcePage({ title, description, endpoint, columns, createFields = [], actions, mapData }) {
  const { selectedId } = useExpedition()
  const { revision } = useRealtime()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})

  const refresh = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    try {
      const separator = endpoint.includes('?') ? '&' : '?'
      const data = await api.get(endpoint + separator + 'expedition_id=' + selectedId)
      setRows(Array.isArray(data) ? data : (data.items || []))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint, selectedId])

  useEffect(() => { refresh() }, [refresh, revision])

  const submit = async (event) => {
    event.preventDefault()
    const body = { expedition_id: selectedId }
    createFields.forEach((field) => {
      const value = form[field.name]
      if (value === '' || value === undefined) return
      body[field.name] = field.type === 'number' ? Number(value) : value
    })
    try {
      await api.post(endpoint, body)
      setOpen(false)
      setForm({})
      refresh()
    } catch (err) { setError(err.message) }
  }

  return <section>
    <div className="page-heading">
      <div><span className="eyebrow">EXPEDITION MODULE</span><h1>{title}</h1><p>{description}</p></div>
      {createFields.length ? <button className="button primary" onClick={() => setOpen(true)}>+ Add record</button> : null}
    </div>
    {error ? <Alert tone="danger">{error}</Alert> : null}
    {mapData ? mapData(rows) : null}
    <div className="panel">{loading ? <Loading /> : <DataTable rows={rows} columns={columns} actions={actions ? (row) => actions(row, refresh) : null} />}</div>
    <Modal open={open} title={'Add ' + title} onClose={() => setOpen(false)}>
      <form className="form-grid" onSubmit={submit}>
        {createFields.map((field) => <label key={field.name} className={field.wide ? 'wide' : ''}>
          <span>{field.label}</span>
          {field.type === 'select' ? <select value={form[field.name] || ''} required={field.required} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}>
            <option value="">Select…</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select> : field.type === 'textarea' ? <textarea value={form[field.name] || ''} required={field.required} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />
            : <input type={field.type || 'text'} value={form[field.name] || ''} required={field.required} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />}
        </label>)}
        <div className="form-actions wide"><button type="button" className="button ghost" onClick={() => setOpen(false)}>Cancel</button><button className="button primary">Save</button></div>
      </form>
    </Modal>
  </section>
}
