from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import pyembroidery
import tempfile, os
from typing import Literal

app = FastAPI(title="Embroidery Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

PX_PER_MM = 3.78          # must match frontend canvasStore
TENTH_MM_PER_PX = 10 / PX_PER_MM  # pyembroidery uses 1/10 mm units


class StitchPoint(BaseModel):
    x: float
    y: float


class ExportRequest(BaseModel):
    stitches: list[StitchPoint]
    format: Literal["dst", "pes", "vp3", "exp", "jef", "svg"] = "dst"


MIME = {
    "dst": "application/octet-stream",
    "pes": "application/octet-stream",
    "vp3": "application/octet-stream",
    "exp": "application/octet-stream",
    "jef": "application/octet-stream",
    "svg": "image/svg+xml",
}

EXT_MAP = {
    "dst": ".dst",
    "pes": ".pes",
    "vp3": ".vp3",
    "exp": ".exp",
    "jef": ".jef",
    "svg": ".svg",
}


@app.post("/export")
def export_design(req: ExportRequest):
    if not req.stitches:
        raise HTTPException(400, "No stitches provided")

    pattern = pyembroidery.EmbPattern()

    for i, pt in enumerate(req.stitches):
        # Convert world-px (centered at 0,0) → 1/10 mm
        x = pt.x * TENTH_MM_PER_PX
        y = pt.y * TENTH_MM_PER_PX
        cmd = pyembroidery.STITCH if i > 0 else pyembroidery.JUMP
        pattern.add_stitch_absolute(cmd, x, y)

    pattern.add_command(pyembroidery.END)

    fmt = req.format.lower()
    suffix = EXT_MAP.get(fmt, f".{fmt}")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name

    try:
        pyembroidery.write(pattern, tmp_path)
        with open(tmp_path, "rb") as f:
            data = f.read()
    finally:
        os.unlink(tmp_path)

    mime = MIME.get(fmt, "application/octet-stream")
    filename = f"embroidery{suffix}"
    return Response(
        content=data,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/health")
def health():
    return {"status": "ok"}
