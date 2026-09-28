import { BrowserRouter,Navigate,Outlet,Route,Routes } from 'react-router-dom';
import { AuthProvider,useAuth } from './context/AuthContext.jsx';
import { ExpeditionProvider } from './context/ExpeditionContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';
import Layout from './components/Layout.jsx';
import Loading from './components/Loading.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Personnel from './pages/Personnel.jsx';
import Cargo from './pages/Cargo.jsx';
import Inventory from './pages/Inventory.jsx';
import Vehicles from './pages/Vehicles.jsx';
import Assets from './pages/Assets.jsx';
import RoutesPage from './pages/Routes.jsx';
import Incidents from './pages/Incidents.jsx';
import Operations from './pages/Operations.jsx';
import Science from './pages/Science.jsx';
import Communications from './pages/Communications.jsx';
import Readiness from './pages/Readiness.jsx';
import Environment from './pages/Environment.jsx';
import PolarNetwork from './pages/PolarNetwork.jsx';
import Activity from './pages/Activity.jsx';
import Settings from './pages/Settings.jsx';

function Protected(){
  const {user,loading}=useAuth();
  if(loading)return <Loading label="Loading local PolarOps session…"/>;
  if(!user)return <Navigate to="/login" replace/>;
  return <ExpeditionProvider><RealtimeProvider><Outlet/></RealtimeProvider></ExpeditionProvider>;
}

export default function App(){
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login/>}/>
    <Route element={<Protected/>}>
      <Route element={<Layout/>}>
        <Route index element={<Navigate to="/dashboard" replace/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/personnel" element={<Personnel/>}/>
        <Route path="/cargo" element={<Cargo/>}/>
        <Route path="/inventory" element={<Inventory/>}/>
        <Route path="/vehicles" element={<Vehicles/>}/>
        <Route path="/assets" element={<Assets/>}/>
        <Route path="/routes" element={<RoutesPage/>}/>
        <Route path="/incidents" element={<Incidents/>}/>
        <Route path="/operations" element={<Operations/>}/>
        <Route path="/science" element={<Science/>}/>
        <Route path="/communications" element={<Communications/>}/>
        <Route path="/readiness" element={<Readiness/>}/>
        <Route path="/environment" element={<Environment/>}/>
        <Route path="/network" element={<PolarNetwork/>}/>
        <Route path="/activity" element={<Activity/>}/>
        <Route path="/settings" element={<Settings/>}/>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
  </Routes></BrowserRouter></AuthProvider>;
}
