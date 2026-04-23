import asyncio
import hashlib
import json
import logging
import os
import shutil
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from pymongo import MongoClient
from supabase import Client, create_client

ACNE_CLASS_NAMES = ["Blackheads", "Cyst", "Papules", "Pustules", "Whiteheads"]
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
DENTAL_DEFAULT_CLASS_NAMES = [
    "BDC-BDR",
    "Caries",
    "Fractured Teeth",
    "Healthy Teeth",
    "Impacted teeth",
    "Infection",
]

logger = logging.getLogger(__name__)


RecommendationType = Literal[
    "fitness",
    "sleep",
    "nutrition",
    "medication",
    "doctor",
    "disease_risk",
    "lab_test",
]
PriorityType = Literal["high", "medium", "low"]


class RecommendationItem(BaseModel):
    type: RecommendationType
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=8, max_length=600)
    priority: PriorityType
    timeframe: str = Field(min_length=2, max_length=80)
    doctorId: Optional[str] = None
    specialization: Optional[str] = None
    conditions: Optional[List[str]] = None


class GraphState(TypedDict, total=False):
    patient_id: str
    context: Dict[str, Any]
    recommendations: List[Dict[str, Any]]


class AcnePredictionResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    model_status: Dict[str, Any]


class DentalPredictionResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    model_status: Dict[str, Any]


