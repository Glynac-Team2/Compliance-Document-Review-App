"""
app/ai/rules_seed.py

A small static corpus of plausible compliance rules for financial-advisor
client-facing material. This exists so flags have something real to cite
NOW, before Data Engineering's vector-store rule retrieval exists.

Explicitly NOT the "vector store / rule retrieval" work called out of
scope for the AI track — this is just a fixed list, always included in
full in every prompt (it's short enough not to need filtering). When
retrieval.py's retrieve_relevant_rules() is wired up to a real vector
store, swap get_active_rules() below to call that instead — everything
downstream (prompt builder, flag->rule mapping) already consumes the
same RetrievedRule shape either way, so it's a one-line change.
"""

from __future__ import annotations

from typing import List
from sqlalchemy.orm import Session

from app.ai.retrieval import RetrievedRule


SEED_RULES: List[RetrievedRule] = [
    RetrievedRule("R-PERF-01", "Must not state or imply that an investment strategy guarantees a specific return or outcome.", 0.0),
    RetrievedRule("R-PERF-02", "Any mention of past performance must include a statement that past performance does not guarantee future results.", 0.0),
    RetrievedRule("R-RISK-01", "Material discussing potential gains must give balanced treatment to material risks of loss, not present upside only.", 0.0),
    RetrievedRule("R-RISK-02", "Must not describe an investment as 'risk-free', 'safe', or 'guaranteed' unless referring to an instrument with an explicit government or insurer guarantee (and even then, the guarantee's scope must be stated).", 0.0),
    RetrievedRule("R-TESTIMONIAL-01", "Client testimonials used in marketing must disclose whether the client was compensated and must not imply typical results.", 0.0),
    RetrievedRule("R-FEE-01", "Any mention of fees or costs must not omit or understate charges that a reasonable client would consider material.", 0.0),
    RetrievedRule("R-TAX-01", "Must not give specific tax or legal advice without a disclaimer recommending the client consult their own tax/legal advisor.", 0.0),
    RetrievedRule("R-CHERRY-01", "Must not selectively present only favorable performance periods, funds, or outcomes while omitting comparably relevant unfavorable ones (cherry-picking).", 0.0),
    RetrievedRule("R-CREDENTIAL-01", "Professional designations or credentials mentioned must be accurate and not imply a level of expertise or certification the advisor does not hold.", 0.0),
    RetrievedRule("R-COMPARISON-01", "Comparisons to a benchmark, index, or competitor product must be presented fairly, with matching time periods and methodology disclosed.", 0.0),
    RetrievedRule("R-URGENCY-01", "Must not use high-pressure language suggesting a limited-time offer or urgency to invest that isn't factually accurate.", 0.0),
    RetrievedRule("R-DIVERSIFICATION-01", "Must not imply that diversification or any strategy eliminates the risk of loss.", 0.0),
    RetrievedRule("R-FORWARD-01", "Forward-looking statements (projections, forecasts, targets) must be clearly labeled as projections, not facts, and note they are not guaranteed.", 0.0),
    RetrievedRule("R-COMPLAINT-01", "Must not contain language discouraging a client from filing a complaint or exercising regulatory rights.", 0.0),
    RetrievedRule("R-INSURANCE-01", "Must not imply FDIC or SIPC insurance coverage for products that are not actually covered (e.g. most securities, annuities).", 0.0),
    RetrievedRule("R-SUITABILITY-01", "Must not recommend a specific product or strategy as suitable for 'everyone' or 'any investor' without qualification.", 0.0),
]


def get_active_rules(masked_text: str, db: Session) -> List[RetrievedRule]:
    """Current rule set used by get_assist(). Returns the full static
    seed corpus for now — see module docstring for the handoff plan to
    real retrieval. `masked_text` and `db` are accepted (unused) so the
    call site doesn't change when this swaps to real retrieval."""
    return SEED_RULES
