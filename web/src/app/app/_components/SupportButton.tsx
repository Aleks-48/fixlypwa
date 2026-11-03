"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

// Канал поддержки — замените на реальный Telegram/WhatsApp
const SUPPORT_TELEGRAM = "https://t.me/fixlyosibot";
const SUPPORT_PHONE = "tel:+77771234567";

export function SupportButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  // Убираем пульсацию через 8 секунд — пользователь её уже заметил
  useEffect(() => {
    const timer = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Закрывать попап при клике за его пределами
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#support-popup") && !target.closest("#support-fab")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      {/* Popup-карточка */}
      <div
        id="support-popup"
        aria-hidden={!open}
        style={{
          position: "fixed",
          bottom: "148px",
          right: "24px",
          zIndex: 9999,
          width: "280px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          padding: "20px",
          transformOrigin: "bottom right",
          transform: open ? "scale(1) translateY(0)" : "scale(0.85) translateY(12px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
        }}
      >
        {/* Заголовок */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", flexShrink: 0,
          }}>
            🛟
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>
              {t("support_title")}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{
                display: "inline-block", width: "7px", height: "7px",
                borderRadius: "50%", background: "#22c55e",
                boxShadow: "0 0 0 2px rgba(34,197,94,0.3)",
              }} />
              {t("support_online")}
            </div>
          </div>
        </div>

        {/* Описание */}
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "14px", lineHeight: "1.5" }}>
          {t("support_desc")}
        </p>

        {/* Кнопки */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <a
            href={SUPPORT_TELEGRAM}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px", borderRadius: "12px",
              background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
              color: "#fff", textDecoration: "none", fontSize: "13px", fontWeight: 600,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <span style={{ fontSize: "16px" }}>✈️</span>
            {t("support_telegram")}
          </a>
          <a
            href={SUPPORT_PHONE}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px", borderRadius: "12px",
              background: "var(--muted)", border: "1px solid var(--border)",
              color: "var(--foreground)", textDecoration: "none", fontSize: "13px", fontWeight: 600,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--muted)")}
          >
            <span style={{ fontSize: "16px" }}>📞</span>
            {t("support_call")}
          </a>
        </div>

        {/* Стрелочка вниз */}
        <div style={{
          position: "absolute", bottom: "-7px", right: "28px",
          width: "14px", height: "14px",
          background: "var(--card)", border: "1px solid var(--border)",
          transform: "rotate(45deg)",
          borderTop: "none", borderLeft: "none",
        }} />
      </div>

      {/* FAB-кнопка */}
      <button
        id="support-fab"
        onClick={() => setOpen(v => !v)}
        title={t("support_title")}
        aria-label="Открыть службу поддержки"
        style={{
        position: "fixed",
        bottom: "84px",
        right: "24px",
          zIndex: 9999,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: open
            ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s",
          transform: open ? "rotate(15deg) scale(1.08)" : "scale(1)",
        }}
        onMouseEnter={e => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.12)";
        }}
        onMouseLeave={e => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {/* Пульсирующий ореол */}
        {pulse && !open && (
          <span style={{
            position: "absolute",
            inset: "-4px",
            borderRadius: "50%",
            background: "rgba(99,102,241,0.35)",
            animation: "support-pulse 1.8s ease-out infinite",
          }} />
        )}
        {open ? "✕" : "🛟"}
      </button>

      <style>{`
        @keyframes support-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(1.5); opacity: 0;   }
          100% { transform: scale(1.5); opacity: 0;   }
        }
      `}</style>
    </>
  );
}