class RecommendationService:
    def __init__(self) -> None:
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.supabase_table = os.getenv("RECOMMENDATIONS_TABLE", "patient_recommendations")
        self.batch_delay_seconds = int(os.getenv("RECOMMENDATION_BATCH_DELAY_SECONDS", "30"))
        self.model_drive_url = os.getenv(
            "RECOMMENDATIONS_MODEL_DRIVE_URL",
            "https://drive.google.com/file/d/16HH783V215USXVVIvzlIugR6DWdK8Tbf/view?usp=sharing",
        ).strip()
        default_model_path = Path(__file__).resolve().parent.parent / "models" / "recommendation_model.pth"
        model_path_value = os.getenv("RECOMMENDATIONS_MODEL_PATH")
        if model_path_value:
            configured_path = Path(model_path_value)
            self.model_path = configured_path if configured_path.is_absolute() else default_model_path.parent / configured_path
        else:
            self.model_path = default_model_path

        self.dental_model_drive_url = os.getenv(
            "DENTAL_MODEL_DRIVE_URL",
            "https://drive.google.com/file/d/1cEK8DkVn4abbQ4D4BmXWUSiwx9I53Wh1/view",
        ).strip()
        default_dental_model_path = Path(__file__).resolve().parent.parent / "models" / "dental_model" / "best_model.pth"
        dental_model_path_value = os.getenv("DENTAL_MODEL_PATH")
        if dental_model_path_value:
            configured_dental_model_path = Path(dental_model_path_value)
            self.dental_model_path = (
                configured_dental_model_path
                if configured_dental_model_path.is_absolute()
                else default_dental_model_path.parent / configured_dental_model_path
            )
        else:
            self.dental_model_path = default_dental_model_path

        default_dental_metadata_path = self.dental_model_path.parent / "model_metadata.json"
        dental_metadata_path_value = os.getenv("DENTAL_MODEL_METADATA_PATH")
        if dental_metadata_path_value:
            configured_dental_metadata_path = Path(dental_metadata_path_value)
            self.dental_metadata_path = (
                configured_dental_metadata_path
                if configured_dental_metadata_path.is_absolute()
                else default_dental_metadata_path.parent / configured_dental_metadata_path
            )
        else:
            self.dental_metadata_path = default_dental_metadata_path

        self.model_artifact: Any = None
        self.acne_model: Any = None
        self.dental_model_artifact: Any = None
        self.dental_model: Any = None
        self.dental_class_names: List[str] = DENTAL_DEFAULT_CLASS_NAMES.copy()
        self.dental_img_size: int = 224
        self.dental_imagenet_mean: List[float] = IMAGENET_MEAN.copy()
        self.dental_imagenet_std: List[float] = IMAGENET_STD.copy()
        self.model_metadata: Dict[str, Any] = {
            "status": "pending",
            "path": str(self.model_path),
            "source_url": self.model_drive_url or None,
            "downloaded": False,
            "loaded_via": None,
            "artifact_type": None,
            "loaded_at": None,
            "size_bytes": None,
            "error": None,
        }
        self.dental_model_metadata: Dict[str, Any] = {
            "status": "pending",
            "path": str(self.dental_model_path),
            "metadata_path": str(self.dental_metadata_path),
            "source_url": self.dental_model_drive_url or None,
            "downloaded": False,
            "loaded_via": None,
            "artifact_type": None,
            "loaded_at": None,
            "size_bytes": None,
            "error": None,
        }

        if not self.supabase_url or not self.supabase_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.llm = ChatGroq(
            api_key=self.groq_api_key,
            model=self.groq_model,
            temperature=0.1,
        )

        self.mongo_client: Optional[MongoClient] = None
        self.mongo_db = None
        self._setup_mongo()

        self._run_lock = asyncio.Lock()
        self.graph = self._build_graph()

    async def ensure_model_ready(self) -> Dict[str, Any]:
        if self.model_artifact is not None and self.model_metadata.get("status") == "ready":
            return self.get_model_status()

        if not self.model_drive_url:
            self.model_metadata.update(
                status="unconfigured",
                error="RECOMMENDATIONS_MODEL_DRIVE_URL is not set",
            )
            logger.warning("Recommendation model download URL is not configured")
            return self.get_model_status()

        try:
            await asyncio.to_thread(self._ensure_model_file)
            await asyncio.to_thread(self._load_model_artifact)
            await asyncio.to_thread(self._prepare_acne_model)
            self.model_metadata.update(
                status="ready",
                error=None,
                loaded_at=datetime.now(timezone.utc).isoformat(),
            )
            logger.info("Recommendation model ready: %s", self.model_path)
        except Exception as exc:
            self.model_metadata.update(
                status="failed",
                error=str(exc),
            )
            logger.warning("Recommendation model bootstrap failed: %s", exc)

        return self.get_model_status()

    def get_model_status(self) -> Dict[str, Any]:
        return {
            **self.model_metadata,
            "loaded": self.model_artifact is not None,
            "path": str(self.model_path),
            "source_url": self.model_drive_url or None,
        }

    async def ensure_dental_model_ready(self) -> Dict[str, Any]:
        if self.dental_model is not None and self.dental_model_metadata.get("status") == "ready":
            return self.get_dental_model_status()

        if not self.dental_model_drive_url:
            self.dental_model_metadata.update(
                status="unconfigured",
                error="DENTAL_MODEL_DRIVE_URL is not set",
            )
            logger.warning("Dental model download URL is not configured")
            return self.get_dental_model_status()

        try:
            await asyncio.to_thread(self._ensure_dental_model_files)
            await asyncio.to_thread(self._hydrate_dental_metadata_from_file)
            await asyncio.to_thread(self._load_dental_model_artifact)
            await asyncio.to_thread(self._prepare_dental_model)
            self.dental_model_metadata.update(
                status="ready",
                error=None,
                loaded_at=datetime.now(timezone.utc).isoformat(),
            )
            logger.info("Dental model ready: %s", self.dental_model_path)
        except Exception as exc:
            self.dental_model_metadata.update(
                status="failed",
                error=str(exc),
            )
            logger.warning("Dental model bootstrap failed: %s", exc)

        return self.get_dental_model_status()

    def get_dental_model_status(self) -> Dict[str, Any]:
        return {
            **self.dental_model_metadata,
            "loaded": self.dental_model is not None,
            "path": str(self.dental_model_path),
            "metadata_path": str(self.dental_metadata_path),
            "source_url": self.dental_model_drive_url or None,
            "class_names": self.dental_class_names,
            "img_size": self.dental_img_size,
        }

    def _ensure_model_file(self) -> None:
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        if self.model_path.exists() and self.model_path.stat().st_size > 0:
            self.model_metadata["downloaded"] = False
            self.model_metadata["size_bytes"] = self.model_path.stat().st_size
            logger.info("Recommendation model already available at %s", self.model_path)
            return

        self._download_model_from_drive()

    def _download_model_from_drive(self) -> None:
        try:
            import gdown
        except ImportError as exc:
            raise RuntimeError("gdown is required to download the recommendation model") from exc

        logger.info("Downloading recommendation model from Google Drive to %s", self.model_path)
        downloaded_path = gdown.download(
            url=self.model_drive_url,
            output=str(self.model_path),
            quiet=False,
            fuzzy=True,
        )

        if not downloaded_path or not self.model_path.exists() or self.model_path.stat().st_size == 0:
            raise RuntimeError(f"Failed to download recommendation model from {self.model_drive_url}")

        self.model_metadata["downloaded"] = True
        self.model_metadata["size_bytes"] = self.model_path.stat().st_size

    def _ensure_dental_model_files(self) -> None:
        self.dental_model_path.parent.mkdir(parents=True, exist_ok=True)

        has_model = self.dental_model_path.exists() and self.dental_model_path.stat().st_size > 0
        has_metadata = self.dental_metadata_path.exists() and self.dental_metadata_path.stat().st_size > 0

        if not has_model or not has_metadata:
            discovered_model, discovered_metadata = self._find_dental_artifacts(self.dental_model_path.parent)

            if discovered_model and (not has_model or discovered_model.resolve() != self.dental_model_path.resolve()):
                self.dental_model_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(discovered_model, self.dental_model_path)
                has_model = self.dental_model_path.exists() and self.dental_model_path.stat().st_size > 0

            if discovered_metadata and (not has_metadata or discovered_metadata.resolve() != self.dental_metadata_path.resolve()):
                self.dental_metadata_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(discovered_metadata, self.dental_metadata_path)
                has_metadata = self.dental_metadata_path.exists() and self.dental_metadata_path.stat().st_size > 0

        if has_model:
            self.dental_model_metadata["downloaded"] = False
            self.dental_model_metadata["size_bytes"] = self.dental_model_path.stat().st_size
            logger.info("Dental model already available at %s", self.dental_model_path)
            if not has_metadata:
                logger.warning("Dental metadata file not found at %s. Falling back to defaults.", self.dental_metadata_path)
            return

        self._download_dental_model_from_drive()

    def _find_dental_artifacts(self, root: Path) -> tuple[Optional[Path], Optional[Path]]:
        if not root.exists():
            return None, None

        model_candidates = [
            path
            for path in root.rglob("*.pth")
            if path.is_file() and path.stat().st_size > 0
        ]

        prioritized_models: List[Path] = []
        for preferred_name in ("best_model.pth", "dental_model_weights.pth"):
            prioritized_models.extend([path for path in model_candidates if path.name == preferred_name])

        if not prioritized_models:
            prioritized_models = model_candidates

        metadata_candidates = [
            path
            for path in root.rglob("model_metadata.json")
            if path.is_file() and path.stat().st_size > 0
        ]

        selected_model = prioritized_models[0] if prioritized_models else None
        selected_metadata = metadata_candidates[0] if metadata_candidates else None
        return selected_model, selected_metadata

    def _download_dental_model_from_drive(self) -> None:
        try:
            import gdown
        except ImportError as exc:
            raise RuntimeError("gdown is required to download the dental model") from exc

        logger.info("Downloading dental model bundle from Google Drive")
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_target = Path(temp_dir) / "dental_model_bundle"
            downloaded_path = gdown.download(
                url=self.dental_model_drive_url,
                output=str(temp_target),
                quiet=False,
                fuzzy=True,
            )

            if not downloaded_path:
                raise RuntimeError(f"Failed to download dental model from {self.dental_model_drive_url}")

            downloaded_file = Path(downloaded_path)
            if not downloaded_file.exists() or downloaded_file.stat().st_size == 0:
                raise RuntimeError(f"Downloaded dental artifact is empty from {self.dental_model_drive_url}")

            if zipfile.is_zipfile(downloaded_file):
                extract_dir = Path(temp_dir) / "dental_model_extracted"
                extract_dir.mkdir(parents=True, exist_ok=True)
                with zipfile.ZipFile(downloaded_file, "r") as archive:
                    archive.extractall(extract_dir)

                discovered_model, discovered_metadata = self._find_dental_artifacts(extract_dir)

                if not discovered_model:
                    raise RuntimeError("Dental model ZIP does not contain a supported model file")

                self.dental_model_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(discovered_model, self.dental_model_path)

                if discovered_metadata:
                    self.dental_metadata_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(discovered_metadata, self.dental_metadata_path)
            else:
                self.dental_model_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(downloaded_file, self.dental_model_path)

            if not self.dental_model_path.exists() or self.dental_model_path.stat().st_size == 0:
                raise RuntimeError("Dental model file is missing after download/extract")

            if not self.dental_metadata_path.exists() or self.dental_metadata_path.stat().st_size == 0:
                logger.warning("Dental metadata file not found at %s. Falling back to defaults.", self.dental_metadata_path)

            self.dental_model_metadata["downloaded"] = True
            self.dental_model_metadata["size_bytes"] = self.dental_model_path.stat().st_size

    def _hydrate_dental_metadata_from_file(self) -> None:
        if not self.dental_metadata_path.exists() or self.dental_metadata_path.stat().st_size == 0:
            return

        try:
            metadata = json.loads(self.dental_metadata_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning("Unable to parse dental metadata %s: %s", self.dental_metadata_path, exc)
            return

        class_names = metadata.get("class_names")
        if isinstance(class_names, list) and class_names and all(isinstance(item, str) for item in class_names):
            self.dental_class_names = class_names

        img_size = metadata.get("img_size")
        if isinstance(img_size, int) and img_size > 0:
            self.dental_img_size = img_size

        mean = metadata.get("imagenet_mean")
        if isinstance(mean, list) and len(mean) == 3:
            try:
                self.dental_imagenet_mean = [float(value) for value in mean]
            except Exception:
                pass

        std = metadata.get("imagenet_std")
        if isinstance(std, list) and len(std) == 3:
            try:
                self.dental_imagenet_std = [float(value) for value in std]
            except Exception:
                pass

    def _load_model_artifact(self) -> None:
        suffix = self.model_path.suffix.lower()
        artifact: Any = None
        loaded_via: Optional[str] = None

        if suffix in {".pt", ".pth", ".bin"}:
            try:
                import torch

                try:
                    artifact = torch.load(self.model_path, map_location="cpu", weights_only=True)
                    loaded_via = "torch.load(weights_only=True)"
                except TypeError:
                    artifact = torch.load(self.model_path, map_location="cpu")
                    loaded_via = "torch.load"
                except Exception:
                    artifact = torch.load(self.model_path, map_location="cpu", weights_only=False)
                    loaded_via = "torch.load(weights_only=False)"
            except Exception as exc:
                logger.warning("PyTorch load failed for %s: %s", self.model_path, exc)

        if artifact is None:
            try:
                import joblib

                artifact = joblib.load(self.model_path)
                loaded_via = "joblib.load"
            except Exception:
                artifact = None

        if artifact is None:
            try:
                import pickle

                with self.model_path.open("rb") as handle:
                    artifact = pickle.load(handle)
                loaded_via = "pickle.load"
            except Exception as exc:
                if suffix in {".pt", ".pth", ".bin"}:
                    raise RuntimeError(f"Unable to load recommendation model artifact: {exc}") from exc

        if artifact is None:
            artifact = self.model_path.read_bytes()
            loaded_via = "raw-bytes"

        if hasattr(artifact, "eval"):
            try:
                artifact.eval()
            except Exception:
                pass

        self.model_artifact = artifact
        self.model_metadata.update(
            loaded_via=loaded_via,
            artifact_type=type(artifact).__name__,
        )

    def _load_dental_model_artifact(self) -> None:
        suffix = self.dental_model_path.suffix.lower()
        artifact: Any = None
        loaded_via: Optional[str] = None

        if suffix in {".pt", ".pth", ".bin"}:
            try:
                import torch

                try:
                    artifact = torch.load(self.dental_model_path, map_location="cpu", weights_only=True)
                    loaded_via = "torch.load(weights_only=True)"
                except TypeError:
                    artifact = torch.load(self.dental_model_path, map_location="cpu")
                    loaded_via = "torch.load"
                except Exception:
                    artifact = torch.load(self.dental_model_path, map_location="cpu", weights_only=False)
                    loaded_via = "torch.load(weights_only=False)"
            except Exception as exc:
                logger.warning("PyTorch dental model load failed for %s: %s", self.dental_model_path, exc)

        if artifact is None:
            try:
                import joblib

                artifact = joblib.load(self.dental_model_path)
                loaded_via = "joblib.load"
            except Exception:
                artifact = None

        if artifact is None:
            try:
                import pickle

                with self.dental_model_path.open("rb") as handle:
                    artifact = pickle.load(handle)
                loaded_via = "pickle.load"
            except Exception as exc:
                if suffix in {".pt", ".pth", ".bin"}:
                    raise RuntimeError(f"Unable to load dental model artifact: {exc}") from exc

        if artifact is None:
            artifact = self.dental_model_path.read_bytes()
            loaded_via = "raw-bytes"

        if hasattr(artifact, "eval"):
            try:
                artifact.eval()
            except Exception:
                pass

        self.dental_model_artifact = artifact
        self.dental_model_metadata.update(
            loaded_via=loaded_via,
            artifact_type=type(artifact).__name__,
        )

    def _build_acne_model(self):
        try:
            import torch
            from torchvision import models
        except ImportError as exc:
            raise RuntimeError("torch and torchvision are required for acne prediction") from exc

        model = models.efficientnet_b3(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = torch.nn.Sequential(
            torch.nn.Dropout(p=0.4, inplace=True),
            torch.nn.Linear(in_features, 512),
            torch.nn.ReLU(inplace=True),
            torch.nn.Dropout(p=0.3),
            torch.nn.Linear(512, len(ACNE_CLASS_NAMES)),
        )
        return model

    def _build_dental_model(self, num_classes: int):
        try:
            import torch
            from torchvision import models
        except ImportError as exc:
            raise RuntimeError("torch and torchvision are required for dental prediction") from exc

        model = models.efficientnet_b3(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = torch.nn.Sequential(
            torch.nn.Dropout(p=0.4, inplace=True),
            torch.nn.Linear(in_features, 512),
            torch.nn.ReLU(inplace=True),
            torch.nn.Dropout(p=0.3),
            torch.nn.Linear(512, num_classes),
        )
        return model

    def _prepare_acne_model(self) -> None:
        if self.model_artifact is None:
            raise RuntimeError("Recommendation model artifact is not loaded")

        try:
            import torch
        except ImportError as exc:
            raise RuntimeError("torch is required for acne prediction") from exc

        if hasattr(self.model_artifact, "eval") and hasattr(self.model_artifact, "__call__"):
            self.acne_model = self.model_artifact
            self.acne_model.eval()
            return

        checkpoint = self.model_artifact if isinstance(self.model_artifact, dict) else None
        state_dict = None
        if checkpoint is not None:
            for key in ("model_state", "model_state_dict", "state_dict", "model"):
                candidate = checkpoint.get(key)
                if isinstance(candidate, dict):
                    state_dict = candidate
                    break
            if state_dict is None and all(isinstance(k, str) for k in checkpoint.keys()):
                state_dict = checkpoint

        if state_dict is None:
            raise RuntimeError("Unsupported recommendation model checkpoint format")

        model = self._build_acne_model()
        try:
            model.load_state_dict(state_dict)
        except Exception:
            model.load_state_dict(state_dict, strict=False)
        model.eval()
        self.acne_model = model

    def _prepare_dental_model(self) -> None:
        if self.dental_model_artifact is None:
            raise RuntimeError("Dental model artifact is not loaded")

        if not self.dental_class_names:
            self.dental_class_names = DENTAL_DEFAULT_CLASS_NAMES.copy()

        try:
            import torch
        except ImportError as exc:
            raise RuntimeError("torch is required for dental prediction") from exc

        if hasattr(self.dental_model_artifact, "eval") and hasattr(self.dental_model_artifact, "__call__"):
            self.dental_model = self.dental_model_artifact
            self.dental_model.eval()
            return

        checkpoint = self.dental_model_artifact if isinstance(self.dental_model_artifact, dict) else None
        state_dict = None
        if checkpoint is not None:
            for key in ("model_state", "model_state_dict", "state_dict", "model"):
                candidate = checkpoint.get(key)
                if isinstance(candidate, dict):
                    state_dict = candidate
                    break
            if state_dict is None and all(isinstance(k, str) for k in checkpoint.keys()):
                state_dict = checkpoint

        if state_dict is None:
            raise RuntimeError("Unsupported dental model checkpoint format")

        model = self._build_dental_model(len(self.dental_class_names))
        try:
            model.load_state_dict(state_dict)
        except Exception:
            model.load_state_dict(state_dict, strict=False)
        model.eval()
        self.dental_model = model

    async def predict_acne(self, image_bytes: bytes) -> Dict[str, Any]:
        if self.acne_model is None:
            await self.ensure_model_ready()
            if self.acne_model is None:
                raise RuntimeError("Acne prediction model is not ready")

        try:
            import torch
            from PIL import Image
            from torchvision import transforms
        except ImportError as exc:
            raise RuntimeError("torch, torchvision, and pillow are required for acne prediction") from exc

        def _run_prediction() -> Dict[str, Any]:
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            transform = transforms.Compose(
                [
                    transforms.Resize((224, 224)),
                    transforms.ToTensor(),
                    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
                ]
            )
            tensor = transform(image).unsqueeze(0)

            with torch.no_grad():
                outputs = self.acne_model(tensor)
                probs = torch.softmax(outputs, dim=1)[0].cpu().tolist()

            pred_idx = int(max(range(len(probs)), key=lambda idx: probs[idx]))
            return {
                "predicted_class": ACNE_CLASS_NAMES[pred_idx],
                "confidence": float(probs[pred_idx]),
                "probabilities": {name: float(prob) for name, prob in zip(ACNE_CLASS_NAMES, probs)},
                "model_status": self.get_model_status(),
            }

        return await asyncio.to_thread(_run_prediction)

    async def predict_dental(self, image_bytes: bytes) -> Dict[str, Any]:
        if self.dental_model is None:
            await self.ensure_dental_model_ready()
            if self.dental_model is None:
                raise RuntimeError("Dental prediction model is not ready")

        try:
            import torch
            from PIL import Image
            from torchvision import transforms
        except ImportError as exc:
            raise RuntimeError("torch, torchvision, and pillow are required for dental prediction") from exc

        class_names = self.dental_class_names if self.dental_class_names else DENTAL_DEFAULT_CLASS_NAMES

        def _run_prediction() -> Dict[str, Any]:
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            transform = transforms.Compose(
                [
                    transforms.Resize((self.dental_img_size, self.dental_img_size)),
                    transforms.ToTensor(),
                    transforms.Normalize(self.dental_imagenet_mean, self.dental_imagenet_std),
                ]
            )
            tensor = transform(image).unsqueeze(0)

            with torch.no_grad():
                outputs = self.dental_model(tensor)
                probs = torch.softmax(outputs, dim=1)[0].cpu().tolist()

            pred_idx = int(max(range(len(probs)), key=lambda idx: probs[idx]))
            return {
                "predicted_class": class_names[pred_idx],
                "confidence": float(probs[pred_idx]),
                "probabilities": {name: float(prob) for name, prob in zip(class_names, probs)},
                "model_status": self.get_dental_model_status(),
            }

        return await asyncio.to_thread(_run_prediction)

    def _setup_mongo(self) -> None:
        mongo_uri = os.getenv("MONGODB_URI", "").strip()
        mongo_db_name = os.getenv("MONGODB_DATABASE", "test")
        if not mongo_uri:
            logger.info("MONGODB_URI missing. Patient profile enrichment will use Supabase only.")
            return

        try:
            self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2500)
            self.mongo_client.admin.command("ping")
            self.mongo_db = self.mongo_client[mongo_db_name]
            logger.info("Connected to MongoDB database '%s'", mongo_db_name)
        except Exception as exc:
            logger.warning("MongoDB unavailable, continuing without profile enrichment: %s", exc)
            self.mongo_client = None
            self.mongo_db = None

    def _build_graph(self):
        graph_builder = StateGraph(GraphState)

        async def build_context_node(state: GraphState) -> GraphState:
            context = await self.build_patient_context(state["patient_id"])
            return {"context": context}

        async def generate_recommendations_node(state: GraphState) -> GraphState:
            recommendations = await self._generate_recommendations(state["context"])
            return {"recommendations": recommendations}

        graph_builder.add_node("build_context", build_context_node)
        graph_builder.add_node("generate_recommendations", generate_recommendations_node)
        graph_builder.add_edge(START, "build_context")
        graph_builder.add_edge("build_context", "generate_recommendations")
        graph_builder.add_edge("generate_recommendations", END)
        return graph_builder.compile()

    async def list_patient_ids(self) -> List[str]:
        def _query() -> List[str]:
            response = (
                self.supabase.table("users")
                .select("id")
                .eq("role", "patient")
                .execute()
            )
            return [row["id"] for row in (response.data or []) if row.get("id")]

        return await asyncio.to_thread(_query)

    async def build_patient_context(self, patient_id: str) -> Dict[str, Any]:
        def _query_supabase() -> Dict[str, Any]:
            recent_fitness = (
                self.supabase.table("fitness")
                .select("created_at,steps,sleep,water,calories_burned,calories_intake,fat,protein,carbs")
                .eq("patient_id", patient_id)
                .order("created_at", desc=True)
                .limit(14)
                .execute()
            ).data or []

            prescriptions = (
                self.supabase.table("prescriptions")
                .select("id,appointment_id,medications,notes,start_date,end_date,status,created_at")
                .eq("patient_id", patient_id)
                .eq("status", "active")
                .order("created_at", desc=True)
                .execute()
            ).data or []

            adherence_logs = (
                self.supabase.table("medication_adherence_logs")
                .select("taken,taken_at,scheduled_time,source,prescription_id,medication_id")
                .eq("patient_id", patient_id)
                .order("taken_at", desc=True)
                .limit(30)
                .execute()
            ).data or []

            medical_records = (
                self.supabase.table("medical_records")
                .select("id,title,record_type,date,file_url,doctor_name,results")
                .eq("patient_id", patient_id)
                .order("date", desc=True)
                .limit(5)
                .execute()
            ).data or []

            appointments = (
                self.supabase.table("appointments")
                .select("id,date,time,status,type,notes,report,mode,doctor_id")
                .eq("patient_id", patient_id)
                .order("date", desc=True)
                .limit(5)
                .execute()
            ).data or []

            doctors = (
                self.supabase.table("users")
                .select("id,email")
                .eq("role", "doctor")
                .limit(20)
                .execute()
            ).data or []

            return {
                "recentFitness": recent_fitness,
                "prescriptions": prescriptions,
                "adherenceLogs": adherence_logs,
                "medicalRecords": medical_records,
                "appointments": appointments,
                "availableDoctors": doctors,
            }

        supabase_data = await asyncio.to_thread(_query_supabase)

        profile = await asyncio.to_thread(self._load_patient_profile, patient_id)
        doctor_catalog = await asyncio.to_thread(
            self._load_doctor_specializations,
            [d["id"] for d in supabase_data["availableDoctors"] if d.get("id")],
        )

        available_doctors = []
        for doctor in supabase_data["availableDoctors"]:
            doc_id = doctor.get("id")
            available_doctors.append(
                {
                    "doctorId": doc_id,
                    "email": doctor.get("email"),
                    "specialization": doctor_catalog.get(doc_id, "general"),
                }
            )

        return {
            "patientId": patient_id,
            "profile": profile,
            "recentFitness": supabase_data["recentFitness"],
            "prescriptions": supabase_data["prescriptions"],
            "adherenceLogs": supabase_data["adherenceLogs"],
            "medicalRecords": supabase_data["medicalRecords"],
            "appointments": supabase_data["appointments"],
            "availableDoctors": available_doctors,
            "summary": {
                "activePrescriptionCount": len(supabase_data["prescriptions"]),
                "adherenceTaken": len([item for item in supabase_data["adherenceLogs"] if item.get("taken")]),
                "adherenceMissed": len([item for item in supabase_data["adherenceLogs"] if item.get("taken") is False]),
            },
        }

    def _load_patient_profile(self, patient_id: str) -> Dict[str, Any]:
        if self.mongo_db is None:
            return {}

        collections = ["profiles", "profile", "patients"]
        for name in collections:
            try:
                doc = self.mongo_db[name].find_one({"id": patient_id}, {"_id": 0})
                if doc:
                    return doc
            except Exception:
                continue
        return {}

    def _load_doctor_specializations(self, doctor_ids: List[str]) -> Dict[str, str]:
        if self.mongo_db is None or not doctor_ids:
            return {}

        collections = ["doctorprofiles", "doctor_profile", "doctors"]
        for name in collections:
            try:
                docs = list(
                    self.mongo_db[name].find(
                        {"id": {"$in": doctor_ids}},
                        {"_id": 0, "id": 1, "specialization": 1},
                    )
                )
                if docs:
                    return {d["id"]: d.get("specialization", "general") for d in docs if d.get("id")}
            except Exception:
                continue
        return {}

    async def _generate_recommendations(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not self.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is required for recommendation generation")

        system_prompt = (
            "You are a clinical decision support assistant. "
            "Return ONLY valid JSON with this shape: {\"recommendations\": Recommendation[]} . "
            "Generate exactly 3 personalized recommendations. "
            "Each recommendation schema is: "
            "{type, title, description, priority, timeframe, doctorId, specialization, conditions}. "
            "Allowed type values: fitness, sleep, nutrition, medication, doctor, disease_risk, lab_test. "
            "Allowed priority values: high, medium, low. "
            "For non-doctor recommendations doctorId and specialization must be null. "
            "For non-disease_risk recommendations conditions must be null."
        )

        user_prompt = json.dumps(context, default=str)

        def _invoke() -> str:
            response = self.llm.invoke(
                [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Patient context JSON:\n{user_prompt}"),
                ]
            )
            content = response.content
            if isinstance(content, list):
                chunks = []
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        chunks.append(part.get("text", ""))
                    elif isinstance(part, str):
                        chunks.append(part)
                return "\n".join(chunks).strip()
            return str(content).strip()

        raw_output = await asyncio.to_thread(_invoke)

        try:
            payload = json.loads(self._extract_json_payload(raw_output))
            raw_recommendations = payload.get("recommendations", [])
            normalized = [self._normalize_recommendation_item(item) for item in raw_recommendations]
            validated = [RecommendationItem.model_validate(item).model_dump() for item in normalized]
            if len(validated) < 3:
                raise ValueError("Model returned fewer than 3 recommendations")
            return validated[:3]
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            preview = " ".join(raw_output.split())[:280]
            logger.error("Failed to parse recommendations output: %s | preview=%s", exc, preview)
            logger.debug("Full recommendation output: %s", raw_output)
            raise RuntimeError(f"Invalid recommendation output: {exc}") from exc

    @staticmethod
    def _extract_json_payload(raw_output: str) -> str:
        text = (raw_output or "").strip()

        if text.startswith("```"):
            lines = text.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            if text.lower().startswith("json"):
                text = text[4:].strip()

        try:
            json.loads(text)
            return text
        except json.JSONDecodeError:
            pass

        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            candidate = text[first_brace:last_brace + 1].strip()
            json.loads(candidate)
            return candidate

        first_bracket = text.find("[")
        last_bracket = text.rfind("]")
        if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
            candidate = text[first_bracket:last_bracket + 1].strip()
            json.loads(candidate)
            return candidate

        return text

    @staticmethod
    def _normalize_recommendation_item(item: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(item)

        conditions = normalized.get("conditions")
        if isinstance(conditions, str):
            normalized["conditions"] = [conditions]

        recommendation_type = normalized.get("type")
        if recommendation_type != "doctor":
            normalized["doctorId"] = None
            normalized["specialization"] = None

        if recommendation_type != "disease_risk":
            normalized["conditions"] = None

        return normalized

    async def generate_and_store_for_patient(self, patient_id: str) -> Dict[str, Any]:
        state = await self.graph.ainvoke({"patient_id": patient_id})
        recommendations = state.get("recommendations", [])
        context = state.get("context", {})

        context_hash = hashlib.sha256(
            json.dumps(context, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

        stored = await asyncio.to_thread(
            self._store_recommendations,
            patient_id,
            recommendations,
            context_hash,
        )
        return {
            "patient_id": patient_id,
            "generated_count": len(recommendations),
            "record_id": stored.get("id"),
            "generated_at": stored.get("generated_at"),
        }

    def _store_recommendations(
        self,
        patient_id: str,
        recommendations: List[Dict[str, Any]],
        context_hash: str,
    ) -> Dict[str, Any]:
        response = (
            self.supabase.table(self.supabase_table)
            .insert(
                {
                    "patient_id": patient_id,
                    "recommendations": recommendations,
                    "context_hash": context_hash,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "source": "langgraph-groq",
                }
            )
            .execute()
        )
        data = response.data or []
        if not data:
            raise RuntimeError("Failed to store recommendations")
        return data[0]

    async def get_latest_recommendations(self, patient_id: str) -> Optional[Dict[str, Any]]:
        def _query():
            response = (
                self.supabase.table(self.supabase_table)
                .select("id,patient_id,recommendations,generated_at,source")
                .eq("patient_id", patient_id)
                .order("generated_at", desc=True)
                .limit(1)
                .execute()
            )
            rows = response.data or []
            return rows[0] if rows else None

        return await asyncio.to_thread(_query)

    async def get_recommendation_history(self, patient_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        def _query():
            response = (
                self.supabase.table(self.supabase_table)
                .select("id,patient_id,recommendations,generated_at,source")
                .eq("patient_id", patient_id)
                .order("generated_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data or []

        return await asyncio.to_thread(_query)

    async def run_daily_generation(self) -> Dict[str, Any]:
        if self._run_lock.locked():
            return {"status": "skipped", "reason": "generation already running"}

        async with self._run_lock:
            patient_ids = await self.list_patient_ids()
            logger.info("Recommendation batch started for %s patients", len(patient_ids))
            success = 0
            failed = 0
            failures: List[Dict[str, str]] = []

            for index, patient_id in enumerate(patient_ids):
                try:
                    await self.generate_and_store_for_patient(patient_id)
                    success += 1
                    logger.info("Recommendation generation done for userId=%s", patient_id)
                except Exception as exc:
                    failed += 1
                    failures.append({"patient_id": patient_id, "error": str(exc)})
                    logger.error("Recommendation generation failed for userId=%s: %s", patient_id, exc)

                if self.batch_delay_seconds > 0 and index < len(patient_ids) - 1:
                    await asyncio.sleep(self.batch_delay_seconds)

            logger.info(
                "Recommendation batch completed: total=%s success=%s failed=%s",
                len(patient_ids),
                success,
                failed,
            )

            return {
                "status": "completed",
                "total": len(patient_ids),
                "success": success,
                "failed": failed,
                "failures": failures[:20],
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
