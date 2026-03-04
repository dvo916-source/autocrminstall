import React, { useState, useEffect, memo, Suspense, Component } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Shell from './components/Shell';
import HomeVex from './pages/HomeSDR';
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
import CRM from './pages/CRM';
import IaChat from './pages/IaChat';
import PromptConfig from './pages/PromptConfig';
import MigracaoSupabase from './pages/MigracaoSupabase';
import { AlertCircle, RotateCcw, Database } from 'lucide-react';
import { LojaProvider, useLoja } from './context/LojaContext';
import { UIProvider } from './context/UIContext';
import StoreManagement from './pages/StoreManagement';
import { AnimatePresence, motion } from 'framer-motion';
import UpdateModal from './components/UpdateModal';

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
  const { currentLoja, lojas, switchLoja } = useLoja();

  // 🔥 AUTO-SELECT STORE FOR COMMON USERS
  useEffect(() => {
    if (user && user.role !== 'developer' && user.loja_id && !currentLoja && lojas.length > 0) {
      const target = lojas.find(l => l.id === user.loja_id);
      if (target) {
        console.log('🏪 [App] Auto-selecionando loja para o usuário:', target.nome);
        // Usamos switchLoja sem recarregar se possível, ou apenas definimos o estado
        // Note: switchLoja in LojaContext.jsx currently does a window.location.reload()
        // which might be fine for the first time.
        switchLoja(target);
      }
    }
  }, [user, currentLoja, lojas, switchLoja]);

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

    if (!user?.permissions || user?.permissions === '[]') return false;

    let perms = [];
    try {
      perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    } catch {
      perms = [];
    }

    // Proteção robusta contra nulos
    if (!Array.isArray(perms) || perms === null) {
      perms = [];
    }



    // Check if path is in permissions or if the path is the root (which everyone has)
    const basePermission = perms.includes(path) || path === '/' || path === '/diario';
    if (!basePermission) return false;

    // Se não for developer, o módulo PRECISA estar habilitado na loja (modulos na tabela lojas)
    if (user?.role !== 'developer') {
      const lojaModulosRaw = currentLoja?.modulos;
      if (lojaModulosRaw) {
        try {
          let enabledModules = typeof lojaModulosRaw === 'string' ? JSON.parse(lojaModulosRaw) : lojaModulosRaw;
          if (!Array.isArray(enabledModules) || enabledModules === null) enabledModules = [];


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
        <Route path="/" element={<HomeVex user={user} />} />
        <Route path="/diario" element={<HomeVex user={user} />} />
        <Route path="/whatsapp" element={<Whatsapp />} />
        <Route path="/estoque" element={<Estoque user={user} />} />
        <Route path="/visitas" element={<Visitas user={user} />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/portais" element={<Portais />} />
        <Route path="/ia-chat" element={<IaChat />} />
        <Route path="/usuarios" element={<Usuarios user={user} />} />
        <Route path="/crm" element={<CRM user={user} />} />

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

// 🔒 VALIDAÇÃO DE SESSÃO
// Mantemos desabilitado conforme instrução anterior para evitar conflitos de cache
const useSessionValidation = (user, onLogout) => {
  /* ... logic ... */
};

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [updateStatus, setUpdateStatus] = useState({ available: false, progress: 0, ready: false, info: null });
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Ativa o escalonamento proporcional via REM
  useAutoScaling();

  // Ativa validação de sessão única
  useSessionValidation(user, () => {
    setUser(null);
    localStorage.clear();
  });

  useEffect(() => {
    const stored = localStorage.getItem('vexcore_user');
    const { ipcRenderer } = window.require('electron');

    const initializeUser = async () => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);

          // Multi-level parse for safety
          let finalPerms = parsed.permissions || [];
          if (typeof finalPerms === 'string') {
            try {
              finalPerms = JSON.parse(finalPerms);
              if (typeof finalPerms === 'string') finalPerms = JSON.parse(finalPerms);
            } catch (e) { finalPerms = []; }
          }

          const userToSet = { ...parsed, permissions: Array.isArray(finalPerms) ? finalPerms : [] };
          setUser(userToSet);

          // 🚀 [Startup Sync] Puxa tudo da nuvem — apenas UMA vez por sessão
          const alreadySynced = sessionStorage.getItem('startup_synced');
          if (!alreadySynced) {
            sessionStorage.setItem('startup_synced', '1');
            console.log(`🚀 [Startup] Disparando Sync Massivo para ${userToSet.username}...`);
            ipcRenderer.invoke('full-cloud-sync', userToSet.loja_id).catch(err => console.error("Startup Sync Error:", err));
          } else {
            console.log(`⏭️ [Startup] Sync já realizado nesta sessão, pulando.`);
          }

          // 🛡️ VALIDAÇÃO DE STARTUP: Verifica se o usuário ainda existe no banco
          const freshData = await ipcRenderer.invoke('get-user', userToSet.username);

          if (!freshData) {
            console.warn('⚠️ [App] Usuário não encontrado no banco. Limpando cache...');
            handleLogout();
            return;
          } else {
            // Update initial state with fresh data from database
            let finalPerms = freshData.permissions || [];
            if (typeof finalPerms === 'string') {
              try {
                finalPerms = JSON.parse(finalPerms);
                if (typeof finalPerms === 'string') finalPerms = JSON.parse(finalPerms);
              } catch (e) { finalPerms = []; }
            }
            const formatted = { ...freshData, permissions: Array.isArray(finalPerms) ? finalPerms : [] };
            localStorage.setItem('vexcore_user', JSON.stringify(formatted));
            setUser(formatted);
          }

          // Se for developer, verificamos se ele já estava atendendo uma loja
          if (userToSet.role === 'developer') {
            const activeLojaId = localStorage.getItem('active_loja_id');
            if (!activeLojaId && window.location.hash !== '#/central-lojas') {
              window.location.hash = '#/central-lojas';
            }
          }
        } catch (e) {
          console.error("Erro na inicialização do usuário:", e);
        }
      }
      setInitializing(false);
    };

    initializeUser();

    // 🔄 REALTIME PERMISSION UPDATE
    const handleUserDataUpdate = async (event, updatedUsername) => {
      const currentStored = JSON.parse(localStorage.getItem('vexcore_user') || '{}');
      if (updatedUsername.toLowerCase() === currentStored.username?.toLowerCase()) {
        console.log(`📡 [App] Atualizando dados para usuário logado: ${updatedUsername}`);
        try {
          const freshData = await ipcRenderer.invoke('get-user', updatedUsername);
          if (freshData) {
            const formatted = {
              ...freshData,
              permissions: typeof freshData.permissions === 'string' ? JSON.parse(freshData.permissions) : freshData.permissions
            };
            localStorage.setItem('vexcore_user', JSON.stringify(formatted));
            setUser(formatted);
          }
        } catch (err) {
          console.error("Erro ao atualizar dados do usuário logado:", err);
        }
      }
    };

    ipcRenderer.on('user-data-updated', handleUserDataUpdate);

    // 🔄 TRIGGERED WHEN FULL-SYNC COMPLETES
    const handleRefreshData = (e, table) => {
      if (table === 'all' || table === 'usuarios') {
        const currentUser = JSON.parse(localStorage.getItem('vexcore_user') || '{}');
        if (currentUser.username) {
          handleUserDataUpdate(null, currentUser.username);
        }
      }
    };
    ipcRenderer.on('refresh-data', handleRefreshData);

    // --- GLOBAL UPDATE LISTENERS ---
    const updateAvail = (e, info) => {
      console.log('📡 [App] Update available:', info);
      setUpdateStatus(prev => ({ ...prev, available: true, info }));
      setShowUpdateModal(true);
    };
    const updateProg = (e, percent) => setUpdateStatus(prev => ({ ...prev, progress: percent }));
    const updateReady = (e, info) => {
      console.log('📡 [App] Update downloaded:', info);
      setUpdateStatus(prev => ({ ...prev, ready: true, info }));
    };
    const updateError = (e, err) => {
      console.error('📡 [App] Update error:', err);
    };

    ipcRenderer.on('update-available', updateAvail);
    ipcRenderer.on('update-progress', updateProg);
    ipcRenderer.on('update-downloaded', updateReady);
    ipcRenderer.on('update-error', updateError);

    return () => {
      ipcRenderer.removeListener('user-data-updated', handleUserDataUpdate);
      ipcRenderer.removeListener('refresh-data', handleRefreshData);
      ipcRenderer.removeListener('update-available', updateAvail);
      ipcRenderer.removeListener('update-progress', updateProg);
      ipcRenderer.removeListener('update-downloaded', updateReady);
      ipcRenderer.removeListener('update-error', updateError);
    };
  }, []);

  const handleLogin = (userData) => {
    let perms = userData.permissions || [];
    if (typeof perms === 'string') {
      try {
        perms = JSON.parse(perms);
        if (typeof perms === 'string') perms = JSON.parse(perms);
      } catch (e) { perms = []; }
    }
    const formattedUser = {
      ...userData,
      permissions: Array.isArray(perms) ? perms : []
    };
    localStorage.setItem('vexcore_user', JSON.stringify(formattedUser));
    localStorage.setItem('username', formattedUser.username);
    localStorage.setItem('userRole', formattedUser.role);
    setUser(formattedUser);

    // Developer Redirect
    if (formattedUser.role === 'developer') {
      window.location.hash = '#/central-lojas';
    }
  };

  const handleLogout = () => {
    // Limpamos o storage primeiro
    localStorage.clear();
    // Forçamos o reload sem setar user null para o React não tentar renderizar o estado intermediário
    window.location.reload();
  };

  if (initializing) return <div className="min-h-screen bg-[#0f172a]" />;

  return (
    <UIProvider>
      <LojaProvider>
        <ErrorBoundary>
          <HashRouter>
            <Suspense fallback={<div className="min-h-screen bg-[#0f172a]" />}>
              {!user ? (
                <Login onLogin={handleLogin} />
              ) : user.reset_password === 1 ? (
                <ResetPassword user={user} onComplete={setUser} />
              ) : (
                <MainContent user={user} handleLogout={handleLogout} />
              )}
            </Suspense>
          </HashRouter>

          {/* --- UPDATE MODAL --- */}
          {showUpdateModal && updateStatus.info && (
            <UpdateModal
              updateInfo={updateStatus.info}
              onInstall={() => {
                const { ipcRenderer } = window.require('electron');
                setShowUpdateModal(false);
                ipcRenderer.invoke('install-update', updateStatus.info);
              }}
              onDismiss={() => setShowUpdateModal(false)}
            />
          )}
        </ErrorBoundary>
      </LojaProvider>
    </UIProvider>
  );
}

export default App;
