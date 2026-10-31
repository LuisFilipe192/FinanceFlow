import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthProvider from "./components/AuthProvider";
import ToastProvider from "./components/ToastProvider";
import Layout from "./components/Layout";
import RequireAuth from "./components/auth/RequireAuth";
import GuestRoute from "./components/auth/GuestRoute";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Login from "./pages/Login";
import Register from "./pages/Register";

import "./App.css";

function App() {
    return (
        // AuthProvider fica por fora de tudo: as rotas precisam saber quem
        // está logado. ToastProvider também: o "Bem-vindo de volta" nasce na
        // tela de login e continua visível depois de ir para o Dashboard.
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Públicas: só para quem NÃO está logado. */}
                        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

                        {/* Privadas: exigem sessão. */}
                        <Route element={<RequireAuth><Layout /></RequireAuth>}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/transactions" element={<Transactions />} />
                            <Route path="/categories" element={<Categories />} />
                        </Route>

                        {/* Endereço desconhecido volta para o início. */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
