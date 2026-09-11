import sys
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

raw_outputs = [
    "မင်္ဂလာပါရှင်၊ ကျွန်မတို့ဘဏ်မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။ (Hello, welcome)\nSentence 1: 'Hello'",
    "မင်္ဂလာပါခင်ဗျာ။ ကျွန်တော်တို့ ဘဏ်မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။ (Welcome to bank)",
    "ကျေးဇူးတင်ပါတယ်ရှင့်။ ဘာများ ကူညီပေးရမလဲ။ * Note: friendly",
]

for raw in raw_outputs:
    cleaned = re.sub(r"(?i)\*?check draft.*$", "", raw, flags=re.DOTALL).strip()
    cleaned = re.sub(r"- Sentence \d+:.*$", "", cleaned, flags=re.DOTALL).strip()

    valid_lines = []
    for line in cleaned.splitlines():
        line = re.sub(r"\([^)]*\)", "", line)
        line = re.sub(r"[a-zA-Z]+", "", line)
        line = re.sub(r"['\"`*_#—\-–:]", "", line)
        line = re.sub(r"\s+", " ", line).strip()
        if line and any("\u1000" <= char <= "\u109f" for char in line):
            valid_lines.append(line)

    res = " ".join(valid_lines)
    print("INPUT:", repr(raw[:30]))
    print("CLEANED:", res)
    print("-" * 40)
