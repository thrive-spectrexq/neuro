import pytest
from app.services.agent.intent_parser import intent_parser


def test_wake_word_detection():
    intents = [
        "Hey Neuro",
        "Neuro wake up",
        "wake up neuro",
        "wake up",
        "JARVIS",
        "ok neuro",
    ]
    for text in intents:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "system_action"
        assert res.parameters.get("action") == "wake_ack"


def test_open_app_parsing():
    cases = [
        ("open brave", "brave"),
        ("open the brave browser", "brave"),
        ("launch brave browser", "brave"),
        ("open vscode", "vscode"),
        ("launch visual studio code", "vscode"),
        ("open terminal", "terminal"),
        ("open powershell", "powershell"),
        ("open notepad", "notepad"),
        ("open file explorer", "file explorer"),
        ("open calculator", "calculator"),
        ("open cursor", "cursor"),
    ]
    for text, expected_app in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "open_app"
        assert expected_app in res.parameters.get("app_name", "").lower()


def test_spotify_parsing():
    cases = [
        ("play bohemian rhapsody on spotify", "bohemian rhapsody"),
        ("play drake on spotify", "drake"),
        ("play the weeknd in spotify", "the weeknd"),
        ("spotify play lofi beats", "lofi beats"),
        ("play starboy spotify", "starboy"),
    ]
    for text, expected_query in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "play_spotify"
        assert res.parameters.get("query") == expected_query


def test_web_search_parsing():
    cases = [
        ("search quantum physics on google", "quantum physics", "google"),
        ("google latest tech news", "latest tech news", "google"),
        ("search youtube for ambient jazz", "ambient jazz", "youtube"),
        ("youtube search lo-fi music", "lo-fi music", "youtube"),
        ("search github for fast-api", "fast-api", "github"),
    ]
    for text, expected_query, expected_engine in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "web_search"
        assert expected_query in res.parameters.get("query", "")
        assert res.parameters.get("engine") == expected_engine


def test_note_capture_parsing():
    cases = [
        ("add this to note: buy organic milk and eggs", "buy organic milk and eggs"),
        ("take a note remember to email team", "remember to email team"),
        ("create note meeting summary with client", "meeting summary with client"),
        ("note down finish the q3 presentation", "finish the q3 presentation"),
    ]
    for text, expected_snippet in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "create_quick_note"
        assert expected_snippet in res.parameters.get("content", "")


def test_reminder_parsing():
    res1 = intent_parser.parse("set a reminder in 15 minutes to drink water")
    assert res1.is_matched is True
    assert res1.tool_name == "set_reminder"
    assert res1.parameters.get("minutes") == 15
    assert "drink water" in res1.parameters.get("title", "")

    res2 = intent_parser.parse("remind me in 5 mins to call client")
    assert res2.is_matched is True
    assert res2.tool_name == "set_reminder"
    assert res2.parameters.get("minutes") == 5
    assert "call client" in res2.parameters.get("title", "")


def test_system_status_parsing():
    res1 = intent_parser.parse("what time is it")
    assert res1.is_matched is True
    assert res1.tool_name == "system_action"
    assert res1.parameters.get("action") == "time"

    res2 = intent_parser.parse("system status")
    assert res2.is_matched is True
    assert res2.tool_name == "system_action"
    assert res2.parameters.get("action") == "status"
