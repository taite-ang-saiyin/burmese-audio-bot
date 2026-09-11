# Colab Quick Start

```python
%cd /content/person2_qwen_rag
```

```bash
!nvidia-smi
!pip install -q -r requirements.txt
!pytest -q
!uvicorn app.main:app --host 0.0.0.0 --port 8002
```
