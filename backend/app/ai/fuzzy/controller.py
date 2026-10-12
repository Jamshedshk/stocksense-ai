from typing import Dict, Any, List, Tuple
from app.schemas.ai import FuzzyRiskItem, TriggeredRuleItem

def trapezoid(x: float, a: float, b: float, c: float, d: float) -> float:
    """Computes trapezoidal fuzzy membership function value mu(x) in [0, 1]."""
    if x <= a or x >= d:
        return 0.0
    if a < x < b:
        return (x - a) / (b - a) if b > a else 1.0
    if b <= x <= c:
        return 1.0
    if c < x < d:
        return (d - x) / (d - c) if d > c else 1.0
    return 0.0

def triangle(x: float, a: float, b: float, c: float) -> float:
    """Computes triangular fuzzy membership function value."""
    return trapezoid(x, a, b, b, c)

class FuzzyStockoutRiskController:
    # Output consequence representative singleton centers (or centroids)
    RISK_CENTERS = {
        "MINIMAL": 10.0,
        "MODERATE": 40.0,
        "HIGH": 75.0,
        "CRITICAL": 95.0,
    }

    @classmethod
    def fuzzify_stock_cover(cls, days: float) -> Dict[str, float]:
        return {
            "CRITICAL": trapezoid(days, -1.0, 0.0, 3.0, 7.0),
            "LOW": trapezoid(days, 4.0, 7.0, 10.0, 14.0),
            "ADEQUATE": trapezoid(days, 10.0, 15.0, 30.0, 45.0),
            "HIGH": trapezoid(days, 35.0, 50.0, 999.0, 9999.0),
        }

    @classmethod
    def fuzzify_lead_time(cls, days: float) -> Dict[str, float]:
        return {
            "SHORT": trapezoid(days, -1.0, 0.0, 3.0, 5.0),
            "MEDIUM": trapezoid(days, 3.0, 7.0, 10.0, 14.0),
            "LONG": trapezoid(days, 10.0, 15.0, 365.0, 365.0),
        }

    @classmethod
    def fuzzify_demand(cls, rate: float) -> Dict[str, float]:
        return {
            "LOW": trapezoid(rate, -1.0, 0.0, 2.0, 5.0),
            "MEDIUM": trapezoid(rate, 3.0, 6.0, 12.0, 18.0),
            "HIGH": trapezoid(rate, 12.0, 20.0, 999.0, 9999.0),
        }

    @classmethod
    def evaluate(
        cls,
        stock_cover_days: float,
        lead_time_days: int,
        daily_demand: float,
    ) -> Tuple[float, str, Dict[str, Any], List[TriggeredRuleItem]]:
        mu_cover = cls.fuzzify_stock_cover(stock_cover_days)
        mu_lead = cls.fuzzify_lead_time(float(lead_time_days))
        mu_demand = cls.fuzzify_demand(daily_demand)

        # Rule base evaluation (Mamdani Min operator)
        rules = [
            (
                1,
                "IF Stock Cover is Critical THEN Risk is Critical",
                mu_cover["CRITICAL"],
                "CRITICAL",
            ),
            (
                2,
                "IF Stock Cover is Low AND Lead Time is Long THEN Risk is Critical",
                min(mu_cover["LOW"], mu_lead["LONG"]),
                "CRITICAL",
            ),
            (
                3,
                "IF Stock Cover is Low AND Lead Time is Medium THEN Risk is High",
                min(mu_cover["LOW"], mu_lead["MEDIUM"]),
                "HIGH",
            ),
            (
                4,
                "IF Stock Cover is Low AND Demand is High THEN Risk is High",
                min(mu_cover["LOW"], mu_demand["HIGH"]),
                "HIGH",
            ),
            (
                5,
                "IF Stock Cover is Low AND Lead Time is Short THEN Risk is Moderate",
                min(mu_cover["LOW"], mu_lead["SHORT"]),
                "MODERATE",
            ),
            (
                6,
                "IF Stock Cover is Adequate AND Lead Time is Long AND Demand is High THEN Risk is Moderate",
                min(mu_cover["ADEQUATE"], mu_lead["LONG"], mu_demand["HIGH"]),
                "MODERATE",
            ),
            (
                7,
                "IF Stock Cover is Adequate AND Lead Time is Short THEN Risk is Minimal",
                min(mu_cover["ADEQUATE"], mu_lead["SHORT"]),
                "MINIMAL",
            ),
            (
                8,
                "IF Stock Cover is High THEN Risk is Minimal",
                mu_cover["HIGH"],
                "MINIMAL",
            ),
        ]

        # Collect fired rules & aggregate weights
        consequent_weights: Dict[str, float] = {k: 0.0 for k in cls.RISK_CENTERS}
        triggered_rules: List[TriggeredRuleItem] = []

        for r_num, text, weight, consequent in rules:
            if weight > 0.001:
                triggered_rules.append(
                    TriggeredRuleItem(
                        rule_number=r_num,
                        rule_text=text,
                        weight=round(weight, 3),
                        consequent=consequent,
                    )
                )
                consequent_weights[consequent] = max(consequent_weights[consequent], weight)

        # Defuzzification: Center-of-Gravity / Weighted Singleton average
        numerator = sum(cls.RISK_CENTERS[c] * w for c, w in consequent_weights.items())
        denominator = sum(consequent_weights.values())

        if denominator > 0:
            risk_score = round(numerator / denominator, 1)
        else:
            # Fallback deterministic boundary logic if inputs fall in extreme boundary gaps
            if stock_cover_days <= 3:
                risk_score = 90.0
            elif stock_cover_days <= 10:
                risk_score = 65.0
            elif stock_cover_days <= 30:
                risk_score = 30.0
            else:
                risk_score = 10.0

        # Assign Risk Category Label
        if risk_score >= 80.0:
            label = "CRITICAL"
        elif risk_score >= 60.0:
            label = "HIGH"
        elif risk_score >= 35.0:
            label = "MEDIUM"
        else:
            label = "LOW"

        membership_info = {
            "stock_cover": {k: round(v, 3) for k, v in mu_cover.items()},
            "lead_time": {k: round(v, 3) for k, v in mu_lead.items()},
            "demand": {k: round(v, 3) for k, v in mu_demand.items()},
        }

        return risk_score, label, membership_info, triggered_rules
