import os
import shutil
import subprocess
import tempfile
import json
from typing import List, Dict, Any, Optional, Tuple
from app.core.config import settings
from app.schemas.ai import PrologStatusResponse, PrologQueryResponse

class PrologEngine:
    RULES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../prolog/inventory_rules.pl"))

    @classmethod
    def get_swipl_binary(cls) -> Optional[str]:
        # 1. Check configured path in settings
        if settings.SWIPL_PATH and os.path.isfile(settings.SWIPL_PATH):
            return settings.SWIPL_PATH
        
        # 2. Check system PATH
        which_path = shutil.which("swipl")
        if which_path:
            return which_path

        # 3. Common Windows locations
        candidates = [
            r"C:\Program Files\swipl\bin\swipl.exe",
            r"C:\Program Files (x86)\swipl\bin\swipl.exe",
            r"C:\swipl\bin\swipl.exe",
            "/usr/bin/swipl",
            "/usr/local/bin/swipl",
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c

        return None

    @classmethod
    def check_status(cls) -> PrologStatusResponse:
        binary = cls.get_swipl_binary()
        rules_exist = os.path.isfile(cls.RULES_PATH)

        if not binary:
            return PrologStatusResponse(
                available=False,
                runtime="SWI-Prolog",
                version=None,
                binary_path=None,
                rules_file=cls.RULES_PATH,
                rules_loaded=False,
                sample_query_success=False,
                diagnostic_message="SWI-Prolog binary not found. Install SWI-Prolog or specify SWIPL_PATH.",
            )

        try:
            ver_res = subprocess.run([binary, "--version"], capture_output=True, text=True, timeout=5)
            version_str = ver_res.stdout.strip()
            
            # Run test query
            test_res = subprocess.run(
                [binary, "-g", "writeln(ok), halt."],
                capture_output=True,
                text=True,
                timeout=5
            )
            query_success = (test_res.returncode == 0 and "ok" in test_res.stdout)

            return PrologStatusResponse(
                available=True,
                runtime="SWI-Prolog",
                version=version_str,
                binary_path=binary,
                rules_file=cls.RULES_PATH,
                rules_loaded=rules_exist,
                sample_query_success=query_success,
                diagnostic_message="SWI-Prolog runtime and inventory rules verified successfully." if query_success else test_res.stderr,
            )
        except Exception as e:
            return PrologStatusResponse(
                available=False,
                runtime="SWI-Prolog",
                version=None,
                binary_path=binary,
                rules_file=cls.RULES_PATH,
                rules_loaded=rules_exist,
                sample_query_success=False,
                diagnostic_message=f"Error executing swipl: {str(e)}",
            )

    @classmethod
    def run_query(cls, query_goal: str, facts: Optional[List[str]] = None) -> PrologQueryResponse:
        binary = cls.get_swipl_binary()
        if not binary:
            return PrologQueryResponse(
                success=False,
                query=query_goal,
                results=[],
                output="",
                error="SWI-Prolog binary is not available on this system.",
            )

        rules_file_forward = cls.RULES_PATH.replace("\\", "/")
        
        # Build Prolog command script
        prolog_cmds = [f":- ['{rules_file_forward}']."]
        if facts:
            for f in facts:
                prolog_cmds.append(f)

        # Wrap query in a clean output runner that ALWAYS halts and never hangs on failure
        wrapped_goal = f"""catch(({query_goal} -> true ; writeln('NO_SOLUTION')), Error, (write('PROLOG_ERROR: '), writeln(Error), halt(1))), halt(0)."""

        with tempfile.NamedTemporaryFile("w", suffix=".pl", delete=False) as tf:
            tf.write("\n".join(prolog_cmds) + "\n")
            temp_script = tf.name

        try:
            temp_script_forward = temp_script.replace("\\", "/")
            cmd = [
                binary,
                "-q",
                "-t", "halt",
                "-s", temp_script_forward,
                "-g", wrapped_goal,
            ]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                stdin=subprocess.DEVNULL,
                timeout=10,
            )
            
            output = result.stdout.strip()
            err = result.stderr.strip()

            return PrologQueryResponse(
                success=(result.returncode == 0),
                query=query_goal,
                results=[],
                output=output,
                error=err if result.returncode != 0 else None,
            )
        except Exception as e:
            return PrologQueryResponse(
                success=False,
                query=query_goal,
                results=[],
                output="",
                error=str(e),
            )
        finally:
            if os.path.isfile(temp_script):
                try:
                    os.remove(temp_script)
                except OSError:
                    pass

    @classmethod
    def evaluate_inventory_state(cls, products_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Injects active inventory state facts into Prolog and executes inference rules."""
        binary = cls.get_swipl_binary()
        if not binary or not products_data:
            return []

        # Generate facts: product(Sku, CurrentStock, ReorderThreshold, LeadTimeDays, DailyDemand).
        facts = []
        for p in products_data:
            sku = p["sku"].replace("'", "")
            stock = int(p["current_stock"])
            threshold = int(p["reorder_threshold"])
            lead = int(p["lead_time_days"])
            demand = float(p.get("daily_demand", 1.0))
            facts.append(f"product('{sku}', {stock}, {threshold}, {lead}, {demand:.2f}).")

        # Query all reorders and overstocks
        query = "findall([S, R], reorder_required(S, R), Reorders), format('REORDERS:~w~n', [Reorders]), findall(O, overstock_review(O), Overstocks), format('OVERSTOCKS:~w~n', [Overstocks])"
        
        resp = cls.run_query(query, facts=facts)
        results = []
        if resp.success and "REORDERS:" in resp.output:
            for line in resp.output.splitlines():
                if line.startswith("REORDERS:"):
                    raw = line.replace("REORDERS:", "").strip()
                    # Parse Prolog list output e.g. [[SKU-1, Reason], [SKU-2, Reason]]
                    results.append({"type": "reorders", "raw": raw})
                elif line.startswith("OVERSTOCKS:"):
                    raw = line.replace("OVERSTOCKS:", "").strip()
                    results.append({"type": "overstocks", "raw": raw})

        return results
