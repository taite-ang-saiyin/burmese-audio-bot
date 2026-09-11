import { KnowledgeDocument, SourceDocument, ConversationSession } from '../types';

export const BANK_SOURCES: SourceDocument[] = [
  {
    id: 'src-atm-policy',
    title: 'ATM Card Replacement & Security Policy',
    titleMm: 'ATM ကတ် လဲလှယ်ခြင်းနှင့် လုံခြုံရေးဆိုင်ရာ မူဝါဒ',
    version: '3.2',
    page: '14',
    section: 'Section 4.2: Lost & Stolen Cards Procedures',
    updatedAt: 'July 2026',
    category: 'Cards',
    snippet: 'Upon notification of lost or stolen ATM cards, immediate temporary freezing via Mobile App or Hotline 1800-888-999 is mandated within 15 minutes. Card replacement turnaround is 3-5 business days.',
    snippetMm: 'ATM ကတ် ပျောက်ဆုံးပါက Mobile Banking အက်ပ်မှ ချက်ချင်း ယာယီပိတ်နိုင်ပြီး Hotline သို့ ဆက်သွယ်ပါက ချက်ချင်း ပိတ်သိမ်းပေးပါသည်။ ကတ်အသစ် ပြန်လည်ထုတ်ပေးရန် ရုံးဖွင့်ရက် ၃ ရက်မှ ၅ ရက် ကြာမြင့်ပါသည်။'
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
    snippet: 'Fixed Deposit rates: 3 Months: 9.5% p.a., 6 Months: 10.25% p.a., 12 Months: 11.5% p.a. Interest can be credited monthly or on maturity.',
    snippetMm: 'စာရင်းသေအပ်ငွေ အတိုးနှုန်းများ- ၃ လလျှင် ၉.၅%၊ ၆ လလျှင် ၁၀.၂၅%၊ ၁၂ လ (၁ နှစ်) လျှင် ၁၁.၅% နှစ်စဉ်အတိုးနှုန်း ရရှိနိုင်ပါသည်။ အတိုးကို လစဉ် သို့မဟုတ် သက်တမ်းစေ့ချိန်တွင် ထုတ်ယူနိုင်ပါသည်။'
  }
];

export const KNOWLEDGE_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: 'ATM & Debit Card Master Policy',
    titleMm: 'ATM နှင့် ဒက်ဘစ်ကတ် ပင်မမူဝါဒ',
    type: 'Policy',
    status: 'Ready',
    version: '3.2',
    lastUpdated: '2026-07-15',
    sectionsCount: 38,
    author: 'Cards & Payments Dept',
    fileSize: '4.2 MB',
    description: 'Covers card issuance, security controls, lost/stolen mitigation, international usage, and replacement fee structures.',
    tags: ['ATM', 'Debit Card', 'Lost Card', 'Security']
  },
  {
    id: 'doc-2',
    title: 'Mobile Banking e-Services SOP',
    titleMm: 'မိုဘိုင်းဘဏ်လုပ်ငန်း ဝန်ဆောင်မှု လုပ်ထုံးလုပ်နည်း',
    type: 'Procedure',
    status: 'Ready',
    version: '4.1',
    lastUpdated: '2026-06-28',
    sectionsCount: 52,
    author: 'Digital Banking Team',
    fileSize: '6.8 MB',
    description: 'Digital banking onboarding, biometric authentication, OTP protocols, daily limits, and PIN reset workflows.',
    tags: ['Mobile Banking', 'Password', 'OTP', 'Biometrics']
  },
  {
    id: 'doc-3',
    title: 'Customer Onboarding & KYC Manual',
    titleMm: 'သုံးစွဲသူ စာရင်းဖွင့်လှစ်ခြင်းနှင့် KYC လက်စွဲ',
    type: 'Procedure',
    status: 'Ready',
    version: '5.0',
    lastUpdated: '2026-08-10',
    sectionsCount: 44,
    author: 'Retail Banking Division',
    fileSize: '5.1 MB',
    description: 'Retail KYC requirements, corporate accounts, resident/non-resident rules, digital e-KYC compliance.',
    tags: ['Account Opening', 'KYC', 'NRC', 'Savings']
  },
  {
    id: 'doc-4',
    title: 'Remittance & Interbank Transfer Guide',
    titleMm: 'ငွေလွှဲခြင်းနှင့် ဘဏ်အချင်းချင်း ချိတ်ဆက်မှု လမ်းညွှန်',
    type: 'Circular',
    status: 'Ready',
    version: '1.9',
    lastUpdated: '2026-08-01',
    sectionsCount: 26,
    author: 'Treasury & Operations',
    fileSize: '2.9 MB',
    description: 'CBM-NET rates, prompt clearing, cross-border remittances, wallet API integrations and transaction fee breakdowns.',
    tags: ['Transfer Fees', 'CBM-NET', 'Remittance', 'Digital Wallet']
  },
  {
    id: 'doc-5',
    title: 'Deposit Rates & Product Specifications 2026',
    titleMm: 'အပ်ငွေအတိုးနှုန်းများနှင့် ထုတ်ကုန်အသေးစိတ် ၂၀၂၆',
    type: 'Circular',
    status: 'Ready',
    version: '2.4',
    lastUpdated: '2026-08-18',
    sectionsCount: 19,
    author: 'Product & Wealth Advisory',
    fileSize: '1.8 MB',
    description: 'High-yield savings, fixed deposit tenors, senior citizen bonus rates, and tax deduction guidelines.',
    tags: ['Interest Rates', 'Fixed Deposit', 'Savings', 'Investment']
  },
  {
    id: 'doc-6',
    title: 'Personal & SME Loan Policy Guidelines',
    titleMm: 'တစ်ဦးချင်းနှင့် SME ချေးငွေ လမ်းညွှန်မူဝါဒ',
    type: 'Policy',
    status: 'Needs Review',
    version: '3.0-Draft',
    lastUpdated: '2026-08-20',
    sectionsCount: 65,
    author: 'Credit Risk Dept',
    fileSize: '8.4 MB',
    description: 'Collateral assessment, salary loan requirements, interest calculation, SME credit scoring.',
    tags: ['Loans', 'SME', 'Interest', 'Mortgage']
  }
];

