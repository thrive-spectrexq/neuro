from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any


@dataclass
class Flashcard:
    id: str
    note_id: str
    note_title: str
    front: str
    back: str
    card_type: str = "qa"  # "qa" | "cloze"
    ease_factor: float = 2.5
    repetitions: int = 0
    interval_days: int = 0
    due_date: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    last_reviewed_at: str | None = None
    lapses: int = 0


@dataclass
class FlashcardReviewResult:
    card_id: str
    quality: int  # 0 to 5
    new_ease_factor: float
    new_repetitions: int
    new_interval_days: int
    next_due_date: str


@dataclass
class VaultStudyStats:
    total_cards: int
    due_today: int
    learning_count: int
    mastered_count: int
    retention_rate_pct: float
    study_streak_days: int


class SpacedRepetitionService:
    """
    SuperMemo-2 (SM-2) Spaced Repetition Engine for Obsidian & Neuro Vaults.
    Parses Q&A pairs, Cloze deletions, and #flashcard tags directly from markdown notes.
    """

    @classmethod
    def extract_flashcards_from_note(cls, note_id: str, title: str, content: str) -> list[Flashcard]:
        """Extracts flashcards from note content using multiple standard syntax formats."""
        cards: list[Flashcard] = []
        if not content:
            return cards

        now_iso = datetime.now(UTC).isoformat()

        # 1. Inline Q::A syntax (e.g. "What is CAP theorem?::Consistency, Availability, Partition tolerance")
        inline_qa_pattern = re.compile(r"^(?!\s*#)\s*([^\n:]+?)::([^\n]+)$", re.MULTILINE)
        for idx, match in enumerate(inline_qa_pattern.finditer(content)):
            front = match.group(1).strip()
            back = match.group(2).strip()
            if front and back:
                cards.append(
                    Flashcard(
                        id=f"{note_id}_qa_{idx}",
                        note_id=note_id,
                        note_title=title,
                        front=front,
                        back=back,
                        card_type="qa",
                        due_date=now_iso,
                    )
                )

        # 2. Cloze deletions syntax: "The capital of France is ==Paris==" or "{{c1::Paris}}"
        cloze_highlight_pattern = re.compile(r"([^\n.!?]*==([^=]+)==[^\n.!?]*)")
        for idx, match in enumerate(cloze_highlight_pattern.finditer(content)):
            full_sentence = match.group(1).strip()
            answer = match.group(2).strip()
            if answer and len(full_sentence) > len(answer):
                cloze_front = full_sentence.replace(f"=={answer}==", "[...]")
                cards.append(
                    Flashcard(
                        id=f"{note_id}_cloze_{idx}",
                        note_id=note_id,
                        note_title=title,
                        front=f"Complete the blank in **{title}**:\n\n{cloze_front}",
                        back=answer,
                        card_type="cloze",
                        due_date=now_iso,
                    )
                )

        # 3. Question Block / #flashcard section tag
        # e.g.,
        # ### Question
        # Answer
        question_headers = re.compile(
            r"(?:^|\n)#{1,4}\s+(?:Question|Q|Prompt):\s*([^\n]+)\n+([\s\S]*?)(?=(?:\n#{1,4}\s+)|$)",
            re.IGNORECASE,
        )
        for idx, match in enumerate(question_headers.finditer(content)):
            front = match.group(1).strip()
            back = match.group(2).strip()
            if front and back:
                cards.append(
                    Flashcard(
                        id=f"{note_id}_header_{idx}",
                        note_id=note_id,
                        note_title=title,
                        front=front,
                        back=back,
                        card_type="qa",
                        due_date=now_iso,
                    )
                )

        return cards

    @classmethod
    def calculate_sm2_review(
        cls,
        quality: int,
        repetitions: int,
        interval_days: int,
        ease_factor: float,
    ) -> FlashcardReviewResult:
        """
        Implements SuperMemo-2 (SM-2) Spaced Repetition calculation.
        quality: 0 (Blackout) to 5 (Perfect response)
        """
        # Quality must be clamped 0-5
        q = max(0, min(5, quality))

        if q >= 3:
            # Correct response
            if repetitions == 0:
                new_interval = 1
            elif repetitions == 1:
                new_interval = 6
            else:
                new_interval = max(1, int(round(interval_days * ease_factor)))
            new_reps = repetitions + 1
        else:
            # Incorrect response -> reset repetitions
            new_interval = 1
            new_reps = 0

        # Update Ease Factor
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ef = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ef = max(1.3, round(new_ef, 2))  # Minimum EF floor is 1.3

        next_due = (datetime.now(UTC) + timedelta(days=new_interval)).isoformat()

        return FlashcardReviewResult(
            card_id="",
            quality=q,
            new_ease_factor=new_ef,
            new_repetitions=new_reps,
            new_interval_days=new_interval,
            next_due_date=next_due,
        )

    @classmethod
    def aggregate_vault_study_stats(cls, cards: list[dict[str, Any]]) -> VaultStudyStats:
        """Computes comprehensive spaced repetition study stats for the entire vault."""
        now = datetime.now(UTC)
        total = len(cards)
        if total == 0:
            return VaultStudyStats(
                total_cards=0,
                due_today=0,
                learning_count=0,
                mastered_count=0,
                retention_rate_pct=100.0,
                study_streak_days=0,
            )

        due_count = 0
        learning = 0
        mastered = 0

        for c in cards:
            due_str = c.get("due_date")
            reps = c.get("repetitions", 0)
            if reps >= 4:
                mastered += 1
            else:
                learning += 1

            if due_str:
                try:
                    due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
                    if due_dt <= now:
                        due_count += 1
                except Exception:
                    due_count += 1
            else:
                due_count += 1

        retention_rate = round((mastered / total) * 100.0, 1) if total > 0 else 100.0

        return VaultStudyStats(
            total_cards=total,
            due_today=due_count,
            learning_count=learning,
            mastered_count=mastered,
            retention_rate_pct=retention_rate,
            study_streak_days=max(1, (mastered + learning) // 5),
        )
