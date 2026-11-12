from io import BytesIO

import pytest
from PIL import Image

from backend.media import model
from backend.media.quality import UploadError, decide, measure, prepare
from backend.media.rules import RULES


def photo(size=(1800, 1200), color=(85, 85, 85), image_format="JPEG", orientation=1):
    image = Image.new("RGB", size, color)
    exif = Image.Exif()
    exif[274] = orientation
    output = BytesIO()
    image.save(output, image_format, exif=exif)
    return output.getvalue()


def test_original_exif_and_preview():
    result = prepare(photo((2100, 1300), orientation=6))
    assert (result.width, result.height) == (1300, 2100)
    assert result.image_format == "JPEG"
    with Image.open(BytesIO(result.preview)) as preview:
        assert max(preview.size) == 900
        assert not preview.getexif()


@pytest.mark.parametrize(("data", "code"), [
    (b"GIF89a", "UNSUPPORTED_FORMAT"),
    (b"\xff\xd8broken", "INVALID_IMAGE"),
    (b"0" * (RULES.max_bytes + 1), "FILE_TOO_LARGE"),
])
def test_upload_errors(data, code):
    with pytest.raises(UploadError) as raised:
        prepare(data)
    assert raised.value.code == code


def test_service_resolution_and_exposure_are_independent():
    data = photo((1400, 1000), (4, 4, 4))
    book = measure(data, "book", 1400, 1000)
    printing = measure(data, "print", 1400, 1000)
    assert (book.status, book.warning_code) == ("passed", "TOO_DARK")
    assert (printing.status, printing.reason_code) == ("needs_replacement", "LOW_RESOLUTION")


def test_model_hook_only_for_borderline_blur(monkeypatch):
    image = Image.new("RGB", (400, 100), "white")
    calls = []

    def model_stub(sample):
        calls.append(sample.shape)
        raise RuntimeError("offline")

    monkeypatch.setattr(model, "classify_borderline", model_stub)
    assert decide(0, 0, 100, 40, 3, image).warning_code == "BLURRY"
    assert decide(0, 0, 100, 10, 3, image).warning_code == "BLURRY"
    assert decide(0, 0, 100, 10, 1, image).warning_code is None
    assert decide(.98, 0, 12, 40, 3, image).warning_code == "TOO_DARK"
    assert calls == [(224, 224, 3)]
