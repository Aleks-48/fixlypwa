"use client";

import type { RequestCategory } from "@prisma/client";
import { useState } from "react";

const CATEGORIES: { value: RequestCategory; label: string }[] = [
  { value: "PLUMBING", label: "Сантехник" },
  { value: "ELECTRICITY", label: "Электрик" },
  { value: "ELEVATOR", label: "Лифт" },
  { value: "CLEANING", label: "Уборка" },
  { value: "OTHER", label: "Прочее" },
];

interface AddMasterDialogProps {
  onAdded?: () => void;
}

declare global {
  interface Navigator {
    contacts?: {
      select: (
        props: string[],
        opts?: { multiple?: boolean },
      ) => Promise<{ name: string[]; tel: string[] }[]>;
    };
  }
}

export function AddMasterDialog({ onAdded }: AddMasterDialogProps) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [categories, setCategories] = useState<RequestCategory[]>([]);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const contactsSupported =
    typeof navigator !== "undefined" && "contacts" in navigator;

  const pickContact = async () => {
    try {
      const contacts = await navigator.contacts!.select(["name", "tel"], {
        multiple: false,
      });
      if (contacts.length > 0) {
        const c = contacts[0];
        setFullName(c?.name?.[0] ?? "");
        const raw = c?.tel?.[0] ?? "";
        setPhone(normalizePhoneOrContact(raw));
      }
    } catch {
      // пользователь отменил выбор
    }
  };

  const normalizePhoneOrContact = (raw: string): string => {
    const trimmed = raw.trim();
    // Если вставили ссылку на Telegram (@username или t.me/username)
    if (trimmed.startsWith("@")) {
      return trimmed;
    }
    if (trimmed.includes("t.me/")) {
      const match = trimmed.match(/t\.me\/([a-zA-Z0-9_+]+)/);
      if (match && match[1]) {
        return match[1].startsWith("+") ? match[1] : `@${match[1]}`;
      }
    }
    // Если вставили ссылку на WhatsApp (wa.me/...)
    if (trimmed.includes("wa.me/")) {
      const match = trimmed.match(/wa\.me\/(\d+)/);
      if (match && match[1]) {
        return `+${match[1]}`;
      }
    }
    // Стандартная обработка номера телефона
    const digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith("7") && digits.length === 11) return `+${digits}`;
    if (digits.startsWith("8") && digits.length === 11)
      return `+7${digits.slice(1)}`;
    if (digits.length === 10) return `+7${digits}`;
    return trimmed;
  };

  const toggleCategory = (cat: RequestCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSubmit = async () => {
    if (!fullName || !phone || categories.length === 0) {
      setError("Укажите имя, телефон и минимум одну специализацию");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/masters/add-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, categories, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setSuccess(true);
      onAdded?.();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setFullName("");
        setPhone("");
        setCategories([]);
        setBio("");
      }, 1500);
    } catch (caughtError) {
const e = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="add-master-btn" onClick={() => setOpen(true)}>
        + Добавить мастера
      </button>

      {open && (
        <div className="add-master-overlay" onClick={() => setOpen(false)}>
          <div
            className="add-master-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-master-dialog__header">
              <h2 className="add-master-dialog__title">Добавить мастера</h2>
              <button
                className="add-master-dialog__close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="add-master-dialog__success">
                <span>✓</span> Мастер добавлен!
              </div>
            ) : (
              <div className="add-master-dialog__body">
                {/* Выбор из контактов */}
                {contactsSupported && (
                  <button
                    className="add-master-dialog__contacts-btn"
                    type="button"
                    onClick={pickContact}
                  >
                    📱 Выбрать из контактов
                  </button>
                )}

                <div className="add-master-dialog__field">
                  <label>ФИО мастера</label>
                  <input
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="add-master-dialog__field">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-xs">Телефон или Telegram</label>
                    {contactsSupported && (
                      <button
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        type="button"
                        onClick={pickContact}
                      >
                        📱 Из записной книжки
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="+7 (777) 000-00-00 или @username"
                    value={phone}
                    onChange={(e) => setPhone(normalizePhoneOrContact(e.target.value))}
                    className="w-full rounded-xl border p-2.5 text-sm"
                  />
                  {phone && (
                    <div className="add-master-dialog__contact-links mt-1 flex items-center gap-2">
                      {!phone.startsWith("@") && (
                        <>
                          <a href={`tel:${phone}`} aria-label="Позвонить" className="text-xs bg-muted px-2 py-1 rounded-md">
                            📞 Позвонить
                          </a>
                          <a
                            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="WhatsApp"
                            className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-md font-medium"
                          >
                            💬 WhatsApp
                          </a>
                        </>
                      )}
                      <a
                        href={phone.startsWith("@") ? `https://t.me/${phone.slice(1)}` : `https://t.me/+${phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Telegram"
                        className="text-xs bg-sky-500/10 text-sky-600 px-2 py-1 rounded-md font-medium"
                      >
                        ✈️ Telegram
                      </a>
                    </div>
                  )}
                </div>

                <div className="add-master-dialog__field">
                  <label>Специализация</label>
                  <div className="add-master-dialog__cats">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`add-master-dialog__cat-chip ${categories.includes(c.value) ? "add-master-dialog__cat-chip--active" : ""}`}
                        onClick={() => toggleCategory(c.value)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="add-master-dialog__field">
                  <label>О мастере (необязательно)</label>
                  <textarea
                    placeholder="Опыт, особенности..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                  />
                </div>

                {error && (
                  <p className="add-master-dialog__error">{error}</p>
                )}

                <button
                  className="add-master-dialog__submit"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Сохранение..." : "Добавить мастера"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

