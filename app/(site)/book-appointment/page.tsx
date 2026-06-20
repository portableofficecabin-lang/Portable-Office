export const revalidate = 3600; // 1 hour

import BookAppointment from "@/views/BookAppointment";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Book an Appointment",
  description:
    "Book a free consultation or factory visit with Portable Office Cabin. Discuss your portable cabin, container office or prefab requirements with our team.",
  path: "/book-appointment",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Book Appointment", url: "https://portableofficecabin.com/book-appointment" },
        ])}
      />
      <BookAppointment />
    </>
  );
}
