import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from './useEditorStore';
import { CANVAS_CONFIG } from './types';
import { ZoomIn, ZoomOut, Maximize, Undo2, Redo2 } from 'lucide-react';

const deleteIconSvg = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";

const deleteImg = document.createElement('img');
deleteImg.src = deleteIconSvg;

export const CanvasEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  const isRebuildingRef = useRef(false);

  const {
    setCanvasRef,
    syncWidgetFromCanvas,
    setSelectedWidget,
    activePageId,
    pages,
    selectedWidgetId,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    undo,
    redo
  } = useEditorStore();

  const activePage = pages.find((p) => p.id === activePageId);

  // === CONFIGURAÇÃO INICIAL ===
  useEffect(() => {
    function renderIcon(ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride: any, fabricObject: fabric.Object) {
      const size = 24;
      ctx.save();
      ctx.translate(left, top);
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
      ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    function deleteObject(_eventData: MouseEvent, transform: fabric.Transform) {
      const target = transform.target;
      const canvas = target.canvas;
      if (!canvas) return true;

      const widgetId = (target as any).widgetId;
      if (widgetId) {
        useEditorStore.getState().removeWidget(widgetId);
        canvas.remove(target);
        canvas.requestRenderAll();
      }
      return true;
    }

    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
      x: 0.5, y: -0.5, offsetY: -16, offsetX: 16,
      cursorStyle: 'pointer',
      mouseUpHandler: deleteObject as any,
      render: renderIcon,
    });

    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#3b82f6',
      borderColor: '#3b82f6',
      cornerSize: 10,
      padding: 10,
      cornerStyle: 'circle',
    });
  }, []);

  // 1. Inicialização do Canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_CONFIG.width,
      height: CANVAS_CONFIG.height,
      backgroundColor: CANVAS_CONFIG.backgroundColor,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    setCanvasRef(canvas);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      setCanvasRef(null);
    };
  }, [setCanvasRef]);

  // Aplicação do Zoom
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setZoom(zoom);
    canvas.setWidth(CANVAS_CONFIG.width * zoom);
    canvas.setHeight(CANVAS_CONFIG.height * zoom);
    canvas.renderAll();
  }, [zoom]);

  // 2. Renderização da Página Ativa
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !activePage) return;

    // === CORREÇÃO IMPORTANTE ===
    // Removido o bloqueio "if (canvas.getActiveObject()) return;"
    // Isso garante que as margens e a página atualizem mesmo se algo estiver selecionado.
    // O 'isRebuildingRef' abaixo já protege contra loops de eventos.

    isRebuildingRef.current = true;

    canvas.clear();
    canvas.setZoom(zoom);
    canvas.setBackgroundColor(activePage.backgroundColor || '#ffffff', () => {});
    renderMargins(canvas, activePage.margins);

    activePage.widgets.forEach((widget) => {
      let obj: fabric.Object | null = null;

      const commonProps = {
        left: widget.position.x,
        top: widget.position.y,
        angle: widget.position.angle || 0,
      };

      if (widget.type === 'text') {
        const validFontStyle = ['', 'normal', 'italic', 'oblique'].includes(widget.style.fontStyle ?? '')
          ? (widget.style.fontStyle as any) : undefined;

        obj = new fabric.Textbox(widget.content || '', {
          ...commonProps,
          width: widget.position.width || 200,
          fontSize: widget.style.fontSize,
          fontFamily: widget.style.fontFamily,
          fill: widget.style.fill,
          fontWeight: widget.style.fontWeight,
          fontStyle: validFontStyle,
          textAlign: widget.style.textAlign || 'left',
          splitByGrapheme: false,
          lockScalingY: true,
          lockUniScaling: false, 
        });

        obj.setControlsVisibility({
          mt: false, mb: false, ml: true, mr: true, mtr: true,
          tl: false, tr: false, bl: false, br: false
        });
        
      } else if (widget.type === 'shape' && widget.content === 'line') {
        obj = new fabric.Line([0, 0, widget.position.width, 0], {
          ...commonProps,
          stroke: widget.style.stroke,
          strokeWidth: widget.style.strokeWidth,
          strokeDashArray: widget.style.strokeDashArray,
        });
      } else if (widget.type === 'image' && widget.content) {
        fabric.Image.fromURL(widget.content, (img) => {
          img.set({
            ...commonProps,
            scaleX: widget.position.scaleX || 1,
            scaleY: widget.position.scaleY || 1,
            opacity: widget.style.opacity ?? 1,
          });
          (img as any).widgetId = widget.id;
          canvas.add(img);
          
          if (widget.id === selectedWidgetId) {
             canvas.setActiveObject(img);
          }
          canvas.renderAll();
        });
        return;
      }

      if (obj) {
        (obj as any).widgetId = widget.id;
        canvas.add(obj);

        if (widget.id === selectedWidgetId) {
          canvas.setActiveObject(obj);
        }
      }
    });

    setTimeout(() => {
        isRebuildingRef.current = false;
    }, 0);

    canvas.renderAll();
  }, [activePageId, pages]); // Re-renderiza quando pages muda (incluindo margens)

  // 3. Configuração de Eventos
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleSelectionCleared = () => {
      if (isRebuildingRef.current) return;
      setSelectedWidget(null);
    };

    const handleObjectMoving = (e: fabric.IEvent) => {
        const obj = e.target;
        if (!obj || (obj as any).isMarginGuide) return;
        const currentPage = useEditorStore.getState().getActivePage();
        if (!currentPage) return;
        const margins = currentPage.margins;
        const bounds = { left: margins.left, top: margins.top, right: CANVAS_CONFIG.width - margins.right, bottom: CANVAS_CONFIG.height - margins.bottom };
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);
        if (obj.left! < bounds.left) obj.left = bounds.left;
        if (obj.top! < bounds.top) obj.top = bounds.top;
        if (obj.left! + objWidth > bounds.right) obj.left = bounds.right - objWidth;
        if (obj.top! + objHeight > bounds.bottom) obj.top = bounds.bottom - objHeight;
    };

    const handleObjectScaling = (e: fabric.IEvent) => {
      const obj = e.target;
      if (!obj || obj.type !== 'textbox') return;
      const textObj = obj as fabric.Textbox;
      const currentWidth = textObj.width || 0;
      const scaleX = textObj.scaleX || 1;
      const newWidth = currentWidth * scaleX;
      textObj.set({ width: newWidth, scaleX: 1, scaleY: 1 });
    };

    const handleObjectModified = (e: fabric.IEvent) => {
      const obj = e.target;
      if (!obj || (obj as any).isMarginGuide) return;
      if (obj.type === 'textbox') {
        const textObj = obj as fabric.Textbox;
        const newWidth = (textObj.width || 200) * (textObj.scaleX || 1);
        textObj.set({ width: newWidth, scaleX: 1, scaleY: 1 });
      }
      syncWidgetFromCanvas(obj);
    };

    const handleSelectionCreated = (e: fabric.IEvent) => {
      const obj = e.selected?.[0];
      if (obj && !(obj as any).isMarginGuide) setSelectedWidget((obj as any).widgetId || null);
    };
    const handleSelectionUpdated = (e: fabric.IEvent) => {
      const obj = e.selected?.[0];
      if (obj && !(obj as any).isMarginGuide) setSelectedWidget((obj as any).widgetId || null);
    };

    canvas.off('object:moving').on('object:moving', handleObjectMoving);
    canvas.off('object:scaling').on('object:scaling', handleObjectScaling);
    canvas.off('object:modified').on('object:modified', handleObjectModified);
    canvas.off('selection:created').on('selection:created', handleSelectionCreated);
    canvas.off('selection:updated').on('selection:updated', handleSelectionUpdated);
    canvas.off('selection:cleared').on('selection:cleared', handleSelectionCleared);

    return () => {
      canvas.off('object:moving');
      canvas.off('object:scaling');
      canvas.off('object:modified');
      canvas.off('selection:created');
      canvas.off('selection:updated');
      canvas.off('selection:cleared');
    };
  }, [syncWidgetFromCanvas, setSelectedWidget]);

  return (
    <div className="relative flex-1 h-full bg-gray-200 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <div className="shadow-2xl bg-white relative box-content border border-gray-300">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white p-2 rounded-lg shadow-lg border border-gray-200 z-10">
        <button onClick={undo} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Desfazer">
          <Undo2 size={20} />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button onClick={redo} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Refazer">
          <Redo2 size={20} />
        </button>
      </div>

      {/* Zoom */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white p-2 rounded-lg shadow-lg border border-gray-200 z-10">
        <button onClick={zoomOut} className="p-2 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-50" disabled={zoom <= 0.1}>
          <ZoomOut size={20} />
        </button>
        <span className="w-12 text-center text-sm font-semibold text-gray-700 select-none">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-50" disabled={zoom >= 3}>
          <ZoomIn size={20} />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button onClick={() => setZoom(1)} className="p-2 hover:bg-gray-100 rounded text-gray-700">
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
};

function renderMargins(canvas: fabric.Canvas, margins: any) {
  const objects = canvas.getObjects();
  objects.forEach((obj) => {
    if ((obj as any).isMarginGuide) canvas.remove(obj);
  });

  // Garantindo que valores são números
  const mTop = Number(margins.top) || 0;
  const mRight = Number(margins.right) || 0;
  const mBottom = Number(margins.bottom) || 0;
  const mLeft = Number(margins.left) || 0;

  const marginRect = new fabric.Rect({
    left: mLeft,
    top: mTop,
    width: CANVAS_CONFIG.width - mLeft - mRight,
    height: CANVAS_CONFIG.height - mTop - mBottom,
    fill: 'transparent',
    stroke: '#3b82f6',
    strokeWidth: 1,
    strokeDashArray: [5, 5],
    selectable: false,
    evented: false,
    opacity: 0.5,
  });

  (marginRect as any).isMarginGuide = true;
  canvas.add(marginRect);
  canvas.sendToBack(marginRect);
}