from __future__ import annotations

import re


_DIGIT_WORDS = (
    "သုည",
    "တစ်",
    "နှစ်",
    "သုံး",
    "လေး",
    "ငါး",
    "ခြောက်",
    "ခုနစ်",
    "ရှစ်",
    "ကိုး",
)

_MYANMAR_TO_ASCII_DIGITS = str.maketrans("၀၁၂၃၄၅၆၇၈၉", "0123456789")

_MONTH_NAMES = (
    "",
    "ဇန်နဝါရီလ",
    "ဖေဖော်ဝါရီလ",
    "မတ်လ",
    "ဧပြီလ",
    "မေလ",
    "ဇွန်လ",
    "ဇူလိုင်လ",
    "ဩဂုတ်လ",
    "စက်တင်ဘာလ",
    "အောက်တိုဘာလ",
    "နိုဝင်ဘာလ",
    "ဒီဇင်ဘာလ",
)

_ABBREVIATION_PRONUNCIATIONS = {
    "ATM": "အေ တီ အမ်",
    "OTP": "အို တီ ပီ",
    "PIN": "ပီ အိုင် အန် နံပါတ်",
    "CVV": "စီ ဗီ ဗီ",
    "SMS": "အက်စ် အမ် အက်စ်",
    "ID": "အိုင် ဒီ",
    "MMK": "ကျပ်",
}

_SPOKEN_BANKING_TERMS = {
    "Card Management": "ကတ်စီမံခန့်ခွဲမှု မီနူး",
    "Customer Call Center": "ဖောက်သည်ဝန်ဆောင်မှုဌာန",
    "Call Center": "ဖောက်သည်ဝန်ဆောင်မှုဌာန",
    "Terminal ID": "စက်နံပါတ်",
    "Freeze Card": "ကတ်ယာယီပိတ်ရန်",
    "Block Card": "ကတ်ပိတ်ရန်",
    "Register New Account": "အကောင့်အသစ် စာရင်းသွင်းရန်",
    "Google Play Store": "ဂူးဂဲလ် ပလေးစတိုး",
    "Mobile Banking Application": "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု အက်ပ်",
    "Mobile Banking App": "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု အက်ပ်",
    "One-Time Password": "တစ်ကြိမ်သုံး လုံခြုံရေးကုဒ်",
    "App Store": "အက်ပ်စတိုး",
    "Customer Service Hotline": "ဖောက်သည်ဝန်ဆောင်မှု ဖုန်းလိုင်း",
    "customer identity verification": "ဖောက်သည်ရဲ့ ကိုယ်ရေးအချက်အလက် အတည်ပြုစစ်ဆေးမှု",
    "transaction reference number": "ငွေလွှဲလုပ်ဆောင်မှု ရည်ညွှန်းနံပါတ်",
    "Mobile Banking Password": "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု စကားဝှက်",
    "Mobile Banking OTP": "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု တစ်ကြိမ်သုံး လုံခြုံရေးကုဒ်",
    "suspicious transaction": "သံသယဖြစ်ဖွယ် ငွေလွှဲလုပ်ဆောင်မှု",
    "valid identity document": "သက်တမ်းရှိ ကိုယ်ရေးအထောက်အထားစာရွက်စာတမ်း",
    "registered phone number": "စာရင်းသွင်းထားသော ဖုန်းနံပါတ်",
    "identity verification": "ကိုယ်ရေးအချက်အလက် အတည်ပြုစစ်ဆေးမှု",
    "transaction receipt": "ငွေလွှဲပြေစာ",
    "transaction review": "ငွေလွှဲမှတ်တမ်း စစ်ဆေးခြင်း",
    "transaction status": "ငွေလွှဲအခြေအနေ",
    "account balance": "အကောင့်လက်ကျန်ငွေ",
    "Customer Service": "ဖောက်သည်ဝန်ဆောင်မှုဌာန",
    "Forgot Password": "စကားဝှက် မေ့နေပါက",
    "Savings Account": "စုဆောင်းငွေစာရင်း",
    "application form": "လျှောက်လွှာပုံစံ",
    "temporary block": "ယာယီပိတ်ထားခြင်း",
    "network signal": "ဖုန်းလိုင်းအချက်ပြမှု",
    "reference number": "ရည်ညွှန်းနံပါတ်",
    "Power of Attorney": "ကိုယ်စားလှယ်လွှဲစာ",
    "Stay Permit": "နေထိုင်ခွင့်လက်မှတ်",
    "Passport": "နိုင်ငံကူးလက်မှတ်",
    "NRC": "နိုင်ငံသားစိစစ်ရေးကတ်ပြား",
    "transfer review": "ငွေလွှဲမှု စစ်ဆေးခြင်း",
    "ATM location": "အေ တီ အမ် စက်တည်နေရာ",
    "PIN reset": "ပီ အိုင် အန် နံပါတ် ပြန်လည်သတ်မှတ်ခြင်း",
    "card renewal": "ကတ်သက်တမ်းတိုးခြင်း",
    "card unblock": "ကတ်ပြန်ဖွင့်ခြင်း",
    "expired card": "သက်တမ်းကုန်ကတ်",
    "Mobile Banking": "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု",
    "Password": "စကားဝှက်",
    "application": "အက်ပ်လီကေးရှင်း",
    "replacement": "အသစ်ပြန်လဲခြင်း",
    "pending": "စောင့်ဆိုင်းဆဲ",
    "resend": "ပြန်လည်ပေးပို့ခြင်း",
    "reset": "ပြန်လည်သတ်မှတ်ခြင်း",
    "channel": "ဝန်ဆောင်မှုလမ်းကြောင်း",
    "Account": "ဘဏ်အကောင့်",
}

