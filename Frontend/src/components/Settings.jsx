import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

export default function Settings() {
  const { user } = useAuth()
  const [organization, setOrganization] = useState([])
  const [users, setUsers] = useState([])

  const refresh = async () => {
    setOrganization(await api.get('/api/organizations'))
    if (user?.role === 'commander') setUsers(await api.get('/api/users'))
  }
  useEffect(() => { refresh() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const addUser = async () => {
    const name = window.prompt('Name')
    const email = window.prompt('Email')
    const role = window.prompt('Role: commander, logistics or field', 'field')
    const password = window.prompt('Temporary password (8+ characters)')
    if (!name || !email || !role || !password) return
    await api.post('/api/users', { name, email, role, password })
    refresh()
  }

  const changePassword = async () => {
    const current_password = window.prompt('Current password')
    const new_password = window.prompt('New password (8+ characters)')
    if (!current_password || !new_password) return
    await api.post('/api/me/password', { current_password, new_password }, { queue:false })
    window.alert('Password updated')
  }

  return <section>
    <div className="page-heading"><div><span className="eyebrow">LOCAL CONFIGURATION</span><h1>Settings</h1><p>Organization, user roles and local account controls.</p></div><button className="button" onClick={changePassword}>Change password</button></div>
    <div className="panel"><div className="panel-title"><h2>Organization</h2></div><DataTable rows={organization} columns={[{key:'name',label:'Name'},{key:'country_code',label:'Country code'},{key:'operator_type',label:'Operator type'}]} /></div>
    {user?.role === 'commander' ? <div className="panel"><div className="panel-title"><h2>Users</h2><button className="button small primary" onClick={addUser}>+ User</button></div><DataTable rows={users} columns={[{key:'name',label:'Name'},{key:'email',label:'Email'},{key:'role',label:'Role',badge:true},{key:'active',label:'Active'}]} /></div> : null}
  </section>
}
