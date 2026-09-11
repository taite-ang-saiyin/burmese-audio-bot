export interface SecurityScanResult {
  hasSensitiveData: boolean;
  type?: 'card_number' | 'otp' | 'pin' | 'password';
  maskedText: string;
  warningMm: string;
  warningEn: string;
}

/**
 * Scans user input for sensitive banking credentials (OTP, PIN, 16-digit PAN, passwords)
 * and safely masks them while generating comforting guidance.
 */
export function scanSensitiveData(input: string): SecurityScanResult {
  let masked = input;
  let hasSensitive = false;
  let detectedType: 'card_number' | 'otp' | 'pin' | 'password' | undefined;

  // 1. Detect 16-digit card number (with or without spaces/dashes)
  const cardRegex = /\b(\d{4})[ -]?(\d{4})[ -]?(\d{4})[ -]?(\d{4})\b/g;
  if (cardRegex.test(input)) {
    hasSensitive = true;
    detectedType = 'card_number';
    masked = masked.replace(cardRegex, '•••• •••• •••• $4');
  }

  // 2. Detect explicit OTP patterns (e.g., "OTP is 123456" or "OTP 482910" or "code: 123456")
  const otpPattern = /\b(?:otp|one time password|code|စကားဝှက်|ကုဒ်)[\s:]*([0-9]{4,6})\b/gi;
  if (otpPattern.test(masked)) {
    hasSensitive = true;
    detectedType = detectedType || 'otp';
    masked = masked.replace(otpPattern, (match, code) => {
      return match.replace(code, '••••••');
    });
  }

  // 3. Detect standalone 4 to 6 digit PIN when user writes "pin 1234" or "my pin is 5678"
  const pinPattern = /\b(?:pin|mpin|secret|ပင်း|ကုဒ်နံပါတ်)[\s:]*([0-9]{4,6})\b/gi;
  if (pinPattern.test(masked)) {
    hasSensitive = true;
    detectedType = detectedType || 'pin';
    masked = masked.replace(pinPattern, (match, code) => {
      return match.replace(code, '••••');
    });
  }

  // 4. Detect password declaration (e.g., "password is xyz123")
  const passPattern = /\b(?:password|pass|pwd|လျှို့ဝှက်နံပါတ်)[\s:]*([a-zA-Z0-9!@#$%^&*()_+]{6,})\b/gi;
  if (passPattern.test(masked)) {
    hasSensitive = true;
    detectedType = detectedType || 'password';
    masked = masked.replace(passPattern, (match, pwd) => {
      return match.replace(pwd, '••••••••');
    });
  }

  let warningMm = '';
  let warningEn = '';

  if (hasSensitive) {
    if (detectedType === 'card_number') {
      warningMm = 'လုံခြုံရေးအရ ကတ်နံပါတ် အပြည့်အစုံကို မမျှဝေပါနှင့်။ စနစ်မှ အလိုအလျောက် ဖုံးကွယ်ပေးထားပါသည်။';
      warningEn = 'For your security, full card numbers are automatically masked.';
    } else if (detectedType === 'otp' || detectedType === 'pin') {
      warningMm = 'လုံခြုံရေးအတွက် OTP သို့မဟုတ် PIN ကို မည်သူနှင့်မျှ မမျှဝေပါနှင့်။ ဘဏ်ဝန်ထမ်းများလည်း တောင်းဆိုမည် မဟုတ်ပါ။';
      warningEn = 'Do not share your OTP or PIN. Bank staff will never request these.';
    } else {
      warningMm = 'လျှို့ဝှက်နံပါတ် (Password) များကို စနစ်အတွင်း ထည့်သွင်းခြင်း မပြုပါနှင့်။';
      warningEn = 'Never share account passwords with the conversational assistant.';
    }
  }

  return {
    hasSensitiveData: hasSensitive,
    type: detectedType,
    maskedText: masked,
    warningMm,
    warningEn
  };
}
