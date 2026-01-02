import { fabric } from 'fabric';

export type WidgetType = 'text' | 'image' | 'shape';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface WidgetStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  opacity?: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
  content: string | null;
  style: WidgetStyle;
  groupId?: string;
  locked?: boolean;
  visible?: boolean;
  zIndex?: number;
}

export interface Page {
  id: string;
  title: string;
  widgets: Widget[];
  margins: PageMargins;
  backgroundColor?: string;
}

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface EditorState {
  pages: Page[];
  activePageId: string | null;
  selectedWidgetId: string | null;
  canvasRef: fabric.Canvas | null;
  config: CanvasConfig;
}

export interface EditorActions {
  addPage: () => void;
  removePage: (pageId: string) => void;
  setActivePage: (pageId: string) => void;
  updatePageMargins: (pageId: string, margins: Partial<PageMargins>) => void;
  addWidget: (widget: Omit<Widget, 'id'>) => void;
  addTextWidget: () => void;
  addImageWidget: (imageUrl: string) => void;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;
  removeWidget: (widgetId: string) => void;
  setSelectedWidget: (widgetId: string | null) => void;
  setCanvasRef: (canvas: fabric.Canvas | null) => void;
  syncWidgetFromCanvas: (fabricObject: fabric.Object) => void;
  getActivePage: () => Page | undefined;
  getSelectedWidget: () => Widget | undefined;
  setZoom: (zoom: number) => void; // <--- NOVO
  zoomIn: () => void;              // <--- NOVO
  zoomOut: () => void;
}

export interface EditorStore extends EditorState, EditorActions {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export interface WidgetStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string; // <--- NOVO: Adicione esta linha
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[]; // Ajuste de tipo para evitar erros
  opacity?: number;
}

export const CANVAS_CONFIG: CanvasConfig = {
  width: 400,
  height: 565,
  backgroundColor: '#ffffff',
};

export const DEFAULT_MARGINS: PageMargins = {
  top: 30,
  right: 30,
  bottom: 30,
  left: 30,
};

export const DEFAULT_TEXT_STYLE: WidgetStyle = {
  fontSize: 16,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  fill: '#000000',
};

export interface EditorState {
  pages: Page[];
  activePageId: string | null;
  selectedWidgetId: string | null;
  canvasRef: fabric.Canvas | null;
  config: CanvasConfig;
  zoom: number; // <--- NOVO
}