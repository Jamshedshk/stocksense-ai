from app.ai.prolog.runner import PrologEngine

def test_prolog_status_and_runtime():
    status = PrologEngine.check_status()
    # On this environment, SWI-Prolog was verified at C:\Program Files\swipl\bin\swipl.exe
    assert status.available is True
    assert status.rules_loaded is True
    assert status.sample_query_success is True

def test_prolog_inventory_rules_query():
    facts = [
        "product('TEST-SKU-LOW', 2, 5, 7, 2.0).",
        "product('TEST-SKU-HIGH', 100, 10, 3, 1.0).",
    ]
    query = "reorder_required('TEST-SKU-LOW', Reason), write(Reason)"
    res = PrologEngine.run_query(query, facts=facts)
    assert res.success is True
    assert (
        "Stock below safety reorder threshold" in res.output
        or "Lead time exceeds stock coverage" in res.output
        or "Critical Shortage" in res.output
    )
