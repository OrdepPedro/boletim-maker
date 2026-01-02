import { supabase } from './supabaseClient';
import { 
  Bold, Italic, Trash2, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Link2, Unlink2,
  Save, Download 
} from 'lucide-react';
import { useEditorStore } from './useEditorStore';
import { fabric } from 'fabric';
import { useState, useEffect } from 'react';
import { ExportModal } from './components/ExportModal';

export const RightSidebar: React.FC = () => {
  const {
    selectedWidgetId, getSelectedWidget, removeWidget, canvasRef,
    activePageId, pages, updatePageMargins
  } = useEditorStore();

  const selectedWidget = getSelectedWidget();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // === ESTADOS LOCAIS (WIDGETS) ===
  const [localFontSize, setLocalFontSize] = useState<number>(16);
  const [localTextContent, setLocalTextContent] = useState<string>('');
  const [localFontWeight, setLocalFontWeight] = useState<string | number>('normal');
  const [localFontStyle, setLocalFontStyle] = useState<string>('normal');
  const [localTextAlign, setLocalTextAlign] = useState<string>('left');
  const [localFill, setLocalFill] = useState<string>('#000000');
  const [localOpacity, setLocalOpacity] = useState<number>(1);

  // === ESTADOS LOCAIS (MARGENS) ===
  const activePage = pages.find(p => p.id === activePageId);
  const [localMargins, setLocalMargins] = useState({ top: 20, right: 20, bottom: 20, left: 20 });
  
  const [linkVertical, setLinkVertical] = useState(false); 
  const [linkHorizontal, setLinkHorizontal] = useState(false);

  // === FUNÇÕES DE SALVAR/EXPORTAR ===
  const handleSave = async () => {
    const state = useEditorStore.getState();
    const dataToSave = {
      pages: state.pages,
      config: state.config,
    };
    
    // Pega o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Você precisa estar logado.');

    // Salva no banco (Upsert = Atualiza se existir, Cria se não existir)
    const { error } = await supabase
      .from('projects')
      .upsert({ 
        user_id: user.id, 
        content: dataToSave,
        title: 'Meu Projeto', // Você pode melhorar isso depois para ter vários projetos
        // O ID é gerado auto na criação, ou você pode fixar um ID se quiser apenas 1 projeto por usuario
      }, { onConflict: 'user_id' }) // Isso garante 1 projeto por usuário por enquanto para simplificar
      .select();

    if (error) {
      console.error(error);
      alert('Erro ao salvar na nuvem.');
    } else {
      alert('Projeto salvo na nuvem com sucesso!');
    }
  };

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  // === SINCRONIZAÇÃO (Store -> Local) ===
  useEffect(() => {
    if (activePage) setLocalMargins(activePage.margins);
  }, [activePageId, activePage]);

  useEffect(() => {
    if (selectedWidget) {
      if (selectedWidget.type === 'text') {
        setLocalFontSize(selectedWidget.style.fontSize || 16);
        setLocalTextContent(selectedWidget.content || '');
        setLocalFontWeight(selectedWidget.style.fontWeight || 'normal');
        setLocalFontStyle(selectedWidget.style.fontStyle || 'normal');
        setLocalTextAlign(selectedWidget.style.textAlign || 'left');
        setLocalFill(selectedWidget.style.fill || '#000000');
      } else if (selectedWidget.type === 'image') {
        setLocalOpacity(selectedWidget.style.opacity ?? 1);
      }
    }
  }, [selectedWidgetId]);

  // === ATUALIZAÇÕES VISUAIS E COMMITS (WIDGETS) ===
  const updateVisualsOnly = (key: string, value: any) => {
    if (!canvasRef) return;
    const activeObj = canvasRef.getActiveObject();
    if (activeObj) {
      if (key === 'textAlign' && activeObj.type === 'textbox') {
         (activeObj as fabric.Textbox).set('textAlign', value);
      } else {
         activeObj.set(key as any, value);
      }
      canvasRef.requestRenderAll();
    }
  };

  const commitToStore = (key: string, value: any, isStyle: boolean = true) => {
    const store = useEditorStore.getState();
    const currentWidget = store.getSelectedWidget();
    if (!currentWidget || currentWidget.id !== selectedWidgetId) return;
    let updates: any;
    if (isStyle) {
      updates = { style: { ...currentWidget.style, [key]: value } };
    } else {
      updates = { [key]: value };
    }
    store.updateWidget(currentWidget.id, updates);
  };

  // === HANDLERS DE MARGENS ===
  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', value: number) => {
    let newMargins = { ...localMargins, [side]: value };
    
    if (linkVertical && (side === 'top' || side === 'bottom')) {
      newMargins[side === 'top' ? 'bottom' : 'top'] = value;
    }
    if (linkHorizontal && (side === 'left' || side === 'right')) {
      newMargins[side === 'left' ? 'right' : 'left'] = value;
    }
    setLocalMargins(newMargins);
  };
  
  const handleMarginCommit = () => { 
    if (activePageId) updatePageMargins(activePageId, localMargins); 
  };
  
  const toggleLinkVertical = () => { 
    const newVal = !linkVertical; 
    setLinkVertical(newVal); 
    if (newVal) { 
      const newMargins = { ...localMargins, bottom: localMargins.top }; 
      setLocalMargins(newMargins); 
      if (activePageId) updatePageMargins(activePageId, newMargins); 
    }
  };
  
  const toggleLinkHorizontal = () => { 
    const newVal = !linkHorizontal; 
    setLinkHorizontal(newVal); 
    if (newVal) { 
      const newMargins = { ...localMargins, right: localMargins.left }; 
      setLocalMargins(newMargins); 
      if (activePageId) updatePageMargins(activePageId, newMargins); 
    }
  };

  // === HANDLERS DE WIDGETS ===
  const handleFontSizeInput = (val: number) => { setLocalFontSize(val); updateVisualsOnly('fontSize', val); };
  const handleFontSizeCommit = () => { commitToStore('fontSize', localFontSize); };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; setLocalTextContent(val);
    if (canvasRef) { const obj = canvasRef.getActiveObject() as fabric.IText; if(obj) { obj.set('text', val); canvasRef.requestRenderAll(); }}
  };
  const handleTextCommit = () => { useEditorStore.getState().updateWidget(selectedWidgetId!, { content: localTextContent }); };
  
  const handleBoldToggle = () => { const newVal = (localFontWeight === 'bold' || localFontWeight === 700) ? 'normal' : 'bold'; setLocalFontWeight(newVal); updateVisualsOnly('fontWeight', newVal); commitToStore('fontWeight', newVal); };
  const handleItalicToggle = () => { const newVal = localFontStyle === 'italic' ? 'normal' : 'italic'; setLocalFontStyle(newVal); updateVisualsOnly('fontStyle', newVal); commitToStore('fontStyle', newVal); };
  const handleTextAlign = (align: string) => { setLocalTextAlign(align); updateVisualsOnly('textAlign', align); commitToStore('textAlign', align); };
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; setLocalFill(val); updateVisualsOnly('fill', val); };
  const handleColorCommit = () => { commitToStore('fill', localFill); };
  
  const handleOpacityInput = (val: number) => { setLocalOpacity(val); updateVisualsOnly('opacity', val); };
  const handleOpacityCommit = () => { commitToStore('opacity', localOpacity); };


  // ========== RENDERIZAÇÃO PRINCIPAL ==========
  return (
    <>
      <aside className="w-72 bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
        
        {/* CABEÇALHO FIXO COM AÇÕES */}
        <div className="p-4 border-b border-gray-200 bg-white flex gap-2">
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium">
            <Save size={16} /> Salvar
          </button>
          <button onClick={handleExportClick} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium">
            <Download size={16} /> PDF
          </button>
        </div>

        {/* CONTEÚDO VARIÁVEL (ROLÁVEL) */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {!selectedWidget ? (
            // PAINEL CONFIGURAÇÃO (MARGENS)
            <>
              <div className="p-6 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Settings size={20} /> Configuração</h3>
                <p className="text-xs text-gray-500 mt-1">Margens de impressão (px)</p>
              </div>
              <div className="p-6 space-y-8">
                {/* Vertical */}
                <div>
                  <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><ArrowUp size={12} /> Vertical <ArrowDown size={12} /></span></div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative"><input type="number" value={localMargins.top} onChange={(e) => handleMarginChange('top', Number(e.target.value))} onBlur={handleMarginCommit} className="w-full h-9 pl-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"/><span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">Topo</span></div>
                    
                    {/* Botão de Link Vertical */}
                    <button onClick={toggleLinkVertical} className={`p-1.5 rounded ${linkVertical ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                      {linkVertical ? <Link2 size={16} /> : <Unlink2 size={16} />}
                    </button>
                    
                    <div className="flex-1 relative"><input type="number" value={localMargins.bottom} onChange={(e) => handleMarginChange('bottom', Number(e.target.value))} onBlur={handleMarginCommit} className="w-full h-9 pl-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"/><span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">Base</span></div>
                  </div>
                </div>
                
                {/* Horizontal */}
                <div>
                  <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><ArrowLeft size={12} /> Horizontal <ArrowRight size={12} /></span></div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative"><input type="number" value={localMargins.left} onChange={(e) => handleMarginChange('left', Number(e.target.value))} onBlur={handleMarginCommit} className="w-full h-9 pl-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"/><span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">Esq.</span></div>
                    
                    {/* Botão de Link Horizontal */}
                    <button onClick={toggleLinkHorizontal} className={`p-1.5 rounded ${linkHorizontal ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                      {linkHorizontal ? <Link2 size={16} /> : <Unlink2 size={16} />}
                    </button>
                    
                    <div className="flex-1 relative"><input type="number" value={localMargins.right} onChange={(e) => handleMarginChange('right', Number(e.target.value))} onBlur={handleMarginCommit} className="w-full h-9 pl-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"/><span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">Dir.</span></div>
                  </div>
                </div>
              </div>
            </>
          ) : selectedWidget.type === 'text' ? (
            // PAINEL TEXTO
            <>
              <div className="p-6 border-b border-gray-200 bg-white"><h3 className="text-lg font-bold text-gray-800">Texto</h3></div>
              <div className="p-6 space-y-6">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estilo</label><div className="flex gap-2"><button onClick={handleBoldToggle} className={`flex-1 h-10 flex items-center justify-center rounded border transition-all ${localFontWeight === 'bold' || localFontWeight === 700 ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300'}`}><Bold size={18} /></button><button onClick={handleItalicToggle} className={`flex-1 h-10 flex items-center justify-center rounded border transition-all ${localFontStyle === 'italic' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300'}`}><Italic size={18} /></button></div></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Alinhamento</label><div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">{[{ t: 'left', I: AlignLeft }, { t: 'center', I: AlignCenter }, { t: 'right', I: AlignRight }, { t: 'justify', I: AlignJustify }].map(opt => (<button key={opt.t} onClick={() => handleTextAlign(opt.t)} className={`flex-1 h-9 flex items-center justify-center border-r last:border-r-0 ${localTextAlign === opt.t ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}><opt.I size={18} /></button>))}</div></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tamanho</label><div className="flex items-center gap-3"><input type="range" min="8" max="120" value={localFontSize} onChange={(e) => handleFontSizeInput(parseInt(e.target.value))} onMouseUp={handleFontSizeCommit} className="flex-1 cursor-pointer accent-blue-600" style={{ appearance: 'auto', WebkitAppearance: 'slider-horizontal' as any }}/><input type="number" min="8" max="200" value={localFontSize} onChange={(e) => handleFontSizeInput(parseInt(e.target.value))} onBlur={handleFontSizeCommit} className="w-16 h-9 pl-2 border border-gray-300 rounded text-sm text-center"/></div></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cor</label><div className="flex items-center gap-3 p-2 border border-gray-300 rounded bg-white cursor-pointer" onClick={() => document.getElementById('colorPicker')?.click()}><input id="colorPicker" type="color" value={localFill} onChange={handleColorChange} onBlur={handleColorCommit} className="w-8 h-8 rounded border-0 p-0 cursor-pointer"/><span className="text-sm font-mono text-gray-600 uppercase flex-1">{localFill}</span></div></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Conteúdo</label><textarea value={localTextContent} onChange={handleTextChange} onBlur={handleTextCommit} className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="pt-6 border-t border-gray-200"><button onClick={() => { if (confirm('Excluir?')) { if (canvasRef?.getActiveObject()) canvasRef.remove(canvasRef.getActiveObject()!); removeWidget(selectedWidget.id); }}} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"><Trash2 size={16} /> Excluir Elemento</button></div>
              </div>
            </>
          ) : (
            // PAINEL IMAGEM/LINHA
            <>
               <div className="p-6 border-b border-gray-200 bg-white"><h3 className="text-lg font-bold text-gray-800 capitalize">{selectedWidget.type === 'shape' ? 'Linha' : 'Imagem'}</h3></div>
               <div className="p-6 flex-1 space-y-6">
                {selectedWidget.type === 'image' && (<div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opacidade</label><input type="range" min="0" max="100" value={localOpacity * 100} onChange={(e) => handleOpacityInput(parseInt(e.target.value) / 100)} onMouseUp={handleOpacityCommit} className="w-full cursor-pointer accent-blue-600" style={{ appearance: 'auto', WebkitAppearance: 'slider-horizontal' as any}} /></div>)}
                <div className="pt-6 border-t border-gray-200 mt-auto"><button onClick={() => { if (confirm('Excluir?')) { if (canvasRef?.getActiveObject()) canvasRef.remove(canvasRef.getActiveObject()!); removeWidget(selectedWidget.id); }}} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition"><Trash2 size={16} /> Excluir</button></div>
               </div>
            </>
          )}
        </div>
      </aside>

      {/* RENDERIZAÇÃO DO MODAL */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />
    </>
  );
};