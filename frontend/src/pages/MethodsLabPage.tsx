import React, { useState } from "react";
import {
  FlaskConical,
  BrainCircuit,
  Terminal,
  Search,
  Grid3X3,
  Gamepad2,
  Wind,
  Layers,
  Cpu,
  Type,
  Play,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Code,
} from "lucide-react";
import { api } from "../lib/api";

export const MethodsLabPage: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<string>("peas");
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Practical 1: PEAS
  const [peasDomain, setPeasDomain] = useState<string>("inventory");

  // Practical 2: PROLOG
  const [prologQuery, setPrologQuery] = useState<string>(
    "item(X, 'Electronics', _, Stock), Stock =< 5."
  );

  // Practical 3: BFS / DFS
  const [searchAlgo, setSearchAlgo] = useState<string>("BFS");
  const [searchStart, setSearchStart] = useState<string>("Central_Warehouse");
  const [searchTarget, setSearchTarget] = useState<string>("District_Store_3");

  // Practical 4: 8-Puzzle A*
  const [puzzleState, setPuzzleState] = useState<number[]>([1, 2, 3, 4, 0, 6, 7, 5, 8]);

  // Practical 5: Minimax Tic-Tac-Toe
  const [minimaxBoard, setMinimaxBoard] = useState<string[]>([
    "X", "O", "X",
    " ", "O", " ",
    " ", " ", " ",
  ]);
  const [minimaxPlayer, setMinimaxPlayer] = useState<string>("X");

  // Practical 6: Fuzzy Fan Controller
  const [fanTemp, setFanTemp] = useState<number>(28.5);
  const [fanHum, setFanHum] = useState<number>(65.0);

  // Practical 7: Mamdani vs Sugeno
  const [compareX, setCompareX] = useState<number>(75.0);
  const [compareY, setCompareY] = useState<number>(80.0);

  // Practical 8: Hybrid Neuro-Fuzzy
  const [nfVelocity, setNfVelocity] = useState<number>(45.0);
  const [nfElasticity, setNfElasticity] = useState<number>(1.8);
  const [nfDelay, setNfDelay] = useState<number>(12.0);

  // Practical 9: Perceptron & Clustering
  const [kClusters, setKClusters] = useState<number>(3);

  // Practical 10: N-Gram SLM
  const [ngramPrompt, setNgramPrompt] = useState<string>("inventory");
  const [ngramN, setNgramN] = useState<number>(2);
  const [ngramLength, setNgramLength] = useState<number>(15);

  const practicals = [
    { id: "peas", name: "1. PEAS Formulation", icon: BookOpen, desc: "Performance, Environment, Actuators, Sensors" },
    { id: "prolog", name: "2. SWI-Prolog Rules", icon: Terminal, desc: "Knowledge-base queries & unification" },
    { id: "search", name: "3. BFS & DFS Search", icon: Search, desc: "Supply chain network traversal" },
    { id: "eight_puzzle", name: "4. A* 8-Puzzle Solver", icon: Grid3X3, desc: "Heuristic search with Manhattan distance" },
    { id: "minimax", name: "5. Adversarial Minimax", icon: Gamepad2, desc: "Game tree search with optimal move evaluation" },
    { id: "fuzzy_fan", name: "6. Fuzzy Fan Controller", icon: Wind, desc: "Mamdani controller for warehouse climate" },
    { id: "mamdani_sugeno", name: "7. Mamdani vs Sugeno", icon: Layers, desc: "Defuzzification comparison (Centroid vs WAvg)" },
    { id: "neuro_fuzzy", name: "8. Neuro-Fuzzy Hybrid", icon: BrainCircuit, desc: "ANFIS-like multi-tier inventory evaluation" },
    { id: "perceptron_clustering", name: "9. Perceptron & K-Means", icon: Cpu, desc: "Supervised hyperplane + Unsupervised clusters" },
    { id: "ngram", name: "10. N-Gram Language Model", icon: Type, desc: "Corpus probability transition model" },
  ];

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    setResult(null);

    let payload: any = {};
    if (selectedMethod === "peas") payload = { domain: peasDomain };
    else if (selectedMethod === "prolog") payload = { query: prologQuery };
    else if (selectedMethod === "search")
      payload = { algorithm: searchAlgo, start_node: searchStart, target_node: searchTarget };
    else if (selectedMethod === "eight_puzzle")
      payload = { initial_state: puzzleState, max_steps: 50 };
    else if (selectedMethod === "minimax")
      payload = { board: minimaxBoard, player_to_move: minimaxPlayer };
    else if (selectedMethod === "fuzzy_fan")
      payload = { temperature_celsius: fanTemp, humidity_percent: fanHum };
    else if (selectedMethod === "mamdani_sugeno")
      payload = { input_x: compareX, input_y: compareY };
    else if (selectedMethod === "neuro_fuzzy")
      payload = { sales_velocity: nfVelocity, price_elasticity: nfElasticity, supplier_delay_days: nfDelay };
    else if (selectedMethod === "perceptron_clustering")
      payload = { k_clusters: kClusters };
    else if (selectedMethod === "ngram")
      payload = { prompt: ngramPrompt, n: ngramN, length: ngramLength };

    try {
      const res = await api.runPracticalMethod(selectedMethod, payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || `Failed to execute ${selectedMethod}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-hero-dark rounded-2xl p-6 sm:p-8 text-cream border border-plum-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/15 border border-mint/30 text-mint text-xs font-semibold">
            <FlaskConical size={14} />
            <span>Academic AI Demonstrations & Course Practicals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AI Methods Lab
          </h1>
          <p className="text-sm text-mauve/90 max-w-2xl leading-relaxed">
            Interactive, executable implementations of core AI curriculum topics. Real algorithms run server-side in Python and SWI-Prolog without mocks or predetermined outputs.
          </p>
        </div>

        <button
          onClick={handleExecute}
          disabled={executing}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-coral hover:bg-coral-hover text-white font-bold text-xs transition shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Play size={15} className={executing ? "animate-spin" : "fill-current"} />
          <span>{executing ? "Executing Algorithm..." : "Execute Demonstration"}</span>
        </button>
      </div>

      {/* Main Grid: Sidebar + Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Practicals Menu (4 cols) */}
        <div className="lg:col-span-4 bg-paper rounded-2xl p-4 border border-cream-dark/60 shadow-sm space-y-1.5">
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider px-3 py-2 block">
            Practicals Catalog (10 Modules)
          </span>
          {practicals.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedMethod === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedMethod(p.id);
                  setResult(null);
                  setError(null);
                }}
                className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 ${
                  isSelected
                    ? "bg-plum text-white shadow-md font-bold"
                    : "text-ink hover:bg-cream-light font-medium"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? "bg-coral text-white" : "bg-cream-dark/60 text-plum"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isSelected ? "text-mauve" : "text-ink-muted"
                    }`}
                  >
                    {p.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Input Parameters & Live Results (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Parameters Card */}
          <div className="bg-paper rounded-2xl p-6 border border-cream-dark/60 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-cream-dark/60">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Code size={16} className="text-coral" />
                <span>Input Parameters & Controls</span>
              </h3>
              <span className="text-xs font-bold text-plum font-mono">
                Method: {selectedMethod}
              </span>
            </div>

            {/* Practical 1: PEAS */}
            {selectedMethod === "peas" && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-ink uppercase">Domain Setting</label>
                <select
                  value={peasDomain}
                  onChange={(e) => setPeasDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-dark bg-white text-xs font-medium focus:ring-2 focus:ring-coral/40"
                >
                  <option value="inventory">Autonomous StockSense AI Inventory Agent</option>
                  <option value="warehouse_robot">Automated Guided Vehicle (AGV) Warehouse Robot</option>
                  <option value="smart_retail">Smart Retail Automated Cashier & Kiosk</option>
                </select>
              </div>
            )}

            {/* Practical 2: PROLOG */}
            {selectedMethod === "prolog" && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-ink uppercase">
                  Prolog Query (Knowledge-base: inventory_rules.pl)
                </label>
                <textarea
                  rows={3}
                  value={prologQuery}
                  onChange={(e) => setPrologQuery(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-cream-dark bg-white focus:ring-2 focus:ring-coral/40"
                  placeholder="e.g. item(X, 'Electronics', _, Stock), Stock =< 5."
                />
                <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <span>Quick Presets:</span>
                  <button
                    onClick={() => setPrologQuery("needs_reorder(X).")}
                    className="underline text-coral"
                  >
                    needs_reorder(X).
                  </button>
                  <button
                    onClick={() => setPrologQuery("stock_risk_category(SKU, Category).")}
                    className="underline text-coral"
                  >
                    stock_risk_category/2
                  </button>
                </div>
              </div>
            )}

            {/* Practical 3: BFS / DFS */}
            {selectedMethod === "search" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">Algorithm</label>
                  <select
                    value={searchAlgo}
                    onChange={(e) => setSearchAlgo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-cream-dark text-xs font-bold"
                  >
                    <option value="BFS">Breadth-First Search (Queue)</option>
                    <option value="DFS">Depth-First Search (Stack)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">Start Node</label>
                  <input
                    type="text"
                    value={searchStart}
                    onChange={(e) => setSearchStart(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-cream-dark text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">Target Node</label>
                  <input
                    type="text"
                    value={searchTarget}
                    onChange={(e) => setSearchTarget(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-cream-dark text-xs font-medium"
                  />
                </div>
              </div>
            )}

            {/* Practical 4: 8-Puzzle A* */}
            {selectedMethod === "eight_puzzle" && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-ink uppercase block">
                  3x3 Initial State (0 represents the empty space)
                </label>
                <div className="grid grid-cols-3 gap-2 max-w-[180px]">
                  {puzzleState.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      min={0}
                      max={8}
                      value={val}
                      onChange={(e) => {
                        const newSt = [...puzzleState];
                        newSt[idx] = Number(e.target.value);
                        setPuzzleState(newSt);
                      }}
                      className={`w-12 h-12 text-center text-sm font-black rounded-lg border ${
                        val === 0 ? "bg-cream-dark text-ink-muted" : "bg-white text-plum"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setPuzzleState([1, 2, 3, 4, 0, 6, 7, 5, 8])}
                  className="text-xs font-bold text-coral underline"
                >
                  Reset Solvable Preset (4 steps from goal)
                </button>
              </div>
            )}

            {/* Practical 5: Minimax */}
            {selectedMethod === "minimax" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-ink uppercase">Player To Move:</span>
                  <div className="flex items-center gap-2">
                    {["X", "O"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setMinimaxPlayer(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold ${
                          minimaxPlayer === p ? "bg-coral text-white" : "bg-cream-light text-ink"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-ink-muted">Click tiles to edit board:</span>
                  <div className="grid grid-cols-3 gap-2 max-w-[180px]">
                    {minimaxBoard.map((val, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const next = [...minimaxBoard];
                          next[idx] = next[idx] === " " ? "X" : next[idx] === "X" ? "O" : " ";
                          setMinimaxBoard(next);
                        }}
                        className="w-12 h-12 rounded-lg bg-white border border-cream-dark font-black text-lg text-plum hover:bg-cream-light"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Practical 6: Fuzzy Fan Controller */}
            {selectedMethod === "fuzzy_fan" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">
                    Temperature: {fanTemp}°C
                  </label>
                  <input
                    type="range"
                    min={15}
                    max={45}
                    step={0.5}
                    value={fanTemp}
                    onChange={(e) => setFanTemp(Number(e.target.value))}
                    className="w-full accent-coral"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">
                    Humidity: {fanHum}%
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={95}
                    step={1}
                    value={fanHum}
                    onChange={(e) => setFanHum(Number(e.target.value))}
                    className="w-full accent-coral"
                  />
                </div>
              </div>
            )}

            {/* Practical 7: Mamdani vs Sugeno */}
            {selectedMethod === "mamdani_sugeno" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">
                    Input X (e.g. Stock Cover %): {compareX}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={compareX}
                    onChange={(e) => setCompareX(Number(e.target.value))}
                    className="w-full accent-coral"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">
                    Input Y (e.g. Demand Rate %): {compareY}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={compareY}
                    onChange={(e) => setCompareY(Number(e.target.value))}
                    className="w-full accent-coral"
                  />
                </div>
              </div>
            )}

            {/* Practical 8: Neuro-Fuzzy */}
            {selectedMethod === "neuro_fuzzy" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">
                    Sales Velocity: {nfVelocity} u/d
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={nfVelocity}
                    onChange={(e) => setNfVelocity(Number(e.target.value))}
                    className="w-full accent-coral"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">
                    Price Elasticity: {nfElasticity}
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    value={nfElasticity}
                    onChange={(e) => setNfElasticity(Number(e.target.value))}
                    className="w-full accent-coral"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">
                    Supplier Delay: {nfDelay} days
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={nfDelay}
                    onChange={(e) => setNfDelay(Number(e.target.value))}
                    className="w-full accent-coral"
                  />
                </div>
              </div>
            )}

            {/* Practical 9: Perceptron & Clustering */}
            {selectedMethod === "perceptron_clustering" && (
              <div>
                <label className="text-xs font-bold text-ink uppercase block mb-1">
                  Target K Clusters: {kClusters}
                </label>
                <div className="flex items-center gap-2">
                  {[2, 3, 4].map((k) => (
                    <button
                      key={k}
                      onClick={() => setKClusters(k)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold ${
                        kClusters === k ? "bg-coral text-white" : "bg-cream-light text-ink"
                      }`}
                    >
                      k = {k}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Practical 10: N-Gram SLM */}
            {selectedMethod === "ngram" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">Prompt Token</label>
                  <input
                    type="text"
                    value={ngramPrompt}
                    onChange={(e) => setNgramPrompt(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-cream-dark text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">N-Gram Degree</label>
                  <select
                    value={ngramN}
                    onChange={(e) => setNgramN(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-cream-dark text-xs font-bold"
                  >
                    <option value={2}>Bigram (N=2)</option>
                    <option value={3}>Trigram (N=3)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink uppercase block mb-1">Max Generation Tokens</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={ngramLength}
                    onChange={(e) => setNgramLength(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-cream-dark text-xs font-medium"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleExecute}
                disabled={executing}
                className="w-full py-3 rounded-xl bg-plum hover:bg-plum-light text-white font-bold text-xs transition shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play size={14} className={executing ? "animate-spin" : "fill-current"} />
                <span>{executing ? "Running Computation..." : "Run Algorithm"}</span>
              </button>
            </div>
          </div>

          {/* Results Display */}
          {error && (
            <div className="p-4 rounded-xl bg-coral/15 border border-coral/40 text-ink text-xs flex items-center gap-3">
              <AlertTriangle size={16} className="text-coral shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="bg-paper rounded-2xl p-6 border border-cream-dark/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-cream-dark/60">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-mint-dark" />
                  <span>Computed Demonstration Output</span>
                </h3>
                <span className="text-[11px] font-mono text-ink-muted">Status: Success (200 OK)</span>
              </div>

              {/* Formatted JSON view with highlight */}
              <div className="bg-aubergine-dark rounded-xl p-4 font-mono text-xs text-cream overflow-x-auto max-h-96">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
