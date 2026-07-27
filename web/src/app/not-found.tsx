import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[100dvh] p-4 text-center bg-gray-50 text-gray-900">
      <h1 className="text-6xl font-extrabold text-blue-600 mb-2">404</h1>
      <h2 className="text-2xl font-bold mb-3">Страница не найдена</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <Link 
        href="/app" 
        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
      >
        Вернуться в панель управления
      </Link>
    </main>
  );
}