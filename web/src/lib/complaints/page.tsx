import { CITIES_DATA } from "./constants";
import { PageHeader, PageBody } from "@/app/app/_components/PageHeader";
import { KokshetauHotlines } from "@/app/app/_components/KokshetauHotlines";
import { GarbageComplaintForm } from "@/app/app/_components/GarbageComplaintForm";

export const metadata = {
  title: "Жалобы и Горячие линии | Кокшетау",
  description: "Обращения по вывозу мусора и экстренные контакты служб г. Кокшетау",
};

export default function ComplaintsPage() {
  const city = CITIES_DATA.kokshetau;
  if (!city) return null;
  return (
    <>
      <PageHeader
        title="Жалобы и Горячие линии"
        subtitle="Контроль работы мусорных компаний и оперативных служб г. Кокшетау"
      />
      <PageBody>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Горячие линии iKomek 109, 102 и Тазалык */}
          <KokshetauHotlines city={city} />

          {/* Форма отправки жалобы в iKomek 109 / ОСИ */}
          <GarbageComplaintForm city={city} />
        </div>
      </PageBody>
    </>
  );
}
