import { BrowserRouter, Routes, Route } from "react-router-dom";

import AuthProvider from "./components/AuthProvider";
import ToastProvider from "./components/ToastProvider";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Login from "./pages/Login";
import Register from "./pages/Register";

import "./App.css";

function App() {
    return (
        // AuthProvider fica por fora de tudo: as rotas (etapa 6) e as telas
        // de login e cadastro precisam saber quem está logado.
        // ToastProvider também: o "Bem-vindo de volta" nasce na tela de login
        // e continua visível depois de ir para o Dashboard.
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Telas públicas, sem Sidebar e Header. */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        <Route element={<Layout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/transactions" element={<Transactions />} />
                            <Route path="/categories" element={<Categories />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
