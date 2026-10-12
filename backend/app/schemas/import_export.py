from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CSVRowError(BaseModel):
    row_number: int
    column: Optional[str] = None
    value: Optional[str] = None
    error: str

class CSVPreviewResponse(BaseModel):
    filename: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    preview_data: List[Dict[str, Any]]
    errors: List[CSVRowError]
    is_valid_for_commit: bool

class CSVCommitResponse(BaseModel):
    batch_id: int
    batch_type: str
    filename: str
    total_rows: int
    rows_imported: int
    rows_rejected: int
    status: str
    errors: List[CSVRowError] = []

class ImportBatchResponse(BaseModel):
    id: int
    batch_type: str
    filename: str
    imported_at: datetime
    status: str
    rows_total: int
    rows_imported: int
    rows_rejected: int
    error_report_json: Optional[str] = None
    file_hash: Optional[str] = None

    class Config:
        from_attributes = True
