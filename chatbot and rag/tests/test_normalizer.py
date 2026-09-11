import pytest

from app.normalization.burmese_normalizer import normalize_for_tts


@pytest.mark.parametrize(
    ("source", "must_contain", "must_not_contain"),
    [
        (
            "ATM OTP PIN CVV SMS ID",
            ("အေ တီ အမ်", "အို တီ ပီ", "ပီ အိုင် အန်", "စီ ဗီ ဗီ"),
            ("ATM", "OTP", "PIN", "CVV"),
        ),
        (
            "Service 24/7, fee 500,000 MMK",
            ("နှစ်ဆယ့်လေးနာရီ၊ တစ်ပတ်လုံး", "ငါးသိန်း ကျပ်"),
            ("24/7", "500,000", "MMK"),
        ),
        (
            "အတိုးနှုန်း 5.5% ဖြစ်သည်။",
            ("ငါး ဒသမ ငါး ရာခိုင်နှုန်း",),
            ("5.5%",),
        ),
        (
            "2026-08-17 နှင့် 18/08/2026",
            ("ဩဂုတ်လ", "နှစ်ထောင် နှစ်ဆယ့်ခြောက် ခုနှစ်"),
            ("2026-08-17", "18/08/2026"),
        ),
        (
            "3:30 PM တွင် ဆက်သွယ်ပါ။",
            ("ညနေ သုံး နာရီ သုံးဆယ် မိနစ်",),
            ("3:30", "PM"),
        ),
        (
            "ဖုန်း +959123456789 သို့မဟုတ် 09123456789",
            ("အပေါင်း ကိုး ငါး", "သုည ကိုး"),
            ("+959123456789", "09123456789"),
        ),
    ],
)
def test_speech_normalization(source, must_contain, must_not_contain):
    result = normalize_for_tts(source)

    for expected in must_contain:
        assert expected in result
    for raw_value in must_not_contain:
        assert raw_value not in result


def test_normalization_is_deterministic_and_does_not_mutate_input():
    source = "ATM ကတ် PIN 1234"

    first = normalize_for_tts(source)
    second = normalize_for_tts(source)

    assert source == "ATM ကတ် PIN 1234"
    assert first == second


def test_policy_answer_becomes_natural_polite_burmese_for_tts():
    source = (
        "မရပါ။ PIN ကို ဘဏ်ဝန်ထမ်းအပါအဝင် မည်သူ့ကိုမျှ မပြောပြပါနှင့်။ "
        "ATM ကတ်အသစ်ပြန်လည်လျှောက်ထားရန် နီးစပ်ရာဘဏ်ခွဲသို့ "
        "သွားရောက်ပြီး identity verification ပြုလုပ်ပေးပါ။"
    )

    assert normalize_for_tts(source) == (
        "မရပါရှင့်။ ပီ အိုင် အန် နံပါတ်ကို ဘဏ်ဝန်ထမ်းတွေ အပါအဝင် "
        "ဘယ်သူ့ကိုမှ မပြောပြပါနဲ့နော်။ အေ တီ အမ် "
        "ကတ်အသစ် ပြန်လည်လျှောက်ထားဖို့ နီးစပ်ရာ ဘဏ်ခွဲကို သွားပြီး "
        "ကိုယ်ရေးအချက်အလက် အတည်ပြုစစ်ဆေးမှု "
        "လုပ်ဆောင်ပေးပါရှင့်။"
    )


def test_generated_lost_card_answer_becomes_natural_spoken_burmese():
    source = (
        "ATM ကတ်ပျောက်ဆုံးပါက သက်ဆိုင်ရာ ဘဏ်သို့ ချက်ချင်း ဖုန်းဆက်၍ "
        "ကတ်အား ပိတ်ဆို့ (Block) ရပါမည်။ ဘဏ်ခွဲသို့ လူကိုယ်တိုင် "
        "သွားရောက်ပါက မှတ်ပုံတင် မူရင်း ယူဆောင်လာရပါမည်။"
    )

    assert normalize_for_tts(source) == (
        "အေ တီ အမ် ကတ်ပျောက်သွားရင် အရင်ဆုံး သက်ဆိုင်ရာ ဘဏ်ကို "
        "ချက်ချင်း ဖုန်းဆက်ပြီး ကတ်ကို ယာယီပိတ်ထားပေးဖို့ "
        "တောင်းဆိုပေးပါရှင့်။ ဘဏ်ခွဲကို ကိုယ်တိုင်သွားမယ်ဆိုရင် "
        "မှတ်ပုံတင်မူရင်းကို မမေ့ဘဲ ယူဆောင်သွားပေးပါနော်။"
    )


