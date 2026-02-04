"use client";

import { useState } from "react";

export default function PlaygroundPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject,
          text: body,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Correo enviado exitosamente",
        });
        // Limpiar formulario
        setTo("");
        setSubject("");
        setBody("");
      } else {
        setResult({
          success: false,
          message: data.error || data.message || "Error al enviar el correo",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error de conexión al enviar el correo",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Playground - Envío de Correo</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="to"
              className="block text-sm font-medium mb-2"
            >
              Destinatario
            </label>
            <input
              type="email"
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              placeholder="ejemplo@correo.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium mb-2"
            >
              Asunto
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Asunto del correo"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="body"
              className="block text-sm font-medium mb-2"
            >
              Cuerpo del correo
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={8}
              placeholder="Escribe el contenido del correo aquí..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
          >
            {loading ? "Enviando..." : "Enviar Correo"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 p-4 rounded-md ${
              result.success
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
            }`}
          >
            <p className="font-medium">
              {result.success ? "✓ Éxito" : "✗ Error"}
            </p>
            <p className="mt-1">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

