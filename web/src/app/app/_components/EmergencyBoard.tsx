"use client";

import { Card,CardContent } from "@/components/ui/card";
import { MessageCircle,Phone,PhoneCall,ShieldAlert,Wrench,Zap } from "lucide-react";

export type EmergencyContact = {
  title: string;
  name?: string;
  phone: string;
  type: "emergency" | "plumber" | "electrician" | "ikomek";
};

interface EmergencyBoardProps {
  osiName?: string;
  buildingAddress?: string;
  contacts?: EmergencyContact[];
}

export function EmergencyBoard({ osiName: _osiName, buildingAddress: _buildingAddress, contacts = [] }: EmergencyBoardProps) {
  // Если управляющая компания или председатель не добавили реальные контакты — скрываем блок полностью
  if (!contacts || contacts.length === 0) {
    return null;
  }

  const getIcon = (type: EmergencyContact["type"]) => {
    switch (type) {
      case "emergency":
        return <ShieldAlert className="h-5 w-5 text-destructive animate-pulse" />;
      case "plumber":
        return <Wrench className="h-5 w-5 text-blue-500" />;
      case "electrician":
        return <Zap className="h-5 w-5 text-amber-500" />;
      default:
        return <PhoneCall className="h-5 w-5 text-primary" />;
    }
  };

  const getCleanPhone = (phone: string) => phone.replace(/[^\d+]/g, "");

  return (
    <Card className="rounded-2xl border-destructive/30 bg-destructive/[0.02] shadow-sm overflow-hidden">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h3 className="m-0 text-base font-bold text-foreground">Аварийные контакты дома</h3>
              <p className="m-0 text-xs text-muted-foreground">
                Круглосуточный вызов экстренных служб в 1 клик
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {contacts.map((contact, idx) => {
            const cleanPhone = getCleanPhone(contact.phone);
            const isWhatsappAvailable = cleanPhone.startsWith("+7") || cleanPhone.startsWith("8");
            const formattedWa = cleanPhone.replace(/^8/, "+7");

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 p-2 rounded-lg bg-secondary">
                    {getIcon(contact.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-xs font-bold truncate">{contact.title}</p>
                    <p className="m-0 text-[11px] text-muted-foreground truncate">
                      {contact.name ? `${contact.name} · ` : ""}{contact.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isWhatsappAvailable && (
                    <a
                      href={`https://wa.me/${formattedWa.replace("+", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                      title="Написать в WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                  <a
                    href={`tel:${cleanPhone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-xs shadow-sm hover:bg-destructive/90 transition-colors"
                  >
                    <Phone size={13} />
                    <span>Вызов</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
