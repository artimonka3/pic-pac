from dataclasses import dataclass


@dataclass(frozen=True)
class Rules:
    version: str = "demo-v1"
    max_bytes: int = 12 * 1024 * 1024
    max_pixels: int = 24_000_000
    analysis_edge: int = 768
    dark_pixel: int = 20
    bright_pixel: int = 235
    exposure_warning: float = 0.75
    exposure_severe: float = 0.93
    narrow_range: float = 40
    texture_std: float = 12
    min_informative_tiles: int = 2
    sharpness_warning: float = 65
    sharpness_severe: float = 28
    block_severe_exposure: bool = False
    block_severe_blur: bool = False


RULES = Rules()

# Minimum long and short edges. These demo thresholds cover each service.
MIN_EDGES = {"book": (1200, 800), "print": (1800, 1200)}
MAX_ATTEMPTS = 3
