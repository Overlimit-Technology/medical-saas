"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import type { EmailTemplateVariable } from "@/domain/clinic-settings/entities/EmailTemplate";

type WysiwygEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variables?: EmailTemplateVariable[];
};

export default function WysiwygEditor({
  content,
  onChange,
  placeholder = "Escribe aqui...",
  variables,
}: WysiwygEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    immediatelyRender: false,
    onUpdate({ editor: ed }) {
      onChangeRef.current(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[220px] px-4 py-3 outline-none focus:outline-none text-slate-900 [&_p]:my-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_a]:text-[#19b3bc] [&_a]:underline",
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

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const insertVariable = (key: string) => {
    editor.chain().focus().insertContent(`{{${key}}}`).run();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Toolbar — fila única */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-2">
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

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Titulo"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Subtitulo"
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

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Izquierda"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Centrar"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Derecha"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton
          onClick={() => setShowLinkInput((v) => !v)}
          active={editor.isActive("link") || showLinkInput}
          title="Enlace"
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        {showLinkInput && (
          <div className="flex gap-1">
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

      {/* Area de edicion */}
      <EditorContent editor={editor} />

      {/* Variables — integradas en el editor */}
      {variables && variables.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="mb-2 text-[11px] font-medium text-slate-400">
            Insertar dato del paciente
          </p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                title={`Ejemplo: ${v.example}`}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-[#19b3bc] hover:bg-[#19b3bc]/5 hover:text-[#19b3bc]"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}
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
