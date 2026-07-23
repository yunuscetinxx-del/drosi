# Local AI with Ollama

Drosi can use a local open-source model without a paid API. When Ollama is running and the configured model is installed, it automatically becomes the active provider for image analysis, lesson analysis, and lesson chat.

## Recommended model

Use Qwen2.5-VL 7B. It understands images, reads printed text in many languages, and can also answer lesson questions.

```powershell
ollama pull qwen2.5vl:7b
```

Ollama listens locally on `http://127.0.0.1:11434` by default. The app detects the model automatically; no API key is required.

## Hardware note

The model download is several GB. It will run on CPU if GPU acceleration is unavailable, which is slower but keeps lesson images and prompts on the local machine.

## Configuration

Optional environment variables:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5vl:7b
```

## OCR and automatic text markers

Qwen2.5-VL can read and transcribe an image. For precise word bounding boxes and automatic word-to-image markers, Drosi will additionally need a local OCR engine such as PaddleOCR. This is a separate local pipeline because vision-language models normally return text but not reliable coordinates for every word.