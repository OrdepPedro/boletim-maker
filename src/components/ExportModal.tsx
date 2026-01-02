import React, { useState, useEffect, useCallback } from 'react';
import { X, Printer, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { useEditorStore } from '../useEditorStore';
import { jsPDF } from 'jspdf';
import { fabric } from 'fabric';
import { CANVAS_CONFIG } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BookletRole = 'capa' | 'contracapa' | 'miolo1' | 'miolo2';

interface PageAssignment {
  capa: string;
  contracapa: string;
  miolo1: string;
  miolo2: string;
}

// Estado para armazenar as imagens geradas para o preview
interface PreviewImages {
  capa: string | null;
  contracapa: string | null;
  miolo1: string | null;
  miolo2: string | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { pages } = useEditorStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  
  const [assignment, setAssignment] = useState<PageAssignment>({
    capa: pages[0]?.id || '',
    contracapa: pages[1]?.id || '',
    miolo1: pages[2]?.id || '',
    miolo2: pages[3]?.id || '',
  });

  const [previews, setPreviews] = useState<PreviewImages>({
    capa: null, contracapa: null, miolo1: null, miolo2: null
  });

  // Função core de renderização (reutilizada para Preview e PDF Final)
  const renderPageToImage = useCallback(async (pageId: string, qualityMultiplier: number = 1): Promise<string> => {
    const pageData = pages.find(p => p.id === pageId);
    if (!pageData) return ''; // Retorna vazio se não achar (fallback)

    return new Promise((resolve) => {
      const tempCanvasEl = document.createElement('canvas');
      tempCanvasEl.width = CANVAS_CONFIG.width;
      tempCanvasEl.height = CANVAS_CONFIG.height;
      const staticCanvas = new fabric.StaticCanvas(tempCanvasEl);
      
      staticCanvas.setBackgroundColor(pageData.backgroundColor || '#ffffff', () => {
         const promises = pageData.widgets.map(widget => {
            return new Promise<void>((resolveObj) => {
                let obj: fabric.Object | null = null;
                const commonProps = {
                    left: widget.position.x, top: widget.position.y,
                    angle: widget.position.angle || 0,
                    width: widget.position.width, height: widget.position.height,
                    scaleX: widget.position.scaleX || 1, scaleY: widget.position.scaleY || 1,
                    ...widget.style
                };

                if (widget.type === 'text') {
                    obj = new fabric.Textbox(widget.content || '', {
                        ...commonProps,
                        fontSize: widget.style.fontSize,
                        fontFamily: widget.style.fontFamily,
                        fill: widget.style.fill,
                        fontWeight: widget.style.fontWeight,
                        fontStyle: widget.style.fontStyle as any,
                        textAlign: widget.style.textAlign,
                        splitByGrapheme: false,
                    });
                    staticCanvas.add(obj);
                    resolveObj();
                } else if (widget.type === 'shape' && widget.content === 'line') {
                    obj = new fabric.Line([0, 0, widget.position.width, 0], { ...commonProps, stroke: widget.style.stroke, strokeWidth: widget.style.strokeWidth });
                    staticCanvas.add(obj);
                    resolveObj();
                } else if (widget.type === 'image' && widget.content) {
                    fabric.Image.fromURL(widget.content, (img) => {
                        img.set({ ...commonProps, opacity: widget.style.opacity ?? 1 });
                        staticCanvas.add(img);
                        resolveObj();
                    }, { crossOrigin: 'anonymous' });
                } else { resolveObj(); }
            });
         });

         Promise.all(promises).then(() => {
             staticCanvas.renderAll();
             // Multiplier: 0.5 para preview rápido, 2.0 para impressão nítida
             const dataUrl = staticCanvas.toDataURL({ format: 'jpeg', quality: 0.8, multiplier: qualityMultiplier });
             staticCanvas.dispose();
             resolve(dataUrl);
         });
      });
    });
  }, [pages]);

  // Efeito para gerar o Preview automaticamente quando a ordem muda
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsPreviewLoading(true);

    const generatePreviews = async () => {
      // Gera previews com qualidade menor (0.6) para ser rápido
      const [c, cc, m1, m2] = await Promise.all([
        renderPageToImage(assignment.capa, 0.6),
        renderPageToImage(assignment.contracapa, 0.6),
        renderPageToImage(assignment.miolo1, 0.6),
        renderPageToImage(assignment.miolo2, 0.6),
      ]);

      if (isMounted) {
        setPreviews({ capa: c, contracapa: cc, miolo1: m1, miolo2: m2 });
        setIsPreviewLoading(false);
      }
    };

    // Pequeno debounce para não travar se o usuário trocar rápido
    const timer = setTimeout(() => {
        generatePreviews();
    }, 500);

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [assignment, isOpen, renderPageToImage]);

  if (!isOpen) return null;

  // Validação de quantidade
  if (pages.length !== 4) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3 text-amber-600 mb-4">
            <AlertTriangle size={32} />
            <h2 className="text-xl font-bold">Requisitos de Impressão</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Para exportar no formato livreto (A4 dobrado), você precisa ter exatamente <strong>4 páginas A5</strong>.
            <br />
            Atualmente você tem: <strong>{pages.length} páginas</strong>.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700">Entendi</button>
          </div>
        </div>
      </div>
    );
  }

  const handleAssign = (role: BookletRole, pageId: string) => {
    setAssignment(prev => ({ ...prev, [role]: pageId }));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const widthA4 = 297;
      const heightA4 = 210;
      const widthA5 = widthA4 / 2;

      // Gera imagens de alta resolução (multiplier: 2) para o PDF final
      const imgCapa = await renderPageToImage(assignment.capa, 2);
      const imgContracapa = await renderPageToImage(assignment.contracapa, 2);
      const imgMiolo1 = await renderPageToImage(assignment.miolo1, 2);
      const imgMiolo2 = await renderPageToImage(assignment.miolo2, 2);

      // Folha 1
      doc.addImage(imgContracapa, 'JPEG', 0, 0, widthA5, heightA4);
      doc.addImage(imgCapa, 'JPEG', widthA5, 0, widthA5, heightA4);
      
      doc.addPage();
      
      // Folha 2
      doc.addImage(imgMiolo1, 'JPEG', 0, 0, widthA5, heightA4);
      doc.addImage(imgMiolo2, 'JPEG', widthA5, 0, widthA5, heightA4);

      doc.save('boletim-livreto.pdf');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF.');
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      {/* Modal aumentado para max-w-5xl para caber o preview */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Printer className="text-blue-600" size={20} />
              Configurar Impressão (Livreto A4)
            </h2>
            <p className="text-xs text-gray-500">O PDF será gerado em A4 paisagem, pronto para impressão frente e verso (dobra no meio).</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-1 rounded-full hover:bg-gray-100">
             <X size={24} />
          </button>
        </div>

        {/* Body com Grid de 2 Colunas */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* COLUNA 1: Controles (30%) */}
          <div className="w-full lg:w-1/3 border-r border-gray-200 bg-white flex flex-col overflow-y-auto p-6 space-y-6">
            
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                    <Eye size={16}/> Lado Externo (Folha 1)
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Esquerda (Contracapa)</label>
                        <select value={assignment.contracapa} onChange={(e) => handleAssign('contracapa', e.target.value)} className="w-full text-sm p-2 border rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                             {pages.map((p, i) => <option key={p.id} value={p.id}>{p.title || `Página ${i+1}`}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Direita (Capa)</label>
                        <select value={assignment.capa} onChange={(e) => handleAssign('capa', e.target.value)} className="w-full text-sm p-2 border rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                             {pages.map((p, i) => <option key={p.id} value={p.id}>{p.title || `Página ${i+1}`}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <Eye size={16}/> Lado Interno (Folha 2)
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Esquerda (Miolo 1)</label>
                        <select value={assignment.miolo1} onChange={(e) => handleAssign('miolo1', e.target.value)} className="w-full text-sm p-2 border rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                             {pages.map((p, i) => <option key={p.id} value={p.id}>{p.title || `Página ${i+1}`}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Direita (Miolo 2)</label>
                        <select value={assignment.miolo2} onChange={(e) => handleAssign('miolo2', e.target.value)} className="w-full text-sm p-2 border rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                             {pages.map((p, i) => <option key={p.id} value={p.id}>{p.title || `Página ${i+1}`}</option>)}
                        </select>
                    </div>
                </div>
            </div>

          </div>

          {/* COLUNA 2: Visualização (70%) */}
          <div className="w-full lg:w-2/3 bg-gray-100 p-8 overflow-y-auto flex flex-col items-center gap-8">
            
            {isPreviewLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <RefreshCw className="animate-spin" size={32} />
                    <span className="text-sm font-medium">Gerando pré-visualização...</span>
                </div>
            ) : (
                <>
                    {/* VISUALIZAÇÃO FOLHA 1 */}
                    <div className="w-full max-w-3xl">
                        <div className="text-center mb-2 text-sm font-bold text-gray-500 uppercase tracking-wider">Folha 1 - Lado Externo</div>
                        {/* Simulação de Folha A4 Paisagem (Aspect Ratio A4 ~1.41) */}
                        <div className="bg-white shadow-xl rounded-sm w-full aspect-[297/210] flex border border-gray-300 relative overflow-hidden">
                            {/* Metade Esquerda: Contracapa */}
                            <div className="flex-1 border-r border-dashed border-gray-300 relative bg-gray-50 flex items-center justify-center overflow-hidden">
                                {previews.contracapa ? (
                                    <img src={previews.contracapa} alt="Contracapa" className="w-full h-full object-contain" />
                                ) : <span className="text-gray-300 text-xs">Vazio</span>}
                                <span className="absolute bottom-2 left-2 text-[10px] bg-black/10 px-2 py-0.5 rounded text-gray-600">Contracapa</span>
                            </div>
                            
                            {/* Metade Direita: Capa */}
                            <div className="flex-1 relative bg-gray-50 flex items-center justify-center overflow-hidden">
                                {previews.capa ? (
                                    <img src={previews.capa} alt="Capa" className="w-full h-full object-contain" />
                                ) : <span className="text-gray-300 text-xs">Vazio</span>}
                                <span className="absolute bottom-2 right-2 text-[10px] bg-black/10 px-2 py-0.5 rounded text-gray-600">Capa</span>
                            </div>

                            {/* Linha de Dobra Central */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-transparent border-r border-dashed border-blue-400 z-10 pointer-events-none opacity-50"></div>
                        </div>
                    </div>

                    {/* VISUALIZAÇÃO FOLHA 2 */}
                    <div className="w-full max-w-3xl pb-8">
                        <div className="text-center mb-2 text-sm font-bold text-gray-500 uppercase tracking-wider">Folha 2 - Lado Interno</div>
                        <div className="bg-white shadow-xl rounded-sm w-full aspect-[297/210] flex border border-gray-300 relative overflow-hidden">
                            {/* Metade Esquerda: Miolo 1 */}
                            <div className="flex-1 border-r border-dashed border-gray-300 relative bg-gray-50 flex items-center justify-center overflow-hidden">
                                {previews.miolo1 ? (
                                    <img src={previews.miolo1} alt="Miolo 1" className="w-full h-full object-contain" />
                                ) : <span className="text-gray-300 text-xs">Vazio</span>}
                                <span className="absolute bottom-2 left-2 text-[10px] bg-black/10 px-2 py-0.5 rounded text-gray-600">Pág. Esquerda</span>
                            </div>
                            
                            {/* Metade Direita: Miolo 2 */}
                            <div className="flex-1 relative bg-gray-50 flex items-center justify-center overflow-hidden">
                                {previews.miolo2 ? (
                                    <img src={previews.miolo2} alt="Miolo 2" className="w-full h-full object-contain" />
                                ) : <span className="text-gray-300 text-xs">Vazio</span>}
                                <span className="absolute bottom-2 right-2 text-[10px] bg-black/10 px-2 py-0.5 rounded text-gray-600">Pág. Direita</span>
                            </div>

                             {/* Linha de Dobra Central */}
                             <div className="absolute top-0 bottom-0 left-1/2 w-px bg-transparent border-r border-dashed border-blue-400 z-10 pointer-events-none opacity-50"></div>
                        </div>
                    </div>
                </>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 z-10">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
            disabled={isGenerating}
          >
            Voltar
          </button>
          <button 
            onClick={generatePDF}
            disabled={isGenerating || isPreviewLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            {isGenerating ? 'Gerando PDF...' : 'Baixar PDF para Impressão'}
          </button>
        </div>
      </div>
    </div>
  );
};