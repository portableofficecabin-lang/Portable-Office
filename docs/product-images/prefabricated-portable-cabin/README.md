# Prefabricated Portable Cabin — supplied images

All six images supplied by the owner on 2026-09-05 for
`/products/prefabricated-portable-cabin` (product id 13, SKU `POC-PC-PREFAB`).

They are kept **here**, tracked in git, so they survive independently of
`image-backups/`, which is gitignored and exists only on one machine. Nothing in this
folder is served: Next.js publishes `public/` only, so these files ship with the
repository without appearing on the site.

## In use

| File | Where |
|---|---|
| `in-use-factory-yard-cabin.webp` | Live on the product page, and the product's `g:image_link` in the Google Merchant feed. Optimised copy lives at `public/images/products/prefabricated-portable-cabin/prefabricated-portable-cabin-factory-yard.webp`. |

## Withheld pending a placement decision

These five are **not discarded and not substituted** — they are held here awaiting the
owner's decision on where they belong.

| File | What it shows |
|---|---|
| `withheld-1-front-elevation-verandah.webp` | Front elevation, L-shaped dwelling with covered verandah |
| `withheld-2-front-three-quarter.webp` | Front three-quarter, verandah posts, timber deck and steps |
| `withheld-3-rear-side-split-ac.webp` | Rear/side, gable roof, wall-mounted split AC |
| `withheld-4-aerial-pitched-roof.webp` | Aerial, standing-seam pitched roof and gabled porch canopy |
| `withheld-5-interior-living-room.webp` | Interior living room — sofa, coffee table, dining chairs |

### Why they were withheld

Not a judgement about quality. Each one contradicts **this product's own recorded
specification** in `src/data/products.ts` (id 13), and the first image in `images[]`
becomes the product's Google Shopping photo:

| This product records | The five images show |
|---|---|
| `Sizes Available: 8x10 sq ft to 40x12 ft (L x W)` — one rectangular module | An L-shaped, two-module dwelling |
| `Windows: Aluminium sliding with security grills` | Domestic casement windows, no grills |
| `Flooring: Marine plywood with vinyl/laminate finish` | Wood-plank domestic flooring |
| `Doors: Powder-coated steel or flush doors` | A glazed residential entrance door with a decorative panel |
| Description: *"site office, accommodation units, security cabins, and storage units"* | A furnished living room with sofa, cushions, coffee table and curtains |
| No verandah, deck, steps or pitched gable roof in any spec row | Covered verandah on posts, timber deck, tiled steps, pitched gable roof, split AC |

A shopper who clicks a photo of a furnished house and arrives on a ₹3,24,500 site-office
cabin is the misrepresentation case that
`app/api/merchant-feed/route.ts` records as having contributed to this account's
Merchant Center suspension.

### Options for the owner

1. **A prefab home / villa product.** They read consistently as one dwelling and would
   suit the Prefab Homes category, where the specification matches what is shown.
2. **A clearly-labelled section elsewhere on this page** — e.g. "we also build prefab
   homes" — captioned so nobody reads them as the cabin being sold, and kept out of
   `products.ts` `images[]` so the Shopping photo is unaffected.
3. **A new product**, if these represent a build that is actually offered and priced.

Option 2 is the only one that puts them on this page, and even then they must stay out
of `images[]`.

No action has been taken beyond preserving them. Nothing here is wired into any page.
