export const revalidate = 3600; // 1 hour

import AboutPage from "@/views/About";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "About Our Company & Factory Units",
  description:
    "Learn about Portable Office Cabin — our Tamil Nadu and Karnataka manufacturing units, build process, quality standards and modular building expertise.",
  path: "/about-us",
});

export default function Page() {
  return <AboutPage />;
}
