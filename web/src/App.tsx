import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AboutPage } from './pages/AboutPage'
import { CalculatorPage } from './pages/CalculatorPage'
import { MunicipalityListPage } from './pages/MunicipalityListPage'
import { MunicipalityPage } from './pages/MunicipalityPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CalculatorPage />} />
        <Route path="opcine" element={<MunicipalityListPage />} />
        <Route path="opcine/:code" element={<MunicipalityPage />} />
        <Route path="o-podacima" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
