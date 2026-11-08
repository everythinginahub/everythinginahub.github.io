# Browser OCR assets

The timetable image importer runs on the user's device with self-hosted assets, so image data is not sent to an OCR service.

- Tesseract.js 6.0.1 and Tesseract.js-core 6.1.2 are Apache-2.0 licensed; see `TESSERACT-JS-LICENSE`, `TESSERACT-CORE-LICENSE`, and the bundled dependency notices.
- `eng.traineddata.gz` is the English 4.0.0_best_int model from `@tesseract.js-data/eng` 1.0.0, derived from the Tesseract language data project, Apache-2.0: https://github.com/tesseract-ocr/tessdata_best.

After `npm ci`, run `npm run build:ocr` to regenerate the assets from the versions in the lockfile. The LSTM-only SIMD and non-SIMD cores are included for browser compatibility. The OCR module and model are loaded only when the user scans an image.
