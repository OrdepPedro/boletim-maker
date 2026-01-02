// LeftSidebar.tsx - VERSÃO MELHORADA
import { Type, Image, Minus, Plus, Trash2 } from 'lucide-react';
import { useEditorStore } from './useEditorStore';
import { useRef } from 'react';

export const LeftSidebar: React.FC = () => {
  const {
    pages,
    activePageId,
    addPage,
    addTextWidget,
    setActivePage,
    removePage,
    canvasRef,
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler para adicionar linha/divisória
  const handleAddLine = () => {
    if (!canvasRef) return;

    const activePage = useEditorStore.getState().getActivePage();
    if (!activePage) {
      alert('Selecione uma página primeiro!');
      return;
    }

    // Importar fabric dinamicamente
    import('fabric').then(({ fabric }) => {
      const line = new fabric.Line([50, 100, 350, 100], {
        stroke: '#000000',
        strokeWidth: 2,
        selectable: true,
        hasControls: true,
      });

      const widgetId = `line-${Date.now()}`;
      (line as any).widgetId = widgetId;

      canvasRef.add(line);
      canvasRef.setActiveObject(line);
      canvasRef.renderAll();

      // Adicionar ao store
      useEditorStore.getState().addWidget({
        type: 'shape',
        content: 'line',
        position: {
          x: 50,
          y: 100,
          width: 300,
          height: 0,
        },
        style: {
          stroke: '#000000',
          strokeWidth: 2,
        },
      });
    });
  };

  // Handler para upload de imagem
  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem!');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB!');
      return;
    }

    // Ler o arquivo como Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl || !canvasRef) return;

      const activePage = useEditorStore.getState().getActivePage();
      if (!activePage) {
        alert('Selecione uma página primeiro!');
        return;
      }

      // Adicionar imagem ao canvas
      import('fabric').then(({ fabric }) => {
        fabric.Image.fromURL(imageUrl, (img) => {
          // Redimensionar para caber no canvas
          const maxWidth = 300;
          const maxHeight = 300;
          const scale = Math.min(
            maxWidth / (img.width || 1),
            maxHeight / (img.height || 1)
          );

          img.set({
            left: 50,
            top: 50,
            scaleX: scale,
            scaleY: scale,
          });

          const widgetId = `image-${Date.now()}`;
          (img as any).widgetId = widgetId;

          canvasRef.add(img);
          canvasRef.setActiveObject(img);
          canvasRef.renderAll();

          // Adicionar ao store
          useEditorStore.getState().addWidget({
            type: 'image',
            content: imageUrl,
            position: {
              x: 50,
              y: 50,
              width: (img.width || 200) * scale,
              height: (img.height || 200) * scale,
              scaleX: scale,
              scaleY: scale,
            },
            style: {},
          });
        });
      });
    };

    reader.readAsDataURL(file);

    // Limpar o input para permitir upload da mesma imagem novamente
    event.target.value = '';
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">Boletim Maker</h2>
        <p className="text-xs text-gray-400 mt-1">Editor Visual A5</p>
      </div>

      {/* Ferramentas */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase">
          Ferramentas
        </h3>
        <div className="space-y-2">
          {/* Botão Adicionar Texto */}
          <button
            onClick={addTextWidget}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title="Adicionar caixa de texto"
          >
            <Type size={20} />
            <span className="text-sm font-medium">Adicionar Texto</span>
          </button>

          {/* Botão Adicionar Imagem (Upload) */}
          <button
            onClick={handleImageUpload}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title="Fazer upload de imagem"
          >
            <Image size={20} />
            <span className="text-sm font-medium">Adicionar Imagem</span>
          </button>

          {/* Input oculto para upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Botão Adicionar Linha */}
          <button
            onClick={handleAddLine}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title="Adicionar linha divisória"
          >
            <Minus size={20} />
            <span className="text-sm font-medium">Adicionar Linha</span>
          </button>
        </div>
      </div>

      {/* Lista de Páginas */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">
            Páginas
          </h3>
          <button
            onClick={addPage}
            className="p-1 hover:bg-gray-700 rounded transition"
            title="Adicionar página"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className={`
                group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition
                ${
                  activePageId === page.id
                    ? 'bg-blue-600'
                    : 'bg-gray-800 hover:bg-gray-700'
                }
              `}
              onClick={() => setActivePage(page.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                  w-12 h-16 border-2 rounded flex items-center justify-center text-xs font-bold
                  ${
                    activePageId === page.id
                      ? 'border-white text-white'
                      : 'border-gray-600 text-gray-500'
                  }
                `}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium">{page.title}</p>
                  <p className="text-xs text-gray-400">
                    {page.widgets.length} elemento(s)
                  </p>
                </div>
              </div>

              {pages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Deseja realmente excluir a página "${page.title}"?`
                      )
                    ) {
                      removePage(page.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded transition"
                  title="Excluir página"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        <p>Canvas: 400x565px (A5)</p>
        <p className="mt-1">
          Total: {pages.length} página{pages.length !== 1 ? 's' : ''}
        </p>
      </div>
    </aside>
  );
};