def test_replacement_document_answer_becomes_complete_natural_tts():
    source = (
        "ဘဏ်ခွဲတွင် ကတ်အသစ်ထုတ်ယူရန် နိုင်ငံသားဖြစ်ပါက NRC မူရင်းကို "
        "ယူဆောင်လာပြီး မိတ္တူကို လက်မခံပါ။ နိုင်ငံခြားသားဖြစ်ပါက "
        "Passport မူရင်းနှင့် Stay Permit ကို ယူဆောင်လာပါ။ "
        "ကိုယ်စားလှယ်ဖြင့် ထုတ်ယူပါက တရားဝင် Power of Attorney နှင့် "
        "ကိုယ်စားလှယ်၏ NRC မူရင်းကို ယူဆောင်လာပါ။"
    )

    assert normalize_for_tts(source) == (
        "ဘဏ်ခွဲမှာ ကတ်အသစ်ထုတ်ယူဖို့ နိုင်ငံသားဖြစ်ရင် "
        "နိုင်ငံသားစိစစ်ရေးကတ်ပြား မူရင်းကို ယူဆောင်လာပြီး "
        "မိတ္တူတော့ လက်မခံပါဘူးနော်။ နိုင်ငံခြားသားဖြစ်ရင် "
        "နိုင်ငံကူးလက်မှတ် မူရင်းနဲ့ နေထိုင်ခွင့်လက်မှတ်ကို "
        "ယူဆောင်လာပေးပါရှင့်။ ကိုယ်စားလှယ်နဲ့ ထုတ်ယူရင် တရားဝင် "
        "ကိုယ်စားလှယ်လွှဲစာနဲ့ ကိုယ်စားလှယ်ရဲ့ "
        "နိုင်ငံသားစိစစ်ရေးကတ်ပြား မူရင်းကို ယူဆောင်လာပေးပါရှင့်။"
    )


def test_replacement_policy_aliases_are_deduplicated_and_fragments_completed():
    source = (
        "ဘဏ်ခွဲတွင် ကတ်အသစ် ထုတ်ယူရာတွင် လုံခြုံရေး စိစစ်ရန်အတွက် "
        "အောက်ပါ စာရွက်စာတမ်းများ မူရင်း ယူဆောင်လာရပါမည်၊ "
        "နိုင်ငံသား စိစစ်ရေး ကတ်ပြား (NRC) မူရင်း "
        "(မိတ္တူ လက်မခံပါ)။ နိုင်ငံခြားသား ဖြစ်ပါက Passport မူရင်း "
        "နှင့် Stay Permit။ ကိုယ်စားလှယ်ဖြင့် ထုတ်ယူပါက တရားဝင် "
        "ကိုယ်စားလှယ်လွှဲစာ (Power of Attorney) နှင့် "
        "ကိုယ်စားလှယ်၏ NRC မူရင်း။"
    )

    result = normalize_for_tts(source)

    assert result.startswith(
        "ဘဏ်ခွဲမှာ ကတ်အသစ်ထုတ်ယူဖို့ လုံခြုံရေးစစ်ဆေးရာမှာ "
        "လိုအပ်တဲ့ စာရွက်စာတမ်းမူရင်းတွေ ယူသွားပေးပါရှင့်။"
    )
    assert (
        "နိုင်ငံသားဖြစ်ရင် နိုင်ငံသားစိစစ်ရေးကတ်ပြားမူရင်း "
        "ယူသွားရပါတယ်။ မိတ္တူတော့ လက်မခံပါဘူးနော်။"
    ) in result
    assert (
        "နိုင်ငံခြားသားဖြစ်ရင် နိုင်ငံကူးလက်မှတ် မူရင်းနဲ့ "
        "နေထိုင်ခွင့်လက်မှတ်ကို ယူသွားရပါတယ်။"
    ) in result
    assert (
        "ကိုယ်စားလှယ်နဲ့ ထုတ်ယူရင် တရားဝင် ကိုယ်စားလှယ်လွှဲစာနဲ့ "
        "ကိုယ်စားလှယ်ရဲ့ နိုင်ငံသားစိစစ်ရေးကတ်ပြား မူရင်းကို "
        "ယူသွားရပါတယ်။"
    ) in result
    assert result.count("နိုင်ငံသားစိစစ်ရေးကတ်ပြား") == 2
    assert result.count("ကိုယ်စားလှယ်လွှဲစာ") == 1
    assert "(" not in result
    assert ")" not in result


