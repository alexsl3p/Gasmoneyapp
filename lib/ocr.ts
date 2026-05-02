import { ParsedReceipt } from './types';
import { parseReceiptText } from './parser';

let TextRecognition: { recognize: (uri: string) => Promise<{ text: string }> } | null = null;

try {
  // Dynamic require to avoid crash on platforms without native module
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

export async function runOCR(imageUri: string): Promise<{ raw: string; parsed: ParsedReceipt }> {
  if (!TextRecognition) {
    return { raw: '', parsed: {} };
  }
  const result = await TextRecognition.recognize(imageUri);
  const raw = result.text ?? '';
  const parsed = parseReceiptText(raw);
  return { raw, parsed };
}
