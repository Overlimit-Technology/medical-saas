"use client";

import { useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import { Copy, Plus } from "lucide-react";

type GrapesJSEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

// Plantillas prediseñadas para emails
const EMAIL_TEMPLATES = {
  blank: {
    name: "Blanco",
    html: `<table style="width: 100%; max-width: 600px; margin: 0 auto; background: white;">
      <tr><td style="padding: 20px;"><h1>Título</h1><p>Tu contenido aquí</p></td></tr>
    </table>`,
  },
  appointmentConfirmation: {
    name: "Confirmación de Cita",
    html: `<table style="width: 100%; max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
      <tr style="background: linear-gradient(135deg, #19b3bc 0%, #0f8f98 100%);"><td style="padding: 20px; color: white; text-align: center;"><h1 style="margin: 0;">Cita Confirmada</h1></td></tr>
      <tr><td style="padding: 20px;">
        <h2>Hola {NOMBRE},</h2>
        <p>Tu cita ha sido confirmada exitosamente.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse; background: #f8f8f8;">
          <tr><td style="padding: 10px; font-weight: bold; width: 40%;">Fecha:</td><td style="padding: 10px;">{FECHA}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Hora:</td><td style="padding: 10px;">{HORA}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Doctor:</td><td style="padding: 10px;">{DOCTOR}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Consultorio:</td><td style="padding: 10px;">{CONSULTORIO}</td></tr>
        </table>
        <p>Si necesitas cambiar la cita, <a href="{LINK_CAMBIO}" style="color: #19b3bc; text-decoration: none;">haz clic aquí</a>.</p>
      </td></tr>
      <tr style="background: #f8f8f8;"><td style="padding: 20px; text-align: center; color: #666; font-size: 12px;">© 2026 {NOMBRE_CLINICA}</td></tr>
    </table>`,
  },
  appointmentReminder: {
    name: "Recordatorio de Cita",
    html: `<table style="width: 100%; max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
      <tr style="background: #FFC000;"><td style="padding: 20px; color: white; text-align: center;"><h1 style="margin: 0;">Recordatorio: Tu cita es mañana</h1></td></tr>
      <tr><td style="padding: 20px;">
        <h2>Hola {NOMBRE},</h2>
        <p>Te recordamos que tienes una cita programada:</p>
        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Hora:</strong> {HORA}</p>
          <p style="margin: 5px 0;"><strong>Doctor:</strong> {DOCTOR}</p>
          <p style="margin: 5px 0;"><strong>Ubicación:</strong> {UBICACION}</p>
        </div>
        <p><a href="{LINK_CONFIRMACION}" style="display: inline-block; background: #19b3bc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Confirmar asistencia</a></p>
      </td></tr>
      <tr style="background: #f8f8f8;"><td style="padding: 20px; text-align: center; color: #666; font-size: 12px;">© 2026 {NOMBRE_CLINICA}</td></tr>
    </table>`,
  },
  welcome: {
    name: "Bienvenida",
    html: `<table style="width: 100%; max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
      <tr style="background: linear-gradient(135deg, #19b3bc 0%, #0f8f98 100%);"><td style="padding: 30px; color: white; text-align: center;"><h1 style="margin: 0; font-size: 32px;">¡Bienvenido!</h1></td></tr>
      <tr><td style="padding: 30px;">
        <p>Hola {NOMBRE},</p>
        <p>Gracias por unirte a nuestra clínica. Estamos emocionados de brindarte el mejor servicio de salud.</p>
        <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0;">Próximos pasos</h3>
          <ul style="text-align: left; display: inline-block;">
            <li>Completa tu perfil médico</li>
            <li>Agrega tus contactos de emergencia</li>
            <li>Revisa nuestras políticas de privacidad</li>
          </ul>
        </div>
        <p style="text-align: center;"><a href="{LINK_PERFIL}" style="display: inline-block; background: #19b3bc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Ir a mi perfil</a></p>
      </td></tr>
      <tr style="background: #f8f8f8;"><td style="padding: 20px; text-align: center; color: #666; font-size: 12px;">© 2026 {NOMBRE_CLINICA}</td></tr>
    </table>`,
  },
};

export default function GrapesJSEditor({
  content,
  onChange,
  placeholder,
}: GrapesJSEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const grapesRef = useRef<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [htmlMode, setHtmlMode] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    // Inicializar GrapesJS
    const editor = grapesjs.init({
      container: editorRef.current,
      fromElement: false,
      height: "600px",
      width: "100%",
      storageManager: false,
      blockManager: {
        blocks: [
          {
            id: "section",
            label: "Sección",
            attributes: { class: "gjs-block-section" },
            content: '<section style="padding: 20px;"><h2>Sección</h2></section>',
          },
          {
            id: "text",
            label: "Texto",
            attributes: { class: "gjs-block-text" },
            content: '<p>Haz clic para editar el texto</p>',
          },
          {
            id: "image",
            label: "Imagen",
            attributes: { class: "gjs-block-image" },
            content: '<img src="https://via.placeholder.com/300x200" alt="Imagen" style="width: 100%; max-width: 300px; height: auto;"/>',
          },
          {
            id: "button",
            label: "Botón",
            attributes: { class: "gjs-block-button" },
            content: '<a href="#" style="display: inline-block; background: #19b3bc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Botón</a>',
          },
          {
            id: "divider",
            label: "Divisor",
            attributes: { class: "gjs-block-divider" },
            content: '<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;"/>',
          },
          {
            id: "columns-2",
            label: "2 Columnas",
            attributes: { class: "gjs-block-columns-2" },
            content: `<table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding: 20px; border: 1px solid #ddd;"><p>Columna 1</p></td>
                <td style="width: 50%; padding: 20px; border: 1px solid #ddd;"><p>Columna 2</p></td>
              </tr>
            </table>`,
          },
          {
            id: "columns-3",
            label: "3 Columnas",
            attributes: { class: "gjs-block-columns-3" },
            content: `<table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 33%; padding: 20px; border: 1px solid #ddd;"><p>Col 1</p></td>
                <td style="width: 33%; padding: 20px; border: 1px solid #ddd;"><p>Col 2</p></td>
                <td style="width: 33%; padding: 20px; border: 1px solid #ddd;"><p>Col 3</p></td>
              </tr>
            </table>`,
          },
        ],
      },
      canvas: {
        styles: ["https://via.placeholder.com/style.css"],
      },
    });

    // Cargar contenido inicial
    if (content) {
      try {
        editor.setComponents(editor.Pages.getActive().getFrameView().model.get("components"));
        editor.Pages.getActive().getFrameView().$el.querySelector("iframe").contentDocument.body.innerHTML = content;
      } catch (e) {
        editor.setComponents(content);
      }
    }

    // Listener para cambios
    editor.on("component:update", () => {
      const html = editor.getHtml();
      onChange(html);
    });

    editor.on("component:remove", () => {
      const html = editor.getHtml();
      onChange(html);
    });

    grapesRef.current = editor;

    return () => {
      editor.destroy();
    };
  }, []);

  const insertTemplate = (templateKey: keyof typeof EMAIL_TEMPLATES) => {
    const template = EMAIL_TEMPLATES[templateKey];
    const editor = grapesRef.current;
    if (editor) {
      editor.setComponents(template.html);
      editor.trigger("change");
      setShowTemplates(false);
    }
  };

  const toggleHtmlMode = () => {
    const editor = grapesRef.current;
    if (editor) {
      if (htmlMode) {
        // Salir del modo HTML
        const htmlInput = document.querySelector("#grapesjs-html-input") as HTMLTextAreaElement;
        if (htmlInput) {
          editor.setComponents(htmlInput.value);
        }
      }
      setHtmlMode(!htmlMode);
    }
  };

  const downloadHtml = () => {
    const editor = grapesRef.current;
    if (editor) {
      const html = editor.getHtml();
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(html));
      element.setAttribute("download", "email-template.html");
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className="space-y-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Plantillas
            </button>
            {showTemplates && (
              <div className="absolute left-0 top-full z-10 mt-1 w-56 space-y-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => insertTemplate(key as keyof typeof EMAIL_TEMPLATES)}
                    className="w-full rounded px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleHtmlMode}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              htmlMode
                ? "bg-[#19b3bc] text-white hover:bg-[#159ea7]"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {htmlMode ? "Visual" : "HTML"}
          </button>

          <button
            type="button"
            onClick={downloadHtml}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          <div className="text-[11px] text-slate-400">
            💡 Arrastra bloques desde la izquierda para construir tu email
          </div>
        </div>
      </div>

      {/* Editor o HTML Input */}
      {htmlMode ? (
        <textarea
          id="grapesjs-html-input"
          defaultValue={content}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-96 w-full border-none bg-slate-50 px-3 py-2.5 font-mono text-xs outline-none"
          placeholder="Pega tu HTML aquí..."
        />
      ) : (
        <div ref={editorRef} style={{ height: "600px" }} />
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        Editor visual estilo Mailchimp · Arrastra componentes · {" "}
        <span className="font-medium text-slate-600">Variables:</span> {"{NOMBRE}, {FECHA}, {HORA}, {DOCTOR}"}
      </div>
    </div>
  );
}
