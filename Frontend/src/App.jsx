import { lazy, Suspense } from 'react';
import { BrowserRouter,Navigate,Outlet,Route,Routes } from 'react-router-dom';
import { AuthProvider,useAuth } from './context/AuthContext.jsx';
import { ExpeditionProvider } from './context/ExpeditionContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';
import Layout from './components/Layout.jsx';
import Loading from './components/Loading.jsx';
import Login from './components/Login.jsx';
const Dashboard = lazy(() => import('./components/Dashboard.jsx'));
const Personnel = lazy(() => import('./components/Personnel.jsx'));
const Cargo = lazy(() => import('./components/Cargo.jsx'));
const Inventory = lazy(() => import('./components/Inventory.jsx'));
const Vehicles = lazy(() => import('./components/Vehicles.jsx'));
const Assets = lazy(() => import('./components/Assets.jsx'));
const RoutesPage = lazy(() => import('./components/Routes.jsx'));
const Incidents = lazy(() => import('./components/Incidents.jsx'));
const Operations = lazy(() => import('./components/Operations.jsx'));
const Science = lazy(() => import('./components/Science.jsx'));
const Communications = lazy(() => import('./components/Communications.jsx'));
const Readiness = lazy(() => import('./components/Readiness.jsx'));
const Environment = lazy(() => import('./components/Environment.jsx'));
const PolarNetwork = lazy(() => import('./components/PolarNetwork.jsx'));
const Activity = lazy(() => import('./components/Activity.jsx'));
const Settings = lazy(() => import('./components/Settings.jsx'));
const AboutUs = lazy(() => import('./components/AboutUs.jsx'));

function Protected(){
  const {user,loading}=useAuth();
  if(loading)return <Loading label="Loading local CamperOps session…"/>;
  if(!user)return <Navigate to="/login" replace/>;
  return <ExpeditionProvider><RealtimeProvider><Outlet/></RealtimeProvider></ExpeditionProvider>;
}

export default function App(){
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login/>}/>
    <Route element={<Protected/>}>
      <Route element={<Layout/>}>
        <Route element={<Suspense fallback={<Loading label="Loading page…"/>}><Outlet/></Suspense>}>
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
        <Route path="/about-us" element={<AboutUs/>}/>
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
  </Routes></BrowserRouter></AuthProvider>;
}
