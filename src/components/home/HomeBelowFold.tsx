"use client";

import dynamic from "next/dynamic";

// Below-the-fold, non-SEO-critical homepage sections are loaded client-side
// (ssr: false) as a SINGLE deferred chunk — keeping their markup + serialized RSC
// payload out of the initial HTML AND collapsing what used to be eight dynamic
// imports into one JS request. SEO-critical sections (Hero/H1, Categories, Product
// Range, FAQ schema, Internal Linking Hub) remain fully server-rendered in source.
const HomeBelowFoldSections = dynamic(() => import("./HomeBelowFoldSections"), {
  ssr: false,
  loading: () => (
    <div className="section-padding">
      <div className="container-custom">
        <div style={{ minHeight: "1600px" }} aria-hidden="true" />
      </div>
    </div>
  ),
});

export function HomeBelowFold() {
  return <HomeBelowFoldSections />;
}
