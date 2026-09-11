from app.conversation.session_manager import SessionManager


def test_session_history_round_trip():
    manager = SessionManager(db_path=":memory:")
    session_id = manager.create_session()
    manager.add_message(session_id, "user", "hello")
    manager.add_message(session_id, "assistant", "hi")
    assert manager.get_history(session_id) == [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi"},
    ]


def test_session_history_keeps_only_the_configured_number_of_messages():
    manager = SessionManager(max_messages=3, db_path=":memory:")
    session_id = manager.create_session()

    for index in range(5):
        manager.add_message(session_id, "user", f"message-{index}")

    assert manager.get_history(session_id) == [
        {"role": "user", "content": "message-2"},
        {"role": "user", "content": "message-3"},
        {"role": "user", "content": "message-4"},
    ]


def test_unknown_session_is_created_when_a_message_is_added():
    manager = SessionManager(max_messages=2, db_path=":memory:")

    assert manager.has_session("known-by-client") is False
    manager.add_message("known-by-client", "user", "hello")

    assert manager.has_session("known-by-client") is True


def test_session_keeps_three_complete_question_answer_pairs():
    manager = SessionManager(max_messages=6, db_path=":memory:")
    session_id = manager.create_session()

    for index in range(4):
        manager.add_message(session_id, "user", f"question-{index}")
        manager.add_message(session_id, "assistant", f"answer-{index}")

    assert manager.get_history(session_id) == [
        {"role": "user", "content": "question-1"},
        {"role": "assistant", "content": "answer-1"},
        {"role": "user", "content": "question-2"},
        {"role": "assistant", "content": "answer-2"},
        {"role": "user", "content": "question-3"},
        {"role": "assistant", "content": "answer-3"},
    ]


def test_history_and_topic_survive_manager_restart(tmp_path):
    db_path = tmp_path / "sessions.sqlite3"
    first_manager = SessionManager(max_messages=6, db_path=db_path)
    session_id = first_manager.create_session()
    first_manager.set_topic(session_id, "ATM ကတ်")
    first_manager.set_intent_query(
        session_id, "ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )
    first_manager.add_message(session_id, "user", "ATM ကတ်ပျောက်သွားတယ်။")
    first_manager.add_message(session_id, "assistant", "ကတ်ကို ပိတ်ထားပေးပါ။")
    first_manager.close()

    restarted_manager = SessionManager(max_messages=6, db_path=db_path)

    assert restarted_manager.has_session(session_id) is True
    assert restarted_manager.get_topic(session_id) == "ATM ကတ်"
    assert restarted_manager.get_intent_query(session_id) == (
        "ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )
    assert restarted_manager.get_history(session_id) == [
        {"role": "user", "content": "ATM ကတ်ပျောက်သွားတယ်။"},
        {"role": "assistant", "content": "ကတ်ကို ပိတ်ထားပေးပါ။"},
    ]
    restarted_manager.close()
