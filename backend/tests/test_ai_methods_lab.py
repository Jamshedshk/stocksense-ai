from app.ai.methods_lab.practical_demos import AIMethodsLabService

def test_peas_formulation():
    resp = AIMethodsLabService.get_peas_formulation("inventory")
    assert "StockSense" in resp.agent_name
    assert len(resp.performance_measure) >= 3
    assert len(resp.actuators) >= 3
    assert "Partially Observable" in resp.properties["Observability"]

def test_search_traversal_bfs_dfs():
    bfs_resp = AIMethodsLabService.run_search_traversal("BFS", "Central_Warehouse", "District_Store_1")
    assert bfs_resp.path_found is not None
    assert bfs_resp.path_found[0] == "Central_Warehouse"
    assert bfs_resp.path_found[-1] == "District_Store_1"

    dfs_resp = AIMethodsLabService.run_search_traversal("DFS", "Central_Warehouse", "District_Store_1")
    assert dfs_resp.path_found is not None
    assert dfs_resp.path_found[-1] == "District_Store_1"

def test_eight_puzzle_a_star_solvable():
    # 1 move away from goal: blank at index 7, 8 at index 8 -> [1,2,3,4,5,6,7,0,8]
    solvable_state = [1, 2, 3, 4, 5, 6, 7, 0, 8]
    resp = AIMethodsLabService.run_8_puzzle(solvable_state, max_steps=10)
    assert resp.solvable is True
    assert resp.total_cost == 1
    assert resp.solution_path[-1] == [1, 2, 3, 4, 5, 6, 7, 8, 0]

def test_eight_puzzle_unsolvable():
    # Odd number of inversions
    unsolvable_state = [1, 2, 3, 4, 5, 6, 8, 7, 0]
    resp = AIMethodsLabService.run_8_puzzle(unsolvable_state)
    assert resp.solvable is False
    assert "Unsolvable" in resp.message

def test_minimax_tic_tac_toe():
    # O can win immediately at index 2
    board = ["O", "O", " ", "X", "X", " ", " ", " ", " "]
    resp = AIMethodsLabService.run_minimax(board, player_to_move="O")
    assert resp.best_move == 2
    assert resp.board_after_move[2] == "O"
    assert resp.game_state == "O_WINS"

def test_fuzzy_fan_controller():
    # Hot and humid
    resp_hot = AIMethodsLabService.run_fuzzy_fan(temp=35.0, humidity=85.0)
    assert resp_hot.fan_speed_percent >= 70.0
    assert resp_hot.fan_speed_category == "FAST"

    # Cold and dry
    resp_cold = AIMethodsLabService.run_fuzzy_fan(temp=10.0, humidity=20.0)
    assert resp_cold.fan_speed_percent <= 40.0

def test_mamdani_sugeno_comparison():
    resp = AIMethodsLabService.compare_mamdani_sugeno(input_x=80.0, input_y=85.0)
    assert resp.mamdani_output > 0
    assert resp.sugeno_output > 0
    assert len(resp.mamdani_steps) > 0
    assert len(resp.sugeno_steps) > 0

def test_hybrid_neuro_fuzzy():
    resp = AIMethodsLabService.run_neuro_fuzzy(velocity=60.0, elasticity=1.5, delay=15.0)
    assert len(resp.neural_feature_embedding) == 2
    assert 0.0 <= resp.fuzzy_risk_index <= 100.0

def test_perceptron_and_clustering():
    resp = AIMethodsLabService.run_perceptron_and_clustering(None, k=3)
    assert resp.perceptron_accuracy >= 0.8
    assert len(resp.cluster_centroids) == 3

def test_ngram_language_model():
    resp = AIMethodsLabService.run_ngram_model(prompt="inventory", n=2, length=10)
    assert "inventory" in resp.generated_text
    assert resp.corpus_token_count > 0
