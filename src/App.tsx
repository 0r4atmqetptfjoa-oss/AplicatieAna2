
import React, { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements } from 'react-router-dom'
import Shell from '@/components/Shell'
import Home from '@/pages/Home'
import Learning from '@/pages/Learning'
import Summaries from '@/pages/Summaries'
import Docs from '@/pages/Docs'
import English from '@/pages/English'
import ExamSim from '@/pages/ExamSim'
import AllTopics from '@/pages/AllTopics'
import Psychology from '@/pages/Psychology'
import Fitness from '@/pages/Fitness'
import Settings from '@/pages/Settings'
import Mentor from '@/pages/Mentor'
import InstallPrompt from '@/components/InstallPrompt'

const router = createBrowserRouter(createRoutesFromElements(
  <Route path='/' element={<Shell/>}>
    <Route index element={<Home/>}/>
    <Route path='learning' element={<Learning/>}/>
    <Route path='summaries' element={<Summaries/>}/>
    <Route path='docs' element={<Docs/>}/>
    <Route path='english' element={<English/>}/>
    <Route path='exam' element={<ExamSim/>}/>
    <Route path='all-tests' element={<AllTopics/>}/>
    <Route path='psychology' element={<Psychology/>}/>
    <Route path='settings' element={<Settings/>}/>
    <Route path='fitness' element={<Fitness/>}/>
    <Route path='mentor' element={<Mentor/>}/>
  </Route>
))

export default function App(){
  useEffect(()=>{
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(()=>{});
    }
  },[]);
  return <>
    <RouterProvider router={router}/>
    <InstallPrompt/>
  </>
}
