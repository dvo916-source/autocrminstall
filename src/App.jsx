import React, { useState, useEffect, memo, Suspense, Component } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import HomeSDR from './pages/HomeSDR';
import Visitas from './pages/Visitas';
import Estoque from './pages/Estoque';
import Portais from './pages/Portais';
import Usuarios from './pages/Usuarios';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';

import Whatsapp from './pages/Whatsapp';
import Metas from './pages/Metas';
import AdminIA from './pages/AdminIA';
import ChatCRM from './pages/ChatCRM';
import IaChat from './pages/IaChat';
import PromptConfig from './pages/PromptConfig';
import { AlertCircle, RotateCcw } from 'lucide-react';

// === ERROR BOUNDARY ===
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🛑 [Global Error]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
          <div className="bg-glass-100 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 max-w-md shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 rounded-3xl mx-auto flex items-center justify-center mb-6">
              <AlertCircle size={40} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white  italic mb-4">Ops! Algo deu errado</h1>
            <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed">
              Ocorreu um erro inesperado na interface. Tente recarregar o sistema.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-cyan-500 hover:bg-cyan-400 py-4 rounded-2xl font-black text-black transition-all flex items-center justify-center gap-2 group mb-4"
            >
              <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              LIMPAR CACHE E REINICIAR
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 group"
            >
              <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              TENTAR NOVAMENTE
            </button>

            <pre className="mt-6 p-4 bg-black/40 rounded-xl text-left text-[10px] text-red-300 overflow-auto max-h-40 font-mono">
              {this.state.error?.toString()}
              {"\n"}
              {this.state.error?.stack?.split("\n").slice(0, 3).join("\n")}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// === WHATSAPP OVERLAY ===
const WhatsappOverlay = memo(({ user, isActive }) => {
  if (!user) return null;
  return (
    <div
      className={`fixed top-[4rem] lg:top-[5rem] left-0 right-0 bottom-0 bg-[#0f172a] transition-opacity duration-200 ${isActive ? 'z-[9999] opacity-100 pointer-events-auto' : 'z-[-1] opacity-0 pointer-events-none'
        }`}
    >
      <div className="w-full h-full p-0 overflow-hidden">
        <Whatsapp />
      </div>
    </div>
  );
}, (prev, next) => prev.isActive === next.isActive);

const MainContent = ({ user, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate(); // Hook para navegação
  const isAdmin = user?.role === 'admin' || user?.role === 'master' || user?.role === 'developer';
  const isWhatsappActive = location.pathname === '/whatsapp';

  useEffect(() => {
    console.log('📍 [App] Pathname atual:', location.pathname);
  }, [location.pathname]);

  // Listener para forçar navegação via IPC (mais robusto)
  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    const handleNav = (e, route) => {
      console.log('🚀 [App] Navegação IPC recebida:', route);
      // Garantimos um pequeno respiro para o React não se perder
      setTimeout(() => {
        navigate(route);
        console.log('✅ [App] Navigate executado para:', route);
      }, 50);
    };
    ipcRenderer.on('navigate-to', handleNav);
    return () => ipcRenderer.removeListener('navigate-to', handleNav);
  }, [navigate]);

  const hasPermission = (path) => {
    // Admins always have access
    if (isAdmin) return true;
    if (!user?.permissions) return true; // Fallback for legacy

    let perms = [];
    try { perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch { perms = []; }

    if (!Array.isArray(perms)) return false;
    return perms.includes(path);
  };

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* WhatsappOverlay REMOVIDO PARA CORRIGIR LAYOUT */}
      <Shell user={user} onLogout={handleLogout}>
        <Routes>
          {/* Public / Common Routes */}
          <Route path="/whatsapp" element={<Whatsapp />} />
          <Route path="/" element={
            user?.role === 'SDR' || user?.role === 'sdr'
              ? <HomeSDR user={user} />
              : <Dashboard user={user} />
          } />

          {/* Conditional Routes based on Permissions */}
          {hasPermission('/visitas') && <Route path="/visitas" element={<Visitas user={user} />} />}
          {hasPermission('/estoque') && <Route path="/estoque" element={<Estoque user={user} />} />}
          {hasPermission('/metas') && <Route path="/metas" element={<Metas />} />}

          {/* Admin or Permission-based Routes */}
          {hasPermission('/portais') && <Route path="/portais" element={<Portais />} />}
          {hasPermission('/usuarios') && <Route path="/usuarios" element={<Usuarios user={user} />} />}
          {hasPermission('/ia-chat') && <Route path="/ia-chat" element={<IaChat />} />}

          {/* Strictly Admin Routes */}
          {isAdmin && (
            <>
              <Route path="/ia-prompts" element={<PromptConfig />} />
              <Route path="/admin-ia" element={<AdminIA />} />
              <Route path="/crm-ia" element={<ChatCRM />} />
            </>
          )}
          <Route path="/diario" element={<HomeSDR user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </div>
  );
};

