const FOLDER_ID = '1nwhxeBiSJiOtGNG6zLHKvGmJCUPafxd5';

function doGet(e) {
  const code = String((e && e.parameter && e.parameter.code) || '').trim();

  if (!code) {
    return json_({ success: false, error: 'Code produit manquant' });
  }

  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();

    let found = null;
    let exact = null;

    while (files.hasNext()) {
      const file = files.next();
      const mime = file.getMimeType();

      if (!mime || mime.indexOf('image/') !== 0) continue;

      const name = file.getName();
      const normalizedName = name.toLowerCase();
      const normalizedCode = code.toLowerCase();

      // Le nom du fichier doit contenir le code produit.
      if (normalizedName.indexOf(normalizedCode) === -1) continue;

      if (normalizedName === normalizedCode ||
          normalizedName.indexOf(normalizedCode + '.') === 0) {
        exact = file;
        break;
      }

      if (!found) found = file;
    }

    const file = exact || found;

    if (!file) {
      return json_({ success: false, error: 'Image introuvable' });
    }

    const blob = file.getBlob();
    const contentType = blob.getContentType();
    const base64 = Utilities.base64Encode(blob.getBytes());

    return json_({
      success: true,
      code: code,
      fileName: file.getName(),
      image: 'data:' + contentType + ';base64,' + base64
    });

  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
