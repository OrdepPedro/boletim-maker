# 📄 Boletim Maker

Editor visual drag-and-drop para criação de boletins semanais de igrejas no formato A5.

## 🎯 Características

- **Canvas A5**: Dimensões fixas de 400x565px
- **Multipáginas**: Adicione quantas páginas precisar
- **Rich Text**: Formatação avançada com negrito, itálico e tamanhos personalizados
- **Restrição de Margens**: Guias visuais e trava lógica para área segura
- **Undo/Redo**: Histórico completo de alterações (Ctrl+Z / Ctrl+Y)
- **Persistência**: Salvar e carregar projetos em JSON

## 🚀 Instalação

```bash
# Clone o repositório
git clone <seu-repositorio>

# Instale as dependências
npm install

# Execute o projeto
npm run dev
```

## 📦 Stack Tecnológica

- **React 18+** com TypeScript (Strict Mode)
- **Vite** para build ultrarrápido
- **Tailwind CSS** para estilização
- **Fabric.js v5** como engine do canvas
- **Zustand** com middleware Zundo para state management
- **Lucide React** para ícones
- **UUID** para geração de IDs únicos

## 📂 Estrutura de Arquivos

```
src/
├── types.ts              # Interfaces e tipos TypeScript
├── useEditorStore.ts     # Zustand store com Zundo
├── CanvasEditor.tsx      # Componente do canvas Fabric.js
├── LeftSidebar.tsx       # Ferramentas e lista de páginas
├── RightSidebar.tsx      # Painel de propriedades
├── App.tsx               # Layout principal
├── main.tsx              # Entry point
└── index.css             # Estilos globais
```

## 🎨 Funcionalidades Implementadas

### ✅ Gerenciamento de Páginas
- Adicionar novas páginas
- Excluir páginas (com confirmação)
- Navegação entre páginas
- Visualização em miniatura

### ✅ Editor de Texto
- Adicionar caixas de texto
- Formatação: **Negrito** e *Itálico*
- Ajuste de tamanho da fonte (8-72px)
- Escolha de cor
- Edição de conteúdo em tempo real

### ✅ Canvas Interativo
- Drag & drop de elementos
- Redimensionamento
- Rotação
- Guias de margem visuais (tracejado azul)
- Trava automática nas margens

### ✅ Atalhos de Teclado
- `Ctrl+Z` / `Cmd+Z`: Desfazer
- `Ctrl+Y` / `Cmd+Y`: Refazer
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Refazer alternativo

## 🔧 Próximos Passos

### Fase 2 - Imagens e Mídia
- [ ] Upload de imagens
- [ ] Biblioteca de imagens
- [ ] Crop e ajuste de imagem

### Fase 3 - Exportação
- [ ] Geração de PDF com imposição A4
- [ ] Preview de impressão
- [ ] Exportação de páginas individuais

### Fase 4 - Aprimoramentos
- [ ] Templates pré-definidos
- [ ] Layers e agrupamento
- [ ] Duplicação de elementos
- [ ] Alinhamento e distribuição
- [ ] Grade e snapping

## 📝 Arquitetura de Estado

O estado da aplicação é gerenciado através do Zustand com o middleware Zundo para Undo/Redo:

```typescript
interface EditorState {
  pages: Page[];              // Array de páginas
  activePageId: string | null; // Página em edição
  selectedWidgetId: string | null; // Elemento selecionado
  canvasRef: fabric.Canvas | null; // Referência ao canvas
  config: CanvasConfig;        // Configurações globais
}
```

### Sincronização Bidirecional

O sistema mantém sincronização entre:
1. **Store Zustand** (fonte da verdade)
2. **Canvas Fabric.js** (representação visual)

Quando um objeto é modificado no canvas, o evento `object:modified` atualiza o store. Quando o store muda, o canvas é re-renderizado.

## 🎓 Boas Práticas Implementadas

- ✅ TypeScript Strict Mode habilitado
- ✅ Separação clara de responsabilidades
- ✅ Componentes funcionais com hooks
- ✅ Estado imutável (Zustand)
- ✅ Tipagem forte em todas as interfaces
- ✅ Tratamento de edge cases
- ✅ Código comentado e documentado

## 📄 Licença

MIT License - Sinta-se livre para usar em seus projetos!

---

**Desenvolvido com ❤️ para comunidades religiosas**