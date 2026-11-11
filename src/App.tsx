import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { CartPage } from './pages/Cart/CartPage'
import { CatalogPage } from './pages/Catalog/CatalogPage'
import { CheckoutPage } from './pages/Checkout/CheckoutPage'
import { CreatePage } from './pages/Create/CreatePage'
import { EditorPage } from './pages/Editor/EditorPage'
import { GeneratePage } from './pages/Generate/GeneratePage'
import { HomePage } from './pages/Home/HomePage'
import { PrintPage } from './pages/Print/PrintPage'
import { ProductPage } from './pages/Product/ProductPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { ProjectsPage } from './pages/Projects/ProjectsPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="catalog/:productId" element={<ProductPage />} />
          <Route path="create" element={<CreatePage />} />
          <Route path="generate" element={<GeneratePage />} />
          <Route path="editor/:projectId" element={<EditorPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="print" element={<PrintPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
