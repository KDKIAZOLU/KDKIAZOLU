"""Kokoro neural voice for make_audio.py (`python3 make_audio.py kokoro`).

Needs github.com reachable and: pip install kokoro-onnx soundfile
Weights are the Kokoro-82M v1.0 files published with kokoro-onnx's GitHub release.
"""
import os
import urllib.request

import soundfile as sf

REPO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
CACHE = os.path.join(os.path.dirname(__file__), ".kokoro")

# Spoken-only phoneme fixes; narration.json keeps the real spelling for captions.
# espeak says McKinney as "muh-KIN-ee"; use a light, unstressed "mac" with the
# stress kept on "KIN" and no doubled k.
PRONOUNCE = {"mə kˈɪni": "mækˈɪni"}

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
    engine = _load()
    phonemes = engine.tokenizer.phonemize(text, "en-us")
    for default, spoken in PRONOUNCE.items():
        phonemes = phonemes.replace(default, spoken)
    samples, sr = engine.create(phonemes, voice=VOICE, speed=0.95, is_phonemes=True)
    sf.write(out_path, samples, sr)
