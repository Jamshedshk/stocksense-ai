from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Body
from app.ai.prolog.runner import PrologEngine
from app.ai.methods_lab.practical_demos import AIMethodsLabService
from app.schemas.ai import PrologStatusResponse, PrologQueryRequest, PrologQueryResponse
from app.schemas.methods_lab import *

router = APIRouter(prefix="/ai", tags=["AI Methods Lab & Course Practicals"])

@router.get("/prolog/status", response_model=PrologStatusResponse)
def get_prolog_status():
    return PrologEngine.check_status()

@router.post("/prolog/query", response_model=PrologQueryResponse)
def run_custom_prolog_query(req: PrologQueryRequest):
    return PrologEngine.run_query(req.query)

@router.post("/methods/{method_name}/run")
def run_practical_method(method_name: str, payload: Dict[str, Any] = Body(...)):
    m = method_name.lower().replace("-", "_")

    if m == "peas":
        domain = payload.get("domain", "inventory")
        return AIMethodsLabService.get_peas_formulation(domain)

    elif m == "prolog":
        query = payload.get("query", "item(X, 'Electronics', _, Stock), Stock =< 5.")
        return AIMethodsLabService.run_prolog_query(query)

    elif m in ("bfs", "dfs", "search"):
        algo = payload.get("algorithm", "BFS")
        start = payload.get("start_node", "Central_Warehouse")
        target = payload.get("target_node", "District_Store_3")
        return AIMethodsLabService.run_search_traversal(algo, start, target)

    elif m in ("eight_puzzle", "8_puzzle", "a_star"):
        state = payload.get("initial_state", [1, 2, 3, 4, 0, 6, 7, 5, 8])
        max_steps = int(payload.get("max_steps", 50))
        return AIMethodsLabService.run_8_puzzle(state, max_steps)

    elif m == "minimax":
        board = payload.get("board", ["X", "O", "X", " ", "O", " ", " ", " ", " "])
        player = payload.get("player_to_move", "O")
        return AIMethodsLabService.run_minimax(board, player)

    elif m in ("fuzzy_fan", "fuzzy_controller"):
        temp = float(payload.get("temperature_celsius", 28.5))
        hum = float(payload.get("humidity_percent", 65.0))
        return AIMethodsLabService.run_fuzzy_fan(temp, hum)

    elif m in ("mamdani_sugeno", "fuzzy_comparison"):
        x = float(payload.get("input_x", 75.0))
        y = float(payload.get("input_y", 80.0))
        return AIMethodsLabService.compare_mamdani_sugeno(x, y)

    elif m in ("neuro_fuzzy", "hybrid"):
        vel = float(payload.get("sales_velocity", 45.0))
        ela = float(payload.get("price_elasticity", 1.8))
        del_days = float(payload.get("supplier_delay_days", 12.0))
        return AIMethodsLabService.run_neuro_fuzzy(vel, ela, del_days)

    elif m in ("perceptron_clustering", "supervised_unsupervised"):
        pts = payload.get("sample_points", None)
        k = int(payload.get("k_clusters", 3))
        return AIMethodsLabService.run_perceptron_and_clustering(pts, k)

    elif m in ("ngram", "slm", "language_model"):
        prompt = payload.get("prompt", "inventory")
        n = int(payload.get("n", 2))
        length = int(payload.get("length", 15))
        return AIMethodsLabService.run_ngram_model(prompt, n, length)

    else:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown AI method '{method_name}'. Supported methods: peas, prolog, search, eight_puzzle, minimax, fuzzy_fan, mamdani_sugeno, neuro_fuzzy, perceptron_clustering, ngram.",
        )
