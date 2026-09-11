from app.prompts.prompt_builder import (
    build_answer_messages,
    extract_listed_facts,
    select_fact_chunks,
)


def test_prompt_contains_context_and_question():
    chunks = [
        {
            "text": "ATM policy text",
            "document": "policy.pdf",
            "page": 5,
            "section": "Lost Card",
            "score": 0.9,
        }
    ]
    messages = build_answer_messages(
        user_question="ATM card ပျောက်ရင်?",
        retrieved_chunks=chunks,
        conversation_history=[],
    )
    final_message = messages[-1]["content"]
    assert "ATM policy text" in final_message
    assert "ATM card ပျောက်ရင်?" in final_message
    assert "policy.pdf" in final_message


def test_prompt_includes_person1_metadata_but_no_prewritten_answer_instruction():
    messages = build_answer_messages(
        user_question="ဘာလုပ်ရမလဲ။",
        retrieved_chunks=[
            {
                "text": "Retrieved policy text",
                "document": "policy.pdf",
                "page": "3",
                "section": "Card Loss Procedure",
                "score": 0.885,
                "metadata": {
                    "department": "Retail Banking",
                    "last_updated": "2026-01-15",
                },
            }
        ],
    )

    final_message = messages[-1]["content"]
    assert "Retrieved policy text" in final_message
    assert "Card Loss Procedure" in final_message
    assert "Retail Banking" in final_message
    assert "2026-01-15" in final_message
    assert "APPROVED CUSTOMER-FACING ANSWER" not in final_message
    assert "Do not copy headings, list numbers or bullet points" in messages[0]["content"]
    assert "standard-Burmese sentences" in messages[0]["content"]
    assert "TTS normalization happens" in messages[0]["content"]
    assert "Never output Chinese, Japanese, Korean" in messages[0]["content"]
    assert "not JSON" in messages[0]["content"]


def test_nested_numbered_and_bullet_facts_become_a_required_checklist():
    chunks = [
        {
            "text": (
                "1. Self-Registration:\n"
                "   * App ကို App Store မှ ဒေါင်းလုဒ်လုပ်ပါ။\n"
                "   * OTP ဂဏန်း (၆) လုံးကို အတည်ပြုပါ။\n"
                "2. Branch Registration:\n"
                "- အဆင်မပြေပါက NRC မူရင်းယူပြီး ဘဏ်ခွဲသို့ သွားပါ။"
            )
        }
    ]

    facts = extract_listed_facts(chunks)
    messages = build_answer_messages(
        user_question="Mobile Banking ဘယ်လိုလျှောက်ရမလဲ။",
        retrieved_chunks=chunks,
    )
    final_message = messages[-1]["content"]

    assert len(facts) == 5
    assert "FACT 2: App ကို App Store မှ ဒေါင်းလုဒ်လုပ်ပါ။" in final_message
    assert "FACT 3: OTP ဂဏန်း (၆) လုံးကို အတည်ပြုပါ။" in final_message
    assert "FACT 5: အဆင်မပြေပါက NRC မူရင်းယူပြီး" in final_message


def test_fact_checklist_prefers_faq_question_matching_user_intent():
    safety = {
        "question": "Mobile Banking အသုံးပြုရာတွင် ဘာတွေသတိထားရမလဲ။",
        "text": "- OTP ကို မည်သူ့ကိုမျှ မပြောပါနှင့်။",
    }
    registration = {
        "question": "Mobile Banking အကောင့်အား မည်သို့ စတင်လျှောက်ထားရမည်နည်း။",
        "text": "- Register New Account ကိုနှိပ်ပြီး အကောင့်ဖွင့်ပါ။",
    }

    selected = select_fact_chunks(
        "Mobile Banking အကောင့် ဘယ်လိုလျှောက်လို့ရလဲ။",
        [safety, registration],
    )

    assert selected == [registration]
