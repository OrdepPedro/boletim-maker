import { useEffect, useState } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { CanvasEditor } from './CanvasEditor';
import { RightSidebar } from './RightSidebar';
import { useEditorStore } from './useEditorStore';
import { fabric } from 'fabric';
import { supabase } from './supabaseClient'; // Importe o cliente
import { Auth } from './components/Auth';    // Importe a tela de Auth
import { LogOut } from 'lucide-react'; // Importe ícone de sair

function App() {
  const { pages, setActivePage, undo, redo, removeWidget, canvasRef, loadProject } = useEditorStore();
  const [session, setSession] = useState<any>(null);

  // Gerenciar Sessão do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carregar dados ao logar
  // Carregar dados ao logar
  useEffect(() => {
    if (session) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    // Busca o projeto do usuário no banco
    // CORREÇÃO: Removemos a variável 'error' que não estava sendo usada
    const { data } = await supabase
      .from('projects')
      .select('content')
      .eq('user_id', session.user.id)
      .single();

    if (data && data.content) {
      // CORREÇÃO: Agora usamos a função que criamos no store
      loadProject(data.content); 
    }
  };

  // ... (Lógica de Teclado mantida igual) ...
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }
      if (e.key === 'Delete') {
        if (!canvasRef) return;
        const activeObj = canvasRef.getActiveObject();
        if (activeObj) {
          if (activeObj.type === 'i-text' && (activeObj as fabric.IText).isEditing) return;
          if (activeObj.type === 'textbox' && (activeObj as fabric.Textbox).isEditing) return;
          const widgetId = (activeObj as any).widgetId;
          if (widgetId) { canvasRef.remove(activeObj); removeWidget(widgetId); canvasRef.renderAll(); }
        }
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [undo, redo, removeWidget, canvasRef]);

  useEffect(() => {
    if (pages.length > 0 && !useEditorStore.getState().activePageId) {
      setActivePage(pages[0].id);
    }
  }, [pages, setActivePage]);

  // Se não estiver logado, mostra tela de Auth
  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <LeftSidebar />
      <main className="flex-1 flex flex-col relative">
        {/* Botão de Sair Flutuante (Temporário, ou coloque na sidebar) */}
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="absolute top-4 right-4 z-50 bg-white p-2 rounded shadow text-red-600 hover:bg-gray-50"
          title="Sair"
        >
          <LogOut size={20}/>
        </button>

        <div className="flex-1 overflow-hidden relative">
          <CanvasEditor />
        </div>
      </main>
      <RightSidebar />
    </div>
  );
}

export default App;