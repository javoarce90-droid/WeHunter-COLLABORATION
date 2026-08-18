/** Lee ancho/alto de PNG, JPEG y WEBP a partir de los bytes del archivo, sin decodificar la
 *  imagen completa (solo el header). No hay librería de procesamiento de imágenes en el
 *  proyecto — para una lectura de dimensiones alcanza con parsear el header a mano. */
export function getImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // PNG: firma de 8 bytes + chunk IHDR, ancho/alto en offsets fijos (16 y 20, big-endian).
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  // JPEG: recorre los markers hasta encontrar un SOFn (Start Of Frame), que trae alto/ancho.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      const segmentLength = view.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }
    return null;
  }

  // WEBP: contenedor RIFF. VP8X (extendido) guarda ancho/alto en 24 bits; VP8/VP8L simples
  // tienen su propio layout — cubrimos los tres formatos que produce cualquier exportador.
  if (
    bytes.length >= 30 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const fourCc = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (fourCc === "VP8X") {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width, height };
    }
    if (fourCc === "VP8 ") {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (fourCc === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  return null;
}
