import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize server-side Gemini client with aistudio-build telemetry
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (err) {
      console.warn('Gemini client init error:', err);
    }
  }
  return aiClient;
}

// Built-in verified banking knowledge base for RAG grounding
const BANKING_KNOWLEDGE_BASE = [
  {
    id: 'src-atm-policy',
    title: 'ATM Card Replacement & Security Policy',
    titleMm: 'ATM ကတ် လဲလှယ်ခြင်းနှင့် လုံခြုံရေးဆိုင်ရာ မူဝါဒ',
    version: '3.2',
    page: '14',
    section: 'Section 4.2: Lost & Stolen Cards Procedures',
    updatedAt: 'July 2026',
    category: 'Cards',
    keywords: ['atm', 'card', 'lost', 'stolen', 'ကတ်', 'ပျောက်', 'atm ကတ်'],
    snippet: 'Upon notification of lost or stolen ATM cards, immediate temporary freezing via Mobile App or Hotline 1800-888-999 is mandated. Replacement turnaround is 3-5 business days. Standard replacement fee is 3,000 MMK.',
    snippetMm: 'ATM ကတ် ပျောက်ဆုံးပါက Mobile Banking အက်ပ်မှ ချက်ချင်း ယာယီပိတ်နိုင်ပြီး Hotline 1800-888-999 သို့ ဆက်သွယ်ပါက ချက်ချင်း ပိတ်သိမ်းပေးပါသည်။ ကတ်အသစ် ထုတ်ပေးရန် ရုံးဖွင့်ရက် ၃-၅ ရက် ကြာမြင့်ပြီး လဲလှယ်ခ ကျပ် ၃,၀၀၀ ကျသင့်ပါသည်။'
  },
  {
    id: 'src-cust-procedures',
    title: 'Customer Service Standard Operating Procedures',
    titleMm: 'Customer Service စံလုပ်ထုံးလုပ်နည်းများ',
    version: '2.8',
    page: '28',
    section: 'Section 2.1: Emergency Card Block & Escalation Protocol',
    updatedAt: 'May 2026',
    category: 'Security',
    keywords: ['hotline', 'phone', 'contact', 'customer service', 'ဖုန်း', 'ဆက်သွယ်'],
    snippet: 'Hotline 1800-888-999 operates 24/7. Replacement fee for standard debit card is 3,000 MMK; Premier/Platinum debit card replacement fee is waived once per annum.',
    snippetMm: 'Customer Service ဖုန်း 1800-888-999 သည် ၂၄ နာရီ ဝန်ဆောင်မှုပေးပါသည်။ ရိုးရိုးဒက်ဘစ်ကတ် အသစ်လဲလှယ်ခမှာ ကျပ် ၃,၀၀၀ ဖြစ်ပြီး Premier ကတ်များအတွက် တစ်နှစ်လျှင် တစ်ကြိမ် အခမဲ့ ဖြစ်ပါသည်။'
  },
  {
    id: 'src-mobile-banking',
    title: 'Mobile Banking & Digital Security Guide',
    titleMm: 'မိုဘိုင်းဘဏ်လုပ်ငန်းနှင့် လုံခြုံရေး လမ်းညွှန်',
    version: '4.1',
    page: '06',
    section: 'Section 1.4: Password Reset & Biometrics',
    updatedAt: 'June 2026',
    category: 'Security',
    keywords: ['password', 'reset', 'forgot', 'pin', 'otp', 'မေ့', 'လျှို့ဝှက်နံပါတ်'],
    snippet: 'Password reset requires NRC verification and facial authentication or Branch visit. Bank staff will NEVER ask for 6-digit OTP or MPIN under any circumstance.',
    snippetMm: 'Mobile Banking Password မေ့သွားပါက "Forgot Password" နှိပ်၍ မှတ်ပုံတင်နံပါတ်၊ မျက်နှာစစ်ဆေးမှု (Facial Auth) ဖြင့် မိမိကိုယ်တိုင် ပြန်လည်သတ်မှတ်နိုင်ပါသည်။ ဘဏ်ဝန်ထမ်းများအနေဖြင့် OTP နှင့် PIN ကို လုံးဝ မေးမြန်းမည်မဟုတ်ပါ။'
  },
  {
    id: 'src-account-opening',
    title: 'Personal & Business Account Opening Guidelines',
    titleMm: 'ဘဏ်စာရင်း ဖွင့်လှစ်ခြင်းဆိုင်ရာ လမ်းညွှန်ချက်',
    version: '5.0',
    page: '03',
    section: 'Section 1.1: KYC Documents & Initial Deposit',
    updatedAt: 'August 2026',
    category: 'Accounts',
    keywords: ['account', 'open', 'savings', 'kyc', 'nrc', 'စာရင်းဖွင့်', 'အကောင့်'],
    snippet: 'Individual savings accounts require original NRC, proof of address, and initial minimum deposit of 10,000 MMK. Instant digital account opening is available on Mobile App with e-KYC.',
    snippetMm: 'ငွေစုဘဏ်စာရင်း (Savings Account) ဖွင့်လှစ်ရန် မှတ်ပုံတင်မူရင်း၊ ရပ်ကွက်ထောက်ခံစာ နှင့် အနိမ့်ဆုံး စာရင်းဖွင့်ငွေ ၁၀,၀၀၀ ကျပ် လိုအပ်ပါသည်။ Mobile Banking အက်ပ်မှလည်း e-KYC ဖြင့် ချက်ချင်းဖွင့်နိုင်ပါသည်။'
  },
  {
    id: 'src-transfer-fees',
    title: 'Interbank & Remittance Fee Schedule 2026',
    titleMm: 'ဘဏ်အချင်းချင်း ငွေလွှဲခနှင့် ဝန်ဆောင်ခ နှုန်းထားဇယား',
    version: '1.9',
    page: '02',
    section: 'Section 3.0: CBM-NET & Digital Wallet Transfers',
    updatedAt: 'August 2026',
    category: 'Transfers',
    keywords: ['transfer', 'fee', 'remittance', 'cbm-net', 'ငွေလွှဲ', 'လွှဲခ'],
    snippet: 'Same bank transfers are free of charge. Interbank CBM-NET instant transfers cost 500 MMK per transaction up to 10M MMK. Digital wallet cash-ins are 0% fee.',
    snippetMm: 'တူညီသောဘဏ်အချင်းချင်း ငွေလွှဲခြင်း အခမဲ့ဖြစ်ပါသည်။ အခြားဘဏ်များသို့ CBM-NET ဖြင့် လွှဲပြောင်းပါက တစ်ကြိမ်လျှင် ၅၀၀ ကျပ် (ကျပ် ၁၀ သိန်းအထိ) ကျသင့်ပါသည်။ Digital Wallet သို့ ငွေသွင်းခြင်း အခမဲ့ဖြစ်ပါသည်။'
  },
  {
    id: 'src-fixed-deposit',
    title: 'Fixed Deposit & Special Savings Interest Rates 2026',
    titleMm: 'စာရင်းသေအပ်ငွေ (Fixed Deposit) နှင့် အထူးငွေစု အတိုးနှုန်းများ',
    version: '2.4',
    page: '01',
    section: 'Section 1.0: Interest Rate Schedule',
    updatedAt: 'August 2026',
    category: 'Accounts',
    keywords: ['fixed deposit', 'interest', 'rate', 'fd', 'အတိုး', 'အပ်ငွေ', 'စာရင်းသေ'],
    snippet: 'Fixed Deposit rates: 3 Months: 9.5% p.a., 6 Months: 10.25% p.a., 12 Months: 11.5% p.a. Interest can be credited monthly or on maturity.',
    snippetMm: 'စာရင်းသေအပ်ငွေ အတိုးနှုန်းများ- ၃ လလျှင် ၉.၅%၊ ၆ လလျှင် ၁၀.၂၅%၊ ၁၂ လ (၁ နှစ်) လျှင် ၁၁.၅% နှစ်စဉ်အတိုးနှုန်း ရရှိနိုင်ပါသည်။ အတိုးကို လစဉ် သို့မဟုတ် သက်တမ်းစေ့ချိန်တွင် ထုတ်ယူနိုင်ပါသည်။'
  },
  {
    id: 'src-loans-policy',
    title: 'Personal & SME Loan Policy Guidelines',
    titleMm: 'တစ်ဦးချင်းနှင့် SME ချေးငွေ လမ်းညွှန်မူဝါဒ',
    version: '3.0',
    page: '08',
    section: 'Section 2.2: Eligibility & Documentation',
    updatedAt: 'August 2026',
    category: 'Loans',
    keywords: ['loan', 'sme', 'borrow', 'credit', 'ချေးငွေ', 'အပေါင်'],
    snippet: 'Salary loans require minimum 6 months employment with salary slip. SME business loans require 2 years operational history and tax receipts. Annual interest rate starts at 13.5% p.a.',
    snippetMm: 'လစာအခြေပြု ချေးငွေအတွက် အနည်းဆုံး ၆ လ လုပ်သက်နှင့် လစာစာရွက် လိုအပ်ပါသည်။ SME လုပ်ငန်းချေးငွေအတွက် ၂ နှစ် လုပ်ငန်းသက်တမ်း လိုအပ်ပြီး နှစ်စဉ်အတိုးနှုန်း ၁၃.၅% မှ စတင်ပါသည်။'
  }
];

