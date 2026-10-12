from app.ai.fuzzy.controller import FuzzyStockoutRiskController, trapezoid

def test_trapezoid_membership_boundaries():
    # Outside left
    assert trapezoid(2.0, 5.0, 10.0, 15.0, 20.0) == 0.0
    # Left slope
    assert trapezoid(7.5, 5.0, 10.0, 15.0, 20.0) == 0.5
    # Flat top
    assert trapezoid(12.0, 5.0, 10.0, 15.0, 20.0) == 1.0
    # Right slope
    assert trapezoid(17.5, 5.0, 10.0, 15.0, 20.0) == 0.5
    # Outside right
    assert trapezoid(25.0, 5.0, 10.0, 15.0, 20.0) == 0.0

def test_critical_stockout_risk():
    # Very low cover (1 day), long lead time (14 days), high demand (25 units/day)
    score, label, mem, rules = FuzzyStockoutRiskController.evaluate(
        stock_cover_days=1.0,
        lead_time_days=14,
        daily_demand=25.0,
    )
    assert score >= 75.0
    assert label in ("HIGH", "CRITICAL")
    assert len(rules) > 0
    # Rule 1 or 2 should have fired
    rule_texts = [r.rule_text for r in rules]
    assert any("Stock Cover is Critical" in t or "Lead Time is Long" in t for t in rule_texts)

def test_minimal_stockout_risk():
    # Ample cover (60 days), short lead time (2 days), low demand (1 unit/day)
    score, label, mem, rules = FuzzyStockoutRiskController.evaluate(
        stock_cover_days=60.0,
        lead_time_days=2,
        daily_demand=1.0,
    )
    assert score <= 30.0
    assert label == "LOW"
    assert any("Stock Cover is High" in r.rule_text for r in rules)
