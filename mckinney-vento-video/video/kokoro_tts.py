"""Kokoro neural voice for make_audio.py (`python3 make_audio.py kokoro`).

Needs huggingface.co reachable and: pip install kokoro-onnx soundfile numpy
Weights come from the onnx-community/Kokoro-82M-v1.0-ONNX repo on Hugging Face.
"""
import os
import urllib.request

import numpy as np
import soundfile as sf

REPO = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main"
VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
CACHE = os.path.join(os.path.dirname(__file__), ".kokoro")

_engine = None


def _fetch(path: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, os.path.basename(path))
    if not os.path.exists(dst):
        urllib.request.urlretrieve(f"{REPO}/{path}", dst)
    return dst


def _load():
    global _engine
    if _engine is None:
        from kokoro_onnx import Kokoro

        model = _fetch("onnx/model_quantized.onnx")
        style = np.fromfile(_fetch(f"voices/{VOICE}.bin"), dtype=np.float32)
        voices = os.path.join(CACHE, "voices.npz")
        np.savez(voices, **{VOICE: style.reshape(-1, 1, 256)})
        _engine = Kokoro(model, voices)
    return _engine


def synth(text: str, out_path: str) -> None:
    samples, sr = _load().create(text, voice=VOICE, speed=0.95, lang="en-us")
    sf.write(out_path, samples, sr)
