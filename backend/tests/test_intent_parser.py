import pytest
from app.services.agent.intent_parser import intent_parser


def test_wake_word_detection():
    intents = [
        "Hey Neuro",
        "hey neuro",
        "Hey, Neuro!",
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
        ("launch visual studio code", "visual studio code"),
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

    res3 = intent_parser.parse("what's today's date")
    assert res3.is_matched is True
    assert res3.tool_name == "system_action"
    assert res3.parameters.get("action") == "date"


def test_volume_controls_parsing():
    cases = [
        ("volume up", "volume_up"),
        ("turn the volume up", "volume_up"),
        ("increase volume", "volume_up"),
        ("louder please", "volume_up"),
        ("volume down", "volume_down"),
        ("turn volume down", "volume_down"),
        ("decrease the volume", "volume_down"),
        ("quieter", "volume_down"),
        ("mute audio", "mute"),
        ("unmute volume", "unmute"),
    ]
    for text, expected_action in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "system_action"
        assert res.parameters.get("action") == expected_action


def test_pc_system_actions():
    cases = [
        ("lock pc", "lock_pc"),
        ("lock the screen", "lock_pc"),
        ("lock computer", "lock_pc"),
        ("put pc to sleep", "sleep_pc"),
        ("empty the recycle bin", "empty_recycle_bin"),
        ("take a screenshot", "take_screenshot"),
        ("take screen snip", "take_screenshot"),
    ]
    for text, expected_action in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "system_action"
        assert res.parameters.get("action") == expected_action


def test_open_system_folders():
    cases = [
        ("open downloads folder", "downloads"),
        ("open documents", "documents"),
        ("open desktop folder", "desktop"),
        ("open pictures folder", "pictures"),
        ("open music folder", "music"),
        ("open videos folder", "videos"),
    ]
    for text, expected_folder in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "system_action"
        assert res.parameters.get("action") == "open_folder"
        assert res.parameters.get("payload") == expected_folder


def test_math_calculation_parsing():
    cases = [
        ("calculate 25 * 4", "25 * 4", "100"),
        ("what is 100 + 55", "100 + 55", "155"),
        ("compute (12 + 8) * 5", "(12 + 8) * 5", "100"),
        ("what is 20% of 500", "0.2 * 500", "100"),
        ("calculate 2 ^ 8", "2 ** 8", "256"),
    ]
    for text, expected_expr, expected_result in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "quick_calculate"
        from app.services.agent.tools import safe_eval_expr
        parsed_expr = res.parameters.get("expression")
        val = safe_eval_expr(parsed_expr)
        assert f"{val:g}" == expected_result


def test_random_decisions():
    res1 = intent_parser.parse("flip a coin")
    assert res1.is_matched is True
    assert res1.tool_name == "random_decision"
    assert res1.parameters.get("type") == "coin_flip"

    res2 = intent_parser.parse("roll a dice")
    assert res2.is_matched is True
    assert res2.tool_name == "random_decision"
    assert res2.parameters.get("type") == "dice_roll"
    assert res2.parameters.get("sides") == 6


def test_extended_web_searches():
    cases = [
        ("search reddit for python async patterns", "python async patterns", "reddit"),
        ("wikipedia quantum computing", "quantum computing", "wikipedia"),
        ("show me directions to central park on maps", "central park", "maps"),
        ("where is statue of liberty on google maps", "statue of liberty", "maps"),
    ]
    for text, expected_query, expected_engine in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "web_search"
        assert expected_query in res.parameters.get("query", "")
        assert res.parameters.get("engine") == expected_engine


def test_extended_apps():
    cases = [
        ("open discord", "discord"),
        ("open slack", "slack"),
        ("open telegram", "telegram"),
        ("open whatsapp", "whatsapp"),
        ("open obsidian", "obsidian"),
        ("open notion", "notion"),
        ("open figma", "figma"),
        ("open steam", "steam"),
        ("open task manager", "taskmgr"),
        ("open paint", "paint"),
    ]
    for text, expected_app in cases:
        res = intent_parser.parse(text)
        assert res.is_matched is True
        assert res.tool_name == "open_app"
        assert expected_app in res.parameters.get("app_name", "").lower()