export const PRELOADED_CONVERSATIONS: ConversationSession[] = [
  {
    id: 'conv-demo-1',
    title: 'ATM Card Loss & Recovery',
    titleMm: 'ATM Card Loss & Recovery',
    createdAt: '10:22 AM',
    lastMessageAt: '10:24 AM',
    category: 'Cards',
    voiceCount: 2,
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        text: 'What should I do if I lost my ATM card?',
        transcriptMm: 'What should I do if I lost my ATM card?',
        isVoice: true,
        timestamp: '10:24 AM',
        audioDurationSeconds: 4
      },
      {
        id: 'msg-2',
        role: 'assistant',
        text: `**Immediate Steps for a Lost or Stolen ATM Card:**

1. **Freeze Your Card Instantly**: Open your Mobile Banking app, go to **Card Management**, and tap **Freeze Card** to prevent unauthorized transactions.
2. **Contact 24/7 Hotline**: Call our emergency concierge at **1800-888-999** (Toll-Free) or **01-8392111** to permanently block the card.
3. **Request a Replacement**: Visit any branch with your original NRC/ID. Standard replacement fee is **3,000 MMK** (Turnaround: 3–5 business days).

*(ATM ကတ်ပျောက်ဆုံးပါက Mobile Banking မှ Freeze ပြုလုပ်၍ Hotline 1800-888-999 သို့ ချက်ချင်း ဆက်သွယ်ပါ)*`,
        isVoice: true,
        timestamp: '10:24 AM',
        audioDurationSeconds: 16,
        groundingStatus: 'verified',
        sources: [BANK_SOURCES[0], BANK_SOURCES[1]],
        relatedQuestions: [
          'How long does a replacement card take?',
          'What is the emergency hotline number?',
          'How much is the replacement fee for platinum cards?'
        ]
      }
    ]
  },
  {
    id: 'conv-history-2',
    title: 'Mobile Banking Password Reset',
    titleMm: 'Mobile Banking Password Reset',
    createdAt: 'Yesterday, 3:15 PM',
    lastMessageAt: 'Yesterday, 3:18 PM',
    category: 'Security',
    voiceCount: 1,
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        text: 'How do I reset my Mobile Banking password?',
        transcriptMm: 'How do I reset my Mobile Banking password?',
        isVoice: true,
        timestamp: 'Yesterday, 3:15 PM'
      },
      {
        id: 'msg-4',
        role: 'assistant',
        text: `**To Reset Your Mobile Banking Password:**

1. Open the Mobile Banking app and tap **"Forgot Password"** on the login screen.
2. Enter your registered NRC/ID number and verify via **Facial Authentication (e-KYC)**.
3. Set your new 8–16 character secure password.

🔒 **Security Reminder:** Bank staff will **NEVER** ask for your 6-digit OTP or MPIN over phone, email, or chat.`,
        isVoice: true,
        timestamp: 'Yesterday, 3:18 PM',
        groundingStatus: 'verified',
        sources: [BANK_SOURCES[2]],
        relatedQuestions: [
          'What if I did not receive my OTP?',
          'How to unlock my account if it is locked?'
        ]
      }
    ]
  },
  {
    id: 'conv-history-3',
    title: 'Fixed Deposit Rates 2026',
    titleMm: 'Fixed Deposit Rates 2026',
    createdAt: '2 days ago',
    lastMessageAt: '2 days ago',
    category: 'Accounts',
    voiceCount: 1,
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        text: 'What are the current Fixed Deposit interest rates?',
        isVoice: false,
        timestamp: '2 days ago'
      },
      {
        id: 'msg-6',
        role: 'assistant',
        text: `**Current 2026 Fixed Deposit (FD) Annual Interest Rates:**

• **3-Month Term:** 9.50% p.a.
• **6-Month Term:** 10.25% p.a.
• **12-Month Term (1 Year):** 11.50% p.a.

*Interest can be credited monthly directly into your savings account or compounded at maturity.*`,
        isVoice: true,
        timestamp: '2 days ago',
        groundingStatus: 'verified',
        sources: [BANK_SOURCES[5]],
        relatedQuestions: [
          'What is the minimum initial deposit for FD?',
          'Can I withdraw early before maturity?'
        ]
      }
    ]
  }
];

