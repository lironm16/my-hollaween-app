# GovMap neighborhood polygons (שכונות)

The full Israel layer is **not committed** (large + updated on data.gov.il).

## Local setup

1. Download the gzipped GeoJSON from [odata.org.il](https://www.odata.org.il/dataset/7709ebeb-c7fc-4c4d-97cb-51837333805e/resource/ead77ea1-45b6-4636-ab50-06d523c22b3a/download/.geojson.gz) (same file as on data.gov.il).
2. Save it under `public/data/` — any of these names work:

   - **`geojson`** or **`geojson.gz`** (if your download is named `geojson`)
   - `gov-neighborhoods.geojson.gz`

3. Build the search catalog (names + bboxes, no heavy geometry):

   ```bash
   npm run gov-neighborhoods:index
   ```

4. Run the app and open **`/events/create`**.

On that page hosts can add boundaries by **city**, **neighborhood** (GovMap), or **street** (OSM corridor drawn on the map).

Attribution: use according to the [data.gov.il dataset license](https://data.gov.il/dataset/govmap-22-bd519a1c).

## Optional

Commit `gov-neighborhood-catalog.json` after indexing if you want preview/staging to search without the `.gz` on the server (geometry still requires the `.gz` or API cache).
