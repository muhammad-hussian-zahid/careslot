import { DoctorBooking } from "@/components/doctor-booking";

export default async function DoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoctorBooking id={id} />;
}