import { PageHeader, PageBody } from "../_components/PageHeader";
import { KokshetauHotlines } from "../_components/KokshetauHotlines";
import { GarbageComplaintForm } from "../_components/GarbageComplaintForm";

export default function ComplaintsPage() {
  return (
    <>
      <PageHeader
        title="Жалобы и Горячие линии"
        subtitle="Контроль работы мусорных компаний и служб г. Кокшетау"
      />
      <PageBody>
        <div className="space-y-6 max-w-3xl">
          {/* Горячие линии Кокшетау */}
          <KokshetauHotlines />

          {/* Форма подачи жалобы */}
          <GarbageComplaintForm />
        </div>
      </PageBody>
    </>
  );
}