def test_atm_limit_answer_uses_natural_burmese_without_overusing_particles():
    source = (
        "တစ်နေ့လျှင် ငွေထုတ်ယူနိုင်မှုအတွက် ပမာဏကန့်သတ်ချက်များကို "
        "ဘဏ်၏ ATM စက်အမျိုးအစားပေါ် မူတည်ပါသည်။ Classic Debit Card "
        "အတွက် တစ်နေ့လျှင် အများဆုံး ၁၀ သိန်းအထိ ထုတ်ယူနိုင်ပါသည်။ "
        "Gold / Platinum Card အတွက် တစ်နေ့လျှင် အများဆုံး ၃၀ သိန်းအထိ "
        "ထုတ်ယူနိုင်ပါသည်။ တစ်ကြိမ်လျှင် အများဆုံး ၃ သိန်းအထိ "
        "ထုတ်ယူနိုင်ပါသည်။"
    )

    result = normalize_for_tts(source)

    assert "တစ်ရက်ကို" in result
    assert "ဘဏ်ရဲ့ အေ တီ အမ်" in result
    assert "မူတည်ပါတယ်" in result
    assert result.endswith("ထုတ်ယူနိုင်ပါတယ်ရှင့်။")
    assert "ပါသည်" not in result


def test_mobile_banking_tts_is_natural_and_preserves_ui_meaning():
    source = (
        "Mobile Banking အကောင့်စဖွင့်ဖို့ Mobile Banking App ကို App Store "
        "ဒါမှမဟုတ် Google Play Store ကနေ ဒေါင်းလုဒ်လုပ်ပေးပါ။ "
        "\"Register New Account\" ကိုနှိပ်ပြီး ဘဏ်အကောင့်နံပါတ်နဲ့ "
        "ဘဏ်မှာစာရင်းသွင်းထားတဲ့ ဖုန်းနံပါတ်ကို ရိုက်ထည့်ပေးပါ။ "
        "ဖုန်းကိုရောက်လာတဲ့ OTP ဂဏန်း ၆ လုံးကို ရိုက်ထည့်ပြီး အတည်ပြုပေးပါ။ "
        "အက်ပ်ကနေလျှောက်လို့ အဆင်မပြေရင် NRC မူရင်းယူပြီး "
        "နီးစပ်ရာဘဏ်ခွဲမှာ သွားလျှောက်နိုင်ပါတယ်။"
    )

    result = normalize_for_tts(source)

    assert "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု အက်ပ်" in result
    assert "အက်ပ်စတိုး" in result
    assert "ဂူးဂဲလ် ပလေးစတိုး" in result
    assert "အကောင့်အသစ် စာရင်းသွင်းရန်" in result
    assert '"' not in result
    assert "Register New ဘဏ်အကောင့်" not in result
    assert "အို တီ ပီ" in result
    assert "နိုင်ငံသားစိစစ်ရေးကတ်ပြား" in result
    assert "ရှင့်" in result
    assert result.endswith("ရပါတယ်နော်။")


def test_generic_tts_instruction_gets_a_polite_human_ending():
    result = normalize_for_tts("Customer Service ကို ဆက်သွယ်ပါ။")

    assert result.endswith("ဆက်သွယ်ပါရှင့်။")


