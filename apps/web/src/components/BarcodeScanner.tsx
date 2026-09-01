import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
}

type Detector = {
  detect: (source: unknown) => Promise<Array<{ rawValue: string }>>;
};

type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/**
 * Barcode scanning: camera scan (native BarcodeDetector primary, @zxing/browser
 * fallback) + manual entry. An unknown barcode is reported to the parent, which
 * shows the manual-entry prompt (no error).
 */
export default function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const scanningRef = useRef(false);

  const stopCamera = () => {
    stopRef.current?.();
    stopRef.current = null;
    scanningRef.current = false;
    setScanning(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setCameraError(null);
    const video = videoRef.current;
    if (!video) return;

    const DetectorCtor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

    if (DetectorCtor) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        video.srcObject = stream;
        await video.play();
        const detector = new DetectorCtor({ formats: ["ean_13", "ean_8", "upc_a", "code_128"] });
        stopRef.current = () => stream.getTracks().forEach((t) => t.stop());
        scanningRef.current = true;
        setScanning(true);

        const loop = async () => {
          if (!scanningRef.current) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              stopCamera();
              return;
            }
          } catch {
            // frame read error — keep scanning
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        return;
      } catch {
        stopCamera();
        // fall through to zxing
      }
    }

    // Fallback: @zxing/browser.
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
        if (result) {
          onDetected(result.getText());
          stopCamera();
        }
      });
      stopRef.current = () => controls.stop();
      scanningRef.current = true;
      setScanning(true);
    } catch {
      setCameraError("No se pudo acceder a la cámara. Ingrese el código manualmente.");
      setScanning(false);
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manual.trim()) {
      onDetected(manual.trim());
      setManual("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submitManual} className="flex gap-2">
        <input
          className="input-field"
          placeholder="Escanear o ingresar código de barras…"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          inputMode="numeric"
        />
        <button type="button" onClick={scanning ? stopCamera : startCamera} className="btn-secondary">
          <span className="material-symbols-outlined">{scanning ? "stop" : "qr_code_scanner"}</span>
        </button>
      </form>

      <video
        ref={videoRef}
        className={`w-full max-h-48 rounded-lg bg-black ${scanning ? "" : "hidden"}`}
        playsInline
        muted
      />
      {cameraError && (
        <p className="text-error text-body-sm" role="alert">
          {cameraError}
        </p>
      )}
    </div>
  );
}