export const QUICK_QUESTIONS = [
  {
    text: 'What should I do if I lost my ATM card?',
    category: 'Cards',
    tag: 'Emergency'
  },
  {
    text: 'How do I reset my Mobile Banking password?',
    category: 'Security',
    tag: 'Security'
  },
  {
    text: 'What are the current Fixed Deposit interest rates?',
    category: 'Accounts',
    tag: 'Interest'
  },
  {
    text: 'How much are interbank transfer fees?',
    category: 'Transfers',
    tag: 'Transfer'
  },
  {
    text: 'What documents are required to open an account?',
    category: 'Accounts',
    tag: 'Accounts'
  },
  {
    text: 'What are the requirements for a personal loan?',
    category: 'Loans',
    tag: 'Loans'
  }
];

export const MOCK_ANALYTICS = {
  totalQueriesToday: 1482,
  voiceQueriesRate: 78.4,
  avgResponseTimeSeconds: 1.2,
  helpfulRate: 94.8,
  escalationsCount: 38,
  escalationRate: 2.5,
  popularTopics: [
    { topic: 'ATM Card Loss & Recovery (ကတ်ပျောက်ဆုံးမှု)', count: 412, percentage: 27.8 },
    { topic: 'Mobile Banking Password Reset (စကားဝှက် ပြင်ဆင်ခြင်း)', count: 345, percentage: 23.2 },
    { topic: 'Interbank Transfer & CBM-NET Fees (ငွေလွှဲခ နှုန်းထားများ)', count: 289, percentage: 19.5 },
    { topic: 'Fixed Deposit Interest Rates (စာရင်းသေ အတိုးနှုန်းများ)', count: 218, percentage: 14.7 },
    { topic: 'New Account Opening KYC (စာရင်းဖွင့် စည်းကမ်းချက်များ)', count: 142, percentage: 9.6 }
  ]
};

export const MOCK_RECENT_INQUIRIES = [
  {
    id: 'inq-1',
    query: 'ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ?',
    timestamp: '10:24 AM',
    confidence: 0.98,
    latencySeconds: 1.1,
    status: 'verified' as const,
    isVoice: true,
    category: 'Cards',
    escalated: false
  },
  {
    id: 'inq-2',
    query: 'Mobile Banking password reset ဘယ်လိုလုပ်ရမလဲ?',
    timestamp: '10:18 AM',
    confidence: 0.96,
    latencySeconds: 1.3,
    status: 'verified' as const,
    isVoice: true,
    category: 'Security',
    escalated: false
  },
  {
    id: 'inq-3',
    query: 'အိမ်ဝယ်ဖို့ ချေးငွေ အတိုးနှုန်းနဲ့ စည်းကမ်းတွေ သိချင်ပါတယ်',
    timestamp: '10:12 AM',
    confidence: 0.82,
    latencySeconds: 1.5,
    status: 'limited' as const,
    isVoice: false,
    category: 'Loans',
    escalated: true
  },
  {
    id: 'inq-4',
    query: 'တခြားဘဏ်ကို CBM-NET နဲ့ လွှဲရင် ဘယ်လောက်ကြာမလဲ?',
    timestamp: '10:05 AM',
    confidence: 0.95,
    latencySeconds: 1.0,
    status: 'verified' as const,
    isVoice: true,
    category: 'Transfers',
    escalated: false
  },
  {
    id: 'inq-5',
    query: 'နိုင်ငံခြားသို့ ငွေလွှဲခြင်း Swift Code စည်းမျဉ်းများ',
    timestamp: '09:50 AM',
    confidence: 0.74,
    latencySeconds: 1.8,
    status: 'limited' as const,
    isVoice: false,
    category: 'Transfers',
    escalated: true
  }
];

