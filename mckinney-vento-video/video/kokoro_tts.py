"""Kokoro neural voice for make_audio.py (`python3 make_audio.py kokoro`).

Needs github.com reachable and: pip install kokoro-onnx soundfile
Weights are the Kokoro-82M v1.0 files published with kokoro-onnx's GitHub release.
"""
import os
import re
import urllib.request

import soundfile as sf

REPO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
CACHE = os.path.join(os.path.dirname(__file__), ".kokoro")

# Spoken-only respellings; narration.json keeps the real spelling for captions.
PRONOUNCE = {r"\bMcKinney": "MacKinney"}  # "Mc" as "Mac", not "muh"

_engine = None


def _fetch(name: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, name)
    if not os.path.exists(dst):
        urllib.request.urlretrieve(f"{REPO}/{name}", dst)
    return dst


def _load():
    global _engine
    if _engine is None:
        from kokoro_onnx import Kokoro

        _engine = Kokoro(_fetch("kokoro-v1.0.onnx"), _fetch("voices-v1.0.bin"))
    return _engine


def synth(text: str, out_path: str) -> None:
    for pattern, spoken in PRONOUNCE.items():
        text = re.sub(pattern, spoken, text)
    samples, sr = _load().create(text, voice=VOICE, speed=0.95, lang="en-us")
    sf.write(out_path, samples, sr)
