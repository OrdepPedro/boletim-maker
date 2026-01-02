import { create } from 'zustand';
import { temporal } from 'zundo';
import { v4 as uuidv4 } from 'uuid';
import { fabric } from 'fabric';
import type {
  EditorStore,
  Page,
  Widget,
  PageMargins,
} from './types';
import {
  CANVAS_CONFIG,
  DEFAULT_MARGINS,
  DEFAULT_TEXT_STYLE,
} from './types';

const createNewPage = (title?: string): Page => ({
  id: uuidv4(),
  title: title || `Página ${Date.now()}`,
  widgets: [],
  margins: { ...DEFAULT_MARGINS },
  backgroundColor: '#ffffff',
});

// Helper para comparação rasa de estilos (evita updates desnecessários)
const isDeepEqual = (obj1: any, obj2: any) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      pages: [createNewPage('Página 1')],
      activePageId: null,
      selectedWidgetId: null,
      canvasRef: null,
      config: CANVAS_CONFIG,
      zoom: 1,
      canUndo: false,
      canRedo: false,

      addPage: () => {
        const newPage = createNewPage(`Página ${get().pages.length + 1}`);
        set((state) => ({
          pages: [...state.pages, newPage],
          activePageId: newPage.id,
        }));
      },

      removePage: (pageId: string) => {
        set((state) => {
          const filteredPages = state.pages.filter((p) => p.id !== pageId);
          const newActiveId =
            state.activePageId === pageId && filteredPages.length > 0
              ? filteredPages[0].id
              : state.activePageId;

          return {
            pages: filteredPages,
            activePageId: newActiveId,
          };
        });
      },

      setActivePage: (pageId: string) => {
        // Evita re-render se já estiver na página
        if (get().activePageId === pageId) return;
        set({ activePageId: pageId, selectedWidgetId: null });
      },

      updatePageMargins: (pageId: string, margins: Partial<PageMargins>) => {
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === pageId
              ? { ...page, margins: { ...page.margins, ...margins } }
              : page
          ),
        }));
      },

      setZoom: (zoom) => set({ zoom }),

      zoomIn: () => {
        const currentZoom = get().zoom;
        const newZoom = Math.min(currentZoom + 0.1, 3);
        set({ zoom: parseFloat(newZoom.toFixed(1)) });
      },

      zoomOut: () => {
        const currentZoom = get().zoom;
        const newZoom = Math.max(currentZoom - 0.1, 0.1);
        set({ zoom: parseFloat(newZoom.toFixed(1)) });
      },

      addWidget: (widget: Omit<Widget, 'id'>) => {
        const activePage = get().getActivePage();
        if (!activePage) return;

        const newWidget: Widget = {
          ...widget,
          id: uuidv4(),
        };

        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === activePage.id
              ? { ...page, widgets: [...page.widgets, newWidget] }
              : page
          ),
          selectedWidgetId: newWidget.id,
        }));
      },

      addTextWidget: () => {
        const activePage = get().getActivePage();
        if (!activePage) return;

        const centerX = CANVAS_CONFIG.width / 2;
        const centerY = CANVAS_CONFIG.height / 2;

        const newWidget: Widget = {
          id: uuidv4(),
          type: 'text',
          content: 'Clique para editar',
          position: {
            x: centerX - 75,
            y: centerY - 10,
            width: 150,
            height: 40,
            scaleX: 1,
            scaleY: 1
          },
          style: { 
            ...DEFAULT_TEXT_STYLE,
            fontSize: 20,
            textAlign: 'center' 
          },
        };

        // Estado 1: Adiciona e já seleciona
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === activePage.id
              ? { ...page, widgets: [...page.widgets, newWidget] }
              : page
          ),
          selectedWidgetId: newWidget.id,
        }));

        // Adiciona visualmente ao canvas
        const canvas = get().canvasRef;
        if (canvas) {
          const textObject = new fabric.Textbox('Clique para editar', {
            left: centerX - 75,
            top: centerY - 10,
            width: 150,
            fontSize: 20,
            fontFamily: 'Arial',
            textAlign: 'center',
            splitByGrapheme: false,
            fill: '#000000'
          });

          (textObject as any).widgetId = newWidget.id;
          canvas.add(textObject);
          canvas.setActiveObject(textObject); // Isso dispara 'selection:created'
          canvas.requestRenderAll();
        }
      },

      addImageWidget: (imageUrl: string) => {
        const activePage = get().getActivePage();
        if (!activePage) return;

        get().addWidget({
          type: 'image',
          content: imageUrl,
          position: {
            x: 50,
            y: 50,
            width: 200,
            height: 200,
            scaleX: 1,
            scaleY: 1
          },
          style: { opacity: 1 },
        });
      },

      // === CORREÇÃO DE REDUNDÂNCIA AQUI ===
      updateWidget: (widgetId: string, updates: Partial<Widget>) => {
        const activePage = get().getActivePage();
        if (!activePage) return;

        // Verifica se realmente houve mudança antes de disparar o set (salvar histórico)
        const currentWidget = activePage.widgets.find(w => w.id === widgetId);
        if (currentWidget) {
          let hasChanges = false;
          
          // Checagem rasa das chaves principais
          for (const key in updates) {
            const k = key as keyof Widget;
            // Se for objeto (style/position), compara stringify
            if (typeof updates[k] === 'object' && updates[k] !== null) {
              if (!isDeepEqual(updates[k], currentWidget[k])) {
                hasChanges = true;
                break;
              }
            } else if (updates[k] !== currentWidget[k]) {
              hasChanges = true;
              break;
            }
          }
          
          if (!hasChanges) return; // Aborta se for idêntico
        }

        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === activePage.id
              ? {
                  ...page,
                  widgets: page.widgets.map((widget) =>
                    widget.id === widgetId
                      ? { ...widget, ...updates }
                      : widget
                  ),
                }
              : page
          ),
        }));
      },

      removeWidget: (widgetId: string) => {
        const activePage = get().getActivePage();
        if (!activePage) return;

        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === activePage.id
              ? {
                  ...page,
                  widgets: page.widgets.filter((w) => w.id !== widgetId),
                }
              : page
          ),
          selectedWidgetId: null, // Limpa seleção ao remover
        }));
      },

      // === CORREÇÃO DE REDUNDÂNCIA AQUI ===
      setSelectedWidget: (widgetId: string | null) => {
        // Se o ID já é o mesmo, NÃO faz nada.
        // Isso impede que o evento do canvas crie um histórico duplicado.
        if (get().selectedWidgetId === widgetId) return;
        
        set({ selectedWidgetId: widgetId });
      },

      setCanvasRef: (canvas: fabric.Canvas | null) => {
        set({ canvasRef: canvas });
      },

      syncWidgetFromCanvas: (fabricObject: fabric.Object) => {
        const widgetId = (fabricObject as any).widgetId;
        if (!widgetId) return;

        const updates: Partial<Widget> = {
          position: {
            x: fabricObject.left || 0,
            y: fabricObject.top || 0,
            width: (fabricObject.width || 0) * (fabricObject.scaleX || 1),
            height: (fabricObject.height || 0) * (fabricObject.scaleY || 1),
            angle: fabricObject.angle || 0,
            scaleX: 1,
            scaleY: 1,
          },
        };

        if (fabricObject.type === 'textbox') {
          const textObj = fabricObject as fabric.Textbox;
          updates.content = textObj.text || '';
          
          if (textObj.scaleX !== 1) {
             updates.position!.width = (textObj.width || 0) * (textObj.scaleX || 1);
          } else {
             updates.position!.width = textObj.width || 0;
          }

          updates.style = {
            fontSize: textObj.fontSize,
            fontFamily: textObj.fontFamily,
            fontWeight: textObj.fontWeight,
            fontStyle: textObj.fontStyle,
            textAlign: textObj.textAlign,
            fill: textObj.fill as string,
          };
        }

        get().updateWidget(widgetId, updates);
      },

      getActivePage: () => {
        const state = get();
        return state.pages.find((p) => p.id === state.activePageId);
      },

      getSelectedWidget: () => {
        const state = get();
        const activePage = state.getActivePage();
        if (!activePage) return undefined;
        return activePage.widgets.find((w) => w.id === state.selectedWidgetId);
      },

      undo: () => {
        const temporalState = (useEditorStore as any).temporal.getState();
        if (temporalState?.undo) temporalState.undo();
      },
      
      redo: () => {
        const temporalState = (useEditorStore as any).temporal.getState();
        if (temporalState?.redo) temporalState.redo();
      },
    }),
    {
      partialize: (state) => ({
        pages: state.pages,
        activePageId: state.activePageId,
      }),
      limit: 50,
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b), // Ajuda o zundo a detectar mudanças reais
    }
  )
);