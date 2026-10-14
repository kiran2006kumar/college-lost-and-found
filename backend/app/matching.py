import math
import re
from collections import Counter
from datetime import date

_STOP_WORDS = {"a", "an", "and", "at", "by", "for", "from", "in", "is", "it", "my", "of", "on", "or", "the", "to", "with"}


def tokenize(text: str) -> list[str]:
    return [token for token in re.findall(r"[a-z0-9]+", text.lower()) if token not in _STOP_WORDS]


def text_similarity(first: str, second: str) -> float:
    left, right = tokenize(first), tokenize(second)
    if not left or not right:
        return 0.0
    vocabulary = set(left) | set(right)
    document_frequency = Counter(token for document in (set(left), set(right)) for token in document)
    left_counts, right_counts = Counter(left), Counter(right)
    inverse_document_frequency = {token: math.log(3 / (1 + document_frequency[token])) + 1 for token in vocabulary}
    left_vector = {token: (1 + math.log(count)) * inverse_document_frequency[token] for token, count in left_counts.items()}
    right_vector = {token: (1 + math.log(count)) * inverse_document_frequency[token] for token, count in right_counts.items()}
    dot = sum(left_vector.get(token, 0) * right_vector.get(token, 0) for token in vocabulary)
    norm_left = math.sqrt(sum(value * value for value in left_vector.values()))
    norm_right = math.sqrt(sum(value * value for value in right_vector.values()))
    return min(1.0, max(0.0, dot / (norm_left * norm_right))) if norm_left and norm_right else 0.0


def score_pair(lost, found) -> tuple[float, float, list[str]]:
    text = text_similarity(f"{lost.title} {lost.description}", f"{found.title} {found.description}")
    category = float(lost.category.casefold() == found.category.casefold())
    color = float(bool(lost.color and found.color and lost.color.casefold() == found.color.casefold()))
    loc_a, loc_b = set(tokenize(lost.location)), set(tokenize(found.location))
    location = len(loc_a & loc_b) / len(loc_a | loc_b) if loc_a | loc_b else 0.0
    days = abs((lost.event_date - found.event_date).days)
    date_score = max(0.0, 1 - days / 30)
    final = min(100.0, round((text * 0.65 + category * 0.15 + color * 0.08 + location * 0.07 + date_score * 0.05) * 100, 1))
    reasons = []
    if text >= 0.2:
        reasons.append("Similar words in title and description")
    if category:
        reasons.append("Same category")
    if color:
        reasons.append("Same color")
    if location:
        reasons.append("Nearby location wording")
    if days <= 7:
        reasons.append("Dates are close")
    return text, final, reasons
