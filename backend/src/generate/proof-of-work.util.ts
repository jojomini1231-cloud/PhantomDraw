import * as crypto from 'crypto';

export function generateAnswer(seed: string, diff: string, config: any[]) {
  const targetDiff = Buffer.from(diff || '', 'hex');
  const seedEncoded = Buffer.from(seed || '', 'utf-8');

  const configPart1 = JSON.stringify(config.slice(0, 3)).slice(0, -1) + ',';
  const configPart2 = ',' + JSON.stringify(config.slice(4, 9)).slice(1, -1) + ',';
  const configPart3 = ',' + JSON.stringify(config.slice(10)).slice(1);

  for (let i = 0; i < 500000; i++) {
    const dynamicI = String(i);
    const dynamicJ = String(i >> 1);
    
    const finalJsonString = configPart1 + dynamicI + configPart2 + dynamicJ + configPart3;
    const baseEncode = Buffer.from(finalJsonString, 'utf-8').toString('base64');
    const baseEncodeBuffer = Buffer.from(baseEncode, 'utf-8');
    
    const hash = crypto.createHash('sha3-512');
    hash.update(seedEncoded);
    hash.update(baseEncodeBuffer);
    const hashValue = hash.digest();
    
    // Compare bytes
    let isValid = true;
    for (let b = 0; b < targetDiff.length; b++) {
      if (hashValue[b] > targetDiff[b]) {
        isValid = false;
        break;
      } else if (hashValue[b] < targetDiff[b]) {
        break;
      }
    }
    
    if (isValid) {
      return { answer: baseEncode, solved: true };
    }
  }

  const fallback = "wQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D" + Buffer.from(`"${seed}"`).toString('base64');
  return { answer: fallback, solved: false };
}

export function getAnswerToken(seed: string, diff: string, config: any[]) {
  const { answer, solved } = generateAnswer(seed, diff, config);
  return { token: "gAAAAAB" + answer, solved };
}

export function getRequirementsToken(config: any[]) {
  const seed = Math.random().toString();
  const { answer } = generateAnswer(seed, "0fffff", config);
  return 'gAAAAAC' + answer;
}

export function getConfig(userAgent: string) {
  const now = new Date();
  // We subtract 5 hours to approximate Eastern Standard Time, but keeping it simple for the layout
  const parseTime = now.toString(); 

  return [
    1920 + 1080,
    parseTime,
    4294705152,
    0,
    userAgent,
    "https://chatgpt.com/backend-api/sentinel/sdk.js",
    "dpl_12345", // Mock DPL
    "en-US",
    "en-US,es-US,en,es",
    0,
    "webdriver−false",
    "location",
    "window",
    performance.now() * 1000,
    crypto.randomUUID(),
    "",
    16,
    Date.now() * 1000 - (performance.now() * 1000),
  ];
}
