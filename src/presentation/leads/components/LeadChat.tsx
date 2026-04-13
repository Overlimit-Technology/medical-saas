"use client";

import { useEffect, useRef, useState } from "react";
import type { Lead } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS } from "@/domain/leads/entities/Lead";

type Props = {
  lead: Lead;
  onSendMessage: (text: string, direction: "inbound" | "outbound") => void;
};

/**
 * Simulated chat UI per lead channel.
 *
 * INTEGRATION POINTS:
 * - Replace onSendMessage with real API calls per channel:
 *   - WhatsApp: Meta Business API → POST /messages
 *   - Instagram: Meta Graph API → POST /me/messages
 *   - Facebook: Meta Messenger API → POST /me/messages
 *   - Telegram: Telegram Bot API → POST /sendMessage
 *   - TikTok: TikTok Business API (when available)
 * - Incoming messages: connect via webhook endpoints
 * - See: src/server/leads/integrations/ for placeholder functions
 */
export default function LeadChat({ lead, onSendMessage }: Props) {
  const [text, setText] = useState("");
  const [sendAs, setSendAs] = useState<"outbound" | "inbound">("outbound");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lead.messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim(), sendAs);
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Channel indicator */}
      <div className="flex items-center gap-2 border-b border-[#e8e5df] px-5 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-[11px] font-medium text-[#6b6560]">
          {CHANNEL_LABELS[lead.channel]}
        </span>
        <span className="text-[10px] italic text-[#9c9690]">
          — Simulacion (preparado para API)
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {lead.messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-[#9c9690]">Sin mensajes. Inicia la conversacion.</p>
          </div>
        )}
        <div className="space-y-2">
          {lead.messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            return (
              <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    isOutbound
                      ? "rounded-br-md bg-[#1a1a1a] text-white"
                      : "rounded-bl-md border border-[#e8e5df] bg-[#faf9f7] text-[#1a1a1a]"
                  }`}
                >
                  <p className="text-[13px] leading-relaxed">{msg.text}</p>
                  <p
                    className={`mt-0.5 text-[9px] tabular-nums ${isOutbound ? "text-white/50" : "text-[#9c9690]"}`}
                    style={{ fontFamily: "'IBM Plex Mono', var(--font-geist-mono), monospace" }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-[#e8e5df] px-5 py-3">
        {/* Direction toggle (for simulation) */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] text-[#9c9690]">Simular como:</span>
          <button
            type="button"
            onClick={() => setSendAs("outbound")}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${sendAs === "outbound" ? "bg-[#1a1a1a] text-white" : "bg-[#f3f1ec] text-[#6b6560]"}`}
          >
            Tu (saliente)
          </button>
          <button
            type="button"
            onClick={() => setSendAs("inbound")}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${sendAs === "inbound" ? "bg-[#1a1a1a] text-white" : "bg-[#f3f1ec] text-[#6b6560]"}`}
          >
            Lead (entrante)
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={`Mensaje via ${CHANNEL_LABELS[lead.channel]}...`}
            className="flex-1 rounded-xl border border-[#e8e5df] bg-white px-3 py-2 text-xs outline-none placeholder:text-[#9c9690] focus:border-[#9c9690]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#333] disabled:bg-[#e8e5df] disabled:text-[#9c9690]"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
