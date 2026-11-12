/** Decode text using its byte-order mark: UTF-16LE, UTF-16BE or UTF-8; UTF-8 if none (IN-2). */
export function decodeText(bytes: Uint8Array): string {
  const [a, b, c] = bytes;
  if (a === 0xff && b === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (a === 0xfe && b === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  if (a === 0xef && b === 0xbb && c === 0xbf)
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  return new TextDecoder('utf-8').decode(bytes);
}
