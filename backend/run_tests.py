import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest

if __name__ == "__main__":
    exit_code = pytest.main(["tests", "-v", "-s"])
    sys.exit(exit_code)
