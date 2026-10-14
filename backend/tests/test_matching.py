from types import SimpleNamespace
from datetime import date

from app.matching import score_pair, text_similarity


def test_text_similarity_rewards_shared_terms():
    assert text_similarity("blue canvas backpack", "canvas backpack blue") > text_similarity("blue canvas backpack", "silver water bottle")


def test_match_score_explains_category_color_and_location():
    lost = SimpleNamespace(title="Blue backpack", description="Canvas bag with a star patch", category="Bags", color="Blue", location="North Library", event_date=date(2026, 10, 12))
    found = SimpleNamespace(title="Blue canvas backpack", description="Bag with a star patch", category="Bags", color="Blue", location="North Library entrance", event_date=date(2026, 10, 13))
    text_score, final_score, explanation = score_pair(lost, found)
    assert 0 <= text_score <= 1 and 0 <= final_score <= 100
    assert "Same category" in explanation and "Same color" in explanation
