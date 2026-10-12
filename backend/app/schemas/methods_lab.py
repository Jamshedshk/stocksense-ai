from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# 1. PEAS
class PEASRequest(BaseModel):
    domain: Optional[str] = "inventory"

class PEASResponse(BaseModel):
    agent_name: str
    performance_measure: List[str]
    environment: List[str]
    actuators: List[str]
    sensors: List[str]
    properties: Dict[str, str]  # Observable, Deterministic, Episodic, Static, Discrete, Single/Multi-agent

# 2. Prolog Query
class PrologLabRequest(BaseModel):
    query: str = Field(..., description="Educational Prolog query e.g. parent(X, bob)")

class PrologLabResponse(BaseModel):
    success: bool
    results: List[Dict[str, Any]]
    explanation: str
    raw_output: str

# 3. BFS / DFS
class SearchTraversalRequest(BaseModel):
    algorithm: str = Field(..., description="BFS or DFS")
    start_node: str = Field(default="Warehouse")
    target_node: Optional[str] = Field(default="Store_3")

class SearchTraversalResponse(BaseModel):
    algorithm: str
    visited_order: List[str]
    path_found: Optional[List[str]] = None
    step_explanations: List[str]
    graph_structure: Dict[str, List[str]]

# 4. A* 8-Puzzle
class EightPuzzleRequest(BaseModel):
    initial_state: List[int] = Field(..., description="List of 9 numbers representing 3x3 grid (0 is blank)")
    max_steps: int = Field(default=50, ge=1, le=100)

class EightPuzzleResponse(BaseModel):
    solvable: bool
    initial_heuristic: int
    solution_path: List[List[int]]
    moves: List[str]
    nodes_explored: int
    total_cost: int
    message: str

# 5. Minimax Tic-Tac-Toe
class MinimaxRequest(BaseModel):
    board: List[str] = Field(..., description="9 elements representing 3x3 board ('X', 'O', or ' ')")
    player_to_move: str = Field(default="O", description="AI player ('O' or 'X')")

class MinimaxResponse(BaseModel):
    best_move: int
    minimax_score: int
    board_after_move: List[str]
    game_state: str  # ONGOING, X_WINS, O_WINS, DRAW
    explanation: str

# 6. Fuzzy Fan Controller
class FuzzyFanRequest(BaseModel):
    temperature_celsius: float = Field(..., ge=-10, le=60)
    humidity_percent: float = Field(..., ge=0, le=100)

class FuzzyFanResponse(BaseModel):
    fan_speed_percent: float
    fan_speed_category: str
    membership_inputs: Dict[str, Dict[str, float]]
    rules_fired: List[str]

# 7. Mamdani vs Sugeno
class MamdaniSugenoRequest(BaseModel):
    input_x: float = Field(..., ge=0, le=100, description="Normalized demand level")
    input_y: float = Field(..., ge=0, le=100, description="Normalized urgency / lead time")

class MamdaniSugenoResponse(BaseModel):
    mamdani_output: float
    sugeno_output: float
    output_difference: float
    mamdani_steps: List[str]
    sugeno_steps: List[str]
    rules_summary: List[str]

# 8. Hybrid Neuro-Fuzzy
class NeuroFuzzyRequest(BaseModel):
    sales_velocity: float = Field(..., ge=0, le=200)
    price_elasticity: float = Field(..., ge=0, le=5)
    supplier_delay_days: float = Field(..., ge=0, le=30)

class NeuroFuzzyResponse(BaseModel):
    neural_feature_embedding: List[float]
    fuzzy_risk_index: float
    interpretation: str
    architecture_description: str

# 9. Perceptron & Clustering
class PerceptronClusteringRequest(BaseModel):
    sample_points: Optional[List[List[float]]] = None
    k_clusters: int = Field(default=3, ge=2, le=5)

class PerceptronClusteringResponse(BaseModel):
    perceptron_weights: List[float]
    perceptron_bias: float
    perceptron_accuracy: float
    cluster_centroids: List[List[float]]
    cluster_assignments: List[int]
    points: List[List[float]]

# 10. Toy n-gram Language Model
class NGramRequest(BaseModel):
    prompt: str = Field(default="inventory", description="Seed text")
    n: int = Field(default=2, ge=2, le=3, description="Bigram (2) or Trigram (3)")
    length: int = Field(default=15, ge=1, le=50)

class NGramResponse(BaseModel):
    n: int
    generated_text: str
    next_token_probabilities: List[Dict[str, Any]]
    corpus_token_count: int
    explanation: str