_CONVERSATIONAL_REPLACEMENTS = (
    (
        "အေ တီ အမ် ကတ် ပျောက်ဆုံးသွားပါက သို့မဟုတ် ခိုးယူခံရပါက",
        "အေ တီ အမ် ကတ် ပျောက်သွားတာ ဒါမှမဟုတ် ခိုးယူခံရတာဆိုရင်",
    ),
    (
        "ဘဏ်အကောင့်ထဲမှ ငွေကြေးဆုံးရှုံးမှု မရှိစေရန်အတွက် အောက်ပါ "
        "လုပ်ငန်းစဉ်အတိုင်း ချက်ချင်း ဆောင်ရွက်ရပါမည်၊",
        "",
    ),
    ("ဘဏ် Hotline သို့ ချက်ချင်း ဖုန်းဆက်ပါ:", ""),
    ("မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု အက်ပ် မှ ပိတ်ပါ:", ""),
    ("ဘဏ်ခွဲသို့ သွားရောက်ပါ:", ""),
    (
        "ဖောက်သည်ဝန်ဆောင်မှု ဖုန်းလိုင်း ဖုန်းနံပါတ်",
        "ဖောက်သည်ဝန်ဆောင်မှုဖုန်းနံပါတ်",
    ),
    (
        "ကတ်အသစ် ပြန်လည်လျှောက်ထားရန်အတွက်",
        "ကတ်အသစ်ပြန်လျှောက်ဖို့ဆိုရင်",
    ),
    ("မှတ်ပုံတင် မူရင်း ယူဆောင်လာပြီး", "မှတ်ပုံတင်မူရင်းယူပြီး"),
    (
        "လူကိုယ်တိုင် လာရောက် လျှောက်ထားရပါမည်",
        "လူကိုယ်တိုင်သွားလျှောက်ပေးပါနော်",
    ),
    (
        "ကတ်အား ပိတ်ဆို့ (Block) ရပါမည်",
        "ကတ်ကို ယာယီပိတ်ထားပေးဖို့ တောင်းဆိုပေးပါရှင့်",
    ),
    (
        "ကတ်အား ပိတ်ဆို့ ရပါမည်",
        "ကတ်ကို ယာယီပိတ်ထားပေးဖို့ တောင်းဆိုပေးပါရှင့်",
    ),
    (
        "ဘဏ်ခွဲသို့ လူကိုယ်တိုင် သွားရောက်ပါက",
        "ဘဏ်ခွဲကို ကိုယ်တိုင်သွားမယ်ဆိုရင်",
    ),
    (
        "မှတ်ပုံတင် မူရင်း ယူဆောင်လာရပါမည်",
        "မှတ်ပုံတင်မူရင်းကို မမေ့ဘဲ ယူဆောင်သွားပေးပါနော်",
    ),
    ("ကတ်ပျောက်ဆုံးပါက", "ကတ်ပျောက်သွားရင် အရင်ဆုံး"),
    ("အဆိုပါ", "အဲဒီ"),
    ("ကတ်အား", "ကတ်ကို"),
    ("မှတ်သားပါ", "မှတ်ထားပေးပါ"),
    ("ပြန်လည်ထုတ်ယူ", "ပြန်ယူ"),
    ("သတင်းပို့၍", "ဖုန်းဆက်ပြီး"),
    ("ဖျက်ဆီးပစ်မည် ဖြစ်ပါသည်", "ဖျက်ဆီးလိုက်မှာဖြစ်ပါတယ်"),
    ("အေ တီ အမ် စက်တည်ရှိရာ", "အေ တီ အမ် စက်ရှိတဲ့"),
    (
        "ကတ်ကို ယာယီ ထိန်းသိမ်းခိုင်းပါ",
        "ကတ်ကို ယာယီထိန်းသိမ်းထားပေးဖို့ ပြောပေးပါ",
    ),
    ("ဘဏ်ခွဲတွင်", "ဘဏ်ခွဲမှာ"),
    ("ဖုန်းသို့ ရောက်ရှိလာသော", "ဖုန်းကို ရောက်လာတဲ့"),
    ("ဖုန်းသို့ရောက်ရှိလာသော", "ဖုန်းကို ရောက်လာတဲ့"),
    ("အဆင်မပြေပါက", "အဆင်မပြေရင်"),
    ("အဆင်မပြေ ပါက", "အဆင်မပြေရင်"),
    ("သွားရောက် လျှောက်ထား", "သွားပြီး လျှောက်ထား"),
    ("သွားရောက်လျှောက်ထား", "သွားပြီး လျှောက်ထား"),
    ("လျှောက်ထားရမည်ဖြစ်ပါသည်", "လျှောက်ထားပေးရပါမယ်"),
    ("အတည်ပြုရမည်ဖြစ်ပါသည်", "အတည်ပြုပေးရပါမယ်"),
    ("ရိုက်ထည့်၍", "ရိုက်ထည့်ပြီး"),
    ("နှိပ်၍", "နှိပ်ပြီး"),
    ("ယူဆောင်၍", "ယူဆောင်ပြီး"),
    ("မှ ဒေါင်းလုဒ်", "ကနေ ဒေါင်းလုဒ်"),
    ("အက်ပ်မှ", "အက်ပ်ကနေ"),
    ("မိမိ၏", "မိမိရဲ့"),
    ("သို့မဟုတ်", "ဒါမှမဟုတ်"),
    ("ကတ်အသစ်ထုတ်ယူရန်အတွက်", "ကတ်အသစ်ထုတ်ယူမယ်ဆိုရင်"),
    ("ကတ်အသစ် ထုတ်ယူရန်အတွက်", "ကတ်အသစ်ထုတ်ယူမယ်ဆိုရင်"),
    ("ကတ်အသစ်ထုတ်ယူရန်", "ကတ်အသစ်ထုတ်ယူဖို့"),
    ("ကတ်အသစ် ထုတ်ယူရန်", "ကတ်အသစ်ထုတ်ယူဖို့"),
    ("ကိုယ်စားလှယ်ဖြင့်", "ကိုယ်စားလှယ်နဲ့"),
    ("ကိုယ်စားလှယ်၏", "ကိုယ်စားလှယ်ရဲ့"),
    ("ဘဏ်၏", "ဘဏ်ရဲ့"),
    ("သုံးစွဲသူ၏", "သုံးစွဲသူရဲ့"),
    ("နိုင်ငံခြားသားဖြစ်ပါက", "နိုင်ငံခြားသားဖြစ်ရင်"),
    ("နိုင်ငံခြားသား ဖြစ်ပါက", "နိုင်ငံခြားသားဖြစ်ရင်"),
    ("ထုတ်ယူပါက", "ထုတ်ယူရင်"),
    ("ဖြစ်ပါက", "ဖြစ်ရင်"),
    ("ယူဆောင်လာရပါမည်", "ယူဆောင်လာပေးပါ"),
    ("ယူဆောင်လာရပါမယ်", "ယူဆောင်လာပေးပါ"),
    ("ယူဆောင်လာပါ", "ယူဆောင်လာပေးပါ"),
    ("တစ်နေ့လျှင်", "တစ်ရက်ကို"),
    ("ထုတ်ယူနိုင်ပါသည်", "ထုတ်ယူနိုင်ပါတယ်"),
    ("မူတည်ပါသည်", "မူတည်ပါတယ်"),
    ("ဖြစ်ပါသည်", "ဖြစ်ပါတယ်"),
    ("သက်ဆိုင်ရာ ဘဏ်သို့", "သက်ဆိုင်ရာ ဘဏ်ကို"),
    ("ချက်ချင်း ဖုန်းဆက်၍", "ချက်ချင်း ဖုန်းဆက်ပြီး"),
    ("မည်သူ့ကိုမျှ မပြောပြပါနှင့်", "ဘယ်သူ့ကိုမှ မပြောပြပါနဲ့နော်"),
    ("ဘဏ်ဝန်ထမ်းအပါအဝင်", "ဘဏ်ဝန်ထမ်းတွေ အပါအဝင်"),
    ("အတင်းအကျပ် မလုပ်ပါနှင့်", "အတင်းအကျပ် မလုပ်ပါနဲ့နော်"),
    ("ထပ်မံမစမ်းသပ်ပါနှင့်", "ထပ်ပြီး မစမ်းပါနဲ့နော်"),
    ("အသုံးမပြုနိုင်စေရန်", "အသုံးမပြုနိုင်အောင်"),
    ("ပြန်လည်လျှောက်ထားရန်", "ပြန်လည်လျှောက်ထားဖို့"),
    ("ကတ်အသစ်ပြန်လည်", "ကတ်အသစ် ပြန်လည်"),
    ("နီးစပ်ရာဘဏ်ခွဲသို့", "နီးစပ်ရာ ဘဏ်ခွဲကို"),
    ("သွားရောက်ပြီး", "သွားပြီး"),
    ("ပြုလုပ်ပေးပါ", "လုပ်ဆောင်ပေးပါ"),
    ("ပြုလုပ်ရန်", "လုပ်ဖို့"),
    ("ယာယီပိတ်ထားခြင်း (ယာယီပိတ်ထားခြင်း)", "ယာယီပိတ်ထားခြင်း"),
)