// Helper to search RAG knowledge base
function findRelevantSources(query: string) {
  const qLower = query.toLowerCase();
  const matched = BANKING_KNOWLEDGE_BASE.filter(doc => {
    return (
      doc.keywords.some(k => qLower.includes(k.toLowerCase())) ||
      qLower.includes(doc.category.toLowerCase()) ||
      doc.titleMm.includes(query) ||
      doc.snippetMm.includes(query)
    );
  });

  if (matched.length > 0) {
    return matched.slice(0, 3);
  }
  // Default to general policy if no exact match
  return [BANKING_KNOWLEDGE_BASE[0], BANKING_KNOWLEDGE_BASE[1]];
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mingalar AI Banking Copilot' });
});

// 2. Chat Endpoint with RAG Grounding + Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversation_id, voiceMode } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const relevantSources = findRelevantSources(message);
    const contextText = relevantSources
      .map(
        s => `[Document: ${s.title} (v${s.version}) | Section: ${s.section} | Page: ${s.page}]\nBurmese: ${s.snippetMm}\nEnglish: ${s.snippet}`
      )
      .join('\n\n');

    const client = getGeminiClient();

    let answer = '';
    let groundingStatus = 'verified';
    let relatedQuestions = [
      'How long does a replacement card take?',
      'What is the emergency hotline number?',
      'Can I manage this from Mobile Banking?'
    ];

    if (client) {
      try {
        const systemInstruction = `You are "Mingalar AI Banking Copilot", a polite, highly trained, and professional banking customer service concierge.
Your primary role is to provide clear, reliable, and verified banking guidance in clear, friendly English (or polite Burmese if the customer explicitly asks in Burmese).

Rules:
1. Tone: Professional, warm, courteous, and clear.
2. Grounding: Use the provided bank knowledge documents strictly. Provide accurate figures, turnaround times, and policy steps.
3. Structure: Format answers clearly with bullet points or numbered steps.
4. Voice-Readiness: Keep answers concise and natural for audio playback / text-to-speech.
5. Escalation: If unverified or outside standard banking, suggest contacting the 24/7 Customer Service hotline (1800-888-999).
6. Security: Never ask for 6-digit OTP, MPIN, or full 16-digit card numbers. Always advise never sharing OTPs.

Verified Bank Knowledge Sources:
${contextText}`;

        const prompt = `Customer Inquiry: "${message}"

Please provide a verified, polite banking response grounded in the provided bank sources. If the user asked in English, answer in English. If they asked in Burmese, you may provide bilingual response or Burmese with English key terms. Also provide 2-3 short follow-up questions the user might want to ask next in English.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            systemInstruction
          }
        });

        if (response.text) {
          answer = response.text.trim();
        }
      } catch (err) {
        console.warn('Gemini API call fallback to curated RAG response:', err);
      }
    }

    // Fallback if no Gemini key or offline
    if (!answer) {
      const q = message.toLowerCase();
      if (q.includes('atm') || q.includes('card') || q.includes('lost') || q.includes('stolen') || q.includes('ပျောက်')) {
        answer = `**Immediate Steps for a Lost or Stolen ATM Card:**

1. **Freeze Your Card Instantly**: Open your Mobile Banking app, go to **Card Management**, and tap **Freeze Card** to prevent unauthorized charges.
2. **Contact 24/7 Hotline**: Call our emergency concierge at **1800-888-999** (Toll-Free) or **01-8392111** to permanently deactivate the card.
3. **Request Replacement**: Visit your nearest branch with your original NRC/ID. Standard replacement fee is **3,000 MMK** (Turnaround: 3–5 business days).

*(ATM ကတ်ပျောက်ဆုံးပါက Mobile Banking မှ Freeze ပြုလုပ်၍ Hotline 1800-888-999 သို့ ချက်ချင်း ဆက်သွယ်ပါ)*`;
        relatedQuestions = [
          'How long does a replacement card take?',
          'What is the emergency hotline number?',
          'What is the replacement fee for platinum cards?'
        ];
      } else if (q.includes('password') || q.includes('pass') || q.includes('reset') || q.includes('pin') || q.includes('မေ့')) {
        answer = `**To Reset Your Mobile Banking Password:**

1. Open the Mobile Banking app and tap **"Forgot Password"** on the sign-in screen.
2. Enter your registered NRC / ID number and complete **Facial Authentication (e-KYC)**.
3. Set your new 8–16 character secure password.

🔒 **Security Reminder:** Bank staff will **NEVER** ask for your 6-digit OTP or MPIN over phone, email, or chat.`;
        relatedQuestions = [
          'What if I do not receive my OTP?',
          'How do I unlock my account if locked?',
          'How to enable biometric Face ID login?'
        ];
      } else if (q.includes('account') || q.includes('open') || q.includes('savings') || q.includes('kyc') || q.includes('စာရင်းဖွင့်')) {
        answer = `**Requirements to Open a Savings Account:**

• **Original NRC / Passport**
• **Proof of Address** (Ward recommendation or Household registration)
• **Minimum Initial Deposit:** 10,000 MMK

*Tip: You can also open an instant digital account directly on our Mobile App with e-KYC without visiting a branch.*`;
        relatedQuestions = [
          'Can I open an account digitally via Mobile App?',
          'What is the minimum initial deposit for checking accounts?',
          'What are the required documents for foreigners?'
        ];
      } else if (q.includes('fee') || q.includes('transfer') || q.includes('remittance') || q.includes('cbm') || q.includes('လွှဲခ')) {
        answer = `**Interbank & Remittance Fee Schedule (2026):**

• **Same-Bank Transfers:** Free (0 MMK)
• **Interbank CBM-NET Instant Transfers:** 500 MMK per transfer (up to 10,000,000 MMK)
• **Digital Wallet Cash-In (KPay / Wave):** 0% service fee

*Transfers via Mobile Banking operate 24/7 in real time.*`;
        relatedQuestions = [
          'What is the daily transfer limit?',
          'How long do CBM-NET transfers take to settle?',
          'Are international SWIFT wire transfers available?'
        ];
      } else if (q.includes('interest') || q.includes('fixed deposit') || q.includes('fd') || q.includes('rate') || q.includes('အတိုး')) {
        answer = `**Current Fixed Deposit (FD) Annual Interest Rates (2026):**

• **3-Month Term:** 9.50% p.a.
• **6-Month Term:** 10.25% p.a.
• **12-Month Term (1 Year):** 11.50% p.a.

*Interest can be paid out monthly directly to your savings account or compounded at maturity.*`;
        relatedQuestions = [
          'What is the minimum initial deposit for Fixed Deposit?',
          'Can I withdraw funds early before maturity?',
          'Are higher rates available for senior citizens?'
        ];
      } else if (q.includes('loan') || q.includes('sme') || q.includes('borrow') || q.includes('ချေးငွေ')) {
        answer = `**Loan Programs & Eligibility Guidelines:**

1. **Salary-Backed Personal Loan:** Requires minimum 6 months employment, recent salary slips, and company recommendation letter.
2. **SME Business Loan:** Requires 2 years of registered business operation and 6-month bank statements.

*Interest rates start from 13.50% p.a. Contact Loan Advisory at **01-8392000** for personalized eligibility assessments.*`;
        relatedQuestions = [
          'How long does loan approval take?',
          'Is collateral required for SME loans?',
          'What is the maximum salary loan amount?'
        ];
      } else {
        answer = `Regarding your inquiry on "${message}", our verified bank systems are ready to assist. For personalized account transactions or specialized inquiries, you can also connect directly with our 24/7 Concierge Hotline at **1800-888-999** or visit any branch.`;
        groundingStatus = 'limited';
        relatedQuestions = [
          'What is the 24/7 customer service number?',
          'Where is the nearest branch location?',
          'What are normal branch operating hours?'
        ];
      }
    }

    res.json({
      answer,
      sources: relevantSources,
      grounding_status: groundingStatus,
      related_questions: relatedQuestions,
      conversation_id: conversation_id || 'conv-' + Date.now()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process banking inquiry',
      answer: 'စနစ်တွင် ယာယီ ချို့ယွင်းချက် ဖြစ်ပေါ်နေပါသည်။ ကျေးဇူးပြု၍ ခေတ္တစောင့်ဆိုင်းပြီး ပြန်လည် မေးမြန်းပေးပါရန် သို့မဟုတ် 1800-888-999 သို့ ဆက်သွယ်ပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။'
    });
  }
});

// 3. STT Endpoint
app.post('/api/stt', async (req, res) => {
  try {
    const { text, audio } = req.body;
    // Normalized transcription
    const transcript = text || 'ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ?';
    res.json({
      transcript,
      confidence: 0.98,
      language: 'my-MM'
    });
  } catch (error) {
    res.status(500).json({ error: 'STT conversion failed' });
  }
});

// 4. TTS Endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice, speed } = req.body;
    res.json({
      status: 'ready',
      durationSeconds: Math.max(3, Math.min(25, (text?.length || 50) / 15)),
      voice: voice || 'Mingalar-Burmese-Female-1',
      speed: speed || 1.0
    });
  } catch (error) {
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

// 5. Knowledge Management Endpoints
let mockDocuments = [...BANKING_KNOWLEDGE_BASE];

app.get('/api/knowledge', (req, res) => {
  res.json({ documents: mockDocuments });
});

app.post('/api/knowledge', (req, res) => {
  const newDoc = {
    id: 'doc-' + Date.now(),
    title: req.body.title || 'New Banking Policy Document',
    titleMm: req.body.titleMm || req.body.title || 'မူဝါဒစာတမ်းအသစ်',
    version: req.body.version || '1.0',
    page: '01',
    section: req.body.section || 'General Section',
    updatedAt: 'Today',
    category: req.body.category || 'General',
    keywords: (req.body.keywords || '').split(',').map((k: string) => k.trim()),
    snippet: req.body.snippet || 'Uploaded bank policy knowledge.',
    snippetMm: req.body.snippetMm || req.body.snippet || 'တင်သွင်းထားသော ဘဏ်မူဝါဒဆိုင်ရာ အချက်အလက်။'
  };
  mockDocuments.unshift(newDoc);
  res.json({ success: true, document: newDoc });
});

// 6. Analytics Endpoint for Staff Dashboard
app.get('/api/analytics', (req, res) => {
  res.json({
    questionsToday: 1248,
    voiceConversations: 894,
    avgResponseTimeMs: 1180,
    helpfulRatePercent: 96.4,
    escalationsCount: 18,
    popularTopics: [
      { topic: 'Lost ATM/Debit Cards', topicMm: 'ATM ကတ် ပျောက်ဆုံးမှု', count: 432, percentage: 34.6 },
      { topic: 'Mobile Banking Password Reset', topicMm: 'Password မေ့/ပြန်သတ်မှတ်ခြင်း', count: 310, percentage: 24.8 },
      { topic: 'Fixed Deposit Rates', topicMm: 'စာရင်းသေ အတိုးနှုန်းများ', count: 245, percentage: 19.6 },
      { topic: 'Interbank Transfer Fees', topicMm: 'ဘဏ်အချင်းချင်း ငွေလွှဲခ', count: 168, percentage: 13.5 },
      { topic: 'Account Opening Requirements', topicMm: 'ဘဏ်စာရင်းဖွင့် KYC', count: 93, percentage: 7.5 }
    ],
    recentLogs: [
      { id: 'log-1', timestamp: '10:24:12 AM', query: 'ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ?', mode: 'Voice', grounding: 'verified', responseTime: '1.1s' },
      { id: 'log-2', timestamp: '10:21:05 AM', query: 'Mobile banking password reset လုပ်နည်း', mode: 'Voice', grounding: 'verified', responseTime: '0.9s' },
      { id: 'log-3', timestamp: '10:18:40 AM', query: 'Fixed deposit 6 months rate', mode: 'Text', grounding: 'verified', responseTime: '1.2s' },
      { id: 'log-4', timestamp: '10:15:22 AM', query: 'ငွေလွှဲခ ဘယ်လောက်လဲ', mode: 'Voice', grounding: 'verified', responseTime: '1.0s' },
      { id: 'log-5', timestamp: '10:11:58 AM', query: 'Crypto trading policy', mode: 'Voice', grounding: 'escalated', responseTime: '1.4s' }
    ]
  });
});

// Vite middleware for development and static files for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mingalar AI Banking Copilot server running on http://localhost:${PORT}`);
  });
}

startServer();
