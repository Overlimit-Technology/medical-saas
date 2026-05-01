"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo,
  Redo,
  RemoveFormatting,
  Link2,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

type WysiwygEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const COLORS = ["#000000", "#FF0000", "#00B050", "#0070C0", "#FFC000", "#19b3bc"];

export default function WysiwygEditor({
  content,
  onChange,
  placeholder = "Escribe aqui...",
}: WysiwygEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        allowBase64: true,
      }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Color.configure({
        types: ["textStyle"],
      }),
      TextStyle,
    ],
    content,
    immediatelyRender: false,
    onUpdate({ editor: ed }) {
      onChangeRef.current(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] px-4 py-3 outline-none focus:outline-none text-slate-900 [&_p]:my-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_a]:text-[#19b3bc] [&_a]:underline [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-slate-100",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const handleAddImage = () => {
    const url = prompt("Ingresa la URL de la imagen:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleAddLink = () => {
    setShowLinkInput(true);
  };

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const handleAddTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleRemoveTable = () => {
    editor.chain().focus().deleteTable().run();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="space-y-1.5 border-b border-slate-200 bg-slate-50 px-2 py-2">
        {/* Primera fila - Formato básico */}
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Negrita (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Subrayado"
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-slate-200" />

          {/* Colores */}
          <div className="relative">
            <ToolbarButton
              onClick={() => setShowColorPicker(!showColorPicker)}
              active={showColorPicker}
              title="Color de texto"
            >
              <Palette className="h-4 w-4" />
            </ToolbarButton>
            {showColorPicker && (
              <div className="absolute left-0 top-full z-10 mt-1 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="h-6 w-6 rounded border-2 border-slate-200 transition hover:border-slate-400"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>

          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Limpiar formato"
          >
            <RemoveFormatting className="h-4 w-4" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Deshacer"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rehacer"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Segunda fila - Encabezados y Listas */}
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Título 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Título 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-slate-200" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Lista"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-slate-200" />

          {/* Alineación */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Alinear a la izquierda"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Alinear al centro"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Alinear a la derecha"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <div className="flex-1" />
        </div>

        {/* Tercera fila - Enlaces, Imágenes, Tablas */}
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarButton onClick={handleAddLink} title="Agregar enlace">
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleAddImage} title="Agregar imagen">
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleAddTable} title="Agregar tabla">
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleRemoveTable}
            disabled={!editor.isActive("table")}
            title="Eliminar tabla"
          >
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>

          {showLinkInput && (
            <div className="ml-2 flex gap-1">
              <input
                type="text"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyLink();
                  if (e.key === "Escape") {
                    setShowLinkInput(false);
                    setLinkUrl("");
                  }
                }}
                className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#19b3bc]"
                autoFocus
              />
              <button
                type="button"
                onClick={applyLink}
                className="rounded bg-[#19b3bc] px-2 py-1 text-xs font-medium text-white hover:bg-[#159ea7]"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }}
                className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-300"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-[#19b3bc]/10 text-[#19b3bc]"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      } ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
    >
      {children}
    </button>
  );
}