def _integer_to_words(value: int) -> str:
    if value < 0:
        return f"အနုတ် {_integer_to_words(abs(value))}"
    if value < 10:
        return _DIGIT_WORDS[value]
    if value < 100:
        tens, remainder = divmod(value, 10)
        result = f"{_DIGIT_WORDS[tens]}ဆယ်"
        return result if remainder == 0 else f"{_DIGIT_WORDS[tens]}ဆယ့်{_DIGIT_WORDS[remainder]}"

    for scale, label in (
        (10_000_000, "ကုဋေ"),
        (1_000_000, "သန်း"),
        (100_000, "သိန်း"),
        (10_000, "သောင်း"),
        (1_000, "ထောင်"),
        (100, "ရာ"),
    ):
        if value >= scale:
            quotient, remainder = divmod(value, scale)
            result = f"{_integer_to_words(quotient)}{label}"
            return result if remainder == 0 else f"{result} {_integer_to_words(remainder)}"

    raise ValueError(f"Unsupported integer: {value}")


def _number_to_words(raw_value: str) -> str:
    cleaned = raw_value.replace(",", "")
    if "." not in cleaned:
        return _integer_to_words(int(cleaned))

    whole, fraction = cleaned.split(".", maxsplit=1)
    fraction_words = " ".join(_DIGIT_WORDS[int(digit)] for digit in fraction)
    return f"{_integer_to_words(int(whole))} ဒသမ {fraction_words}"


