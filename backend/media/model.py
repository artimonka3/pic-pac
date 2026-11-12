from typing import Literal

import numpy as np

ModelDecision = Literal["sharp", "blurry", "uncertain"]


def classify_borderline(rgb_224: np.ndarray) -> ModelDecision | None:
    """Integration point for a future local classifier. None keeps the rules' warning."""
    return None