const NavigationResetter = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/', { replace: true });
  }, []);
  return null;
};

// === AUTO-SCALING HOOK (REM-Based) ===
const useAutoScaling = () => {
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Base de Design: 1920px
      const baseWidth = 1920;
      let scaleFactor = width / baseWidth;

      // Refinamento para notebooks (1366px ~ 1440px)
      if (width <= 1440 && width >= 1200) {
        scaleFactor = Math.max(scaleFactor, 0.82); // Um pouco maior para leitura
      }

      // Limites de segurança
      if (scaleFactor < 0.75) scaleFactor = 0.75;
      if (scaleFactor > 1.25) scaleFactor = 1.25;

      // Aplica escala ao root font-size (base 16px)
      const fontSize = 16 * scaleFactor;
      document.documentElement.style.fontSize = `${fontSize}px`;

      if (import.meta.env.MODE === 'development') {
        console.log(`📏 [AutoScaling] Width: ${width} | REM Base: ${fontSize.toFixed(2)}px`);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'F8') {
        document.documentElement.style.fontSize = '16px';
        console.log("📏 [Scaling] Reset manual (F8)");
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Ativa o escalonamento proporcional via REM
  useAutoScaling();

  useEffect(() => {
    const stored = localStorage.getItem('sdr_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (e) { }
    }
    setInitializing(false);

    // 🔄 REALTIME PERMISSION UPDATE
    const { ipcRenderer } = window.require('electron');
    const handleUserDataUpdate = async (event, updatedUsername) => {
      const currentStored = JSON.parse(localStorage.getItem('sdr_user') || '{}');
      if (updatedUsername.toLowerCase() === currentStored.username?.toLowerCase()) {
        console.log(`📡 [App] Atualizando dados para usuário logado: ${updatedUsername}`);
        try {
          const freshData = await ipcRenderer.invoke('get-user', updatedUsername);
          if (freshData) {
            const formatted = {
              ...freshData,
              permissions: typeof freshData.permissions === 'string' ? JSON.parse(freshData.permissions) : freshData.permissions
            };
            localStorage.setItem('sdr_user', JSON.stringify(formatted));
            setUser(formatted);
          }
        } catch (err) {
          console.error("Erro ao atualizar dados do usuário logado:", err);
        }
      }
    };

    ipcRenderer.on('user-data-updated', handleUserDataUpdate);
    return () => ipcRenderer.removeListener('user-data-updated', handleUserDataUpdate);
  }, []);

  const handleLogin = (userData) => {
    const formattedUser = {
      ...userData,
      permissions: typeof userData.permissions === 'string' ? JSON.parse(userData.permissions) : userData.permissions
    };
    localStorage.setItem('sdr_user', JSON.stringify(formattedUser));
    localStorage.setItem('username', formattedUser.username);
    localStorage.setItem('userRole', formattedUser.role);
    setUser(formattedUser);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
  };

  if (initializing) return <div className="min-h-screen bg-[#0f172a]" />;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.reset_password === 1) {
    return <ResetPassword user={user} onComplete={setUser} />;
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<div className="min-h-screen bg-[#0f172a]" />}>
          <MainContent user={user} handleLogout={handleLogout} />
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