def _replace_iso_date(match: re.Match[str]) -> str:
    year, month, day = map(int, match.groups())
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return match.group(0)
    return (
        f"{_integer_to_words(day)} ရက်၊ {_MONTH_NAMES[month]}၊ "
        f"{_integer_to_words(year)} ခုနှစ်"
    )


def _replace_slash_date(match: re.Match[str]) -> str:
    day, month, year = map(int, match.groups())
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return match.group(0)
    return (
        f"{_integer_to_words(day)} ရက်၊ {_MONTH_NAMES[month]}၊ "
        f"{_integer_to_words(year)} ခုနှစ်"
    )


def _replace_time(match: re.Match[str]) -> str:
    hour = int(match.group(1))
    minute = int(match.group(2))
    meridiem = (match.group(3) or "").upper()

    spoken_hour = hour
    prefix = ""
    if meridiem:
        spoken_hour = hour % 12 or 12
        prefix = "မနက် " if meridiem == "AM" else "ညနေ "

    result = f"{prefix}{_integer_to_words(spoken_hour)} နာရီ"
    if minute:
        result += f" {_integer_to_words(minute)} မိနစ်"
    return result


def _replace_percentage(match: re.Match[str]) -> str:
    return f"{_number_to_words(match.group(1))} ရာခိုင်နှုန်း"


