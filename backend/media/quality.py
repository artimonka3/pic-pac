from dataclasses import dataclass
from io import BytesIO
from time import perf_counter

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from . import model
from .rules import MIN_EDGES, RULES


class UploadError(Exception):
    def __init__(self, code: str):
        self.code = code


@dataclass
class Prepared:
    image_format: str
    width: int
    height: int
    preview: bytes


@dataclass
class Decision:
    status: str
    reason_code: str | None = None
    warning_code: str | None = None
    metrics: dict | None = None


def decode(data: bytes) -> tuple[Image.Image, str]:
    if len(data) > RULES.max_bytes:
        raise UploadError("FILE_TOO_LARGE")
    try:
        with Image.open(BytesIO(data), formats=["JPEG", "PNG"]) as source:
            if getattr(source, "is_animated", False):
                raise UploadError("UNSUPPORTED_FORMAT")
            if source.width * source.height > RULES.max_pixels:
                raise UploadError("TOO_MANY_PIXELS")
            image = ImageOps.exif_transpose(source)
            if "A" in image.getbands() or "transparency" in image.info:
                rgba = image.convert("RGBA")
                rgb = Image.new("RGB", rgba.size, "white")
                rgb.paste(rgba, mask=rgba.getchannel("A"))
            else:
                rgb = image.convert("RGB")
            return rgb, source.format
    except Image.DecompressionBombError as exc:
        raise UploadError("TOO_MANY_PIXELS") from exc
    except UnidentifiedImageError as exc:
        code = "INVALID_IMAGE" if data.startswith((b"\xff\xd8", b"\x89PNG\r\n\x1a\n")) else "UNSUPPORTED_FORMAT"
        raise UploadError(code) from exc
    except (OSError, ValueError, SyntaxError) as exc:
        raise UploadError("INVALID_IMAGE") from exc


def prepare(data: bytes) -> Prepared:
    image, image_format = decode(data)
    width, height = image.size
    image.thumbnail((900, 900), Image.Resampling.LANCZOS)
    output = BytesIO()
    # Re-encoding without EXIF/ICC metadata leaves the original in private storage.
    image.save(output, format="JPEG", quality=80)
    return Prepared(image_format, width, height, output.getvalue())


def measure(data: bytes, service: str, width: int, height: int) -> Decision:
    started = perf_counter()
    min_long, min_short = MIN_EDGES[service]
    if max(width, height) < min_long or min(width, height) < min_short:
        return Decision("needs_replacement", reason_code="LOW_RESOLUTION", metrics={
            "elapsed_ms": round((perf_counter() - started) * 1000, 2),
        })

    image, _ = decode(data)
    image.thumbnail((RULES.analysis_edge, RULES.analysis_edge), Image.Resampling.LANCZOS)
    gray = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2GRAY)
    smoothed = cv2.GaussianBlur(gray, (3, 3), 0)
    laplacian = cv2.Laplacian(smoothed, cv2.CV_32F)
    dark = float(np.mean(gray <= RULES.dark_pixel))
    bright = float(np.mean(gray >= RULES.bright_pixel))
    p05, p95 = np.percentile(gray, [5, 95])
    dynamic_range = float(p95 - p05)
    tile_scores = []
    for row, lap_row in zip(np.array_split(smoothed, 3), np.array_split(laplacian, 3), strict=True):
        for tile, lap_tile in zip(np.array_split(row, 3, axis=1), np.array_split(lap_row, 3, axis=1), strict=True):
            if tile.std() >= RULES.texture_std:
                tile_scores.append(float(lap_tile.var()))
    sharpness = max(tile_scores, default=None)
    metrics = {
        "dark_fraction": dark,
        "bright_fraction": bright,
        "p05": float(p05),
        "p95": float(p95),
        "dynamic_range": dynamic_range,
        "laplacian_variance": float(laplacian.var()),
        "informative_tile_scores": tile_scores,
    }

    decision = decide(dark, bright, dynamic_range, sharpness, len(tile_scores), image)
    metrics["elapsed_ms"] = round((perf_counter() - started) * 1000, 2)
    decision.metrics = metrics
    return decision


def decide(dark: float, bright: float, dynamic_range: float, sharpness: float | None,
           tiles: int, image: Image.Image) -> Decision:
    exposure = max(dark, bright)
    if exposure >= RULES.exposure_warning and dynamic_range <= RULES.narrow_range:
        code = "TOO_DARK" if dark >= bright else "TOO_BRIGHT"
        if RULES.block_severe_exposure and exposure >= RULES.exposure_severe:
            return Decision("needs_replacement", reason_code=code)
        return Decision("passed", warning_code=code)

    if sharpness is None or tiles < RULES.min_informative_tiles or sharpness >= RULES.sharpness_warning:
        return Decision("passed")
    if sharpness < RULES.sharpness_severe:
        if RULES.block_severe_blur:
            return Decision("needs_replacement", reason_code="BLURRY")
        return Decision("passed", warning_code="BLURRY")

    sample = ImageOps.pad(image, (224, 224), Image.Resampling.LANCZOS, color=(0, 0, 0))
    try:
        if model.classify_borderline(np.asarray(sample)) == "sharp":
            return Decision("passed")
    except Exception:
        # Unavailable inference leaves the rule-based decision intact.
        pass
    return Decision("passed", warning_code="BLURRY")