def test_retained_card_policy_becomes_spoken_burmese_without_corrupting_within():
    source = (
        "ATM စက်ထဲ ကတ်ညပ်ကျန်ခဲ့ရင် စက်နံပါတ် (Terminal ID) နှင့် "
        "တည်နေရာကို မှတ်သားပါ။ ဘဏ် Call Center ဖုန်းနံပါတ် "
        "09-123456789 သို့ ချက်ချင်း သတင်းပို့၍ ကတ်အား ယာယီ "
        "ထိန်းသိမ်းခိုင်းပါ။ အဆိုပါ ATM စက်တည်ရှိရာ ဘဏ်ခွဲသို့ "
        "မှတ်ပုံတင် မူရင်းယူဆောင်၍ ကတ်ပြန်လည်ထုတ်ယူနိုင်ပါသည်၊ "
        "၄၈ နာရီအတွင်း မသွားရောက်ပါက ဖျက်ဆီးပစ်မည် ဖြစ်ပါသည်။"
    )

    result = normalize_for_tts(source)

    assert "အေ တီ အမ် စက်ထဲမှာ" in result
    assert "စက်နံပါတ်နဲ့ တည်နေရာကို မှတ်ထားပေးပါရှင့်" in result
    assert "ဖောက်သည်ဝန်ဆောင်မှုဌာန" in result
    assert "ချက်ချင်း ဖုန်းဆက်ပြီး" in result
    assert "အဲဒီ အေ တီ အမ် စက်ရှိတဲ့ ဘဏ်ခွဲကို" in result
    assert "လေးဆယ့်ရှစ် နာရီအတွင်း" in result
    assert "Terminal ID" not in result
    assert "အမှား" not in result


def test_long_atm_loss_policy_becomes_concise_natural_voice_response():
    source = (
        "ATM ကတ် ပျောက်ဆုံးသွားပါက သို့မဟုတ် ခိုးယူခံရပါက "
        "ဘဏ်အကောင့်ထဲမှ ငွေကြေးဆုံးရှုံးမှု မရှိစေရန်အတွက် အောက်ပါ "
        "လုပ်ငန်းစဉ်အတိုင်း ချက်ချင်း ဆောင်ရွက်ရပါမည်၊ "
        "ဘဏ် Hotline သို့ ချက်ချင်း ဖုန်းဆက်ပါ: ဘဏ်၏ Customer Service "
        "Hotline ဖုန်းနံပါတ် 09-123456789 သို့ 24/7 ချက်ချင်း ဖုန်းဆက်၍ "
        "ကတ်အား ပိတ်ဆို့ (Block) ခိုင်းပါ။ Mobile Banking App မှ ပိတ်ပါ: "
        "မိမိ၏ Mobile Banking Application ထဲရှိ \"Card Management\" menu "
        "သို့သွား၍ \"Freeze Card\" သို့မဟုတ် \"Block Card\" ကို "
        "မိမိကိုယ်တိုင် ချက်ချင်း နှိပ်၍ ပိတ်နိုင်ပါသည်။ "
        "ဘဏ်ခွဲသို့ သွားရောက်ပါ: ကတ်အသစ် ပြန်လည်လျှောက်ထားရန်အတွက် "
        "နီးစပ်ရာ ဘဏ်ခွဲသို့ မှတ်ပုံတင် (NRC) မူရင်း ယူဆောင်လာပြီး "
        "လူကိုယ်တိုင် လာရောက် လျှောက်ထားရပါမည်။"
    )

    result = normalize_for_tts(source)

    assert result.startswith(
        "အေ တီ အမ် ကတ် ပျောက်သွားတာ ဒါမှမဟုတ် "
        "ခိုးယူခံရတာဆိုရင် ဘဏ်ရဲ့ ဖောက်သည်ဝန်ဆောင်မှုဖုန်းနံပါတ်"
    )
    assert "သုည ကိုး၊ တစ် နှစ် သုံး၊ လေး ငါး ခြောက်၊ ခုနစ် ရှစ် ကိုးကို" in result
    assert "အခုချက်ချင်း ဖုန်းဆက်ပြီး ကတ်ကို ပိတ်ထားပေးဖို့ ပြောပေးပါရှင့်" in result
    assert "ဒီဖုန်းကို နေ့ရောညပါ အချိန်မရွေး ဆက်သွယ်နိုင်ပါတယ်" in result
    assert (
        "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှုအက်ပ်ထဲက "
        "ကတ်စီမံခန့်ခွဲမှုနေရာမှာ ကတ်ကို ကိုယ်တိုင် "
        "ယာယီပိတ်ထားလို့လည်း ရပါတယ်"
    ) in result
    assert (
        "ကတ်အသစ်ပြန်လျှောက်ဖို့ဆိုရင် နီးစပ်ရာ ဘဏ်ခွဲကို "
        "မှတ်ပုံတင်မူရင်းယူပြီး လူကိုယ်တိုင်သွားလျှောက်ပေးပါနော်"
    ) in result
    for unwanted in ("menu", "Block", "NRC", "(", ")", ":", '"'):
        assert unwanted not in result