def _replace_currency(match: re.Match[str]) -> str:
    return f"{_number_to_words(match.group(1))} ကျပ်"


def _replace_phone_number(match: re.Match[str]) -> str:
    raw_value = match.group(0)
    has_plus = raw_value.startswith("+")
    digits = re.sub(r"\D", "", raw_value)

    if has_plus and digits.startswith("95"):
        group_sizes = (2, 3, 3, 4)
    elif digits.startswith("09") and len(digits) == 11:
        group_sizes = (2, 3, 3, 3)
    elif digits.startswith("09") and len(digits) == 10:
        group_sizes = (2, 4, 4)
    else:
        group_sizes = (len(digits),)

    groups: list[str] = []
    offset = 0
    for size in group_sizes:
        group = digits[offset : offset + size]
        if not group:
            break
        groups.append(" ".join(_DIGIT_WORDS[int(digit)] for digit in group))
        offset += size
    if offset < len(digits):
        groups.append(
            " ".join(_DIGIT_WORDS[int(digit)] for digit in digits[offset:])
        )

    spoken_digits = "၊ ".join(groups)
    return f"အပေါင်း {spoken_digits}" if has_plus else spoken_digits


def _replace_spoken_banking_terms(text: str) -> str:
    # Longest terms run first so, for example, Customer Service Hotline is not
    # partially replaced as Customer Service.
    for term, spoken_burmese in sorted(
        _SPOKEN_BANKING_TERMS.items(), key=lambda item: len(item[0]), reverse=True
    ):
        text = re.sub(
            rf"(?<![A-Za-z]){re.escape(term)}(?![A-Za-z])",
            spoken_burmese,
            text,
            flags=re.IGNORECASE,
        )
    return text


def _deduplicate_spoken_aliases(text: str) -> str:
    """Collapse an English alias that expands to the Burmese text beside it."""

    text = re.sub(
        r"နိုင်ငံသား\s+စိစစ်ရေး\s+ကတ်ပြား",
        "နိုင်ငံသားစိစစ်ရေးကတ်ပြား",
        text,
    )
    aliases = (
        "နိုင်ငံသားစိစစ်ရေးကတ်ပြား",
        "ကိုယ်စားလှယ်လွှဲစာ",
        "နိုင်ငံကူးလက်မှတ်",
        "နေထိုင်ခွင့်လက်မှတ်",
        "တစ်ကြိမ်သုံး လုံခြုံရေးကုဒ်",
    )
    for alias in aliases:
        text = re.sub(
            rf"{re.escape(alias)}\s*\(\s*{re.escape(alias)}\s*\)",
            alias,
            text,
        )
    return text


