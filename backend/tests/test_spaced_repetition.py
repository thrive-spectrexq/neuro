from __future__ import annotations

from app.services.spaced_repetition_service import SpacedRepetitionService


def test_extract_flashcards_from_note():
    note_content = """# Distributed Systems

What is linearizability?::Linearizability implies that operations appear to occur instantaneously at a specific point in time between their start and finish.

What is Raft algorithm?::A consensus algorithm designed as an alternative to Paxos.

The Raft consensus algorithm relies on a ==replicated state machine== architecture.

### Question: What is event sourcing?
Event sourcing ensures all state modifications are stored as an immutable sequence of events.
"""
    cards = SpacedRepetitionService.extract_flashcards_from_note("note_101", "Distributed Systems", note_content)
    assert len(cards) == 4

    qa_cards = [c for c in cards if c.card_type == "qa"]
    cloze_cards = [c for c in cards if c.card_type == "cloze"]

    assert len(qa_cards) == 3
    assert len(cloze_cards) == 1
    assert "linearizability" in qa_cards[0].front.lower()
    assert "replicated state machine" in cloze_cards[0].back


def test_sm2_algorithm_progression():
    # Initial review - perfect score (5)
    res1 = SpacedRepetitionService.calculate_sm2_review(
        quality=5,
        repetitions=0,
        interval_days=0,
        ease_factor=2.5,
    )
    assert res1.new_repetitions == 1
    assert res1.new_interval_days == 1
    assert res1.new_ease_factor >= 2.5

    # Second review - good score (4)
    res2 = SpacedRepetitionService.calculate_sm2_review(
        quality=4,
        repetitions=1,
        interval_days=1,
        ease_factor=res1.new_ease_factor,
    )
    assert res2.new_repetitions == 2
    assert res2.new_interval_days == 6

    # Failed review (quality 1) -> reset
    res3 = SpacedRepetitionService.calculate_sm2_review(
        quality=1,
        repetitions=2,
        interval_days=6,
        ease_factor=res2.new_ease_factor,
    )
    assert res3.new_repetitions == 0
    assert res3.new_interval_days == 1


def test_aggregate_vault_study_stats():
    sample_cards = [
        {"id": "1", "repetitions": 5, "due_date": "2026-01-01T00:00:00Z"},
        {"id": "2", "repetitions": 2, "due_date": "2026-01-01T00:00:00Z"},
        {"id": "3", "repetitions": 0, "due_date": "2099-01-01T00:00:00Z"},
    ]
    stats = SpacedRepetitionService.aggregate_vault_study_stats(sample_cards)
    assert stats.total_cards == 3
    assert stats.due_today == 2
    assert stats.mastered_count == 1
    assert stats.learning_count == 2
