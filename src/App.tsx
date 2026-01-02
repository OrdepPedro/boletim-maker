import { useEffect } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { CanvasEditor } from './CanvasEditor';
import { RightSidebar } from './RightSidebar';
import { useEditorStore } from './useEditorStore';
import { fabric } from 'fabric';

function App() {
  const { pages, setActivePage, undo, redo, removeWidget, canvasRef } = useEditorStore();

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Atalhos de Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Atalho de DELETE
      if (e.key === 'Delete') {
        if (!canvasRef) return;
        const activeObj = canvasRef.getActiveObject();

        if (activeObj) {
          // Não deletar se estiver editando texto
          if (activeObj.type === 'i-text' && (activeObj as fabric.IText).isEditing) return;
          if (activeObj.type === 'textbox' && (activeObj as fabric.Textbox).isEditing) return;

          const widgetId = (activeObj as any).widgetId;
          if (widgetId) {
            canvasRef.remove(activeObj);
            removeWidget(widgetId);
            canvasRef.renderAll();
          }
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

  return (
    // Layout principal sem o header
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <LeftSidebar />

      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-hidden relative">
          <CanvasEditor />
        </div>
      </main>

      <RightSidebar />
    </div>
  );
}

export default App;