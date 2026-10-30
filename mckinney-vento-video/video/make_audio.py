"""Generate per-scene voiceover WAVs and src/durations.json from narration.json."""
import json, subprocess, sys

ENGINE = sys.argv[1] if len(sys.argv) > 1 else "rhvoice"
scenes = json.load(open("narration.json"))
out = {}
for s in scenes:
    raw = f"/tmp/{s['id']}.wav"
    dst = f"public/audio/{s['id']}.wav"
    if ENGINE == "rhvoice":
        subprocess.run(["RHVoice-test", "-p", "slt", "-r", "95", "-o", raw],
                       input=s["text"].encode(), check=True, capture_output=True)
    else:
        from kokoro_tts import synth  # noqa: local helper, see kokoro_tts.py
        synth(s["text"], raw)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                    "loudnorm=I=-16:TP=-1.5,aresample=48000", "-ac", "2", dst], check=True)
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                       "format=duration", "-of", "csv=p=0", dst]))
    out[s["id"]] = round(d, 2)
json.dump(out, open("src/durations.json", "w"), indent=1)
print(out, round(sum(out.values()), 1))
