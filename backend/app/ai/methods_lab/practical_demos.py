import heapq
import math
import random
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict, deque
from app.schemas.methods_lab import *
from app.ai.prolog.runner import PrologEngine
from app.ai.fuzzy.controller import trapezoid

class AIMethodsLabService:
    # ---------------- 1. PEAS ----------------
    @staticmethod
    def get_peas_formulation(domain: str = "inventory") -> PEASResponse:
        return PEASResponse(
            agent_name="StockSense Autonomous Inventory Agent",
            performance_measure=[
                "Minimize stockouts and lost revenue (< 2% stockout frequency)",
                "Minimize holding and overstock storage costs",
                "Maintain optimal customer service fulfillment rate (> 98%)",
                "Maximize inventory turnover ratio and working capital liquidity",
                "Achieve high forecast accuracy (Low MAE on holdout horizon)",
            ],
            environment=[
                "Customer sales transactions and fluctuating demand velocity",
                "Multi-echelon warehouse / shop inventory storage bins",
                "Supply chain suppliers with variable delivery lead times",
                "Pricing and discount events, seasonal consumer shifts",
            ],
            actuators=[
                "Reorder recommendation trigger (SKU, Suggested Quantity, Priority)",
                "Stockout-risk alert notifications (Slack/Email/Web UI)",
                "Safety stock threshold adjustments",
                "Slow-moving markdown / promotional pricing recommendations",
            ],
            sensors=[
                "Point-of-Sale (POS) barcode scans and manual sales receipts",
                "Inbound shipment receiving inspection logs",
                "Real-time physical stock counts and audit adjustments",
                "Historical sales time-series database",
            ],
            properties={
                "Observability": "Partially Observable (future customer arrivals and vendor delays are hidden)",
                "Determinism": "Stochastic (customer purchasing patterns and lead-time variability are probabilistic)",
                "Episodic": "Sequential (current inventory level and replenishment directly constrain future states)",
                "Static vs Dynamic": "Dynamic (inventory deteriorates and demand changes while planning decisions occur)",
                "Discrete vs Continuous": "Discrete (discrete item units, day-by-day timestamps, and categorical states)",
                "Agents": "Single-Agent with Competitive Environment (single inventory planner amidst competitive market forces)",
            },
        )

    # ---------------- 2. PROLOG CONSOLE ----------------
    @staticmethod
    def run_prolog_query(query: str) -> PrologLabResponse:
        prolog_status = PrologEngine.check_status()
        if not prolog_status.available:
            return PrologLabResponse(
                success=False,
                results=[],
                explanation="SWI-Prolog runtime is not detected on host system.",
                raw_output=prolog_status.diagnostic_message or "Unavailable",
            )
        
        # Educational facts
        facts = [
            "item('Laptop', 'Electronics', 1200, 15).",
            "item('Mouse', 'Accessories', 25, 4).",
            "item('Keyboard', 'Accessories', 65, 8).",
            "item('Monitor', 'Electronics', 300, 2).",
            "supplier('Dell', 'Laptop', 5).",
            "supplier('Logitech', 'Mouse', 3).",
            "supplier('Keychron', 'Keyboard', 7).",
            "critical_stock(Item) :- item(Item, _, _, Stock), Stock =< 5.",
            "category_items(Cat, Item) :- item(Item, Cat, _, _).",
        ]

        resp = PrologEngine.run_query(query, facts=facts)
        explanation = "Executed query against knowledge base containing items, categories, and critical stock rules."
        return PrologLabResponse(
            success=resp.success,
            results=[],
            explanation=explanation,
            raw_output=resp.output or (resp.error or "True."),
        )

    # ---------------- 3. BFS / DFS ----------------
    @staticmethod
    def run_search_traversal(algorithm: str, start_node: str, target_node: Optional[str]) -> SearchTraversalResponse:
        graph = {
            "Central_Warehouse": ["Regional_Hub_East", "Regional_Hub_West", "Fast_Fulfillment_Hub"],
            "Regional_Hub_East": ["District_Store_1", "District_Store_2"],
            "Regional_Hub_West": ["District_Store_3", "District_Store_4"],
            "Fast_Fulfillment_Hub": ["Express_Locker_A", "Express_Locker_B"],
            "District_Store_1": [],
            "District_Store_2": [],
            "District_Store_3": [],
            "District_Store_4": [],
            "Express_Locker_A": [],
            "Express_Locker_B": [],
        }

        if start_node not in graph:
            start_node = "Central_Warehouse"

        visited = []
        steps = []
        path_found = None
        algo_upper = algorithm.upper()

        if algo_upper == "BFS":
            queue = deque([(start_node, [start_node])])
            seen = {start_node}
            while queue:
                curr, path = queue.popleft()
                visited.append(curr)
                steps.append(f"Dequeued node '{curr}'. Frontier length: {len(queue)}.")
                if target_node and curr == target_node:
                    path_found = path
                    steps.append(f"Target '{target_node}' reached! Solution path: {' -> '.join(path)}")
                    break
                for neighbor in graph.get(curr, []):
                    if neighbor not in seen:
                        seen.add(neighbor)
                        queue.append((neighbor, path + [neighbor]))
                        steps.append(f"  Enqueued neighbor '{neighbor}'.")
        else:
            stack = [(start_node, [start_node])]
            seen = set()
            while stack:
                curr, path = stack.pop()
                if curr in seen:
                    continue
                seen.add(curr)
                visited.append(curr)
                steps.append(f"Popped node '{curr}' from stack. Depth: {len(path)}.")
                if target_node and curr == target_node:
                    path_found = path
                    steps.append(f"Target '{target_node}' reached! Solution path: {' -> '.join(path)}")
                    break
                for neighbor in reversed(graph.get(curr, [])):
                    if neighbor not in seen:
                        stack.append((neighbor, path + [neighbor]))
                        steps.append(f"  Pushed neighbor '{neighbor}' to stack.")

        return SearchTraversalResponse(
            algorithm=algo_upper,
            visited_order=visited,
            path_found=path_found,
            step_explanations=steps,
            graph_structure=graph,
        )

    # ---------------- 4. A* 8-PUZZLE ----------------
    @staticmethod
    def run_8_puzzle(initial_state: List[int], max_steps: int = 50) -> EightPuzzleResponse:
        goal_state = [1, 2, 3, 4, 5, 6, 7, 8, 0]

        def get_inversions(state: List[int]) -> int:
            arr = [x for x in state if x != 0]
            inv = 0
            for i in range(len(arr)):
                for j in range(i + 1, len(arr)):
                    if arr[i] > arr[j]:
                        inv += 1
            return inv

        # Check solvable
        if len(initial_state) != 9 or set(initial_state) != set(range(9)):
            return EightPuzzleResponse(
                solvable=False,
                initial_heuristic=0,
                solution_path=[],
                moves=[],
                nodes_explored=0,
                total_cost=0,
                message="Invalid state: Must contain digits 0 through 8.",
            )

        if get_inversions(initial_state) % 2 != 0:
            return EightPuzzleResponse(
                solvable=False,
                initial_heuristic=0,
                solution_path=[],
                moves=[],
                nodes_explored=0,
                total_cost=0,
                message="Unsolvable initial state (inversion count is odd).",
            )

        def manhattan(state: List[int]) -> int:
            dist = 0
            for idx, val in enumerate(state):
                if val == 0:
                    continue
                target_idx = val - 1
                curr_r, curr_c = divmod(idx, 3)
                targ_r, targ_c = divmod(target_idx, 3)
                dist += abs(curr_r - targ_r) + abs(curr_c - targ_c)
            return dist

        initial_h = manhattan(initial_state)
        if initial_state == goal_state:
            return EightPuzzleResponse(
                solvable=True,
                initial_heuristic=0,
                solution_path=[initial_state],
                moves=[],
                nodes_explored=1,
                total_cost=0,
                message="State is already solved!",
            )

        # Priority queue for A*
        pq = []
        heapq.heappush(pq, (initial_h, 0, initial_state, [], []))
        visited = {tuple(initial_state): 0}
        nodes_explored = 0

        directions = [("UP", -3), ("DOWN", 3), ("LEFT", -1), ("RIGHT", 1)]

        while pq and nodes_explored < 5000:
            f, g, state, path, moves = heapq.heappop(pq)
            nodes_explored += 1

            if state == goal_state:
                return EightPuzzleResponse(
                    solvable=True,
                    initial_heuristic=initial_h,
                    solution_path=[initial_state] + path,
                    moves=moves,
                    nodes_explored=nodes_explored,
                    total_cost=g,
                    message=f"Optimal solution found in {g} moves using A* (Manhattan heuristic)!",
                )

            if g >= max_steps:
                continue

            blank = state.index(0)
            br, bc = divmod(blank, 3)

            for move_name, delta in directions:
                new_blank = blank + delta
                nr, nc = divmod(new_blank, 3)

                if 0 <= nr < 3 and 0 <= nc < 3:
                    if (move_name == "LEFT" and nc != bc - 1) or (move_name == "RIGHT" and nc != bc + 1):
                        continue
                    new_state = list(state)
                    new_state[blank], new_state[new_blank] = new_state[new_blank], new_state[blank]
                    tup = tuple(new_state)

                    new_g = g + 1
                    if tup not in visited or new_g < visited[tup]:
                        visited[tup] = new_g
                        h = manhattan(new_state)
                        heapq.heappush(pq, (new_g + h, new_g, new_state, path + [new_state], moves + [move_name]))

        return EightPuzzleResponse(
            solvable=True,
            initial_heuristic=initial_h,
            solution_path=[],
            moves=[],
            nodes_explored=nodes_explored,
            total_cost=0,
            message="Search bounded by step limit. Try fewer moves or simpler state.",
        )

    # ---------------- 5. MINIMAX TIC-TAC-TOE ----------------
    @staticmethod
    def run_minimax(board: List[str], player_to_move: str = "O") -> MinimaxResponse:
        # Check game state
        def check_winner(b: List[str]) -> Optional[str]:
            wins = [
                (0, 1, 2), (3, 4, 5), (6, 7, 8),
                (0, 3, 6), (1, 4, 7), (2, 5, 8),
                (0, 4, 8), (2, 4, 6)
            ]
            for i, j, k in wins:
                if b[i] != " " and b[i] == b[j] == b[k]:
                    return b[i]
            if " " not in b:
                return "DRAW"
            return None

        ai = player_to_move.upper()
        human = "X" if ai == "O" else "O"

        status = check_winner(board)
        if status:
            return MinimaxResponse(
                best_move=-1,
                minimax_score=0,
                board_after_move=board,
                game_state=f"{status}_WINS" if status != "DRAW" else "DRAW",
                explanation=f"Game already terminated with status {status}.",
            )

        def minimax(b: List[str], is_maximizing: bool) -> int:
            winner = check_winner(b)
            if winner == ai:
                return 10
            elif winner == human:
                return -10
            elif winner == "DRAW":
                return 0

            if is_maximizing:
                best_score = -100
                for i in range(9):
                    if b[i] == " ":
                        b[i] = ai
                        score = minimax(b, False)
                        b[i] = " "
                        best_score = max(best_score, score)
                return best_score
            else:
                best_score = 100
                for i in range(9):
                    if b[i] == " ":
                        b[i] = human
                        score = minimax(b, True)
                        b[i] = " "
                        best_score = min(best_score, score)
                return best_score

        best_score = -100
        best_move = -1
        for i in range(9):
            if board[i] == " ":
                board_copy = list(board)
                board_copy[i] = ai
                score = minimax(board_copy, False)
                if score > best_score:
                    best_score = score
                    best_move = i

        new_board = list(board)
        if best_move != -1:
            new_board[best_move] = ai

        end_status = check_winner(new_board)
        game_state = "ONGOING"
        if end_status == "DRAW":
            game_state = "DRAW"
        elif end_status in ("X", "O"):
            game_state = f"{end_status}_WINS"

        return MinimaxResponse(
            best_move=best_move,
            minimax_score=best_score,
            board_after_move=new_board,
            game_state=game_state,
            explanation=f"Minimax evaluated optimal index {best_move} with utility score {best_score}.",
        )

    # ---------------- 6. FUZZY FAN CONTROLLER ----------------
    @staticmethod
    def run_fuzzy_fan(temp: float, humidity: float) -> FuzzyFanResponse:
        # Fuzzify Temperature: Cold [-10, 0, 15, 22], Normal [18, 24, 26, 30], Hot [26, 32, 60, 60]
        mu_t_cold = trapezoid(temp, -10, 0, 15, 22)
        mu_t_norm = trapezoid(temp, 18, 24, 26, 30)
        mu_t_hot = trapezoid(temp, 26, 32, 60, 60)

        # Fuzzify Humidity: Low [0, 0, 30, 45], Med [35, 50, 60, 75], High [65, 80, 100, 100]
        mu_h_low = trapezoid(humidity, 0, 0, 30, 45)
        mu_h_med = trapezoid(humidity, 35, 50, 60, 75)
        mu_h_high = trapezoid(humidity, 65, 80, 100, 100)

        # Rules:
        # R1: IF Temp is Hot OR Humidity is High THEN Fan is Fast (80%)
        # R2: IF Temp is Normal AND Humidity is Med THEN Fan is Medium (50%)
        # R3: IF Temp is Cold THEN Fan is Off/Slow (15%)
        w_fast = max(mu_t_hot, mu_h_high)
        w_med = min(mu_t_norm, mu_h_med)
        w_slow = mu_t_cold

        rules_fired = []
        if w_fast > 0.01:
            rules_fired.append(f"IF Temp Hot OR Humidity High -> Fan FAST (weight {w_fast:.2f})")
        if w_med > 0.01:
            rules_fired.append(f"IF Temp Normal AND Humidity Med -> Fan MEDIUM (weight {w_med:.2f})")
        if w_slow > 0.01:
            rules_fired.append(f"IF Temp Cold -> Fan SLOW (weight {w_slow:.2f})")

        num = (w_fast * 85.0) + (w_med * 50.0) + (w_slow * 15.0)
        denom = w_fast + w_med + w_slow
        speed = round(num / denom if denom > 0 else 30.0, 1)

        category = "FAST" if speed >= 70 else ("MEDIUM" if speed >= 40 else "SLOW")

        return FuzzyFanResponse(
            fan_speed_percent=speed,
            fan_speed_category=category,
            membership_inputs={
                "temperature": {"cold": round(mu_t_cold, 2), "normal": round(mu_t_norm, 2), "hot": round(mu_t_hot, 2)},
                "humidity": {"low": round(mu_h_low, 2), "medium": round(mu_h_med, 2), "high": round(mu_h_high, 2)},
            },
            rules_fired=rules_fired,
        )

    # ---------------- 7. MAMDANI VS SUGENO ----------------
    @staticmethod
    def compare_mamdani_sugeno(input_x: float, input_y: float) -> MamdaniSugenoResponse:
        # x: demand in [0, 100], y: urgency in [0, 100]
        mu_x_low = trapezoid(input_x, 0, 0, 30, 50)
        mu_x_high = trapezoid(input_x, 40, 60, 100, 100)

        mu_y_low = trapezoid(input_y, 0, 0, 30, 50)
        mu_y_high = trapezoid(input_y, 40, 60, 100, 100)

        w1 = min(mu_x_high, mu_y_high)  # High Demand + High Urgency
        w2 = min(mu_x_low, mu_y_low)    # Low Demand + Low Urgency
        w3 = max(min(mu_x_high, mu_y_low), min(mu_x_low, mu_y_high)) # Mixed

        # Mamdani Defuzzification: Fuzzy singleton outputs (Critical=95, Low=15, Moderate=50)
        mamdani_num = (w1 * 95.0) + (w2 * 15.0) + (w3 * 50.0)
        mamdani_denom = w1 + w2 + w3
        mamdani_out = round(mamdani_num / mamdani_denom if mamdani_denom > 0 else 50.0, 1)

        # Sugeno First-Order Defuzzification: z_i = a_i*x + b_i*y + c_i
        z1 = 0.5 * input_x + 0.5 * input_y + 10.0
        z2 = 0.1 * input_x + 0.1 * input_y + 5.0
        z3 = 0.3 * input_x + 0.3 * input_y + 8.0

        sugeno_num = (w1 * z1) + (w2 * z2) + (w3 * z3)
        sugeno_denom = w1 + w2 + w3
        sugeno_out = round(sugeno_num / sugeno_denom if sugeno_denom > 0 else 45.0, 1)

        return MamdaniSugenoResponse(
            mamdani_output=mamdani_out,
            sugeno_output=sugeno_out,
            output_difference=round(abs(mamdani_out - sugeno_out), 2),
            mamdani_steps=[
                f"Fuzzified inputs into linguistic terms (weights w1={w1:.2f}, w2={w2:.2f}, w3={w3:.2f}).",
                "Aggregated consequences using Mamdani min-max composition.",
                f"Defuzzified output using center of gravity -> {mamdani_out} points.",
            ],
            sugeno_steps=[
                f"Evaluated linear polynomial functions for each rule: z1={z1:.1f}, z2={z2:.1f}, z3={z3:.1f}.",
                "Computed weighted average of crisp outputs directly without area integration.",
                f"Resulting Sugeno crisp index -> {sugeno_out} points.",
            ],
            rules_summary=[
                "Rule 1: IF Demand High AND Urgency High -> Mamdani: Critical (95), Sugeno: 0.5*x + 0.5*y + 10",
                "Rule 2: IF Demand Low AND Urgency Low -> Mamdani: Low (15), Sugeno: 0.1*x + 0.1*y + 5",
                "Rule 3: IF Mixed -> Mamdani: Moderate (50), Sugeno: 0.3*x + 0.3*y + 8",
            ],
        )

    # ---------------- 8. HYBRID NEURO-FUZZY ----------------
    @staticmethod
    def run_neuro_fuzzy(velocity: float, elasticity: float, delay: float) -> NeuroFuzzyResponse:
        # Neural feature embedding layer: non-linear activation combining parameters
        w1, w2, w3 = 0.45, -0.25, 0.65
        h1 = math.tanh(0.02 * velocity * w1 + delay * 0.1 * w3)
        h2 = math.tanh(elasticity * w2 + 0.05 * delay * w3)
        embedding = [round(h1, 3), round(h2, 3)]

        # Fuzzy decision layer operating on latent neural representation
        mu_stressed = max(0.0, min(1.0, (h1 + 0.5) / 1.5))
        mu_stable = 1.0 - mu_stressed

        risk_index = round((mu_stressed * 85.0 + mu_stable * 20.0), 1)

        return NeuroFuzzyResponse(
            neural_feature_embedding=embedding,
            fuzzy_risk_index=risk_index,
            interpretation=f"Neural layer compressed non-linear velocity and delay dynamics into latent features {embedding}. Fuzzy layer inferred risk index of {risk_index}/100.",
            architecture_description="Layer 1: Input (Velocity, Elasticity, Delay) -> Layer 2: Non-linear Tanh Hidden Layer -> Layer 3: Fuzzy Membership Partitioning -> Layer 4: Defuzzified Risk Index.",
        )

    # ---------------- 9. PERCEPTRON & CLUSTERING ----------------
    @staticmethod
    def run_perceptron_and_clustering(points: Optional[List[List[float]]], k: int = 3) -> PerceptronClusteringResponse:
        if not points:
            points = [
                [1.0, 2.0], [1.5, 1.8], [2.0, 2.5],  # Cluster 1
                [8.0, 8.0], [8.5, 9.0], [9.0, 8.5],  # Cluster 2
                [5.0, 1.0], [5.5, 1.5], [6.0, 2.0],  # Cluster 3
            ]

        # Train 2-class Perceptron (Class 0: x < 5, Class 1: x >= 5)
        X = [p[:2] for p in points]
        y = [1 if p[0] >= 5.0 else 0 for p in X]
        w = [0.1, -0.1]
        b = 0.0
        lr = 0.1

        for _ in range(50):
            for xi, target in zip(X, y):
                pred = 1 if (xi[0] * w[0] + xi[1] * w[1] + b) >= 0 else 0
                err = target - pred
                w[0] += lr * err * xi[0]
                w[1] += lr * err * xi[1]
                b += lr * err

        correct = sum(1 for xi, target in zip(X, y) if (1 if (xi[0]*w[0] + xi[1]*w[1] + b) >= 0 else 0) == target)
        accuracy = round(correct / len(X), 2)

        # Simple K-Means clustering
        random.seed(42)
        centroids = [list(p) for p in random.sample(X, min(k, len(X)))]
        assignments = []

        for _ in range(10):
            assignments = []
            for xi in X:
                dists = [math.dist(xi, c) for c in centroids]
                assignments.append(dists.index(min(dists)))

            # Update centroids
            for c_idx in range(len(centroids)):
                pts_c = [X[i] for i, a in enumerate(assignments) if a == c_idx]
                if pts_c:
                    centroids[c_idx] = [
                        round(sum(p[0] for p in pts_c) / len(pts_c), 2),
                        round(sum(p[1] for p in pts_c) / len(pts_c), 2),
                    ]

        return PerceptronClusteringResponse(
            perceptron_weights=[round(w[0], 3), round(w[1], 3)],
            perceptron_bias=round(b, 3),
            perceptron_accuracy=accuracy,
            cluster_centroids=centroids,
            cluster_assignments=assignments,
            points=X,
        )

    # ---------------- 10. TOY N-GRAM LANGUAGE MODEL ----------------
    @staticmethod
    def run_ngram_model(prompt: str = "inventory", n: int = 2, length: int = 15) -> NGramResponse:
        corpus = (
            "inventory management ensures optimal stock balance across the distribution network . "
            "demand forecasting uses historical sales data to predict future reorder requirements . "
            "stockout risk increases when lead time exceeds available coverage days . "
            "the autonomous inventory agent calculates suggested order quantities with safety stock buffer . "
            "fast moving products require frequent replenishment to prevent lost sales revenue . "
            "slow moving stock ties up working capital and increases warehouse storage holding costs ."
        )

        tokens = corpus.lower().split()
        n_grams = defaultdict(lambda: defaultdict(int))

        if n == 2:
            for i in range(len(tokens) - 1):
                n_grams[tokens[i]][tokens[i + 1]] += 1
        else:
            for i in range(len(tokens) - 2):
                prefix = f"{tokens[i]} {tokens[i + 1]}"
                n_grams[prefix][tokens[i + 2]] += 1

        # Generate text
        curr = prompt.lower().strip()
        words = curr.split()
        generated = list(words)

        for _ in range(length):
            key = words[-1] if n == 2 else (" ".join(words[-2:]) if len(words) >= 2 else words[-1])
            candidates = n_grams.get(key, {})
            if not candidates:
                # Fallback to random token from corpus
                next_word = random.choice(tokens)
            else:
                total_c = sum(candidates.values())
                # Pick most probable or weighted sample
                next_word = max(candidates.keys(), key=lambda w: candidates[w])
            
            generated.append(next_word)
            words.append(next_word)

        # Inspect next-token probabilities for input prompt
        probe_key = prompt.lower().split()[-1]
        next_probs = []
        if probe_key in n_grams:
            total_freq = sum(n_grams[probe_key].values())
            for word, freq in sorted(n_grams[probe_key].items(), key=lambda x: -x[1]):
                next_probs.append({
                    "token": word,
                    "frequency": freq,
                    "probability": round(freq / total_freq, 3),
                })

        return NGramResponse(
            n=n,
            generated_text=" ".join(generated),
            next_token_probabilities=next_probs,
            corpus_token_count=len(tokens),
            explanation=f"Trained toy {n}-gram (markovian) statistical language model over {len(tokens)} domain corpus tokens.",
        )