def _complete_document_list_sentences(text: str) -> str:
    """Give document-list fragments a natural spoken predicate."""

    text = re.sub(
        r"ဘဏ်ခွဲမှာ\s+ကတ်အသစ်\s*ထုတ်ယူရာမှာ\s+လုံခြုံရေး\s*"
        r"စိစစ်ရန်အတွက်\s+အောက်ပါ\s+စာရွက်စာတမ်းများ\s+မူရင်း\s+"
        r"ယူဆောင်လာပေးပါ[၊။]",
        "ဘဏ်ခွဲမှာ ကတ်အသစ်ထုတ်ယူဖို့ လုံခြုံရေးစစ်ဆေးရာမှာ "
        "လိုအပ်တဲ့ စာရွက်စာတမ်းမူရင်းတွေ ယူသွားပေးပါ။",
        text,
    )
    text = re.sub(
        r"နိုင်ငံသားစိစစ်ရေးကတ်ပြား\s+မူရင်း\s*\(\s*"
        r"မိတ္တူတော့\s+လက်မခံပါဘူးနော်\s*\)",
        "နိုင်ငံသားဖြစ်ရင် နိုင်ငံသားစိစစ်ရေးကတ်ပြားမူရင်း "
        "ယူသွားရပါတယ်။ မိတ္တူတော့ လက်မခံပါဘူးနော်",
        text,
    )

    def add_bring_action(match: re.Match[str]) -> str:
        body = match.group("body").rstrip()
        punctuation = match.group("punctuation")
        if any(
            action in body
            for action in (
                "ယူသွား",
                "ယူဆောင်",
                "ယူလာ",
                "ပြသ",
                "တင်ပြ",
                "လိုအပ်",
            )
        ):
            return match.group(0)
        suffix = " ယူသွားရပါတယ်" if body.endswith("ကို") else "ကို ယူသွားရပါတယ်"
        return f"{body}{suffix}{punctuation}"

    conditional_patterns = (
        r"(?P<body>နိုင်ငံခြားသားဖြစ်ရင်(?=[^။!?]*နိုင်ငံကူးလက်မှတ်)"
        r"(?=[^။!?]*နေထိုင်ခွင့်လက်မှတ်)[^။!?]+)"
        r"(?P<punctuation>[။!?])",
        r"(?P<body>ကိုယ်စားလှယ်နဲ့\s*ထုတ်ယူရင်"
        r"(?=[^။!?]*ကိုယ်စားလှယ်လွှဲစာ)"
        r"(?=[^။!?]*နိုင်ငံသားစိစစ်ရေးကတ်ပြား)[^။!?]+)"
        r"(?P<punctuation>[။!?])",
    )
    for pattern in conditional_patterns:
        text = re.sub(pattern, add_bring_action, text)
    return text


