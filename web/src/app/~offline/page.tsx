// Оффлайн-фолбэк (REQ-061, NFR-041). Service worker (@ducanh2912/next-pwa, fallbacks.document)
// отдаёт эту страницу, когда сеть недоступна и запрошенной страницы нет в кэше.
export const metadata = {
  title: "Нет сети — ОСИ",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "4rem 1.25rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.4rem" }}>Нет подключения к интернету</h1>
      <p style={{ color: "var(--muted)" }}>
        Ранее загруженные данные доступны офлайн. Новые данные появятся, когда
        связь восстановится.
      </p>
    </main>
  );
}
