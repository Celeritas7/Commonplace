// Server-only inspection. Files are downloads, never same-origin embedded views.
import { unzipSync } from "fflate";
import { XMLValidator } from "fast-xml-parser";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream } from "pdf-lib";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const fail = () => {
  throw Error(
    "Unsupported or unsafe attachment. Use a plain XLSX, static PDF, PNG/JPEG or UTF-8 TXT file.",
  );
};
const decode = (bytes) =>
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);
export async function sha256(bytes) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
function image(bytes, ext) {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  if (ext === "png") {
    if (
      bytes.length < 45 ||
      [137, 80, 78, 71, 13, 10, 26, 10].some((x, i) => bytes[i] !== x) ||
      decode(bytes.subarray(12, 16)) !== "IHDR" ||
      d.getUint32(8) !== 13
    )
      fail();
    width = d.getUint32(16);
    height = d.getUint32(20);
    let p = 8,
      data = false,
      end = false;
    while (p + 12 <= bytes.length) {
      const n = d.getUint32(p),
        kind = decode(bytes.subarray(p + 4, p + 8));
      if (n > MAX_FILE_BYTES || p + n + 12 > bytes.length) fail();
      if (kind === "IDAT") data = true;
      p += n + 12;
      if (kind === "IEND") {
        if (n || p !== bytes.length) fail();
        end = true;
        break;
      }
    }
    if (!data || !end) fail();
  } else {
    if (
      bytes.length < 12 ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes.at(-2) !== 255 ||
      bytes.at(-1) !== 217
    )
      fail();
    let p = 2;
    while (p + 4 <= bytes.length) {
      if (bytes[p++] !== 255) fail();
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 218) break;
      const n = d.getUint16(p);
      if (n < 2 || p + n > bytes.length) fail();
      if ([192, 193, 194].includes(marker)) {
        if (n < 8) fail();
        height = d.getUint16(p + 3);
        width = d.getUint16(p + 5);
      }
      p += n;
    }
  }
  if (
    !width ||
    !height ||
    width > 10000 ||
    height > 10000 ||
    width * height > 20000000
  )
    fail();
}
async function pdf(bytes) {
  if (decode(bytes.subarray(0, 5)) !== "%PDF-") fail();
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    throwOnInvalidObject: true,
    updateMetadata: false,
  });
  if (doc.getPageCount() < 1 || doc.getPageCount() > 500) fail();
  const banned = new Set([
    "JavaScript",
    "JS",
    "AA",
    "OpenAction",
    "Launch",
    "EmbeddedFile",
    "EmbeddedFiles",
    "RichMedia",
    "AcroForm",
    "XFA",
    "GoToR",
    "URI",
    "SubmitForm",
    "ImportData",
    "Sound",
    "Movie",
    "Rendition",
    "3D",
    "Filespec",
  ]);
  const seen = new Set();
  let count = 0;
  function inspect(v, depth = 0) {
    if (!v || seen.has(v)) return;
    if (++count > 50000 || depth > 40) fail();
    seen.add(v);
    if (v instanceof PDFName) {
      if (banned.has(v.decodeText())) fail();
    } else if (v instanceof PDFDict)
      for (const [k, value] of v.entries()) {
        inspect(k, depth + 1);
        inspect(value, depth + 1);
      }
    else if (v instanceof PDFArray)
      for (const value of v.asArray()) inspect(value, depth + 1);
    else if (v instanceof PDFRawStream) inspect(v.dict, depth + 1);
  }
  const objects = doc.context.enumerateIndirectObjects();
  if (objects.length > 10000) fail();
  for (const [, v] of objects) inspect(v);
}
function workbook(bytes) {
  if (bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4)
    fail();
  let total = 0;
  const names = new Set();
  const files = unzipSync(bytes, {
    filter(entry) {
      if (
        names.has(entry.name) ||
        names.size >= 200 ||
        entry.name.length > 200 ||
        entry.name.includes("..") ||
        entry.name.includes("\\") ||
        entry.name.startsWith("/") ||
        entry.originalSize > 5 * 1024 * 1024 ||
        entry.originalSize > Math.max(entry.size * 100, 65536)
      )
        fail();
      names.add(entry.name);
      total += entry.originalSize;
      if (total > 20 * 1024 * 1024) fail();
      return true;
    },
  });
  if (
    !files["[Content_Types].xml"] ||
    !files["xl/workbook.xml"] ||
    !files["_rels/.rels"] ||
    !Object.keys(files).some((x) => /^xl\/worksheets\/sheet\d+\.xml$/.test(x))
  )
    fail();
  for (const [name, data] of Object.entries(files)) {
    if (
      !/^(\[Content_Types\]\.xml|_rels\/\.rels|docProps\/[A-Za-z0-9_.-]+\.xml|xl\/[A-Za-z0-9_/.-]+\.(xml|rels|png|jpe?g))$/.test(
        name,
      ) ||
      /vba|activeX|embeddings|externalLinks|connections|queryTables|macrosheets|dialogsheets|richData|customXml/i.test(
        name,
      )
    )
      fail();
    if (/\.(png|jpe?g)$/.test(name)) {
      image(data, name.split(".").at(-1));
      continue;
    }
    const source = decode(data);
    if (
      /<!--|<!\[CDATA\[/i.test(source) ||
      XMLValidator.validate(source) !== true
    )
      fail();
    // Spreadsheet writers encode international text as numeric XML references.
    // Decode those for inspection so they also cannot disguise active formulas.
    const xml = source.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, value) => {
      const point = /^x/i.test(value)
        ? parseInt(value.slice(1), 16)
        : Number(value);
      if (
        !(
          point === 9 ||
          point === 10 ||
          point === 13 ||
          (point >= 0x20 && point <= 0xd7ff) ||
          (point >= 0xe000 && point <= 0xfffd) ||
          (point >= 0x10000 && point <= 0x10ffff)
        )
      )
        fail();
      return String.fromCodePoint(point);
    });
    if (
      /<!DOCTYPE|<!ENTITY|macroEnabled|macroSheet|dialogSheet|Auto_Open|Auto_Close|vbaProject|TargetMode\s*=\s*['"]External['"]|\bTarget\s*=\s*['"](?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|\\)|oleObject|ddeLink/i.test(
        xml,
      )
    )
      fail();
    // No network/DDE formulas or external-workbook references. Formula text is
    // never evaluated here or in the application; permitted formulas run in Excel.
    for (const m of xml.matchAll(
      /<(?:[A-Za-z0-9_]+:)?(f|definedName)\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?\1\s*>/g,
    ))
      if (
        /WEBSERVICE|HYPERLINK|RTD\s*\(|CALL\s*\(|REGISTER|EXEC\s*\(|EVALUATE\s*\(|\[|\]|\||https?:|file:|ftp:/i.test(
          m[2],
        )
      )
        fail();
  }
}
export async function inspectAttachment(bytes, filename) {
  if (
    !(bytes instanceof Uint8Array) ||
    !bytes.length ||
    bytes.length > MAX_FILE_BYTES ||
    typeof filename !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,119}\.(xlsx|pdf|png|jpg|jpeg|txt)$/.test(
      filename,
    )
  )
    fail();
  const ext = filename.split(".").at(-1);
  let mime;
  if (ext === "xlsx") {
    workbook(bytes);
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else if (ext === "pdf") {
    await pdf(bytes);
    mime = "application/pdf";
  } else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
    image(bytes, ext);
    mime = ext === "png" ? "image/png" : "image/jpeg";
  } else {
    const s = decode(bytes);
    if (s.includes("\0")) fail();
    mime = "text/plain";
  }
  return { filename, mime, bytes: bytes.length, sha256: await sha256(bytes) };
}