def _make_conversational(text: str) -> str:
    for formal_text, spoken_text in _CONVERSATIONAL_REPLACEMENTS:
        text = text.replace(formal_text, spoken_text)

    text = re.sub(
        r"မိတ္တူ(?:ကို)?\s*လက်မခံပါ(\))?(?=[၊။!?])",
        r"မိတ္တူတော့ လက်မခံပါဘူးနော်\1",
        text,
    )
    text = re.sub(r"\s*နှင့်\s*", "နဲ့ ", text)
    text = re.sub(r"\s*ဖြင့်\s*", "နဲ့ ", text)
    text = re.sub(r"သို့(?=\s|[၊။!?]|$)", "ကို", text)
    # Do not turn အတွင်း into အမှား while converting the formal postposition
    # တွင် to the spoken မှာ.
    text = re.sub(r"တွင်(?!း)", "မှာ", text)
    text = re.sub(r"စက်ထဲ(?!မှာ)", "စက်ထဲမှာ", text)
    text = text.replace("၏", "ရဲ့")
    text = text.replace("ပါက", "ရင်")
    text = text.replace("၍", "ပြီး")
    text = text.replace("မူရင်းယူဆောင်ပြီး", "မူရင်းယူသွားပြီး")
    text = text.replace("မူရင်း ယူဆောင်ပြီး", "မူရင်း ယူသွားပြီး")
    text = text.replace("ရမည်ဖြစ်ပါသည်", "ရပါမယ်")
    text = text.replace("နိုင်ပါသည်", "နိုင်ပါတယ်")
    text = text.replace("ရပါမည်", "ရပါမယ်")
    text = text.replace("ဖြစ်ပါသည်", "ဖြစ်ပါတယ်")
    text = text.replace("ပါသည်", "ပါတယ်")
    text = re.sub(
        r"(ဘဏ်ရဲ့\s+ဖောက်သည်ဝန်ဆောင်မှုဖုန်းနံပါတ်\s+[^။]*?\S)\s*ကို\s+"
        r"နှစ်ဆယ့်လေးနာရီ၊\s*တစ်ပတ်လုံး\s+ချက်ချင်း\s+ဖုန်းဆက်ပြီး\s+"
        r"ကတ်ကို\s+ပိတ်ဆို့\s+ခိုင်းပါ",
        r"\1ကို အခုချက်ချင်း ဖုန်းဆက်ပြီး ကတ်ကို ပိတ်ထားပေးဖို့ "
        r"ပြောပေးပါ။ ဒီဖုန်းကို နေ့ရောညပါ အချိန်မရွေး "
        r"ဆက်သွယ်နိုင်ပါတယ်",
        text,
    )
    text = re.sub(
        r"မိမိရဲ့\s+မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု\s+အက်ပ်\s+ထဲရှိ\s+"
        r"ကတ်စီမံခန့်ခွဲမှု\s+မီနူး\s+သို့သွားပြီး\s+"
        r"ကတ်ယာယီပိတ်ရန်\s+ဒါမှမဟုတ်\s+ကတ်ပိတ်ရန်\s+ကို\s+"
        r"မိမိကိုယ်တိုင်\s+ချက်ချင်း\s+နှိပ်ပြီး\s+ပိတ်နိုင်ပါတယ်",
        "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှုအက်ပ်ထဲက "
        "ကတ်စီမံခန့်ခွဲမှုနေရာမှာ ကတ်ကို ကိုယ်တိုင် "
        "ယာယီပိတ်ထားလို့လည်း ရပါတယ်",
        text,
    )
    text = re.sub(
        r"(သွား(?:ပြီး\s*)?လျှောက်ထား|သွားလျှောက်|လျှောက်ထား)နိုင်ပါတယ်",
        r"\1လို့လည်း ရပါတယ်နော်",
        text,
    )
    text = _complete_document_list_sentences(text)

    # Use နော် for a friendly warning and ရှင့် for a polite instruction. The
    # look-ahead keeps particles at sentence endings instead of adding them to
    # every phrase in the answer.
    text = re.sub(r"မရပါ(?=[။!?])", "မရပါရှင့်", text)
    text = re.sub(r"မလုပ်ပါနှင့်(?=[။!?])", "မလုပ်ပါနဲ့နော်", text)
    text = re.sub(r"မပြောပြပါနှင့်(?=[။!?])", "မပြောပြပါနဲ့နော်", text)
    text = re.sub(r"ပေးပါ(?=[၊။!?])", "ပေးပါရှင့်", text)
    text = re.sub(r"လိုအပ်ပါတယ်(?=[။!?])", "လိုအပ်ပါတယ်ရှင့်", text)
    text = re.sub(r"ရပါမယ်(?=[။!?])", "ရပါမယ်ရှင့်", text)
    text = re.sub(
        r"(အဆင်မပြေရင်[^။!?]*နိုင်ပါတယ်)(?=[။!?])",
        r"\1နော်",
        text,
    )

    # Ensure there is one respectful ရှင့် even when another sentence already
    # uses နော်. Add it only once so the speech stays warm without repetition.
    if "ရှင့်" not in text:
        text, count = re.subn(
            r"(ပါတယ်|ပါမယ်|ပါ)([။!?])(\s*)$",
            r"\1ရှင့်\2\3",
            text,
            count=1,
        )
        if count == 0:
            text = re.sub(
                r"(ပါတယ်|ပါမယ်|ပါ)(?=[၊။!?])",
                r"\1ရှင့်",
                text,
                count=1,
            )

    # Burmese postpositions normally attach to the preceding noun. These
    # spaces originate from replacing an English term inside mixed text.
    text = re.sub(
        r"(နံပါတ်|ဖုန်းလိုင်း|ဝန်ဆောင်မှုဌာန|စာရွက်စာတမ်း|ကတ်ပြား|လက်မှတ်|အက်ပ်|မီနူး) (ကို|မှာ|မှ)",
        r"\1\2",
        text,
    )
    return text


