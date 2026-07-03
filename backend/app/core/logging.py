import logging
import json
from app.core.config import get_settings

settings = get_settings()

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "level": record.levelname,
            "name": record.name,
            "msg": record.getMessage(),
            "time": self.formatTime(record, self.datefmt)
        }
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logging():
    logger = logging.getLogger("neuro")
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler()
    if settings.NEURO_ENV == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        
    logger.addHandler(handler)
    return logger
