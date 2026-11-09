import os
from dotenv import load_dotenv

load_dotenv()

APP_NAME = "News Sentiment Analysis"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.8-flash"
)

HF_MODEL = os.getenv(
    "HF_MODEL",
    "w11wo/indonesian-roberta-base-sentiment-classifier"
)

CONFIDENCE_THRESHOLD = 0.60
BATCH_SIZE = 16
MAX_TEXT_LENGTH = 512