def normalize_for_tts(text: str) -> str:
    """Convert display text into deterministic Burmese speech-oriented text.

    Only ``tts_text`` should use this function. The customer-facing ``answer``
    remains unchanged so English banking terms and exact policy wording are
    still visible in the API response.
    """

    normalized = text.translate(_MYANMAR_TO_ASCII_DIGITS)
    normalized = normalized.replace("24/7", "နှစ်ဆယ့်လေးနာရီ၊ တစ်ပတ်လုံး")
    normalized = re.sub(
        r"ပိတ်ဆို့\s*\(\s*Block\s*\)",
        "ပိတ်ဆို့",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"စက်နံပါတ်\s*\(\s*Terminal ID\s*\)",
        "စက်နံပါတ်",
        normalized,
        flags=re.IGNORECASE,
    )

    normalized = re.sub(
        r"(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)",
        _replace_iso_date,
        normalized,
    )
    normalized = re.sub(
        r"(?<!\d)(\d{1,2})/(\d{1,2})/(\d{4})(?!\d)",
        _replace_slash_date,
        normalized,
    )
    normalized = re.sub(
        r"(?<!\d)([01]?\d|2[0-3]):([0-5]\d)\s*(AM|PM)?(?!\w)",
        _replace_time,
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"(?<!\d)(\d+(?:\.\d+)?)\s*%",
        _replace_percentage,
        normalized,
    )
    normalized = re.sub(
        r"(?<!\d)(\d[\d,]*(?:\.\d+)?)\s*(?:MMK|Ks?|ကျပ်)(?![A-Za-z])",
        _replace_currency,
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"(?<![\d/])(?:\+95[\s-]?\d(?:[\s-]?\d){7,10}|0\d(?:[\s-]?\d){7,10})(?!\d)",
        _replace_phone_number,
        normalized,
    )
    normalized = re.sub(
        r"(?<!\d)(\d{1,3}(?:,\d{3})+)(?!\d)",
        lambda match: _number_to_words(match.group(1)),
        normalized,
    )
    normalized = re.sub(
        r"(?<![\dA-Za-z])(\d+(?:\.\d+)?)(?![\dA-Za-z])",
        lambda match: _number_to_words(match.group(1)),
        normalized,
    )

    normalized = _replace_spoken_banking_terms(normalized)
    normalized = _deduplicate_spoken_aliases(normalized)
    normalized = re.sub(r'["“”]', "", normalized)
    normalized = re.sub(
        r"ကတ်စီမံခန့်ခွဲမှု မီနူး\s+menu\b",
        "ကတ်စီမံခန့်ခွဲမှု မီနူး",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = normalized.replace(
        "မှတ်ပုံတင် (နိုင်ငံသားစိစစ်ရေးကတ်ပြား)",
        "မှတ်ပုံတင်",
    )

    for abbreviation, pronunciation in _ABBREVIATION_PRONUNCIATIONS.items():
        normalized = re.sub(
            rf"(?<![A-Za-z]){re.escape(abbreviation)}(?![A-Za-z])",
            pronunciation,
            normalized,
        )

    normalized = _make_conversational(normalized)

    normalized = re.sub(r"\s+", " ", normalized)
    normalized = re.sub(r"\s+([၊။,.!?])", r"\1", normalized)
    normalized = re.sub(r"([၊။])(?=\S)", r"\1 ", normalized)
    return normalized.strip()
