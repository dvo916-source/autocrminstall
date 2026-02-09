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
import MigracaoSupabase from './pages/MigracaoSupabase';
import { AlertCircle, RotateCcw, Database } from 'lucide-react';
import { LojaProvider, useLoja } from './context/LojaContext';
import StoreManagement from './pages/StoreManagement';
import { AnimatePresence } from 'framer-motion';

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

const ProtectedRoute = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const MainContent = ({ user, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate(); // Hook para navegação
  const isAdmin = user?.role === 'admin' || user?.role === 'master' || user?.role === 'developer';
  const isWhatsappActive = location.pathname === '/whatsapp';
  const { currentLoja } = useLoja(); // Added useLoja hook

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
    // Developer has absolute access to everything
    if (user?.role === 'developer') return true;

    // Admins/Master have access by default unless specific permissions exist
    if (isAdmin) return true;

    if (!user?.permissions) return true; // Fallback for legacy

    let perms = [];
    try {
      perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    } catch {
      perms = [];
    }

    if (!Array.isArray(perms)) return false;

    // Restrição de loja para usuários não-developers
    if (user?.role !== 'developer' && user?.loja_id && currentLoja?.id !== user?.loja_id) {
      return false;
    }

    // Check if path is in permissions or if the path is the root (which everyone has)
    const basePermission = perms.includes(path) || path === '/' || path === '/diario';
    if (!basePermission) return false;

    // Se não for developer, o módulo PRECISA estar habilitado na loja (modulos na tabela lojas)
    if (user?.role !== 'developer') {
      const lojaModulosRaw = currentLoja?.modulos;
      if (lojaModulosRaw) {
        try {
          const enabledModules = typeof lojaModulosRaw === 'string' ? JSON.parse(lojaModulosRaw) : lojaModulosRaw;
          // Se for "/", "/diario" ou "dashboard", geralmente permitimos se houver acesso base
          if (path === '/' || path === '/diario') return true;

          // Mapeia paths para nomes de módulos (ex: /whatsapp -> whatsapp)
          const moduleName = path.replace('/', '');
          if (moduleName && !enabledModules.includes(moduleName)) {
            return false;
          }
        } catch (e) {
          console.error("Erro ao validar módulos da loja:", e);
        }
      }
    }

    return true;
  };

  const AppRoutes = () => (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomeSDR user={user} />} />
        <Route path="/diario" element={<HomeSDR user={user} />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/whatsapp" element={<Whatsapp />} />
        <Route path="/estoque" element={<Estoque user={user} />} />
        <Route path="/visitas" element={<Visitas user={user} />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/portais" element={<Portais />} />
        <Route path="/ia-chat" element={<IaChat />} />
        <Route path="/usuarios" element={<Usuarios user={user} />} />

        {/* Central de Lojas - Apenas para Developer */}
        <Route
          path="/central-lojas"
          element={user?.role === 'developer' ? <StoreManagement /> : <Navigate to="/" />}
        />

        {/* Migração Supabase - Apenas para Developer */}
        <Route
          path="/migrar-supabase/:lojaId?"
          element={user?.role === 'developer' ? <MigracaoSupabase /> : <Navigate to="/" />}
        />

        {/* Strictly Admin/Developer Routes */}
        {isAdmin && (
          <>
            <Route path="/ia-prompts" element={<PromptConfig />} />
            <Route path="/admin-ia" element={<AdminIA />} />
            <Route path="/crm-ia" element={<ChatCRM />} />
          </>
        )}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Shell user={user} onLogout={handleLogout}>
        <AppRoutes />
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

// === SESSION VALIDATION HOOK ===
const useSessionValidation = (user, onLogout) => {
  // 🔒 VALIDAÇÃO DE SESSÃO (TEMPORARIAMENTE DESABILITADA)
  // TODO: Reimplementar de forma mais robusta para evitar desconexões indesejadas
  /*
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      try {
        const { ipcRenderer } = window.require('electron');
        const sessionId = localStorage.getItem('sessionId');

        if (!sessionId) return; // Sessão ainda não estabelecida localmente

        const isValid = await ipcRenderer.invoke('validate-session', {
          username: user.username,
          sessionId
        });

        if (!isValid) {
          console.warn('⚠️ [Session] Sessão inválida. Outro acesso detectado.');
          alert('Sua conta foi acessada em outro dispositivo. Você será desconectado.');
          onLogout();
        }
      } catch (err) {
        console.error('Erro ao validar sessão:', err);
      }
    };

    // Verifica a cada 60 segundos
    const interval = setInterval(checkSession, 60000);

    // Verifica também quando o app volta de standby ou o usuário volta para a aba
    window.addEventListener('focus', checkSession);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkSession);
    };
  }, [user, onLogout]);
  */
};

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Ativa o escalonamento proporcional via REM
  useAutoScaling();

  // Ativa validação de sessão única
  useSessionValidation(user, () => {
    setUser(null);
    localStorage.clear();
  });

  useEffect(() => {
    const stored = localStorage.getItem('sdr_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);

        // Se for developer, verificamos se ele já estava atendendo uma loja
        if (parsed.role === 'developer') {
          const activeLojaId = localStorage.getItem('active_loja_id');
          if (!activeLojaId && window.location.hash !== '#/central-lojas') {
            window.location.hash = '#/central-lojas';
          }
        }
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

    // Developer Redirect
    if (formattedUser.role === 'developer') {
      window.location.hash = '#/central-lojas';
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    // Força reload completo para resetar todos os estados
    window.location.reload();
  };

  if (initializing) return <div className="min-h-screen bg-[#0f172a]" />;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.reset_password === 1) {
    return <ResetPassword user={user} onComplete={setUser} />;
  }

  return (
    <LojaProvider>
      <ErrorBoundary>
        <HashRouter>
          <Suspense fallback={<div className="min-h-screen bg-[#0f172a]" />}>
            <MainContent user={user} handleLogout={handleLogout} />
          </Suspense>
        </HashRouter>
      </ErrorBoundary>
    </LojaProvider>
  );
}

export default App;
