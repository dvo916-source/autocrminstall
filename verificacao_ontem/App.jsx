import React, { useState, useEffect, memo, Suspense, Component } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Shell from './components/Shell';
import HomeVex from './pages/HomeSDR';

import Estoque from './pages/Estoque';
import Portais from './pages/Portais';
import Usuarios from './pages/Usuarios';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';

import Whatsapp from './pages/Whatsapp';
import CRM from './pages/CRM';
import MigracaoSupabase from './pages/MigracaoSupabase';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { LojaProvider, useLoja } from './context/LojaContext';
import { UIProvider } from './context/UIContext';
import { LeadsProvider } from './context/LeadsContext';
import StoreManagement from './pages/StoreManagement';
import { COMMERCIAL_MODULES } from './constants/modules';
import { AnimatePresence, motion } from 'framer-motion';
import UpdateModal from './components/UpdateModal';
import { electronAPI } from '@/lib/electron-api';

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
            <h1 className="text-2xl font-black text-white italic mb-4">Ops! Algo deu errado</h1>
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

const MainContent = ({ user, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'master' || user?.role === 'developer';
  const { currentLoja, lojas, switchLoja } = useLoja();

  // 🔥 AUTO-SELECT STORE FOR COMMON USERS
  useEffect(() => {
    if (user && user.role !== 'developer' && user.loja_id && lojas.length > 0) {
      const target = lojas.find(l => l.id === user.loja_id);
      if (target && target.id !== currentLoja?.id) {
        console.log('🏪 [App] Auto-selecionando loja para o usuário:', target.nome);
        switchLoja(target);
      }
    }
  }, [user, lojas, currentLoja, switchLoja]);

  useEffect(() => {
    const handleNav = (route) => {
      setTimeout(() => navigate(route), 50);
    };
    const unsubscribe = electronAPI.onNavigateTo(handleNav);
    return () => unsubscribe();
  }, [navigate]);

  const hasPermission = (path) => {
    if (path === '/' || path === '/diario') return true;

    const modulosComerciais = COMMERCIAL_MODULES;
    const moduleName = path.replace('/', '');

    if (currentLoja && modulosComerciais.includes(moduleName)) {
      const lojaModulosRaw = currentLoja?.modulos;
      let enabledModules = [];
      try {
        enabledModules = typeof lojaModulosRaw === 'string' ? JSON.parse(lojaModulosRaw) : lojaModulosRaw;
        if (!Array.isArray(enabledModules)) enabledModules = [];
      } catch (e) { enabledModules = []; }

      if (!enabledModules.includes(moduleName)) {
        return false;
      }
    }

    if (user?.role === 'developer') return true;
    if (isAdmin) return true;

    if (!user?.permissions || user?.permissions === '[]') return false;
    let perms = [];
    try {
      perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    } catch { perms = []; }
    if (!Array.isArray(perms)) perms = [];

    return perms.includes(path);
  };

  const RouteGuard = ({ path, element }) => {
    if (!hasPermission(path)) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center min-h-[80vh] bg-[#0f172a] text-white"
        >
          <div className="p-8 bg-slate-800/80 rounded-2xl border border-red-500/30 text-center shadow-[0_0_30px_rgba(239,68,68,0.15)] backdrop-blur-md">
            <AlertCircle size={56} className="mx-auto text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            <h2 className="text-2xl font-black text-red-400 mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 mb-6 font-medium">Este módulo não está ativo na assinatura da loja.</p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              Voltar ao Início
            </button>
          </div>
        </motion.div>
      );
    }
    return element;
  };

  const AppRoutes = () => (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomeVex user={user} />} />
        <Route path="/diario" element={<HomeVex user={user} />} />

        <Route path="/whatsapp" element={<RouteGuard path="/whatsapp" element={<Whatsapp />} />} />
        <Route path="/estoque" element={<RouteGuard path="/estoque" element={<Estoque user={user} />} />} />
        <Route path="/portais" element={<RouteGuard path="/portais" element={<Portais />} />} />
        <Route path="/usuarios" element={<RouteGuard path="/usuarios" element={<Usuarios user={user} />} />} />
        <Route path="/crm" element={<RouteGuard path="/crm" element={<CRM user={user} />} />} />

        <Route path="/central-lojas" element={user?.role === 'developer' ? <StoreManagement /> : <Navigate to="/" />} />
        <Route path="/migrar-supabase/:lojaId?" element={user?.role === 'developer' ? <MigracaoSupabase /> : <Navigate to="/" />} />

        {isAdmin && (
          <>
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

// === AUTO-SCALING HOOK (REM-Based) ===
const useAutoScaling = () => {
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const baseWidth = 1920;
      let scaleFactor = width / baseWidth;

      if (width <= 1440 && width >= 1200) {
        scaleFactor = Math.max(scaleFactor, 0.82);
      }

      if (scaleFactor < 0.75) scaleFactor = 0.75;
      if (scaleFactor > 1.25) scaleFactor = 1.25;

      const fontSize = 16 * scaleFactor;
      document.documentElement.style.fontSize = `${fontSize}px`;
    };

    const handleKeyDown = (e) => {
      if (e.key === 'F8') document.documentElement.style.fontSize = '16px';
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
  const [updateStatus, setUpdateStatus] = useState({ available: false, progress: 0, ready: false, info: null });
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useAutoScaling();

  useEffect(() => {
    const stored = sessionStorage.getItem('vexcore_user');

    const initializeUser = async () => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          let finalPerms = parsed.permissions || [];
          if (typeof finalPerms === 'string') {
            try {
              finalPerms = JSON.parse(finalPerms);
              if (typeof finalPerms === 'string') finalPerms = JSON.parse(finalPerms);
            } catch (e) { finalPerms = []; }
          }

          const userToSet = { ...parsed, permissions: Array.isArray(finalPerms) ? finalPerms : [] };
          setUser(userToSet);

          const alreadySynced = sessionStorage.getItem('startup_synced');
          if (!alreadySynced) {
            sessionStorage.setItem('startup_synced', '1');
            electronAPI.fullCloudSync(userToSet.loja_id).catch(err => console.error("Startup Sync Error:", err));
          }

          const freshData = await electronAPI.getUser(userToSet.username);

          if (!freshData) {
            handleLogout();
            return;
          } else {
            let freshPerms = freshData.permissions || [];
            if (typeof freshPerms === 'string') {
              try {
                freshPerms = JSON.parse(freshPerms);
                if (typeof freshPerms === 'string') freshPerms = JSON.parse(freshPerms);
              } catch (e) { freshPerms = []; }
            }
            const formatted = { ...freshData, permissions: Array.isArray(freshPerms) ? freshPerms : [] };
            localStorage.setItem('vexcore_user', JSON.stringify(formatted));
            setUser(formatted);
          }

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

    const handleUserDataUpdate = async (updatedUsername) => {
      const currentStored = JSON.parse(sessionStorage.getItem('vexcore_user') || '{}');
      if (updatedUsername.toLowerCase() === currentStored.username?.toLowerCase()) {
        try {
          const freshData = await electronAPI.getUser(updatedUsername);
          if (freshData) {
            const formatted = {
              ...freshData,
              permissions: typeof freshData.permissions === 'string' ? JSON.parse(freshData.permissions) : freshData.permissions
            };
            sessionStorage.setItem('vexcore_user', JSON.stringify(formatted));
            setUser(formatted);
          }
        } catch (err) { }
      }
    };

    const unsubscribeUser = electronAPI.onUserDataUpdated(handleUserDataUpdate);

    const handleRefreshData = (payload) => {
      const table = typeof payload === 'string' ? payload : payload?.table;
      if (table === 'all' || table === 'usuarios') {
        const currentUser = JSON.parse(sessionStorage.getItem('vexcore_user') || '{}');
        if (currentUser.username) {
          handleUserDataUpdate(currentUser.username);
        }
      }
    };
    const unsubscribeRefresh = electronAPI.onRefreshData(handleRefreshData);

    const updateAvail = (info) => {
      setUpdateStatus(prev => ({ ...prev, available: true, info }));
      setShowUpdateModal(true);
    };
    const updateProg = (percent) => setUpdateStatus(prev => ({ ...prev, progress: percent }));
    const updateReady = (info) => setUpdateStatus(prev => ({ ...prev, ready: true, info }));

    const unsubscribeAvail = electronAPI.onUpdateAvailable(updateAvail);
    const unsubscribeProg = electronAPI.onUpdateProgress(updateProg);
    const unsubscribeReady = electronAPI.onUpdateDownloaded(updateReady);

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeRefresh) unsubscribeRefresh();
      if (unsubscribeAvail) unsubscribeAvail();
      if (unsubscribeProg) unsubscribeProg();
      if (unsubscribeReady) unsubscribeReady();
    };
  }, []);

  const handleLogin = (userData) => {
    console.log('🔐 [App] handleLogin recebeu:', userData.username, '| role:', userData.role, '| firstRoute:', userData.firstRoute);

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
    sessionStorage.setItem('vexcore_user', JSON.stringify(formattedUser));
    localStorage.setItem('username', formattedUser.username);
    localStorage.setItem('userRole', formattedUser.role);
    setUser(formattedUser);

    // Salva loja_id se usuário comum
    if (formattedUser.role !== 'developer' && formattedUser.loja_id) {
      localStorage.setItem('active_loja_id', formattedUser.loja_id);
    }

    // ✅ USA firstRoute que vem do Login.jsx (com fallback seguro)
    const targetRoute = userData.firstRoute || (formattedUser.role === 'developer' ? '/central-lojas' : '/');
    console.log('🚀 [App] Redirecionando para:', targetRoute);
    window.location.hash = `#${targetRoute}`;
  };

  const handleLogout = () => {
    console.log('🚪 [App] Realizando logout completo...');

    // Preserva active_loja_id apenas se developer (para não quebrar Central de Lojas)
    const userRole = localStorage.getItem('userRole');
    const activeLojaId = userRole === 'developer' ? localStorage.getItem('active_loja_id') : null;

    // Limpa TUDO
    localStorage.clear();
    sessionStorage.clear();

    // Restaura active_loja_id se developer
    if (activeLojaId) {
      localStorage.setItem('active_loja_id', activeLojaId);
    }

    // Limpa estado do React
    setUser(null);

    console.log('✅ [App] Logout completo! Recarregando para tela de login...');
    window.location.reload();
  };

  if (initializing) return <div className="min-h-screen bg-[#0f172a]" />;

  return (
    <UIProvider>
      <LojaProvider>
        <LeadsProvider user={user}>
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
                  setShowUpdateModal(false);
                  electronAPI.installUpdate(updateStatus.info);
                }}
                onDismiss={() => setShowUpdateModal(false)}
              />
            )}
          </ErrorBoundary>
        </LeadsProvider>
      </LojaProvider>
    </UIProvider>
  );
}

export default App;
