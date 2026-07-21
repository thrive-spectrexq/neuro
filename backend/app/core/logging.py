import json
import logging
import sys
from typing import Any

from app.core.config import get_settings

settings = get_settings()

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record: dict[str, Any] = {
            "level": record.levelname,
            "name": record.name,
            "msg": record.getMessage(),
            "time": self.formatTime(record, self.datefmt)
        }
        
        # Include extra attributes that were passed using `extra={...}`
        for key, value in record.__dict__.items():
            if key not in {"args", "asctime", "created", "exc_info", "exc_text", "filename", "funcName", "levelname", "levelno", "lineno", "module", "msecs", "message", "msg", "name", "pathname", "process", "processName", "relativeCreated", "stack_info", "thread", "threadName", "taskName"}:
                log_record[key] = value

        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
            
        return json.dumps(log_record)

def setup_logging() -> logging.Logger:
    logger = logging.getLogger("neuro")
    if logger.handlers:
        return logger

    log_level = getattr(logging, getattr(settings, "LOG_LEVEL", "INFO").upper(), logging.INFO)
    logger.setLevel(log_level)
    
    handler = logging.StreamHandler(sys.stdout)
    log_format = getattr(settings, "LOG_FORMAT", "text").lower()
    
    if log_format == "json" or settings.NEURO_ENV == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        
    logger.addHandler(handler)
    
    # Set the root logger as well to capture uvicorn/fastapi logs if needed
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        root_logger.addHandler(handler)
        root_logger.setLevel(log_level)
        
    return logger

def get_logger(name: str) -> logging.Logger:
    """Get a structured logger for the specific module."""
    return logging.getLogger(f"neuro.{name}")
