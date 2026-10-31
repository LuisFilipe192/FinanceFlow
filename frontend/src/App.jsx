import { BrowserRouter, Routes, Route } from "react-router-dom";

import AuthProvider from "./components/AuthProvider";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";

import "./App.css";

function App() {
    return (
        // AuthProvider fica por fora de tudo: as rotas (etapa 6) e as telas
        // de login e cadastro (etapa 5) vão precisar saber quem está logado.
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/transactions" element={<Transactions />} />
                        <Route path="/categories" element={<Categories />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
