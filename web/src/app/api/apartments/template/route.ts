export async function GET() {
  const csvContent = "\uFEFF№ квартиры,ФИО собственника,Площадь (кв.м),Телефон собственника\n1,Иванов Иван Иванович,45.5,+77001234567\n2,Петрова Мария Сергеевна,62.0,+77019876543\n3,Сидоров Алексей,,";
  
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fixly_apartments_template.csv"',
    },
  });
}
