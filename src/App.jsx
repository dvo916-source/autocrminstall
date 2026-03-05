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

  // 🔥 KILL SWITCH REALTIME TRIGGER
  // Usado para forçar o re-render das permissões se o Supabase alterar os módulos
  const [moduleSyncStamp, setModuleSyncStamp] = useState(Date.now());

  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    const handleLojasUpdate = (e, table) => {
      if (table === 'lojas' || table === 'all') {
        console.log('🛑 [Kill Switch] Alteração de Módulos detectada na Nuvem!');
        // Se a loja não atualizar o contexto automaticamente, a forma mais garantida 
        // de efetivar o bloqueio no SO do cliente instantaneamente é forçar um reload.
        // Se preferir algo mais sutil, troque por um fetch atualizado da loja.
        setTimeout(() => window.location.reload(), 1500);
      }
    };
    ipcRenderer.on('refresh-data', handleLojasUpdate);
    return () => ipcRenderer.removeListener('refresh-data', handleLojasUpdate);
  }, []);

  // 🔥 AUTO-SELECT STORE FOR COMMON USERS
  useEffect(() => {
    if (user && user.role !== 'developer' && user.loja_id && !currentLoja && lojas.length > 0) {
      const target = lojas.find(l => l.id === user.loja_id);
      if (target) {
        console.log('🏪 [App] Auto-selecionando loja para o usuário:', target.nome);
        switchLoja(target);
      }
    }
  }, [user, currentLoja, lojas, switchLoja]);

  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    const handleNav = (e, route) => {
      setTimeout(() => navigate(route), 50);
    };
    ipcRenderer.on('navigate-to', handleNav);
    return () => ipcRenderer.removeListener('navigate-to', handleNav);
  }, [navigate]);

  const hasPermission = (path) => {
    // Força re-render caso os módulos mudem no realtime
    const _stamp = moduleSyncStamp;

    // Se é a página inicial, todo mundo logado passa
    if (path === '/' || path === '/diario') return true;

    // 📦 Lista oficial de Módulos Comerciais (O que você vende)
    const modulosComerciais = ['whatsapp', 'estoque', 'visitas', 'metas', 'portais', 'ia-chat', 'usuarios', 'crm'];
    const moduleName = path.replace('/', '');

    // 1. CHECA PRIMEIRO O PLANO DA LOJA (Mas apenas para módulos comerciais)
    if (currentLoja && modulosComerciais.includes(moduleName)) {
      const lojaModulosRaw = currentLoja?.modulos;
      let enabledModules = [];
      try {
        enabledModules = typeof lojaModulosRaw === 'string' ? JSON.parse(lojaModulosRaw) : lojaModulosRaw;
        if (!Array.isArray(enabledModules)) enabledModules = [];
      } catch (e) { enabledModules = []; }

      // 🔥 A VISÃO DO CLIENTE: Se a loja NÃO pagou pelo módulo, ninguém passa (Nem o Developer)
      if (!enabledModules.includes(moduleName)) {
        return false;
      }
    }

    // 2. SE A LOJA TEM O MÓDULO (Ou se é uma página de sistema como /ia-prompts)
    // O Developer e o Admin da loja têm acesso total ao que sobrou.
    if (user?.role === 'developer') return true;
    if (isAdmin) return true;

    // 3. SE FOR VENDEDOR/SDR, OLHA AS PERMISSÕES INDIVIDUAIS DELE
    if (!user?.permissions || user?.permissions === '[]') return false;
    let perms = [];
    try {
      perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    } catch { perms = []; }
    if (!Array.isArray(perms)) perms = [];

    return perms.includes(path);
  };

  // 🛡️ O "LEÃO DE CHÁCARA" DAS ROTAS
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

        {/* Rotas Protegidas pelo RouteGuard */}
        <Route path="/whatsapp" element={<RouteGuard path="/whatsapp" element={<Whatsapp />} />} />
        <Route path="/estoque" element={<RouteGuard path="/estoque" element={<Estoque user={user} />} />} />
        <Route path="/visitas" element={<RouteGuard path="/visitas" element={<Visitas user={user} />} />} />
        <Route path="/metas" element={<RouteGuard path="/metas" element={<Metas />} />} />
        <Route path="/portais" element={<RouteGuard path="/portais" element={<Portais />} />} />
        <Route path="/ia-chat" element={<RouteGuard path="/ia-chat" element={<IaChat />} />} />
        <Route path="/usuarios" element={<RouteGuard path="/usuarios" element={<Usuarios user={user} />} />} />
        <Route path="/crm" element={<RouteGuard path="/crm" element={<CRM user={user} />} />} />

        {/* Rotas Exclusivas Developer */}
        <Route path="/central-lojas" element={user?.role === 'developer' ? <StoreManagement /> : <Navigate to="/" />} />
        <Route path="/migrar-supabase/:lojaId?" element={user?.role === 'developer' ? <MigracaoSupabase /> : <Navigate to="/" />} />

        {/* Rotas Exclusivas Admin/Developer */}
        {isAdmin && (
          <>
            <Route path="/ia-prompts" element={<RouteGuard path="/ia-prompts" element={<PromptConfig />} />} />
            <Route path="/admin-ia" element={<RouteGuard path="/admin-ia" element={<AdminIA />} />} />
            <Route path="/crm-ia" element={<RouteGuard path="/crm-ia" element={<ChatCRM />} />} />
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
    const stored = localStorage.getItem('vexcore_user');
    const { ipcRenderer } = window.require('electron');

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
            ipcRenderer.invoke('full-cloud-sync', userToSet.loja_id).catch(err => console.error("Startup Sync Error:", err));
          }

          const freshData = await ipcRenderer.invoke('get-user', userToSet.username);

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

    const handleUserDataUpdate = async (event, updatedUsername) => {
      const currentStored = JSON.parse(localStorage.getItem('vexcore_user') || '{}');
      if (updatedUsername.toLowerCase() === currentStored.username?.toLowerCase()) {
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
        } catch (err) { }
      }
    };

    ipcRenderer.on('user-data-updated', handleUserDataUpdate);

    const handleRefreshData = (e, table) => {
      if (table === 'all' || table === 'usuarios') {
        const currentUser = JSON.parse(localStorage.getItem('vexcore_user') || '{}');
        if (currentUser.username) {
          handleUserDataUpdate(null, currentUser.username);
        }
      }
    };
    ipcRenderer.on('refresh-data', handleRefreshData);

    const updateAvail = (e, info) => {
      setUpdateStatus(prev => ({ ...prev, available: true, info }));
      setShowUpdateModal(true);
    };
    const updateProg = (e, percent) => setUpdateStatus(prev => ({ ...prev, progress: percent }));
    const updateReady = (e, info) => setUpdateStatus(prev => ({ ...prev, ready: true, info }));

    ipcRenderer.on('update-available', updateAvail);
    ipcRenderer.on('update-progress', updateProg);
    ipcRenderer.on('update-downloaded', updateReady);

    return () => {
      ipcRenderer.removeListener('user-data-updated', handleUserDataUpdate);
      ipcRenderer.removeListener('refresh-data', handleRefreshData);
      ipcRenderer.removeListener('update-available', updateAvail);
      ipcRenderer.removeListener('update-progress', updateProg);
      ipcRenderer.removeListener('update-downloaded', updateReady);
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

    if (formattedUser.role !== 'developer' && formattedUser.loja_id) {
      localStorage.setItem('active_loja_id', formattedUser.loja_id);
    }

    if (formattedUser.role === 'developer') {
      window.location.hash = '#/central-lojas';
    }
  };

  const handleLogout = () => {
    const activeLojaId = localStorage.getItem('active_loja_id');
    localStorage.clear();
    if (activeLojaId) {
      localStorage.setItem('active_loja_id', activeLojaId);
    }
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
