# Photos for this client

Drop the client's photos here with these EXACT names (the `content.js` defaults
point at them):

- `hero.jpg` — full-bleed hero background (landscape, ~1600px wide)
- `gal-1.jpg` … `gal-6.jpg` — the gallery grid (any aspect; shown 4:3 cropped)

Compress before committing — aim for < 400 KB each. Pull from the client's
Yelp / Nextdoor / Google Business CDN, rename to the convention above.

After launch, the owner replaces any photo from the admin dashboard (it
re-compresses and stores the image as a data URL inside the Firestore content
doc), so these files are only the INITIAL gallery.
